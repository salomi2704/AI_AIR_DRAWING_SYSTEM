import { ModelConfig, LoadedModel } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'ModelLoader' });

export class ModelLoader {
  private loadedModels: Map<string, LoadedModel> = new Map();

  async load(config: ModelConfig): Promise<LoadedModel> {
    if (this.loadedModels.has(config.name)) {
      logger.info(`Model '${config.name}' already loaded`);
      return this.loadedModels.get(config.name)!;
    }

    logger.info(`Loading model: ${config.name}@${config.version} (${config.backend})`);

    let session: unknown;

    switch (config.backend) {
      case 'onnx':
        session = await this.loadONNX(config);
        break;
      case 'tensorflow':
        session = await this.loadTensorFlow(config);
        break;
      case 'pytorch':
        session = await this.loadPyTorch(config);
        break;
      case 'tensorrt':
        session = await this.loadTensorRT(config);
        break;
      default:
        throw new Error(`Unsupported backend: ${config.backend}`);
    }

    const loadedModel: LoadedModel = {
      config,
      session,
      loadedAt: Date.now(),
    };

    this.loadedModels.set(config.name, loadedModel);
    logger.info(`Model '${config.name}' loaded successfully`);

    return loadedModel;
  }

  async unload(name: string): Promise<void> {
    const model = this.loadedModels.get(name);
    if (!model) {
      logger.warn(`Model '${name}' not loaded`);
      return;
    }

    logger.info(`Unloading model: ${name}`);
    this.loadedModels.delete(name);
    logger.info(`Model '${name}' unloaded`);
  }

  getLoaded(name: string): LoadedModel | undefined {
    return this.loadedModels.get(name);
  }

  listLoaded(): LoadedModel[] {
    return Array.from(this.loadedModels.values());
  }

  isLoaded(name: string): boolean {
    return this.loadedModels.has(name);
  }

  private async loadONNX(config: ModelConfig): Promise<unknown> {
    try {
      const ort = await import('onnxruntime-node');
      const session = await ort.InferenceSession.create(config.path, {
        executionProviders: config.providers || ['cpu'],
        ...config.sessionOptions,
      });
      return session;
    } catch (error) {
      logger.error(`Failed to load ONNX model: ${config.name}`, error as Error);
      throw error;
    }
  }

  private async loadTensorFlow(config: ModelConfig): Promise<unknown> {
    logger.info(`Loading TensorFlow model: ${config.path}`);
    return { type: 'tensorflow', path: config.path };
  }

  private async loadPyTorch(config: ModelConfig): Promise<unknown> {
    logger.info(`Loading PyTorch model: ${config.path}`);
    return { type: 'pytorch', path: config.path };
  }

  private async loadTensorRT(config: ModelConfig): Promise<unknown> {
    logger.info(`Loading TensorRT model: ${config.path}`);
    return { type: 'tensorrt', path: config.path };
  }
}