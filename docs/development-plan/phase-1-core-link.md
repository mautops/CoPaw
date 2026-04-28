# Phase 1 — 核心链路验证

> 工期: 1 周 | 目标: Agent 输出 component → 前端加载远程组件 → 渲染

## 成功标准

- [ ] 用户在聊天中输入"显示所有服务"，Agent 返回 `data-table` 组件并正确渲染
- [ ] 组件 bundle 从 CDN 加载，不打包在主项目中
- [ ] 远程组件使用宿主 React 实例（Import Maps 生效）
- [ ] 组件加载失败时降级为文本（不白屏、不崩溃）
- [ ] 3 个录制回放 fixture 全部通过

---

## Day 1-2: 基础设施

### Task 1.1 — 类型定义

**文件**: `lib/component-manifest-types.ts`

```
□ 定义 ComponentManifest 接口（name, version, bundle, css?, propsSchema）
□ 定义 ContentSegment 扩展: { type: "component", callId, name, props }
□ 定义 ComponentAction 接口（name, scope, payload）
□ 定义 ComponentStatus: 'idle' | 'loading' | 'loaded' | 'degraded' | 'error'
```

### Task 1.2 — 格式规范落地

**文件**: 无（规范文档）

```
□ 将架构方案 §4 的格式规范转化为实际的目录结构
□ 创建 marketplace/components/_template/ 模板目录
□ 模板含: component.yaml + schema.json + ai.md + actions.yaml + README.md
```

### Task 1.3 — Registry 缓存

**文件**: `lib/component-registry.ts`

```
□ resolveManifest(name, version): 查缓存 → 未命中则 fetch registry API
□ 内存 Map 缓存，stale-while-revalidate
□ sessionStorage 持久化缓存
□ Registry fetch 超时 5s，超时/失败时使用缓存
□ getBundleUrl(manifest): 拼接 CDN URL
```

### Task 1.4 — 组件加载器

**文件**: `lib/component-loader.ts`

```
□ loadComponent(name, version): Promise<React.ComponentType>
□ import() + AbortController 8s 超时
□ 超时/网络错误 → 抛出 LoadError（含 reason 字段）
□ CSS 注入: injectStylesheet(url) → 返回 Promise（监听 load 事件）
□ injectedStylesheets Set 去重
□ CSS 加载 > 3s 超时兜底（跳过等待，无样式渲染）
□ peerDependencies 校验（React 版本检查）
```

### Task 1.5 — Import Maps 注入

**文件**: `app/layout.tsx`（修改）

```
□ 在 <head> 中注入 <script type="importmap">
□ 映射 react, react-dom, react/jsx-runtime 到宿主实例
□ 仅在客户端生效（dangerouslySetInnerHTML 或 next/script with strategy）
```

**验证**: 浏览器 DevTools → Application → Import Maps 可见三个映射。

---

## Day 3-4: 渲染管道

### Task 2.1 — ContentSegment 扩展

**文件**: `components/chat/content-segment.ts`（修改）

```
□ ContentSegment 类型新增:
    { type: "component", callId: string, name: string, props: Record<string, any> }
□ parseContentSegments() 识别 component 类型的 fenced code block
    或 SSE 消息直接生成的 segment
```

### Task 2.2 — ComponentSlot 核心

**文件**: `components/chat/component-slot.tsx`

状态机实现:

```
□ idle → 收到 component 消息 → loading
□ loading → loadComponent() 成功 → loaded
□ loading → loadComponent() 失败 → degraded（降级为文本）
□ loaded → 组件 render 时 throw → Error Boundary 捕获 → error
□ loaded → 新 component 消息同 call_id → 更新 props（React key 递增）
□ loaded → visible: false → unmounted
□ 任何状态 → 组件卸载 → 清理（AbortController abort）
```

功能:

```
□ React key = call_id + 递增序列号（确保替换时状态重置）
□ 包裹独立的 Error Boundary
□ 数据截断检测: 比对 toolCallResult.total vs dataSource.length
□ 截断时渲染提示条: "仅展示前 X/Y 条"
□ 防抖: 500ms 内多次 action 仅发最后一次
□ Suspense fallback: <ComponentSkeleton />
```

### Task 2.3 — ComponentSkeleton

**文件**: `components/chat/component-skeleton.tsx`

```
□ 加载中骨架屏（高度与预期组件接近的灰色占位矩形）
□ 200ms 延迟显示（避免闪烁，< 200ms 的加载不显示骨架屏）
□ aria-label="组件加载中"
```

### Task 2.4 — ComponentErrorCard

**文件**: `components/chat/component-error-card.tsx`

```
□ 错误卡片 UI（红色边框，错误概要，不暴露内部堆栈）
□ [重试] 按钮 → 重新调用 loadComponent()
□ [查看文本] 按钮 → 切换为降级文本展示
□ 超时场景的专属提示: "组件加载超时，已切换为文本展示"
```

### Task 2.5 — SSE 解析扩展

**文件**: `lib/chat-api.ts`（修改）

```
□ SSE 消息解析中新增 "component" 类型处理
□ component 消息 → 生成 ContentSegment { type: "component", callId, name, props }
□ 解析 component 消息中的 visible 字段
□ 相同 call_id 的去重处理（SSE 重连场景）
```

### Task 2.6 — renderSegments 集成

**文件**: `app/(app)/agent/chat/chat-assistant-plan.tsx`（修改）

