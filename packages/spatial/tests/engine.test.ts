import { MemorySpatialEngine } from '../src/engine';

describe('MemorySpatialEngine', () => {
  let engine: MemorySpatialEngine;

  beforeEach(() => {
    engine = new MemorySpatialEngine();
  });

  it('should create engine', () => {
    expect(engine).toBeDefined();
  });

  it('should create scene', () => {
    const scene = engine.createScene();
    expect(scene.id).toMatch(/^scene-/);
    expect(scene.objects).toHaveLength(0);
    expect(scene.camera.position.z).toBe(5);
  });

  it('should add object', () => {
    const scene = engine.createScene();
    const obj = engine.addObject(scene.id, 'cube', { x: 1, y: 2, z: 3 });
    expect(obj.type).toBe('cube');
    expect(obj.position.x).toBe(1);
  });

  it('should add object with default position', () => {
    const scene = engine.createScene();
    const obj = engine.addObject(scene.id, 'sphere');
    expect(obj.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('should throw for unknown scene', () => {
    expect(() => engine.addObject('unknown', 'cube')).toThrow();
  });

  it('should remove object', () => {
    const scene = engine.createScene();
    const obj = engine.addObject(scene.id, 'cube');
    engine.removeObject(scene.id, obj.id);
    expect(engine.getScene(scene.id)?.objects).toHaveLength(0);
  });

  it('should remove from unknown scene', () => {
    engine.removeObject('unknown', 'obj-1');
  });

  it('should transform object position', () => {
    const scene = engine.createScene();
    const obj = engine.addObject(scene.id, 'cube');
    engine.transformObject(scene.id, obj.id, { x: 10, y: 20 });
    const updated = engine.getScene(scene.id)?.objects[0];
    expect(updated?.position.x).toBe(10);
    expect(updated?.position.y).toBe(20);
    expect(updated?.position.z).toBe(0);
  });

  it('should transform object scale', () => {
    const scene = engine.createScene();
    const obj = engine.addObject(scene.id, 'cube');
    engine.transformObject(scene.id, obj.id, undefined, { x: 2, y: 3 });
    const updated = engine.getScene(scene.id)?.objects[0];
    expect(updated?.scale.x).toBe(2);
    expect(updated?.scale.y).toBe(3);
  });

  it('should handle transform on unknown scene', () => {
    engine.transformObject('unknown', 'obj-1', { x: 1 });
  });

  it('should handle transform on unknown object', () => {
    const scene = engine.createScene();
    engine.transformObject(scene.id, 'unknown', { x: 1 });
  });

  it('should get scene', () => {
    const scene = engine.createScene();
    expect(engine.getScene(scene.id)).toBeDefined();
  });
});