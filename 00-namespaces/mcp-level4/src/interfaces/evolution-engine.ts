/**
 * MCP Level 4 Evolution Engine Interface
 * 
 * Provides self-evolution capabilities through performance analysis,
 * optimization execution, A/B testing, and continuous improvement.
 * 
 * @module evolution-engine
 * @version 1.0.0
 */

import { IEngine, IEngineConfig } from './core';

export enum OptimizationStrategy {
  PERFORMANCE = 'performance',
  COST = 'cost',
  RELIABILITY = 'reliability',
  SCALABILITY = 'scalability',
  BALANCED = 'balanced'
}

export enum EvolutionPhase {
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  VALIDATION = 'validation',
  ROLLBACK = 'rollback'
}

export interface IPerformanceBaseline {
  id: string;
  name: string;
  createdAt: Date;
  metrics: {
    avgLatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    throughputRps: number;
    errorRate: number;
    cpuPercent: number;
    memoryMB: number;
    costPerHour: number;
  };
  configuration: Record<string, any>;
  isCurrent: boolean;
}

export interface IOptimizationCandidate {
  id: string;
  name: string;
  type: 'configuration' | 'algorithm' | 'architecture' | 'resource';
  description: string;
  changes: Array<{
    component: string;
    parameter: string;
    currentValue: any;
    proposedValue: any;
    rationale: string;
  }>;
  expectedImprovements: {
    latencyReduction?: number;
    throughputIncrease?: number;
    errorRateReduction?: number;
    costReduction?: number;
    reliabilityIncrease?: number;
  };
  risk: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigations: string[];
  };
  effort: {
    hours: number;
    complexity: 'low' | 'medium' | 'high';
  };
  priorityScore: number;
}

export interface IABTestConfig {
  id: string;
  name: string;
  description: string;
  controlVariant: {
    name: string;
    configuration: Record<string, any>;
  };
  treatmentVariants: Array<{
    name: string;
    configuration: Record<string, any>;
    trafficPercent: number;
  }>;
  successMetrics: Array<{
    name: string;
    target: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  }>;
  durationHours: number;
  minSampleSize: number;
  significanceLevel: number;
  autoPromote: boolean;
}

export interface IABTestResult {
  testId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  variantResults: Array<{
    variantName: string;
    sampleSize: number;
    metrics: Record<string, number>;
    conversionRate?: number;
  }>;
  winner?: string;
  isStatisticallySignificant: boolean;
  confidenceLevel: number;
  recommendations: string[];
}

export interface IEvolutionPlan {
  id: string;
  name: string;
  createdAt: Date;
  strategy: OptimizationStrategy;
  currentPhase: EvolutionPhase;
  candidates: IOptimizationCandidate[];
  selectedCandidates: string[];
  abTests: IABTestConfig[];
  rolloutPlan: {
    stages: Array<{
      name: string;
      trafficPercent: number;
      durationHours: number;
      successCriteria: string[];
    }>;
    rollbackTriggers: string[];
  };
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface IEvolutionConfig extends IEngineConfig {
  config: {
    analysisIntervalMs: number;
    optimizationStrategy: OptimizationStrategy;
    enableAutoOptimization: boolean;
    requireApprovalForHighRisk: boolean;
    maxConcurrentABTests: number;
    minImprovementThreshold: number;
    baselineRetentionDays: number;
    enableMLOptimization: boolean;
    mlModelConfig?: {
      modelType: string;
      trainingDataDays: number;
      retrainingIntervalDays: number;
    };
  };
}

export interface IEvolutionEngine extends IEngine {
  readonly config: IEvolutionConfig;
  
  analyzePerformance(): Promise<{
    currentBaseline: IPerformanceBaseline;
    trends: Array<{
      metric: string;
      trend: 'improving' | 'stable' | 'degrading';
      changePercent: number;
    }>;
    bottlenecks: Array<{
      component: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  }>;
  
  createBaseline(name: string): Promise<string>;
  getBaseline(baselineId: string): Promise<IPerformanceBaseline | undefined>;
  getCurrentBaseline(): Promise<IPerformanceBaseline>;
  compareBaselines(baselineId1: string, baselineId2: string): Promise<{
    improvements: Record<string, number>;
    regressions: Record<string, number>;
    overallScore: number;
  }>;
  
  generateCandidates(strategy: OptimizationStrategy): Promise<IOptimizationCandidate[]>;
  evaluateCandidate(candidateId: string): Promise<{
    feasibility: number;
    expectedImpact: number;
    risk: number;
    recommendation: 'approve' | 'reject' | 'modify';
    reasoning: string;
  }>;
  
  createEvolutionPlan(name: string, strategy: OptimizationStrategy, candidateIds: string[]): Promise<string>;
  getEvolutionPlan(planId: string): Promise<IEvolutionPlan | undefined>;
  approveEvolutionPlan(planId: string, approvedBy: string): Promise<void>;
  executeEvolutionPlan(planId: string): Promise<any>;
  
  createABTest(config: Omit<IABTestConfig, 'id'>): Promise<string>;
  startABTest(testId: string): Promise<void>;
  stopABTest(testId: string): Promise<void>;
  getABTestResult(testId: string): Promise<IABTestResult>;
  getActiveABTests(): Promise<IABTestConfig[]>;
  
  rollback(baselineId: string): Promise<void>;
  
  getEvolutionHistory(limit?: number): Promise<Array<{
    timestamp: Date;
    phase: EvolutionPhase;
    action: string;
    result: 'success' | 'failure';
    details: any;
  }>>;
}