// 文件路径: components/canvas/nodes/OutputNode.tsx
// 输出节点 — 展示最终生成结果 + 一键全部下载 + 点击放大预览 + 从图片创建节点

import React from 'react';
import { CanvasNode, CanvasConnection } from '../types';

interface OutputNodeProps {
  node: CanvasNode;
  isDark: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
  isSelected: boolean;
  connections: CanvasConnection[];
  nodes: CanvasNode[];
  onPreviewImage?: (url: string) => void;
  onCreateImageNode?: (imageUrl: string) => void;
}

export const OutputNode: React.FC<OutputNodeProps> = ({
  node, isDark, onDataChange, isSelected, connections, nodes, onPreviewImage, onCreateImageNode,
}) => {
  const outputImages = (node.data.images as string[]) || [];

  // 从上游 Generator 节点收集生成图片
  const getUpstreamImages = (): string[] => {
    const inputConns = connections.filter((c) => c.toNodeId === node.id);
    const images: string[] = [];
    for (const conn of inputConns) {
      const sourceNode = nodes.find((n) => n.id === conn.fromNodeId);
      if (sourceNode?.type === 'generator') {
        const genImages = (sourceNode.data.generatedImages as string[]) || [];
        images.push(...genImages);
      }
      if (sourceNode?.type === 'image' && sourceNode.data.imageUrl) {
        images.push(sourceNode.data.imageUrl as string);
      }
    }
    return images;
  };

  const displayImages = outputImages.length > 0 ? outputImages : getUpstreamImages();

  // 一键全部下载
  const handleDownloadAll = () => {
    displayImages.forEach((img, idx) => {
      const a = document.createElement('a');
      a.href = img;
      a.download = `canvas-output-${Date.now()}-${idx + 1}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b cursor-move select-none ${
          isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]'
        }`}
        data-drag-handle
      >
        <span className={`text-[10px] font-mono font-bold tracking-[0.12em] uppercase ${
          isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
        }`}>
          OUTPUT
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>
            {displayImages.length} 张
          </span>
          {/* 一键全部下载 */}
          {displayImages.length > 0 && (
            <button
              onClick={handleDownloadAll}
              onMouseDown={(e) => e.stopPropagation()}
              className={`px-2 py-0.5 text-[9px] font-mono font-bold transition-colors ${
                isDark ? 'text-[#888] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#999] hover:text-[#dc2626] hover:bg-[#fff0f0]'
              }`}
              title="全部下载"
            >
              ↓ 全部
            </button>
          )}
        </div>
      </div>

      {/* 图片展示 */}
      <div className="flex-1 p-2.5 overflow-auto" onMouseDown={(e) => e.stopPropagation()}>
        {displayImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {displayImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <div className={`w-full aspect-square ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#f0f0f0]'}`}>
                  <img
                    src={img}
                    alt={`output-${idx}`}
                    className={`w-full h-full object-contain cursor-pointer transition-all hover:opacity-80 ${
                      isDark ? 'border border-[#1f1f1f]' : 'border border-[#e0e0e0]'
                    }`}
                    draggable={false}
                    onClick={() => onPreviewImage?.(img)}
                  />
                </div>
                {/* 操作按钮组 */}
                <div className="absolute bottom-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* 生成图片节点 */}
                  {onCreateImageNode && (
                    <button
                      onClick={() => onCreateImageNode(img)}
                      className={`w-5 h-5 flex items-center justify-center ${
                        isDark ? 'bg-black/80 text-[#ff4444] hover:text-white' : 'bg-white/90 text-[#dc2626] hover:text-[#b91c1c] border border-[#ddd]'
                      }`}
                      title="创建图片节点"
                    >
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" />
                      </svg>
                    </button>
                  )}
                  {/* 单张下载按钮 */}
                  <button
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = img;
                      a.download = `canvas-output-${Date.now()}-${idx}.png`;
                      a.click();
                    }}
                    className={`w-5 h-5 flex items-center justify-center ${
                      isDark ? 'bg-black/80 text-white' : 'bg-white/90 text-[#333] border border-[#ddd]'
                    }`}
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`h-full flex flex-col items-center justify-center gap-2 ${
            isDark ? 'text-[#444]' : 'text-[#bbb]'
          }`}>
            <span className="text-2xl opacity-40">◎</span>
            <span className="text-[10px] font-mono">等待输出</span>
          </div>
        )}
      </div>

    </div>
  );
};
