"""
Workflow management API endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel, Field, validator

from backend.python.use_cases.workflow_use_cases import WorkflowUseCases
from backend.python.repositories.workflow_repository import WorkflowRepository
from backend.python.executors.task_executor import TaskExecutor
from backend.python.workflow.scheduler import WorkflowScheduler
from backend.python.core.logging_config import get_logger
from backend.python.core.exceptions import WorkflowError, ValidationError

router = APIRouter()
logger = get_logger(__name__)


# Pydantic models for request/response
class TaskConfig(BaseModel):
    """Task configuration model."""
    type: str = Field(..., description="Task type: 'classical' or 'quantum'")
    config: dict = Field(..., description="Task configuration dictionary")
    dependencies: List[int] = Field(default_factory=list, description="List of task IDs this task depends on")
    
    @validator('type')
    def validate_task_type(cls, v):
        """Validate task type."""
        if v not in ['classical', 'quantum']:
            raise ValueError("Task type must be 'classical' or 'quantum'")
        return v


class CreateWorkflowRequest(BaseModel):
    """Request model for creating a workflow."""
    name: str = Field(..., min_length=1, max_length=200, description="Workflow name")
    tasks: List[TaskConfig] = Field(..., min_items=1, description="List of tasks")
    
    @validator('name')
    def validate_name(cls, v):
        """Validate workflow name."""
        if not v or not v.strip():
            raise ValueError("Workflow name cannot be empty")
        return v.strip()


class WorkflowResponse(BaseModel):
    """Response model for workflow operations."""
    workflow_id: int
    name: str
    status: str
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    task_count: int


class WorkflowDetailResponse(BaseModel):
    """Detailed workflow response."""
    workflow_id: int
    name: str
    status: str
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    tasks: List[dict]


class ExecuteWorkflowResponse(BaseModel):
    """Response model for workflow execution."""
    workflow_id: int
    name: str
    status: str
    results: dict


# Dependency injection
def get_workflow_use_cases() -> WorkflowUseCases:
    """Get workflow use cases instance."""
    repository = WorkflowRepository()
    executor = TaskExecutor()
    scheduler = WorkflowScheduler() if True else None  # TODO: Add config check
    return WorkflowUseCases(repository, executor, scheduler)


@router.post("", response_model=WorkflowResponse, status_code=201)
async def create_workflow(
    request: CreateWorkflowRequest,
    use_cases: WorkflowUseCases = Depends(get_workflow_use_cases)
):
    """
    Create a new workflow.
    
    Args:
        request: Workflow creation request
        use_cases: Workflow use cases instance
        
    Returns:
        Created workflow information
    """
    try:
        # Convert Pydantic models to dictionaries
        tasks = [task.dict() for task in request.tasks]
        
        workflow_id = use_cases.create_workflow(request.name, tasks)
        
        # Get workflow details
        workflow_status = use_cases.get_workflow_status(workflow_id)
        if not workflow_status:
            raise HTTPException(status_code=404, detail="Workflow not found after creation")
        
        return WorkflowResponse(
            workflow_id=workflow_status["workflow_id"],
            name=workflow_status["name"],
            status=workflow_status["status"],
            created_at=workflow_status.get("created_at"),
            started_at=workflow_status.get("started_at"),
            completed_at=workflow_status.get("completed_at"),
            task_count=workflow_status["task_count"]
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except WorkflowError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("", response_model=List[WorkflowResponse])
async def list_workflows(
    limit: int = 100,
    offset: int = 0,
    use_cases: WorkflowUseCases = Depends(get_workflow_use_cases)
):
    """
    List workflows with pagination.
    
    Args:
        limit: Maximum number of workflows to return
        offset: Number of workflows to skip
        use_cases: Workflow use cases instance
        
    Returns:
        List of workflows
    """
    try:
        workflows = use_cases.list_workflows(limit=limit, offset=offset)
        return [
            WorkflowResponse(
                workflow_id=w["workflow_id"],
                name=w["name"],
                status=w["status"],
                created_at=w.get("created_at"),
                started_at=None,
                completed_at=None,
                task_count=w["task_count"]
            )
            for w in workflows
        ]
    except Exception as e:
        logger.error(f"Error listing workflows: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{workflow_id}", response_model=WorkflowDetailResponse)
async def get_workflow(
    workflow_id: int,
    use_cases: WorkflowUseCases = Depends(get_workflow_use_cases)
):
    """
    Get workflow details by ID.
    
    Args:
        workflow_id: Workflow ID
        use_cases: Workflow use cases instance
        
    Returns:
        Workflow details
    """
    try:
        workflow_status = use_cases.get_workflow_status(workflow_id)
        if not workflow_status:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
        
        return WorkflowDetailResponse(
            workflow_id=workflow_status["workflow_id"],
            name=workflow_status["name"],
            status=workflow_status["status"],
            created_at=workflow_status.get("created_at"),
            started_at=workflow_status.get("started_at"),
            completed_at=workflow_status.get("completed_at"),
            tasks=workflow_status.get("tasks", [])
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workflow {workflow_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{workflow_id}/execute", response_model=ExecuteWorkflowResponse)
async def execute_workflow(
    workflow_id: int,
    use_cases: WorkflowUseCases = Depends(get_workflow_use_cases)
):
    """
    Execute a workflow.
    
    Args:
        workflow_id: Workflow ID to execute
        use_cases: Workflow use cases instance
        
    Returns:
        Workflow execution results
    """
    try:
        result = use_cases.execute_workflow(workflow_id)
        
        return ExecuteWorkflowResponse(
            workflow_id=result["workflow_id"],
            name=result["name"],
            status=result["status"],
            results=result["results"]
        )
    except WorkflowError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error executing workflow {workflow_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

