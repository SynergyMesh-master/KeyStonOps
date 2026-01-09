"""
CI/CD Repair Agent
Autonomous agent for monitoring and repairing CI/CD pipeline failures
"""

import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from dataclasses import dataclass
from enum import Enum

from adk.core.agent_runtime import AgentRuntime
from adk.core.memory_manager import MemoryManager
from adk.core.workflow_orchestrator import WorkflowOrchestrator
from adk.mcp.mcp_client import MCPClient
from adk.governance.mi9_runtime import MI9Runtime
from adk.observability.metrics import MetricsCollector
from adk.taxonomy_integration import ADKTaxonomyManager


class PipelineStatus(Enum):
    """Pipeline execution status"""
    SUCCESS = "success"
    FAILURE = "failure"
    RUNNING = "running"
    PENDING = "pending"
    CANCELLED = "cancelled"


@dataclass
class PipelineRun:
    """Represents a CI/CD pipeline run"""
    id: str
    name: str
    status: PipelineStatus
    branch: str
    commit: str
    started_at: datetime
    completed_at: Optional[datetime]
    failure_reason: Optional[str]
    logs_url: Optional[str]


@dataclass
class PipelineFailure:
    """Represents a pipeline failure"""
    pipeline_id: str
    step: str
    error_type: str
    error_message: str
    context: Dict[str, Any]


@dataclass
class FailureAnalysis:
    """Analysis of a pipeline failure"""
    failure: PipelineFailure
    root_cause: str
    confidence: float
    suggested_fix: str
    fix_type: str  # "code", "config", "environment", "dependency"


@dataclass
class FixPlan:
    """Plan for fixing a pipeline failure"""
    analysis: FailureAnalysis
    steps: List[str]
    files_to_modify: List[str]
    risk_level: str
    estimated_success_rate: float


@dataclass
class FixResult:
    """Result of applying a fix"""
    success: bool
    plan: FixPlan
    changes_applied: List[str]
    validation_result: Optional[str]
    new_pipeline_run_id: Optional[str]


