import {
  ShapeRecognizer,
  ShapeResult,
  ShapeType,
  ShapeParams,
  Point2D,
  TextRegion,
  DiagramGraph,
  DiagramNode,
  DiagramEdge,
} from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'ShapeRecognizer' });

const POLYGON_FIT_TOLERANCE = 0.1;

interface LineFit {
  p1: Point2D;
  p2: Point2D;
  length: number;
}

function cross(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function convexHull(points: Point2D[]): Point2D[] {
  const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const lower: Point2D[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: Point2D[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function perpDist(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dx * (a.y - p.y) - dy * (a.x - p.x)) / len;
}

function rdp(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length < 3) return points;
  let maxDist = -1;
  let index = 0;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i]!, first, last);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }
  if (maxDist > epsilon && index > 0) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function polygonPerimeter(ring: Point2D[]): number {
  let perimeter = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    perimeter += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return perimeter;
}

function approxPolygon(hull: Point2D[], epsilon: number): Point2D[] {
  if (hull.length <= 2) return hull;
  const ring = hull.concat([hull[0]!]);
  const base = ring[0]!;
  let idx = 1;
  let maxD = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i]!.x - base.x, ring[i]!.y - base.y);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= 1e-6) return [base];
  const left = rdp(ring.slice(0, idx + 1), epsilon);
  const right = rdp(ring.slice(idx), epsilon);
  const merged = left.slice(0, -1).concat(right);
  const out: Point2D[] = [];
  for (const p of merged) {
    const prev = out[out.length - 1];
    if (!prev || prev.x !== p.x || prev.y !== p.y) out.push(p);
  }
  const unique: Point2D[] = [];
  for (const p of out) {
    if (!unique.some((u) => u.x === p.x && u.y === p.y)) unique.push(p);
  }
  return unique;
}

function angleBetween(a: Point2D, b: Point2D): number {
  const m1 = Math.hypot(a.x, a.y);
  const m2 = Math.hypot(b.x, b.y);
  if (m1 === 0 || m2 === 0) return 0;
  const cos = (a.x * b.x + a.y * b.y) / (m1 * m2);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function angleAt(a: Point2D, b: Point2D, c: Point2D): number {
  const m1 = Math.hypot(a.x - b.x, a.y - b.y);
  const m2 = Math.hypot(c.x - b.x, c.y - b.y);
  if (m1 === 0 || m2 === 0) return 180;
  const cos = ((a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y)) / (m1 * m2);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function pointToSegmentDist(p: Point2D, a: Point2D, b: Point2D): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby + 1e-12);
  const tt = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + tt * abx), p.y - (a.y + tt * aby));
}

function polygonArea(corners: Point2D[]): number {
  if (corners.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % corners.length]!;
    total += a.x * b.y - b.x * a.y;
  }
  return Math.abs(total) / 2;
}

export class MemoryShapeRecognizer implements ShapeRecognizer {
  private history: ShapeResult[] = [];
  private maxHistory: number = 50;
  private readonly minPoints: number;
  private readonly circleTolerance: number;
  private readonly lineTolerance: number;
  private readonly turnAngle: number;

  constructor(
    options: {
      minPoints?: number;
      circleTolerance?: number;
      lineTolerance?: number;
      turnAngle?: number;
    } = {},
  ) {
    this.minPoints = options.minPoints ?? 8;
    this.circleTolerance = options.circleTolerance ?? 0.12;
    this.lineTolerance = options.lineTolerance ?? 0.12;
    this.turnAngle = options.turnAngle ?? 40;
  }

  recognize(points: Point2D[]): ShapeResult {
    const result = this.classifyShape(points);

    this.history.push(result);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    logger.debug(`Recognized shape: ${result.type}`);
    return result;
  }

  recognizeStrokes(strokes: Point2D[][]): ShapeResult[] {
    return strokes.map((stroke) => this.recognize(stroke));
  }

  getHistory(): ShapeResult[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    logger.debug('Shape history cleared');
  }

  private result(
    type: ShapeType,
    confidence: number,
    points: Point2D[],
    bounds: { x: number; y: number; width: number; height: number },
    params?: ShapeParams,
    fitError?: number,
  ): ShapeResult {
    return {
      type,
      confidence: Math.max(0.3, Math.min(1, confidence)),
      points,
      bounds,
      area: this.computeArea(points),
      params,
      fitError,
    };
  }

