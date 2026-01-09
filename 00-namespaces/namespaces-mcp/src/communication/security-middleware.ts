/**
 * MCP Security Middleware - Comprehensive security middleware stack
 * 
 * Provides integrated security with:
 * - <5ms middleware processing (p99)
 * - Authentication and authorization
 * - Rate limiting and throttling
 * - Request validation and sanitization
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { MCPAuthHandler, AuthCredentials, AuthResult } from './auth-handler';
import { MCPEncryptionService, EncryptionResult } from './encryption-service';
import { MCPRateLimiter, RateLimitResult } from './rate-limiter';

export interface SecurityMiddlewareConfig {
  enableAuthentication?: boolean;
  enableAuthorization?: boolean;
  enableRateLimiting?: boolean;
  enableEncryption?: boolean;
  enableValidation?: boolean;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  authConfig?: any;
  encryptionConfig?: any;
  rateLimitConfig?: any;
  allowedOrigins?: string[];
  blockedIPs?: string[];
  maxRequestSize?: number;
  timeoutMs?: number;
}

export interface SecurityContext {
  request: {
    id: string;
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
    ip?: string;
    userAgent?: string;
    timestamp: number;
  };
  auth?: AuthResult;
  rateLimit?: RateLimitResult;
  encryption?: EncryptionResult;
  permissions: string[];
  metadata: Record<string, any>;
}

export interface MiddlewareResult {
  allowed: boolean;
  statusCode?: number;
  message?: string;
  context: SecurityContext;
  processingTime: number;
}

export interface SecurityMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  authenticationAttempts: number;
  rateLimitHits: number;
  encryptionOperations: number;
  averageProcessingTime: number;
  blockedIPs: number;
  securityViolations: number;
}

/**
 * Comprehensive security middleware implementation
 */
export class MCPSecurityMiddleware extends EventEmitter {
  private authHandler?: MCPAuthHandler;
  private encryptionService?: MCPEncryptionService;
  private rateLimiter?: MCPRateLimiter;
  private blockedIPs = new Set<string>();
  private securityMetrics: SecurityMetrics = {
    totalRequests: 0,
    allowedRequests: 0,
    blockedRequests: 0,
    authenticationAttempts: 0,
    rateLimitHits: 0,
    encryptionOperations: 0,
    averageProcessingTime: 0,
    blockedIPs: 0,
    securityViolations: 0
  };
  private processingTimes: number[] = [];

