import { Logger, createLogger, getLogger } from '../src/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger({ level: 'info', context: 'test' });
  });

  it('should create logger with context', () => {
    expect(logger).toBeDefined();
    expect(logger.info).toBeDefined();
  });

  it('should log info messages', () => {
    const spy = jest.spyOn(logger['winston'], 'info');
    logger.info('test message');
    expect(spy).toHaveBeenCalledWith('test message', expect.objectContaining({ context: 'test' }));
  });

  it('should log debug messages', () => {
    const debugLogger = createLogger({ level: 'debug', context: 'test' });
    const spy = jest.spyOn(debugLogger['winston'], 'debug');
    debugLogger.debug('debug message');
    expect(spy).toHaveBeenCalledWith('debug message', expect.objectContaining({ context: 'test' }));
  });

  it('should log warn messages', () => {
    const spy = jest.spyOn(logger['winston'], 'warn');
    logger.warn('warn message');
    expect(spy).toHaveBeenCalledWith('warn message', expect.objectContaining({ context: 'test' }));
  });

  it('should log error messages', () => {
    const spy = jest.spyOn(logger['winston'], 'error');
    const error = new Error('test error');
    logger.error('error message', error);
    expect(spy).toHaveBeenCalledWith('error message', expect.objectContaining({
      context: 'test',
      error: 'test error',
      stack: error.stack,
    }));
  });

  it('should create child logger', () => {
    const child = logger.child('child');
    expect(child).toBeDefined();
    const spy = jest.spyOn(child['winston'], 'info');
    child.info('child message');
    expect(spy).toHaveBeenCalledWith('child message', expect.objectContaining({ context: 'test:child' }));
  });

  it('should log with metadata', () => {
    const spy = jest.spyOn(logger['winston'], 'info');
    logger.info('with meta', { key: 'value' });
    expect(spy).toHaveBeenCalledWith('with meta', expect.objectContaining({ key: 'value' }));
  });
});

describe('getLogger', () => {
  it('should return singleton logger', () => {
    const logger1 = getLogger();
    const logger2 = getLogger();
    expect(logger1).toBe(logger2);
  });

  it('should create new logger with options', () => {
    const logger = getLogger({ level: 'debug', context: 'custom' });
    expect(logger).toBeDefined();
  });
});