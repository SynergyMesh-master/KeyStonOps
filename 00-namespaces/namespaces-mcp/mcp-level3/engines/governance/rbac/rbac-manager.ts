/**
 * RBACManager Module - Role-Based Access Control
 * 
 * Manages roles, permissions, and user assignments.
 * Supports hierarchical roles and permission inheritance.
 * 
 * Performance Target: <10ms permission check
 */

import { EventEmitter } from 'events';

/**
 * Role definition
 */
export interface Role {
  id: string;
  name: string;
  permissions: string[];
  parent_roles?: string[];
  metadata?: Record<string, any>;
}

/**
 * User role assignment
 */
export interface UserRoleAssignment {
  user_id: string;
  role_ids: string[];
  assigned_at: string;
  assigned_by: string;
}

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  user_id: string;
  resource: string;
  action: string;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
  matched_roles: string[];
  matched_permissions: string[];
  check_time_ms: number;
}

/**
 * RBACManager implementation with role hierarchy
 */
export class RBACManager extends EventEmitter {
  private roles: Map<string, Role>;
  private userRoles: Map<string, Set<string>>;
  private permissionCache: Map<string, boolean>;

  constructor() {
    super();
    this.roles = new Map();
    this.userRoles = new Map();
    this.permissionCache = new Map();
    
    // Initialize default roles
    this.initializeDefaultRoles();
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: Role[] = [
      {
        id: 'admin',
        name: 'Administrator',
        permissions: ['*:*:*'] // All permissions
      },
      {
        id: 'developer',
        name: 'Developer',
        permissions: [
          'artifact:read:*',
          'artifact:write:*',
          'execution:trigger:*',
          'dag:read:*'
        ]
      },
      {
        id: 'operator',
        name: 'Operator',
        permissions: [
          'artifact:read:*',
          'execution:read:*',
          'execution:trigger:*',
          'monitoring:read:*'
        ]
      },
      {
        id: 'viewer',
        name: 'Viewer',
        permissions: [
          'artifact:read:*',
          'execution:read:*',
          'dag:read:*',
          'monitoring:read:*'
        ]
      }
    ];
    
    for (const role of defaultRoles) {
      this.roles.set(role.id, role);
    }
  }

