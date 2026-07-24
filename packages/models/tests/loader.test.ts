import { ModelLoader } from '../src/loader';
import { ModelConfig } from '../src/types';

describe('ModelLoader', () => {
  let loader: ModelLoader;

  beforeEach(() => {
    loader = new ModelLoader();
  });

  it('should create loader', () => {
    expect(loader).toBeDefined();
  });

  it('should track loaded models', () => {
    expect(loader.listLoaded()).toHaveLength(0);
  });

  it('should return undefined for non-loaded model', () => {
    expect(loader.getLoaded('non-existent')).toBeUndefined();
  });

  it('should return false for non-loaded model', () => {
    expect(loader.isLoaded('non-existent')).toBe(false);
  });

  it('should unload non-loaded model without error', async () => {
    await expect(loader.unload('non-existent')).resolves.toBeUndefined();
  });

  it('should load tensorflow model', async () => {
    const config: ModelConfig = {
      name: 'test-tf',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    };

    const model = await loader.load(config);
    expect(model.config.name).toBe('test-tf');
    expect(loader.isLoaded('test-tf')).toBe(true);
    expect(model.session).toEqual({ type: 'tensorflow', path: '/models/test.pb' });
  });

  it('should load pytorch model', async () => {
    const config: ModelConfig = {
      name: 'test-pt',
      version: '1.0.0',
      backend: 'pytorch',
      path: '/models/test.pt',
    };

    const model = await loader.load(config);
    expect(model.config.name).toBe('test-pt');
    expect(loader.isLoaded('test-pt')).toBe(true);
    expect(model.session).toEqual({ type: 'pytorch', path: '/models/test.pt' });
  });

  it('should load tensorrt model', async () => {
    const config: ModelConfig = {
      name: 'test-trt',
      version: '1.0.0',
      backend: 'tensorrt',
      path: '/models/test.engine',
    };

    const model = await loader.load(config);
    expect(model.config.name).toBe('test-trt');
    expect(loader.isLoaded('test-trt')).toBe(true);
    expect(model.session).toEqual({ type: 'tensorrt', path: '/models/test.engine' });
  });

  it('should return existing model if already loaded', async () => {
    const config: ModelConfig = {
      name: 'test-model',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    };

    const model1 = await loader.load(config);
    const model2 = await loader.load(config);
    expect(model1).toBe(model2);
  });

  it('should unload model', async () => {
    const config: ModelConfig = {
      name: 'test-model',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    };

    await loader.load(config);
    expect(loader.isLoaded('test-model')).toBe(true);

    await loader.unload('test-model');
    expect(loader.isLoaded('test-model')).toBe(false);
  });

  it('should list loaded models', async () => {
    const config1: ModelConfig = {
      name: 'model-1',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/model1.pb',
    };

    const config2: ModelConfig = {
      name: 'model-2',
      version: '1.0.0',
      backend: 'pytorch',
      path: '/models/model2.pt',
    };

    await loader.load(config1);
    await loader.load(config2);

    const models = loader.listLoaded();
    expect(models).toHaveLength(2);
    expect(models.map(m => m.config.name)).toContain('model-1');
    expect(models.map(m => m.config.name)).toContain('model-2');
  });

  it('should handle unsupported backend', async () => {
    const config: ModelConfig = {
      name: 'test-unknown',
      version: '1.0.0',
      backend: 'unknown' as ModelConfig['backend'],
      path: '/models/test.bin',
    };

    await expect(loader.load(config)).rejects.toThrow('Unsupported backend: unknown');
  });

  it('should record loadedAt timestamp', async () => {
    const before = Date.now();
    const config: ModelConfig = {
      name: 'test-model',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    };

    const model = await loader.load(config);
    const after = Date.now();

    expect(model.loadedAt).toBeGreaterThanOrEqual(before);
    expect(model.loadedAt).toBeLessThanOrEqual(after);
  });
});