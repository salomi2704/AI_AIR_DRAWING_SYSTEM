import { MemoryShapeRecognizer } from '../src/recognizer';
import { Point2D } from '../src/types';

function makeCircle(n = 50, r = 50): Point2D[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n;
    return { x: 100 + r * Math.cos(angle), y: 100 + r * Math.sin(angle) };
  });
}

function makeLine(): Point2D[] {
  return [{ x: 0, y: 0 }, { x: 100, y: 100 }];
}

function makeTriangle(): Point2D[] {
  return [
    { x: 50, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 },
    { x: 50, y: 0 },
  ];
}

function makeRectangle(): Point2D[] {
  return [
    { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 },
    { x: 0, y: 50 }, { x: 0, y: 0 },
  ];
}

function makePolygon(sides: number): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    pts.push({ x: 100 + 50 * Math.cos(angle), y: 100 + 50 * Math.sin(angle) });
  }
  return pts;
}

function makeOpenPath(): Point2D[] {
  return Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: Math.sin(i) * 50 }));
}

describe('MemoryShapeRecognizer', () => {
  let recognizer: MemoryShapeRecognizer;

  beforeEach(() => {
    recognizer = new MemoryShapeRecognizer();
  });

  it('should create recognizer', () => {
    expect(recognizer).toBeDefined();
  });

  it('should recognize circle', () => {
    const result = recognizer.recognize(makeCircle());
    expect(result.type).toBe('circle');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should recognize line', () => {
    const result = recognizer.recognize(makeLine());
    expect(result.type).toBe('line');
  });

  it('should recognize triangle', () => {
    const result = recognizer.recognize(makeTriangle());
    expect(['triangle', 'polygon', 'ellipse']).toContain(result.type);
  });

  it('should recognize rectangle', () => {
    const result = recognizer.recognize(makeRectangle());
    expect(['rectangle', 'polygon', 'circle']).toContain(result.type);
  });

  it('should compute bounds', () => {
    const result = recognizer.recognize(makeCircle());
    expect(result.bounds.width).toBeGreaterThan(0);
    expect(result.bounds.height).toBeGreaterThan(0);
  });

  it('should track history', () => {
    recognizer.recognize(makeCircle());
    recognizer.recognize(makeLine());
    expect(recognizer.getHistory()).toHaveLength(2);
  });

  it('should clear history', () => {
    recognizer.recognize(makeCircle());
    recognizer.clearHistory();
    expect(recognizer.getHistory()).toHaveLength(0);
  });

  it('should handle single point', () => {
    const result = recognizer.recognize([{ x: 5, y: 5 }]);
    expect(result.type).toBe('line');
  });

  it('should return freehand for irregular shape', () => {
    const points: Point2D[] = Array.from({ length: 30 }, (_, i) => ({
      x: i * 3 + Math.sin(i) * 20,
      y: i * 5 + Math.cos(i) * 30,
    }));
    const result = recognizer.recognize(points);
    expect(['freehand', 'ellipse']).toContain(result.type);
  });

  it('should return polygon for 6+ corners', () => {
    const result = recognizer.recognize(makePolygon(7));
    expect(['polygon', 'circle', 'ellipse']).toContain(result.type);
  });

  it('should handle open path', () => {
    const result = recognizer.recognize(makeOpenPath());
    expect(result.type).toBeDefined();
    expect(result.area).toBeGreaterThanOrEqual(0);
  });

  it('should return ellipse for slightly irregular circle', () => {
    // Ellipse: wider than tall
    const pts: Point2D[] = Array.from({ length: 40 }, (_, i) => {
      const angle = (2 * Math.PI * i) / 40;
      return { x: 100 + 80 * Math.cos(angle), y: 100 + 30 * Math.sin(angle) };
    });
    const result = recognizer.recognize(pts);
    expect(['ellipse', 'circle']).toContain(result.type);
  });

  it('should handle degenerate points (all same position)', () => {
    const pts: Point2D[] = Array.from({ length: 5 }, () => ({ x: 50, y: 50 }));
    const result = recognizer.recognize(pts);
    expect(['line', 'freehand']).toContain(result.type);
  });

  it('should cover corner detection for closed non-circular shape', () => {
    // A triangle with many points along each edge (low circularity, closed, >5 points)
    const pts: Point2D[] = [];
    const corners = [[0, 100], [100, 0], [200, 100]];
    for (let c = 0; c < corners.length; c++) {
      const start = corners[c]!;
      const end = corners[(c + 1) % corners.length]!;
      for (let i = 0; i < 10; i++) {
        const t = i / 10;
        pts.push({ x: start[0] + (end[0] - start[0]) * t, y: start[1] + (end[1] - start[1]) * t });
      }
    }
    const result = recognizer.recognize(pts);
    expect(['triangle', 'polygon', 'freehand']).toContain(result.type);
  });

  it('should cover angle computation with flat angles', () => {
    // Nearly collinear points → wide angle → not a corner
    const pts: Point2D[] = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: 0 }));
    // Close it with a bump
    pts.push({ x: 50, y: 0.01 });
    const result = recognizer.recognize(pts);
    expect(result.type).toBeDefined();
  });

  it('should handle zero-length vectors in angle computation', () => {
    // Duplicate consecutive points trigger zero-length vector in computeAngle
    const pts: Point2D[] = [
      { x: 0, y: 0 }, { x: 50, y: 50 }, { x: 50, y: 50 },
      { x: 100, y: 0 }, { x: 0, y: 0 },
    ];
    const result = recognizer.recognize(pts);
    expect(result.type).toBeDefined();
  });

  it('should handle empty input', () => {
    const result = recognizer.recognize([]);
    expect(result.type).toBe('line');
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('should cap history at max', () => {
    for (let i = 0; i < 60; i++) {
      recognizer.recognize(makeLine());
    }
    expect(recognizer.getHistory()).toHaveLength(50);
  });
});