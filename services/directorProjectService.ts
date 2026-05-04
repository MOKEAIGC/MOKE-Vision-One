// 文件路径: services/directorProjectService.ts
// DirectorDeck 分镜大师模块 — 工程文件服务

import { 
  DirectorAsset, DirectorCharacter, DirectorGeneratedImage, 
  DirectorGenerationMode, DirectorAspectRatio, DirectorImageSize, DirectorModelId 
} from "../types_director";
import { fileToBase64 } from "./directorGeminiService";

export interface DirectorProjectState {
  version: number;
  timestamp: number;
  settings: {
    projectName: string;
    filenamePattern: string;
    lang: string;
  };
  deck: {
    mode: DirectorGenerationMode;
    modelId: DirectorModelId;
    aspectRatio: DirectorAspectRatio;
    imageSize: DirectorImageSize;
    batchSize: number;
    prompt: string;
  };
  data: {
    assets: SerializedAsset[];
    characters: DirectorCharacter[];
    images: DirectorGeneratedImage[];
  };
}

interface SerializedAsset {
  id: string;
  name: string;
  type: 'image' | 'video';
  mimeType: string;
  base64: string;
  analysis?: string;
}

// 保存工程
export const saveDirectorProject = async (
  currentAssets: DirectorAsset[],
  currentImages: DirectorGeneratedImage[],
  currentCharacters: DirectorCharacter[],
  settings: DirectorProjectState['settings'],
  deck: DirectorProjectState['deck']
): Promise<void> => {
  try {
    const serializedAssets: SerializedAsset[] = await Promise.all(
      currentAssets.map(async (asset) => ({
        id: asset.id,
        name: asset.file.name,
        type: asset.type,
        mimeType: asset.file.type,
        base64: await fileToBase64(asset.file),
        analysis: asset.analysis
      }))
    );

    const projectData: DirectorProjectState = {
      version: 1,
      timestamp: Date.now(),
      settings,
      deck,
      data: {
        assets: serializedAssets,
        characters: currentCharacters,
        images: currentImages
      }
    };

    const blob = new Blob([JSON.stringify(projectData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${settings.projectName || "MOKE_Director"}_${Date.now()}.moke`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error("保存工程失败:", error);
    throw new Error("无法序列化工程数据。");
  }
};

// Base64 转 File
const base64ToFileLocal = (base64: string, filename: string, mimeType: string): File => {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], filename, { type: mimeType });
};

// 载入工程
export const loadDirectorProject = async (file: File): Promise<{
  assets: DirectorAsset[];
  images: DirectorGeneratedImage[];
  characters: DirectorCharacter[];
  settings: DirectorProjectState['settings'];
  deck: DirectorProjectState['deck'];
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonStr = e.target?.result as string;
        const projectData: DirectorProjectState = JSON.parse(jsonStr);

        if (!projectData.version || !projectData.data) {
          throw new Error("无效的工程文件格式。");
        }

        const restoredAssets: DirectorAsset[] = projectData.data.assets.map((sa) => {
          const fileObj = base64ToFileLocal(sa.base64, sa.name, sa.mimeType);
          return {
            id: sa.id,
            file: fileObj,
            previewUrl: URL.createObjectURL(fileObj),
            type: sa.type,
            analysis: sa.analysis
          };
        });

        resolve({
          assets: restoredAssets,
          images: projectData.data.images,
          characters: projectData.data.characters,
          settings: projectData.settings,
          deck: projectData.deck
        });

      } catch (error) {
        console.error("载入工程失败:", error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("读取文件失败。"));
    reader.readAsText(file);
  });
};
