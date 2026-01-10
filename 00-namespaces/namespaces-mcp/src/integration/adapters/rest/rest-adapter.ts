/**
 * REST Adapter - RESTful API integration adapter
 * 
 * Provides comprehensive REST API integration with connection pooling,
 * request/response interceptors, caching, retry mechanisms, and circuit breaker.
 * 
 * @module integration/adapters/rest/rest-adapter
 */

import { EventEmitter } from 'events';

/**
 * HTTP methods
 */
export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * Request options
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  retry?: number;
  cache?: boolean;
  validateStatus?: (status: number) => boolean;
}

/**
 * Response structure
 */
export interface Response<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
}

/**
 * Request configuration
 */
export interface RequestConfig extends RequestOptions {
  method: HTTPMethod;
  url: string;
  data?: unknown;
  baseURL?: string;
}

/**
 * Batch request
 */
export interface BatchRequest {
  method: HTTPMethod;
  path: string;
  data?: unknown;
  options?: RequestOptions;
}

/**
 * Batch response
 */
export interface BatchResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  status?: number;
}

/**
 * Request interceptor
 */
export interface RequestInterceptor {
  onFulfilled?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onRejected?: (error: Error) => Error | Promise<Error>;
}

/**
 * Response interceptor
 */
export interface ResponseInterceptor {
  onFulfilled?: <T>(response: Response<T>) => Response<T> | Promise<Response<T>>;
  onRejected?: (error: Error) => Error | Promise<Error>;
}

/**
 * Circuit breaker state
 */
export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  enabled: boolean;
  threshold: number;
  timeout: number;
  resetTimeout: number;
}

/**
 * REST adapter configuration
 */
export interface RESTAdapterConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  cache?: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  compression?: boolean;
  authentication?: {
    type: 'bearer' | 'basic' | 'api-key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  rateLimit?: {
    enabled: boolean;
    maxRequests: number;
    window: number;
  };
  circuitBreaker?: CircuitBreakerConfig;
}

/**
 * Cache entry
 */
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requests: number[];
  window: number;
  maxRequests: number;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

/**
 * REST Adapter
 * 
 * Comprehensive REST API integration adapter
 */
export class RESTAdapter extends EventEmitter {
  private config: Required<RESTAdapterConfig>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimiter: RateLimiterState;
  private circuitBreaker: CircuitBreakerState;

