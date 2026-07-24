export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AssistantSuggestion {
  type: 'gesture' | 'shape' | 'text' | 'action';
  confidence: number;
  label: string;
  data?: Record<string, unknown>;
}

export interface AIAssistant {
  sendMessage(content: string): AssistantMessage;
  getSuggestions(context?: string): AssistantSuggestion[];
  getHistory(): AssistantMessage[];
  clearHistory(): void;
  getSessionId(): string;
}