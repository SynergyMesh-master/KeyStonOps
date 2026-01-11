"""
MCP Level 3 - Cross-Engine Communication Integration Tests

Tests the communication and data flow between different engines.
"""

import pytest
import asyncio
import aiohttp
import time


class TestRAGTaxonomyIntegration:
    """Test RAG Engine ↔ Taxonomy Engine integration"""
    
    @pytest.mark.asyncio
    async def test_rag_entity_extraction_flow(self):
        """Test RAG engine using Taxonomy for entity extraction"""
        async with aiohttp.ClientSession() as session:
            # Step 1: Submit query to RAG engine
            query = {
                "query": "What are the latest developments in quantum computing?",
                "context_size": 5,
                "use_entity_extraction": True
            }
            
            async with session.post(
                "http://rag-engine:8080/api/v1/query",
                json=query
            ) as response:
                assert response.status == 200
                result = await response.json()
                
                # Verify RAG called Taxonomy for entity extraction
                assert "entities" in result
                assert len(result["entities"]) > 0
                assert "quantum computing" in [e["text"].lower() for e in result["entities"]]
                
                # Verify response quality
                assert "answer" in result
                assert result["quality_score"] > 0.8
                assert result["sources_count"] >= 3
    
    @pytest.mark.asyncio
    async def test_rag_knowledge_graph_traversal(self):
        """Test RAG engine using Taxonomy's knowledge graph"""
        async with aiohttp.ClientSession() as session:
            query = {
                "query": "How does machine learning relate to artificial intelligence?",
                "use_graph_traversal": True,
                "max_hops": 2
            }
            
            async with session.post(
                "http://rag-engine:8080/api/v1/query",
                json=query
            ) as response:
                assert response.status == 200
                result = await response.json()
                
                # Verify graph traversal was used
                assert "graph_path" in result
                assert len(result["graph_path"]) > 0
                assert "relationships" in result
                
                # Verify relationship discovery
                relationships = result["relationships"]
                assert any(r["type"] == "is_subfield_of" for r in relationships)


class TestDAGExecutionIntegration:
    """Test DAG Engine ↔ Execution Engine integration"""
    
    @pytest.mark.asyncio
    async def test_dag_workflow_execution(self):
        """Test DAG engine orchestrating task execution"""
        async with aiohttp.ClientSession() as session:
            # Step 1: Submit workflow to DAG engine
            workflow = {
                "name": "data_processing_pipeline",
                "tasks": [
                    {
                        "id": "extract",
                        "type": "extract",
                        "config": {"source": "s3://data/input.csv"}
                    },
                    {
                        "id": "transform",
                        "type": "transform",
                        "depends_on": ["extract"],
                        "config": {"operations": ["clean", "normalize"]}
                    },
                    {
                        "id": "load",
                        "type": "load",
                        "depends_on": ["transform"],
                        "config": {"destination": "postgres://db/table"}
                    }
                ]
            }
            
            async with session.post(
                "http://dag-engine:8080/api/v1/workflows",
                json=workflow
            ) as response:
                assert response.status == 201
                result = await response.json()
                workflow_id = result["workflow_id"]
            
            # Step 2: Wait for execution to complete
            max_wait = 60  # seconds
            start_time = time.time()
            
            while time.time() - start_time < max_wait:
                async with session.get(
                    f"http://dag-engine:8080/api/v1/workflows/{workflow_id}"
                ) as response:
                    assert response.status == 200
                    status = await response.json()
                    
                    if status["state"] == "completed":
                        # Verify all tasks executed successfully
                        assert len(status["tasks"]) == 3
                        assert all(t["status"] == "success" for t in status["tasks"])
                        
                        # Verify execution order
                        task_order = [t["id"] for t in status["tasks"]]
                        assert task_order.index("extract") < task_order.index("transform")
                        assert task_order.index("transform") < task_order.index("load")
                        
                        return
                    
                    elif status["state"] == "failed":
                        pytest.fail(f"Workflow failed: {status['error']}")
                
                await asyncio.sleep(2)
            
            pytest.fail("Workflow execution timeout")
    
    @pytest.mark.asyncio
    async def test_dag_parallel_execution(self):
        """Test DAG engine executing parallel tasks"""
        async with aiohttp.ClientSession() as session:
            workflow = {
                "name": "parallel_processing",
                "tasks": [
                    {"id": "task1", "type": "process", "config": {"duration": 5}},
                    {"id": "task2", "type": "process", "config": {"duration": 5}},
                    {"id": "task3", "type": "process", "config": {"duration": 5}},
                    {
                        "id": "merge",
                        "type": "merge",
                        "depends_on": ["task1", "task2", "task3"]
                    }
                ]
            }
            
            start_time = time.time()
            
            async with session.post(
                "http://dag-engine:8080/api/v1/workflows",
                json=workflow
            ) as response:
                workflow_id = (await response.json())["workflow_id"]
            
            # Wait for completion
            while True:
                async with session.get(
                    f"http://dag-engine:8080/api/v1/workflows/{workflow_id}"
                ) as response:
                    status = await response.json()
                    if status["state"] == "completed":
                        break
                await asyncio.sleep(1)
            
            execution_time = time.time() - start_time
            
            # Verify parallel execution (should be ~5s, not 15s)
            assert execution_time < 10, "Tasks should execute in parallel"


