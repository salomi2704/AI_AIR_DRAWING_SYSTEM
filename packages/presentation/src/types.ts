export interface Slide {
  id: string;
  title: string;
  content: string;
  notes?: string;
  order: number;
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  createdAt: number;
}

export interface PresentationEngine {
  create(title: string): Presentation;
  addSlide(presentationId: string, title: string, content: string): Slide;
  updateSlide(presentationId: string, slideId: string, updates: Partial<Pick<Slide, 'title' | 'content' | 'notes'>>): void;
  removeSlide(presentationId: string, slideId: string): void;
  getPresentation(presentationId: string): Presentation | undefined;
  listPresentations(): Presentation[];
  deletePresentation(presentationId: string): void;
}