import { loadConfig, getConfig, resetConfig } from '../src/config';

describe('Config', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('should return default config', () => {
    const config = getConfig();
    expect(config.appName).toBe('ai-air-drawing');
    expect(config.version).toBe('1.0.0');
    expect(config.environment).toBe('development');
  });

  it('should load config with overrides', () => {
    const config = loadConfig({ port: 8080, environment: 'production' });
    expect(config.port).toBe(8080);
    expect(config.environment).toBe('production');
    expect(config.appName).toBe('ai-air-drawing');
  });

  it('should reset config to defaults', () => {
    loadConfig({ port: 8080 });
    resetConfig();
    const config = getConfig();
    expect(config.port).toBe(3000);
  });
});