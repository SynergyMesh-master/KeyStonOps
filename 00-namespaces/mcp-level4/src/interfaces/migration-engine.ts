/**
 * MCP Level 4 Migration Engine Interface
 * Self-migration for workload optimization
 */

import { IEngine, IEngineConfig } from './core';

export enum MigrationType {
  WORKLOAD = 'workload',
  DATA = 'data',
  SERVICE = 'service'
}

export interface IMigrationPlan {
  id: string;
  type: MigrationType;
  sourceLocation: string;
  targetLocation: string;
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
}

export interface IMigrationConfig extends IEngineConfig {
  config: {
    enableAutoMigration: boolean;
    enableZeroDowntime: boolean;
    maxConcurrentMigrations: number;
  };
}

export interface IMigrationEngine extends IEngine {
  readonly config: IMigrationConfig;
  createMigrationPlan(plan: Omit<IMigrationPlan, 'id' | 'status'>): Promise<string>;
  executeMigrationPlan(planId: string): Promise<string>;
  rollbackMigration(executionId: string): Promise<void>;
}