/**
 * API Gateway - Unified Management System
 * 
 * Enterprise-grade API gateway with unified management,
 * routing, rate limiting, and comprehensive monitoring.
 * 
 * Performance Targets:
 * - Gateway Latency: <25ms per request
 * - Throughput: 50,000+ requests/second
 * - Concurrent Connections: 100,000+
 * - Availability: 99.99%+
 * 
 * @module APIGateway
 */

import { EventEmitter } from 'events';

/**
 * HTTP methods
 */
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * Route configuration
 */
export interface RouteConfig {
  id: string;
  path: string;
  method: HttpMethod;
  target: string;
  timeout: number;
  retries: number;
  rateLimit?: RateLimitConfig;
  authentication?: AuthConfig;
  caching?: CacheConfig;
  transformation?: TransformConfig;
  metadata: Record<string, any>;
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  enabled: boolean;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: GatewayRequest) => string;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  enabled: boolean;
  type: 'jwt' | 'apikey' | 'oauth' | 'basic';
  options: Record<string, any>;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  keyGenerator?: (req: GatewayRequest) => string;
}

/**
 * Transform configuration
 */
export interface TransformConfig {
  request?: {
    headers?: Record<string, string>;
    body?: (data: any) => any;
  };
  response?: {
    headers?: Record<string, string>;
    body?: (data: any) => any;
  };
}

/**
 * Gateway request
 */
export interface GatewayRequest {
  id: string;
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body?: any;
  metadata: Record<string, any>;
  timestamp: Date;
}

/**
 * Gateway response
 */
export interface GatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body?: any;
  metadata: Record<string, any>;
  timestamp: Date;
}

/**
 * Gateway configuration
 */
export interface GatewayConfig {
  port: number;
  host: string;
  timeout: number;
  maxConnections: number;
  enableCors: boolean;
  enableCompression: boolean;
  enableLogging: boolean;
  enableMetrics: boolean;
  rateLimit?: RateLimitConfig;
}

/**
 * Gateway statistics
 */
export interface GatewayStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  activeConnections: number;
  cacheHitRate: number;
  errorRate: number;
}

/**
 * Request context
 */
interface RequestContext {
  request: GatewayRequest;
  route: RouteConfig;
  startTime: number;
  metadata: Record<string, any>;
}

/**
 * API Gateway - Unified Management System
 * 
 * Provides unified API management with routing, rate limiting,
 * authentication, caching, and comprehensive monitoring.
 */
export class APIGateway extends EventEmitter {
  private config: GatewayConfig;
  private routes: Map<string, RouteConfig>;
  private rateLimiters: Map<string, Map<string, number>>;
  private cache: Map<string, { data: any; expiry: number }>;
  private stats: GatewayStats;
  private latencies: number[];
  private startTime: Date;
  private running: boolean;

  constructor(config: Partial<GatewayConfig> = {}) {
    super();
    
    this.config = {
      port: 8080,
      host: '0.0.0.0',
      timeout: 30000,
      maxConnections: 100000,
      enableCors: true,
      enableCompression: true,
      enableLogging: true,
      enableMetrics: true,
      ...config
    };

    this.routes = new Map();
    this.rateLimiters = new Map();
    this.cache = new Map();
    this.latencies = [];
    this.startTime = new Date();
    this.running = false;

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
      activeConnections: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
  }

  /**
   * Start gateway
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Gateway already running');
    }

    this.running = true;
    this.emit('gateway:started', {
      host: this.config.host,
      port: this.config.port
    });
  }

  /**
   * Stop gateway
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.emit('gateway:stopped');
  }

  /**
   * Register route
   */
  registerRoute(route: RouteConfig): void {
    const key = this.getRouteKey(route.method, route.path);
    this.routes.set(key, route);
    this.emit('route:registered', { route });
  }

  /**
   * Unregister route
   */
  unregisterRoute(method: HttpMethod, path: string): void {
    const key = this.getRouteKey(method, path);
    this.routes.delete(key);
    this.emit('route:unregistered', { method, path });
  }

  /**
   * Get route key
   */
  private getRouteKey(method: HttpMethod, path: string): string {
    return `${method}:${path}`;
  }

