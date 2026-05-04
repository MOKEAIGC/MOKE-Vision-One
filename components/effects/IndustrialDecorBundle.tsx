// 文件路径: components/effects/IndustrialDecorBundle.tsx
// 工业时尚装饰"套件总装"组件
// 聚合：CornerMarkers + VerticalRuler + SystemHUD + ScanlineOverlay
// 外部只需引入这一个组件即可获得完整工业时尚视觉增强
// 保持独立、自包含、零业务侵入

import React from 'react';
import { CornerMarkers } from './CornerMarkers';
import { VerticalRuler } from './VerticalRuler';
import { SystemHUD } from './SystemHUD';
import { ScanlineOverlay } from './ScanlineOverlay';

interface IndustrialDecorBundleProps {
  isDark?: boolean;
  /** 图像总数，用于 HUD 显示 */
  imageCount?: number;
  /** 当前模式标签，用于 HUD 显示 */
  modeLabel?: string;
  /** 是否启用扫描线（默认开启，可关闭以减弱视觉干扰） */
  enableScanline?: boolean;
  /** 是否启用垂直刻度尺（默认开启） */
  enableRuler?: boolean;
  /** 是否启用角标 */
  enableCorners?: boolean;
  /** 是否启用状态 HUD */
  enableHUD?: boolean;
}

export const IndustrialDecorBundle: React.FC<IndustrialDecorBundleProps> = ({
  isDark = true,
  imageCount,
  modeLabel,
  enableScanline = true,
  enableRuler = true,
  enableCorners = true,
  enableHUD = true,
}) => {
  // 防御性：任一层抛错不应影响主界面。React 组件本身出错会被外层 ErrorBoundary 捕获，
  // 此处不引入额外 boundary，避免与项目已有错误体系耦合。
  return (
    <>
      {enableScanline && <ScanlineOverlay isDark={isDark} zIndex={10} />}
      {enableCorners && <CornerMarkers isDark={isDark} zIndex={45} />}
      {enableRuler && <VerticalRuler isDark={isDark} side="left" offset={6} zIndex={15} />}
      {enableHUD && (
        <SystemHUD
          isDark={isDark}
          imageCount={imageCount}
          modeLabel={modeLabel}
          zIndex={45}
        />
      )}
    </>
  );
};

export default IndustrialDecorBundle;
