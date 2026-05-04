// 文件路径: components/director/DAssetBay.tsx
// DirectorDeck 参考资源面板 — 量子相机风格

import React, { useRef, useState } from 'react';
import { X, Film, Plus, CheckCircle2, Circle, Combine, CheckSquare, Database } from 'lucide-react';
import { DirectorAsset } from '../../types_director';
import { DSelectionTray } from './DSelectionTray';
import { useGlobalAssets, GlobalAssetItem } from '../../contexts/GlobalAssetContext';
import { base64ToFile } from '../../services/directorGeminiService';

interface DAssetBayProps {
  assets: DirectorAsset[];
  onAddAsset: (files: FileList) => void;
  onRemoveAsset: (id: string) => void;
  onSelectAsset: (asset: DirectorAsset) => void;
  selectedAssetId?: string;
  isMultiSelectMode?: boolean;
  selectedAssetIds?: string[];
  onToggleMultiSelect?: () => void;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
  onToggleAssetSelection?: (id: string) => void;
  onMergeAssets?: () => void;
  onReorderAssets?: (from: number, to: number) => void;
  onAddToResources?: (img: any) => void;
}

export const DAssetBay: React.FC<DAssetBayProps> = ({ 
  assets, onAddAsset, onRemoveAsset, onSelectAsset, selectedAssetId,
  isMultiSelectMode = false, selectedAssetIds = [],
  onToggleMultiSelect, onToggleSelectAll, isAllSelected,
  onToggleAssetSelection, onMergeAssets, onReorderAssets, onAddToResources
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const [showGlobalAssets, setShowGlobalAssets] = useState(false);

  // 全局资产库 — 安全访问（可能不在 Provider 内）
  let globalAssets: GlobalAssetItem[] = [];
  try {
    const ctx = useGlobalAssets();
    globalAssets = ctx.assets;
  } catch { /* 未在 GlobalAssetProvider 内时忽略 */ }

  // 导入全局资产到 Director 资源库
  const handleImportGlobalAsset = (asset: GlobalAssetItem) => {
    if (onAddToResources) {
      onAddToResources({ url: asset.fullImageBase64, name: asset.name });
    }
  };

  const selectedAssetsForTray = selectedAssetIds
    .map(id => assets.find(a => a.id === id))
    .filter((a): a is DirectorAsset => !!a)
    .map(a => ({ id: a.id, url: a.previewUrl }));

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingOver(false); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddAsset(e.dataTransfer.files);
      return;
    }
    const data = e.dataTransfer.getData('application/json');
    if (data && onAddToResources) {
      try {
        const img = JSON.parse(data);
        if (img && img.url) onAddToResources(img);
      } catch (err) { console.error("拖放解析失败", err); }
    }
  };

  return (
    <div 
      className={`flex flex-col h-full space-y-4 relative ${isDraggingOver ? 'bg-moke-red/10 rounded-sm ring-2 ring-moke-red/50' : ''}`}
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      {/* 工具栏 */}
      <div className="flex items-center justify-between min-h-[24px]">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-[10px] font-mono font-bold tracking-widest uppercase">资源库</span>
          {!isMultiSelectMode && <span className="text-[10px] bg-white/5 text-gray-600 px-2 py-0.5 rounded-sm border border-gray-800 font-mono">{assets.length}</span>}
        </div>
        
        <div className="flex items-center gap-2">
          {/* 全局资产库导入按钮 */}
          {globalAssets.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowGlobalAssets(!showGlobalAssets)}
                className={`p-1 transition-colors ${showGlobalAssets ? 'text-moke-red' : 'text-gray-600 hover:text-white'}`}
                title="从全局资产库导入"
              >
                <Database size={14} />
              </button>
              {/* 全局资产弹出面板 */}
              {showGlobalAssets && (
                <div className="absolute top-8 right-0 w-64 max-h-72 bg-[#0A0A0A] border border-gray-800 rounded-sm shadow-2xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-800 flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-moke-red tracking-widest">全局资产库</span>
                    <button onClick={() => setShowGlobalAssets(false)} className="text-gray-600 hover:text-white"><X size={12} /></button>
                  </div>
                  <div className="overflow-y-auto max-h-56 p-2 grid grid-cols-3 gap-1.5">
                    {globalAssets.map((ga) => (
                      <div
                        key={ga.id}
                        onClick={() => { handleImportGlobalAsset(ga); setShowGlobalAssets(false); }}
                        className="aspect-square rounded-sm overflow-hidden border border-gray-800 hover:border-moke-red cursor-pointer transition-colors group"
                        title={`导入: ${ga.name}`}
                      >
                        <img src={ga.thumbnailBase64} alt={ga.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {assets.length > 0 && onToggleMultiSelect && (
            <>
              {isMultiSelectMode && onToggleSelectAll && (
              <button onClick={onToggleSelectAll} className={`p-1 transition-colors ${isAllSelected ? 'text-moke-red' : 'text-gray-600 hover:text-white'}`}>
                <CheckSquare size={14} />
              </button>
            )}
            {isMultiSelectMode ? (
              <button onClick={onToggleMultiSelect} className="p-1 text-gray-400 hover:text-white transition-colors"><X size={14} /></button>
            ) : (
              <button onClick={onToggleMultiSelect} className="p-1 text-gray-600 hover:text-white transition-colors"><CheckCircle2 size={14} /></button>
            )}
            </>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-3 gap-3 ${isMultiSelectMode && selectedAssetsForTray.length > 0 ? 'pb-24' : ''}`}>
        {!isMultiSelectMode && (
          <div 
            className="aspect-square rounded-sm border border-dashed border-gray-800 bg-white/5 hover:bg-white/10 hover:border-moke-red/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*"
              onChange={(e) => { if (e.target.files && e.target.files.length > 0) onAddAsset(e.target.files); }}
            />
            <div className="p-2 rounded-sm bg-moke-black group-hover:bg-moke-red/20 transition-colors">
              <Plus size={16} className="text-gray-500 group-hover:text-moke-red" />
            </div>
            <span className="text-[10px] font-mono text-gray-600">添加</span>
          </div>
        )}

        {assets.map((asset) => {
          const isSelected = isMultiSelectMode ? selectedAssetIds.includes(asset.id) : selectedAssetId === asset.id;
          return (
            <div 
              key={asset.id}
              onClick={() => isMultiSelectMode && onToggleAssetSelection ? onToggleAssetSelection(asset.id) : onSelectAsset(asset)}
              className={`relative group aspect-square rounded-sm overflow-hidden cursor-pointer border-2 transition-all shadow-lg ${
                isSelected ? 'border-moke-red ring-2 ring-moke-red/20' : 'border-transparent hover:border-gray-700'
              } ${isMultiSelectMode && !isSelected ? 'opacity-60 hover:opacity-100' : ''}`}
            >
              {asset.type === 'video' ? (
                <div className="w-full h-full bg-[#0A0A0A] flex items-center justify-center"><Film size={20} className="text-gray-600" /></div>
              ) : (
                <img src={asset.previewUrl} alt="asset" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              )}
              
              {isMultiSelectMode && (
                <div className="absolute top-2 left-2 z-10">
                  {isSelected ? <CheckCircle2 size={16} className="text-moke-red bg-black/50 rounded-full" /> : <Circle size={16} className="text-white/50" />}
                </div>
              )}

              {!isMultiSelectMode && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onRemoveAsset(asset.id); }}
                  className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-moke-red"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {isMultiSelectMode && onReorderAssets && (
        <DSelectionTray 
          items={selectedAssetsForTray}
          onReorder={onReorderAssets}
          onRemove={(id) => onToggleAssetSelection && onToggleAssetSelection(id)}
          actions={
            onMergeAssets && (
              <button 
                onClick={onMergeAssets}
                disabled={selectedAssetsForTray.length < 2}
                className="p-2 bg-moke-red/20 hover:bg-moke-red text-moke-red hover:text-white rounded-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Combine size={14} />
              </button>
            )
          }
        />
      )}
    </div>
  );
};
