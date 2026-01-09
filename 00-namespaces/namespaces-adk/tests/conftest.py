"""
Pytest configuration and fixtures for ADK governance agents testing
"""

import pytest
import asyncio
from typing import AsyncGenerator
from unittest.mock import Mock, AsyncMock

from adk.core.agent_runtime import AgentRuntime
from adk.core.memory_manager import MemoryManager
from adk.core.workflow_orchestrator import WorkflowOrchestrator
from adk.mcp.mcp_client import MCPClient
from adk.governance.mi9_runtime import MI9Runtime
from adk.observability.metrics import MetricsCollector


@pytest.fixture
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_runtime():
    """Mock AgentRuntime"""
    runtime = Mock(spec=AgentRuntime)
    return runtime


@pytest.fixture
def mock_memory():
    """Mock MemoryManager"""
    memory = Mock(spec=MemoryManager)
    return memory


@pytest.fixture
def mock_orchestrator():
    """Mock WorkflowOrchestrator"""
    orchestrator = Mock(spec=WorkflowOrchestrator)
    return orchestrator


@pytest.fixture
def mock_mcp_client():
    """Mock MCPClient with async methods"""
    client = Mock(spec=MCPClient)
    client.call_tool = AsyncMock()
    return client


@pytest.fixture
def mock_mi9_runtime():
    """Mock MI9Runtime"""
    mi9_runtime = Mock(spec=MI9Runtime)
    return mi9_runtime


@pytest.fixture
def mock_metrics():
    """Mock MetricsCollector"""
    metrics = Mock(spec=MetricsCollector)
    metrics.counter = Mock(return_value=Mock())
    metrics.histogram = Mock(return_value=Mock())
    return metrics


@pytest.fixture
def agent_components(mock_runtime, mock_memory, mock_orchestrator, 
                      mock_mcp_client, mock_mi9_runtime, mock_metrics):
    """All agent components as a single fixture"""
    return {
        'runtime': mock_runtime,
        'memory': mock_memory,
        'orchestrator': mock_orchestrator,
        'mcp_client': mock_mcp_client,
        'mi9_runtime': mock_mi9_runtime,
        'metrics': mock_metrics
    }


@pytest.fixture
def sample_dependency_nodes():
    """Sample dependency nodes for testing"""
    from enhanced_adk.governance_agents.dag_maintenance_agent import DependencyNode
    return [
        DependencyNode(
            id="node1",
            name="platform-agent-service-v1",
            type="service",
            dependencies=["node2"],
            file_path="/workspace/services/agent.yaml",
            metadata={}
        ),
        DependencyNode(
            id="node2",
            name="InvalidName",
            type="service",
            dependencies=[],
            file_path="/workspace/services/bad.yaml",
            metadata={}
        )
    ]


@pytest.fixture
def sample_pipeline_run():
    """Sample pipeline run for testing"""
    from enhanced_adk.governance_agents.cicd_repair_agent import PipelineRun, PipelineStatus
    from datetime import datetime
    return PipelineRun(
        id="12345",
        name="test-pipeline",
        status=PipelineStatus.FAILURE,
        branch="main",
        commit="abc123",
        started_at=datetime.now(),
        completed_at=datetime.now(),
        failure_reason="test_failure",
        logs_url="https://example.com/logs"
    )


@pytest.fixture
def sample_schema_spec():
    """Sample schema specification for testing"""
    from enhanced_adk.governance_agents.artifact_generation_agent import SchemaSpec
    return SchemaSpec(
        name="test-schema",
        version="v1",
        type="object",
        fields=[
            {
                "name": "id",
                "type": "string",
                "required": True,
                "description": "Unique identifier"
            },
            {
                "name": "name",
                "type": "string",
                "required": False,
                "description": "Display name"
            }
        ]
    )


