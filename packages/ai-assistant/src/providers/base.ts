export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface SummarizeOptions {
  maxTokens?: number;
}

export interface Provider {
  name: string;
  available(): boolean;
  summarize(systemPrompt: string, userPrompt: string, options?: SummarizeOptions): Promise<string>;
}
