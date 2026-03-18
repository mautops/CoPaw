# -*- coding: utf-8 -*-
"""Authentication API endpoints."""
from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ..auth import (
    authenticate,
    has_registered_users,
    is_auth_enabled,
    register_user,
    verify_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str


class RegisterRequest(BaseModel):
    username: str
    password: str


class AuthStatusResponse(BaseModel):
    enabled: bool
    has_users: bool


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate with username and password.

    On first login, automatically creates a default agent for the user.
    """
    if not is_auth_enabled():
        return LoginResponse(token="", username="")

    token = authenticate(req.username, req.password)
    if token is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Auto-create default agent on first login if authz is enabled
    try:
        import os
        authz_enabled = os.environ.get("COPAW_AUTHZ_ENABLED", "").strip().lower() in ("true", "1", "yes")

        if authz_enabled:
            # Extract user_id from token payload
            payload = verify_token(token)
            if payload:
                user_id = payload.get("user_id")
                username = payload.get("sub", req.username)

                if user_id:
                    from ..authz.service import get_authz_service
                    from ..authz.agent_lifecycle import ensure_user_default_agent

                    authz = get_authz_service()

                    # Check if user exists in authz config, create if not
                    user = authz.get_user(user_id)
                    if user is None:
                        authz.add_user(user_id, username)

                    # Check if user has any agents, create default if not
                    user_agents = authz.list_user_agents(user_id)
                    if not user_agents:
                        await ensure_user_default_agent(user_id, username)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed to auto-create agent on login: %s", e)

    return LoginResponse(token=token, username=req.username)


@router.post("/register")
async def register(req: RegisterRequest):
    """Register the single user account (only allowed once)."""
    env_flag = os.environ.get("COPAW_AUTH_ENABLED", "").strip().lower()
    if env_flag not in ("true", "1", "yes"):
        raise HTTPException(
            status_code=403,
            detail="Authentication is not enabled",
        )

    if has_registered_users():
        raise HTTPException(
            status_code=403,
            detail="User already registered",
        )

    if not req.username.strip() or not req.password.strip():
        raise HTTPException(
            status_code=400,
            detail="Username and password are required",
        )

    token = register_user(req.username.strip(), req.password)
    if token is None:
        raise HTTPException(
            status_code=409,
            detail="Registration failed",
        )

    return LoginResponse(token=token, username=req.username.strip())


@router.get("/status")
async def auth_status():
    """Check if authentication is enabled and whether a user exists."""
    return AuthStatusResponse(
        enabled=is_auth_enabled(),
        has_users=has_registered_users(),
    )


@router.get("/verify")
async def verify(request: Request):
    """Verify that the caller's Bearer token is still valid."""
    if not is_auth_enabled():
        return {"valid": True, "username": ""}

    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else ""
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    username = verify_token(token)
    if username is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )

    return {"valid": True, "username": username}
