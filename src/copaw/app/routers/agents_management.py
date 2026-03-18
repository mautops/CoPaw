# -*- coding: utf-8 -*-
"""Agent 管理 API

Provides CRUD and sharing operations for user agents.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..auth import is_auth_enabled, verify_token
from ..authz.service import get_authz_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user/agents", tags=["agent-management"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class CreateAgentRequest(BaseModel):
    name: str
    description: str = ""
    config: dict = {}


class CreateAgentResponse(BaseModel):
    agent_id: str
    message: str


class DeleteAgentResponse(BaseModel):
    success: bool
    message: str


class ShareAgentRequest(BaseModel):
    target_user_id: str


class ShareAgentResponse(BaseModel):
    success: bool
    message: str


class SharingStatusResponse(BaseModel):
    agent_id: str
    owner: Optional[str]
    shared_with: List[str]
    can_delete: bool


# ---------------------------------------------------------------------------
# Dependency: extract user_id from request
# ---------------------------------------------------------------------------


def _get_current_user_id(request: Request) -> Optional[str]:
    """Extract user_id from request.state or JWT token.

    Args:
        request: FastAPI request

    Returns:
        user_id string or None
    """
    # Try request.state first (set by AuthMiddleware)
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return user_id

    # Try to extract from JWT token
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


def _require_user_id(request: Request) -> str:
    """Get user_id from request, raise 401 if not authenticated.

    Args:
        request: FastAPI request

    Returns:
        user_id string

    Raises:
        HTTPException: 401 if not authenticated, 403 if authz not enabled
    """
    if is_auth_enabled():
        user_id = _get_current_user_id(request)
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Authentication required",
            )
        return user_id

    # Auth not enabled - use a default user_id
    return "default_user"


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------


@router.post("", response_model=CreateAgentResponse)
async def create_agent(req: CreateAgentRequest, request: Request):
    """Create a new agent for the current user.

    The created agent is automatically:
    - Owned by the current user
    - Not shared with anyone
    """
    user_id = _require_user_id(request)

    from ..authz.agent_lifecycle import create_user_agent

    try:
        agent_id = await create_user_agent(user_id, req.name, req.config or None)
        return CreateAgentResponse(
            agent_id=agent_id,
            message=f"Agent '{req.name}' created successfully",
        )
    except Exception as e:
        logger.exception("Failed to create agent for user '%s': %s", user_id, e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create agent: {str(e)}",
        )


@router.delete("/{agent_id}", response_model=DeleteAgentResponse)
async def delete_agent(agent_id: str, request: Request):
    """Delete an agent.

    Requires:
    - Current user must be the owner
    - Agent must not be shared with any other users

    If the agent is shared, returns 400 with details about who it's shared with.
    """
    user_id = _require_user_id(request)

    from ..authz.agent_lifecycle import delete_user_agent

    try:
        await delete_user_agent(user_id, agent_id)
        return DeleteAgentResponse(
            success=True,
            message="Agent deleted successfully",
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "PERMISSION_DENIED",
                "message": str(e),
            },
        )
    except ValueError as e:
        # Agent is shared - return details
        authz = get_authz_service()
        shared_users = authz.get_agent_shared_users(agent_id)
        raise HTTPException(
            status_code=400,
            detail={
                "error": "AGENT_SHARED",
                "message": str(e),
                "shared_with": shared_users,
                "hint": f"Please unshare the agent first using POST /api/user/agents/{agent_id}/unshare",
            },
        )
    except Exception as e:
        logger.exception(
            "Failed to delete agent '%s' for user '%s': %s",
            agent_id,
            user_id,
            e,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete agent: {str(e)}",
        )


@router.post("/{agent_id}/share", response_model=ShareAgentResponse)
async def share_agent(agent_id: str, req: ShareAgentRequest, request: Request):
    """Share an agent with another user.

    Only the owner can share an agent.
    """
    user_id = _require_user_id(request)

    from ..authz.agent_lifecycle import share_agent_with_user

    try:
        await share_agent_with_user(user_id, agent_id, req.target_user_id)
        return ShareAgentResponse(
            success=True,
            message=f"Agent shared with user '{req.target_user_id}'",
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to share agent: {str(e)}",
        )


@router.post("/{agent_id}/unshare", response_model=ShareAgentResponse)
async def unshare_agent(agent_id: str, req: ShareAgentRequest, request: Request):
    """Remove sharing of an agent from a user.

    Only the owner can unshare an agent.
    """
    user_id = _require_user_id(request)

    from ..authz.agent_lifecycle import unshare_agent_from_user

    try:
        await unshare_agent_from_user(user_id, agent_id, req.target_user_id)
        return ShareAgentResponse(
            success=True,
            message=f"Agent unshared from user '{req.target_user_id}'",
        )
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to unshare agent: {str(e)}",
        )


@router.get("/{agent_id}/sharing", response_model=SharingStatusResponse)
async def get_sharing_status(agent_id: str, request: Request):
    """Get sharing status of an agent.

    Returns the owner, list of users it's shared with, and whether it can be deleted.
    """
    user_id = _require_user_id(request)

    from ..authz.agent_lifecycle import get_agent_sharing_status

    # Check if user can access this agent
    authz = get_authz_service()
    if not authz.check_agent_access(user_id, agent_id):
        raise HTTPException(
            status_code=403,
            detail="Access denied to this agent",
        )

    status = await get_agent_sharing_status(agent_id)
    return SharingStatusResponse(**status)


@router.get("", response_model=List[str])
async def list_user_agents(request: Request):
    """List all agents accessible by the current user."""
    user_id = _require_user_id(request)

    authz = get_authz_service()
    return authz.list_user_agents(user_id)
