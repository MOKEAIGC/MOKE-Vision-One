import { CameraSettings } from "../types";
import { classifyLlmError, diagLog } from "./llmConnectionDiagnostics";

export const FALLBACK_OFFICIAL_IMAGE_MODEL = 'gemini-3-flash-preview';
export const FALLBACK_OPENAI_IMAGE_MODEL = 'gpt-image-2';

export type ImageGenerationProtocol = 'gemini' | 'openai-image';

export interface RuntimeImageGenerationConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  protocol: ImageGenerationProtocol;
}

export interface GenerateModelImageRequest {
  prompt: string;
  settings: CameraSettings;
  referenceImagesBase64?: string[];
}

let runtimeConfig: RuntimeImageGenerationConfig = {
  apiKey: '',
  baseUrl: '',
  model: FALLBACK_OFFICIAL_IMAGE_MODEL,
  protocol: 'gemini',
};

export const setRuntimeImageGenerationConfig = (next: Partial<RuntimeImageGenerationConfig>) => {
  runtimeConfig = {
    ...runtimeConfig,
    ...next,
    model: next.model?.trim() || runtimeConfig.model || FALLBACK_OFFICIAL_IMAGE_MODEL,
    protocol: next.protocol || runtimeConfig.protocol || 'gemini',
  };
};

export const ensureImageApiKey = async (): Promise<boolean> => {
  if (runtimeConfig.apiKey && runtimeConfig.apiKey.trim()) return true;

  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      try {
        await win.aistudio.openSelectKey();
        return await win.aistudio.hasSelectedApiKey();
      } catch (error) {
        console.error('Key selection failed', error);
        return false;
      }
    }
    return true;
  }

  return !!process.env.API_KEY;
};

export const generateModelImage = async ({
  prompt,
  settings,
  referenceImagesBase64,
}: GenerateModelImageRequest): Promise<string> => {
  const effectiveProtocol = runtimeConfig.protocol || 'gemini';
  if (effectiveProtocol === 'openai-image') {
    return generateViaOpenAIImages({ prompt, settings, referenceImagesBase64 });
  }

  const { generateQuantumImage, setRuntimeApiConfig } = await import('./geminiService');
  setRuntimeApiConfig(runtimeConfig.apiKey, runtimeConfig.baseUrl, runtimeConfig.model);
  return generateQuantumImage(prompt, settings, referenceImagesBase64);
};

export const normalizeGeminiOrigin = (baseUrl?: string): string => {
  const rawBase = (baseUrl && baseUrl.trim())
    ? baseUrl.trim().replace(/\/+$/, '')
    : 'https://generativelanguage.googleapis.com';

  return rawBase
    .replace(/\/v1\/chat\/completions$/i, '')
    .replace(/\/v1beta\/?$/i, '')
    .replace(/\/v1$/i, '');
};

export const normalizeOpenAICompatibleOrigin = (baseUrl?: string): string => {
  const rawBase = (baseUrl && baseUrl.trim())
    ? baseUrl.trim().replace(/\/+$/, '')
    : 'https://api.openai.com';

  return rawBase
    .replace(/\/v1\/chat\/completions$/i, '')
    .replace(/\/v1\/images\/generations$/i, '')
    .replace(/\/v1\/images\/edits$/i, '')
    .replace(/\/v1beta\/?$/i, '')
    .replace(/\/v1$/i, '');
};

