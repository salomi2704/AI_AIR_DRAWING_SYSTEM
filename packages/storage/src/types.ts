export interface StorageConfig {
  type: 'memory' | 'postgresql' | 'redis' | 's3';
  connectionString?: string;
  bucket?: string;
  region?: string;
  endpoint?: string;
}

export interface StorageItem<T = unknown> {
  id: string;
  data: T;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface StorageProvider<T = unknown> {
  get(id: string): Promise<StorageItem<T> | null>;
  set(id: string, data: T, metadata?: Record<string, unknown>): Promise<StorageItem<T>>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  list(options?: ListOptions): Promise<StorageItem<T>[]>;
  clear(): Promise<void>;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  filter?: Record<string, unknown>;
}

export interface CacheProvider<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  has(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
}