/**
 * MCP Registry Core
 * 
 * Enhanced registry system with service discovery, metadata management,
 * and comprehensive lifecycle management for MCP services.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service Status
 */
export enum ServiceStatus {
  REGISTERING = 'registering',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPRECATED = 'deprecated',
  ERROR = 'error',
  UNREGISTERING = 'unregistering'
}

/**
 * Service Type
 */
export enum ServiceType {
  TOOL = 'tool',
  RESOURCE = 'resource',
  PROTOCOL = 'protocol',
  TRANSPORT = 'transport',
  ADAPTER = 'adapter',
  MIDDLEWARE = 'middleware'
}

/**
 * Service Metadata
 */
export interface ServiceMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  category: string;
  license: string;
  homepage?: string;
  repository?: string;
  documentation?: string;
  keywords: string[];
  dependencies: string[];
  capabilities: string[];
  limitations: string[];
}

/**
 * Service Configuration
 */
export interface ServiceConfiguration {
  maxConnections: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  customSettings: Record<string, any>;
}

/**
 * Service Health
 */
export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  lastCheck: number;
  uptime: number;
  responseTime: number;
  errorRate: number;
  metrics: Record<string, number>;
  details?: Record<string, any>;
}

/**
 * Service Statistics
 */
export interface ServiceStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  lastRequestTime: number;
  registeredAt: number;
  lastHealthCheck: number;
}

/**
 * Service Registration
 */
export interface ServiceRegistration {
  id: string;
  type: ServiceType;
  metadata: ServiceMetadata;
  configuration: ServiceConfiguration;
  endpoints: string[];
  status: ServiceStatus;
  health: ServiceHealth;
  statistics: ServiceStatistics;
  registeredAt: number;
  updatedAt: number;
  expiresAt?: number;
}

/**
 * Registry Configuration
 */
export interface RegistryConfig {
  maxServices: number;
  defaultTimeout: number;
  healthCheckInterval: number;
  cleanupInterval: number;
  enableAutoCleanup: boolean;
  enableMetrics: boolean;
  enableNotifications: boolean;
  retentionPeriod: number;
  maxRetries: number;
}

/**
 * Search Filters
 */
export interface SearchFilters {
  type?: ServiceType;
  status?: ServiceStatus;
  category?: string;
  tags?: string[];
  capabilities?: string[];
  author?: string;
  minVersion?: string;
  maxVersion?: string;
  registeredAfter?: number;
  registeredBefore?: number;
}

/**
 * Search Options
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'registeredAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
  includeDeprecated?: boolean;
}

/**
 * MCP Registry Core
 */
