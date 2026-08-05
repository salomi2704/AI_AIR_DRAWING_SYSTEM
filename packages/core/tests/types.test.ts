import { AppConfig, ExecutionContext, EventPayload, Result, Disposable, Initializable, EventHandler } from '../src/types';

describe('Types', () => {
  it('should define AppConfig interface', () => {
    const config: AppConfig = {
      appName: 'test',
      version: '1.0.0',
      environment: 'development',
      logLevel: 'info',
    };
    expect(config.appName).toBe('test');
  });

  it('should define ExecutionContext interface', () => {
    const ctx: ExecutionContext = {
      requestId: '123',
      timestamp: Date.now(),
    };
    expect(ctx.requestId).toBe('123');
  });

  it('should define EventPayload interface', () => {
    const payload: EventPayload<{ value: number }> = {
      type: 'test',
      data: { value: 42 },
      timestamp: Date.now(),
      source: 'test',
    };
    expect(payload.type).toBe('test');
  });

  it('should define Result interface', () => {
    const result: Result<number> = {
      success: true,
      data: 42,
    };
    expect(result.success).toBe(true);
  });
});