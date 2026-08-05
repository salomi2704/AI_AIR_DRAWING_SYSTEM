export type GestureType = 'fist' | 'open_palm' | 'pointing' | 'thumbs_up' | 'peace' | 'grab' | 'pinch' | 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'circle' | 'unknown';

export interface GestureResult {
  gesture: GestureType;
  confidence: number;
  landmarks: Array<{ x: number; y: number; z: number }>;
  timestamp: number;
  duration: number;
}

export interface RecognizeOptions {
  score?: number;
  rate?: number;
}

export interface GestureRecognizer {
  recognize(landmarks: Array<{ x: number; y: number; z: number }>, options?: RecognizeOptions): GestureResult;
  getHistory(): GestureResult[];
  clearHistory(): void;
  reset(): void;
}