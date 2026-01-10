/**
 * MCP Workflow Orchestrator
 * 
 * Advanced workflow orchestration with complex dependency management,
 * conditional execution, and comprehensive error handling.
 * 
 * @version 1.0.0
 * @author Machine Native Ops
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { TaskDefinition, TaskState, ScheduledTask, MCPTaskScheduler } from './task-scheduler';

/**
 * Workflow State
 */
export enum WorkflowState {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

/**
 * Task Execution Mode
 */
export enum ExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  HYBRID = 'hybrid',
  CONDITIONAL = 'conditional'
}

/**
 * Workflow Step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;
  tasks: TaskDefinition[];
  executionMode: ExecutionMode;
  dependencies: string[]; // Step IDs that must complete first
  condition?: (context: WorkflowContext) => boolean;
  onError: 'continue' | 'stop' | 'retry';
  retryPolicy?: {
    maxRetries: number;
    delay: number;
  };
}

/**
 * Workflow Definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  steps: WorkflowStep[];
  globalTimeout: number;
  maxRetries: number;
  metadata: Record<string, any>;
  variables: Record<string, any>;
}

/**
 * Workflow Context
 */
export interface WorkflowContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  stepResults: Map<string, any>;
  taskResults: Map<string, any>;
  errors: Error[];
  metadata: Record<string, any>;
  startTime: number;
  endTime?: number;
}

/**
 * Workflow Execution
 */
export interface WorkflowExecution {
  id: string;
  definition: WorkflowDefinition;
  state: WorkflowState;
  context: WorkflowContext;
  currentStep: number;
  completedSteps: string[];
  failedSteps: string[];
  startedAt: number;
  completedAt?: number;
  progress: number;
  error?: Error;
}

/**
 * Workflow Statistics
 */
export interface WorkflowStatistics {
  totalWorkflows: number;
  runningWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageExecutionTime: number;
  averageStepCount: number;
  successRate: number;
}

/**
 * Orchestrator Configuration
 */
export interface OrchestratorConfig {
  maxConcurrentWorkflows: number;
  enableCheckpointing: boolean;
  checkpointInterval: number;
  enableProgressTracking: boolean;
  enableMetrics: boolean;
  defaultTimeout: number;
  retryOnFailure: boolean;
}

/**
 * MCP Workflow Orchestrator
 */
