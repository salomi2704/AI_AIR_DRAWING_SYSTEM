import { Provider, ProviderError, SummarizeOptions } from './base';
import { postJson } from './http';

export interface ClaudeOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';
export const DEFAULT_CLAUDE_MODEL = 'claude-3-5-haiku-latest';

export class ClaudeProvider implements Provider {
  name = 'claude';
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: ClaudeOptions = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_CLAUDE_MODEL;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  available(): boolean {
    return Boolean(this.apiKey);
  }

  static buildRequest(
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 1024,
  ): Record<string, unknown> {
    return {
      model,
      system: systemPrompt,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userPrompt }],
    };
  }

  static parseResponse(payload: unknown): string {
    try {
      const content = (payload as { content?: Array<{ type?: string; text?: string }> }).content;
      if (!Array.isArray(content)) {
        throw new Error('missing content');
      }
      const text = content
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('');
      return text.trim();
    } catch {
      throw new ProviderError(`Unexpected Claude response: ${JSON.stringify(payload)}`);
    }
  }

  async summarize(
    systemPrompt: string,
    userPrompt: string,
    options: SummarizeOptions = {},
  ): Promise<string> {
    const payload = await postJson(
      CLAUDE_URL,
      ClaudeProvider.buildRequest(
        this.model,
        systemPrompt,
        userPrompt,
        options.maxTokens ?? 1024,
      ),
      {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey ?? '',
        'anthropic-version': '2023-06-01',
      },
      this.timeoutMs,
    );
    return ClaudeProvider.parseResponse(payload);
  }
}
