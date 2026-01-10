/**
 * MCP Service Lifecycle Management
 * 
 * Comprehensive lifecycle management for MCP services with automated
 * deployment, scaling, monitoring, and graceful shutdown.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { ServiceRegistration, ServiceType, ServiceStatus } from './registry-core';

/**
 * Lifecycle Phase
 */
export enum LifecyclePhase {
  INITIALIZING = 'initializing',
  STARTING = 'starting',
  RUNNING = 'running',
  SCALING = 'scaling',
  UPDATING = 'updating',
  STOPPING = 'stopping',
  TERMINATING = 'terminating',
  ERROR = 'error'
}

/**
 * Lifecycle Action
 */
export interface LifecycleAction {
  id: string;
  phase: LifecyclePhase;
  action: 'start' | 'stop' | 'restart' | 'scale' | 'update' | 'terminate';
  targetService: string;
  parameters: Record<string, any>;
  scheduledAt: number;
  timeout: number;
  retries: number;
  dependencies: string[];
}

/**
 * Lifecycle Event
 */
export interface LifecycleEvent {
  id: string;
  serviceId: string;
  phase: LifecyclePhase;
  previousPhase: LifecyclePhase;
  timestamp: number;
  metadata: Record<string, any>;
  error?: string;
}

/**
 * Scaling Configuration
 */
export interface ScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCPUUtilization: number;
  targetMemoryUtilization: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  scaleUpIncrement: number;
  scaleDownIncrement: number;
  enableAutoScaling: boolean;
}

/**
 * Update Strategy
 */
export enum UpdateStrategy {
  ROLLING = 'rolling',
  BLUE_GREEN = 'blue_green',
  CANARY = 'canary',
  RECREATE = 'recreate'
}

/**
 * Update Configuration
 */
export interface UpdateConfig {
  strategy: UpdateStrategy;
  maxUnavailable: number;
  maxSurge: number;
  rolloutDuration: number;
  healthCheckDelay: number;
  healthCheckPeriod: number;
  healthCheckThreshold: number;
  rollbackOnFailure: boolean;
  rollbackDelay: number;
}

/**
 * Lifecycle Configuration
 */
export interface LifecycleConfig {
  defaultTimeout: number;
  healthCheckInterval: number;
  scalingCheckInterval: number;
  updateCheckInterval: number;
  enableAutoScaling: boolean;
  enableAutoHealing: boolean;
  enableAutoUpdate: boolean;
  maxRetries: number;
  retryDelay: number;
  gracePeriod: number;
}

/**
 * Service Instance
 */
export interface ServiceInstance {
  id: string;
  serviceId: string;
  status: ServiceStatus;
  phase: LifecyclePhase;
  endpoint: string;
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck: number;
  uptime: number;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
  metadata: Record<string, any>;
}

/**
 * MCP Lifecycle Manager
 */
export class MCPLifecycleManager extends EventEmitter {
  private config: LifecycleConfig;
  private services: Map<string, ServiceRegistration> = new Map();
  private instances: Map<string, ServiceInstance[]> = new Map();
  private actions: Map<string, LifecycleAction> = new Map();
  private events: LifecycleEvent[] = [];
  private scalingConfigs: Map<string, ScalingConfig> = new Map();
  private updateConfigs: Map<string, UpdateConfig> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private scalingInterval: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(config?: Partial<LifecycleConfig>) {
    super();
    
    this.config = {
      defaultTimeout: 300000, // 5 minutes
      healthCheckInterval: 30000, // 30 seconds
      scalingCheckInterval: 60000, // 1 minute
      updateCheckInterval: 300000, // 5 minutes
      enableAutoScaling: true,
      enableAutoHealing: true,
      enableAutoUpdate: false,
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      gracePeriod: 30000, // 30 seconds
      ...config
    };

    this.startMonitoring();
  }

