"""
Command-line interface for QuantumFlow Toolkit.
"""
import click
import json
from pathlib import Path
from typing import List, Dict, Any

from backend.python.use_cases.workflow_use_cases import WorkflowUseCases
from backend.python.repositories.workflow_repository import WorkflowRepository
from backend.python.executors.task_executor import TaskExecutor
from backend.python.workflow.scheduler import WorkflowScheduler
from backend.python.core.logging_config import setup_logging, get_logger
from backend.python.config import get_settings

# Set up logging
settings = get_settings()
setup_logging(log_level=settings.log_level)
logger = get_logger(__name__)

@click.group()
def cli():
    """QuantumFlow Toolkit CLI: Manage hybrid quantum-classical workflows."""
    pass

@cli.command()
@click.option('--name', required=True, help='Name of the workflow')
@click.option('--tasks-file', type=click.Path(exists=True), required=True, help='JSON file containing tasks')
def create_workflow(name: str, tasks_file: str):
    """
    Define a new hybrid workflow and save it to the database.
    
    Args:
        name: Workflow name
        tasks_file: Path to JSON file containing task definitions
    """
    try:
        # Load tasks from JSON file
        tasks_path = Path(tasks_file)
        with tasks_path.open('r') as f:
            tasks = json.load(f)
        
        # Validate tasks
        if not isinstance(tasks, list) or not all(
            isinstance(t, dict) and 'type' in t and 'config' in t 
            for t in tasks
        ):
            raise ValueError("Tasks must be a list of dictionaries with 'type' and 'config' keys")

        # Initialize use cases
        repository = WorkflowRepository()
        executor = TaskExecutor()
        scheduler = WorkflowScheduler() if settings.rust_scheduler_enabled else None
        use_cases = WorkflowUseCases(repository, executor, scheduler)
        
        # Create workflow
        workflow_id = use_cases.create_workflow(name, tasks)
        
        click.echo(f"Workflow '{name}' created successfully with ID: {workflow_id}")
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}", exc_info=True)
        click.echo(f"Error: {str(e)}", err=True)
    finally:
        if 'repository' in locals():
            repository.close()

@cli.command()
@click.option('--id', type=int, required=True, help='Workflow ID to run')
def run_workflow(id: int):
    """
    Execute a workflow by ID.
    
    Args:
        id: Workflow ID to execute
    """
    try:
        repository = WorkflowRepository()
        executor = TaskExecutor()
        scheduler = WorkflowScheduler() if settings.rust_scheduler_enabled else None
        use_cases = WorkflowUseCases(repository, executor, scheduler)
        
        result = use_cases.execute_workflow(id)
        
        click.echo(f"Workflow {id} executed successfully:")
        click.echo(json.dumps(result, indent=2))
    except Exception as e:
        logger.error(f"Error running workflow {id}: {str(e)}", exc_info=True)
        click.echo(f"Error: {str(e)}", err=True)
    finally:
        if 'repository' in locals():
            repository.close()

@cli.command()
@click.option('--id', type=int, required=True, help='Workflow ID to monitor')
def monitor_workflow(id: int):
    """
    Monitor the status of a workflow by ID.
    
    Args:
        id: Workflow ID to monitor
    """
    try:
        repository = WorkflowRepository()
        executor = TaskExecutor()
        scheduler = WorkflowScheduler() if settings.rust_scheduler_enabled else None
        use_cases = WorkflowUseCases(repository, executor, scheduler)
        
        status = use_cases.get_workflow_status(id)
        if status is None:
            raise ValueError(f"Workflow ID {id} not found")

        click.echo(f"Workflow Status for ID {id}:")
        click.echo(json.dumps(status, indent=2))
    except Exception as e:
        logger.error(f"Error monitoring workflow {id}: {str(e)}", exc_info=True)
        click.echo(f"Error: {str(e)}", err=True)
    finally:
        if 'repository' in locals():
            repository.close()

if __name__ == '__main__':
    cli()
