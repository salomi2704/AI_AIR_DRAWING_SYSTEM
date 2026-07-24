import { InMemoryModelRegistry } from '../src/registry';
import { ModelConfig } from '../src/types';

describe('InMemoryModelRegistry', () => {
  let registry: InMemoryModelRegistry;

  beforeEach(() => {
    registry = new InMemoryModelRegistry();
  });

  it('should register a model', () => {
    const config: ModelConfig = {
      name: 'test-model',
      version: '1.0.0',
      backend: 'onnx',
      path: '/models/test.onnx',
    };

    registry.register(config);
    expect(registry.has('test-model')).toBe(true);
    expect(registry.get('test-model')).toEqual(config);
  });

  it('should register model with metadata', () => {
    const config: ModelConfig = {
      name: 'test-model',
      version: '1.0.0',
      backend: 'onnx',
      path: '/models/test.onnx',
    };

    const metadata = {
      name: 'test-model',
      version: '1.0.0',
      description: 'Test model',
    };

    registry.register(config, metadata);
    expect(registry.getMetadata('test-model')).toEqual(metadata);
  });

  it('should register model without metadata', () => {
    const config: ModelConfig = {
      name: 'test-model',
      version: '1.0.0',
      backend: 'onnx',
      path: '/models/test.onnx',
    };

    registry.register(config);
    expect(registry.getMetadata('test-model')).toBeUndefined();
  });

  it('should overwrite existing model on re-register', () => {
    const config1: ModelConfig = {
      name: 'test-model',
      version: '1.0.0',
      backend: 'onnx',
      path: '/models/test.onnx',
    };

    const config2: ModelConfig = {
      name: 'test-model',
      version: '2.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    };

    registry.register(config1);
    registry.register(config2);
    expect(registry.get('test-model')?.version).toBe('2.0.0');
  });

  it('should unregister a model', () => {
    const config: ModelConfig = {
      name: 'test-model',
      version: '1.0.0',
      backend: 'onnx',
      path: '/models/test.onnx',
    };

    registry.register(config);
    registry.unregister('test-model');
    expect(registry.has('test-model')).toBe(false);
  });

  it('should warn when unregistering non-existent model', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    registry.unregister('non-existent');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should list all models', () => {
    const config1: ModelConfig = {
      name: 'model-1',
      version: '1.0.0',
      backend: 'onnx',
      path: '/models/model1.onnx',
    };

    const config2: ModelConfig = {
      name: 'model-2',
      version: '2.0.0',
      backend: 'tensorflow',
      path: '/models/model2.pb',
    };

    registry.register(config1);
    registry.register(config2);

    const models = registry.list();
    expect(models).toHaveLength(2);
  });

  it('should return undefined for non-existent model', () => {
    expect(registry.get('non-existent')).toBeUndefined();
  });

  it('should return undefined metadata for non-existent model', () => {
    expect(registry.getMetadata('non-existent')).toBeUndefined();
  });

  it('should clear all models', () => {
    registry.register({
      name: 'test',
      version: '1.0.0',
      backend: 'onnx',
      path: '/test',
    });

    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });

  it('should return false for has on empty registry', () => {
    expect(registry.has('anything')).toBe(false);
  });

  it('should return empty list for empty registry', () => {
    expect(registry.list()).toHaveLength(0);
  });
});