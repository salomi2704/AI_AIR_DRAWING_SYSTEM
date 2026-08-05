export type ShapeType =
  | 'circle'
  | 'rectangle'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'freehand'
  | 'diamond'
  | 'unknown';

export interface Point2D {
  x: number;
  y: number;
}

export interface ShapeParams {
  corners?: Point2D[];
  center?: Point2D;
  radius?: number;
  length?: number;
  p1?: Point2D;
  p2?: Point2D;
  head?: Point2D;
  width?: number;
  height?: number;
  angle?: number;
  diagonals?: number[];
  area?: number;
}

export interface ShapeResult {
  type: ShapeType;
  confidence: number;
  points: Point2D[];
  bounds: { x: number; y: number; width: number; height: number };
  area: number;
  params?: ShapeParams;
  fitError?: number;
}

export interface TextRegion {
  text: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
}

export interface DiagramNode {
  id: string;
  kind: ShapeType;
  label: string;
  shape: ShapeResult;
}

export interface DiagramEdge {
  source: string;
  target: string;
  label: string;
  shape: ShapeResult;
}

export interface DiagramGraphDict {
  nodes: Array<{ id: string; kind: string; label: string }>;
  edges: Array<{ source: string; target: string; label: string }>;
}

export interface DiagramGraph {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  toDict(): DiagramGraphDict;
}

export interface ShapeRecognizer {
  recognize(points: Point2D[]): ShapeResult;
  recognizeStrokes(strokes: Point2D[][]): ShapeResult[];
  buildDiagram(shapes: ShapeResult[], textRegions?: TextRegion[]): DiagramGraph;
  getHistory(): ShapeResult[];
  clearHistory(): void;
}
