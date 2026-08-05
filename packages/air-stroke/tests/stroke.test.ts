import { MemoryStrokeEngine } from '../src/stroke';

describe('MemoryStrokeEngine', () => {
  let engine: MemoryStrokeEngine;

  beforeEach(() => {
    engine = new MemoryStrokeEngine();
  });

  it('should create engine', () => {
    expect(engine).toBeDefined();
  });

  it('should add points and create stroke', () => {
    engine.addPoint({ x: 0, y: 0, timestamp: 1 });
    engine.addPoint({ x: 10, y: 10, timestamp: 2 });
    expect(engine.getActiveStrokes()).toHaveLength(1);
  });

  it('should finish stroke', () => {
    engine.addPoint({ x: 0, y: 0, timestamp: 1 });
    engine.addPoint({ x: 10, y: 10, timestamp: 2 });
    const stroke = engine.finishStroke();
    expect(stroke).toBeDefined();
    expect(stroke?.points).toHaveLength(2);
  });

  it('should return null for single point', () => {
    engine.addPoint({ x: 0, y: 0, timestamp: 1 });
    const stroke = engine.finishStroke();
    expect(stroke).toBeNull();
  });

  it('should track completed strokes', () => {
    engine.addPoint({ x: 0, y: 0, timestamp: 1 });
    engine.addPoint({ x: 10, y: 10, timestamp: 2 });
    engine.finishStroke();
    expect(engine.getCompletedStrokes()).toHaveLength(1);
  });

  it('should smooth stroke', () => {
    engine.addPoint({ x: 0, y: 0, timestamp: 1 });
    engine.addPoint({ x: 5, y: 10, timestamp: 2 });
    engine.addPoint({ x: 10, y: 0, timestamp: 3 });
    const stroke = engine.finishStroke()!;
    const smoothed = engine.smoothStroke(stroke);
    expect(smoothed.points).toHaveLength(3);
  });

  it('should simplify stroke', () => {
    engine.addPoint({ x: 0, y: 0, timestamp: 1 });
    engine.addPoint({ x: 0.1, y: 0.1, timestamp: 2 });
    engine.addPoint({ x: 10, y: 10, timestamp: 3 });
    const stroke = engine.finishStroke()!;
    const simplified = engine.simplifyStroke(stroke, 1);
    expect(simplified.points.length).toBeLessThanOrEqual(3);
  });

  it('should clear all', () => {
    engine.addPoint({ x: 0, y: 0, timestamp: 1 });
    engine.addPoint({ x: 10, y: 10, timestamp: 2 });
    engine.finishStroke();
    engine.clear();
    expect(engine.getCompletedStrokes()).toHaveLength(0);
  });

  it('should smooth short stroke as-is', () => {
    const stroke = { id: 's1', points: [{ x: 0, y: 0, timestamp: 1 }], color: '#000', width: 2, startTime: 1, endTime: 1 };
    const smoothed = engine.smoothStroke(stroke);
    expect(smoothed.points).toHaveLength(1);
  });

  it('should simplify short stroke as-is', () => {
    const stroke = { id: 's1', points: [{ x: 0, y: 0, timestamp: 1 }], color: '#000', width: 2, startTime: 1, endTime: 1 };
    const simplified = engine.simplifyStroke(stroke, 1);
    expect(simplified.points).toHaveLength(1);
  });
});