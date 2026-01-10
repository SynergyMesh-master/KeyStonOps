/**
 * MCP Resource Manager
 * 
 * Comprehensive resource management system with real-time monitoring,
 * dynamic allocation, and intelligent optimization for MCP tools.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Resource Type
 */
export enum ResourceType {
  CPU = 'cpu',
  MEMORY = 'memory',
  DISK = 'disk',
  NETWORK = 'network',
  GPU = 'gpu',
  CUSTOM = 'custom'
}

/**
 * Resource Status
 */
export enum ResourceStatus {
  AVAILABLE = 'available',
  ALLOCATED = 'allocated',
  RESERVED = 'reserved',
  BUSY = 'busy',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

/**
 * Resource Priority
 */
export enum ResourcePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Resource Allocation
 */
export interface ResourceAllocation {
  id: string;
  resourceId: string;
  toolId: string;
  executionId: string;
  type: ResourceType;
  amount: number;
  priority: ResourcePriority;
  allocatedAt: number;
  expiresAt?: number;
  metadata: Record<string, any>;
}

/**
 * Resource Definition
 */
export interface ResourceDefinition {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  available: number;
  reserved: number;
  status: ResourceStatus;
  location?: string;
  metadata: Record<string, any>;
  constraints: ResourceConstraints;
  cost?: ResourceCost;
}

/**
 * Resource Constraints
 */
export interface ResourceConstraints {
  minAllocation: number;
  maxAllocation: number;
  allocationStep: number;
  exclusive: boolean;
  preallocatable: boolean;
  shareable: boolean;
}

/**
 * Resource Cost
 */
export interface ResourceCost {
  perUnit: number;
  currency: string;
  billingPeriod: 'second' | 'minute' | 'hour' | 'day';
  freeTier?: number;
}

/**
 * Resource Request
 */
export interface ResourceRequest {
  toolId: string;
  executionId: string;
  type: ResourceType;
  amount: number;
  priority: ResourcePriority;
  duration?: number;
  constraints?: Partial<ResourceConstraints>;
  metadata?: Record<string, any>;
}

/**
 * Resource Statistics
 */
export interface ResourceStatistics {
  totalResources: number;
  availableResources: number;
  allocatedResources: number;
  reservedResources: number;
  utilizationRate: number;
  allocationRate: number;
  averageAllocationTime: number;
  totalAllocations: number;
  failedAllocations: number;
  costTotal: number;
}

/**
 * Resource Event
 */
export interface ResourceEvent {
  id: string;
  type: 'allocated' | 'released' | 'reserved' | 'error';
  resourceId: string;
  allocationId?: string;
  toolId?: string;
  timestamp: number;
  metadata: Record<string, any>;
}

/**
 * Resource Manager Configuration
 */
export interface ResourceManagerConfig {
  enableMonitoring: boolean;
  enableAutoScaling: boolean;
  enableCostTracking: boolean;
  monitoringInterval: number;
  allocationTimeout: number;
  maxAllocationAttempts: number;
  enableReservation: boolean;
  reservationTimeout: number;
  enablePreallocation: boolean;
  preallocationThreshold: number;
}

/**
 * MCP Resource Manager
 */
export class MCPResourceManager extends EventEmitter {
  private config: ResourceManagerConfig;
  private resources: Map<string, ResourceDefinition> = new Map();
  private allocations: Map<string, ResourceAllocation> = new Map();
  private reservations: Map<string, ResourceAllocation> = new Map();
  private statistics: ResourceStatistics;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private allocationQueue: ResourceRequest[] = [];

  constructor(config?: Partial<ResourceManagerConfig>) {
    super();
    
    this.config = {
      enableMonitoring: true,
      enableAutoScaling: true,
      enableCostTracking: true,
      monitoringInterval: 5000, // 5 seconds
      allocationTimeout: 30000, // 30 seconds
      maxAllocationAttempts: 3,
      enableReservation: true,
      reservationTimeout: 60000, // 1 minute
      enablePreallocation: true,
      preallocationThreshold: 0.8,
      ...config
    };

    this.initializeStatistics();
    this.startMonitoring();
  }

  /**
   * Register a resource
   */
  public async registerResource(resource: ResourceDefinition): Promise<void> {
    try {
      // Validate resource definition
      this.validateResourceDefinition(resource);

      // Check for duplicates
      if (this.resources.has(resource.id)) {
        throw new Error(`Resource already registered: ${resource.id}`);
      }

      // Add to registry
      this.resources.set(resource.id, resource);

      // Update statistics
      this.updateStatistics();

      this.emit('resource-registered', { resourceId: resource.id, resource });

    } catch (error) {
      this.emit('resource-registration-error', { resource, error });
      throw error;
    }
  }

