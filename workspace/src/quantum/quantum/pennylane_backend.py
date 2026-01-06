"""
PennyLane backend for variational quantum circuit execution.
Supports local simulation and Xanadu Cloud execution.
"""
import os
import logging
from typing import Dict, Any, Optional

try:
    import pennylane as qml
    import numpy as np
    from pennylane import numpy as pnp
    PENNYLANE_AVAILABLE = True
except ImportError:
    PENNYLANE_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("PennyLane not available. Install with: pip install pennylane")

from backend.python.core.logging_config import get_logger
from backend.python.core.exceptions import BackendError, ConfigurationError
from backend.python.config import get_settings

logger = get_logger(__name__)

class PennyLaneBackend:
    """
    Integrates with PennyLane for executing variational quantum circuits.
    
    Supports both local simulation and Xanadu Cloud execution.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize PennyLane backend.
        
        Args:
            api_key: Xanadu Cloud API key
        """
        if not PENNYLANE_AVAILABLE:
            raise ImportError("PennyLane is not installed. Install with: pip install pennylane")
        
        settings = get_settings()
        self.api_key = api_key or settings.pennylane_api_key or os.getenv('PENNYLANE_API_KEY')
        self.device = None
        logger.info("Initialized PennyLaneBackend")
    
    def execute_pennylane_circuit(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a variational quantum circuit defined in the workflow config.
        
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
            
            circuit_type = config.get('circuit', 'simple_variational')
            shots = config.get('shots', 100)
            backend_type = config.get('backend_type', 'default.qubit')
            params = config.get('params', [0.5])  # Initial variational parameters
            wires = config.get('wires', 1)

            if shots <= 0:
                raise ConfigurationError("Shots must be positive")
            if not isinstance(params, (list, tuple)):
                raise ConfigurationError("Params must be a list or tuple")

            # Initialize device
            if backend_type == 'default.qubit':
                self.device = qml.device('default.qubit', wires=wires, shots=shots)
            elif backend_type == 'cloud' and self.api_key:
                try:
                    self.device = qml.device('xanadu.cloud', wires=wires, shots=shots, api_key=self.api_key)
                except Exception as e:
                    logger.error(f"Failed to initialize Xanadu cloud device: {str(e)}")
                    raise BackendError(f"Failed to initialize Xanadu cloud device: {str(e)}")
            else:
                raise BackendError(f"Invalid backend type or missing API key: {backend_type}")

            # Define variational circuit
            if circuit_type == 'simple_variational':
                @qml.qnode(self.device)
                def circuit(params):
                    qml.RY(params[0], wires=0)
                    return qml.counts()
            elif circuit_type == 'variational_classifier':
                @qml.qnode(self.device)
                def circuit(params):
                    qml.RY(params[0], wires=0)
                    qml.RZ(params[1], wires=0)
                    return qml.counts()
            else:
                raise ConfigurationError(f"Unsupported circuit type: {circuit_type}")

            # Execute circuit
            result = circuit(pnp.array(params))
            logger.info(f"Executed circuit '{circuit_type}' with {shots} shots on {backend_type}")
            
            return {
                'result': result,
                'backend': 'pennylane',
                'backend_type': backend_type,
                'circuit_type': circuit_type,
                'shots': shots
            }
        except (ConfigurationError, BackendError):
            raise
        except Exception as e:
            logger.error(f"Error executing circuit: {str(e)}", exc_info=True)
            raise BackendError(f"Circuit execution failed: {str(e)}")

if __name__ == "__main__":
    # Example usage
    backend = PennyLaneBackend()
    config = {
        'circuit': 'simple_variational',
        'shots': 100,
        'backend': 'default.qubit',
        'params': [0.5]
    }
    result = backend.execute_pennylane_circuit(config)
    print(result)
