import { Provider, ProviderError, SummarizeOptions } from './base';
import { postJson } from './http';

export interface GeminiOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';

export class GeminiProvider implements Provider {
  name = 'gemini';
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiOptions = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_GEMINI_MODEL;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  available(): boolean {
    return Boolean(this.apiKey);
  }

  static buildRequest(
    _model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 1024,
  ): Record<string, unknown> {
    return {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens },
    };
  }

  static parseResponse(payload: unknown): string {
    try {
      const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
      const parts = candidates?.[0]?.content?.parts;
      if (!parts) {
        throw new Error('missing parts');
      }
      return parts.map((part) => part.text ?? '').join('').trim();
    } catch {
      throw new ProviderError(`Unexpected Gemini response: ${JSON.stringify(payload)}`);
    }
  }

  async summarize(
    systemPrompt: string,
    userPrompt: string,
    options: SummarizeOptions = {},
  ): Promise<string> {
    const payload = await postJson(
      `${GEMINI_BASE_URL}/models/${this.model}:generateContent`,
      GeminiProvider.buildRequest(
        this.model,
        systemPrompt,
        userPrompt,
        options.maxTokens ?? 1024,
      ),
      {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey ?? '',
      },
      this.timeoutMs,
    );
    return GeminiProvider.parseResponse(payload);
  }
}