  constructor(config: RESTAdapterConfig) {
    super();
    this.config = {
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 3,
      headers: config.headers ?? {},
      cache: config.cache ?? {
        enabled: false,
        ttl: 300000,
        maxSize: 100
      },
      compression: config.compression ?? true,
      authentication: config.authentication ?? { type: 'bearer' },
      rateLimit: config.rateLimit ?? {
        enabled: false,
        maxRequests: 100,
        window: 60000
      },
      circuitBreaker: config.circuitBreaker ?? {
        enabled: false,
        threshold: 5,
        timeout: 60000,
        resetTimeout: 30000
      }
    };

    this.rateLimiter = {
      requests: [],
      window: this.config.rateLimit.window,
      maxRequests: this.config.rateLimit.maxRequests
    };

    this.circuitBreaker = {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    };
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * GET request
   */
  async get<T = unknown>(path: string, options?: RequestOptions): Promise<Response<T>> {
    return this.request<T>({
      method: HTTPMethod.GET,
      url: this.buildURL(path),
      ...options
    });
  }

  /**
   * POST request
   */
  async post<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<Response<T>> {
    return this.request<T>({
      method: HTTPMethod.POST,
      url: this.buildURL(path),
      data,
      ...options
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<Response<T>> {
    return this.request<T>({
      method: HTTPMethod.PUT,
      url: this.buildURL(path),
      data,
      ...options
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(path: string, data?: unknown, options?: RequestOptions): Promise<Response<T>> {
    return this.request<T>({
      method: HTTPMethod.PATCH,
      url: this.buildURL(path),
      data,
      ...options
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(path: string, options?: RequestOptions): Promise<Response<T>> {
    return this.request<T>({
      method: HTTPMethod.DELETE,
      url: this.buildURL(path),
      ...options
    });
  }

  /**
   * Batch requests
   */
  async batch(requests: BatchRequest[]): Promise<BatchResponse[]> {
    const promises = requests.map(async (req) => {
      try {
        const response = await this.request({
          method: req.method,
          url: this.buildURL(req.path),
          data: req.data,
          ...req.options
        });

        return {
          success: true,
          data: response.data,
          status: response.status
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Core request method
   */
  private async request<T = unknown>(config: RequestConfig): Promise<Response<T>> {
    // Check circuit breaker
    if (this.config.circuitBreaker.enabled) {
      this.checkCircuitBreaker();
    }

    // Check rate limit
    if (this.config.rateLimit.enabled) {
      await this.checkRateLimit();
    }

    // Check cache for GET requests
    if (config.method === HTTPMethod.GET && this.config.cache.enabled) {
      const cached = this.getFromCache<T>(config.url);
      if (cached) {
        this.emit('cache:hit', { url: config.url });
        return cached;
      }
    }

    // Apply request interceptors
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onFulfilled) {
        processedConfig = await interceptor.onFulfilled(processedConfig);
      }
    }

    // Add authentication
    processedConfig = this.addAuthentication(processedConfig);

    // Execute request with retry
    const retries = config.retry ?? this.config.retries;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.executeRequest<T>(processedConfig);

        // Apply response interceptors
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          if (interceptor.onFulfilled) {
            processedResponse = await interceptor.onFulfilled(processedResponse);
          }
        }

        // Cache successful GET requests
        if (config.method === HTTPMethod.GET && this.config.cache.enabled) {
          this.setCache(config.url, processedResponse);
        }

        // Reset circuit breaker on success
        if (this.config.circuitBreaker.enabled) {
          this.recordSuccess();
        }

        this.emit('request:success', { config, response: processedResponse });

        return processedResponse;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Record failure for circuit breaker
        if (this.config.circuitBreaker.enabled) {
          this.recordFailure();
        }

        // Apply error interceptors
        for (const interceptor of this.responseInterceptors) {
          if (interceptor.onRejected) {
            lastError = await interceptor.onRejected(lastError);
          }
        }

        // Don't retry on last attempt
        if (attempt === retries) {
          break;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await this.sleep(delay);

        this.emit('request:retry', { config, attempt: attempt + 1, error: lastError });
      }
    }

    this.emit('request:error', { config, error: lastError });
    throw lastError;
  }

  /**
   * Execute HTTP request
   */
  private async executeRequest<T>(config: RequestConfig): Promise<Response<T>> {
    const controller = new AbortController();
    const timeout = config.timeout ?? this.config.timeout;

    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = new URL(config.url);
      
      // Add query parameters
      if (config.params) {
        Object.entries(config.params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const headers: Record<string, string> = {
        ...this.config.headers,
        ...config.headers
      };

      // Add content type for requests with body
      if (config.data && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url.toString(), {
        method: config.method,
        headers,
        body: config.data ? JSON.stringify(config.data) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Validate status
      const validateStatus = config.validateStatus ?? ((status) => status >= 200 && status < 300);
      if (!validateStatus(response.status)) {
        throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
      }

      // Parse response
      const contentType = response.headers.get('Content-Type') || '';
      let data: T;

      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = await response.text() as T;
      } else {
        data = await response.blob() as T;
      }

      // Build response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        config
      };

    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Build full URL
   */
  private buildURL(path: string): string {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${this.config.baseURL}${path.startsWith('/') ? path : '/' + path}`;
  }

  /**
   * Add authentication to request
   */
  private addAuthentication(config: RequestConfig): RequestConfig {
    const auth = this.config.authentication;
    const headers = { ...config.headers };

    switch (auth.type) {
      case 'bearer':
        if (auth.token) {
          headers['Authorization'] = `Bearer ${auth.token}`;
        }
        break;

      case 'basic':
        if (auth.username && auth.password) {
          const credentials = btoa(`${auth.username}:${auth.password}`);
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'api-key':
        if (auth.apiKey) {
          const headerName = auth.apiKeyHeader || 'X-API-Key';
          headers[headerName] = auth.apiKey;
        }
        break;
    }

    return { ...config, headers };
  }

  /**
   * Get from cache
   */
  private getFromCache<T>(key: string): Response<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as Response<T>;
  }

  /**
   * Set cache
   */
  private setCache<T>(key: string, data: Response<T>): void {
    // Check cache size limit
    if (this.cache.size >= this.config.cache.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.cache.ttl
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      time => now - time < this.rateLimiter.window
    );

    // Check if limit exceeded
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      const oldestRequest = this.rateLimiter.requests[0];
      const waitTime = this.rateLimiter.window - (now - oldestRequest);
      
      this.emit('ratelimit:exceeded', { waitTime });
      
      await this.sleep(waitTime);
      return this.checkRateLimit();
    }

    // Add current request
    this.rateLimiter.requests.push(now);
  }

  /**
   * Check circuit breaker
   */
  private checkCircuitBreaker(): void {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
      case CircuitState.OPEN:
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = CircuitState.HALF_OPEN;
          this.emit('circuitbreaker:half-open');
        } else {
          throw new Error('Circuit breaker is OPEN');
        }
        break;

      case CircuitState.HALF_OPEN:
        // Allow one request to test
        break;

      case CircuitState.CLOSED:
        // Normal operation
        break;
    }
  }

  /**
   * Record success for circuit breaker
   */
  private recordSuccess(): void {
    if (this.circuitBreaker.state === CircuitState.HALF_OPEN) {
      this.circuitBreaker.state = CircuitState.CLOSED;
      this.circuitBreaker.failures = 0;
      this.emit('circuitbreaker:closed');
    }
  }

  /**
   * Record failure for circuit breaker
   */
  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.config.circuitBreaker.threshold) {
      this.circuitBreaker.state = CircuitState.OPEN;
      this.circuitBreaker.nextAttemptTime = 
        Date.now() + this.config.circuitBreaker.resetTimeout;
      this.emit('circuitbreaker:open', { failures: this.circuitBreaker.failures });
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get adapter statistics
   */
  getStats(): {
    cacheSize: number;
    cacheHitRate: number;
    rateLimitRequests: number;
    circuitBreakerState: CircuitState;
    circuitBreakerFailures: number;
  } {
    return {
      cacheSize: this.cache.size,
      cacheHitRate: 0, // TODO: Track cache hits/misses
      rateLimitRequests: this.rateLimiter.requests.length,
      circuitBreakerState: this.circuitBreaker.state,
      circuitBreakerFailures: this.circuitBreaker.failures
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health', { timeout: 5000, retry: 0 });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create REST adapter instance
 */
export function createRESTAdapter(config: RESTAdapterConfig): RESTAdapter {
  return new RESTAdapter(config);
}

export default RESTAdapter;