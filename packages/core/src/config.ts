import { AppConfig } from './types';

const defaultConfig: AppConfig = {
  appName: 'ai-air-drawing',
  version: '1.0.0',
  environment: 'development',
  logLevel: 'info',
  port: 3000,
  host: 'localhost',
};

let currentConfig: AppConfig = { ...defaultConfig };

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  currentConfig = { ...defaultConfig, ...overrides };
  return currentConfig;
}

export function getConfig(): AppConfig {
  return currentConfig;
}

export function resetConfig(): void {
  currentConfig = { ...defaultConfig };
}