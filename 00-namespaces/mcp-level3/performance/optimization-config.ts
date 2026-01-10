/**
 * Performance Optimization Configuration
 * 
 * Centralized configuration for performance optimizations across all engines
 */

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  max_size: number;
  ttl_ms: number;
  eviction_policy: 'lru' | 'lfu' | 'fifo';
}

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  min_connections: number;
  max_connections: number;
  acquire_timeout_ms: number;
  idle_timeout_ms: number;
}

/**
 * Batch processing configuration
 */
export interface BatchConfig {
  enabled: boolean;
  batch_size: number;
  batch_timeout_ms: number;
}

/**
 * Compression configuration
 */
export interface CompressionConfig {
  enabled: boolean;
  algorithm: 'gzip' | 'brotli' | 'zstd';
  level: number;
  min_size_bytes: number;
}

/**
 * Complete optimization configuration
 */
export interface OptimizationConfig {
  // Caching
  vector_cache: CacheConfig;
  graph_cache: CacheConfig;
  policy_cache: CacheConfig;
  rbac_cache: CacheConfig;
  
  // Connection pools
  database_pool: ConnectionPoolConfig;
  redis_pool: ConnectionPoolConfig;
  
  // Batch processing
  embedding_batch: BatchConfig;
  query_batch: BatchConfig;
  
  // Compression
  artifact_compression: CompressionConfig;
  response_compression: CompressionConfig;
  
  // Resource limits
  max_memory_mb: number;
  max_cpu_percent: number;
  
  // Concurrency
  max_concurrent_requests: number;
  max_concurrent_tasks: number;
  
  // Timeouts
  default_timeout_ms: number;
  long_running_timeout_ms: number;
}

/**
 * Default optimization configuration
 */
export const DEFAULT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  // Caching
  vector_cache: {
    enabled: true,
    max_size: 10000,
    ttl_ms: 3600000, // 1 hour
    eviction_policy: 'lru'
  },
  graph_cache: {
    enabled: true,
    max_size: 5000,
    ttl_ms: 3600000,
    eviction_policy: 'lru'
  },
  policy_cache: {
    enabled: true,
    max_size: 1000,
    ttl_ms: 1800000, // 30 minutes
    eviction_policy: 'lru'
  },
  rbac_cache: {
    enabled: true,
    max_size: 5000,
    ttl_ms: 1800000,
    eviction_policy: 'lru'
  },
  
  // Connection pools
  database_pool: {
    min_connections: 10,
    max_connections: 50,
    acquire_timeout_ms: 30000,
    idle_timeout_ms: 30000
  },
  redis_pool: {
    min_connections: 5,
    max_connections: 20,
    acquire_timeout_ms: 10000,
    idle_timeout_ms: 60000
  },
  
  // Batch processing
  embedding_batch: {
    enabled: true,
    batch_size: 100,
    batch_timeout_ms: 100
  },
  query_batch: {
    enabled: true,
    batch_size: 50,
    batch_timeout_ms: 50
  },
  
  // Compression
  artifact_compression: {
    enabled: true,
    algorithm: 'gzip',
    level: 6,
    min_size_bytes: 1024
  },
  response_compression: {
    enabled: true,
    algorithm: 'gzip',
    level: 6,
    min_size_bytes: 1024
  },
  
  // Resource limits
  max_memory_mb: 2048,
  max_cpu_percent: 80,
  
  // Concurrency
  max_concurrent_requests: 1000,
  max_concurrent_tasks: 100,
  
  // Timeouts
  default_timeout_ms: 30000,
  long_running_timeout_ms: 300000
};

/**
 * Production optimization configuration (more aggressive)
 */
export const PRODUCTION_OPTIMIZATION_CONFIG: OptimizationConfig = {
  ...DEFAULT_OPTIMIZATION_CONFIG,
  
  // Larger caches for production
  vector_cache: {
    ...DEFAULT_OPTIMIZATION_CONFIG.vector_cache,
    max_size: 50000
  },
  graph_cache: {
    ...DEFAULT_OPTIMIZATION_CONFIG.graph_cache,
    max_size: 25000
  },
  
  // Larger connection pools
  database_pool: {
    min_connections: 20,
    max_connections: 100,
    acquire_timeout_ms: 30000,
    idle_timeout_ms: 30000
  },
  
  // More aggressive batching
  embedding_batch: {
    enabled: true,
    batch_size: 200,
    batch_timeout_ms: 50
  },
  
  // Higher concurrency
  max_concurrent_requests: 5000,
  max_concurrent_tasks: 500
};

/**
 * Development optimization configuration (less aggressive, easier debugging)
 */
export const DEVELOPMENT_OPTIMIZATION_CONFIG: OptimizationConfig = {
  ...DEFAULT_OPTIMIZATION_CONFIG,
  
  // Smaller caches for development
  vector_cache: {
    ...DEFAULT_OPTIMIZATION_CONFIG.vector_cache,
    max_size: 1000
  },
  
  // Smaller pools
  database_pool: {
    min_connections: 2,
    max_connections: 10,
    acquire_timeout_ms: 30000,
    idle_timeout_ms: 30000
  },
  
  // Disable batching for easier debugging
  embedding_batch: {
    enabled: false,
    batch_size: 10,
    batch_timeout_ms: 1000
  },
  
  // Lower concurrency
  max_concurrent_requests: 100,
  max_concurrent_tasks: 10
};

/**
 * Get optimization config based on environment
 */
export function getOptimizationConfig(env: 'development' | 'production' | 'default' = 'default'): OptimizationConfig {
  switch (env) {
    case 'production':
      return PRODUCTION_OPTIMIZATION_CONFIG;
    case 'development':
      return DEVELOPMENT_OPTIMIZATION_CONFIG;
    default:
      return DEFAULT_OPTIMIZATION_CONFIG;
  }
}

/**
 * Performance monitoring thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  // Latency thresholds (ms)
  rag_query: 50,
  dag_build: 10,
  policy_eval: 20,
  rbac_check: 10,
  taxonomy_resolve: 30,
  execution_schedule: 100,
  validation_check: 50,
  
  // Throughput thresholds (QPS)
  min_rag_qps: 1000,
  min_dag_qps: 5000,
  min_governance_qps: 2000,
  min_registry_qps: 10000,
  
  // Resource thresholds
  max_memory_usage_percent: 80,
  max_cpu_usage_percent: 80,
  max_disk_usage_percent: 85,
  
  // Error rate thresholds
  max_error_rate_percent: 1,
  max_timeout_rate_percent: 0.5
};

/**
 * Performance optimization strategies
 */
export const OPTIMIZATION_STRATEGIES = {
  // Caching strategies
  cache_warming: {
    enabled: true,
    warmup_queries: [
      'common query 1',
      'common query 2',
      'common query 3'
    ]
  },
  
  // Query optimization
  query_optimization: {
    use_prepared_statements: true,
    enable_query_plan_cache: true,
    parallel_query_execution: true
  },
  
  // Index optimization
  index_optimization: {
    auto_create_indexes: true,
    rebuild_indexes_interval_hours: 24,
    analyze_query_patterns: true
  },
  
  // Memory optimization
  memory_optimization: {
    enable_memory_pooling: true,
    gc_optimization: true,
    lazy_loading: true
  },
  
  // Network optimization
  network_optimization: {
    enable_http2: true,
    enable_compression: true,
    connection_reuse: true,
    dns_caching: true
  }
};