// 文件路径: components/hooks/useWheelResize.ts
// 滚轮调整尺寸的通用 hook — 用于任意容器的垂直缩放 + 交互高亮
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseWheelResizeOptions {
  /** 初始值 */
  initial: number;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 每次滚动步长 */
  step?: number;
  /** 高亮持续时间（ms），最后一次交互后多少毫秒移除高亮 */
  idleMs?: number;
}

export interface WheelResizeState {
  /** 当前尺寸值（介于 min 和 max 之间） */
  size: number;
  /** 当前是否处于激活态（悬停或刚滚过） */
  active: boolean;
  /** 是否正在滚动中 */
  isScrolling: boolean;
  /** 重置到初始值 */
  reset: () => void;
  /** 直接设置尺寸（自动 clamp，带交互高亮脉冲） */
  setSize: (v: number | ((prev: number) => number)) => void;
  /** 显式切换"正在交互"状态（供外部拖拽等操作脉冲高亮用） */
  pulseActive: () => void;
  /** 绑定到目标元素的事件处理器 */
  bindProps: {
    onWheel: (e: React.WheelEvent<HTMLElement>) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onDoubleClick: () => void;
  };
}

/**
 * 为任意容器提供"滚轮缩放 + 交互高亮"能力
 * - 鼠标悬停容器滚动滚轮 → 调整尺寸
 * - 悬停 / 滚动时 active=true（可用于切换高亮样式）
 * - 离开后 idleMs 毫秒后 active=false
 * - 双击重置到初始值
 */
export const useWheelResize = ({
  initial,
  min,
  max,
  step = 8,
  idleMs = 600,
}: UseWheelResizeOptions): WheelResizeState => {
  const [size, setSize] = useState<number>(initial);
  const [hover, setHover] = useState<boolean>(false);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimerRef = useRef<number | null>(null);

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLElement>) => {
      // 阻止页面整体滚动
      e.preventDefault();
      e.stopPropagation();

      // 向上滚 → 放大（size 增加）；向下滚 → 缩小
      const delta = e.deltaY < 0 ? step : -step;
      setSize(prev => clamp(prev + delta));

      // 激活滚动状态
      setIsScrolling(true);
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
      scrollTimerRef.current = window.setTimeout(() => {
        setIsScrolling(false);
        scrollTimerRef.current = null;
      }, idleMs);
    },
    [step, clamp, idleMs]
  );

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setSize(initial);
  }, [initial]);

  // 显式切换"正在交互"状态 —— 给外部（例如边缘拖拽）复用同一套高亮反馈
  const pulseActive = useCallback(() => {
    setIsScrolling(true);
    if (scrollTimerRef.current !== null) {
      window.clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = window.setTimeout(() => {
      setIsScrolling(false);
      scrollTimerRef.current = null;
    }, idleMs);
  }, [idleMs]);

  // 暴露带 clamp 的 setSize，让外部可在受控范围内直接设值
  const setSizeClamped = useCallback(
    (v: number | ((prev: number) => number)) => {
      setSize(prev => clamp(typeof v === 'function' ? (v as (p: number) => number)(prev) : v));
    },
    [clamp],
  );

  return {
    size,
    active: hover || isScrolling,
    isScrolling,
    reset,
    setSize: setSizeClamped,
    pulseActive,
    bindProps: {
      onWheel: handleWheel,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      onDoubleClick: reset,
    },
  };
};
