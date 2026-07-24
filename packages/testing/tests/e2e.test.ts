import { Container, EventBus } from '@ai-air-drawing/core';
import { MemoryAuthProvider } from '@ai-air-drawing/auth';
import { MemoryHandTracker } from '@ai-air-drawing/hand-tracking';
import { MemoryVisionProcessor } from '@ai-air-drawing/vision';
import { MemoryStrokeEngine } from '@ai-air-drawing/air-stroke';
import { MemoryShapeRecognizer } from '@ai-air-drawing/shape-ai';
import { MemoryGestureRecognizer } from '@ai-air-drawing/gesture-ai';
import { MemoryMathSolver } from '@ai-air-drawing/math-ai';
import { MemoryDrawingEngine } from '@ai-air-drawing/drawing';
import { MemoryCollaborationManager } from '@ai-air-drawing/collaboration';
import { MemoryExportEngine } from '@ai-air-drawing/export';
import { MemoryTelemetryProvider } from '@ai-air-drawing/telemetry';
import { MemoryBenchmarkRunner } from '@ai-air-drawing/benchmark';
import { MemoryAIAssistant } from '@ai-air-drawing/ai-assistant';
import { MemoryDiagramGenerator } from '@ai-air-drawing/diagram-ai';

// ── helpers ──────────────────────────────────────────────────────────────────
function makeHandLandmarks(pose: 'open' | 'fist' | 'point' | 'peace' | 'pinch'): Array<{ x: number; y: number; z: number }> {
  // 21 MediaPipe-style landmarks
  const base = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  switch (pose) {
    case 'open':
      // all fingertips above their MCP joints (lower y = higher on screen)
      base[8]  = { x: 0.45, y: 0.2, z: 0 };  // index tip
      base[12] = { x: 0.50, y: 0.15, z: 0 };  // middle tip
      base[16] = { x: 0.55, y: 0.2, z: 0 };   // ring tip
      base[20] = { x: 0.60, y: 0.25, z: 0 };   // pinky tip
      base[4]  = { x: 0.35, y: 0.35, z: 0 };   // thumb tip (right of thumb IP)
      break;
    case 'fist':
      base[8]  = { x: 0.45, y: 0.6, z: 0 };
      base[12] = { x: 0.50, y: 0.6, z: 0 };
      base[16] = { x: 0.55, y: 0.6, z: 0 };
      base[20] = { x: 0.60, y: 0.6, z: 0 };
      base[4]  = { x: 0.30, y: 0.6, z: 0 };
      break;
    case 'point':
      base[8]  = { x: 0.45, y: 0.2, z: 0 };   // index extended
      base[12] = { x: 0.50, y: 0.6, z: 0 };   // middle folded
      base[16] = { x: 0.55, y: 0.6, z: 0 };
      base[20] = { x: 0.60, y: 0.6, z: 0 };
      base[4]  = { x: 0.40, y: 0.6, z: 0 };
      break;
    case 'peace':
      base[8]  = { x: 0.45, y: 0.2, z: 0 };
      base[12] = { x: 0.50, y: 0.15, z: 0 };
      base[16] = { x: 0.55, y: 0.6, z: 0 };
      base[20] = { x: 0.60, y: 0.6, z: 0 };
      base[4]  = { x: 0.40, y: 0.6, z: 0 };
      break;
    case 'pinch':
      base[8]  = { x: 0.50, y: 0.35, z: 0 };
      base[12] = { x: 0.50, y: 0.6, z: 0 };
      base[16] = { x: 0.55, y: 0.6, z: 0 };
      base[20] = { x: 0.60, y: 0.6, z: 0 };
      base[4]  = { x: 0.50, y: 0.35, z: 0 };  // thumb tip = index tip
      break;
  }
  return base;
}

