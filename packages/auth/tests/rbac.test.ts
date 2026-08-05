import { MemoryRBACProvider } from '../src/rbac';

describe('MemoryRBACProvider', () => {
  let rbac: MemoryRBACProvider;

  beforeEach(() => {
    rbac = new MemoryRBACProvider();
  });

  it('should create RBAC provider', () => {
    expect(rbac).toBeDefined();
  });

  it('should assign role to user', async () => {
    await rbac.assignRole('user-1', 'admin');
    const roles = await rbac.getUserRoles('user-1');
    expect(roles).toHaveLength(1);
    expect(roles[0].id).toBe('admin');
  });

  it('should throw error for non-existent role', async () => {
    await expect(rbac.assignRole('user-1', 'non-existent')).rejects.toThrow('not found');
  });

  it('should remove role from user', async () => {
    await rbac.assignRole('user-1', 'admin');
    await rbac.removeRole('user-1', 'admin');
    const roles = await rbac.getUserRoles('user-1');
    expect(roles).toHaveLength(0);
  });

  it('should check user permissions', async () => {
    await rbac.assignRole('user-1', 'user');
    expect(await rbac.hasPermission('user-1', 'drawings', 'read')).toBe(true);
    expect(await rbac.hasPermission('user-1', 'drawings', 'delete')).toBe(false);
  });

  it('should check admin permissions', async () => {
    await rbac.assignRole('user-1', 'admin');
    expect(await rbac.hasPermission('user-1', 'anything', 'admin')).toBe(true);
  });

  it('should return empty roles for unknown user', async () => {
    const roles = await rbac.getUserRoles('unknown-user');
    expect(roles).toHaveLength(0);
  });

  it('should return false for unknown user permissions', async () => {
    expect(await rbac.hasPermission('unknown-user', 'drawings', 'read')).toBe(false);
  });
});