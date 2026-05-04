import { GoogleGenAI } from "@google/genai";
import { CameraSettings } from "../types";
import { callLlmWithDiagnostics, classifyLlmError, diagLog } from "./llmConnectionDiagnostics";

// ==================== 运行时 API 配置 ====================

// 官方 Gemini API 回落模型（必须是 Google 官方真实存在的模型名）
// 如果用户选择官方 API 但没填模型，会用这个兜底，避免 404 "models/xxx is not found"
const FALLBACK_OFFICIAL_IMAGE_MODEL = 'gemini-3-flash-preview';

// Gemini 原生 API 配置
let runtimeApiKey: string = '';
let runtimeBaseUrl: string = '';
let runtimeModel: string = FALLBACK_OFFICIAL_IMAGE_MODEL;

// 注入 Gemini 运行时配置（由 App 层调用）
export const setRuntimeApiConfig = (apiKey: string, baseUrl: string, model: string) => {
  runtimeApiKey = apiKey;
  runtimeBaseUrl = baseUrl;
  runtimeModel = model || FALLBACK_OFFICIAL_IMAGE_MODEL;
};

// 获取有效的 API Key（运行时配置优先，其次环境变量）
const getEffectiveApiKey = (): string => {
  if (runtimeApiKey && runtimeApiKey.trim()) return runtimeApiKey.trim();
  if (process.env.API_KEY) return process.env.API_KEY;
  return '';
};

// 获取有效的模型名称
const getEffectiveModel = (): string => {
  if (runtimeModel && runtimeModel.trim()) return runtimeModel.trim();
  return FALLBACK_OFFICIAL_IMAGE_MODEL;
};

// Helper to ensure API key is selected
export const ensureApiKey = async (): Promise<boolean> => {
  // Gemini 模式：优先检查运行时配置的 Key
  if (runtimeApiKey && runtimeApiKey.trim()) return true;

  const win = window as any;
  if (win.aistudio && win.aistudio.hasSelectedApiKey) {
    const hasKey = await win.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      try {
        await win.aistudio.openSelectKey();
        return await win.aistudio.hasSelectedApiKey();
      } catch (e) {
        console.error("Key selection failed", e);
        return false;
      }
    }
    return true;
  }
  // If not in the specific environment with window.aistudio, fallback to env check (simulated success for dev)
  return !!process.env.API_KEY;
};

