// 文件路径: components/DirectorPromptBox.tsx
// Director 风格场景描述框 — 可缩放，嵌入 Viewfinder 底部

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface DirectorPromptBoxProps {
  prompt: string;
  setPrompt: (text: string) => void;
  onCapture: () => void;
  isProcessing: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const DirectorPromptBox: React.FC<DirectorPromptBoxProps> = ({
  prompt, setPrompt, onCapture, isProcessing, disabled = false, placeholder = '输入导演创意描述...'
}) => {
  const { isDark } = useTheme();
  const [boxHeight, setBoxHeight] = useState(120);
  const isResizing = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartH = useRef(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizing.current = true;
    resizeStartY.current = e.clientY;
    resizeStartH.current = boxHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [boxHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // 向上拖 = 高度增加（因为底部固定，往上拉）
      const delta = resizeStartY.current - e.clientY;
      setBoxHeight(Math.min(Math.max(resizeStartH.current + delta, 60), 400));
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!disabled && !isProcessing) onCapture();
    }
  };

  return (
    <div className="flex flex-col" style={{ height: `${boxHeight}px` }}>
      {/* 拖拽缩放手柄 */}
      <div
        onMouseDown={handleResizeStart}
        className="h-2 cursor-row-resize flex items-center justify-center group shrink-0 relative"
      >
        <div className="flex gap-1">
          <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-gray-600 group-hover:bg-moke-red' : 'bg-gray-400 group-hover:bg-moke-red'} transition-colors`} />
          <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-gray-600 group-hover:bg-moke-red' : 'bg-gray-400 group-hover:bg-moke-red'} transition-colors`} />
          <div className={`w-1 h-1 rounded-full ${isDark ? 'bg-gray-600 group-hover:bg-moke-red' : 'bg-gray-400 group-hover:bg-moke-red'} transition-colors`} />
        </div>
      </div>

      {/* 输入框 + 按钮 */}
      <div className={`flex-1 flex flex-col gap-2 ${isDark ? 'bg-black/80 border-gray-800' : 'bg-white/90 border-gray-300'} backdrop-blur-md border rounded-sm p-3 shadow-xl min-h-0`}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          className={`flex-1 bg-transparent border-none ${isDark ? 'text-gray-200' : 'text-gray-900'} font-mono text-sm font-bold w-full focus:outline-none placeholder-gray-500 resize-none leading-relaxed min-h-0`}
        />
        <button
          onClick={onCapture}
          disabled={isProcessing || disabled || !prompt.trim()}
          className="w-full py-2.5 bg-gradient-to-r from-moke-red to-[#900000] text-white text-[11px] font-mono font-bold tracking-[0.2em] uppercase rounded-sm transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(208,0,0,0.2)] flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              处理中
            </>
          ) : (
            '开始渲染'
          )}
        </button>
      </div>
    </div>
  );
};
