// 文件路径: components/AppShell.tsx
// 应用外壳 — 四页面平行布局 + 左侧导航
// 页面：MOKE Vision One | 导演 | Seedance | 无限画布
// 设计：工业简约扁平 · 黑红配色 · 状态独立维护

import React, { useState, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

// 页面 ID
export type PageId = 'vision' | 'director' | 'seedance' | 'canvas';

interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'vision', label: '相机', icon: '◉' },
  { id: 'director', label: '导演', icon: '▦' },
  { id: 'seedance', label: '视频', icon: '▷' },
  { id: 'canvas', label: '画布', icon: '⬡' },
];

interface AppShellProps {
  children: (activePage: PageId, mountedPages: Set<PageId>) => React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const [activePage, setActivePage] = useState<PageId>('vision');
  // 已挂载过的页面集合 — 一旦访问过即保持挂载，切换仅控制 visibility
  const [mountedPages, setMountedPages] = useState<Set<PageId>>(new Set(['vision']));

  const switchPage = useCallback((id: PageId) => {
    setActivePage(id);
    setMountedPages((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* ====== 左侧导航 ====== */}
      <nav className={`shrink-0 w-[56px] flex flex-col border-r select-none relative z-[100] ${
        isDark ? 'bg-[#080808] border-[#1a1a1a]' : 'bg-[#f5f5f5] border-[#e0e0e0]'
      }`}>
        {/* 顶部标识 */}
        <div className={`flex items-center justify-center h-[56px] border-b ${
          isDark ? 'border-[#1a1a1a]' : 'border-[#e0e0e0]'
        }`}>
          <span className={`text-[14px] font-black font-mono ${
            isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
          }`}>M</span>
        </div>

        {/* 导航按钮 */}
        <div className="flex-1 flex flex-col py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => switchPage(item.id)}
                className={`relative flex flex-col items-center justify-center h-[56px] transition-colors duration-150 ${
                  isActive
                    ? isDark
                      ? 'bg-[#1a0808] text-[#ff4444]'
                      : 'bg-[#fff0f0] text-[#dc2626]'
                    : isDark
                      ? 'text-[#555] hover:text-[#cc2222] hover:bg-[#0f0505]'
                      : 'text-[#888] hover:text-[#b91c1c] hover:bg-[#fff8f8]'
                }`}
              >
                {/* 左侧激活指示条 */}
                {isActive && (
                  <div className={`absolute left-0 top-2 bottom-2 w-[2px] ${
                    isDark ? 'bg-[#cc2222]' : 'bg-[#dc2626]'
                  }`} />
                )}
                <span className="text-[16px] leading-none">{item.icon}</span>
                <span className="text-[8px] font-mono font-bold mt-1 tracking-wider">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* 底部状态 */}
        <div className={`flex items-center justify-center h-[40px] border-t ${
          isDark ? 'border-[#1a1a1a]' : 'border-[#e0e0e0]'
        }`}>
          <div className={`w-[6px] h-[6px] rounded-full ${
            isDark ? 'bg-[#cc2222]/60' : 'bg-[#dc2626]/60'
          }`} />
        </div>
      </nav>

      {/* ====== 主内容区 ====== */}
      <main className="flex-1 relative overflow-hidden h-full">
        {children(activePage, mountedPages)}
      </main>
    </div>
  );
};
