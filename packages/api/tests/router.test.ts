import { MemoryApiRouter } from '../src/router';
import { ApiRequest, ApiHandler } from '../src/types';

describe('MemoryApiRouter', () => {
  let router: MemoryApiRouter;

  beforeEach(() => {
    router = new MemoryApiRouter();
  });

  it('should create router', () => {
    expect(router).toBeDefined();
  });

  it('should handle GET request', async () => {
    const handler: ApiHandler = {
      handle: async () => ({
        success: true,
        data: 'hello',
        timestamp: Date.now(),
      }),
    };

    router.get('/test', handler);

    const request: ApiRequest = {
      method: 'GET',
      path: '/test',
    };

    const response = await router.route(request);
    expect(response.success).toBe(true);
    expect(response.data).toBe('hello');
  });

  it('should handle POST request', async () => {
    const handler: ApiHandler = {
      handle: async (req) => ({
        success: true,
        data: req.body,
        timestamp: Date.now(),
      }),
    };

    router.post('/items', handler);

    const request: ApiRequest = {
      method: 'POST',
      path: '/items',
      body: { name: 'test' },
    };

    const response = await router.route(request);
    expect(response.success).toBe(true);
    expect(response.data).toEqual({ name: 'test' });
  });

  it('should return 404 for unknown route', async () => {
    const request: ApiRequest = {
      method: 'GET',
      path: '/unknown',
    };

    const response = await router.route(request);
    expect(response.success).toBe(false);
    expect(response.error).toContain('not found');
  });

  it('should handle route errors', async () => {
    const handler: ApiHandler = {
      handle: async () => {
        throw new Error('Test error');
      },
    };

    router.get('/error', handler);

    const request: ApiRequest = {
      method: 'GET',
      path: '/error',
    };

    const response = await router.route(request);
    expect(response.success).toBe(false);
    expect(response.error).toBe('Test error');
  });

  it('should handle PUT request', async () => {
    const handler: ApiHandler = {
      handle: async (req) => ({
        success: true,
        data: req.body,
        timestamp: Date.now(),
      }),
    };

    router.put('/items/:id', handler);

    const request: ApiRequest = {
      method: 'PUT',
      path: '/items/:id',
      body: { name: 'updated' },
    };

    const response = await router.route(request);
    expect(response.success).toBe(true);
  });

  it('should handle DELETE request', async () => {
    const handler: ApiHandler = {
      handle: async () => ({
        success: true,
        timestamp: Date.now(),
      }),
    };

    router.delete('/items/:id', handler);

    const request: ApiRequest = {
      method: 'DELETE',
      path: '/items/:id',
    };

    const response = await router.route(request);
    expect(response.success).toBe(true);
  });
});