// 文件路径: services/canvasBackendService.ts
// 画布后端通信服务 — 连接 Python FastAPI 后端
// 功能：多平台生图、视频生成、ComfyUI、ModelScope、素材库、WebSocket 实时协作

const BACKEND_URL = localStorage.getItem('moke_canvas_backend_url') || 'http://127.0.0.1:3002';

export const setBackendUrl = (url: string) => {
  localStorage.setItem('moke_canvas_backend_url', url);
};

export const getBackendUrl = () => BACKEND_URL;

// ===== 通用请求 =====
async function apiRequest<T = any>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BACKEND_URL}${path}`;
  const resp = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!resp.ok) {
    const error = await resp.text().catch(() => '');
    throw new Error(`[${resp.status}] ${error.slice(0, 300)}`);
  }
  return resp.json();
}

// ===== Provider 管理 =====
export interface ProviderConfig {
  id: string;
  name: string;
  base_url: string;
  api_key?: string;
  protocol?: string;
  models?: string[];
  enabled?: boolean;
}

export const getProviders = () => apiRequest<ProviderConfig[]>('/api/providers');

export const updateProviders = (providers: ProviderConfig[]) =>
  apiRequest('/api/providers', { method: 'PUT', body: JSON.stringify(providers) });

export const testProviderConnection = (provider: ProviderConfig) =>
  apiRequest<{ success: boolean; message: string; models?: any[] }>('/api/providers/test-connection', {
    method: 'POST', body: JSON.stringify(provider),
  });

// ===== 在线生图 =====
export interface OnlineImageRequest {
  prompt: string;
  provider_id?: string;
  model?: string;
  size?: string;
  ratio?: string;
  resolution?: string;
  quality?: string;
  reference_images?: string[];
  lora?: string;
  negative_prompt?: string;
}

export interface ImageResult {
  image: string;
  model?: string;
  local_url?: string;
}

export const generateOnlineImage = (req: OnlineImageRequest) =>
  apiRequest<ImageResult>('/api/online-image', { method: 'POST', body: JSON.stringify(req) });

// ===== 画布异步图片任务 =====
export const createCanvasImageTask = (req: OnlineImageRequest) =>
  apiRequest<{ task_id: string; status: string }>('/api/canvas-image-tasks', {
    method: 'POST', body: JSON.stringify(req),
  });

export const getCanvasImageTask = (taskId: string) =>
  apiRequest<{ status: string; result?: ImageResult; error?: string }>(`/api/canvas-image-tasks/${taskId}`);

// ===== 视频生成 =====
export interface VideoRequest {
  prompt: string;
  provider_id?: string;
  model?: string;
  image_url?: string;
  duration?: number;
  ratio?: string;
}

export interface VideoResult {
  video_url: string;
  model?: string;
}

export const generateVideo = (req: VideoRequest) =>
  apiRequest<VideoResult>('/api/canvas-video', { method: 'POST', body: JSON.stringify(req) });

// ===== Canvas LLM =====
export interface CanvasLLMRequest {
  messages: Array<{ role: string; content: string }>;
  provider_id?: string;
  model?: string;
  system_prompt?: string;
  max_tokens?: number;
}

export interface LLMResult {
  text: string;
  model?: string;
  usage?: Record<string, number>;
}

export const canvasLLM = (req: CanvasLLMRequest) =>
  apiRequest<LLMResult>('/api/canvas-llm', { method: 'POST', body: JSON.stringify(req) });

// ===== ModelScope =====
export interface MsGenerateRequest {
  prompt: string;
  model?: string;
  size?: string;
  image_url?: string;
  lora?: string;
}

export const msGenerate = (req: MsGenerateRequest) =>
  apiRequest<ImageResult>('/api/ms/generate', { method: 'POST', body: JSON.stringify(req) });

// ===== ComfyUI =====
export interface ComfyUIRequest {
  workflow: string;
  prompt?: string;
  params?: Record<string, any>;
  size?: string;
  seed?: number;
}

export const comfyuiGenerate = (req: ComfyUIRequest) =>
  apiRequest<ImageResult>('/api/comfyui/generate', { method: 'POST', body: JSON.stringify(req) });

export const getComfyUIInstances = () =>
  apiRequest<Array<{ url: string; name: string }>>('/api/comfyui/instances');

export const updateComfyUIInstances = (instances: Array<{ url: string; name: string }>) =>
  apiRequest('/api/comfyui/instances', { method: 'PUT', body: JSON.stringify(instances) });

// ===== 工作流管理 =====
export interface WorkflowInfo {
  name: string;
  title: string;
  description: string;
  fields: Array<{ key: string; label: string; type: string; default?: any }>;
}

export const getWorkflows = () => apiRequest<WorkflowInfo[]>('/api/workflows');

export const deleteWorkflow = (name: string) =>
  apiRequest(`/api/workflows/${name}`, { method: 'DELETE' });

export const uploadWorkflow = async (file: File, title?: string, description?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (description) formData.append('description', description);

  const resp = await fetch(`${BACKEND_URL}/api/workflows/upload`, { method: 'POST', body: formData });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  return resp.json();
};

// ===== 素材库 =====
export interface AssetCategory {
  id: string;
  name: string;
}

export interface AssetItem {
  id: string;
  category_id: string;
  url: string;
  name: string;
  type: string;
  addedAt: number;
}

export interface AssetLibrary {
  categories: AssetCategory[];
  items: AssetItem[];
}

export const getAssetLibrary = () => apiRequest<AssetLibrary>('/api/asset-library');

export const createAssetCategory = (name: string) =>
  apiRequest<AssetCategory>('/api/asset-library/categories', { method: 'POST', body: JSON.stringify({ name }) });

export const deleteAssetCategory = (catId: string) =>
  apiRequest(`/api/asset-library/categories/${catId}`, { method: 'DELETE' });

export const addAssetItem = (category_id: string, url: string, name?: string, type?: string) =>
  apiRequest<{ id: string }>('/api/asset-library/items', {
    method: 'POST', body: JSON.stringify({ category_id, url, name, type }),
  });

export const deleteAssetItem = (itemId: string) =>
  apiRequest(`/api/asset-library/items/${itemId}`, { method: 'DELETE' });

// ===== 画布后端 CRUD =====
export interface CanvasMeta {
  id: string;
  title: string;
  kind: string;
  icon: string;
  nodeCount: number;
  updatedAt: number;
  createdAt: number;
}

export const getBackendCanvases = () => apiRequest<CanvasMeta[]>('/api/canvases');

export const createBackendCanvas = (title?: string, kind?: string) =>
  apiRequest('/api/canvases', { method: 'POST', body: JSON.stringify({ title, kind }) });

export const getBackendCanvas = (id: string) => apiRequest(`/api/canvases/${id}`);

export const saveBackendCanvas = (id: string, data: any) =>
  apiRequest(`/api/canvases/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteBackendCanvas = (id: string) =>
  apiRequest(`/api/canvases/${id}`, { method: 'DELETE' });

