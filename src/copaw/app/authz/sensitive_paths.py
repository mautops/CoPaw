"""敏感路径保护模块

This module defines and checks for sensitive file paths that should
not be accessed or modified by AI agents to prevent privilege escalation.
"""

from __future__ import annotations

import os
from pathlib import Path

# Sensitive paths that should never be modified by AI tools
# These include permission config files, system files, and secrets
SENSITIVE_PATHS: frozenset[str] = frozenset(
    {
        # Permission configuration files
        "~/.copaw/secret/authz.json",
        "~/.copaw/secret/auth.json",
        # System configuration
        "/etc/passwd",
        "/etc/shadow",
        "/etc/sudoers",
        # SSH keys and credentials
        "~/.ssh/",
        "~/.ssh/id_rsa",
        "~/.ssh/id_ed25519",
        "~/.ssh/authorized_keys",
        # Environment variables
        ".env",
        ".env.local",
        ".env.production",
        ".env.secrets",
        # AWS credentials
        "~/.aws/credentials",
        "~/.aws/config",
        # Python secrets
        "~/.pypirc",
    }
)

# Additional path patterns to check for shell command injection
SENSITIVE_PATH_PATTERNS: tuple[str, ...] = (
    "/.copaw/secret/",
    "~/.copaw/secret/",
)


def is_sensitive_path(file_path: str) -> bool:
    """Check if a file path refers to a protected/sensitive file.

    Resolves the path (expands user home, resolves relative paths)
    before checking against the blacklist.

    Args:
        file_path: File path to check (may be relative or contain ~)

    Returns:
        True if the path refers to a sensitive/protected file
    """
    if not file_path:
        return False

    try:
        # Normalize path: expand ~ and resolve relative paths
        normalized = os.path.normpath(os.path.expanduser(file_path))
        normalized_abs = os.path.abspath(normalized)

        for sensitive in SENSITIVE_PATHS:
            sensitive_normalized = os.path.normpath(os.path.expanduser(sensitive))
            sensitive_abs = os.path.abspath(sensitive_normalized)

            # Check if path is the sensitive file or within a sensitive directory
            if normalized_abs == sensitive_abs:
                return True
            if sensitive_abs.endswith(os.sep):
                # It's a directory pattern
                if normalized_abs.startswith(sensitive_abs):
                    return True
            else:
                # Check if the normalized path starts with the sensitive path
                # (handles cases like /etc/shadow.bak being derived from /etc/shadow)
                if normalized_abs.startswith(sensitive_abs + os.sep):
                    return True

        # Check pattern-based matches
        for pattern in SENSITIVE_PATH_PATTERNS:
            pattern_normalized = os.path.expanduser(pattern)
            if file_path.replace("\\", "/").find(pattern_normalized.replace("\\", "/")) >= 0:
                return True
            if normalized_abs.find(os.path.normpath(os.path.expanduser(pattern))) >= 0:
                return True

        return False

    except (ValueError, OSError):
        # On path resolution errors, be conservative and return False
        # (We don't want to block legitimate paths due to resolution errors)
        return False
