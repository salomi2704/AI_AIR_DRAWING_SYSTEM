import { TelemetryProvider, Span, Metric } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'MemoryTelemetry' });

export class MemoryTelemetryProvider implements TelemetryProvider {
  private metrics: Metric[] = [];
  private spans: Map<string, Span> = new Map();

  incrementCounter(name: string, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value: 1,
      tags,
      timestamp: Date.now(),
    });
    logger.debug(`Counter: ${name}`);
  }

  recordGauge(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: Date.now(),
    });
    logger.debug(`Gauge: ${name} = ${value}`);
  }

  recordHistogram(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: Date.now(),
    });
    logger.debug(`Histogram: ${name} = ${value}`);
  }

  startSpan(name: string): Span {
    const span: Span = {
      id: `span-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      startTime: Date.now(),
    };
    this.spans.set(span.id, span);
    logger.debug(`Started span: ${name} (${span.id})`);
    return span;
  }

  endSpan(span: Span): void {
    const existing = this.spans.get(span.id);
    if (existing) {
      existing.endTime = Date.now();
      const duration = existing.endTime - existing.startTime;
      logger.debug(`Ended span: ${span.name} in ${duration}ms`);
    }
  }

  async flush(): Promise<void> {
    logger.debug(`Flushing ${this.metrics.length} metrics and ${this.spans.size} spans`);
    this.metrics = [];
    this.spans.clear();
  }

  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  getSpans(): Span[] {
    return Array.from(this.spans.values());
  }
}