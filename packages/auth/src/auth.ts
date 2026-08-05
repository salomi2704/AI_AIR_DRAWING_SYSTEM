import { AuthUser, AuthToken, AuthConfig, AuthProvider } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'MemoryAuth' });

export class MemoryAuthProvider implements AuthProvider {
  private users: Map<string, AuthUser & { passwordHash: string }> = new Map();
  private tokens: Map<string, string> = new Map(); // refreshToken -> userId
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  async login(email: string, password: string): Promise<AuthToken> {
    const user = Array.from(this.users.values()).find((u) => u.email === email);
    if (!user || user.passwordHash !== password) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken(user.id);
    this.tokens.set(token.refreshToken, user.id);
    this.tokens.set(token.accessToken, user.id);

    logger.info(`User logged in: ${email}`);
    return token;
  }

  async register(email: string, password: string, name: string): Promise<AuthUser> {
    const existing = Array.from(this.users.values()).find((u) => u.email === email);
    if (existing) {
      throw new Error('User already exists');
    }

    const user: AuthUser & { passwordHash: string } = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      email,
      name,
      roles: [],
      createdAt: new Date(),
      passwordHash: password, // In production, hash with bcrypt
    };

    this.users.set(user.id, user);
    logger.info(`User registered: ${email}`);
    return user;
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    // Simple mock verification
    const userId = this.tokens.get(token);
    if (!userId) return null;

    const user = this.users.get(userId);
    if (!user) return null;

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async refreshToken(refreshToken: string): Promise<AuthToken> {
    const userId = this.tokens.get(refreshToken);
    if (!userId) {
      throw new Error('Invalid refresh token');
    }

    this.tokens.delete(refreshToken);
    const token = this.generateToken(userId);
    this.tokens.set(token.refreshToken, userId);

    return token;
  }

  async logout(token: string): Promise<void> {
    this.tokens.delete(token);
    logger.info('User logged out');
  }

  private generateToken(userId: string): AuthToken {
    const expiresIn = this.config.jwtExpiresIn ? parseInt(this.config.jwtExpiresIn) : 3600;
    const rand = Math.random().toString(36).substring(2, 8);
    return {
      accessToken: `access-${userId}-${Date.now()}-${rand}`,
      refreshToken: `refresh-${userId}-${Date.now()}-${rand}`,
      expiresIn,
      tokenType: 'Bearer',
    };
  }
}