import { Role, RBACProvider } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'MemoryRBAC' });

export class MemoryRBACProvider implements RBACProvider {
  private userRoles: Map<string, Set<string>> = new Map();
  private roles: Map<string, Role> = new Map();

  constructor() {
    // Initialize with default roles
    this.roles.set('admin', {
      id: 'admin',
      name: 'Admin',
      permissions: [
        { id: '1', resource: '*', action: 'admin' },
      ],
    });
    this.roles.set('user', {
      id: 'user',
      name: 'User',
      permissions: [
        { id: '2', resource: 'drawings', action: 'read' },
        { id: '3', resource: 'drawings', action: 'write' },
      ],
    });
  }

  async hasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const roleIds = this.userRoles.get(userId);
    if (!roleIds) return false;

    for (const roleId of roleIds) {
      const role = this.roles.get(roleId);
      if (!role) continue;

      const hasPermission = role.permissions.some(
        (p) => (p.resource === '*' || p.resource === resource) && 
               (p.action === 'admin' || p.action === action)
      );

      if (hasPermission) return true;
    }

    return false;
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    if (!this.roles.has(roleId)) {
      throw new Error(`Role '${roleId}' not found`);
    }

    let roles = this.userRoles.get(userId);
    if (!roles) {
      roles = new Set();
      this.userRoles.set(userId, roles);
    }

    roles.add(roleId);
    logger.info(`Assigned role '${roleId}' to user '${userId}'`);
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const roles = this.userRoles.get(userId);
    if (roles) {
      roles.delete(roleId);
      logger.info(`Removed role '${roleId}' from user '${userId}'`);
    }
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const roleIds = this.userRoles.get(userId);
    if (!roleIds) return [];

    return Array.from(roleIds)
      .map((id) => this.roles.get(id))
      .filter((role): role is Role => role !== undefined);
  }
}