import { MemoryOCREngine } from '../src/engine';

describe('MemoryOCREngine', () => {
  let engine: MemoryOCREngine;

  beforeEach(() => {
    engine = new MemoryOCREngine();
  });

  it('should create engine', () => {
    expect(engine).toBeDefined();
  });

  it('should recognize text from image data', async () => {
    const data = new Uint8Array(100);
    const result = await engine.recognize(data, 100, 100);
    expect(result.text).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should return empty for empty image', async () => {
    const data = new Uint8Array(0);
    const result = await engine.recognize(data, 0, 0);
    expect(result.text).toBe('');
    expect(result.confidence).toBe(0);
  });

  it('should return words', async () => {
    const data = new Uint8Array(100);
    const result = await engine.recognize(data, 100, 100);
    expect(result.words.length).toBeGreaterThan(0);
  });

  it('should set language', () => {
    engine.setLanguage('es');
    // No error means success
  });

  it('should return bounding box', async () => {
    const data = new Uint8Array(100);
    const result = await engine.recognize(data, 200, 150);
    expect(result.boundingBox.width).toBe(200);
    expect(result.boundingBox.height).toBe(150);
  });
});