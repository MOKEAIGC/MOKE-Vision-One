// 文件路径: components/director/DCanvas.tsx
// DirectorDeck 画布/画廊 — 量子相机风格

import React, { useRef } from 'react';
import { DirectorGeneratedImage } from '../../types_director';
import { Trash2, Download, CheckCircle2, Circle, ZoomIn, ZoomOut, X, Maximize2, MonitorPlay, Package, Combine, Upload, CheckSquare } from 'lucide-react';
import { DButton } from './DButton';
import { DSelectionTray } from './DSelectionTray';

interface DCanvasProps {
  t: any;
  images: DirectorGeneratedImage[];
  onSelect: (image: DirectorGeneratedImage) => void;
  selectedId?: string;
  onDelete: (id: string) => void;
  onDownload: (img: DirectorGeneratedImage) => void;
  onDownloadAll: () => void;
  onMerge: () => void;
  zoom: number;
  setZoom: (z: number) => void;
  isMultiSelectMode: boolean;
  onToggleMultiSelect: () => void;
  onToggleSelectAll?: () => void;
  isAllSelected?: boolean;
  selectedExportIds: string[];
  isMerging?: boolean;
  onAddToResources: (img: DirectorGeneratedImage) => void;
  onReorderImages: (from: number, to: number) => void;
  onReorderCanvasImages: (from: number, to: number) => void;
  onImport: (files: FileList) => void;
}

