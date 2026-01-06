"""
Cost estimation for quantum tasks and workflows.
"""
from typing import Dict, Any, Optional, List

from backend.python.core.entities import Task, CostEstimate
from backend.python.core.logging_config import get_logger
from backend.python.core.exceptions import ValidationError

logger = get_logger(__name__)

class CostEstimator:
    """Estimates resource costs for quantum tasks based on shots and circuit depth."""
    
    def __init__(self):
        # Mock pricing models (in USD, based on hypothetical cloud provider rates)
        self.pricing_models = {
            'cirq': {
                'simulator': {'cost_per_shot': 0.0001, 'cost_per_depth': 0.001},
                'cloud': {'cost_per_shot': 0.01, 'cost_per_depth': 0.05}
            },
            'qiskit': {
                'simulator': {'cost_per_shot': 0.00005, 'cost_per_depth': 0.0005},
                'cloud': {'cost_per_shot': 0.008, 'cost_per_depth': 0.04}
            },
            'pennylane': {
                'simulator': {'cost_per_shot': 0.00008, 'cost_per_depth': 0.0008},
                'cloud': {'cost_per_shot': 0.009, 'cost_per_depth': 0.045}
            }
        }
        logger.info("Initialized CostEstimator with pricing models")

    def estimate_task_cost(self, task: Task) -> CostEstimate:
        """
        Estimate the cost of a task.
        
        Args:
            task: Task entity to estimate cost for
            
        Returns:
            CostEstimate entity
            
        Raises:
            ValidationError: If task is invalid or not quantum
        """
        try:
            if task.type.value != 'quantum':
                # Classical tasks have minimal cost
                return CostEstimate(
                    task_id=task.id,
                    backend='local',
                    backend_type='classical',
                    cost=0.01,  # Minimal cost for classical processing
                    breakdown={'base': 0.01}
                )
            
            config = task.config
            backend = config.get('backend', 'cirq')
            backend_type = config.get('backend_type', 'simulator')
            shots = config.get('shots', 100)
            depth = config.get('depth', 10)

            # Validate backend and backend type
            if backend not in self.pricing_models:
                raise ValidationError(f"Unsupported backend: {backend}")
            if backend_type not in self.pricing_models[backend]:
                raise ValidationError(f"Unsupported backend type: {backend_type} for {backend}")

            # Calculate cost
            pricing = self.pricing_models[backend][backend_type]
            shot_cost = shots * pricing['cost_per_shot']
            depth_cost = depth * pricing['cost_per_depth']
            total_cost = shot_cost + depth_cost
            
            breakdown = {
                'shots': shot_cost,
                'depth': depth_cost
            }
            
            logger.debug(f"Estimated cost for task {task.id} on {backend} ({backend_type}): ${total_cost:.4f}")
            
            return CostEstimate(
                task_id=task.id,
                backend=backend,
                backend_type=backend_type,
                cost=total_cost,
                breakdown=breakdown
            )
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f"Error estimating task cost: {str(e)}", exc_info=True)
            raise ValidationError(f"Failed to estimate task cost: {str(e)}")
    
    def estimate_workflow_cost(self, tasks: List[Task]) -> Dict[str, Any]:
        """
        Estimate total cost for a workflow's tasks.
        
        Args:
            tasks: List of task entities
            
        Returns:
            Dictionary with total cost and breakdown
            
        Raises:
            ValidationError: If estimation fails
        """
        try:
            total_cost = 0.0
            cost_breakdown = []
            
            for task in tasks:
                estimate = self.estimate_task_cost(task)
                cost_breakdown.append({
                    'task_id': estimate.task_id,
                    'backend': estimate.backend,
                    'backend_type': estimate.backend_type,
                    'cost': estimate.cost,
                    'breakdown': estimate.breakdown
                })
                total_cost += estimate.cost
            
            logger.info(f"Estimated total workflow cost: ${total_cost:.4f}")
            return {
                'total_cost': total_cost,
                'breakdown': cost_breakdown
            }
        except Exception as e:
            logger.error(f"Error estimating workflow cost: {str(e)}", exc_info=True)
            raise ValidationError(f"Failed to estimate workflow cost: {str(e)}")
    
    def optimize_schedule(self, tasks: List[Task], max_budget: float) -> List[Task]:
        """
        Optimize task schedule to minimize cost within a budget.
        
        Args:
            tasks: List of task entities
            max_budget: Maximum budget in USD
            
        Returns:
            List of tasks in optimized order
            
        Raises:
            ValidationError: If optimization fails
        """
        try:
            from backend.python.workflow.scheduler import WorkflowScheduler
            
            # Estimate costs for all tasks
            task_costs = {}
            for task in tasks:
                estimate = self.estimate_task_cost(task)
                task_costs[task.id] = estimate.cost
            
            # Initialize scheduler
            scheduler = WorkflowScheduler()
            
            # Schedule tasks with budget constraint
            prioritized_tasks = scheduler.schedule_tasks(
                tasks,
                max_latency=600.0,  # 10 minutes
                max_budget=max_budget
            )
            
            # Validate total cost
            total_cost = sum(task_costs.get(task.id, 0) for task in prioritized_tasks)
            if total_cost > max_budget:
                logger.warning(f"Optimized schedule exceeds budget: ${total_cost:.4f} > ${max_budget:.4f}")
            
            logger.info(f"Optimized schedule for {len(tasks)} tasks within budget ${max_budget:.4f}")
            return prioritized_tasks
        except Exception as e:
            logger.error(f"Error optimizing schedule: {str(e)}", exc_info=True)
            raise ValidationError(f"Failed to optimize schedule: {str(e)}")

if __name__ == "__main__":
    # Example usage
    estimator = CostEstimator()
    tasks = [
        {'type': 'quantum', 'config': {'circuit': 'simple_x', 'shots': 100, 'depth': 5, 'backend': 'cirq', 'backend_type': 'simulator'}},
        {'type': 'quantum', 'config': {'circuit': 'variational', 'shots': 200, 'depth': 10, 'backend': 'qiskit', 'backend_type': 'cloud'}}
    ]
    cost = estimator.estimate_workflow_cost(tasks)
    print(cost)
    optimized_schedule = estimator.optimize_schedule(tasks, max_budget=5.0)
    print(optimized_schedule)
