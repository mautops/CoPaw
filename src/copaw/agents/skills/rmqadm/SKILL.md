---
name: rmqadm
description: RabbitMQ cluster management using rmqadm CLI tool. Use when working with RabbitMQ clusters for (1) Managing users, vhosts, queues, exchanges, bindings, (2) Configuring policies and permissions, (3) Monitoring connections, channels, consumers, (4) Health checks and diagnostics, (5) Importing/exporting cluster definitions, (6) Setting up multi-cluster configurations, or any RabbitMQ administration tasks via Management HTTP API.
---

# rmqadm — RabbitMQ Management CLI

Use `rmqadm` for all RabbitMQ cluster management tasks via the Management HTTP API.

## Quick Start

### Connect to a cluster

```bash
# Using configured cluster (recommended)
rmqadm -c dev users list

# Manual connection
rmqadm --host localhost --port 15672 --username guest --password guest users list
```

### Common operations

```bash
# List resources
rmqadm -c prod queues list
rmqadm -c prod exchanges list
rmqadm -c prod users list

# Create resources
rmqadm -c prod queues create orders --durable=true
rmqadm -c prod users create alice --password=secret --tags=administrator

# Health check
rmqadm -c prod health_check local_alarms
```

## Configuration

### Setup config file

Default location: `~/.config/rabbitmq/admin.json`

Use the template from `assets/admin.json` to create the config file:

```json
[
  {
    "name": "dev",
    "description": "本地开发环境",
    "host": "localhost",
    "port": 15672,
    "username": "guest",
    "password": "guest",
    "vhost": "/",
    "scheme": "http"
  }
]
```

Required fields: `name`, `host`, `port`, `username`, `password`
Optional fields: `description`, `vhost` (default `/`), `scheme` (default `http`)

### List configured clusters

```bash
rmqadm clusters
```

## Command Reference

For complete command reference with all subcommands and parameters, see [references/commands.md](references/commands.md).

### Key command groups

- **clusters** — List configured clusters
- **overview** — Cluster overview
- **users** — User management (list/show/create/delete/whoami)
- **vhosts** — Virtual host management
- **queues** — Queue operations (list/show/create/delete/purge)
- **exchanges** — Exchange management
- **bindings** — Binding management
- **streams** — Stream queue management
- **connections** — Connection monitoring and control
- **channels** — Channel monitoring
- **consumers** — Consumer monitoring
- **nodes** — Node information
- **permissions** — User permissions
- **policies** — Policy management
- **operator_policies** — Operator policy management
- **parameters** — Runtime parameters
- **global_parameters** — Global parameters
- **vhost_limits** — VHost resource limits
- **user_limits** — User resource limits
- **definitions** — Import/export cluster definitions
- **health_check** — Health checks (returns non-zero on failure)
- **feature_flags** — Feature flag management
- **rebalance** — Queue leader rebalancing

### Output formats

All list commands support `--format=json` for raw JSON output:

```bash
rmqadm -c dev users list --format=json
```

## Common Workflows

### Setup new cluster config

1. Copy template: `cp assets/admin.json ~/.config/rabbitmq/admin.json`
2. Edit with cluster details
3. Test: `rmqadm clusters`

### Create HA policy

```bash
rmqadm -c prod policies declare ha-all ".*" '{"ha-mode":"all"}' --apply-to=queues
```

### Backup and restore

```bash
# Export
rmqadm -c prod definitions export --file=backup.json

# Import
rmqadm -c staging definitions import_file --file=backup.json
```

### Monitor cluster health

```bash
rmqadm -c prod health_check local_alarms
rmqadm -c prod health_check cluster_wide_alarms
rmqadm -c prod nodes list
rmqadm -c prod connections list
```

### User and permission setup

```bash
# Create user
rmqadm -c prod users create alice --password=secret --tags=management

# Grant permissions
rmqadm -c prod permissions set alice --vhost=/ --configure=".*" --write=".*" --read=".*"
```

## Troubleshooting

### Connection issues

- Verify cluster config: `rmqadm clusters`
- Test with manual params: `rmqadm --host <host> --port <port> --username <user> --password <pwd> overview`
- Check Management API is enabled on target cluster

### Authentication failures

- Verify credentials in config file
- Check user has management permissions: `rmqadm -c <cluster> users show <username>`
- Ensure user tags include `administrator` or `management`

### Command not found

- Check rmqadm is installed: `which rmqadm`
- If using uv: `uv run rmqadm` instead of `rmqadm`
