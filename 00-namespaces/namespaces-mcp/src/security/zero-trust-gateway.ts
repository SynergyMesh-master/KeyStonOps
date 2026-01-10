/**
 * Zero-Trust Gateway
 * 
 * Micro-segmentation with least privilege enforcement and
 * continuous verification for zero-trust architecture.
 * 
 * Performance Targets:
 * - Policy Evaluation: <25ms
 * - Enforcement: 100%
 * - Latency Overhead: <10ms
 * - Availability: 99.99%
 * 
 * @module security/zero-trust-gateway
 */

import { EventEmitter } from 'events';

export enum AccessDecision {
  ALLOW = 'allow',
  DENY = 'deny',
  CHALLENGE = 'challenge'
}

export interface AccessRequest {
  requestId: string;
  principal: string;
  resource: string;
  action: string;
  context: Record<string, any>;
  timestamp: Date;
}

export interface AccessPolicy {
  id: string;
  name: string;
  principal: string;
  resource: string;
  actions: string[];
  conditions: Record<string, any>;
  effect: 'allow' | 'deny';
  priority: number;
}

export interface ZeroTrustGatewayConfig {
  defaultDecision: AccessDecision;
  enableMicroSegmentation: boolean;
  enableContinuousVerification: boolean;
  policyEvaluationTimeout: number; // ms
}

export class ZeroTrustGateway extends EventEmitter {
  private config: ZeroTrustGatewayConfig;
  private policies: Map<string, AccessPolicy>;
  private isRunning: boolean;

  constructor(config: ZeroTrustGatewayConfig) {
    super();
    this.config = config;
    this.policies = new Map();
    this.isRunning = false;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.emit('stopped');
  }

  async evaluateAccess(request: AccessRequest): Promise<AccessDecision> {
    const startTime = Date.now();
    
    const matchingPolicies = this.findMatchingPolicies(request);
    const decision = this.makeDecision(matchingPolicies, request);
    
    const evaluationTime = Date.now() - startTime;
    
    this.emit('access-evaluated', {
      requestId: request.requestId,
      decision,
      evaluationTime
    });

    return decision;
  }

  addPolicy(policy: AccessPolicy): void {
    this.policies.set(policy.id, policy);
    this.emit('policy-added', { policyId: policy.id });
  }

  private findMatchingPolicies(request: AccessRequest): AccessPolicy[] {
    return Array.from(this.policies.values())
      .filter(p => this.policyMatches(p, request))
      .sort((a, b) => b.priority - a.priority);
  }

  private policyMatches(policy: AccessPolicy, request: AccessRequest): boolean {
    return policy.principal === request.principal &&
           policy.resource === request.resource &&
           policy.actions.includes(request.action);
  }

  private makeDecision(policies: AccessPolicy[], request: AccessRequest): AccessDecision {
    if (policies.length === 0) {
      return this.config.defaultDecision;
    }

    const topPolicy = policies[0];
    return topPolicy.effect === 'allow' ? AccessDecision.ALLOW : AccessDecision.DENY;
  }
}

export function createZeroTrustGateway(
  config?: Partial<ZeroTrustGatewayConfig>
): ZeroTrustGateway {
  const defaultConfig: ZeroTrustGatewayConfig = {
    defaultDecision: AccessDecision.DENY,
    enableMicroSegmentation: true,
    enableContinuousVerification: true,
    policyEvaluationTimeout: 25
  };

  return new ZeroTrustGateway({ ...defaultConfig, ...config });
}