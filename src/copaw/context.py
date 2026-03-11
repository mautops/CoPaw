# -*- coding: utf-8 -*-
"""Context management for implicit user information passing.

This module provides thread-safe context variables that allow tools, MCP servers,
and skills to access the current user's information without explicit parameter passing.

Usage in tools/MCP/skills:
    from copaw.context import get_current_user_id, get_current_username

    def my_tool():
        user_id = get_current_user_id()
        username = get_current_username()
        session_id = get_current_session_id()
        channel = get_current_channel()
"""
import contextvars
from typing import Optional


# Context variables for user information
_user_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "user_id",
    default=None,
)
_username: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "username",
    default=None,
)
_session_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "session_id",
    default=None,
)
_channel: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "channel",
    default=None,
)


def set_user_context(
    user_id: str,
    session_id: str,
    channel: str,
    username: Optional[str] = None,
) -> None:
    """Set the current user context (internal use only by Runner).

    This function should only be called by the AgentRunner when processing
    a user request. It sets the context variables that will be available
    to all tools, MCP servers, and skills during the request lifecycle.

    Args:
        user_id: User identifier from the channel
        session_id: Session identifier (format: channel:id)
        channel: Channel name (wecom, dingtalk, discord, etc.)
        username: Optional username/display name
    """
    _user_id.set(user_id)
    _session_id.set(session_id)
    _channel.set(channel)
    _username.set(username or user_id)


def get_current_user_id() -> Optional[str]:
    """Get the current user ID.

    Returns:
        User ID string, or None if not in a user context

    Example:
        >>> user_id = get_current_user_id()
        >>> print(f"Processing request for user: {user_id}")
    """
    return _user_id.get()


def get_current_username() -> Optional[str]:
    """Get the current username/display name.

    Returns:
        Username string, or None if not in a user context

    Example:
        >>> username = get_current_username()
        >>> print(f"Hello, {username}!")
    """
    return _username.get()


def get_current_session_id() -> Optional[str]:
    """Get the current session ID.

    Returns:
        Session ID string (format: channel:id), or None if not in a user context

    Example:
        >>> session_id = get_current_session_id()
        >>> print(f"Session: {session_id}")
    """
    return _session_id.get()


def get_current_channel() -> Optional[str]:
    """Get the current channel name.

    Returns:
        Channel name string, or None if not in a user context

    Example:
        >>> channel = get_current_channel()
        >>> if channel == "wecom":
        >>>     # Handle WeChat-specific logic
    """
    return _channel.get()


def get_user_context() -> dict[str, Optional[str]]:
    """Get all user context information as a dictionary.

    Returns:
        Dictionary containing user_id, username, session_id, and channel

    Example:
        >>> context = get_user_context()
        >>> print(f"User: {context['username']} from {context['channel']}")
    """
    return {
        "user_id": _user_id.get(),
        "username": _username.get(),
        "session_id": _session_id.get(),
        "channel": _channel.get(),
    }


def clear_user_context() -> None:
    """Clear the current user context (internal use only).

    This is typically not needed as contextvars are automatically
    isolated per async task, but can be used for cleanup if needed.
    """
    _user_id.set(None)
    _username.set(None)
    _session_id.set(None)
    _channel.set(None)
