# -*- coding: utf-8 -*-
"""Authentication module: password hashing, JWT tokens, and FastAPI middleware.

Login is disabled by default and only enabled when the environment
variable ``COPAW_AUTH_ENABLED`` is set to a truthy value (``true``,
``1``, ``yes``).  Credentials are created through a web-based
registration flow rather than environment variables, so that agents
running inside the process cannot read plaintext passwords.

Single-user design: only one account can be registered.  If the user
forgets their password, delete ``auth.json`` from ``SECRET_DIR`` and
restart the service to re-register.

Uses only Python stdlib (hashlib, hmac, secrets) to avoid adding new
dependencies.  The password is stored as a salted SHA-256 hash in
``auth.json`` under ``SECRET_DIR``.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from ..constant import SECRET_DIR

logger = logging.getLogger(__name__)

AUTH_FILE = SECRET_DIR / "auth.json"

# Token validity: 7 days
TOKEN_EXPIRY_SECONDS = 7 * 24 * 3600

# Paths that do NOT require authentication
_PUBLIC_PATHS: frozenset[str] = frozenset(
    {
        "/api/auth/login",
        "/api/auth/status",
        "/api/auth/register",
        "/api/version",
    },
)

# Prefixes that do NOT require authentication (static assets)
_PUBLIC_PREFIXES: tuple[str, ...] = (
    "/assets/",
    "/logo.png",
    "/copaw-symbol.svg",
)


# ---------------------------------------------------------------------------
# Helpers (reuse SECRET_DIR patterns from envs/store.py)
# ---------------------------------------------------------------------------


def _chmod_best_effort(path, mode: int) -> None:
    try:
        os.chmod(path, mode)
    except OSError:
        pass


def _prepare_secret_parent(path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    _chmod_best_effort(path.parent, 0o700)


# ---------------------------------------------------------------------------
# Password hashing (salted SHA-256, no external deps)
# ---------------------------------------------------------------------------


def _hash_password(
    password: str,
    salt: Optional[str] = None,
) -> tuple[str, str]:
    """Hash *password* with *salt*.  Returns ``(hash_hex, salt_hex)``."""
    if salt is None:
        salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
    return h, salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verify *password* against a stored hash."""
    h, _ = _hash_password(password, salt)
    return hmac.compare_digest(h, stored_hash)


# ---------------------------------------------------------------------------
# Token generation / verification (HMAC-SHA256, no PyJWT needed)
# ---------------------------------------------------------------------------


def _get_jwt_secret() -> str:
    """Return the signing secret, creating one if absent."""
    data = _load_auth_data()
    secret = data.get("jwt_secret", "")
    if not secret:
        secret = secrets.token_hex(32)
        data["jwt_secret"] = secret
        _save_auth_data(data)
    return secret


