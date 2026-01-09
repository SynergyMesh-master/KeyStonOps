"""
GitOps PR Workflow Agent
Autonomous agent for managing GitOps pull request workflows
"""

import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
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


class PRStatus(Enum):
    """Pull request status"""
    OPEN = "open"
    CLOSED = "closed"
    MERGED = "merged"
    DRAFT = "draft"


class ApprovalStatus(Enum):
    """Approval status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHANGES_REQUESTED = "changes_requested"


@dataclass
class PullRequest:
    """Represents a pull request"""
    id: str
    number: int
    title: str
    description: str
    status: PRStatus
    author: str
    source_branch: str
    target_branch: str
    created_at: datetime
    updated_at: datetime
    additions: int
    deletions: int
    files_changed: int
    reviewers: List[str]
    approvals: int
    approval_status: ApprovalStatus
    checks_passed: bool
    mergeable: bool


@dataclass
class PRSpec:
    """Specification for creating a pull request"""
    title: str
    description: str
    source_branch: str
    target_branch: str = "main"
    labels: List[str] = None
    reviewers: List[str] = None
    draft: bool = False


@dataclass
class ReviewResult:
    """Result of PR review"""
    pr_id: str
    approved: bool
    comments: List[str]
    suggestions: List[str]
    issues: List[str]
    score: float


@dataclass
class PolicyResult:
    """Result of policy enforcement"""
    pr_id: str
    compliant: bool
    violations: List[str]
    warnings: List[str]
    required_actions: List[str]


@dataclass
class DeploymentStatus:
    """Status of deployment from PR"""
    pr_id: str
    environment: str
    status: str
    url: Optional[str]
    started_at: datetime
    completed_at: Optional[datetime]


class GitOpsPRWorkflowAgent:
    """
    Autonomous agent for managing GitOps pull request workflows
    
    Responsibilities:
    - Create pull requests with proper governance
    - Automate code review
    - Enforce governance policies
    - Coordinate merge approvals
    - Track deployment status
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
        self.agent_name = "platform-gitops-workflow-agent-v1"
        self.autonomy_threshold = 0.6
        
        # Governance policies
        self.policies = {
            "min_approvers": 1,
            "max_pr_age_days": 30,
            "require_checks": True,
            "blocking_checks": [],
            "allowed_authors": [],  # Empty means all allowed
            "require_description": True,
            "min_description_length": 50
        }
        
        # Logging
        self.logger = logging.getLogger(__name__)
        
        # Metrics
        self.pr_creation_counter = self.metrics.counter(
            'gitops_pr_creations_total',
            'Total PR creations',
            ['status']
        )
        self.pr_review_counter = self.metrics.counter(
            'gitops_pr_reviews_total',
            'Total PR reviews',
            ['result']
        )
        self.policy_enforcement_counter = self.metrics.counter(
            'gitops_policy_enforcements_total',
            'Total policy enforcements',
            ['result']
        )
        self.deployment_counter = self.metrics.counter(
            'gitops_deployments_total',
            'Total deployments',
            ['status']
        )
        self.pr_duration = self.metrics.histogram(
            'gitops_pr_duration_hours',
            'PR lifecycle duration',
            ['status']
        )
    
    async def create_pr(self, spec: PRSpec) -> PullRequest:
        """
        Create a pull request with proper governance
        
        Args:
            spec: PR specification
            
        Returns:
            Created PullRequest
        """
        self.logger.info(f"Creating PR: {spec.title}")
        
        try:
            # Validate PR title against taxonomy
            title_validation = self.taxonomy.validate_agent_name(spec.title.split(":")[0].strip())
            if not title_validation.get("valid", True):
                self.logger.warning(f"PR title does not follow taxonomy: {title_validation}")
            
            # Validate source branch naming
            branch_validation = self.taxonomy.validate_agent_name(spec.source_branch)
            if not branch_validation.get("valid", True):
                self.logger.warning(f"Branch name does not follow taxonomy: {branch_validation}")
            
            # Create PR using GitHub MCP
            result = await self.mcp_client.call_tool(
                server="github-mcp",
                tool="create_pr",
                params={
                    "title": spec.title,
                    "body": spec.description,
                    "head": spec.source_branch,
                    "base": spec.target_branch,
                    "draft": spec.draft,
                    "labels": spec.labels or [],
                    "reviewers": spec.reviewers or []
                }
            )
            
            pr = PullRequest(
                id=result.get("id"),
                number=result.get("number"),
                title=spec.title,
                description=spec.description,
                status=PRStatus.DRAFT if spec.draft else PRStatus.OPEN,
                author=result.get("author"),
                source_branch=spec.source_branch,
                target_branch=spec.target_branch,
                created_at=datetime.fromisoformat(result.get("created_at")),
                updated_at=datetime.fromisoformat(result.get("created_at")),
                additions=result.get("additions", 0),
                deletions=result.get("deletions", 0),
                files_changed=result.get("changed_files", 0),
                reviewers=spec.reviewers or [],
                approvals=0,
                approval_status=ApprovalStatus.PENDING,
                checks_passed=False,
                mergeable=False
            )
            
            self.pr_creation_counter.labels(status='success').inc()
            self.logger.info(f"Created PR: #{pr.number} - {pr.title}")
            
            return pr
            
        except Exception as e:
            self.pr_creation_counter.labels(status='error').inc()
            self.logger.error(f"Error creating PR: {e}")
            raise
    
    async def review_pr(self, pr: PullRequest) -> ReviewResult:
        """
        Perform automated code review on a pull request
        
        Args:
            pr: Pull request to review
            
        Returns:
            ReviewResult with comments and issues
        """
        self.logger.info(f"Reviewing PR: #{pr.number}")
        
        try:
            comments = []
            suggestions = []
            issues = []
            
            # Check 1: Taxonomy compliance in files
            file_result = await self.mcp_client.call_tool(
                server="github-mcp",
                tool="get_pr_files",
                params={"pr_number": pr.number}
            )
            
            for file in file_result.get("files", []):
                filename = file.get("filename", "")
                
                # Validate file naming
                file_validation = self.taxonomy.validate_agent_name(filename)
                if not file_validation.get("valid", True):
                    issues.append(
                        f"File '{filename}' does not follow taxonomy: {file_validation.get('violations', [])}"
                    )
            
            # Check 2: Description quality
            if not pr.description or len(pr.description) < self.policies["min_description_length"]:
                comments.append(
                    f"PR description is too short (min {self.policies['min_description_length']} characters)"
                )
            
            # Check 3: CI/CD checks
            if not pr.checks_passed:
                comments.append("CI/CD checks are not passing")
            
            # Check 4: Merge conflicts
            if not pr.mergeable:
                issues.append("PR has merge conflicts")
            
            # Check 5: Code size
            if pr.additions + pr.deletions > 1000:
                suggestions.append("Consider splitting this into smaller PRs for better reviewability")
            
            # Calculate review score
            base_score = 1.0
            base_score -= 0.2 * len(issues)
            base_score -= 0.1 * len(comments)
            score = max(0.0, min(1.0, base_score))
            
            approved = (
                score >= 0.8 and
                len(issues) == 0 and
                pr.checks_passed
            )
            
            result = ReviewResult(
                pr_id=pr.id,
                approved=approved,
                comments=comments,
                suggestions=suggestions,
                issues=issues,
                score=score
            )
            
            self.pr_review_counter.labels(result='approved' if approved else 'rejected').inc()
            self.logger.info(f"Review complete: {score:.2f} - {'Approved' if approved else 'Changes requested'}")
            
            return result
            
        except Exception as e:
            self.pr_review_counter.labels(result='error').inc()
            self.logger.error(f"Error reviewing PR: {e}")
            raise
    
    async def enforce_policies(self, pr: PullRequest) -> PolicyResult:
        """
        Enforce governance policies on a pull request
        
        Args:
            pr: Pull request to check
            
        Returns:
            PolicyResult with violations and required actions
        """
        self.logger.info(f"Enforcing policies on PR: #{pr.number}")
        
        violations = []
        warnings = []
        required_actions = []
        
        try:
            # Policy 1: Minimum approvers
            if pr.approvals < self.policies["min_approvers"]:
                violations.append(
                    f"Requires at least {self.policies['min_approvers']} approver(s), "
                    f"has {pr.approvals}"
                )
                required_actions.append(f"Get {self.policies['min_approvers'] - pr.approvals} more approval(s)")
            
            # Policy 2: PR age
            pr_age = datetime.now() - pr.created_at
            if pr_age.days > self.policies["max_pr_age_days"]:
                warnings.append(
                    f"PR is {pr_age.days} days old (max: {self.policies['max_pr_age_days']})"
                )
                required_actions.append("Consider closing stale PR")
            
            # Policy 3: CI/CD checks
            if self.policies["require_checks"] and not pr.checks_passed:
                violations.append("CI/CD checks are required but not passing")
                required_actions.append("Fix failing CI/CD checks")
            
            # Policy 4: Allowed authors
            if self.policies["allowed_authors"] and pr.author not in self.policies["allowed_authors"]:
                violations.append(f"Author '{pr.author}' is not in allowed authors list")
                required_actions.append("Request authorization or use allowed author")
            
            # Policy 5: Description requirement
            if self.policies["require_description"] and not pr.description:
                violations.append("PR description is required")
                required_actions.append("Add description to PR")
            
            # Policy 6: Merge conflicts
            if not pr.mergeable:
                violations.append("PR has merge conflicts")
                required_actions.append("Resolve merge conflicts")
            
            compliant = len(violations) == 0
            
            result = PolicyResult(
                pr_id=pr.id,
                compliant=compliant,
                violations=violations,
                warnings=warnings,
                required_actions=required_actions
            )
            
            self.policy_enforcement_counter.labels(
                result='compliant' if compliant else 'non-compliant'
            ).inc()
            
            if compliant:
                self.logger.info("PR is compliant with all policies")
            else:
                self.logger.warning(f"PR has {len(violations)} policy violations")
            
            return result
            
        except Exception as e:
            self.policy_enforcement_counter.labels(result='error').inc()
            self.logger.error(f"Error enforcing policies: {e}")
            raise
    
    async def coordinate_approval(self, pr: PullRequest) -> ApprovalStatus:
        """
        Coordinate merge approval for a pull request
        
        Args:
            pr: Pull request to coordinate approval for
            
        Returns:
            ApprovalStatus
        """
        self.logger.info(f"Coordinating approval for PR: #{pr.number}")
        
        try:
            # Step 1: Run automated review
            review = await self.review_pr(pr)
            
            if not review.approved:
                self.logger.info(f"PR not approved: {review.issues}")
                return ApprovalStatus.CHANGES_REQUESTED
            
            # Step 2: Check policy compliance
            policy = await self.enforce_policies(pr)
            
            if not policy.compliant:
                self.logger.info(f"PR not compliant: {policy.violations}")
                return ApprovalStatus.REJECTED
            
            # Step 3: Check human approvals
            if pr.approvals >= self.policies["min_approvers"]:
                self.logger.info(f"PR approved with {pr.approvals} approval(s)")
                return ApprovalStatus.APPROVED
            else:
                self.logger.info(f"PR pending approval ({pr.approvals}/{self.policies['min_approvers']})")
                return ApprovalStatus.PENDING
            
        except Exception as e:
            self.logger.error(f"Error coordinating approval: {e}")
            return ApprovalStatus.REJECTED
    
    async def track_deployment(self, pr: PullRequest) -> DeploymentStatus:
        """
        Track deployment status from a pull request
        
        Args:
            pr: Pull request to track deployment for
            
        Returns:
            DeploymentStatus
        """
        self.logger.info(f"Tracking deployment for PR: #{pr.number}")
        
        try:
            # Get deployment info from GitHub MCP
            result = await self.mcp_client.call_tool(
                server="github-mcp",
                tool="get_deployment",
                params={"pr_number": pr.number}
            )
            
            status = DeploymentStatus(
                pr_id=pr.id,
                environment=result.get("environment", "production"),
                status=result.get("status", "pending"),
                url=result.get("url"),
                started_at=datetime.fromisoformat(result.get("created_at", datetime.now().isoformat())),
                completed_at=datetime.fromisoformat(result.get("updated_at")) if result.get("updated_at") else None
            )
            
            self.deployment_counter.labels(status=status.status).inc()
            
            self.logger.info(f"Deployment status: {status.status}")
            
            return status
            
        except Exception as e:
            self.logger.error(f"Error tracking deployment: {e}")
            raise
    
    async def manage_pr_lifecycle(self):
        """
        Manage the complete lifecycle of open pull requests
        
        This is the main workflow that orchestrates PR management
        """
        self.logger.info("Managing PR lifecycle")
        
        try:
            # Get open PRs
            result = await self.mcp_client.call_tool(
                server="github-mcp",
                tool="list_pulls",
                params={"state": "open"}
            )
            
            prs = []
            for pr_data in result.get("pulls", []):
                pr = PullRequest(
                    id=pr_data.get("id"),
                    number=pr_data.get("number"),
                    title=pr_data.get("title"),
                    description=pr_data.get("body", ""),
                    status=PRStatus.OPEN,
                    author=pr_data.get("author"),
                    source_branch=pr_data.get("head_branch"),
                    target_branch=pr_data.get("base_branch"),
                    created_at=datetime.fromisoformat(pr_data.get("created_at")),
                    updated_at=datetime.fromisoformat(pr_data.get("updated_at")),
                    additions=pr_data.get("additions", 0),
                    deletions=pr_data.get("deletions", 0),
                    files_changed=pr_data.get("changed_files", 0),
                    reviewers=[r.get("login") for r in pr_data.get("requested_reviewers", [])],
                    approvals=pr_data.get("approvals", 0),
                    approval_status=ApprovalStatus(pr_data.get("approval_status", "pending")),
                    checks_passed=pr_data.get("checks_passed", False),
                    mergeable=pr_data.get("mergeable", False)
                )
                
                # Track PR duration
                duration = (datetime.now() - pr.created_at).total_seconds() / 3600
                self.pr_duration.labels(status=pr.status.value).observe(duration)
                
                prs.append(pr)
            
            self.logger.info(f"Managing {len(prs)} open PRs")
            
            # Process each PR
            for pr in prs:
                # Coordinate approval
                approval_status = await self.coordinate_approval(pr)
                
                # Update PR approval status
                pr.approval_status = approval_status
                
                # If approved and mergeable, merge
                if (
                    approval_status == ApprovalStatus.APPROVED and
                    pr.mergeable and
                    pr.checks_passed
                ):
                    self.logger.info(f"Merging PR: #{pr.number}")
                    
                    await self.mcp_client.call_tool(
                        server="github-mcp",
                        tool="merge_pr",
                        params={"pr_number": pr.number}
                    )
                    
                    # Track deployment
                    await self.track_deployment(pr)
                
                # Add review comments if needed
                if approval_status == ApprovalStatus.CHANGES_REQUESTED:
                    review = await self.review_pr(pr)
                    if review.comments:
                        await self.mcp_client.call_tool(
                            server="github-mcp",
                            tool="create_review_comment",
                            params={
                                "pr_number": pr.number,
                                "body": "\n".join(review.comments)
                            }
                        )
            
            self.logger.info("PR lifecycle management complete")
            
        except Exception as e:
            self.logger.error(f"Error managing PR lifecycle: {e}")
            raise


# Factory function
async def create_gitops_workflow_agent(
    runtime: AgentRuntime,
    memory: MemoryManager,
    orchestrator: WorkflowOrchestrator,
    mcp_client: MCPClient,
    mi9_runtime: MI9Runtime,
    metrics: MetricsCollector
) -> GitOpsPRWorkflowAgent:
    """
    Factory function to create a GitOps PR workflow agent
    
    Args:
        runtime: Agent runtime instance
        memory: Memory manager instance
        orchestrator: Workflow orchestrator instance
        mcp_client: MCP client instance
        mi9_runtime: MI9 runtime instance
        metrics: Metrics collector instance
        
    Returns:
        GitOpsPRWorkflowAgent instance
    """
    agent = GitOpsPRWorkflowAgent(
        runtime=runtime,
        memory=memory,
        orchestrator=orchestrator,
        mcp_client=mcp_client,
        mi9_runtime=mi9_runtime,
        metrics=metrics
    )
    
    return agent