/**
 * MCP Resource Pool
 * 
 * Dynamic resource pooling with intelligent allocation, load balancing,
 * and automatic scaling for MCP resources.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ResourceDefinition,
  ResourceAllocation,
  ResourceType,
  ResourceStatus,
  ResourcePriority,
  ResourceRequest
} from './resource-manager';

/**
 * Pool Strategy
 */
export enum PoolStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_LOADED = 'least_loaded',
  BEST_FIT = 'best_fit',
  LOCALITY_AWARE = 'locality_aware',
  COST_OPTIMIZED = 'cost_optimized'
}

/**
 * Pool Status
 */
export enum PoolStatus {
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  SCALING = 'scaling',
  DRAINING = 'draining',
  ERROR = 'error'
}

/**
 * Pooled Resource
 */
export interface PooledResource {
  id: string;
  definition: ResourceDefinition;
  status: ResourceStatus;
  allocatedTo: string[]; // List of allocation IDs
  loadFactor: number; // Current load (0-1)
  lastUsed: number;
  healthScore: number;
  costScore: number;
  metadata: Record<string, any>;
}

/**
 * Pool Configuration
 */
export interface PoolConfiguration {
  strategy: PoolStrategy;
  minSize: number;
  maxSize: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
  healthCheckInterval: number;
  enableAutoScaling: boolean;
  enableLoadBalancing: boolean;
  enableCostOptimization: boolean;
}

/**
 * Pool Statistics
 */
export interface PoolStatistics {
  totalResources: number;
  activeResources: number;
  allocatedResources: number;
  utilizationRate: number;
  averageLoadFactor: number;
  totalAllocations: number;
  failedAllocations: number;
  scaleUpEvents: number;
  scaleDownEvents: number;
  costSavings: number;
}

/**
 * Scaling Event
 */
export interface ScalingEvent {
  id: string;
  type: 'scale_up' | 'scale_down';
  reason: string;
  resourceCount: number;
  targetSize: number;
  timestamp: number;
  duration: number;
  cost: number;
}

/**
 * MCP Resource Pool
 */
