import { MemoryEducationEngine } from '../src/engine';

describe('MemoryEducationEngine', () => {
  let engine: MemoryEducationEngine;

  beforeEach(() => {
    engine = new MemoryEducationEngine();
  });

  it('should create engine', () => {
    expect(engine).toBeDefined();
  });

  it('should create lesson', () => {
    const lesson = engine.createLesson('Shapes 101', 'math');
    expect(lesson.id).toMatch(/^lesson-/);
    expect(lesson.title).toBe('Shapes 101');
    expect(lesson.subject).toBe('math');
  });

  it('should add step to lesson', () => {
    const lesson = engine.createLesson('Shapes', 'math');
    const step = engine.addStep(lesson.id, { instruction: 'Draw a circle', drawingHint: 'round' });
    expect(step.order).toBe(1);
    expect(step.instruction).toBe('Draw a circle');
  });

  it('should add multiple steps with incrementing order', () => {
    const lesson = engine.createLesson('Shapes', 'math');
    engine.addStep(lesson.id, { instruction: 'Step 1' });
    const s2 = engine.addStep(lesson.id, { instruction: 'Step 2' });
    expect(s2.order).toBe(2);
  });

  it('should get steps for lesson', () => {
    const lesson = engine.createLesson('Shapes', 'math');
    engine.addStep(lesson.id, { instruction: 'Step 1' });
    engine.addStep(lesson.id, { instruction: 'Step 2' });
    expect(engine.getSteps(lesson.id)).toHaveLength(2);
  });

  it('should get lesson by id', () => {
    const lesson = engine.createLesson('Test', 'science');
    expect(engine.getLesson(lesson.id)).toBeDefined();
  });

  it('should get lessons by subject', () => {
    engine.createLesson('Math 1', 'math');
    engine.createLesson('Math 2', 'math');
    engine.createLesson('Science 1', 'science');
    expect(engine.getLessons('math')).toHaveLength(2);
    expect(engine.getLessons()).toHaveLength(3);
  });

  it('should delete lesson', () => {
    const lesson = engine.createLesson('Test', 'math');
    engine.deleteLesson(lesson.id);
    expect(engine.getLesson(lesson.id)).toBeUndefined();
  });
});