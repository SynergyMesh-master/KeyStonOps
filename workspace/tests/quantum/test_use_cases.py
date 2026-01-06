"""
Tests for use cases layer.
"""
import pytest
import tempfile
import shutil
from pathlib import Path

from backend.python.use_cases.workflow_use_cases import WorkflowUseCases
from backend.python.repositories.workflow_repository import WorkflowRepository
from backend.python.executors.task_executor import TaskExecutor
from backend.python.workflow.scheduler import WorkflowScheduler
from backend.python.core.exceptions import ValidationError, WorkflowError


@pytest.fixture
def test_db():
    """Create a temporary database for testing."""
    db_dir = tempfile.mkdtemp()
    db_path = Path(db_dir) / "test.db"
    yield str(db_path)
    shutil.rmtree(db_dir)


@pytest.fixture
def use_cases(test_db):
    """Create workflow use cases instance."""
    repository = WorkflowRepository(db_path=test_db)
    executor = TaskExecutor()
    scheduler = WorkflowScheduler()
    return WorkflowUseCases(repository, executor, scheduler)


class TestWorkflowUseCases:
    """Test workflow use cases."""
    
    def test_create_workflow(self, use_cases):
        """Test creating a workflow."""
        tasks = [
            {
                "type": "classical",
                "config": {"operation": "preprocess", "data": [1.0, 2.0]}
            }
        ]
        
        workflow_id = use_cases.create_workflow("Test Workflow", tasks)
        assert workflow_id > 0
    
    def test_create_workflow_invalid_name(self, use_cases):
        """Test creating workflow with invalid name."""
        tasks = [
            {
                "type": "classical",
                "config": {"operation": "preprocess", "data": [1.0]}
            }
        ]
        
        with pytest.raises(ValidationError):
            use_cases.create_workflow("", tasks)
    
    def test_create_workflow_empty_tasks(self, use_cases):
        """Test creating workflow with no tasks."""
        with pytest.raises(ValidationError):
            use_cases.create_workflow("Test", [])
    
    def test_execute_workflow(self, use_cases):
        """Test executing a workflow."""
        tasks = [
            {
                "type": "classical",
                "config": {
                    "operation": "preprocess",
                    "data": [1.0, 2.0, 3.0]
                }
            }
        ]
        
        workflow_id = use_cases.create_workflow("Test Workflow", tasks)
        result = use_cases.execute_workflow(workflow_id)
        
        assert result is not None
        assert result["status"] == "completed"
        assert "results" in result
    
    def test_get_workflow_status(self, use_cases):
        """Test getting workflow status."""
        tasks = [
            {
                "type": "classical",
                "config": {"operation": "preprocess", "data": [1.0]}
            }
        ]
        
        workflow_id = use_cases.create_workflow("Test Workflow", tasks)
        status = use_cases.get_workflow_status(workflow_id)
        
        assert status is not None
        assert status["workflow_id"] == workflow_id
        assert status["status"] == "pending"
    
    def test_get_nonexistent_workflow_status(self, use_cases):
        """Test getting status of non-existent workflow."""
        status = use_cases.get_workflow_status(99999)
        assert status is None
    
    def test_list_workflows(self, use_cases):
        """Test listing workflows."""
        # Create multiple workflows
        for i in range(3):
            tasks = [
                {
                    "type": "classical",
                    "config": {"operation": "preprocess", "data": [1.0]}
                }
            ]
            use_cases.create_workflow(f"Workflow {i}", tasks)
        
        workflows = use_cases.list_workflows(limit=10)
        assert len(workflows) == 3
    
    def test_execute_nonexistent_workflow(self, use_cases):
        """Test executing non-existent workflow."""
        with pytest.raises(WorkflowError):
            use_cases.execute_workflow(99999)