  private classifyShape(points: Point2D[]): ShapeResult {
    const bounds = this.computeBounds(points);
    if (points.length < 2) {
      return this.result('line', 0.8, points, bounds);
    }
    const maxDim = Math.max(bounds.width, bounds.height);

    const lineFit = this.fitLine(points);
    const circleFit = this.fitCircle(points);
    const closed = this.isClosed(points, bounds);

    const lineLength = lineFit.length ?? 0;
    const isLine = lineLength > 0 && lineFit.deviation / lineLength < this.lineTolerance;
    const isCircle = closed && circleFit.error < this.circleTolerance;

    if (!isCircle && points.length >= this.minPoints) {
      const head = this.detectArrowhead(points, lineFit);
      if (head !== null) {
        const headPt = head === 'start' ? points[0]! : points[points.length - 1]!;
        const tailPt = head === 'start' ? points[points.length - 1]! : points[0]!;
        const fitError = lineLength > 0 ? lineFit.deviation / lineLength : 0;
        return this.result(
          'arrow',
          1 - fitError,
          points,
          bounds,
          { p1: tailPt, p2: headPt, head: headPt },
          fitError,
        );
      }
    }

    if (isCircle) {
      return this.result('circle', 1 - circleFit.error, points, bounds, circleFit.params, circleFit.error);
    }

    if (closed && maxDim > 0) {
      const ring = convexHull(points);
      const perimeter = polygonPerimeter(ring);
      const corners = perimeter > 0 ? approxPolygon(ring, 0.04 * perimeter) : [];

      if (corners.length === 4) {
        const angles = corners.map((_, i) => angleAt(corners[(i + 3) % 4]!, corners[i]!, corners[(i + 1) % 4]!));
        const fitRatio = this.polygonFitRatio(points, corners);
        if (fitRatio <= POLYGON_FIT_TOLERANCE) {
          const sides = corners.map((c, i) =>
            Math.hypot(c.x - corners[(i + 1) % 4]!.x, c.y - corners[(i + 1) % 4]!.y),
          );
          const minSide = Math.min(...sides);
          const maxSide = Math.max(...sides);
          const notNearSquare = Math.max(...angles.map((a) => Math.abs(a - 90))) >= 12;
          if (minSide > 1e-6 && maxSide / minSide <= 2 && notNearSquare) {
            const center = this.centroid(corners);
            const diagonals = [
              Math.hypot(corners[0]!.x - corners[2]!.x, corners[0]!.y - corners[2]!.y),
              Math.hypot(corners[1]!.x - corners[3]!.x, corners[1]!.y - corners[3]!.y),
            ];
            return this.result(
              'diamond',
              1 - fitRatio,
              points,
              bounds,
              { corners, center, diagonals, area: polygonArea(corners) },
              fitRatio,
            );
          }
          const minAngle = Math.min(...angles);
          const maxAngle = Math.max(...angles);
          if (minAngle >= 70 && maxAngle <= 110) {
            const center = this.centroid(corners);
            const width =
              (Math.hypot(corners[0]!.x - corners[1]!.x, corners[0]!.y - corners[1]!.y) +
                Math.hypot(corners[2]!.x - corners[3]!.x, corners[2]!.y - corners[3]!.y)) /
              2;
            const height =
              (Math.hypot(corners[1]!.x - corners[2]!.x, corners[1]!.y - corners[2]!.y) +
                Math.hypot(corners[3]!.x - corners[0]!.x, corners[3]!.y - corners[0]!.y)) /
              2;
            const angle = (Math.atan2(corners[1]!.y - corners[0]!.y, corners[1]!.x - corners[0]!.x) * 180) / Math.PI;
            return this.result(
              'rectangle',
              1 - fitRatio,
              points,
              bounds,
              { corners, center, width, height, angle },
              fitRatio,
            );
          }
        }
      }

      if (corners.length === 3) {
        const fitRatio = this.polygonFitRatio(points, corners);
        const areaRatio = bounds.width > 0 && bounds.height > 0 ? polygonArea(corners) / (bounds.width * bounds.height) : 0;
        if (fitRatio <= POLYGON_FIT_TOLERANCE && areaRatio >= 0.15) {
          return this.result(
            'triangle',
            1 - fitRatio,
            points,
            bounds,
            { corners, area: polygonArea(corners) },
            fitRatio,
          );
        }
      }

      const circularity = this.computeCircularity(points, bounds);
      const minDim = Math.min(bounds.width, bounds.height);
      const aspectRatio = minDim > 0 ? maxDim / minDim : 0;
      if (aspectRatio > 1.5 || (circularity > 0.6 && circularity <= 0.85)) {
        return this.result('ellipse', 0.8, points, bounds);
      }

      if (corners.length >= 6) {
        return this.result('polygon', 0.8, points, bounds, { corners });
      }
    }

    if (isLine && lineLength > 0) {
      const fitError = lineFit.deviation / lineLength;
      return this.result('line', 1 - fitError, points, bounds, lineFit, fitError);
    }

    return this.result('freehand', 0.8, points, bounds);
  }

