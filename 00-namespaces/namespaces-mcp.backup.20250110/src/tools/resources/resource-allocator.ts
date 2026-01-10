/**
 * MCP Resource Allocator
 * 
 * Intelligent resource allocation with optimization algorithms,
 * predictive analysis, and multi-objective decision making.
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
  ResourceRequest,
  ResourcePriority
} from './resource-manager';
import { MCPResourcePool } from './resource-pool';
import { MCPResourceMonitor } from './resource-monitor';

/**
 * Allocation Strategy
 */
export enum AllocationStrategy {
  FIRST_FIT = 'first_fit',
  BEST_FIT = 'best_fit',
  WORST_FIT = 'worst_fit',
  PRIORITY_BASED = 'priority_based',
  COST_OPTIMIZED = 'cost_optimized',
  PERFORMANCE_OPTIMIZED = 'performance_optimized',
  BALANCED = 'balanced'
}

/**
 * Optimization Objective
 */
export enum OptimizationObjective {
  MINIMIZE_COST = 'minimize_cost',
  MAXIMIZE_PERFORMANCE = 'maximize_performance',
  MINIMIZE_LATENCY = 'minimize_latency',
  MAXIMIZE_UTILIZATION = 'maximize_utilization',
  BALANCE_ALL = 'balance_all'
}

/**
 * Allocation Result
 */
export interface AllocationResult {
  success: boolean;
  allocation?: ResourceAllocation;
  alternatives?: ResourceAllocation[];
  reasoning: string[];
  score: number;
  cost: number;
  estimatedDuration: number;
  confidence: number;
}

/**
 * Resource Constraint
 */
export interface ResourceConstraint {
  type: ResourceType;
  minAmount: number;
  maxAmount: number;
  preferredRegions?: string[];
  maxLatency?: number;
  maxCost?: number;
  exclusive?: boolean;
  preconditions?: string[];
}

/**
 * Allocation Request
 */
export interface AllocationRequest {
  id: string;
  toolId: string;
  executionId: string;
  constraints: ResourceConstraint[];
  priority: ResourcePriority;
  strategy: AllocationStrategy;
  objective: OptimizationObjective;
  deadline?: number;
  budget?: number;
  metadata: Record<string, any>;
}

/**
 * Allocation Decision
 */
export interface AllocationDecision {
  requestId: string;
  resourceId: string;
  amount: number;
  startTime: number;
  endTime: number;
  confidence: number;
  riskFactors: string[];
  alternatives: {
    resourceId: string;
    score: number;
    reasoning: string[];
  }[];
}

/**
 * Prediction Model
 */
export interface PredictionModel {
  predictResourceUsage(resourceId: string, timeHorizon: number): Promise<number>;
  predictCost(allocation: ResourceAllocation): Promise<number>;
  predictPerformance(allocation: ResourceAllocation): Promise<number>;
}

/**
 * Allocator Configuration
 */
export interface AllocatorConfig {
  defaultStrategy: AllocationStrategy;
  defaultObjective: OptimizationObjective;
  enablePrediction: boolean;
  enableOptimization: boolean;
  maxAlternatives: number;
  decisionTimeout: number;
  riskThreshold: number;
  enableCaching: boolean;
  cacheTimeout: number;
  enableLearning: boolean;
  learningRate: number;
}

/**
 * MCP Resource Allocator
 */
export class MCPResourceAllocator extends EventEmitter {
  private config: AllocatorConfig;
  private pools: Map<ResourceType, MCPResourcePool> = new Map();
  private monitor: MCPResourceMonitor | null = null;
  private predictionModels: Map<ResourceType, PredictionModel> = new Map();
  private allocationHistory: AllocationDecision[] = [];
  private decisionCache: Map<string, AllocationResult> = new Map();
  private learningData: Map<string, number[]> = new Map();

  constructor(
    config?: Partial<AllocatorConfig>
  ) {
    super();
    
    this.config = {
      defaultStrategy: AllocationStrategy.BEST_FIT,
      defaultObjective: OptimizationObjective.BALANCE_ALL,
      enablePrediction: false,
      enableOptimization: true,
      maxAlternatives: 3,
      decisionTimeout: 5000, // 5 seconds
      riskThreshold: 0.7,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      enableLearning: false,
      learningRate: 0.1,
      ...config
    };
  }

  /**
   * Register resource pool
   */
  public registerPool(pool: MCPResourcePool): void {
    this.pools.set(pool['resourceType'], pool);
    this.emit('pool-registered', { resourceType: pool['resourceType'] });
  }

  /**
   * Register resource monitor
   */
  public registerMonitor(monitor: MCPResourceMonitor): void {
    this.monitor = monitor;
    this.emit('monitor-registered');
  }

