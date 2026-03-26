# -*- coding: utf-8 -*-
"""Token encryption utility for CLI access token protection.

This module provides symmetric encryption for CLI access tokens before
passing them to shell executor environment variables. This prevents
users from directly decoding JWT tokens - they must use the CLI tool
which has the encryption key hardcoded.

Encryption Algorithm:
    Fernet (AES-128-CBC + HMAC-SHA256) - standard, widely supported.
    Go CLI can use: github.com/fernet/fernet-go

Environment:
    CLI_TOKEN_ENCRYPTION_KEY: Fernet key (base64-encoded, 44 chars).
        This key MUST be kept secret and hardcoded in the CLI binary.
        If not set via env, a key is auto-generated and stored in SECRET_DIR.
    CLI_TOKEN_TTL: Time-to-live in seconds for encrypted tokens.
        Default: 3600 (1 hour). CLI decryption will fail after TTL expires.

Security Model:
    - Server encrypts JWT token with the key
    - Encrypted token passed to shell as CLI_ACCESS_TOKEN env var
    - User cannot decode (no key, only encrypted blob)
    - CLI tool has key hardcoded in binary → decrypts → verifies with Keycloak
    - TTL ensures tokens expire even if encrypted blob leaks
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from ..constant import SECRET_DIR

logger = logging.getLogger(__name__)

# Key file path in SECRET_DIR
_KEY_FILE = SECRET_DIR / "cli_token_key.txt"

# Default TTL: 3 minutes (180 seconds)
_DEFAULT_TTL = 180


def _get_ttl() -> int:
    """Get the TTL (time-to-live) for encrypted tokens in seconds.

    Returns:
        int: TTL in seconds, default 3600 (1 hour)
    """
    raw = os.environ.get("CLI_TOKEN_TTL", "").strip()
    if not raw:
        return _DEFAULT_TTL
    try:
        ttl = int(raw)
        if ttl > 0:
            return ttl
    except ValueError:
        pass
    return _DEFAULT_TTL


def _load_or_generate_key() -> bytes:
    """Load encryption key from file or generate a new one.

    Priority:
    1. CLI_TOKEN_ENCRYPTION_KEY environment variable
    2. Key file in SECRET_DIR
    3. Generate new key and save to file

    Returns:
        bytes: Fernet key (32 url-safe base64-encoded bytes)
    """
    # Try environment variable first
    env_key = os.environ.get("CLI_TOKEN_ENCRYPTION_KEY", "").strip()
    if env_key:
        try:
            # Validate it's a valid Fernet key
            Fernet(env_key.encode())
            return env_key.encode()
        except Exception as e:
            logger.warning(
                "CLI_TOKEN_ENCRYPTION_KEY is set but invalid: %s", e
            )

    # Try loading from file
    if _KEY_FILE.is_file():
        try:
            key = _KEY_FILE.read_text().strip()
            if key:
                Fernet(key.encode())
                return key.encode()
        except Exception as e:
            logger.warning("Failed to load key file %s: %s", _KEY_FILE, e)

    # Generate new key
    new_key = Fernet.generate_key()
    _KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    _KEY_FILE.write_bytes(new_key)
    try:
        os.chmod(_KEY_FILE, 0o600)
    except OSError:
        pass
    logger.info("Generated new CLI token encryption key at %s", _KEY_FILE)
    return new_key


# Lazy-loaded Fernet instance
_fernet: Optional[Fernet] = None


def _get_fernet() -> Fernet:
    """Get or create Fernet instance with the encryption key."""
    global _fernet
    if _fernet is None:
        key = _load_or_generate_key()
        _fernet = Fernet(key)
    return _fernet


def encrypt_cli_token(token: str) -> str:
    """Encrypt a CLI access token.

    Args:
        token: The raw access token (e.g., JWT from Keycloak)

    Returns:
        str: Encrypted token (base64-encoded, safe for env vars)
    """
    if not token or not token.strip():
        return ""
    f = _get_fernet()
    encrypted = f.encrypt(token.encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_cli_token(
    encrypted_token: str,
    ttl: Optional[int] = None,
) -> Optional[str]:
    """Decrypt a CLI access token with optional TTL validation.

    Args:
        encrypted_token: The encrypted token from encrypt_cli_token()
        ttl: Time-to-live in seconds. If set, decryption fails if the token
            was encrypted more than ttl seconds ago. Use None to skip TTL
            check (not recommended for CLI tools).
            Default: uses CLI_TOKEN_TTL env var or 3600 seconds.

    Returns:
        Optional[str]: The original token, or None if decryption failed
            (invalid, tampered, or expired)
    """
    if not encrypted_token or not encrypted_token.strip():
        return None

    # Use provided TTL or get from config
    if ttl is None:
        ttl = _get_ttl()

    try:
        f = _get_fernet()
        # Fernet's decrypt with ttl will raise InvalidToken if token is older than ttl
        decrypted = f.decrypt(encrypted_token.encode("utf-8"), ttl=ttl)
        return decrypted.decode("utf-8")
    except InvalidToken:
        logger.warning("Failed to decrypt CLI token: invalid, tampered, or expired (TTL=%ss)", ttl)
        return None
    except Exception as e:
        logger.warning("Failed to decrypt CLI token: %s", e)
        return None


def get_encryption_key_for_cli() -> str:
    """Get the encryption key for CLI binary build.

    WARNING: This key must be kept secret and hardcoded in the CLI binary.
    Do NOT expose this key to users via API or UI.

    This function is intended for:
    - Admins building the CLI binary
    - CI/CD pipelines that embed the key

    Returns:
        str: Base64-encoded Fernet key (44 characters)
    """
    return _load_or_generate_key().decode("utf-8")


def get_token_ttl() -> int:
    """Get the configured TTL for CLI tokens.

    Returns:
        int: TTL in seconds
    """
    return _get_ttl()


# CLI build helper constants (for documentation)
# Go CLI should use: github.com/fernet/fernet-go
# Example Go code:
#
#   import "github.com/fernet/fernet-go"
#
#   const encryptionKey = "YOUR_KEY_HERE"  // 44-char base64
#   const tokenTTL = 3600  // seconds
#
#   func decryptToken(encryptedToken string) (string, error) {
#       k, err := fernet.DecodeKey(encryptionKey)
#       if err != nil { return "", err }
#       b := fernet.VerifyAndDecrypt([]byte(encryptedToken), tokenTTL, []*fernet.Key{k})
#       if b == nil { return "", errors.New("token expired or invalid") }
#       return string(b), nil
#   }