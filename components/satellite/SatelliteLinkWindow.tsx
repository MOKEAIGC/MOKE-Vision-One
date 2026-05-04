// 文件路径: components/satellite/SatelliteLinkWindow.tsx
// 卫星-链路窗口 — React 包装组件，统一 MOKE UI 风格
// 包含：标准 header（返回按钮 + 标题 + HeaderToolbar）+ Lit Element 地图组件

import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApiConfig } from '../../contexts/ApiConfigContext';
import { HeaderToolbar } from '../HeaderToolbar';

// 导入卫星-链路样式
import './satellite.css';

// 动态导入 Lit 组件和初始化逻辑（避免阻塞主包加载）
import type { SatelliteMapApp } from './map_app';

interface SatelliteLinkWindowProps {
  onBack: () => void;
}

export const SatelliteLinkWindow: React.FC<SatelliteLinkWindowProps> = ({ onBack }) => {
  const { isDark } = useTheme();
  const { t, lang } = useLanguage();
  const isCN = lang === 'CN';
  const { config } = useApiConfig();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapAppRef = useRef<SatelliteMapApp | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const initCalledRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initCalledRef.current) return;
    initCalledRef.current = true;

    const initMap = async () => {
      try {
        // 动态导入 Lit 组件（确保 custom element 注册）
        const { SatelliteMapApp: MapAppClass } = await import('./map_app');
        const { initSatelliteMapSystem } = await import('./SatelliteMapInit');

        // 创建 Lit Element 实例并挂载到容器
        const mapApp = new MapAppClass();
        mapAppRef.current = mapApp;

        if (containerRef.current) {
          containerRef.current.appendChild(mapApp);
        }

        // 使用主应用的 Gemini API Key 初始化 AI 系统
        await initSatelliteMapSystem(mapApp, config.apiKey);

        setIsInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('[SatelliteLinkWindow] 初始化错误:', error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      // 清理：卸载 Lit Element
      if (mapAppRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(mapAppRef.current);
        } catch (_) {
          // 已被移除
        }
      }
      mapAppRef.current = null;
      initCalledRef.current = false;
    };
  }, [config.apiKey]);

  const borderMain = isDark ? 'border-gray-800' : 'border-gray-300';

  return (
    <div className={`fixed inset-0 z-[9998] flex flex-col ${isDark ? 'bg-moke-black' : 'bg-moke-white'} transition-colors duration-500`}>

      {/* Header — 统一 MOKE 风格 */}
      <header className={`flex justify-between items-center px-6 py-3 border-b ${borderMain} ${isDark ? 'bg-moke-black/95' : 'bg-white/95'} backdrop-blur-md z-50 shrink-0 select-none`}>
        {/* 左侧：返回按钮 + 标题 */}
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className={`group flex items-center gap-2 px-3 py-1.5 border rounded-sm transition-all active:scale-95 ${isDark ? 'border-gray-800 hover:border-moke-red text-gray-400' : 'border-gray-300 hover:border-moke-red text-gray-600'}`}
          >
            <svg className="w-4 h-4 group-hover:text-moke-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-mono text-[10px] tracking-[0.2em] font-bold group-hover:text-moke-red uppercase">BACK</span>
          </button>

          <div className={`w-px h-5 ${isDark ? 'bg-gray-800' : 'bg-gray-300'}`} />

          {/* 标题 + 状态指示 */}
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-xs font-black tracking-[0.2em] uppercase flex items-center gap-2">
              <span className="text-emerald-500">🛰️</span>
              卫星-链路
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            </h1>
            <span className={`text-[9px] font-mono tracking-wider uppercase ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              SATELLITE LINK // 3D MAP + AI
            </span>
          </div>
        </div>

        {/* 右侧：通用工具栏 */}
        <div className="flex items-center gap-4">
          {/* 通用工具栏：设置⚙️、主题☀️、语言CN/EN */}
          <HeaderToolbar />
        </div>
      </header>

      {/* 地图内容区域 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 加载状态 */}
        {isLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a]">
            <div className="relative mb-8">
              <div className="w-16 h-16 border-2 border-gray-800 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="font-mono text-xs tracking-[0.3em] text-gray-500 uppercase animate-pulse">
              INITIALIZING SATELLITE LINK...
            </p>
            <p className="font-mono text-[10px] tracking-wider text-gray-700 mt-2">
              {isCN ? '正在连接 3D 地图引擎 & AI 通信链路' : 'Connecting 3D map engine & AI communication link'}
            </p>
          </div>
        )}

        {/* Lit Element 地图组件容器 */}
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ opacity: isLoading ? 0 : 1 }}
        />
      </div>
    </div>
  );
};