class TestGovernanceIntegration:
    """Test Governance Engine integration with all engines"""
    
    @pytest.mark.asyncio
    async def test_governance_policy_enforcement(self):
        """Test Governance engine enforcing policies across engines"""
        async with aiohttp.ClientSession() as session:
            # Step 1: Create a restrictive policy
            policy = {
                "name": "rate_limit_policy",
                "type": "rate_limit",
                "rules": [
                    {
                        "resource": "rag-engine",
                        "max_requests_per_minute": 10
                    }
                ]
            }
            
            async with session.post(
                "http://governance-engine:8080/api/v1/policies",
                json=policy
            ) as response:
                assert response.status == 201
                policy_id = (await response.json())["policy_id"]
            
            # Step 2: Make requests to RAG engine
            success_count = 0
            rate_limited_count = 0
            
            for i in range(15):
                async with session.post(
                    "http://rag-engine:8080/api/v1/query",
                    json={"query": f"test query {i}"}
                ) as response:
                    if response.status == 200:
                        success_count += 1
                    elif response.status == 429:  # Too Many Requests
                        rate_limited_count += 1
            
            # Verify policy was enforced
            assert success_count <= 10
            assert rate_limited_count >= 5
            
            # Cleanup
            await session.delete(
                f"http://governance-engine:8080/api/v1/policies/{policy_id}"
            )
    
    @pytest.mark.asyncio
    async def test_governance_audit_logging(self):
        """Test Governance engine logging all engine activities"""
        async with aiohttp.ClientSession() as session:
            # Step 1: Perform various operations
            operations = [
                ("POST", "http://rag-engine:8080/api/v1/query", {"query": "test"}),
                ("POST", "http://dag-engine:8080/api/v1/workflows", {"name": "test"}),
                ("GET", "http://registry:8080/api/v1/artifacts", None)
            ]
            
            for method, url, data in operations:
                if method == "POST":
                    await session.post(url, json=data)
                else:
                    await session.get(url)
            
            # Step 2: Query audit logs
            await asyncio.sleep(2)  # Allow time for logs to be written
            
            async with session.get(
                "http://governance-engine:8080/api/v1/audit/logs",
                params={"limit": 10}
            ) as response:
                assert response.status == 200
                logs = await response.json()
                
                # Verify all operations were logged
                assert len(logs["entries"]) >= 3
                
                # Verify log structure
                for log in logs["entries"]:
                    assert "timestamp" in log
                    assert "user" in log
                    assert "action" in log
                    assert "resource" in log
                    assert "result" in log


