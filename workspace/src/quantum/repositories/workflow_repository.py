"""
Repository for workflow persistence.
Implements data access layer following Clean Architecture.
"""
import sqlite3
import json
from typing import List, Optional
from pathlib import Path
from datetime import datetime

from backend.python.core.entities import Workflow, Task, TaskType, WorkflowStatus, TaskStatus
from backend.python.core.exceptions import DatabaseError
from backend.python.core.logging_config import get_logger
from backend.python.config import get_settings

logger = get_logger(__name__)


class WorkflowRepository:
    """Repository for workflow persistence using SQLite."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize workflow repository.
        
        Args:
            db_path: Path to SQLite database (defaults to config value)
        """
        settings = get_settings()
        self.db_path = Path(db_path or settings.database_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = None
        self._init_db()
    
    def _init_db(self) -> None:
        """Initialize SQLite database schema."""
        try:
            self.conn = sqlite3.connect(
                str(self.db_path),
                check_same_thread=False,
                timeout=30.0
            )
            self.conn.row_factory = sqlite3.Row
            
            cursor = self.conn.cursor()
            
            # Workflows table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS workflows (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    tasks TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    metadata TEXT DEFAULT '{}'
                )
            ''')
            
            # Performance metrics table
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
                    FOREIGN KEY (workflow_id) REFERENCES workflows(id),
                    UNIQUE(workflow_id, task_id)
                )
            ''')
            
            # Create indexes
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_workflows_status 
                ON workflows(status)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_metrics_workflow 
                ON performance_metrics(workflow_id)
            ''')
            
            self.conn.commit()
            logger.info(f"Initialized database at {self.db_path}")
            
        except sqlite3.Error as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            raise DatabaseError(f"Database initialization failed: {str(e)}")
    
    def save(self, workflow: Workflow) -> int:
        """
        Save a workflow to the database.
        
        Args:
            workflow: Workflow entity to save
            
        Returns:
            Workflow ID
            
        Raises:
            DatabaseError: If save operation fails
        """
        try:
            cursor = self.conn.cursor()
            
            # Serialize tasks
            tasks_data = []
            for task in workflow.tasks:
                tasks_data.append({
                    "id": task.id,
                    "type": task.type.value,
                    "config": task.config,
                    "dependencies": task.dependencies,
                    "status": task.status.value,
                    "result": task.result,
                    "error": task.error,
                    "created_at": task.created_at.isoformat() if task.created_at else None,
                    "started_at": task.started_at.isoformat() if task.started_at else None,
                    "completed_at": task.completed_at.isoformat() if task.completed_at else None
                })
            
            tasks_json = json.dumps(tasks_data)
            metadata_json = json.dumps(workflow.metadata)
            
            if workflow.id is None:
                # Insert new workflow
                cursor.execute('''
                    INSERT INTO workflows (name, tasks, status, created_at, started_at, completed_at, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    workflow.name,
                    tasks_json,
                    workflow.status.value,
                    workflow.created_at.isoformat() if workflow.created_at else datetime.utcnow().isoformat(),
                    workflow.started_at.isoformat() if workflow.started_at else None,
                    workflow.completed_at.isoformat() if workflow.completed_at else None,
                    metadata_json
                ))
                workflow_id = cursor.lastrowid
            else:
                # Update existing workflow
                cursor.execute('''
                    UPDATE workflows 
                    SET name = ?, tasks = ?, status = ?, started_at = ?, completed_at = ?, metadata = ?
                    WHERE id = ?
                ''', (
                    workflow.name,
                    tasks_json,
                    workflow.status.value,
                    workflow.started_at.isoformat() if workflow.started_at else None,
                    workflow.completed_at.isoformat() if workflow.completed_at else None,
                    metadata_json,
                    workflow.id
                ))
                workflow_id = workflow.id
            
            self.conn.commit()
            logger.debug(f"Saved workflow '{workflow.name}' with ID {workflow_id}")
            
            return workflow_id
            
        except sqlite3.Error as e:
            self.conn.rollback()
            logger.error(f"Error saving workflow: {str(e)}")
            raise DatabaseError(f"Failed to save workflow: {str(e)}")
    
    def get_by_id(self, workflow_id: int) -> Optional[Workflow]:
        """
        Get a workflow by ID.
        
        Args:
            workflow_id: Workflow ID
            
        Returns:
            Workflow entity or None if not found
            
        Raises:
            DatabaseError: If query fails
        """
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                SELECT id, name, tasks, status, created_at, started_at, completed_at, metadata
                FROM workflows
                WHERE id = ?
            ''', (workflow_id,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            # Deserialize tasks
            tasks_data = json.loads(row['tasks'])
            tasks = []
            for task_data in tasks_data:
                task = Task(
                    id=task_data['id'],
                    type=TaskType(task_data['type']),
                    config=task_data['config'],
                    dependencies=task_data.get('dependencies', []),
                    status=TaskStatus(task_data.get('status', 'pending'))
                )
                task.result = task_data.get('result')
                task.error = task_data.get('error')
                if task_data.get('created_at'):
                    task.created_at = datetime.fromisoformat(task_data['created_at'])
                if task_data.get('started_at'):
                    task.started_at = datetime.fromisoformat(task_data['started_at'])
                if task_data.get('completed_at'):
                    task.completed_at = datetime.fromisoformat(task_data['completed_at'])
                tasks.append(task)
            
            # Parse timestamps
            created_at = datetime.fromisoformat(row['created_at']) if row['created_at'] else None
            started_at = datetime.fromisoformat(row['started_at']) if row['started_at'] else None
            completed_at = datetime.fromisoformat(row['completed_at']) if row['completed_at'] else None
            
            metadata = json.loads(row['metadata']) if row['metadata'] else {}
            
            workflow = Workflow(
                id=row['id'],
                name=row['name'],
                tasks=tasks,
                status=WorkflowStatus(row['status']),
                created_at=created_at,
                started_at=started_at,
                completed_at=completed_at,
                metadata=metadata
            )
            
            return workflow
            
        except (sqlite3.Error, json.JSONDecodeError, ValueError) as e:
            logger.error(f"Error getting workflow {workflow_id}: {str(e)}")
            raise DatabaseError(f"Failed to get workflow: {str(e)}")
    
    def list(self, limit: int = 100, offset: int = 0) -> List[Workflow]:
        """
        List workflows with pagination.
        
        Args:
            limit: Maximum number of workflows to return
            offset: Number of workflows to skip
            
        Returns:
            List of workflow entities
            
        Raises:
            DatabaseError: If query fails
        """
        try:
            cursor = self.conn.cursor()
            cursor.execute('''
                SELECT id, name, tasks, status, created_at, started_at, completed_at, metadata
                FROM workflows
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', (limit, offset))
            
            workflows = []
            for row in cursor.fetchall():
                # Deserialize tasks (simplified for list view)
                tasks_data = json.loads(row['tasks'])
                tasks = []
                for task_data in tasks_data:
                    task = Task(
                        id=task_data['id'],
                        type=TaskType(task_data['type']),
                        config=task_data['config'],
                        dependencies=task_data.get('dependencies', []),
                        status=TaskStatus(task_data.get('status', 'pending'))
                    )
                    tasks.append(task)
                
                created_at = datetime.fromisoformat(row['created_at']) if row['created_at'] else None
                started_at = datetime.fromisoformat(row['started_at']) if row['started_at'] else None
                completed_at = datetime.fromisoformat(row['completed_at']) if row['completed_at'] else None
                metadata = json.loads(row['metadata']) if row['metadata'] else {}
                
                workflow = Workflow(
                    id=row['id'],
                    name=row['name'],
                    tasks=tasks,
                    status=WorkflowStatus(row['status']),
                    created_at=created_at,
                    started_at=started_at,
                    completed_at=completed_at,
                    metadata=metadata
                )
                workflows.append(workflow)
            
            return workflows
            
        except (sqlite3.Error, json.JSONDecodeError, ValueError) as e:
            logger.error(f"Error listing workflows: {str(e)}")
            raise DatabaseError(f"Failed to list workflows: {str(e)}")
    
    def update(self, workflow: Workflow) -> None:
        """
        Update an existing workflow.
        
        Args:
            workflow: Workflow entity to update
            
        Raises:
            DatabaseError: If update fails
        """
        if workflow.id is None:
            raise DatabaseError("Cannot update workflow without ID")
        self.save(workflow)
    
    def close(self) -> None:
        """Close database connection."""
        try:
            if self.conn:
                self.conn.close()
                logger.info("Closed database connection")
        except Exception as e:
            logger.error(f"Error closing database connection: {str(e)}")