export const DCanvas: React.FC<DCanvasProps> = ({ 
  t, images, onSelect, selectedId, onDelete, onDownload, onDownloadAll, onMerge,
  zoom, setZoom, isMultiSelectMode, onToggleMultiSelect, onToggleSelectAll, isAllSelected,
  selectedExportIds, isMerging = false, onAddToResources, onReorderImages, onReorderCanvasImages, onImport
}) => {
  const [fullscreenImg, setFullscreenImg] = React.useState<DirectorGeneratedImage | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = React.useState(false);

  const handleDragStart = (e: React.DragEvent, img: DirectorGeneratedImage) => {
    setDraggedId(img.id);
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('application/json', JSON.stringify(img));
    e.dataTransfer.setData('text/plain', img.url);
  };

  const handleDragOverItem = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleDropItem = (e: React.DragEvent, targetId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (draggedId && draggedId !== targetId) {
      const fromIndex = images.findIndex(img => img.id === draggedId);
      const toIndex = images.findIndex(img => img.id === targetId);
      if (fromIndex !== -1 && toIndex !== -1) onReorderCanvasImages(fromIndex, toIndex);
    }
    setDraggedId(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('Files')) { setIsDraggingOverCanvas(true); e.dataTransfer.dropEffect = 'copy'; }
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingOverCanvas(false); };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDraggingOverCanvas(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) onImport(e.dataTransfer.files);
  };

  const gridColumns = {
    1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4',
    5: 'grid-cols-5', 6: 'grid-cols-6', 7: 'grid-cols-8',
  }[zoom] || 'grid-cols-4';

  const selectedImagesForTray = selectedExportIds
    .map(id => images.find(img => img.id === id))
    .filter((img): img is DirectorGeneratedImage => !!img)
    .map(img => ({ id: img.id, url: img.url }));

  return (
    <div className="flex flex-col h-full relative" onDragOver={handleCanvasDragOver} onDragLeave={handleCanvasDragLeave} onDrop={handleCanvasDrop}>
      {/* 拖拽覆盖层 */}
      {isDraggingOverCanvas && (
        <div className="absolute inset-0 z-50 bg-moke-red/20 backdrop-blur-sm border-4 border-dashed border-moke-red flex items-center justify-center rounded-sm m-4">
          <div className="bg-moke-black/80 p-6 rounded-sm flex flex-col items-center gap-4 shadow-2xl">
            <Upload size={48} className="text-moke-red animate-bounce" />
            <h3 className="text-xl font-mono font-bold uppercase tracking-widest text-white">拖放导入</h3>
          </div>
        </div>
      )}

      {/* 头部工具栏 */}
      <div className="h-16 border-b border-gray-800 bg-moke-black/60 backdrop-blur-xl flex items-center justify-between px-6 z-10 sticky top-0 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="pl-1">
            <h2 className="text-moke-red text-[10px] font-mono font-bold uppercase tracking-[0.2em] leading-none mb-1">{t.canvas}</h2>
            <span className="text-[11px] text-gray-400 font-mono">
              {images.length} <span className="text-gray-600">已渲染</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8">
          {/* 缩放滑块 */}
          <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-sm border border-gray-800 hover:border-gray-700 transition-colors">
            <ZoomOut size={13} className="text-gray-600" />
            <input type="range" min="1" max="7" step="1" value={zoom} onChange={(e) => setZoom(parseInt(e.target.value))}
              className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-moke-red" />
            <ZoomIn size={13} className="text-gray-600" />
          </div>

          <div className="flex items-center gap-3">
            <input type="file" ref={importFileRef} className="hidden" multiple accept="image/*"
              onChange={(e) => { if (e.target.files && e.target.files.length > 0) onImport(e.target.files); }} />
            <DButton variant="secondary" size="sm" className="px-3 gap-2 border-dashed" onClick={() => importFileRef.current?.click()}>
              <Upload size={12} /> 导入
            </DButton>

            <button onClick={onToggleMultiSelect}
              className={`flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all border ${
                isMultiSelectMode 
                ? 'bg-moke-red text-white border-transparent shadow-[0_0_12px_rgba(208,0,0,0.2)]' 
                : 'bg-white/5 text-gray-400 border-gray-800 hover:bg-white/10'
              }`}>
              {isMultiSelectMode ? <CheckCircle2 size={12} /> : <Circle size={12} />}
              {isMultiSelectMode ? '选择中' : '选择'}
            </button>

            {isMultiSelectMode && onToggleSelectAll && (
              <button onClick={onToggleSelectAll}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all border ${
                  isAllSelected ? 'bg-moke-red/20 text-moke-red border-moke-red/50' : 'bg-white/5 text-gray-400 border-gray-800 hover:bg-white/10'
                }`}>
                <CheckSquare size={12} /> {isAllSelected ? '取消' : '全选'}
              </button>
            )}

            {!isMultiSelectMode && (
              <DButton variant="gradient" size="sm" className="px-5 gap-2" onClick={onDownloadAll} disabled={images.length === 0}>
                <Package size={14} /> 导出全部
              </DButton>
            )}
          </div>
        </div>
      </div>

      {/* 画廊网格 */}
      <div className={`flex-1 overflow-y-auto p-8 ${isMultiSelectMode && selectedImagesForTray.length > 0 ? 'pb-32' : ''}`} style={{ scrollbarWidth: 'thin' }}>
        {images.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-30 gap-6">
            <div className="w-24 h-24 rounded-sm border-2 border-dashed border-gray-700 flex items-center justify-center animate-pulse">
              <MonitorPlay size={40} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-mono font-bold uppercase tracking-[0.2em]">{t.startTitle}</h3>
              <p className="text-xs font-mono mt-3 max-w-xs leading-relaxed">{t.startDesc}</p>
            </div>
          </div>
        ) : (
          <div className={`grid ${gridColumns} gap-6 transition-all duration-500 ease-in-out`}>
            {images.map((img) => {
              const isSelected = selectedId === img.id;
              const isMultiSelected = selectedExportIds.includes(img.id);
              
              return (
                <div 
                  key={img.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, img)}
                  onDragOver={handleDragOverItem}
                  onDrop={(e) => handleDropItem(e, img.id)}
                  onClick={() => onSelect(img)}
                  onDoubleClick={() => setFullscreenImg(img)}
                  className={`
                    relative group rounded-sm bg-[#0A0A0A] border transition-all duration-300 cursor-pointer overflow-hidden shadow-2xl
                    ${isMultiSelectMode 
                      ? (isMultiSelected ? 'border-moke-red ring-4 ring-moke-red/20' : 'border-gray-800 opacity-60 hover:opacity-100 hover:border-gray-700')
                      : (isSelected ? 'border-moke-red shadow-[0_0_20px_rgba(208,0,0,0.1)] scale-[1.02] z-10' : 'border-gray-800 hover:border-gray-700')
                    }
                    ${draggedId === img.id ? 'opacity-50 scale-95' : ''}
                  `}
                >
                  {isMultiSelectMode && (
                    <div className="absolute top-4 left-4 z-20">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isMultiSelected ? 'bg-moke-red border-moke-red shadow-[0_0_8px_rgba(208,0,0,0.5)]' : 'bg-black/40 border-white/30 backdrop-blur-md'
                      }`}>
                        {isMultiSelected && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                    </div>
                  )}

                  <div className="aspect-video bg-black relative">
                    <img src={img.url} alt="渲染结果" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    
                    {!isMultiSelectMode && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4 backdrop-blur-[2px]">
                        <button onClick={(e) => { e.stopPropagation(); onDownload(img); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-sm text-white backdrop-blur-xl transition-all hover:scale-110 active:scale-95 border border-white/10" title={t.download}>
                          <Download size={18} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onAddToResources(img); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-sm text-white backdrop-blur-xl transition-all hover:scale-110 active:scale-95 border border-white/10" title={t.addToResources}>
                          <Maximize2 size={18} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setFullscreenImg(img); }} className="p-3 bg-white/10 hover:bg-white/20 rounded-sm text-white backdrop-blur-xl transition-all hover:scale-110 active:scale-95 border border-white/10" title={t.inspector}>
                          <Maximize2 size={18} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(img.id); }} className="p-3 bg-moke-red/20 hover:bg-moke-red/40 text-red-100 rounded-sm backdrop-blur-xl transition-all hover:scale-110 active:scale-95 border border-moke-red/10" title={t.delete}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {zoom < 6 && (
                    <div className="p-4 bg-[#0A0A0A]/90 border-t border-gray-800 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-gray-600 font-mono tracking-tighter">
                          ID: {img.id.substring(0,6)} • {new Date(img.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                        <div className="px-1.5 py-0.5 rounded-sm bg-moke-red/10 text-[8px] text-moke-red font-mono font-bold border border-moke-red/10">
                          {img.aspectRatio}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate font-mono opacity-80 italic">
                        {img.prompt.replace(/\[.*?\]\s*/, '')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 选择托盘 */}
      {isMultiSelectMode && (
        <DSelectionTray 
          items={selectedImagesForTray}
          onReorder={onReorderImages}
          onRemove={(id) => onSelect({ id } as any)}
          label="合并序列"
          actions={
            <>
              <DButton variant="secondary" size="sm" className="px-4 gap-2" onClick={onMerge} disabled={selectedImagesForTray.length < 2 || isMerging}>
                <Combine size={14} /> {isMerging ? t.merging : t.merge}
              </DButton>
              <DButton variant="gradient" size="sm" className="px-4 gap-2" onClick={onDownloadAll} disabled={selectedImagesForTray.length === 0}>
                <Package size={14} /> 导出
              </DButton>
            </>
          }
        />
      )}

      {/* 全屏预览 */}
      {fullscreenImg && (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8 select-none cursor-zoom-out"
          onClick={() => setFullscreenImg(null)}>
          <div className="relative max-w-full max-h-full flex flex-col items-center gap-8" onClick={(e) => e.stopPropagation()}>
            <div className="relative shadow-2xl rounded-sm overflow-hidden border border-gray-800">
              <img src={fullscreenImg.url} className="max-w-[95vw] max-h-[85vh] object-contain" alt="全屏预览" />
              <div className="absolute top-6 right-6 flex items-center gap-4">
                <button onClick={() => onDownload(fullscreenImg)} className="p-4 bg-[#0A0A0A]/80 hover:bg-moke-red text-white rounded-sm backdrop-blur-2xl transition-all shadow-2xl border border-gray-800 group">
                  <Download size={22} className="group-hover:scale-110 transition-transform" />
                </button>
                <button onClick={() => setFullscreenImg(null)} className="p-4 bg-[#0A0A0A]/80 hover:bg-moke-red/40 text-white rounded-sm backdrop-blur-2xl transition-all shadow-2xl border border-gray-800">
                  <X size={22} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
