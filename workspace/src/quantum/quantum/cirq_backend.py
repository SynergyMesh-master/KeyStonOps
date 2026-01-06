"""
Cirq backend for quantum circuit execution.
Supports local simulation and Google Quantum Engine.
"""
import os
import logging
from typing import Dict, Any, Optional

try:
    import cirq
    from cirq import Circuit, NamedQubit, X, Simulator
    CIRQ_AVAILABLE = True
except ImportError:
    CIRQ_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Cirq not available. Install with: pip install cirq")

try:
    import cirq_google
    from google.cloud import quantum_v1alpha1 as quantum
    from google.oauth2 import service_account
    from google.api_core import exceptions
    GOOGLE_QUANTUM_AVAILABLE = True
except ImportError:
    GOOGLE_QUANTUM_AVAILABLE = False

from backend.python.core.logging_config import get_logger
from backend.python.core.exceptions import BackendError, ConfigurationError
from backend.python.config import get_settings

logger = get_logger(__name__)

class CirqBackend:
    """
    Integrates with Google's Cirq and qsim for executing quantum circuits.
    
    Supports both local simulation and Google Quantum Engine cloud execution.
    """
    
    def __init__(self, api_key_path: Optional[str] = None):
        """
        Initialize Cirq backend.
        
        Args:
            api_key_path: Path to Google Cloud service account key file
        """
        if not CIRQ_AVAILABLE:
            raise ImportError("Cirq is not installed. Install with: pip install cirq")
        
        settings = get_settings()
        self.api_key_path = api_key_path or settings.cirq_api_key_path or os.getenv('CIRQ_API_KEY')
        self.simulator = Simulator() if CIRQ_AVAILABLE else None
        self.client = None
        
        if self.api_key_path and GOOGLE_QUANTUM_AVAILABLE:
            try:
                if os.path.exists(self.api_key_path):
                    credentials = service_account.Credentials.from_service_account_file(self.api_key_path)
                    self.client = quantum.QuantumEngineServiceClient(credentials=credentials)
                    logger.info("Initialized CirqBackend with Google Quantum Engine client")
                else:
                    logger.warning(f"API key path does not exist: {self.api_key_path}")
            except Exception as e:
                logger.warning(f"Failed to initialize Google Quantum Engine client: {str(e)}")
                self.client = None
        else:
            logger.info("CirqBackend initialized for local simulation only")
    
    def execute_cirq_circuit(self, config: Dict[str, Any]) -> Dict[str, Any]:
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
            qubit = NamedQubit('q0')
            circuit = Circuit()
            
            if circuit_type == 'simple_x':
                circuit.append(X(qubit))
            elif circuit_type == 'bell_state':
                qubit1 = NamedQubit('q0')
                qubit2 = NamedQubit('q1')
                circuit.append(cirq.H(qubit1))
                circuit.append(cirq.CNOT(qubit1, qubit2))
            else:
                raise ConfigurationError(f"Unsupported circuit type: {circuit_type}")

            # Execute based on backend type
            if backend_type == 'simulator':
                result = self._run_simulator(circuit, shots)
            elif backend_type == 'cloud' and self.client:
                processor_id = config.get('processor_id', 'default_processor')
                result = self._run_cloud(circuit, shots, processor_id)
            else:
                raise BackendError(f"Invalid backend type or missing cloud client: {backend_type}")

            logger.info(f"Executed circuit '{circuit_type}' with {shots} shots on {backend_type}")
            return {
                'result': result,
                'backend': 'cirq',
                'backend_type': backend_type,
                'circuit_type': circuit_type,
                'shots': shots
            }
        except (ConfigurationError, BackendError):
            raise
        except Exception as e:
            logger.error(f"Error executing circuit: {str(e)}", exc_info=True)
            raise BackendError(f"Circuit execution failed: {str(e)}")
    
    def _run_simulator(self, circuit: Circuit, shots: int) -> Dict[str, int]:
        """
        Run circuit on Cirq's simulator.
        
        Args:
            circuit: Cirq circuit to execute
            shots: Number of repetitions
            
        Returns:
            Dictionary with measurement results
        """
        try:
            if self.simulator is None:
                raise BackendError("Simulator not initialized")
            
            result = self.simulator.run(circuit, repetitions=shots)
            
            # Convert histogram to dictionary
            histogram = result.histogram(key='q0')
            return {str(k): int(v) for k, v in histogram.items()}
        except Exception as e:
            logger.error(f"Simulator execution error: {str(e)}", exc_info=True)
            raise BackendError(f"Simulator execution failed: {str(e)}")
    
    def _run_cloud(self, circuit: Circuit, shots: int, processor_id: str) -> Dict[str, Any]:
        """
        Run circuit on Google Quantum Engine cloud QPU.
        
        Args:
            circuit: Cirq circuit to execute
            shots: Number of repetitions
            processor_id: Google Quantum Engine processor ID
            
        Returns:
            Dictionary with measurement results
        """
        try:
            if not self.client:
                raise BackendError("Google Quantum Engine client not initialized")
            
            if not GOOGLE_QUANTUM_AVAILABLE:
                raise BackendError("Google Quantum Engine libraries not available")

            # Convert Cirq circuit to Quantum Engine program
            program = cirq_google.to_quantum_program(circuit)
            
            # Get project ID from credentials or config
            project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'your-project')
            
            job = self.client.create_quantum_job(
                parent=f"projects/{project_id}/processors/{processor_id}",
                quantum_job={
                    'program': program,
                    'repetition_count': shots
                }
            )

            # Wait for job completion (simplified - in production, use async polling)
            result = self.client.get_quantum_result(job.name)
            histogram = {str(key): int(value) for key, value in result.histogram.items()}
            
            return histogram
        except exceptions.GoogleAPIError as e:
            logger.error(f"Google Quantum Engine API error: {str(e)}", exc_info=True)
            raise BackendError(f"Google Quantum Engine API error: {str(e)}")
        except Exception as e:
            logger.error(f"Cloud execution error: {str(e)}", exc_info=True)
            raise BackendError(f"Cloud execution failed: {str(e)}")

if __name__ == "__main__":
    # Example usage
    backend = CirqBackend()
    config = {
        'circuit': 'simple_x',
        'shots': 100,
        'backend': 'simulator'
    }
    result = backend.execute_cirq_circuit(config)
    print(result)
