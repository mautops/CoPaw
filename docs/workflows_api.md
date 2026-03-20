# Workflows API Documentation

用户级工作流管理 API，支持多 Agent 编排。

## 概述

Workflows 位于用户级别（`~/.copaw/workflows/`），可以编排多个 Agent 协同完成任务。

## API Endpoints

### 1. 列出所有工作流

**GET /api/workflows**

响应示例：
```json
{
  "workflows": [
    {
      "filename": "daily_report.yml",
      "path": "/Users/user/.copaw/workflows/daily_report.yml",
      "size": 1024,
      "created_time": "1710921600.0",
      "modified_time": "1710921700.0"
    }
  ]
}
```

### 2. 获取工作流内容

**GET /api/workflows/{filename}**

响应示例：
```json
{
  "content": "name: Daily Report\ndescription: Generate daily report\nsteps:\n  - name: Collect data\n    agent: data-collector\n    skill: web_search"
}
```

### 3. 创建工作流

**POST /api/workflows**

请求体：
```json
{
  "filename": "daily_report.yml",
  "content": "name: Daily Report\ndescription: Generate daily report"
}
```

响应示例：
```json
{
  "success": true,
  "filename": "daily_report.yml",
  "path": "/Users/user/.copaw/workflows/daily_report.yml"
}
```

### 4. 更新工作流

**PUT /api/workflows/{filename}**

请求体：
```json
{
  "content": "name: Updated Report\ndescription: Updated description"
}
```

响应示例：
```json
{
  "success": true,
  "filename": "daily_report.yml",
  "path": "/Users/user/.copaw/workflows/daily_report.yml"
}
```

### 5. 删除工作流

**DELETE /api/workflows/{filename}**

响应示例：
```json
{
  "success": true,
  "filename": "daily_report.yml"
}
```

## 文件格式

Workflow 文件使用 YAML 格式，支持 `.yml` 和 `.yaml` 扩展名。

### 基本结构

```yaml
name: Workflow Name
description: Workflow description
version: "1.0"

steps:
  - name: Step 1
    agent: agent-id-1
    skill: skill-name
    params:
      key: value

  - name: Step 2
    agent: agent-id-2
    channel: feishu
    params:
      message: "Task completed"
```

## 前端集成示例

### React/Vue 调用示例

```javascript
// List all workflows
const response = await fetch('/api/workflows');
const data = await response.json();
console.log(data.workflows);

// Get workflow content
const workflow = await fetch(`/api/workflows/daily_report.yml`);
const content = await workflow.json();

// Create workflow
await fetch('/api/workflows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    filename: 'my_workflow.yml',
    content: yamlContent
  })
});

// Update workflow
await fetch(`/api/workflows/my_workflow.yml`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: updatedYamlContent })
});

// Delete workflow
await fetch(`/api/workflows/my_workflow.yml`, {
  method: 'DELETE'
});
```

## 安全注意事项

1. 文件名验证：API 会检查文件名不能包含路径分隔符（`/` 或 `\`）
2. 扩展名限制：只接受 `.yml` 或 `.yaml` 结尾的文件
3. 路径遍历保护：防止通过文件名进行路径遍历攻击

## 错误码

- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `404`: 工作流不存在
- `409`: 工作流已存在（创建时）
- `500`: 服务器内部错误
