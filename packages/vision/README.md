# AI Air Drawing - Vision Package

## Overview

The **Vision Package** provides the computer vision foundation for the AI Air Drawing System. This core package implements camera capture, frame processing, background removal, and video enhancement capabilities essential for air drawing applications.

## Features

### Camera Integration
- Camera abstraction across multiple platforms
- Webcam support for desktop applications
- Mobile camera support for iOS and Android
- Video preprocessing and enhancement
- Multi-camera switching support

### Computer Vision Core
- Background removal and segmentation
- Frame stabilization for smooth drawing
- FPS optimization and performance tuning
- Multi-resolution support
- Real-time video processing

### Image Processing
- Color space conversion (RGB, HSV, etc.)
- Image filtering and enhancement
- Edge detection and feature extraction
- Object detection and tracking
- Quality improvement algorithms

### Video Pipeline
- Frame capture and buffering
- Video stream processing
- Performance monitoring
- Error handling and recovery
- Configurable processing pipelines

## Quick Start

```bash
npm install @ai-air-drawing/vision
```

```typescript
import { VisionEngine } from '@ai-air-drawing/vision';

// Initialize vision engine
const vision = new VisionEngine({
  camera: 'webcam',
  resolution: { width: 1280, height: 720 },
  frameRate: 60,
  enableBackgroundRemoval: true,
  enableStabilization: true
});

// Start camera
await vision.start();

// Process frames
vision.on('frame', async (frame) => {
  const processedFrame = await vision.processFrame(frame);
  // Use processed frame for air drawing
});
```

## API Reference

### VisionEngine

```typescript
interface VisionConfig {
  camera: CameraConfig;
  processing: ProcessingConfig;
  output: OutputConfig;
  performance: PerformanceConfig;
}

interface CameraConfig {
  device?: string;
  resolution: { width: number; height: number };
  frameRate: number;
  format: 'rgb' | 'rgba' | 'gray' | 'depth';
  exposure?: number;
  whiteBalance?: number;
  autoFocus?: boolean;
  flipHorizontal?: boolean;
  flipVertical?: boolean;
}

interface ProcessingConfig {
  enableBackgroundRemoval: boolean;
  backgroundColor?: { r: number; g: number; b: number };
  enableStabilization: boolean;
  enableNoiseReduction: boolean;
  enableSharpness: boolean;
  enableContrast: boolean;
  enableBrightness: boolean;
}

interface OutputConfig {
  frameRate: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  format: 'image' | 'video' | 'stream';
}

interface PerformanceConfig {
  maxMemoryUsage: string;
  enableGPU: boolean;
  parallelProcessing: boolean;
  hardwareAcceleration: boolean;
}
```

### VisionEngine Methods

```typescript
class VisionEngine {
  constructor(config: VisionConfig);

  // Core methods
  async start(): Promise<void>;
  async stop(): Promise<void>;
  async captureFrame(): Promise<ImageFrame>;
  async processFrame(frame: ImageFrame): Promise<ProcessedFrame>;
  async setCameraConfig(config: Partial<CameraConfig>): Promise<void>;
  async getCameraInfo(): Promise<CameraInfo>;

  // Event handlers
  on(event: 'frame', callback: (frame: ImageFrame) => void): void;
  on(event: 'error', callback: (error: Error) => void): void;
  on(event: 'ready', callback: () => void): void;

  // Configuration
  getConfig(): VisionConfig;
  updateConfig(config: Partial<VisionConfig>): void;

  // Utility methods
  getFrame(): Promise<ImageFrame>;
  detectFaces(): Promise<FaceDetection[]>;
  detectHands(): Promise<HandDetection[]>;
  detectObjects(): Promise<ObjectDetection[]>;
}
```

## Configuration

### Environment Variables

```env
VISION_CAMERA_DEVICE=webcam
VISION_RESOLUTION_WIDTH=1280
VISION_RESOLUTION_HEIGHT=720
VISION_FRAME_RATE=60
VISION_BACKGROUND_REMOVAL=true
VISION_VIDEO_STABILIZATION=true
VISION_NOISE_REDUCTION=true
VISION_MAX_MEMORY_USAGE=2GB
VISION_ENABLE_GPU=true
```

## Package Dependencies

This package depends on:

- **Runtime Dependencies**: @ai-air-drawing/core, opencv-wasm, ffprobe-installer, fluent-ffmpeg, @tensorflow-models/camera-utils, ml-matrix, uuid, lodash, async
- **Development Dependencies**: @types/node, @types/ffprobe-installer, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, eslint, eslint-config-prettier, eslint-plugin-prettier, prettier, rimraf, typescript, jest, @types/jest, ts-jest, husky, lint-staged, semantic-release

## Support

For support and issues, please visit the GitHub repository.

---

*This package is part of the AI Air Drawing System - Modular AI-Powered Drawing Platform*
