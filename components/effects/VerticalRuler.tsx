// 文件路径: components/effects/VerticalRuler.tsx
// 工业时尚：屏幕左侧垂直刻度尺装饰
// 随视口高度自适应，工业仪表风格的刻度 tick + 数字标号

import React, { useEffect, useState } from 'react';

interface VerticalRulerProps {
  isDark?: boolean;
  /** 吸附在屏幕哪一侧 */
  side?: 'left' | 'right';
  /** 与屏幕边缘的距离（px） */
  offset?: number;
  /** 顶部偏移（px） */
  top?: number;
  /** 底部偏移（px） */
  bottom?: number;
  /** 主刻度间距（px，每多少像素一个大刻度） */
  majorStep?: number;
  /** 子刻度分段数 */
  minorDivisions?: number;
  /** z-index */
  zIndex?: number;
}

export const VerticalRuler: React.FC<VerticalRulerProps> = ({
  isDark = true,
  side = 'left',
  offset = 6,
  top = 80,
  bottom = 60,
  majorStep = 100,
  minorDivisions = 5,
  zIndex = 15,
}) => {
  const [height, setHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight - top - bottom : 600,
  );

  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight - top - bottom);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [top, bottom]);

  const tickColor = isDark ? 'rgba(200,200,210,0.35)' : 'rgba(60,60,70,0.35)';
  const tickDim = isDark ? 'rgba(180,180,190,0.18)' : 'rgba(80,80,90,0.18)';
  const labelColor = isDark ? 'rgba(180,180,190,0.55)' : 'rgba(60,60,70,0.55)';
  const red = 'rgba(208, 0, 0, 0.8)';

  const majorCount = Math.max(0, Math.floor(height / majorStep));

  // 构建刻度列表
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= majorCount; i++) {
    const y = i * majorStep;
    const isRed = i % 5 === 0; // 每 5 个主刻度一次红色
    ticks.push(
      <div
        key={`major-${i}`}
        style={{
          position: 'absolute',
          top: y,
          [side]: 0,
          width: 10,
          height: 1,
          background: isRed ? red : tickColor,
        }}
      />,
    );
    // 标号
    ticks.push(
      <span
        key={`label-${i}`}
        style={{
          position: 'absolute',
          top: y - 5,
          [side]: 14,
          fontSize: 8,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          letterSpacing: '0.1em',
          color: isRed ? red : labelColor,
          pointerEvents: 'none',
        }}
      >
        {String(i * majorStep).padStart(4, '0')}
      </span>,
    );
    // 子刻度
    if (i < majorCount) {
      for (let j = 1; j < minorDivisions; j++) {
        const sy = y + (j * majorStep) / minorDivisions;
        ticks.push(
          <div
            key={`minor-${i}-${j}`}
            style={{
              position: 'absolute',
              top: sy,
              [side]: 0,
              width: 4,
              height: 1,
              background: tickDim,
            }}
          />,
        );
      }
    }
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none hidden md:block"
      style={{
        position: 'fixed',
        top,
        [side]: offset,
        width: 46,
        height,
        zIndex,
      }}
    >
      {/* 竖直基线 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          [side]: 0,
          width: 1,
          height: '100%',
          background: tickDim,
        }}
      />
      {ticks}
    </div>
  );
};

export default VerticalRuler;
