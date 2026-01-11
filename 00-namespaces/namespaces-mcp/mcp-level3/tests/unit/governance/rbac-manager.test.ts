/**
 * RBACManager Unit Tests
 * 
 * Comprehensive test suite for RBACManager module
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { RBACManager, createRBACManager, Role } from '../../../engines/governance/rbac/rbac-manager';

describe('RBACManager', () => {
  let rbacManager: RBACManager;

  beforeEach(() => {
    rbacManager = createRBACManager();
  });

  describe('Role Management', () => {
    it('should create role successfully', async () => {
      const role: Role = {
        id: 'test-role',
        name: 'Test Role',
        permissions: ['artifact:read:*', 'artifact:write:*']
      };

      await expect(rbacManager.createRole(role)).resolves.not.toThrow();
    });

    it('should support role hierarchy', async () => {
      const parentRole: Role = {
        id: 'parent',
        name: 'Parent Role',
        permissions: ['artifact:read:*']
      };

      const childRole: Role = {
        id: 'child',
        name: 'Child Role',
        permissions: ['artifact:write:*'],
        parent_roles: ['parent']
      };

      await rbacManager.createRole(parentRole);
      await rbacManager.createRole(childRole);

      const retrieved = rbacManager.getRole('child');
      expect(retrieved?.parent_roles).toContain('parent');
    });

    it('should detect circular dependencies', async () => {
      const role1: Role = {
        id: 'role1',
        name: 'Role 1',
        permissions: ['test:*:*'],
        parent_roles: ['role2']
      };

      const role2: Role = {
        id: 'role2',
        name: 'Role 2',
        permissions: ['test:*:*'],
        parent_roles: ['role1']
      };

      await rbacManager.createRole(role1);
      await expect(rbacManager.createRole(role2)).rejects.toThrow('Circular dependency');
    });
  });

  describe('User Role Assignment', () => {
    beforeEach(async () => {
      const role: Role = {
        id: 'test-role',
        name: 'Test Role',
        permissions: ['artifact:read:*']
      };
      await rbacManager.createRole(role);
    });

    it('should assign role to user', async () => {
      await expect(rbacManager.assignRole('user1', 'test-role')).resolves.not.toThrow();
      
      const userRoles = rbacManager.getUserRoles('user1');
      expect(userRoles).toContain('test-role');
    });

    it('should reject assignment of non-existent role', async () => {
      await expect(rbacManager.assignRole('user1', 'non-existent')).rejects.toThrow();
    });
  });

  describe('Permission Checking', () => {
    beforeEach(async () => {
      // Create roles
      await rbacManager.createRole({
        id: 'reader',
        name: 'Reader',
        permissions: ['artifact:read:*']
      });

      await rbacManager.createRole({
        id: 'writer',
        name: 'Writer',
        permissions: ['artifact:read:*', 'artifact:write:*']
      });

      await rbacManager.createRole({
        id: 'admin',
        name: 'Admin',
        permissions: ['*:*:*']
      });

      // Assign roles
      await rbacManager.assignRole('user1', 'reader');
      await rbacManager.assignRole('user2', 'writer');
      await rbacManager.assignRole('user3', 'admin');
    });

    it('should allow read access for reader', async () => {
      const result = await rbacManager.checkPermission({
        user_id: 'user1',
        resource: 'artifact',
        action: 'read'
      });

      expect(result.allowed).toBe(true);
    });

    it('should deny write access for reader', async () => {
      const result = await rbacManager.checkPermission({
        user_id: 'user1',
        resource: 'artifact',
        action: 'write'
      });

      expect(result.allowed).toBe(false);
    });

    it('should allow all access for admin', async () => {
      const result = await rbacManager.checkPermission({
        user_id: 'user3',
        resource: 'anything',
        action: 'anything'
      });

      expect(result.allowed).toBe(true);
    });

    it('should meet performance target', async () => {
      const result = await rbacManager.checkPermission({
        user_id: 'user1',
        resource: 'artifact',
        action: 'read'
      });

      expect(result.check_time_ms).toBeLessThan(10);
    });
  });

  describe('Default Roles', () => {
    it('should have default admin role', () => {
      const admin = rbacManager.getRole('admin');
      expect(admin).toBeDefined();
      expect(admin?.permissions).toContain('*:*:*');
    });

    it('should have default developer role', () => {
      const developer = rbacManager.getRole('developer');
      expect(developer).toBeDefined();
    });

    it('should have default operator role', () => {
      const operator = rbacManager.getRole('operator');
      expect(operator).toBeDefined();
    });

    it('should have default viewer role', () => {
      const viewer = rbacManager.getRole('viewer');
      expect(viewer).toBeDefined();
    });
  });

  describe('Cache Management', () => {
    it('should cache permission checks', async () => {
      await rbacManager.assignRole('user1', 'admin');

      // First check
      const result1 = await rbacManager.checkPermission({
        user_id: 'user1',
        resource: 'artifact',
        action: 'read'
      });

      // Second check (should be faster)
      const result2 = await rbacManager.checkPermission({
        user_id: 'user1',
        resource: 'artifact',
        action: 'read'
      });

      expect(result1.allowed).toBe(result2.allowed);
      expect(result2.check_time_ms).toBeLessThanOrEqual(result1.check_time_ms);
    });

    it('should clear cache', () => {
      rbacManager.clearCache();
      const stats = rbacManager.getStats();
      expect(stats.cache_size).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      await rbacManager.assignRole('user1', 'admin');
      await rbacManager.assignRole('user2', 'developer');

      const stats = rbacManager.getStats();
      expect(stats.users_count).toBe(2);
      expect(stats.roles_count).toBeGreaterThan(0);
    });
  });
});