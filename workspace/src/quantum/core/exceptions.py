"""
Custom exceptions for QuantumFlow Toolkit.
"""
from typing import Optional


class QuantumFlowException(Exception):
    """Base exception for all QuantumFlow Toolkit errors."""
    
    def __init__(self, message: str, details: Optional[dict] = None):
        """
        Initialize exception.
        
        Args:
            message: Human-readable error message
            details: Optional dictionary with additional error details
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}


class WorkflowError(QuantumFlowException):
    """Exception raised for workflow-related errors."""
    pass


class TaskExecutionError(QuantumFlowException):
    """Exception raised when task execution fails."""
    pass


class BackendError(QuantumFlowException):
    """Exception raised when quantum backend operations fail."""
    pass


class SchedulerError(QuantumFlowException):
    """Exception raised when scheduling operations fail."""
    pass


class DatabaseError(QuantumFlowException):
    """Exception raised when database operations fail."""
    pass


class ValidationError(QuantumFlowException):
    """Exception raised when validation fails."""
    pass


class ConfigurationError(QuantumFlowException):
    """Exception raised when configuration is invalid."""
    pass


class AuthenticationError(QuantumFlowException):
    """Exception raised when authentication fails."""
    pass


class RateLimitError(QuantumFlowException):
    """Exception raised when rate limit is exceeded."""
    pass

