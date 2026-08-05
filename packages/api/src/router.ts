import { ApiRequest, ApiHandler, ApiRouter, ApiResponse } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'ApiRouter' });

interface Route {
  method: string;
  path: string;
  handler: ApiHandler;
}

export class MemoryApiRouter implements ApiRouter {
  private routes: Route[] = [];

  get(path: string, handler: ApiHandler): void {
    this.routes.push({ method: 'GET', path, handler });
  }

  post(path: string, handler: ApiHandler): void {
    this.routes.push({ method: 'POST', path, handler });
  }

  put(path: string, handler: ApiHandler): void {
    this.routes.push({ method: 'PUT', path, handler });
  }

  delete(path: string, handler: ApiHandler): void {
    this.routes.push({ method: 'DELETE', path, handler });
  }

  async route(request: ApiRequest): Promise<ApiResponse> {
    const route = this.routes.find(
      (r) => r.method === request.method && r.path === request.path
    );

    if (!route) {
      logger.warn(`Route not found: ${request.method} ${request.path}`);
      return {
        success: false,
        error: `Route not found: ${request.method} ${request.path}`,
        timestamp: Date.now(),
      };
    }

    try {
      const result = await route.handler.handle(request);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Route error: ${message}`, error as Error);
      return {
        success: false,
        error: message,
        timestamp: Date.now(),
      };
    }
  }
}