  private fitLine(points: Point2D[]): LineFit & { deviation: number } {
    const n = points.length;
    let mx = 0;
    let my = 0;
    for (const p of points) {
      mx += p.x;
      my += p.y;
    }
    mx /= n;
    my /= n;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const p of points) {
      const dx = p.x - mx;
      const dy = p.y - my;
      sxx += dx * dx;
      syy += dy * dy;
      sxy += dx * dy;
    }
    const trace = sxx + syy;
    const det = sxx * syy - sxy * sxy;
    const lambda = (trace + Math.sqrt(Math.max(0, trace * trace - 4 * det))) / 2;
    let vx: number;
    let vy: number;
    if (sxy === 0 && sxx >= syy) {
      vx = 1;
      vy = 0;
    } else if (sxy === 0) {
      vx = 0;
      vy = 1;
    } else if (Math.abs(lambda - sxx) >= Math.abs(sxy)) {
      vx = sxy;
      vy = lambda - sxx;
    } else {
      vx = lambda - syy;
      vy = sxy;
    }
    const norm = Math.hypot(vx, vy);
    if (norm === 0) {
      return { p1: points[0]!, p2: points[n - 1]!, length: 0, deviation: Infinity };
    }
    vx /= norm;
    vy /= norm;
    let minT = Infinity;
    let maxT = -Infinity;
    let maxDev = 0;
    for (const p of points) {
      const dx = p.x - mx;
      const dy = p.y - my;
      const t = dx * vx + dy * vy;
      if (t < minT) minT = t;
      if (t > maxT) maxT = t;
      const dev = Math.hypot(dx - t * vx, dy - t * vy);
      if (dev > maxDev) maxDev = dev;
    }
    return {
      p1: { x: mx + vx * minT, y: my + vy * minT },
      p2: { x: mx + vx * maxT, y: my + vy * maxT },
      length: maxT - minT,
      deviation: maxDev,
    };
  }

  private fitCircle(points: Point2D[]): { params?: ShapeParams; error: number } {
    const n = points.length;
    if (n < 3) return { error: Infinity };
    let cx = 0;
    let cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    cx /= n;
    cy /= n;
    const radii = new Array<number>(n);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const r = Math.hypot(points[i]!.x - cx, points[i]!.y - cy);
      radii[i] = r;
      sum += r;
    }
    const radius = sum / n;
    if (radius < 1e-6) return { error: Infinity };
    let err = 0;
    for (const r of radii) {
      err += Math.abs(r - radius);
    }
    err /= n;
    err /= radius;
    return { params: { center: { x: cx, y: cy }, radius }, error: err };
  }

  private detectArrowhead(points: Point2D[], lineFit: LineFit & { deviation: number }): 'start' | 'end' | null {
    const n = points.length;
    if (n < 8) return null;
    const length = lineFit.length;
    if (length < 20 || length === 0) return null;
    if (lineFit.deviation / length > this.lineTolerance) return null;
    const mid = Math.floor(n / 2);

    const headScore = (isStart: boolean): boolean => {
      let approach: Point2D;
      let v1: Point2D;
      let v2: Point2D;
      if (isStart) {
        approach = { x: points[mid]!.x - points[2]!.x, y: points[mid]!.y - points[2]!.y };
        v1 = { x: points[1]!.x - points[0]!.x, y: points[1]!.y - points[0]!.y };
        v2 = { x: points[2]!.x - points[1]!.x, y: points[2]!.y - points[1]!.y };
      } else {
        approach = { x: points[n - 3]!.x - points[mid]!.x, y: points[n - 3]!.y - points[mid]!.y };
        v1 = { x: points[n - 2]!.x - points[n - 3]!.x, y: points[n - 2]!.y - points[n - 3]!.y };
        v2 = { x: points[n - 1]!.x - points[n - 2]!.x, y: points[n - 1]!.y - points[n - 2]!.y };
      }
      if (Math.hypot(v1.x, v1.y) + Math.hypot(v2.x, v2.y) > 0.4 * length) return false;
      return (
        angleBetween(v1, approach) > this.turnAngle &&
        angleBetween(v2, approach) > this.turnAngle &&
        angleBetween(v1, v2) > 60
      );
    };

    if (headScore(true)) return 'start';
    if (headScore(false)) return 'end';
    return null;
  }

  private polygonFitRatio(points: Point2D[], corners: Point2D[]): number {
    if (corners.length < 2) return 1;
    let avgEdge = 0;
    for (let i = 0; i < corners.length; i++) {
      avgEdge += Math.hypot(
        corners[i]!.x - corners[(i + 1) % corners.length]!.x,
        corners[i]!.y - corners[(i + 1) % corners.length]!.y,
      );
    }
    avgEdge /= corners.length;
    if (avgEdge <= 0) return 1;
    let maxDist = 0;
    const n = corners.length;
    for (const p of points) {
      let best = Infinity;
      for (let i = 0; i < n; i++) {
        const d = pointToSegmentDist(p, corners[i]!, corners[(i + 1) % n]!);
        if (d < best) best = d;
      }
      if (best > maxDist) maxDist = best;
    }
    return maxDist / avgEdge;
  }

  private centroid(corners: Point2D[]): Point2D {
    let x = 0;
    let y = 0;
    for (const c of corners) {
      x += c.x;
      y += c.y;
    }
    return { x: x / corners.length, y: y / corners.length };
  }

  private isClosed(points: Point2D[], bounds: { x: number; y: number; width: number; height: number }): boolean {
    if (points.length < 3) return false;
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return false;
    const dist = Math.hypot(first.x - last.x, first.y - last.y);
    const maxDim = Math.max(bounds.width, bounds.height);
    return maxDim > 0 ? dist / maxDim < 0.2 : false;
  }

  private computeCircularity(
    points: Point2D[],
    bounds: { x: number; y: number; width: number; height: number },
  ): number {
    if (points.length < 3) return 0;
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const avgRadius = points.reduce((sum, p) => sum + Math.hypot(p.x - cx, p.y - cy), 0) / points.length;
    if (avgRadius === 0) return 0;
    const variance = points.reduce((sum, p) => {
      const r = Math.hypot(p.x - cx, p.y - cy);
      return sum + Math.pow(r - avgRadius, 2);
    }, 0) / points.length;
    const stdDev = Math.sqrt(variance);
    return Math.max(0, 1 - stdDev / avgRadius);
  }

  private computeBounds(points: Point2D[]): { x: number; y: number; width: number; height: number } {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
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

  buildDiagram(shapes: ShapeResult[], textRegions: TextRegion[] = []): DiagramGraph {
    const nodeKinds: ShapeType[] = ['rectangle', 'circle', 'diamond', 'triangle'];
    const nodes: DiagramNode[] = [];
    for (const shape of shapes) {
      if (!nodeKinds.includes(shape.type)) continue;
      let label = '';
      for (const region of textRegions) {
        if (this.regionInside(region, shape.bounds)) {
          label = region.text;
          break;
        }
      }
      nodes.push({ id: `n${nodes.length}`, kind: shape.type, label, shape });
    }

    const edges: DiagramEdge[] = [];
    for (const arrow of shapes) {
      if (arrow.type !== 'arrow' || !arrow.params) continue;
      const source = this.nearestNode(nodes, arrow.params.p1);
      const target = this.nearestNode(nodes, arrow.params.head);
      if (source !== null && target !== null && source.id !== target.id) {
        edges.push({
          source: source.id,
          target: target.id,
          label: this.edgeLabel(arrow, textRegions),
          shape: arrow,
        });
      }
    }

    return {
      nodes,
      edges,
      toDict() {
        return {
          nodes: nodes.map((n) => ({ id: n.id, kind: n.kind, label: n.label })),
          edges: edges.map((e) => ({ source: e.source, target: e.target, label: e.label })),
        };
      },
    };
  }

  private edgeLabel(arrow: ShapeResult, textRegions: TextRegion[]): string {
    const { x, y, width, height } = arrow.bounds;
    const x2 = x + width;
    const y2 = y + height;
    const diagonal = Math.hypot(width, height);
    let best = '';
    let bestDist = Infinity;
    for (const region of textRegions) {
      const cx = region.box.x + region.box.width / 2;
      const cy = region.box.y + region.box.height / 2;
      if (x <= cx && cx <= x2 && y <= cy && cy <= y2) return region.text;
      const dx = Math.max(x - cx, 0, cx - x2);
      const dy = Math.max(y - cy, 0, cy - y2);
      const dist = Math.hypot(dx, dy);
      if (dist < bestDist) {
        bestDist = dist;
        best = region.text;
      }
    }
    if (best && bestDist <= 0.6 * Math.max(diagonal, 1e-6)) return best;
    return '';
  }

  private regionInside(region: TextRegion, shapeBounds: { x: number; y: number; width: number; height: number }): boolean {
    const rcx = region.box.x + region.box.width / 2;
    const rcy = region.box.y + region.box.height / 2;
    return (
      shapeBounds.x <= rcx &&
      rcx <= shapeBounds.x + shapeBounds.width &&
      shapeBounds.y <= rcy &&
      rcy <= shapeBounds.y + shapeBounds.height
    );
  }

  private nearestNode(nodes: DiagramNode[], point?: Point2D): DiagramNode | null {
    if (!point || nodes.length === 0) return null;
    let best: DiagramNode | null = null;
    let bestDist = Infinity;
    for (const node of nodes) {
      const cx = node.shape.bounds.x + node.shape.bounds.width / 2;
      const cy = node.shape.bounds.y + node.shape.bounds.height / 2;
      const d = (cx - point.x) ** 2 + (cy - point.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = node;
      }
    }
    return best;
  }
}
