export interface AppConfig {
  appName: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  port?: number;
  host?: string;
}

export interface ExecutionContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface EventPayload<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
  source: string;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface Disposable {
  dispose(): Promise<void>;
}

export interface Initializable {
  initialize(): Promise<void>;
}

export type EventHandler<T = unknown> = (payload: EventPayload<T>) => void | Promise<void>;