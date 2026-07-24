export interface DrawLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  strokes: string[];
}

export interface DrawingCanvas {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface DrawingEngine {
  createCanvas(width: number, height: number): DrawingCanvas;
  addLayer(name: string): DrawLayer;
  removeLayer(id: string): boolean;
  getLayers(): DrawLayer[];
  setLayerVisibility(id: string, visible: boolean): void;
  setLayerOpacity(id: string, opacity: number): void;
  moveLayerUp(id: string): void;
  moveLayerDown(id: string): void;
  getCanvas(): DrawingCanvas;
  clearCanvas(): void;
}