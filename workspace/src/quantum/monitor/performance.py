"""
Performance monitoring for workflow execution.
Tracks and stores performance metrics for tasks.
"""
import sqlite3
import time
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime

from backend.python.core.entities import PerformanceMetrics
from backend.python.core.logging_config import get_logger
from backend.python.core.exceptions import DatabaseError
from backend.python.config import get_settings

logger = get_logger(__name__)

class PerformanceMonitor:
    """
    Tracks and stores performance metrics for hybrid workflows.
    """
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize performance monitor.
        
        Args:
            db_path: Path to SQLite database (defaults to config value)
        """
        settings = get_settings()
        self.db_path = Path(db_path or settings.database_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = None
        self._init_db()
    
    def _init_db(self) -> None:
        """Initialize SQLite table for performance metrics."""
        try:
            self.conn = sqlite3.connect(
                str(self.db_path),
                check_same_thread=False,
                timeout=30.0
            )
            self.conn.row_factory = sqlite3.Row
            
            cursor = self.conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    workflow_id INTEGER NOT NULL,
                    task_id INTEGER NOT NULL,
                    runtime REAL NOT NULL,
                    circuit_depth INTEGER,
                    shots INTEGER,
                    memory_usage INTEGER,
                    cpu_usage REAL,
                    timestamp TEXT NOT NULL,
                    UNIQUE(workflow_id, task_id)
                )
            ''')
            
            # Create index
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_metrics_workflow 
                ON performance_metrics(workflow_id)
            ''')
            
            self.conn.commit()
            logger.info(f"Initialized performance_metrics table in {self.db_path}")
        except sqlite3.Error as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise DatabaseError(f"Database initialization failed: {str(e)}")
    
    def track_metrics(self, metrics: PerformanceMetrics) -> None:
        """
        Track performance metrics for a task and store in SQLite.
        
        Args:
            metrics: PerformanceMetrics entity to store
            
        Raises:
            DatabaseError: If storage fails
        """
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO performance_metrics 
                (workflow_id, task_id, runtime, circuit_depth, shots, memory_usage, cpu_usage, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                metrics.workflow_id,
                metrics.task_id,
                metrics.runtime,
                metrics.circuit_depth,
                metrics.shots,
                metrics.memory_usage,
                metrics.cpu_usage,
                metrics.timestamp.isoformat()
            ))
            self.conn.commit()
            logger.debug(
                f"Tracked metrics for workflow {metrics.workflow_id}, "
                f"task {metrics.task_id}: runtime={metrics.runtime:.2f}s"
            )
        except sqlite3.Error as e:
            self.conn.rollback()
            logger.error(f"Error tracking metrics: {str(e)}")
            raise DatabaseError(f"Failed to track metrics: {str(e)}")
    
    def get_metrics(self, workflow_id: int, task_id: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieve performance metrics for a workflow or specific task.
        
        Args:
            workflow_id: Workflow ID
            task_id: Optional task ID for specific task metrics
            
        Returns:
            List of metric dictionaries, or None if not found
            
        Raises:
            DatabaseError: If query fails
        """
        try:
            cursor = self.conn.cursor()
            if task_id is not None:
                cursor.execute('''
                    SELECT workflow_id, task_id, runtime, circuit_depth, shots, 
                           memory_usage, cpu_usage, timestamp
                    FROM performance_metrics
                    WHERE workflow_id = ? AND task_id = ?
                ''', (workflow_id, task_id))
            else:
                cursor.execute('''
                    SELECT workflow_id, task_id, runtime, circuit_depth, shots,
                           memory_usage, cpu_usage, timestamp
                    FROM performance_metrics
                    WHERE workflow_id = ?
                    ORDER BY task_id
                ''', (workflow_id,))

            results = []
            for row in cursor.fetchall():
                results.append({
                    'workflow_id': row['workflow_id'],
                    'task_id': row['task_id'],
                    'runtime': row['runtime'],
                    'circuit_depth': row['circuit_depth'],
                    'shots': row['shots'],
                    'memory_usage': row['memory_usage'],
                    'cpu_usage': row['cpu_usage'],
                    'timestamp': row['timestamp']
                })
            
            if not results:
                return None
            
            logger.debug(f"Retrieved {len(results)} metrics for workflow {workflow_id}")
            return results
        except sqlite3.Error as e:
            logger.error(f"Error retrieving metrics: {str(e)}")
            raise DatabaseError(f"Failed to retrieve metrics: {str(e)}")
    
    def close(self) -> None:
        """Close the database connection."""
        try:
            if self.conn:
                self.conn.close()
                logger.debug("Closed database connection")
        except Exception as e:
            logger.error(f"Error closing database connection: {str(e)}")
