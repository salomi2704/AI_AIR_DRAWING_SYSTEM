import { PROVIDERS, createProvider } from '../src/providers';
import { ProviderError } from '../src/providers/base';
import { RuleProvider } from '../src/providers/offline';
import { OpenAICompatibleProvider } from '../src/providers/openaiCompatible';
import { GeminiProvider } from '../src/providers/gemini';
import { ClaudeProvider } from '../src/providers/claude';
import { postJson } from '../src/providers/http';

describe('provider registry', () => {
  it('defaults to the offline provider', () => {
    const provider = createProvider();
    expect(provider).toBeInstanceOf(RuleProvider);
    expect(provider.available()).toBe(true);
  });

  it('creates a named provider case-insensitively', () => {
    expect(createProvider('OPENAI')).toBeInstanceOf(OpenAICompatibleProvider);
    expect(createProvider('gemini')).toBeInstanceOf(GeminiProvider);
    expect(createProvider('claude')).toBeInstanceOf(ClaudeProvider);
    expect(createProvider('ollama').name).toBe('ollama');
  });

  it('rejects unknown providers', () => {
    expect(() => createProvider('bogus')).toThrow(ProviderError);
    expect(() => createProvider('bogus')).toThrow('Unknown assistant provider');
  });

  it('exposes every registered factory', () => {
    expect(Object.keys(PROVIDERS).sort()).toEqual(['claude', 'gemini', 'offline', 'ollama', 'openai']);
  });
});

describe('OpenAICompatibleProvider', () => {
  it('requires a key or a local endpoint to be available', () => {
    expect(new OpenAICompatibleProvider().available()).toBe(false);
    expect(new OpenAICompatibleProvider({ apiKey: 'sk-x' }).available()).toBe(true);
    expect(new OpenAICompatibleProvider({ baseUrl: 'http://localhost:11434/v1' }).available()).toBe(true);
    expect(new OpenAICompatibleProvider({ baseUrl: 'http://127.0.0.1:8000/v1' }).available()).toBe(true);
  });

  it('builds a chat completions request', () => {
    const request = OpenAICompatibleProvider.buildRequest('m', 'sys', 'user', 512);
    expect(request.model).toBe('m');
    expect((request.messages as Array<{ role: string; content: string }>)[0]).toEqual({ role: 'system', content: 'sys' });
    expect((request.messages as Array<{ role: string; content: string }>)[1]).toEqual({ role: 'user', content: 'user' });
    expect(request.temperature).toBe(0.4);
    expect(request.max_tokens).toBe(512);
  });

  it('parses a valid response and trims it', () => {
    expect(
      OpenAICompatibleProvider.parseResponse({ choices: [{ message: { content: '  hello  ' } }] }),
    ).toBe('hello');
  });

  it('rejects malformed responses', () => {
    expect(() => OpenAICompatibleProvider.parseResponse({})).toThrow(ProviderError);
    expect(() => OpenAICompatibleProvider.parseResponse(null)).toThrow(ProviderError);
  });

  it('sends the API key header when configured', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    });
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
    const provider = new OpenAICompatibleProvider({ apiKey: 'sk-test' });
    const result = await provider.summarize('sys', 'user');
    expect(result).toBe('ok');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer sk-test');
    jest.restoreAllMocks();
  });
});

describe('GeminiProvider', () => {
  it('is available only with a key', () => {
    expect(new GeminiProvider().available()).toBe(false);
    expect(new GeminiProvider({ apiKey: 'key' }).available()).toBe(true);
  });

  it('builds a generateContent request', () => {
    const request = GeminiProvider.buildRequest('gemini', 'sys', 'user');
    expect(request.system_instruction).toEqual({ parts: [{ text: 'sys' }] });
    expect((request.generationConfig as Record<string, unknown>).maxOutputTokens).toBe(1024);
  });

  it('parses concatenated text parts and rejects bad payloads', () => {
    expect(
      GeminiProvider.parseResponse({ candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }] }),
    ).toBe('ab');
    expect(() => GeminiProvider.parseResponse({})).toThrow(ProviderError);
  });
});

describe('ClaudeProvider', () => {
  it('is available only with a key', () => {
    expect(new ClaudeProvider().available()).toBe(false);
    expect(new ClaudeProvider({ apiKey: 'key' }).available()).toBe(true);
  });

  it('builds a messages request', () => {
    const request = ClaudeProvider.buildRequest('claude', 'sys', 'user', 256);
    expect(request.model).toBe('claude');
    expect(request.system).toBe('sys');
    expect(request.max_tokens).toBe(256);
    expect(request.messages).toEqual([{ role: 'user', content: 'user' }]);
  });

  it('joins text blocks and ignores non-text blocks', () => {
    const payload = {
      content: [
        { type: 'text', text: 'hello ' },
        { type: 'thinking', text: 'skip' },
        { type: 'text', text: 'world' },
      ],
    };
    expect(ClaudeProvider.parseResponse(payload)).toBe('hello world');
    expect(() => ClaudeProvider.parseResponse({ content: 'nope' })).toThrow(ProviderError);
    expect(() => ClaudeProvider.parseResponse({})).toThrow(ProviderError);
  });
});

describe('postJson', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the parsed JSON body on success', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 42 }),
    } as unknown as Response);
    await expect(postJson('http://x', { a: 1 }, {})).resolves.toEqual({ answer: 42 });
  });

  it('surfaces non-2xx responses', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as unknown as Response);
    await expect(postJson('http://x', {}, {})).rejects.toThrow('HTTP 500 from http://x: boom');
  });

  it('wraps network failures', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(postJson('http://x', {}, {})).rejects.toThrow(ProviderError);
  });

  it('rejects non-JSON bodies', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('bad json');
      },
    } as unknown as Response);
    await expect(postJson('http://x', {}, {})).rejects.toThrow('Non-JSON response');
  });
});
