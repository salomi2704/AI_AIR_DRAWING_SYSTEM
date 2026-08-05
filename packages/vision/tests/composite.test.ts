import { keyMask, compositeWhiteKey } from '../src/composite';

function rgbaPixel(r: number, g: number, b: number, a: number): number[] {
  return [r, g, b, a];
}

function flatten(rows: number[][]): Uint8Array {
  return new Uint8Array(rows.flat());
}

describe('white-key compositing', () => {
  const white = rgbaPixel(255, 255, 255, 255);
  const black = rgbaPixel(0, 0, 0, 255);
  const ink = rgbaPixel(10, 20, 30, 255);
  const frameColor = rgbaPixel(1, 2, 3, 255);

  it('treats fully white pixels as background in the key mask', () => {
    const data = flatten([white, black, ink, rgbaPixel(250, 250, 250, 255)]);
    const mask = keyMask(data, 2, 2);
    expect(Array.from(mask)).toEqual([0, 1, 1, 0]);
  });

  it('only copies ink pixels over the frame', () => {
    const frame = flatten([frameColor, frameColor, frameColor, frameColor]);
    const overlay = flatten([white, white, white, ink]);
    const out = compositeWhiteKey(frame, overlay, 2, 2, 250);
    expect(Array.from(out)).toEqual([...frameColor, ...frameColor, ...frameColor, ...ink]);
  });

  it('returns a new buffer and does not mutate inputs', () => {
    const frame = flatten([frameColor, frameColor]);
    const overlay = flatten([white, ink]);
    const out = compositeWhiteKey(frame, overlay, 2, 1, 250);
    expect(out).not.toBe(frame);
    expect(out).not.toBe(overlay);
    expect(Array.from(frame)).toEqual([...frameColor, ...frameColor]);
    expect(Array.from(overlay)).toEqual([...white, ...ink]);
  });

  it('handles a custom threshold below 250', () => {
    const frame = flatten([frameColor, frameColor]);
    const overlay = flatten([rgbaPixel(200, 200, 200, 255), ink]);
    const out = compositeWhiteKey(frame, overlay, 2, 1, 200);
    expect(Array.from(out)).toEqual([...frameColor, ...ink]);
  });

  it('works with 3-channel rgb data', () => {
    const frame = flatten([frameColor.slice(0, 3), frameColor.slice(0, 3)]);
    const overlay = flatten([white.slice(0, 3), ink.slice(0, 3)]);
    const out = compositeWhiteKey(frame, overlay, 2, 1, 250);
    expect(out.length).toBe(6);
    expect(Array.from(out)).toEqual([...frameColor.slice(0, 3), ...ink.slice(0, 3)]);
  });

  it('handles empty buffers', () => {
    const mask = keyMask(new Uint8Array(0), 0, 0);
    expect(mask.length).toBe(0);
    const out = compositeWhiteKey(new Uint8Array(0), new Uint8Array(0), 0, 0);
    expect(out.length).toBe(0);
  });

  it('is consistent with the key mask for a mixed canvas', () => {
    const width = 3;
    const height = 2;
    const overlay = flatten([
      white, white, ink,
      ink, black, white,
    ]);
    const mask = keyMask(overlay, width, height, 250);
    const frame = flatten(Array.from({ length: width * height }, () => frameColor));
    const out = compositeWhiteKey(frame, overlay, width, height, 250);
    let pixel = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const expected = mask[y * width + x] === 1 ? overlay : frame;
        expect(Array.from(out.slice(idx, idx + 4))).toEqual(Array.from(expected.slice(idx, idx + 4)));
        pixel++;
      }
    }
    expect(pixel).toBe(width * height);
  });
});
