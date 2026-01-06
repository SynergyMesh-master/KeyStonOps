"""
Tests for repository layer.
"""
import pytest
import tempfile
import shutil
from pathlib import Path

from backend.python.repositories.workflow_repository import WorkflowRepository
from backend.python.core.entities import Workflow, Task, TaskType, WorkflowStatus, TaskStatus


@pytest.fixture
def test_db():
    """Create a temporary database for testing."""
    db_dir = tempfile.mkdtemp()
    db_path = Path(db_dir) / "test.db"
    yield str(db_path)
    shutil.rmtree(db_dir)


@pytest.fixture
def repository(test_db):
    """Create a repository instance."""
    return WorkflowRepository(db_path=test_db)


class TestWorkflowRepository:
    """Test workflow repository operations."""
    
    def test_save_workflow(self, repository):
        """Test saving a workflow."""
        tasks = [
            Task(
                id=0,
                type=TaskType.CLASSICAL,
                config={"operation": "preprocess", "data": [1.0, 2.0]}
            )
        ]
        workflow = Workflow(
            id=None,
            name="Test Workflow",
            tasks=tasks
        )
        
        workflow_id = repository.save(workflow)
        assert workflow_id > 0
    
    def test_get_workflow_by_id(self, repository):
        """Test retrieving a workflow by ID."""
        tasks = [
            Task(
                id=0,
                type=TaskType.CLASSICAL,
                config={"operation": "preprocess", "data": [1.0]}
            )
        ]
        workflow = Workflow(
            id=None,
            name="Test Workflow",
            tasks=tasks
        )
        
        workflow_id = repository.save(workflow)
        retrieved = repository.get_by_id(workflow_id)
        
        assert retrieved is not None
        assert retrieved.id == workflow_id
        assert retrieved.name == "Test Workflow"
        assert len(retrieved.tasks) == 1
    
    def test_list_workflows(self, repository):
        """Test listing workflows."""
        # Create multiple workflows
        for i in range(5):
            tasks = [
                Task(
                    id=0,
                    type=TaskType.CLASSICAL,
                    config={"operation": "preprocess", "data": [1.0]}
                )
            ]
            workflow = Workflow(
                id=None,
                name=f"Workflow {i}",
                tasks=tasks
            )
            repository.save(workflow)
        
        workflows = repository.list(limit=10)
        assert len(workflows) == 5
    
    def test_update_workflow(self, repository):
        """Test updating a workflow."""
        tasks = [
            Task(
                id=0,
                type=TaskType.CLASSICAL,
                config={"operation": "preprocess", "data": [1.0]}
            )
        ]
        workflow = Workflow(
            id=None,
            name="Test Workflow",
            tasks=tasks
        )
        
        workflow_id = repository.save(workflow)
        workflow.id = workflow_id
        workflow.status = WorkflowStatus.COMPLETED
        
        repository.update(workflow)
        
        updated = repository.get_by_id(workflow_id)
        assert updated.status == WorkflowStatus.COMPLETED
    
    def test_get_nonexistent_workflow(self, repository):
        """Test retrieving non-existent workflow."""
        workflow = repository.get_by_id(99999)
        assert workflow is None

