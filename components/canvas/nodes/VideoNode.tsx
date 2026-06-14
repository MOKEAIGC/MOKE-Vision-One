// 文件路径: components/canvas/nodes/VideoNode.tsx
// 视频生成节点 — 支持 Veo/Sora/万相/Seedance 等多模型

import React, { useCallback } from 'react';
import { CanvasNode, CanvasConnection } from '../types';

interface VideoNodeProps {
  node: CanvasNode;
  isDark: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
  isSelected: boolean;
  connections: CanvasConnection[];
  nodes: CanvasNode[];
  onGenerate: (nodeId: string) => void;
}

const VIDEO_MODELS = [
  { value: 'veo-3', label: 'Veo 3' },
  { value: 'veo-2', label: 'Veo 2' },
  { value: 'sora-2', label: 'Sora 2' },
  { value: 'wan2.5-t2v', label: '万相 2.5 T2V' },
  { value: 'wan2.5-i2v', label: '万相 2.5 I2V' },
  { value: 'doubao-seedance-1.5-pro', label: 'Seedance 1.5' },
];

export const VideoNode: React.FC<VideoNodeProps> = ({
  node, isDark, onDataChange, isSelected, connections, nodes, onGenerate,
}) => {
  const model = (node.data.model as string) || 'veo-3';
  const duration = (node.data.duration as string) || '5';
  const isGenerating = node.data.isGenerating as boolean || false;
  const videoUrl = node.data.videoUrl as string | undefined;
  const error = node.data.error as string | undefined;

  // 获取连接的 prompt
  const getConnectedPrompt = (): string => {
    const inputConns = connections.filter((c) => c.toNodeId === node.id);
    for (const conn of inputConns) {
      const sourceNode = nodes.find((n) => n.id === conn.fromNodeId);
      if (sourceNode?.type === 'prompt') return (sourceNode.data.text as string) || '';
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
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-blue-400 animate-pulse' : 'bg-rose-400'}`} />
          <span className={`text-[10px] font-bold tracking-[0.12em] uppercase ${
            isDark ? 'text-rose-400' : 'text-rose-600'
          }`}>
            VIDEO
          </span>
        </div>
        {isGenerating && (
          <span className="text-[9px] font-mono text-blue-400 animate-pulse">生成中...</span>
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-auto" onMouseDown={(e) => e.stopPropagation()}>
        {/* Prompt 预览 */}
        <div className={`px-3 py-2 rounded-lg text-[11px] leading-relaxed ${
          connectedPrompt
            ? isDark ? 'bg-white/5 border border-white/10 text-gray-300' : 'bg-gray-50 border border-gray-200 text-gray-600'
            : isDark ? 'bg-white/3 border border-dashed border-white/10 text-gray-600' : 'bg-gray-50 border border-dashed border-gray-200 text-gray-400'
        }`}>
          {connectedPrompt ? (connectedPrompt.length > 80 ? connectedPrompt.slice(0, 80) + '...' : connectedPrompt) : '⬅ 连接 Prompt 节点'}
        </div>

        {/* 模型选择 */}
        <div className="flex flex-col gap-1">
          <label className={`text-[9px] font-bold tracking-[0.08em] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            MODEL
          </label>
          <select
            value={model}
            onChange={(e) => onDataChange(node.id, { ...node.data, model: e.target.value })}
            className={`h-8 px-3 rounded-lg text-[11px] font-mono border outline-none ${
              isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-800'
            }`}
          >
            {VIDEO_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* 时长 */}
        <div className="flex flex-col gap-1">
          <label className={`text-[9px] font-bold tracking-[0.08em] uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            DURATION (s)
          </label>
          <div className="flex gap-1.5">
            {['5', '10', '15'].map((d) => (
              <button
                key={d}
                onClick={() => onDataChange(node.id, { ...node.data, duration: d })}
                className={`flex-1 h-7 rounded-lg text-[10px] font-bold transition-all ${
                  duration === d
                    ? isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-rose-50 text-rose-600 border border-rose-300'
                    : isDark ? 'bg-white/5 text-gray-400 border border-white/10' : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        {/* 视频预览 */}
        {videoUrl && (
          <div className="rounded-xl overflow-hidden border border-white/10">
            <video src={videoUrl} controls className="w-full max-h-[140px] object-contain bg-black" />
          </div>
        )}

        {/* 错误 */}
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
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700'
          }`}
        >
          {isGenerating ? '⟳ GENERATING...' : '▶ GENERATE VIDEO'}
        </button>
      </div>
    </div>
  );
};
