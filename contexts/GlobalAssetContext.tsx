// 文件路径: contexts/GlobalAssetContext.tsx
// 全局资产库 Context — 跨窗口共享的剧本提取资产管理

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// 全局资产条目类型
export interface GlobalAssetItem {
  id: string;
  name: string;
  type: 'scene' | 'character';
  thumbnailBase64: string;
  fullImageBase64: string;
  prompt: string;
  metadata: Record<string, string>;
  timestamp: number;
}

export interface GlobalAssetContextType {
  assets: GlobalAssetItem[];
  addAsset: (asset: Omit<GlobalAssetItem, 'id' | 'timestamp'>) => void;
  removeAsset: (id: string) => void;
  clearAssets: () => void;
}

const STORAGE_KEY = 'moke_global_asset_library';

// 压缩图片为缩略图 (最大 200x200)
const compressThumbnail = (base64DataUrl: string, maxSize: number = 200): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxSize || h > maxSize) {
        const scale = Math.min(maxSize / w, maxSize / h);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(base64DataUrl);
      }
    };
    img.onerror = () => resolve(base64DataUrl);
    img.src = base64DataUrl;
  });
};

// 从 localStorage 加载资产
const loadAssets = (): GlobalAssetItem[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('读取全局资产库失败:', e);
  }
  return [];
};

const GlobalAssetContext = createContext<GlobalAssetContextType | undefined>(undefined);

export const GlobalAssetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<GlobalAssetItem[]>(loadAssets);

  // 防抖写入 localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
      } catch (e) {
        console.error('保存全局资产库失败，可能 localStorage 已满:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [assets]);

  const addAsset = useCallback(async (asset: Omit<GlobalAssetItem, 'id' | 'timestamp'>) => {
    const thumbnail = await compressThumbnail(asset.fullImageBase64);
    const newItem: GlobalAssetItem = {
      ...asset,
      thumbnailBase64: thumbnail,
      id: `ga_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    setAssets(prev => [newItem, ...prev]);
  }, []);

  const removeAsset = useCallback((id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAssets = useCallback(() => {
    setAssets([]);
  }, []);

  return (
    <GlobalAssetContext.Provider value={{ assets, addAsset, removeAsset, clearAssets }}>
      {children}
    </GlobalAssetContext.Provider>
  );
};

export const useGlobalAssets = (): GlobalAssetContextType => {
  const context = useContext(GlobalAssetContext);
  if (!context) {
    throw new Error('useGlobalAssets must be used within a GlobalAssetProvider');
  }
  return context;
};
