import { FPSMeter, FramePacer, SystemClock } from '../src/clock';

class FakeClock implements InstanceType<typeof SystemClock> {
  private value = 0;
  now(): number {
    return this.value;
  }
  advance(ms: number): void {
    this.value += ms;
  }
}

describe('FPSMeter', () => {
  it('returns 0 until two ticks are seen', () => {
    const meter = new FPSMeter(0.1, new FakeClock());
    expect(meter.fps).toBe(0);
    expect(meter.tick()).toBe(0);
  });

  it('seeds fps from the first instantaneous value', () => {
    const clock = new FakeClock();
    const meter = new FPSMeter(0.1, clock);
    meter.tick();
    clock.advance(100);
    const fps = meter.tick();
    expect(fps).toBeCloseTo(10);
  });

  it('smooths successive samples with the alpha factor', () => {
    const clock = new FakeClock();
    const meter = new FPSMeter(0.5, clock);
    meter.tick();
    clock.advance(50);
    const first = meter.tick();
    clock.advance(50);
    const second = meter.tick();
    expect(first).toBe(20);
    expect(second).toBeCloseTo(0.5 * 20 + 0.5 * 20);
    clock.advance(100);
    const third = meter.tick();
    expect(third).toBeCloseTo(0.5 * 10 + 0.5 * 20);
  });

  it('ignores degenerate zero-length ticks', () => {
    const clock = new FakeClock();
    const meter = new FPSMeter(0.1, clock);
    meter.tick();
    const before = meter.tick();
    expect(before).toBe(0);
    clock.advance(40);
    expect(meter.tick()).toBe(25);
  });

  it('respects an explicit now timestamp', () => {
    const meter = new FPSMeter(0.1);
    meter.tick(1000);
    expect(meter.tick(1040)).toBeCloseTo(25);
  });
});

describe('FramePacer', () => {
  it('computes the sleep needed to hit the target interval', () => {
    const clock = new FakeClock();
    const pacer = new FramePacer(30, clock);
    expect(pacer.wait(0)).toBeCloseTo(1000 / 30);
    clock.advance(1000 / 30);
    expect(pacer.wait(0)).toBeCloseTo(0);
    clock.advance(5);
    expect(pacer.wait(0)).toBe(0);
  });
});
