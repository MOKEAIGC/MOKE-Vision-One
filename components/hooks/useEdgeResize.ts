// 文件路径: components/hooks/useEdgeResize.ts
// 功能说明: 通用多边缘拖拽缩放 Hook（自包含独立模块）
// -------------------------------------------------------------------
// 相比已有 useResizable（仅支持右下角），本 hook 提供:
//   - 独立的 4 边 + 4 角 共 8 个方向拖拽手柄
//   - 每个手柄返回独立的 handleProps，可单独挂在任意 DOM 元素上
//   - 统一的 min/max + viewport 边界检查
//   - 可选 localStorage 持久化
//   - 实时更新尺寸，通过 CSS 属性（width/height）同步布局
// -------------------------------------------------------------------
// 使用示例:
//   const { size, resizing, handles, reset } = useEdgeResize({
//     initial: { width: 440, height: 600 },
//     min: { width: 320, height: 400 },
//     enabled: ['right', 'bottom', 'se'],
//     storageKey: 'my_panel_size',
//   });
//   <div style={{ width: size.width, height: size.height }}>
//     <Handle {...handles.right} />
//     <Handle {...handles.bottom} />
//     <Handle {...handles.se} />
//   </div>
// -------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';

/** 支持的拖拽方向 */
export type ResizeDirection =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'ne' // 右上角
  | 'nw' // 左上角
  | 'se' // 右下角
  | 'sw'; // 左下角

export interface UseEdgeResizeOptions {
  /** 初始尺寸 */
  initial: { width: number; height: number };
  /** 最小尺寸 */
  min?: { width: number; height: number };
  /**
   * 最大尺寸
   * - 传 number 值：固定限制
   * - 不传：默认 viewport - 40px 的安全边距
   */
  max?: { width: number; height: number };
  /** localStorage 持久化键（启用后刷新保留尺寸） */
  storageKey?: string;
  /**
   * 启用哪些方向的手柄
   * 默认：['right', 'bottom', 'se']（最常用的三个方向）
   */
  enabled?: ResizeDirection[];
  /** 每次尺寸变化回调（用于同步外部状态，可选） */
  onResize?: (size: { width: number; height: number }) => void;
}

/** 单个手柄的绑定 props（由 hook 生成，使用者绑到 DOM 上即可） */
export interface EdgeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  style: React.CSSProperties;
  'data-resize-dir': ResizeDirection;
}

export interface EdgeResizeState {
  /** 当前尺寸 */
  size: { width: number; height: number };
  /** 当前是否处于拖拽中 */
  resizing: boolean;
  /** 当前拖拽方向（resizing=true 时有效） */
  direction: ResizeDirection | null;
  /** 各方向的 handle props（仅 enabled 列表内的方向有值） */
  handles: Partial<Record<ResizeDirection, EdgeHandleProps>>;
  /** 重置到 initial */
  reset: () => void;
  /** 直接设置（带 clamp） */
  setSize: (s: { width: number; height: number }) => void;
}

const DEFAULT_ENABLED: ResizeDirection[] = ['right', 'bottom', 'se'];

/** 根据方向决定 cursor 样式 */
function cursorFor(dir: ResizeDirection): string {
  switch (dir) {
    case 'left':
    case 'right':
      return 'ew-resize';
    case 'top':
    case 'bottom':
      return 'ns-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'nw':
    case 'se':
      return 'nwse-resize';
  }
}

/**
 * 通用多边缘拖拽缩放 Hook
 */
