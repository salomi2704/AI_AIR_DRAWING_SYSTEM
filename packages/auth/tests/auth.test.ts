import { MemoryAuthProvider } from '../src/auth';

describe('MemoryAuthProvider', () => {
  let auth: MemoryAuthProvider;

  beforeEach(() => {
    auth = new MemoryAuthProvider({ jwtSecret: 'test-secret' });
  });

  it('should create auth provider', () => {
    expect(auth).toBeDefined();
  });

  it('should register user', async () => {
    const user = await auth.register('test@example.com', 'password123', 'Test User');
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.id).toBeDefined();
  });

  it('should not register duplicate user', async () => {
    await auth.register('test@example.com', 'password123', 'Test User');
    await expect(auth.register('test@example.com', 'password123', 'Test User')).rejects.toThrow('User already exists');
  });

  it('should login user', async () => {
    await auth.register('test@example.com', 'password123', 'Test User');
    const token = await auth.login('test@example.com', 'password123');
    expect(token.accessToken).toBeDefined();
    expect(token.refreshToken).toBeDefined();
    expect(token.tokenType).toBe('Bearer');
  });

  it('should fail login with wrong credentials', async () => {
    await auth.register('test@example.com', 'password123', 'Test User');
    await expect(auth.login('test@example.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
  });

  it('should verify token', async () => {
    await auth.register('test@example.com', 'password123', 'Test User');
    const token = await auth.login('test@example.com', 'password123');
    const user = await auth.verifyToken(token.refreshToken);
    expect(user).toBeDefined();
    expect(user?.email).toBe('test@example.com');
  });

  it('should return null for invalid token', async () => {
    const user = await auth.verifyToken('invalid-token');
    expect(user).toBeNull();
  });

  it('should refresh token', async () => {
    await auth.register('test@example.com', 'password123', 'Test User');
    const token = await auth.login('test@example.com', 'password123');
    const newToken = await auth.refreshToken(token.refreshToken);
    expect(newToken.accessToken).toBeDefined();
    expect(newToken.refreshToken).not.toBe(token.refreshToken);
  });

  it('should fail refresh with invalid token', async () => {
    await expect(auth.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
  });

  it('should logout user', async () => {
    await auth.register('test@example.com', 'password123', 'Test User');
    const token = await auth.login('test@example.com', 'password123');
    await auth.logout(token.refreshToken);
    const user = await auth.verifyToken(token.refreshToken);
    expect(user).toBeNull();
  });
});