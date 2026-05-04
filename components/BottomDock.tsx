// 文件路径: components/BottomDock.tsx
// 底部浮层 Dock — 相机核心操作区（快门 / 模式切换 / 功能入口）
// 采用半透明磨砂玻璃 + 固定底部，贴合相机操作直觉
import React from 'react';
import { CameraMode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomDockProps {
  /** 当前相机模式 */
  mode: CameraMode;
  /** 切换模式回调 */
  onModeChange: (mode: CameraMode) => void;
  /** 拍摄回调 */
  onCapture: () => void;
  /** 是否正在处理 */
  isProcessing: boolean;
  /** 深色模式 */
  isDark: boolean;
  /** 当前语言 */
  lang: string;
  /** 卫星子页签 */
  satelliteSubTab: 'earth' | 'link';
  /** 切换卫星子页签 */
  onSatelliteSubTabChange: (tab: 'earth' | 'link') => void;
  /** 打开导演模式 */
  onShowDirector: () => void;
  /** 打开 Seedance */
  onShowSeedance: () => void;
  /** 导演面板是否打开中（保持挂载时可能仍在后台） */
  isDirectorActive?: boolean;
  /** Seedance 面板是否打开中 */
  isSeedanceActive?: boolean;
}

/**
 * 相机底部操作 Dock
 * 布局：左侧模式切换 | 中央超大快门 | 右侧功能入口
 * 使用 fixed 定位贴底，保持相机直觉操作
 */
export const BottomDock: React.FC<BottomDockProps> = ({
  mode,
  onModeChange,
  onCapture,
  isProcessing,
  isDark,
  lang,
  satelliteSubTab,
  onSatelliteSubTabChange,
  onShowDirector,
  onShowSeedance,
  isDirectorActive = false,
  isSeedanceActive = false,
}) => {
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      {/* 渐变遮罩 — 让底部控制区与取景器自然过渡 */}
      <div
        className={`h-32 bg-gradient-to-t ${
          isDark ? 'from-black/80 via-black/40 to-transparent' : 'from-white/80 via-white/40 to-transparent'
        }`}
      />

      {/* 主 Dock 容器 */}
      <div
        className={`pointer-events-auto ${
          isDark ? 'bg-black/60' : 'bg-white/70'
        } backdrop-blur-xl border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}
      >
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          {/* 主操作区：三列布局 */}
          <div className="flex items-center justify-between gap-6">
            {/* ========== 左：模式切换 ========== */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div
                className={`inline-flex self-start rounded-full p-1 ${
                  isDark ? 'bg-white/5' : 'bg-black/5'
                }`}
              >
                <button
                  onClick={() => onModeChange(CameraMode.TEXT_TO_IMAGE)}
                  className={`px-5 py-2 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase transition-all ${
                    mode === CameraMode.TEXT_TO_IMAGE
                      ? 'bg-moke-red text-white shadow-md'
                      : isDark
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {t('MODE_TXT')}
                </button>
                <button
                  onClick={() => onModeChange(CameraMode.EARTH_TO_IMAGE)}
                  className={`px-5 py-2 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase transition-all ${
                    mode === CameraMode.EARTH_TO_IMAGE
                      ? 'bg-emerald-600 text-white shadow-md'
                      : isDark
                      ? 'text-gray-400 hover:text-white'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {t('MODE_EARTH')}
                </button>
              </div>

              {/* 卫星模式下的子页签 */}
              {mode === CameraMode.EARTH_TO_IMAGE && (
                <div
                  className={`inline-flex self-start rounded-full p-1 text-[10px] ${
                    isDark ? 'bg-white/5' : 'bg-black/5'
                  }`}
                >
                  <button
                    onClick={() => onSatelliteSubTabChange('earth')}
                    className={`px-3 py-1 rounded-full font-mono font-bold tracking-wider transition-all ${
                      satelliteSubTab === 'earth'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isDark
                        ? 'text-gray-500'
                        : 'text-gray-500'
                    }`}
                  >
                    🌍 {lang === 'CN' ? '地球' : 'EARTH'}
                  </button>
                  <button
                    onClick={() => onSatelliteSubTabChange('link')}
                    className={`px-3 py-1 rounded-full font-mono font-bold tracking-wider transition-all ${
                      satelliteSubTab === 'link'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isDark
                        ? 'text-gray-500'
                        : 'text-gray-500'
                    }`}
                  >
                    🛰 {lang === 'CN' ? '卫星' : 'SAT'}
                  </button>
                </div>
              )}
            </div>

            {/* ========== 中：超大快门按钮 ========== */}
            <div className="shrink-0">
              <button
                onClick={mode === CameraMode.EARTH_TO_IMAGE ? undefined : onCapture}
                disabled={isProcessing || mode === CameraMode.EARTH_TO_IMAGE}
                aria-label="拍摄"
                className={`relative group w-20 h-20 rounded-full transition-all active:scale-90 ${
                  mode === CameraMode.EARTH_TO_IMAGE ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {/* 发光环 */}
                <div
                  className={`absolute inset-0 rounded-full blur-xl transition-all ${
                    isProcessing
                      ? 'bg-red-500/60 animate-pulse'
                      : 'bg-moke-red/30 group-hover:bg-moke-red/60'
                  }`}
                />
                {/* 外圈 */}
                <div
                  className={`absolute inset-0 rounded-full border-[3px] ${
                    isDark ? 'border-white/80' : 'border-black/70'
                  } shadow-[0_8px_30px_rgba(0,0,0,0.4)]`}
                />
                {/* 内圆（快门触发点） */}
                <div
                  className={`absolute inset-[6px] rounded-full transition-all duration-200 ${
                    isProcessing
                      ? 'bg-red-800 scale-90'
                      : 'bg-gradient-to-br from-moke-red to-[#900000] group-hover:brightness-125 group-active:scale-95'
                  } shadow-inner`}
                >
                  {/* 高光 */}
                  <div className="absolute top-2 left-3 w-5 h-3 bg-white/25 rounded-full blur-sm" />
                </div>
              </button>
              {/* 状态文字 */}
              <div className="mt-2 text-center">
                <span
                  className={`font-mono text-[9px] font-bold tracking-[0.3em] uppercase ${
                    isProcessing
                      ? 'text-moke-red animate-pulse'
                      : isDark
                      ? 'text-gray-500'
                      : 'text-gray-500'
                  }`}
                >
                  {isProcessing ? 'CAPTURING' : mode === CameraMode.EARTH_TO_IMAGE ? 'MAP MODE' : 'SHUTTER'}
                </span>
              </div>
            </div>

            {/* ========== 右：功能入口（带专属配色 + 状态高亮） ========== */}
            <div className="flex-1 flex items-center justify-end gap-2">
              {/* 导演模式 — 品牌红 */}
              <DockButton
                isDark={isDark}
                onClick={onShowDirector}
                label={lang === 'CN' ? '导演' : 'DIRECTOR'}
                active={isDirectorActive}
                accentColor="red"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <polygon points="6,4 6,20 20,12" strokeLinejoin="round" strokeWidth={1.8} />
                    <circle cx="6" cy="4" r="0.8" fill="currentColor" />
                    <circle cx="6" cy="20" r="0.8" fill="currentColor" />
                    <circle cx="20" cy="12" r="0.8" fill="currentColor" />
                  </svg>
                }
              />
              {/* Seedance — 青紫渐变 */}
              <DockButton
                isDark={isDark}
                onClick={onShowSeedance}
                label="SEEDANCE"
                active={isSeedanceActive}
                accentColor="violet"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l2.09 5.26L19 10.27l-3.89 3.8.92 5.37L12 16.9l-4.03 2.54.92-5.37L5 10.27l4.91-2.01L12 3z" />
                    <circle cx="19" cy="5" r="1.2" fill="currentColor" opacity="0.7" />
                    <circle cx="5" cy="19" r="0.8" fill="currentColor" opacity="0.5" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Dock 功能入口按钮 — 精致卡片样式
 * - 每个按钮有专属 accent 色（胶片=amber / 导演=red / seedance=violet）
 * - active 状态：彩色填充边框 + 发光环 + 右上角闪烁指示灯
 * - hover：边框点亮 + 图标微放大 + 背景微亮
 */
type AccentColor = 'amber' | 'red' | 'violet';

const ACCENT_PALETTE: Record<AccentColor, {
  /** 非激活态图标色 */
  icon: string;
  /** hover 边框色 */
  hoverBorder: string;
  /** 激活态边框色 */
  activeBorder: string;
  /** 激活态背景渐变 */
  activeBg: string;
  /** 激活态图标色 */
  activeIcon: string;
  /** 发光色 */
  glow: string;
  /** 指示灯色 */
  dot: string;
}> = {
  amber: {
    icon: 'text-amber-500/70',
    hoverBorder: 'group-hover:border-amber-500/60',
    activeBorder: 'border-amber-400',
    activeBg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
    activeIcon: 'text-amber-300',
    glow: 'shadow-[0_0_16px_rgba(245,158,11,0.45)]',
    dot: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
  },
  red: {
    icon: 'text-moke-red/80',
    hoverBorder: 'group-hover:border-moke-red/70',
    activeBorder: 'border-moke-red',
    activeBg: 'bg-gradient-to-br from-moke-red/25 to-red-900/10',
    activeIcon: 'text-moke-red',
    glow: 'shadow-[0_0_16px_rgba(208,0,0,0.5)]',
    dot: 'bg-moke-red shadow-[0_0_6px_rgba(208,0,0,0.9)]',
  },
  violet: {
    icon: 'text-violet-400/80',
    hoverBorder: 'group-hover:border-violet-400/60',
    activeBorder: 'border-violet-400',
    activeBg: 'bg-gradient-to-br from-violet-500/20 to-fuchsia-600/10',
    activeIcon: 'text-violet-300',
    glow: 'shadow-[0_0_16px_rgba(139,92,246,0.5)]',
    dot: 'bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.9)]',
  },
};

const DockButton: React.FC<{
  isDark: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  accentColor: AccentColor;
}> = ({ isDark, onClick, icon, label, active = false, accentColor }) => {
  const p = ACCENT_PALETTE[accentColor];
  const baseBorder = isDark ? 'border-white/10' : 'border-black/10';
  const baseBg = isDark ? 'bg-white/[0.03]' : 'bg-black/[0.02]';
  const baseText = isDark ? 'text-gray-300' : 'text-gray-700';

  return (
    <button
      onClick={onClick}
      title={label}
      className={`group relative flex flex-col items-center justify-center gap-1 w-[72px] h-[60px] rounded-xl border transition-all active:scale-95 ${
        active
          ? `${p.activeBorder} ${p.activeBg} ${p.glow}`
          : `${baseBorder} ${baseBg} hover:${isDark ? 'bg-white/[0.06]' : 'bg-black/[0.04]'} ${p.hoverBorder}`
      }`}
    >
      {/* 激活状态指示灯 — 右上角闪烁小圆点 */}
      {active && (
        <span
          className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${p.dot} animate-pulse-fast`}
          aria-hidden
        />
      )}
      {/* 图标 */}
      <span
        className={`transition-all group-hover:scale-110 ${
          active ? p.activeIcon : p.icon
        } group-hover:${p.activeIcon}`}
      >
        {icon}
      </span>
      {/* 文字标签 */}
      <span
        className={`font-mono text-[9px] font-bold tracking-[0.15em] uppercase transition-opacity ${
          active ? p.activeIcon : baseText + ' opacity-70 group-hover:opacity-100'
        }`}
      >
        {label}
      </span>
    </button>
  );
};
