"""管理员专用工具列表

This module defines tools that are only accessible to admin users.
Non-admin users will be blocked from calling these tools even if
AI requests them.
"""

# Tools that require admin privileges to execute
# Non-admin users cannot call these tools regardless of AI requests
ADMIN_ONLY_TOOLS: frozenset[str] = frozenset(
    {
        "grant_permission",
        "revoke_permission",
        "create_user",
        "delete_user",
        "modify_authz_config",
        "reload_authz_config",
    }
)
