/**
 * MCP Service Discovery
 * 
 * Advanced service discovery with automatic detection, health monitoring,
 * and intelligent service selection algorithms.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { ServiceRegistration, ServiceType, ServiceStatus } from './registry-core';

/**
 * Discovery Strategy
 */
export enum DiscoveryStrategy {
  ROUND_ROBIN = 'round_robin',
  RANDOM = 'random',
  WEIGHTED = 'weighted',
  LEAST_CONNECTIONS = 'least_connections',
  HEALTH_BASED = 'health_based',
  GEOGRAPHIC = 'geographic',
  PERFORMANCE_BASED = 'performance_based'
}

/**
 * Service Endpoint
 */
export interface ServiceEndpoint {
  url: string;
  protocol: string;
  port: number;
  host: string;
  path: string;
  region?: string;
  availabilityZone?: string;
  metadata?: Record<string, any>;
}

/**
 * Discovery Criteria
 */
export interface DiscoveryCriteria {
  serviceType: ServiceType;
  tags?: string[];
  capabilities?: string[];
  region?: string;
  availabilityZone?: string;
  minHealthScore?: number;
  maxLatency?: number;
  requiredVersion?: string;
  excludeDeprecated?: boolean;
  excludeUnhealthy?: boolean;
}

/**
 * Service Health Score
 */
export interface ServiceHealthScore {
  serviceId: string;
  score: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  lastCheck: number;
  factors: {
    responsiveness: number;
    reliability: number;
    availability: number;
    performance: number;
  };
}

/**
 * Discovery Result
 */
export interface DiscoveryResult {
  services: ServiceRegistration[];
  selectedService: ServiceRegistration | null;
  selectionReason: string;
  totalCandidates: number;
  elapsedTime: number;
  strategy: DiscoveryStrategy;
}

/**
 * Discovery Configuration
 */
export interface DiscoveryConfig {
  defaultStrategy: DiscoveryStrategy;
  healthCheckInterval: number;
  cachingEnabled: boolean;
  cacheTimeout: number;
  maxCandidates: number;
  enableGeoDiscovery: boolean;
  enablePerformanceMonitoring: boolean;
  fallbackStrategies: DiscoveryStrategy[];
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Service Cache Entry
 */
interface CacheEntry {
  services: ServiceRegistration[];
  timestamp: number;
  ttl: number;
  criteria: DiscoveryCriteria;
}

/**
 * MCP Service Discovery
 */
export class MCPServiceDiscovery extends EventEmitter {
  private config: DiscoveryConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private healthScores: Map<string, ServiceHealthScore> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private performanceMetrics: Map<string, any> = new Map();

