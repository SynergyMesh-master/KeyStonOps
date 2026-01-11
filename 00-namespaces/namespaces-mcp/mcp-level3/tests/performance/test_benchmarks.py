"""
MCP Level 3 - Performance Benchmark Tests

Measures performance characteristics of each engine under various load conditions.
"""

import pytest
import asyncio
import aiohttp
import time
from typing import List, Dict, Any
from dataclasses import dataclass
import json


@dataclass
class BenchmarkResult:
    """Container for benchmark results"""
    operation: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    duration_seconds: float
    throughput_rps: float
    latencies_ms: List[float]
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    error_rate: float


class PerformanceBenchmark:
    """Base class for performance benchmarks"""
    
    @staticmethod
    def calculate_percentile(data: List[float], percentile: float) -> float:
        """Calculate percentile from sorted data"""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile)
        return sorted_data[min(index, len(sorted_data) - 1)]
    
    @staticmethod
    async def run_concurrent_requests(
        session: aiohttp.ClientSession,
        url: str,
        method: str,
        data: Dict[str, Any],
        num_requests: int,
        concurrency: int
    ) -> BenchmarkResult:
        """Run concurrent requests and measure performance"""
        latencies = []
        successful = 0
        failed = 0
        
        async def make_request():
            nonlocal successful, failed
            start = time.time()
            try:
                if method == "POST":
                    async with session.post(url, json=data, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        await response.read()
                        if response.status == 200:
                            successful += 1
                        else:
                            failed += 1
                else:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        await response.read()
                        if response.status == 200:
                            successful += 1
                        else:
                            failed += 1
                latency = (time.time() - start) * 1000  # Convert to ms
                latencies.append(latency)
            except Exception as e:
                failed += 1
                latencies.append(0)
        
        start_time = time.time()
        
        # Execute requests in batches based on concurrency
        for i in range(0, num_requests, concurrency):
            batch_size = min(concurrency, num_requests - i)
            tasks = [make_request() for _ in range(batch_size)]
            await asyncio.gather(*tasks)
        
        duration = time.time() - start_time
        throughput = num_requests / duration if duration > 0 else 0
        
        valid_latencies = [l for l in latencies if l > 0]
        
        return BenchmarkResult(
            operation=f"{method} {url}",
            total_requests=num_requests,
            successful_requests=successful,
            failed_requests=failed,
            duration_seconds=duration,
            throughput_rps=throughput,
            latencies_ms=valid_latencies,
            p50_latency_ms=PerformanceBenchmark.calculate_percentile(valid_latencies, 0.50),
            p95_latency_ms=PerformanceBenchmark.calculate_percentile(valid_latencies, 0.95),
            p99_latency_ms=PerformanceBenchmark.calculate_percentile(valid_latencies, 0.99),
            error_rate=failed / num_requests if num_requests > 0 else 0
        )


class TestRAGEngineBenchmark:
    """Benchmark tests for RAG Engine"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_rag_query_performance(self):
        """Benchmark RAG query performance"""
        async with aiohttp.ClientSession() as session:
            query = {
                "query": "What is machine learning?",
                "context_size": 5
            }
            
            result = await PerformanceBenchmark.run_concurrent_requests(
                session=session,
                url="http://rag-engine:8080/api/v1/query",
                method="POST",
                data=query,
                num_requests=1000,
                concurrency=50
            )
            
            # Performance assertions
            assert result.p50_latency_ms < 150, f"P50 latency too high: {result.p50_latency_ms}ms"
            assert result.p99_latency_ms < 1000, f"P99 latency too high: {result.p99_latency_ms}ms"
            assert result.error_rate < 0.01, f"Error rate too high: {result.error_rate}"
            assert result.throughput_rps > 100, f"Throughput too low: {result.throughput_rps} req/s"
            
            print(f"\n{'='*60}")
            print(f"RAG Engine Query Benchmark Results:")
            print(f"{'='*60}")
            print(f"Total Requests: {result.total_requests}")
            print(f"Successful: {result.successful_requests}")
            print(f"Failed: {result.failed_requests}")
            print(f"Duration: {result.duration_seconds:.2f}s")
            print(f"Throughput: {result.throughput_rps:.2f} req/s")
            print(f"P50 Latency: {result.p50_latency_ms:.2f}ms")
            print(f"P95 Latency: {result.p95_latency_ms:.2f}ms")
            print(f"P99 Latency: {result.p99_latency_ms:.2f}ms")
            print(f"Error Rate: {result.error_rate*100:.2f}%")
            print(f"{'='*60}\n")
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_rag_vector_search_performance(self):
        """Benchmark RAG vector search performance"""
        async with aiohttp.ClientSession() as session:
            search = {
                "query_vector": [0.1] * 768,  # Simulated embedding
                "top_k": 10
            }
            
            result = await PerformanceBenchmark.run_concurrent_requests(
                session=session,
                url="http://rag-engine:8080/api/v1/search/vector",
                method="POST",
                data=search,
                num_requests=2000,
                concurrency=100
            )
            
            assert result.p50_latency_ms < 50, f"P50 latency too high: {result.p50_latency_ms}ms"
            assert result.throughput_rps > 500, f"Throughput too low: {result.throughput_rps} req/s"


class TestDAGEngineBenchmark:
    """Benchmark tests for DAG Engine"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_dag_workflow_submission_performance(self):
        """Benchmark DAG workflow submission performance"""
        async with aiohttp.ClientSession() as session:
            workflow = {
                "name": "benchmark_workflow",
                "tasks": [
                    {"id": "task1", "type": "process"},
                    {"id": "task2", "type": "process", "depends_on": ["task1"]}
                ]
            }
            
            result = await PerformanceBenchmark.run_concurrent_requests(
                session=session,
                url="http://dag-engine:8080/api/v1/workflows",
                method="POST",
                data=workflow,
                num_requests=500,
                concurrency=25
            )
            
            assert result.p50_latency_ms < 200, f"P50 latency too high: {result.p50_latency_ms}ms"
            assert result.error_rate < 0.05, f"Error rate too high: {result.error_rate}"
            
            print(f"\n{'='*60}")
            print(f"DAG Engine Workflow Submission Benchmark:")
            print(f"{'='*60}")
            print(f"Throughput: {result.throughput_rps:.2f} workflows/s")
            print(f"P50 Latency: {result.p50_latency_ms:.2f}ms")
            print(f"P99 Latency: {result.p99_latency_ms:.2f}ms")
            print(f"{'='*60}\n")


class TestGovernanceEngineBenchmark:
    """Benchmark tests for Governance Engine"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_governance_auth_performance(self):
        """Benchmark Governance authentication performance"""
        async with aiohttp.ClientSession() as session:
            auth_request = {
                "token": "test_token_12345",
                "resource": "rag-engine",
                "action": "query"
            }
            
            result = await PerformanceBenchmark.run_concurrent_requests(
                session=session,
                url="http://governance-engine:8080/api/v1/auth/verify",
                method="POST",
                data=auth_request,
                num_requests=5000,
                concurrency=200
            )
            
            # Governance should be very fast due to caching
            assert result.p50_latency_ms < 20, f"P50 latency too high: {result.p50_latency_ms}ms"
            assert result.throughput_rps > 1000, f"Throughput too low: {result.throughput_rps} req/s"
            
            print(f"\n{'='*60}")
            print(f"Governance Engine Auth Benchmark:")
            print(f"{'='*60}")
            print(f"Throughput: {result.throughput_rps:.2f} req/s")
            print(f"P50 Latency: {result.p50_latency_ms:.2f}ms")
            print(f"Cache Hit Rate: ~95% (expected)")
            print(f"{'='*60}\n")


class TestExecutionEngineBenchmark:
    """Benchmark tests for Execution Engine"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_execution_task_throughput(self):
        """Benchmark Execution engine task throughput"""
        async with aiohttp.ClientSession() as session:
            task = {
                "type": "compute",
                "config": {
                    "operation": "sum",
                    "data": list(range(1000))
                }
            }
            
            result = await PerformanceBenchmark.run_concurrent_requests(
                session=session,
                url="http://execution-engine:8080/api/v1/tasks",
                method="POST",
                data=task,
                num_requests=1000,
                concurrency=50
            )
            
            assert result.throughput_rps > 50, f"Throughput too low: {result.throughput_rps} tasks/s"
            assert result.error_rate < 0.02, f"Error rate too high: {result.error_rate}"


class TestValidationEngineBenchmark:
    """Benchmark tests for Validation Engine"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_validation_performance(self):
        """Benchmark Validation engine performance"""
        async with aiohttp.ClientSession() as session:
            validation_request = {
                "schema_id": "test_schema_v1",
                "data": {
                    "field1": "value1",
                    "field2": 123,
                    "field3": ["a", "b", "c"]
                }
            }
            
            result = await PerformanceBenchmark.run_concurrent_requests(
                session=session,
                url="http://validation-engine:8080/api/v1/validate",
                method="POST",
                data=validation_request,
                num_requests=2000,
                concurrency=100
            )
            
            assert result.p50_latency_ms < 100, f"P50 latency too high: {result.p50_latency_ms}ms"
            assert result.throughput_rps > 200, f"Throughput too low: {result.throughput_rps} req/s"


class TestArtifactRegistryBenchmark:
    """Benchmark tests for Artifact Registry"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_registry_upload_performance(self):
        """Benchmark Artifact Registry upload performance"""
        async with aiohttp.ClientSession() as session:
            # Test with 1MB artifact
            artifact = {
                "name": "benchmark_artifact",
                "type": "data",
                "content": "x" * (1024 * 1024),  # 1MB
                "metadata": {"size": 1048576}
            }
            
            result = await PerformanceBenchmark.run_concurrent_requests(
                session=session,
                url="http://registry:8080/api/v1/artifacts",
                method="POST",
                data=artifact,
                num_requests=100,
                concurrency=10
            )
            
            assert result.throughput_rps > 10, f"Throughput too low: {result.throughput_rps} uploads/s"
            assert result.error_rate < 0.05, f"Error rate too high: {result.error_rate}"
            
            print(f"\n{'='*60}")
            print(f"Artifact Registry Upload Benchmark (1MB):")
            print(f"{'='*60}")
            print(f"Throughput: {result.throughput_rps:.2f} uploads/s")
            print(f"P50 Latency: {result.p50_latency_ms:.2f}ms")
            print(f"P99 Latency: {result.p99_latency_ms:.2f}ms")
            print(f"{'='*60}\n")
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_registry_download_performance(self):
        """Benchmark Artifact Registry download performance"""
        async with aiohttp.ClientSession() as session:
            # First upload an artifact
            artifact = {
                "name": "download_benchmark",
                "type": "data",
                "content": "x" * (10 * 1024 * 1024)  # 10MB
            }
            
            async with session.post(
                "http://registry:8080/api/v1/artifacts",
                json=artifact
            ) as response:
                artifact_id = (await response.json())["artifact_id"]
            
            # Benchmark downloads
            result = await PerformanceBenchmark.run_concurrent_requests(
                session=session,
                url=f"http://registry:8080/api/v1/artifacts/{artifact_id}/download",
                method="GET",
                data={},
                num_requests=200,
                concurrency=20
            )
            
            assert result.throughput_rps > 20, f"Throughput too low: {result.throughput_rps} downloads/s"


class TestEndToEndBenchmark:
    """End-to-end performance benchmarks"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_complete_rag_pipeline_latency(self):
        """Benchmark complete RAG pipeline end-to-end latency"""
        async with aiohttp.ClientSession() as session:
            latencies = []
            
            for i in range(100):
                start = time.time()
                
                # Complete RAG query with all integrations
                query = {
                    "query": f"Test query {i}",
                    "use_entity_extraction": True,
                    "use_graph_traversal": True,
                    "use_validation": True
                }
                
                async with session.post(
                    "http://rag-engine:8080/api/v1/query",
                    json=query
                ) as response:
                    await response.read()
                    if response.status == 200:
                        latency = (time.time() - start) * 1000
                        latencies.append(latency)
            
            p50 = PerformanceBenchmark.calculate_percentile(latencies, 0.50)
            p95 = PerformanceBenchmark.calculate_percentile(latencies, 0.95)
            p99 = PerformanceBenchmark.calculate_percentile(latencies, 0.99)
            
            print(f"\n{'='*60}")
            print(f"Complete RAG Pipeline End-to-End Latency:")
            print(f"{'='*60}")
            print(f"P50: {p50:.2f}ms")
            print(f"P95: {p95:.2f}ms")
            print(f"P99: {p99:.2f}ms")
            print(f"Target P50: <310ms")
            print(f"Target P99: <1500ms")
            print(f"{'='*60}\n")
            
            assert p50 < 310, f"P50 latency exceeds target: {p50}ms"
            assert p99 < 1500, f"P99 latency exceeds target: {p99}ms"


# Benchmark report generation
@pytest.fixture(scope="session", autouse=True)
def benchmark_report(request):
    """Generate benchmark report after all tests"""
    yield
    
    # Generate report
    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "summary": "MCP Level 3 Performance Benchmark Report",
        "targets": {
            "rag_query_p50": "< 150ms",
            "rag_query_p99": "< 1000ms",
            "rag_throughput": "> 100 req/s",
            "dag_submission_p50": "< 200ms",
            "governance_auth_p50": "< 20ms",
            "governance_throughput": "> 1000 req/s",
            "execution_throughput": "> 50 tasks/s",
            "validation_p50": "< 100ms",
            "registry_upload_throughput": "> 10 uploads/s",
            "end_to_end_p50": "< 310ms",
            "end_to_end_p99": "< 1500ms"
        }
    }
    
    with open("/workspace/benchmark_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n{'='*60}")
    print("Benchmark report saved to: /workspace/benchmark_report.json")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "benchmark", "--asyncio-mode=auto"])