export const CANVAS_FORMAT_VERSION = 1;

export interface StrokeData {
  points: Array<{ x: number; y: number }>;
  colorHex: string;
  thickness: number;
  layerId: string;
}

export interface LayerData {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  strokes: StrokeData[];
}

export interface CanvasSnapshot {
  width: number;
  height: number;
  backgroundColor: string;
  activeLayerId: string;
  layers: LayerData[];
}

function strokeToData(stroke: StrokeData): Record<string, unknown> {
  return {
    points: stroke.points.map((point) => [point.x, point.y]),
    colorHex: stroke.colorHex,
    thickness: stroke.thickness,
    layerId: stroke.layerId,
  };
}

function layerToData(layer: LayerData): Record<string, unknown> {
  return {
    id: layer.id,
    name: layer.name,
    visible: layer.visible,
    opacity: layer.opacity,
    strokes: layer.strokes.map(strokeToData),
  };
}

export function canvasToDict(canvas: CanvasSnapshot): Record<string, unknown> {
  return {
    version: CANVAS_FORMAT_VERSION,
    canvas: {
      width: canvas.width,
      height: canvas.height,
      backgroundColor: canvas.backgroundColor,
      activeLayerId: canvas.activeLayerId,
    },
    layers: canvas.layers.map(layerToData),
  };
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function strokeFromData(raw: unknown): StrokeData {
  const record = asRecord(raw, 'Malformed stroke data');
  const pointsRaw = Array.isArray(record.points) ? record.points : [];
  const points = pointsRaw.map((point) => {
    if (Array.isArray(point)) {
      const x = point[0];
      const y = point[1];
      return { x: x === undefined ? 0 : Number(x), y: y === undefined ? 0 : Number(y) };
    }
    const obj = asRecord(point, 'Malformed stroke point');
    return {
      x: obj.x === undefined ? 0 : Number(obj.x),
      y: obj.y === undefined ? 0 : Number(obj.y),
    };
  });
  return {
    points,
    colorHex: record.colorHex === undefined ? '#000000' : String(record.colorHex),
    thickness: record.thickness === undefined ? 4 : Number(record.thickness),
    layerId: record.layerId === undefined ? '0' : String(record.layerId),
  };
}

function layerFromData(raw: unknown): LayerData {
  const record = asRecord(raw, 'Malformed layer data');
  const strokesRaw = Array.isArray(record.strokes) ? record.strokes : [];
  return {
    id: String(record.id),
    name: record.name === undefined ? 'Layer' : String(record.name),
    visible: record.visible === undefined ? true : Boolean(record.visible),
    opacity: record.opacity === undefined ? 1 : Number(record.opacity),
    strokes: strokesRaw.map(strokeFromData),
  };
}

export function canvasFromDict(data: unknown): CanvasSnapshot {
  const root = asRecord(data, 'Autosave data is not an object');
  if (root.version !== CANVAS_FORMAT_VERSION) {
    throw new Error(`Unsupported autosave format version: ${String(root.version)}`);
  }
  const canvas = asRecord(root.canvas, 'Autosave data is missing the canvas section');
  const layersRaw = Array.isArray(root.layers) ? root.layers : [];
  if (layersRaw.length === 0) {
    throw new Error('Autosave data contains no layers');
  }
  const layers = layersRaw.map(layerFromData);
  const first = layers[0]!;
  let activeLayerId = canvas.activeLayerId === undefined ? first.id : String(canvas.activeLayerId);
  if (!layers.some((layer) => layer.id === activeLayerId)) {
    activeLayerId = first.id;
  }
  return {
    width: canvas.width === undefined ? 1280 : Number(canvas.width),
    height: canvas.height === undefined ? 720 : Number(canvas.height),
    backgroundColor: canvas.backgroundColor === undefined ? '#FFFFFF' : String(canvas.backgroundColor),
    activeLayerId,
    layers,
  };
}
