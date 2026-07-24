export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: number;
}

export interface Span {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  tags?: Record<string, string>;
  logs?: Array<{ timestamp: number; message: string }>;
}

export interface TelemetryProvider {
  incrementCounter(name: string, tags?: Record<string, string>): void;
  recordGauge(name: string, value: number, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;
  startSpan(name: string): Span;
  endSpan(span: Span): void;
  flush(): Promise<void>;
}