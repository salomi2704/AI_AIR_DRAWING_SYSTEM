import { Stroke, StrokeEngine, StrokePoint } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'StrokeEngine' });

let strokeIdCounter = 0;

function generateStrokeId(): string {
  strokeIdCounter++;
  return `stroke-${strokeIdCounter}-${Date.now()}`;
}

export class MemoryStrokeEngine implements StrokeEngine {
  private completedStrokes: Stroke[] = [];
  private currentStroke: Stroke | null = null;

  addPoint(point: StrokePoint): void {
    if (!this.currentStroke) {
      this.currentStroke = {
        id: generateStrokeId(),
        points: [point],
        color: '#000000',
        width: 2,
        startTime: point.timestamp,
        endTime: point.timestamp,
      };
      logger.debug(`Started stroke ${this.currentStroke.id}`);
    } else {
      this.currentStroke.points.push(point);
      this.currentStroke.endTime = point.timestamp;
    }
  }

  finishStroke(): Stroke | null {
    if (!this.currentStroke || this.currentStroke.points.length < 2) {
      this.currentStroke = null;
      return null;
    }

    const stroke = this.currentStroke;
    this.completedStrokes.push(stroke);
    this.currentStroke = null;
    logger.debug(`Finished stroke ${stroke.id} with ${stroke.points.length} points`);
    return stroke;
  }

  getActiveStrokes(): Stroke[] {
    return this.currentStroke ? [this.currentStroke] : [];
  }

  getCompletedStrokes(): Stroke[] {
    return [...this.completedStrokes];
  }

  smoothStroke(stroke: Stroke): Stroke {
    if (stroke.points.length < 3) {
      return { ...stroke, points: [...stroke.points] };
    }

    const first = stroke.points[0];
    if (!first) return { ...stroke, points: [...stroke.points] };

    const smoothed: StrokePoint[] = [first];
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const prev = stroke.points[i - 1];
      const curr = stroke.points[i];
      const next = stroke.points[i + 1];
      if (prev && curr && next) {
        smoothed.push({
          x: (prev.x + curr.x + next.x) / 3,
          y: (prev.y + curr.y + next.y) / 3,
          timestamp: curr.timestamp,
          pressure: curr.pressure,
        });
      }
    }
    const last = stroke.points[stroke.points.length - 1];
    if (last) smoothed.push(last);

    return { ...stroke, points: smoothed };
  }

  simplifyStroke(stroke: Stroke, tolerance: number): Stroke {
    if (stroke.points.length < 3) {
      return { ...stroke, points: [...stroke.points] };
    }

    const first = stroke.points[0];
    if (!first) return { ...stroke, points: [...stroke.points] };

    const simplified: StrokePoint[] = [first];
    for (let i = 1; i < stroke.points.length - 1; i++) {
      const prev = simplified[simplified.length - 1];
      const curr = stroke.points[i];
      if (prev && curr) {
        const dx = curr.x - prev.x;
        const dy = curr.y - prev.y;
        if (Math.sqrt(dx * dx + dy * dy) >= tolerance) {
          simplified.push(curr);
        }
      }
    }
    const last = stroke.points[stroke.points.length - 1];
    if (last) simplified.push(last);

    return { ...stroke, points: simplified };
  }

  clear(): void {
    this.completedStrokes = [];
    this.currentStroke = null;
    logger.debug('Cleared all strokes');
  }
}