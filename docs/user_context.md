# 用户上下文使用指南

## Python Tool/MCP/Skill 中获取用户信息

```python
from copaw.context import get_current_user_id, get_current_username, get_current_session_id, get_current_channel

async def my_tool(param: str):
    user_id = get_current_user_id()        # "user123"
    username = get_current_username()      # "张三"
    session_id = get_current_session_id()  # "wecom:chat456"
    channel = get_current_channel()        # "wecom"

    # 使用用户信息
    print(f"用户 {username} ({user_id}) 从 {channel} 调用")
```

## Shell 脚本中获取用户信息

当 Agent 调用 `execute_shell_command` 时，用户上下文自动通过环境变量传递：

### Bash 脚本

```bash
#!/bin/bash
echo "用户 ID: $COPAW_USER_ID"
echo "用户名: $COPAW_USERNAME"
echo "会话 ID: $COPAW_SESSION_ID"
echo "频道: $COPAW_CHANNEL"

# 创建用户专属目录
USER_DIR="$HOME/.copaw/data/$COPAW_USER_ID"
mkdir -p "$USER_DIR"
```

### Python 脚本

```python
#!/usr/bin/env python3
import os

user_id = os.getenv("COPAW_USER_ID")
username = os.getenv("COPAW_USERNAME")
channel = os.getenv("COPAW_CHANNEL")

print(f"用户: {username} ({user_id}) 从 {channel} 调用")
```

## 可用字段

| Python 函数 | Shell 环境变量 | 说明 |
|------------|---------------|------|
| `get_current_user_id()` | `$COPAW_USER_ID` | 用户 ID |
| `get_current_username()` | `$COPAW_USERNAME` | 用户名 |
| `get_current_session_id()` | `$COPAW_SESSION_ID` | 会话 ID |
| `get_current_channel()` | `$COPAW_CHANNEL` | 频道名称 |

## 安全性

- 用户上下文由系统自动设置，用户无法通过聊天修改
- 每次命令执行都会重新注入环境变量
- 用户在单个命令中可以覆盖环境变量，但不会持久化
