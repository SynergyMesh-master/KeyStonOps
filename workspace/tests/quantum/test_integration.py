"""
Integration tests for QuantumFlow Toolkit.
Tests the full workflow from API to execution.
"""
import pytest
import httpx
import json
from pathlib import Path
import tempfile
import shutil

from backend.python.api.main import app
from backend.python.repositories.workflow_repository import WorkflowRepository
from backend.python.use_cases.workflow_use_cases import WorkflowUseCases
from backend.python.executors.task_executor import TaskExecutor
from backend.python.workflow.scheduler import WorkflowScheduler


@pytest.fixture
def test_db():
    """Create a temporary database for testing."""
    db_dir = tempfile.mkdtemp()
    db_path = Path(db_dir) / "test.db"
    yield str(db_path)
    shutil.rmtree(db_dir)


@pytest.fixture
def client():
    """Create a test client."""
    return httpx.AsyncClient(app=app, base_url="http://test")


@pytest.fixture
def workflow_use_cases(test_db):
    """Create workflow use cases instance."""
    repository = WorkflowRepository(db_path=test_db)
    executor = TaskExecutor()
    scheduler = WorkflowScheduler()
    return WorkflowUseCases(repository, executor, scheduler)


class TestHealthEndpoints:
    """Test health check endpoints."""
    
    @pytest.mark.asyncio
    async def test_health_check(self, client):
        """Test basic health check."""
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert "version" in data
    
    @pytest.mark.asyncio
    async def test_readiness_check(self, client):
        """Test readiness check."""
        response = await client.get("/api/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert "checks" in data
    
    @pytest.mark.asyncio
    async def test_liveness_check(self, client):
        """Test liveness check."""
        response = await client.get("/api/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"


class TestWorkflowAPI:
    """Test workflow API endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_workflow(self, client):
        """Test creating a workflow via API."""
        workflow_data = {
            "name": "Test Workflow",
            "tasks": [
                {
                    "type": "classical",
                    "config": {
                        "operation": "preprocess",
                        "data": [1.0, 2.0, 3.0]
                    },
                    "dependencies": []
                }
            ]
        }
        response = await client.post("/api/workflows", json=workflow_data)
        assert response.status_code == 201
        data = response.json()
        assert "workflow_id" in data
        assert data["name"] == "Test Workflow"
        assert data["status"] == "pending"
    
    @pytest.mark.asyncio
    async def test_list_workflows(self, client):
        """Test listing workflows."""
        # Create a workflow first
        workflow_data = {
            "name": "Test Workflow",
            "tasks": [
                {
                    "type": "classical",
                    "config": {"operation": "preprocess", "data": [1.0]}
                }
            ]
        }
        await client.post("/api/workflows", json=workflow_data)
        
        # List workflows
        response = await client.get("/api/workflows")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    @pytest.mark.asyncio
    async def test_get_workflow(self, client):
        """Test getting a workflow by ID."""
        # Create a workflow
        workflow_data = {
            "name": "Test Workflow",
            "tasks": [
                {
                    "type": "classical",
                    "config": {"operation": "preprocess", "data": [1.0]}
                }
            ]
        }
        create_response = await client.post("/api/workflows", json=workflow_data)
        workflow_id = create_response.json()["workflow_id"]
        
        # Get workflow
        response = await client.get(f"/api/workflows/{workflow_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_id"] == workflow_id
        assert data["name"] == "Test Workflow"
    
    @pytest.mark.asyncio
    async def test_execute_workflow(self, client):
        """Test executing a workflow via API."""
        # Create a workflow
        workflow_data = {
            "name": "Test Workflow",
            "tasks": [
                {
                    "type": "classical",
                    "config": {
                        "operation": "preprocess",
                        "data": [1.0, 2.0, 3.0]
                    }
                }
            ]
        }
        create_response = await client.post("/api/workflows", json=workflow_data)
        workflow_id = create_response.json()["workflow_id"]
        
        # Execute workflow
        response = await client.post(f"/api/workflows/{workflow_id}/execute")
        assert response.status_code == 200
        data = response.json()
        assert data["workflow_id"] == workflow_id
        assert data["status"] == "completed"
        assert "results" in data


class TestWorkflowIntegration:
    """Test full workflow integration."""
    
    def test_create_and_execute_workflow(self, workflow_use_cases):
        """Test creating and executing a workflow end-to-end."""
        # Create workflow
        tasks = [
            {
                "type": "classical",
                "config": {
                    "operation": "preprocess",
                    "data": [1.0, 2.0, 3.0]
                }
            },
            {
                "type": "quantum",
                "config": {
                    "circuit": "simple_x",
                    "shots": 100,
                    "backend": "cirq",
                    "backend_type": "simulator"
                }
            }
        ]
        
        workflow_id = workflow_use_cases.create_workflow("Integration Test", tasks)
        assert workflow_id > 0
        
        # Execute workflow
        result = workflow_use_cases.execute_workflow(workflow_id)
        assert result is not None
        assert result["status"] == "completed"
        assert "results" in result
        assert len(result["results"]) == 2
    
    def test_workflow_with_dependencies(self, workflow_use_cases):
        """Test workflow with task dependencies."""
        tasks = [
            {
                "type": "classical",
                "config": {
                    "operation": "preprocess",
                    "data": [1.0, 2.0, 3.0]
                },
                "dependencies": []
            },
            {
                "type": "quantum",
                "config": {
                    "circuit": "simple_x",
                    "shots": 100,
                    "backend": "cirq"
                },
                "dependencies": [0]  # Depends on first task
            }
        ]
        
        workflow_id = workflow_use_cases.create_workflow("Dependency Test", tasks)
        result = workflow_use_cases.execute_workflow(workflow_id)
        
        assert result["status"] == "completed"
        assert len(result["results"]) == 2


class TestErrorHandling:
    """Test error handling in integration."""
    
    @pytest.mark.asyncio
    async def test_invalid_workflow_creation(self, client):
        """Test creating workflow with invalid data."""
        invalid_data = {
            "name": "",  # Empty name
            "tasks": []
        }
        response = await client.post("/api/workflows", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_nonexistent_workflow(self, client):
        """Test accessing non-existent workflow."""
        response = await client.get("/api/workflows/99999")
        assert response.status_code == 404
    
    def test_invalid_task_config(self, workflow_use_cases):
        """Test workflow with invalid task configuration."""
        invalid_tasks = [
            {
                "type": "quantum",
                "config": {}  # Missing required fields
            }
        ]
        
        with pytest.raises(Exception):
            workflow_use_cases.create_workflow("Invalid Test", invalid_tasks)

