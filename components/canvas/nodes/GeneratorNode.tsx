// 文件路径: components/canvas/nodes/GeneratorNode.tsx
// AI 图片生成节点 — 配置模型参数并触发生成

import React, { useCallback } from 'react';
import { CanvasNode, CanvasConnection } from '../types';

interface GeneratorNodeProps {
  node: CanvasNode;
  isDark: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
  isSelected: boolean;
  connections: CanvasConnection[];
  nodes: CanvasNode[];
  onGenerate: (nodeId: string) => void;
  onPreviewImage?: (url: string) => void;
}

export const GeneratorNode: React.FC<GeneratorNodeProps> = ({
  node, isDark, onDataChange, isSelected, connections, nodes, onGenerate, onPreviewImage,
}) => {
  const model = (node.data.model as string) || 'gemini-3-flash-preview';
  const ratio = (node.data.ratio as string) || '1:1';
  const quality = (node.data.quality as string) || 'standard';
  const isGenerating = node.data.isGenerating as boolean || false;
  const generatedImages = (node.data.generatedImages as string[]) || [];
  const error = node.data.error as string | undefined;

  const ratioOptions = ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'];
  const qualityOptions = ['standard', 'hd'];

  // 找到连接到本节点的 prompt 文本
  const getConnectedPrompt = (): string => {
    const inputConns = connections.filter((c) => c.toNodeId === node.id);
    for (const conn of inputConns) {
      const sourceNode = nodes.find((n) => n.id === conn.fromNodeId);
      if (sourceNode?.type === 'prompt') {
        return (sourceNode.data.text as string) || '';
      }
    }
    return '';
  };

  const connectedPrompt = getConnectedPrompt();

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
          isDark ? 'text-cyan-400' : 'text-cyan-600'
        }`}>
          GENERATOR
        </span>
        {isGenerating && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[9px] font-mono text-blue-400">生成中</span>
          </div>
        )}
      </div>

      {/* 设置区域 */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-auto" onMouseDown={(e) => e.stopPropagation()}>
        {/* 连接的提示词预览 */}
        <div className={`px-3 py-2 rounded-lg text-[11px] leading-relaxed ${
          connectedPrompt
            ? isDark ? 'bg-white/5 border border-white/10 text-gray-300' : 'bg-gray-50 border border-gray-200 text-gray-600'
            : isDark ? 'bg-white/3 border border-dashed border-white/10 text-gray-600' : 'bg-gray-50 border border-dashed border-gray-200 text-gray-400'
        }`}>
          {connectedPrompt
            ? connectedPrompt.length > 100 ? connectedPrompt.slice(0, 100) + '...' : connectedPrompt
            : '⬅ 连接 Prompt 节点'
          }
        </div>

        {/* 模型 */}
        <div className="flex flex-col gap-1">
          <label className={`text-[9px] font-bold tracking-[0.08em] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            MODEL
          </label>
          <input
            type="text"
            value={model}
            onChange={(e) => onDataChange(node.id, { ...node.data, model: e.target.value })}
            className={`h-8 px-3 rounded-lg text-[11px] font-mono border outline-none transition-colors ${
              isDark
                ? 'bg-white/5 border-white/10 text-white focus:border-cyan-500/40'
                : 'bg-white border-gray-200 text-gray-800 focus:border-cyan-500/50'
            }`}
          />
        </div>

        {/* 比例 + 质量 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className={`text-[9px] font-bold tracking-[0.08em] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              RATIO
            </label>
            <select
              value={ratio}
              onChange={(e) => onDataChange(node.id, { ...node.data, ratio: e.target.value })}
              className={`h-8 px-2 rounded-lg text-[11px] font-mono border outline-none ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white'
                  : 'bg-white border-gray-200 text-gray-800'
              }`}
            >
              {ratioOptions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={`text-[9px] font-bold tracking-[0.08em] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              QUALITY
            </label>
            <select
              value={quality}
              onChange={(e) => onDataChange(node.id, { ...node.data, quality: e.target.value })}
              className={`h-8 px-2 rounded-lg text-[11px] font-mono border outline-none ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white'
                  : 'bg-white border-gray-200 text-gray-800'
              }`}
            >
              {qualityOptions.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 生成的图片预览 */}
        {generatedImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {generatedImages.slice(-4).map((img, idx) => (
              <div key={idx} className={`w-16 h-16 ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'}`}>
                <img
                  src={img}
                  alt={`generated-${idx}`}
                  className="w-full h-full object-contain border border-white/10 cursor-pointer hover:opacity-75 transition-opacity"
                  onClick={() => onPreviewImage?.(img)}
                />
              </div>
            ))}
          </div>
        )}

        {/* 错误信息 */}
        {error && (
          <div className={`px-3 py-2 rounded-lg text-[10px] font-mono ${
            isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'
          }`}>
            {error}
          </div>
        )}

        {/* 生成按钮 */}
        <button
          onClick={() => onGenerate(node.id)}
          disabled={isGenerating || !connectedPrompt}
          className={`mt-auto h-10 rounded-xl font-mono text-[11px] font-bold tracking-[0.12em] uppercase transition-all ${
            isGenerating
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-wait'
              : !connectedPrompt
              ? isDark ? 'bg-white/5 text-gray-600 border border-white/10 cursor-not-allowed' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              : isDark
              ? 'bg-white text-black border border-white hover:bg-gray-100'
              : 'bg-gray-900 text-white border border-gray-900 hover:bg-black'
          }`}
        >
          {isGenerating ? '⟳ GENERATING...' : '▶ GENERATE'}
        </button>
      </div>
    </div>
  );
};
