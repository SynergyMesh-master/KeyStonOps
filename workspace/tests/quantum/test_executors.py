"""
Tests for task executors.
"""
import pytest

from backend.python.executors.task_executor import TaskExecutor
from backend.python.core.entities import Task, TaskType
from backend.python.core.exceptions import TaskExecutionError


@pytest.fixture
def executor():
    """Create a task executor instance."""
    return TaskExecutor()


class TestTaskExecutor:
    """Test task executor operations."""
    
    def test_execute_classical_task(self, executor):
        """Test executing a classical task."""
        task = Task(
            id=0,
            type=TaskType.CLASSICAL,
            config={
                "operation": "preprocess",
                "data": [1.0, 2.0, 3.0]
            }
        )
        
        result = executor.execute(task)
        assert isinstance(result, float)
        assert result == 2.0  # Mean of [1.0, 2.0, 3.0]
    
    def test_execute_classical_transform(self, executor):
        """Test executing a classical transform task."""
        task = Task(
            id=0,
            type=TaskType.CLASSICAL,
            config={
                "operation": "transform",
                "transform_type": "normalize",
                "data": [1.0, 2.0, 3.0, 4.0]
            }
        )
        
        result = executor.execute(task)
        assert isinstance(result, list)
        assert len(result) == 4
        assert result[0] == 0.0  # Normalized first value
        assert result[3] == 1.0  # Normalized last value
    
    def test_execute_quantum_task_cirq(self, executor):
        """Test executing a quantum task with Cirq."""
        task = Task(
            id=0,
            type=TaskType.QUANTUM,
            config={
                "circuit": "simple_x",
                "shots": 100,
                "backend": "cirq",
                "backend_type": "simulator"
            }
        )
        
        result = executor.execute(task)
        assert isinstance(result, dict)
        assert "result" in result
        assert "backend" in result
    
    def test_execute_quantum_task_qiskit(self, executor):
        """Test executing a quantum task with Qiskit."""
        task = Task(
            id=0,
            type=TaskType.QUANTUM,
            config={
                "circuit": "simple_x",
                "shots": 100,
                "backend": "qiskit",
                "backend_type": "simulator"
            }
        )
        
        result = executor.execute(task)
        assert isinstance(result, dict)
        assert "result" in result
        assert "backend" in result
    
    def test_execute_invalid_task(self, executor):
        """Test executing an invalid task."""
        task = Task(
            id=0,
            type=TaskType.CLASSICAL,
            config={
                "operation": "invalid_operation"
            }
        )
        
        with pytest.raises(TaskExecutionError):
            executor.execute(task)
    
    def test_execute_task_with_missing_config(self, executor):
        """Test executing a task with missing configuration."""
        task = Task(
            id=0,
            type=TaskType.CLASSICAL,
            config={}
        )
        
        with pytest.raises(TaskExecutionError):
            executor.execute(task)