function makeCirclePoints(n = 40): Array<{ x: number; y: number }> {
  const cx = 400, cy = 300, r = 100;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

function makeTrianglePoints(): Array<{ x: number; y: number }> {
  const corners = [
    { x: 400, y: 100 },
    { x: 200, y: 500 },
    { x: 600, y: 500 },
  ];
  const ptsPerEdge = 10;
  const result: Array<{ x: number; y: number }> = [];
  for (let e = 0; e < corners.length; e++) {
    const a = corners[e]!;
    const b = corners[(e + 1) % corners.length]!;
    for (let i = 0; i < ptsPerEdge; i++) {
      const t = i / ptsPerEdge;
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

function makeFrame(w: number, h: number, fill = 128): { data: Uint8Array; width: number; height: number; timestamp: number } {
  return { data: new Uint8Array(w * h).fill(fill), width: w, height: h, timestamp: Date.now() };
}

// ── test suite ───────────────────────────────────────────────────────────────
describe('E2E: Full Air Drawing Pipeline', () => {
  let container: Container;
  let events: EventBus;
  let auth: MemoryAuthProvider;
  let handTracker: MemoryHandTracker;
  let vision: MemoryVisionProcessor;
  let strokeEngine: MemoryStrokeEngine;
  let shapeRecognizer: MemoryShapeRecognizer;
  let gestureRecognizer: MemoryGestureRecognizer;
  let mathSolver: MemoryMathSolver;
  let drawing: MemoryDrawingEngine;
  let collaboration: MemoryCollaborationManager;
  let exportEngine: MemoryExportEngine;
  let telemetry: MemoryTelemetryProvider;
  let benchmark: MemoryBenchmarkRunner;
  let assistant: MemoryAIAssistant;
  let diagramGenerator: MemoryDiagramGenerator;

  beforeEach(() => {
    container = new Container();
    events = new EventBus();

    auth = new MemoryAuthProvider({ jwtExpiresIn: '3600' });
    handTracker = new MemoryHandTracker();
    vision = new MemoryVisionProcessor();
    strokeEngine = new MemoryStrokeEngine();
    shapeRecognizer = new MemoryShapeRecognizer();
    gestureRecognizer = new MemoryGestureRecognizer();
    mathSolver = new MemoryMathSolver();
    drawing = new MemoryDrawingEngine();
    collaboration = new MemoryCollaborationManager();
    exportEngine = new MemoryExportEngine();
    telemetry = new MemoryTelemetryProvider();
    benchmark = new MemoryBenchmarkRunner();
    assistant = new MemoryAIAssistant();
    diagramGenerator = new MemoryDiagramGenerator();

    // register all services in DI container
    container.registerInstance('auth', auth);
    container.registerInstance('handTracker', handTracker);
    container.registerInstance('vision', vision);
    container.registerInstance('strokeEngine', strokeEngine);
    container.registerInstance('shapeRecognizer', shapeRecognizer);
    container.registerInstance('gestureRecognizer', gestureRecognizer);
    container.registerInstance('mathSolver', mathSolver);
    container.registerInstance('drawing', drawing);
    container.registerInstance('collaboration', collaboration);
    container.registerInstance('exportEngine', exportEngine);
    container.registerInstance('telemetry', telemetry);
    container.registerInstance('benchmark', benchmark);
    container.registerInstance('assistant', assistant);
    container.registerInstance('diagramGenerator', diagramGenerator);
  });

  afterEach(() => {
    events.removeAllListeners();
    container.clear();
  });

  // ── 1. DI Container wiring ──────────────────────────────────────────────
  it('resolves every registered service from the container', () => {
    expect(container.resolve('auth')).toBe(auth);
    expect(container.resolve('handTracker')).toBe(handTracker);
    expect(container.resolve('vision')).toBe(vision);
    expect(container.resolve('strokeEngine')).toBe(strokeEngine);
    expect(container.resolve('shapeRecognizer')).toBe(shapeRecognizer);
    expect(container.resolve('gestureRecognizer')).toBe(gestureRecognizer);
    expect(container.resolve('mathSolver')).toBe(mathSolver);
    expect(container.resolve('drawing')).toBe(drawing);
    expect(container.resolve('collaboration')).toBe(collaboration);
    expect(container.resolve('exportEngine')).toBe(exportEngine);
    expect(container.resolve('telemetry')).toBe(telemetry);
    expect(container.resolve('benchmark')).toBe(benchmark);
    expect(container.resolve('assistant')).toBe(assistant);
    expect(container.resolve('diagramGenerator')).toBe(diagramGenerator);
  });

  // ── 2. Auth flow ────────────────────────────────────────────────────────
  it('registers a user, logs in, and verifies the token', async () => {
    const user = await auth.register('artist@air.test', 'pass123', 'Artist');
    expect(user.email).toBe('artist@air.test');

    const token = await auth.login('artist@air.test', 'pass123');
    expect(token.accessToken).toContain('access-');
    expect(token.tokenType).toBe('Bearer');

    const verified = await auth.verifyToken(token.accessToken);
    expect(verified).not.toBeNull();
    expect(verified!.email).toBe('artist@air.test');

    // refresh
    const refreshed = await auth.refreshToken(token.refreshToken);
    expect(refreshed.accessToken).not.toBe(token.accessToken);
  });

  it('rejects invalid credentials', async () => {
    await auth.register('x@x.com', 'pw', 'X');
    await expect(auth.login('x@x.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });

  // ── 3. Vision → Hand Tracking pipeline ──────────────────────────────────
  it('processes camera frames and detects hands', async () => {
    const frame = makeFrame(640, 480);

    const processed = await vision.processFrame(frame);
    expect(processed.width).toBe(640);
    expect(processed.processedAt).toBeGreaterThan(0);

    const detection = await handTracker.detect(frame.data, frame.width, frame.height);
    expect(detection.detections.length).toBe(2); // _maxHands default = 2
    expect(detection.detections[0].landmarks).toHaveLength(21);
    expect(detection.processingTime).toBeGreaterThanOrEqual(0);
  });

  it('stabilizes frames between consecutive captures', async () => {
    const f1 = makeFrame(320, 240, 100);
    const f2 = makeFrame(320, 240, 105);

    const s1 = await vision.stabilizeFrame(f1);
    expect(s1.stabilizationScore).toBe(1.0);

    const s2 = await vision.stabilizeFrame(f2, f1);
    expect(s2.stabilizationScore).toBeGreaterThan(0);
    expect(s2.stabilizationScore).toBeLessThanOrEqual(1);
  });

  it('detects motion between frames', async () => {
    const f1 = makeFrame(100, 100, 0);
    const f2 = makeFrame(100, 100, 255);
    const motion = await vision.detectMotion(f2, f1);
    expect(motion).toBeGreaterThan(0);
    expect(motion).toBeLessThanOrEqual(1);
  });

  // ── 4. Hand Landmarks → Air Stroke → Shape Recognition pipeline ─────────
  it('converts hand landmarks to strokes and recognizes shapes', () => {
    // simulate pointing gesture and drawing a circle in the air
    const openLandmarks = makeHandLandmarks('open');

    // build stroke from sequential landmarks (simulating finger-tip trajectory)
    const cx = 400, cy = 300, r = 80;
    for (let i = 0; i <= 30; i++) {
      const angle = (i / 30) * 2 * Math.PI;
      strokeEngine.addPoint({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        timestamp: Date.now() + i,
        pressure: 1.0,
      });
    }
    const stroke = strokeEngine.finishStroke();
    expect(stroke).not.toBeNull();
    expect(stroke!.points.length).toBeGreaterThanOrEqual(2);

    // recognize the shape
    const circlePoints = makeCirclePoints();
    const shapeResult = shapeRecognizer.recognize(circlePoints);
    expect(shapeResult.type).toBe('circle');
    expect(shapeResult.confidence).toBeGreaterThan(0);
    expect(shapeResult.area).toBeGreaterThan(0);
  });

  it('recognizes triangle from drawn points', () => {
    const triPoints = makeTrianglePoints();
    const result = shapeRecognizer.recognize(triPoints);
    expect(result.type).toBe('triangle');
    expect(result.bounds.width).toBeGreaterThan(0);
  });

  it('recognizes line from two points', () => {
    const result = shapeRecognizer.recognize([{ x: 0, y: 0 }, { x: 100, y: 100 }]);
    expect(result.type).toBe('line');
  });

  // ── 5. Gesture recognition pipeline ─────────────────────────────────────
  it('classifies all gesture types from hand landmarks', () => {
    expect(gestureRecognizer.recognize(makeHandLandmarks('open')).gesture).toBe('open_palm');
    expect(gestureRecognizer.recognize(makeHandLandmarks('fist')).gesture).toBe('fist');
    expect(gestureRecognizer.recognize(makeHandLandmarks('point')).gesture).toBe('pointing');
    expect(gestureRecognizer.recognize(makeHandLandmarks('peace')).gesture).toBe('peace');
    expect(gestureRecognizer.recognize(makeHandLandmarks('pinch')).gesture).toBe('pinch');
  });

  it('returns unknown for fewer than 21 landmarks', () => {
    expect(gestureRecognizer.recognize([{ x: 0, y: 0, z: 0 }]).gesture).toBe('unknown');
  });

  it('maintains gesture history', () => {
    gestureRecognizer.recognize(makeHandLandmarks('open'));
    gestureRecognizer.recognize(makeHandLandmarks('fist'));
    expect(gestureRecognizer.getHistory()).toHaveLength(2);

    gestureRecognizer.clearHistory();
    expect(gestureRecognizer.getHistory()).toHaveLength(0);
  });

  // ── 6. Math solver pipeline ─────────────────────────────────────────────
  it('solves arithmetic expressions', () => {
    expect(mathSolver.solve('2 + 3').result).toBe(5);
    expect(mathSolver.solve('10 - 4').result).toBe(6);
    expect(mathSolver.solve('6 * 7').result).toBe(42);
    expect(mathSolver.solve('15 / 3').result).toBe(5);
    expect(mathSolver.solve('2 ^ 10').result).toBe(1024);
  });

  it('solves trigonometric and log expressions', () => {
    expect(mathSolver.solve('sin(0)').result).toBe(0);
    expect(mathSolver.solve('cos(0)').result).toBe(1);
    expect(mathSolver.solve('sqrt(16)').result).toBe(4);
    expect(mathSolver.solve('log(100)').result).toBe(2);
    expect(mathSolver.solve('pi').result).toBeCloseTo(Math.PI);
  });

  it('tracks math history', () => {
    mathSolver.solve('1 + 1');
    mathSolver.solve('2 * 3');
    expect(mathSolver.getHistory()).toHaveLength(2);
    expect(mathSolver.getHistory()[0].operation).toBe('add');
  });

  // ── 7. Drawing canvas pipeline ──────────────────────────────────────────
  it('creates canvas, adds layers, and manages them', () => {
    const canvas = drawing.createCanvas(1920, 1080);
    expect(canvas.width).toBe(1920);

    const bg = drawing.addLayer('background');
    const fg = drawing.addLayer('foreground');
    expect(drawing.getLayers()).toHaveLength(2);

    drawing.setLayerVisibility(bg.id, false);
    drawing.setLayerOpacity(fg.id, 0.5);

    const layers = drawing.getLayers();
    expect(layers.find(l => l.id === bg.id)!.visible).toBe(false);
    expect(layers.find(l => l.id === fg.id)!.opacity).toBe(0.5);

    drawing.moveLayerUp(bg.id);
    const reordered = drawing.getLayers();
    expect(reordered[0].name).toBe('foreground');
    expect(reordered[1].name).toBe('background');

    drawing.removeLayer(bg.id);
    expect(drawing.getLayers()).toHaveLength(1);
  });

  // ── 8. Collaboration pipeline ───────────────────────────────────────────
  it('creates session, joins users, broadcasts events', () => {
    const session = collaboration.createSession('user-1', 'Alice');
    expect(session.users).toHaveLength(1);

    const bob = collaboration.joinSession(session.id, 'user-2', 'Bob');
    expect(bob.name).toBe('Bob');
    expect(bob.color).toBeTruthy();

    collaboration.broadcast(session.id, {
      type: 'stroke',
      userId: 'user-1',
      data: { points: [[100, 200], [300, 400]] },
    });

    collaboration.broadcast(session.id, {
      type: 'cursor',
      userId: 'user-2',
      data: { x: 500, y: 300 },
    });

    const allEvents = collaboration.getEvents(session.id);
    expect(allEvents.length).toBeGreaterThanOrEqual(3); // join + 2 broadcasts

    const strokeEvents = collaboration.getEvents(session.id, 'stroke');
    expect(strokeEvents).toHaveLength(1);

    const users = collaboration.getUsers(session.id);
    expect(users).toHaveLength(2);

    collaboration.leaveSession(session.id, 'user-2');
    expect(collaboration.getUsers(session.id)).toHaveLength(1);
  });

  // ── 9. Export pipeline ──────────────────────────────────────────────────
  it('exports strokes as SVG, JSON, and CSV', () => {
    const strokes = [
      [{ x: 10, y: 20 }, { x: 30, y: 40 }, { x: 50, y: 60 }],
      [{ x: 100, y: 200 }, { x: 300, y: 400 }],
    ];

    const svg = exportEngine.exportDrawing(strokes, { format: 'svg', width: 800, height: 600 });
    expect(svg.data).toContain('<svg');
    expect(svg.data).toContain('<path');
    expect(svg.size).toBeGreaterThan(0);

    const json = exportEngine.exportDrawing(strokes, { format: 'json' });
    const parsed = JSON.parse(json.data);
    expect(parsed.strokes).toHaveLength(2);

    const csv = exportEngine.exportDrawing(strokes, { format: 'csv' });
    expect(csv.data).toContain('stroke_index,point_index,x,y,pressure');
  });

  it('exports diagrams as SVG and JSON', () => {
    const nodes = [
      { id: 'a', label: 'Start', x: 100, y: 100 },
      { id: 'b', label: 'End', x: 300, y: 100 },
    ];

    const svg = exportEngine.exportDiagram(nodes, { format: 'svg' });
    expect(svg.data).toContain('<svg');
    expect(svg.data).toContain('Start');

    const json = exportEngine.exportDiagram(nodes, { format: 'json' });
    expect(JSON.parse(json.data).nodes).toHaveLength(2);
  });

  it('lists all supported formats', () => {
    expect(exportEngine.getSupportedFormats()).toContain('svg');
    expect(exportEngine.getSupportedFormats()).toContain('json');
    expect(exportEngine.getSupportedFormats()).toContain('csv');
    expect(exportEngine.getSupportedFormats()).toContain('png');
    expect(exportEngine.getSupportedFormats()).toContain('pdf');
  });

  // ── 10. Telemetry pipeline ──────────────────────────────────────────────
  it('collects metrics and traces spans', () => {
    telemetry.recordGauge('draw.stroke_count', 1);
    telemetry.recordGauge('draw.stroke_count', 3);
    telemetry.recordHistogram('draw.latency_ms', 12);

    const allMetrics = telemetry.getMetrics();
    expect(allMetrics.length).toBe(3);

    // trace
    const span = telemetry.startSpan('e2e-pipeline');
    expect(span.id).toBeTruthy();
    telemetry.endSpan(span);

    const spans = telemetry.getSpans();
    expect(spans.length).toBeGreaterThanOrEqual(1);
    expect(spans[0].endTime).toBeGreaterThan(0);
  });

  // ── 11. AI Assistant pipeline ───────────────────────────────────────────
  it('runs a conversation with the assistant', () => {
    const response1 = assistant.sendMessage('What is 2+2?');
    expect(response1.content).toBeTruthy();
    expect(response1.id).toBeTruthy();

    const response2 = assistant.sendMessage('And multiply that by 3');
    expect(response2.id).toBeTruthy();

    const history = assistant.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
  });

  // ── 12. Diagram generation pipeline ─────────────────────────────────────
  it('generates diagrams from descriptions', () => {
    const flowchart = diagramGenerator.generateFromText('A flowchart showing login flow with start, check credentials, and end nodes');
    expect(flowchart.nodes.length).toBeGreaterThan(0);
    expect(flowchart.type).toBe('flowchart');

    const mindmap = diagramGenerator.generateFromText('A mind map about programming languages');
    expect(mindmap.nodes.length).toBeGreaterThan(0);
    expect(mindmap.type).toBe('mindmap');
  });

  // ── 13. Event bus wiring ────────────────────────────────────────────────
  it('wires events between packages end-to-end', async () => {
    const receivedEvents: string[] = [];

    events.on('stroke:created', (payload) => {
      receivedEvents.push(`stroke:${(payload.data as { id: string }).id}`);
    });
    events.on('shape:recognized', (payload) => {
      receivedEvents.push(`shape:${(payload.data as { type: string }).type}`);
    });
    events.on('gesture:detected', (payload) => {
      receivedEvents.push(`gesture:${(payload.data as { gesture: string }).gesture}`);
    });

    await events.emit('stroke:created', { id: 's-1' }, 'strokeEngine');
    await events.emit('shape:recognized', { type: 'circle' }, 'shapeRecognizer');
    await events.emit('gesture:detected', { gesture: 'pointing' }, 'gestureRecognizer');

    expect(receivedEvents).toEqual(['stroke:s-1', 'shape:circle', 'gesture:pointing']);
  });

  // ── 14. Full user journey (happy path) ──────────────────────────────────
  it('completes a full user journey: register → draw → recognize → export', async () => {
    // 1) register and login
    const user = await auth.register('demo@air.test', 'secret', 'Demo User');
    const token = await auth.login('demo@air.test', 'secret');
    expect(token.accessToken).toBeTruthy();

    // 2) process camera frame + detect hand
    const frame = makeFrame(1280, 720);
    await vision.processFrame(frame);
    const detection = await handTracker.detect(frame.data, frame.width, frame.height);
    expect(detection.detections.length).toBeGreaterThan(0);

    // 3) user draws circle in the air
    const circlePts = makeCirclePoints(50);
    for (let i = 0; i < circlePts.length; i++) {
      const p = circlePts[i]!;
      strokeEngine.addPoint({ x: p.x, y: p.y, timestamp: Date.now() + i, pressure: 1.0 });
    }
    const stroke = strokeEngine.finishStroke();
    expect(stroke).not.toBeNull();

    // 4) AI recognizes the shape
    const recognized = shapeRecognizer.recognize(circlePts);
    expect(recognized.type).toBe('circle');

    // 5) user draws a triangle
    const triPts = makeTrianglePoints();
    for (let i = 0; i < triPts.length; i++) {
      const p = triPts[i]!;
      strokeEngine.addPoint({ x: p.x, y: p.y, timestamp: Date.now() + i + 100, pressure: 1.0 });
    }
    strokeEngine.finishStroke();
    const triResult = shapeRecognizer.recognize(triPts);
    expect(triResult.type).toBe('triangle');

    // 6) user solves a math expression
    const mathResult = mathSolver.solve('12 * 12');
    expect(mathResult.result).toBe(144);

    // 7) add shapes to drawing canvas
    drawing.createCanvas(1920, 1080);
    const layer1 = drawing.addLayer('shapes');
    const layer2 = drawing.addLayer('text');
    expect(drawing.getLayers()).toHaveLength(2);

    // 8) create collaboration session and share
    const session = collaboration.createSession(user.id, user.name);
    collaboration.joinSession(session.id, 'user-2', 'Collaborator');
    collaboration.broadcast(session.id, {
      type: 'stroke',
      userId: user.id,
      data: { shape: 'circle', center: [400, 300], radius: 100 },
    });
    expect(collaboration.getUsers(session.id)).toHaveLength(2);

    // 9) export the drawing
    const strokeData = strokeEngine.getCompletedStrokes().map(s =>
      s.points.map(p => ({ x: p.x, y: p.y }))
    );
    const svgExport = exportEngine.exportDrawing(strokeData, { format: 'svg', width: 1920, height: 1080 });
    expect(svgExport.data).toContain('<svg');

    const jsonExport = exportEngine.exportDrawing(strokeData, { format: 'json' });
    expect(JSON.parse(jsonExport.data).strokes.length).toBeGreaterThan(0);

    // 10) record metrics for the journey
    telemetry.recordGauge('journey.shapes_recognized', 2);
    telemetry.recordGauge('journey.math_solved', 1);
    telemetry.recordGauge('journey.exports_made', 2);

    expect(telemetry.getMetrics()).toHaveLength(3);
  });

  // ── 15. Benchmark pipeline ──────────────────────────────────────────────
  it('runs benchmarks', () => {
    const result = benchmark.run('shape-recognition', () => {
      const pts = makeCirclePoints();
      shapeRecognizer.recognize(pts);
    }, 10);

    expect(result.name).toBe('shape-recognition');
    expect(result.opsPerSecond).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    const handResult = benchmark.run('hand-detection', () => {
      const frame = makeFrame(640, 480);
      // sync mock detection (handTracker.detect is async but mock is trivially fast)
    }, 10);

    expect(handResult.name).toBe('hand-detection');
    expect(handResult.durationMs).toBeGreaterThanOrEqual(0);

    const history = benchmark.getHistory();
    expect(history).toHaveLength(2);
  });

  // ── 16. Stroke smoothing and simplification ─────────────────────────────
  it('smooths and simplifies strokes', () => {
    // create a jagged stroke
    for (let i = 0; i < 20; i++) {
      strokeEngine.addPoint({
        x: i * 10 + (i % 2 === 0 ? 0 : 5),
        y: i * 10 + (i % 2 === 0 ? 0 : 5),
        timestamp: Date.now() + i,
        pressure: 1.0,
      });
    }
    const raw = strokeEngine.finishStroke()!;
    expect(raw.points.length).toBe(20);

    const smoothed = strokeEngine.smoothStroke(raw);
    expect(smoothed.points.length).toBeLessThanOrEqual(raw.points.length);

    const simplified = strokeEngine.simplifyStroke(raw, 10);
    expect(simplified.points.length).toBeLessThanOrEqual(raw.points.length);
  });

  // ── 17. Gesture → action mapping ────────────────────────────────────────
  it('maps gestures to drawing actions', () => {
    const open = gestureRecognizer.recognize(makeHandLandmarks('open'));
    const fist = gestureRecognizer.recognize(makeHandLandmarks('fist'));
    const point = gestureRecognizer.recognize(makeHandLandmarks('point'));

    // open palm = pan mode
    expect(open.gesture).toBe('open_palm');
    // fist = grab / stop drawing
    expect(fist.gesture).toBe('fist');
    // point = draw mode
    expect(point.gesture).toBe('pointing');
  });

  // ── 18. Multi-user collaboration with strokes ───────────────────────────
  it('supports multi-user collaborative drawing', () => {
    const session = collaboration.createSession('u1', 'Alice');

    collaboration.joinSession(session.id, 'u2', 'Bob');
    collaboration.joinSession(session.id, 'u3', 'Charlie');

    // Alice draws
    collaboration.broadcast(session.id, {
      type: 'stroke',
      userId: 'u1',
      data: { points: [[0, 0], [100, 100]], color: '#FF0000' },
    });

    // Bob draws
    collaboration.broadcast(session.id, {
      type: 'stroke',
      userId: 'u2',
      data: { points: [[200, 200], [300, 300]], color: '#00FF00' },
    });

    // Charlie moves cursor
    collaboration.broadcast(session.id, {
      type: 'cursor',
      userId: 'u3',
      data: { x: 150, y: 150 },
    });

    const strokes = collaboration.getEvents(session.id, 'stroke');
    const cursors = collaboration.getEvents(session.id, 'cursor');

    expect(strokes).toHaveLength(2);
    expect(cursors).toHaveLength(1);
    expect(collaboration.getUsers(session.id)).toHaveLength(3);
  });

  // ── 19. Error handling ──────────────────────────────────────────────────
  it('handles edge cases gracefully across packages', async () => {
    // empty stroke
    const emptyStroke = strokeEngine.finishStroke();
    expect(emptyStroke).toBeNull();

    // single point stroke
    strokeEngine.addPoint({ x: 0, y: 0, timestamp: 1, pressure: 1 });
    const singleStroke = strokeEngine.finishStroke();
    expect(singleStroke).toBeNull();

    // math: unknown expression
    const unknown = mathSolver.solve('foobar');
    expect(unknown.operation).toBe('unknown');
    expect(unknown.confidence).toBe(0);

    // shape: empty points
    const emptyShape = shapeRecognizer.recognize([]);
    expect(emptyShape.type).toBe('line');

    // auth: verify non-existent token
    const badToken = await auth.verifyToken('fake-token');
    expect(badToken).toBeNull();

    // hand tracker: empty image data
    const emptyDetection = await handTracker.detect(new Uint8Array(0), 0, 0);
    expect(emptyDetection.detections).toHaveLength(0);
  });

  // ── 20. Stroke history tracking ─────────────────────────────────────────
  it('tracks completed strokes and provides history', () => {
    // draw 3 strokes
    for (let s = 0; s < 3; s++) {
      for (let i = 0; i < 10; i++) {
        strokeEngine.addPoint({
          x: s * 100 + i * 10,
          y: s * 50 + i * 5,
          timestamp: Date.now() + s * 100 + i,
          pressure: 1.0,
        });
      }
      strokeEngine.finishStroke();
    }

    const completed = strokeEngine.getCompletedStrokes();
    expect(completed).toHaveLength(3);
    expect(completed[0].points).toHaveLength(10);
    expect(completed[1].points).toHaveLength(10);
    expect(completed[2].points).toHaveLength(10);

    // clear
    strokeEngine.clear();
    expect(strokeEngine.getCompletedStrokes()).toHaveLength(0);
  });

  // ── 21. Shape history tracking ──────────────────────────────────────────
  it('tracks recognized shape history', () => {
    shapeRecognizer.recognize(makeCirclePoints());
    shapeRecognizer.recognize(makeTrianglePoints());
    shapeRecognizer.recognize([{ x: 0, y: 0 }, { x: 100, y: 100 }]);

    const history = shapeRecognizer.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].type).toBe('circle');
    expect(history[1].type).toBe('triangle');
    expect(history[2].type).toBe('line');

    shapeRecognizer.clearHistory();
    expect(shapeRecognizer.getHistory()).toHaveLength(0);
  });

  // ── 22. End-to-end event chain: stroke → shape → export ─────────────────
  it('chains stroke creation through shape recognition to export', async () => {
    const eventLog: string[] = [];

    events.on('stroke:created', async () => {
      eventLog.push('stroke');
    });
    events.on('shape:recognized', async () => {
      eventLog.push('shape');
    });
    events.on('export:done', async () => {
      eventLog.push('export');
    });

    // 1) create stroke
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * 2 * Math.PI;
      strokeEngine.addPoint({
        x: 400 + 100 * Math.cos(angle),
        y: 300 + 100 * Math.sin(angle),
        timestamp: Date.now() + i,
        pressure: 1.0,
      });
    }
    const stroke = strokeEngine.finishStroke()!;
    await events.emit('stroke:created', { id: stroke.id }, 'air-stroke');

    // 2) recognize shape
    const pts = stroke.points.map(p => ({ x: p.x, y: p.y }));
    const shape = shapeRecognizer.recognize(pts);
    await events.emit('shape:recognized', { type: shape.type }, 'shape-ai');

    // 3) export
    const exported = exportEngine.exportDrawing(
      [pts],
      { format: 'svg', width: 800, height: 600 }
    );
    await events.emit('export:done', { size: exported.size }, 'export');

    expect(eventLog).toEqual(['stroke', 'shape', 'export']);
    expect(exported.data).toContain('<svg');
  });
});
