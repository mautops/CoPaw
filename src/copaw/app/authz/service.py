"""权限服务核心模块

This module implements the SimpleAuthzService class for managing
multi-tenant permissions based on a JSON configuration file.
"""

from __future__ import annotations

import fcntl
import json
import logging
from pathlib import Path
from typing import List, Literal, Optional

from ...constant import SECRET_DIR
from .models import AgentConfig, AuthzConfig, User, UserPermissions

logger = logging.getLogger(__name__)

AUTHZ_FILE = SECRET_DIR / "authz.json"

# Global singleton instance
_authz_service: Optional[SimpleAuthzService] = None


class SimpleAuthzService:
    """简单的基于配置文件的权限服务

    Features:
    - File-based configuration (authz.json)
    - File locking for concurrent safety
    - User and Agent permission management
    - Resource access control (MCP, Tool, Skill)
    """

    def __init__(self, config_path: Optional[Path] = None):
        """Initialize the authorization service.

        Args:
            config_path: Path to authz.json, defaults to SECRET_DIR/authz.json
        """
        self.config_path = config_path or AUTHZ_FILE
        self.config: AuthzConfig = AuthzConfig()
        self._load_config()

    def _load_config(self) -> None:
        """Load configuration from authz.json with file locking."""
        if not self.config_path.exists():
            logger.info("authz.json not found, using empty configuration")
            self.config = AuthzConfig()
            return

        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                # Acquire shared lock for reading
                fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                try:
                    data = json.load(f)
                    self.config = AuthzConfig(**data)
                    logger.info("Loaded authz config from %s", self.config_path)
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to load authz config: %s", exc)
            self.config = AuthzConfig()

    def _save_config(self) -> None:
        """Save configuration to authz.json with file locking."""
        # Ensure parent directory exists
        self.config_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            # Write to temp file first, then rename for atomicity
            temp_path = self.config_path.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                # Acquire exclusive lock for writing
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                try:
                    data = self.config.model_dump()
                    json.dump(data, f, indent=2, ensure_ascii=False)
                    f.flush()
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)

            # Atomic rename
            temp_path.replace(self.config_path)

            # Set restrictive permissions
            try:
                import os
                os.chmod(self.config_path, 0o600)
            except OSError:
                pass

            logger.info("Saved authz config to %s", self.config_path)
        except OSError as exc:
            logger.error("Failed to save authz config: %s", exc)
            raise

    def reload(self) -> None:
        """Reload configuration from disk."""
        self._load_config()
        logger.info("Reloaded authz configuration")

    # -----------------------------------------------------------------------
    # User management
    # -----------------------------------------------------------------------

    def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID.

        Args:
            user_id: User ID to look up

        Returns:
            User object or None if not found
        """
        return self.config.users.get(user_id)

    def is_admin(self, user_id: str) -> bool:
        """Check if user is an admin.

        Args:
            user_id: User ID to check

        Returns:
            True if user is an admin
        """
        user = self.get_user(user_id)
        if user is None:
            return False
        return user.role == "admin"

    def get_user_id_by_username(self, username: str) -> Optional[str]:
        """Find user ID by username.

        Args:
            username: Username to look up

        Returns:
            User ID or None if not found
        """
        for uid, user in self.config.users.items():
            if user.username == username:
                return uid
        return None

    def add_user(
        self,
        user_id: str,
        username: str,
        role: Literal["user", "admin"] = "user",
    ) -> None:
        """Add a new user to the authorization configuration.

        Args:
            user_id: Unique user ID
            username: Username
            role: User role (user or admin)
        """
        if user_id in self.config.users:
            logger.warning("User '%s' already exists in authz config", user_id)
            return

        self.config.users[user_id] = User(
            username=username,
            role=role,
        )
        self._save_config()
        logger.info("Added user '%s' (id=%s, role=%s)", username, user_id, role)

    def remove_user(self, user_id: str) -> None:
        """Remove a user from the authorization configuration.

        Args:
            user_id: User ID to remove
        """
        if user_id not in self.config.users:
            logger.warning("User '%s' not found in authz config", user_id)
            return

        del self.config.users[user_id]
        self._save_config()
        logger.info("Removed user '%s' from authz config", user_id)

    # -----------------------------------------------------------------------
    # Agent access control
    # -----------------------------------------------------------------------

    def check_agent_access(self, user_id: str, agent_id: str) -> bool:
        """Check if user has access to an agent.

        Access is granted if:
        1. User is an admin
        2. Agent is in user's agents list
        3. User's agents list contains "*"
        4. User is the agent's owner
        5. User is in agent's shared_with list

        Args:
            user_id: User ID
            agent_id: Agent ID to check

        Returns:
            True if user can access the agent
        """
        # Admin can access all agents
        if self.is_admin(user_id):
            return True

        user = self.get_user(user_id)
        if user is None:
            logger.debug("User '%s' not found in authz config", user_id)
            return False

        # Check user's agents list
        if "*" in user.agents or agent_id in user.agents:
            return True

        # Check ownership
        agent_config = self.config.agents.get(agent_id)
        if agent_config:
            if agent_config.owner == user_id:
                return True
            if user_id in agent_config.shared_with:
                return True

        return False

    def get_agent_owner(self, agent_id: str) -> Optional[str]:
        """Get the owner of an agent.

        Args:
            agent_id: Agent ID

        Returns:
            Owner user ID or None if agent not found
        """
        agent_config = self.config.agents.get(agent_id)
        if agent_config is None:
            return None
        return agent_config.owner

    def get_agent_shared_users(self, agent_id: str) -> List[str]:
        """Get list of users the agent is shared with.

        Args:
            agent_id: Agent ID

        Returns:
            List of user IDs the agent is shared with
        """
        agent_config = self.config.agents.get(agent_id)
        if agent_config is None:
            return []
        return list(agent_config.shared_with)

    def list_user_agents(self, user_id: str) -> List[str]:
        """List all agents accessible by a user.

        Args:
            user_id: User ID

        Returns:
            List of accessible agent IDs
        """
        if self.is_admin(user_id):
            return list(self.config.agents.keys())

        user = self.get_user(user_id)
        if user is None:
            return []

        if "*" in user.agents:
            return list(self.config.agents.keys())

        accessible = set(user.agents)

        # Also include agents where user is in shared_with
        for agent_id, agent_config in self.config.agents.items():
            if agent_config.owner == user_id or user_id in agent_config.shared_with:
                accessible.add(agent_id)

        return list(accessible)

    def add_user_agent(self, user_id: str, agent_id: str) -> None:
        """Add an agent to user's agents list.

        Args:
            user_id: User ID
            agent_id: Agent ID to add
        """
        user = self.get_user(user_id)
        if user is None:
            logger.warning("User '%s' not found in authz config", user_id)
            return

        if agent_id not in user.agents:
            user.agents.append(agent_id)
            self._save_config()
            logger.info("Added agent '%s' to user '%s'", agent_id, user_id)

    def remove_user_agent(self, user_id: str, agent_id: str) -> None:
        """Remove an agent from user's agents list.

        Args:
            user_id: User ID
            agent_id: Agent ID to remove
        """
        user = self.get_user(user_id)
        if user is None:
            return

        if agent_id in user.agents:
            user.agents.remove(agent_id)
            self._save_config()
            logger.info("Removed agent '%s' from user '%s'", agent_id, user_id)

    def set_agent_config(
        self,
        agent_id: str,
        owner: str,
        shared_with: Optional[List[str]] = None,
    ) -> None:
        """Set or update an agent's configuration.

        Args:
            agent_id: Agent ID
            owner: Owner user ID
            shared_with: List of user IDs to share with
        """
        self.config.agents[agent_id] = AgentConfig(
            owner=owner,
            shared_with=shared_with or [],
        )
        self._save_config()
        logger.info("Set agent config for '%s', owner='%s'", agent_id, owner)

    def remove_agent(self, agent_id: str) -> None:
        """Remove an agent from the configuration.

        Args:
            agent_id: Agent ID to remove
        """
        if agent_id in self.config.agents:
            del self.config.agents[agent_id]
            self._save_config()
            logger.info("Removed agent '%s' from authz config", agent_id)

    def share_agent(self, agent_id: str, target_user_id: str) -> None:
        """Share an agent with another user.

        Args:
            agent_id: Agent ID to share
            target_user_id: User ID to share with
        """
        agent_config = self.config.agents.get(agent_id)
        if agent_config is None:
            logger.warning("Agent '%s' not found in authz config", agent_id)
            return

        if target_user_id not in agent_config.shared_with:
            agent_config.shared_with.append(target_user_id)

        # Also add to target user's agents list
        target_user = self.get_user(target_user_id)
        if target_user and agent_id not in target_user.agents:
            target_user.agents.append(agent_id)

        self._save_config()
        logger.info("Shared agent '%s' with user '%s'", agent_id, target_user_id)

    def unshare_agent(self, agent_id: str, target_user_id: str) -> None:
        """Remove sharing of an agent from a user.

        Args:
            agent_id: Agent ID
            target_user_id: User ID to remove sharing from
        """
        agent_config = self.config.agents.get(agent_id)
        if agent_config and target_user_id in agent_config.shared_with:
            agent_config.shared_with.remove(target_user_id)

        # Remove from target user's agents list
        target_user = self.get_user(target_user_id)
        if target_user and agent_id in target_user.agents:
            target_user.agents.remove(agent_id)

        self._save_config()
        logger.info("Unshared agent '%s' from user '%s'", agent_id, target_user_id)

    # -----------------------------------------------------------------------
    # Resource permission control
    # -----------------------------------------------------------------------

    def check_resource_permission(
        self,
        user_id: str,
        resource_type: Literal["mcp", "tool", "skill"],
        resource_id: str,
    ) -> bool:
        """Check if user has permission to use a resource.

        Permission is granted if:
        1. User is an admin
        2. Resource is in user's allowed list for that type
        3. User's allowed list for that type contains "*"

        Args:
            user_id: User ID
            resource_type: Type of resource (mcp, tool, skill)
            resource_id: Resource identifier

        Returns:
            True if user can use the resource
        """
        # Admin can use all resources
        if self.is_admin(user_id):
            return True

        user = self.get_user(user_id)
        if user is None:
            logger.debug("User '%s' not found in authz config", user_id)
            return False

        allowed_list = self._get_user_resource_list(user, resource_type)
        if "*" in allowed_list:
            return True

        return resource_id in allowed_list

    def list_user_resources(
        self,
        user_id: str,
        resource_type: Literal["mcp", "tool", "skill"],
    ) -> List[str]:
        """List resources a user is allowed to use.

        Args:
            user_id: User ID
            resource_type: Type of resource (mcp, tool, skill)

        Returns:
            List of allowed resource IDs, or ["*"] for all
        """
        if self.is_admin(user_id):
            return ["*"]

        user = self.get_user(user_id)
        if user is None:
            return []

        return list(self._get_user_resource_list(user, resource_type))

    def _get_user_resource_list(
        self,
        user: User,
        resource_type: Literal["mcp", "tool", "skill"],
    ) -> List[str]:
        """Get user's allowed resource list for a given type.

        Args:
            user: User object
            resource_type: Resource type

        Returns:
            List of allowed resources
        """
        if resource_type == "mcp":
            return user.permissions.mcps
        elif resource_type == "tool":
            return user.permissions.tools
        elif resource_type == "skill":
            return user.permissions.skills
        return []

    def grant_resource_permission(
        self,
        user_id: str,
        resource_type: Literal["mcp", "tool", "skill"],
        resource_id: str,
    ) -> None:
        """Grant a user permission to use a resource.

        Args:
            user_id: User ID
            resource_type: Resource type
            resource_id: Resource ID
        """
        user = self.get_user(user_id)
        if user is None:
            logger.warning("User '%s' not found", user_id)
            return

        resource_list = self._get_user_resource_list(user, resource_type)
        if resource_id not in resource_list:
            resource_list.append(resource_id)
            self._save_config()
            logger.info(
                "Granted %s permission '%s' to user '%s'",
                resource_type,
                resource_id,
                user_id,
            )

    def revoke_resource_permission(
        self,
        user_id: str,
        resource_type: Literal["mcp", "tool", "skill"],
        resource_id: str,
    ) -> None:
        """Revoke a user's permission to use a resource.

        Args:
            user_id: User ID
            resource_type: Resource type
            resource_id: Resource ID
        """
        user = self.get_user(user_id)
        if user is None:
            return

        resource_list = self._get_user_resource_list(user, resource_type)
        if resource_id in resource_list:
            resource_list.remove(resource_id)
            self._save_config()
            logger.info(
                "Revoked %s permission '%s' from user '%s'",
                resource_type,
                resource_id,
                user_id,
            )

    def set_user_permissions(
        self,
        user_id: str,
        mcps: Optional[List[str]] = None,
        tools: Optional[List[str]] = None,
        skills: Optional[List[str]] = None,
    ) -> None:
        """Set complete permissions for a user.

        Args:
            user_id: User ID
            mcps: Allowed MCPs list (None = no change)
            tools: Allowed tools list (None = no change)
            skills: Allowed skills list (None = no change)
        """
        user = self.get_user(user_id)
        if user is None:
            logger.warning("User '%s' not found", user_id)
            return

        if mcps is not None:
            user.permissions.mcps = mcps
        if tools is not None:
            user.permissions.tools = tools
        if skills is not None:
            user.permissions.skills = skills

        self._save_config()
        logger.info("Updated permissions for user '%s'", user_id)

    def ensure_authz_enabled(self) -> bool:
        """Check if authorization is enabled.

        Returns:
            True if COPAW_AUTHZ_ENABLED is set to a truthy value
        """
        import os
        env_flag = os.environ.get("COPAW_AUTHZ_ENABLED", "").strip().lower()
        return env_flag in ("true", "1", "yes")


def get_authz_service() -> SimpleAuthzService:
    """Get the global authorization service singleton.

    Returns:
        SimpleAuthzService instance
    """
    global _authz_service
    if _authz_service is None:
        _authz_service = SimpleAuthzService()
    return _authz_service


def reset_authz_service() -> None:
    """Reset the global authorization service singleton.

    Used primarily for testing.
    """
    global _authz_service
    _authz_service = None
