export interface Frame {
  data: Uint8Array;
  width: number;
  height: number;
  timestamp: number;
  format: 'rgb' | 'rgba' | 'grayscale';
}

export interface ProcessedFrame extends Frame {
  processedAt: number;
  stabilizationScore: number;
}

export interface VideoSource {
  id: string;
  type: 'camera' | 'file' | 'stream';
  isActive: boolean;
  getFrame(): Promise<Frame>;
  stop(): Promise<void>;
}

export interface VisionProcessor {
  processFrame(frame: Frame): Promise<ProcessedFrame>;
  stabilizeFrame(frame: Frame, previousFrame?: Frame): Promise<ProcessedFrame>;
  removeBackground(frame: Frame): Promise<Frame>;
  detectMotion(frame: Frame, previousFrame: Frame): Promise<number>;
}