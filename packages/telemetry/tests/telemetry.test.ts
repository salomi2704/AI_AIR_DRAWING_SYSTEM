import { MemoryTelemetryProvider } from '../src/telemetry';

describe('MemoryTelemetryProvider', () => {
  let telemetry: MemoryTelemetryProvider;

  beforeEach(() => {
    telemetry = new MemoryTelemetryProvider();
  });

  it('should create telemetry provider', () => {
    expect(telemetry).toBeDefined();
  });

  it('should record counter', () => {
    telemetry.incrementCounter('requests', { method: 'GET' });
    const metrics = telemetry.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('requests');
    expect(metrics[0].value).toBe(1);
  });

  it('should record gauge', () => {
    telemetry.recordGauge('cpu', 0.75);
    const metrics = telemetry.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('cpu');
    expect(metrics[0].value).toBe(0.75);
  });

  it('should record histogram', () => {
    telemetry.recordHistogram('latency', 150);
    const metrics = telemetry.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].name).toBe('latency');
    expect(metrics[0].value).toBe(150);
  });

  it('should start and end span', () => {
    const span = telemetry.startSpan('test-span');
    expect(span.id).toBeDefined();
    expect(span.name).toBe('test-span');
    expect(span.startTime).toBeGreaterThan(0);

    telemetry.endSpan(span);
    const spans = telemetry.getSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].endTime).toBeGreaterThan(0);
  });

  it('should flush telemetry data', async () => {
    telemetry.incrementCounter('test');
    telemetry.startSpan('test-span');
    await telemetry.flush();

    expect(telemetry.getMetrics()).toHaveLength(0);
    expect(telemetry.getSpans()).toHaveLength(0);
  });

  it('should handle ending non-existent span', () => {
    const span = { id: 'non-existent', name: 'test', startTime: Date.now() };
    telemetry.endSpan(span); // Should not throw
  });

  it('should record metrics with tags', () => {
    telemetry.incrementCounter('requests', { path: '/api' });
    const metrics = telemetry.getMetrics();
    expect(metrics[0].tags?.path).toBe('/api');
  });
});