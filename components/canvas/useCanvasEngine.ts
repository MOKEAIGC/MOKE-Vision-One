// 文件路径: components/canvas/useCanvasEngine.ts
// 无限画布核心引擎 hook — 平移、缩放、网格、撤销/重做

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CanvasViewport, CanvasNode, CanvasConnection } from './types';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const ZOOM_FACTOR = 0.08;
const MAX_UNDO = 30;

interface HistorySnapshot {
  nodes: CanvasNode[];
  connections: CanvasConnection[];
}

interface UseCanvasEngineOptions {
  initialViewport?: CanvasViewport;
  onViewportChange?: (viewport: CanvasViewport) => void;
}

export function useCanvasEngine(options?: UseCanvasEngineOptions) {
  const [viewport, setViewport] = useState<CanvasViewport>(
    options?.initialViewport || { x: 0, y: 0, scale: 1 }
  );
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(viewport);

  // 撤销/重做栈
  const undoStackRef = useRef<HistorySnapshot[]>([]);
  const redoStackRef = useRef<HistorySnapshot[]>([]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const updateViewport = useCallback((next: CanvasViewport) => {
    setViewport(next);
    options?.onViewportChange?.(next);
  }, [options?.onViewportChange]);

  // 滚轮缩放（以鼠标位置为中心）
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { scale, x, y } = viewportRef.current;
    const direction = e.deltaY < 0 ? 1 : -1;
    const factor = 1 + ZOOM_FACTOR * direction;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));

    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const newX = mx - (mx - x) * (newScale / scale);
    const newY = my - (my - y) * (newScale / scale);

    updateViewport({ x: newX, y: newY, scale: newScale });
  }, [updateViewport]);

  // 平移开始 — 由上层调用决定触发时机
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - viewportRef.current.x, y: e.clientY - viewportRef.current.y };
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const newX = e.clientX - panStartRef.current.x;
    const newY = e.clientY - panStartRef.current.y;
    updateViewport({ ...viewportRef.current, x: newX, y: newY });
  }, [isPanning, updateViewport]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  // 坐标转换
  const screenToCanvas = useCallback((screenX: number, screenY: number, containerRect: DOMRect) => {
    const v = viewportRef.current;
    return {
      x: (screenX - containerRect.left - v.x) / v.scale,
      y: (screenY - containerRect.top - v.y) / v.scale,
    };
  }, []);

  const canvasToScreen = useCallback((canvasX: number, canvasY: number, containerRect: DOMRect) => {
    const v = viewportRef.current;
    return {
      x: canvasX * v.scale + v.x + containerRect.left,
      y: canvasY * v.scale + v.y + containerRect.top,
    };
  }, []);

  // 适应画布到视图
  const fitToView = useCallback((containerRect: DOMRect, bounds: { minX: number; minY: number; maxX: number; maxY: number }) => {
    const w = bounds.maxX - bounds.minX + 200;
    const h = bounds.maxY - bounds.minY + 200;
    const scaleX = containerRect.width / w;
    const scaleY = containerRect.height / h;
    const scale = Math.min(scaleX, scaleY, 1.5);
    const x = (containerRect.width - w * scale) / 2 - bounds.minX * scale + 100 * scale;
    const y = (containerRect.height - h * scale) / 2 - bounds.minY * scale + 100 * scale;
    updateViewport({ x, y, scale });
  }, [updateViewport]);

  const resetView = useCallback(() => {
    updateViewport({ x: 0, y: 0, scale: 1 });
  }, [updateViewport]);

  // 撤销/重做
  const pushUndo = useCallback((snapshot: HistorySnapshot) => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(snapshot)));
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const undo = useCallback((current: HistorySnapshot): HistorySnapshot | null => {
    if (undoStackRef.current.length === 0) return null;
    redoStackRef.current.push(JSON.parse(JSON.stringify(current)));
    return undoStackRef.current.pop()!;
  }, []);

  const redo = useCallback((current: HistorySnapshot): HistorySnapshot | null => {
    if (redoStackRef.current.length === 0) return null;
    undoStackRef.current.push(JSON.parse(JSON.stringify(current)));
    return redoStackRef.current.pop()!;
  }, []);

  const canUndo = useCallback(() => undoStackRef.current.length > 0, []);
  const canRedo = useCallback(() => redoStackRef.current.length > 0, []);

  return {
    viewport,
    setViewport: updateViewport,
    isPanning,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    screenToCanvas,
    canvasToScreen,
    fitToView,
    resetView,
    pushUndo,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
