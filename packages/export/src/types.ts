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