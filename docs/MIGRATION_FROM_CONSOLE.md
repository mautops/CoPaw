# next-console 迁移重构计划 (相对 console)

## 1. 原则

| 项目         | 说明                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **实现仓库** | 只在 **next-console** 中新增与修改代码, 这是唯一交付物                                             |
| **console**  | **只可参考** 交互, 路由划分, 业务含义与 API 调用方式, **禁止** 复制粘贴整页或依赖其构建产物        |
| **后端**     | 以当前 Wisecore API **实际行为** 为准, 与 console 不一致时以 API 与 next-console 联调结果为准         |
| **UI**       | Next.js App Router, **shadcn/ui**, 聊天相关已用 **ai-elements** 的继续沿用, 其它页面以 shadcn 为主 |

## 2. 范围说明

### 2.1 已完成, 本计划不再安排开发

- **`/agent/chat`** 及其子模块 (会话, 流式, 消息列表等) 视为 **已重构完成**, 不在下列任务中重复排期, 仅可在全局联调时做缺陷修复

### 2.2 本计划覆盖内容

- 侧栏导航扩展, 与下列新路由一致
- 各功能页在 **next-console** 内从零实现 (可参考 console 行为, 代码在 next-console)

## 3. 目标信息架构 (建议路由)

以下路径均在 **next-console** `app/` 下实现, 与现有 `/agent/chat`, `/agent/workflows` 并存.

| 分组   | 路径                     | 对应原 console 功能 (参考) |
| ------ | ------------------------ | -------------------------- |
| 控制   | `/control/channels`      | `/channels`                |
| 控制   | `/control/sessions`      | `/sessions`                |
| 控制   | `/control/cron-jobs`     | `/cron-jobs`               |
| 控制   | `/control/heartbeat`     | `/heartbeat`               |
| 智能体 | `/agent/skills`          | `/skills`                  |
| 智能体 | `/agent/tools`           | `/tools`                   |
| 智能体 | `/agent/mcp`             | `/mcp`                     |
| 智能体 | `/agent/workspace`       | `/workspace`               |
| 智能体 | `/agent/config`          | `/agent-config`            |
| 设置   | `/settings/agents`       | `/agents`                  |
| 设置   | `/settings/models`       | `/models`                  |
| 设置   | `/settings/environments` | `/environments`            |
| 设置   | `/settings/security`     | `/security`                |
| 设置   | `/settings/token-usage`  | `/token-usage`             |
| 设置   | `/settings/voice`        | `/voice-transcription`     |

**已存在且独立演进**

- `/agent/workflows` (fork 工作流, 非 console 同源菜单, 继续只在本仓库维护)

**登录与全局**

- `login` 与认证以 Better Auth 与现有 **next-console** 实现为准, 与 console Login 的差异在实现阶段单独列需求, 不照搬旧 SPA

## 4. 分层与文件约定 (每次迁移页面必须遵守)

1. **路由** `app/(app)/<area>/<page>/page.tsx` 尽量薄, 复杂 UI 拆到同目录 `*-client.tsx` 或 `components/`
2. **数据** `lib/` 下为该域增加或扩展 `*-api.ts`, 类型与 `/api/wisecore` 代理路径集中, **不** 从 console 复制 `api/` 目录结构
3. **状态** 列表/详情优先 **TanStack Query**, 与现有 chat/workflows 一致
4. **组件** 优先 **shadcn** Table, Dialog, Sheet, Form, 与项目现有 `components/ui/*`

## 5. 分阶段执行计划

### 阶段 A, 导航与空壳 (阻塞后续页面)

**目标** 用户可从侧栏进入各模块, 页面可先占位 (标题 + 简短说明 + 「开发中」或空状态)

**交付物**

- 更新 `components/layout/sidebar-nav.tsx` (或等价), 增加「控制面 / 智能体 / 设置」分组与上表路由链接
- 为表中每个路径建立 **route segment** 与 **page.tsx**, 内容可为最小占位
- 可选 `layout.tsx` 统一各分组的 PageHeader 样式

**验收** 点击侧栏每个入口可 200 打开, 无控制台路由错误

**落地** 阶段 A 已在仓库实现: `components/layout/sidebar-nav.tsx`, `components/migration/migration-placeholder.tsx`, `app/(app)/control/*`, `app/(app)/agent/{skills,tools,mcp,workspace,config}`, `app/(app)/settings/*` 占位页.

---

### 阶段 B, 智能体能力 (建议先于控制面, 与 Runner 配置强相关)

按顺序降低阻塞, 允许在实现中微调顺序, 但建议不要跳过「API 层先通」

| 顺序 | 路径               | 开发要点 (在 next-console 内)                                                  |
| ---- | ------------------ | ------------------------------------------------------------------------------ |
| B1   | `/agent/skills`    | 列表, 搜索/筛选, 新建/编辑抽屉, 对接 skills API (**已实现**)                   |
| B2   | `/agent/tools`     | 工具列表, Tool Guard 相关入口与配置, 与 security 有交集处预留链接 (**已实现**) |
| B3   | `/agent/mcp`       | MCP 客户端列表, 增删改, 连接状态 (**已实现**)                                  |
| B4   | `/agent/workspace` | 工作区文件树, 打开/编辑/保存, 大文件与权限错误处理 (**已实现**)                |
| B5   | `/agent/config`    | 智能体运行参数 (与现有 agent 模型配置关系写清), 表单校验 (**已实现**)          |

**每页验收**

