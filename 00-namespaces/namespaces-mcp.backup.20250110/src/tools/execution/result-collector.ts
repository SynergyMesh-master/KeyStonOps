/**
 * MCP Result Collector
 * 
 * Comprehensive result collection, aggregation, and analysis system
 * for MCP tool executions with support for various result formats.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { ToolResult, ToolExecutionContext } from '../core/tool-interface';

/**
 * Result Status
 */
export enum ResultStatus {
  PENDING = 'pending',
  COLLECTING = 'collecting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PARTIAL = 'partial',
  TIMEOUT = 'timeout'
}

/**
 * Result Type
 */
export enum ResultType {
  SINGLE = 'single',
  BATCH = 'batch',
  STREAM = 'stream',
  AGGREGATED = 'aggregated',
  DERIVED = 'derived'
}

/**
 * Collection Strategy
 */
export enum CollectionStrategy {
  IMMEDIATE = 'immediate',
  BATCH = 'batch',
  STREAMING = 'streaming',
  LAZY = 'lazy',
  ON_DEMAND = 'on_demand'
}

/**
 * Result Metadata
 */
export interface ResultMetadata {
  collectionId: string;
  source: string;
  timestamp: number;
  type: ResultType;
  status: ResultStatus;
  size: number;
  checksum: string;
  compression: boolean;
  encryption: boolean;
  ttl?: number;
  tags: string[];
  version: string;
}

/**
 * Collected Result
 */
export interface CollectedResult {
  metadata: ResultMetadata;
  data: any;
  context: ToolExecutionContext;
  metrics: CollectionMetrics;
  error?: Error;
}

/**
 * Collection Metrics
 */
export interface CollectionMetrics {
  collectionTime: number;
  processingTime: number;
  dataSize: number;
  memoryUsage: number;
  networkTransferred: number;
  retryCount: number;
  cacheHits: number;
  compressionRatio?: number;
}

/**
 * Result Filter
 */
export interface ResultFilter {
  type?: ResultType;
  status?: ResultStatus;
  source?: string;
  tags?: string[];
  startTime?: number;
  endTime?: number;
  minSize?: number;
  maxSize?: number;
  customFilter?: (result: CollectedResult) => boolean;
}

/**
 * Result Aggregation
 */
export interface ResultAggregation {
  aggregationId: string;
  resultIds: string[];
  aggregationType: 'sum' | 'avg' | 'max' | 'min' | 'count' | 'custom';
  aggregatedData: any;
  metadata: ResultMetadata;
}

/**
 * Result Transformation
 */
export interface ResultTransformation {
  transformationId: string;
  sourceResultId: string;
  transformationType: 'filter' | 'map' | 'reduce' | 'group' | 'custom';
  transformationFunction: (data: any) => any;
  transformedData: any;
  metadata: ResultMetadata;
}

/**
 * Collection Configuration
 */
export interface CollectionConfig {
  defaultStrategy: CollectionStrategy;
  enableCaching: boolean;
  cacheSize: number;
  cacheTimeout: number;
  enableCompression: boolean;
  compressionLevel: number;
  enableEncryption: boolean;
  encryptionKey?: string;
  maxResultSize: number;
  batchTimeout: number;
  batchSize: number;
  enableMetrics: boolean;
  retentionPeriod: number;
}

/**
 * Collector Statistics
 */
export interface CollectorStatistics {
  totalCollections: number;
  successfulCollections: number;
  failedCollections: number;
  partialCollections: number;
  averageCollectionTime: number;
  totalDataCollected: number;
  cacheHitRate: number;
  compressionSavings: number;
  activeCollections: number;
  queuedCollections: number;
}

/**
 * MCP Result Collector
 */
export class MCPResultCollector extends EventEmitter {
  private config: CollectionConfig;
  private results: Map<string, CollectedResult> = new Map();
  private aggregations: Map<string, ResultAggregation> = new Map();
  private transformations: Map<string, ResultTransformation> = new Map();
  private cache: Map<string, CollectedResult> = new Map();
  private statistics: CollectorStatistics;
  private activeCollections: Map<string, Promise<CollectedResult>> = new Map();
  private collectionQueue: Array<{ id: string; promise: Promise<CollectedResult> }> = [];

  constructor(config?: Partial<CollectionConfig>) {
    super();
    
    this.config = {
      defaultStrategy: CollectionStrategy.IMMEDIATE,
      enableCaching: true,
      cacheSize: 1000,
      cacheTimeout: 300000, // 5 minutes
      enableCompression: true,
      compressionLevel: 6,
      enableEncryption: false,
      maxResultSize: 10 * 1024 * 1024, // 10MB
      batchTimeout: 5000, // 5 seconds
      batchSize: 100,
      enableMetrics: true,
      retentionPeriod: 86400000, // 24 hours
      ...config
    };

    this.initializeStatistics();
    this.startCleanup();
  }