```
□ renderSegments() switch/case 新增 "component" → <ComponentSlot />
□ 传入 onSendToAgent 回调（action → 用户消息 → 对话）
```

---

## Day 5: 官方组件

### Task 3.1 — 组件构建模板

```
□ 创建组件项目模板（Vite + React 19）
□ 配置 external: ['react', 'react-dom', 'react/jsx-runtime']
□ 配置 output.format: 'es'
□ 配置 CSS Modules
□ 构建脚本: build → bundle/index.js + bundle/style.css
□ SHA256 签名生成: build → bundle/index.js.sha256
□ 部署脚本: 上传到 CDN + 更新 registry
```

### Task 3.2 — data-table 组件

```
□ 渲染: 表头 + 表体，支持 renderType (text/badge/link/time)
□ 排序: 点击列头切换 asc/desc/none（scope: internal）
□ 分页: pageSize + current（scope: internal）
□ 行点击: 发出 row-click action（scope: agent）
□ 行选中: 复选框 + 发出 row-select action（scope: agent）
□ 空数据态: "暂无数据" 占位
□ 截断提示: 底部显示 "仅展示前 X/Y 条"
□ schema.json 定义 columns + dataSource + pagination
```

### Task 3.3 — detail-card 组件

```
□ 渲染: 键值对列表展示单个对象详情
□ renderType: text/badge/link/time/code
□ 布局: 两列（label + value）或单列
□ schema.json 定义 data + layout
```

### Task 3.4 — confirm-form 组件

```
□ 渲染: 标题 + 描述 + 确认/取消按钮
□ 确认: 发出 confirm action（scope: agent）
□ 取消: 发出 cancel action（scope: agent）
□ 支持 danger 模式（红色确认按钮）
□ schema.json 定义 title + description + danger
```

### Task 3.5 — Agent Tool Definitions

**文件**: `lib/prompts/`（修改）

```
□ 构建脚本: 读取各组件的 schema.json → 生成 Tool Definition parameters
□ 构建脚本: 读取 ai.md → 拼接 description（描述 + 适用/不适用 + 2-3 examples）
□ 将 3 个 Tool Definition 注入 system prompt
□ 每个 Tool Definition 的 function.name 格式: render_<component-name>
```

---

## Day 6: 测试与可观测性

### Task 4.1 — 单元测试

```
□ component-registry.test.ts: 缓存命中/未命中、超时回退、sessionStorage 持久化
□ component-loader.test.ts: 成功加载、超时、网络错误、CSS 注入去重
□ content-segment.test.ts: component segment 解析、畸形消息处理
□ component-slot 状态机测试: idle→loading→loaded/degraded/error
□ 防抖测试: 500ms 内多次调用仅触发一次
```

### Task 4.2 — 录制回放 Fixture

```
□ fixtures/happy-path-data-table.json
    — 模拟 Agent SSE 流: text + API tool call result + component 消息
    — 验证: data-table 组件渲染、columns + dataSource props 正确

□ fixtures/load-failure-degradation.json
    — 模拟 component 消息 + CDN 不可用（mock import() 失败）
    — 验证: 降级为文本、component:load-fail 埋点触发

□ fixtures/call-id-replacement.json
    — 模拟相同 call_id 连续 2 条 component 消息
    — 验证: 旧组件卸载、新组件挂载、旧 DOM 消失
```

### Task 4.3 — 可观测性

**文件**: `lib/component-telemetry.ts`

```
□ 实现所有 ComponentEvent 类型的 builder 函数
□ POST /api/telemetry/component 上报端点
□ reportEvent(event): 发送到上报端点，失败时 console.warn（不抛错）
```

**文件**: `app/api/telemetry/component/route.ts`

```
□ 接收 POST，写入日志/时序数据库
□ 请求体校验（zod schema）
□ 异步处理，不阻塞响应
```

---

## Day 7: 集成验证

### Task 5 — 端到端验证

```
□ 部署 3 个组件 bundle 到 staging CDN
□ 更新 staging registry 注册 3 个组件
□ 在主应用聊天中实际测试:

  场景 1: "显示所有服务" → Agent 输出 data-table → 组件正确渲染
  场景 2: "查看 api-gateway 详情" → Agent 输出 detail-card → 组件正确渲染
  场景 3: "确认重启 api-gateway?" → Agent 输出 confirm-form → 组件正确渲染
  场景 4: 断网后发消息 → 组件加载失败 → 降级为文本（不白屏）
  场景 5: Agent 返回大量数据（> 100 条）→ 截断检测触发 → 提示条显示
  场景 6: 快速切换组件（相同 call_id 替换）→ 旧组件卸载、新组件挂载
  场景 7: 组件内部 throw → Error Boundary 捕获 → 错误卡片

□ 录制 3 个测试场景为回放 fixture
□ 运行全部 L0 + L1 测试，确保通过
```

---

## Phase 1 交付检查清单

- [ ] 3 个组件在聊天中正确渲染，不使用主项目 bundle
- [ ] Import Maps 生效（React DevTools 确认只有一个 React 实例）
- [ ] 组件加载失败时降级为文本
- [ ] 数据截断时显示提示
- [ ] Error Boundary 隔离组件崩溃
- [ ] 3 个回放 fixture 通过
- [ ] L0 + L1 测试覆盖率 > 80%
- [ ] Telemetry 事件正确上报
- [ ] Phase 1 成功标准全部达成 → 进入 Phase 2
