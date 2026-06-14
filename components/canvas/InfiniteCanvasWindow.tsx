// 文件路径: components/canvas/InfiniteCanvasWindow.tsx
// 无限画布窗口 — 完整版原生 React 实现
// 整合 Infinite-Canvas 全部核心功能：
//   • 无限缩放平移画布引擎 + 网格背景
//   • 全节点系统（Prompt/Image/Generator/Output/Video/LLM/Loop）
//   • SVG 贝塞尔曲线连线 + 端口吸附
//   • 一键级联运行（拓扑排序 + 串行执行）
//   • 撤销/重做（Ctrl+Z/Y）+ 复制粘贴（Ctrl+C/V）
//   • 框选（Ctrl+拖拽）+ 小地图
//   • 多画布管理 + 本地持久化自动保存
//   • 完全匹配 MOKE Vision One 工业设计语言

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApiConfig, resolveActiveImageRuntimeConfig } from '../../contexts/ApiConfigContext';
import { useGlobalAssets } from '../../contexts/GlobalAssetContext';
import { generateModelImage, setRuntimeImageGenerationConfig } from '../../services/imageGenerationService';
import { X, Layers, Map as MapIcon, Box } from 'lucide-react';
import { ApiSettingsModal } from '../ApiSettingsModal';
import { FilmSystem } from '../FilmSystem';
import { ChatWindow } from '../chat/ChatWindow';
import { CanvasTimeline } from './CanvasTimeline';
import { Director3DWindow } from '../director3d/Director3DWindow';
import {
  CanvasNode, CanvasConnection, CanvasData, CanvasLog, NodeType,
  ConnectionDragState, SelectionBox, CascadeState, NODE_DEFAULTS, getDefaultPorts,
} from './types';
import { useCanvasEngine } from './useCanvasEngine';
import { ConnectionLayer } from './ConnectionLayer';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasLibrary } from './CanvasLibrary';
import { Minimap } from './Minimap';
import { NodeWrapper } from './nodes/NodeWrapper';
import { PromptNode } from './nodes/PromptNode';
import { ImageNode } from './nodes/ImageNode';
import { GeneratorNode } from './nodes/GeneratorNode';
import { OutputNode } from './nodes/OutputNode';
import { VideoNode } from './nodes/VideoNode';
import { LLMNode } from './nodes/LLMNode';
import { LoopNode } from './nodes/LoopNode';
import { ComfyUINode } from './nodes/ComfyUINode';
import { SmartComposerNode } from './nodes/SmartComposerNode';
import {
  generateId, createNewCanvas, getCanvasList, saveCanvas, loadCanvas,
  deleteCanvas as deleteCanvasFromStore, getOrCreateDefaultCanvas,
} from './canvasStore';

interface InfiniteCanvasWindowProps {
  onBack: () => void;
}

