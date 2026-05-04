// 文件路径: components/XiaohongshuLink.tsx
// 功能说明: 小红书外链图标按钮（自包含独立组件）
// -------------------------------------------------------------------
// 作用:
//   - 显示"小红书"胶囊徽标图标，点击跳转到指定用户主页
//   - 视觉风格与 IntroPage 工业玻璃风格一致（dark glass + moke-red 悬停）
//   - 使用 target="_blank" + rel="noopener noreferrer" 安全打开外链
//   - 防御性：无效 URL 时不渲染按钮
// -------------------------------------------------------------------
// 可独立在任意页面/位置挂载，不依赖现有 IntroPage 结构
// -------------------------------------------------------------------

import React, { useState } from 'react';

interface XiaohongshuLinkProps {
  /** 目标用户主页链接（必填） */
  href: string;
  /** 可选：外层自定义 className（叠加在默认样式上） */
  className?: string;
  /** 可选：尺寸（默认 "md"） */
  size?: 'sm' | 'md' | 'lg';
  /** 可选：悬浮提示文字 */
  title?: string;
}

/**
 * 小红书外链图标按钮
 * 风格：圆角胶囊 + 深色玻璃背景 + 小红书红色强调
 * 悬停反馈：背景亮红 + 内部文字变白 + 微光晕 + 轻微上浮
 */
export const XiaohongshuLink: React.FC<XiaohongshuLinkProps> = ({
  href,
  className = '',
  size = 'md',
  title = '前往小红书主页',
}) => {
  const [isHover, setIsHover] = useState(false);

  // 防御性：无效链接直接不渲染
  if (!href || typeof href !== 'string') {
    return null;
  }

  // 尺寸映射
  const sizeMap = {
    sm: { box: 'h-8 px-3 text-[10px]', icon: 'w-3.5 h-3.5', gap: 'gap-1.5' },
    md: { box: 'h-10 px-4 text-[11px]', icon: 'w-4 h-4', gap: 'gap-2' },
    lg: { box: 'h-14 px-6 text-sm', icon: 'w-5 h-5', gap: 'gap-3' },
  } as const;
  const s = sizeMap[size];

  // 小红书品牌色（官方红 #FE2C55 / #FF2442）
  const brandRed = '#FF2442';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      aria-label={title}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className={[
        // 基础：胶囊外观 + 深色玻璃质感，与 IntroPage 黑红工业风对齐
        'group relative inline-flex items-center justify-center',
        s.box,
        s.gap,
        'font-mono font-bold tracking-[0.15em] uppercase',
        'rounded-full border backdrop-blur',
        'transition-all duration-300 ease-out',
        'select-none pointer-events-auto cursor-pointer',
        // 默认态：低调黑底 + 品牌红描边
        'bg-black/40 border-white/10 text-gray-300',
        // 悬停态：品牌红填充 + 白字 + 微光晕 + 轻微上浮（translateY）
        'hover:bg-[rgba(255,36,66,0.95)] hover:border-[rgba(255,36,66,0.8)]',
        'hover:text-white hover:-translate-y-0.5',
        'hover:shadow-[0_4px_20px_rgba(255,36,66,0.5)]',
        // 激活态按压反馈
        'active:translate-y-0 active:shadow-[0_2px_10px_rgba(255,36,66,0.4)]',
        className,
      ].join(' ')}
      style={{
        // 悬停时给图标一点颜色驱动（配合 SVG fill="currentColor"）
        color: isHover ? '#fff' : undefined,
      }}
    >
      {/* 左侧小红书 SVG 图标：简化版"书页 + 小红点"符号 */}
      <svg
        className={`${s.icon} shrink-0 transition-transform duration-300 ease-out group-hover:scale-110`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        {/* 外框（书本） */}
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
        />
        {/* 小红点（品牌红强调） */}
        <circle
          cx="8"
          cy="10"
          r="1.6"
          fill={isHover ? '#fff' : brandRed}
        />
        {/* 文字线：横条象征内容 */}
        <line
          x1="11.5"
          y1="9.5"
          x2="17.5"
          y2="9.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <line
          x1="6.5"
          y1="14"
          x2="17.5"
          y2="14"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.7"
        />
        <line
          x1="6.5"
          y1="16.8"
          x2="13.5"
          y2="16.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      {/* 品牌文字：悬停时色彩与背景对比度提升 */}
      <span className="tracking-[0.2em]">小红书</span>

      {/* 装饰：右上角科技感小红点（与站点红色系呼应） */}
      <span
        className={[
          'absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full',
          'bg-moke-red shadow-[0_0_8px_#D00000]',
          'transition-opacity duration-300',
          isHover ? 'opacity-0' : 'opacity-90',
        ].join(' ')}
        aria-hidden="true"
      />
    </a>
  );
};

export default XiaohongshuLink;
