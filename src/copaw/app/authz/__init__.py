"""权限管理模块

This module provides authorization services for multi-tenant permission management.
"""

from .models import AgentConfig, AuthzConfig, User, UserPermissions
from .service import SimpleAuthzService, get_authz_service, reset_authz_service
from .agent_lifecycle import (
    ensure_user_default_agent,
    create_user_agent,
    delete_user_agent,
    share_agent_with_user,
    unshare_agent_from_user,
    get_agent_sharing_status,
)

__all__ = [
    "SimpleAuthzService",
    "get_authz_service",
    "reset_authz_service",
    "User",
    "UserPermissions",
    "AgentConfig",
    "AuthzConfig",
    "ensure_user_default_agent",
    "create_user_agent",
    "delete_user_agent",
    "share_agent_with_user",
    "unshare_agent_from_user",
    "get_agent_sharing_status",
]
