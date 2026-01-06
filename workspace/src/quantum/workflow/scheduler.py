"""
Workflow scheduler for task prioritization and execution.
Supports both Python-based and Rust-based scheduling.
"""
from typing import List, Dict, Any, Optional
from pathlib import Path
import json

try:
    import pyo3_runtime  # PyO3 binding for Rust scheduler
    RUST_SCHEDULER_AVAILABLE = True
except ImportError:
    RUST_SCHEDULER_AVAILABLE = False

from backend.python.core.entities import Task
from backend.python.core.logging_config import get_logger
from backend.python.core.exceptions import SchedulerError
from backend.python.config import get_settings

logger = get_logger(__name__)

class WorkflowScheduler:
    """
    Schedules hybrid quantum-classical workflow tasks.
    Uses Rust scheduler if available, otherwise falls back to Python implementation.
    """
    
    def __init__(self):
        """Initialize workflow scheduler."""
        settings = get_settings()
        self.rust_scheduler = None
        self.rust_enabled = settings.rust_scheduler_enabled and RUST_SCHEDULER_AVAILABLE
        
        if self.rust_enabled:
            try:
                self.rust_scheduler = pyo3_runtime.Scheduler()
                logger.info("Initialized Rust scheduler via PyO3")
            except Exception as e:
                logger.warning(f"Failed to initialize Rust scheduler: {str(e)}. Using Python fallback.")
                self.rust_scheduler = None
                self.rust_enabled = False
        else:
            logger.info("Using Python-based scheduler (Rust scheduler not available)")
    
    def schedule_tasks(
        self,
        tasks: List[Task],
        max_latency: float = 600.0,
        max_budget: float = 100.0
    ) -> List[Task]:
        """
        Schedule tasks for optimal execution order.
        
        Args:
            tasks: List of task entities
            max_latency: Maximum allowed latency in seconds
            max_budget: Maximum allowed cost in USD
            
        Returns:
            List of tasks in prioritized order
            
        Raises:
            SchedulerError: If scheduling fails
        """
        try:
            if self.rust_enabled and self.rust_scheduler:
                return self._schedule_with_rust(tasks, max_latency, max_budget)
            else:
                return self._schedule_with_python(tasks, max_latency, max_budget)
        except Exception as e:
            logger.error(f"Error scheduling tasks: {str(e)}", exc_info=True)
            raise SchedulerError(f"Scheduling failed: {str(e)}")
    
    def _schedule_with_rust(
        self,
        tasks: List[Task],
        max_latency: float,
        max_budget: float
    ) -> List[Task]:
        """Schedule tasks using Rust scheduler."""
        try:
            # Prepare task configs for Rust
            task_configs = []
            for task in tasks:
                config = task.config
                backend = config.get('backend', 'local')
                
                # Estimate cost (simplified)
                if task.type.value == 'quantum':
                    shots = config.get('shots', 100)
                    depth = config.get('depth', 10)
                    estimated_cost = shots * depth * 0.001
                else:
                    estimated_cost = 0.1
                
                task_configs.append({
                    'id': task.id,
                    'type': task.type.value,
                    'backend': backend,
                    'estimated_cost': estimated_cost
                })
            
            # Call Rust scheduler
            prioritized_json = self.rust_scheduler.schedule_tasks(
                json.dumps(task_configs),
                max_latency=max_latency,
                max_budget=max_budget
            )
            
            prioritized_configs = json.loads(prioritized_json)
            
            # Reorder tasks based on Rust scheduler output
            task_map = {task.id: task for task in tasks}
            prioritized_tasks = [task_map[config['id']] for config in prioritized_configs]
            
            return prioritized_tasks
            
        except Exception as e:
            logger.warning(f"Rust scheduler failed: {str(e)}. Falling back to Python.")
            return self._schedule_with_python(tasks, max_latency, max_budget)
    
    def _schedule_with_python(
        self,
        tasks: List[Task],
        max_latency: float,
        max_budget: float
    ) -> List[Task]:
        """Schedule tasks using Python implementation."""
        # Simple priority-based scheduling
        # Tasks with lower estimated cost are prioritized
        def estimate_cost(task: Task) -> float:
            """Estimate task cost."""
            config = task.config
            if task.type.value == 'quantum':
                shots = config.get('shots', 100)
                depth = config.get('depth', 10)
                return shots * depth * 0.001
            else:
                return 0.1
        
        # Sort by cost (lower cost = higher priority)
        prioritized = sorted(tasks, key=estimate_cost)
        
        return prioritized
