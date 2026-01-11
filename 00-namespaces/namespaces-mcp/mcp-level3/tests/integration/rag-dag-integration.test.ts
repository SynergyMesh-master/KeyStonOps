/**
 * RAG-DAG Integration Tests
 * 
 * Tests integration between RAG and DAG engines
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createRAGEngine } from '../../engines/rag';
import { createDAGBuilder } from '../../engines/dag/builder/dag-builder';

describe('RAG-DAG Integration', () => {
  let ragEngine: any;
  let dagBuilder: any;

  beforeAll(async () => {
    // Initialize engines
    ragEngine = createRAGEngine({
      embedding_model: 'test-model',
      embedding_dimension: 128,
      normalize: true,
      batch_size: 10
    });
    
    await ragEngine.initialize();
    
    dagBuilder = createDAGBuilder();
  });

  afterAll(() => {
    ragEngine.clear();
    dagBuilder.clear();
  });

  describe('RAG-to-DAG Workflow', () => {
    it('should create DAG from RAG retrieval workflow', async () => {
      // Define RAG workflow as DAG
      dagBuilder.addNode({
        id: 'chunk',
        name: 'Semantic Chunking',
        type: 'rag_operation',
        dependencies: [],
        metadata: { operation: 'chunk' },
        status: 'pending'
      });
      
      dagBuilder.addNode({
        id: 'embed',
        name: 'Generate Embeddings',
        type: 'rag_operation',
        dependencies: ['chunk'],
        metadata: { operation: 'embed' },
        status: 'pending'
      });
      
      dagBuilder.addNode({
        id: 'store',
        name: 'Store Vectors',
        type: 'rag_operation',
        dependencies: ['embed'],
        metadata: { operation: 'store' },
        status: 'pending'
      });
      
      dagBuilder.addNode({
        id: 'query',
        name: 'Query Vectors',
        type: 'rag_operation',
        dependencies: ['store'],
        metadata: { operation: 'query' },
        status: 'pending'
      });
      
      // Validate DAG
      const validation = dagBuilder.validate();
      expect(validation.valid).toBe(true);
      
      // Get execution order
      const order = dagBuilder.topologicalSort();
      expect(order).toEqual(['chunk', 'embed', 'store', 'query']);
    });

    it('should execute RAG workflow following DAG order', async () => {
      const text = 'Integration test document.';
      
      // Execute workflow in DAG order
      const chunks = await ragEngine.vectorRAG.semanticChunking(text, 'test-source');
      await ragEngine.vectorRAG.storeChunks(chunks);
      const result = await ragEngine.vectorRAG.query({
        query: 'integration test',
        top_k: 1
      });
      
      expect(result.chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Hybrid RAG Workflow DAG', () => {
    it('should create parallel execution stages for hybrid retrieval', async () => {
      // Vector retrieval branch
      dagBuilder.addNode({
        id: 'vector_query',
        name: 'Vector Query',
        type: 'rag_operation',
        dependencies: [],
        metadata: { operation: 'vector_query' },
        status: 'pending'
      });
      
      // Graph retrieval branch
      dagBuilder.addNode({
        id: 'graph_query',
        name: 'Graph Query',
        type: 'rag_operation',
        dependencies: [],
        metadata: { operation: 'graph_query' },
        status: 'pending'
      });
      
      // Merge results
      dagBuilder.addNode({
        id: 'merge',
        name: 'Merge Results',
        type: 'rag_operation',
        dependencies: ['vector_query', 'graph_query'],
        metadata: { operation: 'merge' },
        status: 'pending'
      });
      
      // Get execution stages
      const stages = dagBuilder.getExecutionStages();
      
      // First stage should have both queries (parallel)
      expect(stages[0]).toContain('vector_query');
      expect(stages[0]).toContain('graph_query');
      
      // Second stage should have merge
      expect(stages[1]).toContain('merge');
    });
  });

  describe('Performance', () => {
    it('should complete integration workflow within time budget', async () => {
      const startTime = Date.now();
      
      // Execute complete workflow
      const text = 'Performance test document.';
      const chunks = await ragEngine.vectorRAG.semanticChunking(text, 'test-source');
      await ragEngine.vectorRAG.storeChunks(chunks);
      await ragEngine.vectorRAG.query({ query: 'performance', top_k: 1 });
      
      const duration = Date.now() - startTime;
      
      // Should complete within 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});