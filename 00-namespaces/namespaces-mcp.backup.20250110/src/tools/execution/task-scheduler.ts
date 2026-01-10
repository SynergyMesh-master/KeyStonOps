/**
 * MCP Task Scheduler
 * 
 * Intelligent task scheduling with priority queues, resource awareness,
 * and optimization algorithms for MCP tool execution.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ITool,
  ToolExecutionContext,
  ExecutionPriority
} from '../core/tool-interface';
import { MCPResourceAllocator } from '../resources/resource-allocator';

/**
 * Task State
 */
export enum TaskState {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  DEFERRED = 'deferred'
}

/**
 * Task Dependency Type
 */
export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish'
}

/**
 * Task Dependency
 */
export interface TaskDependency {
  taskId: string;
  type: DependencyType;
  condition?: (result: any) => boolean;
}

/**
 * Task Definition
 */
export interface TaskDefinition {
  id: string;
  name: string;
  description?: string;
  toolId: string;
  parameters: Record<string, any>;
  priority: ExecutionPriority;
  timeout: number;
  retryPolicy: RetryPolicy;
  dependencies: TaskDependency[];
  constraints: TaskConstraints;
  metadata: Record<string, any>;
  estimatedDuration: number;
  resourceRequirements: ResourceRequirement[];
}

/**
 * Retry Policy
 */
export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Task Constraints
 */
export interface TaskConstraints {
  deadline?: number;
  startTime?: number;
  endTime?: number;
  maxWaitTime: number;
  requireExclusive: boolean;
  allowParallel: boolean;
}

/**
 * Resource Requirement
 */
export interface ResourceRequirement {
  type: string;
  amount: number;
  priority: ExecutionPriority;
}

/**
 * Scheduled Task
 */
export interface ScheduledTask {
  definition: TaskDefinition;
  state: TaskState;
  createdAt: number;
  scheduledAt: number;
  startedAt?: number;
  completedAt?: number;
  executionId?: string;
  result?: any;
  error?: Error;
  retryCount: number;
  attempts: number;
  dependenciesResolved: boolean;
}

/**
 * Scheduling Strategy
 */
export enum SchedulingStrategy {
  FIFO = 'fifo',
  PRIORITY = 'priority',
  SHORTEST_JOB_FIRST = 'shortest_job_first',
  LEAST_RESOURCE_FIRST = 'least_resource_first',
  DEADLINE_AWARE = 'deadline_aware',
  ADAPTIVE = 'adaptive'
}

/**
 * Scheduler Configuration
 */
export interface SchedulerConfig {
  strategy: SchedulingStrategy;
  maxConcurrentTasks: number;
  enablePreemption: boolean;
  preemptionThreshold: number;
  enableResourceAwareness: boolean;
  enableDeadlineTracking: boolean;
  defaultTimeout: number;
  defaultRetryPolicy: RetryPolicy;
  queueSize: number;
  enableMetrics: boolean;
}

/**
 * Scheduler Statistics
 */
export interface SchedulerStatistics {
  totalTasks: number;
  scheduledTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  deferredTasks: number;
  averageWaitTime: number;
  averageExecutionTime: number;
  throughput: number;
  queueLength: number;
  activeTasks: number;
  retryRate: number;
}

/**
 * MCP Task Scheduler
 */
export class MCPTaskScheduler extends EventEmitter {
  private config: SchedulerConfig;
  private taskQueue: ScheduledTask[] = [];
  private activeTasks: Map<string, ScheduledTask> = new Map();
  private completedTasks: Map<string, ScheduledTask> = new Map();
  private taskDependencies: Map<string, TaskDependency[]> = new Map();
  private allocator?: MCPResourceAllocator;
  private statistics: SchedulerStatistics;
  private isRunning: boolean = false;
  private schedulerLoop: NodeJS.Timeout | null = null;

  constructor(
    config?: Partial<SchedulerConfig>
  ) {
    super();
    
    this.config = {
      strategy: SchedulingStrategy.PRIORITY,
      maxConcurrentTasks: 100,
      enablePreemption: false,
      preemptionThreshold: 0.8,
      enableResourceAwareness: true,
      enableDeadlineTracking: true,
      defaultTimeout: 30000,
      defaultRetryPolicy: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
        retryableErrors: ['timeout', 'network', 'temporary']
      },
      queueSize: 1000,
      enableMetrics: true,
      ...config
    };

