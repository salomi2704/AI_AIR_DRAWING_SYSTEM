const DEFAULT_MIN_SCALE = 0.5;
const DEFAULT_MAX_SCALE = 1.0;
const DEFAULT_TARGET_FPS = 30;
const DEFAULT_STEP = 0.05;

export interface AdaptiveResolutionOptions {
  minScale?: number;
  maxScale?: number;
  targetFps?: number;
  step?: number;
}

export class AdaptiveResolution {
  readonly minScale: number;
  readonly maxScale: number;
  readonly targetFps: number;
  readonly step: number;
  scale: number;

  constructor(options: AdaptiveResolutionOptions = {}) {
    this.minScale = options.minScale ?? DEFAULT_MIN_SCALE;
    this.maxScale = options.maxScale ?? DEFAULT_MAX_SCALE;
    this.targetFps = options.targetFps ?? DEFAULT_TARGET_FPS;
    this.step = options.step ?? DEFAULT_STEP;
    this.scale = this.maxScale;
  }

  update(fps: number): number {
    if (fps <= 0) {
      return this.scale;
    }
    if (fps < this.targetFps * 0.8) {
      this.scale = Math.max(this.minScale, this.scale - this.step);
    } else if (fps > this.targetFps * 1.05) {
      this.scale = Math.min(this.maxScale, this.scale + this.step);
    }
    return this.scale;
  }

  trackingScale(baseScale: number): number {
    return baseScale * this.scale;
  }
}
