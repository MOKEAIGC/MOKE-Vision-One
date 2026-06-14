// 文件路径: components/canvas/nodes/SmartComposerNode.tsx
// 智能画布 Composer 节点 — 集成多引擎、多模式的智能生成控制面板
// 对应 Infinite-Canvas 的 smart-canvas.html Composer 功能

import React, { useState } from 'react';
import { CanvasNode } from '../types';
import { generateOnlineImage, generateVideo, msGenerate } from '../../../services/canvasBackendService';

interface SmartComposerNodeProps {
  node: CanvasNode;
  isDark: boolean;
  isSelected: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
}

type Engine = 'api' | 'modelscope' | 'comfyui';
type Kind = 'image' | 'video';

export const SmartComposerNode: React.FC<SmartComposerNodeProps> = ({ node, isDark, onDataChange }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const engine = (node.data.engine as Engine) || 'api';
  const kind = (node.data.kind as Kind) || 'image';
  const prompt = (node.data.prompt as string) || '';
  const model = (node.data.model as string) || '';
  const ratio = (node.data.ratio as string) || '1:1';
  const quality = (node.data.quality as string) || 'medium';
  const error = node.data.error as string | undefined;
  const result = node.data.result as string | undefined;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    onDataChange(node.id, { ...node.data, isGenerating: true, error: undefined });

    try {
      const sizeMap: Record<string, string> = {
        '1:1': '1024x1024', '16:9': '1536x1024', '9:16': '1024x1536',
        '4:3': '1024x768', '3:4': '768x1024', '3:2': '1536x1024', '2:3': '1024x1536',
      };
      const size = sizeMap[ratio] || '1024x1024';

      let imageUrl = '';

      if (kind === 'video') {
        const videoResult = await generateVideo({ prompt, model: model || undefined, ratio });
        onDataChange(node.id, { ...node.data, isGenerating: false, result: videoResult.video_url, resultType: 'video' });
      } else if (engine === 'modelscope') {
        const msResult = await msGenerate({ prompt, model: model || undefined, size });
        imageUrl = msResult.image || msResult.local_url || '';
        onDataChange(node.id, { ...node.data, isGenerating: false, result: imageUrl, resultType: 'image' });
      } else {
        const apiResult = await generateOnlineImage({ prompt, model: model || undefined, size, quality, ratio });
        imageUrl = apiResult.image || apiResult.local_url || '';
        onDataChange(node.id, { ...node.data, isGenerating: false, result: imageUrl, resultType: 'image' });
      }
    } catch (err: any) {
      onDataChange(node.id, { ...node.data, isGenerating: false, error: err.message });
    }
    setIsGenerating(false);
  };

  const engines: { id: Engine; label: string; color: string }[] = [
    { id: 'api', label: 'API', color: 'cyan' },
    { id: 'modelscope', label: 'ModelScope', color: 'green' },
    { id: 'comfyui', label: 'ComfyUI', color: 'purple' },
  ];

  const kinds: { id: Kind; label: string }[] = [
    { id: 'image', label: '🖼 图片' },
    { id: 'video', label: '🎬 视频' },
  ];

  const ratios = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'];

  return (
    <div className="p-3 space-y-2.5" data-no-drag>
      {/* 引擎选择 */}
      <div className="flex gap-1">
        {engines.map((e) => (
          <button
            key={e.id}
            onClick={() => onDataChange(node.id, { ...node.data, engine: e.id })}
            className={`flex-1 py-1 rounded text-[10px] font-mono transition-all ${
              engine === e.id
                ? `bg-${e.color}-500/20 text-${e.color}-400 border border-${e.color}-500/30`
                : isDark ? 'bg-white/5 text-gray-500 hover:bg-white/8' : 'bg-black/5 text-gray-500 hover:bg-black/8'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* 类型切换 */}
      <div className="flex gap-1">
        {kinds.map((k) => (
          <button
            key={k.id}
            onClick={() => onDataChange(node.id, { ...node.data, kind: k.id })}
            className={`flex-1 py-1 rounded text-[10px] transition-all ${
              kind === k.id
                ? isDark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'
                : isDark ? 'bg-white/3 text-gray-500' : 'bg-black/3 text-gray-500'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* 模型 */}
      <input
        type="text"
        value={model}
        onChange={(e) => onDataChange(node.id, { ...node.data, model: e.target.value })}
        placeholder="模型名（留空自动选择）"
        className={`w-full px-2 py-1.5 rounded text-xs ${
          isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600' : 'bg-black/5 border-black/10 text-black placeholder:text-gray-400'
        } border outline-none`}
      />

      {/* 提示词 */}
      <textarea
        value={prompt}
        onChange={(e) => onDataChange(node.id, { ...node.data, prompt: e.target.value })}
        placeholder="描述你想要生成的内容..."
        rows={4}
        className={`w-full px-2 py-1.5 rounded text-xs resize-none ${
          isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600' : 'bg-black/5 border-black/10 text-black placeholder:text-gray-400'
        } border outline-none`}
      />

      {/* 比例选择 */}
      <div className="flex flex-wrap gap-1">
        {ratios.map((r) => (
          <button
            key={r}
            onClick={() => onDataChange(node.id, { ...node.data, ratio: r })}
            className={`px-2 py-0.5 rounded text-[9px] font-mono transition-all ${
              ratio === r
                ? isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-500/15 text-cyan-600'
                : isDark ? 'bg-white/5 text-gray-500' : 'bg-black/5 text-gray-500'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className={`w-full py-2.5 rounded-lg text-xs font-bold font-mono tracking-wider transition-all ${
          isGenerating
            ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 animate-pulse'
            : prompt.trim()
              ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-400 hover:from-cyan-500/25 hover:to-blue-500/25 border border-cyan-500/20'
              : 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isGenerating ? '⚡ 生成中...' : kind === 'video' ? '🎬 生成视频' : '✨ 智能生成'}
      </button>

      {/* 错误 */}
      {error && (
        <div className="text-[10px] text-red-400 bg-red-500/10 rounded px-2 py-1 break-all">{error}</div>
      )}

      {/* 结果预览 */}
      {result && (
        <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
          {(node.data.resultType === 'video') ? (
            <video src={result} controls className="w-full h-auto" />
          ) : (
            <img src={result} alt="Generated" className="w-full h-auto" />
          )}
        </div>
      )}
    </div>
  );
};