    this.initializeStatistics();
    this.start();
  }

  /**
   * Set resource allocator
   */
  public setAllocator(allocator: MCPResourceAllocator): void {
    this.allocator = allocator;
  }

  /**
   * Schedule a task
   */
  public async schedule(task: TaskDefinition): Promise<string> {
    // Validate task
    this.validateTask(task);

    // Create scheduled task
    const scheduledTask: ScheduledTask = {
      definition: task,
      state: TaskState.PENDING,
      createdAt: Date.now(),
      scheduledAt: Date.now(),
      retryCount: 0,
      attempts: 0,
      dependenciesResolved: false
    };

    // Check queue capacity
    if (this.taskQueue.length >= this.config.queueSize) {
      throw new Error('Task queue is full');
    }

    // Add to queue
    this.taskQueue.push(scheduledTask);

    // Register dependencies
    if (task.dependencies.length > 0) {
      this.taskDependencies.set(task.id, task.dependencies);
    }

    // Update statistics
    this.statistics.totalTasks++;
    this.updateStatistics();

    this.emit('task-scheduled', { taskId: task.id, task });

    return task.id;
  }

  /**
   * Schedule multiple tasks
   */
  public async scheduleBatch(tasks: TaskDefinition[]): Promise<string[]> {
    const taskIds: string[] = [];

    for (const task of tasks) {
      const taskId = await this.schedule(task);
      taskIds.push(taskId);
    }

    return taskIds;
  }

  /**
   * Cancel a task
   */
  public cancelTask(taskId: string): void {
    // Check active tasks
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      activeTask.state = TaskState.CANCELLED;
      activeTask.completedAt = Date.now();
      this.activeTasks.delete(taskId);
      this.completedTasks.set(taskId, activeTask);
      
      this.statistics.cancelledTasks++;
      this.emit('task-cancelled', { taskId, task: activeTask });
      return;
    }

    // Check queued tasks
    const queueIndex = this.taskQueue.findIndex(t => t.definition.id === taskId);
    if (queueIndex > -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.state = TaskState.CANCELLED;
      this.completedTasks.set(taskId, task);
      
      this.statistics.cancelledTasks++;
      this.emit('task-cancelled', { taskId, task });
      return;
    }
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): ScheduledTask | undefined {
    return this.activeTasks.get(taskId) || 
           this.completedTasks.get(taskId) ||
           this.taskQueue.find(t => t.definition.id === taskId);
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): {
    length: number;
    tasks: TaskDefinition[];
    state: 'running' | 'paused' | 'stopped';
  } {
    return {
      length: this.taskQueue.length,
      tasks: this.taskQueue.map(t => t.definition),
      state: this.isRunning ? 'running' : 'stopped'
    };
  }

  /**
   * Get scheduler statistics
   */
  public getStatistics(): SchedulerStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Pause scheduler
   */
  public pause(): void {
    this.isRunning = false;
    this.emit('scheduler-paused');
  }

  /**
   * Resume scheduler
   */
  public resume(): void {
    this.isRunning = true;
    this.emit('scheduler-resumed');
  }

  /**
   * Clear queue
   */
  public clearQueue(): void {
    this.taskQueue.length = 0;
    this.emit('queue-cleared');
  }

  /**
   * Destroy scheduler
   */
  public destroy(): void {
    this.pause();

    if (this.schedulerLoop) {
      clearTimeout(this.schedulerLoop);
      this.schedulerLoop = null;
    }

    // Cancel all active tasks
    for (const [id] of this.activeTasks) {
      this.cancelTask(id);
    }

    this.taskQueue.length = 0;
    this.activeTasks.clear();
    this.completedTasks.clear();
    this.taskDependencies.clear();

    this.emit('destroyed');
  }

  // Private methods

  private start(): void {
    this.isRunning = true;
    this.runSchedulerLoop();
  }

  private runSchedulerLoop(): void {
    if (!this.isRunning) {
      this.schedulerLoop = setTimeout(() => this.runSchedulerLoop(), 100);
      return;
    }

    // Check if we can schedule more tasks
    while (this.activeTasks.size < this.config.maxConcurrentTasks &&
           this.taskQueue.length > 0) {
      const task = this.selectNextTask();
      
      if (task) {
        this.executeTask(task);
      } else {
        break;
      }
    }

    // Continue loop
    this.schedulerLoop = setTimeout(() => this.runSchedulerLoop(), 10);
  }

  private selectNextTask(): ScheduledTask | null {
    const eligibleTasks = this.taskQueue.filter(task => {
      // Check dependencies
      if (!this.checkDependencies(task)) {
        return false;
      }

      // Check constraints
      return this.checkConstraints(task);
    });

    if (eligibleTasks.length === 0) {
      return null;
    }

    let selectedTask: ScheduledTask;

    switch (this.config.strategy) {
      case SchedulingStrategy.FIFO:
        selectedTask = eligibleTasks[0];
        break;

      case SchedulingStrategy.PRIORITY:
        selectedTask = eligibleTasks.sort((a, b) => 
          b.definition.priority - a.definition.priority
        )[0];
        break;

      case SchedulingStrategy.SHORTEST_JOB_FIRST:
        selectedTask = eligibleTasks.sort((a, b) => 
          a.definition.estimatedDuration - b.definition.estimatedDuration
        )[0];
        break;

      case SchedulingStrategy.DEADLINE_AWARE:
        const now = Date.now();
        selectedTask = eligibleTasks.sort((a, b) => {
          const aDeadline = a.definition.constraints.deadline || Infinity;
          const bDeadline = b.definition.constraints.deadline || Infinity;
          return (aDeadline - now) - (bDeadline - now);
        })[0];
        break;

      case SchedulingStrategy.ADAPTIVE:
        // Adaptive strategy considering multiple factors
        selectedTask = this.adaptiveTaskSelection(eligibleTasks);
        break;

      default:
        selectedTask = eligibleTasks[0];
    }

    // Remove from queue
    const index = this.taskQueue.indexOf(selectedTask);
    if (index > -1) {
      this.taskQueue.splice(index, 1);
    }

    return selectedTask;
  }

  private adaptiveTaskSelection(tasks: ScheduledTask[]): ScheduledTask {
    // Calculate score for each task based on multiple factors
    const scoredTasks = tasks.map(task => {
      let score = 0;

      // Priority factor
      score += task.definition.priority * 100;

      // Age factor (tasks waiting longer get higher score)
      const age = Date.now() - task.scheduledAt;
      score += Math.min(age / 1000, 50); // Max 50 points for age

      // Deadline urgency
      if (task.definition.constraints.deadline) {
        const timeToDeadline = task.definition.constraints.deadline - Date.now();
        const urgency = Math.max(0, 1 - (timeToDeadline / (task.definition.estimatedDuration * 2)));
        score += urgency * 30;
      }

      // Resource availability
      if (this.allocator && this.config.enableResourceAwareness) {
        // Would check resource availability here
        score += 10; // Placeholder
      }

      return { task, score };
    });

    // Return task with highest score
    return scoredTasks.sort((a, b) => b.score - a.score)[0].task;
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    // Mark as running
    task.state = TaskState.RUNNING;
    task.startedAt = Date.now();
    task.attempts++;

    this.activeTasks.set(task.definition.id, task);
    this.statistics.scheduledTasks++;

    this.emit('task-started', { taskId: task.definition.id, task });

    try {
      // Allocate resources if needed
      if (this.allocator && task.definition.resourceRequirements.length > 0) {
        // Resource allocation would go here
      }

      // Execute task (this would integrate with Execution Engine)
      // For now, we'll simulate execution
      await this.simulateTaskExecution(task);

      // Mark as completed
      task.state = TaskState.COMPLETED;
      task.completedAt = Date.now();

      this.statistics.completedTasks++;

      // Update execution time statistics
      const executionTime = task.completedAt! - task.startedAt!;
      this.statistics.averageExecutionTime = 
        (this.statistics.averageExecutionTime * (this.statistics.completedTasks - 1) + 
         executionTime) / 
        this.statistics.completedTasks;

      this.emit('task-completed', { taskId: task.definition.id, task });

    } catch (error) {
      // Check if retry is possible
      if (task.retryCount < task.definition.retryPolicy.maxRetries) {
        task.state = TaskState.PENDING;
        task.retryCount++;
        
        // Calculate retry delay with backoff
        const delay = task.definition.retryPolicy.retryDelay * 
                     Math.pow(task.definition.retryPolicy.backoffMultiplier, task.retryCount);
        
        // Reschedule after delay
        setTimeout(() => {
          this.taskQueue.push(task);
          this.statistics.retryRate = 
            (this.statistics.retryRate * this.statistics.totalTasks + 1) / 
            (this.statistics.totalTasks + 1);
        }, delay);

        this.emit('task-retry', { taskId: task.definition.id, retryCount: task.retryCount });

      } else {
        task.state = TaskState.FAILED;
        task.completedAt = Date.now();
        task.error = error as Error;

        this.statistics.failedTasks++;
        this.emit('task-failed', { taskId: task.definition.id, task, error });
      }
    } finally {
      // Move from active to completed
      this.activeTasks.delete(task.definition.id);
      this.completedTasks.set(task.definition.id, task);

      // Update statistics
      this.updateStatistics();
    }
  }

  private async simulateTaskExecution(task: ScheduledTask): Promise<void> {
    const duration = task.definition.estimatedDuration;
    await new Promise(resolve => setTimeout(resolve, duration));
    task.result = { success: true, data: `Task ${task.definition.id} completed` };
  }

  private checkDependencies(task: ScheduledTask): boolean {
    const dependencies = this.taskDependencies.get(task.definition.id);
    
    if (!dependencies || dependencies.length === 0) {
      return true;
    }

    for (const dep of dependencies) {
      const depTask = this.completedTasks.get(dep.taskId);
      
      if (!depTask || depTask.state !== TaskState.COMPLETED) {
        return false;
      }

      // Check condition if provided
      if (dep.condition && !dep.condition(depTask.result)) {
        return false;
      }
    }

    task.dependenciesResolved = true;
    return true;
  }

  private checkConstraints(task: ScheduledTask): boolean {
    const constraints = task.definition.constraints;

    // Check start time constraint
    if (constraints.startTime && Date.now() < constraints.startTime) {
      return false;
    }

    // Check end time constraint
    if (constraints.endTime && Date.now() > constraints.endTime) {
      task.state = TaskState.DEFERRED;
      return false;
    }

    // Check deadline constraint
    if (constraints.deadline) {
      const timeToDeadline = constraints.deadline - Date.now();
      const estimatedDuration = task.definition.estimatedDuration;
      
      if (timeToDeadline < estimatedDuration) {
        // Cannot complete before deadline
        return false;
      }
    }

    // Check exclusive execution constraint
    if (constraints.requireExclusive) {
      // Check if any task with conflicting resource requirements is running
      // This would be more sophisticated with actual resource management
      return true;
    }

    return true;
  }

  private validateTask(task: TaskDefinition): void {
    if (!task.id || task.id.trim().length === 0) {
      throw new Error('Task ID is required');
    }

    if (!task.toolId || task.toolId.trim().length === 0) {
      throw new Error('Tool ID is required');
    }

    if (task.priority < ExecutionPriority.LOW || task.priority > ExecutionPriority.CRITICAL) {
      throw new Error('Invalid priority value');
    }

    if (task.timeout <= 0) {
      throw new Error('Timeout must be positive');
    }

    if (task.estimatedDuration < 0) {
      throw new Error('Estimated duration cannot be negative');
    }

    // Validate dependencies
    for (const dep of task.dependencies) {
      if (!dep.taskId || dep.taskId.trim().length === 0) {
        throw new Error('Dependency task ID is required');
      }
    }
  }

  private initializeStatistics(): void {
    this.statistics = {
      totalTasks: 0,
      scheduledTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      deferredTasks: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      throughput: 0,
      queueLength: 0,
      activeTasks: 0,
      retryRate: 0
    };
  }

  private updateStatistics(): void {
    this.statistics.queueLength = this.taskQueue.length;
    this.statistics.activeTasks = this.activeTasks.size;

    // Calculate average wait time
    const totalWaitTime = this.taskQueue.reduce((sum, task) => 
      sum + (Date.now() - task.scheduledAt), 0
    );
    
    this.statistics.averageWaitTime = this.taskQueue.length > 0 ?
      totalWaitTime / this.taskQueue.length : 0;

    // Calculate throughput (tasks per second)
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const recentCompletedTasks = Array.from(this.completedTasks.values())
      .filter(task => task.completedAt && (now - task.completedAt) < timeWindow);
    
    this.statistics.throughput = recentCompletedTasks.length / (timeWindow / 1000);
  }
}