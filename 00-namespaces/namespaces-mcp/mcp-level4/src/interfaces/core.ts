/**
 * MCP Level 4 Core Interfaces
 * 
 * Defines the foundational interfaces for all Level 4 semantic autonomy engines.
 * These interfaces establish the contract for self-managing, self-evolving systems.
 * 
 * @module core
 * @version 1.0.0
 */

/**
 * Engine execution status
 */
export enum EngineStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  TERMINATED = 'terminated'
}

/**
 * Engine autonomy level
 */
export enum AutonomyLevel {
  HIGH = 'high',      // Full autonomy with minimal human intervention
  MEDIUM = 'medium',  // Balanced autonomy with approval gates
  LOW = 'low'         // Human-in-the-loop for critical decisions
}

/**
 * Engine priority level
 */
export enum Priority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Base configuration for all engines
 */
export interface IEngineConfig {
  id: string;
  name: string;
  version: string;
  autonomyLevel: AutonomyLevel;
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
  maxRetries: number;
  retryBackoff: 'linear' | 'exponential';
  config: Record<string, any>;
  dependencies: string[];
  tags: string[];
}

/**
 * Engine execution metrics
 */
export interface IEngineMetrics {
  executionCount: number;
  successCount: number;
  failureCount: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  lastExecutionAt: Date;
  lastSuccessAt: Date;
  lastFailureAt: Date;
  errorRate: number;
  resources: {
    cpuPercent: number;
    memoryMB: number;
    diskMB: number;
    networkKBps: number;
  };
}

/**
 * Base interface for all Level 4 engines
 */
export interface IEngine {
  readonly config: IEngineConfig;
  readonly status: EngineStatus;
  readonly metrics: IEngineMetrics;
  
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  execute(context: any): Promise<any>;
  getHealth(): Promise<any>;
  updateConfig(config: Partial<IEngineConfig>): Promise<void>;
  getMetrics(): IEngineMetrics;
  resetMetrics(): Promise<void>;
}