// Generate Image Function
export const generateQuantumImage = async (
  prompt: string,
  settings: CameraSettings,
  referenceImagesBase64?: string[]
): Promise<string> => {
  // 初始化 AI 客户端（运行时配置优先）
  const effectiveKey = getEffectiveApiKey();
  const aiOptions: any = { apiKey: effectiveKey };

  // 如果有自定义 baseUrl，注入到配置中
  if (runtimeBaseUrl && runtimeBaseUrl.trim()) {
    aiOptions.httpOptions = { baseUrl: runtimeBaseUrl.trim() };
  }

  const ai = new GoogleGenAI(aiOptions);

  let finalPrompt = "";

  // 1. STORYBOARD LENS LOGIC
  if (settings.lensType === 'STORYBOARD') {
    finalPrompt = `
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
  // 2. STANDARD LENS LOGIC
  else {
    let lensDescription = "";
    if (settings.lensType === 'MACRO') {
      lensDescription = "Macro photography style, extreme close-up, 1:1 magnification, incredibly sharp details, shallow depth of field, bokeh background.";
    } else if (settings.lensType === 'PROBE') {
      lensDescription = "Laowa 24mm probe lens style, bug-eye perspective, deep depth of field, wide angle macro, immersive viewpoint, often low angle.";
    } else {
      lensDescription = `Standard lens style, ${settings.focalLength}mm focal length.`;
    }

    finalPrompt = `
      Photorealistic image, 8k resolution, highly detailed.
      Shot on a futuristic camera with a 1 billion pixel organic sensor.
      Lens Spec: ${settings.focalLength}mm focal length, f/${settings.aperture} aperture.
      Lens Type: ${lensDescription}
      Lighting: Zero noise, high dynamic range, perfect exposure even in low light (simulating quantum denoise).
      Subject/Scene: ${prompt}.
      ${settings.iso > 3200 ? "Night vision mode active, bright details in darkness." : "Natural lighting."}
      CRITICAL: ABSOLUTELY NO TEXT of any kind in the image. No letters, no numbers, no words, no captions, no labels, no titles, no watermarks, no signatures, no symbols, no logos, no UI elements, no annotations. The image must be a pure photograph with zero textual information.
    `;
  }

  try {
    const parts: any[] = [];

    // Add reference images if available
    if (referenceImagesBase64 && referenceImagesBase64.length > 0) {
      referenceImagesBase64.forEach((b64) => {
          // Strip prefix if present (data:image/jpeg;base64,)
          const base64Data = b64.split(',')[1] || b64;
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg', // Assuming JPEG for simplicity from input
            },
          });
      });
      parts.push({ text: finalPrompt });
    } else {
      parts.push({ text: finalPrompt });
    }

    // Use the configured image generation model
    // 关键：必须声明 responseModalities 包含 "IMAGE"，否则模型只会返回文本
    //
    // 这里用 callLlmWithDiagnostics 包住 generateContent：
    //   · 自动识别 404 / 401 / 429 / 5xx / timeout 等错误分类
    //   · 仅对瞬时性错误（超时 / 5xx / 429）按指数退避自动重试
    //   · 对模型不存在 / 认证失败等永久性错误立即返回，避免无意义等待
    const callResult = await callLlmWithDiagnostics(
      () => ai.models.generateContent({
        model: getEffectiveModel(),
        contents: {
          parts: parts,
        },
        config: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: {
            aspectRatio: settings.aspectRatio, // Use selected aspect ratio
            imageSize: settings.resolution,    // Use selected resolution
          },
        },
      }),
      {
        label: `image-gen[${getEffectiveModel()}]`,
        maxRetries: 2,
        timeoutMs: 90_000,
      },
    );

    if (!callResult.success) {
      // 诊断模块已给出用户友好的 humanMessage，直接抛出即可
      throw new Error(callResult.humanMessage);
    }
    const response = callResult.data!;

    // Extract image
    const candidate = response.candidates?.[0];
    const parts_resp = candidate?.content?.parts || [];

    for (const part of parts_resp) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }

    // 收集诊断信息，帮助用户理解为什么没有生成图片
    const textParts = parts_resp.filter((p: any) => p.text).map((p: any) => p.text).join('\n');
    const finishReason = candidate?.finishReason || '未知';
    const safetyRatings = candidate?.safetyRatings || [];
    const blockedReason = safetyRatings.filter((r: any) => r.blocked).map((r: any) => `${r.category}: ${r.probability}`).join(', ');

    let diagnosticMsg = `模型未返回图片数据。`;
    if (blockedReason) {
      diagnosticMsg += `\n安全过滤触发: ${blockedReason}`;
    }
    if (finishReason && finishReason !== 'STOP') {
      diagnosticMsg += `\n终止原因: ${finishReason}`;
    }
    if (textParts) {
      diagnosticMsg += `\n模型回复文本: ${textParts.slice(0, 200)}`;
    }
    diagnosticMsg += `\n使用模型: ${getEffectiveModel()}`;

    console.error("Gemini 图片生成诊断:", { finishReason, blockedReason, textParts, partsCount: parts_resp.length });
    throw new Error(diagnosticMsg);

  } catch (error: any) {
    diagLog('error', 'image-gen', 'Quantum Processor Error:', error);

    // 如果是我们自己抛出的 Error（已经含有 humanMessage 或诊断文本），直接透传
    // 否则再过一遍分类器，确保用户拿到可读的中文提示
    const info = classifyLlmError(error);
    if (info.category === 'UNKNOWN' && /模型未返回图片数据|安全过滤|使用模型/.test(info.rawMessage)) {
      // 这是上方主动抛出的"图片未返回"诊断文本，保持原样
      throw error;
    }
    throw new Error(info.humanMessage);
  }
};

// ==================== API 连接测试 ====================

// 测试结果类型
export interface ApiTestResult {
  success: boolean;
  message: string;
  latency?: number; // 响应时间（ms）
}

// ==================== API 连接测试 ====================
//
// 测试策略说明（兼容官方 + 云雾等中转）：
//   1) 优先尝试 GET {base}/v1beta/models/{model}?key=xxx （Google 官方支持，最轻量）
//   2) 如果返回 404 / 405（很多中转站不实现 models.get），自动回退到
//      POST {base}/v1beta/models/{model}:generateContent 用最小 payload 探测
//   3) 仅根据状态码判断（401/403 鉴权失败 / 404 路径错 / 2xx 通过），
//      不消耗实际生成配额（虽然 generateContent 会消耗少量 token，但这是
//      唯一所有中转站都保证实现的端点）
const probeGenerateContent = async (
  origin: string,
  model: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; message: string }> => {
  const url = `${origin}/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1, temperature: 0 },
      }),
    });
    if (resp.ok) return { ok: true, status: resp.status, message: 'OK' };
    const text = await resp.text().catch(() => '');
    let msg = `HTTP ${resp.status}`;
    try { msg = JSON.parse(text).error?.message || msg; } catch { /* */ }
    return { ok: false, status: resp.status, message: msg };
  } catch (e: any) {
    return { ok: false, status: 0, message: e?.message || 'network error' };
  }
};

