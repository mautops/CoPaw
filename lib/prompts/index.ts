/**
 * 所有 AI 提示词模板统一从此文件导入。
 * 占位符格式：{{PLACEHOLDER_NAME}}
 */

export const SUGGESTIONS_WELCOME = `你是一个 AI 运维助手。
请生成 4 条用户初次见面最可能提问的问题，要求：
- 每条不超过 20 字
- 简短、具体、可操作
- 覆盖不同使用场景
只输出 JSON 字符串数组，不要任何解释。例如：["问题1","问题2","问题3","问题4"]`;

export const SUGGESTIONS_FOLLOWUP = `根据以下对话，生成 3 条用户可能的追问：
用户：{{USER_MSG}}
助手：{{ASSISTANT_MSG}}

要求：
- 每条不超过 20 字
- 与上文强相关
- 不重复用户已问过的内容
只输出 JSON 字符串数组，不要任何解释。例如：["追问1","追问2","追问3"]`;

/** 集群背景信息前缀，注入 workflow 执行消息前 */
export const WORKFLOW_CLUSTER_PREFIX = `**集群背景信息（请在执行过程中严格参考）：**
{{CLUSTER_PROMPT}}

---

{{WORKFLOW_MARKDOWN}}`;

/** checklist 执行提示词主体，{{STEP_LINES}} 由调用方动态生成 */
export const CHECKLIST_EXECUTION = `# 执行例行巡检

**服务：** {{SERVICE_NAME}}
**巡检：** {{CHECKLIST_NAME}}
**说明：** {{CHECKLIST_DESCRIPTION}}

## 执行步骤

{{STEP_LINES}}

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

/** 自动追加报告上传步骤的 YAML 片段，{{SERVICE_NAME}} 为服务短名 */
export const WORKFLOW_REPORT_STEP = `  - id: "step_auto_report"
    name: "巡检报告"
    skill: "s3c"
    language: "markdown"
    code: |
      汇总所有巡检步骤，生成专业完整的 Markdown 格式巡检报告，并使用 s3c 上传到 inspections 目录
    instructions: |
      1. 汇总所有步骤的执行结果，形成专业完整的 Markdown 格式巡检报告
      2. 报告文件名格式：{{SERVICE_NAME}}-<集群环境>-inspection-<YYYYMMDD>.md（如 {{SERVICE_NAME}}-prod-inspection-20260422.md）
      3. 使用 s3c 将报告上传到 S3 的 inspections 目录：s3c put <报告文件> inspections/<报告文件名>
      4. 上传成功后，输出一行格式为 S3_REPORT_KEY=<完整key> 的标记（如 S3_REPORT_KEY=s3-copaw-prod/inspections/{{SERVICE_NAME}}-prod-inspection-20260422.md），这行必须单独输出`;

/** 新建 Skill 时的默认 Markdown 模板 */
export const SKILL_DEFAULT_TEMPLATE = `---
name: my_skill
description: 简短说明该 skill 的用途与触发时机
---

# 标题

在此编写 skill 正文与步骤说明.
`;
