import { MemoryDesignEngine } from '../src/engine';

describe('MemoryDesignEngine', () => {
  let engine: MemoryDesignEngine;

  beforeEach(() => {
    MemoryDesignEngine.resetCounters();
    engine = new MemoryDesignEngine();
  });

  it('should create engine', () => {
    expect(engine).toBeDefined();
  });

  it('should create design system', () => {
    const sys = engine.createSystem('WyshCare');
    expect(sys.name).toBe('WyshCare');
    expect(sys.colors.primary).toBeDefined();
    expect(sys.fonts.length).toBeGreaterThan(0);
  });

  it('should add component', () => {
    engine.createSystem('Test');
    const comp = engine.addComponent('design-1', 'button', { label: 'Click' });
    expect(comp.type).toBe('button');
    expect(comp.properties.label).toBe('Click');
  });

  it('should add component with default properties', () => {
    engine.createSystem('Test');
    const comp = engine.addComponent('design-1', 'card');
    expect(comp.properties).toEqual({});
  });

  it('should throw for unknown system', () => {
    expect(() => engine.addComponent('design-999', 'button')).toThrow();
  });

  it('should list systems', () => {
    engine.createSystem('A');
    engine.createSystem('B');
    expect(engine.listSystems()).toHaveLength(2);
  });

  it('should get system', () => {
    engine.createSystem('Test');
    const found = engine.getSystem('design-1');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Test');
  });

  it('should delete system', () => {
    engine.createSystem('Test');
    engine.deleteSystem('design-1');
    expect(engine.getSystem('design-1')).toBeUndefined();
  });
});