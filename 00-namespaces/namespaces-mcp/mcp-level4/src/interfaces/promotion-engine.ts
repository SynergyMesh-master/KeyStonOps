/**
 * MCP Level 4 Promotion Engine Interface
 * Self-promotion through deployment automation
 */

import { IEngine, IEngineConfig } from './core';

export enum DeploymentEnvironment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

export enum DeploymentStrategy {
  BLUE_GREEN = 'blue_green',
  CANARY = 'canary',
  ROLLING = 'rolling'
}

export interface IPromotionRequest {
  id: string;
  artifactId: string;
  sourceEnvironment: DeploymentEnvironment;
  targetEnvironment: DeploymentEnvironment;
  strategy: DeploymentStrategy;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed';
}

export interface IPromotionConfig extends IEngineConfig {
  config: {
    enableAutoPromotion: boolean;
    defaultStrategy: DeploymentStrategy;
    validationChecks: string[];
  };
}

export interface IPromotionEngine extends IEngine {
  readonly config: IPromotionConfig;
  createPromotionRequest(request: Omit<IPromotionRequest, 'id' | 'status'>): Promise<string>;
  executePromotion(requestId: string): Promise<any>;
  rollbackPromotion(requestId: string): Promise<void>;
}