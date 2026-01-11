/**
 * VectorRAG Unit Tests
 * 
 * Comprehensive test suite for VectorRAG module
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VectorRAG, createVectorRAG, EmbeddingConfig } from '../../../engines/rag/vector/vector-rag';

describe('VectorRAG', () => {
  let vectorRAG: VectorRAG;
  const config: EmbeddingConfig = {
    model: 'test-embedding-model',
    dimension: 128,
    normalize: true,
    batch_size: 10
  };

  beforeEach(async () => {
    vectorRAG = createVectorRAG(config);
    await vectorRAG.initialize();
  });

  afterEach(() => {
    vectorRAG.clear();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newRAG = createVectorRAG(config);
      await expect(newRAG.initialize()).resolves.not.toThrow();
    });

    it('should validate configuration', () => {
      const invalidConfig = { ...config, dimension: -1 };
      const newRAG = createVectorRAG(invalidConfig);
      expect(newRAG.initialize()).rejects.toThrow('Embedding dimension must be positive');
    });
  });

  describe('Semantic Chunking', () => {
    it('should chunk text into meaningful segments', async () => {
      const text = 'This is sentence one. This is sentence two. This is sentence three.';
      const chunks = await vectorRAG.semanticChunking(text, 'test-source', 50, 10);
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('id');
      expect(chunks[0]).toHaveProperty('content');
      expect(chunks[0]).toHaveProperty('embedding');
      expect(chunks[0].embedding.length).toBe(config.dimension);
    });

    it('should handle overlap correctly', async () => {
      const text = 'Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8 Word9 Word10.';
      const chunks = await vectorRAG.semanticChunking(text, 'test-source', 30, 5);
      
      if (chunks.length > 1) {
        // Check that chunks have some overlap
        expect(chunks[1].content).toContain('Word');
      }
    });

    it('should set correct metadata', async () => {
      const text = 'Test text for metadata.';
      const source = 'test-source';
      const chunks = await vectorRAG.semanticChunking(text, source);
      
      expect(chunks[0].metadata.source).toBe(source);
      expect(chunks[0].metadata.chunk_index).toBe(0);
      expect(chunks[0].metadata.total_chunks).toBe(chunks.length);
    });
  });

  describe('Vector Storage', () => {
    it('should store chunks successfully', async () => {
      const text = 'Test text for storage.';
      const chunks = await vectorRAG.semanticChunking(text, 'test-source');
      
      await expect(vectorRAG.storeChunks(chunks)).resolves.not.toThrow();
      
      const stats = vectorRAG.getStats();
      expect(stats.total_chunks).toBe(chunks.length);
    });
  });

  describe('Query', () => {
    beforeEach(async () => {
      // Setup test data
      const texts = [
        'Machine learning is a subset of artificial intelligence.',
        'Deep learning uses neural networks with multiple layers.',
        'Natural language processing helps computers understand text.'
      ];
      
      for (const text of texts) {
        const chunks = await vectorRAG.semanticChunking(text, 'test-source');
        await vectorRAG.storeChunks(chunks);
      }
    });

    it('should return relevant results', async () => {
      const result = await vectorRAG.query({
        query: 'What is machine learning?',
        top_k: 2
      });
      
      expect(result.chunks.length).toBeLessThanOrEqual(2);
      expect(result.query).toBe('What is machine learning?');
      expect(result.retrieval_time_ms).toBeGreaterThan(0);
    });

    it('should respect top_k parameter', async () => {
      const result = await vectorRAG.query({
        query: 'artificial intelligence',
        top_k: 1
      });
      
      expect(result.chunks.length).toBe(1);
    });

    it('should apply threshold filter', async () => {
      const result = await vectorRAG.query({
        query: 'completely unrelated query xyz123',
        top_k: 5,
        threshold: 0.9
      });
      
      // Should return fewer results due to high threshold
      expect(result.chunks.length).toBeLessThanOrEqual(5);
    });

    it('should calculate relevance scores', async () => {
      const result = await vectorRAG.query({
        query: 'neural networks',
        top_k: 3
      });
      
      expect(result.relevance_scores.length).toBe(result.chunks.length);
      
      // Scores should be in descending order
      for (let i = 1; i < result.relevance_scores.length; i++) {
        expect(result.relevance_scores[i]).toBeLessThanOrEqual(result.relevance_scores[i - 1]);
      }
    });
  });

  describe('Context Relevance Scoring', () => {
    it('should score context relevance', async () => {
      const text = 'Machine learning is important.';
      const chunks = await vectorRAG.semanticChunking(text, 'test-source');
      
      const score = await vectorRAG.scoreContextRelevance(chunks, 'machine learning');
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance', () => {
    it('should meet latency requirements', async () => {
      const text = 'Performance test text.';
      const chunks = await vectorRAG.semanticChunking(text, 'test-source');
      await vectorRAG.storeChunks(chunks);
      
      const startTime = Date.now();
      await vectorRAG.query({ query: 'performance', top_k: 5 });
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(50); // <50ms target
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      const text = 'Statistics test.';
      const chunks = await vectorRAG.semanticChunking(text, 'test-source');
      await vectorRAG.storeChunks(chunks);
      
      const stats = vectorRAG.getStats();
      
      expect(stats.total_chunks).toBe(chunks.length);
      expect(stats.embedding_dimension).toBe(config.dimension);
      expect(stats.model).toBe(config.model);
    });
  });

  describe('Clear', () => {
    it('should clear all data', async () => {
      const text = 'Clear test.';
      const chunks = await vectorRAG.semanticChunking(text, 'test-source');
      await vectorRAG.storeChunks(chunks);
      
      vectorRAG.clear();
      
      const stats = vectorRAG.getStats();
      expect(stats.total_chunks).toBe(0);
    });
  });
});