  /**
   * Handle request
   */
  async handleRequest(request: GatewayRequest): Promise<GatewayResponse> {
    const startTime = Date.now();
    this.stats.activeConnections++;

    try {
      // Find matching route
      const route = this.findRoute(request);
      if (!route) {
        return this.createErrorResponse(404, 'Route not found');
      }

      // Create request context
      const context: RequestContext = {
        request,
        route,
        startTime,
        metadata: {}
      };

      // Check rate limit
      if (route.rateLimit?.enabled) {
        const allowed = await this.checkRateLimit(request, route);
        if (!allowed) {
          return this.createErrorResponse(429, 'Rate limit exceeded');
        }
      }

      // Check authentication
      if (route.authentication?.enabled) {
        const authenticated = await this.authenticate(request, route);
        if (!authenticated) {
          return this.createErrorResponse(401, 'Unauthorized');
        }
      }

      // Check cache
      if (route.caching?.enabled) {
        const cached = this.getCachedResponse(request, route);
        if (cached) {
          this.updateStats(true, Date.now() - startTime, true);
          return cached;
        }
      }

      // Transform request
      if (route.transformation?.request) {
        this.transformRequest(request, route);
      }

      // Forward request
      const response = await this.forwardRequest(context);

      // Transform response
      if (route.transformation?.response) {
        this.transformResponse(response, route);
      }

      // Cache response
      if (route.caching?.enabled && response.statusCode === 200) {
        this.cacheResponse(request, route, response);
      }

      const latency = Date.now() - startTime;
      this.updateStats(true, latency, false);

      this.emit('request:success', {
        requestId: request.id,
        latency
      });

      return response;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateStats(false, latency, false);

      this.emit('request:error', {
        requestId: request.id,
        error
      });

      return this.createErrorResponse(500, 'Internal server error');
    } finally {
      this.stats.activeConnections--;
    }
  }

  /**
   * Find matching route
   */
  private findRoute(request: GatewayRequest): RouteConfig | undefined {
    const key = this.getRouteKey(request.method, request.path);
    let route = this.routes.get(key);

    if (!route) {
      // Try pattern matching
      for (const [_, r] of this.routes) {
        if (this.matchRoute(request.path, r.path)) {
          route = r;
          break;
        }
      }
    }

    return route;
  }

