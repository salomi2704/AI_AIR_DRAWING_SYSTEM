import { SEDiagram, SEDiagramGenerator, SEClass } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'SEDiagramGenerator' });

export class MemorySEDiagramGenerator implements SEDiagramGenerator {
  private history: SEDiagram[] = [];
  private maxHistory: number = 20;

  generateClassDiagram(text: string): SEDiagram {
    const words = text.split(/\s+/).filter(w => w.length > 2);
    const classes: SEClass[] = words.slice(0, 3).map(w => ({
      name: w.charAt(0).toUpperCase() + w.slice(1),
      attributes: [`${w}_id: string`, `${w}_name: string`],
      methods: [`get${w.charAt(0).toUpperCase() + w.slice(1)}(): void`],
    }));

    const diagram: SEDiagram = {
      type: 'class',
      classes,
      messages: [],
    };

    this.history.push(diagram);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    logger.debug(`Generated class diagram with ${classes.length} classes`);
    return diagram;
  }

  generateSequenceDiagram(text: string): SEDiagram {
    const words = text.split(/\s+/).filter(w => w.length > 2);
    const actors = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    const messages = actors.slice(1).map((a, i) => ({
      from: actors[i] ?? 'Unknown',
      to: a,
      label: `${a.toLowerCase()}()`,
      type: 'sync' as const,
    }));

    const diagram: SEDiagram = {
      type: 'sequence',
      classes: actors.map(a => ({ name: a, attributes: [], methods: [] })),
      messages,
    };

    this.history.push(diagram);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    logger.debug(`Generated sequence diagram with ${messages.length} messages`);
    return diagram;
  }

  getHistory(): SEDiagram[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}