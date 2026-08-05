export type ExportFormat = 'png' | 'svg' | 'pdf' | 'json' | 'csv' | 'svg+xml';

export interface ExportOptions {
  format: ExportFormat;
  width?: number;
  height?: number;
  quality?: number;
  includeMetadata?: boolean;
  background?: string;
}

export interface ExportResult {
  data: string;
  format: ExportFormat;
  size: number;
  exportedAt: number;
  filename: string;
}

export interface ExportEngine {
  exportDrawing(strokes: Array<Array<{ x: number; y: number; pressure?: number }>>, options: ExportOptions): ExportResult;
  exportDiagram(nodes: Array<{ id: string; label: string; x: number; y: number }>, options: ExportOptions): ExportResult;
  getSupportedFormats(): ExportFormat[];
}

export interface RecognitionReportShape {
  kind: string;
  bbox: [number, number, number, number];
  fitError?: number;
  params: Record<string, unknown>;
}

export interface RecognitionReportTextRegion {
  text: string;
  confidence: number;
  box: [number, number, number, number];
}

export interface RecognitionReportDiagram {
  nodes: Array<{ id: string; kind: string; label: string }>;
  edges: Array<{ source: string; target: string; label: string }>;
}

export interface RecognitionReport {
  canvas: { width: number; height: number; strokes: number; points: number };
  shapes: RecognitionReportShape[];
  textRegions: RecognitionReportTextRegion[];
  diagram: RecognitionReportDiagram | null;
  latex: string[];
  summary: string;
}