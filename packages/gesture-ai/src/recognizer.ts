import { GestureRecognizer, GestureResult, GestureType, RecognizeOptions } from './types';
import { LandmarkSmoother, LandmarkSmoothingOptions } from './smoothing';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'GestureRecognizer' });

export interface GestureRecognizerOptions {
  maxHistory?: number;
  pinchThreshold?: number;
  pinchExitThreshold?: number;
  pinchRatio?: number;
  pinchExitRatio?: number;
  palmNormalize?: boolean;
  confidenceAdaptation?: number;
  pinchConfirmFrames?: number;
  smoothing?: boolean | LandmarkSmoothingOptions;
}

export class MemoryGestureRecognizer implements GestureRecognizer {
  private history: GestureResult[] = [];
  private readonly maxHistory: number;
  private readonly pinchThreshold: number;
  private readonly pinchExitThreshold: number;
  private readonly pinchRatio: number;
  private readonly pinchExitRatio: number;
  private readonly palmNormalize: boolean;
  private readonly confidenceAdaptation: number;
  private readonly pinchConfirmFrames: number;
  private readonly smoother: LandmarkSmoother | null;

  private pinching = false;
  private pinchConfirmCount = 0;

  constructor(options: GestureRecognizerOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100;
    this.pinchThreshold = options.pinchThreshold ?? 0.05;
    this.pinchExitThreshold = options.pinchExitThreshold ?? 0.09;
    this.pinchRatio = options.pinchRatio ?? 0.35;
    this.pinchExitRatio = options.pinchExitRatio ?? 0.49;
    this.palmNormalize = options.palmNormalize ?? false;
    this.confidenceAdaptation = Math.max(0, Math.min(1, options.confidenceAdaptation ?? 0));
    this.pinchConfirmFrames = Math.max(1, options.pinchConfirmFrames ?? 1);
    this.smoother =
      options.smoothing === true
        ? new LandmarkSmoother()
        : options.smoothing && typeof options.smoothing === 'object'
          ? new LandmarkSmoother(options.smoothing)
          : null;
  }

  recognize(landmarks: Array<{ x: number; y: number; z: number }>, options: RecognizeOptions = {}): GestureResult {
    const toClassify = this.smoother ? this.smoother.smooth(landmarks, options.rate) : landmarks;
    const gesture = this.classifyGesture(toClassify, options);
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

  reset(): void {
    this.pinching = false;
    this.pinchConfirmCount = 0;
    this.smoother?.reset();
    logger.debug('Gesture recognizer state reset');
  }

  private get startThreshold(): number {
    return this.palmNormalize ? this.pinchRatio : this.pinchThreshold;
  }

  private get exitThreshold(): number {
    return this.palmNormalize ? this.pinchExitRatio : this.pinchExitThreshold;
  }

  private classifyGesture(
    landmarks: Array<{ x: number; y: number; z: number }>,
    options: RecognizeOptions,
  ): GestureType {
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

    // Pinch: thumb/index gap relative to palm size. Hysteretic so the hand
    // does not flicker between hover and draw around the boundary.
    const rawPinchDistance = Math.sqrt(
      Math.pow(thumb.x - index.x, 2) + Math.pow(thumb.y - index.y, 2)
    );
    const middleMcp = landmarks[9];
    const palmSize = middleMcp ? Math.max(
      Math.sqrt(Math.pow(wrist.x - middleMcp.x, 2) + Math.pow(wrist.y - middleMcp.y, 2)),
      1e-6
    ) : 1e-6;
    const pinchDistance = this.palmNormalize ? rawPinchDistance / palmSize : rawPinchDistance;

    const score = Math.max(0, Math.min(1, options.score ?? 1));
    const factor = 1 - this.confidenceAdaptation + this.confidenceAdaptation * score;
    const threshold = (this.pinching ? this.exitThreshold : this.startThreshold) * factor;
    this.pinching = pinchDistance < threshold;

    if (this.pinching) {
      // Debounce: a pinch must persist for a few frames before it can draw,
      // so a one-frame flinch never leaves a dot or clicks.
      this.pinchConfirmCount += 1;
      if (this.pinchConfirmCount >= this.pinchConfirmFrames) {
        return 'pinch';
      }
      return 'unknown';
    }
    this.pinchConfirmCount = 0;

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
