// 文件路径: components/hooks/useDraggable.ts
// 通用窗口拖拽 hook — 指定 handle 元素，整个窗口跟随鼠标
// 边界：自动约束在视口内，不会拖出屏幕
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDraggableOptions {
  /** 初始位置（top/right/bottom/left 任意一对） */
  initial?: { x: number; y: number };
  /** 窗口尺寸（用于边界约束） */
  size?: { width: number; height: number };
  /** 存储键（启用后位置持久化到 localStorage） */
  storageKey?: string;
}

export interface DraggableState {
  /** 当前偏移位置 */
  position: { x: number; y: number };
  /** 是否正在拖拽 */
  dragging: boolean;
  /** 拖拽 handle 的绑定 props */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
  /** 重置到初始位置 */
  reset: () => void;
}

/**
 * 窗口可拖拽 hook
 * 用法：把 handleProps 挂到拖拽把手元素（例如窗口顶部栏）
 * 窗口本体用 style.transform: translate(x, y) 跟随位置
 */
export const useDraggable = ({
  initial = { x: 0, y: 0 },
  size = { width: 520, height: 500 },
  storageKey,
}: UseDraggableOptions = {}): DraggableState => {
  // 从 localStorage 读取
  const initFromStorage = (): { x: number; y: number } => {
    if (!storageKey) return initial;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const pos = JSON.parse(raw);
        if (typeof pos.x === 'number' && typeof pos.y === 'number') return pos;
      }
    } catch {}
    return initial;
  };

  const [position, setPosition] = useState(initFromStorage);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; posX: number; posY: number } | null>(null);

  // 约束到视口内
  const clamp = useCallback((pos: { x: number; y: number }) => {
    const margin = 20; // 至少保留 20px 在视口内
    const maxX = window.innerWidth - margin;
    const minX = margin - size.width;
    const maxY = window.innerHeight - margin - 80; // 底部保留点空间
    const minY = 0;
    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y)),
    };
  }, [size.width]);

  // 持久化
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {}
  }, [position, storageKey]);

  // 全局 mousemove / mouseup
  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const nx = start.posX + (e.clientX - start.mouseX);
      const ny = start.posY + (e.clientY - start.mouseY);
      setPosition(clamp({ x: nx, y: ny }));
    };

    const onUp = () => {
      setDragging(false);
      dragStartRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, clamp]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // 左键才触发
    if (e.button !== 0) return;
    // 如果点击的是按钮/输入等交互元素，不触发拖拽
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, [data-no-drag]')) return;

    e.preventDefault();
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    setDragging(true);
  }, [position]);

  const reset = useCallback(() => {
    setPosition(initial);
  }, [initial]);

  return {
    position,
    dragging,
    handleProps: {
      onMouseDown,
      style: { cursor: 'grab' },
    },
    reset,
  };
};
