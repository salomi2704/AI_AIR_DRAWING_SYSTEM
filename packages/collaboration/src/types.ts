export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
  joinedAt: number;
}

export interface CollaborationEvent {
  type: 'join' | 'leave' | 'stroke' | 'cursor' | 'chat';
  userId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface CollaborationSession {
  id: string;
  hostId: string;
  users: CollaborationUser[];
  events: CollaborationEvent[];
  createdAt: number;
}

export interface CollaborationManager {
  createSession(hostId: string, hostName: string): CollaborationSession;
  joinSession(sessionId: string, userId: string, userName: string): CollaborationUser;
  leaveSession(sessionId: string, userId: string): void;
  getUsers(sessionId: string): CollaborationUser[];
  getEvents(sessionId: string, type?: CollaborationEvent['type']): CollaborationEvent[];
  broadcast(sessionId: string, event: Omit<CollaborationEvent, 'timestamp'>): void;
  getSession(sessionId: string): CollaborationSession | undefined;
  deleteSession(sessionId: string): void;
}