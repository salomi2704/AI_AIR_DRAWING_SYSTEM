import { OCREngine, OCRResult } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'OCREngine' });

export class MemoryOCREngine implements OCREngine {
  private language: string = 'en';

  async recognize(imageData: Uint8Array, width: number, height: number): Promise<OCRResult> {
    const startTime = Date.now();

    // Mock OCR - in production would use Tesseract or cloud API
    const text = imageData.length > 0 ? `Sample recognized text [${this.language}]` : '';
    const processingTime = Date.now() - startTime;

    logger.debug(`OCR completed in ${processingTime}ms`);

    return {
      text,
      confidence: text.length > 0 ? 0.92 : 0,
      boundingBox: { x: 0, y: 0, width, height },
      words: text.split(' ').map((word, i) => ({
        text: word,
        confidence: 0.9 + Math.random() * 0.1,
        boundingBox: {
          x: i * 60,
          y: 10,
          width: word.length * 10,
          height: 20,
        },
      })),
    };
  }

  setLanguage(lang: string): void {
    this.language = lang;
    logger.debug(`OCR language set to ${lang}`);
  }
}