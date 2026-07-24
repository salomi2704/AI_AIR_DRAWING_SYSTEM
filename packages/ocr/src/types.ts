export interface OCRResult {
  text: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  words: OCRWord[];
}

export interface OCRWord {
  text: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface OCREngine {
  recognize(imageData: Uint8Array, width: number, height: number): Promise<OCRResult>;
  setLanguage(lang: string): void;
}