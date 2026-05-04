// 文件路径: services/directorGeminiService.ts
// DirectorDeck 分镜大师模块 — AI 服务层
// 使用量子相机的运行时 API 配置系统，不依赖 process.env

import { GoogleGenAI } from "@google/genai";
import { DirectorAspectRatio, DirectorImageSize, DirectorCharacter } from "../types_director";

// ==================== 运行时 API 配置引用 ====================
// 从量子相机的 geminiService 获取配置（在 DirectorDeckWindow 中注入）
let directorApiKey: string = '';
let directorBaseUrl: string = '';

export const setDirectorApiConfig = (apiKey: string, baseUrl: string) => {
  directorApiKey = apiKey;
  directorBaseUrl = baseUrl;
};

// 获取有效的 API Key
const getEffectiveApiKey = (): string => {
  if (directorApiKey && directorApiKey.trim()) return directorApiKey.trim();
  try {
    if (process.env.API_KEY) return process.env.API_KEY;
  } catch { /* 忽略 */ }
  return '';
};

// 获取 AI 客户端
const getClient = (): GoogleGenAI => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) {
    throw new Error('请先在 API 配置面板中设置 API Key');
  }

  const options: any = { apiKey };

  if (directorBaseUrl && directorBaseUrl.trim()) {
    options.httpOptions = { baseUrl: directorBaseUrl.trim().replace(/\/+$/, '') };
  }

  return new GoogleGenAI(options);
};

// ==================== 图片网格切片 ====================
const sliceImageGrid = (base64Data: string, rows: number, cols: number): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const pieceWidth = Math.floor(w / cols);
      const pieceHeight = Math.floor(h / rows);
      
      const pieces: string[] = [];
      const canvas = document.createElement('canvas');
      canvas.width = pieceWidth;
      canvas.height = pieceHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("无法获取画布上下文"));
        return;
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.clearRect(0, 0, pieceWidth, pieceHeight);
            ctx.drawImage(
                img, 
                c * pieceWidth, r * pieceHeight, pieceWidth, pieceHeight, 
                0, 0, pieceWidth, pieceHeight
            );
            pieces.push(canvas.toDataURL('image/png'));
        }
      }
      resolve(pieces);
    };
    img.onerror = () => reject(new Error("无法加载图片进行切片"));
    img.src = base64Data;
  });
};

// ==================== 图片合并 ====================
export const mergeImages = async (imageUrls: string[]): Promise<string> => {
  if (imageUrls.length === 0) throw new Error("没有可合并的图片");

  const images = await Promise.all(
    imageUrls.map(url =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("加载图片失败"));
        img.src = url;
      })
    )
  );

  if (images.length === 0) throw new Error("加载图片失败");

  const count = images.length;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const maxWidth = Math.max(...images.map(img => img.width));
  const maxHeight = Math.max(...images.map(img => img.height));

  const canvas = document.createElement('canvas');
  canvas.width = maxWidth * cols;
  canvas.height = maxHeight * rows;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Canvas 上下文不可用");

  ctx.fillStyle = "#050505"; // 量子相机 moke-black 背景
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  images.forEach((img, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = c * maxWidth;
    const y = r * maxHeight;

    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;

    const xOffset = (maxWidth - drawWidth) / 2;
    const yOffset = (maxHeight - drawHeight) / 2;

    ctx.drawImage(img, x + xOffset, y + yOffset, drawWidth, drawHeight);
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, maxWidth, maxHeight);
  });

  return canvas.toDataURL('image/png');
};

// ==================== 引用图片数据类型 ====================
export interface ReferenceImageData {
  mimeType: string;
  data: string;
}

