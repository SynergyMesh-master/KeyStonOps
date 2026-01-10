/**
 * MCP Tool Executor
 * 
 * High-performance tool execution engine with parallel execution,
 * resource management, and comprehensive monitoring.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ITool,
  IToolExecutor,
  ToolResult,
  ToolError,
  ToolExecutionContext,
  ToolProgress,
  ToolLog,
  ToolMetric,
  ToolExecutionStatus,
  ToolExecutorStatistics,
  DEFAULT_TOOL_CONFIGURATION
} from './tool-interface';
import { MCPToolRegistry } from './tool-registry';

/**
 * Execution Configuration
 */
export interface ExecutionConfig {
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  queueTimeout: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  enableProgressTracking: boolean;
  maxQueueSize: number;
  retryOnFailure: boolean;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Execution Request
 */
export interface ExecutionRequest {
  id: string;
  toolId: string;
  parameters: Record<string, any>;
  context?: ToolExecutionContext;
  priority: number;
  timeout: number;
  retries: number;
  createdAt: number;
  scheduledAt: number;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Execution Queue
 */
class ExecutionQueue {
  private queue: ExecutionRequest[] = [];
  private processing: Set<string> = new Set();

  public enqueue(request: ExecutionRequest): void {
    this.queue.push(request);
    this.sortByPriority();
  }

  public dequeue(): ExecutionRequest | null {
    if (this.queue.length === 0) {
      return null;
    }

    const request = this.queue.shift()!;
    this.processing.add(request.id);
    return request;
  }

  public remove(requestId: string): boolean {
    const index = this.queue.findIndex(req => req.id === requestId);
    if (index > -1) {
      this.queue.splice(index, 1);
      return true;
    }

    if (this.processing.has(requestId)) {
      this.processing.delete(requestId);
      return true;
    }

    return false;
  }

  public size(): number {
    return this.queue.length;
  }

  public processingCount(): number {
    return this.processing.size;
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public getByStatus(): {
    queued: ExecutionRequest[];
    processing: ExecutionRequest[];
  } {
    return {
      queued: [...this.queue],
      processing: []
    };
  }

  private sortByPriority(): void {
    this.queue.sort((a, b) => b.priority - a.priority);
  }
}

/**
 * MCP Tool Executor
 */
export class MCPToolExecutor extends EventEmitter implements IToolExecutor {
  private config: ExecutionConfig;
  private registry: MCPToolRegistry;
  private executionQueue: ExecutionQueue;
  private activeExecutions: Map<string, ExecutionStatus> = new Map();
  private executionHistory: Map<string, ExecutionStatus> = new Map();
  private statistics: ToolExecutorStatistics;
  private isRunning: boolean = false;
  private executionLoop: NodeJS.Timeout | null = null;

