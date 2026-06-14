// 文件路径: components/canvas/nodes/LoopNode.tsx
// 循环节点 — 模板批量展开，支持变量替换

import React from 'react';
import { CanvasNode } from '../types';

interface LoopNodeProps {
  node: CanvasNode;
  isDark: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
  isSelected: boolean;
}

export const LoopNode: React.FC<LoopNodeProps> = ({ node, isDark, onDataChange, isSelected }) => {
  const count = (node.data.count as number) || 4;
  const template = (node.data.template as string) || '';
  const variables = (node.data.variables as string) || '';
  const mode = (node.data.mode as string) || 'sequential';

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b cursor-move select-none ${
          isDark ? 'border-white/10' : 'border-black/5'
        }`}
        data-drag-handle
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className={`text-[10px] font-bold tracking-[0.12em] uppercase ${
            isDark ? 'text-orange-400' : 'text-orange-600'
          }`}>
            LOOP
          </span>
        </div>
        <span className={`text-[9px] font-mono ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          ×{count}
        </span>
      </div>

      {/* 内容 */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-auto" onMouseDown={(e) => e.stopPropagation()}>
        {/* 循环次数 */}
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
          isDark ? 'bg-white/3 border-white/8' : 'bg-gray-50 border-gray-200'
        }`}>
          <span className={`text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>COUNT</span>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => onDataChange(node.id, { ...node.data, count: parseInt(e.target.value) || 1 })}
            className={`w-14 h-7 text-center rounded-lg text-[12px] font-bold border outline-none ${
              isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
            }`}
          />
          {/* 模式切换 */}
          <div className="flex gap-1 ml-auto">
            {['sequential', 'random'].map((m) => (
              <button
                key={m}
                onClick={() => onDataChange(node.id, { ...node.data, mode: m })}
                className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${
                  mode === m
                    ? isDark ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-orange-50 text-orange-600 border border-orange-300'
                    : isDark ? 'bg-white/5 text-gray-500 border border-white/8' : 'bg-white text-gray-400 border border-gray-200'
                }`}
              >
                {m === 'sequential' ? '顺序' : '随机'}
              </button>
            ))}
          </div>
        </div>

        {/* 模板 Prompt */}
        <div className="flex flex-col gap-1.5">
          <label className={`text-[9px] font-bold tracking-[0.08em] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            TEMPLATE (use {'{{var}}'} for variables)
          </label>
          <textarea
            value={template}
            onChange={(e) => onDataChange(node.id, { ...node.data, template: e.target.value })}
            placeholder="A photo of {{subject}} in {{style}} style"
            className={`w-full h-20 resize-none rounded-xl p-2.5 text-[11px] leading-relaxed outline-none border ${
              isDark
                ? 'bg-white/5 border-white/10 text-gray-200 placeholder-gray-600 focus:border-orange-500/40'
                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-orange-500/50'
            }`}
          />
        </div>

        {/* 变量列表 */}
        <div className="flex flex-col gap-1.5">
          <label className={`text-[9px] font-bold tracking-[0.08em] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            VARIABLES (one per line)
          </label>
          <textarea
            value={variables}
            onChange={(e) => onDataChange(node.id, { ...node.data, variables: e.target.value })}
            placeholder={"subject: cat, dog, bird\nstyle: anime, realistic, watercolor"}
            className={`w-full h-20 resize-none rounded-xl p-2.5 text-[11px] leading-relaxed outline-none border font-mono ${
              isDark
                ? 'bg-white/5 border-white/10 text-gray-200 placeholder-gray-600 focus:border-orange-500/40'
                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-orange-500/50'
            }`}
          />
        </div>

        {/* 预览 */}
        {template && (
          <div className={`px-3 py-2 rounded-lg text-[10px] font-mono leading-relaxed ${
            isDark ? 'bg-white/3 border border-dashed border-white/10 text-gray-500' : 'bg-gray-50 border border-dashed border-gray-200 text-gray-400'
          }`}>
            Preview: {template.replace(/\{\{.*?\}\}/g, '___')}
          </div>
        )}
      </div>
    </div>
  );
};
