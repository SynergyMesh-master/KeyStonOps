/**
 * MCP Level 4 Reflex Engine Interface
 * Self-repair capabilities through fault detection and recovery
 */

import { IEngine, IEngineConfig } from './core';

export enum FaultSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum FaultCategory {
  PERFORMANCE = 'performance',
  AVAILABILITY = 'availability',
  SECURITY = 'security',
  DATA_INTEGRITY = 'data_integrity',
  RESOURCE = 'resource',
  NETWORK = 'network'
}

export enum RecoveryStrategy {
  RESTART = 'restart',
  FAILOVER = 'failover',
  ROLLBACK = 'rollback',
  SCALE = 'scale',
  RECONFIGURE = 'reconfigure'
}

export interface IFault {
  id: string;
  type: string;
  category: FaultCategory;
  severity: FaultSeverity;
  detectedAt: Date;
  component: string;
  description: string;
  rootCause?: string;
  resolved: boolean;
}

export interface IRecoveryPlan {
  id: string;
  faultId: string;
  actions: Array<{
    strategy: RecoveryStrategy;
    description: string;
  }>;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface IReflexConfig extends IEngineConfig {
  config: {
    detectionIntervalMs: number;
    enableAutoRecovery: boolean;
    maxConcurrentRecoveries: number;
  };
}

export interface IReflexEngine extends IEngine {
  readonly config: IReflexConfig;
  detectFaults(): Promise<IFault[]>;
  generateRecoveryPlan(faultId: string): Promise<string>;
  executeRecoveryPlan(planId: string): Promise<any>;
}