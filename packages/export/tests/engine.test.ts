import { MemoryExportEngine } from '../src/engine';

describe('MemoryExportEngine', () => {
  let engine: MemoryExportEngine;

  beforeEach(() => {
    engine = new MemoryExportEngine();
  });

  const sampleStrokes = [
    [{ x: 0, y: 0, pressure: 0.5 }, { x: 100, y: 50, pressure: 0.8 }],
    [{ x: 200, y: 100, pressure: 0.3 }],
  ];

  const sampleNodes = [
    { id: 'n1', label: 'Start', x: 100, y: 100 },
    { id: 'n2', label: 'End', x: 300, y: 200 },
  ];

  it('should create engine', () => {
    expect(engine).toBeDefined();
  });

  it('should get supported formats', () => {
    expect(engine.getSupportedFormats()).toContain('png');
    expect(engine.getSupportedFormats()).toContain('svg');
  });

  it('should export drawing as JSON', () => {
    const result = engine.exportDrawing(sampleStrokes, { format: 'json' });
    expect(result.format).toBe('json');
    expect(result.data).toContain('strokes');
    expect(result.size).toBeGreaterThan(0);
    expect(result.filename).toContain('.json');
  });

  it('should export drawing as SVG', () => {
    const result = engine.exportDrawing(sampleStrokes, { format: 'svg', width: 1024, height: 768 });
    expect(result.data).toContain('<svg');
    expect(result.data).toContain('1024');
    expect(result.data).toContain('768');
  });

  it('should export drawing as CSV', () => {
    const result = engine.exportDrawing(sampleStrokes, { format: 'csv' });
    expect(result.data).toContain('stroke_index');
    expect(result.data).toContain('0,0,0,0');
  });

  it('should export drawing as png placeholder', () => {
    const result = engine.exportDrawing(sampleStrokes, { format: 'png' });
    expect(result.data).toContain('png');
  });

  it('should export drawing as pdf placeholder', () => {
    const result = engine.exportDrawing(sampleStrokes, { format: 'pdf' });
    expect(result.data).toContain('pdf');
  });

  it('should export diagram as JSON', () => {
    const result = engine.exportDiagram(sampleNodes, { format: 'json' });
    expect(result.data).toContain('Start');
    expect(result.data).toContain('End');
  });

  it('should export diagram as SVG', () => {
    const result = engine.exportDiagram(sampleNodes, { format: 'svg' });
    expect(result.data).toContain('<svg');
    expect(result.data).toContain('Start');
  });

  it('should export diagram as CSV', () => {
    const result = engine.exportDiagram(sampleNodes, { format: 'csv' });
    expect(result.data).toContain('id,label,x,y');
    expect(result.data).toContain('n1');
  });

  it('should handle empty strokes', () => {
    const result = engine.exportDrawing([], { format: 'svg' });
    expect(result.data).toContain('<svg');
  });

  it('should set default background', () => {
    const result = engine.exportDrawing(sampleStrokes, { format: 'svg' });
    expect(result.data).toContain('#ffffff');
  });
});