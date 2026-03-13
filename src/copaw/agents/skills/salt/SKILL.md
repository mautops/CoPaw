---
name: salt
description: "Salt CLI tool for managing SaltStack infrastructure via CherryPy REST API with OpenFGA authorization. Use when working with Salt commands, minion management, or when the user asks about: (1) Salt command usage, (2) Managing minions (ping, execute commands, run scripts), (3) Viewing job history and minion information, (4) Multi-cluster Salt configuration, (5) OpenFGA permission model and authorization, (6) Troubleshooting Salt CLI issues."
---

# Salt CLI

Salt CLI 是一个用于通过 SaltStack CherryPy REST API 管理基础设施的命令行工具，集成了 OpenFGA 权限控制系统。

**完全兼容原生 Salt 命令格式！**

## 重要提示

**在执行任何 Salt CLI 命令之前，请务必先阅读本文档，了解正确的命令参数和使用方法。**

- 所有命令都需要通过 OpenFGA 进行权限验证（除非 OpenFGA 未初始化）
- 用户身份通过 `COPAW_USER_ID` 环境变量自动获取
- **禁止访问或修改 `~/.config` 目录下的任何配置文件**

## 命令格式

```bash
salt-fga [全局选项] 'target' module.function [args...]
```

**完全兼容原生 Salt 命令格式**，支持所有标准 Salt 模块。

### 基本示例

```bash
# 测试连接
salt-fga 'minion-01' test.ping
salt-fga '*' test.ping

# 执行命令
salt-fga 'minion-01' cmd.run 'uptime'
salt-fga 'web-*' cmd.run 'systemctl status nginx'

# 获取系统信息
salt-fga 'minion-01' grains.get os
salt-fga 'minion-01' grains.items

# 状态管理
salt-fga 'web-*' state.apply webserver
salt-fga 'minion-01' state.sls nginx

# 包管理
salt-fga 'minion-01' pkg.install nginx
salt-fga 'minion-01' pkg.remove nginx

# 服务管理
salt-fga 'minion-01' service.start nginx
salt-fga 'minion-01' service.restart nginx

# 指定集群
salt-fga -c prod 'minion-01' test.ping
salt-fga -c prod 'web-*' cmd.run 'uptime'
```

## 全局选项

### -c, --cluster

指定集群环境（对应配置文件中的 name 字段）。未指定时使用配置文件中的第一个集群。

```bash
salt-fga -c prod 'minion-01' test.ping
salt-fga -c dev '*' grains.items
```

### --raw

输出原始 JSON 格式，不进行美化。

```bash
salt-fga --raw 'minion-01' test.ping
salt-fga --raw '*' grains.items
```

## 用户身份

用户身份信息通过环境变量自动获取，无需手动指定：

| 变量               | 用途             |
| ------------------ | ---------------- |
| `COPAW_USER_ID`    | 当前用户 ID（用于权限检查） |
| `COPAW_USERNAME`   | 当前用户名       |
| `COPAW_SESSION_ID` | 当前会话 ID      |
| `COPAW_CHANNEL`    | 当前渠道（如 wecom） |

## 支持的 Salt 模块

salt-fga 支持所有标准 Salt 模块，包括但不限于：

### 测试和诊断
- `test.ping` - 测试 minion 连接
- `test.version` - 查看 Salt 版本

### 命令执行（写操作）
- `cmd.run` - 执行 shell 命令
- `cmd.script` - 执行脚本
- `cmd.exec` - 执行命令
- `cmd.shell` - 执行 shell 命令

### 系统信息（读操作）
- `grains.get` - 获取指定 grain
- `grains.items` - 获取所有 grains
- `status.diskusage` - 磁盘使用情况
- `status.meminfo` - 内存信息
- `status.cpuinfo` - CPU 信息

### 状态管理（写操作）
- `state.apply` - 应用状态
- `state.sls` - 应用指定 SLS
- `state.highstate` - 执行 highstate
- `state.single` - 执行单个状态

### 包管理（写操作）
- `pkg.install` - 安装包
- `pkg.remove` - 删除包
- `pkg.upgrade` - 升级包
- `pkg.purge` - 彻底删除包
- `pkg.list_pkgs` - 列出已安装的包（读操作）

### 服务管理（写操作）
- `service.start` - 启动服务
- `service.stop` - 停止服务
- `service.restart` - 重启服务
- `service.reload` - 重载服务
- `service.enable` - 启用服务
- `service.disable` - 禁用服务
- `service.status` - 查看服务状态（读操作）

### 文件操作
- `file.read` - 读取文件（读操作）
- `file.write` - 写入文件（写操作）
- `file.copy` - 复制文件（写操作）
- `file.move` - 移动文件（写操作）
- `file.remove` - 删除文件（写操作）
- `file.mkdir` - 创建目录（写操作）

### 用户管理
- `user.list_users` - 列出用户（读操作）
- `user.info` - 查看用户信息（读操作）
- `user.add` - 添加用户（写操作）
- `user.delete` - 删除用户（写操作）
- `user.chuid` - 修改用户 UID（写操作）
- `user.chgid` - 修改用户 GID（写操作）

## 权限处理原则

**【重要】如果用户执行命令时遇到权限检查失败或权限被拒绝，必须立即终止后续工作，不要尝试其他方案或绕过权限检查。**

权限失败时的正确处理方式：
1. 直接告知用户权限检查失败的具体原因
2. 告知用户联系管理员解决
3. 终止当前任务，不要继续尝试

权限不足的常见原因：
- 用户不是目标集群的 member
- 用户没有目标主机的访问权限
- 用户尝试执行写操作但只有读权限
- 用户尝试使用通配符但不是集群 admin

