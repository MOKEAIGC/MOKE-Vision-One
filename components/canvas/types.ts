// 文件路径: components/canvas/types.ts
// 无限画布核心类型定义 — 完整版
// 对齐 Infinite-Canvas 全部节点类型和数据模型

export type NodeType =
  | 'prompt'
  | 'image'
  | 'generator'
  | 'output'
  | 'llm'
  | 'video'
  | 'loop'
  | 'group'
  | 'comfyui'
  | 'composer'
  | 'asset';

export interface CanvasViewport {
  x: number;
  y: number;
  scale: number;
}

export interface PortDefinition {
  id: string;
  type: 'input' | 'output';
  label?: string;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  data: Record<string, any>;
  ports: PortDefinition[];
}

export interface CanvasConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface CanvasLog {
  id: string;
  timestamp: number;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  nodeId?: string;
}

export interface CanvasData {
  id: string;
  title: string;
  icon: string;
  kind: 'classic' | 'smart';
  nodes: CanvasNode[];
  connections: CanvasConnection[];
  viewport: CanvasViewport;
  logs: CanvasLog[];
  settings: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

export interface ConnectionDragState {
  isDragging: boolean;
  fromNodeId: string;
  fromPortId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface SelectionBox {
  active: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// 一键级联运行状态
export type CascadeStatus = 'idle' | 'queued' | 'running' | 'done' | 'failed';

export interface CascadeState {
  isRunning: boolean;
  order: string[]; // 节点 ID 执行顺序
  currentIndex: number;
  statuses: Record<string, CascadeStatus>;
}

// 节点默认尺寸
export const NODE_DEFAULTS: Record<NodeType, { width: number; height: number }> = {
  prompt: { width: 300, height: 200 },
  image: { width: 260, height: 300 },
  generator: { width: 360, height: 420 },
  output: { width: 300, height: 320 },
  llm: { width: 380, height: 440 },
  video: { width: 380, height: 400 },
  loop: { width: 336, height: 360 },
  group: { width: 300, height: 200 },
  comfyui: { width: 380, height: 500 },
  composer: { width: 400, height: 520 },
  asset: { width: 280, height: 340 },
};

// 节点端口预设
export function getDefaultPorts(type: NodeType): PortDefinition[] {
  switch (type) {
    case 'prompt':
      return [{ id: 'out-text', type: 'output', label: 'Text' }];
    case 'image':
      return [
        { id: 'in-image', type: 'input', label: 'Image' },
        { id: 'out-image', type: 'output', label: 'Image' },
      ];
    case 'generator':
      return [
        { id: 'in-prompt', type: 'input', label: 'Prompt' },
        { id: 'in-ref', type: 'input', label: 'Reference' },
        { id: 'out-result', type: 'output', label: 'Result' },
      ];
    case 'output':
      return [{ id: 'in-data', type: 'input', label: 'Data' }];
    case 'llm':
      return [
        { id: 'in-context', type: 'input', label: 'Context' },
        { id: 'out-text', type: 'output', label: 'Response' },
      ];
    case 'video':
      return [
        { id: 'in-prompt', type: 'input', label: 'Prompt' },
        { id: 'in-image', type: 'input', label: 'Image' },
        { id: 'out-video', type: 'output', label: 'Video' },
      ];
    case 'loop':
      return [
        { id: 'in-prompt', type: 'input', label: 'Template' },
        { id: 'in-image', type: 'input', label: 'Images' },
        { id: 'out-prompt', type: 'output', label: 'Expanded' },
      ];
    case 'group':
      return [
        { id: 'in-data', type: 'input', label: 'Input' },
        { id: 'out-data', type: 'output', label: 'Output' },
      ];
    case 'comfyui':
      return [
        { id: 'in-prompt', type: 'input', label: 'Prompt' },
        { id: 'in-image', type: 'input', label: 'Image' },
        { id: 'out-result', type: 'output', label: 'Result' },
      ];
    case 'composer':
      return [
        { id: 'in-prompt', type: 'input', label: 'Prompt' },
        { id: 'in-ref', type: 'input', label: 'Reference' },
        { id: 'out-result', type: 'output', label: 'Result' },
      ];
    case 'asset':
      return [
        { id: 'out-image', type: 'output', label: 'Asset' },
      ];
  }
}