  /**
   * Unregister a resource
   */
  public async unregisterResource(resourceId: string): Promise<void> {
    try {
      const resource = this.resources.get(resourceId);
      
      if (!resource) {
        throw new Error(`Resource not found: ${resourceId}`);
      }

      // Check if resource is allocated
      const activeAllocations = Array.from(this.allocations.values())
        .filter(a => a.resourceId === resourceId);

      if (activeAllocations.length > 0) {
        throw new Error(`Cannot unregister resource with active allocations: ${resourceId}`);
      }

      // Remove from registry
      this.resources.delete(resourceId);

      // Update statistics
      this.updateStatistics();

      this.emit('resource-unregistered', { resourceId });

    } catch (error) {
      this.emit('resource-unregistration-error', { resourceId, error });
      throw error;
    }
  }

  /**
   * Allocate resources
   */
  public async allocateResource(request: ResourceRequest): Promise<ResourceAllocation> {
    const startTime = Date.now();
    let attempts = 0;

    while (attempts < this.config.maxAllocationAttempts) {
      attempts++;

      try {
        // Find suitable resource
        const resource = this.findSuitableResource(request);
        
        if (!resource) {
          if (this.config.enableReservation) {
            // Add to reservation queue
            return this.reserveResource(request);
          } else {
            throw new Error('No suitable resource available');
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

        // Update resource availability
        resource.available -= request.amount;
        resource.status = resource.available > 0 ? ResourceStatus.ALLOCATED : ResourceStatus.BUSY;

        // Store allocation
        this.allocations.set(allocation.id, allocation);

        // Update statistics
        this.statistics.totalAllocations++;
        this.statistics.averageAllocationTime = 
          (this.statistics.averageAllocationTime + (Date.now() - startTime)) / 2;

        this.updateStatistics();

        this.emit('resource-allocated', { allocation });

        return allocation;

      } catch (error) {
        if (attempts >= this.config.maxAllocationAttempts) {
          this.statistics.failedAllocations++;
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    throw new Error('Failed to allocate resource after maximum attempts');
  }

  /**
   * Release resource allocation
   */
  public async releaseResource(allocationId: string): Promise<void> {
    try {
      const allocation = this.allocations.get(allocationId);
      
      if (!allocation) {
        throw new Error(`Allocation not found: ${allocationId}`);
      }

      const resource = this.resources.get(allocation.resourceId);
      
      if (!resource) {
        throw new Error(`Resource not found: ${allocation.resourceId}`);
      }

      // Update resource availability
      resource.available += allocation.amount;
      
      if (resource.available === resource.capacity) {
        resource.status = ResourceStatus.AVAILABLE;
      } else if (resource.available > 0) {
        resource.status = ResourceStatus.ALLOCATED;
      }

      // Remove allocation
      this.allocations.delete(allocationId);

      // Update statistics
      this.updateStatistics();

      this.emit('resource-released', { allocation });

      // Process any pending reservations
      this.processPendingReservations();

    } catch (error) {
      this.emit('resource-release-error', { allocationId, error });
      throw error;
    }
  }

  /**
   * Reserve resource
   */
  public async reserveResource(request: ResourceRequest): Promise<ResourceAllocation> {
    const reservation: ResourceAllocation = {
      id: uuidv4(),
      resourceId: '', // Will be filled when resource becomes available
      toolId: request.toolId,
      executionId: request.executionId,
      type: request.type,
      amount: request.amount,
      priority: request.priority,
      allocatedAt: Date.now(),
      expiresAt: Date.now() + this.config.reservationTimeout,
      metadata: request.metadata || {}
    };

    this.reservations.set(reservation.id, reservation);
    
    // Add to allocation queue
    this.allocationQueue.push(request);

    this.emit('resource-reserved', { reservation });

    return reservation;
  }

  /**
   * Get resource statistics
   */
  public getStatistics(): ResourceStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Get resource by ID
   */
  public getResource(resourceId: string): ResourceDefinition | undefined {
    return this.resources.get(resourceId);
  }

  /**
   * Get all resources
   */
  public getAllResources(): ResourceDefinition[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get resources by type
   */
  public getResourcesByType(type: ResourceType): ResourceDefinition[] {
    return Array.from(this.resources.values()).filter(r => r.type === type);
  }

  /**
   * Get allocations by tool
   */
  public getAllocationsByTool(toolId: string): ResourceAllocation[] {
    return Array.from(this.allocations.values()).filter(a => a.toolId === toolId);
  }

  /**
   * Get allocations by execution
   */
  public getAllocationsByExecution(executionId: string): ResourceAllocation[] {
    return Array.from(this.allocations.values()).filter(a => a.executionId === executionId);
  }

  /**
   * Force cleanup expired allocations
   */
  public async cleanupExpiredAllocations(): Promise<void> {
    const now = Date.now();
    const expiredAllocations: string[] = [];

    for (const [id, allocation] of this.allocations.entries()) {
      if (allocation.expiresAt && allocation.expiresAt < now) {
        expiredAllocations.push(id);
      }
    }

    for (const allocationId of expiredAllocations) {
      try {
        await this.releaseResource(allocationId);
      } catch (error) {
        this.emit('cleanup-error', { allocationId, error });
      }
    }

    this.emit('cleanup-completed', { cleanedAllocations: expiredAllocations.length });
  }

  /**
   * Destroy resource manager
   */
  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.resources.clear();
    this.allocations.clear();
    this.reservations.clear();
    this.allocationQueue.length = 0;

    this.emit('destroyed');
  }

  // Private methods

  private initializeStatistics(): void {
    this.statistics = {
      totalResources: 0,
      availableResources: 0,
      allocatedResources: 0,
      reservedResources: 0,
      utilizationRate: 0,
      allocationRate: 0,
      averageAllocationTime: 0,
      totalAllocations: 0,
      failedAllocations: 0,
      costTotal: 0
    };
  }

  private startMonitoring(): void {
    if (this.config.enableMonitoring) {
      this.monitoringInterval = setInterval(() => {
        this.performMonitoring();
      }, this.config.monitoringInterval);
    }
  }

  private performMonitoring(): void {
    try {
      this.updateStatistics();
      this.checkResourceHealth();
      this.processPendingReservations();
      
      if (this.config.enableAutoScaling) {
        this.performAutoScaling();
      }

      this.emit('monitoring-completed', this.statistics);

    } catch (error) {
      this.emit('monitoring-error', error);
    }
  }

  private updateStatistics(): void {
    const resources = Array.from(this.resources.values());
    const allocations = Array.from(this.allocations.values());
    const reservations = Array.from(this.reservations.values());

    this.statistics.totalResources = resources.length;
    this.statistics.availableResources = resources.reduce((sum, r) => sum + r.available, 0);
    this.statistics.allocatedResources = allocations.reduce((sum, a) => sum + a.amount, 0);
    this.statistics.reservedResources = reservations.reduce((sum, r) => sum + r.amount, 0);

    const totalCapacity = resources.reduce((sum, r) => sum + r.capacity, 0);
    this.statistics.utilizationRate = totalCapacity > 0 ? 
      (this.statistics.allocatedResources / totalCapacity) * 100 : 0;

    this.statistics.allocationRate = this.statistics.totalAllocations > 0 ?
      (this.statistics.totalAllocations / (Date.now() / 1000)) : 0;
  }

  private validateResourceDefinition(resource: ResourceDefinition): void {
    if (!resource.id || resource.id.trim().length === 0) {
      throw new Error('Resource ID is required');
    }

    if (!resource.name || resource.name.trim().length === 0) {
      throw new Error('Resource name is required');
    }

    if (resource.capacity <= 0) {
      throw new Error('Resource capacity must be positive');
    }

    if (resource.available < 0 || resource.available > resource.capacity) {
      throw new Error('Resource availability must be between 0 and capacity');
    }

    if (resource.reserved < 0 || resource.reserved > resource.capacity) {
      throw new Error('Resource reservation must be between 0 and capacity');
    }
  }

  private findSuitableResource(request: ResourceRequest): ResourceDefinition | null {
    const candidates = Array.from(this.resources.values())
      .filter(resource => 
        resource.type === request.type &&
        resource.status !== ResourceStatus.ERROR &&
        resource.status !== ResourceStatus.MAINTENANCE &&
        resource.available >= request.amount &&
        resource.available >= resource.constraints.minAllocation &&
        request.amount <= resource.constraints.maxAllocation
      )
      .sort((a, b) => {
        // Prefer resources with better availability
        const aUtilization = (a.capacity - a.available) / a.capacity;
        const bUtilization = (b.capacity - b.available) / b.capacity;
        return aUtilization - bUtilization;
      });

    return candidates.length > 0 ? candidates[0] : null;
  }

  private processPendingReservations(): void {
    // Process allocation queue
    while (this.allocationQueue.length > 0) {
      const request = this.allocationQueue.shift()!;
      
      try {
        const resource = this.findSuitableResource(request);
        
        if (resource) {
          // Create allocation for reserved request
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

          resource.available -= request.amount;
          this.allocations.set(allocation.id, allocation);

          this.emit('reservation-fulfilled', { allocation });
        } else {
          // Put back in queue if no suitable resource
          this.allocationQueue.unshift(request);
          break;
        }
      } catch (error) {
        this.emit('reservation-processing-error', { request, error });
      }
    }
  }

  private checkResourceHealth(): void {
    for (const resource of this.resources.values()) {
      // Basic health checks
      if (resource.available < 0) {
        resource.status = ResourceStatus.ERROR;
        this.emit('resource-error', { resourceId: resource.id, error: 'Negative availability' });
      }

      if (resource.allocated > resource.capacity) {
        resource.status = ResourceStatus.ERROR;
        this.emit('resource-error', { resourceId: resource.id, error: 'Over-allocation' });
      }
    }
  }

  private performAutoScaling(): void {
    // Auto-scaling logic would go here
    // This could involve creating new resources or adjusting capacity
    // based on utilization patterns
  }
}