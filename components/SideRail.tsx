// 文件路径: components/SideRail.tsx
// 左侧竖向导航栏 — 相机工具导轨
// 包含：参数设置、画廊、自动保存 三个可切换的抽屉式面板
import React, { useState } from 'react';
import { CameraSettings, CapturedImage } from '../types';
import { SettingsPanel } from './SettingsPanel';
import { Gallery } from './Gallery';
import { AutoSavePanel } from './AutoSavePanel';
import { AutoSaveSettings } from '../services/autoSaveService';
// 新增：生成数量选择器（自包含独立组件，1 / 2 / 4 张批量生成）
import { BatchCountSelector, BatchCount } from './BatchCountSelector';
// 新增：边缘拖动缩放
import { useEdgeResize } from './hooks/useEdgeResize';
import { ResizableHandle } from './ResizableHandle';

interface SideRailProps {
  isDark: boolean;
  lang: string;
  settings: CameraSettings;
  updateSettings: (settings: Partial<CameraSettings>) => void;
  gallery: CapturedImage[];
  onGallerySelect: (img: CapturedImage) => void;
  onAutoSaveChange: (s: AutoSaveSettings) => void;
  /** 打开 AI 对话窗口 */
  onOpenChat?: () => void;
  /** AI 对话窗口是否激活 */
  isChatActive?: boolean;
  /** 新增：单次生成数量（可选，默认 1） */
  batchCount?: BatchCount;
  /** 新增：切换单次生成数量回调 */
  onBatchCountChange?: (n: BatchCount) => void;
  /** 新增：是否处于生成中（禁用切换） */
  isProcessing?: boolean;
}

type PanelTab = 'settings' | 'gallery' | 'save' | null;

/**
 * 左侧竖向工具栏 + 抽屉式子面板
 * - 图标列永远可见（贴左固定）
 * - 点击图标展开对应面板（浮层，不挤压取景器）
 * - 再次点击同一图标或关闭按钮可收起
 */
