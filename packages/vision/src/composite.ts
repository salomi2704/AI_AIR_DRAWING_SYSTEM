const DEFAULT_THRESHOLD = 250;

function channelCount(data: Uint8Array, width: number, height: number): number {
  const pixels = width * height;
  if (pixels === 0) {
    return 0;
  }
  return data.length / pixels;
}

export function keyMask(
  data: Uint8Array,
  width: number,
  height: number,
  threshold = DEFAULT_THRESHOLD,
): Uint8Array {
  const channels = channelCount(data, width, height);
  const mask = new Uint8Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const base = p * channels;
    let white = true;
    for (let c = 0; c < channels; c++) {
      const value = data[base + c];
      if (value === undefined || value < threshold) {
        white = false;
        break;
      }
    }
    mask[p] = white ? 0 : 1;
  }
  return mask;
}

export function compositeWhiteKey(
  frame: Uint8Array,
  overlay: Uint8Array,
  width: number,
  height: number,
  threshold = DEFAULT_THRESHOLD,
): Uint8Array {
  const channels = channelCount(overlay, width, height);
  const result = new Uint8Array(width * height * channels);
  for (let p = 0; p < width * height; p++) {
    const base = p * channels;
    let ink = false;
    for (let c = 0; c < channels; c++) {
      const value = overlay[base + c];
      if (value === undefined || value < threshold) {
        ink = true;
        break;
      }
    }
    const source = ink ? overlay : frame;
    for (let c = 0; c < channels; c++) {
      result[base + c] = source[base + c] ?? 0;
    }
  }
  return result;
}