class TestPromotionRegistryIntegration:
    """Test Promotion Engine ↔ Artifact Registry integration"""
    
    @pytest.mark.asyncio
    async def test_artifact_promotion_flow(self):
        """Test promoting artifact from staging to production"""
        async with aiohttp.ClientSession() as session:
            # Step 1: Upload artifact to staging
            artifact = {
                "name": "model-v1.0.0",
                "type": "ml_model",
                "environment": "staging",
                "content": "base64_encoded_model_data"
            }
            
            async with session.post(
                "http://registry:8080/api/v1/artifacts",
                json=artifact
            ) as response:
                assert response.status == 201
                artifact_id = (await response.json())["artifact_id"]
            
            # Step 2: Request promotion to production
            promotion_request = {
                "artifact_id": artifact_id,
                "source_environment": "staging",
                "target_environment": "production",
                "strategy": "canary",
                "canary_percentage": 10
            }
            
            async with session.post(
                "http://promotion-engine:8080/api/v1/promotions",
                json=promotion_request
            ) as response:
                assert response.status == 201
                promotion_id = (await response.json())["promotion_id"]
            
            # Step 3: Wait for promotion to complete
            max_wait = 120
            start_time = time.time()
            
            while time.time() - start_time < max_wait:
                async with session.get(
                    f"http://promotion-engine:8080/api/v1/promotions/{promotion_id}"
                ) as response:
                    status = await response.json()
                    
                    if status["state"] == "completed":
                        # Verify artifact is in production
                        async with session.get(
                            f"http://registry:8080/api/v1/artifacts/{artifact_id}"
                        ) as artifact_response:
                            artifact_data = await artifact_response.json()
                            assert "production" in artifact_data["environments"]
                        
                        return
                    
                    elif status["state"] == "failed":
                        pytest.fail(f"Promotion failed: {status['error']}")
                
                await asyncio.sleep(5)
            
            pytest.fail("Promotion timeout")


class TestEndToEndFlow:
    """Test complete end-to-end flows across multiple engines"""
    
    @pytest.mark.asyncio
    async def test_complete_rag_pipeline(self):
        """Test complete RAG pipeline with all integrations"""
        async with aiohttp.ClientSession() as session:
            # Step 1: Upload document to registry
            document = {
                "name": "research_paper.pdf",
                "type": "document",
                "content": "base64_encoded_pdf_content",
                "metadata": {
                    "title": "Advances in Quantum Computing",
                    "authors": ["John Doe", "Jane Smith"]
                }
            }
            
            async with session.post(
                "http://registry:8080/api/v1/artifacts",
                json=document
            ) as response:
                doc_id = (await response.json())["artifact_id"]
            
            # Step 2: Index document (triggers Taxonomy for entity extraction)
            async with session.post(
                "http://rag-engine:8080/api/v1/index",
                json={"artifact_id": doc_id}
            ) as response:
                assert response.status == 202
                response_json = await response.json()
                index_job_id = response_json.get("job_id")
                assert index_job_id is not None
            
            # Wait for indexing to complete
            await asyncio.sleep(10)
            
            # Step 3: Query RAG engine
            query = {
                "query": "What are the key findings about quantum computing?",
                "use_entity_extraction": True,
                "use_graph_traversal": True
            }
            
            async with session.post(
                "http://rag-engine:8080/api/v1/query",
                json=query
            ) as response:
                assert response.status == 200
                result = await response.json()
                
                # Verify complete pipeline execution
                assert "answer" in result
                assert "entities" in result
                assert "graph_path" in result
                assert "sources" in result
                assert doc_id in [s["artifact_id"] for s in result["sources"]]
                
                # Verify quality
                assert result["quality_score"] > 0.7
            
            # Step 4: Verify audit logs
            async with session.get(
                "http://governance-engine:8080/api/v1/audit/logs",
                params={"resource_id": doc_id}
            ) as response:
                logs = await response.json()
                
                # Verify all operations were logged
                operations = [log["action"] for log in logs["entries"]]
                assert "artifact_upload" in operations
                assert "document_index" in operations
                assert "query_execute" in operations


# Test Configuration
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_test_environment():
    """Setup test environment before running tests"""
    # Wait for all services to be ready
    await asyncio.sleep(5)
    
    # Health check all engines
    engines = [
        "http://rag-engine:8080/health",
        "http://dag-engine:8080/health",
        "http://governance-engine:8080/health",
        "http://taxonomy-engine:8080/health",
        "http://execution-engine:8080/health",
        "http://validation-engine:8080/health",
        "http://promotion-engine:8080/health",
        "http://registry:8080/health"
    ]
    
    async with aiohttp.ClientSession() as session:
        for engine_url in engines:
            try:
                async with session.get(engine_url) as response:
                    assert response.status == 200
            except Exception as e:
                pytest.fail(f"Engine not ready: {engine_url} - {e}")
    
    yield
    
    # Cleanup after tests
    # (Add cleanup logic here if needed)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])