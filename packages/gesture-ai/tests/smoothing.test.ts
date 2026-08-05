import { LowPassFilter, OneEuroFilter, LandmarkSmoother } from '../src/smoothing';

describe('LowPassFilter', () => {
  it('converges toward a constant input', () => {
    const filter = new LowPassFilter(0.5);
    let value = filter.filter(10);
    for (let i = 0; i < 100; i++) {
      value = filter.filter(10);
    }
    expect(value).toBeCloseTo(10, 5);
  });

  it('returns the first sample unchanged', () => {
    const filter = new LowPassFilter(0.2);
    expect(filter.filter(42)).toBe(42);
  });

  it('honors an explicit alpha per call', () => {
    const filter = new LowPassFilter(0.5);
    filter.filter(0);
    const value = filter.filter(100, 1.0);
    expect(value).toBe(100);
  });

  it('resets its history', () => {
    const filter = new LowPassFilter(0.5);
    filter.filter(0);
    filter.filter(100);
    filter.reset();
    expect(filter.filter(7)).toBe(7);
  });
});

describe('OneEuroFilter', () => {
  it('passes the first sample through', () => {
    const filter = new OneEuroFilter();
    expect(filter.filter(0.5)).toBe(0.5);
  });

  it('smooths jittery input over time', () => {
    const filter = new OneEuroFilter({ minCutoff: 1.0, beta: 0.01, rate: 30 });
    const noisy = [0.5, 0.52, 0.49, 0.51, 0.5, 0.53, 0.48, 0.5, 0.51, 0.5];
    const output = noisy.map((v) => filter.filter(v));
    const noise = Math.max(...noisy) - Math.min(...noisy);
    const smooth = Math.max(...output) - Math.min(...output);
    expect(smooth).toBeLessThan(noise);
  });

  it('adapts its rate', () => {
    const filter = new OneEuroFilter({ rate: 30 });
    filter.filter(0);
    filter.filter(0.1, 60);
    filter.reset();
    filter.filter(0.2);
    expect(filter.filter(0.2)).toBeCloseTo(0.2, 2);
  });

  it('resets its history', () => {
    const filter = new OneEuroFilter();
    filter.filter(0);
    filter.filter(1);
    filter.reset();
    expect(filter.filter(3)).toBe(3);
  });
});

describe('LandmarkSmoother', () => {
  const base = Array.from({ length: 21 }, (_, i) => ({ x: 0.5, y: 0.5 + i * 0.001, z: 0 }));

  it('returns a same-length array and preserves the first sample', () => {
    const smoother = new LandmarkSmoother();
    const out = smoother.smooth(base);
    expect(out).toHaveLength(21);
    expect(out[0]).toEqual({ x: 0.5, y: 0.5, z: 0 });
  });

  it('reduces jitter across consecutive frames', () => {
    const smoother = new LandmarkSmoother({ minCutoff: 1.0, beta: 0.01 });
    const jitter = (frame: number): number => base[8]!.y + (frame % 2 === 0 ? 0.06 : -0.06);
    const ys: number[] = [];
    for (let frame = 0; frame < 40; frame++) {
      const lm = base.map((p, i) => (i === 8 ? { ...p, y: jitter(frame) } : { ...p }));
      ys.push(smoother.smooth(lm)[8]!.y);
    }
    const late = ys.slice(30);
    const lateJitter = Math.max(...late) - Math.min(...late);
    expect(lateJitter).toBeLessThan(0.06);
  });

  it('keeps per-landmark filters independent', () => {
    const smoother = new LandmarkSmoother();
    const lm = base.map((p, i) => (i === 8 ? { ...p, y: 0.1 } : { ...p }));
    const out = smoother.smooth(lm);
    expect(out[8]!.y).toBe(0.1);
    expect(out[0]!.y).toBe(0.5);
  });

  it('accepts an explicit rate', () => {
    const smoother = new LandmarkSmoother();
    const out = smoother.smooth(base, 60);
    expect(out).toHaveLength(21);
  });

  it('resets filter history', () => {
    const smoother = new LandmarkSmoother();
    smoother.smooth(base);
    smoother.smooth(base);
    smoother.reset();
    const out = smoother.smooth(base);
    expect(out[8]!.y).toBe(base[8]!.y);
  });
});