// ===== 历史记录 =====
export const getHistory = (limit = 50) => apiRequest<any[]>(`/api/history?limit=${limit}`);

// ===== 文件上传 =====
export const uploadFile = async (file: File): Promise<{ url: string; filename: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await fetch(`${BACKEND_URL}/api/upload`, { method: 'POST', body: formData });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  return resp.json();
};

// ===== 队列状态 =====
export const getQueueStatus = () =>
  apiRequest<{ running: number; pending: number; online: number }>('/api/queue_status');

// ===== 配置 =====
export const getServerConfig = () => apiRequest<{
  providers: ProviderConfig[];
  comfyui_instances: any[];
  has_modelscope_token: boolean;
  version: string;
}>('/api/config');

// ===== WebSocket 实时连接 =====
export class CanvasWebSocket {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: number | null = null;

  connect() {
    const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + '/ws/stats';
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const type = msg.type;
        const handlers = this.listeners.get(type);
        if (handlers) handlers.forEach((h) => h(msg));
        // Also broadcast to wildcard listeners
        const allHandlers = this.listeners.get('*');
        if (allHandlers) allHandlers.forEach((h) => h(msg));
      } catch {}
    };

    this.ws.onclose = () => {
      this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(type: string, handler: (data: any) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const canvasWS = new CanvasWebSocket();