// 测试 Gemini 原生 API 连接（同时兼容 yunwu / oneapi 等中转站）
export const testGeminiConnection = async (apiKey: string, baseUrl?: string, model?: string): Promise<ApiTestResult> => {
  const startTime = Date.now();
  try {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: '请输入 API Key' };
    }

    const key = apiKey.trim();
    const effectiveModel = model?.trim() || FALLBACK_OFFICIAL_IMAGE_MODEL;

    // 归一化 origin（去末尾斜杠 + OpenAI 风格后缀，确保 /v1beta/... 能正确拼接）
    const rawBase = (baseUrl && baseUrl.trim())
      ? baseUrl.trim().replace(/\/+$/, '')
      : 'https://generativelanguage.googleapis.com';
    const origin = rawBase
      .replace(/\/v1\/chat\/completions$/i, '')
      .replace(/\/v1beta\/?$/i, '')
      .replace(/\/v1$/i, '');

    // —— 第 1 步：尝试 GET models.get（最轻量，不消耗配额）——
    let getStatus = 0;
    let getMsg = '';
    try {
      const getUrl = `${origin}/v1beta/models/${effectiveModel}?key=${key}`;
      const r = await fetch(getUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      getStatus = r.status;
      if (r.ok) {
        const data = await r.json().catch(() => ({} as any));
        const name = data.displayName || data.name || effectiveModel;
        return { success: true, message: `连接成功 · 模型: ${name}`, latency: Date.now() - startTime };
      }
      const errText = await r.text().catch(() => '');
      try { getMsg = JSON.parse(errText).error?.message || `HTTP ${r.status}`; }
      catch { getMsg = `HTTP ${r.status}`; }
    } catch (e: any) {
      getMsg = e?.message || 'network error';
    }

    // —— 第 2 步：404/405 时回退 POST :generateContent（覆盖大多数中转站）——
    if (getStatus === 404 || getStatus === 405) {
      const probe = await probeGenerateContent(origin, effectiveModel, key);
      const latency = Date.now() - startTime;
      if (probe.ok) {
        return { success: true, message: `连接成功 · 模型: ${effectiveModel}（generateContent 探测）`, latency };
      }
      // 鉴权类错误优先暴露
      if (probe.status === 401 || probe.status === 403) {
        return { success: false, message: `鉴权失败（${probe.status}）：${probe.message}`, latency };
      }
      return { success: false, message: `连接失败: ${probe.message}（GET 同样失败：${getMsg}）`, latency };
    }

    // 其它非 2xx 直接报错
    return { success: false, message: `连接失败: ${getMsg}`, latency: Date.now() - startTime };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return { success: false, message: `网络错误: ${error.message || '无法连接到服务器'}`, latency };
  }
};

// ==================== 云雾 AI（yunwu.ai）连接测试 ====================
//
// 直接走 POST {origin}/v1beta/models/{model}:generateContent —— 这是云雾真正支持的
// Gemini 兼容端点。GET /v1beta/models/{model} 在云雾会 404，已停用。
// 自动归一化 BASE URL：用户填 https://yunwu.ai、/v1、/v1/chat/completions 都能跑通。
export const testYunwuConnection = async (
  apiKey: string,
  baseUrl: string,
  model: string,
  // 旧签名兼容字段，已废弃，无论传什么都走 generateContent
  _endpointMode?: 'gemini' | 'image',
): Promise<ApiTestResult> => {
  const startTime = Date.now();
  try {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, message: '请输入云雾 AI 的 API Key（令牌）' };
    }
    if (!baseUrl || !baseUrl.trim()) {
      return { success: false, message: '请填写 BASE URL（例如 https://yunwu.ai）' };
    }
    const key = apiKey.trim();
    const effectiveModel = model?.trim() || 'gemini-3.1-flash-image-preview';

    // 归一化 origin（去末尾斜杠 + 去掉常见 OpenAI 后缀）
    const trimmedBase = baseUrl.trim().replace(/\/+$/, '');
    const origin = trimmedBase
      .replace(/\/v1\/chat\/completions$/i, '')
      .replace(/\/v1beta\/?$/i, '')
      .replace(/\/v1$/i, '');

    const probe = await probeGenerateContent(origin, effectiveModel, key);
    const latency = Date.now() - startTime;

    if (probe.ok) {
      return { success: true, message: `云雾连接成功 · 模型: ${effectiveModel}`, latency };
    }
    if (probe.status === 401 || probe.status === 403) {
      return { success: false, message: `鉴权失败（${probe.status}）：API Key 无效或权限不足`, latency };
    }
    if (probe.status === 404) {
      return {
        success: false,
        message: '路径 404：BASE URL 可能不正确，建议依次尝试三个候选地址；并确认模型名是否在云雾"支持模型"列表中',
        latency,
      };
    }
    return { success: false, message: `连接失败: ${probe.message}`, latency };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return { success: false, message: `网络错误: ${error.message || '无法连接到服务器'}`, latency };
  }
};
