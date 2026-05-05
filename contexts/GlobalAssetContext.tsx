// 文件路径: contexts/GlobalAssetContext.tsx
// 全局资产库 Context — 跨窗口共享的剧本提取资产管理

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loadGlobalAssetLibrary, saveGlobalAssetLibrary } from '../services/assetLibraryStorage';

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

function mergeAssets(currentAssets: GlobalAssetItem[], loadedAssets: GlobalAssetItem[]): GlobalAssetItem[] {
  if (currentAssets.length === 0) {
    return loadedAssets;
  }

  const seenIds = new Set(currentAssets.map((asset) => asset.id));
  const merged = [...currentAssets, ...loadedAssets.filter((asset) => !seenIds.has(asset.id))];
  return merged.sort((left, right) => right.timestamp - left.timestamp);
}

const GlobalAssetContext = createContext<GlobalAssetContextType | undefined>(undefined);

export const GlobalAssetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<GlobalAssetItem[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadGlobalAssetLibrary<GlobalAssetItem>()
      .then((loadedAssets) => {
        if (cancelled) {
          return;
        }

        setAssets((currentAssets) => mergeAssets(currentAssets, loadedAssets));
      })
      .catch((error) => {
        console.error('读取全局资产库失败:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setHasHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const timer = setTimeout(() => {
      void saveGlobalAssetLibrary(assets).catch((error) => {
        console.error('保存全局资产库失败:', error);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [assets, hasHydrated]);

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
