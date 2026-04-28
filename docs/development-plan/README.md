# Component Marketplace — 开发计划总览

> 基于 [架构方案 v3](../component-marketplace-architecture.md)

## 阶段总览

| 阶段 | 工期 | 目标 | 交付物 |
|---|---|---|---|
| [Phase 1](./phase-1-core-link.md) | 1 周 | 验证核心链路 | 3 个官方组件 + 完整加载/渲染/降级 |
| [Phase 2](./phase-2-marketplace.md) | 2-3 周 | Marketplace 雏形 | Registry API + Tool Retrieval + 交互回路 |
| [Phase 3](./phase-3-ecosystem.md) | 3-4 周 | 生态开放 | 第三方组件 + Sandbox + 审核 pipeline |

## 依赖关系

```
Phase 1 ──→ Phase 2 ──→ Phase 3
  │            │            │
  核心链路      平台化        生态化
  必须全部完成   必须全部完成   可并行部分
```

## 启动条件

- [ ] 架构方案 v3 已评审通过
- [ ] 开发环境就绪（Next.js 16 + Turbopack + TypeScript）
- [ ] 组件 CDN 域名已申请
