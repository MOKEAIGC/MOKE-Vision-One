// 文件路径: components/ControlPanel.tsx
// 控制面板组件 — 从 App.tsx 右侧栏提取
// 包含：快门按钮、模式切换卡片、功能入口（Director / Seedance / Film System）
// 水平 flex 布局，工业时尚风格

import React from 'react';
import { CameraMode } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ControlPanelProps {
  /** 当前相机模式 */
  mode: CameraMode;
  /** 切换模式回调 */
  onModeChange: (mode: CameraMode) => void;
  /** 拍摄回调 */
  onCapture: () => void;
  /** 是否正在生成 */
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
  /** 打开胶片系统 */
  onOpenFilmSystem: () => void;
  /** 锁定的胶片风格 */
  lockedFilmStyle: string;
  /** 清除锁定胶片风格 */
  onClearLockedFilm: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
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
  onOpenFilmSystem,
  lockedFilmStyle,
  onClearLockedFilm,
}) => {
  const { t } = useLanguage();
  const borderMain = isDark ? 'border-gray-800' : 'border-gray-300';

  return (
    <div
      className={`w-full border-t border-b ${borderMain} ${
        isDark ? 'bg-[#0F0F0F]' : 'bg-gray-50'
      } transition-colors duration-500`}
    >
      {/* 区块标签 */}
      <div className="px-8 pt-6 pb-2">
        <span
          className={`font-mono text-[10px] font-bold tracking-[0.3em] uppercase ${
            isDark ? 'text-gray-600' : 'text-gray-400'
          }`}
        >
          // SECTION_02 — CONTROL
        </span>
      </div>

      {/* 主内容：水平三列布局 */}
      <div className="px-8 pb-8 flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-12">
        {/* 左列：快门按钮 */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div
            className={`relative group ${
              mode === CameraMode.EARTH_TO_IMAGE ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'
            }`}
            onClick={mode === CameraMode.EARTH_TO_IMAGE ? undefined : onCapture}
          >
            {/* 发光背景 */}
            <div
              className={`absolute inset-0 rounded-full blur-[25px] transition-all duration-500 ${
                isProcessing ? 'bg-red-500/40' : 'bg-moke-red/20 group-hover:bg-moke-red/40'
              }`}
            ></div>
            <button
              disabled={isProcessing || mode === CameraMode.EARTH_TO_IMAGE}
              className={`relative w-20 h-20 rounded-full border-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] active:scale-95 transition-all flex items-center justify-center overflow-hidden ${
                isDark ? 'bg-[#151515] border-[#222]' : 'bg-white border-gray-200'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full transition-all duration-200 ${
                  isProcessing
                    ? 'bg-red-900 scale-95'
                    : 'bg-gradient-to-br from-moke-red to-[#900000] shadow-inner group-hover:brightness-110'
                }`}
              >
                <div className="absolute top-2 left-4 w-5 h-3 bg-white opacity-20 rounded-full blur-[2px]"></div>
              </div>
            </button>
          </div>
          <span
            className={`text-[10px] font-mono tracking-[0.3em] font-bold uppercase transition-colors ${
              isProcessing
                ? 'text-moke-red animate-pulse'
                : isDark
                ? 'text-gray-500'
                : 'text-gray-400'
            }`}
          >
            {mode === CameraMode.EARTH_TO_IMAGE
              ? 'USE MAP CONTROLS'
              : isProcessing
              ? 'PROCESSING'
              : 'SHUTTER'}
          </span>
        </div>

        {/* 中列：模式切换卡片 */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex gap-3">
            {/* 文生图模式 */}
            <button
              onClick={() => onModeChange(CameraMode.TEXT_TO_IMAGE)}
              className={`flex-1 text-xs font-mono font-bold py-4 transition-all uppercase tracking-widest text-center rounded-sm border ${
                mode === CameraMode.TEXT_TO_IMAGE
                  ? 'border-moke-red bg-moke-red text-white shadow-lg shadow-red-900/30'
                  : `${borderMain} ${
                      isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
                    } hover:border-moke-red`
              }`}
            >
              {t('MODE_TXT')}
            </button>
            {/* 卫星模式 */}
            <button
              onClick={() => onModeChange(CameraMode.EARTH_TO_IMAGE)}
              className={`flex-1 text-xs font-mono font-bold py-4 transition-all uppercase tracking-widest text-center rounded-sm border ${
                mode === CameraMode.EARTH_TO_IMAGE
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : `${borderMain} ${
                      isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
                    } hover:border-emerald-500`
              }`}
            >
              {t('MODE_EARTH')}
            </button>
          </div>

          {/* 卫星模式子页签 */}
          {mode === CameraMode.EARTH_TO_IMAGE && (
            <div
              className={`flex gap-1 rounded-sm overflow-hidden border ${
                isDark ? 'border-gray-800' : 'border-gray-200'
              }`}
            >
              <button
                onClick={() => onSatelliteSubTabChange('earth')}
                className={`flex-1 text-[10px] font-mono font-bold py-2 tracking-wider transition-all ${
                  satelliteSubTab === 'earth'
                    ? 'bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500'
                    : `${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`
                }`}
              >
                🌍 {lang === 'CN' ? '地球视图' : 'EARTH'}
              </button>
              <button
                onClick={() => onSatelliteSubTabChange('link')}
                className={`flex-1 text-[10px] font-mono font-bold py-2 tracking-wider transition-all ${
                  satelliteSubTab === 'link'
                    ? 'bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500'
                    : `${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'}`
                }`}
              >
                🛰️ {lang === 'CN' ? '卫星链路' : 'SAT-LINK'}
              </button>
            </div>
          )}

          {/* 锁定的胶片风格指示 */}
          {lockedFilmStyle && (
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-sm border ${
                isDark ? 'border-gray-800 bg-gray-900/50' : 'border-gray-200 bg-gray-100'
              }`}
            >
              <span className="text-[10px] font-mono text-moke-red font-bold tracking-wider uppercase truncate flex-1">
                🎞️ {lockedFilmStyle.length > 40 ? lockedFilmStyle.slice(0, 40) + '...' : lockedFilmStyle}
              </span>
              <button
                onClick={onClearLockedFilm}
                className="text-[10px] font-mono text-gray-500 hover:text-moke-red transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* 右列：功能入口按钮组 */}
        <div className="flex flex-row lg:flex-col gap-3 shrink-0">
          <button
            onClick={onShowDirector}
            className={`text-[10px] font-mono font-bold py-3 px-5 transition-all uppercase tracking-widest text-center rounded-sm border ${borderMain} ${
              isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
            } hover:border-moke-red hover:shadow-[0_0_12px_rgba(208,0,0,0.15)]`}
          >
            ▶ DIRECTOR
          </button>
          <button
            onClick={onShowSeedance}
            className={`text-[10px] font-mono font-bold py-3 px-5 transition-all uppercase tracking-widest text-center rounded-sm border ${borderMain} ${
              isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
            } hover:border-moke-red hover:shadow-[0_0_12px_rgba(208,0,0,0.15)]`}
          >
            ✨ SEEDANCE
          </button>
          <button
            onClick={onOpenFilmSystem}
            className={`text-[10px] font-mono font-bold py-3 px-5 transition-all uppercase tracking-widest text-center rounded-sm border ${borderMain} ${
              isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
            } hover:border-moke-red hover:shadow-[0_0_12px_rgba(208,0,0,0.15)]`}
          >
            🎞️ FILM
          </button>
        </div>
      </div>
    </div>
  );
};
