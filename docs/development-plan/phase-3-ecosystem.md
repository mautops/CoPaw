# Phase 3 — 生态开放

> 工期: 3-4 周 | 目标: 第三方组件提交、安全审核、沙箱隔离

## 前置条件

- [ ] Phase 2 全部交付检查清单通过
- [ ] Marketplace 在生产环境稳定运行 ≥ 2 周
- [ ] 至少 5 个官方组件在线

---

## Week 1-2: 第三方组件提交

### Task 1.1 — 组件开发者 CLI

**文件**: 独立 npm 包 `@copaw/create-component`

```
□ 脚手架: npx @copaw/create-component my-component
□ 生成模板项目（Vite + React 19 + TypeScript）
□ 预配置: React external + CSS Modules + ESM output
□ 命令:
    - npm run dev — 本地开发（独立页面预览）
    - npm run build — 构建（bundle/index.js + style.css + schema.json）
    - npm run deploy — 构建 + SHA256 签名 + 上传 CDN + 提交 registry
□ deploy 需要 API key（在 Marketplace 管理端生成）
```

### Task 1.2 — 组件提交 API

**文件**: `app/(marketplace)/api/submit/route.ts`

```
□ POST /api/submit
□ 请求体:
    - name, version, displayName, category
    - bundle: { index: url, css?: url, sha256: string }
    - schema.json contents
    - ai.md contents
    - actions.yaml contents
    - README.md 内容（可选）
    - author: { name, email }
□ 校验:
    - name 不重复（新组件）或 version 大于当前最新（更新）
    - schema.json 符合 JSON Schema 规范
    - bundle.sha256 与实际文件匹配
    - 所有必填字段完整
□ 校验通过 → 触发审核 pipeline（异步）
□ 返回: { status: "pending_review", reviewId }
```

### Task 1.3 — 自动化审核 Pipeline

**文件**: `lib/component-review-pipeline.ts`

```
审核步骤（顺序执行，任一步骤失败即拒绝）:

Step 1 — Bundle AST 静态扫描
  □ 解析 bundle JS AST
  □ 检查: 无 eval() / new Function() / document.write()
  □ 检查: 无 fetch() / XMLHttpRequest（Phase 3 组件不允许网络请求）
  □ 检查: 无 localStorage / sessionStorage 直接访问
  □ 检查: import 语句仅引用 allowed externals (react, react-dom, ...)
  □ 检查: 无动态 import() / 无代码混淆特征

Step 2 — Schema 校验
  □ schema.json 符合 JSON Schema Draft 2020-12
  □ Props 定义完整（每个 prop 有 type 和 description）
  □ 无不安全字段（如 dangerouslySetInnerHTML）

Step 3 — 依赖漏洞扫描
  □ npm audit（提交的 bundle 需附带 package-lock.json 或提供依赖清单）
  □ 不能有 Critical/High 漏洞

Step 4 — 自动化测试
  □ Bundle 大小 ≤ 200KB gzipped
  □ render 测试: 使用 schema.json 生成随机合法 props → 渲染不抛错
  □ 空数据测试: dataSource=[] → 不变现空白/崩溃
  □ props 缺失 required 字段 → 组件优雅处理
  □ XSS 测试: props 中注入 <script>alert(1)</script> → 不被执行
  □ a11y: axe-core 扫描无 critical violations

Step 5 — 人工审核（仅以下情况触发）
  □ 组件使用 Shadow DOM 或 portal（技术复杂）
  □ 组件声明了用户数据收集
  □ 首次提交的开发者
```

### Task 1.4 — 审核结果通知

```
□ 审核通过 → registry 上架（status: active）→ 邮件/站内信通知开发者
□ 审核拒绝 → 返回错误报告（步骤序号 + 具体原因 + 修复建议）→ 邮件/站内信通知
□ 审核超时 (> 24h) → 自动提醒管理员
```

---

## Week 2-3: 安全沙箱

### Task 2.1 — Sandbox Host 页面

**文件**: `app/sandbox-host/page.tsx`

```
□ 极简 HTML 页面，包含:
    - 一个 <div id="root"> 挂载点
    - 监听 postMessage 接收 props + bundleUrl
    - import(bundleUrl) → ReactDOM.createRoot → 渲染组件
    - 监听组件 action → postMessage 发送给宿主
□ 不加载主应用的任何 CSS/JS（减小攻击面）
□ 不包含主应用的 auth token / cookie（通过 sandbox 属性隔离）
```

### Task 2.2 — Iframe Sandbox Slot

**文件**: `components/chat/component-slot-iframe.tsx`

```
□ 当 component.sandbox === "sandbox" 时使用此组件（替代普通 ComponentSlot）
□ <iframe sandbox="allow-scripts" src="/sandbox-host">
□ postMessage 发送: { type: "init", bundleUrl, props }
□ 监听 postMessage 接收: { type: "action", action, payload }
□ 超时: 10s 无响应 → 降级为文本
□ CSP: default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'none'
```

### Task 2.3 — API 代理（Sandbox 组件数据获取）

```
□ 如果 sandbox 组件需要数据（Phase 3 引入前端直连 API 数据源）
□ ComponentSlot 在主应用侧发起 API 调用（受白名单限制）
□ 结果通过 postMessage 传入组件
□ 白名单: 每个 sandbox 组件在 manifest.allowedEndpoints 中声明
□ 与 Phase 1-2 的 static 数据策略不冲突（sandbox 组件也可用 static 模式）
```

---

## Week 3-4: 生态运营

### Task 3.1 — 组件评分系统

**文件**: `app/(marketplace)/api/ratings/`

```
□ POST /api/ratings/:name — 提交评分（1-5 星 + 可选评论）
□ GET /api/ratings/:name — 获取评分统计（平均分 + 数量 + 分布）
□ 每个用户每个版本只能评分一次
□ 开发者可回复评论
```

### Task 3.2 — 组件使用统计

```
□ 埋点消费: component:load 事件 → 聚合 → 每个组件的使用次数
□ 维度: 组件名 + 版本 + 时间（日/周/月）
□ Dashboard: 热门组件 Top 10、安装趋势图
□ 展示在组件详情页和列表页
```

### Task 3.3 — 组件搜索 & 发现

```
□ 搜索: 按 name / displayName / description / category 全文搜索
□ 排序: 按评分 / 安装量 / 更新时间
□ 分类筛选: data-display / input-form / chart / interactive / layout
□ "精选组件" 推荐位（管理员手动设置）
```

### Task 3.4 — 灰度发布

```
□ 组件支持发布通道: stable / beta / canary
□ 主应用可配置使用特定通道: data-table: "1.x@stable"
□ 新版本先发布到 canary → 内部测试 → beta → stable
□ 灰度比例控制（如 10% 用户使用 beta，90% 使用 stable）
```

---

## Phase 3 交付检查清单

- [ ] 第三方组件提交 API 可用，审核 pipeline 正常运行
- [ ] 自动化审核 5 步全部实现
- [ ] Sandbox iframe 隔离就绪（至少 1 个第三方组件在 sandbox 中运行）
- [ ] 组件评分系统可用
- [ ] 使用统计 Dashboard 可用
- [ ] 灰度发布通道可用
- [ ] 安全审计: 渗透测试通过（sandbox 逃逸测试）
- [ ] Phase 3 全部交付 → 正式发布 Component Marketplace 1.0
