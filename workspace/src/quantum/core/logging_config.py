"""
Centralized logging configuration for QuantumFlow Toolkit.
"""
import logging
import sys
from pathlib import Path
from typing import Optional
from logging.handlers import RotatingFileHandler

from backend.python.config import get_settings


def setup_logging(
    log_level: Optional[str] = None,
    log_file: Optional[Path] = None,
    enable_file_logging: bool = True
) -> logging.Logger:
    """
    Set up application-wide logging configuration.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (defaults to logs/quantumflow.log)
        enable_file_logging: Whether to enable file logging
        
    Returns:
        Configured root logger
    """
    settings = get_settings()
    level = log_level or settings.log_level
    
    # Create logs directory if it doesn't exist
    if enable_file_logging:
        if log_file is None:
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)
            log_file = log_dir / "quantumflow.log"
        else:
            log_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler with colored output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level))
    
    # Format for console
    console_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_format)
    root_logger.addHandler(console_handler)
    
    # File handler with rotation
    if enable_file_logging and log_file:
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        file_handler.setLevel(getattr(logging, level))
        
        # Format for file (more detailed)
        file_format = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(pathname)s:%(lineno)d - %(funcName)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_format)
        root_logger.addHandler(file_handler)
    
    # Set levels for third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a module.
    
    Args:
        name: Logger name (typically __name__)
        
    Returns:
        Logger instance
    """
    return logging.getLogger(name)

