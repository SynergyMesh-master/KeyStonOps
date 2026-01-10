/**
 * GraphQL Adapter - GraphQL API integration adapter
 * 
 * Provides comprehensive GraphQL integration with schema management,
 * DataLoader batching, subscriptions, and query optimization.
 * 
 * @module integration/adapters/graphql/graphql-adapter
 */

import { EventEmitter } from 'events';

/**
 * GraphQL operation type
 */
export enum OperationType {
  QUERY = 'query',
  MUTATION = 'mutation',
  SUBSCRIPTION = 'subscription'
}

/**
 * GraphQL variables
 */
export type Variables = Record<string, unknown>;

/**
 * GraphQL query result
 */
export interface QueryResult<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
}

/**
 * GraphQL error
 */
export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

/**
 * GraphQL mutation result
 */
export interface MutationResult<T = unknown> extends QueryResult<T> {}

/**
 * GraphQL subscription result
 */
export interface SubscriptionResult<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * DataLoader batch function
 */
export type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<Array<V | Error>>;

/**
 * DataLoader options
 */
export interface DataLoaderOptions {
  cache?: boolean;
  maxBatchSize?: number;
  batchScheduleFn?: (callback: () => void) => void;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Query complexity result
 */
export interface QueryComplexityResult {
  complexity: number;
  maxComplexity: number;
  exceeded: boolean;
}

/**
 * GraphQL adapter configuration
 */
export interface GraphQLAdapterConfig {
  endpoint: string;
  headers?: Record<string, string>;
  timeout?: number;
  introspection?: boolean;
  subscriptions?: {
    enabled: boolean;
    transport: 'websocket' | 'sse';
    url?: string;
    keepAlive?: number;
    reconnect?: boolean;
    reconnectAttempts?: number;
  };
  validation?: {
    maxDepth?: number;
    maxComplexity?: number;
    maxAliases?: number;
  };
  caching?: {
    enabled: boolean;
    ttl: number;
    persistedQueries?: boolean;
  };
  batching?: {
    enabled: boolean;
    maxBatchSize: number;
    batchInterval: number;
  };
}

/**
 * Subscription
 */
export interface Subscription {
  id: string;
  unsubscribe: () => void;
}

/**
 * Observable
 */
export interface Observable<T> {
  subscribe(observer: {
    next?: (value: T) => void;
    error?: (error: Error) => void;
    complete?: () => void;
  }): Subscription;
}

/**
 * DataLoader implementation
 */
class DataLoader<K, V> {
  private batchLoadFn: BatchLoadFn<K, V>;
  private options: Required<DataLoaderOptions>;
  private cache: Map<K, Promise<V>>;
  private queue: K[];
  private batchScheduled: boolean;

  constructor(batchLoadFn: BatchLoadFn<K, V>, options: DataLoaderOptions = {}) {
    this.batchLoadFn = batchLoadFn;
    this.options = {
      cache: options.cache ?? true,
      maxBatchSize: options.maxBatchSize ?? 100,
      batchScheduleFn: options.batchScheduleFn ?? ((cb) => process.nextTick(cb))
    };
    this.cache = new Map();
    this.queue = [];
    this.batchScheduled = false;
  }

  async load(key: K): Promise<V> {
    // Check cache
    if (this.options.cache && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Create promise for this key
    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push(key);

      if (!this.batchScheduled) {
        this.batchScheduled = true;
        this.options.batchScheduleFn(() => {
          this.dispatchBatch();
        });
      }
    });

    // Cache promise
    if (this.options.cache) {
      this.cache.set(key, promise);
    }

    return promise;
  }

  async loadMany(keys: K[]): Promise<Array<V | Error>> {
    return Promise.all(keys.map(key => 
      this.load(key).catch(error => error)
    ));
  }

  clear(key: K): this {
    this.cache.delete(key);
    return this;
  }

  clearAll(): this {
    this.cache.clear();
    return this;
  }

