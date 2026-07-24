import { ShapeRecognizer, ShapeResult, ShapeType, Point2D } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'ShapeRecognizer' });

export class MemoryShapeRecognizer implements ShapeRecognizer {
  private history: ShapeResult[] = [];
  private maxHistory: number = 50;

  recognize(points: Point2D[]): ShapeResult {
    const shape = this.classifyShape(points);
    const bounds = this.computeBounds(points);
    const area = this.computeArea(points);

    const result: ShapeResult = {
      type: shape,
      confidence: 0.8,
      points,
      bounds,
      area,
    };

    this.history.push(result);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    logger.debug(`Recognized shape: ${shape}`);
    return result;
  }

  getHistory(): ShapeResult[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    logger.debug('Shape history cleared');
  }

  private classifyShape(points: Point2D[]): ShapeType {
    if (points.length < 3) return 'line';

    const closed = this.isClosed(points);
    const circularity = this.computeCircularity(points);

    if (circularity > 0.85 && closed) return 'circle';
    if (circularity > 0.7 && closed) return 'ellipse';

    if (closed) {
      const corners = this.countCorners(points);
      if (corners === 3) return 'triangle';
      if (corners === 4) return 'rectangle';
      if (corners > 5) return 'polygon';
    }

    return 'freehand';
  }

  private isClosed(points: Point2D[]): boolean {
    if (points.length < 3) return false;
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return false;
    const dist = Math.sqrt(Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2));
    const bounds = this.computeBounds(points);
    const maxDim = Math.max(bounds.width, bounds.height);
    return maxDim > 0 ? dist / maxDim < 0.2 : false;
  }

  private computeCircularity(points: Point2D[]): number {
    if (points.length < 3) return 0;
    const bounds = this.computeBounds(points);
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const avgRadius = points.reduce((sum, p) => {
      return sum + Math.sqrt(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2));
    }, 0) / points.length;

    if (avgRadius === 0) return 0;

    const variance = points.reduce((sum, p) => {
      const r = Math.sqrt(Math.pow(p.x - cx, 2) + Math.pow(p.y - cy, 2));
      return sum + Math.pow(r - avgRadius, 2);
    }, 0) / points.length;

    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - stdDev / avgRadius);
  }

  private countCorners(points: Point2D[]): number {
    if (points.length < 5) return 0;
    let corners = 0;
    const threshold = 0.3;

    for (let i = 2; i < points.length - 2; i++) {
      const prev = points[i - 2];
      const curr = points[i];
      const next = points[i + 2];
      if (!prev || !curr || !next) continue;

      const angle = this.computeAngle(prev, curr, next);
      if (angle < Math.PI * (1 - threshold)) {
        corners++;
      }
    }

    return corners;
  }

  private computeAngle(a: Point2D, b: Point2D, c: Point2D): number {
    const ba = { x: a.x - b.x, y: a.y - b.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    const dot = ba.x * bc.x + ba.y * bc.y;
    const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
    const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
    if (magBA === 0 || magBC === 0) return Math.PI;
    return Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC))));
  }

  private computeBounds(points: Point2D[]): { x: number; y: number; width: number; height: number } {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private computeArea(points: Point2D[]): number {
    if (points.length < 3) return 0;
    // Shoelace formula
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const curr = points[i];
      const next = points[(i + 1) % points.length];
      if (curr && next) {
        area += curr.x * next.y;
        area -= next.x * curr.y;
      }
    }
    return Math.abs(area) / 2;
  }
}