export function useEdgeResize(options: UseEdgeResizeOptions): EdgeResizeState {
  const {
    initial,
    min = { width: 280, height: 240 },
    max,
    storageKey,
    enabled = DEFAULT_ENABLED,
    onResize,
  } = options;

  // ----------- 初始值读取（支持 localStorage 持久化） -----------
  const initFromStorage = (): { width: number; height: number } => {
    if (!storageKey) return initial;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.width === 'number' && typeof s.height === 'number') {
          return s;
        }
      }
    } catch {
      /* 静默失败 */
    }
    return initial;
  };

  const [size, setSizeState] = useState<{ width: number; height: number }>(initFromStorage);
  const [direction, setDirection] = useState<ResizeDirection | null>(null);
  const startRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
    dir: ResizeDirection;
  } | null>(null);

  // ----------- 边界检查 -----------
  const clamp = useCallback(
    (s: { width: number; height: number }): { width: number; height: number } => {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
      const maxW = max?.width ?? vw - 40;
      const maxH = max?.height ?? vh - 80;
      return {
        width: Math.round(Math.max(min.width, Math.min(maxW, s.width))),
        height: Math.round(Math.max(min.height, Math.min(maxH, s.height))),
      };
    },
    [max?.width, max?.height, min.width, min.height],
  );

  // ----------- 持久化 -----------
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(size));
    } catch {
      /* 静默失败 */
    }
  }, [size, storageKey]);

  // ----------- 外部变化回调 -----------
  useEffect(() => {
    if (onResize) {
      try {
        onResize(size);
      } catch (err) {
        console.error('[useEdgeResize] onResize callback error:', err);
      }
    }
  }, [size, onResize]);

  // ----------- viewport resize 时自动 clamp（防止窗口变小后面板溢出） -----------
  useEffect(() => {
    const onWinResize = () => {
      setSizeState((prev) => clamp(prev));
    };
    window.addEventListener('resize', onWinResize);
    return () => window.removeEventListener('resize', onWinResize);
  }, [clamp]);

  // ----------- 全局 mousemove / mouseup 监听（仅在 resizing 时挂载） -----------
  useEffect(() => {
    if (!direction) return;

    const computeNext = (clientX: number, clientY: number) => {
      const s = startRef.current;
      if (!s) return;
      const dx = clientX - s.x;
      const dy = clientY - s.y;
      let nw = s.w;
      let nh = s.h;

      // 根据方向分别计算增量
      const d = s.dir;
      // 横向：right/ne/se 增加，left/nw/sw 减少（对称增长）
      if (d === 'right' || d === 'ne' || d === 'se') {
        nw = s.w + dx;
      } else if (d === 'left' || d === 'nw' || d === 'sw') {
        nw = s.w - dx;
      }
      // 纵向：bottom/se/sw 增加，top/ne/nw 减少
      if (d === 'bottom' || d === 'se' || d === 'sw') {
        nh = s.h + dy;
      } else if (d === 'top' || d === 'ne' || d === 'nw') {
        nh = s.h - dy;
      }

      setSizeState(clamp({ width: nw, height: nh }));
    };

    const onMouseMove = (e: MouseEvent) => {
      computeNext(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const t = e.touches[0];
      computeNext(t.clientX, t.clientY);
    };
    const onUp = () => {
      setDirection(null);
      startRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);

    // 拖拽期间全局 cursor + 禁止文本选择（避免误选）
    document.body.style.cursor = cursorFor(direction);
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [direction, clamp]);

  // ----------- 启动拖拽（按下手柄时调用） -----------
  const startDrag = useCallback(
    (dir: ResizeDirection, clientX: number, clientY: number) => {
      startRef.current = {
        x: clientX,
        y: clientY,
        w: size.width,
        h: size.height,
        dir,
      };
      setDirection(dir);
    },
    [size.width, size.height],
  );

  const makeHandleProps = useCallback(
    (dir: ResizeDirection): EdgeHandleProps => ({
      'data-resize-dir': dir,
      style: { cursor: cursorFor(dir), touchAction: 'none' },
      onMouseDown: (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        startDrag(dir, e.clientX, e.clientY);
      },
      onTouchStart: (e: React.TouchEvent) => {
        if (e.touches.length === 0) return;
        e.stopPropagation();
        const t = e.touches[0];
        startDrag(dir, t.clientX, t.clientY);
      },
    }),
    [startDrag],
  );

  // ----------- 按 enabled 列表生成各方向的 handles -----------
  const handles = useCallback((): Partial<Record<ResizeDirection, EdgeHandleProps>> => {
    const result: Partial<Record<ResizeDirection, EdgeHandleProps>> = {};
    enabled.forEach((dir) => {
      result[dir] = makeHandleProps(dir);
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makeHandleProps, JSON.stringify(enabled)]);

  const reset = useCallback(() => {
    setSizeState(clamp(initial));
  }, [initial, clamp]);

  const setSize = useCallback(
    (s: { width: number; height: number }) => {
      setSizeState(clamp(s));
    },
    [clamp],
  );

  return {
    size,
    resizing: direction !== null,
    direction,
    handles: handles(),
    reset,
    setSize,
  };
}