export class MCPWorkflowOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private scheduler: MCPTaskScheduler;
  private workflows: Map<string, WorkflowExecution> = new Map();
  private workflowHistory: Map<string, WorkflowExecution> = new Map();
  private workflowDefinitions: Map<string, WorkflowDefinition> = new Map();
  private statistics: WorkflowStatistics;
  private isRunning: boolean = false;
  private orchestratorLoop: NodeJS.Timeout | null = null;

  constructor(
    scheduler: MCPTaskScheduler,
    config?: Partial<OrchestratorConfig>
  ) {
    super();
    
    this.scheduler = scheduler;
    this.config = {
      maxConcurrentWorkflows: 50,
      enableCheckpointing: true,
      checkpointInterval: 10000, // 10 seconds
      enableProgressTracking: true,
      enableMetrics: true,
      defaultTimeout: 300000, // 5 minutes
      retryOnFailure: true,
      ...config
    };

    this.initializeStatistics();
    this.start();
  }

  /**
   * Register workflow definition
   */
  public registerWorkflow(definition: WorkflowDefinition): void {
    // Validate workflow definition
    this.validateWorkflowDefinition(definition);

    // Store definition
    this.workflowDefinitions.set(definition.id, definition);

    this.emit('workflow-registered', { workflowId: definition.id, definition });
  }

  /**
   * Unregister workflow definition
   */
  public unregisterWorkflow(workflowId: string): void {
    this.workflowDefinitions.delete(workflowId);
    this.emit('workflow-unregistered', { workflowId });
  }

  /**
   * Execute a workflow
   */
  public async execute(
    workflowId: string,
    variables?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const definition = this.workflowDefinitions.get(workflowId);
    
    if (!definition) {
      throw new Error(`Workflow definition not found: ${workflowId}`);
    }

    // Create workflow execution
    const execution: WorkflowExecution = {
      id: uuidv4(),
      definition,
      state: WorkflowState.PENDING,
      context: {
        workflowId,
        executionId: uuidv4(),
        variables: { ...definition.variables, ...variables },
        stepResults: new Map(),
        taskResults: new Map(),
        errors: [],
        metadata: {},
        startTime: Date.now()
      },
      currentStep: 0,
      completedSteps: [],
      failedSteps: [],
      startedAt: Date.now(),
      progress: 0
    };

    // Check capacity
    const runningWorkflows = Array.from(this.workflows.values())
      .filter(w => w.state === WorkflowState.RUNNING).length;
    
    if (runningWorkflows >= this.config.maxConcurrentWorkflows) {
      throw new Error('Maximum concurrent workflows reached');
    }

    // Add to active workflows
    this.workflows.set(execution.id, execution);
    this.statistics.totalWorkflows++;

    this.emit('workflow-started', { executionId: execution.id, execution });

    // Execute workflow
    await this.executeWorkflow(execution);

    return execution;
  }

  /**
   * Pause a workflow execution
   */
  public pauseWorkflow(executionId: string): void {
    const execution = this.workflows.get(executionId);
    
    if (execution) {
      execution.state = WorkflowState.PAUSED;
      this.emit('workflow-paused', { executionId, execution });
    }
  }

  /**
   * Resume a workflow execution
   */
  public async resumeWorkflow(executionId: string): Promise<void> {
    const execution = this.workflows.get(executionId);
    
    if (execution && execution.state === WorkflowState.PAUSED) {
      execution.state = WorkflowState.RUNNING;
      this.emit('workflow-resumed', { executionId, execution });
      await this.executeWorkflow(execution);
    }
  }

  /**
   * Cancel a workflow execution
   */
  public cancelWorkflow(executionId: string): void {
    const execution = this.workflows.get(executionId);
    
    if (execution) {
      execution.state = WorkflowState.CANCELLED;
      execution.completedAt = Date.now();
      
      // Cancel all associated tasks
      this.cancelWorkflowTasks(execution);
      
      this.emit('workflow-cancelled', { executionId, execution });
    }
  }

  /**
   * Get workflow execution
   */
  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.workflows.get(executionId) || 
           this.workflowHistory.get(executionId);
  }

  /**
   * Get active workflows
   */
  public getActiveWorkflows(): WorkflowExecution[] {
    return Array.from(this.workflows.values())
      .filter(w => w.state === WorkflowState.RUNNING);
  }

  /**
   * Get workflow statistics
   */
  public getStatistics(): WorkflowStatistics {
    this.updateStatistics();
    return { ...this.statistics };
  }

  /**
   * Get workflow definition
   */
  public getDefinition(workflowId: string): WorkflowDefinition | undefined {
    return this.workflowDefinitions.get(workflowId);
  }

  /**
   * Destroy orchestrator
   */
  public destroy(): void {
    this.isRunning = false;

    if (this.orchestratorLoop) {
      clearTimeout(this.orchestratorLoop);
      this.orchestratorLoop = null;
    }

    // Cancel all active workflows
    for (const [id] of this.workflows) {
      this.cancelWorkflow(id);
    }

    this.workflows.clear();
    this.workflowHistory.clear();
    this.workflowDefinitions.clear();

    this.emit('destroyed');
  }

  // Private methods

  private start(): void {
    this.isRunning = true;
    this.runOrchestratorLoop();
  }

  private runOrchestratorLoop(): void {
    if (!this.isRunning) {
      return;
    }

    // Process active workflows
    for (const [executionId, execution] of this.workflows.entries()) {
      if (execution.state === WorkflowState.RUNNING) {
        this.processWorkflow(execution).catch(error => {
          this.handleWorkflowError(executionId, error);
        });
      }
    }

    // Continue loop
    this.orchestratorLoop = setTimeout(() => this.runOrchestratorLoop(), 100);
  }

  private async executeWorkflow(execution: WorkflowExecution): Promise<void> {
    execution.state = WorkflowState.RUNNING;

    try {
      // Execute each step in order
      for (let i = 0; i < execution.definition.steps.length; i++) {
        const step = execution.definition.steps[i];
        execution.currentStep = i;

        // Check dependencies
        if (!this.checkStepDependencies(execution, step)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        // Check condition
        if (step.condition && !step.condition(execution.context)) {
          execution.completedSteps.push(step.id);
          continue;
        }

        // Execute step
        const stepResult = await this.executeStep(execution, step);
        execution.context.stepResults.set(step.id, stepResult);

        if (stepResult.success) {
          execution.completedSteps.push(step.id);
        } else {
          execution.failedSteps.push(step.id);

          if (step.onError === 'stop') {
            throw new Error(`Step ${step.id} failed and workflow is configured to stop`);
          }
        }

        // Update progress
        execution.progress = (execution.completedSteps.length / execution.definition.steps.length) * 100;

        this.emit('step-completed', { 
          executionId: execution.id, 
          stepId: step.id, 
          progress: execution.progress 
        });

        // Check timeout
        if (execution.definition.globalTimeout > 0) {
          const elapsed = Date.now() - execution.startedAt;
          if (elapsed > execution.definition.globalTimeout) {
            execution.state = WorkflowState.TIMEOUT;
            throw new Error('Workflow timeout exceeded');
          }
        }
      }

      // Workflow completed successfully
      execution.state = WorkflowState.COMPLETED;
      execution.completedAt = Date.now();
      execution.context.endTime = Date.now();

      this.statistics.completedWorkflows++;
      this.updateStatistics();

      // Move to history
      this.workflows.delete(execution.id);
      this.workflowHistory.set(execution.id, execution);

      this.emit('workflow-completed', { executionId: execution.id, execution });

    } catch (error) {
      this.handleWorkflowError(execution.id, error as Error);
    }
  }

  private async executeStep(
    execution: WorkflowExecution,
    step: WorkflowStep
  ): Promise<{ success: boolean; results: any[] }> {
    const results: any[] = [];

    switch (step.executionMode) {
      case ExecutionMode.SEQUENTIAL:
        for (const task of step.tasks) {
          const result = await this.executeTask(execution, task);
          results.push(result);
          
          if (!result.success && step.onError === 'stop') {
            break;
          }
        }
        break;

      case ExecutionMode.PARALLEL:
        const promises = step.tasks.map(task => this.executeTask(execution, task));
        const parallelResults = await Promise.allSettled(promises);
        
        for (const promiseResult of parallelResults) {
          if (promiseResult.status === 'fulfilled') {
            results.push(promiseResult.value);
          } else {
            results.push({ success: false, error: promiseResult.reason });
          }
        }
        break;

      case ExecutionMode.HYBRID:
        // Execute tasks in parallel but respect dependencies
        const taskGroups = this.groupTasksByDependencies(step.tasks);
        
        for (const group of taskGroups) {
          const groupPromises = group.map(task => this.executeTask(execution, task));
          const groupResults = await Promise.allSettled(groupPromises);
          
          for (const promiseResult of groupResults) {
            if (promiseResult.status === 'fulfilled') {
              results.push(promiseResult.value);
            } else {
              results.push({ success: false, error: promiseResult.reason });
            }
          }
        }
        break;

      case ExecutionMode.CONDITIONAL:
        for (const task of step.tasks) {
          // Check task condition
          const condition = task.metadata?.condition;
          if (condition && !condition(execution.context)) {
            continue;
          }

          const result = await this.executeTask(execution, task);
          results.push(result);
        }
        break;
    }

    const success = results.every(r => r.success);
    return { success, results };
  }

  private async executeTask(
    execution: WorkflowExecution,
    task: TaskDefinition
  ): Promise<any> {
    // Schedule task through scheduler
    const taskId = await this.scheduler.schedule(task);

    // Wait for task completion
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.scheduler.cancelTask(taskId);
        reject(new Error('Task timeout'));
      }, task.timeout);

      const checkInterval = setInterval(() => {
        const scheduledTask = this.scheduler.getTask(taskId);
        
        if (scheduledTask && 
            (scheduledTask.state === TaskState.COMPLETED || 
             scheduledTask.state === TaskState.FAILED ||
             scheduledTask.state === TaskState.CANCELLED)) {
          clearInterval(checkInterval);
          clearTimeout(timeout);

          if (scheduledTask.state === TaskState.COMPLETED) {
            execution.context.taskResults.set(taskId, scheduledTask.result);
            resolve(scheduledTask.result);
          } else {
            reject(new Error(`Task failed: ${taskId}`));
          }
        }
      }, 100);
    });
  }

  private processWorkflow(execution: WorkflowExecution): Promise<void> {
    // Workflow processing is handled in executeWorkflow
    return Promise.resolve();
  }

  private handleWorkflowError(executionId: string, error: Error): void {
    const execution = this.workflows.get(executionId);
    
    if (execution) {
      execution.state = WorkflowState.FAILED;
      execution.error = error;
      execution.completedAt = Date.now();
      execution.context.endTime = Date.now();

      this.statistics.failedWorkflows++;
      this.updateStatistics();

      // Move to history
      this.workflows.delete(executionId);
      this.workflowHistory.set(executionId, execution);

      this.emit('workflow-failed', { executionId, execution, error });
    }
  }

  private cancelWorkflowTasks(execution: WorkflowExecution): void {
    for (const [taskId] of execution.context.taskResults) {
      this.scheduler.cancelTask(taskId);
    }
  }

  private checkStepDependencies(execution: WorkflowExecution, step: WorkflowStep): boolean {
    return step.dependencies.every(depId => 
      execution.completedSteps.includes(depId)
    );
  }

  private groupTasksByDependencies(tasks: TaskDefinition[]): TaskDefinition[][] {
    // Group tasks by dependencies
    const groups: TaskDefinition[][] = [];
    const processed = new Set<string>();

    while (processed.size < tasks.length) {
      const currentGroup: TaskDefinition[] = [];
      
      for (const task of tasks) {
        if (processed.has(task.id)) {
          continue;
        }

        const dependenciesMet = task.dependencies.every(dep => 
          processed.has(dep.taskId)
        );

        if (dependenciesMet) {
          currentGroup.push(task);
          processed.add(task.id);
        }
      }

      if (currentGroup.length === 0) {
        break; // Circular dependency detected
      }

      groups.push(currentGroup);
    }

    return groups;
  }

  private validateWorkflowDefinition(definition: WorkflowDefinition): void {
    if (!definition.id || definition.id.trim().length === 0) {
      throw new Error('Workflow ID is required');
    }

    if (!definition.name || definition.name.trim().length === 0) {
      throw new Error('Workflow name is required');
    }

    if (definition.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    // Validate steps
    for (const step of definition.steps) {
      if (!step.id || step.id.trim().length === 0) {
        throw new Error('Step ID is required');
      }

      if (step.tasks.length === 0) {
        throw new Error(`Step ${step.id} must have at least one task`);
      }

      // Validate step dependencies
      for (const depId of step.dependencies) {
        const depExists = definition.steps.some(s => s.id === depId);
        if (!depExists) {
          throw new Error(`Step dependency not found: ${depId}`);
        }
      }
    }
  }

  private initializeStatistics(): void {
    this.statistics = {
      totalWorkflows: 0,
      runningWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      averageExecutionTime: 0,
      averageStepCount: 0,
      successRate: 0
    };
  }

  private updateStatistics(): void {
    this.statistics.runningWorkflows = Array.from(this.workflows.values())
      .filter(w => w.state === WorkflowState.RUNNING).length;

    // Calculate success rate
    const totalCompleted = this.statistics.completedWorkflows + this.statistics.failedWorkflows;
    if (totalCompleted > 0) {
      this.statistics.successRate = 
        (this.statistics.completedWorkflows / totalCompleted) * 100;
    }

    // Calculate average execution time
    const completedWorkflows = Array.from(this.workflowHistory.values())
      .filter(w => w.state === WorkflowState.COMPLETED);
    
    if (completedWorkflows.length > 0) {
      const totalTime = completedWorkflows.reduce((sum, w) => 
        sum + (w.completedAt! - w.startedAt), 0
      );
      this.statistics.averageExecutionTime = totalTime / completedWorkflows.length;
    }

    // Calculate average step count
    if (this.workflowDefinitions.size > 0) {
      const totalSteps = Array.from(this.workflowDefinitions.values())
        .reduce((sum, wf) => sum + wf.steps.length, 0);
      this.statistics.averageStepCount = totalSteps / this.workflowDefinitions.size;
    }
  }
}