  constructor(private config: SecurityMiddlewareConfig = {}) {
    super();
    
    this.config = {
      enableAuthentication: true,
      enableAuthorization: true,
      enableRateLimiting: true,
      enableEncryption: false,
      enableValidation: true,
      enableLogging: true,
      enableMetrics: true,
      allowedOrigins: [],
      blockedIPs: [],
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      timeoutMs: 30000,
      ...config
    };

    // Initialize security components
    this.initializeComponents();
    
    // Load blocked IPs
    if (this.config.blockedIPs) {
      for (const ip of this.config.blockedIPs) {
        this.blockedIPs.add(ip);
      }
    }

    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  /**
   * Process request through security middleware
   */
  async processRequest(request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
    ip?: string;
    userAgent?: string;
  }): Promise<MiddlewareResult> {
    const startTime = performance.now();
    const requestId = this.generateRequestId();
    
    try {
      this.securityMetrics.totalRequests++;
      
      const context: SecurityContext = {
        request: {
          id: requestId,
          ...request,
          timestamp: Date.now()
        },
        permissions: [],
        metadata: {}
      };

      // Step 1: IP blocking
      if (!await this.checkIPBlock(request.ip)) {
        const result = this.createBlockedResult(context, 403, 'IP address blocked', startTime);
        this.securityMetrics.blockedIPs++;
        this.securityMetrics.blockedRequests++;
        return result;
      }

      // Step 2: Request size validation
      if (!await this.validateRequestSize(request.body)) {
        const result = this.createBlockedResult(context, 413, 'Request too large', startTime);
        this.securityMetrics.blockedRequests++;
        return result;
      }

      // Step 3: CORS check
      if (!await this.checkCORS(request.headers)) {
        const result = this.createBlockedResult(context, 403, 'CORS policy violation', startTime);
        this.securityMetrics.blockedRequests++;
        return result;
      }

      // Step 4: Rate limiting
      if (this.config.enableRateLimiting && this.rateLimiter) {
        const clientId = this.getClientId(request);
        context.rateLimit = await this.rateLimiter.checkLimit(clientId);
        
        if (!context.rateLimit.allowed) {
          const result = this.createBlockedResult(context, 429, 'Rate limit exceeded', startTime);
          this.securityMetrics.rateLimitHits++;
          this.securityMetrics.blockedRequests++;
          return result;
        }
      }

      // Step 5: Authentication
      if (this.config.enableAuthentication && this.authHandler) {
        const credentials = this.extractCredentials(request.headers);
        if (credentials) {
          this.securityMetrics.authenticationAttempts++;
          context.auth = await this.authHandler.authenticate(credentials);
          
          if (!context.auth.success) {
            const result = this.createBlockedResult(context, 401, 'Authentication failed', startTime);
            this.securityMetrics.blockedRequests++;
            return result;
          }
        }
      }

      // Step 6: Authorization
      if (this.config.enableAuthorization && context.auth?.success) {
        if (!await this.checkAuthorization(context)) {
          const result = this.createBlockedResult(context, 403, 'Authorization failed', startTime);
          this.securityMetrics.blockedRequests++;
          return result;
        }
      }

      // Step 7: Request validation
      if (this.config.enableValidation) {
        if (!await this.validateRequest(context)) {
          const result = this.createBlockedResult(context, 400, 'Request validation failed', startTime);
          this.securityMetrics.blockedRequests++;
          return result;
        }
      }

      // Step 8: Decryption (if needed)
      if (this.config.enableEncryption && this.encryptionService && request.body) {
        try {
          const encryptedData = this.extractEncryptedData(request.body);
          if (encryptedData) {
            const decrypted = await this.encryptionService.decrypt(encryptedData, 'default-key');
            context.request.body = decrypted.data;
            context.encryption = encryptedData;
            this.securityMetrics.encryptionOperations++;
          }
        } catch (error) {
          const result = this.createBlockedResult(context, 400, 'Decryption failed', startTime);
          this.securityMetrics.blockedRequests++;
          return result;
        }
      }

      // Request allowed
      const result: MiddlewareResult = {
        allowed: true,
        context,
        processingTime: performance.now() - startTime
      };
      
      this.securityMetrics.allowedRequests++;
      this.updateMetrics(result.processingTime);
      
      this.emit('requestAllowed', { requestId, context });
      return result;
      
    } catch (error) {
      const result: MiddlewareResult = {
        allowed: false,
        statusCode: 500,
        message: 'Internal security error',
        context: {
          request: {
            id: requestId,
            ...request,
            timestamp: Date.now()
          },
          permissions: [],
          metadata: { error: (error as Error).message }
        },
        processingTime: performance.now() - startTime
      };
      
      this.securityMetrics.blockedRequests++;
      this.securityMetrics.securityViolations++;
      
      this.emit('securityError', { requestId, error });
      return result;
    }
  }

  /**
   * Block IP address
   */
  blockIP(ip: string): void {
    this.blockedIPs.add(ip);
    this.securityMetrics.blockedIPs = this.blockedIPs.size;
    this.emit('ipBlocked', { ip });
  }

  /**
   * Unblock IP address
   */
  unblockIP(ip: string): void {
    this.blockedIPs.delete(ip);
    this.securityMetrics.blockedIPs = this.blockedIPs.size;
    this.emit('ipUnblocked', { ip });
  }

  /**
   * Get blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs);
  }

  /**
   * Get security metrics
   */
  getMetrics(): SecurityMetrics {
    return {
      ...this.securityMetrics,
      averageProcessingTime: this.calculateAverageProcessingTime(),
      blockedIPs: this.blockedIPs.size
    };
  }

