import { EducationEngine, Lesson, LessonStep } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'EducationEngine' });

let lessonCounter = 0;

export class MemoryEducationEngine implements EducationEngine {
  private lessons: Map<string, Lesson> = new Map();
  private steps: Map<string, LessonStep[]> = new Map();

  createLesson(title: string, subject: string): Lesson {
    lessonCounter++;
    const lesson: Lesson = {
      id: `lesson-${lessonCounter}`,
      title,
      subject,
      difficulty: 'beginner',
      concepts: [],
    };
    this.lessons.set(lesson.id, lesson);
    this.steps.set(lesson.id, []);
    logger.info(`Created lesson: ${title}`);
    return lesson;
  }

  addStep(lessonId: string, step: Omit<LessonStep, 'order'>): LessonStep {
    const existing = this.steps.get(lessonId) ?? [];
    const newStep: LessonStep = { ...step, order: existing.length + 1 };
    existing.push(newStep);
    this.steps.set(lessonId, existing);
    return newStep;
  }

  getLesson(lessonId: string): Lesson | undefined {
    return this.lessons.get(lessonId);
  }

  getSteps(lessonId: string): LessonStep[] {
    return [...(this.steps.get(lessonId) ?? [])];
  }

  getLessons(subject?: string): Lesson[] {
    const all = Array.from(this.lessons.values());
    if (subject) {
      return all.filter(l => l.subject === subject);
    }
    return all;
  }

  deleteLesson(lessonId: string): void {
    this.lessons.delete(lessonId);
    this.steps.delete(lessonId);
  }
}