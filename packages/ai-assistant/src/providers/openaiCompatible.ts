import { Provider, ProviderError, SummarizeOptions } from './base';
import { postJson } from './http';

export interface OpenAICompatibleOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  name?: string;
}

export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export class OpenAICompatibleProvider implements Provider {
  name: string;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAICompatibleOptions = {}) {
    this.name = options.name ?? 'openai';
    this.baseUrl = (options.baseUrl ?? DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_OPENAI_MODEL;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  available(): boolean {
    if (this.apiKey) {
      return true;
    }
    return this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1');
  }

  static buildRequest(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 1024,
  ): Record<string, unknown> {
    return {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    };
  }

  static parseResponse(payload: unknown): string {
    try {
      const choices = (payload as { choices?: Array<{ message?: { content?: string } }> }).choices;
      const content = choices?.[0]?.message?.content;
      if (content === undefined) {
        throw new Error('missing content');
      }
      return String(content).trim();
    } catch {
      throw new ProviderError(`Unexpected OpenAI response: ${JSON.stringify(payload)}`);
    }
  }

  async summarize(
    systemPrompt: string,
    userPrompt: string,
    options: SummarizeOptions = {},
  ): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    const payload = await postJson(
      `${this.baseUrl}/chat/completions`,
      OpenAICompatibleProvider.buildRequest(
        this.model,
        systemPrompt,
        userPrompt,
        options.maxTokens ?? 1024,
      ),
      headers,
      this.timeoutMs,
    );
    return OpenAICompatibleProvider.parseResponse(payload);
  }
}
