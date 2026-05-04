// 文件路径: components/VideoBackground.tsx
// 功能说明: 自包含视频背景组件
// - 自动播放、静音、循环、内联播放（全平台兼容：桌面 / 移动 / Electron）
// - 叠加暗色 + 底部红色渐变遮罩，保持项目原有的黑红色系
// - 不拦截鼠标事件（pointer-events-none），不影响主页粒子交互
// - 加载失败时静默降级为 null，不影响页面其他功能
// - 绝对定位 inset-0，与背景层级融合，适合嵌入到 IntroPage 背景堆叠中

import React, { useEffect, useRef, useState } from 'react';

interface VideoBackgroundProps {
  /** 视频资源 URL（建议通过 Vite import 产出，避免 Electron 打包路径失效） */
  videoSrc: string;
  /** 可选：自定义遮罩层 className（默认黑 55% + 底部红色 vignette） */
  overlayClassName?: string;
  /** 可选：自定义视频元素 className（默认 object-cover 全屏覆盖） */
  videoClassName?: string;
  /**
   * 可选：视频画面对齐位置（object-position），默认 "72% center"
   * 将主体角色向右靠，让出屏幕中央给标题文字，避免被遮挡
   */
  objectPosition?: string;
  /**
   * 可选：是否启用"左侧文字护罩"，在视频左半区叠加从左向右渐淡的黑色遮罩
   * 增强 MOKE / VISION ONE 标题对比度，同时保留右侧角色亮度
   * 默认开启
   */
  enableTextShield?: boolean;
}

/**
 * 视频背景组件
 * 放置在背景层级（z-0）中，位于静态渐变之后、鼠标光斑/粒子 Canvas 之前
 * 视觉效果：视频底色 → 暗红遮罩压暗 → 其他背景层叠加 → UI 层
 */
export const VideoBackground: React.FC<VideoBackgroundProps> = ({
  videoSrc,
  overlayClassName,
  videoClassName,
  objectPosition = '78% center',
  enableTextShield = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // 加载失败标记：出错则静默降级，返回 null，不打断页面
  const [hasError, setHasError] = useState<boolean>(false);

  // 兜底触发播放：某些浏览器 / Electron 场景下 autoPlay 属性可能不生效
  // 使用 play() 并捕获异常，避免未处理的 Promise rejection
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    // 再次确保静音（部分浏览器自动播放策略要求 muted 明确为 true）
    videoEl.muted = true;

    const tryPlay = async () => {
      try {
        await videoEl.play();
      } catch (err) {
        // 自动播放被策略拦截时，不抛错也不标记失败
        // 用户首次交互后浏览器会自动恢复播放能力
        // 此处静默处理即可
      }
    };

    tryPlay();
  }, [videoSrc]);

  // 加载失败：静默降级，回到原有纯黑渐变，不影响页面
  if (hasError) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* 视频元素：自动播放 + 静音 + 循环 + 内联 */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onError={() => setHasError(true)}
        className={
          videoClassName ??
          'absolute inset-0 w-full h-full object-cover select-none'
        }
        // 将角色主体向右偏，使屏幕中央标题区不被遮挡
        style={{ objectPosition }}
      />

      {/* 暗色遮罩：压暗视频，保证文字与红色粒子的对比度 */}
      <div
        className={
          overlayClassName ??
          'absolute inset-0 bg-black/55 pointer-events-none'
        }
      />

      {/* 底部红色 vignette：延续项目 from-black via-[#050000] to-[#1a0000] 黑红色系 */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(26, 0, 0, 0.6) 0%, rgba(26, 0, 0, 0.15) 50%, transparent 100%)',
        }}
      />

      {/* 顶部轻微暗角：让顶栏工业风徽标更清晰 */}
      <div
        className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0, 0, 0, 0.45) 0%, transparent 100%)',
        }}
      />

      {/* 左侧文字护罩：在屏幕左-中区叠加从左向右渐淡的黑幕
          作用：让 MOKE / VISION ONE 标题背景更深，提升文字对比度
          同时保留右侧角色亮度，让角色从文字后面"走出来" */}
      {enableTextShield && (
        <div
          className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0) 100%)',
          }}
        />
      )}
    </div>
  );
};

export default VideoBackground;