export class MCPResourcePool extends EventEmitter {
  private config: PoolConfiguration;
  private resources: Map<string, PooledResource> = new Map();
  private allocations: Map<string, ResourceAllocation> = new Map();
  private status: PoolStatus = PoolStatus.INITIALIZING;
  private statistics: PoolStatistics;
  private scalingHistory: ScalingEvent[] = [];
  private lastScalingEvent: number = 0;
  private roundRobinIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private resourceType: ResourceType,
    private resourceFactory: () => Promise<ResourceDefinition>,
    config?: Partial<PoolConfiguration>
  ) {
    super();
    
    this.config = {
      strategy: PoolStrategy.LEAST_LOADED,
      minSize: 2,
      maxSize: 10,
      targetUtilization: 0.7,
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.3,
      cooldownPeriod: 300000, // 5 minutes
      healthCheckInterval: 30000, // 30 seconds
      enableAutoScaling: true,
      enableLoadBalancing: true,
      enableCostOptimization: false,
      ...config
    };

    this.initializeStatistics();
    this.initializePool();
  }

  /**
   * Allocate resource from pool
   */
  public async allocate(request: ResourceRequest): Promise<ResourceAllocation> {
    try {
      if (this.status !== PoolStatus.ACTIVE) {
        throw new Error(`Pool is not active (status: ${this.status})`);
      }

      // Find suitable resource using configured strategy
      const resource = this.selectResource(request);
      
      if (!resource) {
        // Try to scale up if enabled
        if (this.config.enableAutoScaling) {
          await this.scaleUp('allocation_failure');
          const newResource = this.selectResource(request);
          if (!newResource) {
            throw new Error('No suitable resource available after scaling');
          }
          resource = newResource;
        } else {
          throw new Error('No suitable resource available in pool');
        }
      }

      // Create allocation
      const allocation: ResourceAllocation = {
        id: uuidv4(),
        resourceId: resource.id,
        toolId: request.toolId,
        executionId: request.executionId,
        type: request.type,
        amount: request.amount,
        priority: request.priority,
        allocatedAt: Date.now(),
        expiresAt: request.duration ? Date.now() + request.duration : undefined,
        metadata: request.metadata || {}
      };

      // Update resource state
      resource.allocatedTo.push(allocation.id);
      resource.status = ResourceStatus.ALLOCATED;
      resource.lastUsed = Date.now();
      this.updateResourceLoad(resource);

      // Store allocation
      this.allocations.set(allocation.id, allocation);

      // Update statistics
      this.statistics.totalAllocations++;
      this.updateStatistics();

      this.emit('resource-allocated', { allocation, resource });

      return allocation;

    } catch (error) {
      this.statistics.failedAllocations++;
      this.emit('allocation-failed', { request, error });
      throw error;
    }
  }

  /**
   * Release resource back to pool
   */
  public async release(allocationId: string): Promise<void> {
    try {
      const allocation = this.allocations.get(allocationId);
      
      if (!allocation) {
        throw new Error(`Allocation not found: ${allocationId}`);
      }

      const resource = this.resources.get(allocation.resourceId);
      
      if (!resource) {
        throw new Error(`Resource not found: ${allocation.resourceId}`);
      }

      // Update resource state
      const allocationIndex = resource.allocatedTo.indexOf(allocationId);
      if (allocationIndex > -1) {
        resource.allocatedTo.splice(allocationIndex, 1);
      }

      if (resource.allocatedTo.length === 0) {
        resource.status = ResourceStatus.AVAILABLE;
      }

      this.updateResourceLoad(resource);

      // Remove allocation
      this.allocations.delete(allocationId);

      // Update statistics
      this.updateStatistics();

      // Check if we should scale down
      if (this.config.enableAutoScaling) {
        this.checkScaleDown();
      }

      this.emit('resource-released', { allocation, resource });

    } catch (error) {
      this.emit('release-failed', { allocationId, error });
      throw error;
    }
  }

  /**
   * Get pool status
   */
  public getStatus(): PoolStatus {
    return this.status;
  }

  /**
   * Get pool statistics
   */
  public getStatistics(): PoolStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Get all pooled resources
   */
  public getResources(): PooledResource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get available resources
   */
  public getAvailableResources(): PooledResource[] {
    return Array.from(this.resources.values()).filter(r => 
      r.status === ResourceStatus.AVAILABLE || 
      (r.status === ResourceStatus.ALLOCATED && r.loadFactor < 0.8)
    );
  }

  /**
   * Scale up pool
   */
  public async scaleUp(reason?: string): Promise<void> {
    if (this.status === PoolStatus.SCALING) {
      return; // Already scaling
    }

    if (this.resources.size >= this.config.maxSize) {
      return; // At max size
    }

    const now = Date.now();
    if (now - this.lastScalingEvent < this.config.cooldownPeriod) {
      return; // In cooldown period
    }

    this.status = PoolStatus.SCALING;
    const startTime = Date.now();

    try {
      const scaleUpCount = Math.min(
        Math.ceil(this.resources.size * 0.5),
        this.config.maxSize - this.resources.size
      );

      const newResources: PooledResource[] = [];

      for (let i = 0; i < scaleUpCount; i++) {
        try {
          const definition = await this.resourceFactory();
          const pooledResource: PooledResource = {
            id: definition.id,
            definition,
            status: ResourceStatus.AVAILABLE,
            allocatedTo: [],
            loadFactor: 0,
            lastUsed: Date.now(),
            healthScore: 100,
            costScore: this.calculateCostScore(definition),
            metadata: {}
          };

          this.resources.set(pooledResource.id, pooledResource);
          newResources.push(pooledResource);
        } catch (error) {
          this.emit('resource-creation-failed', error);
        }
      }

      // Record scaling event
      const scalingEvent: ScalingEvent = {
        id: uuidv4(),
        type: 'scale_up',
        reason: reason || 'manual',
        resourceCount: newResources.length,
        targetSize: this.resources.size,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        cost: newResources.reduce((sum, r) => sum + (r.definition.cost?.perUnit || 0), 0)
      };

      this.scalingHistory.push(scalingEvent);
      this.lastScalingEvent = Date.now();
      this.statistics.scaleUpEvents++;

      this.status = PoolStatus.ACTIVE;
      this.updateStatistics();

      this.emit('scaled-up', { event: scalingEvent, resources: newResources });

    } catch (error) {
      this.status = PoolStatus.ERROR;
      this.emit('scaling-failed', { type: 'scale_up', error });
      throw error;
    }
  }

  /**
   * Scale down pool
   */
  public async scaleDown(reason?: string): Promise<void> {
    if (this.status === PoolStatus.SCALING) {
      return; // Already scaling
    }

    if (this.resources.size <= this.config.minSize) {
      return; // At min size
    }

    const now = Date.now();
    if (now - this.lastScalingEvent < this.config.cooldownPeriod) {
      return; // In cooldown period
    }

    this.status = PoolStatus.SCALING;
    const startTime = Date.now();

    try {
      // Find resources that can be removed (idle or low utilization)
      const candidates = Array.from(this.resources.values())
        .filter(r => 
          r.status === ResourceStatus.AVAILABLE && 
          r.allocatedTo.length === 0 &&
          (Date.now() - r.lastUsed) > 300000 // 5 minutes idle
        )
        .sort((a, b) => a.costScore - b.costScore) // Remove most expensive first
        .slice(0, Math.max(1, Math.floor(this.resources.size * 0.25)));

      const removedResources: PooledResource[] = [];

      for (const resource of candidates) {
        if (this.resources.size <= this.config.minSize) {
          break;
        }

        // Remove from pool
        this.resources.delete(resource.id);
        removedResources.push(resource);
      }

      // Record scaling event
      const scalingEvent: ScalingEvent = {
        id: uuidv4(),
        type: 'scale_down',
        reason: reason || 'manual',
        resourceCount: removedResources.length,
        targetSize: this.resources.size,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        cost: -removedResources.reduce((sum, r) => sum + (r.definition.cost?.perUnit || 0), 0)
      };

      this.scalingHistory.push(scalingEvent);
      this.lastScalingEvent = Date.now();
      this.statistics.scaleDownEvents++;

      this.status = PoolStatus.ACTIVE;
      this.updateStatistics();

      this.emit('scaled-down', { event: scalingEvent, resources: removedResources });

    } catch (error) {
      this.status = PoolStatus.ERROR;
      this.emit('scaling-failed', { type: 'scale_down', error });
      throw error;
    }
  }

  /**
   * Drain pool (stop new allocations)
   */
  public async drain(): Promise<void> {
    this.status = PoolStatus.DRAINING;
    this.emit('pool-drained');
  }

  /**
   * Destroy pool
   */
  public async destroy(): Promise<void {
    this.status = PoolStatus.ERROR;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Wait for all allocations to be released
    const releasePromises: Promise<void>[] = [];
    
    for (const allocationId of this.allocations.keys()) {
      releasePromises.push(this.release(allocationId));
    }

    await Promise.allSettled(releasePromises);

    this.resources.clear();
    this.allocations.clear();
    this.scalingHistory.length = 0;

    this.emit('destroyed');
  }

  // Private methods

  private async initializePool(): Promise<void> {
    try {
      // Create minimum number of resources
      const initPromises: Promise<void>[] = [];
      
      for (let i = 0; i < this.config.minSize; i++) {
        initPromises.push(this.createAndAddResource());
      }

      await Promise.allSettled(initPromises);

      this.status = PoolStatus.ACTIVE;
      this.startHealthChecks();

      this.emit('pool-initialized');

    } catch (error) {
      this.status = PoolStatus.ERROR;
      this.emit('pool-initialization-failed', error);
      throw error;
    }
  }

  private async createAndAddResource(): Promise<void> {
    try {
      const definition = await this.resourceFactory();
      
      const pooledResource: PooledResource = {
        id: definition.id,
        definition,
        status: ResourceStatus.AVAILABLE,
        allocatedTo: [],
        loadFactor: 0,
        lastUsed: Date.now(),
        healthScore: 100,
        costScore: this.calculateCostScore(definition),
        metadata: {}
      };

      this.resources.set(pooledResource.id, pooledResource);

    } catch (error) {
      this.emit('resource-creation-failed', error);
    }
  }

  private selectResource(request: ResourceRequest): PooledResource | null {
    const candidates = this.getAvailableResources();
    
    if (candidates.length === 0) {
      return null;
    }

    switch (this.config.strategy) {
      case PoolStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(candidates);
      case PoolStrategy.LEAST_LOADED:
        return this.selectLeastLoaded(candidates);
      case PoolStrategy.BEST_FIT:
        return this.selectBestFit(candidates, request);
      case PoolStrategy.LOCALITY_AWARE:
        return this.selectLocalityAware(candidates, request);
      case PoolStrategy.COST_OPTIMIZED:
        return this.selectCostOptimized(candidates);
      default:
        return candidates[0];
    }
  }

  private selectRoundRobin(candidates: PooledResource[]): PooledResource {
    const resource = candidates[this.roundRobinIndex % candidates.length];
    this.roundRobinIndex++;
    return resource;
  }

  private selectLeastLoaded(candidates: PooledResource[]): PooledResource {
    return candidates.reduce((best, current) => 
      current.loadFactor < best.loadFactor ? current : best
    );
  }

  private selectBestFit(candidates: PooledResource[], request: ResourceRequest): PooledResource {
    return candidates.reduce((best, current) => {
      const currentFit = this.calculateFitScore(current, request);
      const bestFit = this.calculateFitScore(best, request);
      return currentFit > bestFit ? current : best;
    });
  }

  private selectLocalityAware(candidates: PooledResource[], request: ResourceRequest): PooledResource {
    // Simple locality-based selection based on metadata
    const requestLocation = request.metadata?.location;
    
    if (requestLocation) {
      const localResource = candidates.find(r => 
        r.definition.location === requestLocation
      );
      
      if (localResource) {
        return localResource;
      }
    }

    return this.selectLeastLoaded(candidates);
  }

  private selectCostOptimized(candidates: PooledResource[]): PooledResource {
    return candidates.reduce((best, current) => 
      current.costScore < best.costScore ? current : best
    );
  }

  private calculateFitScore(resource: PooledResource, request: ResourceRequest): number {
    let score = 100;

    // Penalize based on current load
    score -= resource.loadFactor * 50;

    // Penalize based on allocated count
    score -= resource.allocatedTo.length * 5;

    // Reward based on available capacity
    const availableCapacity = resource.definition.available;
    score += (availableCapacity / resource.definition.capacity) * 20;

    return Math.max(0, score);
  }

  private calculateCostScore(resource: ResourceDefinition): number {
    return resource.cost?.perUnit || 0;
  }

  private updateResourceLoad(resource: PooledResource): void {
    const allocatedAmount = resource.allocatedTo.length;
    const totalCapacity = resource.definition.capacity;
    resource.loadFactor = totalCapacity > 0 ? allocatedAmount / totalCapacity : 0;
  }

  private updateStatistics(): void {
    const resources = Array.from(this.resources.values());
    const allocatedResources = resources.filter(r => r.status === ResourceStatus.ALLOCATED);
    const totalCapacity = resources.reduce((sum, r) => sum + r.definition.capacity, 0);
    const allocatedCapacity = allocatedResources.reduce((sum, r) => sum + r.allocatedTo.length, 0);

    this.statistics.totalResources = resources.length;
    this.statistics.activeResources = resources.filter(r => 
      r.status !== ResourceStatus.ERROR && r.status !== ResourceStatus.MAINTENANCE
    ).length;
    this.statistics.allocatedResources = allocatedResources.length;
    this.statistics.utilizationRate = totalCapacity > 0 ? 
      (allocatedCapacity / totalCapacity) * 100 : 0;
    this.statistics.averageLoadFactor = resources.length > 0 ?
      resources.reduce((sum, r) => sum + r.loadFactor, 0) / resources.length : 0;
  }

  private checkScaleDown(): void {
    if (!this.config.enableAutoScaling) {
      return;
    }

    const now = Date.now();
    if (now - this.lastScalingEvent < this.config.cooldownPeriod) {
      return;
    }

    if (this.statistics.utilizationRate < this.config.scaleDownThreshold * 100) {
      this.scaleDown('low_utilization').catch(error => {
        this.emit('scale-down-failed', error);
      });
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private performHealthChecks(): void {
    for (const resource of this.resources.values()) {
      // Simple health check based on recent activity
      const timeSinceLastUse = Date.now() - resource.lastUsed;
      
      if (timeSinceLastUse > 600000) { // 10 minutes
        resource.healthScore = Math.max(0, resource.healthScore - 5);
      } else if (resource.loadFactor > 0.9) {
        resource.healthScore = Math.max(0, resource.healthScore - 10);
      } else {
        resource.healthScore = Math.min(100, resource.healthScore + 1);
      }

      // Update resource status based on health
      if (resource.healthScore < 30) {
        resource.status = ResourceStatus.ERROR;
        this.emit('resource-unhealthy', { resource });
      } else if (resource.healthScore < 60) {
        resource.status = ResourceStatus.MAINTENANCE;
      }
    }
  }

  private initializeStatistics(): void {
    this.statistics = {
      totalResources: 0,
      activeResources: 0,
      allocatedResources: 0,
      utilizationRate: 0,
      averageLoadFactor: 0,
      totalAllocations: 0,
      failedAllocations: 0,
      scaleUpEvents: 0,
      scaleDownEvents: 0,
      costSavings: 0
    };
  }
}