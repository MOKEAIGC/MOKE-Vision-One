// 文件路径: components/hooks/useResizable.ts
// 通用窗口缩放 hook — 通过右下角/边缘手柄拖拽改变容器尺寸
// 支持：宽度 / 高度 / 同时；边界约束；可选 localStorage 持久化
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseResizableOptions {
  /** 初始尺寸 */
  initial: { width: number; height: number };
  /** 最小尺寸 */
  min?: { width: number; height: number };
  /** 最大尺寸（默认视口尺寸） */
  max?: { width: number; height: number };
  /** 存储键（启用后尺寸持久化） */
  storageKey?: string;
}

export interface ResizableState {
  size: { width: number; height: number };
  resizing: boolean;
  /** 右下角手柄绑定 props（拖拽同时调整宽高） */
  cornerHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
  /** 重置到初始值 */
  reset: () => void;
  /** 直接设置尺寸 */
  setSize: (s: { width: number; height: number }) => void;
}

export const useResizable = ({
  initial,
  min = { width: 320, height: 280 },
  max,
  storageKey,
}: UseResizableOptions): ResizableState => {
  const initFromStorage = (): { width: number; height: number } => {
    if (!storageKey) return initial;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.width === 'number' && typeof s.height === 'number') return s;
      }
    } catch {}
    return initial;
  };

  const [size, setSizeState] = useState(initFromStorage);
  const [resizing, setResizing] = useState(false);
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const clamp = useCallback((s: { width: number; height: number }) => {
    const maxW = max?.width ?? window.innerWidth - 40;
    const maxH = max?.height ?? window.innerHeight - 120;
    return {
      width: Math.max(min.width, Math.min(maxW, s.width)),
      height: Math.max(min.height, Math.min(maxH, s.height)),
    };
  }, [min.width, min.height, max?.width, max?.height]);

  // 持久化
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(size));
    } catch {}
  }, [size, storageKey]);

  // 监听全局 mousemove / mouseup
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const s = startRef.current;
      if (!s) return;
      const nw = s.w + (e.clientX - s.x);
      const nh = s.h + (e.clientY - s.y);
      setSizeState(clamp({ width: nw, height: nh }));
    };
    const onUp = () => {
      setResizing(false);
      startRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing, clamp]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height,
    };
    setResizing(true);
  }, [size]);

  const reset = useCallback(() => {
    setSizeState(initial);
  }, [initial]);

  const setSize = useCallback((s: { width: number; height: number }) => {
    setSizeState(clamp(s));
  }, [clamp]);

  return {
    size,
    resizing,
    cornerHandleProps: {
      onMouseDown,
      style: { cursor: 'nwse-resize' },
    },
    reset,
    setSize,
  };
};
