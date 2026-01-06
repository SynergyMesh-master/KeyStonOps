"""
Use cases for workflow management.
Implements application-specific business logic.
"""
from typing import List, Optional
from datetime import datetime

from backend.python.core.entities import Workflow, Task, TaskType, WorkflowStatus, TaskStatus
from backend.python.core.exceptions import WorkflowError, ValidationError, TaskExecutionError
from backend.python.core.logging_config import get_logger

logger = get_logger(__name__)


class WorkflowUseCases:
    """Use cases for workflow operations."""
    
    def __init__(self, workflow_repository, task_executor, scheduler):
        """
        Initialize workflow use cases.
        
        Args:
            workflow_repository: Repository for workflow persistence
            task_executor: Executor for task execution
            scheduler: Scheduler for task prioritization
        """
        self.workflow_repository = workflow_repository
        self.task_executor = task_executor
        self.scheduler = scheduler
    
    def create_workflow(self, name: str, tasks: List[dict]) -> int:
        """
        Create a new workflow.
        
        Args:
            name: Workflow name
            tasks: List of task dictionaries
            
        Returns:
            Workflow ID
            
        Raises:
            ValidationError: If workflow data is invalid
            WorkflowError: If workflow creation fails
        """
        try:
            # Validate input
            if not name or not name.strip():
                raise ValidationError("Workflow name cannot be empty")
            
            if not tasks:
                raise ValidationError("Workflow must contain at least one task")
            
            # Convert task dictionaries to Task entities
            task_entities = []
            for i, task_dict in enumerate(tasks):
                try:
                    task_type = TaskType(task_dict.get("type"))
                    config = task_dict.get("config", {})
                    dependencies = task_dict.get("dependencies", [])
                    
                    task = Task(
                        id=i,
                        type=task_type,
                        config=config,
                        dependencies=dependencies
                    )
                    task_entities.append(task)
                except (ValueError, KeyError) as e:
                    raise ValidationError(f"Invalid task at index {i}: {str(e)}")
            
            # Create workflow entity
            workflow = Workflow(
                id=None,
                name=name.strip(),
                tasks=task_entities,
                status=WorkflowStatus.PENDING
            )
            
            # Save to repository
            workflow_id = self.workflow_repository.save(workflow)
            logger.info(f"Created workflow '{name}' with ID {workflow_id}")
            
            return workflow_id
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error creating workflow: {str(e)}", exc_info=True)
            raise WorkflowError(f"Failed to create workflow: {str(e)}")
    
    def execute_workflow(self, workflow_id: int) -> dict:
        """
        Execute a workflow.
        
        Args:
            workflow_id: ID of the workflow to execute
            
        Returns:
            Dictionary with execution results
            
        Raises:
            WorkflowError: If workflow execution fails
        """
        try:
            # Load workflow
            workflow = self.workflow_repository.get_by_id(workflow_id)
            if not workflow:
                raise WorkflowError(f"Workflow {workflow_id} not found")
            
            # Update status
            workflow.status = WorkflowStatus.RUNNING
            workflow.started_at = datetime.utcnow()
            self.workflow_repository.update(workflow)
            
            # Schedule tasks if scheduler is available
            if self.scheduler:
                try:
                    prioritized_tasks = self.scheduler.schedule_tasks(
                        workflow.tasks,
                        max_latency=600.0,
                        max_budget=100.0
                    )
                    # Reorder tasks based on scheduler output
                    task_map = {task.id: task for task in workflow.tasks}
                    workflow.tasks = [task_map[t.id] for t in prioritized_tasks]
                except Exception as e:
                    logger.warning(f"Scheduler failed, using default order: {str(e)}")
            
            # Execute tasks in order
            results = {}
            for task in workflow.tasks:
                try:
                    # Check dependencies
                    if task.dependencies:
                        for dep_id in task.dependencies:
                            if dep_id not in results:
                                raise TaskExecutionError(
                                    f"Task {task.id} depends on task {dep_id} which has not completed"
                                )
                    
                    # Execute task
                    task.status = TaskStatus.RUNNING
                    task.started_at = datetime.utcnow()
                    self.workflow_repository.update(workflow)
                    
                    result = self.task_executor.execute(task)
                    
                    task.status = TaskStatus.COMPLETED
                    task.result = result
                    task.completed_at = datetime.utcnow()
                    results[task.id] = result
                    
                    logger.info(f"Task {task.id} completed successfully")
                    
                except Exception as e:
                    task.status = TaskStatus.FAILED
                    task.error = str(e)
                    task.completed_at = datetime.utcnow()
                    logger.error(f"Task {task.id} failed: {str(e)}", exc_info=True)
                    raise TaskExecutionError(f"Task {task.id} failed: {str(e)}")
            
            # Update workflow status
            workflow.status = WorkflowStatus.COMPLETED
            workflow.completed_at = datetime.utcnow()
            self.workflow_repository.update(workflow)
            
            return {
                "workflow_id": workflow_id,
                "name": workflow.name,
                "status": workflow.status.value,
                "results": results
            }
            
        except (WorkflowError, TaskExecutionError):
            # Update workflow status to failed
            if 'workflow' in locals():
                workflow.status = WorkflowStatus.FAILED
                self.workflow_repository.update(workflow)
            raise
        except Exception as e:
            logger.error(f"Error executing workflow {workflow_id}: {str(e)}", exc_info=True)
            raise WorkflowError(f"Failed to execute workflow: {str(e)}")
    
    def get_workflow_status(self, workflow_id: int) -> Optional[dict]:
        """
        Get workflow status.
        
        Args:
            workflow_id: ID of the workflow
            
        Returns:
            Dictionary with workflow status, or None if not found
        """
        try:
            workflow = self.workflow_repository.get_by_id(workflow_id)
            if not workflow:
                return None
            
            return {
                "workflow_id": workflow.id,
                "name": workflow.name,
                "status": workflow.status.value,
                "created_at": workflow.created_at.isoformat() if workflow.created_at else None,
                "started_at": workflow.started_at.isoformat() if workflow.started_at else None,
                "completed_at": workflow.completed_at.isoformat() if workflow.completed_at else None,
                "task_count": len(workflow.tasks),
                "tasks": [
                    {
                        "id": task.id,
                        "type": task.type.value,
                        "status": task.status.value,
                        "error": task.error
                    }
                    for task in workflow.tasks
                ]
            }
        except Exception as e:
            logger.error(f"Error getting workflow status: {str(e)}", exc_info=True)
            return None
    
    def list_workflows(self, limit: int = 100, offset: int = 0) -> List[dict]:
        """
        List workflows.
        
        Args:
            limit: Maximum number of workflows to return
            offset: Number of workflows to skip
            
        Returns:
            List of workflow dictionaries
        """
        try:
            workflows = self.workflow_repository.list(limit=limit, offset=offset)
            return [
                {
                    "workflow_id": w.id,
                    "name": w.name,
                    "status": w.status.value,
                    "created_at": w.created_at.isoformat() if w.created_at else None,
                    "task_count": len(w.tasks)
                }
                for w in workflows
            ]
        except Exception as e:
            logger.error(f"Error listing workflows: {str(e)}", exc_info=True)
            return []

