import { AIAssistant, AssistantMessage, AssistantSuggestion } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'AIAssistant' });

let messageCounter = 0;

function generateMessageId(): string {
  messageCounter++;
  return `msg-${messageCounter}`;
}

export class MemoryAIAssistant implements AIAssistant {
  private history: AssistantMessage[] = [];
  private sessionId: string;
  private maxHistory: number = 100;

  constructor() {
    this.sessionId = `session-${Date.now()}`;
    logger.info(`Assistant session started: ${this.sessionId}`);
  }

  sendMessage(content: string): AssistantMessage {
    const userMessage: AssistantMessage = {
      id: generateMessageId(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    this.history.push(userMessage);

    // Generate a simple rule-based response
    const responseContent = this.generateResponse(content);

    const assistantMessage: AssistantMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: responseContent,
      timestamp: Date.now(),
    };
    this.history.push(assistantMessage);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.history.shift();
    }

    logger.debug(`Message exchange: "${content.substring(0, 30)}..."`);
    return assistantMessage;
  }

  getSuggestions(context?: string): AssistantSuggestion[] {
    const suggestions: AssistantSuggestion[] = [];
    const lower = (context ?? '').toLowerCase();

    if (lower.includes('draw') || lower.includes('sketch')) {
      suggestions.push({
        type: 'action',
        confidence: 0.85,
        label: 'Start drawing mode',
        data: { mode: 'drawing' },
      });
    }

    if (lower.includes('gesture') || lower.includes('hand')) {
      suggestions.push({
        type: 'gesture',
        confidence: 0.75,
        label: 'Enable gesture control',
        data: { gesture: 'pinch' },
      });
    }

    if (lower.includes('shape') || lower.includes('circle')) {
      suggestions.push({
        type: 'shape',
        confidence: 0.80,
        label: 'Snap to shape',
        data: { shape: 'circle' },
      });
    }

    if (lower.includes('help') || lower === '') {
      suggestions.push({
        type: 'text',
        confidence: 0.90,
        label: 'Show help',
        data: { topic: 'getting-started' },
      });
    }

    return suggestions;
  }

  getHistory(): AssistantMessage[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    logger.debug('Assistant history cleared');
  }

  getSessionId(): string {
    return this.sessionId;
  }

  private generateResponse(input: string): string {
    const lower = input.toLowerCase().trim();

    if (lower.includes('hello') || lower.includes('hi')) {
      return 'Hello! I can help you with air drawing. Try gesturing to create shapes or ask me anything!';
    }
    if (lower.includes('help')) {
      return 'I can help you: draw shapes with gestures, create diagrams, or answer questions about your project.';
    }
    if (lower.includes('draw')) {
      return 'To draw, move your hand in the air. I will detect your strokes and convert them into digital drawings.';
    }
    if (lower.includes('shape')) {
      return 'I can recognize circles, rectangles, triangles, and lines. Draw them in the air and I will snap to the nearest shape.';
    }
    if (lower.includes('clear') || lower.includes('reset')) {
      return 'I have cleared the canvas for you. Start drawing again!';
    }
    if (lower.includes('thank')) {
      return 'You are welcome! Let me know if you need anything else.';
    }
    return `I understand: "${input.substring(0, 50)}". How can I help with that?`;
  }
}