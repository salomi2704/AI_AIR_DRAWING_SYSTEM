import { DiagramSummarizer, getSummarizer, SYSTEM_PROMPT } from '../src/assistant';
import { Provider, ProviderError } from '../src/providers/base';
import { RuleProvider } from '../src/providers/offline';
import { OpenAICompatibleProvider } from '../src/providers/openaiCompatible';

class FakeProvider implements Provider {
  name = 'fake';
  constructor(private readonly result: string) {}

  available(): boolean {
    return true;
  }

  async summarize(): Promise<string> {
    if (this.result === '__throw__') {
      throw new ProviderError('backend exploded');
    }
    return this.result;
  }
}

describe('DiagramSummarizer', () => {
  it('builds a prompt from shapes, text and formulas', () => {
    const prompt = DiagramSummarizer.buildPrompt(
      [{ kind: 'rectangle', label: 'box' }],
      [{ text: 'hello' }],
      ['E=mc^2'],
    );
    expect(prompt).toContain('Shapes (type, label): rectangle(box)');
    expect(prompt).toContain('Recognized text: hello');
    expect(prompt).toContain('Formulas: E=mc^2');
  });

  it('marks empty diagrams in the prompt', () => {
    expect(DiagramSummarizer.buildPrompt([], [], [])).toContain('The diagram is empty.');
  });

  it('uses the deterministic offline summary by default', async () => {
    const summarizer = new DiagramSummarizer(new RuleProvider());
    const summary = await summarizer.summarize(
      [{ kind: 'circle' }, { kind: 'circle' }, { kind: 'line' }],
      [{ text: 'hi' }],
      [],
    );
    expect(summary).toBe('Shapes: 2 circles, 1 line. Text: hi.');
  });

  it('describes a blank canvas offline', async () => {
    const summary = await new DiagramSummarizer(new RuleProvider()).summarize([], [], []);
    expect(summary).toContain('blank');
  });

  it('prefers the configured provider result', async () => {
    const summarizer = new DiagramSummarizer(new FakeProvider('  A flow diagram  '));
    await expect(summarizer.summarize([], [], [])).resolves.toBe('A flow diagram');
  });

  it('falls back to the offline summary when the provider throws', async () => {
    const summarizer = new DiagramSummarizer(new FakeProvider('__throw__'));
    const summary = await summarizer.summarize([{ kind: 'circle' }], [], []);
    expect(summary).toContain('Shapes: 1 circle.');
    expect(summary).toContain('LLM unavailable: backend exploded');
  });

  it('falls back when the provider returns an empty answer', async () => {
    const summarizer = new DiagramSummarizer(new FakeProvider('   '));
    await expect(summarizer.summarize([], [], [])).resolves.toContain('blank');
  });

  it('exposes the summarization system prompt', () => {
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(20);
  });

  it('wires the offline provider through the registry', async () => {
    const summarizer = new DiagramSummarizer();
    const summary = await summarizer.summarize([{ kind: 'triangle', label: 'A' }], [], []);
    expect(summary).toContain('1 triangle');
  });

  it('caches the process-wide summarizer', () => {
    expect(getSummarizer()).toBe(getSummarizer());
  });
});

describe('DiagramSummarizer end-to-end', () => {
  it('uses a real OpenAI-compatible provider against a mocked endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'captures the diagram structure' } }] }),
    });
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);

    const provider = new OpenAICompatibleProvider({ apiKey: 'k' });
    const summarizer = new DiagramSummarizer(provider);
    const summary = await summarizer.summarize([{ kind: 'circle' }], [{ text: 'start' }], []);

    expect(summary).toBe('captures the diagram structure');
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { messages: Array<{ content: string }> };
    expect(body.messages[0].content).toBe(SYSTEM_PROMPT);
    jest.restoreAllMocks();
  });
});
