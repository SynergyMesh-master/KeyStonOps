"""
MCP Level 3 - Load Testing

Tests system behavior under sustained and spike load conditions.
"""

import pytest
import asyncio
import aiohttp
import time
from dataclasses import dataclass
import random


@dataclass
class LoadTestResult:
    """Container for load test results"""
    test_name: str
    duration_seconds: float
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_latency_ms: float
    max_latency_ms: float
    min_latency_ms: float
    requests_per_second: float
    error_rate: float


class LoadTester:
    """Base class for load testing"""
    
    @staticmethod
    async def sustained_load_test(
        session: aiohttp.ClientSession,
        url: str,
        method: str,
        data_generator,
        duration_seconds: int,
        requests_per_second: int
    ) -> LoadTestResult:
        """Run sustained load test"""
        start_time = time.time()
        end_time = start_time + duration_seconds
        
        latencies = []
        successful = 0
        failed = 0
        total = 0
        
        async def make_request():
            nonlocal successful, failed, total
            total += 1
            request_start = time.time()
            
            try:
                data = data_generator()
                if method == "POST":
                    async with session.post(url, json=data, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        await response.read()
                        if 200 <= response.status < 300:
                            successful += 1
                        else:
                            failed += 1
                else:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        await response.read()
                        if 200 <= response.status < 300:
                            successful += 1
                        else:
                            failed += 1
                
                latency = (time.time() - request_start) * 1000
                latencies.append(latency)
            except Exception as e:
                failed += 1
        
        # Calculate delay between requests
        delay = 1.0 / requests_per_second
        
        while time.time() < end_time:
            await make_request()
            await asyncio.sleep(delay)
        
        actual_duration = time.time() - start_time
        
        return LoadTestResult(
            test_name="Sustained Load Test",
            duration_seconds=actual_duration,
            total_requests=total,
            successful_requests=successful,
            failed_requests=failed,
            avg_latency_ms=sum(latencies) / len(latencies) if latencies else 0,
            max_latency_ms=max(latencies) if latencies else 0,
            min_latency_ms=min(latencies) if latencies else 0,
            requests_per_second=total / actual_duration if actual_duration > 0 else 0,
            error_rate=failed / total if total > 0 else 0
        )
    
    @staticmethod
    async def spike_load_test(
        session: aiohttp.ClientSession,
        url: str,
        method: str,
        data_generator,
        baseline_rps: int,
        spike_rps: int,
        spike_duration_seconds: int
    ) -> LoadTestResult:
        """Run spike load test"""
        start_time = time.time()
        
        latencies = []
        successful = 0
        failed = 0
        total = 0
        
        async def make_request():
            nonlocal successful, failed, total
            total += 1
            request_start = time.time()
            
            try:
                data = data_generator()
                if method == "POST":
                    async with session.post(url, json=data, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        await response.read()
                        if 200 <= response.status < 300:
                            successful += 1
                        else:
                            failed += 1
                else:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        await response.read()
                        if 200 <= response.status < 300:
                            successful += 1
                        else:
                            failed += 1
                
                latency = (time.time() - request_start) * 1000
                latencies.append(latency)
            except Exception as e:
                failed += 1
        
        # Phase 1: Baseline load (30 seconds)
        baseline_delay = 1.0 / baseline_rps
        baseline_end = start_time + 30
        
        while time.time() < baseline_end:
            await make_request()
            await asyncio.sleep(baseline_delay)
        
        # Phase 2: Spike load
        spike_delay = 1.0 / spike_rps
        spike_end = time.time() + spike_duration_seconds
        
        while time.time() < spike_end:
            await make_request()
            await asyncio.sleep(spike_delay)
        
        # Phase 3: Return to baseline (30 seconds)
        baseline_end = time.time() + 30
        
        while time.time() < baseline_end:
            await make_request()
            await asyncio.sleep(baseline_delay)
        
        actual_duration = time.time() - start_time
        
        return LoadTestResult(
            test_name="Spike Load Test",
            duration_seconds=actual_duration,
            total_requests=total,
            successful_requests=successful,
            failed_requests=failed,
            avg_latency_ms=sum(latencies) / len(latencies) if latencies else 0,
            max_latency_ms=max(latencies) if latencies else 0,
            min_latency_ms=min(latencies) if latencies else 0,
            requests_per_second=total / actual_duration if actual_duration > 0 else 0,
            error_rate=failed / total if total > 0 else 0
        )


class TestRAGEngineLoad:
    """Load tests for RAG Engine"""
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_rag_sustained_load_1_hour(self):
        """Test RAG engine under sustained load for 1 hour"""
        async with aiohttp.ClientSession() as session:
            
            def query_generator():
                queries = [
                    "What is machine learning?",
                    "Explain quantum computing",
                    "How does blockchain work?",
                    "What are neural networks?",
                    "Describe cloud computing"
                ]
                return {
                    "query": random.choice(queries),
                    "context_size": 5
                }
            
            result = await LoadTester.sustained_load_test(
                session=session,
                url="http://rag-engine:8080/api/v1/query",
                method="POST",
                data_generator=query_generator,
                duration_seconds=3600,  # 1 hour
                requests_per_second=100
            )
            
            print(f"\n{'='*60}")
            print(f"RAG Engine Sustained Load Test (1 Hour):")
            print(f"{'='*60}")
            print(f"Duration: {result.duration_seconds:.2f}s")
            print(f"Total Requests: {result.total_requests}")
            print(f"Successful: {result.successful_requests}")
            print(f"Failed: {result.failed_requests}")
            print(f"Avg Latency: {result.avg_latency_ms:.2f}ms")
            print(f"Max Latency: {result.max_latency_ms:.2f}ms")
            print(f"Throughput: {result.requests_per_second:.2f} req/s")
            print(f"Error Rate: {result.error_rate*100:.2f}%")
            print(f"{'='*60}\n")
            
            # Assertions
            assert result.error_rate < 0.01, f"Error rate too high: {result.error_rate}"
            assert result.avg_latency_ms < 200, f"Average latency too high: {result.avg_latency_ms}ms"
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_rag_spike_load(self):
        """Test RAG engine response to traffic spike"""
        async with aiohttp.ClientSession() as session:
            
            def query_generator():
                return {
                    "query": "Test query",
                    "context_size": 3
                }
            
            result = await LoadTester.spike_load_test(
                session=session,
                url="http://rag-engine:8080/api/v1/query",
                method="POST",
                data_generator=query_generator,
                baseline_rps=50,
                spike_rps=500,  # 10x spike
                spike_duration_seconds=60
            )
            
            print(f"\n{'='*60}")
            print(f"RAG Engine Spike Load Test:")
            print(f"{'='*60}")
            print(f"Baseline: 50 req/s → Spike: 500 req/s → Baseline: 50 req/s")
            print(f"Total Requests: {result.total_requests}")
            print(f"Error Rate: {result.error_rate*100:.2f}%")
            print(f"Max Latency: {result.max_latency_ms:.2f}ms")
            print(f"{'='*60}\n")
            
            # System should handle spike gracefully
            assert result.error_rate < 0.05, f"Error rate too high during spike: {result.error_rate}"


class TestDAGEngineLoad:
    """Load tests for DAG Engine"""
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_dag_concurrent_workflows(self):
        """Test DAG engine with many concurrent workflows"""
        async with aiohttp.ClientSession() as session:
            
            def workflow_generator():
                num_tasks = random.randint(3, 10)
                tasks = []
                for i in range(num_tasks):
                    task = {
                        "id": f"task_{i}",
                        "type": "process",
                        "config": {"duration": random.randint(1, 5)}
                    }
                    if i > 0:
                        task["depends_on"] = [f"task_{i-1}"]
                    tasks.append(task)
                
                return {
                    "name": f"workflow_{random.randint(1000, 9999)}",
                    "tasks": tasks
                }
            
            result = await LoadTester.sustained_load_test(
                session=session,
                url="http://dag-engine:8080/api/v1/workflows",
                method="POST",
                data_generator=workflow_generator,
                duration_seconds=600,  # 10 minutes
                requests_per_second=10
            )
            
            print(f"\n{'='*60}")
            print(f"DAG Engine Concurrent Workflows Test:")
            print(f"{'='*60}")
            print(f"Total Workflows: {result.total_requests}")
            print(f"Successful: {result.successful_requests}")
            print(f"Error Rate: {result.error_rate*100:.2f}%")
            print(f"{'='*60}\n")
            
            assert result.error_rate < 0.02, f"Error rate too high: {result.error_rate}"


class TestGovernanceEngineLoad:
    """Load tests for Governance Engine"""
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_governance_high_auth_load(self):
        """Test Governance engine under high authentication load"""
        async with aiohttp.ClientSession() as session:
            
            def auth_generator():
                return {
                    "token": f"token_{random.randint(1, 100)}",
                    "resource": random.choice(["rag-engine", "dag-engine", "registry"]),
                    "action": random.choice(["read", "write", "delete"])
                }
            
            result = await LoadTester.sustained_load_test(
                session=session,
                url="http://governance-engine:8080/api/v1/auth/verify",
                method="POST",
                data_generator=auth_generator,
                duration_seconds=600,  # 10 minutes
                requests_per_second=1000
            )
            
            print(f"\n{'='*60}")
            print(f"Governance Engine High Auth Load Test:")
            print(f"{'='*60}")
            print(f"Total Requests: {result.total_requests}")
            print(f"Throughput: {result.requests_per_second:.2f} req/s")
            print(f"Avg Latency: {result.avg_latency_ms:.2f}ms")
            print(f"Error Rate: {result.error_rate*100:.2f}%")
            print(f"{'='*60}\n")
            
            # Governance should handle high load with caching
            assert result.avg_latency_ms < 30, f"Average latency too high: {result.avg_latency_ms}ms"
            assert result.error_rate < 0.01, f"Error rate too high: {result.error_rate}"


class TestArtifactRegistryLoad:
    """Load tests for Artifact Registry"""
    
    @pytest.mark.asyncio
    @pytest.mark.load
    async def test_registry_concurrent_uploads(self):
        """Test Artifact Registry with concurrent uploads"""
        async with aiohttp.ClientSession() as session:
            
            def artifact_generator():
                size_kb = random.randint(100, 1000)
                return {
                    "name": f"artifact_{random.randint(1000, 9999)}",
                    "type": "data",
                    "content": "x" * (size_kb * 1024),
                    "metadata": {"size": size_kb * 1024}
                }
            
            result = await LoadTester.sustained_load_test(
                session=session,
                url="http://registry:8080/api/v1/artifacts",
                method="POST",
                data_generator=artifact_generator,
                duration_seconds=300,  # 5 minutes
                requests_per_second=5
            )
            
            print(f"\n{'='*60}")
            print(f"Artifact Registry Concurrent Uploads Test:")
            print(f"{'='*60}")
            print(f"Total Uploads: {result.total_requests}")
            print(f"Successful: {result.successful_requests}")
            print(f"Error Rate: {result.error_rate*100:.2f}%")
            print(f"Avg Latency: {result.avg_latency_ms:.2f}ms")
            print(f"{'='*60}\n")
            
            assert result.error_rate < 0.05, f"Error rate too high: {result.error_rate}"


class TestStressTest:
    """Stress tests to find breaking points"""
    
    @pytest.mark.asyncio
    @pytest.mark.stress
    async def test_find_breaking_point(self):
        """Gradually increase load to find system breaking point"""
        async with aiohttp.ClientSession() as session:
            
            def query_generator():
                return {"query": "test query", "context_size": 3}
            
            results = []
            
            # Test at increasing load levels
            for rps in [100, 200, 500, 1000, 2000, 5000]:
                print(f"\nTesting at {rps} req/s...")
                
                result = await LoadTester.sustained_load_test(
                    session=session,
                    url="http://rag-engine:8080/api/v1/query",
                    method="POST",
                    data_generator=query_generator,
                    duration_seconds=60,
                    requests_per_second=rps
                )
                
                results.append({
                    "target_rps": rps,
                    "actual_rps": result.requests_per_second,
                    "error_rate": result.error_rate,
                    "avg_latency": result.avg_latency_ms
                })
                
                print(f"Actual RPS: {result.requests_per_second:.2f}")
                print(f"Error Rate: {result.error_rate*100:.2f}%")
                print(f"Avg Latency: {result.avg_latency_ms:.2f}ms")
                
                # Stop if error rate exceeds 10%
                if result.error_rate > 0.10:
                    print(f"\nBreaking point found at ~{rps} req/s")
                    break
                
                # Cool down between tests
                await asyncio.sleep(30)
            
            print(f"\n{'='*60}")
            print("Stress Test Results:")
            print(f"{'='*60}")
            for r in results:
                print(f"Target: {r['target_rps']} req/s | "
                      f"Actual: {r['actual_rps']:.2f} req/s | "
                      f"Error: {r['error_rate']*100:.2f}% | "
                      f"Latency: {r['avg_latency']:.2f}ms")
            print(f"{'='*60}\n")


# Test fixtures
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-m", "load", "--asyncio-mode=auto"])