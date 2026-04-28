const template = `
---
**执行要求（系统指令，请严格遵守）：**

⚠️ **强制串行执行**：必须一步一步执行，**完整完成当前步骤（含输出结果块）后，才能开始下一步骤**。禁止在当前步骤结果块输出之前提及或描述后续步骤。

每执行一个步骤时，严格按以下顺序完成三件事：

**1. 步骤开始前**，用 shell 记录开始时间并解析工作目录：
\`\`\`bash
STEP_START=$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")
# 解析 WORKING_DIR：与后端逻辑一致（环境变量 > ~/.copaw 存在时用旧目录 > ~/.qwenpaw）
if [ -n "$QWENPAW_WORKING_DIR" ]; then
  WORKING_DIR="$QWENPAW_WORKING_DIR"
elif [ -n "$COPAW_WORKING_DIR" ]; then
  WORKING_DIR="$COPAW_WORKING_DIR"
elif [ -d "$HOME/.copaw" ]; then
  WORKING_DIR="$HOME/.copaw"
else
  WORKING_DIR="$HOME/.qwenpaw"
fi
STEPS_FILE="$WORKING_DIR/workflow-runs/{{WORKFLOW_FILENAME}}/{{RUN_ID}}.steps.json"
\`\`\`

**2. 步骤完成后**，写入步骤结果文件（使用 execute_shell_command 工具）：

\`\`\`bash
mkdir -p "$(dirname "$STEPS_FILE")"
STEP_END=$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")
STEP_JSON='{"step_id":"实际步骤ID","step_title":"实际步骤名称","status":"success或failed","result":"ok或warn或critical或info","started_at":"'\$STEP_START'","finished_at":"'\$STEP_END'","output":"实际输出摘要","error":null或"错误信息"}'
if [ -f "$STEPS_FILE" ]; then
  python3 -c "import json,sys; d=json.load(open('$STEPS_FILE')); d.append(json.loads(sys.argv[1])); open('$STEPS_FILE','w').write(json.dumps(d,indent=2,ensure_ascii=False))" "$STEP_JSON"
else
  python3 -c "import json,sys; open('$STEPS_FILE','w').write(json.dumps([json.loads(sys.argv[1])],indent=2,ensure_ascii=False))" "$STEP_JSON"
fi
\`\`\`

**3. 步骤完成后，立即在当前步骤文字说明紧接着**输出结果块（在进入下一步骤之前必须先输出此块）：

\`\`\`workflow-step-result
{"step_id":"实际步骤ID","step_title":"实际步骤名称","status":"success","result":"ok","started_at":"2025-01-01T00:00:00Z","finished_at":"2025-01-01T00:00:05Z","output":"实际输出摘要","error":null}
\`\`\`

**字段填写规则（禁止照抄示例值，必须根据实际执行结果填写）：**
- **status**：步骤本身是否执行完成
  - \`success\`：步骤正常执行完毕（即使发现异常，只要步骤本身跑完就是 success）
  - \`failed\`：步骤执行过程中出错（工具调用失败、命令报错等）
  - \`skipped\`：步骤被跳过
- **result**：步骤执行后发现的业务巡检结果（必填，不可省略）
  - \`ok\`：一切正常，无异常
  - \`info\`：有提示性信息，无需立即处理
  - \`warn\`：发现警告，需要关注（如队列积压、资源使用偏高等）
  - \`critical\`：发现严重问题，需要立即处理（如服务不可用、数据异常、超过阈值的 CRITICAL 告警等）
{{STEP_CRITERIA}}- **error**：成功时为 null，执行失败时填写错误信息
- **output**：该步骤的关键输出摘要（100字以内，包含核心数据和发现的问题）
- **started_at / finished_at**：ISO 8601 UTC 格式（如 2025-01-01T12:00:00Z）
- **每个步骤的结果块必须紧跟在该步骤的执行说明之后立即输出，不得推迟到后续步骤之后**
- 三件事必须在每步执行时完成，不可省略

**报告步骤额外要求（仅在执行 skill 为 s3c 的报告步骤时执行）：**

报告上传 S3 成功后，必须立即调用以下 shell 命令将报告地址写回执行记录：

\`\`\`bash
curl -s -X PATCH http://localhost:3000/api/workflows/{{WORKFLOW_FILENAME}}/runs/{{RUN_ID}} \\
  -H "Content-Type: application/json" \\
  -d "{\\"report\\":\\"<实际的S3 key，如 s3-copaw-prod/inspections/xxx.md>\\"}"
\`\`\`

将 \`<实际的S3 key>\` 替换为上传成功后返回的完整 S3 对象路径。
`;

export default template;