export const testOpenAIImageConnection = async (
  apiKey: string,
  baseUrl: string,
  model?: string,
): Promise<{ success: boolean; message: string; latency?: number }> => {
  const startTime = Date.now();
  try {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: '请输入 API Key' };
    }
    if (!baseUrl || !baseUrl.trim()) {
      return { success: false, message: '请填写 BASE URL（例如 https://yunwu.ai）' };
    }

    const origin = normalizeOpenAICompatibleOrigin(baseUrl);
    const effectiveModel = model?.trim() || FALLBACK_OPENAI_IMAGE_MODEL;
    const response = await fetch(`${origin}/v1/models`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
    });
    const latency = Date.now() - startTime;

    if (response.ok) {
      const payload = await response.json().catch(() => ({} as any));
      const models = Array.isArray(payload?.data) ? payload.data : [];
      const matched = models.find((item: any) => item?.id === effectiveModel);
      if (matched) {
        return { success: true, message: `连接成功 · 模型: ${effectiveModel}`, latency };
      }
      return {
        success: true,
        message: `连接成功 · OpenAI Images 协议可用${models.length > 0 ? `（未校验到模型 ${effectiveModel}）` : ''}`,
        latency,
      };
    }

    const rawText = await response.text().catch(() => '');
    const errorMessage = extractRemoteErrorMessage(rawText) || `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      return { success: false, message: `鉴权失败（${response.status}）：${errorMessage}`, latency };
    }
    if (response.status === 404) {
      return { success: false, message: '路径 404：该站点可能不支持 OpenAI /v1/models 接口，请检查 BASE URL 与协议类型', latency };
    }
    return { success: false, message: `连接失败: ${errorMessage}`, latency };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return { success: false, message: `网络错误: ${error?.message || '无法连接到服务器'}`, latency };
  }
};

const getEffectiveApiKey = (): string => {
  if (runtimeConfig.apiKey && runtimeConfig.apiKey.trim()) return runtimeConfig.apiKey.trim();
  if (process.env.API_KEY) return process.env.API_KEY;
  return '';
};

const getEffectiveModel = (): string => {
  if (runtimeConfig.model && runtimeConfig.model.trim()) return runtimeConfig.model.trim();
  return runtimeConfig.protocol === 'openai-image'
    ? FALLBACK_OPENAI_IMAGE_MODEL
    : FALLBACK_OFFICIAL_IMAGE_MODEL;
};

const buildQuantumPrompt = (prompt: string, settings: CameraSettings): string => {
  if (settings.lensType === 'STORYBOARD') {
    return `
      <role>
      You are an award-winning trailer director + cinematographer + storyboard artist. Your job: Convert the provided reference image (and user prompt) into a coherent cinematic sequence, then output a KEYFRAME CONTACT SHEET.
      </role>

      <input>
      User Context/Modification: ${prompt}
      (If a reference image is provided, use it as the visual anchor. If not, generate based on this context).
      </input>

      <rules>
      1. Continuity: Maintain strict consistency of subjects, clothing, environment, and lighting across all frames.
      2. Reality: Do not guess brand names or specific real-world locations unless obvious. Infer atmosphere.
      3. Format: OUTPUT ONE BIG GRID IMAGE (Contact Sheet).
      4. Grid: 3x3 or 4x3 layout containing 9-12 distinct keyframes.
      5. Labels: Each frame in the grid must have a small, legible label (e.g., "01 Wide", "02 CU").
      </rules>

      <goal>
      Expand the input into a 10-20 second cinematic sequence with an emotional arc (Setup -> Rise -> Climax -> Resolution).
      </goal>

      <cinematic_approach>
      - Shot progression: Mix of Wide (Establish), Medium (Action), Close-up (Emotion), and Extreme Close-up (Detail).
      - Camera movement: Imply movement (dolly in, tracking) through composition changes.
      - Lens: ${settings.focalLength}mm style aesthetic.
      </cinematic_approach>

      <output_requirement>
      GENERATE A SINGLE HIGH-RES IMAGE resembling a professional storyboard contact sheet.
      The image should contain the sequence of keyframes arranged in a grid.
      Style: Photorealistic, cinematic lighting, 8k resolution.
      </output_requirement>
    `;
  }

  let lensDescription = '';
  if (settings.lensType === 'MACRO') {
    lensDescription = 'Macro photography style, extreme close-up, 1:1 magnification, incredibly sharp details, shallow depth of field, bokeh background.';
  } else if (settings.lensType === 'PROBE') {
    lensDescription = 'Laowa 24mm probe lens style, bug-eye perspective, deep depth of field, wide angle macro, immersive viewpoint, often low angle.';
  } else {
    lensDescription = `Standard lens style, ${settings.focalLength}mm focal length.`;
  }

  return `
    Photorealistic image, 8k resolution, highly detailed.
    Shot on a futuristic camera with a 1 billion pixel organic sensor.
    Lens Spec: ${settings.focalLength}mm focal length, f/${settings.aperture} aperture.
    Lens Type: ${lensDescription}
    Lighting: Zero noise, high dynamic range, perfect exposure even in low light (simulating quantum denoise).
    Subject/Scene: ${prompt}.
    ${settings.iso > 3200 ? 'Night vision mode active, bright details in darkness.' : 'Natural lighting.'}
    CRITICAL: ABSOLUTELY NO TEXT of any kind in the image. No letters, no numbers, no words, no captions, no labels, no titles, no watermarks, no signatures, no symbols, no logos, no UI elements, no annotations. The image must be a pure photograph with zero textual information.
  `;
};

const normalizeReferenceImages = (referenceImagesBase64?: string[]): string[] => (
  Array.isArray(referenceImagesBase64)
    ? referenceImagesBase64.filter((item) => typeof item === 'string' && item.trim().length > 0)
    : []
);

const shouldUseOpenAIImageEdit = (referenceImagesBase64?: string[]): boolean => (
  normalizeReferenceImages(referenceImagesBase64).length > 0
);

const generateViaOpenAIImages = async ({
  prompt,
  settings,
  referenceImagesBase64,
}: GenerateModelImageRequest): Promise<string> => {
  const apiKey = getEffectiveApiKey();
  if (!apiKey) {
    throw new Error('图像 API Key 未配置');
  }

  const origin = normalizeOpenAICompatibleOrigin(runtimeConfig.baseUrl);
  const effectiveModel = getEffectiveModel();
  const finalPrompt = buildQuantumPrompt(prompt, settings);
  const requestMeta = buildOpenAIImageRequestMeta(settings);
  const normalizedReferenceImages = normalizeReferenceImages(referenceImagesBase64);
  const useEditsEndpoint = shouldUseOpenAIImageEdit(normalizedReferenceImages);

  try {
    let response: Response;

    if (useEditsEndpoint) {
      const formData = new FormData();
      normalizedReferenceImages.forEach((item, index) => {
        formData.append('image', base64ToFile(item, index));
      });
      formData.append('prompt', finalPrompt);
      formData.append('model', effectiveModel);
      formData.append('n', '1');
      formData.append('size', requestMeta.size);
      formData.append('quality', requestMeta.quality);
      formData.append('background', 'auto');

      response = await fetch(`${origin}/v1/images/edits`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      });
    } else {
      response = await fetch(`${origin}/v1/images/generations`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: effectiveModel,
          prompt: finalPrompt,
          n: 1,
          size: requestMeta.size,
          quality: requestMeta.quality,
          format: 'png',
          background: 'auto',
        }),
      });
    }

    if (!response.ok) {
      const rawText = await response.text().catch(() => '');
      throw new Error(formatOpenAIImageError(response.status, rawText));
    }

    const payload = await response.json().catch(() => ({} as any));
    const imageOutput = extractImageOutput(payload);
    if (imageOutput) {
      return imageOutput;
    }

    throw new Error(`图像接口未返回可用图片数据。使用模型: ${effectiveModel}`);
  } catch (error: any) {
    diagLog('error', 'image-gen', 'OpenAI Images Error:', error);
    const info = classifyLlmError(error);
    if (info.category === 'UNKNOWN' && /图像接口未返回可用图片数据|图像接口请求失败/.test(info.rawMessage)) {
      throw error;
    }
    throw new Error(info.humanMessage);
  }
};

const buildOpenAIImageRequestMeta = (settings: CameraSettings): { size: string; quality: 'low' | 'medium' | 'high' } => {
  const resolution = settings.resolution || '2K';
  const aspectRatio = settings.aspectRatio || '16:9';
  const isLandscape = aspectRatio === '16:9' || aspectRatio === '4:3' || aspectRatio === '21:9';
  const isPortrait = aspectRatio === '9:16' || aspectRatio === '3:4';

  if (resolution === '4K') {
    if (aspectRatio === '1:1') return { size: '2048x2048', quality: 'high' };
    if (isPortrait) return { size: '2160x3840', quality: 'high' };
    return { size: '3840x2160', quality: 'high' };
  }

  if (resolution === '2K') {
    if (aspectRatio === '1:1') return { size: '2048x2048', quality: 'medium' };
    if (isPortrait) return { size: '1024x1536', quality: 'medium' };
    return { size: '2048x1152', quality: 'medium' };
  }

  if (aspectRatio === '1:1') return { size: '1024x1024', quality: 'low' };
  if (isPortrait) return { size: '1024x1536', quality: 'low' };
  if (isLandscape) return { size: '1536x1024', quality: 'low' };
  return { size: '1024x1024', quality: 'low' };
};

const detectMimeType = (input: string): string => {
  const match = input.match(/^data:([^;]+);base64,/i);
  return match?.[1] || 'image/jpeg';
};

const base64ToFile = (input: string, index: number): File => {
  const mimeType = detectMimeType(input);
  const raw = input.split(',')[1] || input;
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const extension = mimeType.split('/')[1] || 'png';
  return new File([bytes], `reference-${index + 1}.${extension}`, { type: mimeType });
};

const extractImageOutput = (payload: any): string | null => {
  const dataItems = Array.isArray(payload?.data)
    ? payload.data
    : payload?.data
      ? [payload.data]
      : [];

  for (const item of dataItems) {
    if (typeof item?.b64_json === 'string' && item.b64_json.trim()) {
      return `data:image/png;base64,${item.b64_json}`;
    }
    if (typeof item?.url === 'string' && item.url.trim()) {
      return item.url;
    }
  }

  const choices = Array.isArray(payload?.choices) ? payload.choices : [];
  for (const choice of choices) {
    const content = choice?.message?.content;
    if (typeof content !== 'string' || !content.trim()) continue;
    const trimmed = content.trim();
    if (/^data:image\//i.test(trimmed)) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 128) {
      return `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`;
    }
    try {
      const nested = JSON.parse(trimmed);
      const nestedImage = extractImageOutput(nested);
      if (nestedImage) return nestedImage;
    } catch {
      // ignore malformed nested payloads
    }
  }

  return null;
};

const extractRemoteErrorMessage = (rawText: string): string => {
  if (!rawText) return '';
  try {
    const payload = JSON.parse(rawText);
    return payload?.error?.message || payload?.message || '';
  } catch {
    return rawText.slice(0, 240);
  }
};

const formatOpenAIImageError = (status: number, rawText: string): string => {
  const remoteMessage = extractRemoteErrorMessage(rawText) || `HTTP ${status}`;

  if (status === 400) return `图像接口请求失败（400）：${remoteMessage}`;
  if (status === 401 || status === 403) return `图像接口鉴权失败（${status}）：${remoteMessage}`;
  if (status === 404) return `图像接口路径不存在（404）：请检查 BASE URL 与图片协议配置。${remoteMessage}`;
  if (status === 429) return `图像接口限流（429）：${remoteMessage}`;
  if (status >= 500) return `图像接口服务异常（${status}）：${remoteMessage}`;
  return `图像接口请求失败（${status}）：${remoteMessage}`;
};