export class MCPRegistryCore extends EventEmitter {
  private config: RegistryConfig;
  private services: Map<string, ServiceRegistration> = new Map();
  private servicesByType: Map<ServiceType, Set<string>> = new Map();
  private servicesByStatus: Map<ServiceStatus, Set<string>> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<RegistryConfig>) {
    super();
    
    this.config = {
      maxServices: 10000,
      defaultTimeout: 30000,
      healthCheckInterval: 30000, // 30 seconds
      cleanupInterval: 300000, // 5 minutes
      enableAutoCleanup: true,
      enableMetrics: true,
      enableNotifications: true,
      retentionPeriod: 86400000, // 24 hours
      maxRetries: 3,
      ...config
    };

    this.initializeServices();
    this.startHealthChecks();
    this.startCleanup();
  }

  /**
   * Register a new service
   */
  public async registerService(
    type: ServiceType,
    metadata: ServiceMetadata,
    configuration: ServiceConfiguration,
    endpoints: string[],
    options?: {
      expiresAt?: number;
      skipHealthCheck?: boolean;
    }
  ): Promise<string> {
    const id = uuidv4();
    const now = Date.now();

    const registration: ServiceRegistration = {
      id,
      type,
      metadata,
      configuration,
      endpoints,
      status: ServiceStatus.REGISTERING,
      health: {
        status: 'healthy',
        lastCheck: now,
        uptime: 0,
        responseTime: 0,
        errorRate: 0,
        metrics: {}
      },
      statistics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsPerSecond: 0,
        lastRequestTime: 0,
        registeredAt: now,
        lastHealthCheck: now
      },
      registeredAt: now,
      updatedAt: now,
      expiresAt: options?.expiresAt
    };

    // Check capacity
    if (this.services.size >= this.config.maxServices) {
      throw new Error('Registry capacity exceeded');
    }

    // Validate service
    this.validateService(registration);

    // Add to registry
    this.services.set(id, registration);
    this.addToIndexes(registration);

    // Perform initial health check
    if (!options?.skipHealthCheck) {
      await this.performHealthCheck(id);
    }

    // Update status
    registration.status = ServiceStatus.ACTIVE;
    this.updateIndexes(registration);

    this.emit('service-registered', registration);

    if (this.config.enableNotifications) {
      this.emit('notification', {
        type: 'service-registered',
        serviceId: id,
        serviceName: metadata.name,
        serviceType: type
      });
    }

    return id;
  }

  /**
   * Unregister a service
   */
  public async unregisterService(id: string): Promise<void> {
    const service = this.services.get(id);
    
    if (!service) {
      throw new Error(`Service not found: ${id}`);
    }

    service.status = ServiceStatus.UNREGISTERING;
    this.updateIndexes(service);

    try {
      // Perform cleanup
      await this.performServiceCleanup(id);

      // Remove from registry
      this.services.delete(id);
      this.removeFromIndexes(id);

      service.status = ServiceStatus.INACTIVE;

      this.emit('service-unregistered', service);

      if (this.config.enableNotifications) {
        this.emit('notification', {
          type: 'service-unregistered',
          serviceId: id,
          serviceName: service.metadata.name
        });
      }

    } catch (error) {
      service.status = ServiceStatus.ERROR;
      this.updateIndexes(service);
      this.emit('service-unregistration-error', { service, error });
      throw error;
    }
  }

  /**
   * Update service configuration
   */
  public async updateServiceConfiguration(
    id: string,
    configuration: Partial<ServiceConfiguration>
  ): Promise<void> {
    const service = this.services.get(id);
    
    if (!service) {
      throw new Error(`Service not found: ${id}`);
    }

    service.configuration = { ...service.configuration, ...configuration };
    service.updatedAt = Date.now();

    this.emit('service-configuration-updated', service);

    if (this.config.enableNotifications) {
      this.emit('notification', {
        type: 'service-configuration-updated',
        serviceId: id,
        serviceName: service.metadata.name
      });
    }
  }

  /**
   * Update service metadata
   */
  public async updateServiceMetadata(
    id: string,
    metadata: Partial<ServiceMetadata>
  ): Promise<void> {
    const service = this.services.get(id);
    
    if (!service) {
      throw new Error(`Service not found: ${id}`);
    }

    service.metadata = { ...service.metadata, ...metadata };
    service.updatedAt = Date.now();

    this.emit('service-metadata-updated', service);

    if (this.config.enableNotifications) {
      this.emit('notification', {
        type: 'service-metadata-updated',
        serviceId: id,
        serviceName: service.metadata.name
      });
    }
  }

  /**
   * Get service by ID
   */
  public getService(id: string): ServiceRegistration | null {
    return this.services.get(id) || null;
  }

  /**
   * Get all services
   */
  public getAllServices(): ServiceRegistration[] {
    return Array.from(this.services.values());
  }

  /**
   * Search services
   */
  public searchServices(
    filters: SearchFilters = {},
    options: SearchOptions = {}
  ): ServiceRegistration[] {
    let services = Array.from(this.services.values());

    // Apply filters
    services = this.applyFilters(services, filters);

    // Apply status filters
    if (!options.includeInactive) {
      services = services.filter(s => s.status !== ServiceStatus.INACTIVE);
    }

    if (!options.includeDeprecated) {
      services = services.filter(s => s.status !== ServiceStatus.DEPRECATED);
    }

    // Apply sorting
    services = this.applySorting(services, options.sortBy, options.sortOrder);

    // Apply pagination
    if (options.offset) {
      services = services.slice(options.offset);
    }

    if (options.limit) {
      services = services.slice(0, options.limit);
    }

    return services;
  }

  /**
   * Get services by type
   */
  public getServicesByType(type: ServiceType): ServiceRegistration[] {
    const serviceIds = this.servicesByType.get(type) || new Set();
    return Array.from(serviceIds)
      .map(id => this.services.get(id))
      .filter(service => service !== undefined) as ServiceRegistration[];
  }

  /**
   * Get services by status
   */
  public getServicesByStatus(status: ServiceStatus): ServiceRegistration[] {
    const serviceIds = this.servicesByStatus.get(status) || new Set();
    return Array.from(serviceIds)
      .map(id => this.services.get(id))
      .filter(service => service !== undefined) as ServiceRegistration[];
  }

  /**
   * Get service health
   */
  public getServiceHealth(id: string): ServiceHealth | null {
    const service = this.services.get(id);
    return service ? service.health : null;
  }

  /**
   * Get service statistics
   */
  public getServiceStatistics(id: string): ServiceStatistics | null {
    const service = this.services.get(id);
    return service ? service.statistics : null;
  }

  /**
   * Manually trigger health check for a service
   */
  public async triggerHealthCheck(id: string): Promise<void> {
    const service = this.services.get(id);
    
    if (!service) {
      throw new Error(`Service not found: ${id}`);
    }

    await this.performHealthCheck(id);
  }

  /**
   * Get registry statistics
   */
  public getRegistryStatistics(): {
    totalServices: number;
    servicesByType: Record<ServiceType, number>;
    servicesByStatus: Record<ServiceStatus, number>;
    healthyServices: number;
    unhealthyServices: number;
    averageResponseTime: number;
    totalRequests: number;
  } {
    const services = Array.from(this.services.values());
    
    const servicesByType = {} as Record<ServiceType, number>;
    const servicesByStatus = {} as Record<ServiceStatus, number>;
    
    let healthyServices = 0;
    let unhealthyServices = 0;
    let totalResponseTime = 0;
    let totalRequests = 0;

    for (const service of services) {
      // Count by type
      servicesByType[service.type] = (servicesByType[service.type] || 0) + 1;
      
      // Count by status
      servicesByStatus[service.status] = (servicesByStatus[service.status] || 0) + 1;
      
      // Health status
      if (service.health.status === 'healthy') {
        healthyServices++;
      } else {
        unhealthyServices++;
      }
      
      // Statistics
      totalResponseTime += service.statistics.averageResponseTime;
      totalRequests += service.statistics.totalRequests;
    }

    return {
      totalServices: services.length,
      servicesByType,
      servicesByStatus,
      healthyServices,
      unhealthyServices,
      averageResponseTime: services.length > 0 ? totalResponseTime / services.length : 0,
      totalRequests
    };
  }

  /**
   * Destroy registry
   */
  public async destroy(): Promise<void> {
    // Stop intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Unregister all services
    const serviceIds = Array.from(this.services.keys());
    for (const id of serviceIds) {
      try {
        await this.unregisterService(id);
      } catch (error) {
        // Continue with other services
      }
    }

    // Clear data
    this.services.clear();
    this.servicesByType.clear();
    this.servicesByStatus.clear();
    this.removeAllListeners();
  }

  // Private methods

  private initializeServices(): void {
    for (const type of Object.values(ServiceType)) {
      this.servicesByType.set(type, new Set());
    }
    
    for (const status of Object.values(ServiceStatus)) {
      this.servicesByStatus.set(status, new Set());
    }
  }

  private validateService(service: ServiceRegistration): void {
    if (!service.metadata.name || service.metadata.name.trim().length === 0) {
      throw new Error('Service name is required');
    }

    if (!service.metadata.version || service.metadata.version.trim().length === 0) {
      throw new Error('Service version is required');
    }

    if (!service.endpoints || service.endpoints.length === 0) {
      throw new Error('Service must have at least one endpoint');
    }

    // Validate URL format for endpoints
    for (const endpoint of service.endpoints) {
      try {
        new URL(endpoint);
      } catch {
        throw new Error(`Invalid endpoint URL: ${endpoint}`);
      }
    }
  }

  private addToIndexes(service: ServiceRegistration): void {
    if (!this.servicesByType.has(service.type)) {
      this.servicesByType.set(service.type, new Set());
    }
    this.servicesByType.get(service.type)!.add(service.id);

    if (!this.servicesByStatus.has(service.status)) {
      this.servicesByStatus.set(service.status, new Set());
    }
    this.servicesByStatus.get(service.status)!.add(service.id);
  }

  private removeFromIndexes(id: string): void {
    for (const serviceIds of this.servicesByType.values()) {
      serviceIds.delete(id);
    }
    
    for (const serviceIds of this.servicesByStatus.values()) {
      serviceIds.delete(id);
    }
  }

  private updateIndexes(service: ServiceRegistration): void {
    this.removeFromIndexes(service.id);
    this.addToIndexes(service);
  }

  private applyFilters(
    services: ServiceRegistration[],
    filters: SearchFilters
  ): ServiceRegistration[] {
    return services.filter(service => {
      if (filters.type && service.type !== filters.type) {
        return false;
      }

      if (filters.status && service.status !== filters.status) {
        return false;
      }

      if (filters.category && service.metadata.category !== filters.category) {
        return false;
      }

      if (filters.tags && filters.tags.length > 0) {
        const hasAllTags = filters.tags.every(tag => 
          service.metadata.tags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }

      if (filters.capabilities && filters.capabilities.length > 0) {
        const hasAllCapabilities = filters.capabilities.every(cap => 
          service.metadata.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }

      if (filters.author && service.metadata.author !== filters.author) {
        return false;
      }

      if (filters.registeredAfter && service.registeredAt < filters.registeredAfter) {
        return false;
      }

      if (filters.registeredBefore && service.registeredAt > filters.registeredBefore) {
        return false;
      }

      return true;
    });
  }

  private applySorting(
    services: ServiceRegistration[],
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): ServiceRegistration[] {
    if (!sortBy) {
      return services;
    }

    return services.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.metadata.name.toLowerCase();
          bValue = b.metadata.name.toLowerCase();
          break;
        case 'registeredAt':
          aValue = a.registeredAt;
          bValue = b.registeredAt;
          break;
        case 'updatedAt':
          aValue = a.updatedAt;
          bValue = b.updatedAt;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private async performHealthCheck(id: string): Promise<void> {
    const service = this.services.get(id);
    
    if (!service) {
      return;
    }

    const startTime = Date.now();
    let isHealthy = false;
    let responseTime = 0;
    let errorDetails: any = null;

    try {
      // Simulate health check - in real implementation, this would ping the service
      for (const endpoint of service.endpoints) {
        try {
          const response = await fetch(`${endpoint}/health`, {
            method: 'GET',
            timeout: service.configuration.timeout || this.config.defaultTimeout
          });

          if (response.ok) {
            isHealthy = true;
            break;
          }
        } catch (error) {
          // Try next endpoint
        }
      }

      responseTime = Date.now() - startTime;

    } catch (error) {
      errorDetails = error.message;
      responseTime = Date.now() - startTime;
    }

    // Update health status
    service.health.lastCheck = Date.now();
    service.health.responseTime = responseTime;
    service.health.status = isHealthy ? 'healthy' : 'unhealthy';
    
    if (errorDetails) {
      service.health.details = { lastError: errorDetails };
    }

    // Update statistics
    service.statistics.lastHealthCheck = Date.now();

    // Update uptime
    if (service.registeredAt) {
      service.health.uptime = Date.now() - service.registeredAt;
    }

    this.emit('health-check-completed', {
      serviceId: id,
      isHealthy,
      responseTime,
      errorDetails
    });
  }

  private async performServiceCleanup(id: string): Promise<void> {
    // In a real implementation, this would perform cleanup tasks
    // like closing connections, releasing resources, etc.
    this.emit('service-cleanup-completed', { serviceId: id });
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const services = Array.from(this.services.values());
      
      for (const service of services) {
        if (service.status === ServiceStatus.ACTIVE) {
          try {
            await this.performHealthCheck(service.id);
          } catch (error) {
            this.emit('health-check-error', { serviceId: service.id, error });
          }
        }
      }
    }, this.config.healthCheckInterval);
  }

  private startCleanup(): void {
    if (!this.config.enableAutoCleanup) {
      return;
    }

    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, this.config.cleanupInterval);
  }

  private async performCleanup(): Promise<void> {
    const now = Date.now();
    const expiredServices: string[] = [];

    for (const [id, service] of this.services) {
      // Check for expired services
      if (service.expiresAt && service.expiresAt < now) {
        expiredServices.push(id);
        continue;
      }

      // Check for inactive services past retention period
      if (service.status === ServiceStatus.INACTIVE && 
          now - service.updatedAt > this.config.retentionPeriod) {
        expiredServices.push(id);
        continue;
      }
    }

    // Remove expired services
    for (const id of expiredServices) {
      try {
        await this.unregisterService(id);
      } catch (error) {
        this.emit('cleanup-error', { serviceId: id, error });
      }
    }

    if (expiredServices.length > 0) {
      this.emit('cleanup-completed', { removedServices: expiredServices.length });
    }
  }
}

/**
 * Default registry instance
 */
export const defaultMCPRegistry = new MCPRegistryCore();