  /**
   * Register a service for lifecycle management
   */
  public async registerService(
    service: ServiceRegistration,
    scalingConfig?: ScalingConfig,
    updateConfig?: UpdateConfig
  ): Promise<void> {
    this.services.set(service.id, service);
    
    if (scalingConfig) {
      this.scalingConfigs.set(service.id, scalingConfig);
    }
    
    if (updateConfig) {
      this.updateConfigs.set(service.id, updateConfig);
    }

    // Initialize instances
    await this.initializeServiceInstances(service);

    this.emit('service-registered', service);

    // Start service
    await this.startService(service.id);
  }

  /**
   * Start a service
   */
  public async startService(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const previousPhase = service.status as any;
    this.recordEvent(serviceId, LifecyclePhase.STARTING, previousPhase);

    try {
      // Create initial instances
      const scalingConfig = this.scalingConfigs.get(serviceId);
      const instanceCount = scalingConfig ? scalingConfig.minInstances : 1;

      await this.createInstances(serviceId, instanceCount);

      // Wait for instances to be ready
      await this.waitForInstancesReady(serviceId);

      // Update service status
      service.status = ServiceStatus.ACTIVE;

      this.recordEvent(serviceId, LifecyclePhase.RUNNING, LifecyclePhase.STARTING);
      this.emit('service-started', { serviceId, instanceCount });

    } catch (error) {
      this.recordEvent(serviceId, LifecyclePhase.ERROR, LifecyclePhase.STARTING, error.message);
      service.status = ServiceStatus.ERROR;
      this.emit('service-start-failed', { serviceId, error });
      throw error;
    }
  }

  /**
   * Stop a service
   */
  public async stopService(serviceId: string, graceful: boolean = true): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const previousPhase = service.status as any;
    this.recordEvent(serviceId, LifecyclePhase.STOPPING, previousPhase);

