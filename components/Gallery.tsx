import React, { useState } from 'react';
import { CapturedImage } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Download, DownloadCloud, Image as ImageIcon } from 'lucide-react';

// Electron 环境检测
function getElectronAPI(): any | null {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
    return (window as any).electronAPI;
  }
  return null;
}

interface GalleryProps {
  images: CapturedImage[];
  onSelect: (img: CapturedImage) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ images, onSelect }) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [imageSize, setImageSize] = useState(120);

  const handleDownloadSingle = async (e: React.MouseEvent, img: CapturedImage) => {
    e.stopPropagation();
    const api = getElectronAPI();
    if (api?.downloadImage) {
      // Electron 环境：弹出系统另存为对话框
      try {
        await api.downloadImage(img.url, `moke-vision-${img.id}.png`);
      } catch (err) {
        console.error('下载图片失败:', err);
      }
    } else {
      // 浏览器环境：降级使用 file-saver
      saveAs(img.url, `moke-vision-${img.id}.png`);
    }
  };

  const handleDownloadAll = async () => {
    if (images.length === 0) return;
    
    const zip = new JSZip();
    images.forEach((img) => {
      // Extract base64 data
      const base64Data = img.url.split(',')[1];
      if (base64Data) {
        zip.file(`moke-vision-${img.id}.png`, base64Data, { base64: true });
      }
    });

    const api = getElectronAPI();
    if (api?.downloadBlob) {
      // Electron 环境：生成 Uint8Array，通过 IPC 弹出系统另存为
      try {
        const content = await zip.generateAsync({ type: 'uint8array' });
        await api.downloadBlob(content, 'moke-vision-gallery.zip');
      } catch (err) {
        console.error('批量下载失败:', err);
      }
    } else {
      // 浏览器环境：降级使用 file-saver
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'moke-vision-gallery.zip');
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-gray-500 font-mono uppercase tracking-wider">
          {t('GALLERY_TITLE')}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 group" title="Adjust Image Size">
            <ImageIcon size={14} className="text-gray-500 group-hover:text-moke-red transition-colors" />
            <input 
              type="range" 
              min="60" 
              max="240" 
              value={imageSize} 
              onChange={(e) => setImageSize(Number(e.target.value))}
              className={`w-20 h-1 rounded-lg appearance-none cursor-pointer accent-moke-red ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`}
            />
          </div>
          {images.length > 0 && (
            <button
              onClick={handleDownloadAll}
              className="text-gray-500 hover:text-moke-red transition-colors flex items-center gap-1"
              title="Download All"
            >
              <DownloadCloud size={16} />
            </button>
          )}
        </div>
      </div>
      <div 
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${imageSize}px, 1fr))` }}
      >
        {images.map((img) => (
          <div key={img.id} className="relative group aspect-square">
            <button
              onClick={() => onSelect(img)}
              className="w-full h-full border border-gray-700 rounded overflow-hidden hover:border-moke-red transition-colors"
            >
              <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-moke-red/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
            <button
              onClick={(e) => handleDownloadSingle(e, img)}
              className="absolute bottom-2 right-2 p-1.5 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 hover:bg-moke-red transition-all"
              title="Download Image"
            >
              <Download size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};