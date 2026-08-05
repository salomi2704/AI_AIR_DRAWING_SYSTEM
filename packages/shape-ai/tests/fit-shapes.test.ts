import { MemoryShapeRecognizer } from '../src/recognizer';
import { Point2D, ShapeResult, TextRegion } from '../src/types';

function polygonStroke(corners: Array<[number, number]>, samplesPerEdge = 25): Point2D[] {
  const pts: Point2D[] = [];
  for (let e = 0; e < corners.length; e++) {
    const [x1, y1] = corners[e]!;
    const [x2, y2] = corners[(e + 1) % corners.length]!;
    for (let k = 0; k < samplesPerEdge; k++) {
      const t = k / samplesPerEdge;
      pts.push({ x: Math.round(x1 + (x2 - x1) * t), y: Math.round(y1 + (y2 - y1) * t) });
    }
  }
  return pts;
}

function rectangleStroke(): Point2D[] {
  return polygonStroke([
    [100, 100],
    [300, 100],
    [300, 220],
    [100, 220],
  ]);
}

function triangleStroke(): Point2D[] {
  return polygonStroke([
    [150, 80],
    [320, 260],
    [60, 260],
  ]);
}

function diamondStroke(): Point2D[] {
  return polygonStroke([
    [200, 60],
    [340, 160],
    [200, 260],
    [60, 160],
  ]);
}

function arrowStroke(): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i <= 200; i += 4) {
    pts.push({ x: i, y: 0 });
  }
  pts.push({ x: 200, y: 0 }, { x: 190, y: -22 }, { x: 190, y: 22 });
  return pts;
}