  /**
   * Create role
   */
  async createRole(role: Role): Promise<void> {
    try {
      // Validate role
      this.validateRole(role);
      
      // Check for circular dependencies
      if (role.parent_roles) {
        this.checkCircularDependency(role.id, role.parent_roles);
      }
      
      // Store role
      this.roles.set(role.id, role);
      
      // Clear cache
      this.clearCache();
      
      this.emit('role_created', {
        role_id: role.id,
        permissions_count: role.permissions.length
      });
    } catch (error) {
      this.emit('error', {
        operation: 'create_role',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, roleId: string): Promise<void> {
    try {
      // Check if role exists
      if (!this.roles.has(roleId)) {
        throw new Error(`Role ${roleId} not found`);
      }
      
      // Get or create user roles set
      if (!this.userRoles.has(userId)) {
        this.userRoles.set(userId, new Set());
      }
      
      // Add role
      this.userRoles.get(userId)!.add(roleId);
      
      // Clear cache for this user
      this.clearUserCache(userId);
      
      this.emit('role_assigned', {
        user_id: userId,
        role_id: roleId
      });
    } catch (error) {
      this.emit('error', {
        operation: 'assign_role',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check permission
   */
  async checkPermission(request: PermissionCheckRequest): Promise<PermissionCheckResult> {
    const startTime = Date.now();
    
    try {
      const cacheKey = `${request.user_id}:${request.resource}:${request.action}`;
      
      // Check cache
      let allowed = this.permissionCache.get(cacheKey);
      
      if (allowed === undefined) {
        // Get user roles
        const userRoleIds = this.userRoles.get(request.user_id);
        if (!userRoleIds || userRoleIds.size === 0) {
          allowed = false;
        } else {
          // Get all permissions (including inherited)
          const allPermissions = this.getAllPermissions(Array.from(userRoleIds));
          
          // Check if any permission matches
          const requiredPermission = `${request.resource}:${request.action}`;
          allowed = this.matchesPermission(requiredPermission, allPermissions);
        }
        
        // Cache result
        this.permissionCache.set(cacheKey, allowed);
      }
      
      const duration = Date.now() - startTime;
      
      const matchedRoles: string[] = [];
      const matchedPermissions: string[] = [];
      
      if (allowed) {
        const userRoleIds = this.userRoles.get(request.user_id);
        if (userRoleIds) {
          matchedRoles.push(...userRoleIds);
          const allPermissions = this.getAllPermissions(Array.from(userRoleIds));
          matchedPermissions.push(...allPermissions);
        }
      }
      
      const result: PermissionCheckResult = {
        allowed,
        reason: allowed ? 'Permission granted' : 'Permission denied',
        matched_roles: matchedRoles,
        matched_permissions: matchedPermissions,
        check_time_ms: duration
      };
      
      this.emit('permission_checked', {
        user_id: request.user_id,
        resource: request.resource,
        action: request.action,
        allowed,
        duration_ms: duration
      });
      
      return result;
    } catch (error) {
      this.emit('error', {
        operation: 'check_permission',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get all permissions for roles (including inherited)
   */
  private getAllPermissions(roleIds: string[]): string[] {
    const allPermissions = new Set<string>();
    const visited = new Set<string>();
    
    const collectPermissions = (roleId: string) => {
      if (visited.has(roleId)) return;
      visited.add(roleId);
      
      const role = this.roles.get(roleId);
      if (!role) return;
      
      // Add role permissions
      for (const permission of role.permissions) {
        allPermissions.add(permission);
      }
      
      // Recursively collect parent permissions
      if (role.parent_roles) {
        for (const parentRoleId of role.parent_roles) {
          collectPermissions(parentRoleId);
        }
      }
    };
    
    for (const roleId of roleIds) {
      collectPermissions(roleId);
    }
    
    return Array.from(allPermissions);
  }

  /**
   * Check if required permission matches any granted permission
   */
  private matchesPermission(required: string, granted: string[]): boolean {
    for (const permission of granted) {
      // Wildcard match
      if (permission === '*:*:*') return true;
      
      // Pattern match
      const requiredParts = required.split(':');
      const permissionParts = permission.split(':');
      
      if (permissionParts.length !== requiredParts.length) continue;
      
      let matches = true;
      for (let i = 0; i < permissionParts.length; i++) {
        if (permissionParts[i] !== '*' && permissionParts[i] !== requiredParts[i]) {
          matches = false;
          break;
        }
      }
      
      if (matches) return true;
    }
    
    return false;
  }

  /**
   * Validate role
   */
  private validateRole(role: Role): void {
    if (!role.id || !role.name) {
      throw new Error('Role must have id and name');
    }
    
    if (!Array.isArray(role.permissions)) {
      throw new Error('Role must have permissions array');
    }
  }

  /**
   * Check circular dependency
   */
  private checkCircularDependency(roleId: string, parentRoles: string[]): void {
    const visited = new Set<string>();
    
    const checkCycle = (currentId: string): boolean => {
      if (currentId === roleId) return true;
      if (visited.has(currentId)) return false;
      
      visited.add(currentId);
      
      const role = this.roles.get(currentId);
      if (!role || !role.parent_roles) return false;
      
      for (const parentId of role.parent_roles) {
        if (checkCycle(parentId)) return true;
      }
      
      return false;
    };
    
    for (const parentId of parentRoles) {
      if (checkCycle(parentId)) {
        throw new Error(`Circular dependency detected: ${roleId} -> ${parentId}`);
      }
    }
  }

  /**
   * Clear user cache
   */
  private clearUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.permissionCache.delete(key);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.permissionCache.clear();
    this.emit('cache_cleared');
  }

  /**
   * Get role
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  /**
   * Get user roles
   */
  getUserRoles(userId: string): string[] {
    const roleIds = this.userRoles.get(userId);
    return roleIds ? Array.from(roleIds) : [];
  }

  /**
   * Get statistics
   */
  getStats(): {
    roles_count: number;
    users_count: number;
    cache_size: number;
  } {
    return {
      roles_count: this.roles.size,
      users_count: this.userRoles.size,
      cache_size: this.permissionCache.size
    };
  }
}

/**
 * Factory function
 */
export function createRBACManager(): RBACManager {
  return new RBACManager();
}