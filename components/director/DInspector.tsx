// 文件路径: components/director/DInspector.tsx
// DirectorDeck 检视面板 — 量子相机风格

import React, { useState, useEffect } from 'react';
import { DirectorGeneratedImage, DirectorAsset } from '../../types_director';
import { Info, Download, Wand2, MessageSquare, X, ChevronRight, Edit3, Check } from 'lucide-react';
import { DButton } from './DButton';
import { useTextShortcuts } from '../useTextShortcuts';

interface DInspectorProps {
  selectedImage: DirectorGeneratedImage | null;
  selectedAsset: DirectorAsset | null;
  onClose: () => void;
  onAnalyze: (prompt: string) => void;
  isAnalyzing: boolean;
  analysisResult?: string;
  onUpdate?: (id: string, data: Partial<DirectorGeneratedImage>) => void;
}

export const DInspector: React.FC<DInspectorProps> = ({ 
  selectedImage, selectedAsset, onClose, onAnalyze, isAnalyzing, analysisResult, onUpdate
}) => {
  const item = selectedImage || selectedAsset;
  const isGenerated = !!selectedImage;
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const inputShortcuts = useTextShortcuts();

  useEffect(() => {
    if (selectedImage) {
      setEditName(selectedImage.customName || '');
      setIsEditingName(false);
    }
  }, [selectedImage]);

  const saveName = () => {
    if (selectedImage && onUpdate) {
      onUpdate(selectedImage.id, { customName: editName.trim() });
      setIsEditingName(false);
    }
  };

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-600 p-8 text-center">
        <div className="w-16 h-16 rounded-sm bg-[#0A0A0A] flex items-center justify-center mb-4 border border-gray-800">
          <Info size={24} className="opacity-40" />
        </div>
        <p className="text-[10px] uppercase font-mono font-bold tracking-widest mb-1">未选择</p>
        <p className="text-[10px] opacity-60 font-mono">选择一个资源或渲染结果</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A]">
      {/* 头部 */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-[#0A0A0A]/50">
        <span className="text-[10px] font-mono font-bold uppercase text-moke-red tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-moke-red shadow-[0_0_6px_rgba(208,0,0,0.6)]"></div>
          检视器
        </span>
        <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-sm text-gray-600 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8" style={{ scrollbarWidth: 'thin' }}>
        
        {/* 预览 */}
        <div className="space-y-3">
          <div className="aspect-video bg-black rounded-sm overflow-hidden border border-gray-800 shadow-lg group relative">
            <img 
              src={selectedImage?.url || selectedAsset?.previewUrl} 
              className="w-full h-full object-contain" 
              alt="预览" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
              <span className="text-[10px] font-mono text-white/80">预览模式</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <DButton variant="secondary" className="flex-1 text-[10px]" onClick={() => {
              const link = document.createElement('a');
              link.href = selectedImage?.url || selectedAsset?.previewUrl || '';
              let fname = `Download_${Date.now()}.png`;
              if (isGenerated && selectedImage.customName) fname = `${selectedImage.customName}.png`;
              link.download = fname;
              link.click();
            }}>
              <Download size={12} className="mr-2" /> 保存
            </DButton>
          </div>
        </div>

        {/* 文件名编辑 */}
        {isGenerated && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[9px] text-gray-500 font-mono font-bold uppercase tracking-widest pl-1">文件名覆写</label>
              {isEditingName ? (
                <div className="flex gap-2">
                  <button onClick={() => setIsEditingName(false)} className="text-[9px] text-gray-600 hover:text-white"><X size={12}/></button>
                  <button onClick={saveName} className="text-[9px] text-moke-red hover:text-white"><Check size={12}/></button>
                </div>
              ) : (
                <button onClick={() => setIsEditingName(true)} className="text-[9px] text-gray-600 hover:text-moke-red flex items-center gap-1">
                  <Edit3 size={10} /> 编辑
                </button>
              )}
            </div>
            
            {isEditingName ? (
              <div className="flex gap-2">
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={inputShortcuts.onKeyDown}
                  className="w-full bg-moke-black border border-moke-red/50 rounded-sm px-3 py-1.5 text-xs text-white outline-none font-mono"
                  placeholder="自定义文件名..." autoFocus />
              </div>
            ) : (
              <div className={`bg-[#0A0A0A] rounded-sm border p-2.5 text-xs font-mono flex items-center ${
                selectedImage.customName ? 'text-moke-red border-moke-red/20' : 'text-gray-500 border-gray-800 opacity-60'
              }`}>
                {selectedImage.customName || '使用自动命名规则'}
              </div>
            )}
          </div>
        )}

        {/* 元数据 */}
        <div className="space-y-3">
          <label className="text-[9px] text-gray-500 font-mono font-bold uppercase tracking-widest pl-1">元数据</label>
          <div className="bg-[#0A0A0A] rounded-sm border border-gray-800 p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
              <span className="text-[10px] text-gray-400 font-mono">类型</span>
              <span className="text-[10px] text-white font-mono">{isGenerated ? 'AI 渲染' : (selectedAsset?.type === 'video' ? '视频参考' : '图片参考')}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
              <span className="text-[10px] text-gray-400 font-mono">ID</span>
              <span className="text-[10px] text-gray-600 font-mono">{item.id.substring(0, 8)}...</span>
            </div>
            {isGenerated && (
              <>
                <div className="flex justify-between items-center border-b border-gray-800/50 pb-2">
                  <span className="text-[10px] text-gray-400 font-mono">比例</span>
                  <span className="text-[10px] text-white font-mono">{selectedImage.aspectRatio}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-mono">创建时间</span>
                  <span className="text-[10px] text-white font-mono">{new Date(selectedImage.timestamp).toLocaleTimeString()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 提示词 */}
        {isGenerated && (
          <div className="space-y-3">
            <label className="text-[9px] text-gray-500 font-mono font-bold uppercase tracking-widest pl-1">Prompt DNA</label>
            <div className="bg-[#0A0A0A] rounded-sm border border-gray-800 p-4 text-[11px] text-gray-400 leading-relaxed font-mono">
              {selectedImage.prompt}
            </div>
          </div>
        )}

        {/* AI 分析 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <label className="text-[9px] text-gray-500 font-mono font-bold uppercase tracking-widest">AI 视觉分析</label>
            <Wand2 size={12} className="text-moke-red animate-pulse" />
          </div>
          
          <div className="bg-gradient-to-br from-[#0A0A0A] to-moke-black rounded-sm border border-gray-800 p-1">
            <div className="p-3 min-h-[100px] max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {analysisResult ? (
                <p className="text-[11px] leading-relaxed text-gray-400 font-mono">{analysisResult}</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50 py-4">
                  <MessageSquare size={16} />
                  <span className="text-[10px] font-mono">暂无分析数据</span>
                </div>
              )}
            </div>
            <div className="p-1 border-t border-gray-800">
              <DButton 
                variant="ghost" size="sm" 
                className="w-full justify-between group hover:bg-moke-red/10 hover:text-moke-red"
                onClick={() => onAnalyze("Analyze the lighting, composition, and key elements in this image. Provide a concise director's breakdown.")}
                disabled={isAnalyzing}
              >
                <span className="text-[10px]">{isAnalyzing ? '分析中...' : '运行视觉分析'}</span>
                <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </DButton>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
