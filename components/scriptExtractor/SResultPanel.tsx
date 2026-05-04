// 文件路径: components/scriptExtractor/SResultPanel.tsx
// 提取结果与图片生成面板

import React from 'react';
import { Loader2, Download, Database, ImagePlus } from 'lucide-react';
import { SceneDiptychResult, CharacterSheetResult } from '../../services/scriptExtractorService';

interface GeneratedImage {
  id: string;
  url: string;
  type: 'scene_diptych' | 'character_concept' | 'character_sheet';
  prompt: string;
  label: string;
}

interface SResultPanelProps {
  sceneResult: SceneDiptychResult | null;
  characterResult: CharacterSheetResult | null;
  generatedImages: GeneratedImage[];
  isGenerating: boolean;
  generatingType: string | null;
  onGenerateScene: () => void;
  onGenerateCharacterConcept: () => void;
  onGenerateCharacterSheet: () => void;
  onSaveToLibrary: (image: GeneratedImage) => void;
  onDownload: (image: GeneratedImage) => void;
}

export type { GeneratedImage };

export const SResultPanel: React.FC<SResultPanelProps> = ({
  sceneResult, characterResult,
  generatedImages, isGenerating, generatingType,
  onGenerateScene, onGenerateCharacterConcept, onGenerateCharacterSheet,
  onSaveToLibrary, onDownload,
}) => {
  const hasResult = sceneResult || characterResult;
  const typeLabels: Record<string, string> = {
    scene_diptych: '场景双联画',
    character_concept: '角色概念图',
    character_sheet: '角色三视图',
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between min-h-[24px] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-[10px] font-mono font-bold tracking-widest uppercase">PREVIEW</span>
          {generatedImages.length > 0 && (
            <span className="text-[10px] bg-white/5 text-gray-600 px-2 py-0.5 rounded-sm border border-gray-800 font-mono">
              {generatedImages.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sceneResult && (
            <button
              onClick={onGenerateScene}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-moke-red to-[#900000] text-white text-[10px] font-mono font-bold rounded-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating && generatingType === 'scene' ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
              生成场景
            </button>
          )}
          {characterResult && (
            <>
              <button
                onClick={onGenerateCharacterConcept}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-moke-red to-[#900000] text-white text-[10px] font-mono font-bold rounded-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating && generatingType === 'concept' ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                概念图
              </button>
              <button
                onClick={onGenerateCharacterSheet}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-moke-red to-[#900000] text-white text-[10px] font-mono font-bold rounded-sm hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating && generatingType === 'sheet' ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                三视图
              </button>
            </>
          )}
        </div>
      </div>

      {/* 图片预览区 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {generatedImages.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <div className="w-20 h-20 border-2 border-dashed border-gray-700 rounded-sm flex items-center justify-center">
              <ImagePlus size={28} className="text-gray-700" />
            </div>
            <p className="text-xs font-mono text-gray-600 text-center">
              {hasResult ? '点击上方按钮生成图片' : '输入剧本文本，提取场景和角色资产'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* 生成中 loading */}
            {isGenerating && (
              <div className="aspect-video bg-[#0A0A0A] border border-gray-800 rounded-sm flex flex-col items-center justify-center gap-3 animate-pulse">
                <Loader2 size={32} className="text-moke-red animate-spin" />
                <span className="text-[10px] font-mono text-gray-500">
                  正在生成 {generatingType === 'scene' ? '场景双联画' : generatingType === 'concept' ? '角色概念图' : '角色三视图'}...
                </span>
              </div>
            )}

            {/* 已生成的图片 */}
            {generatedImages.map((img) => (
              <div key={img.id} className="group relative">
                <div className="relative overflow-hidden rounded-sm border border-gray-800 hover:border-gray-600 transition-colors">
                  <img
                    src={img.url}
                    alt={img.label}
                    className="w-full object-contain bg-[#0A0A0A]"
                  />
                  {/* 悬浮操作遮罩 */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={() => onDownload(img)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-sm text-white transition-colors"
                      title="下载"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => onSaveToLibrary(img)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-moke-red to-[#900000] text-white text-[10px] font-mono font-bold rounded-sm hover:brightness-110 transition-all"
                    >
                      <Database size={14} />
                      存入资产库
                    </button>
                  </div>
                </div>
                {/* 图片信息 */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-mono font-bold text-moke-red bg-moke-red/10 px-2 py-0.5 rounded-sm">
                    {typeLabels[img.type] || img.type}
                  </span>
                  <span className="text-[10px] font-mono text-gray-600 truncate flex-1">{img.prompt.slice(0, 60)}...</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
