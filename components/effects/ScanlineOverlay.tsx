// 文件路径: components/effects/ScanlineOverlay.tsx
// 工业时尚：极微弱的水平扫描线 + 暗角（CRT 质感）
// 完全装饰层，pointer-events-none，不影响任何交互

import React from 'react';

interface ScanlineOverlayProps {
  isDark?: boolean;
  /** 扫描线整体透明度 */
  opacity?: number;
  /** 是否启用暗角（vignette） */
  vignette?: boolean;
  /** z-index */
  zIndex?: number;
}

export const ScanlineOverlay: React.FC<ScanlineOverlayProps> = ({
  isDark = true,
  opacity = 0.035,
  vignette = true,
  zIndex = 10,
}) => {
  // 扫描线：一层渐变重复背景
  const lineColor = isDark ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)';

  return (
    <>
      {/* 扫描线 */}
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex,
          opacity,
          backgroundImage: `repeating-linear-gradient(to bottom, ${lineColor} 0, ${lineColor} 1px, transparent 1px, transparent 3px)`,
          mixBlendMode: isDark ? 'overlay' : 'multiply',
        }}
      />
      {/* 暗角 */}
      {vignette && (
        <div
          aria-hidden="true"
          className="pointer-events-none"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: zIndex + 1,
            background: isDark
              ? 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)'
              : 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.08) 100%)',
          }}
        />
      )}
    </>
  );
};

export default ScanlineOverlay;
