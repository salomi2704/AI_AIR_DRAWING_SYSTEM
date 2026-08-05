export interface Point2D {
  x: number;
  y: number;
}

export interface StrokePoint extends Point2D {
  timestamp: number;
  pressure?: number;
}

export interface Stroke {
  id: string;
  points: StrokePoint[];
  color: string;
  width: number;
  startTime: number;
  endTime: number;
}

export interface StrokeEngine {
  addPoint(point: StrokePoint): void;
  finishStroke(): Stroke | null;
  getActiveStrokes(): Stroke[];
  getCompletedStrokes(): Stroke[];
  smoothStroke(stroke: Stroke): Stroke;
  simplifyStroke(stroke: Stroke, tolerance: number): Stroke;
  clear(): void;
}