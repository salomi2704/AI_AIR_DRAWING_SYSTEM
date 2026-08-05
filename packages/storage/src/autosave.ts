import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { CanvasSnapshot, canvasFromDict, canvasToDict } from './serializer';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'AutosaveManager' });

export const DEFAULT_AUTOSAVE_PATH = 'autosave.json';
export const DEFAULT_AUTOSAVE_INTERVAL_MS = 5000;

export type CanvasProvider = () => CanvasSnapshot;

export class AutosaveManager {
  private readonly provider: CanvasProvider;
  private readonly path: string;
  private readonly intervalMs: number;
  private lastSave: number;

  constructor(
    canvas: CanvasSnapshot | CanvasProvider,
    path: string = DEFAULT_AUTOSAVE_PATH,
    intervalMs: number = DEFAULT_AUTOSAVE_INTERVAL_MS,
  ) {
    this.provider = typeof canvas === 'function' ? canvas : () => canvas;
    this.path = path;
    this.intervalMs = intervalMs;
    this.lastSave = Date.now();
  }

  async maybeSave(): Promise<string | null> {
    const now = Date.now();
    if (now - this.lastSave >= this.intervalMs) {
      this.lastSave = now;
      return this.save();
    }
    return null;
  }

  async save(): Promise<string> {
    const payload = JSON.stringify(canvasToDict(this.provider()));
    const dir = dirname(this.path);
    if (dir !== '.') {
      await fs.mkdir(dir, { recursive: true });
    }
    const tmpPath = `${this.path}.tmp`;
    await fs.writeFile(tmpPath, payload, 'utf-8');
    await fs.rename(tmpPath, this.path);
    logger.debug(`Autosaved to ${this.path}`);
    return this.path;
  }

  static async load(path: string = DEFAULT_AUTOSAVE_PATH): Promise<CanvasSnapshot | null> {
    let text: string;
    try {
      text = await fs.readFile(path, 'utf-8');
    } catch {
      return null;
    }
    return canvasFromDict(JSON.parse(text));
  }

  static async clear(path: string = DEFAULT_AUTOSAVE_PATH): Promise<void> {
    try {
      await fs.unlink(path);
    } catch {
      // ignore a missing autosave file
    }
  }
}
