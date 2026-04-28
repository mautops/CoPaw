# Phase 2 — Marketplace 雏形

> 工期: 2-3 周 | 目标: 组件注册、发现、更新的完整平台

## 前置条件

- [ ] Phase 1 全部交付检查清单通过
- [ ] ComponentSlot 状态机在生产环境稳定运行 ≥ 1 周
- [ ] Agent 组件选择准确率 ≥ 80%

---

## Week 1: Registry & CDN

### Task 1.1 — Marketplace 服务

**文件**: `app/(marketplace)/layout.tsx`, `app/(marketplace)/api/`

```
□ 创建 (marketplace) route group（与主应用共享 Layout，独立路由）
□ 基础 Layout（管理后台风格，非聊天页面）
```

### Task 1.2 — Registry API

**文件**: `app/(marketplace)/api/registry/route.ts`

```
□ GET /api/registry — 返回全部组件列表（name, version, displayName, category）
□ 支持 ?category=data-display 筛选
□ 响应包含 CDN base URL
```

**文件**: `app/(marketplace)/api/registry/[name]/route.ts`

```
□ GET /api/registry/:name — 返回指定组件的完整 manifest
□ 支持 ?version=1.x semver range 查询
□ 返回: component.yaml 内容 + schema.json + actions.yaml
□ 返回: 各版本的 CDN bundle URL
□ 返回: ai.md 内容（供前端预取和 embedding 生成）
```

### Task 1.3 — Semver 解析

**文件**: `lib/semver-resolver.ts`

```
□ resolveVersion(available: string[], range: string): string | null
□ 支持: 精确版本 "1.2.0"、range "1.x"、"1.2.x"、"^1.2.0"、"~1.2.0"
□ 取最新兼容版本
□ 无兼容版本时返回 null
□ 单元测试覆盖所有 range 类型
```

### Task 1.4 — CDN 部署

```
□ 配置 CDN（Tencent Cloud COS + EdgeOne 或阿里云 OSS + CDN）
□ 部署脚本: 上传 bundle/ 目录到 ${CDN_BASE}/bundles/${name}/${version}/
□ CDN 配置:
    - Cache-Control: public, max-age=31536000, immutable
    - CORS: Access-Control-Allow-Origin: * (同源场景可省略)
    - 自定义域名 + HTTPS
□ 验证: curl -I ${CDN_URL}/bundles/data-table/1.2.0/index.js 返回 200 + 正确的 Cache-Control
```

### Task 1.5 — Registry 预取

**文件**: `lib/component-registry.ts`（更新）

```
□ prefetchRegistry(): 进入 chat 页面时 useQuery 预取
□ staleTime: 10 分钟
□ 预取成功后更新内存 Map + sessionStorage
```

---

## Week 2: Agent Tool Retrieval & 交互回路

### Task 2.1 — Embedding 生成

```
□ 为每个组件的 ai.md 内容生成 embedding（text-embedding-3-small 或本地模型）
□ 存储在 registry 数据库中（随组件版本更新时重新生成）
□ 构建脚本: npm run registry:sync-embeddings
```

### Task 2.2 — Tool Retrieval API

**文件**: `app/(marketplace)/api/agent/tools/route.ts`

```
□ GET /api/agent/tools?query={userInput}&limit=5
□ 流程: query → embedding → 与所有组件 embedding 余弦相似度 → Top-N
□ 返回 Top-N 的 Tool Definition JSON（function name + description + parameters）
□ 相似度 < 阈值的组件不返回（threshold 初始值 0.7，可调）
□ 缓存: 相同 query 的结果缓存 5 分钟
```

### Task 2.3 — 后端 Agent 集成

**文件**: 后端 Agent conversation handler（修改）

```
□ Agent 在处理用户消息时:
    1. 识别到可能需要组件渲染（非纯文本回复场景）
    2. 调用 /api/agent/tools?query={userInput}&limit=5
    3. 将返回的 Tool Definitions 注入当前对话的 tool list
    4. Agent 选择合适的 render_* tool 调用
    5. Agent 先调用 API tool 获取数据，再将数据传入 render_* tool 的 dataSource
```

### Task 2.4 — 交互回路实现

**文件**: `components/chat/component-slot.tsx`（更新）

```
□ onAction callback: 组件发出 action → ComponentSlot 处理
□ scope=internal 的 action: 不通知 Agent（已由组件内部处理）
□ scope=agent 的 action: 构造文本消息 → onSendToAgent
□ action 文本格式: "[组件操作] {name} ({callId}): {action}\n{payload摘要}"
□ 可选: action 确认弹窗（如 actions.yaml 中定义了 confirmation 字段）
□ 可选: action payload 中敏感字段脱敏
```

### Task 2.5 — 组件状态摘要

**文件**: `lib/component-state-digest.ts`

```
□ generateDigest(callId, component, props): 生成摘要文本
□ 格式: "[系统] 当前活跃组件: {name} ({callId}), {N}条记录, 按{当前排序}排序"
□ 在 Agent 输出 component 消息后自动注入到对话上下文
□ 当对话 compaction 触发时，摘要比原始 component 消息更节省 token
□ 摘要不可见给用户（role: "system"）
```

### Task 2.6 — Action 去重与限流

```
□ 每个 component 实例的 action 发送频率限制: 每秒最多 3 次
□ 同一 action + payload 的重复发送拦截（hash 比对）
□ "操作过于频繁，请稍后" 提示（超过限流阈值时）
```

---

## Week 3: 组件管理 & 测试

### Task 3.1 — 组件浏览页面

**文件**: `app/(marketplace)/page.tsx`

```
□ 组件列表页: 卡片网格展示所有可用组件
□ 每个卡片: displayName + category + version + 简短描述
□ 搜索: 按 name / displayName / category 过滤
□ 点击进入组件详情页
```

### Task 3.2 — 组件详情页

**文件**: `app/(marketplace)/components/[name]/page.tsx`

```
□ 组件完整信息: component.yaml + schema.json + actions.yaml 可读展示
□ ai.md 的 Markdown 渲染
□ 版本列表: 所有可用版本 + 发布日期
□ 在线预览: 嵌入一个 live preview（使用 ComponentSlot 加载组件 + 示例数据）
```

### Task 3.3 — 组件管理 API

**文件**: `app/(marketplace)/api/admin/`

```
□ POST /api/admin/components — 注册新组件/新版本
□ PUT /api/admin/components/:name — 更新组件元数据
□ DELETE /api/admin/components/:name/:version — 下架特定版本
□ 管理端需要认证（复用主应用 auth）
```

### Task 3.4 — 测试

```
□ Registry API 集成测试: CRUD + semver 查询
□ Embedding 匹配准确性评估: 30 个测试 query + 人工标注正确答案
□ E2E 测试: 用户输入 → Tool Retrieval → Agent 选择组件 → 渲染
□ 交互回路测试: action → Agent 回复 → component 更新
□ L4 视觉回归: data-table + detail-card + confirm-form 快照基线
```

---

## Phase 2 交付检查清单

- [ ] Registry API 可用，支持 semver 查询
- [ ] CDN 部署就绪，国内节点延迟 < 200ms
- [ ] Tool Retrieval API 可用，Top-5 准确率 ≥ 80%
- [ ] 交互回路完整: action → Agent → component 更新
- [ ] 组件状态摘要正确注入
- [ ] 组件浏览和详情页可用
- [ ] E2E 测试通过
- [ ] Phase 2 成功标准全部达成 → 进入 Phase 3
