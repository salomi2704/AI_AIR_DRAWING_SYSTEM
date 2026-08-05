import { Provider, ProviderError } from './base';
import { RuleProvider } from './offline';
import { OpenAICompatibleProvider } from './openaiCompatible';
import { GeminiProvider } from './gemini';
import { ClaudeProvider } from './claude';

export const PROVIDERS: Record<string, () => Provider> = {
  offline: () => new RuleProvider(),
  openai: () => new OpenAICompatibleProvider({ apiKey: process.env.OPENAI_API_KEY }),
  ollama: () =>
    new OpenAICompatibleProvider({
      name: 'ollama',
      baseUrl: 'http://localhost:11434/v1',
      model: 'llama3',
    }),
  gemini: () => new GeminiProvider({ apiKey: process.env.GEMINI_API_KEY }),
  claude: () => new ClaudeProvider({ apiKey: process.env.ANTHROPIC_API_KEY }),
};

export function createProvider(name?: string): Provider {
  const resolved = (name ?? 'offline').toLowerCase();
  const factory = PROVIDERS[resolved];
  if (!factory) {
    throw new ProviderError(
      `Unknown assistant provider: '${resolved}' (choose from ${Object.keys(PROVIDERS).sort()})`,
    );
  }
  return factory();
}

export * from './base';
export * from './http';
export * from './offline';
export * from './openaiCompatible';
export * from './gemini';
export * from './claude';