export const InfiniteCanvasWindow: React.FC<InfiniteCanvasWindowProps> = ({ onBack }) => {
  const { isDark, toggleTheme } = useTheme();
  const { lang } = useLanguage();
  const { config } = useApiConfig();
  const globalAssets = useGlobalAssets();
  const containerRef = useRef<HTMLDivElement>(null);

  // ===== API 设置弹窗 =====
  const [showApiModal, setShowApiModal] = useState(false);

  // ===== AI Chat =====
  const [showChat, setShowChat] = useState(false);
  const [chatMounted, setChatMounted] = useState(false);

  // ===== 相机模块 — 底层提示词锁定 =====
  const [showCameraPanel, setShowCameraPanel] = useState(false);
  const [cameraSettings, setCameraSettings] = useState({
    focalLength: 50,
    aperture: 2.8,
    iso: 800,
    lensType: 'STANDARD' as 'STANDARD' | 'MACRO' | 'PROBE' | 'STORYBOARD',
    enabled: false,
  });

  // ===== 自定义全局提示词 =====
  const [showGlobalPrompt, setShowGlobalPrompt] = useState(false);
  const [globalPromptDraft, setGlobalPromptDraft] = useState('');

  // ===== 全局图片预览灯箱 =====
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // ===== 剪辑线模式 =====
  const [showTimeline, setShowTimeline] = useState(false);

  // ===== Film System — 全局提示词锁定 =====
  const [filmSystemLocked, setFilmSystemLocked] = useState(false);
  const [filmSystemPrompt, setFilmSystemPrompt] = useState('');
  const [showFilmSystem, setShowFilmSystem] = useState(false);

  // ===== 3D 导演台 =====
  const [showDirector3D, setShowDirector3D] = useState(false);

  // ===== 画布数据状态 =====
  const [canvasData, setCanvasData] = useState<CanvasData>(() => getOrCreateDefaultCanvas());
  const [canvasList, setCanvasList] = useState<CanvasData[]>(() => getCanvasList());
  const [showLibrary, setShowLibrary] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [logs, setLogs] = useState<CanvasLog[]>([]);

  // ===== 节点和连线 =====
  const [nodes, setNodes] = useState<CanvasNode[]>(canvasData.nodes);
  const [connections, setConnections] = useState<CanvasConnection[]>(canvasData.connections);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);

  // ===== 级联运行 =====
  const [cascadeState, setCascadeState] = useState<CascadeState>({
    isRunning: false, order: [], currentIndex: -1, statuses: {},
  });
  const cascadeStopRef = useRef(false);

  // ===== 框选 =====
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });

  // ===== 连线拖拽 =====
  const [tempConnection, setTempConnection] = useState<ConnectionDragState | null>(null);

  // ===== 剪贴板 =====
  const clipboardRef = useRef<{ nodes: CanvasNode[]; connections: CanvasConnection[] } | null>(null);

  // ===== 画布引擎 =====
  const engine = useCanvasEngine({
    initialViewport: canvasData.viewport,
    onViewportChange: (vp) => setCanvasData((prev) => ({ ...prev, viewport: vp })),
  });

  // ===== 拖拽（支持多选同时移动） =====
  const dragRef = useRef<{ startX: number; startY: number; nodeStarts: Record<string, { x: number; y: number }> } | null>(null);

  // ===== 日志 =====
  const addLog = useCallback((type: CanvasLog['type'], message: string, nodeId?: string) => {
    setLogs((prev) => [...prev.slice(-99), { id: generateId(), timestamp: Date.now(), type, message, nodeId }]);
  }, []);

  // ===== 自动保存 =====
  const saveTimerRef = useRef<number>();
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const data: CanvasData = { ...canvasData, nodes, connections, viewport: engine.viewport, logs, updatedAt: Date.now() };
      saveCanvas(data);
      setCanvasList(getCanvasList());
    }, 600);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [nodes, connections, engine.viewport]);

  // ===== 切换画布 =====
  const switchCanvas = useCallback((id: string) => {
    const loaded = loadCanvas(id);
    if (loaded) {
      setCanvasData(loaded);
      setNodes(loaded.nodes);
      setConnections(loaded.connections);
      engine.setViewport(loaded.viewport);
      setSelectedNodeIds(new Set());
      setSelectedConnectionId(null);
      setLogs(loaded.logs || []);
    }
  }, [engine]);

  const createCanvas = useCallback(() => {
    const nc = createNewCanvas();
    saveCanvas(nc);
    setCanvasList(getCanvasList());
    switchCanvas(nc.id);
  }, [switchCanvas]);

  const handleDeleteCanvas = useCallback((id: string) => {
    deleteCanvasFromStore(id);
    const list = getCanvasList();
    setCanvasList(list);
    if (id === canvasData.id && list.length > 0) switchCanvas(list[0].id);
    else if (list.length === 0) createCanvas();
  }, [canvasData.id, switchCanvas, createCanvas]);

  const handleRenameCanvas = useCallback((id: string, title: string) => {
    setCanvasData((prev) => prev.id === id ? { ...prev, title } : prev);
    const list = getCanvasList().map((c) => c.id === id ? { ...c, title } : c);
    localStorage.setItem('moke_infinite_canvas_list', JSON.stringify(list));
    setCanvasList(list);
  }, []);

  // ===== 撤销/重做 =====
  const pushUndoSnapshot = useCallback(() => {
    engine.pushUndo({ nodes: JSON.parse(JSON.stringify(nodes)), connections: JSON.parse(JSON.stringify(connections)) });
  }, [nodes, connections, engine]);

  const handleUndo = useCallback(() => {
    const snapshot = engine.undo({ nodes, connections });
    if (snapshot) { setNodes(snapshot.nodes); setConnections(snapshot.connections); }
  }, [nodes, connections, engine]);

  const handleRedo = useCallback(() => {
    const snapshot = engine.redo({ nodes, connections });
    if (snapshot) { setNodes(snapshot.nodes); setConnections(snapshot.connections); }
  }, [nodes, connections, engine]);

  // ===== 复制/粘贴 =====
  const handleCopy = useCallback(() => {
    if (selectedNodeIds.size === 0) return;
    const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
    const selectedConns = connections.filter((c) => selectedNodeIds.has(c.fromNodeId) && selectedNodeIds.has(c.toNodeId));
    clipboardRef.current = { nodes: JSON.parse(JSON.stringify(selectedNodes)), connections: JSON.parse(JSON.stringify(selectedConns)) };
  }, [nodes, connections, selectedNodeIds]);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current) return;
    pushUndoSnapshot();
    const idMap: Record<string, string> = {};
    const offset = 40;
    const newNodes = clipboardRef.current.nodes.map((n) => {
      const newId = generateId();
      idMap[n.id] = newId;
      return { ...n, id: newId, x: n.x + offset, y: n.y + offset };
    });
    const newConns = clipboardRef.current.connections.map((c) => ({
      ...c, id: generateId(), fromNodeId: idMap[c.fromNodeId], toNodeId: idMap[c.toNodeId],
    })).filter((c) => c.fromNodeId && c.toNodeId);
    setNodes((prev) => [...prev, ...newNodes]);
    setConnections((prev) => [...prev, ...newConns]);
    setSelectedNodeIds(new Set(newNodes.map((n) => n.id)));
  }, [pushUndoSnapshot]);

  // ===== 添加节点 =====
  const handleAddNode = useCallback((type: NodeType) => {
    pushUndoSnapshot();
    const defaults = NODE_DEFAULTS[type];
    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? (rect.width / 2 - engine.viewport.x) / engine.viewport.scale - defaults.width / 2 : 200;
    const centerY = rect ? (rect.height / 2 - engine.viewport.y) / engine.viewport.scale - defaults.height / 2 : 200;

    const newNode: CanvasNode = {
      id: generateId(),
      type,
      x: centerX + Math.random() * 60 - 30,
      y: centerY + Math.random() * 60 - 30,
      width: defaults.width,
      height: defaults.height,
      data: {},
      ports: getDefaultPorts(type),
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeIds(new Set([newNode.id]));
    addLog('info', `添加 ${type} 节点`, newNode.id);
  }, [engine.viewport, pushUndoSnapshot, addLog]);

  // ===== 添加图片节点（携带图片数据）=====
  const handleAddImageNodeWithData = useCallback((imageUrl: string, screenX?: number, screenY?: number) => {
    pushUndoSnapshot();
    const defaults = NODE_DEFAULTS['image'];
    const rect = containerRef.current?.getBoundingClientRect();
    let posX: number, posY: number;

    if (screenX !== undefined && screenY !== undefined && rect) {
      // 放置在鼠标位置
      posX = (screenX - rect.left - engine.viewport.x) / engine.viewport.scale - defaults.width / 2;
      posY = (screenY - rect.top - engine.viewport.y) / engine.viewport.scale - defaults.height / 2;
    } else {
      // 放置在画布中心
      posX = rect ? (rect.width / 2 - engine.viewport.x) / engine.viewport.scale - defaults.width / 2 : 200;
      posY = rect ? (rect.height / 2 - engine.viewport.y) / engine.viewport.scale - defaults.height / 2 : 200;
    }

    const newNode: CanvasNode = {
      id: generateId(),
      type: 'image',
      x: posX + Math.random() * 20 - 10,
      y: posY + Math.random() * 20 - 10,
      width: defaults.width,
      height: defaults.height,
      data: { imageUrl },
      ports: getDefaultPorts('image'),
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeIds(new Set([newNode.id]));
    addLog('info', '从图片创建节点', newNode.id);
  }, [engine.viewport, pushUndoSnapshot, addLog]);

  // ===== 3D 导演台截图回调 — 同时发送到画布节点 + 全局素材库 =====
  const handleDirectorCapture = useCallback((dataUrl: string, meta: { aspect: string; cameraName: string }) => {
    // 1. 在无限画布上创建图片节点
    handleAddImageNodeWithData(dataUrl);
    // 2. 写入全局素材库（thumbnailBase64 留空，addAsset 内部自动生成缩略图）
    globalAssets.addAsset({
      name: `3D导演 · ${meta.cameraName || '镜头'}`,
      type: 'scene',
      thumbnailBase64: '',
      fullImageBase64: dataUrl,
      prompt: '',
      metadata: { source: '3D导演台', aspect: meta.aspect, camera: meta.cameraName },
    });
    addLog('info', `3D 导演截图已发送到画布与素材库 (${meta.aspect})`);
  }, [handleAddImageNodeWithData, globalAssets, addLog]);

  // ===== 画布拖放图片文件 =====
  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('image/'));
    if (files.length === 0) return;

    files.forEach((file: File, idx: number) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          handleAddImageNodeWithData(dataUrl, e.clientX + idx * 30, e.clientY + idx * 30);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [handleAddImageNodeWithData]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // ===== 键盘快捷键 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); handleUndo(); }
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); handleRedo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'c') { handleCopy(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // 优先检查剪贴板中是否有图片
        e.preventDefault();
        navigator.clipboard.read?.().then((items: ClipboardItems) => {
          let hasImage = false;
          for (const item of items) {
            const imageType = item.types.find((t: string) => t.startsWith('image/'));
            if (imageType) {
              hasImage = true;
              item.getType(imageType).then((blob: Blob) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const dataUrl = ev.target?.result as string;
                  if (dataUrl) handleAddImageNodeWithData(dataUrl);
                };
                reader.readAsDataURL(blob);
              });
              break;
            }
          }
          if (!hasImage) handlePaste();
        }).catch(() => {
          // clipboard API 不可用时回退到节点粘贴
          handlePaste();
        });
      }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); setSelectedNodeIds(new Set(nodes.map((n) => n.id))); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { handleDeleteSelected(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handlePaste, handleAddImageNodeWithData, nodes]);

  // ===== 节点拖拽 =====
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation(); // 阻止冒泡到画布层，避免触发框选

    // 选中逻辑：Ctrl 多选切换；否则如果节点已在选中集合中则保持（允许多选拖拽）
    if (e.ctrlKey || e.metaKey) {
      setSelectedNodeIds((prev) => { const s = new Set(prev); s.has(nodeId) ? s.delete(nodeId) : s.add(nodeId); return s; });
    } else if (!selectedNodeIds.has(nodeId)) {
      setSelectedNodeIds(new Set([nodeId]));
    }
    setSelectedConnectionId(null);

    const node = nodes.find((n) => n.id === nodeId);
    if (node && !(e.target as HTMLElement).closest('textarea, input, select, button, [data-no-drag]')) {
      e.preventDefault();
      // 收集所有参与拖拽的节点初始位置
      const draggedIds = new Set(selectedNodeIds);
      draggedIds.add(nodeId);
      const nodeStarts: Record<string, { x: number; y: number }> = {};
      nodes.forEach((n) => {
        if (draggedIds.has(n.id)) {
          nodeStarts[n.id] = { x: n.x, y: n.y };
        }
      });
      dragRef.current = { startX: e.clientX, startY: e.clientY, nodeStarts };
    }
  }, [nodes, selectedNodeIds]);

  // ===== 端口连线 =====
  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, portId: string, portType: 'input' | 'output') => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || portType !== 'output') return;

    const samePorts = node.ports.filter((p) => p.type === portType);
    const port = node.ports.find((p) => p.id === portId);
    const idx = samePorts.indexOf(port!);
    const spacing = node.height / (samePorts.length + 1);
    const portX = node.x + node.width;
    const portY = node.y + spacing * (idx + 1);

    setTempConnection({ isDragging: true, fromNodeId: nodeId, fromPortId: portId, fromX: portX, fromY: portY, toX: portX, toY: portY });
  }, [nodes]);

  // ===== 鼠标全局事件 =====
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    engine.handlePanMove(e);

    if (dragRef.current) {
      const { startX, startY, nodeStarts } = dragRef.current;
      const dx = (e.clientX - startX) / engine.viewport.scale;
      const dy = (e.clientY - startY) / engine.viewport.scale;
      setNodes((prev) => prev.map((n) => {
        const start = nodeStarts[n.id];
        if (start) return { ...n, x: start.x + dx, y: start.y + dy };
        return n;
      }));
    }

    if (tempConnection?.isDragging) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = engine.screenToCanvas(e.clientX, e.clientY, rect);
        setTempConnection((prev) => prev ? { ...prev, toX: pos.x, toY: pos.y } : null);
      }
    }

    // 框选
    if (selectionBox.active) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = engine.screenToCanvas(e.clientX, e.clientY, rect);
        setSelectionBox((prev) => ({ ...prev, endX: pos.x, endY: pos.y }));
      }
    }
  }, [engine, tempConnection, selectionBox.active]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    engine.handlePanEnd();

    // 保存撤销点（如果拖拽了节点）
    if (dragRef.current) {
      const moved = Math.abs(e.clientX - dragRef.current.startX) > 2 || Math.abs(e.clientY - dragRef.current.startY) > 2;
      if (moved) pushUndoSnapshot();
    }
    dragRef.current = null;

    // 结束连线
    if (tempConnection?.isDragging) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = engine.screenToCanvas(e.clientX, e.clientY, rect);
        for (const node of nodes) {
          if (node.id === tempConnection.fromNodeId) continue;
          const inputPorts = node.ports.filter((p) => p.type === 'input');
          for (let i = 0; i < inputPorts.length; i++) {
            const spacing = node.height / (inputPorts.length + 1);
            const px = node.x;
            const py = node.y + spacing * (i + 1);
            if (Math.sqrt((pos.x - px) ** 2 + (pos.y - py) ** 2) < 36) {
              const exists = connections.some((c) => c.fromNodeId === tempConnection.fromNodeId && c.toNodeId === node.id && c.toPortId === inputPorts[i].id);
              if (!exists) {
                pushUndoSnapshot();
                setConnections((prev) => [...prev, {
                  id: generateId(), fromNodeId: tempConnection.fromNodeId, fromPortId: tempConnection.fromPortId,
                  toNodeId: node.id, toPortId: inputPorts[i].id,
                }]);
                addLog('info', '创建连接');
              }
              break;
            }
          }
        }
      }
      setTempConnection(null);
    }

    // 框选结束
    if (selectionBox.active) {
      const box = selectionBox;
      const minX = Math.min(box.startX, box.endX);
      const maxX = Math.max(box.startX, box.endX);
      const minY = Math.min(box.startY, box.endY);
      const maxY = Math.max(box.startY, box.endY);
      const selected = nodes.filter((n) => n.x + n.width > minX && n.x < maxX && n.y + n.height > minY && n.y < maxY);
      setSelectedNodeIds(new Set(selected.map((n) => n.id)));
      setSelectionBox({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
    }
  }, [tempConnection, nodes, connections, selectionBox, engine, pushUndoSnapshot, addLog]);

  // ===== 画布背景点击/框选开始 =====
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const isBlank = e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-world');

    // Ctrl+左键空白 = 框选
    if (e.button === 0 && isBlank && (e.ctrlKey || e.metaKey)) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = engine.screenToCanvas(e.clientX, e.clientY, rect);
        setSelectionBox({ active: true, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
      }
      return;
    }

    // 左键空白区域 或 中键 = 平移画布
    if ((e.button === 0 && isBlank) || e.button === 1) {
      engine.handlePanStart(e);
      if (e.button === 0) {
        setSelectedNodeIds(new Set());
        setSelectedConnectionId(null);
      }
    }
  }, [engine]);

  // ===== 删除选中 =====
  const handleDeleteSelected = useCallback(() => {
    if (selectedConnectionId) {
      pushUndoSnapshot();
      setConnections((prev) => prev.filter((c) => c.id !== selectedConnectionId));
      setSelectedConnectionId(null);
    }
    if (selectedNodeIds.size > 0) {
      pushUndoSnapshot();
      setNodes((prev) => prev.filter((n) => !selectedNodeIds.has(n.id)));
      setConnections((prev) => prev.filter((c) => !selectedNodeIds.has(c.fromNodeId) && !selectedNodeIds.has(c.toNodeId)));
      setSelectedNodeIds(new Set());
    }
  }, [selectedNodeIds, selectedConnectionId, pushUndoSnapshot]);

  // ===== 节点数据/尺寸更新 =====
  const handleNodeDataChange = useCallback((nodeId: string, data: Record<string, any>) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data } : n));
  }, []);

  const handleNodeResize = useCallback((nodeId: string, width: number, height: number) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, width, height } : n));
  }, []);

  // ===== 一键级联运行 =====
  const computeTopologicalOrder = useCallback((): string[] => {
    // 找到所有终端节点（generator/video/llm 类型且 output 端口无出线到非 output 节点）
    const terminalIds = nodes.filter((n) => ['generator', 'video'].includes(n.type)).map((n) => n.id);
    if (terminalIds.length === 0) return [];

    // BFS 反向追溯
    const order: string[] = [];
    const visited = new Set<string>();
    const queue = [...terminalIds];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      order.push(nodeId);
      // 找上游节点
      const upstreamConns = connections.filter((c) => c.toNodeId === nodeId);
      for (const c of upstreamConns) {
        if (!visited.has(c.fromNodeId)) queue.push(c.fromNodeId);
      }
    }

    return order.reverse(); // 从源头到终端
  }, [nodes, connections]);

  const handleRunCascade = useCallback(async () => {
    const order = computeTopologicalOrder();
    const executableOrder = order.filter((id) => {
      const node = nodes.find((n) => n.id === id);
      return node && ['generator', 'video'].includes(node.type);
    });

    if (executableOrder.length === 0) {
      addLog('warning', '没有可执行的生成节点');
      return;
    }

    cascadeStopRef.current = false;
    setCascadeState({ isRunning: true, order: executableOrder, currentIndex: 0, statuses: {} });
    addLog('info', `开始级联运行：${executableOrder.length} 个节点`);

    for (let i = 0; i < executableOrder.length; i++) {
      if (cascadeStopRef.current) break;
      setCascadeState((prev) => ({ ...prev, currentIndex: i, statuses: { ...prev.statuses, [executableOrder[i]]: 'running' } }));
      try {
        await handleGenerate(executableOrder[i]);
        setCascadeState((prev) => ({ ...prev, statuses: { ...prev.statuses, [executableOrder[i]]: 'done' } }));
      } catch {
        setCascadeState((prev) => ({ ...prev, statuses: { ...prev.statuses, [executableOrder[i]]: 'failed' } }));
      }
    }

    setCascadeState({ isRunning: false, order: [], currentIndex: -1, statuses: {} });
    addLog('success', '级联运行完成');
  }, [computeTopologicalOrder, nodes, addLog]);

  const handleStopCascade = useCallback(() => {
    cascadeStopRef.current = true;
    setCascadeState((prev) => ({ ...prev, isRunning: false }));
    addLog('warning', '级联运行已停止');
  }, [addLog]);

  // ===== AI 图片生成 =====
  const handleGenerate = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const inputConns = connections.filter((c) => c.toNodeId === nodeId);
    let promptText = '';
    let refImages: string[] = [];
    for (const conn of inputConns) {
      const sourceNode = nodes.find((n) => n.id === conn.fromNodeId);
      if (sourceNode?.type === 'prompt') promptText = (sourceNode.data.text as string) || '';
      if (sourceNode?.type === 'image' && sourceNode.data.imageUrl) refImages.push(sourceNode.data.imageUrl as string);
    }

    if (!promptText) return;

    // Film System: 锁定时自动追加全局提示词
    if (filmSystemLocked && filmSystemPrompt.trim()) {
      promptText = `${filmSystemPrompt.trim()}\n\n${promptText}`;
    }

    // Camera Module: 相机参数底层提示词注入
    if (cameraSettings.enabled) {
      let lensDesc = `Standard lens, ${cameraSettings.focalLength}mm focal length.`;
      if (cameraSettings.lensType === 'MACRO') {
        lensDesc = 'Macro photography, extreme close-up, 1:1 magnification, incredibly sharp details, shallow depth of field, bokeh background.';
      } else if (cameraSettings.lensType === 'PROBE') {
        lensDesc = 'Laowa 24mm probe lens, bug-eye perspective, deep depth of field, wide angle macro, immersive viewpoint.';
      } else if (cameraSettings.lensType === 'STORYBOARD') {
        lensDesc = `Cinematic storyboard style, ${cameraSettings.focalLength}mm lens aesthetic.`;
      }
      const cameraPrompt = `Photorealistic, 8k, shot on quantum sensor. ${lensDesc} f/${cameraSettings.aperture} aperture, ISO ${cameraSettings.iso}. ${cameraSettings.iso > 3200 ? 'Night vision mode, bright details in darkness.' : 'Natural lighting.'} No text, no watermarks.`;
      promptText = `${cameraPrompt}\n\n${promptText}`;
    }

    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: true, error: undefined } } : n));

    try {
      const imageRuntime = resolveActiveImageRuntimeConfig(config);
      setRuntimeImageGenerationConfig({
        apiKey: imageRuntime.apiKey, baseUrl: imageRuntime.baseUrl,
        model: imageRuntime.model, protocol: imageRuntime.protocol,
      });

      const ratio = (node.data.ratio as string) || '1:1';
      const settings = {
        focalLength: 50, aperture: 2.8, iso: 800, shutterSpeed: '1/200',
        focusDistance: 50, aspectRatio: ratio, resolution: '1K', lensType: 'STANDARD' as const,
      };

      const result = await generateModelImage({
        prompt: promptText, settings,
        referenceImagesBase64: refImages.length > 0 ? refImages.map((img) => img.replace(/^data:image\/[^;]+;base64,/, '')) : undefined,
      });

      const imageUrl = result.startsWith('data:') ? result : `data:image/png;base64,${result}`;
      setNodes((prev) => prev.map((n) => {
        if (n.id === nodeId) {
          const existing = (n.data.generatedImages as string[]) || [];
          return { ...n, data: { ...n.data, isGenerating: false, generatedImages: [...existing, imageUrl] } };
        }
        return n;
      }));

      // 传播到下游 Output 节点
      const outputConns = connections.filter((c) => c.fromNodeId === nodeId);
      for (const conn of outputConns) {
        setNodes((prev) => prev.map((n) => {
          if (n.id === conn.toNodeId && n.type === 'output') {
            const existing = (n.data.images as string[]) || [];
            return { ...n, data: { ...n.data, images: [...existing, imageUrl] } };
          }
          return n;
        }));
      }

      addLog('success', '图片生成成功', nodeId);
    } catch (err: any) {
      setNodes((prev) => prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, isGenerating: false, error: err.message || '生成失败' } } : n
      ));
      addLog('error', err.message || '生成失败', nodeId);
    }
  }, [nodes, connections, config, addLog]);

  // ===== LLM 调用 =====
  const handleLLMRun = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isRunning: true, error: undefined } } : n));
    try {
      const messages = (node.data.messages || []) as Array<{ role: string; content: string }>;
      const lastMsg = messages[messages.length - 1];
      if (!lastMsg || lastMsg.role !== 'user') return;

      const { sendChatMessage } = await import('../../services/chatService');
      const response = await sendChatMessage({
        messages: messages.map((m) => ({ id: '', role: m.role as any, content: m.content, timestamp: Date.now() })),
      });

      const newMessages = [...messages, { role: 'assistant' as const, content: response }];
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isRunning: false, messages: newMessages } } : n));
      addLog('success', 'LLM 响应完成', nodeId);
    } catch (err: any) {
      setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, isRunning: false, error: err.message } } : n));
      addLog('error', err.message || 'LLM 调用失败', nodeId);
    }
  }, [nodes, addLog]);

  // ===== 缩放按钮 =====
  const handleZoomIn = useCallback(() => {
    const { scale, x, y } = engine.viewport;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newScale = Math.min(5, scale * 1.25);
    const cx = rect.width / 2, cy = rect.height / 2;
    engine.setViewport({ x: cx - (cx - x) * (newScale / scale), y: cy - (cy - y) * (newScale / scale), scale: newScale });
  }, [engine]);

  const handleZoomOut = useCallback(() => {
    const { scale, x, y } = engine.viewport;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newScale = Math.max(0.1, scale / 1.25);
    const cx = rect.width / 2, cy = rect.height / 2;
    engine.setViewport({ x: cx - (cx - x) * (newScale / scale), y: cy - (cy - y) * (newScale / scale), scale: newScale });
  }, [engine]);

  const handleFitView = useCallback(() => {
    if (nodes.length === 0) { engine.resetView(); return; }
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      engine.fitToView(rect, {
        minX: Math.min(...nodes.map((n) => n.x)),
        minY: Math.min(...nodes.map((n) => n.y)),
        maxX: Math.max(...nodes.map((n) => n.x + n.width)),
        maxY: Math.max(...nodes.map((n) => n.y + n.height)),
      });
    }
  }, [nodes, engine]);

  // ===== 渲染节点 =====
  const renderNodeContent = (node: CanvasNode) => {
    const isSelected = selectedNodeIds.has(node.id);
    const props = { node, isDark, onDataChange: handleNodeDataChange, isSelected };
    switch (node.type) {
      case 'prompt': return <PromptNode {...props} />;
      case 'image': return <ImageNode {...props} />;
      case 'generator': return <GeneratorNode {...props} connections={connections} nodes={nodes} onGenerate={handleGenerate} onPreviewImage={setLightboxImg} />;
      case 'output': return <OutputNode {...props} connections={connections} nodes={nodes} onPreviewImage={setLightboxImg} onCreateImageNode={handleAddImageNodeWithData} />;
      case 'video': return <VideoNode {...props} connections={connections} nodes={nodes} onGenerate={handleGenerate} />;
      case 'llm': return <LLMNode {...props} connections={connections} nodes={nodes} onRun={handleLLMRun} />;
      case 'loop': return <LoopNode {...props} />;
      case 'comfyui': return <ComfyUINode {...props} />;
      case 'composer': return <SmartComposerNode {...props} />;
      default: return <div className="p-4 text-xs text-gray-500">Unknown: {node.type}</div>;
    }
  };

  const containerRect = containerRef.current?.getBoundingClientRect();

  return (
    <div className={`w-full h-full flex flex-col ${isDark ? 'bg-[#050505]' : 'bg-[#f8f8f8]'}`}>
      {/* ====== 顶部栏 ====== */}
      <div className={`shrink-0 flex items-center justify-between px-5 py-2.5 border-b z-40 ${
        isDark ? 'bg-[#0a0a0a] border-[#1a1a1a]' : 'bg-white border-[#e0e0e0]'
      }`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className={`p-2 transition-colors ${
            isDark ? 'hover:bg-[#1a0808] text-[#666] hover:text-[#ff4444]' : 'hover:bg-[#fff0f0] text-[#999] hover:text-[#dc2626]'
          }`}>
            <X className="w-5 h-5" />
          </button>

          <div className={`w-7 h-7 flex items-center justify-center border ${
            isDark ? 'bg-[#1a0808] border-[#331111]' : 'bg-[#fff5f5] border-[#fecaca]'
          }`}>
            <svg className={`w-3.5 h-3.5 ${isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7" rx="0" strokeWidth="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="0" strokeWidth="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="0" strokeWidth="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="0" strokeWidth="1.5" />
            </svg>
          </div>

          <div>
            <div className={`font-mono text-[11px] font-bold tracking-[0.2em] uppercase ${isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'}`}>
              {lang === 'CN' ? '无限画布' : 'INFINITE CANVAS'}
            </div>
            <div className={`text-[9px] font-mono tracking-wider ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>
              {canvasData.title} · {nodes.length} {lang === 'CN' ? '节点' : 'nodes'} · {connections.length} {lang === 'CN' ? '连接' : 'links'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* 相机模块 */}
          <button
            onClick={() => setShowCameraPanel(!showCameraPanel)}
            className={`px-2 py-1 text-[10px] font-mono transition-colors ${
              cameraSettings.enabled
                ? isDark ? 'bg-[#330000] text-[#ff4444] border border-[#550000]' : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                : showCameraPanel
                  ? isDark ? 'bg-[#1a0808] text-[#cc2222]' : 'bg-[#fff5f5] text-[#b91c1c]'
                  : isDark ? 'text-[#666] hover:text-[#cc2222] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#b91c1c] hover:bg-[#fff5f5]'
            }`}
          >
            {cameraSettings.enabled ? `◉ ${cameraSettings.focalLength}mm` : '◉ CAM'}
          </button>
          {/* Film System */}
          <button
            onClick={() => setShowFilmSystem(!showFilmSystem)}
            className={`px-2 py-1 text-[10px] font-mono transition-colors ${
              filmSystemLocked
                ? isDark ? 'bg-[#330000] text-[#ff4444] border border-[#550000]' : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                : showFilmSystem
                  ? isDark ? 'bg-[#1a0808] text-[#cc2222]' : 'bg-[#fff5f5] text-[#b91c1c]'
                  : isDark ? 'text-[#666] hover:text-[#cc2222] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#b91c1c] hover:bg-[#fff5f5]'
            }`}
          >
            {filmSystemLocked ? '🔒 FILM' : 'FILM'}
          </button>
          {/* 3D 导演台 */}
          <button
            onClick={() => setShowDirector3D(true)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono transition-colors ${
              isDark ? 'text-[#666] hover:text-[#cc2222] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#b91c1c] hover:bg-[#fff5f5]'
            }`}
          >
            <Box className="w-3 h-3" />
            <span>3D导演</span>
          </button>
          {/* 自定义全局锁定提示词 */}
          <button
            onClick={() => { setShowGlobalPrompt(!showGlobalPrompt); setGlobalPromptDraft(filmSystemPrompt); }}
            className={`px-2 py-1 text-[10px] font-mono transition-colors ${
              showGlobalPrompt
                ? isDark ? 'bg-[#1a0808] text-[#ff4444]' : 'bg-[#fff0f0] text-[#dc2626]'
                : isDark ? 'text-[#666] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#dc2626] hover:bg-[#fff0f0]'
            }`}
          >
            锁定词
          </button>
          {/* 小地图 */}
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`p-1.5 transition-colors ${
              showMinimap
                ? isDark ? 'bg-[#1a0808] text-[#ff4444]' : 'bg-[#fff0f0] text-[#dc2626]'
                : isDark ? 'text-[#666] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#dc2626] hover:bg-[#fff0f0]'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
          </button>
          {/* 画布管理 */}
          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono transition-colors ${
              showLibrary
                ? isDark ? 'bg-[#1a0808] text-[#ff4444] border border-[#331111]' : 'bg-[#fff0f0] text-[#dc2626] border border-[#fecaca]'
                : isDark ? 'text-[#666] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#dc2626] hover:bg-[#fff0f0]'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>{lang === 'CN' ? '画布' : 'LIB'}</span>
          </button>
          {/* 分隔 */}
          <div className={`w-px h-4 mx-1 ${isDark ? 'bg-[#1f1f1f]' : 'bg-[#e0e0e0]'}`} />
          {/* OUTPUT 剪辑线 */}
          <button
            onClick={() => setShowTimeline(true)}
            className={`px-2 py-1 text-[10px] font-mono font-bold transition-colors ${
              isDark ? 'text-[#666] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#dc2626] hover:bg-[#fff0f0]'
            }`}
          >
            OUTPUT
          </button>
          {/* AI Chat */}
          <button
            onClick={() => { setChatMounted(true); setShowChat(!showChat); }}
            className={`px-2 py-1 text-[10px] font-mono transition-colors ${
              showChat
                ? isDark ? 'bg-[#1a0808] text-[#ff4444]' : 'bg-[#fff0f0] text-[#dc2626]'
                : isDark ? 'text-[#666] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#dc2626] hover:bg-[#fff0f0]'
            }`}
          >
            AI
          </button>
          {/* API 设置 */}
          <button
            onClick={() => setShowApiModal(true)}
            className={`px-2 py-1 text-[10px] font-mono transition-colors ${
              isDark ? 'text-[#666] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#dc2626] hover:bg-[#fff0f0]'
            }`}
          >
            API
          </button>
          {/* 日夜模式切换 */}
          <button
            onClick={toggleTheme}
            className={`p-1.5 text-[12px] transition-colors ${
              isDark ? 'text-[#666] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#dc2626] hover:bg-[#fff0f0]'
            }`}
            title={isDark ? '切换日间模式' : '切换夜间模式'}
          >
            {isDark ? '☀' : '☾'}
          </button>
        </div>
      </div>

      {/* ====== 画布主体 ====== */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden ${engine.isPanning ? 'cursor-grabbing' : 'cursor-default'}`}
        onWheel={engine.handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
        style={{ touchAction: 'none' }}
      >
        {/* 网格背景 — 黑红点阵 */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: isDark
            ? 'radial-gradient(rgba(204,34,34,0.06) 1px, transparent 1px)'
            : 'radial-gradient(rgba(185,28,28,0.08) 1px, transparent 1px)',
          backgroundSize: `${24 * engine.viewport.scale}px ${24 * engine.viewport.scale}px`,
          backgroundPosition: `${engine.viewport.x}px ${engine.viewport.y}px`,
        }} />

        {/* 画布世界 */}
        <div
          className="canvas-world absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${engine.viewport.x}px, ${engine.viewport.y}px) scale(${engine.viewport.scale})`, width: 8000, height: 6000 }}
        >
          <ConnectionLayer
            connections={connections} nodes={nodes} tempConnection={tempConnection}
            selectedConnectionId={selectedConnectionId}
            onConnectionClick={(id) => { setSelectedConnectionId(id); setSelectedNodeIds(new Set()); }}
            isDark={isDark}
          />

          {nodes.map((node) => (
            <NodeWrapper
              key={node.id} node={node} isDark={isDark} isSelected={selectedNodeIds.has(node.id)}
              onMouseDown={handleNodeMouseDown} onPortMouseDown={handlePortMouseDown} onResize={handleNodeResize}
            >
              {renderNodeContent(node)}
            </NodeWrapper>
          ))}
        </div>

        {/* 框选矩形 */}
        {selectionBox.active && (
          <div className="absolute left-0 top-0 origin-top-left pointer-events-none" style={{
            transform: `translate(${engine.viewport.x}px, ${engine.viewport.y}px) scale(${engine.viewport.scale})`,
          }}>
            <div className={`absolute border-2 border-dashed ${isDark ? 'border-[#cc2222]/50 bg-[#cc2222]/5' : 'border-[#dc2626]/50 bg-[#dc2626]/5'}`} style={{
              left: Math.min(selectionBox.startX, selectionBox.endX),
              top: Math.min(selectionBox.startY, selectionBox.endY),
              width: Math.abs(selectionBox.endX - selectionBox.startX),
              height: Math.abs(selectionBox.endY - selectionBox.startY),
            }} />
          </div>
        )}

        {/* 小地图 */}
        <Minimap
          nodes={nodes} viewport={engine.viewport}
          containerWidth={containerRect?.width || 1000} containerHeight={containerRect?.height || 600}
          isDark={isDark} visible={showMinimap}
        />

        {/* 画布管理侧栏 */}
        <CanvasLibrary
          isDark={isDark} lang={lang} canvasList={canvasList} activeCanvasId={canvasData.id}
          onSwitch={switchCanvas} onCreate={createCanvas} onDelete={handleDeleteCanvas}
          onRename={handleRenameCanvas} visible={showLibrary} onToggle={() => setShowLibrary(!showLibrary)}
        />

        {/* 工具栏 */}
        <CanvasToolbar
          isDark={isDark} scale={engine.viewport.scale} onAddNode={handleAddNode}
          onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onResetView={engine.resetView} onFitView={handleFitView}
          onDeleteSelected={handleDeleteSelected} onUndo={handleUndo} onRedo={handleRedo}
          onRunCascade={handleRunCascade} onStopCascade={handleStopCascade}
          hasSelection={selectedNodeIds.size > 0 || !!selectedConnectionId}
          canUndo={engine.canUndo()} canRedo={engine.canRedo()}
          isCascadeRunning={cascadeState.isRunning} lang={lang}
        />

        {/* 空状态引导 */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className={`flex flex-col items-center gap-5 ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>
              <div className={`w-16 h-16 flex items-center justify-center border ${
                isDark ? 'bg-[#0a0a0a] border-[#1f1f1f]' : 'bg-white border-[#e0e0e0]'
              }`}>
                <svg className={`w-8 h-8 ${isDark ? 'text-[#cc2222]/30' : 'text-[#b91c1c]/30'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="7" height="7" rx="0" strokeWidth="1.2" />
                  <rect x="14" y="3" width="7" height="7" rx="0" strokeWidth="1.2" />
                  <rect x="3" y="14" width="7" height="7" rx="0" strokeWidth="1.2" />
                  <path d="M14 17.5h7M17.5 14v7" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center max-w-[280px]">
                <div className={`text-sm font-bold font-mono tracking-wider mb-2 ${isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'}`}>
                  {lang === 'CN' ? '节点式 AI 创作工作流' : 'Node-based AI Workflow'}
                </div>
                <div className="text-[11px] font-mono leading-relaxed">
                  {lang === 'CN'
                    ? '点击左侧节点面板创建节点，拖线连接端口，点击运行执行'
                    : 'Click left panel to add nodes. Connect ports. Click RUN.'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====== 相机模块面板 ====== */}
      {showCameraPanel && (
        <div className={`absolute top-14 left-4 z-50 w-[280px] border ${
          isDark ? 'bg-[#0a0a0a] border-[#1f1f1f]' : 'bg-white border-[#e0e0e0]'
        }`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${
            isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'
          }`}>
            <span className={`text-[9px] font-mono font-bold tracking-[0.15em] ${
              isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
            }`}>CAMERA MODULE</span>
            <button
              onClick={() => setShowCameraPanel(false)}
              className={`text-[14px] leading-none ${isDark ? 'text-[#555] hover:text-white' : 'text-[#999] hover:text-black'}`}
            >×</button>
          </div>
          <div className="p-3 space-y-3" onMouseDown={(e) => e.stopPropagation()}>
            {/* 启用开关 */}
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono ${isDark ? 'text-[#aaa]' : 'text-[#555]'}`}>底层提示词注入</span>
              <button
                onClick={() => setCameraSettings((s) => ({ ...s, enabled: !s.enabled }))}
                className={`w-10 h-5 rounded-full relative transition-colors ${
                  cameraSettings.enabled
                    ? isDark ? 'bg-[#cc2222]' : 'bg-[#dc2626]'
                    : isDark ? 'bg-[#222]' : 'bg-[#ddd]'
                }`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                  cameraSettings.enabled ? 'left-[22px]' : 'left-0.5'
                }`} />
              </button>
            </div>

            {/* 焦距 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-mono ${isDark ? 'text-[#666]' : 'text-[#999]'}`}>焦距 FOCAL</span>
                <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#ff4444]' : 'text-[#dc2626]'}`}>{cameraSettings.focalLength}mm</span>
              </div>
              <input
                type="range" min="14" max="200" step="1"
                value={cameraSettings.focalLength}
                onChange={(e) => setCameraSettings((s) => ({ ...s, focalLength: Number(e.target.value) }))}
                className="w-full h-1 appearance-none bg-[#222] rounded cursor-pointer accent-[#cc2222]"
              />
              <div className={`flex justify-between text-[8px] font-mono mt-0.5 ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}>
                <span>14</span><span>50</span><span>100</span><span>200</span>
              </div>
            </div>

            {/* 光圈 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-mono ${isDark ? 'text-[#666]' : 'text-[#999]'}`}>光圈 APERTURE</span>
                <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#ff4444]' : 'text-[#dc2626]'}`}>f/{cameraSettings.aperture}</span>
              </div>
              <input
                type="range" min="1" max="16" step="0.1"
                value={cameraSettings.aperture}
                onChange={(e) => setCameraSettings((s) => ({ ...s, aperture: Number(e.target.value) }))}
                className="w-full h-1 appearance-none bg-[#222] rounded cursor-pointer accent-[#cc2222]"
              />
              <div className={`flex justify-between text-[8px] font-mono mt-0.5 ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}>
                <span>f/1</span><span>f/4</span><span>f/8</span><span>f/16</span>
              </div>
            </div>

            {/* ISO */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[9px] font-mono ${isDark ? 'text-[#666]' : 'text-[#999]'}`}>感光度 ISO</span>
                <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#ff4444]' : 'text-[#dc2626]'}`}>{cameraSettings.iso}</span>
              </div>
              <input
                type="range" min="100" max="12800" step="100"
                value={cameraSettings.iso}
                onChange={(e) => setCameraSettings((s) => ({ ...s, iso: Number(e.target.value) }))}
                className="w-full h-1 appearance-none bg-[#222] rounded cursor-pointer accent-[#cc2222]"
              />
              <div className={`flex justify-between text-[8px] font-mono mt-0.5 ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}>
                <span>100</span><span>800</span><span>3200</span><span>12800</span>
              </div>
            </div>

            {/* 镜头类型 */}
            <div>
              <span className={`text-[9px] font-mono block mb-1.5 ${isDark ? 'text-[#666]' : 'text-[#999]'}`}>镜头 LENS</span>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { id: 'STANDARD', label: '标准' },
                  { id: 'MACRO', label: '微距' },
                  { id: 'PROBE', label: '探针' },
                  { id: 'STORYBOARD', label: '分镜' },
                ] as const).map((lens) => (
                  <button
                    key={lens.id}
                    onClick={() => setCameraSettings((s) => ({ ...s, lensType: lens.id }))}
                    className={`py-1.5 text-[9px] font-mono font-bold transition-colors ${
                      cameraSettings.lensType === lens.id
                        ? isDark ? 'bg-[#330000] text-[#ff4444] border border-[#550000]' : 'bg-[#fee2e2] text-[#dc2626] border border-[#fca5a5]'
                        : isDark ? 'bg-[#111] text-[#888] border border-[#1f1f1f] hover:text-[#ff4444]' : 'bg-[#f9f9f9] text-[#666] border border-[#e0e0e0] hover:text-[#dc2626]'
                    }`}
                  >
                    {lens.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 状态指示 */}
            {cameraSettings.enabled && (
              <div className={`text-[9px] font-mono px-2 py-1.5 border ${
                isDark ? 'bg-[#0f0505] border-[#331111] text-[#aa4444]' : 'bg-[#fff8f8] border-[#fecaca] text-[#7f1d1d]'
              }`}>
                已激活 · {cameraSettings.focalLength}mm · f/{cameraSettings.aperture} · ISO{cameraSettings.iso} · {cameraSettings.lensType}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====== 自定义全局锁定提示词面板 ====== */}
      {showGlobalPrompt && (
        <div className={`absolute top-14 right-4 z-50 w-[320px] border ${
          isDark ? 'bg-[#0a0a0a] border-[#1f1f1f]' : 'bg-white border-[#e0e0e0]'
        }`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${
            isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'
          }`}>
            <span className={`text-[9px] font-mono font-bold tracking-[0.15em] ${
              isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
            }`}>自定义锁定提示词</span>
            <button
              onClick={() => setShowGlobalPrompt(false)}
              className={`text-[14px] leading-none ${isDark ? 'text-[#555] hover:text-white' : 'text-[#999] hover:text-black'}`}
            >×</button>
          </div>
          <div className="p-3">
            <textarea
              value={globalPromptDraft}
              onChange={(e) => setGlobalPromptDraft(e.target.value)}
              placeholder="输入自定义全局提示词，锁定后所有生成节点将附加此内容..."
              rows={5}
              className={`w-full px-3 py-2 text-[10px] font-mono resize-none outline-none border ${
                isDark ? 'bg-[#111] border-[#222] text-[#ccc] placeholder:text-[#444]' : 'bg-white border-[#ddd] text-[#333] placeholder:text-[#bbb]'
              }`}
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => {
                  if (globalPromptDraft.trim()) {
                    setFilmSystemPrompt(globalPromptDraft.trim());
                    setFilmSystemLocked(true);
                    setShowGlobalPrompt(false);
                  }
                }}
                disabled={!globalPromptDraft.trim()}
                className={`px-4 py-1.5 text-[10px] font-mono font-bold border transition-colors ${
                  globalPromptDraft.trim()
                    ? isDark ? 'bg-[#1a0808] border-[#331111] text-[#cc2222] hover:bg-[#220e0e]' : 'bg-[#fff5f5] border-[#fecaca] text-[#b91c1c] hover:bg-[#fee2e2]'
                    : isDark ? 'bg-[#111] border-[#222] text-[#444] cursor-not-allowed' : 'bg-[#f5f5f5] border-[#ddd] text-[#bbb] cursor-not-allowed'
                }`}
              >
                🔒 锁定
              </button>
              {filmSystemLocked && (
                <button
                  onClick={() => {
                    setFilmSystemLocked(false);
                    setFilmSystemPrompt('');
                    setGlobalPromptDraft('');
                    setShowGlobalPrompt(false);
                  }}
                  className={`px-3 py-1.5 text-[10px] font-mono transition-colors ${
                    isDark ? 'text-[#666] hover:text-[#ff4444]' : 'text-[#999] hover:text-[#dc2626]'
                  }`}
                >
                  解锁清除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== Film System — 直接跳转胶片系统页面 ====== */}
      {showFilmSystem && (
        <div className="absolute inset-0 z-[100]">
          <FilmSystem
            onClose={() => setShowFilmSystem(false)}
            onApplyPrompt={(prompt) => {
              setFilmSystemPrompt(prompt);
              setShowFilmSystem(false);
            }}
            onLockStyle={(prompt) => {
              setFilmSystemPrompt(prompt);
              setFilmSystemLocked(true);
              setShowFilmSystem(false);
            }}
            currentPrompt={filmSystemPrompt}
          />
        </div>
      )}

      {/* ====== 3D 导演台 — 全屏浮层 ====== */}
      {showDirector3D && (
        <div className="absolute inset-0 z-[100]">
          <Director3DWindow
            onBack={() => setShowDirector3D(false)}
            onCapture={handleDirectorCapture}
            isDark={isDark}
          />
        </div>
      )}
      {filmSystemLocked && !showFilmSystem && (
        <div
          className={`absolute top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-1.5 cursor-pointer border ${
            isDark ? 'bg-[#0a0000]/90 border-[#331111] text-[#ff4444]' : 'bg-[#fff5f5]/90 border-[#fecaca] text-[#dc2626]'
          }`}
          onClick={() => setShowFilmSystem(true)}
        >
          <span className="text-[10px]">🔒</span>
          <span className="text-[9px] font-mono font-bold tracking-wider">FILM SYSTEM</span>
          <span className={`text-[9px] font-mono max-w-[200px] truncate ${isDark ? 'text-[#aa4444]' : 'text-[#b91c1c]'}`}>
            {filmSystemPrompt.slice(0, 30)}{filmSystemPrompt.length > 30 ? '...' : ''}
          </span>
        </div>
      )}

      {/* API 设置弹窗 */}
      {showApiModal && (
        <ApiSettingsModal onClose={() => setShowApiModal(false)} />
      )}

      {/* AI Chat 窗口 */}
      {chatMounted && (
        <div style={{ display: showChat ? 'block' : 'none' }}>
          <ChatWindow
            onClose={() => setShowChat(false)}
            onLockPrompt={(content) => {
              setFilmSystemPrompt(content);
              setFilmSystemLocked(true);
            }}
          />
        </div>
      )}

      {/* 剪辑线模式 */}
      {showTimeline && (
        <CanvasTimeline
          isDark={isDark}
          nodes={nodes}
          onClose={() => setShowTimeline(false)}
        />
      )}

      {/* 全局图片灯箱预览 */}
      {lightboxImg && (
        <div
          className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/90 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="preview" className="max-w-[90%] max-h-[90%] object-contain" />
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-xl font-mono"
          >×</button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const a = document.createElement('a');
              a.href = lightboxImg;
              a.download = `canvas-image-${Date.now()}.png`;
              a.click();
            }}
            className="absolute bottom-4 right-4 px-3 py-1.5 text-[10px] font-mono bg-white/10 text-white hover:bg-white/20 border border-white/20"
          >
            下载
          </button>
        </div>
      )}

    </div>
  );
};