  /**
   * Match route pattern
   */
  private matchRoute(path: string, pattern: string): boolean {
    const pathParts = path.split('/');
    const patternParts = pattern.split('/');

    if (pathParts.length !== patternParts.length) {
      return false;
    }

    for (let i = 0; i < pathParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        continue; // Parameter match
      }
      if (pathParts[i] !== patternParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(
    request: GatewayRequest,
    route: RouteConfig
  ): Promise<boolean> {
    if (!route.rateLimit) return true;

    const key = route.rateLimit.keyGenerator
      ? route.rateLimit.keyGenerator(request)
      : request.headers['x-forwarded-for'] || 'default';

    let limiter = this.rateLimiters.get(route.id);
    if (!limiter) {
      limiter = new Map();
      this.rateLimiters.set(route.id, limiter);
    }

    const now = Date.now();
    const count = limiter.get(key) || 0;

    if (count >= route.rateLimit.maxRequests) {
      return false;
    }

    limiter.set(key, count + 1);

    // Reset after window
    setTimeout(() => {
      limiter!.delete(key);
    }, route.rateLimit!.windowMs);

    return true;
  }

  /**
   * Authenticate request
   */
  private async authenticate(
    request: GatewayRequest,
    route: RouteConfig
  ): Promise<boolean> {
    if (!route.authentication) return true;

    // Implement authentication based on type
    switch (route.authentication.type) {
      case 'jwt':
        return this.authenticateJWT(request, route);
      case 'apikey':
        return this.authenticateAPIKey(request, route);
      case 'oauth':
        return this.authenticateOAuth(request, route);
      case 'basic':
        return this.authenticateBasic(request, route);
      default:
        return false;
    }
  }

  /**
   * Authenticate JWT
   */
  private authenticateJWT(
    request: GatewayRequest,
    route: RouteConfig
  ): boolean {
    const token = request.headers['authorization']?.replace('Bearer ', '');
    // Implement JWT validation
    return !!token;
  }

  /**
   * Authenticate API Key
   */
  private authenticateAPIKey(
    request: GatewayRequest,
    route: RouteConfig
  ): boolean {
    const apiKey = request.headers['x-api-key'];
    // Implement API key validation
    return !!apiKey;
  }

  /**
   * Authenticate OAuth
   */
  private authenticateOAuth(
    request: GatewayRequest,
    route: RouteConfig
  ): boolean {
    const token = request.headers['authorization']?.replace('Bearer ', '');
    // Implement OAuth validation
    return !!token;
  }

  /**
   * Authenticate Basic
   */
  private authenticateBasic(
    request: GatewayRequest,
    route: RouteConfig
  ): boolean {
    const auth = request.headers['authorization']?.replace('Basic ', '');
    // Implement Basic auth validation
    return !!auth;
  }

  /**
   * Get cached response
   */
  private getCachedResponse(
    request: GatewayRequest,
    route: RouteConfig
  ): GatewayResponse | undefined {
    if (!route.caching) return undefined;

    const key = route.caching.keyGenerator
      ? route.caching.keyGenerator(request)
      : `${request.method}:${request.path}`;

    const cached = this.cache.get(key);
    if (!cached) return undefined;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.data;
  }

  /**
   * Cache response
   */
  private cacheResponse(
    request: GatewayRequest,
    route: RouteConfig,
    response: GatewayResponse
  ): void {
    if (!route.caching) return;

    const key = route.caching.keyGenerator
      ? route.caching.keyGenerator(request)
      : `${request.method}:${request.path}`;

    this.cache.set(key, {
      data: response,
      expiry: Date.now() + route.caching.ttl
    });
  }

  /**
   * Transform request
   */
  private transformRequest(request: GatewayRequest, route: RouteConfig): void {
    if (!route.transformation?.request) return;

    if (route.transformation.request.headers) {
      Object.assign(request.headers, route.transformation.request.headers);
    }

    if (route.transformation.request.body && request.body) {
      request.body = route.transformation.request.body(request.body);
    }
  }

  /**
   * Transform response
   */
  private transformResponse(response: GatewayResponse, route: RouteConfig): void {
    if (!route.transformation?.response) return;

    if (route.transformation.response.headers) {
      Object.assign(response.headers, route.transformation.response.headers);
    }

    if (route.transformation.response.body && response.body) {
      response.body = route.transformation.response.body(response.body);
    }
  }

  /**
   * Forward request to target
   */
  private async forwardRequest(context: RequestContext): Promise<GatewayResponse> {
    // Simulate request forwarding
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          statusCode: 200,
          headers: {},
          body: { success: true },
          metadata: {},
          timestamp: new Date()
        });
      }, 10);
    });
  }

  /**
   * Create error response
   */
  private createErrorResponse(statusCode: number, message: string): GatewayResponse {
    return {
      statusCode,
      headers: { 'content-type': 'application/json' },
      body: { error: message },
      metadata: {},
      timestamp: new Date()
    };
  }

  /**
   * Update statistics
   */
  private updateStats(success: boolean, latency: number, cached: boolean): void {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }

    // Update latencies
    this.latencies.push(latency);
    if (this.latencies.length > 1000) {
      this.latencies.shift();
    }

    // Calculate percentiles
    const sorted = [...this.latencies].sort((a, b) => a - b);
    this.stats.p50Latency = sorted[Math.floor(sorted.length * 0.5)];
    this.stats.p95Latency = sorted[Math.floor(sorted.length * 0.95)];
    this.stats.p99Latency = sorted[Math.floor(sorted.length * 0.99)];

    // Calculate average latency
    const alpha = 0.1;
    this.stats.averageLatency = 
      alpha * latency + (1 - alpha) * this.stats.averageLatency;

    // Calculate throughput
    const elapsedSeconds = (Date.now() - this.startTime.getTime()) / 1000;
    this.stats.throughput = this.stats.totalRequests / elapsedSeconds;

    // Calculate error rate
    this.stats.errorRate = this.stats.failedRequests / this.stats.totalRequests;

    // Update cache hit rate
    if (cached) {
      const cacheHits = this.stats.totalRequests - this.stats.successfulRequests;
      this.stats.cacheHitRate = cacheHits / this.stats.totalRequests;
    }
  }

  /**
   * Get gateway statistics
   */
  getStats(): GatewayStats {
    return { ...this.stats };
  }

  /**
   * Get all routes
   */
  getRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get route by ID
   */
  getRoute(id: string): RouteConfig | undefined {
    for (const route of this.routes.values()) {
      if (route.id === id) {
        return route;
      }
    }
    return undefined;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      p50Latency: 0,
      p95Latency: 0,
      p99Latency: 0,
      throughput: 0,
      activeConnections: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
    this.latencies = [];
    this.startTime = new Date();
    this.emit('stats:reset');
  }
}

/**
 * Create API gateway instance
 */
export function createAPIGateway(config?: Partial<GatewayConfig>): APIGateway {
  return new APIGateway(config);
}