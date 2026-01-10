/**
 * Policy Engine - Policy-based governance engine
 * 
 * Provides comprehensive policy definition, validation, and enforcement
 * for MCP governance with versioning and rollback support.
 * 
 * @module governance/policy/policy-engine
 */

import { EventEmitter } from 'events';

/**
 * Policy severity levels
 */
export enum PolicySeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Policy enforcement actions
 */
export enum PolicyAction {
  ALLOW = 'allow',
  DENY = 'deny',
  WARN = 'warn',
  AUDIT = 'audit'
}

/**
 * Policy condition operators
 */
export enum PolicyOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  MATCHES = 'matches',
  IN = 'in',
  NOT_IN = 'not_in'
}

/**
 * Policy condition definition
 */
export interface PolicyCondition {
  field: string;
  operator: PolicyOperator;
  value: unknown;
  negate?: boolean;
}

/**
 * Policy rule definition
 */
export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  conditions: PolicyCondition[];
  action: PolicyAction;
  severity: PolicySeverity;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Policy definition
 */
export interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: PolicyRule[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Policy evaluation context
 */
export interface PolicyContext {
  resource: string;
  action: string;
  subject: string;
  attributes: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  allowed: boolean;
  action: PolicyAction;
  matchedRules: PolicyRule[];
  violations: PolicyViolation[];
  context: PolicyContext;
  evaluatedAt: Date;
}

/**
 * Policy violation
 */
export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: PolicySeverity;
  message: string;
  context: PolicyContext;
}

/**
 * Policy version
 */
export interface PolicyVersion {
  version: string;
  policy: Policy;
  createdAt: Date;
  createdBy: string;
  changelog?: string;
}

/**
 * Policy engine configuration
 */
export interface PolicyEngineConfig {
  enableVersioning?: boolean;
  enableAudit?: boolean;
  defaultAction?: PolicyAction;
  maxVersions?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

/**
 * Policy Engine
 * 
 * Manages policy lifecycle, evaluation, and enforcement
 */
export class PolicyEngine extends EventEmitter {
  private policies: Map<string, Policy> = new Map();
  private versions: Map<string, PolicyVersion[]> = new Map();
  private config: Required<PolicyEngineConfig>;
  private cache: Map<string, PolicyEvaluationResult> = new Map();

  constructor(config: PolicyEngineConfig = {}) {
    super();
    this.config = {
      enableVersioning: config.enableVersioning ?? true,
      enableAudit: config.enableAudit ?? true,
      defaultAction: config.defaultAction ?? PolicyAction.DENY,
      maxVersions: config.maxVersions ?? 10,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTTL: config.cacheTTL ?? 300000 // 5 minutes
    };
  }

  /**
   * Register a new policy
   */
  async registerPolicy(policy: Policy): Promise<void> {
    // Validate policy
    this.validatePolicy(policy);

    // Store policy
    this.policies.set(policy.id, policy);

    // Create version if enabled
    if (this.config.enableVersioning) {
      this.createVersion(policy, 'system', 'Policy registered');
    }

    // Clear cache
    if (this.config.cacheEnabled) {
      this.cache.clear();
    }

    // Emit event
    this.emit('policy:registered', { policy });
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(policyId: string, updates: Partial<Policy>): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    // Create new version
    const updatedPolicy: Policy = {
      ...policy,
      ...updates,
      updatedAt: new Date()
    };

    // Validate updated policy
    this.validatePolicy(updatedPolicy);

    // Store updated policy
    this.policies.set(policyId, updatedPolicy);

    // Create version if enabled
    if (this.config.enableVersioning) {
      this.createVersion(updatedPolicy, 'system', 'Policy updated');
    }

    // Clear cache
    if (this.config.cacheEnabled) {
      this.cache.clear();
    }

    // Emit event
    this.emit('policy:updated', { policy: updatedPolicy });
  }

  /**
   * Delete a policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    // Remove policy
    this.policies.delete(policyId);

    // Clear cache
    if (this.config.cacheEnabled) {
      this.cache.clear();
    }

    // Emit event
    this.emit('policy:deleted', { policyId });
  }

  /**
   * Get a policy by ID
   */
  getPolicy(policyId: string): Policy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Evaluate policies against a context
   */
  async evaluate(context: PolicyContext): Promise<PolicyEvaluationResult> {
    // Check cache
    const cacheKey = this.getCacheKey(context);
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      return cached;
    }

    const matchedRules: PolicyRule[] = [];
    const violations: PolicyViolation[] = [];
    let finalAction = this.config.defaultAction;

    // Evaluate all enabled policies
    for (const policy of this.policies.values()) {
      if (!policy.enabled) continue;

      // Evaluate each rule
      for (const rule of policy.rules) {
        if (!rule.enabled) continue;

        if (this.evaluateRule(rule, context)) {
          matchedRules.push(rule);

          // Check for violations
          if (rule.action === PolicyAction.DENY || rule.action === PolicyAction.WARN) {
            violations.push({
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              message: `Policy violation: ${rule.description}`,
              context
            });
          }

          // Update final action (most restrictive wins)
          if (this.isMoreRestrictive(rule.action, finalAction)) {
            finalAction = rule.action;
          }
        }
      }
    }

