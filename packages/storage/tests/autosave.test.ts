import { AutosaveManager } from '../src/autosave';
import { CanvasSnapshot } from '../src/serializer';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const snapshot: CanvasSnapshot = {
  width: 800,
  height: 600,
  backgroundColor: '#FFFFFF',
  activeLayerId: 'a',
  layers: [
    { id: 'a', name: 'layer-a', visible: true, opacity: 1, strokes: [{ points: [{ x: 0, y: 0 }], colorHex: '#000', thickness: 4, layerId: 'a' }] },
  ],
};

describe('AutosaveManager', () => {
  const paths: string[] = [];

  function tempPath(): string {
    const p = join(tmpdir(), `autosave-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    paths.push(p);
    return p;
  }

  afterEach(async () => {
    for (const p of paths) {
      try {
        await fs.unlink(p);
      } catch {
        // already gone
      }
    }
  });

  it('saves a versioned payload and loads it back', async () => {
    const path = tempPath();
    const manager = new AutosaveManager(snapshot, path, 0);
    const written = await manager.save();
    expect(written).toBe(path);

    const text = await fs.readFile(path, 'utf-8');
    expect(JSON.parse(text).version).toBe(1);

    const loaded = await AutosaveManager.load(path);
    expect(loaded).toEqual(snapshot);
  });

  it('saves only after the interval has elapsed', async () => {
    const path = tempPath();
    const manager = new AutosaveManager(snapshot, path, 60_000);
    expect(await manager.maybeSave()).toBeNull();

    const fast = new AutosaveManager(snapshot, tempPath(), 0);
    expect(await fast.maybeSave()).not.toBeNull();
  });

  it('re-evaluates the snapshot provider on every save', async () => {
    const path = tempPath();
    let width = 100;
    const manager = new AutosaveManager(() => ({ ...snapshot, width }), path, 0);
    await manager.maybeSave();
    width = 200;
    await manager.maybeSave();
    expect((await AutosaveManager.load(path))!.width).toBe(200);
  });

  it('creates parent directories when saving', async () => {
    const dir = join(tmpdir(), `autosave-dir-${Date.now()}`);
    paths.push(dir);
    const path = join(dir, 'nested', 'canvas.json');
    const manager = new AutosaveManager(snapshot, path, 0);
    await manager.save();
    expect((await AutosaveManager.load(path))!.width).toBe(800);
  });

  it('returns null when no autosave file exists', async () => {
    expect(await AutosaveManager.load(tempPath())).toBeNull();
  });

  it('surfaces corrupt payloads instead of hiding them', async () => {
    const path = tempPath();
    await fs.writeFile(path, 'not-json{', 'utf-8');
    await expect(AutosaveManager.load(path)).rejects.toThrow();
  });

  it('clear removes the autosave file', async () => {
    const path = tempPath();
    const manager = new AutosaveManager(snapshot, path, 0);
    await manager.save();
    await AutosaveManager.clear(path);
    expect(await AutosaveManager.load(path)).toBeNull();
    await AutosaveManager.clear(path);
  });
});
