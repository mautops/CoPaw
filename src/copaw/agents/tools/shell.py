# -*- coding: utf-8 -*-
# flake8: noqa: E501
# pylint: disable=line-too-long
"""The shell command tool."""

import asyncio
import locale
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

from agentscope.message import TextBlock
from agentscope.tool import ToolResponse

from copaw.constant import WORKING_DIR
from copaw.context import get_user_context
from .utils import truncate_shell_output


def _execute_subprocess_sync(
    cmd: str,
    cwd: str,
    timeout: int,
    env: Optional[dict] = None,
) -> tuple[int, str, str]:
    """Execute subprocess synchronously in a thread.

    This function runs in a separate thread to avoid Windows asyncio
    subprocess limitations.

    Args:
        cmd (`str`):
            The shell command to execute.
        cwd (`str`):
            The working directory for the command execution.
        timeout (`int`):
            The maximum time (in seconds) allowed for the command to run.
        env (`Optional[dict]`):
            Environment variables to pass to the subprocess.

    Returns:
        `tuple[int, str, str]`:
            A tuple containing the return code, standard output, and
            standard error of the executed command. If timeout occurs, the
            return code will be -1 and stderr will contain timeout information.
    """
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=False,
            cwd=cwd,
            timeout=timeout,
            env=env,
            check=True,
            env=env,
        )
        return (
            result.returncode,
            smart_decode(result.stdout),
            smart_decode(result.stderr),
        )
    except subprocess.TimeoutExpired:
        return (
            -1,
            "",
            f"Command execution exceeded the timeout of {timeout} seconds.",
        )
    except Exception as e:
        return -1, "", str(e)


# pylint: disable=too-many-branches, too-many-statements
async def execute_shell_command(
    command: str,
    timeout: int = 60,
    cwd: Optional[Path] = None,
) -> ToolResponse:
    """Execute given command and return the return code, standard output and
    error within <returncode></returncode>, <stdout></stdout> and
    <stderr></stderr> tags.

    The command will have access to user context via environment variables:
    - COPAW_USER_ID: Current user ID
    - COPAW_USERNAME: Current username
    - COPAW_SESSION_ID: Current session ID
    - COPAW_CHANNEL: Current channel name

    Args:
        command (`str`):
            The shell command to execute.
        timeout (`int`, defaults to `10`):
            The maximum time (in seconds) allowed for the command to run.
            Default is 60 seconds.
        cwd (`Optional[Path]`, defaults to `None`):
            The working directory for the command execution.
            If None, defaults to WORKING_DIR.

    Returns:
        `ToolResponse`:
            The tool response containing the return code, standard output, and
            standard error of the executed command. If timeout occurs, the
            return code will be -1 and stderr will contain timeout information.
    """

    cmd = (command or "").strip()

    # Set working directory
    working_dir = cwd if cwd is not None else WORKING_DIR

    # Prepare environment variables with user context
    env = os.environ.copy()
    user_context = get_user_context()

    # Build readonly preamble: declare COPAW_* as readonly before running
    # user's command. This prevents modification via export/assignment.
    copaw_vars = {
        "COPAW_USER_ID": user_context.get("user_id") or "",
        "COPAW_USERNAME": user_context.get("username") or "",
        "COPAW_SESSION_ID": user_context.get("session_id") or "",
        "COPAW_CHANNEL": user_context.get("channel") or "",
    }
    env.update(copaw_vars)

    # Wrap user command with readonly declarations (bash/sh only)
    if sys.platform != "win32":
        readonly_lines = "\n".join(
            f"readonly {k}" for k in copaw_vars
        )
        cmd = f"{readonly_lines}\n{cmd}"

    try:
        if sys.platform == "win32":
            # Windows: use thread pool to avoid asyncio subprocess limitations
            returncode, stdout_str, stderr_str = await asyncio.to_thread(
                _execute_subprocess_sync,
                cmd,
                str(working_dir),
                timeout,
                env,
            )
        else:
            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                bufsize=0,
                cwd=str(working_dir),
                env=env,
            )

            try:
                # Apply timeout to communicate directly; wait()+communicate()
                # can hang if descendants keep stdout/stderr pipes open.
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=timeout,
                )
                stdout_str = smart_decode(stdout)
                stderr_str = smart_decode(stderr)
                returncode = proc.returncode

            except asyncio.TimeoutError:
                # Handle timeout
                stderr_suffix = (
                    f"⚠️ TimeoutError: The command execution exceeded "
                    f"the timeout of {timeout} seconds. "
                    f"Please consider increasing the timeout value if this command "
                    f"requires more time to complete."
                )
                returncode = -1
                try:
                    proc.terminate()
                    # Wait a bit for graceful termination
                    try:
                        await asyncio.wait_for(proc.wait(), timeout=1)
                    except asyncio.TimeoutError:
                        # Force kill if graceful termination fails
                        proc.kill()
                        await proc.wait()

                    # Avoid hanging forever while draining pipes after timeout.
                    try:
                        stdout, stderr = await asyncio.wait_for(
                            proc.communicate(),
                            timeout=1,
                        )
                    except asyncio.TimeoutError:
                        stdout, stderr = b"", b""
                    stdout_str = smart_decode(stdout)
                    stderr_str = smart_decode(stderr)
                    if stderr_str:
                        stderr_str += f"\n{stderr_suffix}"
                    else:
                        stderr_str = stderr_suffix
                except ProcessLookupError:
                    stdout_str = ""
                    stderr_str = stderr_suffix

        # Apply output truncation
        stdout_str = truncate_shell_output(stdout_str)
        stderr_str = truncate_shell_output(stderr_str)

        # Format the response in a human-friendly way
        if returncode == 0:
            # Success case: just show the output
            if stdout_str:
                response_text = stdout_str
            else:
                response_text = "Command executed successfully (no output)."
        else:
            # Error case: show detailed information
            response_parts = [f"Command failed with exit code {returncode}."]
            if stdout_str:
                response_parts.append(f"\n[stdout]\n{stdout_str}")
            if stderr_str:
                response_parts.append(f"\n[stderr]\n{stderr_str}")
            response_text = "".join(response_parts)

        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text=response_text,
                ),
            ],
        )

    except Exception as e:
        return ToolResponse(
            content=[
                TextBlock(
                    type="text",
                    text=f"Error: Shell command execution failed due to \n{e}",
                ),
            ],
        )


def smart_decode(data: bytes) -> str:
    try:
        decoded_str = data.decode("utf-8")
    except UnicodeDecodeError:
        encoding = locale.getpreferredencoding(False) or "utf-8"
        decoded_str = data.decode(encoding, errors="replace")

    return decoded_str.strip("\n")
