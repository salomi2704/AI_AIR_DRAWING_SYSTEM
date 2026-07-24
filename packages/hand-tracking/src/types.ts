export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandDetection {
  landmarks: Landmark[];
  handedness: 'left' | 'right';
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface HandTrackingResult {
  detections: HandDetection[];
  timestamp: number;
  processingTime: number;
}

export interface HandTracker {
  detect(imageData: Uint8Array, width: number, height: number): Promise<HandTrackingResult>;
  setConfidence(threshold: number): void;
  setMaxHands(max: number): void;
}