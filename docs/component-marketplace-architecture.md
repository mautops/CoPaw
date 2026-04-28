# Component Marketplace — 架构方案 v3

> 经 AI/LLM 应用专家、前端性能专家、QA/测试专家评审，及社区方案调研后终稿。

---

## 1. 概述与决策

### 1.1 目标

Chat 页面中，AI Agent 根据用户问题返回 `component` 消息，前端运行时动态加载远程 React 组件并渲染。组件托管在独立 Marketplace 服务中，不在主项目打包。

### 1.2 核心决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 技术路线 | 自建（Import Maps + Dynamic Import） | hel-micro 对 Next.js/Turbopack 无兼容验证，JSONP 机制与 ESM 方向不一致，社区活跃度不足。Module Federation 对 Turbopack 支持有限且构建时耦合重 |
| React 单例 | `<script type="importmap">` 将 `react`/`react-dom` 映射到宿主实例 | W3C 标准，无第三方依赖，构建时只需将 React 标记为 external |
| 加载机制 | 原生 `import(bundleUrl)` + AbortController 超时 | ESM 标准，CSP 友好，配合不可变 URL + CDN 实现零开销缓存 |
| 数据策略 | Phase 1: Agent 调 API → 数据作为 static props 传入。Phase 2: 可选前端直连 API | Phase 1 安全性最大化，消除 API 白名单和 template DSL |
| Bundle 格式 & CSS | ESM + CSS Modules，构建环境与主应用对齐 | 类名自动 hash，避免样式冲突 |
| 协议 | 两类消息：`component`（Agent→前端）和文本 action 消息（前端→Agent） | 同类 call_id 自动替换，无需 update/remove 消息 |
| 组件内部状态 | 组件自治（排序/筛选/分页不通知 Agent） | 纯 UI 状态，Agent 不需感知 |
| 跨组件联动 | Agent 驱动 | 跨组件状态耦合本质是业务逻辑 |
| 降级策略 | 分层处理（见 §6.4 完整矩阵） | 基础设施问题对用户透明，业务问题让用户感知 |
| Marketplace 部署 | 独立服务，初期同项目 route group | 低启动成本，后续可拆 |
| 第三方审核 | 自动化（test + lint + bundle scan） | Phase 3 |

### 1.3 方案演进

| 阶段 | 技术栈 | 交付 |
|---|---|---|
| **Phase 1** | Import Maps + Dynamic Import + 硬编码 Tool Definitions | 3 个官方组件 + 核心链路验证 |
| **Phase 2** | Registry API + 语义匹配 Tool Retrieval + 交互回路 | Marketplace 雏形 |
| **Phase 3** | iframe Sandbox + 前端直连 API + 自动化审核 | 生态开放 |

### 1.4 不选型说明

| 方案 | 不选原因 |
|---|---|
| **hel-micro** | JSONP 加载（非 ESM）、Next.js/Turbopack 零验证案例、社区 ~200 周下载且单维护者 |
| **Module Federation** | 构建时耦合、Turbopack 兼容性有限、依赖 Webpack/Rspack 插件生态 |
| **@aurbi/hotplug** | 生态过新（v1.1），生产案例不足 |

---

## 2. 系统架构

```
┌───────────────────────────────────────────┐
│          Component Marketplace             │
│                                            │
│  /api/registry          → 组件元数据        │
│  /api/registry/:name    → 单个组件详情      │
│  /bundles/:name/:ver/   → 静态文件 (CDN)   │
│  /sandbox-host          → iframe 宿主 (P3) │
└──────────┬────────────────────────────────┘
           │ HTTPS
           ▼
┌──────────────────────────────────────────┐
│            Main App (CoPaw Console)        │
│                                            │
│  lib/                                      │
│    component-registry.ts     注册表缓存     │
│    component-loader.ts       动态加载器     │
│    component-telemetry.ts    可观测性       │
│    component-manifest-types.ts             │
│                                            │
│  components/chat/                          │
│    component-slot.tsx         组件宿主      │
│    component-error-card.tsx   错误卡片      │
│    component-skeleton.tsx     加载占位      │
│                                            │
│  app/layout.tsx              注入 importmap │
└──────────────────────────────────────────┘
```

---

## 3. React 单例方案

远程组件必须使用宿主应用的 React 实例，否则 Hooks 不可用。方案使用 W3C 标准的 Import Maps。

### 3.1 宿主注入

