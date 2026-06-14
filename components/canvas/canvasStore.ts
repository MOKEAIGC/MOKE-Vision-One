// 文件路径: components/canvas/canvasStore.ts
// 画布数据持久化存储 — 完整版

import { CanvasData } from './types';

const STORAGE_KEY = 'moke_infinite_canvas_data';
const CANVAS_LIST_KEY = 'moke_infinite_canvas_list';

// 生成唯一 ID
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// 创建新画布
export function createNewCanvas(title?: string): CanvasData {
  return {
    id: generateId(),
    title: title || '未命名画布',
    icon: '🎨',
    kind: 'classic',
    nodes: [],
    connections: [],
    viewport: { x: 0, y: 0, scale: 1 },
    logs: [],
    settings: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// 获取画布列表（元信息）
export function getCanvasList(): CanvasData[] {
  try {
    const raw = localStorage.getItem(CANVAS_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

// 保存画布
export function saveCanvas(canvas: CanvasData): void {
  const list = getCanvasList();
  const idx = list.findIndex((c) => c.id === canvas.id);
  const meta: CanvasData = { ...canvas, updatedAt: Date.now() };

  if (idx >= 0) {
    list[idx] = { ...meta, nodes: [], connections: [], logs: [] }; // 列表中只存元信息
  } else {
    list.unshift({ ...meta, nodes: [], connections: [], logs: [] });
  }

  // 存列表（轻量）
  localStorage.setItem(CANVAS_LIST_KEY, JSON.stringify(list));
  // 存完整数据
  localStorage.setItem(`${STORAGE_KEY}_${canvas.id}`, JSON.stringify(meta));
}

// 加载单个画布完整数据
export function loadCanvas(id: string): CanvasData | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${id}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // 兼容旧数据结构
    if (!data.kind) data.kind = 'classic';
    if (!data.logs) data.logs = [];
    if (!data.settings) data.settings = {};
    return data;
  } catch {
    return null;
  }
}

// 删除画布
export function deleteCanvas(id: string): void {
  const list = getCanvasList().filter((c) => c.id !== id);
  localStorage.setItem(CANVAS_LIST_KEY, JSON.stringify(list));
  localStorage.removeItem(`${STORAGE_KEY}_${id}`);
}

// 获取或创建默认画布
export function getOrCreateDefaultCanvas(): CanvasData {
  const list = getCanvasList();
  if (list.length > 0) {
    const loaded = loadCanvas(list[0].id);
    if (loaded) return loaded;
  }
  const canvas = createNewCanvas('我的画布');
  saveCanvas(canvas);
  return canvas;
}

// 导出画布为 JSON 文件
export function exportCanvas(canvas: CanvasData): void {
  const blob = new Blob([JSON.stringify(canvas, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `canvas_${canvas.title}_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 导入画布从 JSON
export function importCanvas(json: string): CanvasData | null {
  try {
    const data = JSON.parse(json);
    if (!data.id || !data.nodes) return null;
    data.id = generateId(); // 分配新 ID 避免冲突
    data.createdAt = Date.now();
    data.updatedAt = Date.now();
    return data as CanvasData;
  } catch {
    return null;
  }
}
