// 文件路径: types_director.ts
// DirectorDeck 分镜大师模块类型定义（从v06项目适配）

export enum DirectorModelId {
  GEMINI_3_PRO = 'gemini-3-pro-image-preview',
  GEMINI_3_1_FLASH = 'gemini-3.1-flash-image-preview',
  GEMINI_2_5_FLASH = 'gemini-2.5-flash-image'
}

export enum DirectorAspectRatio {
  SQUARE = '1:1',
  STANDARD = '4:3',
  PORTRAIT = '3:4',
  WIDE = '16:9',
  MOBILE = '9:16',
  CINEMA = '21:9'
}

export enum DirectorImageSize {
  K2 = '2K',
  K4 = '4K'
}

export enum DirectorGenerationMode {
  SINGLE = 'SINGLE',
  GRID_2x2 = 'GRID_2x2',
  GRID_3x3 = 'GRID_3x3'
}

export type DirectorLanguage = 'zh' | 'en';

export interface DirectorCharacter {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface DirectorGeneratedImage {
  id: string;
  url: string;
  fullGridUrl?: string;
  prompt: string;
  aspectRatio: string;
  timestamp: number;
  batchId?: string;
  indexInBatch?: number;
  customName?: string;
}

export interface DirectorAsset {
  id: string;
  file: File;
  previewUrl: string;
  type: 'image' | 'video';
  analysis?: string;
}

export type DirectorInspectorTab = 'details' | 'analysis';