export const SideRail: React.FC<SideRailProps> = ({
  isDark,
  lang,
  settings,
  updateSettings,
  gallery,
  onGallerySelect,
  onAutoSaveChange,
  onOpenChat,
  isChatActive = false,
  batchCount = 1,
  onBatchCountChange,
  isProcessing = false,
}) => {
  const [activeTab, setActiveTab] = useState<PanelTab>(null);

  const toggle = (tab: PanelTab) => {
    setActiveTab(prev => (prev === tab ? null : tab));
  };

  // 抽屉面板尺寸：支持右边/底部/右下角拖拽缩放 + localStorage 持久化
  // 默认 440 × 600，最小 340 × 360（保证所有 input/slider 能显示完整）
  const panelResize = useEdgeResize({
    initial: { width: 440, height: 600 },
    min: { width: 340, height: 360 },
    enabled: ['right', 'bottom', 'se'],
    storageKey: 'moke_vision_siderail_panel_size',
  });

  return (
    <>
      {/* 左侧图标列 — fixed 贴左 */}
      <div
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 p-2 rounded-r-2xl ${
          isDark ? 'bg-black/60' : 'bg-white/70'
        } backdrop-blur-xl border-r border-y ${isDark ? 'border-white/5' : 'border-black/5'}`}
      >
        {/* AI 对话入口 — 显眼放在最上方 */}
        {onOpenChat && (
          <>
            <RailButton
              isDark={isDark}
              active={isChatActive}
              onClick={onOpenChat}
              title={lang === 'CN' ? 'AI 对话助手' : 'AI CHAT'}
              accent="red"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            {/* 分隔线 */}
            <div className={`h-px mx-2 ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          </>
        )}

        <RailButton
          isDark={isDark}
          active={activeTab === 'settings'}
          onClick={() => toggle('settings')}
          title={lang === 'CN' ? '相机参数' : 'PARAMS'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 16v-2m6-8h2M4 12h2m13.071-7.071l-1.414 1.414M6.343 17.657l-1.414 1.414M18.657 17.657l-1.414-1.414M6.343 6.343L4.929 4.929M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          }
        />
        <RailButton
          isDark={isDark}
          active={activeTab === 'gallery'}
          onClick={() => toggle('gallery')}
          title={lang === 'CN' ? '作品集' : 'GALLERY'}
          badge={gallery.length > 0 ? String(gallery.length) : undefined}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <RailButton
          isDark={isDark}
          active={activeTab === 'save'}
          onClick={() => toggle('save')}
          title={lang === 'CN' ? '自动保存' : 'AUTO-SAVE'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
          }
        />
      </div>

      {/* 抽屉式面板 — 根据 activeTab 显示 */}
      {activeTab !== null && (
        <div
          className={`fixed left-16 top-1/2 -translate-y-1/2 z-40 rounded-2xl overflow-hidden shadow-2xl ${
            isDark ? 'bg-[#0A0A0A]/95 border-white/5' : 'bg-white/95 border-black/5'
          } backdrop-blur-2xl border animate-in fade-in slide-in-from-left-4 duration-200`}
          style={{
            // 动态尺寸：由 useEdgeResize 控制，支持右边/底部/右下角拖拽
            width: panelResize.size.width,
            height: panelResize.size.height,
            maxWidth: 'calc(100vw - 80px)',
            maxHeight: 'calc(100vh - 40px)',
          }}
        >
          {/* 面板标题栏 */}
          <div
            className={`flex items-center justify-between px-5 py-3 border-b ${
              isDark ? 'border-white/5' : 'border-black/5'
            }`}
          >
            <h3
              className={`font-mono text-xs font-bold tracking-[0.2em] uppercase ${
                isDark ? 'text-white' : 'text-black'
              }`}
            >
              {activeTab === 'settings' && (lang === 'CN' ? '相机参数' : 'OPTICAL PARAMS')}
              {activeTab === 'gallery' && (lang === 'CN' ? '作品集' : 'CAPTURE GALLERY')}
              {activeTab === 'save' && (lang === 'CN' ? '自动保存' : 'AUTO SAVE')}
            </h3>
            <div className="flex items-center gap-1">
              {/* 尺寸指示徽章：拖拽中显示当前宽高 */}
              {panelResize.resizing && (
                <span className="font-mono text-[10px] tracking-widest text-moke-red font-bold mr-1 px-1.5 py-0.5 rounded bg-moke-red/10 border border-moke-red/30">
                  {panelResize.size.width}×{panelResize.size.height}
                </span>
              )}
              {/* 重置尺寸按钮 */}
              <button
                onClick={panelResize.reset}
                className={`p-1 rounded-full transition-colors ${
                  isDark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-black/5 text-gray-500'
                }`}
                title={lang === 'CN' ? '重置窗口尺寸' : 'Reset size'}
                aria-label="重置尺寸"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setActiveTab(null)}
                className={`p-1 rounded-full transition-colors ${
                  isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'
                }`}
                aria-label="关闭面板"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 面板内容区（可滚动，高度自动填满剩余空间） */}
          <div
            className="overflow-y-auto"
            style={{ height: `calc(${panelResize.size.height}px - 52px)` }}
          >
            {activeTab === 'settings' && (
              <>
                {/* 生成数量选择器置顶：先确定要生成几张，再调参数（独立组件，不侵入 SettingsPanel） */}
                {onBatchCountChange && (
                  <div
                    className={`px-8 pt-8 pb-2 ${
                      isDark ? 'bg-moke-black' : 'bg-white'
                    } transition-colors duration-500`}
                  >
                    <div
                      className={`pb-6 border-b ${
                        isDark ? 'border-gray-900' : 'border-gray-200'
                      }`}
                    >
                      <BatchCountSelector
                        value={batchCount}
                        onChange={onBatchCountChange}
                        disabled={isProcessing}
                        isDark={isDark}
                        label={lang === 'CN' ? '生成数量' : 'BATCH COUNT'}
                      />
                    </div>
                  </div>
                )}
                <SettingsPanel settings={settings} updateSettings={updateSettings} />
              </>
            )}
            {activeTab === 'gallery' && (
              <div className="p-3">
                <Gallery images={gallery} onSelect={onGallerySelect} />
              </div>
            )}
            {activeTab === 'save' && (
              <div className="p-3">
                <AutoSavePanel onSettingsChange={onAutoSaveChange} />
              </div>
            )}
          </div>

          {/* 边缘拖拽缩放手柄：右边 / 底部 / 右下角 */}
          {panelResize.handles.right && (
            <ResizableHandle
              {...panelResize.handles.right}
              active={panelResize.resizing && panelResize.direction === 'right'}
              isDark={isDark}
            />
          )}
          {panelResize.handles.bottom && (
            <ResizableHandle
              {...panelResize.handles.bottom}
              active={panelResize.resizing && panelResize.direction === 'bottom'}
              isDark={isDark}
            />
          )}
          {panelResize.handles.se && (
            <ResizableHandle
              {...panelResize.handles.se}
              active={panelResize.resizing && panelResize.direction === 'se'}
              isDark={isDark}
            />
          )}
        </div>
      )}
    </>
  );
};

/** Rail 上的图标按钮（统一样式） */
const RailButton: React.FC<{
  isDark: boolean;
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  /** 强调色：默认 red，支持未来扩展 */
  accent?: 'red' | 'default';
}> = ({ isDark, active, onClick, title, icon, badge, accent = 'default' }) => {
  // accent=red 时给未激活状态加个淡红色描边提示这是主要入口
  const isAccent = accent === 'red';
  return (
  <button
    onClick={onClick}
    title={title}
    className={`relative w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
      active
        ? 'bg-moke-red text-white shadow-lg shadow-red-900/40'
        : isAccent
        ? isDark
          ? 'text-moke-red border border-moke-red/40 hover:bg-moke-red/10 hover:border-moke-red'
          : 'text-moke-red border border-moke-red/50 hover:bg-moke-red/10 hover:border-moke-red'
        : isDark
        ? 'text-gray-400 hover:text-white hover:bg-white/10'
        : 'text-gray-600 hover:text-black hover:bg-black/5'
    }`}
  >
    {icon}
    {badge && (
      <span
        className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center ${
          active ? 'bg-white text-moke-red' : 'bg-moke-red text-white'
        }`}
      >
        {badge}
      </span>
    )}
  </button>
  );
};
