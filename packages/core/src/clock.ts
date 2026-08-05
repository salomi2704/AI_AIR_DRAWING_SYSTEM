const TARGET_FPS = 30;

export interface Clock {
  now(): number;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class FPSMeter {
  private readonly alpha: number;
  private lastTick: number | null = null;
  private currentFps = 0;
  private readonly clock: Clock;

  constructor(alpha = 0.1, clock: Clock = new SystemClock()) {
    this.alpha = alpha;
    this.clock = clock;
  }

  tick(now?: number): number {
    const ts = now ?? this.clock.now();
    if (this.lastTick !== null) {
      const dt = ts - this.lastTick;
      if (dt > 1e-6) {
        const instantaneous = 1000 / dt;
        this.currentFps =
          this.currentFps <= 0
            ? instantaneous
            : this.alpha * instantaneous + (1 - this.alpha) * this.currentFps;
      }
    }
    this.lastTick = ts;
    return this.currentFps;
  }

  get fps(): number {
    return this.currentFps;
  }
}

export class FramePacer {
  readonly intervalMs: number;
  private readonly clock: Clock;

  constructor(fpsTarget = TARGET_FPS, clock: Clock = new SystemClock()) {
    this.intervalMs = 1000 / fpsTarget;
    this.clock = clock;
  }

  wait(frameStarted: number): number {
    const elapsed = this.clock.now() - frameStarted;
    return Math.max(0, this.intervalMs - elapsed);
  }
}
