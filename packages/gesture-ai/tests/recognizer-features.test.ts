import { MemoryGestureRecognizer } from '../src/recognizer';

function foldedHand(gap: number): Array<{ x: number; y: number; z: number }> {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[0] = { x: 0.5, y: 0.8, z: 0 };
  lm[3] = { x: 0.6, y: 0.5, z: 0 };
  lm[4] = { x: 0.5, y: 0.5, z: 0 };
  lm[6] = { x: 0.4, y: 0.4, z: 0 };
  lm[8] = { x: 0.5 + gap, y: 0.5, z: 0 };
  lm[9] = { x: 0.5, y: 0.5, z: 0 };
  lm[10] = { x: 0.5, y: 0.4, z: 0 };
  lm[12] = { x: 0.5, y: 0.5, z: 0 };
  lm[14] = { x: 0.6, y: 0.4, z: 0 };
  lm[16] = { x: 0.6, y: 0.5, z: 0 };
  lm[18] = { x: 0.7, y: 0.4, z: 0 };
  lm[20] = { x: 0.7, y: 0.5, z: 0 };
  return lm;
}

function openHand(): Array<{ x: number; y: number; z: number }> {
  const lm = foldedHand(0.5);
  lm[6] = { x: 0.4, y: 0.4, z: 0 };
  lm[8] = { x: 0.4, y: 0.1, z: 0 };
  lm[10] = { x: 0.5, y: 0.4, z: 0 };
  lm[12] = { x: 0.5, y: 0.1, z: 0 };
  lm[14] = { x: 0.6, y: 0.4, z: 0 };
  lm[16] = { x: 0.6, y: 0.1, z: 0 };
  lm[18] = { x: 0.7, y: 0.4, z: 0 };
  lm[20] = { x: 0.7, y: 0.1, z: 0 };
  lm[3] = { x: 0.6, y: 0.5, z: 0 };
  lm[4] = { x: 0.8, y: 0.5, z: 0 };
  return lm;
}

describe('MemoryGestureRecognizer features', () => {
  it('keeps the default raw pinch threshold behavior', () => {
    const r = new MemoryGestureRecognizer();
    expect(r.recognize(foldedHand(0.04)).gesture).toBe('pinch');
    r.reset();
    expect(r.recognize(foldedHand(0.06)).gesture).toBe('fist');
  });

  it('latches onto a pinch hysteretically around the boundary', () => {
    const r = new MemoryGestureRecognizer();
    expect(r.recognize(foldedHand(0.07)).gesture).toBe('fist');
    expect(r.recognize(foldedHand(0.02)).gesture).toBe('pinch');
    expect(r.recognize(foldedHand(0.07)).gesture).toBe('pinch');
    expect(r.recognize(foldedHand(0.5)).gesture).toBe('fist');
    expect(r.recognize(foldedHand(0.07)).gesture).toBe('fist');
  });

  it('normalizes the pinch gap by palm size when enabled', () => {
    const r = new MemoryGestureRecognizer({ palmNormalize: true, pinchRatio: 0.35, pinchExitRatio: 0.49 });
    expect(r.recognize(foldedHand(0.1)).gesture).toBe('pinch');
    expect(r.recognize(foldedHand(0.16)).gesture).toBe('fist');
  });

  it('adapts the pinch threshold to tracking confidence', () => {
    const r = new MemoryGestureRecognizer({ confidenceAdaptation: 1 });
    expect(r.recognize(foldedHand(0.04), { score: 0 }).gesture).toBe('fist');
    expect(r.recognize(foldedHand(0.04), { score: 1 }).gesture).toBe('pinch');

    const partial = new MemoryGestureRecognizer({ confidenceAdaptation: 0.5 });
    expect(partial.recognize(foldedHand(0.04), { score: 0 }).gesture).toBe('fist');
    expect(partial.recognize(foldedHand(0.04), { score: 1 }).gesture).toBe('pinch');
  });

  it('debounces pinch so it must persist for several frames', () => {
    const r = new MemoryGestureRecognizer({ pinchConfirmFrames: 3 });
    expect(r.recognize(foldedHand(0.02)).gesture).toBe('unknown');
    expect(r.recognize(foldedHand(0.02)).gesture).toBe('unknown');
    expect(r.recognize(foldedHand(0.02)).gesture).toBe('pinch');
    expect(r.recognize(foldedHand(0.5)).gesture).toBe('fist');
    expect(r.recognize(foldedHand(0.02)).gesture).toBe('unknown');
  });

  it('smoothes landmarks with One-Euro before classifying when enabled', () => {
    const r = new MemoryGestureRecognizer({ smoothing: true });
    expect(r.recognize(openHand()).gesture).toBe('open_palm');
    const lm = openHand();
    for (let i = 0; i < 10; i++) {
      lm[8]!.y = 0.1 + (i % 2 === 0 ? 0.02 : -0.02);
      lm[12]!.y = 0.1 + (i % 3 === 0 ? 0.02 : -0.02);
      expect(r.recognize(lm).gesture).toBe('open_palm');
    }
  });

  it('accepts smoothing options and an explicit frame rate', () => {
    const r = new MemoryGestureRecognizer({ smoothing: { enabled: true, beta: 0.1, minCutoff: 1 } });
    expect(r.recognize(openHand(), { rate: 60 }).gesture).toBe('open_palm');
  });

  it('reset clears the pinch latch and smoothing history', () => {
    const r = new MemoryGestureRecognizer({ smoothing: true });
    expect(r.recognize(foldedHand(0.02)).gesture).toBe('pinch');
    r.reset();
    expect(r.recognize(foldedHand(0.07)).gesture).toBe('fist');
    expect(r.recognize(openHand()).gesture).toBe('open_palm');
  });

  it('returns unknown for too few or incomplete landmarks', () => {
    const r = new MemoryGestureRecognizer();
    expect(r.recognize([{ x: 0, y: 0, z: 0 }]).gesture).toBe('unknown');
    const sparse = new Array(21);
    expect(r.recognize(sparse as Array<{ x: number; y: number; z: number }>).gesture).toBe('unknown');
  });

  it('handles a missing middle MCP landmark defensively', () => {
    const r = new MemoryGestureRecognizer({ palmNormalize: true });
    const lm = foldedHand(0.1);
    lm[9] = undefined as unknown as { x: number; y: number; z: number };
    expect(r.recognize(lm).gesture).toBe('fist');
  });

  it('respects a custom history limit', () => {
    const r = new MemoryGestureRecognizer({ maxHistory: 2 });
    r.recognize(foldedHand(0.02));
    r.recognize(foldedHand(0.02));
    r.recognize(foldedHand(0.02));
    expect(r.getHistory()).toHaveLength(2);
  });
});
