import { DefaultInferencePipeline } from '../src/pipeline';
import { InferenceInput, InferenceContext } from '../src/types';
import { ModelLoader } from '@ai-air-drawing/models';

describe('DefaultInferencePipeline', () => {
  let pipeline: DefaultInferencePipeline;
  let mockModelLoader: ModelLoader;

  beforeEach(() => {
    mockModelLoader = new ModelLoader();
    pipeline = new DefaultInferencePipeline(mockModelLoader);
  });

  it('should create pipeline', () => {
    expect(pipeline).toBeDefined();
  });

  it('should create pipeline with default loader', () => {
    const defaultPipeline = new DefaultInferencePipeline();
    expect(defaultPipeline).toBeDefined();
  });

  it('should return error when model not loaded', async () => {
    const input: InferenceInput = {
      data: new Float32Array([1, 2, 3]),
      shape: [3],
      dtype: 'float32',
    };

    const context: InferenceContext = {
      requestId: 'test-1',
      modelName: 'non-existent',
      timestamp: Date.now(),
    };

    const result = await pipeline.infer(input, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not loaded');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should run inference with loaded model', async () => {
    await mockModelLoader.load({
      name: 'test-model',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    });

    const input: InferenceInput = {
      data: new Float32Array([1, 2, 3]),
      shape: [3],
      dtype: 'float32',
    };

    const context: InferenceContext = {
      requestId: 'test-1',
      modelName: 'test-model',
      timestamp: Date.now(),
    };

    const result = await pipeline.infer(input, context);
    expect(result.success).toBe(true);
    expect(result.context.modelName).toBe('test-model');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('should warmup model', async () => {
    await mockModelLoader.load({
      name: 'test-model',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    });

    const input: InferenceInput = {
      data: new Float32Array([1, 2, 3]),
      shape: [3],
      dtype: 'float32',
    };

    await pipeline.warmup('test-model', input);
    // Second warmup should be skipped
    await pipeline.warmup('test-model', input);
  });

  it('should dispose pipeline', async () => {
    await pipeline.dispose();
  });

  it('should return output with correct shape', async () => {
    await mockModelLoader.load({
      name: 'test-model',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    });

    const input: InferenceInput = {
      data: new Float32Array([1, 2, 3]),
      shape: [1, 3],
      dtype: 'float32',
    };

    const context: InferenceContext = {
      requestId: 'test-1',
      modelName: 'test-model',
      timestamp: Date.now(),
    };

    const result = await pipeline.infer(input, context);
    expect(result.output.shape).toBeDefined();
    expect(result.output.dtype).toBe('float32');
  });

  it('should preload already loaded model', async () => {
    await mockModelLoader.load({
      name: 'test-model',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    });

    await pipeline.preload('test-model');
  });

  it('should preload new model', async () => {
    await pipeline.preload('new-model');
  });

  it('should handle inference with metadata in context', async () => {
    await mockModelLoader.load({
      name: 'test-model',
      version: '1.0.0',
      backend: 'tensorflow',
      path: '/models/test.pb',
    });

    const input: InferenceInput = {
      data: new Float32Array([1, 2, 3]),
      shape: [3],
      dtype: 'float32',
    };

    const context: InferenceContext = {
      requestId: 'test-1',
      modelName: 'test-model',
      timestamp: Date.now(),
      metadata: { userId: 'user-123' },
    };

    const result = await pipeline.infer(input, context);
    expect(result.success).toBe(true);
    expect(result.context.metadata?.userId).toBe('user-123');
  });

  it('should handle inference with ONNX model', async () => {
    // ONNX load will fail because file doesn't exist - that's expected
    try {
      await mockModelLoader.load({
        name: 'onnx-model',
        version: '1.0.0',
        backend: 'onnx',
        path: '/models/test.onnx',
        providers: ['cpu'],
      });
    } catch {
      // Expected failure
    }

    const input: InferenceInput = {
      data: new Float32Array([1, 2, 3]),
      shape: [3],
      dtype: 'float32',
    };

    const context: InferenceContext = {
      requestId: 'test-1',
      modelName: 'onnx-model',
      timestamp: Date.now(),
    };

    // Model not loaded, should return error
    const result = await pipeline.infer(input, context);
    expect(result.success).toBe(false);
    expect(result.error).toContain('not loaded');
  });
});