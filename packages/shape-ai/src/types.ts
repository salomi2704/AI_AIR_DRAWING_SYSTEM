export type ShapeType = 'circle' | 'rectangle' | 'triangle' | 'line' | 'arrow' | 'ellipse' | 'polygon' | 'star' | 'freehand' | 'unknown';

export interface Point2D {
  x: number;
  y: number;
}

export interface ShapeResult {
  type: ShapeType;
  confidence: number;
  points: Point2D[];
  bounds: { x: number; y: number; width: number; height: number };
  area: number;
}

export interface ShapeRecognizer {
  recognize(points: Point2D[]): ShapeResult;
  getHistory(): ShapeResult[];
  clearHistory(): void;
}