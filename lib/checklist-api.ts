import { load as yamlLoad } from 'js-yaml';
import { chatApi } from './chat-api';
import type { ChecklistWorkflow, ChecklistExecution, ChecklistRunMeta } from './checklist-types';

const WORKFLOW_BASE = `${process.env.HOME ?? '~'}/.copaw/workflows/checklists`;

/** 从本地 ~/.copaw/workflows/checklists/{serviceId}/{checklistId}.yaml 加载 Workflow 定义 */
export async function loadChecklistWorkflow(
  serviceId: string,
  checklistId: string,
): Promise<ChecklistWorkflow | null> {
  // 将 checklistId 中的下划线替换为连字符，作为文件名
  const filename = checklistId.replace(/_/g, '-');
  try {
    const res = await fetch(`/api/workflow-file?path=${encodeURIComponent(`${WORKFLOW_BASE}/${serviceId}/${filename}.yaml`)}`);
    if (!res.ok) return null;
    const text = await res.text();
    return yamlLoad(text) as ChecklistWorkflow;
  } catch {
    return null;
  }
}

/** 构造发送给 Agent 的巡检提示词 */
export function buildChecklistPrompt(workflow: ChecklistWorkflow): string {
  const stepLines = workflow.steps.map((step, i) => {
    const tag = step.type === 'automated' ? '（自动化）' : '（手动确认）';
    const body =
      step.type === 'automated'
        ? `调用 Skill: ${step.skill ?? '（未指定）'}${step.threshold ? `\n   阈值：warning=${step.threshold.warning}%, critical=${step.threshold.critical}%` : ''}`
        : `操作说明：\n${step.instructions ?? ''}\n\n确认清单：\n${(step.checklist ?? []).map((c) => `   - [ ] ${c}`).join('\n')}`;
    return `### 步骤 ${i + 1}：${step.name} ${tag}\n${step.description ? `说明：${step.description}\n` : ''}${body}`;
  }).join('\n\n');

  return `# 执行例行巡检

**服务：** ${workflow.service.name}
**巡检：** ${workflow.name}
**说明：** ${workflow.description}

## 执行步骤

${stepLines}

## 执行规范

1. 严格按顺序执行每个步骤
2. 自动化步骤：调用对应 Skill 或 CLI 命令，输出执行结果（通过/失败/异常详情）
3. 手动步骤：列出确认清单，等待用户逐项确认后继续
4. 每步结束后输出：✅ 通过 / ❌ 失败 / ⚠️ 警告 / ⏭️ 跳过，并附简要说明
5. 所有步骤完成后，输出巡检摘要（总数/通过/失败/跳过）
6. 如有失败项，给出处理建议

## 报告生成规范

执行完成后，请按照以下格式生成巡检报告：

1. **报告标题**：使用 # 一级标题，格式为"巡检报告：{服务名称} - {巡检名称}"
2. **元信息**：包含执行时间、执行人、巡检频率
3. **执行摘要**：使用表格或列表展示统计数据（总数、通过、失败、警告、跳过、通过率）
4. **检查详情**：每个步骤使用三级标题，包含状态、耗时、结果说明、详细信息
5. **问题分析**：如有失败项，分析根因并给出建议
6. **优化建议**：基于巡检结果提供改进建议
7. **附录**：记录 Workflow 版本、Agent ID、Session ID 等元数据

报告生成后，请输出完整的 Markdown 内容，并在最后一行添加：

\`\`\`
[REPORT_READY] 报告已生成，请保存到 S3
\`\`\`

这样前端可以识别报告已完成，触发上传流程。

开始执行巡检，请逐步完成以上步骤。`;
}

/** 创建一个带 checklist meta 的新 chat，然后发送巡检提示词触发执行 */
export async function startChecklistExecution({
  workflow,
  serviceId,
  checklistId,
  userId,
}: {
  workflow: ChecklistWorkflow;
  serviceId: string;
  checklistId: string;
  userId: string;
}): Promise<{ chatId: string; sessionId: string }> {
  const sessionId = `checklist_${serviceId}_${checklistId}_${Date.now()}`;

  const meta: ChecklistRunMeta = {
    type: 'checklist_run',
    service_id: serviceId,
    service_name: workflow.service.name,
    checklist_id: checklistId,
    checklist_name: workflow.name,
    frequency: workflow.frequency,
  };

  const chat = await chatApi.createChat({
    session_id: sessionId,
    name: `${workflow.service.name} · ${workflow.name}`,
    user_id: userId,
    channel: 'console',
    meta,
  } as Parameters<typeof chatApi.createChat>[0] & { meta: ChecklistRunMeta });

  return { chatId: chat.id, sessionId };
}

/** 从 chatApi.listChats 中筛选出指定服务的巡检执行记录 */
export async function listChecklistExecutions(serviceId: string): Promise<ChecklistExecution[]> {
  const chats = await chatApi.listChats();

  return chats
    .filter((c) => {
      const meta = c.meta as Partial<ChecklistRunMeta> | undefined;
      return meta?.type === 'checklist_run' && meta?.service_id === serviceId;
    })
    .map((c) => {
      const meta = c.meta as unknown as ChecklistRunMeta;
      return {
        chat_id: c.id,
        session_id: c.session_id,
        service_id: meta.service_id,
        service_name: meta.service_name,
        checklist_id: meta.checklist_id,
        checklist_name: meta.checklist_name,
        frequency: meta.frequency,
        executed_at: c.created_at ?? c.updated_at ?? new Date().toISOString(),
        updated_at: c.updated_at,
        status: (c.status === 'running' ? 'running' : 'completed') as ChecklistExecution['status'],
        report_url: meta.report_url,
      };
    })
    .sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());
}