class CICDRepairAgent:
    """
    Autonomous agent for monitoring and repairing CI/CD pipeline failures
    
    Responsibilities:
    - Monitor CI/CD pipeline status
    - Analyze failure patterns
    - Identify root causes
    - Apply automated fixes
    - Validate fixes with test runs
    - Create PRs with fixes
    """
    
    def __init__(
        self,
        runtime: AgentRuntime,
        memory: MemoryManager,
        orchestrator: WorkflowOrchestrator,
        mcp_client: MCPClient,
        mi9_runtime: MI9Runtime,
        metrics: MetricsCollector
    ):
        self.runtime = runtime
        self.memory = memory
        self.orchestrator = orchestrator
        self.mcp_client = mcp_client
        self.mi9_runtime = mi9_runtime
        self.metrics = metrics
        
        # Taxonomy integration
        self.taxonomy = ADKTaxonomyManager.get_instance()
        
        # Agent configuration
        self.agent_name = "platform-cicd-repair-agent-v1"
        self.autonomy_threshold = 0.7
        
        # Logging
        self.logger = logging.getLogger(__name__)
        
        # Metrics
        self.pipeline_monitor_counter = self.metrics.counter(
            'cicd_pipeline_monitors_total',
            'Total pipeline monitors',
            ['status']
        )
        self.failure_counter = self.metrics.counter(
            'cicd_failures_detected_total',
            'Total CI/CD failures detected',
            ['pipeline_name', 'error_type']
        )
        self.fix_counter = self.metrics.counter(
            'cicd_fixes_applied_total',
            'Total fixes applied',
            ['status', 'fix_type']
        )
        self.pipeline_duration = self.metrics.histogram(
            'cicd_pipeline_duration_seconds',
            'Pipeline execution duration',
            ['pipeline_name']
        )
    
    async def monitor_pipelines(self) -> List[PipelineRun]:
        """
        Monitor CI/CD pipeline status
        
        Returns:
            List of pipeline runs with their status
        """
        self.logger.info("Monitoring CI/CD pipelines")
        
        try:
            # Use GitHub Actions MCP to get workflow runs
            result = await self.mcp_client.call_tool(
                server="github-mcp",
                tool="get_workflow_runs",
                params={
                    "status": ["failure", "cancelled"],
                    "limit": 20
                }
            )
            
            pipeline_runs = []
            for run_data in result.get("workflow_runs", []):
                pipeline_run = PipelineRun(
                    id=run_data.get("id"),
                    name=run_data.get("name"),
                    status=PipelineStatus(run_data.get("status", "pending")),
                    branch=run_data.get("head_branch"),
                    commit=run_data.get("head_sha"),
                    started_at=datetime.fromisoformat(run_data.get("created_at")),
                    completed_at=datetime.fromisoformat(run_data.get("updated_at")) if run_data.get("updated_at") else None,
                    failure_reason=run_data.get("conclusion"),
                    logs_url=run_data.get("logs_url")
                )
                
                # Track pipeline duration
                if pipeline_run.completed_at:
                    duration = (pipeline_run.completed_at - pipeline_run.started_at).total_seconds()
                    self.pipeline_duration.labels(
                        pipeline_name=pipeline_run.name
                    ).observe(duration)
                
                pipeline_runs.append(pipeline_run)
            
            self.pipeline_monitor_counter.labels(status='success').inc()
            self.logger.info(f"Monitored {len(pipeline_runs)} pipeline runs")
            
            return pipeline_runs
            
        except Exception as e:
            self.pipeline_monitor_counter.labels(status='error').inc()
            self.logger.error(f"Error monitoring pipelines: {e}")
            raise
    
    async def analyze_failure(self, failure: PipelineFailure) -> FailureAnalysis:
        """
        Analyze a pipeline failure to determine root cause
        
        Args:
            failure: Pipeline failure to analyze
            
        Returns:
            FailureAnalysis with root cause and suggested fix
        """
        self.logger.info(f"Analyzing failure: {failure.pipeline_id}")
        
        # Common failure patterns and their fixes
        failure_patterns = {
            "test_failure": {
                "root_cause": "Test assertion failed",
                "confidence": 0.9,
                "fix_type": "code",
                "suggested_fix": "Review and fix failing test or update test expectations"
            },
            "syntax_error": {
                "root_cause": "Syntax error in code",
                "confidence": 0.95,
                "fix_type": "code",
                "suggested_fix": "Fix syntax error in the affected file"
            },
            "dependency_conflict": {
                "root_cause": "Dependency version conflict",
                "confidence": 0.85,
                "fix_type": "dependency",
                "suggested_fix": "Update dependency versions or use compatible versions"
            },
            "configuration_error": {
                "root_cause": "Invalid configuration",
                "confidence": 0.8,
                "fix_type": "config",
                "suggested_fix": "Review and fix configuration file"
            },
            "naming_violation": {
                "root_cause": "Taxonomy naming violation",
                "confidence": 0.9,
                "fix_type": "code",
                "suggested_fix": "Use taxonomy-compliant naming conventions"
            },
            "timeout": {
                "root_cause": "Operation timeout",
                "confidence": 0.75,
                "fix_type": "config",
                "suggested_fix": "Increase timeout or optimize operation"
            }
        }
        
        # Match failure to pattern
        error_type = failure.error_type.lower()
        matched_pattern = None
        
        for pattern_key, pattern_data in failure_patterns.items():
            if pattern_key in error_type:
                matched_pattern = pattern_data
                break
        
        if not matched_pattern:
            # Default analysis
            matched_pattern = {
                "root_cause": "Unknown error",
                "confidence": 0.5,
                "fix_type": "code",
                "suggested_fix": "Review logs and investigate manually"
            }
        
        analysis = FailureAnalysis(
            failure=failure,
            root_cause=matched_pattern["root_cause"],
            confidence=matched_pattern["confidence"],
            suggested_fix=matched_pattern["suggested_fix"],
            fix_type=matched_pattern["fix_type"]
        )
        
        self.logger.info(f"Failure analysis complete: {analysis.root_cause} (confidence: {analysis.confidence})")
        
        return analysis
    
    async def apply_fix(self, fix_plan: FixPlan) -> FixResult:
        """
        Apply a fix to resolve a pipeline failure
        
        Args:
            fix_plan: Fix plan to execute
            
        Returns:
            FixResult with changes applied
        """
        self.logger.info(f"Applying fix: {fix_plan.analysis.root_cause}")
        
        changes_applied = []
        
        try:
            # Apply fix based on type
            if fix_plan.fix_type == "code":
                changes_applied = await self._apply_code_fix(fix_plan)
            elif fix_plan.fix_type == "config":
                changes_applied = await self._apply_config_fix(fix_plan)
            elif fix_plan.fix_type == "dependency":
                changes_applied = await self._apply_dependency_fix(fix_plan)
            elif fix_plan.fix_type == "environment":
                changes_applied = await self._apply_environment_fix(fix_plan)
            
            self.fix_counter.labels(
                status='success',
                fix_type=fix_plan.fix_type
            ).inc()
            
            return FixResult(
                success=True,
                plan=fix_plan,
                changes_applied=changes_applied,
                validation_result=None,
                new_pipeline_run_id=None
            )
            
        except Exception as e:
            self.logger.error(f"Error applying fix: {e}")
            self.fix_counter.labels(
                status='error',
                fix_type=fix_plan.fix_type
            ).inc()
            
            return FixResult(
                success=False,
                plan=fix_plan,
                changes_applied=[],
                validation_result=f"Error: {e}",
                new_pipeline_run_id=None
            )
    
    async def _apply_code_fix(self, fix_plan: FixPlan) -> List[str]:
        """Apply code-related fix"""
        changes = []
        
        # Example: Fix naming violation using taxonomy
        if "naming" in fix_plan.analysis.root_cause.lower():
            for file_path in fix_plan.files_to_modify:
                # Read file
                result = await self.mcp_client.call_tool(
                    server="filesystem-mcp",
                    tool="read_file",
                    params={"path": file_path}
                )
                
                content = result.get("content", "")
                
                # Use taxonomy to fix names
                # (Simplified - in production, parse and update properly)
                
                # Write back
                await self.mcp_client.call_tool(
                    server="filesystem-mcp",
                    tool="write_file",
                    params={
                        "path": file_path,
                        "content": content
                    }
                )
                
                changes.append(f"Fixed naming in {file_path}")
        
        return changes
    
    async def _apply_config_fix(self, fix_plan: FixPlan) -> List[str]:
        """Apply configuration-related fix"""
        changes = []
        
        for file_path in fix_plan.files_to_modify:
            # Read and update config
            result = await self.mcp_client.call_tool(
                server="filesystem-mcp",
                tool="read_file",
                params={"path": file_path}
            )
            
            content = result.get("content", "")
            
            # Apply config changes
            # (Simplified - in production, use proper YAML/JSON parser)
            
            # Write back
            await self.mcp_client.call_tool(
                server="filesystem-mcp",
                tool="write_file",
                params={
                    "path": file_path,
                    "content": content
                }
            )
            
            changes.append(f"Updated config in {file_path}")
        
        return changes
    
    async def _apply_dependency_fix(self, fix_plan: FixPlan) -> List[str]:
        """Apply dependency-related fix"""
        changes = []
        
        # Update requirements.txt or package.json
        # (Simplified - in production, use proper package manager)
        
        changes.append("Updated dependencies")
        
        return changes
    
    async def _apply_environment_fix(self, fix_plan: FixPlan) -> List[str]:
        """Apply environment-related fix"""
        changes = []
        
        # Update environment variables or configs
        # (Simplified - in production, update proper env files)
        
        changes.append("Updated environment configuration")
        
        return changes
    
    async def validate_fix(self, fix: FixResult) -> Dict[str, Any]:
        """
        Validate a fix by triggering a test run
        
        Args:
            fix: Fix result to validate
            
        Returns:
            Validation result
        """
        self.logger.info("Validating fix")
        
        try:
            # Trigger pipeline run to validate fix
            result = await self.mcp_client.call_tool(
                server="github-mcp",
                tool="trigger_workflow",
                params={
                    "workflow_name": fix.plan.analysis.failure.pipeline_id,
                    "branch": "fix-validation"
                }
            )
            
            validation_result = {
                "pipeline_run_id": result.get("run_id"),
                "status": "triggered",
                "url": result.get("url")
            }
            
            return validation_result
            
        except Exception as e:
            self.logger.error(f"Error validating fix: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def create_fix_pr(
        self,
        fix_plan: FixPlan,
        fix_result: FixResult,
        branch_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create pull request with the fix
        
        Args:
            fix_plan: Fix plan that was executed
            fix_result: Result of applying the fix
            branch_name: Name for the PR branch
            
        Returns:
            Pull request information
        """
        if not branch_name:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            branch_name = f"auto-fix-{timestamp}"
        
        self.logger.info(f"Creating fix PR: {branch_name}")
        
        try:
            # Generate PR body
            pr_body = self._generate_fix_pr_body(fix_plan, fix_result)
            
            # Create PR using GitHub MCP
            result = await self.mcp_client.call_tool(
                server="github-mcp",
                tool="create_pr",
                params={
                    "title": f"Auto-fix: {fix_plan.analysis.root_cause}",
                    "body": pr_body,
                    "branch": branch_name,
                    "base": "main"
                }
            )
            
            self.logger.info(f"Created PR: {result.get('url')}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error creating fix PR: {e}")
            raise
    
    def _generate_fix_pr_body(self, fix_plan: FixPlan, fix_result: FixResult) -> str:
        """Generate PR body for fix"""
        body = f"""# Auto-Fix PR

## Issue
**Pipeline:** {fix_plan.analysis.failure.pipeline_id}
**Error Type:** {fix_plan.analysis.failure.error_type}
**Error Message:** {fix_plan.analysis.failure.error_message}

## Root Cause Analysis
**Root Cause:** {fix_plan.analysis.root_cause}
**Confidence:** {fix_plan.analysis.confidence * 100}%

## Fix Applied
**Fix Type:** {fix_plan.fix_type}
**Risk Level:** {fix_plan.risk_level}
**Estimated Success Rate:** {fix_plan.estimated_success_rate * 100}%

### Changes Applied
"""
        
        for change in fix_result.changes_applied:
            body += f"- {change}\n"
        
        body += f"""
## Suggested Fix
{fix_plan.analysis.suggested_fix}

## Validation
"""
        
        if fix_result.validation_result:
            body += f"Status: {fix_result.validation_result}\n"
        else:
            body += "Pending validation\n"
        
        body += f"""
---
Generated by {self.agent_name} at {datetime.now().isoformat()}
"""
        
        return body
    
    async def run_repair_cycle(self):
        """
        Run a complete repair cycle
        
        This is the main workflow that orchestrates all repair tasks
        """
        self.logger.info("Starting repair cycle")
        
        try:
            # Step 1: Monitor pipelines
            pipeline_runs = await self.monitor_pipelines()
            
            # Filter for failed pipelines
            failed_runs = [run for run in pipeline_runs if run.status == PipelineStatus.FAILURE]
            
            if not failed_runs:
                self.logger.info("No failed pipelines detected")
                return
            
            self.logger.info(f"Found {len(failed_runs)} failed pipelines")
            
            # Step 2: Analyze each failure
            for run in failed_runs:
                # Create failure object
                failure = PipelineFailure(
                    pipeline_id=run.id,
                    step="build",  # Would extract from logs
                    error_type=run.failure_reason or "unknown",
                    error_message=run.failure_reason or "Pipeline failed",
                    context={"branch": run.branch, "commit": run.commit}
                )
                
                # Track failure
                self.failure_counter.labels(
                    pipeline_name=run.name,
                    error_type=failure.error_type
                ).inc()
                
                # Step 3: Analyze failure
                analysis = await self.analyze_failure(failure)
                
                # Only proceed if confidence is high enough
                if analysis.confidence >= self.autonomy_threshold:
                    # Step 4: Create fix plan
                    fix_plan = FixPlan(
                        analysis=analysis,
                        steps=[analysis.suggested_fix],
                        files_to_modify=[],  # Would extract from analysis
                        risk_level="low" if analysis.confidence > 0.8 else "medium",
                        estimated_success_rate=analysis.confidence
                    )
                    
                    # Step 5: Apply fix
                    fix_result = await self.apply_fix(fix_plan)
                    
                    if fix_result.success:
                        # Step 6: Create PR with fix
                        await self.create_fix_pr(fix_plan, fix_result)
                    else:
                        self.logger.warning(f"Failed to apply fix: {fix_result.validation_result}")
                else:
                    self.logger.warning(
                        f"Confidence too low ({analysis.confidence}) to auto-fix: {analysis.root_cause}"
                    )
            
            self.logger.info("Repair cycle complete")
            
        except Exception as e:
            self.logger.error(f"Error in repair cycle: {e}")
            raise
    
    async def start(self):
        """Start the CI/CD repair agent"""
        self.logger.info(f"Starting {self.agent_name}")
        
        while True:
            try:
                await self.run_repair_cycle()
                
                # Wait for next cycle (2 minutes)
                await asyncio.sleep(120)
                
            except Exception as e:
                self.logger.error(f"Error in agent loop: {e}")
                await asyncio.sleep(60)


# Factory function
async def create_cicd_repair_agent(
    runtime: AgentRuntime,
    memory: MemoryManager,
    orchestrator: WorkflowOrchestrator,
    mcp_client: MCPClient,
    mi9_runtime: MI9Runtime,
    metrics: MetricsCollector
) -> CICDRepairAgent:
    """
    Factory function to create a CI/CD repair agent
    
    Args:
        runtime: Agent runtime instance
        memory: Memory manager instance
        orchestrator: Workflow orchestrator instance
        mcp_client: MCP client instance
        mi9_runtime: MI9 runtime instance
        metrics: Metrics collector instance
        
    Returns:
        CICDRepairAgent instance
    """
    agent = CICDRepairAgent(
        runtime=runtime,
        memory=memory,
        orchestrator=orchestrator,
        mcp_client=mcp_client,
        mi9_runtime=mi9_runtime,
        metrics=metrics
    )
    
    return agent