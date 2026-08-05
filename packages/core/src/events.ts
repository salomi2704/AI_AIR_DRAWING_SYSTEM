import EventEmitter from 'eventemitter3';
import { EventPayload, EventHandler } from './types';

export class EventBus {
  private emitter: EventEmitter;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listenerMap: Map<string, Map<EventHandler<any>, EventHandler<any>>> = new Map();

  constructor() {
    this.emitter = new EventEmitter();
  }

  on<T>(eventType: string, handler: EventHandler<T>): () => void {
    const wrappedHandler = (payload: EventPayload<unknown>) => handler(payload as EventPayload<T>);
    this.emitter.on(eventType, wrappedHandler);

    if (!this.listenerMap.has(eventType)) {
      this.listenerMap.set(eventType, new Map());
    }
    this.listenerMap.get(eventType)!.set(handler, wrappedHandler);

    return () => {
      this.off(eventType, handler);
    };
  }

  off<T>(eventType: string, handler: EventHandler<T>): void {
    const wrapped = this.listenerMap.get(eventType)?.get(handler);
    if (wrapped) {
      this.emitter.off(eventType, wrapped);
      this.listenerMap.get(eventType)?.delete(handler);
    }
  }

  async emit<T>(eventType: string, data: T, source: string = 'system'): Promise<void> {
    const payload: EventPayload<T> = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source,
    };

    this.emitter.emit(eventType, payload);
  }

  once<T>(eventType: string, handler: EventHandler<T>): () => void {
    const wrappedHandler = (payload: EventPayload<unknown>) => handler(payload as EventPayload<T>);
    this.emitter.once(eventType, wrappedHandler);

    return () => {
      this.off(eventType, handler);
    };
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.emitter.removeAllListeners(eventType);
      this.listenerMap.delete(eventType);
    } else {
      this.emitter.removeAllListeners();
      this.listenerMap.clear();
    }
  }

  listenerCount(eventType: string): number {
    return this.emitter.listenerCount(eventType);
  }
}

export const eventBus = new EventBus();