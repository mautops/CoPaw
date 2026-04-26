# TODO: Workflow 逐步执行方案

## 背景

当前实现是把完整的 workflow YAML 一次性发给 Agent，由 Agent 自主串行执行所有步骤。
本方案改为利用现有的消息队列（`useMessageQueue`），将每个 step 单独入队，Agent 每次只执行一个步骤。

---

## 核心思路

同一个 workflow 在同一个 Chat Session 中执行，Agent 天然拥有完整的对话历史作为上下文，
因此跨步骤信息传递不是问题——前序步骤的输出会留在对话记录里，Agent 执行下一步时自然可以引用。

---

## 与当前方案的改动点

### 1. `handleExecute`（`workflows/[filename]/page.tsx`）

**现在：**
- 把整个 workflow markdown + `STEP_INSTRUCTION_TEMPLATE` 拼成一条消息，`forceNewChat` 发送

**改为：**
- 第一条消息：仅发送 workflow 头部信息（name、description、集群背景），告知 Agent 即将开始执行，创建新 Session
- 后续每条消息：依次将每个 `WorkflowStep` 格式化后入队，每条消息只包含该步骤的指令

```
第1条（forceNewChat）: workflow 上下文 + 开始执行通知
第2条（enqueue）:      步骤1 完整指令 + step result 写入要求
第3条（enqueue）:      步骤2 完整指令 + step result 写入要求
...
第N条（enqueue）:      步骤N-1 完整指令
第N+1条（enqueue）:    报告步骤（s3c 上传 + PATCH report 地址）
```

### 2. 每条步骤消息的结构

从 `STEP_INSTRUCTION_TEMPLATE` 中拆出步骤无关的"结果写入规范"部分，作为每条步骤消息的固定后缀：

```
**执行步骤：{step.title}**

{step.instructions}

---
[步骤结果写入规范]
- 记录 STEP_START
- 完成后写入 {stepsFile} 中对应的步骤结果
- 输出 workflow-step-result 块
- result 判断条件：{该步骤的 result_criteria / threshold}
```

好处：每条消息 token 量只有整体发送的 1/N，且 criteria 只包含当前步骤的，不混在一起。

### 3. `workflowExecContext` 类型扩展

在 `handleSubmit` 的 `workflowExecContext` 参数里，当前只有 `{ filename, userId }`。

需要增加：
```typescript
workflowExecContext?: {
  filename: string;
  userId: string;
  runId?: string;       // 第一条消息创建 run 后，后续步骤复用同一个 runId
  stepIndex?: number;   // 当前是第几步（用于写入 step result）
}
```

`runId` 在第一条消息回调后（Session 创建完成时）确定，后续入队的步骤消息携带同一个 `runId`。

### 4. run 记录创建时机

**现在：** `forceNewChat` 成功、拿到 `sessionId` 后立即 `appendRun`

**保持不变：** 仍在第一条消息发出、Session 创建完成后 `appendRun`，`runId = sessionId`，后续步骤消息通过闭包或 ref 持有同一个 `runId`。

### 5. `useMessageQueue` 的使用方式

`useMessageQueue` 已有 `enqueue(args)` 接口，`args` 是 `QueueSubmitArgs`（即 `handleSubmit` 的入参）。

执行 workflow 时：
```typescript
// 第一条：新建 Session
handleSubmit({ text: workflowHeader, forceNewChat: true, workflowExecContext: { filename, userId } })

// 等 Session 创建完成，拿到 chatId 后，逐步入队后续步骤
for (const step of steps) {
  enqueue({
    chatId,
    args: {
      text: buildStepMessage(step),
      workflowExecContext: { filename, userId, runId, stepIndex: i },
    }
  })
}
```

`useMessageQueue` 本身已实现"前一条发完再发下一条"的串行语义，天然保证步骤串行。

### 6. 报告步骤（s3c）

如果 `auto_report = true`，在所有步骤入队后，追加一条报告步骤消息，内容来自 `WORKFLOW_REPORT_STEP` 模板，包含 `curl PATCH` 回写 report 字段的指令。

---

## 需要新增 / 修改的文件

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `lib/prompts/workflow-step-message.ts` | 新增 | 单步骤消息模板，替代现有 `STEP_INSTRUCTION_TEMPLATE` 中的全量版本 |
| `lib/prompts/workflow-exec-header.ts` | 新增 | 第一条消息：workflow 上下文通知模板 |
| `lib/workflow-chat-bridge.ts` | 修改 | `WorkflowChatExecPayload` 无需大改，执行逻辑从 `chat/page.tsx` 迁移 |
| `app/(app)/agent/workflows/[filename]/page.tsx` | 修改 | `handleExecute` 改为生成步骤队列 |
| `app/(app)/agent/chat/use-chat-stream.ts` | 修改 | `workflowExecContext` 加 `runId`/`stepIndex`，步骤指令注入逻辑改为单步版本 |
| `app/(app)/agent/chat/page.tsx` | 修改 | `execWorkflow` useEffect 改为逐步入队 |

---

## 不需要改动的文件

- `useMessageQueue` — 现有队列机制完全满足需求，无需修改
- `workflowApi.appendRun` / `patchRun` / `appendStepResult` — 接口不变
- `PATCH /api/workflows/[filename]/runs/[runId]` — 不变
- 前端执行记录 / RunRow UI — 不变

---

## 风险与注意事项

1. **第一条消息 → chatId 的时序**：步骤入队必须在 Session 创建完成（chatId 确定）之后，需要在 `handleSubmit` 的回调或 `forceNewChat` 完成后触发入队，不能在发送前入队。

2. **Agent 中断恢复**：若用户手动停止流，队列中剩余步骤仍在，需要考虑是否自动清空或保留（当前 `useMessageQueue` 有 sessionStorage 持久化，刷新后会恢复）。

3. **步骤消息的 forceNewChat 标志**：只有第一条消息设 `forceNewChat: true`，后续步骤消息发到同一个 `chatId`，不能再 `forceNewChat`。
