---
name: s3c
description: s3c 是一个 S3 兼容存储的命令行工具（boto3 封装），支持 AWS S3、MinIO、Ceph 等。当用户需要操作 S3 存储时使用，包括：(1) 管理 bucket（创建/删除/配置版本控制/生命周期/CORS/Policy/ACL 等），(2) 管理 object（上传/下载/复制/移动/预签名 URL/版本管理/批量删除等），(3) 管理多个 S3 集群配置（~/.config/s3c/credentials.json），(4) 排查 s3c 命令相关错误，(5) 扩展 s3c 功能（新增命令/修改行为）。
---

# s3c Skill

s3c 是 S3 存储的 Python 命令行工具，使用 `fire` 管理命令，`boto3` 操作 S3，`rich` 美化输出。

## 项目结构

```
src/s3c/
├── __main__.py   # 入口：预处理 -c/--cluster 全局参数，fire.Fire() 路由
├── config.py     # 配置文件管理（读取 ~/.config/s3c/credentials.json）
├── client.py     # boto3 客户端封装（get_s3_client / get_s3_resource）
├── utils.py      # 通用工具（format_size, handle_error, print_json 等）
├── clusters.py   # s3c clusters list
├── bucket.py     # s3c bucket <command>（Bucket 类，方法即命令）
└── object.py     # s3c object <command>（Object 类，方法即命令）
```

## 核心架构模式

### 命令路由

`__main__.py` 预处理 `-c/--cluster` 后，将剩余参数交给 `fire.Fire({"clusters": Clusters(), "bucket": Bucket(), "object": Object()})`。

### 添加新命令

在对应类（`Bucket` 或 `Object`）中添加方法：

```python
def new_command(self, bucket: str, option: str = "default") -> None:
    """命令说明（fire 用作帮助文本）

    Args:
        bucket: Bucket 名称
        option: 选项说明（默认 default）

    示例:
        s3c bucket new-command my-bucket
    """
    try:
        s3 = get_s3_client()
        s3.some_operation(Bucket=bucket)
        console.print(f"[green]✓[/green] 操作成功")
    except Exception as e:
        handle_error(e, "new command")
```

- 方法名用 `_` 分隔，fire 自动映射为 `-`（如 `tagging_put` → `s3c bucket tagging-put`）
- 所有 boto3 调用包在 `try/except` 中，统一使用 `handle_error(e, "操作名")`
- 列表输出用 `rich.Table`，详情用 `print_json()`，成功提示用 `console.print("[green]✓[/green] ...")`

### 输出规范

```python
from .utils import console, err_console, format_size, format_datetime, print_json, handle_error

console.print(f"[green]✓[/green] Bucket [cyan]{bucket}[/cyan] 已创建")  # 成功
print_json(response_dict)                                                  # JSON 详情
handle_error(exception, "操作描述")                                        # 错误（自动退出）
```

## 命令参考

完整命令列表和所有参数见 [references/commands.md](references/commands.md)。

## 常见用法

```bash
# 多配置切换
s3c -c prod bucket list
s3c --cluster dev object list my-bucket

# 上传/下载（带进度条）
s3c object put ./file.pdf my-bucket --key docs/file.pdf
s3c object get my-bucket docs/file.pdf --output /tmp/file.pdf

# 批量删除（先 dry-run 预览）
s3c object delete-many my-bucket folder/ --dry-run
s3c object delete-many my-bucket folder/

# 版本控制
s3c bucket versioning-enable my-bucket
s3c object versions my-bucket key.txt
s3c object delete my-bucket key.txt --version-id <id>
```
