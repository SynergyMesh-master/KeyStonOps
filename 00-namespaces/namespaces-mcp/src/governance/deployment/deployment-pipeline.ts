/**
 * Deployment Pipeline - Automated deployment orchestration
 * 
 * Provides deployment orchestration, environment management,
 * rollback mechanisms, and health checks with validation.
 * 
 * @module governance/deployment/deployment-pipeline
 */

import { EventEmitter } from 'events';

/**
 * Deployment environment types
 */
export enum DeploymentEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

/**
 * Deployment status
 */
export enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
  CANCELLED = 'cancelled'
}

/**
 * Deployment strategy
 */
export enum DeploymentStrategy {
  BLUE_GREEN = 'blue_green',
  ROLLING = 'rolling',
  CANARY = 'canary',
  RECREATE = 'recreate'
}

/**
 * Deployment stage
 */
export interface DeploymentStage {
  id: string;
  name: string;
  description?: string;
  execute: (context: DeploymentContext) => Promise<void>;
  rollback?: (context: DeploymentContext) => Promise<void>;
  healthCheck?: (context: DeploymentContext) => Promise<boolean>;
  timeout?: number;
  retries?: number;
}

/**
 * Deployment context
 */
export interface DeploymentContext {
  deploymentId: string;
  environment: DeploymentEnvironment;
  version: string;
  artifacts: string[];
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  environment: DeploymentEnvironment;
  strategy: DeploymentStrategy;
  stages: DeploymentStage[];
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  rollbackOnFailure?: boolean;
  notifyOnCompletion?: boolean;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  deploymentId: string;
  status: DeploymentStatus;
  environment: DeploymentEnvironment;
  version: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  stages: Array<{
    stageId: string;
    stageName: string;
    status: DeploymentStatus;
    startedAt: Date;
    completedAt?: Date;
    duration?: number;
    error?: string;
  }>;
  error?: string;
  rollbackPerformed?: boolean;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    message?: string;
    timestamp: Date;
  }>;
  timestamp: Date;
}

/**
 * Deployment pipeline configuration
 */
export interface DeploymentPipelineConfig {
  enableAutoRollback?: boolean;
  enableHealthChecks?: boolean;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  maxConcurrentDeployments?: number;
  deploymentTimeout?: number;
}

/**
 * Deployment Pipeline
 * 
 * Manages deployment orchestration and lifecycle
 */
export class DeploymentPipeline extends EventEmitter {
  private deployments: Map<string, DeploymentResult> = new Map();
  private activeDeployments: Set<string> = new Set();
  private config: Required<DeploymentPipelineConfig>;

  constructor(config: DeploymentPipelineConfig = {}) {
    super();
    this.config = {
      enableAutoRollback: config.enableAutoRollback ?? true,
      enableHealthChecks: config.enableHealthChecks ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000, // 30 seconds
      healthCheckTimeout: config.healthCheckTimeout ?? 300000, // 5 minutes
      maxConcurrentDeployments: config.maxConcurrentDeployments ?? 3,
      deploymentTimeout: config.deploymentTimeout ?? 1800000 // 30 minutes
    };
  }

