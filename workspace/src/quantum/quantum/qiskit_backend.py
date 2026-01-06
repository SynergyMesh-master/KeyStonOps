"""
Qiskit backend for quantum circuit execution.
Supports local simulation and IBM Quantum cloud execution.
"""
import os
import logging
from typing import Dict, Any, Optional

try:
    from qiskit import QuantumCircuit, Aer, IBMQ
    from qiskit.execute import execute
    from qiskit.providers.ibmq import IBMQError
    QISKIT_AVAILABLE = True
except ImportError:
    QISKIT_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Qiskit not available. Install with: pip install qiskit")

from backend.python.core.logging_config import get_logger
from backend.python.core.exceptions import BackendError, ConfigurationError
from backend.python.config import get_settings

logger = get_logger(__name__)

class QiskitBackend:
    """
    Integrates with IBM's Qiskit for executing quantum circuits.
    
    Supports both local simulation and IBM Quantum cloud execution.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Qiskit backend.
        
        Args:
            api_key: IBM Quantum API token
        """
        if not QISKIT_AVAILABLE:
            raise ImportError("Qiskit is not installed. Install with: pip install qiskit")
        
        settings = get_settings()
        self.api_key = api_key or settings.qiskit_api_key or os.getenv('QISKIT_API_KEY')
        self.hub = settings.qiskit_hub or os.getenv('QISKIT_HUB')
        self.project = settings.qiskit_project or os.getenv('QISKIT_PROJECT')
        self.backend = None
        self.provider = None
        
        if self.api_key:
            try:
                IBMQ.save_account(self.api_key, overwrite=True)
                if self.hub and self.project:
                    self.provider = IBMQ.get_provider(hub=self.hub, project=self.project)
                else:
                    self.provider = IBMQ.load_account()
                logger.info("Initialized QiskitBackend with IBM Quantum provider")
            except Exception as e:
                logger.warning(f"Failed to initialize IBM Quantum provider: {str(e)}")
                self.provider = None
        else:
            logger.info("No Qiskit API key provided, using local simulator only")
    
    def execute_qiskit_circuit(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a quantum circuit defined in the workflow config.
        
        Args:
            config: Circuit configuration dictionary
            
        Returns:
            Dictionary with execution results
            
        Raises:
            BackendError: If circuit execution fails
            ConfigurationError: If configuration is invalid
        """
        try:
            # Validate config
            if not isinstance(config, dict):
                raise ConfigurationError("Circuit configuration must be a dictionary")
            
            circuit_type = config.get('circuit', 'simple_x')
            shots = config.get('shots', 100)
            backend_type = config.get('backend_type', 'simulator')
            
            if shots <= 0:
                raise ConfigurationError("Shots must be positive")

            # Build circuit
            circuit = QuantumCircuit(1, 1)
            if circuit_type == 'simple_x':
                circuit.x(0)
                circuit.measure(0, 0)
            elif circuit_type == 'bell_state':
                circuit = QuantumCircuit(2, 2)
                circuit.h(0)
                circuit.cx(0, 1)
                circuit.measure([0, 1], [0, 1])
            else:
                raise ConfigurationError(f"Unsupported circuit type: {circuit_type}")

            # Execute based on backend type
            if backend_type == 'simulator':
                result = self._run_simulator(circuit, shots)
            elif backend_type == 'cloud' and self.provider:
                backend_id = config.get('backend_id', 'ibmq_qasm_simulator')
                result = self._run_cloud(circuit, shots, backend_id)
            else:
                raise BackendError(f"Invalid backend type or missing cloud provider: {backend_type}")

            logger.info(f"Executed circuit '{circuit_type}' with {shots} shots on {backend_type}")
            return {
                'result': result.get_counts() if hasattr(result, 'get_counts') else result,
                'backend': 'qiskit',
                'backend_type': backend_type,
                'circuit_type': circuit_type,
                'shots': shots
            }
        except (ConfigurationError, BackendError):
            raise
        except Exception as e:
            logger.error(f"Error executing circuit: {str(e)}", exc_info=True)
            raise BackendError(f"Circuit execution failed: {str(e)}")
    
    def _run_simulator(self, circuit: QuantumCircuit, shots: int) -> Any:
        """
        Run circuit on Qiskit's Aer simulator.
        
        Args:
            circuit: Qiskit circuit to execute
            shots: Number of repetitions
            
        Returns:
            Job result object
        """
        try:
            backend = Aer.get_backend('qasm_simulator')
            job = execute(circuit, backend, shots=shots)
            result = job.result()
            return result
        except Exception as e:
            logger.error(f"Simulator execution error: {str(e)}", exc_info=True)
            raise BackendError(f"Simulator execution failed: {str(e)}")
    
    def _run_cloud(self, circuit: QuantumCircuit, shots: int, backend_id: str) -> Any:
        """
        Run circuit on IBM Quantum cloud QPU or simulator.
        
        Args:
            circuit: Qiskit circuit to execute
            shots: Number of repetitions
            backend_id: IBM Quantum backend identifier
            
        Returns:
            Job result object
        """
        try:
            if not self.provider:
                raise BackendError("IBM Quantum provider not initialized")

            backend = self.provider.get_backend(backend_id)
            job = execute(circuit, backend, shots=shots)
            result = job.result()
            return result
        except IBMQError as e:
            logger.error(f"IBM Quantum API error: {str(e)}", exc_info=True)
            raise BackendError(f"IBM Quantum API error: {str(e)}")
        except Exception as e:
            logger.error(f"Cloud execution error: {str(e)}", exc_info=True)
            raise BackendError(f"Cloud execution failed: {str(e)}")

if __name__ == "__main__":
    # Example usage
    backend = QiskitBackend()
    config = {
        'circuit': 'simple_x',
        'shots': 100,
        'backend': 'simulator'
    }
    result = backend.execute_qiskit_circuit(config)
    print(result)
