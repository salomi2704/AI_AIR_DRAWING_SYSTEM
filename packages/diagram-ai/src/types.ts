export type DiagramType = 'flowchart' | 'mindmap' | 'sequence' | 'class' | 'er' | 'state' | 'unknown';

export interface DiagramNode {
  id: string;
  label: string;
  type: 'box' | 'diamond' | 'circle' | 'ellipse';
  x: number;
  y: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface Diagram {
  type: DiagramType;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  title: string;
}

export interface DiagramGenerator {
  generateFromStrokes(strokes: Array<Array<{ x: number; y: number }>>): Diagram;
  generateFromText(text: string): Diagram;
  getHistory(): Diagram[];
  clearHistory(): void;
}