```html
<!-- app/layout.tsx 中注入 -->
<script type="importmap">
{
  "imports": {
    "react": "/_next/static/chunks/react.js",
    "react-dom": "/_next/static/chunks/react-dom.js",
    "react/jsx-runtime": "/_next/static/chunks/react-jsx-runtime.js"
  }
}
</script>
```

### 3.2 组件构建

组件构建时将 `react`/`react-dom` 标记为 external：

```js
// 组件项目的 vite.config.js 或 webpack.config.js
export default {
  build: {
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: { format: 'es' }
    }
  }
};
```

构建产物中 `import React from 'react'` 不会被内联，浏览器运行时通过 importmap 解析到宿主实例。

### 3.3 版本校验

组件 manifest 中声明 `peerDependencies`，ComponentSlot 加载前校验：

```yaml
# component.yaml
peerDependencies:
  react: ">=19.0.0"
  react-dom: ">=19.0.0"
```

校验失败 → 降级为文本 + 安全告警。

---

## 4. 组件描述格式

### 4.1 文件结构

```
marketplace/components/<name>/
  component.yaml      # 工程元数据
  ai.md               # Agent Tool Definition 来源
  schema.json         # Props JSON Schema（Tool parameters 权威来源）
  actions.yaml        # 交互定义
  README.md           # 开发者文档
  bundle/
    index.js          # ESM bundle（React external）
    style.css         # CSS Modules 产物
  tests/
    render.test.ts
    a11y.test.ts
```

### 4.2 component.yaml

```yaml
name: data-table
version: 1.2.0
displayName: 数据表格
category: data-display
bundle: bundle/index.js
css: bundle/style.css
propsSchema: schema.json
peerDependencies:
  react: ">=19.0.0"
  react-dom: ">=19.0.0"
```

### 4.3 schema.json — Tool Parameters 权威来源

`schema.json` 是组件 Props 的唯一事实来源。构建流程读取它自动生成 Agent Tool Definition 的 `parameters` 字段，**禁止手动维护 parameters**，消除双写不一致。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "columns": {
      "type": "array",
      "description": "列定义",
      "items": {
        "type": "object",
        "properties": {
          "key": { "type": "string", "description": "数据字段名" },
          "title": { "type": "string", "description": "列标题" },
          "sortable": { "type": "boolean", "default": false },
          "renderType": {
            "type": "string",
            "enum": ["text", "badge", "link", "time", "number", "actions"],
            "default": "text"
          }
        },
        "required": ["key", "title"]
      }
    },
    "dataSource": {
      "type": "array",
      "description": "数据数组。Agent 先通过 tool calling 查询 API 获取数据，将结果传入此字段。"
    },
    "pagination": {
      "type": "object",
      "properties": {
        "pageSize": { "type": "number", "default": 20 },
        "current": { "type": "number", "default": 1 }
      }
    }
  },
  "required": ["columns", "dataSource"]
}
```

### 4.4 ai.md — Agent 描述 + Few-Shot Examples

ai.md 用于语义匹配（Phase 2）和人工阅读，也是 Tool Definition `description` 的来源。**必须包含 2-3 个 few-shot examples**，对 tool selection 准确率的提升远大于等量文字描述。

```markdown
---
name: render_data_table
---

## 描述
以表格形式展示结构化数据。支持排序、分页、列筛选、行多选。

## 适用场景
- 列表/数组结构的数据展示（服务列表、部署记录、用户列表等）
- 用户明确要求以表格、列表形式查看数据
- 用户要求"显示所有 xxx"、"查询 xxx 列表"

## 不适用场景
- 单个对象的详情展示 → render_detail_card
- 时间序列趋势数据 → render_chart
- 层级/树形结构 → render_tree
- 仅需一个数字/状态 → 直接文本回复

## Props
@see schema.json

## 交互
- 点击列头 → 本地排序
- 切换分页 → 本地翻页
- 点击行 → 通知 Agent (payload: { rowData: object })
- 选中/取消行 → 通知 Agent (payload: { selectedRows: array })

## 示例

Q: 显示所有微服务的运行状态
A:
  1. tool call: get_services (获取数据)
  2. tool call: render_data_table { columns: [{ key: name, title: 服务名 }, { key: status, title: 状态, renderType: badge }], dataSource: <API返回数据> }

Q: api-gateway 最近 5 次部署记录
A:
  1. tool call: get_deployments { service: api-gateway, limit: 5 }
  2. tool call: render_data_table { columns: [{ key: time, title: 时间, renderType: time }, { key: version, title: 版本 }], dataSource: <API返回数据> }