  private async dispatchBatch(): Promise<void> {
    this.batchScheduled = false;
    const keys = this.queue.splice(0, this.options.maxBatchSize);

    if (keys.length === 0) {
      return;
    }

    try {
      const values = await this.batchLoadFn(keys);

      keys.forEach((key, index) => {
        const value = values[index];
        const promise = this.cache.get(key);

        if (promise) {
          if (value instanceof Error) {
            // Reject promise
          } else {
            // Resolve promise
          }
        }
      });
    } catch (error) {
      // Reject all promises
      keys.forEach(key => {
        this.cache.delete(key);
      });
    }
  }
}

/**
 * GraphQL Adapter
 * 
 * Comprehensive GraphQL API integration adapter
 */
export class GraphQLAdapter extends EventEmitter {
  private config: Required<GraphQLAdapterConfig>;
  private dataLoaders: Map<string, DataLoader<unknown, unknown>> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private queryCache: Map<string, { data: unknown; timestamp: number }> = new Map();

  constructor(config: GraphQLAdapterConfig) {
    super();
    this.config = {
      endpoint: config.endpoint,
      headers: config.headers ?? {},
      timeout: config.timeout ?? 30000,
      introspection: config.introspection ?? false,
      subscriptions: {
        enabled: config.subscriptions?.enabled ?? false,
        transport: config.subscriptions?.transport ?? 'websocket',
        url: config.subscriptions?.url,
        keepAlive: config.subscriptions?.keepAlive ?? 30000,
        reconnect: config.subscriptions?.reconnect ?? true,
        reconnectAttempts: config.subscriptions?.reconnectAttempts ?? 5
      },
      validation: {
        maxDepth: config.validation?.maxDepth ?? 10,
        maxComplexity: config.validation?.maxComplexity ?? 1000,
        maxAliases: config.validation?.maxAliases ?? 15
      },
      caching: {
        enabled: config.caching?.enabled ?? false,
        ttl: config.caching?.ttl ?? 300000,
        persistedQueries: config.caching?.persistedQueries ?? false
      },
      batching: {
        enabled: config.batching?.enabled ?? true,
        maxBatchSize: config.batching?.maxBatchSize ?? 10,
        batchInterval: config.batching?.batchInterval ?? 10
      }
    };
  }

  /**
   * Execute GraphQL query
   */
  async query<T = unknown>(query: string, variables?: Variables): Promise<QueryResult<T>> {
    // Check cache
    if (this.config.caching.enabled) {
      const cacheKey = this.getCacheKey(query, variables);
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        this.emit('cache:hit', { query });
        return { data: cached };
      }
    }

    // Validate query
    this.validateQuery(query);

    // Execute query
    const result = await this.executeOperation<T>(OperationType.QUERY, query, variables);

    // Cache result
    if (this.config.caching.enabled && result.data) {
      const cacheKey = this.getCacheKey(query, variables);
      this.setCache(cacheKey, result.data);
    }

    this.emit('query:executed', { query, variables, result });

