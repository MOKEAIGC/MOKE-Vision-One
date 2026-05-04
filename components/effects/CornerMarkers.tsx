// 文件路径: components/effects/CornerMarkers.tsx
// 工业时尚：屏幕四角技术刻度装饰
// 独立自包含，绝不干扰 UI 交互（pointer-events-none）

import React from 'react';

interface CornerMarkersProps {
  isDark?: boolean;
  /** 刻度颜色，默认品牌红 */
  color?: string;
  /** 角标尺寸（px） */
  size?: number;
  /** 距屏幕边缘距离（px） */
  inset?: number;
  /** z-index 层级 */
  zIndex?: number;
}

/** 单个角标组件：两条垂直线 + 内标号 */
const Corner: React.FC<{
  position: 'tl' | 'tr' | 'bl' | 'br';
  label: string;
  size: number;
  inset: number;
  color: string;
  dim: string;
}> = ({ position, label, size, inset, color, dim }) => {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';

  const style: React.CSSProperties = {
    position: 'fixed',
    width: size,
    height: size,
    [isTop ? 'top' : 'bottom']: inset,
    [isLeft ? 'left' : 'right']: inset,
  };

  const hStyle: React.CSSProperties = {
    position: 'absolute',
    height: 1,
    width: size * 0.6,
    background: color,
    [isTop ? 'top' : 'bottom']: 0,
    [isLeft ? 'left' : 'right']: 0,
    opacity: 0.85,
  };
  const vStyle: React.CSSProperties = {
    position: 'absolute',
    width: 1,
    height: size * 0.6,
    background: color,
    [isTop ? 'top' : 'bottom']: 0,
    [isLeft ? 'left' : 'right']: 0,
    opacity: 0.85,
  };
  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    fontSize: 9,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    letterSpacing: '0.15em',
    color: dim,
    [isTop ? 'top' : 'bottom']: size * 0.55,
    [isLeft ? 'left' : 'right']: size * 0.55,
    whiteSpace: 'nowrap',
  };

  return (
    <div style={style} aria-hidden="true">
      <div style={hStyle} />
      <div style={vStyle} />
      <div style={labelStyle}>{label}</div>
    </div>
  );
};

export const CornerMarkers: React.FC<CornerMarkersProps> = ({
  isDark = true,
  color = 'rgba(208, 0, 0, 0.9)',
  size = 22,
  inset = 14,
  zIndex = 45,
}) => {
  const dim = isDark ? 'rgba(160,160,170,0.55)' : 'rgba(60,60,70,0.55)';

  return (
    <div
      className="pointer-events-none select-none"
      style={{ position: 'fixed', inset: 0, zIndex }}
      aria-hidden="true"
    >
      <Corner position="tl" label="Q-01" size={size} inset={inset} color={color} dim={dim} />
      <Corner position="tr" label="Q-02" size={size} inset={inset} color={color} dim={dim} />
      <Corner position="bl" label="Q-03" size={size} inset={inset} color={color} dim={dim} />
      <Corner position="br" label="Q-04" size={size} inset={inset} color={color} dim={dim} />
    </div>
  );
};

export default CornerMarkers;
