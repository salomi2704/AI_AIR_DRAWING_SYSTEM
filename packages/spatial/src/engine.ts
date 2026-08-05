import { SpatialEngine, SpatialObject3D, SpatialPoint, SpatialScene } from './types';
import { createLogger } from '@ai-air-drawing/core';

const logger = createLogger({ context: 'SpatialEngine' });

let sceneCounter = 0;
let objCounter = 0;

function defaultPoint(): SpatialPoint {
  return { x: 0, y: 0, z: 0 };
}

export class MemorySpatialEngine implements SpatialEngine {
  private scenes: Map<string, SpatialScene> = new Map();

  createScene(): SpatialScene {
    sceneCounter++;
    const scene: SpatialScene = {
      id: `scene-${sceneCounter}`,
      objects: [],
      camera: { position: { x: 0, y: 0, z: 5 }, lookAt: defaultPoint() },
    };
    this.scenes.set(scene.id, scene);
    logger.info(`Created spatial scene: ${scene.id}`);
    return scene;
  }

  addObject(sceneId: string, type: SpatialObject3D['type'], position?: SpatialPoint): SpatialObject3D {
    const scene = this.scenes.get(sceneId);
    if (!scene) throw new Error(`Scene ${sceneId} not found`);

    objCounter++;
    const obj: SpatialObject3D = {
      id: `obj-${objCounter}`,
      type,
      position: position ?? defaultPoint(),
      scale: { x: 1, y: 1, z: 1 },
      rotation: defaultPoint(),
    };
    scene.objects.push(obj);
    return obj;
  }

  removeObject(sceneId: string, objectId: string): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;
    scene.objects = scene.objects.filter(o => o.id !== objectId);
  }

  getScene(sceneId: string): SpatialScene | undefined {
    return this.scenes.get(sceneId);
  }

  transformObject(
    sceneId: string,
    objectId: string,
    position?: Partial<SpatialPoint>,
    scale?: Partial<SpatialPoint>,
  ): void {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;
    const obj = scene.objects.find(o => o.id === objectId);
    if (!obj) return;
    if (position) {
      if (position.x !== undefined) obj.position.x = position.x;
      if (position.y !== undefined) obj.position.y = position.y;
      if (position.z !== undefined) obj.position.z = position.z;
    }
    if (scale) {
      if (scale.x !== undefined) obj.scale.x = scale.x;
      if (scale.y !== undefined) obj.scale.y = scale.y;
      if (scale.z !== undefined) obj.scale.z = scale.z;
    }
  }
}