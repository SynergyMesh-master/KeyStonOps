/**
 * PolicyEvaluator Module - Policy-as-Code Evaluation Engine
 * 
 * Evaluates policies against requests using rule-based engine.
 * Supports multiple policy languages and dynamic evaluation.
 * 
 * Performance Target: <20ms evaluation
 */

import { EventEmitter } from 'events';

/**
 * Policy definition
 */
export interface PolicyDefinition {
  id: string;
  name: string;
  version: string;
  rules: PolicyRule[];
  metadata: {
    created_at: string;
    updated_at: string;
    author: string;
  };
}

/**
 * Policy rule
 */
export interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny';
  priority: number;
  metadata?: Record<string, any>;
}

/**
 * Policy evaluation request
 */
export interface PolicyEvaluationRequest {
  policy_id: string;
  context: Record<string, any>;
  resource: string;
  action: string;
}

/**
 * Policy evaluation result
 */
export interface PolicyEvaluationResult {
  decision: 'allow' | 'deny';
  reason: string;
  matched_rules: string[];
  evaluation_time_ms: number;
  metadata?: Record<string, any>;
}

/**
 * PolicyEvaluator implementation with rule-based engine
 */
export class PolicyEvaluator extends EventEmitter {
  private policies: Map<string, PolicyDefinition>;
  private ruleCache: Map<string, boolean>;

  constructor() {
    super();
    this.policies = new Map();
    this.ruleCache = new Map();
  }

  /**
   * Register policy
   */
  async registerPolicy(policy: PolicyDefinition): Promise<void> {
    try {
      // Validate policy
      this.validatePolicy(policy);
      
      // Store policy
      this.policies.set(policy.id, policy);
      
      // Clear cache for this policy
      this.clearPolicyCache(policy.id);
      
      this.emit('policy_registered', {
        policy_id: policy.id,
        rules_count: policy.rules.length
      });
    } catch (error) {
      this.emit('error', {
        operation: 'register_policy',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Evaluate policy
   */
  async evaluate(request: PolicyEvaluationRequest): Promise<PolicyEvaluationResult> {
    const startTime = Date.now();
    
    try {
      // Get policy
      const policy = this.policies.get(request.policy_id);
      if (!policy) {
        throw new Error(`Policy ${request.policy_id} not found`);
      }
      
      // Sort rules by priority
      const sortedRules = [...policy.rules].sort((a, b) => b.priority - a.priority);
      
      // Evaluate rules
      const matchedRules: string[] = [];
      let decision: 'allow' | 'deny' = 'deny'; // Default deny
      let reason = 'No matching rules';
      
      for (const rule of sortedRules) {
        const cacheKey = `${policy.id}:${rule.id}:${JSON.stringify(request.context)}`;
        
        // Check cache
        let matches = this.ruleCache.get(cacheKey);
        
        if (matches === undefined) {
          // Evaluate rule condition
          matches = this.evaluateCondition(rule.condition, request.context);
          
          // Cache result
          this.ruleCache.set(cacheKey, matches);
        }
        
        if (matches) {
          matchedRules.push(rule.id);
          decision = rule.action;
          reason = `Matched rule: ${rule.id}`;
          break; // First match wins (highest priority)
        }
      }
      
      const duration = Date.now() - startTime;
      
      const result: PolicyEvaluationResult = {
        decision,
        reason,
        matched_rules: matchedRules,
        evaluation_time_ms: duration
      };
      
      this.emit('policy_evaluated', {
        policy_id: request.policy_id,
        decision,
        duration_ms: duration
      });
      
      return result;
    } catch (error) {
      this.emit('error', {
        operation: 'evaluate',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Evaluate condition expression
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      // Simple expression evaluator
      // In production, use a proper expression parser like jsep or expr-eval
      
      // Replace context variables
      let expression = condition;
      for (const [key, value] of Object.entries(context)) {
        const placeholder = `context.${key}`;
        const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
        expression = expression.replace(new RegExp(placeholder, 'g'), valueStr);
      }
      
      // Evaluate expression
      // eslint-disable-next-line no-eval
      return eval(expression);
    } catch (error) {
      this.emit('error', {
        operation: 'evaluate_condition',
        condition,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Validate policy
   */
  private validatePolicy(policy: PolicyDefinition): void {
    if (!policy.id || !policy.name || !policy.version) {
      throw new Error('Policy must have id, name, and version');
    }
    
    if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
      throw new Error('Policy must have at least one rule');
    }
    
    for (const rule of policy.rules) {
      if (!rule.id || !rule.condition || !rule.action) {
        throw new Error('Rule must have id, condition, and action');
      }
      
      if (rule.action !== 'allow' && rule.action !== 'deny') {
        throw new Error('Rule action must be "allow" or "deny"');
      }
    }
  }

  /**
   * Clear policy cache
   */
  private clearPolicyCache(policyId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.ruleCache.keys()) {
      if (key.startsWith(`${policyId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.ruleCache.delete(key);
    }
  }

  /**
   * Get policy
   */
  getPolicy(policyId: string): PolicyDefinition | undefined {
    return this.policies.get(policyId);
  }

  /**
   * List policies
   */
  listPolicies(): PolicyDefinition[] {
    return Array.from(this.policies.values());
  }

  /**
   * Delete policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    this.policies.delete(policyId);
    this.clearPolicyCache(policyId);
    
    this.emit('policy_deleted', { policy_id: policyId });
  }

  /**
   * Get statistics
   */
  getStats(): {
    policies_count: number;
    cache_size: number;
  } {
    return {
      policies_count: this.policies.size,
      cache_size: this.ruleCache.size
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.ruleCache.clear();
    this.emit('cache_cleared');
  }
}

/**
 * Factory function
 */
export function createPolicyEvaluator(): PolicyEvaluator {
  return new PolicyEvaluator();
}