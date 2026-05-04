// 文件路径: components/ApiSettingsFab.tsx
// ============================================================================
// 全局浮动入口（FAB）— 固定屏幕【右上角】，任何页面/任何状态都可见
// [REVISION v3] 位置从右下角迁移至右上角：
//   · 原因：右下角已被 CMD 卡片 / BottomDock 占用，改到右上角避让主要交互区
//   · top：预留 HeaderBar 高度（≈3.5rem）+ iPhone 刘海安全区，明确落在 Header 下方
//   · right：保持原 clamp 策略
//   · 尺寸、颜色、悬停交互、状态指示点完全不变
//   · safe-area-inset-top/right 适配刘海屏 / 手势边缘
//   · 横屏 / 竖屏 / 折叠屏 / 360px 窄屏到 4K 超宽屏全部自适应
// Portal 挂到 <body>，z-[10040] 高于所有页面弹窗、低于设置模态（10050）。
// ============================================================================

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useApiConfig } from '../contexts/ApiConfigContext';
import { ApiSettingsModal } from './ApiSettingsModal';

export const ApiSettingsFab: React.FC = () => {
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const { isConfigured } = useApiConfig();
  const [open, setOpen] = useState(false);

  const isCN = lang === 'CN';

  // [v2] 固定屏幕【右上角】—— 原右下角位置已下线，避免与底部 CMD/Dock 交互重叠
  //   · top = max(clamp 流体间距, safe-area-inset-top + HeaderBar 高度)
  //     HeaderBar py-3 + 行高 ≈ 52px；这里统一预留 3.5rem (=56px) 让 FAB 落在 Header 正下方
  //   · right / 尺寸 / safe-area 完全沿用原有策略，保证从 360px 小屏到 4K 均自适应
  const fabStyle: React.CSSProperties = {
    position: 'fixed',
    right: 'max(clamp(0.75rem, 2vw, 1.5rem), env(safe-area-inset-right))',
    top: 'max(calc(env(safe-area-inset-top, 0px) + 3.5rem), clamp(3.5rem, 2vw + 3rem, 4.5rem))',
    // 图标按钮（无文字）紧凑内边距
    padding: 'clamp(0.625rem, 1.2vw, 0.875rem)',
    fontSize: 'clamp(0.5625rem, 0.25vw + 0.5rem, 0.75rem)',
    letterSpacing: '0.2em',
    borderRadius: 'clamp(0.125rem, 0.3vw, 0.3rem)',
    minHeight: '2.75rem',
    minWidth: '2.75rem',
    gap: 'clamp(0.375rem, 0.6vw, 0.5rem)',
  };
  const iconSize = 'clamp(0.875rem, 0.4vw + 0.75rem, 1.125rem)';

  return (
    <>
      {!open &&
        ReactDOM.createPortal(
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`z-[10040] flex items-center font-mono font-bold uppercase shadow-2xl border transition-all active:scale-95 cursor-pointer hover:brightness-110 ${
              isDark
                ? 'bg-[#0A0A0A] border-moke-red text-moke-red hover:bg-moke-red hover:text-white'
                : 'bg-white border-moke-red text-moke-red hover:bg-moke-red hover:text-white'
            }`}
            style={fabStyle}
            title={isCN ? '打开 API 设置窗口' : 'Open API Settings'}
            aria-label={isCN ? 'API 设置' : 'API Settings'}
          >
            <svg style={{ width: iconSize, height: iconSize }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span
              className={`rounded-full ${
                isConfigured
                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                  : 'bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.7)] animate-pulse'
              }`}
              style={{
                width: 'clamp(0.375rem, 0.2vw + 0.3rem, 0.5rem)',
                height: 'clamp(0.375rem, 0.2vw + 0.3rem, 0.5rem)',
              }}
            />
          </button>,
          document.body,
        )}

      {open && <ApiSettingsModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default ApiSettingsFab;