## 决策优先级
当 data-table 和 detail-card 都可用时，若数据是 ≥2 条列表 → data-table；若数据是单个对象 → detail-card。
```

### 4.5 actions.yaml — 交互定义

不含 DSL，不含模板。只描述组件能发出什么事件。

```yaml
# scope: internal — 组件内部自治，不通知 Agent
sort-change:
  scope: internal
filter-change:
  scope: internal
page-change:
  scope: internal

# scope: agent — 通知 Agent
row-click:
  scope: agent
  payload:
    rowData: { type: object }

row-select:
  scope: agent
  payload:
    selectedRows: { type: array }
```

---

## 5. 通信协议

### 5.1 Agent → 前端: `component`

```json
{
  "type": "component",
  "call_id": "comp_01hx9v",
  "name": "data-table",
  "props": {
    "columns": [
      { "key": "name", "title": "服务名" },
      { "key": "status", "title": "状态", "renderType": "badge" }
    ],
    "dataSource": [
      { "name": "api-gateway", "status": "running" },
      { "name": "user-service", "status": "degraded" }
    ]
  }
}
```

**规则：**
- 相同 `call_id` 自动替换已有组件（update = 新 component 同 call_id）
- `visible: false` 移除组件
- `visible` 省略时默认 `true`

### 5.2 前端 → Agent: action 文本消息

```text
[组件操作] data-table (comp_01hx9v): row-click
行数据: {"name":"api-gateway","status":"running"}
```

文本格式对 Agent 语义理解更友好，Agent 无需学习新消息格式。

### 5.3 Agent → Agent: 组件状态摘要

每次 Agent 输出 component 后，系统注入一条不可见的状态摘要到对话上下文：

```text
[系统] 当前活跃组件: data-table (comp_01hx9v), 23条记录, 按名称排序。
```

这条摘要：
- 不向用户展示
- 供 Agent 在后续 action 处理中获知组件当前状态
- 当对话 compaction 发生时，摘要比原始 component 消息更节省 token

---

## 6. 组件加载与运行时

### 6.1 时序

```
 0ms   用户发送消息
~50ms  Agent 开始 SSE 流（文本 + API tool calls）
       │  Agent 调用 API tool → 获取数据
~500ms Agent 输出 component 消息（含 static 数据）
       │
       ├─→ 解析 component 消息
       ├─→ 查 registry cache → 确定 bundle URL
       ├─→ Promise.race([
       │      import(bundleUrl),       ← 加载组件
       │      timeout(8000)            ← 8s 超时
       │    ])
       ├─→ CSS 注入（去重 + load 事件监听）
       ├─→ 数据截断检测
       │
~600ms React 渲染组件（bundle 缓存命中时 ~50ms）
```

### 6.2 加载器

```typescript
// lib/component-loader.ts

const LOAD_TIMEOUT_MS = 8000;
const registryCache = new Map<string, ComponentManifest>();
const injectedStylesheets = new Set<string>();

function getBundleUrl(m: ComponentManifest, base: string): string {
  return `${base}/bundles/${m.name}/${m.version}/${m.bundle}`;
}

