"""
Task executor for classical and quantum tasks.
"""
from typing import Any, Dict
import time

from backend.python.core.entities import Task, TaskType
from backend.python.core.exceptions import TaskExecutionError, BackendError
from backend.python.core.logging_config import get_logger
from backend.python.quantum.cirq_backend import CirqBackend
from backend.python.quantum.qiskit_backend import QiskitBackend
from backend.python.quantum.pennylane_backend import PennyLaneBackend

logger = get_logger(__name__)


class TaskExecutor:
    """Executes classical and quantum tasks."""
    
    def __init__(self):
        """Initialize task executor with quantum backends."""
        self.cirq_backend = CirqBackend()
        self.qiskit_backend = QiskitBackend()
        self.pennylane_backend = PennyLaneBackend()
    
    def execute(self, task: Task) -> Any:
        """
        Execute a task.
        
        Args:
            task: Task entity to execute
            
        Returns:
            Task execution result
            
        Raises:
            TaskExecutionError: If task execution fails
        """
        start_time = time.time()
        
        try:
            if task.type == TaskType.CLASSICAL:
                result = self._execute_classical_task(task)
            elif task.type == TaskType.QUANTUM:
                result = self._execute_quantum_task(task)
            else:
                raise TaskExecutionError(f"Unsupported task type: {task.type}")
            
            execution_time = time.time() - start_time
            logger.info(f"Task {task.id} executed in {execution_time:.2f}s")
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Task {task.id} failed after {execution_time:.2f}s: {str(e)}", exc_info=True)
            raise TaskExecutionError(f"Task execution failed: {str(e)}")
    
    def _execute_classical_task(self, task: Task) -> Any:
        """
        Execute a classical task.
        
        Args:
            task: Classical task to execute
            
        Returns:
            Task result
            
        Raises:
            TaskExecutionError: If execution fails
        """
        try:
            config = task.config
            operation = config.get('operation')
            
            if operation == 'preprocess':
                # PyTorch preprocessing example
                import torch
                data = config.get('data', [1.0, 2.0, 3.0])
                if not isinstance(data, list):
                    raise ValueError("Data must be a list")
                
                tensor = torch.tensor(data, dtype=torch.float32)
                result = torch.mean(tensor).item()
                return result
            
            elif operation == 'transform':
                # Data transformation example
                data = config.get('data', [])
                transform_type = config.get('transform_type', 'normalize')
                
                if transform_type == 'normalize':
                    if not data:
                        return []
                    max_val = max(data)
                    min_val = min(data)
                    if max_val == min_val:
                        return [0.0] * len(data)
                    return [(x - min_val) / (max_val - min_val) for x in data]
                else:
                    raise ValueError(f"Unsupported transform type: {transform_type}")
            
            else:
                raise ValueError(f"Unsupported classical operation: {operation}")
                
        except Exception as e:
            raise TaskExecutionError(f"Classical task execution failed: {str(e)}")
    
    def _execute_quantum_task(self, task: Task) -> Any:
        """
        Execute a quantum task.
        
        Args:
            task: Quantum task to execute
            
        Returns:
            Task result
            
        Raises:
            TaskExecutionError: If execution fails
        """
        try:
            config = task.config
            backend_name = config.get('backend', 'cirq')
            
            if backend_name == 'cirq':
                result = self.cirq_backend.execute_cirq_circuit(config)
            elif backend_name == 'qiskit':
                result = self.qiskit_backend.execute_qiskit_circuit(config)
            elif backend_name == 'pennylane':
                result = self.pennylane_backend.execute_pennylane_circuit(config)
            else:
                raise ValueError(f"Unsupported quantum backend: {backend_name}")
            
            if result is None:
                raise BackendError(f"Quantum backend {backend_name} returned None")
            
            return result
            
        except Exception as e:
            raise TaskExecutionError(f"Quantum task execution failed: {str(e)}")

