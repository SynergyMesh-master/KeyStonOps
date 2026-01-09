"""
Integration tests for ADK governance agent workflows
"""

import pytest
from unittest.mock import Mock, AsyncMock
from datetime import datetime


class TestAgentWorkflowIntegration:
    """Integration tests for agent workflow orchestration"""
    
    @pytest.mark.asyncio
    async def test_dag_maintenance_workflow_end_to_end(self, dag_maintenance_agent):
        """Test end-to-end DAG maintenance workflow"""
        # Mock filesystem scan
        dag_maintenance_agent.mcp_client.call_tool.return_value = {
            "files": ["/workspace/test.yaml"]
        }
        
        # Mock taxonomy validation with violation
        dag_maintenance_agent.taxonomy.validate_agent_name.return_value = {
            "valid": False,
            "violations": ["test.yaml: Invalid naming"]
        }
        
        # Mock auto-repair
        dag_maintenance_agent.taxonomy.validate_and_fix.return_value = {
            "fixed": "platform-test-resource-v1",
            "changes": ["Applied taxonomy fixes"]
        }
        
        # Run complete workflow
        await dag_maintenance_agent.run_maintenance_cycle()
        
        # Verify workflow completed
        assert dag_maintenance_agent.mcp_client.call_tool.call_count >= 2
    
    @pytest.mark.asyncio
    async def test_cicd_repair_workflow_end_to_end(self, cicd_repair_agent):
        """Test end-to-end CI/CD repair workflow"""
        # Mock workflow runs with failure
        cicd_repair_agent.mcp_client.call_tool.return_value = {
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
        
        # Run complete workflow
        await cicd_repair_agent.run_repair_cycle()
        
        # Verify workflow completed
        cicd_repair_agent.mcp_client.call_tool.assert_called()
    
    @pytest.mark.asyncio
    async def test_artifact_generation_workflow(self, artifact_generation_agent):
        """Test artifact generation workflow"""
        # Mock template
        from enhanced_adk.governance_agents.artifact_generation_agent import Template
        template = Template(
            name="test-config",
            type="yaml",
            template="name: {{name}}\nversion: {{version}}",
            variables=["name", "version"]
        )
        
        # Generate config
        config = await artifact_generation_agent.generate_config(
            template,
            {"name": "test", "version": "v1"}
        )
        
        # Verify
        assert config.name == "test-config"
        assert config.version == "v1"
        assert "name: test" in str(config.config)
    
    @pytest.mark.asyncio
    async def test_gitops_workflow_complete_cycle(self, gitops_workflow_agent):
        """Test complete GitOps workflow cycle"""
        # Mock list PRs
        gitops_workflow_agent.mcp_client.call_tool.return_value = {
            "pulls": [
                {
                    "id": "pr-123",
                    "number": 42,
                    "title": "test-pr",
                    "body": "Test PR description",
                    "author": "test-user",
                    "head_branch": "feature/test",
                    "base_branch": "main",
                    "created_at": "2024-01-09T10:00:00Z",
                    "updated_at": "2024-01-09T10:00:00Z",
                    "additions": 100,
                    "deletions": 50,
                    "changed_files": 5,
                    "requested_reviewers": [],
                    "approvals": 2,
                    "approval_status": "approved",
                    "checks_passed": True,
                    "mergeable": True
                }
            ]
        }
        
        # Run complete workflow
        await gitops_workflow_agent.manage_pr_lifecycle()
        
        # Verify workflow completed
        gitops_workflow_agent.mcp_client.call_tool.assert_called()
    
    @pytest.mark.asyncio
    async def test_multi_agent_coordination(self, dag_maintenance_agent, cicd_repair_agent):
        """Test coordination between multiple agents"""
        # Both agents use same MCP client - verify they don't interfere
        dag_maintenance_agent.mcp_client.call_tool.return_value = {"files": []}
        cicd_repair_agent.mcp_client.call_tool.return_value = {"workflow_runs": []}
        
        # Run both agents
        await dag_maintenance_agent.run_maintenance_cycle()
        await cicd_repair_agent.run_repair_cycle()
        
        # Verify both completed successfully
        assert dag_maintenance_agent.mcp_client.call_tool.called
        assert cicd_repair_agent.mcp_client.call_tool.called
    
    @pytest.mark.asyncio
    async def test_error_recovery_workflow(self, dag_maintenance_agent):
        """Test workflow error recovery"""
        # Mock MCP to fail on first call, succeed on second
        call_count = 0
        async def mock_call(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Network error")
            return {"files": []}
        
        dag_maintenance_agent.mcp_client.call_tool.side_effect = mock_call
        
        # Workflow should handle error gracefully
        with pytest.raises(Exception):
            await dag_maintenance_agent.run_maintenance_cycle()
        
        # Verify error was encountered
        assert call_count >= 1
    
    @pytest.mark.asyncio
    async def test_taxonomy_integration_workflow(self, dag_maintenance_agent):
        """Test taxonomy integration in workflow"""
        # Mock scan with files
        dag_maintenance_agent.mcp_client.call_tool.return_value = {
            "files": ["/workspace/test.yaml"]
        }
        
        # Mock taxonomy to enforce naming
        dag_maintenance_agent.taxonomy.validate_agent_name.return_value = {
            "valid": False,
            "violations": ["Invalid naming"]
        }
        
        # Run workflow
        await dag_maintenance_agent.run_maintenance_cycle()
        
        # Verify taxonomy was used
        assert dag_maintenance_agent.taxonomy.validate_agent_name.called


class TestAgentObservability:
    """Test observability integration in agents"""
    
    @pytest.mark.asyncio
    async def test_metrics_collection(self, dag_maintenance_agent):
        """Test metrics are collected during workflow"""
        dag_maintenance_agent.mcp_client.call_tool.return_value = {"files": []}
        dag_maintenance_agent.taxonomy.validate_agent_name.return_value = {
            "valid": True,
            "violations": []
        }
        
        # Run workflow
        await dag_maintenance_agent.run_maintenance_cycle()
        
        # Verify metrics were called
        assert dag_maintenance_agent.scan_counter.labels.called
        assert dag_maintenance_agent.validation_counter.labels.called
    
    @pytest.mark.asyncio
    async def test_logging_output(self, caplog, dag_maintenance_agent):
        """Test logging in agents"""
        dag_maintenance_agent.mcp_client.call_tool.return_value = {"files": []}
        
        # Run workflow
        with caplog.at_level("INFO"):
            await dag_maintenance_agent.run_maintenance_cycle()
        
        # Verify logs were generated
        assert any("Starting maintenance cycle" in record.message for record in caplog.records)
        assert any("Scanning workspace" in record.message for record in caplog.records)
    
    @pytest.mark.asyncio
    async def test_error_logging(self, caplog, dag_maintenance_agent):
        """Test error logging in agents"""
        dag_maintenance_agent.mcp_client.call_tool.side_effect = Exception("Test error")
        
        # Run workflow with error
        with caplog.at_level("ERROR"):
            try:
                await dag_maintenance_agent.run_maintenance_cycle()
            except Exception:
                pass
        
        # Verify error was logged
        assert any("Error in maintenance cycle" in record.message for record in caplog.records)


class TestAgentGovernance:
    """Test governance features in agents"""
    
    @pytest.mark.asyncio
    async def test_mi9_runtime_integration(self, dag_maintenance_agent):
        """Test MI9 runtime integration"""
        # Mock scan
        dag_maintenance_agent.mcp_client.call_tool.return_value = {"files": []}
        
        # Run workflow
        await dag_maintenance_agent.run_maintenance_cycle()
        
        # Verify MI9 runtime is accessible
        assert dag_maintenance_agent.mi9_runtime is not None
    
    @pytest.mark.asyncio
    async def test_autonomy_threshold(self, cicd_repair_agent):
        """Test autonomy threshold enforcement"""
        # Mock workflow with low confidence analysis
        cicd_repair_agent.mcp_client.call_tool.return_value = {"workflow_runs": []}
        
        # Set high autonomy threshold
        cicd_repair_agent.autonomy_threshold = 0.95
        
        # Run workflow
        await cicd_repair_agent.run_repair_cycle()
        
        # Verify autonomy threshold was respected
        assert cicd_repair_agent.autonomy_threshold == 0.95
    
    @pytest.mark.asyncio
    async def test_containment_levels(self, gitops_workflow_agent):
        """Test containment level management"""
        # Mock PR list
        gitops_workflow_agent.mcp_client.call_tool.return_value = {"pulls": []}
        
        # Run workflow
        await gitops_workflow_agent.manage_pr_lifecycle()
        
        # Verify policies are enforced
        assert gitops_workflow_agent.policies is not None
        assert "min_approvers" in gitops_workflow_agent.policies


class TestAgentMemoryManagement:
    """Test memory management in agents"""
    
    @pytest.mark.asyncio
    async def test_memory_storage(self, dag_maintenance_agent):
        """Test agents store data in memory"""
        dag_maintenance_agent.mcp_client.call_tool.return_value = {"files": []}
        
        # Run workflow
        await dag_maintenance_agent.run_maintenance_cycle()
        
        # Verify memory manager is accessible
        assert dag_maintenance_agent.memory is not None
    
    @pytest.mark.asyncio
    async def test_memory_retrieval(self, cicd_repair_agent):
        """Test agents retrieve data from memory"""
        cicd_repair_agent.mcp_client.call_tool.return_value = {"workflow_runs": []}
        
        # Run workflow
        await cicd_repair_agent.run_repair_cycle()
        
        # Verify memory manager is accessible
        assert cicd_repair_agent.memory is not None


class TestAgentScalability:
    """Test agent scalability and performance"""
    
    @pytest.mark.asyncio
    async def test_concurrent_agent_execution(self, dag_maintenance_agent, cicd_repair_agent):
        """Test multiple agents can run concurrently"""
        import asyncio
        
        # Mock responses
        dag_maintenance_agent.mcp_client.call_tool.return_value = {"files": []}
        cicd_repair_agent.mcp_client.call_tool.return_value = {"workflow_runs": []}
        
        # Run agents concurrently
        await asyncio.gather(
            dag_maintenance_agent.run_maintenance_cycle(),
            cicd_repair_agent.run_repair_cycle()
        )
        
        # Verify both completed
        assert dag_maintenance_agent.mcp_client.call_tool.called
        assert cicd_repair_agent.mcp_client.call_tool.called
    
    @pytest.mark.asyncio
    async def test_large_dataset_handling(self, dag_maintenance_agent):
        """Test agent handles large datasets"""
        # Mock large file list
        large_file_list = {"files": [f"/workspace/file{i}.yaml" for i in range(1000)]}
        dag_maintenance_agent.mcp_client.call_tool.return_value = large_file_list
        
        # Mock taxonomy validation
        dag_maintenance_agent.taxonomy.validate_agent_name.return_value = {
            "valid": True,
            "violations": []
        }
        
        # Run workflow
        await dag_maintenance_agent.run_maintenance_cycle()
        
        # Verify all files were processed
        assert dag_maintenance_agent.taxonomy.validate_agent_name.call_count == 1000