def create_token(username: str, user_id: Optional[str] = None) -> str:
    """Create an HMAC-signed token: ``base64(payload).signature``.

    Args:
        username: Username to encode in token
        user_id: Optional user ID to include in token payload

    Returns:
        Signed token string
    """
    import base64

    secret = _get_jwt_secret()
    payload: dict = {
        "sub": username,
        "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS,
        "iat": int(time.time()),
    }
    if user_id is not None:
        payload["user_id"] = user_id

    payload_str = json.dumps(payload)
    payload_b64 = base64.urlsafe_b64encode(payload_str.encode()).decode()
    sig = hmac.new(
        secret.encode(),
        payload_b64.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{payload_b64}.{sig}"


def verify_token(token: str) -> Optional[dict]:
    """Verify *token*, return payload dict if valid, ``None`` otherwise.

    The returned dict contains:
    - ``sub``: username
    - ``user_id``: user ID (if present in token)
    - ``exp``: expiry timestamp
    - ``iat``: issued at timestamp

    Args:
        token: Token string to verify

    Returns:
        Payload dict if valid, None if invalid or expired
    """
    import base64

    try:
        parts = token.split(".", 1)
        if len(parts) != 2:
            return None
        payload_b64, sig = parts
        secret = _get_jwt_secret()
        expected_sig = hmac.new(
            secret.encode(),
            payload_b64.encode(),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except (json.JSONDecodeError, KeyError, ValueError, TypeError) as exc:
        logger.debug("Token verification failed: %s", exc)
        return None


def verify_token_username(token: str) -> Optional[str]:
    """Verify token and return username for backward compatibility.

    Args:
        token: Token string to verify

    Returns:
        Username if valid, None otherwise
    """
    payload = verify_token(token)
    if payload is None:
        return None
    return payload.get("sub")



# ---------------------------------------------------------------------------
# Auth data persistence (auth.json in SECRET_DIR)
# ---------------------------------------------------------------------------


def _load_auth_data() -> dict:
    """Load ``auth.json`` from ``SECRET_DIR``.

    Returns the parsed dict, or a sentinel with ``_auth_load_error``
    set to ``True`` when the file exists but cannot be read/parsed so
    that callers can fail closed instead of silently bypassing auth.

    Supports both old single-user format and new multi-user format.
    """
    if AUTH_FILE.is_file():
        try:
            with open(AUTH_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Migrate old format to new format if needed
                if "user" in data and "users" not in data:
                    data = _migrate_single_to_multi_user(data)
                return data
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Failed to load auth file %s: %s", AUTH_FILE, exc)
            return {"_auth_load_error": True}
    return {}


def _migrate_single_to_multi_user(old_data: dict) -> dict:
    """Migrate old single-user format to new multi-user format.

    Old format:
    {
      "user": {"username": "...", "password_hash": "...", "password_salt": "..."},
      "jwt_secret": "..."
    }

    New format:
    {
      "users": {
        "user_id": {"username": "...", "password_hash": "...", "password_salt": "..."}
      },
      "jwt_secret": "..."
    }

    Args:
        old_data: Old format auth data

    Returns:
        New format auth data
    """
    user_data = old_data.get("user")
    if not user_data:
        return old_data

    # Generate user_id from username
    username = user_data.get("username", "default")
    user_id = f"user_{hashlib.sha256(username.encode()).hexdigest()[:16]}"

    new_data = {
        "users": {
            user_id: user_data
        },
        "jwt_secret": old_data.get("jwt_secret", "")
    }

    # Save migrated data
    _save_auth_data(new_data)
    logger.info("Migrated auth.json from single-user to multi-user format")

    return new_data



def _save_auth_data(data: dict) -> None:
    """Save ``auth.json`` to ``SECRET_DIR`` with restrictive permissions."""
    _prepare_secret_parent(AUTH_FILE)
    with open(AUTH_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    _chmod_best_effort(AUTH_FILE, 0o600)


def is_auth_enabled() -> bool:
    """Check whether authentication is enabled via environment variable.

    Returns ``True`` when ``COPAW_AUTH_ENABLED`` is set to a truthy
    value (``true``, ``1``, ``yes``).  The presence of a registered
    user is checked separately by the middleware so that the first
    user can still reach the registration page.
    """
    env_flag = os.environ.get("COPAW_AUTH_ENABLED", "").strip().lower()
    return env_flag in ("true", "1", "yes")


def has_registered_users() -> bool:
    """Return ``True`` if at least one user has been registered."""
    data = _load_auth_data()
    # Support both old format (user) and new format (users)
    return bool(data.get("users") or data.get("user"))


# ---------------------------------------------------------------------------
# Registration (single-user)
# ---------------------------------------------------------------------------


def register_user(username: str, password: str) -> Optional[str]:
    """Register a new user account.

    Returns a token on success, ``None`` if username already exists.

    Args:
        username: Username to register
        password: Password for the user

    Returns:
        JWT token if successful, None if username exists
    """
    data = _load_auth_data()

    # Initialize users dict if not present
    if "users" not in data:
        data["users"] = {}

    # Check if username already exists
    for user_data in data["users"].values():
        if user_data.get("username") == username:
            logger.warning("Username '%s' already exists", username)
            return None

    # Generate user_id
    user_id = f"user_{hashlib.sha256(username.encode()).hexdigest()[:16]}"

    # Hash password
    pw_hash, salt = _hash_password(password)
    data["users"][user_id] = {
        "username": username,
        "password_hash": pw_hash,
        "password_salt": salt,
    }

    # Ensure jwt_secret exists
    if not data.get("jwt_secret"):
        data["jwt_secret"] = secrets.token_hex(32)

    _save_auth_data(data)
    logger.info("User '%s' registered with ID '%s'", username, user_id)

    # Create token with user_id
    return create_token(username, user_id)


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


def authenticate(username: str, password: str) -> Optional[str]:
    """Authenticate *username* / *password*.  Returns a token if valid.

    Args:
        username: Username to authenticate
        password: Password to verify

    Returns:
        JWT token if authentication successful, None otherwise
    """
    data = _load_auth_data()

    # Support new multi-user format
    if "users" in data:
        for user_id, user_data in data["users"].items():
            if user_data.get("username") != username:
                continue

            stored_hash = user_data.get("password_hash", "")
            stored_salt = user_data.get("password_salt", "")

            if (
                stored_hash
                and stored_salt
                and verify_password(password, stored_hash, stored_salt)
            ):
                return create_token(username, user_id)

        return None

    # Fallback to old single-user format (should not happen after migration)
    user = data.get("user")
    if not user:
        return None
    if user.get("username") != username:
        return None
    stored_hash = user.get("password_hash", "")
    stored_salt = user.get("password_salt", "")
    if (
        stored_hash
        and stored_salt
        and verify_password(password, stored_hash, stored_salt)
    ):
        # Generate user_id for old format
        user_id = f"user_{hashlib.sha256(username.encode()).hexdigest()[:16]}"
        return create_token(username, user_id)
    return None


def get_user_id_by_username(username: str) -> Optional[str]:
    """Get user ID by username.

    Args:
        username: Username to look up

    Returns:
        User ID if found, None otherwise
    """
    data = _load_auth_data()

    if "users" in data:
        for user_id, user_data in data["users"].items():
            if user_data.get("username") == username:
                return user_id

    # Fallback: generate user_id from username for old format
    if data.get("user", {}).get("username") == username:
        return f"user_{hashlib.sha256(username.encode()).hexdigest()[:16]}"

    return None


# ---------------------------------------------------------------------------
# FastAPI middleware
# ---------------------------------------------------------------------------


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware that checks Bearer token on protected routes."""

    async def dispatch(
        self,
        request: Request,
        call_next,
    ) -> Response:
        """Check Bearer token on protected API routes; skip public paths."""
        if self._should_skip_auth(request):
            return await call_next(request)

        token = self._extract_token(request)
        if not token:
            return Response(
                content=json.dumps({"detail": "Not authenticated"}),
                status_code=401,
                media_type="application/json",
            )

        payload = verify_token(token)
        if payload is None:
            return Response(
                content=json.dumps(
                    {"detail": "Invalid or expired token"},
                ),
                status_code=401,
                media_type="application/json",
            )

        # Store both username and user_id in request state
        request.state.user = payload.get("sub")
        request.state.user_id = payload.get("user_id")
        return await call_next(request)

    @staticmethod
    def _should_skip_auth(request: Request) -> bool:
        """Return ``True`` when the request does not require auth."""
        if not is_auth_enabled() or not has_registered_users():
            return True

        path = request.url.path

        if request.method == "OPTIONS":
            return True

        if path in _PUBLIC_PATHS or any(
            path.startswith(p) for p in _PUBLIC_PREFIXES
        ):
            return True

        # Only protect /api/ routes
        if not path.startswith("/api/"):
            return True

        # Allow localhost requests without auth (CLI runs locally)
        client_host = request.client.host if request.client else ""
        return client_host in ("127.0.0.1", "::1")

    @staticmethod
    def _extract_token(request: Request) -> Optional[str]:
        """Extract Bearer token from header or WebSocket query param."""
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:]
        if "upgrade" in request.headers.get("connection", "").lower():
            return request.query_params.get("token")
        return None
