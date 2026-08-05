export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn?: string;
  refreshTokenExpiresIn?: string;
}

export interface AuthProvider {
  login(email: string, password: string): Promise<AuthToken>;
  register(email: string, password: string, name: string): Promise<AuthUser>;
  verifyToken(token: string): Promise<AuthUser | null>;
  refreshToken(refreshToken: string): Promise<AuthToken>;
  logout(token: string): Promise<void>;
}

export interface RBACProvider {
  hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  assignRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  getUserRoles(userId: string): Promise<Role[]>;
}