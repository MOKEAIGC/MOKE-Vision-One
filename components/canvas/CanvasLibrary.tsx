// 文件路径: components/canvas/CanvasLibrary.tsx
// 画布管理弹出框 — 可拖拽移动 + 可折叠/展开 + 平滑动画
// 黑红工业扁平风格

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CanvasData } from './types';

interface CanvasLibraryProps {
  isDark: boolean;
  lang: string;
  canvasList: CanvasData[];
  activeCanvasId: string;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  visible: boolean;
  onToggle: () => void;
}

export const CanvasLibrary: React.FC<CanvasLibraryProps> = ({
  isDark, lang, canvasList, activeCanvasId, onSwitch, onCreate, onDelete, onRename, visible, onToggle,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // 拖拽状态
  const [position, setPosition] = useState({ x: 80, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 折叠状态
  const [collapsed, setCollapsed] = useState(false);

  // 拖拽逻辑
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // 仅在标题栏拖拽
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };

    const handleUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleFinishEdit = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  if (!visible) return null;

  return (
    <div
      className={`absolute z-50 select-none ${isDragging ? '' : 'transition-[width,height] duration-200'}`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className={`flex flex-col border overflow-hidden ${
        isDark ? 'bg-[#0a0a0a] border-[#1f1f1f]' : 'bg-white border-[#e0e0e0]'
      }`}
        style={{ width: 260 }}
      >
        {/* 标题栏 — 拖拽区域 */}
        <div
          className={`flex items-center justify-between px-3 py-2 cursor-move border-b ${
            isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'
          } ${isDragging ? 'opacity-80' : ''}`}
          onMouseDown={handleDragStart}
        >
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-mono font-bold tracking-[0.15em] ${
              isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
            }`}>
              {lang === 'CN' ? '画布列表' : 'CANVASES'}
            </span>
            <span className={`text-[8px] font-mono ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}>
              {canvasList.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* 新建 */}
            <button
              onClick={(e) => { e.stopPropagation(); onCreate(); }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-5 h-5 flex items-center justify-center transition-colors ${
                isDark ? 'text-[#666] hover:text-[#ff4444]' : 'text-[#999] hover:text-[#dc2626]'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth={2} d="M12 5v14M5 12h14" />
              </svg>
            </button>
            {/* 折叠/展开 */}
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-5 h-5 flex items-center justify-center transition-colors ${
                isDark ? 'text-[#666] hover:text-[#ccc]' : 'text-[#999] hover:text-[#333]'
              }`}
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* 关闭 */}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(); }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`w-5 h-5 flex items-center justify-center transition-colors ${
                isDark ? 'text-[#666] hover:text-[#ff4444]' : 'text-[#999] hover:text-[#dc2626]'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 内容区 — 折叠时隐藏 */}
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-200 ease-in-out"
          style={{
            maxHeight: collapsed ? 0 : 400,
            opacity: collapsed ? 0 : 1,
          }}
        >
          <div className="max-h-[360px] overflow-y-auto p-2 flex flex-col gap-1">
            {canvasList.length === 0 && (
              <div className={`text-center py-6 text-[10px] font-mono ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}>
                {lang === 'CN' ? '暂无画布' : 'No canvases'}
              </div>
            )}
            {canvasList.map((canvas) => {
              const isActive = canvas.id === activeCanvasId;
              const isDeleting = deleteConfirm === canvas.id;
              return (
                <div
                  key={canvas.id}
                  className={`relative px-3 py-2 cursor-pointer transition-colors duration-100 ${
                    isActive
                      ? isDark ? 'bg-[#1a0808] border-l-2 border-[#cc2222]' : 'bg-[#fff5f5] border-l-2 border-[#dc2626]'
                      : isDark ? 'hover:bg-[#111] border-l-2 border-transparent' : 'hover:bg-[#f9f9f9] border-l-2 border-transparent'
                  }`}
                  onClick={() => onSwitch(canvas.id)}
                >
                  {isDeleting ? (
                    <div className="flex flex-col gap-2">
                      <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-[#ff4444]' : 'text-[#dc2626]'}`}>
                        {lang === 'CN' ? '确定删除？' : 'Delete?'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(canvas.id); setDeleteConfirm(null); }}
                          className={`flex-1 py-1 text-[9px] font-mono font-bold ${
                            isDark ? 'bg-[#330000] text-[#ff4444]' : 'bg-[#fee2e2] text-[#dc2626]'
                          }`}
                        >
                          {lang === 'CN' ? '删除' : 'DEL'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}
                          className={`flex-1 py-1 text-[9px] font-mono font-bold border ${
                            isDark ? 'border-[#222] text-[#888]' : 'border-[#ddd] text-[#666]'
                          }`}
                        >
                          {lang === 'CN' ? '取消' : 'NO'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <div className="flex-1 min-w-0">
                        {editingId === canvas.id ? (
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => handleFinishEdit(canvas.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFinishEdit(canvas.id)}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-full h-5 px-1.5 text-[10px] font-mono font-bold outline-none border ${
                              isDark ? 'bg-[#111] border-[#331111] text-white' : 'bg-white border-[#fecaca] text-black'
                            }`}
                          />
                        ) : (
                          <span className={`text-[10px] font-mono font-bold truncate block ${
                            isActive
                              ? isDark ? 'text-[#ff4444]' : 'text-[#dc2626]'
                              : isDark ? 'text-[#aaa]' : 'text-[#333]'
                          }`}>
                            {canvas.title}
                          </span>
                        )}
                        <span className={`text-[8px] font-mono ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}>
                          {new Date(canvas.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {/* 操作 */}
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(canvas.id, canvas.title); }}
                          className={`w-4 h-4 flex items-center justify-center ${
                            isDark ? 'text-[#555] hover:text-[#ff4444]' : 'text-[#bbb] hover:text-[#dc2626]'
                          }`}
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {canvasList.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(canvas.id); }}
                            className={`w-4 h-4 flex items-center justify-center ${
                              isDark ? 'text-[#555] hover:text-[#ff4444]' : 'text-[#bbb] hover:text-[#dc2626]'
                            }`}
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
