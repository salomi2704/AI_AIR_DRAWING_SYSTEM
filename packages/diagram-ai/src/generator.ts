import { Diagram, DiagramGenerator, DiagramNode, DiagramType } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'DiagramGenerator' });

let nodeIdCounter = 0;

function generateNodeId(): string {
  nodeIdCounter++;
  return `node-${nodeIdCounter}`;
}

export class MemoryDiagramGenerator implements DiagramGenerator {
  private history: Diagram[] = [];
  private maxHistory: number = 20;

  generateFromStrokes(strokes: Array<Array<{ x: number; y: number }>>): Diagram {
    const nodes: DiagramNode[] = [];
    let diagramType: DiagramType = 'flowchart';

    // Analyze stroke patterns to determine diagram type
    if (strokes.length >= 2) {
      diagramType = 'flowchart';
    } else if (strokes.length === 1) {
      diagramType = 'mindmap';
    }

    // Create nodes from strokes
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      if (!stroke || stroke.length === 0) continue;

      const center = this.computeCenter(stroke);
      const size = this.computeSize(stroke);

      let nodeType: DiagramNode['type'] = 'box';
      if (size.width > size.height * 1.5) {
        nodeType = 'ellipse';
      } else if (size.width < 30 && size.height < 30) {
        nodeType = 'circle';
      } else if (size.width < size.height * 0.6) {
        nodeType = 'diamond';
      }

      nodes.push({
        id: generateNodeId(),
        label: `Node ${i + 1}`,
        type: nodeType,
        x: center.x,
        y: center.y,
      });
    }

    const diagram: Diagram = {
      type: diagramType,
      nodes,
      edges: nodes.length > 1
        ? nodes.slice(1).map((n, i) => ({
            from: nodes[i]?.id ?? '',
            to: n.id,
          }))
        : [],
      title: 'Untitled Diagram',
    };

    this.history.push(diagram);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    logger.debug(`Generated ${diagramType} with ${nodes.length} nodes`);
    return diagram;
  }

  generateFromText(text: string): Diagram {
    const lower = text.toLowerCase();
    let diagramType: DiagramType = 'flowchart';

    if (lower.includes('flow') || lower.includes('process')) {
      diagramType = 'flowchart';
    } else if (lower.includes('mind') || lower.includes('idea')) {
      diagramType = 'mindmap';
    } else if (lower.includes('sequence') || lower.includes('interaction')) {
      diagramType = 'sequence';
    } else if (lower.includes('class') || lower.includes('object')) {
      diagramType = 'class';
    } else if (lower.includes('entity') || lower.includes('database')) {
      diagramType = 'er';
    } else if (lower.includes('state') || lower.includes('transition')) {
      diagramType = 'state';
    }

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const nodes: DiagramNode[] = words.slice(0, 5).map((word, i) => ({
      id: generateNodeId(),
      label: word,
      type: i === 0 ? 'ellipse' : 'box',
      x: 100 + i * 150,
      y: 100,
    }));

    const edges = nodes.length > 1
      ? nodes.slice(1).map((n, i) => ({
          from: nodes[i]?.id ?? '',
          to: n.id,
        }))
      : [];

    const diagram: Diagram = {
      type: diagramType,
      nodes,
      edges,
      title: words.slice(0, 3).join(' ') || 'Untitled',
    };

    this.history.push(diagram);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    logger.debug(`Generated ${diagramType} from text`);
    return diagram;
  }

  getHistory(): Diagram[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    logger.debug('Diagram history cleared');
  }

  private computeCenter(points: Array<{ x: number; y: number }>): { x: number; y: number } {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  private computeSize(points: Array<{ x: number; y: number }>): { width: number; height: number } {
    if (points.length === 0) return { width: 0, height: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { width: maxX - minX, height: maxY - minY };
  }
}