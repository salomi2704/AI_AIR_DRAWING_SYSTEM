import { DrawLayer, DrawingCanvas, DrawingEngine } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'DrawingEngine' });

let layerIdCounter = 0;

function generateLayerId(): string {
  layerIdCounter++;
  return `layer-${layerIdCounter}`;
}

export class MemoryDrawingEngine implements DrawingEngine {
  private canvas: DrawingCanvas = { width: 800, height: 600, backgroundColor: '#ffffff' };
  private layers: DrawLayer[] = [];

  createCanvas(width: number, height: number): DrawingCanvas {
    this.canvas = { width, height, backgroundColor: '#ffffff' };
    logger.debug(`Canvas created: ${width}x${height}`);
    return { ...this.canvas };
  }

  addLayer(name: string): DrawLayer {
    const layer: DrawLayer = {
      id: generateLayerId(),
      name,
      visible: true,
      opacity: 1,
      strokes: [],
    };
    this.layers.push(layer);
    logger.debug(`Layer "${name}" added`);
    return { ...layer };
  }

  removeLayer(id: string): boolean {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return false;
    this.layers.splice(idx, 1);
    logger.debug(`Layer ${id} removed`);
    return true;
  }

  getLayers(): DrawLayer[] {
    return [...this.layers];
  }

  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = visible;
    }
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  moveLayerUp(id: string): void {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx >= 0 && idx < this.layers.length - 1) {
      const temp = this.layers[idx];
      const next = this.layers[idx + 1];
      if (temp && next) {
        this.layers[idx] = next;
        this.layers[idx + 1] = temp;
      }
    }
  }

  moveLayerDown(id: string): void {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx > 0) {
      const temp = this.layers[idx];
      const prev = this.layers[idx - 1];
      if (temp && prev) {
        this.layers[idx] = prev;
        this.layers[idx - 1] = temp;
      }
    }
  }

  getCanvas(): DrawingCanvas {
    return { ...this.canvas };
  }

  clearCanvas(): void {
    this.layers = [];
    logger.debug('Canvas cleared');
  }
}