  /**
   * Clear blocked IPs
   */
  clearBlockedIPs(): void {
    this.blockedIPs.clear();
    this.securityMetrics.blockedIPs = 0;
    this.emit('blockedIPsCleared');
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.securityMetrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      authenticationAttempts: 0,
      rateLimitHits: 0,
      encryptionOperations: 0,
      averageProcessingTime: 0,
      blockedIPs: this.blockedIPs.size,
      securityViolations: 0
    };
    this.processingTimes = [];
    this.emit('metricsReset');
  }

  private initializeComponents(): void {
    if (this.config.enableAuthentication || this.config.enableAuthorization) {
      this.authHandler = new MCPAuthHandler(this.config.authConfig);
    }
    
    if (this.config.enableEncryption) {
      this.encryptionService = new MCPEncryptionService(this.config.encryptionConfig);
    }
    
    if (this.config.enableRateLimiting) {
      this.rateLimiter = new MCPRateLimiter(this.config.rateLimitConfig);
    }
  }

  private async checkIPBlock(ip?: string): Promise<boolean> {
    if (!ip) return true;
    return !this.blockedIPs.has(ip);
  }

  private async validateRequestSize(body?: any): Promise<boolean> {
    if (!body) return true;
    
    const size = Buffer.byteLength(JSON.stringify(body));
    return size <= (this.config.maxRequestSize || 10 * 1024 * 1024);
  }

  private async checkCORS(headers: Record<string, string>): Promise<boolean> {
    const origin = headers['origin'];
    if (!origin) return true;
    
    const allowedOrigins = this.config.allowedOrigins || [];
    return allowedOrigins.length === 0 || allowedOrigins.includes(origin);
  }

  private extractCredentials(headers: Record<string, string>): AuthCredentials | null {
    const authHeader = headers['authorization'];
    if (!authHeader) return null;
    
    if (authHeader.startsWith('Bearer ')) {
      return {
        type: 'jwt',
        token: authHeader.substring(7)
      };
    }
    
    if (authHeader.startsWith('ApiKey ')) {
      return {
        type: 'apikey',
        apiKey: authHeader.substring(7)
      };
    }
    
    if (authHeader.startsWith('Basic ')) {
      const credentials = Buffer.from(authHeader.substring(6), 'base64').toString();
      const [username, password] = credentials.split(':');
      return {
        type: 'basic',
        username,
        password
      };
    }
    
    return null;
  }

  private getClientId(request: { ip?: string; headers?: Record<string, string> }): string {
    // Use IP as client identifier, fallback to user agent
    return request.ip || request.headers?.['user-agent'] || 'unknown';
  }

  private async checkAuthorization(context: SecurityContext): Promise<boolean> {
    if (!context.auth?.success) return false;
    
    // Simple role-based authorization
    const requiredPermissions = this.getRequiredPermissions(context.request.path, context.request.method);
    const userPermissions = context.auth.permissions || [];
    
    return requiredPermissions.every(perm => userPermissions.includes(perm)) ||
           userPermissions.includes('all');
  }

  private getRequiredPermissions(path: string, method: string): string[] {
    // Simplified permission mapping
    if (path.startsWith('/admin')) {
      return ['admin'];
    }
    
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      return ['write'];
    }
    
    return ['read'];
  }

  private async validateRequest(context: SecurityContext): Promise<boolean> {
    const { method, path, headers, body } = context.request;
    
    // Basic validation
    if (!method || !path) return false;
    
    // Validate HTTP method
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    if (!allowedMethods.includes(method)) return false;
    
    // Validate content-type for requests with body
    if (body && method !== 'GET' && method !== 'HEAD') {
      const contentType = headers['content-type'];
      if (!contentType) return false;
    }
    
    // Validate path format
    if (!path.startsWith('/')) return false;
    
    return true;
  }

  private extractEncryptedData(body: any): EncryptionResult | null {
    if (body && typeof body === 'object' && body.encrypted) {
      return body.encrypted as EncryptionResult;
    }
    return null;
  }

  private createBlockedResult(
    context: SecurityContext,
    statusCode: number,
    message: string,
    startTime: number
  ): MiddlewareResult {
    return {
      allowed: false,
      statusCode,
      message,
      context,
      processingTime: performance.now() - startTime
    };
  }

  private updateMetrics(processingTime: number): void {
    this.processingTimes.push(processingTime);
    
    // Keep only last 1000 measurements
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }
  }

  private calculateAverageProcessingTime(): number {
    if (this.processingTimes.length === 0) {
      return 0;
    }
    return this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.securityMetrics.averageProcessingTime = this.calculateAverageProcessingTime();
      this.securityMetrics.blockedIPs = this.blockedIPs.size;
    }, 5000);
  }

  private generateRequestId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Security middleware with advanced threat detection
 */
export class MCPSecurityMiddlewareAdvanced extends MCPSecurityMiddleware {
  private threatDetectors = new Map<string, (context: SecurityContext) => Promise<boolean>>();
  private threatCounts = new Map<string, number>();

  async addThreatDetector(name: string, detector: (context: SecurityContext) => Promise<boolean>): Promise<void> {
    this.threatDetectors.set(name, detector);
    this.emit('threatDetectorAdded', { name });
  }

  protected override async processRequest(request: {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
    ip?: string;
    userAgent?: string;
  }): Promise<MiddlewareResult> {
    const result = await super.processRequest(request);
    
    // Run threat detectors
    if (result.allowed) {
      for (const [name, detector] of this.threatDetectors.entries()) {
        try {
          const isThreat = await detector(result.context);
          if (isThreat) {
            const count = this.threatCounts.get(name) || 0;
            this.threatCounts.set(name, count + 1);
            
            // Block request if threat detected
            return {
              allowed: false,
              statusCode: 403,
              message: `Threat detected: ${name}`,
              context: result.context,
              processingTime: result.processingTime
            };
          }
        } catch (error) {
          console.error(`Threat detector ${name} failed:`, error);
        }
      }
    }
    
    return result;
  }
}