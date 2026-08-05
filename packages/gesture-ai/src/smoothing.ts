export interface LandmarkSmoothingOptions {
  enabled?: boolean;
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
  rate?: number;
}

export class LowPassFilter {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha: number) {
    this.alpha = alpha;
  }

  filter(value: number, alpha?: number): number {
    if (alpha !== undefined) {
      this.alpha = alpha;
    }
    if (this.value === null) {
      this.value = value;
    } else {
      this.value = this.alpha * value + (1 - this.alpha) * this.value;
    }
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

export class OneEuroFilter {
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  private rate: number;
  private readonly xFilter: LowPassFilter;
  private readonly dxFilter: LowPassFilter;
  private lastX: number | null = null;

  constructor(options: LandmarkSmoothingOptions = {}) {
    this.minCutoff = options.minCutoff ?? 2.0;
    this.beta = options.beta ?? 0.05;
    this.dCutoff = options.dCutoff ?? 1.0;
    this.rate = options.rate ?? 30.0;
    this.xFilter = new LowPassFilter(this.alpha(1.0));
    this.dxFilter = new LowPassFilter(this.alpha(1.0));
  }

  private alpha(cutoff: number): number {
    const dt = 1.0 / Math.max(this.rate, 1e-9);
    const tau = 1.0 / (2.0 * Math.PI * Math.max(cutoff, 1e-9));
    return 1.0 / (1.0 + tau / dt);
  }

  filter(x: number, rate?: number): number {
    if (rate !== undefined) {
      this.rate = rate;
    }
    if (this.lastX === null) {
      this.lastX = x;
      return this.xFilter.filter(x, this.alpha(this.minCutoff));
    }
    const dx = (x - this.lastX) * this.rate;
    this.lastX = x;
    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilter.filter(x, this.alpha(cutoff));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastX = null;
  }
}

export class LandmarkSmoother {
  private readonly options: Required<Omit<LandmarkSmoothingOptions, 'enabled'>>;
  private readonly filters = new Map<number, [OneEuroFilter, OneEuroFilter, OneEuroFilter]>();

  constructor(options: LandmarkSmoothingOptions = {}) {
    this.options = {
      minCutoff: options.minCutoff ?? 2.0,
      beta: options.beta ?? 0.05,
      dCutoff: options.dCutoff ?? 1.0,
      rate: options.rate ?? 30.0,
    };
  }

  smooth(landmarks: Array<{ x: number; y: number; z: number }>, rate?: number): Array<{ x: number; y: number; z: number }> {
    const r = rate ?? this.options.rate;
    return landmarks.map((landmark, index) => {
      let axis = this.filters.get(index);
      if (!axis) {
        axis = [
          new OneEuroFilter(this.options),
          new OneEuroFilter(this.options),
          new OneEuroFilter(this.options),
        ];
        this.filters.set(index, axis);
      }
      return {
        x: axis[0].filter(landmark.x, r),
        y: axis[1].filter(landmark.y, r),
        z: axis[2].filter(landmark.z, r),
      };
    });
  }

  reset(): void {
    this.filters.clear();
  }
}