    const result: PolicyEvaluationResult = {
      allowed: finalAction === PolicyAction.ALLOW || finalAction === PolicyAction.WARN,
      action: finalAction,
      matchedRules,
      violations,
      context,
      evaluatedAt: new Date()
    };

    // Cache result
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), this.config.cacheTTL);
    }

    // Emit event
    this.emit('policy:evaluated', { result });

    // Audit if enabled
    if (this.config.enableAudit) {
      this.emit('policy:audit', { result });
    }

    return result;
  }

  /**
   * Evaluate a single rule against context
   */
  private evaluateRule(rule: PolicyRule, context: PolicyContext): boolean {
    // All conditions must match (AND logic)
    return rule.conditions.every(condition => 
      this.evaluateCondition(condition, context)
    );
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PolicyCondition, context: PolicyContext): boolean {
    const value = this.getContextValue(condition.field, context);
    let result = false;

    switch (condition.operator) {
      case PolicyOperator.EQUALS:
        result = value === condition.value;
        break;
      case PolicyOperator.NOT_EQUALS:
        result = value !== condition.value;
        break;
      case PolicyOperator.CONTAINS:
        result = String(value).includes(String(condition.value));
        break;
      case PolicyOperator.NOT_CONTAINS:
        result = !String(value).includes(String(condition.value));
        break;
      case PolicyOperator.GREATER_THAN:
        result = Number(value) > Number(condition.value);
        break;
      case PolicyOperator.LESS_THAN:
        result = Number(value) < Number(condition.value);
        break;
      case PolicyOperator.MATCHES:
        result = new RegExp(String(condition.value)).test(String(value));
        break;
      case PolicyOperator.IN:
        result = Array.isArray(condition.value) && condition.value.includes(value);
        break;
      case PolicyOperator.NOT_IN:
        result = Array.isArray(condition.value) && !condition.value.includes(value);
        break;
    }

    return condition.negate ? !result : result;
  }

  /**
   * Get value from context by field path
   */
  private getContextValue(field: string, context: PolicyContext): unknown {
    const parts = field.split('.');
    let value: unknown = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Check if action is more restrictive
   */
  private isMoreRestrictive(action1: PolicyAction, action2: PolicyAction): boolean {
    const restrictiveness = {
      [PolicyAction.DENY]: 4,
      [PolicyAction.WARN]: 3,
      [PolicyAction.AUDIT]: 2,
      [PolicyAction.ALLOW]: 1
    };

    return restrictiveness[action1] > restrictiveness[action2];
  }

  /**
   * Validate policy structure
   */
  private validatePolicy(policy: Policy): void {
    if (!policy.id || !policy.name || !policy.version) {
      throw new Error('Policy must have id, name, and version');
    }

    if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
      throw new Error('Policy must have at least one rule');
    }

    // Validate each rule
    for (const rule of policy.rules) {
      if (!rule.id || !rule.name) {
        throw new Error('Rule must have id and name');
      }

      if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
        throw new Error('Rule must have at least one condition');
      }
    }
  }

  /**
   * Create a policy version
   */
  private createVersion(policy: Policy, createdBy: string, changelog?: string): void {
    const version: PolicyVersion = {
      version: policy.version,
      policy: { ...policy },
      createdAt: new Date(),
      createdBy,
      changelog
    };

    const versions = this.versions.get(policy.id) || [];
    versions.push(version);

    // Limit versions
    if (versions.length > this.config.maxVersions) {
      versions.shift();
    }

    this.versions.set(policy.id, versions);
  }

  /**
   * Get policy versions
   */
  getVersions(policyId: string): PolicyVersion[] {
    return this.versions.get(policyId) || [];
  }

  /**
   * Rollback to a specific version
   */
  async rollback(policyId: string, version: string): Promise<void> {
    const versions = this.versions.get(policyId);
    if (!versions) {
      throw new Error(`No versions found for policy: ${policyId}`);
    }

    const targetVersion = versions.find(v => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version not found: ${version}`);
    }

    // Restore policy
    await this.updatePolicy(policyId, targetVersion.policy);

    // Emit event
    this.emit('policy:rollback', { policyId, version });
  }

  /**
   * Generate cache key for context
   */
  private getCacheKey(context: PolicyContext): string {
    return `${context.resource}:${context.action}:${context.subject}:${JSON.stringify(context.attributes)}`;
  }

  /**
   * Clear policy cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache:cleared');
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalPolicies: number;
    enabledPolicies: number;
    totalRules: number;
    cacheSize: number;
    totalVersions: number;
  } {
    const policies = Array.from(this.policies.values());
    const enabledPolicies = policies.filter(p => p.enabled);
    const totalRules = policies.reduce((sum, p) => sum + p.rules.length, 0);
    const totalVersions = Array.from(this.versions.values()).reduce((sum, v) => sum + v.length, 0);

    return {
      totalPolicies: policies.length,
      enabledPolicies: enabledPolicies.length,
      totalRules,
      cacheSize: this.cache.size,
      totalVersions
    };
  }
}

/**
 * Create a policy engine instance
 */
export function createPolicyEngine(config?: PolicyEngineConfig): PolicyEngine {
  return new PolicyEngine(config);
}

export default PolicyEngine;