import { MemoryHandTracker } from '../src/tracker';

describe('MemoryHandTracker', () => {
  let tracker: MemoryHandTracker;

  beforeEach(() => {
    tracker = new MemoryHandTracker();
  });

  it('should create tracker', () => {
    expect(tracker).toBeDefined();
  });

  it('should detect hands', async () => {
    const imageData = new Uint8Array(100 * 100 * 4);
    const result = await tracker.detect(imageData, 100, 100);
    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.detections[0].landmarks).toHaveLength(21);
  });

  it('should return empty for empty image', async () => {
    const imageData = new Uint8Array(0);
    const result = await tracker.detect(imageData, 0, 0);
    expect(result.detections).toHaveLength(0);
  });

  it('should set confidence', () => {
    tracker.setConfidence(0.8);
    // No error means success
  });

  it('should set max hands', () => {
    tracker.setMaxHands(4);
    // No error means success
  });

  it('should track processing time', async () => {
    const imageData = new Uint8Array(100 * 100 * 4);
    const result = await tracker.detect(imageData, 100, 100);
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  it('should detect right handedness', async () => {
    const imageData = new Uint8Array(100 * 100 * 4);
    const result = await tracker.detect(imageData, 100, 100);
    expect(result.detections[0].handedness).toBe('right');
  });

  it('should have default confidence', async () => {
    const imageData = new Uint8Array(100 * 100 * 4);
    const result = await tracker.detect(imageData, 100, 100);
    expect(result.detections[0].confidence).toBe(0.5);
  });

  it('should set confidence and detect with new value', async () => {
    tracker.setConfidence(0.95);
    const imageData = new Uint8Array(100 * 100 * 4);
    const result = await tracker.detect(imageData, 100, 100);
    expect(result.detections[0].confidence).toBe(0.95);
  });
});