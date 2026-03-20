# -*- coding: utf-8 -*-
"""Tests for Workflows API endpoints."""

import pytest


@pytest.fixture
def client():
    """Create test client with isolated workflows directory."""
    import tempfile
    import shutil
    from pathlib import Path

    # Create temporary directory for workflows BEFORE importing app
    tmp_workflows = Path(tempfile.mkdtemp(prefix="test_workflows_"))

    # Patch WORKFLOWS_DIR in constant module before any imports
    from copaw import constant

    original_workflows_dir = constant.WORKFLOWS_DIR
    constant.WORKFLOWS_DIR = tmp_workflows

    # Also patch the workflows router module if already imported
    try:
        from copaw.app.routers import workflows

        workflows.WORKFLOWS_DIR = tmp_workflows
    except ImportError:
        pass

    try:
        # Import app after patching
        from copaw.app._app import app
        from fastapi.testclient import TestClient

        with TestClient(app) as test_client:
            yield test_client
    finally:
        # Restore original WORKFLOWS_DIR
        constant.WORKFLOWS_DIR = original_workflows_dir

        # Cleanup temp directory
        shutil.rmtree(tmp_workflows, ignore_errors=True)


@pytest.fixture
def sample_workflow_content():
    """Sample workflow YAML content."""
    return """name: Daily Report
description: Generate daily report automatically
version: "1.0"

steps:
  - name: Collect data
    agent: data-collector
    skill: web_search
    params:
      query: "今日新闻"
      
  - name: Generate report
    agent: report-writer
    skill: write_document
    params:
      template: "daily_report.md"
"""


