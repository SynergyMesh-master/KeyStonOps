/**
 * Performance Benchmark Tests
 * 
 * Comprehensive performance testing for all engines
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createRAGEngine } from '../../engines/rag';
import { createDAGBuilder } from '../../engines/dag/builder/dag-builder';
import { createPolicyEvaluator } from '../../engines/governance/policy/policy-evaluator';
import { createRBACManager } from '../../engines/governance/rbac/rbac-manager';

describe('Performance Benchmarks', () => {
  const ITERATIONS = 1000;
  const PERCENTILES = [50, 95, 99];

  /**
   * Calculate percentile
   */
  function percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Run benchmark
   */
  async function benchmark(
    name: string,
    fn: () => Promise<void>,
    iterations: number = ITERATIONS
  ): Promise<{ p50: number; p95: number; p99: number; avg: number }> {
    const latencies: number[] = [];
    
    // Warmup
    for (let i = 0; i < 10; i++) {
      await fn();
    }
    
    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      const duration = Date.now() - start;
      latencies.push(duration);
    }
    
    const results = {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length
    };
    
    console.log(`\n${name}:`);
    console.log(`  P50: ${results.p50}ms`);
    console.log(`  P95: ${results.p95}ms`);
    console.log(`  P99: ${results.p99}ms`);
    console.log(`  Avg: ${results.avg.toFixed(2)}ms`);
    
    return results;
  }

  describe('RAG Engine Benchmarks', () => {
    let ragEngine: any;

    beforeAll(async () => {
      ragEngine = createRAGEngine({
        embedding_model: 'test-model',
        embedding_dimension: 128,
        normalize: true,
        batch_size: 10
      });
      await ragEngine.initialize();
      
      // Prepare test data
      const texts = [
        'Machine learning is a subset of artificial intelligence.',
        'Deep learning uses neural networks.',
        'Natural language processing helps computers understand text.'
      ];
      
      for (const text of texts) {
        const chunks = await ragEngine.vectorRAG.semanticChunking(text, 'test');
        await ragEngine.vectorRAG.storeChunks(chunks);
      }
    });

    it('should meet vector query latency target (<50ms)', async () => {
      const results = await benchmark(
        'RAG Vector Query',
        async () => {
          await ragEngine.vectorRAG.query({
            query: 'machine learning',
            top_k: 5
          });
        }
      );
      
      expect(results.p50).toBeLessThan(50);
      expect(results.p95).toBeLessThan(50);
      expect(results.p99).toBeLessThan(50);
    });

    it('should achieve target throughput (>1000 QPS)', async () => {
      const startTime = Date.now();
      const queries = 1000;
      
      const promises = [];
      for (let i = 0; i < queries; i++) {
        promises.push(
          ragEngine.vectorRAG.query({
            query: 'test query',
            top_k: 5
          })
        );
      }
      
      await Promise.all(promises);
      
      const duration = (Date.now() - startTime) / 1000; // seconds
      const qps = queries / duration;
      
      console.log(`\nRAG Throughput: ${qps.toFixed(0)} QPS`);
      expect(qps).toBeGreaterThan(1000);
    });
  });

  describe('DAG Engine Benchmarks', () => {
    let dagBuilder: any;

    beforeAll(() => {
      dagBuilder = createDAGBuilder();
    });

    it('should meet DAG build latency target (<10ms)', async () => {
      const results = await benchmark(
        'DAG Build',
        async () => {
          const builder = createDAGBuilder();
          
          // Create simple DAG
          builder.addNode({
            id: 'node1',
            name: 'Node 1',
            type: 'task',
            dependencies: [],
            status: 'pending'
          });
          
          builder.addNode({
            id: 'node2',
            name: 'Node 2',
            type: 'task',
            dependencies: ['node1'],
            status: 'pending'
          });
          
          builder.validate();
        }
      );
      
      expect(results.p50).toBeLessThan(10);
      expect(results.p95).toBeLessThan(10);
      expect(results.p99).toBeLessThan(10);
    });

    it('should handle large DAGs efficiently', async () => {
      const builder = createDAGBuilder();
      const nodeCount = 1000;
      
      const startTime = Date.now();
      
      // Create large DAG
      for (let i = 0; i < nodeCount; i++) {
        builder.addNode({
          id: `node${i}`,
          name: `Node ${i}`,
          type: 'task',
          dependencies: i > 0 ? [`node${i - 1}`] : [],
          status: 'pending'
        });
      }
      
      builder.validate();
      builder.topologicalSort();
      
      const duration = Date.now() - startTime;
      
      console.log(`\nLarge DAG (${nodeCount} nodes): ${duration}ms`);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Governance Engine Benchmarks', () => {
    let policyEvaluator: any;
    let rbacManager: any;

    beforeAll(async () => {
      policyEvaluator = createPolicyEvaluator();
      rbacManager = createRBACManager();
      
      // Setup test policy
      await policyEvaluator.registerPolicy({
        id: 'test-policy',
        name: 'Test Policy',
        version: '1.0.0',
        rules: [
          {
            id: 'rule1',
            condition: 'context.role === "admin"',
            action: 'allow',
            priority: 100
          }
        ],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'test'
        }
      });
      
      // Setup test role
      await rbacManager.assignRole('test-user', 'admin');
    });

    it('should meet policy evaluation latency target (<20ms)', async () => {
      const results = await benchmark(
        'Policy Evaluation',
        async () => {
          await policyEvaluator.evaluate({
            policy_id: 'test-policy',
            context: { role: 'admin' },
            resource: 'artifact',
            action: 'read'
          });
        }
      );
      
      expect(results.p50).toBeLessThan(20);
      expect(results.p95).toBeLessThan(20);
      expect(results.p99).toBeLessThan(20);
    });

    it('should meet RBAC check latency target (<10ms)', async () => {
      const results = await benchmark(
        'RBAC Permission Check',
        async () => {
          await rbacManager.checkPermission({
            user_id: 'test-user',
            resource: 'artifact',
            action: 'read'
          });
        }
      );
      
      expect(results.p50).toBeLessThan(10);
      expect(results.p95).toBeLessThan(10);
      expect(results.p99).toBeLessThan(10);
    });
  });

  describe('End-to-End Workflow Benchmark', () => {
    it('should complete full workflow within budget', async () => {
      const ragEngine = createRAGEngine({
        embedding_model: 'test-model',
        embedding_dimension: 128,
        normalize: true,
        batch_size: 10
      });
      await ragEngine.initialize();
      
      const dagBuilder = createDAGBuilder();
      const policyEvaluator = createPolicyEvaluator();
      
      const results = await benchmark(
        'End-to-End Workflow',
        async () => {
          // 1. Policy check
          await policyEvaluator.evaluate({
            policy_id: 'test-policy',
            context: { role: 'admin' },
            resource: 'artifact',
            action: 'read'
          });
          
          // 2. RAG query
          await ragEngine.query('test query', { top_k: 5 });
          
          // 3. DAG validation
          dagBuilder.validate();
        },
        100
      );
      
      // Total workflow should complete in <100ms
      expect(results.p95).toBeLessThan(100);
    });
  });
});