// ==================== 多视图网格生成 ====================
export const generateMultiViewGrid = async (
  prompt: string,
  gridRows: number,
  gridCols: number,
  aspectRatio: DirectorAspectRatio,
  imageSize: DirectorImageSize,
  referenceImages: ReferenceImageData[] = [],
  characters: DirectorCharacter[] = [],
  modelId: string = 'gemini-3.1-flash-image-preview'
): Promise<{ fullImage: string, slices: string[] }> => {
  const ai = getClient();
  
  const isSingle = gridRows === 1 && gridCols === 1;
  const totalViews = gridRows * gridCols;
  const gridType = `${gridRows}x${gridCols}`;

  const parts: any[] = [];

  // 1. 参考图片
  for (const ref of referenceImages) {
    parts.push({
      inlineData: { mimeType: ref.mimeType, data: ref.data }
    });
  }

  // 2. 角色参考图片与指令
  let characterTextInstructions = "";
  if (characters.length > 0) {
    characterTextInstructions = "CAST & CHARACTER VISUAL CONSISTENCY:\n";
    for (const char of characters) {
      if (char.imageBase64 && char.mimeType) {
        parts.push({ text: `REFERENCE PHOTO FOR CHARACTER "${char.name}":` });
        parts.push({
          inlineData: { mimeType: char.mimeType, data: char.imageBase64 }
        });
      }
      characterTextInstructions += `- Character "${char.name}": ${char.description || 'Reference features from the provided photo'}. MAINTAIN PERFECT VISUAL CONSISTENCY for "${char.name}" in all panels.\n`;
    }
  }

  // 3. 构建最终 Prompt
  let finalPrompt = '';

  if (isSingle) {
    finalPrompt = `Create a high-fidelity cinematic image.
    ${characterTextInstructions}
    
    Subject Content: "${prompt}"
    
    Styling Instructions:
    - Cinematic lighting, high fidelity, 8k resolution.
    - Detailed composition, photorealistic.
    
    Negative Constraints:
    - ABSOLUTELY NO TEXT of any kind in the image. No letters, no numbers, no words, no captions, no labels, no titles, no subtitles, no watermarks, no signatures, no symbols, no logos, no UI elements, no annotations. The image must be purely visual with zero textual information.`;
  } else {
    finalPrompt = `MANDATORY LAYOUT: Create a precise ${gridType} GRID containing exactly ${totalViews} distinct panels.
    - The output image MUST be a single image divided into a ${gridRows} (rows) by ${gridCols} (columns) matrix.
    - There must be EXACTLY ${gridRows} horizontal rows and ${gridCols} vertical columns.
    - Each panel must be completely separated by a thin, distinct, solid black line.
    - The grid structure must be perfectly aligned for slicing.

    ${characterTextInstructions}
    
    Subject Content: "${prompt}"
    
    Styling Instructions:
    - Each panel shows the SAME subjects/scene from a DIFFERENT angle or shot size.
    - Maintain perfect consistency of the subjects across all panels.
    - Cinematic lighting, high fidelity, 8k resolution.
    
    Negative Constraints:
    - ABSOLUTELY NO TEXT of any kind in the image. No letters, no numbers, no words, no captions, no labels, no titles, no subtitles, no watermarks, no signatures, no symbols, no logos, no UI elements, no annotations. The image must be purely visual with zero textual information.
    - No broken grid lines.`;
  }

  parts.push({ text: finalPrompt });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        responseModalities: ["IMAGE", "TEXT"],
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: imageSize
        }
      }
    });

    let fullImageBase64 = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        fullImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!fullImageBase64) throw new Error("未能生成 Grid 图片");

    if (isSingle) {
      return { fullImage: fullImageBase64, slices: [fullImageBase64] };
    } else {
      const panels = await sliceImageGrid(fullImageBase64, gridRows, gridCols);
      return { fullImage: fullImageBase64, slices: panels };
    }

  } catch (error) {
    console.error("Grid 生成错误:", error);
    throw error;
  }
};

// ==================== AI 视觉分析 ====================
export const analyzeAsset = async (
  fileBase64: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  const ai = getClient();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: fileBase64 } },
          { text: prompt }
        ]
      }
    });
    return response.text || "无法获取分析结果。";
  } catch (error) {
    console.error("分析错误:", error);
    throw error;
  }
};

// ==================== AI 提示词增强 ====================
export const enhancePrompt = async (rawPrompt: string): Promise<string> => {
  const ai = getClient();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a film director's assistant. Rewrite the following scene description into a detailed, cinematic image generation prompt. Focus on lighting, camera angle, texture, and mood. Keep it under 100 words. CRITICAL: The enhanced prompt MUST include the instruction "absolutely no text, no letters, no words, no captions, no labels, no watermarks, no symbols of any kind in the image". \n\nInput: "${rawPrompt}"`,
    });
    return response.text || rawPrompt;
  } catch (error) {
    console.error("提示词增强错误:", error);
    return rawPrompt;
  }
};

// ==================== 文件工具函数 ====================
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type: mime});
};
