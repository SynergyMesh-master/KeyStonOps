"""
Run State Machine

Manages the lifecycle of analysis runs:
- queued → running → completed/failed/canceled

Features:
- Queryable state
- Replayable transitions
- Full audit trail
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Protocol, Set
from uuid import UUID, uuid4
from enum import Enum
import logging


logger = logging.getLogger(__name__)


class RunState(Enum):
    """Run lifecycle states"""
    QUEUED = "queued"           # Waiting to be processed
    PREPARING = "preparing"     # Setting up (cloning, etc.)
    RUNNING = "running"         # Analysis in progress
    COMPLETED = "completed"     # Successfully completed
    FAILED = "failed"          # Failed with error
    CANCELED = "canceled"      # Manually canceled
    TIMED_OUT = "timed_out"    # Exceeded timeout
    SKIPPED = "skipped"        # Skipped (e.g., policy doesn't apply)


# Valid state transitions
VALID_TRANSITIONS: Dict[RunState, Set[RunState]] = {
    RunState.QUEUED: {RunState.PREPARING, RunState.RUNNING, RunState.CANCELED, RunState.SKIPPED},
    RunState.PREPARING: {RunState.RUNNING, RunState.FAILED, RunState.CANCELED, RunState.TIMED_OUT},
    RunState.RUNNING: {RunState.COMPLETED, RunState.FAILED, RunState.CANCELED, RunState.TIMED_OUT},
    RunState.COMPLETED: set(),  # Terminal state
    RunState.FAILED: set(),     # Terminal state
    RunState.CANCELED: set(),   # Terminal state
    RunState.TIMED_OUT: set(),  # Terminal state
    RunState.SKIPPED: set(),    # Terminal state
}


class TransitionType(Enum):
    """Types of state transitions"""
    AUTOMATIC = "automatic"     # System-initiated
    MANUAL = "manual"          # User-initiated
    TIMEOUT = "timeout"        # Timeout-triggered
    ERROR = "error"            # Error-triggered


@dataclass
class RunTransition:
    """
    Record of a state transition

    Creates a complete audit trail of state changes.
    """
    id: UUID = field(default_factory=uuid4)
    run_id: UUID = field(default_factory=uuid4)

    # Transition details
    from_state: RunState = RunState.QUEUED
    to_state: RunState = RunState.RUNNING
    transition_type: TransitionType = TransitionType.AUTOMATIC

    # Context
    reason: str = ""
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Who/what triggered
    triggered_by: Optional[str] = None  # User ID or "system"
    worker_id: Optional[str] = None

    # Timing
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Run:
    """
    Analysis run entity

    Represents a single analysis execution.
    """
    id: UUID = field(default_factory=uuid4)

    # Tenant isolation
    org_id: UUID = field(default_factory=uuid4)

    # Context
    repo_id: UUID = field(default_factory=uuid4)
    repo_full_name: str = ""
    event_id: Optional[UUID] = None
    job_id: Optional[UUID] = None
    correlation_id: Optional[UUID] = None

    # Git context
    head_sha: str = ""
    base_sha: Optional[str] = None
    ref: Optional[str] = None
    pr_number: Optional[int] = None

    # State
    state: RunState = RunState.QUEUED
    previous_state: Optional[RunState] = None

    # Execution
    run_type: str = ""          # "gate", "report", "scan"
    policy_ids: List[UUID] = field(default_factory=list)
    tools: List[str] = field(default_factory=list)  # Tools to run

    # Results
    result: Optional[Dict[str, Any]] = None
    findings_count: int = 0
    error: Optional[str] = None

    # Write-back
    check_run_id: Optional[int] = None
    status_id: Optional[int] = None
    comment_id: Optional[int] = None

    # Timing
    created_at: datetime = field(default_factory=datetime.utcnow)
    queued_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Timeouts
    timeout_seconds: int = 600
    deadline: Optional[datetime] = None

    # Worker
    worker_id: Optional[str] = None
    worker_version: Optional[str] = None

    # Retry
    attempt: int = 1
    max_attempts: int = 3

    # Transitions history (for audit)
    transitions: List[RunTransition] = field(default_factory=list)

    @property
    def is_terminal(self) -> bool:
        """Check if run is in a terminal state"""
        return self.state in {
            RunState.COMPLETED,
            RunState.FAILED,
            RunState.CANCELED,
            RunState.TIMED_OUT,
            RunState.SKIPPED,
        }

    @property
    def duration_seconds(self) -> Optional[float]:
        """Get run duration in seconds"""
        if not self.started_at:
            return None
        end = self.completed_at or datetime.utcnow()
        return (end - self.started_at).total_seconds()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": str(self.id),
            "org_id": str(self.org_id),
            "repo_id": str(self.repo_id),
            "repo_full_name": self.repo_full_name,
            "event_id": str(self.event_id) if self.event_id else None,
            "job_id": str(self.job_id) if self.job_id else None,
            "correlation_id": str(self.correlation_id) if self.correlation_id else None,
            "head_sha": self.head_sha,
            "base_sha": self.base_sha,
            "ref": self.ref,
            "pr_number": self.pr_number,
            "state": self.state.value,
            "previous_state": self.previous_state.value if self.previous_state else None,
            "run_type": self.run_type,
            "policy_ids": [str(p) for p in self.policy_ids],
            "tools": self.tools,
            "result": self.result,
            "findings_count": self.findings_count,
            "error": self.error,
            "check_run_id": self.check_run_id,
            "created_at": self.created_at.isoformat(),
            "queued_at": self.queued_at.isoformat() if self.queued_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "timeout_seconds": self.timeout_seconds,
            "worker_id": self.worker_id,
            "attempt": self.attempt,
            "duration_seconds": self.duration_seconds,
        }


class InvalidTransitionError(Exception):
    """Raised when an invalid state transition is attempted"""
    pass


class RunStorage(Protocol):
    """Storage interface for runs"""

    async def save(self, run: Run) -> Run:
        ...

    async def get(self, run_id: UUID) -> Optional[Run]:
        ...

    async def update(self, run: Run) -> Run:
        ...

    async def query(
        self,
        org_id: UUID,
        state: Optional[RunState] = None,
        repo_id: Optional[UUID] = None,
        head_sha: Optional[str] = None,
        pr_number: Optional[int] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[Run]:
        ...

    async def save_transition(self, transition: RunTransition) -> RunTransition:
        ...

    async def get_transitions(self, run_id: UUID) -> List[RunTransition]:
        ...


class EventPublisher(Protocol):
    """Interface for publishing run events"""

    async def publish(self, event_type: str, payload: Dict[str, Any]) -> None:
        ...


@dataclass
class RunStateMachine:
    """
    Run State Machine

    Manages run lifecycle with:
    - Valid state transitions
    - Transition audit trail
    - Event publishing
    """

    storage: RunStorage
    event_publisher: Optional[EventPublisher] = None

    # ------------------------------------------------------------------
    # Run Creation
    # ------------------------------------------------------------------

    async def create_run(
        self,
        org_id: UUID,
        repo_id: UUID,
        repo_full_name: str,
        head_sha: str,
        run_type: str,
        event_id: Optional[UUID] = None,
        job_id: Optional[UUID] = None,
        base_sha: Optional[str] = None,
        ref: Optional[str] = None,
        pr_number: Optional[int] = None,
        policy_ids: Optional[List[UUID]] = None,
        tools: Optional[List[str]] = None,
        timeout_seconds: int = 600,
    ) -> Run:
        """
        Create a new run in QUEUED state

        Args:
            org_id: Organization ID
            repo_id: Repository ID
            repo_full_name: Repository full name
            head_sha: Commit SHA to analyze
            run_type: Type of run (gate, report, scan)
            event_id: Source event ID
            job_id: Associated job ID
            base_sha: Base SHA for diff analysis
            ref: Git ref (branch)
            pr_number: PR number
            policy_ids: Policies to apply
            tools: Tools to run
            timeout_seconds: Run timeout

        Returns:
            Created run
        """
        run = Run(
            org_id=org_id,
            repo_id=repo_id,
            repo_full_name=repo_full_name,
            event_id=event_id,
            job_id=job_id,
            correlation_id=uuid4(),
            head_sha=head_sha,
            base_sha=base_sha,
            ref=ref,
            pr_number=pr_number,
            state=RunState.QUEUED,
            run_type=run_type,
            policy_ids=policy_ids or [],
            tools=tools or [],
            timeout_seconds=timeout_seconds,
            queued_at=datetime.utcnow(),
            deadline=datetime.utcnow() + timedelta(seconds=timeout_seconds),
        )

        run = await self.storage.save(run)

        # Record initial transition
        transition = RunTransition(
            run_id=run.id,
            from_state=RunState.QUEUED,  # Initial state
            to_state=RunState.QUEUED,
            transition_type=TransitionType.AUTOMATIC,
            reason="Run created",
        )
        await self.storage.save_transition(transition)
        run.transitions.append(transition)

        # Publish event
        if self.event_publisher:
            await self.event_publisher.publish(
                "run.created",
                run.to_dict(),
            )

        logger.info(
            f"Run created: id={run.id} type={run_type} "
            f"repo={repo_full_name} sha={head_sha[:8]}"
        )

        return run

    # ------------------------------------------------------------------
    # State Transitions
    # ------------------------------------------------------------------

    async def transition(
        self,
        run_id: UUID,
        to_state: RunState,
        reason: str = "",
        error: Optional[str] = None,
        transition_type: TransitionType = TransitionType.AUTOMATIC,
        triggered_by: Optional[str] = None,
        worker_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Run:
        """
        Transition a run to a new state

        Args:
            run_id: Run ID
            to_state: Target state
            reason: Reason for transition
            error: Error message (for failed transitions)
            transition_type: Type of transition
            triggered_by: Who triggered (user ID or "system")
            worker_id: Worker ID (if applicable)
            metadata: Additional transition metadata

        Returns:
            Updated run

        Raises:
            InvalidTransitionError: If transition is not valid
        """
        run = await self.storage.get(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        # Validate transition
        valid_targets = VALID_TRANSITIONS.get(run.state, set())
        if to_state not in valid_targets:
            raise InvalidTransitionError(
                f"Invalid transition: {run.state.value} → {to_state.value}"
            )

        # Record transition
        transition = RunTransition(
            run_id=run_id,
            from_state=run.state,
            to_state=to_state,
            transition_type=transition_type,
            reason=reason,
            error=error,
            triggered_by=triggered_by,
            worker_id=worker_id,
            metadata=metadata or {},
        )
        await self.storage.save_transition(transition)

        # Update run state
        run.previous_state = run.state
        run.state = to_state

        # Update timestamps
        if to_state == RunState.RUNNING:
            run.started_at = datetime.utcnow()
            run.worker_id = worker_id

        if to_state in {RunState.COMPLETED, RunState.FAILED, RunState.CANCELED, RunState.TIMED_OUT}:
            run.completed_at = datetime.utcnow()

        if error:
            run.error = error

        run.transitions.append(transition)
        run = await self.storage.update(run)

        # Publish event
        if self.event_publisher:
            await self.event_publisher.publish(
                f"run.{to_state.value}",
                {
                    **run.to_dict(),
                    "transition": {
                        "from": transition.from_state.value,
                        "to": transition.to_state.value,
                        "reason": reason,
                    },
                },
            )

        logger.info(
            f"Run transitioned: id={run_id} "
            f"{transition.from_state.value} → {to_state.value} "
            f"reason={reason}"
        )

        return run

    # ------------------------------------------------------------------
    # Convenience Methods
    # ------------------------------------------------------------------

    async def start_run(
        self,
        run_id: UUID,
        worker_id: str,
    ) -> Run:
        """Start a run (QUEUED → RUNNING)"""
        return await self.transition(
            run_id=run_id,
            to_state=RunState.RUNNING,
            reason="Worker started processing",
            worker_id=worker_id,
        )

    async def complete_run(
        self,
        run_id: UUID,
        result: Dict[str, Any],
        findings_count: int = 0,
    ) -> Run:
        """Complete a run successfully"""
        run = await self.storage.get(run_id)
        if not run:
            raise ValueError(f"Run not found: {run_id}")

        run.result = result
        run.findings_count = findings_count
        await self.storage.update(run)

        return await self.transition(
            run_id=run_id,
            to_state=RunState.COMPLETED,
            reason="Analysis completed successfully",
            metadata={"findings_count": findings_count},
        )

    async def fail_run(
        self,
        run_id: UUID,
        error: str,
    ) -> Run:
        """Mark a run as failed"""
        return await self.transition(
            run_id=run_id,
            to_state=RunState.FAILED,
            reason="Analysis failed",
            error=error,
            transition_type=TransitionType.ERROR,
        )

    async def cancel_run(
        self,
        run_id: UUID,
        canceled_by: str,
        reason: str = "Manually canceled",
    ) -> Run:
        """Cancel a run"""
        return await self.transition(
            run_id=run_id,
            to_state=RunState.CANCELED,
            reason=reason,
            transition_type=TransitionType.MANUAL,
            triggered_by=canceled_by,
        )

    async def timeout_run(
        self,
        run_id: UUID,
    ) -> Run:
        """Mark a run as timed out"""
        return await self.transition(
            run_id=run_id,
            to_state=RunState.TIMED_OUT,
            reason="Run exceeded timeout",
            transition_type=TransitionType.TIMEOUT,
        )

    async def skip_run(
        self,
        run_id: UUID,
        reason: str,
    ) -> Run:
        """Skip a run (e.g., policy doesn't apply)"""
        return await self.transition(
            run_id=run_id,
            to_state=RunState.SKIPPED,
            reason=reason,
        )

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    async def get_run(self, run_id: UUID) -> Optional[Run]:
        """Get a run by ID"""
        return await self.storage.get(run_id)

    async def get_run_with_transitions(self, run_id: UUID) -> Optional[Run]:
        """Get a run with full transition history"""
        run = await self.storage.get(run_id)
        if run:
            run.transitions = await self.storage.get_transitions(run_id)
        return run

    async def list_runs(
        self,
        org_id: UUID,
        state: Optional[RunState] = None,
        repo_id: Optional[UUID] = None,
        head_sha: Optional[str] = None,
        pr_number: Optional[int] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> List[Run]:
        """List runs with filters"""
        return await self.storage.query(
            org_id=org_id,
            state=state,
            repo_id=repo_id,
            head_sha=head_sha,
            pr_number=pr_number,
            offset=offset,
            limit=limit,
        )

    async def get_latest_run(
        self,
        org_id: UUID,
        repo_id: UUID,
        head_sha: str,
        run_type: Optional[str] = None,
    ) -> Optional[Run]:
        """Get the most recent run for a commit"""
        runs = await self.storage.query(
            org_id=org_id,
            repo_id=repo_id,
            head_sha=head_sha,
            limit=10,
        )

        if run_type:
            runs = [r for r in runs if r.run_type == run_type]

        return runs[0] if runs else None

    # ------------------------------------------------------------------
    # Timeout Monitoring
    # ------------------------------------------------------------------

    async def check_timeouts(
        self,
        org_id: Optional[UUID] = None,
    ) -> int:
        """
        Check for timed out runs and transition them

        Should be called periodically by a background job.
        """
        # Query for runs past their deadline
        # This depends on storage implementation
        count = 0

        # Example: Get all running runs and check deadline
        running_runs = await self.storage.query(
            org_id=org_id,
            state=RunState.RUNNING,
            limit=1000,
        )

        now = datetime.utcnow()

        for run in running_runs:
            if run.deadline and now > run.deadline:
                await self.timeout_run(run.id)
                count += 1

        if count > 0:
            logger.warning(f"Timed out {count} runs")

        return count

    # ------------------------------------------------------------------
    # Replay
    # ------------------------------------------------------------------

    async def replay_run(
        self,
        run_id: UUID,
    ) -> Run:
        """
        Create a new run as a replay of an existing one

        Useful for retrying failed or timed-out runs.
        """
        original = await self.storage.get(run_id)
        if not original:
            raise ValueError(f"Run not found: {run_id}")

        new_run = await self.create_run(
            org_id=original.org_id,
            repo_id=original.repo_id,
            repo_full_name=original.repo_full_name,
            head_sha=original.head_sha,
            run_type=original.run_type,
            event_id=original.event_id,
            base_sha=original.base_sha,
            ref=original.ref,
            pr_number=original.pr_number,
            policy_ids=original.policy_ids,
            tools=original.tools,
            timeout_seconds=original.timeout_seconds,
        )

        new_run.attempt = original.attempt + 1
        await self.storage.update(new_run)

        logger.info(
            f"Run replayed: original={run_id} new={new_run.id} "
            f"attempt={new_run.attempt}"
        )

        return new_run
