// 文件路径: components/canvas/nodes/ImageNode.tsx
// 图片节点 — 显示/上传图片，可作为参考图输入

import React, { useCallback, useRef } from 'react';
import { CanvasNode } from '../types';

interface ImageNodeProps {
  node: CanvasNode;
  isDark: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
  isSelected: boolean;
}

export const ImageNode: React.FC<ImageNodeProps> = ({ node, isDark, onDataChange, isSelected }) => {
  const imageUrl = node.data.imageUrl as string | undefined;
  const caption = (node.data.caption as string) || '';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const handleImageLoad = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onDataChange(node.id, { ...node.data, imageUrl: e.target?.result as string });
    };
    reader.readAsDataURL(file);
  }, [node.id, node.data, onDataChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageLoad(file);
    }
  }, [handleImageLoad]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageLoad(file);
  }, [handleImageLoad]);

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
          IMAGE
        </span>
        {imageUrl && (
          <button
            onClick={() => onDataChange(node.id, { ...node.data, imageUrl: undefined })}
            className={`text-[9px] px-2 py-0.5 rounded-full transition-all ${
              isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-50 text-red-500'
            }`}
          >
            清除
          </button>
        )}
      </div>
      {/* 图片区域 */}
      <div className="flex-1 p-2.5 flex flex-col gap-2 min-h-0">
        {imageUrl ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <img
              src={imageUrl}
              alt="node-image"
              className="max-w-full max-h-full object-contain rounded-xl"
              draggable={false}
            />
          </div>
        ) : (
          <div
            className={`flex-1 min-h-[120px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              isDragOver
                ? isDark ? 'border-cyan-400 bg-cyan-500/10' : 'border-cyan-500 bg-cyan-50'
                : isDark ? 'border-white/15 hover:border-white/30 text-gray-500' : 'border-gray-300 hover:border-gray-400 text-gray-400'
            }`}
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
              <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.5} />
              <path d="M21 15l-5-5L5 21" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] font-mono font-bold tracking-wider">
              拖放或点击上传
            </span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
