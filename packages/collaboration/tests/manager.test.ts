import { MemoryCollaborationManager } from '../src/manager';

describe('MemoryCollaborationManager', () => {
  let manager: MemoryCollaborationManager;

  beforeEach(() => {
    manager = new MemoryCollaborationManager();
  });

  it('should create manager', () => {
    expect(manager).toBeDefined();
  });

  it('should create session', () => {
    const session = manager.createSession('user-1', 'Alice');
    expect(session.id).toMatch(/^collab-/);
    expect(session.hostId).toBe('user-1');
    expect(session.users.length).toBe(1);
  });

  it('should join session', () => {
    const session = manager.createSession('user-1', 'Alice');
    const user = manager.joinSession(session.id, 'user-2', 'Bob');
    expect(user.name).toBe('Bob');
    expect(manager.getUsers(session.id).length).toBe(2);
  });

  it('should throw on join unknown session', () => {
    expect(() => manager.joinSession('unknown', 'user-1', 'Alice')).toThrow();
  });

  it('should leave session', () => {
    const session = manager.createSession('user-1', 'Alice');
    manager.joinSession(session.id, 'user-2', 'Bob');
    manager.leaveSession(session.id, 'user-2');
    expect(manager.getUsers(session.id).length).toBe(1);
  });

  it('should leave unknown session gracefully', () => {
    manager.leaveSession('unknown', 'user-1');
    // No throw
  });

  it('should leave unknown user gracefully', () => {
    const session = manager.createSession('user-1', 'Alice');
    manager.leaveSession(session.id, 'unknown');
    expect(manager.getUsers(session.id).length).toBe(1);
  });

  it('should get events filtered by type', () => {
    const session = manager.createSession('user-1', 'Alice');
    manager.joinSession(session.id, 'user-2', 'Bob');
    manager.broadcast(session.id, { type: 'stroke', userId: 'user-1', data: {} });
    const joinEvents = manager.getEvents(session.id, 'join');
    expect(joinEvents.length).toBe(1);
    const strokeEvents = manager.getEvents(session.id, 'stroke');
    expect(strokeEvents.length).toBe(1);
  });

  it('should return empty for unknown session events', () => {
    expect(manager.getEvents('unknown')).toHaveLength(0);
  });

  it('should broadcast', () => {
    const session = manager.createSession('user-1', 'Alice');
    manager.broadcast(session.id, { type: 'chat', userId: 'user-1', data: { message: 'hi' } });
    expect(manager.getEvents(session.id).length).toBe(1);
  });

  it('should broadcast to unknown session', () => {
    manager.broadcast('unknown', { type: 'chat', userId: 'user-1', data: {} });
  });

  it('should delete session', () => {
    const session = manager.createSession('user-1', 'Alice');
    manager.deleteSession(session.id);
    expect(manager.getSession(session.id)).toBeUndefined();
  });

  it('should get session', () => {
    const session = manager.createSession('user-1', 'Alice');
    expect(manager.getSession(session.id)).toBeDefined();
  });
});