    try {
      if (graceful) {
        // Graceful shutdown with grace period
        await this.gracefulShutdown(serviceId);
      } else {
        // Immediate shutdown
        await this.immediateShutdown(serviceId);
      }

      service.status = ServiceStatus.INACTIVE;
      this.recordEvent(serviceId, LifecyclePhase.TERMINATING, LifecyclePhase.STOPPING);
      this.emit('service-stopped', { serviceId, graceful });

    } catch (error) {
      this.recordEvent(serviceId, LifecyclePhase.ERROR, LifecyclePhase.STOPPING, error.message);
      this.emit('service-stop-failed', { serviceId, error });
      throw error;
    }
  }

  /**
   * Restart a service
   */
  public async restartService(serviceId: string): Promise<void> {
    await this.stopService(serviceId, true);
    await this.startService(serviceId);
    this.emit('service-restarted', { serviceId });
  }

  /**
   * Scale a service
   */
  public async scaleService(serviceId: string, targetInstances: number): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const scalingConfig = this.scalingConfigs.get(serviceId);
    if (scalingConfig) {
      if (targetInstances < scalingConfig.minInstances || targetInstances > scalingConfig.maxInstances) {
        throw new Error(`Target instances ${targetInstances} is outside allowed range [${scalingConfig.minInstances}, ${scalingConfig.maxInstances}]`);
      }
    }

    const previousPhase = service.status as any;
    this.recordEvent(serviceId, LifecyclePhase.SCALING, previousPhase);

    try {
      const currentInstances = this.instances.get(serviceId) || [];
      const currentCount = currentInstances.length;

      if (targetInstances > currentCount) {
        // Scale up
        await this.scaleUp(serviceId, targetInstances - currentCount);
      } else if (targetInstances < currentCount) {
        // Scale down
        await this.scaleDown(serviceId, currentCount - targetInstances);
      }

      this.recordEvent(serviceId, LifecyclePhase.RUNNING, LifecyclePhase.SCALING);
      this.emit('service-scaled', { serviceId, fromInstances: currentCount, toInstances: targetInstances });

    } catch (error) {
      this.recordEvent(serviceId, LifecyclePhase.ERROR, LifecyclePhase.SCALING, error.message);
      this.emit('service-scale-failed', { serviceId, error });
      throw error;
    }
  }

  /**
   * Update a service
   */
  public async updateService(
    serviceId: string,
    newService: ServiceRegistration,
    strategy?: UpdateStrategy
  ): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const updateConfig = this.updateConfigs.get(serviceId);
    const updateStrategy = strategy || updateConfig?.strategy || UpdateStrategy.ROLLING;

    const previousPhase = service.status as any;
    this.recordEvent(serviceId, LifecyclePhase.UPDATING, previousPhase);

    try {
      switch (updateStrategy) {
        case UpdateStrategy.ROLLING:
          await this.rollingUpdate(serviceId, newService, updateConfig);
          break;
        case UpdateStrategy.BLUE_GREEN:
          await this.blueGreenUpdate(serviceId, newService, updateConfig);
          break;
        case UpdateStrategy.CANARY:
          await this.canaryUpdate(serviceId, newService, updateConfig);
          break;
        case UpdateStrategy.RECREATE:
          await this.recreateUpdate(serviceId, newService, updateConfig);
          break;
      }

      this.services.set(serviceId, newService);
      this.recordEvent(serviceId, LifecyclePhase.RUNNING, LifecyclePhase.UPDATING);
      this.emit('service-updated', { serviceId, strategy: updateStrategy });

    } catch (error) {
      this.recordEvent(serviceId, LifecyclePhase.ERROR, LifecyclePhase.UPDATING, error.message);
      this.emit('service-update-failed', { serviceId, error });
      
      // Rollback if enabled
      if (updateConfig?.rollbackOnFailure) {
        await this.rollbackService(serviceId, service, updateConfig);
      }
      
      throw error;
    }
  }

  /**
   * Get service instances
   */
  public getServiceInstances(serviceId: string): ServiceInstance[] {
    return this.instances.get(serviceId) || [];
  }

  /**
   * Get service status
   */
  public getServiceStatus(serviceId: string): {
    phase: LifecyclePhase;
    instanceCount: number;
    healthyInstances: number;
    uptime: number;
    lastEvent: LifecycleEvent | null;
  } {
    const instances = this.instances.get(serviceId) || [];
    const healthyInstances = instances.filter(i => i.health === 'healthy').length;
    const service = this.services.get(serviceId);
    
    const serviceEvents = this.events.filter(e => e.serviceId === serviceId);
    const lastEvent = serviceEvents.length > 0 ? serviceEvents[serviceEvents.length - 1] : null;

    return {
      phase: lastEvent?.phase || LifecyclePhase.INITIALIZING,
      instanceCount: instances.length,
      healthyInstances,
      uptime: service?.statistics?.registeredAt ? Date.now() - service.statistics.registeredAt : 0,
      lastEvent
    };
  }

  /**
   * Get lifecycle events
   */
  public getLifecycleEvents(serviceId?: string, limit?: number): LifecycleEvent[] {
    let events = this.events;
    
    if (serviceId) {
      events = events.filter(e => e.serviceId === serviceId);
    }

    events.sort((a, b) => b.timestamp - a.timestamp);

    if (limit) {
      events = events.slice(0, limit);
    }

    return events;
  }

  /**
   * Schedule lifecycle action
   */
  public scheduleAction(action: LifecycleAction): void {
    this.actions.set(action.id, action);
    this.emit('action-scheduled', action);
  }

  /**
   * Cancel scheduled action
   */
  public cancelAction(actionId: string): void {
    this.actions.delete(actionId);
    this.emit('action-cancelled', { actionId });
  }

  /**
   * Get scheduled actions
   */
  public getScheduledActions(): LifecycleAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Set scaling configuration
   */
  public setScalingConfig(serviceId: string, config: ScalingConfig): void {
    this.scalingConfigs.set(serviceId, config);
    this.emit('scaling-config-updated', { serviceId, config });
  }

  /**
   * Set update configuration
   */
  public setUpdateConfig(serviceId: string, config: UpdateConfig): void {
    this.updateConfigs.set(serviceId, config);
    this.emit('update-config-updated', { serviceId, config });
  }

  /**
   * Destroy lifecycle manager
   */
  public async destroy(): Promise<void> {
    // Stop monitoring intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
    }
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Stop all services
    const serviceIds = Array.from(this.services.keys());
    for (const serviceId of serviceIds) {
      try {
        await this.stopService(serviceId, true);
      } catch (error) {
        // Continue with other services
      }
    }

    // Clear data
    this.services.clear();
    this.instances.clear();
    this.actions.clear();
    this.events = [];
    this.scalingConfigs.clear();
    this.updateConfigs.clear();
    this.removeAllListeners();
  }

  // Private methods

  private startMonitoring(): void {
    // Health check monitoring
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);

    // Auto-scaling monitoring
    if (this.config.enableAutoScaling) {
      this.scalingInterval = setInterval(async () => {
        await this.checkAutoScaling();
      }, this.config.scalingCheckInterval);
    }

    // Auto-healing monitoring
    if (this.config.enableAutoHealing) {
      setInterval(async () => {
        await this.checkAutoHealing();
      }, this.config.healthCheckInterval);
    }
  }

  private async initializeServiceInstances(service: ServiceRegistration): Promise<void> {
    const instances: ServiceInstance[] = [];
    const scalingConfig = this.scalingConfigs.get(service.id);
    const instanceCount = scalingConfig ? scalingConfig.minInstances : 1;

    for (let i = 0; i < instanceCount; i++) {
      const instance = await this.createInstance(service);
      instances.push(instance);
    }

    this.instances.set(service.id, instances);
  }

  private async createInstance(service: ServiceRegistration): Promise<ServiceInstance> {
    const instance: ServiceInstance = {
      id: `${service.id}-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      serviceId: service.id,
      status: ServiceStatus.REGISTERING,
      phase: LifecyclePhase.INITIALIZING,
      endpoint: service.endpoints[0], // Use first endpoint
      health: 'unknown',
      lastHealthCheck: Date.now(),
      uptime: 0,
      resources: {
        cpu: 0,
        memory: 0,
        disk: 0
      },
      metadata: {}
    };

    return instance;
  }

  private async createInstances(serviceId: string, count: number): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      return;
    }

    const instances = this.instances.get(serviceId) || [];
    
    for (let i = 0; i < count; i++) {
      const instance = await this.createInstance(service);
      instances.push(instance);
    }

    this.instances.set(serviceId, instances);
  }

  private async waitForInstancesReady(serviceId: string): Promise<void> {
    const instances = this.instances.get(serviceId) || [];
    const startTime = Date.now();
    const timeout = this.config.defaultTimeout;

    while (Date.now() - startTime < timeout) {
      const allHealthy = instances.every(instance => instance.health === 'healthy');
      
      if (allHealthy) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Instances not ready within timeout period`);
  }

  private async performHealthChecks(): Promise<void> {
    for (const [serviceId, instances] of this.instances) {
      for (const instance of instances) {
        try {
          await this.checkInstanceHealth(instance);
        } catch (error) {
          this.emit('health-check-error', { instanceId: instance.id, error });
        }
      }
    }
  }

  private async checkInstanceHealth(instance: ServiceInstance): Promise<void> {
    try {
      // Simulate health check
      const response = await fetch(`${instance.endpoint}/health`, {
        method: 'GET',
        timeout: 5000
      });

      const wasHealthy = instance.health === 'healthy';
      instance.health = response.ok ? 'healthy' : 'unhealthy';
      instance.lastHealthCheck = Date.now();

      if (!wasHealthy && instance.health === 'healthy') {
        this.emit('instance-recovered', { instanceId: instance.id });
      } else if (wasHealthy && instance.health === 'unhealthy') {
        this.emit('instance-unhealthy', { instanceId: instance.id });
      }

    } catch (error) {
      instance.health = 'unhealthy';
      instance.lastHealthCheck = Date.now();
    }
  }

  private async gracefulShutdown(serviceId: string): Promise<void> {
    const instances = this.instances.get(serviceId) || [];
    
    // Signal instances to stop accepting new requests
    for (const instance of instances) {
      try {
        await fetch(`${instance.endpoint}/shutdown`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graceful: true })
        });
      } catch (error) {
        // Continue with other instances
      }
    }

    // Wait for grace period
    await new Promise(resolve => setTimeout(resolve, this.config.gracePeriod));

    // Terminate instances
    await this.terminateInstances(serviceId);
  }

  private async immediateShutdown(serviceId: string): Promise<void> {
    await this.terminateInstances(serviceId);
  }

  private async terminateInstances(serviceId: string): Promise<void> {
    this.instances.set(serviceId, []);
  }

  private async scaleUp(serviceId: string, increment: number): Promise<void> {
    await this.createInstances(serviceId, increment);
  }

  private async scaleDown(serviceId: string, decrement: number): Promise<void> {
    const instances = this.instances.get(serviceId) || [];
    const healthyInstances = instances.filter(i => i.health === 'healthy');
    
    // Remove healthy instances first
    const toRemove = healthyInstances.slice(0, decrement);
    const remaining = instances.filter(i => !toRemove.includes(i));
    
    this.instances.set(serviceId, remaining);
  }

  private async rollingUpdate(
    serviceId: string,
    newService: ServiceRegistration,
    config?: UpdateConfig
  ): Promise<void> {
    const instances = this.instances.get(serviceId) || [];
    const maxUnavailable = config?.maxUnavailable || 1;
    const maxSurge = config?.maxSurge || 1;
    const rolloutDuration = config?.rolloutDuration || 600000; // 10 minutes

    // Create new instances (max surge)
    const newInstances: ServiceInstance[] = [];
    for (let i = 0; i < maxSurge; i++) {
      const instance = await this.createInstance(newService);
      newInstances.push(instance);
    }

    // Wait for new instances to be healthy
    await this.waitForInstancesHealthy(newInstances);

    // Terminate old instances (max unavailable)
    const toTerminate = instances.slice(0, maxUnavailable);
    const allInstances = this.instances.get(serviceId) || [];
    const remaining = allInstances.filter(i => !toTerminate.includes(i));
    this.instances.set(serviceId, [...remaining, ...newInstances]);
  }

  private async blueGreenUpdate(
    serviceId: string,
    newService: ServiceRegistration,
    config?: UpdateConfig
  ): Promise<void> {
    // Create new environment
    const newInstances: ServiceInstance[] = [];
    const oldInstances = this.instances.get(serviceId) || [];
    
    for (const oldInstance of oldInstances) {
      const newInstance = await this.createInstance(newService);
      newInstances.push(newInstance);
    }

    // Wait for new environment to be healthy
    await this.waitForInstancesHealthy(newInstances);

    // Switch traffic to new environment
    this.instances.set(serviceId, newInstances);

    // Terminate old environment
    // (In real implementation, this would be done gradually)
  }

  private async canaryUpdate(
    serviceId: string,
    newService: ServiceRegistration,
    config?: UpdateConfig
  ): Promise<void> {
    const instances = this.instances.get(serviceId) || [];
    const canaryCount = Math.max(1, Math.floor(instances.length * 0.2)); // 20% canary

    // Create canary instances
    const canaryInstances: ServiceInstance[] = [];
    for (let i = 0; i < canaryCount; i++) {
      const instance = await this.createInstance(newService);
      canaryInstances.push(instance);
    }

    // Wait for canary to be healthy and stable
    await this.waitForInstancesHealthy(canaryInstances);
    await this.stabilizationPeriod(300000); // 5 minutes

    // Gradually replace old instances
    for (let i = 0; i < instances.length; i++) {
      if (i < canaryInstances.length) {
        instances[i] = canaryInstances[i];
      }
    }

    this.instances.set(serviceId, instances);
  }

  private async recreateUpdate(
    serviceId: string,
    newService: ServiceRegistration,
    config?: UpdateConfig
  ): Promise<void> {
    // Terminate all instances
    await this.terminateInstances(serviceId);

    // Create new instances
    await this.initializeServiceInstances(newService);
  }

  private async rollbackService(
    serviceId: string,
    oldService: ServiceRegistration,
    config?: UpdateConfig
  ): Promise<void> {
    this.emit('rollback-started', { serviceId });
    
    // Implement rollback logic based on strategy
    await this.recreateUpdate(serviceId, oldService, config);
    
    this.emit('rollback-completed', { serviceId });
  }

  private async waitForInstancesHealthy(instances: ServiceInstance[]): Promise<void> {
    const startTime = Date.now();
    const timeout = this.config.defaultTimeout;

    while (Date.now() - startTime < timeout) {
      const allHealthy = instances.every(instance => instance.health === 'healthy');
      
      if (allHealthy) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Instances not healthy within timeout period`);
  }

  private async stabilizationPeriod(duration: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  private async checkAutoScaling(): Promise<void> {
    for (const [serviceId, service] of this.services) {
      const scalingConfig = this.scalingConfigs.get(serviceId);
      
      if (!scalingConfig || !scalingConfig.enableAutoScaling) {
        continue;
      }

      try {
        await this.evaluateScaling(serviceId, service, scalingConfig);
      } catch (error) {
        this.emit('auto-scaling-error', { serviceId, error });
      }
    }
  }

  private async evaluateScaling(
    serviceId: string,
    service: ServiceRegistration,
    config: ScalingConfig
  ): Promise<void> {
    const instances = this.instances.get(serviceId) || [];
    const currentCount = instances.length;

    if (currentCount === 0) {
      return;
    }

    // Calculate average resource utilization
    const avgCPU = instances.reduce((sum, i) => sum + i.resources.cpu, 0) / currentCount;
    const avgMemory = instances.reduce((sum, i) => sum + i.resources.memory, 0) / currentCount;

    // Scale up if needed
    if ((avgCPU > config.targetCPUUtilization || avgMemory > config.targetMemoryUtilization) &&
        currentCount < config.maxInstances) {
      const newCount = Math.min(currentCount + config.scaleUpIncrement, config.maxInstances);
      await this.scaleService(serviceId, newCount);
    }

    // Scale down if needed
    if (avgCPU < config.targetCPUUtilization * 0.5 && avgMemory < config.targetMemoryUtilization * 0.5 &&
        currentCount > config.minInstances) {
      const newCount = Math.max(currentCount - config.scaleDownIncrement, config.minInstances);
      await this.scaleService(serviceId, newCount);
    }
  }

  private async checkAutoHealing(): Promise<void> {
    for (const [serviceId, instances] of this.instances) {
      const unhealthyInstances = instances.filter(i => i.health === 'unhealthy');
      
      if (unhealthyInstances.length === 0) {
        continue;
      }

      const service = this.services.get(serviceId);
      if (!service) {
        continue;
      }

      // Replace unhealthy instances
      for (const unhealthyInstance of unhealthyInstances) {
        try {
          const newInstance = await this.createInstance(service);
          const currentInstances = this.instances.get(serviceId) || [];
          const updatedInstances = currentInstances.filter(i => i.id !== unhealthyInstance.id);
          updatedInstances.push(newInstance);
          this.instances.set(serviceId, updatedInstances);
          
          this.emit('instance-replaced', { 
            oldInstanceId: unhealthyInstance.id, 
            newInstanceId: newInstance.id 
          });
        } catch (error) {
          this.emit('instance-replacement-failed', { 
            instanceId: unhealthyInstance.id, 
            error 
          });
        }
      }
    }
  }

  private recordEvent(
    serviceId: string,
    phase: LifecyclePhase,
    previousPhase: LifecyclePhase,
    error?: string
  ): void {
    const event: LifecycleEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      serviceId,
      phase,
      previousPhase,
      timestamp: Date.now(),
      metadata: {},
      error
    };

    this.events.push(event);
    this.emit('lifecycle-event', event);
  }
}

/**
 * Default lifecycle manager instance
 */
export const defaultLifecycleManager = new MCPLifecycleManager();