// 文件路径: components/HeaderBar.tsx
// 顶部导航栏组件 — 从 App.tsx 提取，工业时尚风格
// sticky 定位 + 磨砂玻璃效果，包含品牌标题、状态指标、工具按钮组

import React from 'react';

interface HeaderBarProps {
  /** 退出/返回回调 */
  onExit: () => void;
  /** 打开模型总览面板 */
  onShowModelRegistry: () => void;
  /**
   * 打开 API 配置面板 —— 顶栏的 API 配置齿轮已移除（右上角浮动 FAB 统一承载该入口），
   * 字段保留为可选仅作 API 兼容，避免破坏 App.tsx 现有调用
   */
  onShowApiConfig?: () => void;
  /** 切换深色/浅色主题 */
  toggleTheme: () => void;
  /** 切换中英文 */
  toggleLang: () => void;
  /** 当前是否深色模式 */
  isDark: boolean;
  /** 当前语言 CN | EN */
  lang: string;
  /** Gemini API 是否已配置（顶栏已不再展示该状态指示点，字段保留以兼容旧调用） */
  isConfigured?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onExit,
  onShowModelRegistry,
  onShowApiConfig,
  toggleTheme,
  toggleLang,
  isDark,
  lang,
  isConfigured,
}) => {
  return (
    <header
      className={`fixed top-0 left-0 right-0 flex justify-between items-center px-6 py-3 ${
        isDark ? 'bg-black/40' : 'bg-white/50'
      } backdrop-blur-xl z-50 transition-colors duration-500 select-none border-b ${
        isDark ? 'border-white/5' : 'border-black/5'
      }`}
    >
      {/* 左侧：返回 + 品牌标题（极简） */}
      <div className="flex items-center gap-4">
        <button
          onClick={onExit}
          className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-black/5 text-gray-600 hover:text-black'
          }`}
          title="返回"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 品牌标识（简洁） */}
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-moke-red rounded-full animate-pulse-fast shadow-[0_0_8px_#D00000]"></span>
          <h1 className={`font-mono text-[11px] font-black tracking-[0.25em] uppercase ${isDark ? 'text-white' : 'text-black'}`}>
            MOKE VISION ONE
          </h1>
        </div>
      </div>

      {/* 右侧：工具按钮组（小巧图标化） */}
      <div className="flex items-center gap-1">
          {/* API 设置按钮 — 与其他子页面 HeaderToolbar 入口保持一致 */}
          {onShowApiConfig && (
            <button
              onClick={onShowApiConfig}
              className={`relative flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 mr-1 rounded-sm border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 cursor-pointer ${
                isDark ? 'border-gray-800 text-gray-300' : 'border-gray-300 text-gray-700'
              }`}
              title={lang === 'CN' ? '打开 API 设置窗口' : 'Open API Settings'}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>API</span>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isConfigured
                  ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]'
                  : 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.6)] animate-pulse'
              }`} />
            </button>
          )}

          {/* 模型总览按钮 */}
          <button
            onClick={onShowModelRegistry}
            className={`relative p-2 rounded-lg transition-all ${
              isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-black/5 text-gray-600 hover:text-black'
            }`}
            title={lang === 'CN' ? 'AI 模型总览' : 'AI Model Registry'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
          </button>

          {/* API 配置按钮已移除：功能统一由右上角浮动 ApiSettingsFab 承载，避免双入口重复 */}

          {/* 深色/浅色主题切换 */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all ${
              isDark ? 'hover:bg-white/10 text-yellow-400' : 'hover:bg-black/5 text-gray-600'
            }`}
            title={isDark ? '切换浅色' : '切换深色'}
          >
            {isDark ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* 语言切换（小巧 pill） */}
          <button
            onClick={toggleLang}
            className={`ml-1 font-mono text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-md transition-all ${
              isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'
            }`}
          >
            <span className={lang === 'CN' ? 'text-moke-red' : 'opacity-50'}>CN</span>
            <span className="opacity-30 mx-0.5">/</span>
            <span className={lang === 'EN' ? 'text-moke-red' : 'opacity-50'}>EN</span>
          </button>
      </div>
    </header>
  );
};
