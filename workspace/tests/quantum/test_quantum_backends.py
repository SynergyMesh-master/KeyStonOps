"""
Tests for quantum backends.
"""
import pytest
import os

from backend.python.quantum.cirq_backend import CirqBackend
from backend.python.quantum.qiskit_backend import QiskitBackend
from backend.python.quantum.pennylane_backend import PennyLaneBackend
from backend.python.core.exceptions import BackendError, ConfigurationError


class TestCirqBackend:
    """Test Cirq backend."""
    
    def test_initialize_backend(self):
        """Test initializing Cirq backend."""
        backend = CirqBackend()
        assert backend is not None
    
    def test_execute_simple_circuit(self):
        """Test executing a simple circuit."""
        backend = CirqBackend()
        config = {
            "circuit": "simple_x",
            "shots": 100,
            "backend_type": "simulator"
        }
        
        result = backend.execute_cirq_circuit(config)
        assert isinstance(result, dict)
        assert "result" in result
        assert "backend" in result
    
    def test_execute_invalid_circuit(self):
        """Test executing invalid circuit."""
        backend = CirqBackend()
        config = {
            "circuit": "invalid_circuit",
            "shots": 100
        }
        
        with pytest.raises(ConfigurationError):
            backend.execute_cirq_circuit(config)
    
    def test_execute_with_invalid_shots(self):
        """Test executing with invalid shots."""
        backend = CirqBackend()
        config = {
            "circuit": "simple_x",
            "shots": -1
        }
        
        with pytest.raises(ConfigurationError):
            backend.execute_cirq_circuit(config)


class TestQiskitBackend:
    """Test Qiskit backend."""
    
    def test_initialize_backend(self):
        """Test initializing Qiskit backend."""
        backend = QiskitBackend()
        assert backend is not None
    
    def test_execute_simple_circuit(self):
        """Test executing a simple circuit."""
        backend = QiskitBackend()
        config = {
            "circuit": "simple_x",
            "shots": 100,
            "backend_type": "simulator"
        }
        
        result = backend.execute_qiskit_circuit(config)
        assert isinstance(result, dict)
        assert "result" in result
        assert "backend" in result


class TestPennyLaneBackend:
    """Test PennyLane backend."""
    
    def test_initialize_backend(self):
        """Test initializing PennyLane backend."""
        backend = PennyLaneBackend()
        assert backend is not None
    
    def test_execute_simple_circuit(self):
        """Test executing a simple circuit."""
        backend = PennyLaneBackend()
        config = {
            "circuit": "simple_variational",
            "shots": 100,
            "backend_type": "default.qubit",
            "params": [0.5]
        }
        
        result = backend.execute_pennylane_circuit(config)
        assert isinstance(result, dict)
        assert "result" in result
        assert "backend" in result

