import { InferenceInput, InferenceOutput, InferenceContext, InferenceResult, InferencePipeline } from './types';
import { createLogger } from '@ai-air-drawing/core';
import { ModelLoader, LoadedModel } from '@ai-air-drawing/models';

const logger = createLogger({ context: 'InferencePipeline' });

export class DefaultInferencePipeline implements InferencePipeline {
  private modelLoader: ModelLoader;
  private warmupCache: Map<string, boolean> = new Map();

  constructor(modelLoader?: ModelLoader) {
    this.modelLoader = modelLoader || new ModelLoader();
  }

  async infer(input: InferenceInput, context: InferenceContext): Promise<InferenceResult> {
    const startTime = Date.now();

    try {
      const model = this.modelLoader.getLoaded(context.modelName);
      if (!model) {
        throw new Error(`Model '${context.modelName}' not loaded`);
      }

      const output = await this.runInference(model, input);
      const latencyMs = Date.now() - startTime;

      logger.debug(`Inference completed in ${latencyMs}ms`, {
        model: context.modelName,
        requestId: context.requestId,
      });

      return {
        output,
        context,
        latencyMs,
        success: true,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`Inference failed: ${errorMessage}`, error as Error);

      return {
        output: { data: new Float32Array(), shape: [], dtype: 'float32' },
        context,
        latencyMs,
        success: false,
        error: errorMessage,
      };
    }
  }

  async warmup(modelName: string, sampleInput: InferenceInput): Promise<void> {
    if (this.warmupCache.get(modelName)) {
      logger.debug(`Model '${modelName}' already warmed up`);
      return;
    }

    logger.info(`Warming up model: ${modelName}`);
    const context: InferenceContext = {
      requestId: `warmup-${Date.now()}`,
      modelName,
      timestamp: Date.now(),
    };

    await this.infer(sampleInput, context);
    this.warmupCache.set(modelName, true);
    logger.info(`Model '${modelName}' warmed up`);
  }

  async preload(modelName: string): Promise<void> {
    if (this.modelLoader.isLoaded(modelName)) {
      logger.debug(`Model '${modelName}' already loaded`);
      return;
    }

    logger.info(`Preloading model: ${modelName}`);
    // Model loading is handled by ModelLoader
  }

  async dispose(): Promise<void> {
    logger.info('Disposing inference pipeline');
    this.warmupCache.clear();
  }

  private async runInference(model: LoadedModel, input: InferenceInput): Promise<InferenceOutput> {
    const session = model.session as { run?: (input: unknown) => Promise<unknown> };

    if (session && typeof session.run === 'function') {
      const result = await session.run(input);
      return {
        data: result as Float32Array,
        shape: input.shape || [],
        dtype: input.dtype || 'float32',
      };
    }

    // Mock inference for non-ONNX models
    return {
      data: new Float32Array([1.0]),
      shape: [1],
      dtype: 'float32',
    };
  }
}