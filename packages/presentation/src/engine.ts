import { Presentation, PresentationEngine, Slide } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'PresentationEngine' });

let presCounter = 0;
let slideCounter = 0;

export class MemoryPresentationEngine implements PresentationEngine {
  private presentations: Map<string, Presentation> = new Map();

  create(title: string): Presentation {
    presCounter++;
    const pres: Presentation = {
      id: `pres-${presCounter}`,
      title,
      slides: [],
      createdAt: Date.now(),
    };
    this.presentations.set(pres.id, pres);
    logger.info(`Created presentation: ${title}`);
    return pres;
  }

  addSlide(presentationId: string, title: string, content: string): Slide {
    const pres = this.presentations.get(presentationId);
    if (!pres) throw new Error(`Presentation ${presentationId} not found`);

    slideCounter++;
    const slide: Slide = {
      id: `slide-${slideCounter}`,
      title,
      content,
      order: pres.slides.length + 1,
    };
    pres.slides.push(slide);
    return slide;
  }

  updateSlide(presentationId: string, slideId: string, updates: Partial<Pick<Slide, 'title' | 'content' | 'notes'>>): void {
    const pres = this.presentations.get(presentationId);
    if (!pres) return;
    const slide = pres.slides.find(s => s.id === slideId);
    if (!slide) return;
    if (updates.title !== undefined) slide.title = updates.title;
    if (updates.content !== undefined) slide.content = updates.content;
    if (updates.notes !== undefined) slide.notes = updates.notes;
  }

  removeSlide(presentationId: string, slideId: string): void {
    const pres = this.presentations.get(presentationId);
    if (!pres) return;
    pres.slides = pres.slides.filter(s => s.id !== slideId);
  }

  getPresentation(presentationId: string): Presentation | undefined {
    return this.presentations.get(presentationId);
  }

  listPresentations(): Presentation[] {
    return Array.from(this.presentations.values());
  }

  deletePresentation(presentationId: string): void {
    this.presentations.delete(presentationId);
  }
}