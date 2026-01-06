"""
Health check endpoints.
"""
from fastapi import APIRouter
from datetime import datetime
from typing import Dict

from backend.python.config import get_settings
from backend.python.core.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Basic health check endpoint.
    
    Returns:
        Dictionary with health status
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.app_version
    }


@router.get("/health/ready")
async def readiness_check() -> Dict[str, str]:
    """
    Readiness check endpoint.
    Verifies that the application is ready to serve traffic.
    
    Returns:
        Dictionary with readiness status
    """
    try:
        # Check database connectivity
        from backend.python.repositories.workflow_repository import WorkflowRepository
        repo = WorkflowRepository()
        repo.close()
        
        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "database": "ok"
            }
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {
            "status": "not_ready",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/health/live")
async def liveness_check() -> Dict[str, str]:
    """
    Liveness check endpoint.
    Verifies that the application is alive.
    
    Returns:
        Dictionary with liveness status
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }

