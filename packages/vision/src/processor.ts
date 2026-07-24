import { Frame, ProcessedFrame, VisionProcessor } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'VisionProcessor' });

export class MemoryVisionProcessor implements VisionProcessor {
  async processFrame(frame: Frame): Promise<ProcessedFrame> {
    logger.debug(`Processing frame: ${frame.width}x${frame.height}`);
    return {
      ...frame,
      processedAt: Date.now(),
      stabilizationScore: 1.0,
    };
  }

  async stabilizeFrame(frame: Frame, previousFrame?: Frame): Promise<ProcessedFrame> {
    if (!previousFrame) {
      return {
        ...frame,
        processedAt: Date.now(),
        stabilizationScore: 1.0,
      };
    }

    // Simple motion-based stabilization score
    const score = this.calculateStabilityScore(frame, previousFrame);
    logger.debug(`Frame stability score: ${score.toFixed(2)}`);

    return {
      ...frame,
      processedAt: Date.now(),
      stabilizationScore: score,
    };
  }

  async removeBackground(frame: Frame): Promise<Frame> {
    logger.debug('Removing background from frame');
    // In production, this would use a background removal model
    return frame;
  }

  async detectMotion(frame: Frame, previousFrame: Frame): Promise<number> {
    const motion = this.calculateMotionLevel(frame, previousFrame);
    logger.debug(`Motion level: ${motion.toFixed(2)}`);
    return motion;
  }

  private calculateStabilityScore(frame: Frame, previousFrame: Frame): number {
    if (frame.width !== previousFrame.width || frame.height !== previousFrame.height) {
      return 0;
    }

    let diff = 0;
    const sampleSize = Math.min(frame.data.length, previousFrame.data.length);
    for (let i = 0; i < sampleSize; i += 100) {
      const frameVal = frame.data[i];
      const prevVal = previousFrame.data[i];
      if (frameVal !== undefined && prevVal !== undefined) {
        diff += Math.abs(frameVal - prevVal);
      }
    }

    const avgDiff = diff / (sampleSize / 100);
    return Math.max(0, 1 - avgDiff / 128);
  }

  private calculateMotionLevel(frame: Frame, previousFrame: Frame): number {
    if (frame.width !== previousFrame.width || frame.height !== previousFrame.height) {
      return 1;
    }

    let motion = 0;
    const sampleSize = Math.min(frame.data.length, previousFrame.data.length);
    for (let i = 0; i < sampleSize; i += 100) {
      const frameVal = frame.data[i];
      const prevVal = previousFrame.data[i];
      if (frameVal !== undefined && prevVal !== undefined) {
        motion += Math.abs(frameVal - prevVal);
      }
    }

    return Math.min(1, motion / (sampleSize / 100) / 128);
  }
}