function shift(points: Point2D[], dx: number, dy: number): Point2D[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

describe('fit-based primitive classification', () => {
  const recognizer = new MemoryShapeRecognizer();

  it('classifies a straight line', () => {
    const shape = recognizer.recognize([
      { x: 0, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 0 },
    ]);
    expect(shape.type).toBe('line');
    expect(shape.params?.length).toBeCloseTo(300, 0);
  });

  it('classifies a wobbly line as a line', () => {
    const pts = Array.from({ length: 61 }, (_, i) => {
      const t = i / 60;
      return { x: Math.round(t * 300), y: Math.round(Math.sin(i * 7) * 2) };
    });
    expect(recognizer.recognize(pts).type).toBe('line');
  });

  it('classifies a circle with a fit radius', () => {
    const pts: Point2D[] = [];
    for (let i = 0; i <= 80; i++) {
      const a = (2 * Math.PI * i) / 80;
      pts.push({ x: Math.round(200 + 100 * Math.cos(a)), y: Math.round(200 + 100 * Math.sin(a)) });
    }
    const shape = recognizer.recognize(pts);
    expect(shape.type).toBe('circle');
    expect(shape.params?.radius).toBeCloseTo(100, 0);
    expect(shape.fitError ?? 1).toBeLessThan(0.12);
  });

  it('classifies a rectangle with four corners', () => {
    const shape = recognizer.recognize(rectangleStroke());
    expect(shape.type).toBe('rectangle');
    expect(shape.params?.corners).toHaveLength(4);
  });

  it('classifies a triangle', () => {
    const shape = recognizer.recognize(triangleStroke());
    expect(shape.type).toBe('triangle');
    expect(shape.params?.corners).toHaveLength(3);
    expect(shape.params?.area ?? 0).toBeGreaterThan(0);
  });

  it('classifies a diamond and prefers it over rectangle', () => {
    const shape = recognizer.recognize(diamondStroke());
    expect(shape.type).toBe('diamond');
    expect(shape.params?.corners).toHaveLength(4);
    expect(shape.params?.diagonals).toHaveLength(2);
  });

  it('keeps an open V as a non-polygon', () => {
    const pts: Point2D[] = [];
    for (let i = 0; i < 40; i++) pts.push({ x: i * 4, y: 0 });
    for (let i = 0; i < 20; i++) pts.push({ x: 160 - i * 6, y: i * 3 });
    const shape = recognizer.recognize(pts);
    expect(['triangle', 'diamond', 'rectangle']).not.toContain(shape.type);
  });

  it('classifies an arrow with head and tail params', () => {
    const shape = recognizer.recognize(arrowStroke());
    expect(shape.type).toBe('arrow');
    expect(shape.params?.head).toEqual({ x: 190, y: 22 });
    expect(shape.params?.p1).toEqual({ x: 0, y: 0 });
    expect(shape.params?.p2).toEqual({ x: 190, y: 22 });
  });

  it('reports unknown/freehand for a zigzag', () => {
    const pts: Point2D[] = [];
    let x = 50;
    let y = 100;
    for (let i = 0; i < 45; i++) {
      x += Math.floor(Math.sin(i * 13) * 18);
      y += Math.floor(Math.cos(i * 11) * 18);
      pts.push({ x, y });
    }
    expect(['freehand', 'unknown']).toContain(recognizer.recognize(pts).type);
  });
});

describe('diagram assembly', () => {
  const recognizer = new MemoryShapeRecognizer();

  it('builds a flowchart from boxes and an arrow', () => {
    const box1 = recognizer.recognize(rectangleStroke());
    const box2 = recognizer.recognize(shift(rectangleStroke(), 300, 0));
    const arrow = recognizer.recognize(shift(arrowStroke(), 200, 75));

    const diagram = recognizer.buildDiagram([box1, box2, arrow]);
    expect(diagram.nodes).toHaveLength(2);
    expect(diagram.edges).toHaveLength(1);
    expect(diagram.edges[0]!.source).toBe(diagram.nodes[0]!.id);
    expect(diagram.edges[0]!.target).toBe(diagram.nodes[1]!.id);
  });

  it('serializes the graph via toDict', () => {
    const box1 = recognizer.recognize(rectangleStroke());
    const box2 = recognizer.recognize(shift(rectangleStroke(), 300, 0));
    const arrow = recognizer.recognize(shift(arrowStroke(), 200, 75));
    const dict = recognizer.buildDiagram([box1, box2, arrow]).toDict();
    expect(dict.nodes).toHaveLength(2);
    expect(dict.edges).toHaveLength(1);
    expect(dict.edges[0]).toHaveProperty('label');
  });

  it('attaches text inside a node as its label', () => {
    const box = recognizer.recognize(rectangleStroke());
    const text: TextRegion = { text: 'start', confidence: 90, box: { x: 150, y: 130, width: 60, height: 25 } };
    const diagram = recognizer.buildDiagram([box], [text]);
    expect(diagram.nodes[0]!.label).toBe('start');
  });

  it('attaches text near an arrow as its edge label', () => {
    const box1 = recognizer.recognize(rectangleStroke());
    const box2 = recognizer.recognize(shift(rectangleStroke(), 300, 0));
    const arrow = recognizer.recognize(shift(arrowStroke(), 200, 75));
    const text: TextRegion = { text: 'yes', confidence: 90, box: { x: 280, y: 60, width: 40, height: 30 } };
    const diagram = recognizer.buildDiagram([box1, box2, arrow], [text]);
    expect(diagram.edges[0]!.label).toBe('yes');
  });

  it('returns empty graph for no node shapes', () => {
    const line = recognizer.recognize([
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ]);
    const diagram = recognizer.buildDiagram([line]);
    expect(diagram.nodes).toHaveLength(0);
    expect(diagram.edges).toHaveLength(0);
  });

  it('recognizes strokes in batch', () => {
    const batch = new MemoryShapeRecognizer();
    const shapes = batch.recognizeStrokes([rectangleStroke(), arrowStroke()]);
    expect(shapes.map((s) => s.type)).toEqual(['rectangle', 'arrow']);
    expect(batch.getHistory()).toHaveLength(2);
  });
});

describe('result payload details', () => {
  const recognizer = new MemoryShapeRecognizer();

  it('exposes confidence, fitError and params on fit shapes', () => {
    const shape = recognizer.recognize(diamondStroke());
    expect(shape.confidence).toBeGreaterThan(0.5);
    expect(shape.confidence).toBeLessThanOrEqual(1);
    expect(shape.fitError).toBeDefined();
    expect(shape.area).toBeGreaterThan(0);
  });

  it('recognizeStrokes handles empty input gracefully', () => {
    const shapes = recognizer.recognizeStrokes([[], [{ x: 1, y: 1 }]]);
    expect(shapes).toHaveLength(2);
    expect(shapes[0]!.type).toBe('line');
  });
});

describe('recognize() is the only history entry point', () => {
  it('buildDiagram does not pollute history', () => {
    const r = new MemoryShapeRecognizer();
    const box = r.recognize(rectangleStroke());
    r.buildDiagram([box]);
    expect(r.getHistory()).toHaveLength(1);
  });
});

describe('shape result type check', () => {
  it('produces shapes assignable to the ShapeResult contract', () => {
    const shape = new MemoryShapeRecognizer().recognize(arrowStroke());
    const check: ShapeResult = shape;
    expect(check.type).toBe('arrow');
  });
});
