export interface SpatialPoint {
  x: number;
  y: number;
  z: number;
}

export interface SpatialObject3D {
  id: string;
  type: 'cube' | 'sphere' | 'cylinder' | 'plane';
  position: SpatialPoint;
  scale: SpatialPoint;
  rotation: SpatialPoint;
}

export interface SpatialScene {
  id: string;
  objects: SpatialObject3D[];
  camera: { position: SpatialPoint; lookAt: SpatialPoint };
}

export interface SpatialEngine {
  createScene(): SpatialScene;
  addObject(sceneId: string, type: SpatialObject3D['type'], position?: SpatialPoint): SpatialObject3D;
  removeObject(sceneId: string, objectId: string): void;
  getScene(sceneId: string): SpatialScene | undefined;
  transformObject(sceneId: string, objectId: string, position?: Partial<SpatialPoint>, scale?: Partial<SpatialPoint>): void;
}