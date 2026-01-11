/**
 * PolicyEvaluator Unit Tests
 * 
 * Comprehensive test suite for PolicyEvaluator module
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PolicyEvaluator, createPolicyEvaluator, PolicyDefinition } from '../../../engines/governance/policy/policy-evaluator';

describe('PolicyEvaluator', () => {
  let evaluator: PolicyEvaluator;

  beforeEach(() => {
    evaluator = createPolicyEvaluator();
  });

  describe('Policy Registration', () => {
    it('should register policy successfully', async () => {
      const policy: PolicyDefinition = {
        id: 'test-policy',
        name: 'Test Policy',
        version: '1.0.0',
        rules: [
          {
            id: 'rule1',
            condition: 'context.role === "admin"',
            action: 'allow',
            priority: 100
          }
        ],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'test'
        }
      };

      await expect(evaluator.registerPolicy(policy)).resolves.not.toThrow();
    });

    it('should reject invalid policy', async () => {
      const invalidPolicy = {
        id: '',
        name: 'Invalid',
        version: '1.0.0',
        rules: [],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'test'
        }
      } as PolicyDefinition;

      await expect(evaluator.registerPolicy(invalidPolicy)).rejects.toThrow();
    });
  });

  describe('Policy Evaluation', () => {
    beforeEach(async () => {
      const policy: PolicyDefinition = {
        id: 'access-policy',
        name: 'Access Policy',
        version: '1.0.0',
        rules: [
          {
            id: 'admin-rule',
            condition: 'context.role === "admin"',
            action: 'allow',
            priority: 100
          },
          {
            id: 'user-rule',
            condition: 'context.role === "user" && context.resource === "read"',
            action: 'allow',
            priority: 50
          },
          {
            id: 'deny-all',
            condition: 'true',
            action: 'deny',
            priority: 1
          }
        ],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'test'
        }
      };

      await evaluator.registerPolicy(policy);
    });

    it('should allow admin access', async () => {
      const result = await evaluator.evaluate({
        policy_id: 'access-policy',
        context: { role: 'admin' },
        resource: 'artifact',
        action: 'write'
      });

      expect(result.decision).toBe('allow');
      expect(result.matched_rules).toContain('admin-rule');
    });

    it('should allow user read access', async () => {
      const result = await evaluator.evaluate({
        policy_id: 'access-policy',
        context: { role: 'user', resource: 'read' },
        resource: 'artifact',
        action: 'read'
      });

      expect(result.decision).toBe('allow');
      expect(result.matched_rules).toContain('user-rule');
    });

    it('should deny user write access', async () => {
      const result = await evaluator.evaluate({
        policy_id: 'access-policy',
        context: { role: 'user', resource: 'write' },
        resource: 'artifact',
        action: 'write'
      });

      expect(result.decision).toBe('deny');
    });

    it('should meet performance target', async () => {
      const result = await evaluator.evaluate({
        policy_id: 'access-policy',
        context: { role: 'admin' },
        resource: 'artifact',
        action: 'read'
      });

      expect(result.evaluation_time_ms).toBeLessThan(20);
    });
  });

  describe('Cache Management', () => {
    it('should cache evaluation results', async () => {
      const policy: PolicyDefinition = {
        id: 'cache-policy',
        name: 'Cache Policy',
        version: '1.0.0',
        rules: [
          {
            id: 'rule1',
            condition: 'context.value > 10',
            action: 'allow',
            priority: 100
          }
        ],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'test'
        }
      };

      await evaluator.registerPolicy(policy);

      // First evaluation
      const result1 = await evaluator.evaluate({
        policy_id: 'cache-policy',
        context: { value: 15 },
        resource: 'test',
        action: 'read'
      });

      // Second evaluation (should be faster due to cache)
      const result2 = await evaluator.evaluate({
        policy_id: 'cache-policy',
        context: { value: 15 },
        resource: 'test',
        action: 'read'
      });

      expect(result1.decision).toBe(result2.decision);
      expect(result2.evaluation_time_ms).toBeLessThanOrEqual(result1.evaluation_time_ms);
    });

    it('should clear cache', () => {
      evaluator.clearCache();
      const stats = evaluator.getStats();
      expect(stats.cache_size).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      const policy: PolicyDefinition = {
        id: 'stats-policy',
        name: 'Stats Policy',
        version: '1.0.0',
        rules: [
          {
            id: 'rule1',
            condition: 'true',
            action: 'allow',
            priority: 100
          }
        ],
        metadata: {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          author: 'test'
        }
      };

      await evaluator.registerPolicy(policy);

      const stats = evaluator.getStats();
      expect(stats.policies_count).toBe(1);
    });
  });
});