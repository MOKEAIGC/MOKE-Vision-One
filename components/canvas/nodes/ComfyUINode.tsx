// 文件路径: components/canvas/nodes/ComfyUINode.tsx
// ComfyUI 工作流节点 — 连接本地 ComfyUI 实例执行工作流

import React, { useState, useEffect } from 'react';
import { CanvasNode } from '../types';
import { getWorkflows, comfyuiGenerate, WorkflowInfo } from '../../../services/canvasBackendService';

interface ComfyUINodeProps {
  node: CanvasNode;
  isDark: boolean;
  isSelected: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
}

export const ComfyUINode: React.FC<ComfyUINodeProps> = ({ node, isDark, onDataChange }) => {
  const [workflows, setWorkflows] = useState<WorkflowInfo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    getWorkflows().then(setWorkflows).catch(() => {});
  }, []);

  const selectedWorkflow = (node.data.workflow as string) || '';
  const params = (node.data.params as Record<string, any>) || {};
  const generatedImage = node.data.generatedImage as string | undefined;
  const error = node.data.error as string | undefined;

  const currentWorkflowInfo = workflows.find((w) => w.name === selectedWorkflow);

  const handleGenerate = async () => {
    if (!selectedWorkflow) return;
    setIsGenerating(true);
    onDataChange(node.id, { ...node.data, isGenerating: true, error: undefined });
    try {
      const result = await comfyuiGenerate({
        workflow: selectedWorkflow,
        prompt: (node.data.prompt as string) || '',
        params,
        size: (node.data.size as string) || '1024x1024',
        seed: node.data.seed as number | undefined,
      });
      onDataChange(node.id, {
        ...node.data,
        isGenerating: false,
        generatedImage: result.image || result.local_url,
        generatedImages: [...((node.data.generatedImages as string[]) || []), result.image || result.local_url],
      });
    } catch (err: any) {
      onDataChange(node.id, { ...node.data, isGenerating: false, error: err.message });
    }
    setIsGenerating(false);
  };

  return (
    <div className="p-3 space-y-2.5" data-no-drag>
      {/* 工作流选择 */}
      <div>
        <label className={`text-[9px] font-mono uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Workflow
        </label>
        <select
          value={selectedWorkflow}
          onChange={(e) => onDataChange(node.id, { ...node.data, workflow: e.target.value })}
          className={`w-full mt-1 px-2 py-1.5 rounded text-xs ${
            isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
          } border outline-none`}
        >
          <option value="">选择工作流...</option>
          {workflows.map((w) => (
            <option key={w.name} value={w.name}>{w.title || w.name}</option>
          ))}
        </select>
      </div>

      {/* 提示词 */}
      <div>
        <label className={`text-[9px] font-mono uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          Prompt
        </label>
        <textarea
          value={(node.data.prompt as string) || ''}
          onChange={(e) => onDataChange(node.id, { ...node.data, prompt: e.target.value })}
          placeholder="提示词..."
          rows={3}
          className={`w-full mt-1 px-2 py-1.5 rounded text-xs resize-none ${
            isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-gray-600' : 'bg-black/5 border-black/10 text-black placeholder:text-gray-400'
          } border outline-none`}
        />
      </div>

      {/* 工作流参数 */}
      {currentWorkflowInfo?.fields && currentWorkflowInfo.fields.length > 0 && (
        <div className="space-y-1.5">
          <label className={`text-[9px] font-mono uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Parameters
          </label>
          {currentWorkflowInfo.fields.map((field) => (
            <div key={field.key} className="flex items-center gap-2">
              <span className={`text-[10px] w-20 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {field.label}
              </span>
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={params[field.key] ?? field.default ?? ''}
                onChange={(e) => onDataChange(node.id, { ...node.data, params: { ...params, [field.key]: e.target.value } })}
                className={`flex-1 px-1.5 py-0.5 rounded text-[10px] ${
                  isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
                } border outline-none`}
              />
            </div>
          ))}
        </div>
      )}

      {/* Seed */}
      <div className="flex items-center gap-2">
        <label className={`text-[9px] font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Seed</label>
        <input
          type="number"
          value={(node.data.seed as number) ?? ''}
          onChange={(e) => onDataChange(node.id, { ...node.data, seed: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="随机"
          className={`flex-1 px-1.5 py-0.5 rounded text-[10px] ${
            isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-black/5 border-black/10 text-black'
          } border outline-none`}
        />
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !selectedWorkflow}
        className={`w-full py-2 rounded-lg text-xs font-mono tracking-wider transition-all ${
          isGenerating
            ? 'bg-orange-500/20 text-orange-400 animate-pulse'
            : selectedWorkflow
              ? 'bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30'
              : 'bg-gray-500/10 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isGenerating ? '⚡ 执行中...' : '▶ ComfyUI 生成'}
      </button>

      {/* 错误 */}
      {error && (
        <div className="text-[10px] text-red-400 bg-red-500/10 rounded px-2 py-1 break-all">{error}</div>
      )}

      {/* 预览 */}
      {generatedImage && (
        <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
          <img src={generatedImage} alt="ComfyUI Output" className="w-full h-auto" />
        </div>
      )}
    </div>
  );
};