  /**
   * Collect a result
   */
  public async collect(
    result: ToolResult,
    context: ToolExecutionContext,
    options?: {
      strategy?: CollectionStrategy;
      tags?: string[];
      ttl?: number;
    }
  ): Promise<CollectedResult> {
    const startTime = Date.now();
    const collectionId = uuidv4();

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(result, context);
        const cached = this.cache.get(cacheKey);
        
        if (cached && (Date.now() - cached.metadata.timestamp) < this.config.cacheTimeout) {
          this.statistics.cacheHitRate = 
            (this.statistics.cacheHitRate * (this.statistics.totalCollections - 1) + 1) / 
            this.statistics.totalCollections;
          
          this.emit('cache-hit', { collectionId, cached });
          return cached;
        }
      }

      // Collect based on strategy
      const strategy = options?.strategy || this.config.defaultStrategy;
      const collectedResult = await this.collectByStrategy(result, context, collectionId, strategy, options);

      // Apply compression if enabled
      if (this.config.enableCompression && collectedResult.metadata.size > 1024) {
        await this.compressResult(collectedResult);
      }

      // Apply encryption if enabled
      if (this.config.enableEncryption) {
        await this.encryptResult(collectedResult);
      }

      // Store result
      this.results.set(collectionId, collectedResult);

