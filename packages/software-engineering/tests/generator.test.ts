import { MemorySEDiagramGenerator } from '../src/generator';

describe('MemorySEDiagramGenerator', () => {
  let gen: MemorySEDiagramGenerator;

  beforeEach(() => {
    gen = new MemorySEDiagramGenerator();
  });

  it('should create generator', () => {
    expect(gen).toBeDefined();
  });

  it('should generate class diagram', () => {
    const d = gen.generateClassDiagram('User Account Login');
    expect(d.type).toBe('class');
    expect(d.classes.length).toBe(3);
    expect(d.classes[0]?.name).toBe('User');
  });

  it('should generate class diagram with attributes and methods', () => {
    const d = gen.generateClassDiagram('Order');
    expect(d.classes[0]?.attributes.length).toBeGreaterThan(0);
    expect(d.classes[0]?.methods.length).toBeGreaterThan(0);
  });

  it('should generate sequence diagram', () => {
    const d = gen.generateSequenceDiagram('Client Server Database');
    expect(d.type).toBe('sequence');
    expect(d.messages.length).toBe(2);
    expect(d.messages[0]?.from).toBe('Client');
    expect(d.messages[0]?.to).toBe('Server');
  });

  it('should generate sequence diagram with correct method names', () => {
    const d = gen.generateSequenceDiagram('Auth Service User');
    expect(d.messages[0]?.label).toContain('service');
  });

  it('should handle short input', () => {
    const d = gen.generateClassDiagram('hi');
    expect(d.classes.length).toBe(0);
  });

  it('should track history', () => {
    gen.generateClassDiagram('User');
    gen.generateSequenceDiagram('A B C');
    expect(gen.getHistory()).toHaveLength(2);
  });

  it('should clear history', () => {
    gen.generateClassDiagram('User');
    gen.clearHistory();
    expect(gen.getHistory()).toHaveLength(0);
  });

  it('should cap history', () => {
    for (let i = 0; i < 25; i++) {
      gen.generateClassDiagram(`Class${i}`);
    }
    expect(gen.getHistory()).toHaveLength(20);
  });
});