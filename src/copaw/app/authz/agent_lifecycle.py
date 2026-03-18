"""Agent 生命周期管理模块

This module handles agent lifecycle operations including:
- Auto-creating default agent on first login
- Creating new user agents
- Deleting agents with shared_with checks
- Sharing and unsharing agents
"""

from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


async def ensure_user_default_agent(user_id: str, username: str) -> str:
    """Ensure user has a default agent, create if not exists.

    Called on first login to auto-create a default agent for the user.

    Args:
        user_id: User ID
        username: Username

    Returns:
        Agent ID of the default agent
    """
    from .service import get_authz_service
    from ..config.config import load_config

    agent_id = f"{user_id}_default"

    # 1. Create workspace directory
    workspace_dir = Path.home() / ".copaw" / "workspaces" / user_id / "default"
    workspace_dir.mkdir(parents=True, exist_ok=True)

    # 2. Copy default agent configuration if exists
    default_workspace = Path.home() / ".copaw" / "workspaces" / "default"
    if default_workspace.exists():
        agent_config_src = default_workspace / "agent.json"
        agent_config_dst = workspace_dir / "agent.json"
        if agent_config_src.exists() and not agent_config_dst.exists():
            shutil.copy(agent_config_src, agent_config_dst)
            logger.info("Copied default agent config to %s", agent_config_dst)

    # 3. Update authz.json
    authz = get_authz_service()

    # Add agent to user's agents list
    authz.add_user_agent(user_id, agent_id)

    # Set agent ownership
    authz.set_agent_config(agent_id, owner=user_id, shared_with=[])

    # 4. Grant default permissions (inherit from default agent or use wildcard)
    # For now, grant wildcard permissions to all resources
    authz.set_user_permissions(
        user_id,
        mcps=["*"],
        tools=["*"],
        skills=["*"],
    )

    logger.info(
        "Created default agent '%s' for user '%s' (%s)",
        agent_id,
        username,
        user_id,
    )

    return agent_id


async def create_user_agent(
    user_id: str,
    agent_name: str,
    agent_config: Optional[dict] = None,
) -> str:
    """Create a new agent for a user.

    Args:
        user_id: User ID
        agent_name: Human-readable agent name
        agent_config: Optional agent configuration dict

    Returns:
        Agent ID of the created agent
    """
    import json
    from .service import get_authz_service

    # Generate unique agent ID
    agent_id = f"{user_id}_{uuid.uuid4().hex[:8]}"

    # 1. Create workspace directory
    workspace_dir = Path.home() / ".copaw" / "workspaces" / user_id / agent_id
    workspace_dir.mkdir(parents=True, exist_ok=True)

    # 2. Save agent configuration
    if agent_config:
        agent_config_path = workspace_dir / "agent.json"
        with open(agent_config_path, "w", encoding="utf-8") as f:
            json.dump(agent_config, f, indent=2, ensure_ascii=False)
        logger.info("Saved agent config to %s", agent_config_path)
    else:
        # Copy from default if no config provided
        default_workspace = Path.home() / ".copaw" / "workspaces" / "default"
        if default_workspace.exists():
            agent_config_src = default_workspace / "agent.json"
            agent_config_dst = workspace_dir / "agent.json"
            if agent_config_src.exists():
                shutil.copy(agent_config_src, agent_config_dst)

    # 3. Update authz.json
    authz = get_authz_service()

    # Add agent to user's agents list
    authz.add_user_agent(user_id, agent_id)

    # Set agent ownership
    authz.set_agent_config(agent_id, owner=user_id, shared_with=[])

    logger.info(
        "Created agent '%s' (name='%s') for user '%s'",
        agent_id,
        agent_name,
        user_id,
    )

    return agent_id


async def delete_user_agent(user_id: str, agent_id: str) -> bool:
    """Delete a user's agent after checking permissions and shared status.

    Args:
        user_id: User ID requesting deletion
        agent_id: Agent ID to delete

    Returns:
        True if successfully deleted

    Raises:
        PermissionError: If user is not the owner
        ValueError: If agent is shared with other users
    """
    from .service import get_authz_service

    authz = get_authz_service()

    # 1. Check if user is the owner
    owner = authz.get_agent_owner(agent_id)
    if owner != user_id:
        raise PermissionError(
            f"Only the owner can delete this agent. Owner: {owner}"
        )

    # 2. Check shared status
    shared_users = authz.get_agent_shared_users(agent_id)
    if shared_users:
        raise ValueError(
            f"Cannot delete agent that is shared with {len(shared_users)} user(s). "
            f"Please unshare first. Shared with: {shared_users}"
        )

    # 3. Delete workspace directory
    workspace_dir = Path.home() / ".copaw" / "workspaces" / user_id / agent_id
    if workspace_dir.exists():
        shutil.rmtree(workspace_dir)
        logger.info("Deleted workspace directory: %s", workspace_dir)

    # 4. Update authz.json
    authz.remove_user_agent(user_id, agent_id)
    authz.remove_agent(agent_id)

    logger.info("Deleted agent '%s' for user '%s'", agent_id, user_id)

    return True


async def share_agent_with_user(
    owner_user_id: str,
    agent_id: str,
    target_user_id: str,
) -> None:
    """Share an agent with another user.

    Args:
        owner_user_id: Owner user ID
        agent_id: Agent ID to share
        target_user_id: User ID to share with

    Raises:
        PermissionError: If owner_user_id is not the owner
    """
    from .service import get_authz_service

    authz = get_authz_service()

    # Check ownership
    owner = authz.get_agent_owner(agent_id)
    if owner != owner_user_id:
        raise PermissionError(
            f"Only the owner can share this agent. Owner: {owner}"
        )

    # Share the agent
    authz.share_agent(agent_id, target_user_id)

    logger.info(
        "Shared agent '%s' from user '%s' to user '%s'",
        agent_id,
        owner_user_id,
        target_user_id,
    )


async def unshare_agent_from_user(
    owner_user_id: str,
    agent_id: str,
    target_user_id: str,
) -> None:
    """Remove sharing of an agent from a user.

    Args:
        owner_user_id: Owner user ID
        agent_id: Agent ID
        target_user_id: User ID to remove sharing from

    Raises:
        PermissionError: If owner_user_id is not the owner
    """
    from .service import get_authz_service

    authz = get_authz_service()

    # Check ownership
    owner = authz.get_agent_owner(agent_id)
    if owner != owner_user_id:
        raise PermissionError(
            f"Only the owner can unshare this agent. Owner: {owner}"
        )

    # Unshare the agent
    authz.unshare_agent(agent_id, target_user_id)

    logger.info(
        "Unshared agent '%s' from user '%s' to user '%s'",
        agent_id,
        owner_user_id,
        target_user_id,
    )


async def get_agent_sharing_status(agent_id: str) -> dict:
    """Get sharing status of an agent.

    Args:
        agent_id: Agent ID

    Returns:
        Dict with owner, shared_with list, and can_delete flag
    """
    from .service import get_authz_service

    authz = get_authz_service()

    owner = authz.get_agent_owner(agent_id)
    shared_users = authz.get_agent_shared_users(agent_id)

    return {
        "agent_id": agent_id,
        "owner": owner,
        "shared_with": shared_users,
        "can_delete": len(shared_users) == 0,
    }