      // Update cache
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(result, context);
        this.cache.set(cacheKey, collectedResult);
      }

      // Update statistics
      this.statistics.totalCollections++;
      this.statistics.successfulCollections++;
      this.statistics.totalDataCollected += collectedResult.metadata.size;
      this.statistics.averageCollectionTime = 
        (this.statistics.averageCollectionTime * (this.statistics.totalCollections - 1) + 
         collectedResult.metrics.collectionTime) / 
        this.statistics.totalCollections;

      this.emit('result-collected', { collectionId, result: collectedResult });

      return collectedResult;

    } catch (error) {
      this.statistics.failedCollections++;
      this.emit('collection-failed', { collectionId, error });
      throw error;
    }
  }

  /**
   * Collect multiple results in batch
   */
  public async collectBatch(
    results: Array<{ result: ToolResult; context: ToolExecutionContext }>
  ): Promise<CollectedResult[]> {
    const batchPromises = results.map(({ result, context }) => 
      this.collect(result, context, { strategy: CollectionStrategy.BATCH })
    );

    return Promise.all(batchPromises);
  }

  /**
   * Get collected result
   */
  public getResult(collectionId: string): CollectedResult | undefined {
    return this.results.get(collectionId);
  }

  /**
   * Get results by filter
   */
  public getResults(filter: ResultFilter): CollectedResult[] {
    let results = Array.from(this.results.values());

    // Apply filters
    if (filter.type) {
      results = results.filter(r => r.metadata.type === filter.type);
    }

    if (filter.status) {
      results = results.filter(r => r.metadata.status === filter.status);
    }

    if (filter.source) {
      results = results.filter(r => r.metadata.source === filter.source);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(r => 
        filter.tags!.some(tag => r.metadata.tags.includes(tag))
      );
    }

    if (filter.startTime) {
      results = results.filter(r => r.metadata.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      results = results.filter(r => r.metadata.timestamp <= filter.endTime!);
    }

    if (filter.minSize) {
      results = results.filter(r => r.metadata.size >= filter.minSize!);
    }

    if (filter.maxSize) {
      results = results.filter(r => r.metadata.size <= filter.maxSize!);
    }

    if (filter.customFilter) {
      results = results.filter(filter.customFilter);
    }

    return results;
  }

  /**
   * Aggregate results
   */
  public async aggregate(
    resultIds: string[],
    aggregationType: 'sum' | 'avg' | 'max' | 'min' | 'count' | 'custom',
    customAggregation?: (data: any[]) => any
  ): Promise<ResultAggregation> {
    const aggregationId = uuidv4();
    
    // Get all results
    const results = resultIds.map(id => this.results.get(id)).filter(Boolean) as CollectedResult[];
    
    if (results.length === 0) {
      throw new Error('No results found for aggregation');
    }

    // Perform aggregation
    let aggregatedData: any;
    
    switch (aggregationType) {
      case 'sum':
        aggregatedData = results.reduce((sum, r) => sum + (r.data || 0), 0);
        break;
      case 'avg':
        const sum = results.reduce((s, r) => s + (r.data || 0), 0);
        aggregatedData = sum / results.length;
        break;
      case 'max':
        aggregatedData = Math.max(...results.map(r => r.data || 0));
        break;
      case 'min':
        aggregatedData = Math.min(...results.map(r => r.data || 0));
        break;
      case 'count':
        aggregatedData = results.length;
        break;
      case 'custom':
        if (!customAggregation) {
          throw new Error('Custom aggregation function required');
        }
        aggregatedData = customAggregation(results.map(r => r.data));
        break;
    }

    // Create aggregation metadata
    const metadata: ResultMetadata = {
      collectionId: aggregationId,
      source: 'aggregation',
      timestamp: Date.now(),
      type: ResultType.AGGREGATED,
      status: ResultStatus.COMPLETED,
      size: JSON.stringify(aggregatedData).length,
      checksum: this.generateChecksum(aggregatedData),
      compression: false,
      encryption: false,
      tags: ['aggregated'],
      version: '1.0.0'
    };

    // Create aggregation
    const aggregation: ResultAggregation = {
      aggregationId,
      resultIds,
      aggregationType,
      aggregatedData,
      metadata
    };

    this.aggregations.set(aggregationId, aggregation);
    this.emit('result-aggregated', { aggregation });

    return aggregation;
  }

  /**
   * Transform a result
   */
  public async transform(
    resultId: string,
    transformationType: 'filter' | 'map' | 'reduce' | 'group' | 'custom',
    transformationFunction: (data: any) => any
  ): Promise<ResultTransformation> {
    const transformationId = uuidv4();
    
    // Get result
    const result = this.results.get(resultId);
    
    if (!result) {
      throw new Error(`Result not found: ${resultId}`);
    }

    // Apply transformation
    const transformedData = transformationFunction(result.data);

    // Create transformation metadata
    const metadata: ResultMetadata = {
      collectionId: transformationId,
      source: result.metadata.source,
      timestamp: Date.now(),
      type: ResultType.DERIVED,
      status: ResultStatus.COMPLETED,
      size: JSON.stringify(transformedData).length,
      checksum: this.generateChecksum(transformedData),
      compression: result.metadata.compression,
      encryption: result.metadata.encryption,
      tags: [...result.metadata.tags, 'transformed'],
      version: '1.0.0'
    };

    // Create transformation
    const transformation: ResultTransformation = {
      transformationId,
      sourceResultId: resultId,
      transformationType,
      transformationFunction,
      transformedData,
      metadata
    };

    this.transformations.set(transformationId, transformation);
    this.emit('result-transformed', { transformation });

    return transformation;
  }

  /**
   * Delete result
   */
  public deleteResult(collectionId: string): void {
    const result = this.results.get(collectionId);
    
    if (result) {
      this.results.delete(collectionId);
      this.emit('result-deleted', { collectionId, result });
    }
  }

  /**
   * Clear all results
   */
  public clearResults(): void {
    this.results.clear();
    this.emit('results-cleared');
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Get collector statistics
   */
  public getStatistics(): CollectorStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Destroy collector
   */
  public destroy(): void {
    this.results.clear();
    this.aggregations.clear();
    this.transformations.clear();
    this.cache.clear();
    this.activeCollections.clear();
    this.collectionQueue.length = 0;

    this.emit('destroyed');
  }

  // Private methods

  private async collectByStrategy(
    result: ToolResult,
    context: ToolExecutionContext,
    collectionId: string,
    strategy: CollectionStrategy,
    options?: any
  ): Promise<CollectedResult> {
    const startTime = Date.now();

    switch (strategy) {
      case CollectionStrategy.IMMEDIATE:
        return this.collectImmediate(result, context, collectionId, startTime);

      case CollectionStrategy.BATCH:
        return this.collectBatched(result, context, collectionId, startTime);

      case CollectionStrategy.STREAMING:
        return this.collectStreaming(result, context, collectionId, startTime);

      case CollectionStrategy.LAZY:
        return this.collectLazy(result, context, collectionId, startTime);

      case CollectionStrategy.ON_DEMAND:
        return this.collectOnDemand(result, context, collectionId, startTime);

      default:
        return this.collectImmediate(result, context, collectionId, startTime);
    }
  }

  private async collectImmediate(
    result: ToolResult,
    context: ToolExecutionContext,
    collectionId: string,
    startTime: number
  ): Promise<CollectedResult> {
    const metadata: ResultMetadata = {
      collectionId,
      source: context.toolId || 'unknown',
      timestamp: Date.now(),
      type: ResultType.SINGLE,
      status: ResultStatus.COMPLETED,
      size: JSON.stringify(result).length,
      checksum: this.generateChecksum(result),
      compression: false,
      encryption: false,
      tags: options?.tags || [],
      version: '1.0.0'
    };

    const metrics: CollectionMetrics = {
      collectionTime: Date.now() - startTime,
      processingTime: 0,
      dataSize: metadata.size,
      memoryUsage: 0,
      networkTransferred: 0,
      retryCount: 0,
      cacheHits: 0
    };

    return {
      metadata,
      data: result,
      context,
      metrics
    };
  }

  private async collectBatched(
    result: ToolResult,
    context: ToolExecutionContext,
    collectionId: string,
    startTime: number
  ): Promise<CollectedResult> {
    // Batch collection logic would wait for multiple results
    // For now, we'll treat it as immediate
    return this.collectImmediate(result, context, collectionId, startTime);
  }

  private async collectStreaming(
    result: ToolResult,
    context: ToolExecutionContext,
    collectionId: string,
    startTime: number
  ): Promise<CollectedResult> {
    const metadata: ResultMetadata = {
      collectionId,
      source: context.toolId || 'unknown',
      timestamp: Date.now(),
      type: ResultType.STREAM,
      status: ResultStatus.COMPLETED,
      size: JSON.stringify(result).length,
      checksum: this.generateChecksum(result),
      compression: false,
      encryption: false,
      tags: ['streamed'],
      version: '1.0.0'
    };

    const metrics: CollectionMetrics = {
      collectionTime: Date.now() - startTime,
      processingTime: 0,
      dataSize: metadata.size,
      memoryUsage: 0,
      networkTransferred: 0,
      retryCount: 0,
      cacheHits: 0
    };

    return {
      metadata,
      data: result,
      context,
      metrics
    };
  }

  private async collectLazy(
    result: ToolResult,
    context: ToolExecutionContext,
    collectionId: string,
    startTime: number
  ): Promise<CollectedResult> {
    // Lazy collection defers actual collection until needed
    // For now, we'll store a reference and collect on demand
    const metadata: ResultMetadata = {
      collectionId,
      source: context.toolId || 'unknown',
      timestamp: Date.now(),
      type: ResultType.SINGLE,
      status: ResultStatus.PENDING,
      size: 0,
      checksum: '',
      compression: false,
      encryption: false,
      tags: ['lazy'],
      version: '1.0.0'
    };

    const metrics: CollectionMetrics = {
      collectionTime: 0,
      processingTime: 0,
      dataSize: 0,
      memoryUsage: 0,
      networkTransferred: 0,
      retryCount: 0,
      cacheHits: 0
    };

    return {
      metadata,
      data: result, // Would be a reference in real implementation
      context,
      metrics
    };
  }

  private async collectOnDemand(
    result: ToolResult,
    context: ToolExecutionContext,
    collectionId: string,
    startTime: number
  ): Promise<CollectedResult> {
    // On-demand collection collects when requested
    return this.collectImmediate(result, context, collectionId, startTime);
  }

  private async compressResult(result: CollectedResult): Promise<void> {
    // Compression logic would go here
    // For now, we'll just update the metadata
    result.metadata.compression = true;
    result.metrics.compressionRatio = 0.5; // Example
  }

  private async encryptResult(result: CollectedResult): Promise<void> {
    // Encryption logic would go here
    // For now, we'll just update the metadata
    result.metadata.encryption = true;
  }

  private generateCacheKey(result: ToolResult, context: ToolExecutionContext): string {
    const key = `${context.toolId}:${context.executionId || 'unknown'}:${JSON.stringify(result)}`;
    return Buffer.from(key).toString('base64');
  }

  private generateChecksum(data: any): string {
    // Simple checksum generation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  private initializeStatistics(): void {
    this.statistics = {
      totalCollections: 0,
      successfulCollections: 0,
      failedCollections: 0,
      partialCollections: 0,
      averageCollectionTime: 0,
      totalDataCollected: 0,
      cacheHitRate: 0,
      compressionSavings: 0,
      activeCollections: 0,
      queuedCollections: 0
    };
  }

  private updateStatistics(): void {
    this.statistics.activeCollections = this.activeCollections.size;
    this.statistics.queuedCollections = this.collectionQueue.length;
  }

  private startCleanup(): void {
    // Clean up old results periodically
    setInterval(() => {
      const now = Date.now();
      for (const [id, result] of this.results.entries()) {
        if (now - result.metadata.timestamp > this.config.retentionPeriod) {
          this.results.delete(id);
        }
      }

      // Clean up cache
      for (const [key, cached] of this.cache.entries()) {
        if (now - cached.metadata.timestamp > this.config.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Every minute
  }
}