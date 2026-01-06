"""
Performance metrics API endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from backend.python.monitor.performance import PerformanceMonitor
from backend.python.core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


class MetricsResponse(BaseModel):
    """Response model for performance metrics."""
    workflow_id: int
    task_id: int
    runtime: float
    circuit_depth: Optional[int] = None
    shots: Optional[int] = None
    memory_usage: Optional[int] = None
    cpu_usage: Optional[float] = None
    timestamp: str


@router.get("/{workflow_id}", response_model=List[MetricsResponse])
async def get_workflow_metrics(workflow_id: int):
    """
    Get performance metrics for a workflow.
    
    Args:
        workflow_id: Workflow ID
        
    Returns:
        List of performance metrics
    """
    try:
        monitor = PerformanceMonitor()
        try:
            metrics = monitor.get_metrics(workflow_id)
            if metrics is None:
                raise HTTPException(status_code=404, detail=f"No metrics found for workflow {workflow_id}")
            
            return [
                MetricsResponse(
                    workflow_id=m["workflow_id"],
                    task_id=m["task_id"],
                    runtime=m["runtime"],
                    circuit_depth=m.get("circuit_depth"),
                    shots=m.get("shots"),
                    memory_usage=m.get("memory_usage"),
                    cpu_usage=m.get("cpu_usage"),
                    timestamp=m.get("timestamp", "")
                )
                for m in metrics
            ]
        finally:
            monitor.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metrics for workflow {workflow_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{workflow_id}/{task_id}", response_model=MetricsResponse)
async def get_task_metrics(workflow_id: int, task_id: int):
    """
    Get performance metrics for a specific task.
    
    Args:
        workflow_id: Workflow ID
        task_id: Task ID
        
    Returns:
        Performance metrics for the task
    """
    try:
        monitor = PerformanceMonitor()
        try:
            metrics = monitor.get_metrics(workflow_id, task_id)
            if metrics is None or not metrics:
                raise HTTPException(
                    status_code=404,
                    detail=f"No metrics found for workflow {workflow_id}, task {task_id}"
                )
            
            m = metrics[0]
            return MetricsResponse(
                workflow_id=m["workflow_id"],
                task_id=m["task_id"],
                runtime=m["runtime"],
                circuit_depth=m.get("circuit_depth"),
                shots=m.get("shots"),
                memory_usage=m.get("memory_usage"),
                cpu_usage=m.get("cpu_usage"),
                timestamp=m.get("timestamp", "")
            )
        finally:
            monitor.close()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting metrics for task {task_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")

