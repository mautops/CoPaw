# -*- coding: utf-8 -*-
"""Agent-scoped router that wraps existing routers under /agents/{agentId}/

This provides agent isolation by injecting agentId into request.state,
allowing downstream APIs to access the correct agent context.
"""
import json
import logging

from fastapi import APIRouter, Request
from starlette.middleware.base import (
    BaseHTTPMiddleware,
    RequestResponseEndpoint,
)
from starlette.responses import Response

logger = logging.getLogger(__name__)


class AgentContextMiddleware(BaseHTTPMiddleware):
    """Middleware to inject agentId and userId into request.state."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Extract agentId from path/header, userId from JWT, inject into context."""
        from ..agent_context import set_current_agent_id

        agent_id = None

        # Priority 1: Extract agentId from path: /api/agents/{agentId}/...
        path_parts = request.url.path.split("/")
        if len(path_parts) >= 4 and path_parts[1] == "api":
            if path_parts[2] == "agents":
                agent_id = path_parts[3]
                request.state.agent_id = agent_id
                logger.debug(
                    "AgentContextMiddleware: agent_id=%s from path=%s",
                    agent_id,
                    request.url.path,
                )

        # Priority 2: Check X-Agent-Id header
        if not agent_id:
            agent_id = request.headers.get("X-Agent-Id")

        # Extract user_id from JWT token if auth is enabled
        user_id = getattr(request.state, "user_id", None)
        if user_id is None:
            user_id = self._extract_user_id(request)
            request.state.user_id = user_id

        # Check agent access permissions if both user_id and agent_id are available
        if user_id and agent_id:
            try:
                from ..auth import is_auth_enabled
                from ..authz.service import get_authz_service

                if is_auth_enabled():
                    authz = get_authz_service()
                    if not authz.check_agent_access(user_id, agent_id):
                        logger.warning(
                            "Access denied: user '%s' cannot access agent '%s'",
                            user_id,
                            agent_id,
                        )
                        return Response(
                            content=json.dumps(
                                {"detail": "Access denied to this agent"}
                            ),
                            status_code=403,
                            media_type="application/json",
                        )
            except Exception as e:
                # If authz check fails, log and continue (fail open for now)
                logger.warning("Agent access check failed: %s", e)

        # Set agent_id in context variable for use by runners
        if agent_id:
            set_current_agent_id(agent_id)

        response = await call_next(request)
        return response

    @staticmethod
    def _extract_user_id(request: Request):
        """Extract user_id from JWT token in request headers.

        Args:
            request: HTTP request

        Returns:
            user_id from JWT payload, or None if not available
        """
        try:
            from ..auth import is_auth_enabled, verify_token

            if not is_auth_enabled():
                return None

            auth_header = request.headers.get("Authorization", "")
            token = None

            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
            elif "upgrade" in request.headers.get("connection", "").lower():
                token = request.query_params.get("token")

            if not token:
                return None

            payload = verify_token(token)
            if payload is None:
                return None

            return payload.get("user_id")

        except Exception as e:
            logger.debug("Failed to extract user_id from token: %s", e)
            return None


def create_agent_scoped_router() -> APIRouter:
    """Create router that wraps all existing routers under /{agentId}/

    Returns:
        APIRouter with all sub-routers mounted under /{agentId}/
    """
    from .agent import router as agent_router
    from .skills import router as skills_router
    from .tools import router as tools_router
    from .config import router as config_router
    from .mcp import router as mcp_router
    from .workspace import router as workspace_router
    from ..crons.api import router as cron_router
    from ..runner.api import router as chats_router
    from .console import router as console_router

    # Create parent router with agentId parameter
    router = APIRouter(prefix="/agents/{agentId}", tags=["agent-scoped"])

    # Include all agent-specific sub-routers (they keep their own prefixes)
    # /agents/{agentId}/agent/* -> agent_router
    # /agents/{agentId}/chats/* -> chats_router
    # /agents/{agentId}/config/* -> config_router (channels, heartbeat)
    # /agents/{agentId}/cron/* -> cron_router
    # /agents/{agentId}/mcp/* -> mcp_router
    # /agents/{agentId}/skills/* -> skills_router
    # /agents/{agentId}/tools/* -> tools_router
    # /agents/{agentId}/workspace/* -> workspace_router
    router.include_router(agent_router)
    router.include_router(chats_router)
    router.include_router(config_router)
    router.include_router(cron_router)
    router.include_router(mcp_router)
    router.include_router(skills_router)
    router.include_router(tools_router)
    router.include_router(workspace_router)
    router.include_router(console_router)

    return router
