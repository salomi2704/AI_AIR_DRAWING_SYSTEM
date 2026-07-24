import { MemoryPresentationEngine } from '../src/engine';

describe('MemoryPresentationEngine', () => {
  let engine: MemoryPresentationEngine;

  beforeEach(() => {
    engine = new MemoryPresentationEngine();
  });

  it('should create engine', () => {
    expect(engine).toBeDefined();
  });

  it('should create presentation', () => {
    const pres = engine.create('My Talk');
    expect(pres.title).toBe('My Talk');
    expect(pres.slides).toHaveLength(0);
  });

  it('should add slide', () => {
    const pres = engine.create('Talk');
    const slide = engine.addSlide(pres.id, 'Intro', 'Welcome');
    expect(slide.title).toBe('Intro');
    expect(slide.order).toBe(1);
  });

  it('should add multiple slides', () => {
    const pres = engine.create('Talk');
    engine.addSlide(pres.id, 'S1', 'Content 1');
    engine.addSlide(pres.id, 'S2', 'Content 2');
    const updated = engine.getPresentation(pres.id);
    expect(updated?.slides).toHaveLength(2);
  });

  it('should update slide', () => {
    const pres = engine.create('Talk');
    const slide = engine.addSlide(pres.id, 'Old', 'Content');
    engine.updateSlide(pres.id, slide.id, { title: 'New', notes: 'My notes' });
    const updated = engine.getPresentation(pres.id);
    expect(updated?.slides[0]?.title).toBe('New');
    expect(updated?.slides[0]?.notes).toBe('My notes');
  });

  it('should remove slide', () => {
    const pres = engine.create('Talk');
    const slide = engine.addSlide(pres.id, 'S1', 'C1');
    engine.removeSlide(pres.id, slide.id);
    const updated = engine.getPresentation(pres.id);
    expect(updated?.slides).toHaveLength(0);
  });

  it('should handle update on unknown presentation', () => {
    engine.updateSlide('unknown', 'slide-1', { title: 'X' });
  });

  it('should handle remove on unknown presentation', () => {
    engine.removeSlide('unknown', 'slide-1');
  });

  it('should list presentations', () => {
    engine.create('A');
    engine.create('B');
    expect(engine.listPresentations()).toHaveLength(2);
  });

  it('should delete presentation', () => {
    const pres = engine.create('Test');
    engine.deletePresentation(pres.id);
    expect(engine.getPresentation(pres.id)).toBeUndefined();
  });

  it('should throw for addSlide on unknown', () => {
    expect(() => engine.addSlide('unknown', 'S', 'C')).toThrow();
  });
});