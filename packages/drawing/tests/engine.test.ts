import { MemoryDrawingEngine } from '../src/engine';

describe('MemoryDrawingEngine', () => {
  let engine: MemoryDrawingEngine;

  beforeEach(() => {
    engine = new MemoryDrawingEngine();
  });

  it('should create engine', () => {
    expect(engine).toBeDefined();
  });

  it('should create canvas', () => {
    const canvas = engine.createCanvas(1024, 768);
    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(768);
  });

  it('should add layer', () => {
    const layer = engine.addLayer('Background');
    expect(layer.name).toBe('Background');
    expect(layer.visible).toBe(true);
    expect(layer.opacity).toBe(1);
  });

  it('should remove layer', () => {
    const layer = engine.addLayer('Test');
    expect(engine.removeLayer(layer.id)).toBe(true);
    expect(engine.getLayers()).toHaveLength(0);
  });

  it('should return false for non-existent layer', () => {
    expect(engine.removeLayer('nonexistent')).toBe(false);
  });

  it('should set layer visibility', () => {
    const layer = engine.addLayer('Test');
    engine.setLayerVisibility(layer.id, false);
    expect(engine.getLayers()[0]?.visible).toBe(false);
  });

  it('should set layer opacity', () => {
    const layer = engine.addLayer('Test');
    engine.setLayerOpacity(layer.id, 0.5);
    expect(engine.getLayers()[0]?.opacity).toBe(0.5);
  });

  it('should clamp opacity', () => {
    const layer = engine.addLayer('Test');
    engine.setLayerOpacity(layer.id, 2);
    expect(engine.getLayers()[0]?.opacity).toBe(1);
    engine.setLayerOpacity(layer.id, -1);
    expect(engine.getLayers()[0]?.opacity).toBe(0);
  });

  it('should move layer up', () => {
    engine.addLayer('A');
    engine.addLayer('B');
    const layers = engine.getLayers();
    const firstId = layers[0]?.id;
    if (firstId) engine.moveLayerUp(firstId);
    expect(engine.getLayers()[0]?.name).toBe('B');
  });

  it('should move layer down', () => {
    engine.addLayer('A');
    engine.addLayer('B');
    const layers = engine.getLayers();
    const secondId = layers[1]?.id;
    if (secondId) engine.moveLayerDown(secondId);
    expect(engine.getLayers()[0]?.name).toBe('B');
  });

  it('should clear canvas', () => {
    engine.addLayer('Test');
    engine.clearCanvas();
    expect(engine.getLayers()).toHaveLength(0);
  });

  it('should get canvas', () => {
    const canvas = engine.getCanvas();
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });
});