  constructor(
    registry: MCPToolRegistry,
    config?: Partial<ExecutionConfig>
  ) {
    super();
    
    this.registry = registry;
    this.config = {
      maxConcurrentExecutions: 100,
      defaultTimeout: 30000,
      queueTimeout: 300000, // 5 minutes
      enableMetrics: true,
      enableLogging: true,
      enableProgressTracking: true,
      maxQueueSize: 1000,
      retryOnFailure: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.executionQueue = new ExecutionQueue();
    this.initializeStatistics();
    this.start();
  }

  /**
   * Execute a tool
   */
  public async execute(
    toolId: string,
    parameters: Record<string, any>,
    context?: ToolExecutionContext
  ): Promise<ToolResult> {
    const executionId = uuidv4();
    const request: ExecutionRequest = {
      id: executionId,
      toolId,
      parameters,
      context,
      priority: context?.requestId ? 1 : 0, // Higher priority for specific requests
      timeout: this.config.defaultTimeout,
      retries: 0,
      createdAt: Date.now(),
      scheduledAt: Date.now()
    };

    // Validate tool exists
    const tool = this.registry.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // Validate parameters
    const validation = tool.validateParameters(parameters);
    if (!validation.isValid) {
      const error = this.createError('VALIDATION_ERROR', 
        `Parameter validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      return this.createResult(false, undefined, error, 0);
    }

    // Add to queue
    this.executionQueue.enqueue(request);
    
    // Wait for completion
    return new Promise((resolve, reject) => {
      const checkCompletion = () => {
        const status = this.activeExecutions.get(executionId);
        
        if (status && (status.status === 'completed' || status.status === 'failed')) {
          if (status.result) {
            resolve(status.result);
          } else if (status.error) {
            reject(new Error(status.error));
          }
        } else {
          setTimeout(checkCompletion, 100);
        }
      };

      checkCompletion();
    });
  }

  /**
   * Execute multiple tools in parallel
   */
  public async executeParallel(
    executions: Array<{
      toolId: string;
      parameters: Record<string, any>;
      context?: ToolExecutionContext;
    }>
  ): Promise<ToolResult[]> {
    const promises = executions.map(exec => 
      this.execute(exec.toolId, exec.parameters, exec.context)
    );

    return Promise.all(promises);
  }

  /**
   * Execute tools in sequence
   */
  public async executeSequence(
    executions: Array<{
      toolId: string;
      parameters: Record<string, any>;
      context?: ToolExecutionContext;
    }>
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const execution of executions) {
      try {
        const result = await this.execute(
          execution.toolId,
          execution.parameters,
          execution.context
        );
        results.push(result);
      } catch (error) {
        // Add error result and continue
        const errorResult = this.createResult(false, undefined, {
          code: 'SEQUENCE_ERROR',
          message: error.message,
          details: { toolId: execution.toolId }
        }, 0);
        results.push(errorResult);
      }
    }

    return results;
  }

  /**
   * Cancel an execution
   */
  public async cancelExecution(executionId: string): Promise<void> {
    // Remove from queue if not started
    if (this.executionQueue.remove(executionId)) {
      this.emit('execution-cancelled', { executionId, reason: 'queued' });
      return;
    }

    // Cancel active execution
    const status = this.activeExecutions.get(executionId);
    if (status && status.status === 'running') {
      status.status = 'cancelled';
      this.emit('execution-cancelled', { executionId, reason: 'running' });
    }
  }

  /**
   * Get execution status
   */
  public getExecutionStatus(executionId: string): ToolExecutionStatus {
    const status = this.activeExecutions.get(executionId);
    
    if (!status) {
      const historyStatus = this.executionHistory.get(executionId);
      if (historyStatus) {
        return historyStatus;
      }
      
      return {
        executionId,
        toolId: '',
        status: 'pending',
        startTime: 0,
        endTime: 0
      };
    }

    return status;
  }

  /**
   * Get executor statistics
   */
  public getStatistics(): ToolExecutorStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Get active executions
   */
  public getActiveExecutions(): ExecutionStatus[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): {
    size: number;
    processing: number;
    queued: ExecutionRequest[];
  } {
    return {
      size: this.executionQueue.size(),
      processing: this.executionQueue.processingCount(),
      queued: this.executionQueue.getByStatus().queued
    };
  }

  /**
   * Clear execution history
   */
  public clearHistory(): void {
    this.executionHistory.clear();
    this.emit('history-cleared');
  }

  /**
   * Get configuration
   */
  public getConfig(): ExecutionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<ExecutionConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config-updated', this.config);
  }

  /**
   * Pause execution
   */
  public pause(): void {
    this.isRunning = false;
    this.emit('executor-paused');
  }

  /**
   * Resume execution
   */
  public resume(): void {
    this.isRunning = true;
    this.emit('executor-resumed');
  }

  /**
   * Destroy executor
   */
  public async destroy(): Promise<void> {
    this.isRunning = false;

    // Stop execution loop
    if (this.executionLoop) {
      clearTimeout(this.executionLoop);
    }

    // Cancel all active executions
    const activeIds = Array.from(this.activeExecutions.keys());
    for (const id of activeIds) {
      try {
        await this.cancelExecution(id);
      } catch (error) {
        // Continue with other executions
      }
    }

    // Clear data
    this.activeExecutions.clear();
    this.executionHistory.clear();
    this.removeAllListeners();
  }

  // Private methods

  private start(): void {
    this.isRunning = true;
    this.executionLoop = setTimeout(() => this.processExecutionLoop(), 0);
  }

  private async processExecutionLoop(): Promise<void> {
    if (!this.isRunning) {
      this.executionLoop = setTimeout(() => this.processExecutionLoop(), 100);
      return;
    }

    try {
      // Check if we can process more executions
      if (this.activeExecutions.size < this.config.maxConcurrentExecutions) {
        const request = this.executionQueue.dequeue();
        
        if (request) {
          await this.executeRequest(request);
        }
      }

      // Clean up completed executions
      this.cleanupCompletedExecutions();

    } catch (error) {
      this.emit('execution-loop-error', error);
    }

    // Schedule next iteration
    this.executionLoop = setTimeout(() => this.processExecutionLoop(), 10);
  }

  private async executeRequest(request: ExecutionRequest): Promise<void> {
    const tool = this.registry.getTool(request.toolId);
    if (!tool) {
      this.completeExecution(request.id, 'failed', undefined, 
        `Tool not found: ${request.toolId}`);
      return;
    }

    const startTime = Date.now();
    
    // Create execution status
    const status: ExecutionStatus = {
      executionId: request.id,
      toolId: request.toolId,
      status: 'running',
      startTime,
      progress: 0
    };

    this.activeExecutions.set(request.id, status);
    this.emit('execution-started', { executionId: request.id, toolId: request.toolId });

    try {
      // Set up execution context with callbacks
      const context: ToolExecutionContext = {
        ...request.context,
        executionId: request.id,
        timestamp: startTime,
        callbacks: {
          onProgress: (progress: ToolProgress) => {
            status.progress = progress.percentage;
            this.emit('execution-progress', { executionId: request.id, progress });
          },
          onLog: (log: ToolLog) => {
            if (this.config.enableLogging) {
              this.emit('execution-log', { executionId: request.id, log });
            }
          },
          onMetric: (metric: ToolMetric) => {
            if (this.config.enableMetrics) {
              this.emit('execution-metric', { executionId: request.id, metric });
            }
          },
          ...request.context?.callbacks
        }
      };

      // Execute tool with timeout
      const result = await this.executeWithTimeout(tool, request.parameters, context, request.timeout);

      // Update statistics
      const executionTime = Date.now() - startTime;
      this.updateExecutionStatistics(tool, result, executionTime);

      // Complete execution
      this.completeExecution(request.id, 'completed', result, undefined, executionTime);

    } catch (error) {
      // Handle retry logic
      if (this.config.retryOnFailure && request.retries < this.config.maxRetries) {
        request.retries++;
        request.scheduledAt = Date.now() + this.config.retryDelay * request.retries;
        
        this.executionQueue.enqueue(request);
        this.activeExecutions.delete(request.id);
        
        this.emit('execution-retry', { 
          executionId: request.id, 
          retry: request.retries, 
          error: error.message 
        });
        return;
      }

      // Complete with error
      const errorResult = this.createResult(false, undefined, {
        code: 'EXECUTION_ERROR',
        message: error.message,
        stack: error.stack
      }, Date.now() - startTime);

      this.updateExecutionStatistics(tool, errorResult, Date.now() - startTime);
      this.completeExecution(request.id, 'failed', errorResult, error.message, Date.now() - startTime);
    }
  }

  private async executeWithTimeout(
    tool: ITool,
    parameters: Record<string, any>,
    context: ToolExecutionContext,
    timeout: number
  ): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      const timeoutPromise = new Promise((_, timeoutReject) => {
        setTimeout(() => {
          timeoutReject(new Error(`Execution timeout after ${timeout}ms`));
        }, timeout);
      });

      Promise.race([
        tool.execute(parameters, context),
        timeoutPromise
      ]).then(resolve).catch(reject);
    });
  }

  private completeExecution(
    executionId: string,
    status: 'completed' | 'failed' | 'cancelled',
    result?: ToolResult,
    error?: string,
    executionTime?: number
  ): void {
    const executionStatus = this.activeExecutions.get(executionId);
    
    if (!executionStatus) {
      return;
    }

    const endTime = Date.now();
    executionStatus.status = status;
    executionStatus.endTime = endTime;
    executionStatus.result = result;
    executionStatus.error = error;

    // Move to history
    this.executionHistory.set(executionId, executionStatus);
    this.activeExecutions.delete(executionId);

    this.emit('execution-completed', {
      executionId,
      status,
      result,
      error,
      executionTime: executionTime || (endTime - executionStatus.startTime)
    });
  }

  private cleanupCompletedExecutions(): void {
    const now = Date.now();
    const retentionPeriod = 24 * 60 * 60 * 1000; // 24 hours

    for (const [id, status] of this.executionHistory) {
      if (status.endTime && (now - status.endTime) > retentionPeriod) {
        this.executionHistory.delete(id);
      }
    }
  }

  private initializeStatistics(): void {
    this.statistics = {
      totalExecutions: 0,
      activeExecutions: 0,
      completedExecutions: 0,
      failedExecutions: 0,
      cancelledExecutions: 0,
      averageExecutionTime: 0,
      executionsPerSecond: 0,
      queueSize: 0
    };
  }

  private updateStatistics(): void {
    this.statistics.totalExecutions = this.executionHistory.size + this.activeExecutions.size;
    this.statistics.activeExecutions = this.activeExecutions.size;
    this.statistics.queueSize = this.executionQueue.size();

    // Calculate completed/failed/cancelled
    this.statistics.completedExecutions = 0;
    this.statistics.failedExecutions = 0;
    this.statistics.cancelledExecutions = 0;
    let totalTime = 0;

    for (const status of this.executionHistory.values()) {
      switch (status.status) {
        case 'completed':
          this.statistics.completedExecutions++;
          break;
        case 'failed':
          this.statistics.failedExecutions++;
          break;
        case 'cancelled':
          this.statistics.cancelledExecutions++;
          break;
      }

      if (status.startTime && status.endTime) {
        totalTime += status.endTime - status.startTime;
      }
    }

    // Calculate average execution time
    const completedCount = this.statistics.completedExecutions + this.statistics.failedExecutions;
    if (completedCount > 0) {
      this.statistics.averageExecutionTime = totalTime / completedCount;
    }

    // Calculate executions per second (last minute)
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    let recentExecutions = 0;

    for (const status of this.executionHistory.values()) {
      if (status.endTime && status.endTime > oneMinuteAgo) {
        recentExecutions++;
      }
    }

    this.statistics.executionsPerSecond = recentExecutions / 60;
  }

  private updateExecutionStatistics(tool: ITool, result: ToolResult, executionTime: number): void {
    // Tool statistics are updated by the tool itself
    // This is for executor-level statistics only
    this.updateStatistics();
  }

  private createResult(
    success: boolean,
    data?: any,
    error?: ToolError,
    executionTime: number = 0
  ): ToolResult {
    return {
      success,
      data,
      error,
      executionTime,
      timestamp: Date.now()
    };
  }

  private createError(code: string, message: string, details?: any): ToolError {
    return {
      code,
      message,
      details
    };
  }
}

/**
 * Execution Status interface
 */
interface ExecutionStatus extends ToolExecutionStatus {
  progress?: number;
  result?: ToolResult;
}

/**
 * Default tool executor instance
 */
export const defaultToolExecutor = new MCPToolExecutor(defaultToolRegistry);