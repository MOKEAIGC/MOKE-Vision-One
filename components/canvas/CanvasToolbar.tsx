// 文件路径: components/canvas/CanvasToolbar.tsx
// 画布工具栏 — 工业简约扁平化设计 · 黑红配色 · 中文功能标注

import React, { useState } from 'react';
import { NodeType } from './types';

interface CanvasToolbarProps {
  isDark: boolean;
  scale: number;
  onAddNode: (type: NodeType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFitView: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRunCascade: () => void;
  onStopCascade: () => void;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isCascadeRunning: boolean;
  lang: string;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isDark, scale, onAddNode, onZoomIn, onZoomOut, onResetView, onFitView,
  onDeleteSelected, onUndo, onRedo, onRunCascade, onStopCascade,
  hasSelection, canUndo, canRedo, isCascadeRunning, lang,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  const nodeTypes: { type: NodeType; label: string; icon: string }[] = [
    { type: 'prompt', label: '提示词', icon: '✎' },
    { type: 'image', label: '图片', icon: '◻' },
    { type: 'generator', label: '生成器', icon: '▶' },
    { type: 'video', label: '视频', icon: '▷' },
    { type: 'llm', label: '对话', icon: '◇' },
    { type: 'loop', label: '循环', icon: '↻' },
    { type: 'output', label: '输出', icon: '◎' },
    { type: 'composer', label: '智能', icon: '◈' },
  ];

  return (
    <>
      {/* ====== 左侧节点面板 ====== */}
      <div className={`absolute left-3 top-14 bottom-14 z-30 flex flex-col ${collapsed ? 'w-[36px]' : 'w-[72px]'} transition-all duration-200`}>
        <div className={`flex flex-col h-full border ${
          isDark
            ? 'bg-[#0c0c0c] border-[#1f1f1f]'
            : 'bg-[#fafafa] border-[#e0e0e0]'
        }`}>

          {/* 标题栏 */}
          <div
            className={`flex items-center justify-between px-2 py-2 border-b cursor-pointer select-none ${
              isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'
            }`}
            onClick={() => setCollapsed(!collapsed)}
          >
            {!collapsed && (
              <span className={`text-[9px] font-mono font-bold tracking-[0.15em] uppercase ${
                isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
              }`}>
                节点
              </span>
            )}
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''} ${
                isDark ? 'text-[#555]' : 'text-[#999]'
              }`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>

          {/* 节点列表 */}
          <div className="flex-1 overflow-y-auto py-1">
            {nodeTypes.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => onAddNode(type)}
                className={`w-full flex items-center gap-1.5 px-2 py-[6px] text-left transition-colors duration-100 ${
                  isDark
                    ? 'hover:bg-[#1a0808] active:bg-[#220e0e] text-[#aaa] hover:text-[#ff4444]'
                    : 'hover:bg-[#fff0f0] active:bg-[#ffe0e0] text-[#555] hover:text-[#cc0000]'
                }`}
              >
                <span className={`text-sm leading-none ${isDark ? 'text-[#cc2222]/70' : 'text-[#b91c1c]/70'}`}>
                  {icon}
                </span>
                {!collapsed && (
                  <span className="text-[10px] font-mono font-medium truncate">
                    {label}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 底部操作区 */}
          <div className={`border-t py-1.5 px-1.5 space-y-1 ${isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'}`}>
            {/* 运行 */}
            <button
              onClick={isCascadeRunning ? onStopCascade : onRunCascade}
              className={`w-full flex items-center justify-center gap-1 py-1.5 transition-colors duration-100 ${
                isCascadeRunning
                  ? isDark ? 'bg-[#330000] text-[#ff4444]' : 'bg-[#fee2e2] text-[#dc2626]'
                  : isDark ? 'bg-[#1a0808] hover:bg-[#220e0e] text-[#cc2222] hover:text-[#ff4444]' : 'bg-[#fff5f5] hover:bg-[#fee2e2] text-[#b91c1c]'
              }`}
            >
              {isCascadeRunning ? (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" /></svg>
                  {!collapsed && <span className="text-[9px] font-mono font-bold">停止</span>}
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  {!collapsed && <span className="text-[9px] font-mono font-bold">运行</span>}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ====== 底部操作栏 ====== */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-px">
        <div className={`flex items-center border ${
          isDark ? 'bg-[#0c0c0c] border-[#1f1f1f]' : 'bg-[#fafafa] border-[#e0e0e0]'
        }`}>

          {/* 撤销 */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex flex-col items-center justify-center w-11 h-11 border-r transition-colors duration-100 ${
              isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'
            } ${canUndo
              ? isDark ? 'hover:bg-[#1a0808] text-[#888] hover:text-[#ff4444]' : 'hover:bg-[#fff0f0] text-[#666] hover:text-[#cc0000]'
              : 'opacity-25 cursor-not-allowed text-[#555]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
            </svg>
            <span className={`text-[7px] font-mono mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>撤销</span>
          </button>

          {/* 重做 */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex flex-col items-center justify-center w-11 h-11 border-r transition-colors duration-100 ${
              isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'
            } ${canRedo
              ? isDark ? 'hover:bg-[#1a0808] text-[#888] hover:text-[#ff4444]' : 'hover:bg-[#fff0f0] text-[#666] hover:text-[#cc0000]'
              : 'opacity-25 cursor-not-allowed text-[#555]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4" />
            </svg>
            <span className={`text-[7px] font-mono mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>重做</span>
          </button>

          {/* 缩小 */}
          <button
            onClick={onZoomOut}
            className={`flex flex-col items-center justify-center w-11 h-11 border-r transition-colors duration-100 ${
              isDark ? 'border-[#1f1f1f] hover:bg-[#1a0808] text-[#888] hover:text-[#ff4444]' : 'border-[#e0e0e0] hover:bg-[#fff0f0] text-[#666] hover:text-[#cc0000]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M5 12h14" />
            </svg>
            <span className={`text-[7px] font-mono mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>缩小</span>
          </button>

          {/* 缩放比例 */}
          <div className={`flex flex-col items-center justify-center w-12 h-11 border-r ${
            isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'
          }`}>
            <span className={`text-[11px] font-mono font-bold tabular-nums ${
              isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
            }`}>
              {Math.round(scale * 100)}
            </span>
            <span className={`text-[7px] font-mono ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>%</span>
          </div>

          {/* 放大 */}
          <button
            onClick={onZoomIn}
            className={`flex flex-col items-center justify-center w-11 h-11 border-r transition-colors duration-100 ${
              isDark ? 'border-[#1f1f1f] hover:bg-[#1a0808] text-[#888] hover:text-[#ff4444]' : 'border-[#e0e0e0] hover:bg-[#fff0f0] text-[#666] hover:text-[#cc0000]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            </svg>
            <span className={`text-[7px] font-mono mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>放大</span>
          </button>

          {/* 重置 */}
          <button
            onClick={onResetView}
            className={`flex flex-col items-center justify-center w-11 h-11 border-r transition-colors duration-100 ${
              isDark ? 'border-[#1f1f1f] hover:bg-[#1a0808] text-[#888] hover:text-[#ff4444]' : 'border-[#e0e0e0] hover:bg-[#fff0f0] text-[#666] hover:text-[#cc0000]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className={`text-[7px] font-mono mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>复位</span>
          </button>

          {/* 适应 */}
          <button
            onClick={onFitView}
            className={`flex flex-col items-center justify-center w-11 h-11 transition-colors duration-100 ${
              isDark ? 'hover:bg-[#1a0808] text-[#888] hover:text-[#ff4444]' : 'hover:bg-[#fff0f0] text-[#666] hover:text-[#cc0000]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className={`text-[7px] font-mono mt-0.5 ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>适应</span>
          </button>

          {/* 删除（有选中时显示） */}
          {hasSelection && (
            <button
              onClick={onDeleteSelected}
              className={`flex flex-col items-center justify-center w-11 h-11 border-l transition-colors duration-100 ${
                isDark ? 'border-[#1f1f1f] bg-[#1a0000] hover:bg-[#2a0000] text-[#ff4444]' : 'border-[#e0e0e0] bg-[#fff5f5] hover:bg-[#fee2e2] text-[#dc2626]'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="text-[7px] font-mono mt-0.5">删除</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
