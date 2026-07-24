import { ExportEngine, ExportFormat, ExportOptions, ExportResult } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'ExportEngine' });

export class MemoryExportEngine implements ExportEngine {
  private supportedFormats: ExportFormat[] = ['png', 'svg', 'pdf', 'json', 'csv'];

  exportDrawing(
    strokes: Array<Array<{ x: number; y: number; pressure?: number }>>,
    options: ExportOptions,
  ): ExportResult {
    const format = options.format;

    let data: string;
    switch (format) {
      case 'json':
        data = this.exportAsJSON(strokes);
        break;
      case 'svg':
      case 'svg+xml':
        data = this.exportAsSVG(strokes, options);
        break;
      case 'csv':
        data = this.exportAsCSV(strokes);
        break;
      case 'png':
      case 'pdf':
        data = this.exportAsPlaceholder(strokes, format);
        break;
      default:
        data = this.exportAsJSON(strokes);
    }

    const result: ExportResult = {
      data,
      format,
      size: data.length,
      exportedAt: Date.now(),
      filename: `drawing-${Date.now()}.${format === 'svg+xml' ? 'svg' : format}`,
    };

    logger.debug(`Exported drawing as ${format} (${result.size} bytes)`);
    return result;
  }

  exportDiagram(
    nodes: Array<{ id: string; label: string; x: number; y: number }>,
    options: ExportOptions,
  ): ExportResult {
    const format = options.format;

    let data: string;
    switch (format) {
      case 'json':
        data = JSON.stringify({ nodes, exportedAt: Date.now() }, null, 2);
        break;
      case 'svg':
      case 'svg+xml':
        data = this.diagramToSVG(nodes, options);
        break;
      case 'csv':
        data = 'id,label,x,y\n' + nodes.map(n => `${n.id},${n.label},${n.x},${n.y}`).join('\n');
        break;
      default:
        data = JSON.stringify({ nodes }, null, 2);
    }

    const result: ExportResult = {
      data,
      format,
      size: data.length,
      exportedAt: Date.now(),
      filename: `diagram-${Date.now()}.${format === 'svg+xml' ? 'svg' : format}`,
    };

    logger.debug(`Exported diagram as ${format}`);
    return result;
  }

  getSupportedFormats(): ExportFormat[] {
    return [...this.supportedFormats];
  }

  private exportAsJSON(strokes: Array<Array<{ x: number; y: number; pressure?: number }>>): string {
    return JSON.stringify({ strokes, exportedAt: Date.now() }, null, 2);
  }

  private exportAsSVG(strokes: Array<Array<{ x: number; y: number }>>, options: ExportOptions): string {
    const w = options.width ?? 800;
    const h = options.height ?? 600;
    const bg = options.background ?? '#ffffff';
    let paths = '';
    for (const stroke of strokes) {
      if (stroke.length === 0) continue;
      const first = stroke[0];
      let d = `M ${first?.x ?? 0} ${first?.y ?? 0}`;
      for (let i = 1; i < stroke.length; i++) {
        const p = stroke[i];
        d += ` L ${p?.x ?? 0} ${p?.y ?? 0}`;
      }
      paths += `<path d="${d}" fill="none" stroke="black" stroke-width="2"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/>${paths}</svg>`;
  }

  private exportAsCSV(strokes: Array<Array<{ x: number; y: number; pressure?: number }>>): string {
    const rows = ['stroke_index,point_index,x,y,pressure'];
    strokes.forEach((stroke, si) => {
      stroke.forEach((p, pi) => {
        rows.push(`${si},${pi},${p.x},${p.y},${p.pressure ?? 1.0}`);
      });
    });
    return rows.join('\n');
  }

  private exportAsPlaceholder(strokes: Array<Array<{ x: number; y: number }>>, format: string): string {
    return JSON.stringify({ type: format, note: 'Binary export placeholder', strokeCount: strokes.length });
  }

  private diagramToSVG(nodes: Array<{ id: string; label: string; x: number; y: number }>, options: ExportOptions): string {
    const w = options.width ?? 800;
    const h = options.height ?? 600;
    let rects = '';
    for (const node of nodes) {
      rects += `<rect x="${node.x - 40}" y="${node.y - 20}" width="80" height="40" fill="#e0e0e0" stroke="#333"/><text x="${node.x}" y="${node.y + 5}" text-anchor="middle" font-size="12">${node.label}</text>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${rects}</svg>`;
  }
}