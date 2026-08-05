import { AdaptiveResolution } from '../src/adaptive';

describe('AdaptiveResolution', () => {
  it('starts at the maximum scale', () => {
    const adaptive = new AdaptiveResolution();
    expect(adaptive.scale).toBe(1.0);
    expect(adaptive.minScale).toBe(0.5);
    expect(adaptive.maxScale).toBe(1.0);
  });

  it('returns the scale unchanged for a non-positive fps', () => {
    const adaptive = new AdaptiveResolution();
    adaptive.update(0);
    expect(adaptive.scale).toBe(1.0);
    expect(adaptive.update(-1)).toBe(1.0);
  });

  it('shrinks the scale when fps is well below target', () => {
    const adaptive = new AdaptiveResolution({ targetFps: 30 });
    const scale = adaptive.update(20);
    expect(scale).toBe(0.95);
  });

  it('grows the scale when fps is comfortably above target', () => {
    const adaptive = new AdaptiveResolution({ targetFps: 30 });
    adaptive.scale = 0.7;
    const scale = adaptive.update(40);
    expect(scale).toBe(0.75);
  });

  it('holds the scale inside the hysteresis band', () => {
    const adaptive = new AdaptiveResolution({ targetFps: 30 });
    adaptive.scale = 0.7;
    expect(adaptive.update(28)).toBe(0.7);
    expect(adaptive.update(31)).toBe(0.7);
  });

  it('clamps at the minimum scale', () => {
    const adaptive = new AdaptiveResolution({ targetFps: 30, step: 0.05 });
    for (let i = 0; i < 50; i++) {
      adaptive.update(1);
    }
    expect(adaptive.scale).toBe(0.5);
  });

  it('clamps at the maximum scale', () => {
    const adaptive = new AdaptiveResolution({ targetFps: 30, step: 0.05 });
    adaptive.scale = 0.8;
    for (let i = 0; i < 50; i++) {
      adaptive.update(100);
    }
    expect(adaptive.scale).toBe(1.0);
  });

  it('accepts custom bounds', () => {
    const adaptive = new AdaptiveResolution({ minScale: 0.4, maxScale: 0.9, targetFps: 24, step: 0.1 });
    expect(adaptive.update(10)).toBe(0.8);
    adaptive.scale = 0.4;
    expect(adaptive.update(40)).toBe(0.5);
  });

  it('combines with a base tracking scale', () => {
    const adaptive = new AdaptiveResolution({ targetFps: 30 });
    adaptive.scale = 0.75;
    expect(adaptive.trackingScale(0.5)).toBe(0.375);
  });
});
