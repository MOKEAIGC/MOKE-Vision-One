// 文件路径: components/director3d/store.ts
import { create } from 'zustand';
import { CameraPose, StageObject, ObjectType, Vector3 } from './types';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export type ThemeMode = 'light' | 'dark';

interface SceneState {
  objects: StageObject[];
  selectedId: string | null;
  cameraPose: CameraPose;
  transformMode: TransformMode;
  gridOpacity: number;
  themeMode: ThemeMode;
  isRightPanelCollapsed: boolean;
  showAllLabels: boolean;
  isCameraLocked: boolean;
  cameras: CameraPose[];
  activeCameraName: string;
  
  addObject: (type: ObjectType, customParams?: {
    position?: Vector3;
    scale?: Vector3;
    rotation?: Vector3;
    label?: string;
  }) => void;
  updateObject: (id: string, updates: Partial<StageObject>) => void;
  removeObject: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setCameraPose: (pose: CameraPose) => void;
  addCamera: (name?: string) => void;
  removeCamera: (name: string) => void;
  setActiveCamera: (name: string) => void;
  renameCamera: (oldName: string, newName: string) => void;
  setTransformMode: (mode: TransformMode) => void;
  setGridOpacity: (opacity: number) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setIsRightPanelCollapsed: (collapsed: boolean) => void;
  setShowAllLabels: (show: boolean) => void;
  setIsCameraLocked: (locked: boolean) => void;
}

const defaultCameraPoses: Record<string, CameraPose> = {
  '正面': { name: '正面', position: { x: 0, y: 1.5, z: 5 }, target: { x: 0, y: 1, z: 0 }, focalLength: 35, aspect: '16:9' },
  '俯视': { name: '俯视', position: { x: 0, y: 8, z: 0 }, target: { x: 0, y: 0, z: 0 }, focalLength: 35, aspect: '16:9' },
  '侧面': { name: '侧面', position: { x: 8, y: 1.5, z: 0 }, target: { x: 0, y: 1, z: 0 }, focalLength: 35, aspect: '16:9' },
  '过肩': { name: '过肩', position: { x: -1, y: 1.6, z: 2 }, target: { x: 0, y: 1.5, z: -2 }, focalLength: 50, aspect: '16:9' },
  '低机位': { name: '低机位', position: { x: 0, y: 0.5, z: 4 }, target: { x: 0, y: 1.5, z: 0 }, focalLength: 24, aspect: '16:9' },
  '广角': { name: '广角', position: { x: 0, y: 2, z: 3 }, target: { x: 0, y: 1, z: 0 }, focalLength: 18, aspect: '16:9' },
};

const getNextLabelLetter = (existingObjects: StageObject[]) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const usedLabels = new Set(existingObjects.map(obj => obj.label.trim().toUpperCase()));
  
  // 寻找第一个未被使用的单字母
  for (let i = 0; i < alphabet.length; i++) {
    const letter = alphabet[i];
    if (!usedLabels.has(letter)) {
      return letter;
    }
  }
  
  // 如果 26 个字母都被占用了，生成 AA, AB 等双字母
  for (let i = 0; i < alphabet.length; i++) {
    for (let j = 0; j < alphabet.length; j++) {
      const doubleLetter = alphabet[i] + alphabet[j];
      if (!usedLabels.has(doubleLetter)) {
        return doubleLetter;
      }
    }
  }
  
  return `OBJ_${existingObjects.length + 1}`;
};

const getDefaultColor = (type: ObjectType) => {
  switch (type) {
    case 'actor': return '#e4e4e7'; // 工业雕塑冷乳白
    case 'prop': return '#a1a1aa';  // 金属质感中灰
    case 'wall': return '#3f3f46';  // 深炭黑墙壁
    case 'light': return '#faf5ff'; // 纯净冷白光
    case 'marker': return '#27272a'; // 地面极简深灰标记
    default: return '#ffffff';
  }
};

const getDefaultScale = (type: ObjectType): Vector3 => {
  switch (type) {
    case 'actor': return { x: 0.6, y: 1.7, z: 0.4 }; // Human proportion
    case 'prop': return { x: 1, y: 1, z: 1 };
    case 'wall': return { x: 5, y: 3, z: 0.2 };
    case 'light': return { x: 0.2, y: 0.2, z: 0.2 };
    case 'marker': return { x: 0.5, y: 0.1, z: 0.5 };
    default: return { x: 1, y: 1, z: 1 };
  }
};

