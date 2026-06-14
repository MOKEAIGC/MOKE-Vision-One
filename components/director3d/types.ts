// 文件路径: components/director3d/types.ts
export type ObjectType = 'actor' | 'prop' | 'wall' | 'light' | 'marker';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface StageObject {
  id: string;
  type: ObjectType;
  label: string;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  color: string;
  role?: 'hero' | 'supporting' | 'background';
  note?: string;
  showLabel?: boolean;
}

export interface CameraPose {
  name: string;
  position: Vector3;
  target: Vector3;
  focalLength: number;
  aspect: string;
}

export interface DirectorStageExport {
  version: '0.1';
  scenePrompt: string;
  objects: StageObject[];
  camera: CameraPose;
  captures: Array<{
    label: string;
    dataUrl: string;
    camera: CameraPose;
  }>;
}