- 主要 CRUD 路径可走通, 错误有 Toast 或 inline 提示
- 不依赖 console 运行, 仅对接本仓库 API 与代理

---

### 阶段 C, 控制面

| 顺序 | 路径                 | 开发要点                                             |
| ---- | -------------------- | ---------------------------------------------------- |
| C1   | `/control/channels`  | 通道列表与编辑, 与后端 channel API 一致 (**已实现**) |
| C2   | `/control/sessions`  | 会话查询, 筛选, 详情或抽屉 (**已实现**)              |
| C3   | `/control/cron-jobs` | Cron 列表, 表达式编辑, 启用/禁用 (**已实现**)        |
| C4   | `/control/heartbeat` | 心跳配置与状态展示 (**已实现**)                      |

**验收** 同阶段 B, 且与 chat 无路由冲突 (chat 已排除本计划)

---

### 阶段 D, 设置

| 顺序 | 路径                     | 开发要点                                                                          |
| ---- | ------------------------ | --------------------------------------------------------------------------------- |
| D1   | `/settings/models`       | Provider, 模型列表, 本地/Ollama/远程等模态框, 体量最大, 可再拆子任务 (**已实现**) |
| D2   | `/settings/environments` | 环境变量表格, 增删改, 敏感字段掩码 (**已实现**)                                   |
| D3   | `/settings/agents`       | 注册智能体列表, 与 agents API 对齐 (**已实现**)                                   |
| D4   | `/settings/token-usage`  | 用量统计, 时间范围, 空状态 (**已实现**)                                           |
| D5   | `/settings/security`     | 规则表, File Guard, Skill 扫描等, 与 tools 页面交叉引用 (**已实现**)              |
| D6   | `/settings/voice`        | 语音转写配置 (**已实现**)                                                         |

**验收** 同阶段 B

---

### 阶段 E, 全局与打磨 (可并行于末批页面)

- 侧栏当前用户, 登出, 与 Better Auth 一致 (**已实现**: `app/(app)/layout.tsx` 服务端 `getSession` 注入 `AppShell` / `LeftSidebar`, `UserProfileMenu` 使用 `authClient.signOut` 并 `router.refresh` 后跳转登录)
- 版本/更新提示若需要, **在 next-console 新写**, 可参考 console 产品逻辑, 不复制其实现 (**已实现**: 侧栏底部展示 `package.json` 的 `version`, 无自动更新检测)
- 文案与无障碍, 与现有 chat 页风格统一 (**已实现**: 用户菜单中文文案, 触发按钮 `type`/`aria-label`/焦点环, 版本行 `aria-label`)

## 6. 单页标准「定义完成」(DoD)

适用于 **2.2 本计划覆盖** 的路由与侧栏入口 (不含仅占位的 overview/resources 等 Hi-Ops 壳页).

- [x] 路由与侧栏可发现
- [x] `lib/*-api` 或既有 API 封装完整, 类型明确
- [x] 主流程在代理开启下可完成, 无需本地 console
- [x] Loading / Error / Empty 三种状态可辨
- [x] 未引入 console 源码依赖, 仅允许口头/文档参考

## 7. 风险与依赖

- **API 变更** 若后端随上游升级, 以 next-console 联调为准, 更新 `lib` 而非回退到 console
- **安全与工具** `/settings/security` 与 `/agent/tools` 建议同一迭代周期内至少各有一轮联调, 避免规则与工具列表不一致
- **工作量** D1 models 与 B4 workspace 通常最耗时, 排期上允许单独里程碑

## 8. 文档维护

- 本文件随里程碑更新勾选或追加子任务
- 若某路由命名变更, 只改 **next-console** 内链接与本文档, 不回写 console

## 9. 范围澄清: 迁移计划 vs 全量 Wisecore API

**迁移计划 (本文 2.1 + 2.2 + 阶段 A–E) 内的前端能力: 已按计划落地**, DoD 见第 6 节.

**不等于**「旧 console SPA 的每一个交互」或「Wisecore 暴露的每一个 HTTP 路由」都在 next-console 有页面. 下列后端能力 **当前无专门 UI 或未完整覆盖** (若产品需要, 应另开需求):

| 领域                | 后端 (示例路径)                                                                          | next-console 现状                               |
| ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Console 推送        | `GET /console/push-messages`                                                             | 未轮询, 多标签推送类能力未接                    |
| Skills Hub / 批量   | `/skills/hub/*`, `/skills/upload`, `batch-enable` / `batch-disable`, `/skills/available` | 仅列表/创建覆盖/启停/删除, 无 Hub 安装与批量 UI |
| Skill AI 优化       | `POST /skills/ai/optimize/stream`                                                        | 未接                                            |
| Ollama 模型生命周期 | `/ollama-models/*`                                                                       | 模型页走 `/models` Provider, 无拉取/任务轮询 UI |
| 本地模型下载        | `/local-models/*`                                                                        | 未接                                            |
| 跨通道发消息        | `POST /messages/send`                                                                    | 未接 (与通道业务相关)                           |
| 用户时区等          | `PUT /config/user-timezone` 等                                                           | 未接独立设置页 (或依赖工具/后端默认)            |
| Wisecore 内置登录      | `/auth/*`                                                                                | **有意替换** 为 Better Auth + `/login`          |

**Hi-Ops 扩展**: `/dashboard`, `/overview/services`, `/resources/*` 仅为说明与快速入口, 非 Wisecore 业务 API.

---

_文档版本, 与仓库同步维护, 具体开发以本计划与 next-console 代码为准._