  constructor(
    private registry: any, // MCPRegistryCore instance
    config?: Partial<DiscoveryConfig>
  ) {
    super();
    
    this.config = {
      defaultStrategy: DiscoveryStrategy.HEALTH_BASED,
      healthCheckInterval: 30000, // 30 seconds
      cachingEnabled: true,
      cacheTimeout: 60000, // 1 minute
      maxCandidates: 100,
      enableGeoDiscovery: false,
      enablePerformanceMonitoring: true,
      fallbackStrategies: [
        DiscoveryStrategy.ROUND_ROBIN,
        DiscoveryStrategy.RANDOM
      ],
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.startHealthMonitoring();
  }

  /**
   * Discover services based on criteria
   */
  public async discoverServices(
    criteria: DiscoveryCriteria,
    strategy: DiscoveryStrategy = this.config.defaultStrategy
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    let services: ServiceRegistration[] = [];
    let selectedService: ServiceRegistration | null = null;
    let selectionReason = '';

    try {
      // Try to get from cache first
      if (this.config.cachingEnabled) {
        const cachedResult = this.getFromCache(criteria);
        if (cachedResult) {
          services = cachedResult;
        }
      }

      // If not in cache, query registry
      if (services.length === 0) {
        services = await this.queryRegistry(criteria);
        
        if (this.config.cachingEnabled) {
          this.addToCache(criteria, services);
        }
      }

      // Filter based on additional criteria
      services = this.applyAdvancedFiltering(services, criteria);

      // Limit candidates
      if (services.length > this.config.maxCandidates) {
        services = services.slice(0, this.config.maxCandidates);
      }

      // Select service using strategy
      if (services.length > 0) {
        const selection = await this.selectService(services, strategy, criteria);
        selectedService = selection.service;
        selectionReason = selection.reason;
      }

      const elapsedTime = Date.now() - startTime;

      const result: DiscoveryResult = {
        services,
        selectedService,
        selectionReason,
        totalCandidates: services.length,
        elapsedTime,
        strategy
      };

      this.emit('discovery-completed', result);
      return result;

    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      
      this.emit('discovery-error', { criteria, error, elapsedTime });
      
      // Try fallback strategies
      for (const fallbackStrategy of this.config.fallbackStrategies) {
        try {
          return await this.discoverServices(criteria, fallbackStrategy);
        } catch (fallbackError) {
          // Continue with next fallback
        }
      }

      throw error;
    }
  }

  /**
   * Get service health score
   */
  public getHealthScore(serviceId: string): ServiceHealthScore | null {
    return this.healthScores.get(serviceId) || null;
  }

  /**
   * Update service health score
   */
  public updateHealthScore(serviceId: string, score: ServiceHealthScore): void {
    this.healthScores.set(serviceId, score);
    this.emit('health-score-updated', { serviceId, score });
  }

  /**
   * Get connection count for service
   */
  public getConnectionCount(serviceId: string): number {
    return this.connectionCounts.get(serviceId) || 0;
  }

  /**
   * Increment connection count
   */
  public incrementConnectionCount(serviceId: string): void {
    const current = this.connectionCounts.get(serviceId) || 0;
    this.connectionCounts.set(serviceId, current + 1);
  }

  /**
   * Decrement connection count
   */
  public decrementConnectionCount(serviceId: string): void {
    const current = this.connectionCounts.get(serviceId) || 0;
    this.connectionCounts.set(serviceId, Math.max(0, current - 1));
  }

  /**
   * Get performance metrics for service
   */
  public getPerformanceMetrics(serviceId: string): any {
    return this.performanceMetrics.get(serviceId);
  }

  /**
   * Update performance metrics
   */
  public updatePerformanceMetrics(serviceId: string, metrics: any): void {
    this.performanceMetrics.set(serviceId, metrics);
    this.emit('performance-metrics-updated', { serviceId, metrics });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    this.emit('cache-cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStatistics(): {
    size: number;
    hitRate: number;
    entries: Array<{
      criteria: DiscoveryCriteria;
      serviceCount: number;
      age: number;
    }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      criteria: entry.criteria,
      serviceCount: entry.services.length,
      age: now - entry.timestamp
    }));

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      entries
    };
  }

  /**
   * Force refresh of cached results
   */
  public async refreshCache(criteria: DiscoveryCriteria): Promise<void> {
    this.cache.delete(this.generateCacheKey(criteria));
    await this.discoverServices(criteria);
  }

  /**
   * Destroy discovery service
   */
  public destroy(): void {
    this.cache.clear();
    this.healthScores.clear();
    this.connectionCounts.clear();
    this.performanceMetrics.clear();
    this.removeAllListeners();
  }

  // Private methods

  private async queryRegistry(criteria: DiscoveryCriteria): Promise<ServiceRegistration[]> {
    const filters: any = {
      type: criteria.serviceType,
      tags: criteria.tags,
      excludeDeprecated: criteria.excludeDeprecated !== false
    };

    if (criteria.excludeUnhealthy !== false) {
      // Filter out unhealthy services
      filters.status = ServiceStatus.ACTIVE;
    }

    return this.registry.searchServices(filters);
  }

  private applyAdvancedFiltering(
    services: ServiceRegistration[],
    criteria: DiscoveryCriteria
  ): ServiceRegistration[] {
    return services.filter(service => {
      // Filter by capabilities
      if (criteria.capabilities && criteria.capabilities.length > 0) {
        const hasAllCapabilities = criteria.capabilities.every(cap =>
          service.metadata.capabilities.includes(cap)
        );
        if (!hasAllCapabilities) {
          return false;
        }
      }

      // Filter by region
      if (criteria.region && this.config.enableGeoDiscovery) {
        // Extract region from endpoints or metadata
        const serviceRegion = this.getServiceRegion(service);
        if (serviceRegion !== criteria.region) {
          return false;
        }
      }

      // Filter by availability zone
      if (criteria.availabilityZone && this.config.enableGeoDiscovery) {
        const serviceAZ = this.getServiceAvailabilityZone(service);
        if (serviceAZ !== criteria.availabilityZone) {
          return false;
        }
      }

      // Filter by health score
      if (criteria.minHealthScore) {
        const healthScore = this.healthScores.get(service.id);
        if (!healthScore || healthScore.score < criteria.minHealthScore) {
          return false;
        }
      }

      // Filter by latency
      if (criteria.maxLatency) {
        const metrics = this.performanceMetrics.get(service.id);
        if (metrics && metrics.averageLatency > criteria.maxLatency) {
          return false;
        }
      }

      // Filter by version
      if (criteria.requiredVersion) {
        if (!this.isVersionCompatible(service.metadata.version, criteria.requiredVersion)) {
          return false;
        }
      }

      return true;
    });
  }

  private async selectService(
    services: ServiceRegistration[],
    strategy: DiscoveryStrategy,
    criteria: DiscoveryCriteria
  ): Promise<{ service: ServiceRegistration; reason: string }> {
    switch (strategy) {
      case DiscoveryStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(services);
      
      case DiscoveryStrategy.RANDOM:
        return this.selectRandom(services);
      
      case DiscoveryStrategy.WEIGHTED:
        return this.selectWeighted(services);
      
      case DiscoveryStrategy.LEAST_CONNECTIONS:
        return this.selectLeastConnections(services);
      
      case DiscoveryStrategy.HEALTH_BASED:
        return this.selectHealthBased(services);
      
      case DiscoveryStrategy.GEOGRAPHIC:
        return this.selectGeographic(services, criteria);
      
      case DiscoveryStrategy.PERFORMANCE_BASED:
        return this.selectPerformanceBased(services);
      
      default:
        return this.selectHealthBased(services);
    }
  }

  private selectRoundRobin(services: ServiceRegistration[]): { service: ServiceRegistration; reason: string } {
    // Simple round-robin implementation
    const index = Math.floor(Math.random() * services.length);
    return {
      service: services[index],
      reason: `Selected using round-robin strategy (index ${index})`
    };
  }

  private selectRandom(services: ServiceRegistration[]): { service: ServiceRegistration; reason: string } {
    const index = Math.floor(Math.random() * services.length);
    return {
      service: services[index],
      reason: `Selected randomly from ${services.length} candidates`
    };
  }

  private selectWeighted(services: ServiceRegistration[]): { service: ServiceRegistration; reason: string } {
    // Weight by health score
    const weights = services.map(service => {
      const healthScore = this.healthScores.get(service.id);
      return healthScore ? healthScore.score : 0.5;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < services.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return {
          service: services[i],
          reason: `Selected using weighted strategy (weight: ${weights[i]})`
        };
      }
    }

    return {
      service: services[0],
      reason: 'Selected using weighted strategy (fallback)'
    };
  }

  private selectLeastConnections(services: ServiceRegistration[]): { service: ServiceRegistration; reason: string } {
    let selectedService = services[0];
    let minConnections = this.getConnectionCount(selectedService.id);

    for (const service of services) {
      const connections = this.getConnectionCount(service.id);
      if (connections < minConnections) {
        selectedService = service;
        minConnections = connections;
      }
    }

    return {
      service: selectedService,
      reason: `Selected service with least connections (${minConnections})`
    };
  }

  private selectHealthBased(services: ServiceRegistration[]): { service: ServiceRegistration; reason: string } {
    let selectedService = services[0];
    let maxScore = this.getHealthScore(selectedService.id)?.score || 0;

    for (const service of services) {
      const healthScore = this.getHealthScore(service.id);
      if (healthScore && healthScore.score > maxScore) {
        selectedService = service;
        maxScore = healthScore.score;
      }
    }

    return {
      service: selectedService,
      reason: `Selected service with highest health score (${maxScore})`
    };
  }

  private selectGeographic(
    services: ServiceRegistration[],
    criteria: DiscoveryCriteria
  ): { service: ServiceRegistration; reason: string } {
    // Simple geographic selection based on region preference
    if (criteria.region) {
      const regionalServices = services.filter(service =>
        this.getServiceRegion(service) === criteria.region
      );

      if (regionalServices.length > 0) {
        const selected = regionalServices[0];
        return {
          service: selected,
          reason: `Selected service in preferred region (${criteria.region})`
        };
      }
    }

    // Fallback to any service
    return {
      service: services[0],
      reason: 'No regional preference matched, selected first available service'
    };
  }

  private selectPerformanceBased(services: ServiceRegistration[]): { service: ServiceRegistration; reason: string } {
    let selectedService = services[0];
    let bestLatency = this.getPerformanceMetrics(selectedService.id)?.averageLatency || Infinity;

    for (const service of services) {
      const metrics = this.getPerformanceMetrics(service.id);
      if (metrics && metrics.averageLatency < bestLatency) {
        selectedService = service;
        bestLatency = metrics.averageLatency;
      }
    }

    return {
      service: selectedService,
      reason: `Selected service with best latency (${bestLatency}ms)`
    };
  }

  private getServiceRegion(service: ServiceRegistration): string | null {
    // Extract region from endpoint URLs or metadata
    for (const endpoint of service.endpoints) {
      try {
        const url = new URL(endpoint);
        // Look for region in hostname or path
        const regionMatch = url.hostname.match(/([a-z]{2}-[a-z]+-\d)/);
        if (regionMatch) {
          return regionMatch[1];
        }
      } catch {
        // Invalid URL, continue
      }
    }

    // Check metadata
    return service.metadata.region || null;
  }

  private getServiceAvailabilityZone(service: ServiceRegistration): string | null {
    // Similar to region but for availability zones
    for (const endpoint of service.endpoints) {
      try {
        const url = new URL(endpoint);
        const azMatch = url.hostname.match(/([a-z]{2}-[a-z]+-\d+[a-z])/);
        if (azMatch) {
          return azMatch[1];
        }
      } catch {
        // Invalid URL, continue
      }
    }

    return service.metadata.availabilityZone || null;
  }

  private isVersionCompatibility(serviceVersion: string, requiredVersion: string): boolean {
    // Simple version compatibility check
    // In a real implementation, this would use semver comparison
    return serviceVersion === requiredVersion || serviceVersion.startsWith(requiredVersion.split('.')[0]);
  }

  private generateCacheKey(criteria: DiscoveryCriteria): string {
    return JSON.stringify(criteria);
  }

  private getFromCache(criteria: DiscoveryCriteria): ServiceRegistration[] | null {
    const key = this.generateCacheKey(criteria);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.services;
  }

  private addToCache(criteria: DiscoveryCriteria, services: ServiceRegistration[]): void {
    const key = this.generateCacheKey(criteria);
    
    this.cache.set(key, {
      services,
      timestamp: Date.now(),
      ttl: this.config.cacheTimeout,
      criteria
    });
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.updateHealthScores();
    }, this.config.healthCheckInterval);
  }

  private async updateHealthScores(): Promise<void> {
    const allServices = this.registry.getAllServices();
    
    for (const service of allServices) {
      if (service.status !== ServiceStatus.ACTIVE) {
        continue;
      }

      try {
        const score = await this.calculateHealthScore(service);
        this.updateHealthScore(service.id, score);
      } catch (error) {
        this.emit('health-score-calculation-error', { serviceId: service.id, error });
      }
    }
  }

  private async calculateHealthScore(service: ServiceRegistration): Promise<ServiceHealthScore> {
    const now = Date.now();
    
    // Base score from service health
    let score = service.health.status === 'healthy' ? 0.8 : 0.2;
    
    // Factor in response time
    const responseTime = service.health.responseTime;
    const responsivenessFactor = Math.max(0, 1 - (responseTime / 1000)); // Normalize to 0-1
    score = score * 0.3 + responsivenessFactor * 0.3;
    
    // Factor in error rate
    const errorRate = service.health.errorRate;
    const reliabilityFactor = Math.max(0, 1 - errorRate);
    score = score * 0.4 + reliabilityFactor * 0.2;
    
    // Factor in uptime
    const uptime = service.health.uptime;
    const maxUptime = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const availabilityFactor = Math.min(1, uptime / maxUptime);
    score = score * 0.5 + availabilityFactor * 0.2;
    
    return {
      serviceId: service.id,
      score: Math.min(1, Math.max(0, score)),
      responseTime,
      errorRate,
      uptime,
      lastCheck: now,
      factors: {
        responsiveness: responsivenessFactor,
        reliability: reliabilityFactor,
        availability: availabilityFactor,
        performance: score
      }
    };
  }
}

/**
 * Default discovery instance
 */
export const defaultServiceDiscovery = new MCPServiceDiscovery(null); // Will be initialized with registry