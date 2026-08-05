import { MemoryHandTracker } from '../src/tracker';
import { AdaptiveResolution } from '@ai-air-drawing/core';

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

  it('should default tracking scale to 0.5', () => {
    expect(tracker.getInputScale()).toBe(0.5);
  });

  it('should set a custom tracking scale', () => {
    tracker.setTrackingScale(1.0);
    expect(tracker.getInputScale()).toBe(1.0);
  });

  it('should accept a tracking scale option', () => {
    const custom = new MemoryHandTracker({ trackingScale: 0.8 });
    expect(custom.getInputScale()).toBe(0.8);
  });

  it('should apply adaptive resolution to the input scale', () => {
    const adaptive = new AdaptiveResolution({ targetFps: 30 });
    adaptive.scale = 0.75;
    const custom = new MemoryHandTracker({ trackingScale: 0.5, adaptive });
    expect(custom.getInputScale()).toBe(0.375);
  });

  it('should update adaptive scale from measured fps', () => {
    const adaptive = new AdaptiveResolution({ targetFps: 30 });
    const custom = new MemoryHandTracker({ trackingScale: 0.5, adaptive });
    expect(custom.getInputScale(10)).toBe(0.5 * 0.95);
  });

  it('should scale bounding boxes by the input scale', async () => {
    const custom = new MemoryHandTracker({ trackingScale: 0.5 });
    const imageData = new Uint8Array(100 * 100 * 4);
    const result = await custom.detect(imageData, 100, 100);
    expect(result.detections[0].boundingBox.width).toBeCloseTo(100 * 0.4 * 0.5);
    expect(result.detections[0].boundingBox.height).toBeCloseTo(100 * 0.4 * 0.5);
  });
});