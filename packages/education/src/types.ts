export interface Lesson {
  id: string;
  title: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  concepts: string[];
}

export interface LessonStep {
  order: number;
  instruction: string;
  drawingHint?: string;
  expectedShape?: string;
}

export interface EducationEngine {
  createLesson(title: string, subject: string): Lesson;
  addStep(lessonId: string, step: Omit<LessonStep, 'order'>): LessonStep;
  getLesson(lessonId: string): Lesson | undefined;
  getSteps(lessonId: string): LessonStep[];
  getLessons(subject?: string): Lesson[];
  deleteLesson(lessonId: string): void;
}