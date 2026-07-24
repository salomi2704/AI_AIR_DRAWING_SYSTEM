import { MemoryAIAssistant } from '../src/assistant';

describe('MemoryAIAssistant', () => {
  let assistant: MemoryAIAssistant;

  beforeEach(() => {
    assistant = new MemoryAIAssistant();
  });

  it('should create assistant with session id', () => {
    expect(assistant).toBeDefined();
    expect(assistant.getSessionId()).toMatch(/^session-/);
  });

  it('should send message and get response', () => {
    const response = assistant.sendMessage('hello');
    expect(response.role).toBe('assistant');
    expect(response.content).toContain('Hello');
  });

  it('should respond to help', () => {
    const response = assistant.sendMessage('help me');
    expect(response.content).toContain('help');
  });

  it('should respond to draw', () => {
    const response = assistant.sendMessage('draw something');
    expect(response.content).toContain('draw');
  });

  it('should respond to shape', () => {
    const response = assistant.sendMessage('shape recognition');
    expect(response.content).toContain('shape');
  });

  it('should respond to clear', () => {
    const response = assistant.sendMessage('clear everything');
    expect(response.role).toBe('assistant');
    expect(response.content.length).toBeGreaterThan(0);
  });

  it('should respond to thanks', () => {
    const response = assistant.sendMessage('thank you');
    expect(response.content).toContain('welcome');
  });

  it('should give generic response', () => {
    const response = assistant.sendMessage('random question about weather');
    expect(response.content).toContain('understand');
  });

  it('should track history', () => {
    assistant.sendMessage('hello');
    assistant.sendMessage('help');
    expect(assistant.getHistory()).toHaveLength(4); // 2 user + 2 assistant
  });

  it('should clear history', () => {
    assistant.sendMessage('hello');
    assistant.clearHistory();
    expect(assistant.getHistory()).toHaveLength(0);
  });

  it('should provide suggestions for draw context', () => {
    const suggestions = assistant.getSuggestions('draw a circle');
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
    expect(suggestions.some(s => s.type === 'action')).toBe(true);
  });

  it('should provide suggestions for gesture context', () => {
    const suggestions = assistant.getSuggestions('use gesture control');
    expect(suggestions.some(s => s.type === 'gesture')).toBe(true);
  });

  it('should provide suggestions for shape context', () => {
    const suggestions = assistant.getSuggestions('make a shape');
    expect(suggestions.some(s => s.type === 'shape')).toBe(true);
  });

  it('should provide suggestions for empty context', () => {
    const suggestions = assistant.getSuggestions('');
    expect(suggestions.length).toBeGreaterThanOrEqual(1);
  });

  it('should cap history', () => {
    for (let i = 0; i < 60; i++) {
      assistant.sendMessage('test');
    }
    expect(assistant.getHistory().length).toBeLessThanOrEqual(100);
  });
});