const getDefaultY = (type: ObjectType, scaleY: number): number => {
  // 角色 GLB 模型脚底已在局部原点，放在地面 (y=0) 即可
  if (type === 'actor') return 0;
  // 其它物体以几何中心建模，落地需抬升半个高度
  return scaleY / 2;
};

export const useSceneStore = create<SceneState>((set) => ({
  objects: [],
  selectedId: null,
  cameraPose: defaultCameraPoses['正面'],
  cameras: Object.values(defaultCameraPoses),
  activeCameraName: '正面',
  transformMode: 'translate',
  gridOpacity: 0.45,
  themeMode: 'dark',
  isRightPanelCollapsed: false,
  showAllLabels: true,
  isCameraLocked: false,

  setGridOpacity: (opacity) => set({ gridOpacity: opacity }),
  setThemeMode: (mode) => set({ themeMode: mode }),
  setIsRightPanelCollapsed: (collapsed) => set({ isRightPanelCollapsed: collapsed }),
  setShowAllLabels: (show) => set({ showAllLabels: show }),

  addObject: (type, customParams) => set((state) => {
    const scale = customParams?.scale ?? getDefaultScale(type);
    const newObj: StageObject = {
      id: crypto.randomUUID(),
      type,
      label: customParams?.label?.trim() || getNextLabelLetter(state.objects),
      position: customParams?.position ?? { x: 0, y: getDefaultY(type, scale.y), z: 0 },
      rotation: customParams?.rotation ?? { x: 0, y: 0, z: 0 },
      scale,
      color: getDefaultColor(type),
      showLabel: true, // 默认开启显示标签
    };
    return { objects: [...state.objects, newObj], selectedId: newObj.id };
  }),

  updateObject: (id, updates) => set((state) => ({
    objects: state.objects.map(obj => obj.id === id ? { ...obj, ...updates } : obj)
  })),

  removeObject: (id) => set((state) => ({
    objects: state.objects.filter(obj => obj.id !== id),
    selectedId: state.selectedId === id ? null : state.selectedId
  })),

  setSelectedId: (id) => set({ selectedId: id }),
  setCameraPose: (pose) => set((state) => {
    // 自动更新 cameras 里同名的那一台飞机的姿态，使得不管是 3D Orbit 旋转还是 2D 降维拖拽都能够保持状态！
    const updatedCameras = state.cameras.map(c => 
      c.name === pose.name ? { ...pose } : c
    );
    return { 
      cameraPose: pose,
      cameras: updatedCameras
    };
  }),
  addCamera: (name) => set((state) => {
    let finalName = name?.trim() || '';
    if (!finalName) {
      finalName = `机位-${state.cameras.length + 1}`;
    }
    // 防止重名
    let count = 1;
    let fallbackName = finalName;
    while (state.cameras.some(c => c.name === fallbackName)) {
      fallbackName = `${finalName}_${count}`;
      count++;
    }
    const newCamera: CameraPose = {
      ...state.cameraPose,
      name: fallbackName
    };
    return {
      cameras: [...state.cameras, newCamera],
      activeCameraName: fallbackName,
      cameraPose: newCamera
    };
  }),
  removeCamera: (name) => set((state) => {
    const remaining = state.cameras.filter(c => c.name !== name);
    if (remaining.length === 0) return {}; // 至少留有一台
    
    let nextActive = state.activeCameraName;
    let nextPose = state.cameraPose;
    if (state.activeCameraName === name) {
      const fallback = remaining[0];
      nextActive = fallback.name;
      nextPose = fallback;
    }
    return {
      cameras: remaining,
      activeCameraName: nextActive,
      cameraPose: nextPose
    };
  }),
  setActiveCamera: (name) => set((state) => {
    const found = state.cameras.find(c => c.name === name);
    if (found) {
      return {
        activeCameraName: name,
        cameraPose: found
      };
    }
    return {};
  }),
  renameCamera: (oldName, newName) => set((state) => {
    const formatted = newName.trim();
    if (!formatted || state.cameras.some(c => c.name === formatted && c.name !== oldName)) {
      return {};
    }
    const updated = state.cameras.map(c => 
      c.name === oldName ? { ...c, name: formatted } : c
    );
    const nextActive = state.activeCameraName === oldName ? formatted : state.activeCameraName;
    const nextPose = state.cameraPose.name === oldName ? { ...state.cameraPose, name: formatted } : state.cameraPose;
    return {
      cameras: updated,
      activeCameraName: nextActive,
      cameraPose: nextPose
    };
  }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setIsCameraLocked: (locked) => set({ isCameraLocked: locked })
}));

export const getPredefinedPoses = () => defaultCameraPoses;