解决方法：联系管理员授予相应权限。

**禁止的行为**：
- ❌ 尝试使用其他命令绕过权限检查
- ❌ 尝试修改配置文件
- ❌ 尝试使用不存在的 --no-auth 参数
- ❌ 继续执行其他相关任务

## 配置文件

Salt CLI 的配置文件由管理员统一管理，包括：

### 集群配置

包含 Salt API 的连接信息和认证配置。

配置字段说明：
- `name`: 集群名称（`-c` 参数使用此值）
- `base_url`: Salt API 地址
- `eauth`: 认证方式（通常为 `file`）
- `token_expire`: Token 过期时间，支持 `10h`、`30m`、`3600s` 格式

### OpenFGA 配置

包含 OpenFGA 服务的连接信息和授权模型配置。

配置字段说明：
- `api_url`: OpenFGA 服务地址
- `store_id`: OpenFGA Store ID
- `authorization_model_id`: 授权模型 ID

**注意：配置文件由管理员管理，普通用户无需关心配置文件的位置和内容。**

## 权限系统

### 授权模型

Salt CLI 使用基于 OpenFGA 的授权模型，包含以下类型和关系：

**cluster（集群）**：
- `admin`: 集群管理员
- `member`: 集群成员（admin 自动继承 member）

**host（主机）**：
- `admin`: 主机管理员（可以从 cluster admin 继承）
- `member`: 主机成员
- `cluster`: 主机所属的集群
- `read`: 读权限（member、admin 或集群 member 都可以读）
- `write`: 写权限（仅 admin 可以写）

### 权限检查逻辑

每次执行命令时：

1. 检查用户是否是集群的 member
2. 根据命令类型判断需要的权限：
   - 写操作命令：`cmd.run`, `cmd.script`, `state.apply`, `pkg.install`, `service.restart` 等
   - 读操作命令：`test.ping`, `grains.items`, `status.diskusage` 等
3. 检查用户对目标主机的权限（read 或 write）
4. 通配符目标（`*`）需要集群 admin 权限

### 写操作命令列表

以下命令需要 write 权限：
- 命令执行：`cmd.run`, `cmd.script`, `cmd.exec`, `cmd.shell`
- 状态管理：`state.apply`, `state.sls`, `state.highstate`, `state.single`
- 包管理：`pkg.install`, `pkg.remove`, `pkg.upgrade`, `pkg.purge`
- 服务管理：`service.start`, `service.stop`, `service.restart`, `service.reload`, `service.enable`, `service.disable`
- 文件操作：`file.write`, `file.remove`, `file.copy`, `file.move`, `file.mkdir`
- 用户管理：`user.add`, `user.delete`, `user.chuid`, `user.chgid`, `group.add`, `group.delete`

其他所有命令默认为读操作，需要 read 权限。

### 降级策略

**注意：以下内容仅供了解系统行为，禁止尝试利用降级策略绕过权限检查。**

- OpenFGA 未初始化时，系统会自动放行命令（仅限开发/测试环境）
- 生产环境必须正确配置 OpenFGA
- 禁止尝试通过任何方式触发降级策略

## 认证流程

Salt CLI 自动管理 Salt API 的认证 token：

1. 首次执行命令时自动登录获取 token
2. Token 自动缓存，无需用户关心
3. 优先使用 API 返回的 `expire` 时间戳判断过期
4. Token 过期时自动重新登录
5. 遇到 401 错误时自动清除缓存并重试

## 目标主机选择

```bash
salt-fga '*' test.ping                          # 所有 minions
salt-fga 'web-*' test.ping                      # 通配符匹配
salt-fga 'minion-01' test.ping                  # 单个主机
salt-fga 'minion-01,minion-02' test.ping        # 多个主机（逗号分隔）
```

注意：通配符目标（包含 `*` 或 `?`）需要集群 admin 权限。

## 输出格式

```bash
# 美化输出（默认）- 使用 rich 库，带颜色和格式
salt-fga 'minion-01' test.ping

# 原始 JSON 输出 - 适合脚本处理
salt-fga --raw 'minion-01' test.ping
```

## 常见问题

### 配置文件不存在

联系管理员配置 Salt CLI 的集群信息。

### 权限检查失败 - 未指定用户名

用户身份由系统自动管理，无法手动设置。如果出现此错误，联系管理员。

**禁止尝试手动设置或修改 `COPAW_USER_ID` 等环境变量。**

### 权限被拒绝

**遇到权限被拒绝时，不要尝试其他方案或绕过权限检查，直接告知用户权限不足。**

权限检查失败的原因：
1. 用户不是目标集群的 member
2. 用户没有目标主机的权限（member 或 admin）
3. 命令类型不匹配权限（写操作需要 admin 权限）
4. 使用通配符目标但不是集群 admin

解决方法：联系管理员授予相应的权限。

### Token 过期

Salt CLI 会自动处理 Token 过期问题。如果持续出现问题，联系管理员。

### OpenFGA 未初始化时的行为

系统在 OpenFGA 未配置时会自动放行命令（仅限开发/测试环境）。

**禁止尝试利用此行为绕过权限检查。生产环境必须正确配置 OpenFGA。**

## 最佳实践

1. **生产环境始终指定集群**: `salt-fga -c prod 'minion-01' test.ping`
2. **执行危险操作前先验证目标**: 先用 `test.ping` 确认目标主机
3. **自动化脚本使用 `--raw`**: 便于 JSON 解析
4. **权限最小化原则**: 只授予用户实际需要的权限
5. **OpenFGA 降级感知**: 生产环境确保 OpenFGA 已初始化，避免意外放行
6. **使用原生 Salt 格式**: 与标准 Salt 命令完全一致
