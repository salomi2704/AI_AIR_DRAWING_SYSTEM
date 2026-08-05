import { ModelConfig, ModelMetadata, ModelRegistry } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'ModelRegistry' });

export class InMemoryModelRegistry implements ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();
  private metadata: Map<string, ModelMetadata> = new Map();

  register(config: ModelConfig, metadata?: ModelMetadata): void {
    if (this.models.has(config.name)) {
      logger.warn(`Model '${config.name}' already registered, updating`);
    }
    this.models.set(config.name, config);
    if (metadata) {
      this.metadata.set(config.name, metadata);
    }
    logger.info(`Registered model: ${config.name}@${config.version}`);
  }

  unregister(name: string): void {
    if (!this.models.has(name)) {
      logger.warn(`Model '${name}' not found for unregistration`);
      return;
    }
    this.models.delete(name);
    this.metadata.delete(name);
    logger.info(`Unregistered model: ${name}`);
  }

  get(name: string): ModelConfig | undefined {
    return this.models.get(name);
  }

  getMetadata(name: string): ModelMetadata | undefined {
    return this.metadata.get(name);
  }

  list(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  has(name: string): boolean {
    return this.models.has(name);
  }

  clear(): void {
    this.models.clear();
    this.metadata.clear();
    logger.info('Cleared all models from registry');
  }
}

export const defaultRegistry = new InMemoryModelRegistry();