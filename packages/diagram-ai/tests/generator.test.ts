import { MemoryDiagramGenerator } from '../src/generator';

describe('MemoryDiagramGenerator', () => {
  let generator: MemoryDiagramGenerator;

  beforeEach(() => {
    generator = new MemoryDiagramGenerator();
  });

  it('should create generator', () => {
    expect(generator).toBeDefined();
  });

  it('should generate flowchart from multiple strokes', () => {
    const strokes = [
      [{ x: 0, y: 0 }, { x: 50, y: 50 }],
      [{ x: 100, y: 0 }, { x: 150, y: 50 }],
    ];
    const diagram = generator.generateFromStrokes(strokes);
    expect(diagram.type).toBe('flowchart');
    expect(diagram.nodes.length).toBe(2);
    expect(diagram.edges.length).toBe(1);
  });

  it('should generate mindmap from single stroke', () => {
    const strokes = [[{ x: 0, y: 0 }, { x: 100, y: 50 }]];
    const diagram = generator.generateFromStrokes(strokes);
    expect(diagram.type).toBe('mindmap');
    expect(diagram.nodes.length).toBe(1);
  });

  it('should handle empty strokes', () => {
    const diagram = generator.generateFromStrokes([]);
    expect(diagram.nodes.length).toBe(0);
  });

  it('should detect ellipse node type', () => {
    const strokes = [[{ x: 0, y: 0 }, { x: 200, y: 20 }]];
    const diagram = generator.generateFromStrokes(strokes);
    expect(diagram.nodes[0]?.type).toBe('ellipse');
  });

  it('should detect circle node type', () => {
    const strokes = [[{ x: 10, y: 10 }, { x: 15, y: 15 }]];
    const diagram = generator.generateFromStrokes(strokes);
    expect(diagram.nodes[0]?.type).toBe('circle');
  });

  it('should detect diamond node type', () => {
    const strokes = [[{ x: 0, y: 0 }, { x: 10, y: 100 }]];
    const diagram = generator.generateFromStrokes(strokes);
    expect(diagram.nodes[0]?.type).toBe('diamond');
  });

  it('should generate from text - flowchart', () => {
    const diagram = generator.generateFromText('process flow diagram');
    expect(diagram.type).toBe('flowchart');
  });

  it('should generate from text - mindmap', () => {
    const diagram = generator.generateFromText('mind map of ideas');
    expect(diagram.type).toBe('mindmap');
  });

  it('should generate from text - sequence', () => {
    const diagram = generator.generateFromText('sequence interaction');
    expect(diagram.type).toBe('sequence');
  });

  it('should generate from text - class', () => {
    const diagram = generator.generateFromText('class diagram');
    expect(diagram.type).toBe('class');
  });

  it('should generate from text - er', () => {
    const diagram = generator.generateFromText('entity relationship database');
    expect(diagram.type).toBe('er');
  });

  it('should generate from text - state', () => {
    const diagram = generator.generateFromText('state transition machine');
    expect(diagram.type).toBe('state');
  });

  it('should track history', () => {
    generator.generateFromText('test');
    generator.generateFromText('test 2');
    expect(generator.getHistory()).toHaveLength(2);
  });

  it('should clear history', () => {
    generator.generateFromText('test');
    generator.clearHistory();
    expect(generator.getHistory()).toHaveLength(0);
  });

  it('should cap history', () => {
    for (let i = 0; i < 25; i++) {
      generator.generateFromText('test');
    }
    expect(generator.getHistory()).toHaveLength(20);
  });
});