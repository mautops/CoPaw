# s3c 命令参考

## 全局选项

```bash
s3c [-c <cluster>] <group> <command> [options]
```

- `-c / --cluster <name>`: 指定使用的配置名称（未指定时使用默认第一个配置）

## clusters 命令

| 命令 | 说明 |
|------|------|
| `s3c clusters list` | 列出所有集群配置 |

## bucket 命令

### 基础操作
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket list` | 列出所有 bucket | `--format table\|json` |
| `s3c bucket create <bucket>` | 创建 bucket | `--region`, `--private/--no-private` |
| `s3c bucket delete <bucket>` | 删除 bucket | `--force`（强制清空后删除） |
| `s3c bucket head <bucket>` | 查看 bucket 元数据 | |

### 版本控制
| 命令 | 说明 |
|------|------|
| `s3c bucket versioning-get <bucket>` | 查看版本控制状态 |
| `s3c bucket versioning-enable <bucket>` | 启用版本控制 |
| `s3c bucket versioning-suspend <bucket>` | 暂停版本控制 |

### 标签
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket tagging-get <bucket>` | 查看标签 | |
| `s3c bucket tagging-put <bucket> <tags>` | 设置标签 | tags 格式: `"Key1=Val1,Key2=Val2"` |
| `s3c bucket tagging-delete <bucket>` | 删除所有标签 | |

### ACL
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket acl-get <bucket>` | 查看 ACL | |
| `s3c bucket acl-put <bucket> <acl>` | 设置 ACL | acl: `private\|public-read\|public-read-write\|authenticated-read\|log-delivery-write` |

### 加密
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket encryption-get <bucket>` | 查看加密配置 | |
| `s3c bucket encryption-put <bucket>` | 设置加密 | `--algorithm AES256\|aws:kms`, `--kms-key <arn>` |
| `s3c bucket encryption-delete <bucket>` | 删除加密配置 | |

### 生命周期
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket lifecycle-get <bucket>` | 查看生命周期规则 | |
| `s3c bucket lifecycle-put <bucket> <rules-file>` | 设置生命周期规则 | rules-file: JSON 文件路径 |
| `s3c bucket lifecycle-delete <bucket>` | 删除生命周期规则 | |

### CORS
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket cors-get <bucket>` | 查看 CORS 配置 | |
| `s3c bucket cors-put <bucket> <rules-file>` | 设置 CORS 规则 | rules-file: JSON 文件路径 |
| `s3c bucket cors-delete <bucket>` | 删除 CORS 配置 | |

### 访问策略（Policy）
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket policy-get <bucket>` | 查看 Policy | |
| `s3c bucket policy-put <bucket> <policy-file>` | 设置 Policy | policy-file: JSON 文件路径 |
| `s3c bucket policy-delete <bucket>` | 删除 Policy | |

### 静态网站托管
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket website-get <bucket>` | 查看网站配置 | |
| `s3c bucket website-put <bucket>` | 启用静态网站 | `--index index.html`, `--error error.html` |
| `s3c bucket website-delete <bucket>` | 禁用静态网站 | |

### 访问日志
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket logging-get <bucket>` | 查看日志配置 | |
| `s3c bucket logging-put <bucket> <target-bucket>` | 启用访问日志 | `--prefix logs/` |

### 公共访问阻止
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket public-access-get <bucket>` | 查看公共访问阻止配置 | |
| `s3c bucket public-access-put <bucket>` | 设置公共访问阻止 | `--block-public-acls/--no-block-public-acls` 等 |

### 跨区域复制
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket replication-get <bucket>` | 查看复制配置 | |
| `s3c bucket replication-put <bucket> <config-file>` | 设置复制配置 | config-file: JSON 文件路径 |
| `s3c bucket replication-delete <bucket>` | 删除复制配置 | |

### 事件通知
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket notification-get <bucket>` | 查看��知配置 | |
| `s3c bucket notification-put <bucket> <config-file>` | 设置通知配置 | config-file: JSON 文件路径 |

### 传输加速
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket accelerate-get <bucket>` | 查看传输加速配置 | |
| `s3c bucket accelerate-put <bucket>` | 设置传输加速 | `--enable/--no-enable` |

### 请求支付
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c bucket request-payment-get <bucket>` | 查看请求支付配置 | |
| `s3c bucket request-payment-put <bucket>` | 设置请求支付方 | `--requester`（请求者付费） |

## object 命令

### 基础操作
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c object list <bucket>` | 列出对象 | `--prefix`, `--delimiter`, `--max-keys 1000`, `--format table\|json` |
| `s3c object put <local-path> <bucket>` | 上传文件（带进度条） | `--key`, `--storage-class STANDARD`, `--content-type` |
| `s3c object get <bucket> <key>` | 下载文件（带进度条） | `--output <path>` |
| `s3c object delete <bucket> <key>` | 删除对象 | `--version-id` |
| `s3c object delete-many <bucket> <prefix>` | 批量删除 | `--dry-run` |
| `s3c object head <bucket> <key>` | 查看对象元数据 | `--version-id` |
| `s3c object copy <src-bucket> <src-key> <dst-bucket> <dst-key>` | 复制对象 | |
| `s3c object move <src-bucket> <src-key> <dst-bucket> <dst-key>` | 移动对象 | |

### 预签名 URL
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c object presign <bucket> <key>` | 生成预签名 URL | `--expires 3600`, `--method get\|put` |

### 版本
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c object versions <bucket> <key>` | 列出对象所有版本 | `--format table\|json` |

### 归档恢复
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c object restore <bucket> <key>` | 恢复 Glacier 归档 | `--days 7`, `--tier Standard\|Expedited\|Bulk` |

### 对象标签
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c object tagging-get <bucket> <key>` | 查看标签 | `--version-id` |
| `s3c object tagging-put <bucket> <key> <tags>` | 设置标签 | tags 格式: `"Key1=Val1,Key2=Val2"` |
| `s3c object tagging-delete <bucket> <key>` | 删除所有标签 | |

### 对象 ACL
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c object acl-get <bucket> <key>` | 查看 ACL | |
| `s3c object acl-put <bucket> <key> <acl>` | 设置 ACL | acl: `private\|public-read\|public-read-write\|authenticated-read\|bucket-owner-read\|bucket-owner-full-control` |

### 分片上传
| 命令 | 说明 | 参数 |
|------|------|------|
| `s3c object multipart-list <bucket>` | 列出分片上传任务 | `--prefix` |
| `s3c object multipart-abort <bucket> <key> <upload-id>` | 中止分片上传 | |

## 配置文件格式

`~/.config/s3c/credentials.json`:

```json
[
  {
    "name": "prod",
    "description": "生产环境 AWS S3",
    "endpoint_url": "https://s3.amazonaws.com",
    "access_key": "AKIAIOSFODNN7EXAMPLE",
    "secret_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "region": "us-east-1"
  },
  {
    "name": "local",
    "description": "本地 MinIO 测试环境",
    "endpoint_url": "http://localhost:9000",
    "access_key": "minioadmin",
    "secret_key": "minioadmin",
    "region": "us-east-1"
  }
]
```

- `name`（必需）: 配置名称，供 `-c` 参数使用
- `description`（必需）: 描述，显示在 `clusters list` 中
- `endpoint_url`（必需）: S3 兼容服务端点
- `access_key` / `secret_key`（必需）: 认证凭据
- `region`（可选）: 默认 `us-east-1`

## fire 命令名映射规则

fire 库将 Python 方法名中的 `_` 自动转换为 `-`：
- `versioning_enable` → `versioning-enable`
- `tagging_put` → `tagging-put`
- `public_access_get` → `public-access-get`
