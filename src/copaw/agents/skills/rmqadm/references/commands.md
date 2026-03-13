# rmqadm 命令参考

## 全局参数

| 参数 | 简写 | 默认值 | 说明 |
|---|---|---|---|
| `--cluster` | `-c` | — | 集群别名（从配置文件加载） |
| `--host` | `-h` | `localhost` | 手动指定主机 |
| `--port` | | `15672` | 手动指定端口 |
| `--username` | `-u` | `guest` | 手动指定用户名 |
| `--password` | | `guest` | 手动指定密码 |
| `--vhost` | `-v` | `/` | 默认 vhost |
| `--scheme` | `-s` | `http` | 协议：`http` 或 `https` |
| `--profile` | `-p` | `~/.config/rabbitmq/admin.json` | 自定义配置文件路径 |

## 命令组

### clusters — 集群配置

```bash
rmqadm clusters                   # 列出所有已配置的集群
rmqadm clusters --format=json     # JSON 格式（密码自动脱敏）
```

### overview — 集群概览

```bash
rmqadm -c dev overview
rmqadm -c dev overview --format=json
```

### users — 用户管理

```bash
rmqadm -c dev users list
rmqadm -c dev users show <name>
rmqadm -c dev users whoami
rmqadm -c dev users create <name> --password=<pwd> --tags=administrator
rmqadm -c dev users delete <name>
```

### vhosts — Virtual Host 管理

```bash
rmqadm -c dev vhosts list
rmqadm -c dev vhosts show <name>
rmqadm -c dev vhosts create <name> --description="my vhost"
rmqadm -c dev vhosts delete <name>
```

### queues — 队列管理

```bash
rmqadm -c dev queues list
rmqadm -c dev queues list --vhost=my-vhost
rmqadm -c dev queues show <name>
rmqadm -c dev queues create <name> --durable=true
rmqadm -c dev queues create <name> --queue-type=quorum --vhost=my-vhost
rmqadm -c dev queues purge <name>
rmqadm -c dev queues delete <name>
```

### exchanges — 交换机管理

```bash
rmqadm -c dev exchanges list
rmqadm -c dev exchanges create <name> --exchange-type=topic
rmqadm -c dev exchanges delete <name>
```

### bindings — 绑定管理

```bash
rmqadm -c dev bindings list
rmqadm -c dev bindings create <exchange> <queue> --routing-key=my.key
rmqadm -c dev bindings delete <exchange> <queue> --routing-key=my.key
```

### streams — Stream 队列管理

```bash
rmqadm -c dev streams list
rmqadm -c dev streams declare <name> --max-age=7D
rmqadm -c dev streams delete <name>
```

### connections — 连接管理

```bash
rmqadm -c dev connections list
rmqadm -c dev connections show <name>
rmqadm -c dev connections close <name> --reason="maintenance"
```

### channels — Channel 查看

```bash
rmqadm -c dev channels list
rmqadm -c dev channels show <name>
```

### consumers — 消费者查看

```bash
rmqadm -c dev consumers list
rmqadm -c dev consumers list --vhost=my-vhost
```

### nodes — 节点信息

```bash
rmqadm -c dev nodes list
rmqadm -c dev nodes show rabbit@hostname
```

### permissions — 权限管理

```bash
rmqadm -c dev permissions list
rmqadm -c dev permissions show <user> --vhost=/
rmqadm -c dev permissions set <user> --vhost=/ --configure=".*" --write=".*" --read=".*"
rmqadm -c dev permissions delete <user> --vhost=/
```

### policies — 策略管理

```bash
rmqadm -c dev policies list
rmqadm -c dev policies declare <name> <pattern> <definition> --apply-to=all
# 示例：为所有队列设置 HA 镜像策略
rmqadm -c dev policies declare ha-all ".*" '{"ha-mode":"all"}' --apply-to=queues
rmqadm -c dev policies delete <name>
```

### operator_policies — Operator 策略管理

```bash
rmqadm -c dev operator_policies list
rmqadm -c dev operator_policies declare <name> <pattern> <definition>
rmqadm -c dev operator_policies delete <name>
```

### parameters — 运行时参数

```bash
rmqadm -c dev parameters list
rmqadm -c dev parameters set <name> <component> <value>
rmqadm -c dev parameters clear <name> <component>
```

### global_parameters — 全局参数

```bash
rmqadm -c dev global_parameters list
rmqadm -c dev global_parameters set <name> <value>
rmqadm -c dev global_parameters clear <name>
```

### vhost_limits — VHost 资源限制

```bash
rmqadm -c dev vhost_limits list
rmqadm -c dev vhost_limits set max-connections 100 --vhost=my-vhost
rmqadm -c dev vhost_limits delete max-connections --vhost=my-vhost
```

### user_limits — 用户资源限制

```bash
rmqadm -c dev user_limits list
rmqadm -c dev user_limits set alice max-connections 10
rmqadm -c dev user_limits delete alice max-connections
```

### definitions — 定义导入/导出

```bash
rmqadm -c dev definitions export --file=backup.json
rmqadm -c dev definitions export --vhost=my-vhost --file=vhost-backup.json
rmqadm -c dev definitions import_file --file=backup.json
```

### health_check — 健康检查

检查失败时返回非零退出码。

```bash
rmqadm -c dev health_check local_alarms
rmqadm -c dev health_check cluster_wide_alarms
rmqadm -c dev health_check node_is_quorum_critical
rmqadm -c dev health_check virtual_hosts
rmqadm -c dev health_check port_listener 5672
rmqadm -c dev health_check protocol_listener amqp
```

### feature_flags — Feature Flag 管理

```bash
rmqadm -c dev feature_flags list
rmqadm -c dev feature_flags enable <name>
rmqadm -c dev feature_flags enable_all
```

### rebalance — 队列 Leader 重平衡

```bash
rmqadm -c dev rebalance queues
rmqadm -c dev rebalance queues --vhost=my-vhost
```
