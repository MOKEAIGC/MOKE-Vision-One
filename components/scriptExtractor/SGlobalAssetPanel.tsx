// 文件路径: components/scriptExtractor/SGlobalAssetPanel.tsx
// 全局资产库展示面板 — 显示所有已提取的资产

import React, { useState } from 'react';
import { Trash2, Eye, Send, X } from 'lucide-react';
import { useGlobalAssets, GlobalAssetItem } from '../../contexts/GlobalAssetContext';

interface SGlobalAssetPanelProps {
  onPushToDirector?: (asset: GlobalAssetItem) => void;
}

export const SGlobalAssetPanel: React.FC<SGlobalAssetPanelProps> = ({ onPushToDirector }) => {
  const { assets, removeAsset, clearAssets } = useGlobalAssets();
  const [filter, setFilter] = useState<'all' | 'scene' | 'character'>('all');
  const [previewAsset, setPreviewAsset] = useState<GlobalAssetItem | null>(null);

  const filteredAssets = filter === 'all' ? assets : assets.filter(a => a.type === filter);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 头部 */}
      <div className="flex items-center justify-between min-h-[24px] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-moke-red text-[10px] font-mono font-bold tracking-widest uppercase">ASSET LIBRARY</span>
          <span className="text-[10px] bg-white/5 text-gray-600 px-2 py-0.5 rounded-sm border border-gray-800 font-mono">
            {assets.length}
          </span>
        </div>
        {assets.length > 0 && (
          <button
            onClick={clearAssets}
            className="text-[10px] font-mono text-gray-600 hover:text-moke-red transition-colors"
          >
            清空
          </button>
        )}
      </div>

      {/* 筛选标签 */}
      <div className="flex gap-2 shrink-0">
        {(['all', 'scene', 'character'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded-full transition-all ${
              filter === f
                ? 'bg-moke-red/20 text-moke-red border border-moke-red/30'
                : 'bg-white/5 text-gray-600 border border-gray-800 hover:text-white hover:border-gray-600'
            }`}
          >
            {f === 'all' ? '全部' : f === 'scene' ? '场景' : '角色'}
          </button>
        ))}
      </div>

      {/* 资产网格 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <div className="w-16 h-16 border-2 border-dashed border-gray-700 rounded-sm flex items-center justify-center">
              <Eye size={24} className="text-gray-700" />
            </div>
            <p className="text-[10px] font-mono text-gray-600">暂无资产</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="group relative">
                <div className="aspect-square rounded-sm overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer">
                  <img
                    src={asset.thumbnailBase64}
                    alt={asset.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                  {/* 悬浮操作遮罩 */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setPreviewAsset(asset)}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-sm text-white transition-colors"
                      title="预览"
                    >
                      <Eye size={12} />
                    </button>
                    <button
                      onClick={() => removeAsset(asset.id)}
                      className="p-1.5 bg-white/10 hover:bg-moke-red rounded-sm text-white transition-colors"
                      title="删除"
                    >
                      <Trash2 size={12} />
                    </button>
                    {onPushToDirector && (
                      <button
                        onClick={() => onPushToDirector(asset)}
                        className="p-1.5 bg-white/10 hover:bg-emerald-600 rounded-sm text-white transition-colors"
                        title="推送到 Director"
                      >
                        <Send size={12} />
                      </button>
                    )}
                  </div>
                </div>
                {/* 名称 + 类型 */}
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded-sm ${
                    asset.type === 'scene' ? 'bg-blue-500/20 text-blue-400' : 'bg-moke-red/20 text-moke-red'
                  }`}>
                    {asset.type === 'scene' ? '景' : '角'}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 truncate">{asset.name}</span>
                </div>
                <span className="text-[8px] font-mono text-gray-700">{formatTime(asset.timestamp)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 资产预览弹窗 */}
      {previewAsset && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8" onClick={() => setPreviewAsset(null)}>
          <div className="relative max-w-3xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewAsset(null)}
              className="absolute -top-3 -right-3 p-2 bg-moke-black border border-gray-700 rounded-full text-white hover:bg-moke-red transition-colors z-10"
            >
              <X size={14} />
            </button>
            <img
              src={previewAsset.fullImageBase64}
              alt={previewAsset.name}
              className="max-w-full max-h-[80vh] object-contain rounded-sm border border-gray-800"
            />
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm ${
                previewAsset.type === 'scene' ? 'bg-blue-500/20 text-blue-400' : 'bg-moke-red/20 text-moke-red'
              }`}>
                {previewAsset.type === 'scene' ? '场景' : '角色'}
              </span>
              <span className="text-xs font-mono text-gray-300">{previewAsset.name}</span>
            </div>
            <p className="text-[10px] font-mono text-gray-600 mt-1 break-all">{previewAsset.prompt}</p>
          </div>
        </div>
      )}
    </div>
  );
};
