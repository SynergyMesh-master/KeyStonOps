"""
DAG Maintenance Agent
Autonomous agent for monitoring and repairing dependency DAGs
"""

import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from dataclasses import dataclass

from adk.core.agent_runtime import AgentRuntime
from adk.core.memory_manager import MemoryManager
from adk.core.workflow_orchestrator import WorkflowOrchestrator
from adk.mcp.mcp_client import MCPClient
from adk.governance.mi9_runtime import MI9Runtime
from adk.observability.metrics import MetricsCollector
from adk.taxonomy_integration import ADKTaxonomyManager


@dataclass
class DependencyNode:
    """Represents a node in the dependency graph"""
    id: str
    name: str
    type: str
    dependencies: List[str]
    file_path: str
    metadata: Dict[str, Any]


@dataclass
class ValidationResult:
    """Result of taxonomy validation"""
    valid: bool
    violations: List[str]
    warnings: List[str]
    fixed: Optional[str] = None


@dataclass
class Conflict:
    """Represents a naming or dependency conflict"""
    type: str
    severity: str
    nodes: List[str]
    description: str
    suggested_fix: str


@dataclass
class RepairResult:
    """Result of auto-repair operation"""
    success: bool
    repairs_applied: List[str]
    failures: List[str]
    report: str


class DAGMaintenanceAgent:
    """
    Autonomous agent for maintaining and repairing dependency DAGs
    
    Responsibilities:
    - Continuously scan for dependency changes
    - Validate all resource names against taxonomy
    - Detect naming conflicts and drift
    - Auto-repair non-compliant names
    - Generate PRs with fixes
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
        self.agent_name = "platform-dag-maintainer-agent-v1"
        self.autonomy_threshold = 0.8
        
        # Logging
        self.logger = logging.getLogger(__name__)
        
        # Metrics
        self.scan_counter = self.metrics.counter(
            'dag_maintenance_scans_total',
            'Total DAG maintenance scans',
            ['status']
        )
        self.validation_counter = self.metrics.counter(
            'taxonomy_validations_total',
            'Total taxonomy validations',
            ['result']
        )
        self.conflict_counter = self.metrics.counter(
            'conflicts_detected_total',
            'Total conflicts detected',
            ['severity']
        )
        self.repair_counter = self.metrics.counter(
            'repairs_applied_total',
            'Total repairs applied',
            ['status']
        )
    
    async def scan_workspace(self, workspace_path: str = "/workspace") -> List[DependencyNode]:
        """
        Scan workspace for dependencies and build dependency graph
        
        Args:
            workspace_path: Path to workspace directory
            
        Returns:
            List of dependency nodes
        """
        self.logger.info(f"Scanning workspace: {workspace_path}")
        
        try:
            # Use filesystem MCP to scan directory
            result = await self.mcp_client.call_tool(
                server="filesystem-mcp",
                tool="scan_directory",
                params={
                    "path": workspace_path,
                    "pattern": "*.yaml",
                    "recursive": True
                }
            )
            
            nodes = []
            for file_path in result.get("files", []):
                node = await self._parse_dependency_file(file_path)
                if node:
                    nodes.append(node)
            
            self.scan_counter.labels(status='success').inc()
            self.logger.info(f"Scanned {len(nodes)} dependency nodes")
            
            return nodes
            
        except Exception as e:
            self.scan_counter.labels(status='error').inc()
            self.logger.error(f"Error scanning workspace: {e}")
            raise
    
    async def _parse_dependency_file(self, file_path: str) -> Optional[DependencyNode]:
        """
        Parse a dependency file and extract node information
        
        Args:
            file_path: Path to dependency file
            
        Returns:
            DependencyNode or None
        """
        try:
            # Read file content
            result = await self.mcp_client.call_tool(
                server="filesystem-mcp",
                tool="read_file",
                params={"path": file_path}
            )
            
            content = result.get("content", "")
            
            # Parse YAML (simplified - in production, use proper YAML parser)
            node_id = file_path.split("/")[-1].replace(".yaml", "")
            
            return DependencyNode(
                id=node_id,
                name=node_id,
                type="resource",
                dependencies=[],  # Would extract from YAML content
                file_path=file_path,
                metadata={}
            )
            
        except Exception as e:
            self.logger.warning(f"Error parsing file {file_path}: {e}")
            return None
    
    async def validate_taxonomy(self, nodes: List[DependencyNode]) -> ValidationResult:
        """
        Validate all node names against taxonomy
        
        Args:
            nodes: List of dependency nodes
            
        Returns:
            ValidationResult with violations and warnings
        """
        self.logger.info("Validating taxonomy compliance")
        
        violations = []
        warnings = []
        
        for node in nodes:
            # Validate node name
            result = self.taxonomy.validate_agent_name(node.name)
            
            if not result.get("valid", True):
                violations.extend([
                    f"{node.name}: {v}" for v in result.get("violations", [])
                ])
                self.validation_counter.labels(result='violation').inc()
            else:
                self.validation_counter.labels(result='valid').inc()
        
        # Check for warnings
        if len(violations) > 10:
            warnings.append("High number of taxonomy violations detected")
        
        valid = len(violations) == 0
        
        self.logger.info(f"Taxonomy validation complete: {len(violations)} violations")
        
        return ValidationResult(
            valid=valid,
            violations=violations,
            warnings=warnings
        )
    
    async def detect_conflicts(self, nodes: List[DependencyNode]) -> List[Conflict]:
        """
        Detect naming conflicts and dependency issues
        
        Args:
            nodes: List of dependency nodes
            
        Returns:
            List of conflicts detected
        """
        self.logger.info("Detecting conflicts in dependency graph")
        
        conflicts = []
        
        # Check for duplicate names
        name_counts = {}
        for node in nodes:
            name_counts[node.name] = name_counts.get(node.name, 0) + 1
        
        for name, count in name_counts.items():
            if count > 1:
                conflicts.append(Conflict(
                    type="duplicate_name",
                    severity="error",
                    nodes=[node.id for node in nodes if node.name == name],
                    description=f"Duplicate name '{name}' found {count} times",
                    suggested_fix="Rename nodes to be unique using taxonomy conventions"
                ))
                self.conflict_counter.labels(severity='error').inc()
        
        # Check for circular dependencies (simplified)
        # In production, implement proper cycle detection
        
        # Check for drift from taxonomy
        for node in nodes:
            result = self.taxonomy.validate_and_fix(node.name)
            if result.get("fixed") != node.name:
                conflicts.append(Conflict(
                    type="taxonomy_drift",
                    severity="warning",
                    nodes=[node.id],
                    description=f"Name '{node.name}' does not follow taxonomy conventions",
                    suggested_fix=f"Rename to '{result.get('fixed')}'"
                ))
                self.conflict_counter.labels(severity='warning').inc()
        
        self.logger.info(f"Detected {len(conflicts)} conflicts")
        
        return conflicts
    
    async def auto_repair(self, violations: List[str]) -> RepairResult:
        """
        Automatically repair taxonomy violations
        
        Args:
            violations: List of violations to repair
            
        Returns:
            RepairResult with applied repairs and failures
        """
        self.logger.info(f"Auto-repairing {len(violations)} violations")
        
        repairs_applied = []
        failures = []
        
        for violation in violations:
            try:
                # Extract name from violation message
                name = violation.split(":")[0].strip()
                
                # Validate and fix
                result = self.taxonomy.validate_and_fix(name)
                fixed_name = result.get("fixed")
                
                if fixed_name and fixed_name != name:
                    # Apply fix (in production, update file)
                    repairs_applied.append(f"Renamed '{name}' to '{fixed_name}'")
                    self.repair_counter.labels(status='success').inc()
                else:
                    failures.append(f"Could not fix '{name}'")
                    self.repair_counter.labels(status='failure').inc()
                    
            except Exception as e:
                failures.append(f"Error repairing violation: {e}")
                self.repair_counter.labels(status='error').inc()
        
        report = self._generate_repair_report(repairs_applied, failures)
        
        return RepairResult(
            success=len(failures) == 0,
            repairs_applied=repairs_applied,
            failures=failures,
            report=report
        )
    
    def _generate_repair_report(self, repairs: List[str], failures: List[str]) -> str:
        """Generate repair report for PR"""
        report = "# Auto-Repair Report\n\n"
        report += f"Generated at: {datetime.now().isoformat()}\n\n"
        
        if repairs:
            report += "## Repairs Applied\n\n"
            for repair in repairs:
                report += f"- {repair}\n"
            report += "\n"
        
        if failures:
            report += "## Failures\n\n"
            for failure in failures:
                report += f"- {failure}\n"
            report += "\n"
        
        report += f"\n**Summary:** {len(repairs)} repairs applied, {len(failures)} failures"
        
        return report
    
    async def create_repair_pr(
        self,
        repairs: List[str],
        branch_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create pull request with auto-repair changes
        
        Args:
            repairs: List of repairs applied
            branch_name: Name for the PR branch
            
        Returns:
            Pull request information
        """
        if not branch_name:
            timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            branch_name = f"auto-repair-{timestamp}"
        
        self.logger.info(f"Creating repair PR: {branch_name}")
        
        try:
            # Generate report
            report = self._generate_repair_report(repairs, [])
            
            # Create PR using GitHub MCP
            result = await self.mcp_client.call_tool(
                server="github-mcp",
                tool="create_pr",
                params={
                    "title": "Auto-repair: Taxonomy compliance fixes",
                    "body": report,
                    "branch": branch_name,
                    "base": "main"
                }
            )
            
            self.logger.info(f"Created PR: {result.get('url')}")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error creating repair PR: {e}")
            raise
    
    async def run_maintenance_cycle(self):
        """
        Run a complete maintenance cycle
        
        This is the main workflow that orchestrates all maintenance tasks
        """
        self.logger.info("Starting maintenance cycle")
        
        try:
            # Step 1: Scan workspace
            nodes = await self.scan_workspace()
            
            # Step 2: Validate taxonomy
            validation = await self.validate_taxonomy(nodes)
            
            if not validation.valid:
                self.logger.warning(f"Found {len(validation.violations)} violations")
                
                # Step 3: Detect conflicts
                await self.detect_conflicts(nodes)
                
                # Step 4: Auto-repair violations
                repair = await self.auto_repair(validation.violations)
                
                if repair.success:
                    # Step 5: Create PR with repairs
                    await self.create_repair_pr(repair.repairs_applied)
                else:
                    self.logger.error(f"Auto-repair failed: {repair.failures}")
            else:
                self.logger.info("No violations found - DAG is compliant")
            
            self.logger.info("Maintenance cycle complete")
            
        except Exception as e:
            self.logger.error(f"Error in maintenance cycle: {e}")
            raise
    
    async def start(self):
        """Start the DAG maintenance agent"""
        self.logger.info(f"Starting {self.agent_name}")
        
        while True:
            try:
                await self.run_maintenance_cycle()
                
                # Wait for next cycle (5 minutes)
                await asyncio.sleep(300)
                
            except Exception as e:
                self.logger.error(f"Error in agent loop: {e}")
                await asyncio.sleep(60)


# Factory function
async def create_dag_maintenance_agent(
    runtime: AgentRuntime,
    memory: MemoryManager,
    orchestrator: WorkflowOrchestrator,
    mcp_client: MCPClient,
    mi9_runtime: MI9Runtime,
    metrics: MetricsCollector
) -> DAGMaintenanceAgent:
    """
    Factory function to create a DAG maintenance agent
    
    Args:
        runtime: Agent runtime instance
        memory: Memory manager instance
        orchestrator: Workflow orchestrator instance
        mcp_client: MCP client instance
        mi9_runtime: MI9 runtime instance
        metrics: Metrics collector instance
        
    Returns:
        DAGMaintenanceAgent instance
    """
    agent = DAGMaintenanceAgent(
        runtime=runtime,
        memory=memory,
        orchestrator=orchestrator,
        mcp_client=mcp_client,
        mi9_runtime=mi9_runtime,
        metrics=metrics
    )
    
    return agent