// 文件路径: components/HeaderToolbar.tsx
// 通用顶栏工具按钮组 — 设置⚙️、主题☀️/🌙、语言CN/EN
// 可嵌入任何页面的 header 中，保持一致的操作体验

import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useApiConfig } from '../contexts/ApiConfigContext';
import { ApiConfigPanel } from './ApiConfigPanel';
import { ApiSettingsModal } from './ApiSettingsModal';

/**
 * 通用顶栏工具按钮组
 * 包含：API 设置齿轮、主题切换、语言切换
 * 无需任何 props，直接从 Context 获取状态
 */
export const HeaderToolbar: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { lang, toggleLang } = useLanguage();
  const { isConfigured } = useApiConfig();

  const [showApiConfig, setShowApiConfig] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3">
        {/* [NEW] 显眼文本入口：API 设置（直接打开新模态） */}
        <button
          onClick={() => setShowApiSettings(true)}
          className={`relative flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1.5 rounded-sm border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 cursor-pointer ${
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

        {/* 旧齿轮按钮 — 保留兼容：Shift+点击 = 旧面板，点击 = 新模态 */}
        <button
          onClick={(e) => {
            if (e.shiftKey) {
              setShowApiConfig(true);
            } else {
              setShowApiSettings(true);
            }
          }}
          className={`relative p-1.5 rounded-full border transition-all hover:border-moke-red ${
            isDark ? 'border-gray-800 text-gray-400' : 'border-gray-300 text-gray-500'
          }`}
          title={lang === 'CN' ? 'API 设置（Shift+点击 = 旧面板）' : 'API Settings (Shift+Click = legacy)'}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {/* 配置状态指示点 */}
          <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
            isConfigured
              ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]'
              : 'bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.6)]'
          }`} />
        </button>

        {/* 主题切换按钮 */}
        <button
          onClick={toggleTheme}
          className={`p-1.5 rounded-full border hover:border-moke-red transition-all ${
            isDark ? 'border-gray-800 text-yellow-500' : 'border-gray-300 text-gray-600'
          }`}
          title={isDark ? '切换到亮色' : '切换到暗色'}
        >
          {isDark ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* 语言切换按钮 */}
        <button
          onClick={toggleLang}
          className={`font-mono text-[9px] font-bold tracking-widest border px-2 py-1 rounded-sm hover:border-moke-red transition-colors ${
            isDark ? 'border-gray-800' : 'border-gray-300'
          }`}
          title="切换语言"
        >
          <span className={lang === 'CN' ? 'text-moke-red' : isDark ? 'text-gray-600' : 'text-gray-400'}>CN</span>
          {' / '}
          <span className={lang === 'EN' ? 'text-moke-red' : isDark ? 'text-gray-600' : 'text-gray-400'}>EN</span>
        </button>
      </div>

      {/* API 设置弹窗 — 内部自管理，不影响父组件 */}
      {showApiConfig && (
        <ApiConfigPanel onClose={() => setShowApiConfig(false)} />
      )}
      {showApiSettings && (
        <ApiSettingsModal onClose={() => setShowApiSettings(false)} />
      )}
    </>
  );
};
