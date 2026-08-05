import { CANVAS_FORMAT_VERSION, CanvasSnapshot, canvasFromDict, canvasToDict } from '../src/serializer';

const sample: CanvasSnapshot = {
  width: 1920,
  height: 1080,
  backgroundColor: '#FFFFFF',
  activeLayerId: 'bg',
  layers: [
    {
      id: 'bg',
      name: 'background',
      visible: true,
      opacity: 1,
      strokes: [
        { points: [{ x: 1, y: 2 }, { x: 3, y: 4 }], colorHex: '#000000', thickness: 4, layerId: 'bg' },
      ],
    },
    { id: 'fg', name: 'foreground', visible: false, opacity: 0.5, strokes: [] },
  ],
};

describe('canvas serializer', () => {
  it('stamps the payload with the current format version', () => {
    const dict = canvasToDict(sample);
    expect(dict.version).toBe(CANVAS_FORMAT_VERSION);
    expect((dict.canvas as Record<string, unknown>).width).toBe(1920);
    expect(Array.isArray(dict.layers)).toBe(true);
  });

  it('round-trips a canvas snapshot through the JSON format', () => {
    const json = JSON.stringify(canvasToDict(sample));
    const restored = canvasFromDict(JSON.parse(json));
    expect(restored).toEqual(sample);
  });

  it('rejects payloads without a matching version', () => {
    const dict = canvasToDict(sample);
    dict.version = 99;
    expect(() => canvasFromDict(dict)).toThrow('Unsupported autosave format version');
  });

  it('rejects non-object payloads', () => {
    expect(() => canvasFromDict(null)).toThrow('Autosave data is not an object');
    expect(() => canvasFromDict('hello')).toThrow('Autosave data is not an object');
  });

  it('rejects payloads missing the canvas section', () => {
    expect(() => canvasFromDict({ version: CANVAS_FORMAT_VERSION, layers: [] })).toThrow('Autosave data is missing the canvas section');
  });

  it('rejects payloads with no layers', () => {
    expect(() => canvasFromDict({ version: CANVAS_FORMAT_VERSION, canvas: {}, layers: [] })).toThrow('Autosave data contains no layers');
  });

  it('applies defaults for missing layer and stroke fields', () => {
    const dict = {
      version: CANVAS_FORMAT_VERSION,
      canvas: { width: 640, height: 480, activeLayerId: 'a' },
      layers: [
        { id: 'a', strokes: [{ points: [[0, 0]] }] },
      ],
    };
    const restored = canvasFromDict(dict);
    expect(restored.width).toBe(640);
    expect(restored.height).toBe(480);
    expect(restored.backgroundColor).toBe('#FFFFFF');
    expect(restored.layers[0]!.name).toBe('Layer');
    expect(restored.layers[0]!.visible).toBe(true);
    expect(restored.layers[0]!.opacity).toBe(1);
    const stroke = restored.layers[0]!.strokes[0]!;
    expect(stroke.points).toEqual([{ x: 0, y: 0 }]);
    expect(stroke.colorHex).toBe('#000000');
    expect(stroke.thickness).toBe(4);
    expect(stroke.layerId).toBe('0');
  });

  it('accepts both array and object point encodings', () => {
    const dict = {
      version: CANVAS_FORMAT_VERSION,
      canvas: { width: 100, height: 100, activeLayerId: 'a' },
      layers: [{ id: 'a', strokes: [{ points: [[10, 20], { x: 30, y: 40 }] }] }],
    };
    const restored = canvasFromDict(dict);
    expect(restored.layers[0]!.strokes[0]!.points).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
  });

  it('falls back to the first layer when the active layer is unknown', () => {
    const dict = {
      version: CANVAS_FORMAT_VERSION,
      canvas: { width: 100, height: 100, activeLayerId: 'nope' },
      layers: [{ id: 'a', name: 'first' }, { id: 'b', name: 'second' }],
    };
    const restored = canvasFromDict(dict);
    expect(restored.activeLayerId).toBe('a');
  });

  it('uses the first layer as active when none is recorded', () => {
    const dict = {
      version: CANVAS_FORMAT_VERSION,
      canvas: { width: 100, height: 100 },
      layers: [{ id: 'a' }],
    };
    expect(canvasFromDict(dict).activeLayerId).toBe('a');
  });
});
