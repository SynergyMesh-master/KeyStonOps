"""
Domain entities for QuantumFlow Toolkit.
These represent the core business objects.
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class TaskType(str, Enum):
    """Enumeration of task types."""
    CLASSICAL = "classical"
    QUANTUM = "quantum"


class WorkflowStatus(str, Enum):
    """Enumeration of workflow statuses."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskStatus(str, Enum):
    """Enumeration of task statuses."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Task:
    """
    Represents a single task in a workflow.
    
    Attributes:
        id: Unique identifier for the task
        type: Type of task (classical or quantum)
        config: Configuration dictionary for the task
        dependencies: List of task IDs this task depends on
        status: Current status of the task
        result: Result of task execution (if completed)
        error: Error message (if failed)
        created_at: Timestamp when task was created
        started_at: Timestamp when task execution started
        completed_at: Timestamp when task execution completed
    """
    id: int
    type: TaskType
    config: Dict[str, Any]
    dependencies: List[int] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[Any] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    def __post_init__(self):
        """Validate task after initialization."""
        if not isinstance(self.config, dict):
            raise ValueError("Task config must be a dictionary")
        if self.type not in TaskType:
            raise ValueError(f"Invalid task type: {self.type}")


@dataclass
class Workflow:
    """
    Represents a workflow containing multiple tasks.
    
    Attributes:
        id: Unique identifier for the workflow
        name: Human-readable name for the workflow
        tasks: List of tasks in the workflow
        status: Current status of the workflow
        created_at: Timestamp when workflow was created
        started_at: Timestamp when workflow execution started
        completed_at: Timestamp when workflow execution completed
        metadata: Additional metadata dictionary
    """
    id: Optional[int]
    name: str
    tasks: List[Task]
    status: WorkflowStatus = WorkflowStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate workflow after initialization."""
        if not self.name or not self.name.strip():
            raise ValueError("Workflow name cannot be empty")
        if not self.tasks:
            raise ValueError("Workflow must contain at least one task")
    
    def get_task_by_id(self, task_id: int) -> Optional[Task]:
        """
        Get a task by its ID.
        
        Args:
            task_id: The ID of the task to retrieve
            
        Returns:
            The task if found, None otherwise
        """
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None


@dataclass
class PerformanceMetrics:
    """
    Represents performance metrics for a task execution.
    
    Attributes:
        workflow_id: ID of the workflow
        task_id: ID of the task
        runtime: Execution time in seconds
        circuit_depth: Circuit depth (for quantum tasks)
        shots: Number of shots (for quantum tasks)
        memory_usage: Memory usage in bytes
        cpu_usage: CPU usage percentage
        timestamp: When the metrics were recorded
    """
    workflow_id: int
    task_id: int
    runtime: float
    circuit_depth: Optional[int] = None
    shots: Optional[int] = None
    memory_usage: Optional[int] = None
    cpu_usage: Optional[float] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def __post_init__(self):
        """Validate metrics after initialization."""
        if self.runtime < 0:
            raise ValueError("Runtime cannot be negative")
        if self.circuit_depth is not None and self.circuit_depth < 0:
            raise ValueError("Circuit depth cannot be negative")
        if self.shots is not None and self.shots < 0:
            raise ValueError("Shots cannot be negative")


@dataclass
class CostEstimate:
    """
    Represents a cost estimate for a task or workflow.
    
    Attributes:
        task_id: ID of the task (or None for workflow-level)
        backend: Quantum backend used
        backend_type: Type of backend (simulator or cloud)
        cost: Estimated cost in USD
        breakdown: Detailed cost breakdown
    """
    task_id: Optional[int]
    backend: str
    backend_type: str
    cost: float
    breakdown: Dict[str, float] = field(default_factory=dict)
    
    def __post_init__(self):
        """Validate cost estimate after initialization."""
        if self.cost < 0:
            raise ValueError("Cost cannot be negative")

