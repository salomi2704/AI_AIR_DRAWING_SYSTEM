export interface InferenceInput {
  data: Float32Array | Uint8Array | string;
  shape?: number[];
  dtype?: 'float32' | 'uint8' | 'int32' | 'string';
}

export interface InferenceOutput {
  data: Float32Array | Uint8Array | string[];
  shape: number[];
  dtype: string;
}

export interface InferenceContext {
  requestId: string;
  modelName: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface InferenceResult {
  output: InferenceOutput;
  context: InferenceContext;
  latencyMs: number;
  success: boolean;
  error?: string;
}

export interface InferencePipeline {
  infer(input: InferenceInput, context: InferenceContext): Promise<InferenceResult>;
  warmup(modelName: string, sampleInput: InferenceInput): Promise<void>;
  preload(modelName: string): Promise<void>;
  dispose(): Promise<void>;
}