async function loadComponent(name: string, version: string): Promise<React.ComponentType<any>> {
  const manifest = await resolveManifest(name, version);
  const url = getBundleUrl(manifest, COMPONENT_CDN_BASE);

  // CSS 注入：去重 + 监听 load 事件避免 FOUC
  if (manifest.css && !injectedStylesheets.has(manifest.css)) {
    const cssUrl = `${COMPONENT_CDN_BASE}/bundles/${name}/${version}/${manifest.css}`;
    const cssPromise = injectStylesheet(cssUrl);
    injectedStylesheets.add(manifest.css);
  }

  // 带超时的动态导入
  const mod = await Promise.race([
    import(url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Component load timeout: ${name}`)), LOAD_TIMEOUT_MS)
    ),
  ]);

  return mod.default;
}
```

### 6.3 React Key 策略（call_id 替换时状态重置）

相同 `call_id` 的新 component 消息到达时，React key 使用 `call_id + 递增序列号` 组合：

```typescript
// ComponentSlot 内部
const keyRef = useRef(0);

useEffect(() => {
  keyRef.current += 1;  // 每次 props 变更递增
}, [props]);

return <Component key={`${callId}_v${keyRef.current}`} {...props} />;
```

这确保 React 卸载旧实例、挂载新实例，组件的内部状态（排序、分页、选中行）被完全清除。

### 6.4 完整降级矩阵

| # | 错误场景 | 触发条件 | 用户可见 | 埋点事件 |
|---|---|---|---|---|
| 1 | Registry 中无此组件 | `name` 不在 registry | 降级为文本 | `component:load-fail` (404) |
| 2 | CDN 不可达 | 网络故障 | 降级为文本 | `component:load-fail` (network) |
| 3 | Bundle SHA256 不匹配 | 签名校验失败 | 降级为文本 | `component:load-fail` (signature) + 安全告警 |
| 4 | Bundle 非合法 ESM | 返回了 HTML 或空内容 | 降级为文本 | `component:load-fail` (parse) |
| 5 | 加载超时 | `import()` > 8s | 降级为文本 | `component:load-timeout` |
| 6 | 版本不兼容 | `peerDependencies` 校验失败 | 降级为文本 | `component:load-fail` (version) + 安全告警 |
| 7 | 组件 render 时 throw | 组件代码 bug | Error Boundary → 错误卡片 | `component:render-error` |
| 8 | Props 缺少 `required` 字段 | Agent 输出的 props 不合法 | Error Boundary → 错误卡片 | `component:props-validation-error` |
| 9 | `dataSource` 为空数组 | 数据查询无结果 | 组件展示空态（不是错误） | 无（正常状态） |
| 10 | CSS 加载失败 | CSS URL 404 | 组件无样式渲染（不阻断） | `component:css-load-fail` |

### 6.5 数据截断检测

Agent 通过 tool calling 获取数据后，可能因 context window 限制静默截断数据。ComponentSlot 需要检测：

```typescript
// Agent tool call 返回 { total: 150, items: [...前50条] }
// 但 component 消息的 dataSource 只有 50 条
// → 检测到截断

function detectTruncation(toolCallResult: any, dataSource: unknown[]): TruncationInfo | null {
  if (toolCallResult?.total && toolCallResult.total > dataSource.length) {
    return {
      expected: toolCallResult.total,
      actual: dataSource.length,
      message: `数据不完整：仅展示 ${dataSource.length}/${toolCallResult.total} 条`
    };
  }
  return null;
}
```

检测到截断时：
- 组件底部显示 `"仅展示前 50/150 条，追问可获取更多"` 提示
- 发送 `component:data-truncated` 埋点

### 6.6 CSS 隔离

- **去重注入**：`injectedStylesheets` Set 记录已注入的 CSS URL
- **FOUC 防护**：`injectStylesheet()` 返回 Promise，在 CSS `load` 事件后 resolve。ComponentSlot 在 CSS 就绪后才渲染组件
- **超时兜底**：CSS 加载 > 3s → 跳过等待，组件无样式渲染（不阻断功能）
- **卸载清理**：`visible: false` 时，仅从 DOM 移除组件实例（React unmount），不删除 CSS `<link>` 标签（因为同版本组件可能再次渲染）

---

## 7. Agent 集成

### 7.1 Phase 1: System Prompt 硬编码

组件 ≤ 5 个时，Tool Definitions 直接写入 system prompt。parameters 由 `schema.json` 构建时自动生成，不手动编写。

Tool Definition 的 `description` 由 `ai.md` 的"描述 + 适用场景 + 不适用场景 + 2-3 个 few-shot examples"拼接而成。examples 占 40-50% 的 description token 预算。

### 7.2 Phase 2: 语义匹配 Tool Retrieval

```
GET /api/agent/tools?query=显示所有运行中的服务&limit=5
```

流程：用户输入 → embedding → 与所有组件 `ai.md` 的 embedding 做余弦相似度 → 返回 Top-5。

无手动维护的关键词列表。`ai.md` 描述文本本身就是匹配依据。

### 7.3 组件状态摘要

每次 Agent 输出 `component` 消息后，系统自动注入状态摘要到对话上下文。Agent 在后续 action 处理中可以引用。

### 7.4 防抖

用户快速连续操作（如快速切换选中行）→ ComponentSlot 500ms 防抖 → 仅发送最后一次 action 给 Agent。

---

## 8. 安全模型

| 层级 | 措施 |
|---|---|
| **React 单例** | Import Maps 强制远程组件使用宿主 React |
| **组件来源** | Bundle SHA256 签名 |
| **Data 流向** | Phase 1 唯一数据源是 static props（Agent 提供），组件不发起网络请求 |
| **Props 单向** | 组件不能访问主应用的 state / fetch / auth token |
| **Error Boundary** | 每个 ComponentSlot 独立包裹，崩溃不影响聊天页面 |
| **版本锁定** | 主应用配置 `data-table: "1.x"` 仅使用兼容版本 |
| **peerDependencies 校验** | 加载前检查 React 版本兼容性 |

### Iframe Sandbox（Phase 3）

```
<iframe
  sandbox="allow-scripts"
  src="https://sandbox.copaw.dev/host"
  csp="default-src 'none'; script-src 'self'; connect-src 'none'"
/>
```

不开放 `allow-same-origin`。所有 API 调用由 ComponentSlot 在主应用侧代理。

---

## 9. 可观测性

### 9.1 埋点事件

```typescript
// lib/component-telemetry.ts

type ComponentEvent =
  // 加载
  | { type: "component:load"; component: string; version: string; durationMs: number }
  | { type: "component:load-fail"; component: string; version: string; error: string; reason: string }
  | { type: "component:load-timeout"; component: string; durationMs: number }
  | { type: "component:cache-hit"; component: string }
  // 渲染
  | { type: "component:render"; component: string; callId: string; durationMs: number }
  | { type: "component:render-error"; component: string; callId: string; error: string }
  | { type: "component:props-validation-error"; component: string; callId: string; detail: string }
  // 数据
  | { type: "component:data-truncated"; component: string; callId: string; expected: number; actual: number }
  // Agent
  | { type: "component:agent-select"; component: string; userIntent: string }
  | { type: "component:agent-no-select"; userIntent: string }
  // 交互
  | { type: "component:action"; component: string; action: string }
  | { type: "component:action-rate-limited"; component: string }
  // CSS
  | { type: "component:css-load-fail"; component: string; url: string }
  // 性能
  | { type: "component:bundle-size"; component: string; version: string; sizeBytes: number };
```

### 9.2 消费端

- **上报**：`POST /api/telemetry/component`（同源，避免广告拦截器）
- **聚合**：按 `component + type` 维度计算 P50/P95/P99
- **告警**：加载成功率 < 99%（持续 5min）→ 告警；P95 加载延迟 > 1s → 告警

---

## 10. 测试策略

### 10.1 分层

| 层 | 覆盖范围 | Phase |
|---|---|---|
| **L0 单元测试** | Registry 解析、loader URL 构造、ContentSegment 解析、防抖、actions.yaml scope 解析 | 1 |
| **L1 集成测试** | ComponentSlot + mock loader（成功/降级/Error Boundary）、ComponentSlot + mock SSE 消息、action → 用户消息构造 | 1 |
| **L2 录制回放** | 3 个 SSE fixture（Happy Path / 加载失败 / call-id 替换），确定性回放 | 1 |
| **L3 E2E** | 完整链路：用户输入 → Agent → SSE → 组件渲染 | 2 |
| **L4 视觉回归** | 组件在不同 props 下的快照对比 | 2 |

### 10.2 录制回放 Fixture

```
fixtures/
  happy-path-data-table.json     # Agent 输出 data-table component → 验证渲染
  load-failure-degradation.json  # component 消息但 bundle 不可用 → 验证降级
  call-id-replacement.json       # 相同 call_id 连续 2 条 → 验证替换非追加
```

Fixture 是纯 JSON，不依赖真实 Agent，前端回归 100% 确定性。

---

## 11. 性能优化

| 策略 | 机制 | Phase |
|---|---|---|
| **Bundle 预热** | SSE chunk 中出现 component 名时立即 `import()` | 1 |
| **不可变 URL** | `Cache-Control: max-age=31536000, immutable` | 1 |
| **Registry 缓存** | Map + sessionStorage，stale-while-revalidate | 1 |
| **Import Maps** | 浏览器原生缓存，宿主 React 只加载一次 | 1 |
| **Registry 预取** | 进入 chat 页面时预取 registry | 2 |
| **加载策略自适应** | < 200ms: 无 loading；200-800ms: spinner；> 800ms: 骨架屏 | 2 |
| **iframe 预热池** | 预加载 sandbox iframe | 3 |

---

## 12. 版本管理

| 变更类型 | 示例 | 主应用行为 |
|---|---|---|
| Patch | 1.2.0 → 1.2.1 | 自动使用 |
| Minor | 1.2.0 → 1.3.0 | 自动使用 |
| Major | 1.x → 2.0.0 | 需显式升级 |

配置：

```yaml
# registry.config.yaml
components:
  data-table: "1.x"
  detail-card: "2.0.x"
```

---

## 13. 与现有架构集成

### 13.1 修改点

| 文件 | 改动 | 程度 |
|---|---|---|
| `components/chat/content-segment.ts` | 新增 `{ type: "component", callId, name, props }` segment | 轻 |
| `app/(app)/agent/chat/chat-assistant-plan.tsx` | `renderSegments()` 新增 component case → `<ComponentSlot>` | 轻 |
| `lib/chat-api.ts` | SSE 解析新增 `component` 消息类型 | 轻 |
| `lib/prompts/` | 注入组件 Tool Definitions + few-shot examples | 中 |
| `app/layout.tsx` | 注入 `<script type="importmap">` | 轻 |

### 13.2 消息流

```
ChatMessageList (现有)
  │
  groupIntoTurns() (现有)
  │
  └── AssistantTurn (现有)
        ├── Layer 0: Thinking
        ├── Layer 1: Tools
        └── Layer 2: Text → AgentTextBlock
              │
              parseContentSegments() (现有)
              ├── markdown              → MessageResponse
              ├── workflow-step-result  → StepResultRenderer
              └── component             → ComponentSlot (新增)
```

---

## 14. 演进路径

### Phase 1 — 最小可验证单元（目标 1 周）

**核心链路**：Agent 输出 component → 前端加载远程组件 → 渲染。

- [ ] 定义 component.yaml + schema.json + ai.md + actions.yaml 格式规范
- [ ] `app/layout.tsx` 注入 Import Maps（React 单例）
- [ ] `lib/component-registry.ts`：registry 查询 + Map + sessionStorage 缓存
- [ ] `lib/component-loader.ts`：`import()` + AbortController 8s 超时 + CSS 去重注入
- [ ] `lib/component-telemetry.ts`：埋点 + `/api/telemetry/component` 上报
- [ ] `components/chat/component-slot.tsx`：完整状态机（loading/success/degraded/error）+ Error Boundary + 截断检测
- [ ] `components/chat/content-segment.ts`：新增 `component` segment 类型
- [ ] `lib/chat-api.ts`：SSE 解析新增 `component` 消息
- [ ] `lib/prompts/`：3 组件的 Tool Definitions（schema.json 自动生成 parameters）
- [ ] 3 个官方组件：`data-table`、`detail-card`、`confirm-form`（ESM + React external）
- [ ] 3 个录制回放 fixture（Happy Path / 加载失败 / call-id 替换）
- [ ] L0 + L1 测试覆盖

**验证指标**：Agent 组件选择准确率、P95 加载延迟、渲染成功率、数据截断发生率。

### Phase 2 — Marketplace 雏形（2-3 周）

- [ ] Marketplace 服务（同项目 route group）
- [ ] Registry API + Bundle CDN（国内 CDN 节点）
- [ ] 语义匹配 Tool Retrieval（embedding + 余弦相似度）
- [ ] 交互回路：action 文本消息 → Agent → component 更新
- [ ] 组件状态摘要注入
- [ ] 防抖保护
- [ ] Semver 版本解析
- [ ] L2 E2E + L4 视觉回归测试

### Phase 3 — 生态化（3-4 周）

- [ ] 第三方组件提交 API
- [ ] 自动化审核 pipeline（bundle AST 扫描 + 渲染测试 + 安全扫描）
- [ ] iframe Sandbox 通道
- [ ] 前端直连 API 数据源（作为 static 的性能补充）
- [ ] 组件评分 & 统计

---

## 15. 文件清单

### Phase 1 新增

```
lib/
  component-registry.ts
  component-loader.ts
  component-telemetry.ts
  component-manifest-types.ts

components/chat/
  component-slot.tsx
  component-error-card.tsx
  component-skeleton.tsx

fixtures/
  happy-path-data-table.json
  load-failure-degradation.json
  call-id-replacement.json

app/api/telemetry/component/
  route.ts
```

### Phase 1 修改

```
app/layout.tsx                                    # importmap 注入
components/chat/content-segment.ts                # 新增 component segment
app/(app)/agent/chat/chat-assistant-plan.tsx      # renderSegments 新增 component case
lib/chat-api.ts                                   # SSE 解析新增 component 消息
lib/prompts/                                      # 注入 Tool Definitions + examples
```

### Phase 2/3 新增

```
app/(marketplace)/
  api/registry/route.ts
  api/agent/tools/route.ts
  api/submit/route.ts
app/sandbox-host/page.tsx
```