  /**
   * Deploy to an environment
   */
  async deploy(deploymentConfig: DeploymentConfig): Promise<DeploymentResult> {
    // Check concurrent deployment limit
    if (this.activeDeployments.size >= this.config.maxConcurrentDeployments) {
      throw new Error('Maximum concurrent deployments reached');
    }

    const deploymentId = this.generateDeploymentId();
    const startedAt = new Date();

    const context: DeploymentContext = {
      deploymentId,
      environment: deploymentConfig.environment,
      version: this.generateVersion(),
      artifacts: [],
      config: {}
    };

    const result: DeploymentResult = {
      deploymentId,
      status: DeploymentStatus.PENDING,
      environment: deploymentConfig.environment,
      version: context.version,
      startedAt,
      stages: []
    };

    this.deployments.set(deploymentId, result);
    this.activeDeployments.add(deploymentId);

    try {
      // Update status to in progress
      result.status = DeploymentStatus.IN_PROGRESS;
      this.emit('deployment:started', { result });

      // Execute deployment stages
      for (const stage of deploymentConfig.stages) {
        const stageResult = await this.executeStage(stage, context, deploymentConfig);
        result.stages.push(stageResult);

        if (stageResult.status === DeploymentStatus.FAILED) {
          throw new Error(`Stage ${stage.name} failed: ${stageResult.error}`);
        }
      }

      // Perform health checks if enabled
      if (this.config.enableHealthChecks) {
        const healthCheck = await this.performHealthChecks(deploymentConfig, context);
        if (!healthCheck.healthy) {
          throw new Error('Health checks failed after deployment');
        }
      }

      // Mark deployment as successful
      result.status = DeploymentStatus.SUCCESS;
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();

      this.emit('deployment:completed', { result });

      return result;

    } catch (error) {
      // Handle deployment failure
      result.status = DeploymentStatus.FAILED;
      result.error = error instanceof Error ? error.message : String(error);
      result.completedAt = new Date();
      result.duration = result.completedAt.getTime() - startedAt.getTime();

      this.emit('deployment:failed', { result, error });

      // Perform rollback if enabled
      if (this.config.enableAutoRollback && deploymentConfig.rollbackOnFailure) {
        await this.rollback(deploymentId, deploymentConfig);
        result.rollbackPerformed = true;
      }

      throw error;

    } finally {
      this.activeDeployments.delete(deploymentId);
    }
  }

  /**
   * Execute a deployment stage
   */
  private async executeStage(
    stage: DeploymentStage,
    context: DeploymentContext,
    config: DeploymentConfig
  ): Promise<DeploymentResult['stages'][0]> {
    const startedAt = new Date();
    const stageResult = {
      stageId: stage.id,
      stageName: stage.name,
      status: DeploymentStatus.IN_PROGRESS,
      startedAt
    };

    this.emit('stage:started', { stage, context });

    try {
      // Execute stage with timeout
      const timeout = stage.timeout || this.config.deploymentTimeout;
      await this.executeWithTimeout(
        () => stage.execute(context),
        timeout
      );

      // Perform stage health check if available
      if (stage.healthCheck) {
        const healthy = await stage.healthCheck(context);
        if (!healthy) {
          throw new Error('Stage health check failed');
        }
      }

      stageResult.status = DeploymentStatus.SUCCESS;
      stageResult.completedAt = new Date();
      stageResult.duration = stageResult.completedAt.getTime() - startedAt.getTime();

      this.emit('stage:completed', { stage, context, result: stageResult });

      return stageResult;

    } catch (error) {
      stageResult.status = DeploymentStatus.FAILED;
      stageResult.error = error instanceof Error ? error.message : String(error);
      stageResult.completedAt = new Date();
      stageResult.duration = stageResult.completedAt.getTime() - startedAt.getTime();

      this.emit('stage:failed', { stage, context, error });

      // Retry if configured
      if (stage.retries && stage.retries > 0) {
        for (let i = 0; i < stage.retries; i++) {
          try {
            await this.executeWithTimeout(
              () => stage.execute(context),
              stage.timeout || this.config.deploymentTimeout
            );
            stageResult.status = DeploymentStatus.SUCCESS;
            stageResult.error = undefined;
            break;
          } catch (retryError) {
            if (i === stage.retries - 1) {
              throw retryError;
            }
          }
        }
      }

      return stageResult;
    }
  }

  /**
   * Rollback a deployment
   */
  async rollback(deploymentId: string, config: DeploymentConfig): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    this.emit('rollback:started', { deploymentId });

    const context: DeploymentContext = {
      deploymentId,
      environment: deployment.environment,
      version: deployment.version,
      artifacts: [],
      config: {}
    };

