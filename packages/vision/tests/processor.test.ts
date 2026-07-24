import { MemoryVisionProcessor } from '../src/processor';
import { Frame } from '../src/types';

describe('MemoryVisionProcessor', () => {
  let processor: MemoryVisionProcessor;

  beforeEach(() => {
    processor = new MemoryVisionProcessor();
  });

  it('should create processor', () => {
    expect(processor).toBeDefined();
  });

  it('should process frame', async () => {
    const frame: Frame = {
      data: new Uint8Array([100, 150, 200]),
      width: 3,
      height: 1,
      timestamp: Date.now(),
      format: 'rgb',
    };

    const result = await processor.processFrame(frame);
    expect(result.processedAt).toBeDefined();
    expect(result.stabilizationScore).toBe(1);
  });

  it('should stabilize frame without previous', async () => {
    const frame: Frame = {
      data: new Uint8Array([100, 150, 200]),
      width: 3,
      height: 1,
      timestamp: Date.now(),
      format: 'rgb',
    };

    const result = await processor.stabilizeFrame(frame);
    expect(result.stabilizationScore).toBe(1);
  });

  it('should stabilize frame with previous', async () => {
    const frame: Frame = {
      data: new Uint8Array([100, 150, 200]),
      width: 3,
      height: 1,
      timestamp: Date.now(),
      format: 'rgb',
    };

    const previousFrame: Frame = {
      data: new Uint8Array([100, 150, 200]),
      width: 3,
      height: 1,
      timestamp: Date.now() - 16,
      format: 'rgb',
    };

    const result = await processor.stabilizeFrame(frame, previousFrame);
    expect(result.stabilizationScore).toBeGreaterThan(0.9);
  });

  it('should detect motion', async () => {
    const frame: Frame = {
      data: new Uint8Array([100, 150, 200]),
      width: 3,
      height: 1,
      timestamp: Date.now(),
      format: 'rgb',
    };

    const previousFrame: Frame = {
      data: new Uint8Array([100, 150, 200]),
      width: 3,
      height: 1,
      timestamp: Date.now() - 16,
      format: 'rgb',
    };

    const motion = await processor.detectMotion(frame, previousFrame);
    expect(motion).toBe(0); // No motion since frames are identical
  });

  it('should detect high motion', async () => {
    const frame: Frame = {
      data: new Uint8Array([0, 0, 0]),
      width: 3,
      height: 1,
      timestamp: Date.now(),
      format: 'rgb',
    };

    const previousFrame: Frame = {
      data: new Uint8Array([255, 255, 255]),
      width: 3,
      height: 1,
      timestamp: Date.now() - 16,
      format: 'rgb',
    };

    const motion = await processor.detectMotion(frame, previousFrame);
    expect(motion).toBeGreaterThan(0);
  });

  it('should remove background', async () => {
    const frame: Frame = {
      data: new Uint8Array([100, 150, 200]),
      width: 3,
      height: 1,
      timestamp: Date.now(),
      format: 'rgb',
    };

    const result = await processor.removeBackground(frame);
    expect(result.data).toEqual(frame.data);
  });

  it('should handle different sized frames for stabilization', async () => {
    const frame: Frame = {
      data: new Uint8Array([100]),
      width: 1,
      height: 1,
      timestamp: Date.now(),
      format: 'rgb',
    };

    const previousFrame: Frame = {
      data: new Uint8Array([100, 200]),
      width: 2,
      height: 1,
      timestamp: Date.now() - 16,
      format: 'rgb',
    };

    const result = await processor.stabilizeFrame(frame, previousFrame);
    expect(result.stabilizationScore).toBe(0);
  });

  it('should handle different sized frames for motion', async () => {
    const frame: Frame = {
      data: new Uint8Array([100]),
      width: 1,
      height: 1,
      timestamp: Date.now(),
      format: 'rgb',
    };

    const previousFrame: Frame = {
      data: new Uint8Array([100, 200]),
      width: 2,
      height: 1,
      timestamp: Date.now() - 16,
      format: 'rgb',
    };

    const motion = await processor.detectMotion(frame, previousFrame);
    expect(motion).toBe(1);
  });
});