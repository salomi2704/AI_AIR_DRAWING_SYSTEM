export type ModelBackend = 'onnx' | 'tensorflow' | 'pytorch' | 'tensorrt';

export interface ModelConfig {
  name: string;
  version: string;
  backend: ModelBackend;
  path: string;
  inputShape?: number[];
  outputShape?: number[];
  providers?: string[];
  sessionOptions?: Record<string, unknown>;
}

export interface ModelMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  tags?: string[];
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface LoadedModel {
  config: ModelConfig;
  metadata?: ModelMetadata;
  session: unknown;
  loadedAt: number;
}

export interface ModelRegistry {
  register(config: ModelConfig, metadata?: ModelMetadata): void;
  unregister(name: string): void;
  get(name: string): ModelConfig | undefined;
  list(): ModelConfig[];
  has(name: string): boolean;
}