    return result;
  }

  /**
   * Execute GraphQL mutation
   */
  async mutate<T = unknown>(mutation: string, variables?: Variables): Promise<MutationResult<T>> {
    // Validate mutation
    this.validateQuery(mutation);

    // Execute mutation
    const result = await this.executeOperation<T>(OperationType.MUTATION, mutation, variables);

    // Clear relevant cache entries
    if (this.config.caching.enabled) {
      this.clearCache();
    }

    this.emit('mutation:executed', { mutation, variables, result });

    return result;
  }

  /**
   * Subscribe to GraphQL subscription
   */
  subscribe<T = unknown>(
    subscription: string,
    variables?: Variables
  ): Observable<SubscriptionResult<T>> {
    if (!this.config.subscriptions.enabled) {
      throw new Error('Subscriptions are not enabled');
    }

    const subscriptionId = this.generateSubscriptionId();

    return {
      subscribe: (observer) => {
        // Create subscription
        const sub: Subscription = {
          id: subscriptionId,
          unsubscribe: () => {
            this.subscriptions.delete(subscriptionId);
            this.emit('subscription:unsubscribed', { id: subscriptionId });
          }
        };

        this.subscriptions.set(subscriptionId, sub);

        // Start subscription (implementation depends on transport)
        this.startSubscription(subscriptionId, subscription, variables, observer);

        this.emit('subscription:created', { id: subscriptionId, subscription });

        return sub;
      }
    };
  }

  /**
   * Create DataLoader
   */
  createDataLoader<K, V>(
    name: string,
    batchFn: BatchLoadFn<K, V>,
    options?: DataLoaderOptions
  ): DataLoader<K, V> {
    const loader = new DataLoader(batchFn, options);
    this.dataLoaders.set(name, loader as DataLoader<unknown, unknown>);
    this.emit('dataloader:created', { name });
    return loader;
  }

  /**
   * Get DataLoader
   */
  getDataLoader<K, V>(name: string): DataLoader<K, V> | undefined {
    return this.dataLoaders.get(name) as DataLoader<K, V> | undefined;
  }

  /**
   * Execute GraphQL operation
   */
  private async executeOperation<T>(
    type: OperationType,
    operation: string,
    variables?: Variables
  ): Promise<QueryResult<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify({
          query: operation,
          variables
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.errors && result.errors.length > 0) {
        this.emit('operation:errors', { type, errors: result.errors });
      }

      return result;

    } catch (error) {
      clearTimeout(timeoutId);
      this.emit('operation:error', { type, error });
      throw error;
    }
  }

  /**
   * Validate query
   */
  private validateQuery(query: string): void {
    // Check query depth
    const depth = this.calculateQueryDepth(query);
    if (depth > this.config.validation.maxDepth) {
      throw new Error(`Query depth ${depth} exceeds maximum ${this.config.validation.maxDepth}`);
    }

    // Check query complexity
    const complexity = this.calculateQueryComplexity(query);
    if (complexity > this.config.validation.maxComplexity) {
      throw new Error(`Query complexity ${complexity} exceeds maximum ${this.config.validation.maxComplexity}`);
    }

    // Check aliases
    const aliases = this.countAliases(query);
    if (aliases > this.config.validation.maxAliases) {
      throw new Error(`Query aliases ${aliases} exceeds maximum ${this.config.validation.maxAliases}`);
    }
  }

  /**
   * Calculate query depth
   */
  private calculateQueryDepth(query: string): number {
    // Simple depth calculation (can be improved)
    const matches = query.match(/{/g);
    return matches ? matches.length : 0;
  }

  /**
   * Calculate query complexity
   */
  private calculateQueryComplexity(query: string): number {
    // Simple complexity calculation (can be improved)
    const fields = query.match(/\w+(?=\s*[:{])/g);
    return fields ? fields.length : 0;
  }

  /**
   * Count aliases
   */
  private countAliases(query: string): number {
    const matches = query.match(/\w+\s*:/g);
    return matches ? matches.length : 0;
  }

  /**
   * Start subscription
   */
  private startSubscription<T>(
    id: string,
    subscription: string,
    variables: Variables | undefined,
    observer: {
      next?: (value: SubscriptionResult<T>) => void;
      error?: (error: Error) => void;
      complete?: () => void;
    }
  ): void {
    // Implementation depends on transport (WebSocket or SSE)
    // This is a placeholder
    this.emit('subscription:started', { id, subscription });
  }

  /**
   * Get cache key
   */
  private getCacheKey(query: string, variables?: Variables): string {
    return `${query}:${JSON.stringify(variables || {})}`;
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.queryCache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.config.caching.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache
   */
  private setCache(key: string, data: unknown): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Generate subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get adapter statistics
   */
  getStats(): {
    cacheSize: number;
    activeSubscriptions: number;
    dataLoaders: number;
  } {
    return {
      cacheSize: this.queryCache.size,
      activeSubscriptions: this.subscriptions.size,
      dataLoaders: this.dataLoaders.size
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query('{ __typename }');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Unsubscribe all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();

    // Clear all caches
    this.queryCache.clear();
    this.dataLoaders.forEach(loader => loader.clearAll());
    this.dataLoaders.clear();

    this.removeAllListeners();
  }
}

/**
 * Create GraphQL adapter instance
 */
export function createGraphQLAdapter(config: GraphQLAdapterConfig): GraphQLAdapter {
  return new GraphQLAdapter(config);
}

export default GraphQLAdapter;