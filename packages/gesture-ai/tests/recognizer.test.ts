import { MemoryGestureRecognizer } from '../src/recognizer';

function makeLandmarks(opts: {
  indexExtended?: boolean;
  middleExtended?: boolean;
  ringExtended?: boolean;
  pinkyExtended?: boolean;
  thumbExtended?: boolean;
} = {}) {
  const lmk = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  // wrist at bottom
  lmk[0] = { x: 0.5, y: 0.8, z: 0 };
  // thumb: tip(4) > ip(3) in x => extended
  lmk[3] = { x: 0.4, y: 0.5, z: 0 };
  lmk[4] = { x: opts.thumbExtended ? 0.8 : 0.35, y: 0.5, z: 0 };
  // index: tip(8) < pip(6) in y => extended
  lmk[6] = { x: 0.4, y: 0.4, z: 0 };
  lmk[8] = { x: 0.4, y: opts.indexExtended ? 0.1 : 0.5, z: 0 };
  // middle
  lmk[10] = { x: 0.5, y: 0.4, z: 0 };
  lmk[12] = { x: 0.5, y: opts.middleExtended ? 0.1 : 0.5, z: 0 };
  // ring
  lmk[14] = { x: 0.6, y: 0.4, z: 0 };
  lmk[16] = { x: 0.6, y: opts.ringExtended ? 0.1 : 0.5, z: 0 };
  // pinky
  lmk[18] = { x: 0.7, y: 0.4, z: 0 };
  lmk[20] = { x: 0.7, y: opts.pinkyExtended ? 0.1 : 0.5, z: 0 };
  return lmk;
}

describe('MemoryGestureRecognizer', () => {
  let recognizer: MemoryGestureRecognizer;

  beforeEach(() => {
    recognizer = new MemoryGestureRecognizer();
  });

  it('should create recognizer', () => {
    expect(recognizer).toBeDefined();
  });

  it('should recognize open palm (all fingers extended)', () => {
    const lm = makeLandmarks({ indexExtended: true, middleExtended: true, ringExtended: true, pinkyExtended: true });
    expect(recognizer.recognize(lm).gesture).toBe('open_palm');
  });

  it('should recognize fist (no fingers extended)', () => {
    const lm = makeLandmarks();
    expect(recognizer.recognize(lm).gesture).toBe('fist');
  });

  it('should recognize pointing (only index)', () => {
    const lm = makeLandmarks({ indexExtended: true });
    expect(recognizer.recognize(lm).gesture).toBe('pointing');
  });

  it('should recognize peace sign (index + middle)', () => {
    const lm = makeLandmarks({ indexExtended: true, middleExtended: true });
    expect(recognizer.recognize(lm).gesture).toBe('peace');
  });

  it('should recognize thumbs up (only thumb)', () => {
    const lm = makeLandmarks({ thumbExtended: true });
    expect(recognizer.recognize(lm).gesture).toBe('thumbs_up');
  });

  it('should recognize pinch (thumb and index close, fingers not extended)', () => {
    const lm = makeLandmarks({ indexExtended: false, middleExtended: false, ringExtended: false, pinkyExtended: false, thumbExtended: false });
    // Make thumb tip and index tip very close, thumb not extended (tip.x < ip.x)
    lm[3] = { x: 0.6, y: 0.5, z: 0 };
    lm[4] = { x: 0.41, y: 0.5, z: 0 };
    lm[8] = { x: 0.42, y: 0.5, z: 0 };
    expect(recognizer.recognize(lm).gesture).toBe('pinch');
  });

  it('should return unknown for too few landmarks', () => {
    expect(recognizer.recognize([{ x: 0, y: 0, z: 0 }]).gesture).toBe('unknown');
  });

  it('should track history', () => {
    recognizer.recognize(makeLandmarks());
    recognizer.recognize(makeLandmarks());
    expect(recognizer.getHistory()).toHaveLength(2);
  });

  it('should clear history', () => {
    recognizer.recognize(makeLandmarks());
    recognizer.clearHistory();
    expect(recognizer.getHistory()).toHaveLength(0);
  });
});