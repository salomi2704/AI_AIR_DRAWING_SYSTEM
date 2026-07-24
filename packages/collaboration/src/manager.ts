import {
  CollaborationEvent,
  CollaborationManager,
  CollaborationSession,
  CollaborationUser,
} from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'CollaborationManager' });

const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
let sessionCounter = 0;

function generateSessionId(): string {
  sessionCounter++;
  return `collab-${sessionCounter}-${Date.now()}`;
}

export class MemoryCollaborationManager implements CollaborationManager {
  private sessions: Map<string, CollaborationSession> = new Map();

  createSession(hostId: string, hostName: string): CollaborationSession {
    const session: CollaborationSession = {
      id: generateSessionId(),
      hostId,
      users: [
        {
          id: hostId,
          name: hostName,
          color: USER_COLORS[0] ?? '#FF6B6B',
          isActive: true,
          joinedAt: Date.now(),
        },
      ],
      events: [],
      createdAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    logger.info(`Session created: ${session.id} by ${hostName}`);
    return session;
  }

  joinSession(sessionId: string, userId: string, userName: string): CollaborationUser {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const colorIndex = session.users.length % USER_COLORS.length;
    const user: CollaborationUser = {
      id: userId,
      name: userName,
      color: USER_COLORS[colorIndex] ?? '#FF6B6B',
      isActive: true,
      joinedAt: Date.now(),
    };

    session.users.push(user);
    session.events.push({
      type: 'join',
      userId,
      data: { name: userName },
      timestamp: Date.now(),
    });

    logger.info(`${userName} joined session ${sessionId}`);
    return user;
  }

  leaveSession(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const userIndex = session.users.findIndex(u => u.id === userId);
    if (userIndex >= 0) {
      const user = session.users[userIndex];
      session.users.splice(userIndex, 1);
      session.events.push({
        type: 'leave',
        userId,
        data: { name: user?.name ?? 'unknown' },
        timestamp: Date.now(),
      });
      logger.info(`${user?.name ?? 'unknown'} left session ${sessionId}`);
    }
  }

  getUsers(sessionId: string): CollaborationUser[] {
    const session = this.sessions.get(sessionId);
    return session ? [...session.users] : [];
  }

  getEvents(sessionId: string, type?: CollaborationEvent['type']): CollaborationEvent[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    if (type) {
      return session.events.filter(e => e.type === type);
    }
    return [...session.events];
  }

  broadcast(sessionId: string, event: Omit<CollaborationEvent, 'timestamp'>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.events.push({
      ...event,
      timestamp: Date.now(),
    });
    logger.debug(`Broadcast ${event.type} in session ${sessionId}`);
  }

  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.info(`Session deleted: ${sessionId}`);
  }
}