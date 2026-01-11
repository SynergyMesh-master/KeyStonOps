/**
 * MCP Level 4 Governance Engine Interface
 * Self-governance for policy management and autonomous decisions
 */

import { IEngine, IEngineConfig, AutonomyLevel } from './core';

export enum PolicyType {
  ACCESS_CONTROL = 'access_control',
  RESOURCE_QUOTA = 'resource_quota',
  SECURITY = 'security',
  COMPLIANCE = 'compliance'
}

export interface IGovernancePolicy {
  id: string;
  name: string;
  type: PolicyType;
  rules: Array<{ id: string; condition: string; action: string }>;
  enforcementMode: 'enforce' | 'audit' | 'warn';
}

export interface IGovernanceDecision {
  id: string;
  type: 'approval' | 'rejection' | 'escalation';
  timestamp: Date;
  outcome: 'approved' | 'rejected' | 'escalated';
  rationale: string;
  confidenceScore: number;
  autonomyLevel: AutonomyLevel;
}

export interface IGovernanceConfig extends IEngineConfig {
  config: {
    enableAutonomousDecisions: boolean;
    decisionAutonomyLevel: AutonomyLevel;
    decisionConfidenceThreshold: number;
    enablePolicyEnforcement: boolean;
  };
}

export interface IGovernanceEngine extends IEngine {
  readonly config: IGovernanceConfig;
  createPolicy(policy: Omit<IGovernancePolicy, 'id'>): Promise<string>;
  evaluatePolicies(context: any): Promise<{ allowed: boolean; appliedPolicies: string[] }>;
  makeDecision(request: any): Promise<string>;
  getDecision(decisionId: string): Promise<IGovernanceDecision | undefined>;
}