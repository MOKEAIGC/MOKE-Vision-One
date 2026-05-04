// 文件路径: components/ResizableHandle.tsx
// 功能说明: 边缘缩放手柄 - 可视化组件（自包含独立模块）
// -------------------------------------------------------------------
// 作用:
//   - 为窗口边缘提供 8 个方向的视觉拖拽条
//   - 与 useEdgeResize hook 配套使用
//   - 工业风样式：默认透明，悬停/拖拽时显示 moke-red 描边
//   - 可选文字提示（如"拖拽调整大小"）
// -------------------------------------------------------------------

import React from 'react';
import type { EdgeHandleProps, ResizeDirection } from './hooks/useEdgeResize';

interface ResizableHandleProps extends EdgeHandleProps {
  /** 拖拽方向（由 useEdgeResize 传入） */
  'data-resize-dir': ResizeDirection;
  /** 是否正在拖拽（用于切换高亮态） */
  active?: boolean;
  /** 自定义颜色（默认 moke-red） */
  color?: string;
  /** 边缘厚度（默认 6px，触控场景可调大） */
  thickness?: number;
  /** 额外 className */
  className?: string;
  /** 是否深色主题（影响默认 hover 态底色） */
  isDark?: boolean;
}

/**
 * 根据方向生成定位 className（绝对定位，基于父容器 relative）
 */
function layoutClassFor(dir: ResizeDirection, thickness: number): string {
  const t = thickness;
  const corner = t * 2.4; // 角上放得更大一点，好抓
  switch (dir) {
    case 'top':
      return `absolute top-0 left-0 right-0 z-[100]`;
    case 'bottom':
      return `absolute bottom-0 left-0 right-0 z-[100]`;
    case 'left':
      return `absolute left-0 top-0 bottom-0 z-[100]`;
    case 'right':
      return `absolute right-0 top-0 bottom-0 z-[100]`;
    case 'nw':
    case 'ne':
    case 'sw':
    case 'se':
      return `absolute z-[110]`;
  }
}

function sizeStyleFor(dir: ResizeDirection, thickness: number): React.CSSProperties {
  const t = thickness;
  const corner = Math.max(t * 2.4, 14);
  switch (dir) {
    case 'top':
    case 'bottom':
      return { height: t };
    case 'left':
    case 'right':
      return { width: t };
    case 'nw':
      return { left: 0, top: 0, width: corner, height: corner };
    case 'ne':
      return { right: 0, top: 0, width: corner, height: corner };
    case 'sw':
      return { left: 0, bottom: 0, width: corner, height: corner };
    case 'se':
      return { right: 0, bottom: 0, width: corner, height: corner };
  }
}

/**
 * 可视化缩放手柄
 * - 默认透明，悬停时浮现红色指示
 * - 拖拽中（active=true）持续红色高亮
 */
export const ResizableHandle: React.FC<ResizableHandleProps> = ({
  onMouseDown,
  onTouchStart,
  style,
  'data-resize-dir': dir,
  active = false,
  color = '#D00000',
  thickness = 6,
  className = '',
  isDark = true,
}) => {
  const layoutCls = layoutClassFor(dir, thickness);
  const sizeStyle = sizeStyleFor(dir, thickness);
  const isCorner = ['nw', 'ne', 'sw', 'se'].includes(dir);

  return (
    <div
      data-resize-dir={dir}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`group ${layoutCls} ${className}`}
      style={{
        ...style,
        ...sizeStyle,
      }}
      aria-label={`拖拽调整大小 (${dir})`}
      role="separator"
    >
      {/* 默认态：完全透明的感应区 */}
      {/* 悬停态：浅色半透明填充 */}
      <div
        className={`absolute inset-0 transition-all duration-200 ${
          active
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-70'
        }`}
        style={{
          backgroundColor: isCorner ? 'transparent' : `${color}33`, // 20% 透明度
          boxShadow: active ? `0 0 12px ${color}80` : 'none',
        }}
      />
      {/* 角部指示：两条交叉小线 */}
      {isCorner && (
        <div
          className={`absolute inset-1 transition-all duration-200 ${
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-80'
          }`}
        >
          <svg
            className="w-full h-full"
            viewBox="0 0 16 16"
            fill="none"
            style={{ color }}
          >
            {dir === 'se' && (
              <>
                <line x1="3" y1="15" x2="15" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="15" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              </>
            )}
            {dir === 'sw' && (
              <>
                <line x1="13" y1="15" x2="1" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="15" x2="1" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              </>
            )}
            {dir === 'ne' && (
              <>
                <line x1="3" y1="1" x2="15" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="1" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              </>
            )}
            {dir === 'nw' && (
              <>
                <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="8" y1="1" x2="1" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
              </>
            )}
          </svg>
        </div>
      )}
    </div>
  );
};

export default ResizableHandle;