@pytest.fixture
def sample_pr_spec():
    """Sample PR specification for testing"""
    from enhanced_adk.governance_agents.gitops_workflow_agent import PRSpec
    return PRSpec(
        title="feat: Add new feature",
        description="This PR adds a new feature",
        source_branch="feature/new-feature",
        target_branch="main",
        labels=["enhancement"],
        reviewers=["user1", "user2"],
        draft=False
    )


# Async fixtures for testing async methods
@pytest.fixture
async def dag_maintenance_agent(agent_components):
    """DAG maintenance agent fixture"""
    from enhanced_adk.governance_agents.dag_maintenance_agent import (
        DAGMaintenanceAgent, 
        create_dag_maintenance_agent
    )
    
    agent = await create_dag_maintenance_agent(**agent_components)
    yield agent


@pytest.fixture
async def cicd_repair_agent(agent_components):
    """CI/CD repair agent fixture"""
    from enhanced_adk.governance_agents.cicd_repair_agent import (
        CICDRepairAgent,
        create_cicd_repair_agent
    )
    
    agent = await create_cicd_repair_agent(**agent_components)
    yield agent


@pytest.fixture
async def artifact_generation_agent(agent_components):
    """Artifact generation agent fixture"""
    from enhanced_adk.governance_agents.artifact_generation_agent import (
        ArtifactGenerationAgent,
        create_artifact_generation_agent
    )
    
    agent = await create_artifact_generation_agent(**agent_components)
    yield agent


@pytest.fixture
async def gitops_workflow_agent(agent_components):
    """GitOps workflow agent fixture"""
    from enhanced_adk.governance_agents.gitops_workflow_agent import (
        GitOpsPRWorkflowAgent,
        create_gitops_workflow_agent
    )
    
    agent = await create_gitops_workflow_agent(**agent_components)
    yield agent


# Configuration fixtures
@pytest.fixture
def agent_config():
    """Agent configuration for testing"""
    return {
        "agent_name": "platform-test-agent-v1",
        "autonomy_threshold": 0.8,
        "enabled": True
    }


@pytest.fixture
def taxonomy_config():
    """Taxonomy configuration for testing"""
    return {
        "enabled": True,
        "version": "1.0.0",
        "validation_rules": [
            "kebab-case",
            "domain-prefix",
            "no-consecutive-hyphens"
        ]
    }


@pytest.fixture
def mcp_server_config():
    """MCP server configuration for testing"""
    return {
        "github_mcp": {
            "enabled": True,
            "url": "http://localhost:8001",
            "transport": "http"
        },
        "filesystem_mcp": {
            "enabled": True,
            "url": "http://localhost:8007",
            "transport": "http"
        }
    }


# Test data fixtures
@pytest.fixture
def mock_filesystem_scan_result():
    """Mock filesystem scan result"""
    return {
        "files": [
            "/workspace/services/agent.yaml",
            "/workspace/services/bad.yaml",
            "/workspace/config/app.yaml"
        ]
    }


@pytest.fixture
def mock_github_workflow_runs():
    """Mock GitHub workflow runs"""
    return {
        "workflow_runs": [
            {
                "id": "12345",
                "name": "test-pipeline",
                "status": "completed",
                "conclusion": "failure",
                "head_branch": "main",
                "head_sha": "abc123",
                "created_at": "2024-01-09T10:00:00Z",
                "updated_at": "2024-01-09T10:05:00Z",
                "logs_url": "https://example.com/logs"
            }
        ]
    }


@pytest.fixture
def mock_pr_creation_result():
    """Mock PR creation result"""
    return {
        "id": "pr-123",
        "number": 42,
        "title": "test-pr",
        "author": "test-user",
        "created_at": "2024-01-09T10:00:00Z",
        "additions": 100,
        "deletions": 50,
        "changed_files": 5
    }


# Helper functions
def async_wrapper(coro):
    """Helper to run async functions in sync tests"""
    return asyncio.run(coro)


# Pytest configuration
pytest_plugins = ('pytest_asyncio',)