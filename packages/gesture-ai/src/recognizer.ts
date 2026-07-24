import { GestureRecognizer, GestureResult, GestureType } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'GestureRecognizer' });

export class MemoryGestureRecognizer implements GestureRecognizer {
  private history: GestureResult[] = [];
  private maxHistory: number = 100;

  recognize(landmarks: Array<{ x: number; y: number; z: number }>): GestureResult {
    const gesture = this.classifyGesture(landmarks);
    const result: GestureResult = {
      gesture,
      confidence: 0.85,
      landmarks,
      timestamp: Date.now(),
      duration: 0,
    };

    this.history.push(result);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    logger.debug(`Recognized gesture: ${gesture}`);
    return result;
  }

  getHistory(): GestureResult[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    logger.debug('Gesture history cleared');
  }

  private classifyGesture(landmarks: Array<{ x: number; y: number; z: number }>): GestureType {
    if (landmarks.length < 21) return 'unknown';

    const thumb = landmarks[4];
    const index = landmarks[8];
    const middle = landmarks[12];
    const ring = landmarks[16];
    const pinky = landmarks[20];
    const wrist = landmarks[0];

    if (!thumb || !index || !middle || !ring || !pinky || !wrist) return 'unknown';

    // Check if fingers are extended
    const indexExtended = index.y < landmarks[6]?.y!;
    const middleExtended = middle.y < landmarks[10]?.y!;
    const ringExtended = ring.y < landmarks[14]?.y!;
    const pinkyExtended = pinky.y < landmarks[18]?.y!;
    const thumbExtended = thumb.x > landmarks[3]?.x!;

    // Pinch - thumb and index close together (check before fist)
    const pinchDist = Math.sqrt(
      Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
    );
    if (pinchDist < 0.05) {
      return 'pinch';
    }

    // Fist - no fingers extended
    if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && !thumbExtended) {
      return 'fist';
    }

    // Open palm - all fingers extended
    if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
      return 'open_palm';
    }

    // Pointing - only index extended
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'pointing';
    }

    // Peace sign - index and middle extended
    if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
      return 'peace';
    }

    // Thumbs up
    if (thumbExtended && !indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
      return 'thumbs_up';
    }

    return 'unknown';
  }
}