    try {
      // Execute rollback for each stage in reverse order
      const completedStages = deployment.stages
        .filter(s => s.status === DeploymentStatus.SUCCESS)
        .reverse();

      for (const stageResult of completedStages) {
        const stage = config.stages.find(s => s.id === stageResult.stageId);
        if (stage?.rollback) {
          await stage.rollback(context);
        }
      }

      deployment.status = DeploymentStatus.ROLLED_BACK;
      this.emit('rollback:completed', { deploymentId });

    } catch (error) {
      this.emit('rollback:failed', { deploymentId, error });
      throw error;
    }
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(
    config: DeploymentConfig,
    context: DeploymentContext
  ): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = [];

    for (const stage of config.stages) {
      if (stage.healthCheck) {
        try {
          const healthy = await stage.healthCheck(context);
          checks.push({
            name: stage.name,
            status: healthy ? 'pass' : 'fail',
            timestamp: new Date()
          });
        } catch (error) {
          checks.push({
            name: stage.name,
            status: 'fail',
            message: error instanceof Error ? error.message : String(error),
            timestamp: new Date()
          });
        }
      }
    }

    const result: HealthCheckResult = {
      healthy: checks.every(c => c.status === 'pass'),
      checks,
      timestamp: new Date()
    };

    this.emit('healthcheck:completed', { result });

    return result;
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }

  /**
   * Get deployment by ID
   */
  getDeployment(deploymentId: string): DeploymentResult | undefined {
    return this.deployments.get(deploymentId);
  }

  /**
   * Get all deployments
   */
  getAllDeployments(environment?: DeploymentEnvironment): DeploymentResult[] {
    let deployments = Array.from(this.deployments.values());

    if (environment) {
      deployments = deployments.filter(d => d.environment === environment);
    }

    return deployments.sort((a, b) => 
      b.startedAt.getTime() - a.startedAt.getTime()
    );
  }

  /**
   * Get active deployments
   */
  getActiveDeployments(): DeploymentResult[] {
    return Array.from(this.activeDeployments)
      .map(id => this.deployments.get(id))
      .filter((d): d is DeploymentResult => d !== undefined);
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    if (deployment.status !== DeploymentStatus.IN_PROGRESS) {
      throw new Error('Can only cancel in-progress deployments');
    }

    deployment.status = DeploymentStatus.CANCELLED;
    deployment.completedAt = new Date();
    deployment.duration = deployment.completedAt.getTime() - deployment.startedAt.getTime();

    this.activeDeployments.delete(deploymentId);
    this.emit('deployment:cancelled', { deploymentId });
  }

  /**
   * Generate unique deployment ID
   */
  private generateDeploymentId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate version string
   */
  private generateVersion(): string {
    const now = new Date();
    return `v${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}.${now.getHours()}${now.getMinutes()}`;
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    totalDeployments: number;
    activeDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    rolledBackDeployments: number;
    averageDeploymentTime: number;
  } {
    const deployments = Array.from(this.deployments.values());
    const successful = deployments.filter(d => d.status === DeploymentStatus.SUCCESS);
    const failed = deployments.filter(d => d.status === DeploymentStatus.FAILED);
    const rolledBack = deployments.filter(d => d.rollbackPerformed);

    const completedDeployments = deployments.filter(d => d.duration);
    const averageDeploymentTime = completedDeployments.length > 0
      ? completedDeployments.reduce((sum, d) => sum + (d.duration || 0), 0) / completedDeployments.length
      : 0;

    return {
      totalDeployments: deployments.length,
      activeDeployments: this.activeDeployments.size,
      successfulDeployments: successful.length,
      failedDeployments: failed.length,
      rolledBackDeployments: rolledBack.length,
      averageDeploymentTime
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.removeAllListeners();
  }
}

/**
 * Create a deployment pipeline instance
 */
export function createDeploymentPipeline(config?: DeploymentPipelineConfig): DeploymentPipeline {
  return new DeploymentPipeline(config);
}

export default DeploymentPipeline;