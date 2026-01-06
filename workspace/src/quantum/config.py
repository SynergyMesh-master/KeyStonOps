"""
Configuration management for QuantumFlow Toolkit.
Handles environment variables and application settings.
"""
import os
from pathlib import Path
from typing import Optional
from pydantic import Field, validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = Field(default="QuantumFlow Toolkit", env="APP_NAME")
    app_version: str = Field(default="1.0.0", env="APP_VERSION")
    environment: str = Field(default="development", env="ENVIRONMENT")
    debug: bool = Field(default=False, env="DEBUG")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # Server
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    frontend_port: int = Field(default=3000, env="FRONTEND_PORT")
    
    # Database
    database_path: str = Field(default="./data/workflows.db", env="DATABASE_PATH")
    database_pool_size: int = Field(default=10, env="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=20, env="DATABASE_MAX_OVERFLOW")
    
    # Security
    secret_key: str = Field(default="change-me-in-production", env="SECRET_KEY")
    allowed_origins: str = Field(
        default="http://localhost:3000,http://localhost:8000",
        env="ALLOWED_ORIGINS"
    )
    cors_enabled: bool = Field(default=True, env="CORS_ENABLED")
    rate_limit_enabled: bool = Field(default=True, env="RATE_LIMIT_ENABLED")
    rate_limit_per_minute: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")
    
    # Quantum Backend API Keys
    cirq_api_key: Optional[str] = Field(default=None, env="CIRQ_API_KEY")
    cirq_api_key_path: Optional[str] = Field(default=None, env="CIRQ_API_KEY_PATH")
    qiskit_api_key: Optional[str] = Field(default=None, env="QISKIT_API_KEY")
    qiskit_hub: Optional[str] = Field(default=None, env="QISKIT_HUB")
    qiskit_project: Optional[str] = Field(default=None, env="QISKIT_PROJECT")
    pennylane_api_key: Optional[str] = Field(default=None, env="PENNYLANE_API_KEY")
    
    # Quantum Backend Configuration
    cirq_default_backend: str = Field(default="simulator", env="CIRQ_DEFAULT_BACKEND")
    qiskit_default_backend: str = Field(default="qasm_simulator", env="QISKIT_DEFAULT_BACKEND")
    pennylane_default_backend: str = Field(default="default.qubit", env="PENNYLANE_DEFAULT_BACKEND")
    
    # Performance Monitoring
    metrics_enabled: bool = Field(default=True, env="METRICS_ENABLED")
    metrics_retention_days: int = Field(default=30, env="METRICS_RETENTION_DAYS")
    
    # Cost Estimation
    cost_estimation_enabled: bool = Field(default=True, env="COST_ESTIMATION_ENABLED")
    
    # Rust Scheduler
    rust_scheduler_enabled: bool = Field(default=True, env="RUST_SCHEDULER_ENABLED")
    rust_scheduler_max_latency: float = Field(default=600.0, env="RUST_SCHEDULER_MAX_LATENCY")
    rust_scheduler_max_budget: float = Field(default=100.0, env="RUST_SCHEDULER_MAX_BUDGET")
    
    @validator("allowed_origins", pre=True)
    def parse_allowed_origins(cls, v):
        """Parse comma-separated origins into a list."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v
    
    @validator("log_level")
    def validate_log_level(cls, v):
        """Validate log level."""
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Log level must be one of {valid_levels}")
        return v.upper()
    
    @property
    def database_dir(self) -> Path:
        """Get the directory containing the database file."""
        db_path = Path(self.database_path)
        return db_path.parent
    
    def ensure_database_dir(self) -> None:
        """Ensure the database directory exists."""
        self.database_dir.mkdir(parents=True, exist_ok=True)
    
    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached application settings.
    
    Returns:
        Settings: Application settings instance.
    """
    settings = Settings()
    settings.ensure_database_dir()
    return settings