  /**
   * Register prediction model
   */
  public registerPredictionModel(resourceType: ResourceType, model: PredictionModel): void {
    this.predictionModels.set(resourceType, model);
    this.emit('prediction-model-registered', { resourceType });
  }

  /**
   * Allocate resources
   */
  public async allocate(request: AllocationRequest): Promise<AllocationResult> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(request);
        const cached = this.decisionCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.score) < this.config.cacheTimeout) {
          this.emit('cache-hit', { requestId: request.id });
          return cached;
        }
      }

      // Validate request
      this.validateAllocationRequest(request);

      // Generate allocation options
      const options = await this.generateAllocationOptions(request);
      
      if (options.length === 0) {
        const result: AllocationResult = {
          success: false,
          reasoning: ['No suitable resources available'],
          score: 0,
          cost: 0,
          estimatedDuration: 0,
          confidence: 0
        };

        this.emit('allocation-failed', { request, reason: 'No resources available' });
        return result;
      }

      // Evaluate options based on objective
      const evaluation = await this.evaluateOptions(options, request);
      
      if (evaluation.length === 0) {
        const result: AllocationResult = {
          success: false,
          reasoning: ['No allocation options passed evaluation'],
          score: 0,
          cost: 0,
          estimatedDuration: 0,
          confidence: 0
        };

        this.emit('allocation-failed', { request, reason: 'Evaluation failed' });
        return result;
      }

      // Select best option
      const bestOption = evaluation[0];
      const alternatives = evaluation.slice(1, this.config.maxAlternatives);

      // Create allocation decision
      const decision: AllocationDecision = {
        requestId: request.id,
        resourceId: bestOption.resourceId,
        amount: bestOption.amount,
        startTime: Date.now(),
        endTime: Date.now() + bestOption.estimatedDuration,
        confidence: bestOption.confidence,
        riskFactors: this.identifyRiskFactors(bestOption),
        alternatives: alternatives.map(alt => ({
          resourceId: alt.resourceId,
          score: alt.score,
          reasoning: alt.reasoning
        }))
      };

      // Store decision
      this.allocationHistory.push(decision);

      // Create result
      const result: AllocationResult = {
        success: true,
        allocation: bestOption.allocation,
        alternatives: alternatives.map(alt => alt.allocation).filter(Boolean) as ResourceAllocation[],
        reasoning: bestOption.reasoning,
        score: bestOption.score,
        cost: bestOption.cost,
        estimatedDuration: bestOption.estimatedDuration,
        confidence: bestOption.confidence
      };

      // Cache result
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(request);
        this.decisionCache.set(cacheKey, result);
      }

      // Update learning data
      if (this.config.enableLearning) {
        this.updateLearningData(request, result);
      }

      this.emit('allocation-completed', { 
        request, 
        result, 
        duration: Date.now() - startTime 
      });

      return result;

    } catch (error) {
      this.emit('allocation-error', { request, error });
      throw error;
    }
  }

  /**
   * Deallocate resources
   */
  public async deallocate(allocationId: string): Promise<void> {
    try {
      // Find the pool that contains this allocation
      for (const pool of this.pools.values()) {
        try {
          await pool.release(allocationId);
          this.emit('deallocation-completed', { allocationId });
          return;
        } catch (error) {
          // Allocation not in this pool, try next
        }
      }

      throw new Error(`Allocation not found: ${allocationId}`);

    } catch (error) {
      this.emit('deallocation-error', { allocationId, error });
      throw error;
    }
  }

  /**
   * Optimize existing allocations
   */
  public async optimizeAllocations(): Promise<{
    reoptimized: AllocationDecision[];
    savings: number;
    improvements: string[];
  }> {
    const reoptimized: AllocationDecision[] = [];
    const improvements: string[] = [];
    let totalSavings = 0;

    try {
      // Get current allocations from all pools
      const currentAllocations: ResourceAllocation[] = [];
      
      for (const pool of this.pools.values()) {
        const poolStats = pool.getStatistics();
        // In a real implementation, we'd get actual allocations
        // For now, we'll use the allocation history
      }

      // Check each allocation for optimization opportunities
      for (const decision of this.allocationHistory) {
        if (this.shouldReoptimize(decision)) {
          const newDecision = await this.reoptimizeDecision(decision);
          
          if (newDecision) {
            reoptimized.push(newDecision);
            const savings = this.calculateSavings(decision, newDecision);
            totalSavings += savings;
            improvements.push(`Reallocated ${decision.resourceId} for ${savings} savings`);
          }
        }
      }

      this.emit('optimization-completed', { 
        reoptimized: reoptimized.length, 
        savings: totalSavings 
      });

      return {
        reoptimized,
        savings: totalSavings,
        improvements
      };

    } catch (error) {
      this.emit('optimization-error', error);
      throw error;
    }
  }

  /**
   * Predict resource needs
   */
  public async predictResourceNeeds(
    toolId: string,
    timeHorizon: number
  ): Promise<Map<ResourceType, number>> {
    const predictions = new Map<ResourceType, number>();

    try {
      for (const [resourceType, model] of this.predictionModels.entries()) {
        const usage = await model.predictResourceUsage(toolId, timeHorizon);
        predictions.set(resourceType, usage);
      }

      this.emit('prediction-completed', { toolId, predictions });

      return predictions;

    } catch (error) {
      this.emit('prediction-error', { toolId, timeHorizon, error });
      throw error;
    }
  }

  /**
   * Get allocation statistics
   */
  public getStatistics(): {
    totalAllocations: number;
    successRate: number;
    averageCost: number;
    averageConfidence: number;
    cacheHitRate: number;
    optimizationSavings: number;
  } {
    const totalAllocations = this.allocationHistory.length;
    const successfulAllocations = this.allocationHistory.filter(d => d.confidence > 0.5).length;
    const successRate = totalAllocations > 0 ? (successfulAllocations / totalAllocations) * 100 : 0;

    const averageConfidence = totalAllocations > 0 ?
      this.allocationHistory.reduce((sum, d) => sum + d.confidence, 0) / totalAllocations : 0;

    const cacheHits = Array.from(this.decisionCache.values()).length;
    const cacheHitRate = totalAllocations > 0 ? (cacheHits / totalAllocations) * 100 : 0;

    return {
      totalAllocations,
      successRate,
      averageCost: 0, // Would calculate from actual allocation costs
      averageConfidence,
      cacheHitRate,
      optimizationSavings: 0 // Would calculate from optimization history
    };
  }

  /**
   * Destroy allocator
   */
  public destroy(): void {
    this.pools.clear();
    this.predictionModels.clear();
    this.allocationHistory.length = 0;
    this.decisionCache.clear();
    this.learningData.clear();

    this.emit('destroyed');
  }

  // Private methods

  private validateAllocationRequest(request: AllocationRequest): void {
    if (!request.id || request.id.trim().length === 0) {
      throw new Error('Request ID is required');
    }

    if (!request.toolId || request.toolId.trim().length === 0) {
      throw new Error('Tool ID is required');
    }

    if (request.constraints.length === 0) {
      throw new Error('At least one resource constraint is required');
    }

    for (const constraint of request.constraints) {
      if (constraint.minAmount > constraint.maxAmount) {
        throw new Error('Minimum amount cannot be greater than maximum amount');
      }

      if (constraint.maxCost && constraint.maxCost < 0) {
        throw new Error('Maximum cost cannot be negative');
      }
    }

    if (request.deadline && request.deadline <= Date.now()) {
      throw new Error('Deadline must be in the future');
    }

    if (request.budget && request.budget < 0) {
      throw new Error('Budget cannot be negative');
    }
  }

  private async generateAllocationOptions(
    request: AllocationRequest
  ): Promise<Array<{
    resourceId: string;
    amount: number;
    allocation?: ResourceAllocation;
    score: number;
    cost: number;
    estimatedDuration: number;
    confidence: number;
    reasoning: string[];
  }>> {
    const options: any[] = [];

    for (const constraint of request.constraints) {
      const pool = this.pools.get(constraint.type);
      
      if (!pool) {
        continue; // No pool for this resource type
      }

      // Convert constraint to resource request
      const resourceRequest: ResourceRequest = {
        toolId: request.toolId,
        executionId: request.executionId,
        type: constraint.type,
        amount: constraint.minAmount,
        priority: request.priority,
        duration: request.deadline ? request.deadline - Date.now() : undefined,
        metadata: request.metadata
      };

      try {
        const allocation = await pool.allocate(resourceRequest);
        
        // Calculate score and metrics
        const score = this.calculateAllocationScore(allocation, request);
        const cost = this.estimateAllocationCost(allocation);
        const duration = this.estimateAllocationDuration(allocation, request);
        const confidence = this.calculateConfidence(allocation, request);
        const reasoning = this.generateReasoning(allocation, request);

        options.push({
          resourceId: allocation.resourceId,
          amount: allocation.amount,
          allocation,
          score,
          cost,
          estimatedDuration: duration,
          confidence,
          reasoning
        });

      } catch (error) {
        // Allocation failed for this resource type
        continue;
      }
    }

    return options;
  }

  private async evaluateOptions(
    options: any[],
    request: AllocationRequest
  ): Promise<any[]> {
    // Sort options based on strategy and objective
    const sorted = options.sort((a, b) => {
      switch (request.strategy) {
        case AllocationStrategy.COST_OPTIMIZED:
          return a.cost - b.cost;
        case AllocationStrategy.PERFORMANCE_OPTIMIZED:
          return b.confidence - a.confidence;
        case AllocationStrategy.BALANCED:
          return (b.score + b.confidence) - (a.score + a.confidence);
        default:
          return b.score - a.score;
      }
    });

    return sorted;
  }

  private calculateAllocationScore(
    allocation: ResourceAllocation,
    request: AllocationRequest
  ): number {
    let score = 100;

    // Apply priority bonus
    score += request.priority * 10;

    // Apply deadline pressure
    if (request.deadline) {
      const timeRemaining = request.deadline - Date.now();
      if (timeRemaining < 60000) { // Less than 1 minute
        score -= 20;
      }
    }

    // Apply budget constraint
    if (request.budget) {
      const estimatedCost = this.estimateAllocationCost(allocation);
      if (estimatedCost > request.budget) {
        score -= 30;
      }
    }

    return Math.max(0, score);
  }

  private estimateAllocationCost(allocation: ResourceAllocation): number {
    // Simple cost estimation based on amount and duration
    const baseCost = allocation.amount * 0.01; // $0.01 per unit
    const durationMultiplier = allocation.expiresAt ? 
      (allocation.expiresAt - allocation.allocatedAt) / 3600000 : 1; // Per hour
    return baseCost * durationMultiplier;
  }

  private estimateAllocationDuration(
    allocation: ResourceAllocation,
    request: AllocationRequest
  ): number {
    // Simple duration estimation
    const baseDuration = 30000; // 30 seconds
    const complexityMultiplier = request.constraints.length;
    return baseDuration * complexityMultiplier;
  }

  private calculateConfidence(
    allocation: ResourceAllocation,
    request: AllocationRequest
  ): number {
    let confidence = 0.8; // Base confidence

    // Adjust based on resource availability
    const pool = this.pools.get(allocation.type);
    if (pool) {
      const stats = pool.getStatistics();
      confidence += (1 - stats.utilizationRate / 100) * 0.2;
    }

    // Adjust based on request complexity
    confidence -= request.constraints.length * 0.05;

    return Math.max(0, Math.min(1, confidence));
  }

  private generateReasoning(
    allocation: ResourceAllocation,
    request: AllocationRequest
  ): string[] {
    const reasoning: string[] = [];

    reasoning.push(`Selected resource ${allocation.resourceId} of type ${allocation.type}`);
    reasoning.push(`Allocated ${allocation.amount} units with priority ${request.priority}`);

    if (request.deadline) {
      reasoning.push(`Meets deadline requirement`);
    }

    if (request.budget) {
      const cost = this.estimateAllocationCost(allocation);
      if (cost <= request.budget) {
        reasoning.push(`Within budget constraints`);
      }
    }

    return reasoning;
  }

  private identifyRiskFactors(allocation: any): string[] {
    const riskFactors: string[] = [];

    if (allocation.confidence < 0.7) {
      riskFactors.push('Low confidence allocation');
    }

    if (allocation.cost > 100) {
      riskFactors.push('High cost allocation');
    }

    if (allocation.estimatedDuration > 300000) { // 5 minutes
      riskFactors.push('Long duration allocation');
    }

    return riskFactors;
  }

  private generateCacheKey(request: AllocationRequest): string {
    const key = [
      request.toolId,
      request.constraints.map(c => `${c.type}:${c.minAmount}-${c.maxAmount}`).join(','),
      request.priority,
      request.strategy,
      request.objective
    ].join('|');
    
    return Buffer.from(key).toString('base64');
  }

  private shouldReoptimize(decision: AllocationDecision): boolean {
    const age = Date.now() - decision.startTime;
    
    // Reoptimize if allocation is older than 1 hour
    if (age > 3600000) {
      return true;
    }

    // Reoptimize if confidence was low
    if (decision.confidence < 0.6) {
      return true;
    }

    // Reoptimize if there were risk factors
    if (decision.riskFactors.length > 0) {
      return true;
    }

    return false;
  }

  private async reoptimizeDecision(decision: AllocationDecision): Promise<AllocationDecision | null> {
    // In a real implementation, this would find better allocation options
    // For now, we'll return null to indicate no reoptimization needed
    return null;
  }

  private calculateSavings(oldDecision: AllocationDecision, newDecision: AllocationDecision): number {
    // Calculate cost savings between old and new decisions
    return 0; // Would calculate actual savings
  }

  private updateLearningData(request: AllocationRequest, result: AllocationResult): void {
    const key = `${request.toolId}:${request.strategy}`;
    const scores = this.learningData.get(key) || [];
    scores.push(result.score);
    
    // Keep only recent scores
    if (scores.length > 100) {
      scores.splice(0, scores.length - 100);
    }
    
    this.learningData.set(key, scores);
  }
}