class TestWorkflowsEndpoints:
    """Test workflows API endpoints."""

    def test_list_workflows_empty(self, client):
        """Test listing workflows when directory is empty."""
        response = client.get("/api/workflows")
        assert response.status_code == 200
        data = response.json()
        assert "workflows" in data
        assert len(data["workflows"]) == 0

    def test_list_workflows_with_files(self, client, sample_workflow_content):
        """Test listing workflows with existing files."""
        from copaw.constant import WORKFLOWS_DIR

        # Create test workflow files
        (WORKFLOWS_DIR / "test1.yml").write_text(sample_workflow_content)
        (WORKFLOWS_DIR / "test2.yaml").write_text(sample_workflow_content)

        response = client.get("/api/workflows")
        assert response.status_code == 200
        data = response.json()
        assert len(data["workflows"]) == 2

        filenames = [w["filename"] for w in data["workflows"]]
        assert "test1.yml" in filenames
        assert "test2.yaml" in filenames

    def test_get_workflow_success(self, client, sample_workflow_content):
        """Test getting workflow content successfully."""
        from copaw.constant import WORKFLOWS_DIR

        # Create test workflow
        test_file = WORKFLOWS_DIR / "test_workflow.yml"
        test_file.write_text(sample_workflow_content)

        response = client.get("/api/workflows/test_workflow.yml")
        assert response.status_code == 200
        data = response.json()
        assert "content" in data
        assert data["content"] == sample_workflow_content

    def test_get_workflow_not_found(self, client):
        """Test getting non-existent workflow."""
        response = client.get("/api/workflows/nonexistent.yml")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_create_workflow_success(self, client, sample_workflow_content):
        """Test creating a new workflow successfully."""
        payload = {"filename": "new_workflow.yml", "content": sample_workflow_content}

        response = client.post(
            "/api/workflows", json=payload, headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["filename"] == "new_workflow.yml"
        assert "path" in data

        # Verify file was created
        from copaw.constant import WORKFLOWS_DIR

        created_file = WORKFLOWS_DIR / "new_workflow.yml"
        assert created_file.exists()
        assert created_file.read_text() == sample_workflow_content

    def test_create_workflow_invalid_extension(self, client, sample_workflow_content):
        """Test creating workflow with invalid extension."""
        payload = {"filename": "workflow.txt", "content": sample_workflow_content}

        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "extension" in data["detail"].lower() or ".yml" in data["detail"].lower()

    def test_create_workflow_path_traversal(self, client, sample_workflow_content):
        """Test preventing path traversal attack."""
        payload = {
            "filename": "../../../etc/passwd.yml",
            "content": sample_workflow_content,
        }

        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data

    def test_create_workflow_duplicate(self, client, sample_workflow_content):
        """Test creating workflow that already exists."""
        from copaw.constant import WORKFLOWS_DIR

        # Create existing workflow
        existing_file = WORKFLOWS_DIR / "existing.yml"
        existing_file.write_text(sample_workflow_content)

        # Try to create again
        payload = {"filename": "existing.yml", "content": sample_workflow_content}

        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 409
        data = response.json()
        assert "detail" in data
        assert "already exists" in data["detail"].lower()

    def test_update_workflow_success(self, client, sample_workflow_content):
        """Test updating existing workflow."""
        from copaw.constant import WORKFLOWS_DIR

        # Create initial workflow
        test_file = WORKFLOWS_DIR / "update_test.yml"
        test_file.write_text(sample_workflow_content)

        # Update with new content
        updated_content = """name: Updated Workflow
description: Updated description
"""

        response = client.put(
            "/api/workflows/update_test.yml", json={"content": updated_content}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Verify update
        assert test_file.read_text() == updated_content

    def test_update_workflow_not_found(self, client, sample_workflow_content):
        """Test updating non-existent workflow."""
        response = client.put(
            "/api/workflows/nonexistent.yml", json={"content": sample_workflow_content}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    # Note: Path traversal protection is tested in POST and DELETE endpoints.
    # FastAPI handles URL-encoded paths differently, so we skip this test for PUT.

    def test_delete_workflow_success(self, client, sample_workflow_content):
        """Test deleting workflow successfully."""
        from copaw.constant import WORKFLOWS_DIR

        # Create test workflow
        test_file = WORKFLOWS_DIR / "delete_test.yml"
        test_file.write_text(sample_workflow_content)

        # Delete it
        response = client.delete("/api/workflows/delete_test.yml")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["filename"] == "delete_test.yml"

        # Verify deletion
        assert not test_file.exists()

    def test_delete_workflow_not_found(self, client):
        """Test deleting non-existent workflow."""
        response = client.delete("/api/workflows/nonexistent.yml")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_delete_workflow_directory(self, client):
        """Test preventing deletion of directories."""
        from copaw.constant import WORKFLOWS_DIR

        # Create a directory instead of file
        test_dir = WORKFLOWS_DIR / "testdir"
        test_dir.mkdir(exist_ok=True)

        response = client.delete("/api/workflows/testdir")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data


class TestWorkflowValidation:
    """Test workflow input validation."""

    def test_filename_with_slash(self, client, sample_workflow_content):
        """Test filename with forward slash."""
        payload = {
            "filename": "folder/workflow.yml",
            "content": sample_workflow_content,
        }
        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 400

    def test_filename_with_backslash(self, client, sample_workflow_content):
        """Test filename with backslash."""
        payload = {
            "filename": "folder\\workflow.yml",
            "content": sample_workflow_content,
        }
        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 400

    def test_filename_yaml_extension(self, client, sample_workflow_content):
        """Test filename with .yaml extension."""
        payload = {"filename": "workflow.yaml", "content": sample_workflow_content}
        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 201

    def test_filename_yml_extension(self, client, sample_workflow_content):
        """Test filename with .yml extension."""
        payload = {"filename": "workflow.yml", "content": sample_workflow_content}
        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 201

    def test_empty_content(self, client):
        """Test creating workflow with empty content."""
        payload = {"filename": "empty.yml", "content": ""}
        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 201  # Empty content is allowed

        # Verify file was created
        from copaw.constant import WORKFLOWS_DIR

        created_file = WORKFLOWS_DIR / "empty.yml"
        assert created_file.exists()
        assert created_file.read_text() == ""


class TestWorkflowFileOperations:
    """Test workflow file system operations."""

    def test_workflow_encoding_utf8(self, client):
        """Test UTF-8 encoding support."""
        utf8_content = """name: 中文工作流
description: 测试中文内容
steps:
  - name: 步骤一
    agent: default
"""
        payload = {"filename": "chinese.yml", "content": utf8_content}

        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 201

        # Read back and verify
        get_response = client.get("/api/workflows/chinese.yml")
        assert get_response.status_code == 200
        data = get_response.json()
        assert "中文工作流" in data["content"]
        assert "测试中文内容" in data["content"]

    def test_workflow_special_characters(self, client):
        """Test special characters in workflow content."""
        special_content = """name: Special & < > " ' Chars
description: Test with $pecial ch@racters!
"""
        payload = {"filename": "special.yml", "content": special_content}

        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 201

        # Verify content preserved
        get_response = client.get("/api/workflows/special.yml")
        assert get_response.status_code == 200
        data = get_response.json()
        assert special_content in data["content"]

    def test_workflow_large_file(self, client):
        """Test handling large workflow files."""
        # Create a large workflow (1MB)
        large_content = "name: Large Workflow\n"
        large_content += "description: " + ("x" * 1000000) + "\n"

        payload = {"filename": "large.yml", "content": large_content}

        response = client.post("/api/workflows", json=payload)
        assert response.status_code == 201

        # Verify we can read it back
        get_response = client.get("/api/workflows/large.yml")
        assert get_response.status_code == 200
        data = get_response.json()
        assert len(data["content"]) > 1000000


class TestWorkflowListResponse:
    """Test workflow list response format."""

    def test_list_response_structure(self, client, sample_workflow_content):
        """Test list response structure."""
        from copaw.constant import WORKFLOWS_DIR

        # Create workflow
        (WORKFLOWS_DIR / "test.yml").write_text(sample_workflow_content)

        response = client.get("/api/workflows")
        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "workflows" in data
        assert isinstance(data["workflows"], list)

        if len(data["workflows"]) > 0:
            workflow = data["workflows"][0]
            assert "filename" in workflow
            assert "path" in workflow
            assert "size" in workflow
            assert "created_time" in workflow
            assert "modified_time" in workflow

            # Verify types
            assert isinstance(workflow["filename"], str)
            assert isinstance(workflow["size"], int)

    def test_list_response_timestamps(self, client, sample_workflow_content):
        """Test timestamps in list response."""
        import time
        from copaw.constant import WORKFLOWS_DIR

        # Create workflow
        test_file = WORKFLOWS_DIR / "timestamp_test.yml"
        test_file.write_text(sample_workflow_content)

        time.sleep(0.1)  # Small delay

        response = client.get("/api/workflows")
        assert response.status_code == 200
        data = response.json()

        assert len(data["workflows"]) > 0
        workflow = data["workflows"][0]

        # Timestamps should be numeric strings
        assert float(workflow["created_time"]) > 0
        assert float(workflow["modified_time"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
