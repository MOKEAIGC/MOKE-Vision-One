// 文件路径: components/canvas/nodes/PromptNode.tsx
// 提示词节点 — 文本输入区，输出端口连接到 Generator

import React, { useState, useCallback } from 'react';
import { CanvasNode } from '../types';

interface PromptNodeProps {
  node: CanvasNode;
  isDark: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
  isSelected: boolean;
}

export const PromptNode: React.FC<PromptNodeProps> = ({ node, isDark, onDataChange, isSelected }) => {
  const text = (node.data.text as string) || '';
  const charCount = text.length;
  const maxChars = 2000;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onDataChange(node.id, { ...node.data, text: e.target.value });
  }, [node.id, node.data, onDataChange]);

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b cursor-move select-none ${
          isDark ? 'border-white/10' : 'border-black/5'
        }`}
        data-drag-handle
      >
        <span className={`text-[10px] font-bold tracking-[0.12em] uppercase ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          PROMPT
        </span>
        <span className={`text-[9px] font-mono ${
          charCount > maxChars ? 'text-red-400' : isDark ? 'text-gray-600' : 'text-gray-400'
        }`}>
          {charCount}/{maxChars}
        </span>
      </div>
      {/* 文本区域 */}
      <div className="flex-1 p-2.5">
        <textarea
          value={text}
          onChange={handleChange}
          placeholder="输入提示词..."
          className={`w-full h-full resize-none rounded-xl p-3 text-[13px] leading-relaxed outline-none transition-colors ${
            isDark
              ? 'bg-white/5 border border-white/10 text-gray-200 placeholder-gray-600 focus:border-cyan-500/40'
              : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-cyan-500/50'
          }`}
          onMouseDown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
};
