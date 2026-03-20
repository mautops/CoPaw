# -*- coding: utf-8 -*-
"""Workflows API - User-level workflow management.

Provides RESTful API for managing user-level workflows that can orchestrate multiple agents.
"""

import logging
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ...constant import WORKFLOWS_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/workflows", tags=["workflows"])


class WorkflowInfo(BaseModel):
    """Workflow file information."""

    filename: str
    path: str
    size: int
    created_time: str
    modified_time: str


class WorkflowContent(BaseModel):
    """Workflow file content."""

    content: str = Field(..., description="Workflow content (YAML format)")


class WorkflowListResponse(BaseModel):
    """Response for listing workflows."""

    workflows: List[WorkflowInfo]


class WorkflowCreateRequest(BaseModel):
    """Request for creating a workflow."""

    filename: str = Field(..., description="Workflow filename (e.g., daily_report.yml)")
    content: str = Field(..., description="Workflow content in YAML format")


@router.get(
    "",
    response_model=WorkflowListResponse,
    summary="List all workflows",
    description="Get list of all workflow files in the user-level workflows directory",
)
async def list_workflows() -> WorkflowListResponse:
    """List all workflow files."""
    if not WORKFLOWS_DIR.exists():
        return WorkflowListResponse(workflows=[])

    workflows = []
    for file_path in WORKFLOWS_DIR.glob("*.yml"):
        stat = file_path.stat()
        workflows.append(
            WorkflowInfo(
                filename=file_path.name,
                path=str(file_path),
                size=stat.st_size,
                created_time=str(stat.st_ctime),
                modified_time=str(stat.st_mtime),
            )
        )

    # Also include .yaml files
    for file_path in WORKFLOWS_DIR.glob("*.yaml"):
        stat = file_path.stat()
        workflows.append(
            WorkflowInfo(
                filename=file_path.name,
                path=str(file_path),
                size=stat.st_size,
                created_time=str(stat.st_ctime),
                modified_time=str(stat.st_mtime),
            )
        )

    return WorkflowListResponse(workflows=workflows)


@router.get(
    "/{filename}",
    response_model=WorkflowContent,
    summary="Get workflow content",
    description="Read the content of a specific workflow file",
)
async def get_workflow(filename: str) -> WorkflowContent:
    """Get workflow content by filename."""
    file_path = WORKFLOWS_DIR / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Workflow '{filename}' not found",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' is not a file",
        )

    try:
        content = file_path.read_text(encoding="utf-8")
        return WorkflowContent(content=content)
    except Exception as e:
        logger.error(f"Failed to read workflow {filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read workflow: {e}",
        ) from e


@router.post(
    "",
    status_code=201,
    summary="Create workflow",
    description="Create a new workflow file with the given content",
)
async def create_workflow(request: WorkflowCreateRequest) -> dict:
    """Create a new workflow file."""
    # Validate filename
    if not request.filename.endswith((".yml", ".yaml")):
        raise HTTPException(
            status_code=400,
            detail="Workflow filename must end with .yml or .yaml",
        )

    if "/" in request.filename or "\\" in request.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename cannot contain path separators",
        )

    file_path = WORKFLOWS_DIR / request.filename

    if file_path.exists():
        raise HTTPException(
            status_code=409,
            detail=f"Workflow '{request.filename}' already exists",
        )

    try:
        WORKFLOWS_DIR.mkdir(parents=True, exist_ok=True)
        file_path.write_text(request.content, encoding="utf-8")
        logger.info(f"Created workflow: {file_path}")
        return {
            "success": True,
            "filename": request.filename,
            "path": str(file_path),
        }
    except Exception as e:
        logger.error(f"Failed to create workflow {request.filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create workflow: {e}",
        ) from e


@router.put(
    "/{filename}",
    summary="Update workflow",
    description="Update an existing workflow file",
)
async def update_workflow(
    filename: str,
    content: WorkflowContent,
) -> dict:
    """Update an existing workflow file."""
    # Validate filename
    if "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=400,
            detail="Filename cannot contain path separators",
        )

    file_path = WORKFLOWS_DIR / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Workflow '{filename}' not found",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' is not a file",
        )

    try:
        file_path.write_text(content.content, encoding="utf-8")
        logger.info(f"Updated workflow: {file_path}")
        return {
            "success": True,
            "filename": filename,
            "path": str(file_path),
        }
    except Exception as e:
        logger.error(f"Failed to update workflow {filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update workflow: {e}",
        ) from e


@router.delete(
    "/{filename}",
    summary="Delete workflow",
    description="Delete a workflow file",
)
async def delete_workflow(filename: str) -> dict:
    """Delete a workflow file."""
    # Validate filename
    if "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=400,
            detail="Filename cannot contain path separators",
        )

    file_path = WORKFLOWS_DIR / filename

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Workflow '{filename}' not found",
        )

    if not file_path.is_file():
        raise HTTPException(
            status_code=400,
            detail=f"'{filename}' is not a file",
        )

    try:
        file_path.unlink()
        logger.info(f"Deleted workflow: {file_path}")
        return {
            "success": True,
            "filename": filename,
        }
    except Exception as e:
        logger.error(f"Failed to delete workflow {filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete workflow: {e}",
        ) from e
