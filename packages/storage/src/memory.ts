import { StorageProvider, StorageItem, ListOptions } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'MemoryStorage' });

export class MemoryStorage<T = unknown> implements StorageProvider<T> {
  private store: Map<string, StorageItem<T>> = new Map();

  async get(id: string): Promise<StorageItem<T> | null> {
    return this.store.get(id) || null;
  }

  async set(id: string, data: T, metadata?: Record<string, unknown>): Promise<StorageItem<T>> {
    const existing = this.store.get(id);
    const now = new Date();

    const item: StorageItem<T> = {
      id,
      data,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      metadata,
    };

    this.store.set(id, item);
    logger.debug(`Set item: ${id}`);
    return item;
  }

  async delete(id: string): Promise<boolean> {
    const existed = this.store.has(id);
    this.store.delete(id);
    if (existed) {
      logger.debug(`Deleted item: ${id}`);
    }
    return existed;
  }

  async exists(id: string): Promise<boolean> {
    return this.store.has(id);
  }

  async list(options?: ListOptions): Promise<StorageItem<T>[]> {
    const items = Array.from(this.store.values());
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;
    return items.slice(offset, offset + limit);
  }

  async clear(): Promise<void> {
    this.store.clear();
    logger.debug('Cleared storage');
  }
}