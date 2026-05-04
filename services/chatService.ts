// 文件路径: services/chatService.ts
// LLM 聊天服务 — Gemini 原生（中转模式已下线）
// 特性：流式输出、AbortController 取消、System Prompt、对话历史
import { GoogleGenAI } from '@google/genai';

// ==================== 运行时配置（与 geminiService 协同） ====================

// Gemini 配置
let geminiApiKey = '';
let geminiBaseUrl = '';
let geminiModel = 'gemini-3-flash-preview'; // 文本对话默认模型（可覆盖）

/** 注入 Gemini 聊天运行时配置 */
export const setChatGeminiConfig = (apiKey: string, baseUrl: string, model: string) => {
  geminiApiKey = apiKey;
  geminiBaseUrl = baseUrl;
  if (model && model.trim()) geminiModel = model.trim();
};

/** 检查是否已配置 */
export const isChatConfigured = (): boolean => {
  return !!(geminiApiKey.trim() || (process.env as any).API_KEY);
};

// ==================== 消息类型 ====================

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  /** 唯一 ID（时间戳 + 随机） */
  id: string;
  role: ChatRole;
  content: string;
  /** 创建时间戳 */
  timestamp: number;
  /** 是否正在流式生成中 */
  streaming?: boolean;
  /** 错误信息（若有） */
  error?: string;
}

/** 流式回调：每次新增内容块时调用 */
export type StreamCallback = (chunk: string, fullText: string) => void;

/** 聊天请求参数 */
export interface ChatRequestOptions {
  /** 对话历史（按时序） */
  messages: ChatMessage[];
  /** 系统提示词（skill 可注入） */
  systemPrompt?: string;
  /** 温度（0-2） */
  temperature?: number;
  /** 取消信号 */
  signal?: AbortSignal;
  /** 流式回调（若提供则走流式） */
  onStream?: StreamCallback;
}

/** 创建消息 ID */
export const createMessageId = (): string =>
  `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ==================== 核心 API ====================

/**
 * 发送聊天请求
 * 返回最终完整文本；如果 onStream 被提供，也会在过程中逐块回调
 */
export const sendChatMessage = async (opts: ChatRequestOptions): Promise<string> => {
  return sendViaGemini(opts);
};

// ==================== Gemini 实现 ====================

async function sendViaGemini(opts: ChatRequestOptions): Promise<string> {
  const apiKey = geminiApiKey.trim() || (process.env as any).API_KEY;
  if (!apiKey) throw new Error('Gemini API Key 未配置');

  const genAIOpts: any = { apiKey };
  if (geminiBaseUrl.trim()) {
    genAIOpts.httpOptions = { baseUrl: geminiBaseUrl.trim() };
  }
  const ai = new GoogleGenAI(genAIOpts);

  // 构造 contents（Gemini 格式）
  const contents = opts.messages
    .filter(m => m.role !== 'system') // system 单独走
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const config: any = {
    temperature: opts.temperature ?? 0.7,
  };
  if (opts.systemPrompt) {
    config.systemInstruction = opts.systemPrompt;
  }

  // 流式
  if (opts.onStream) {
    let full = '';
    const stream = await ai.models.generateContentStream({
      model: geminiModel,
      contents,
      config,
    });
    for await (const chunk of stream) {
      if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const text = (chunk as any).text ?? '';
      if (text) {
        full += text;
        opts.onStream(text, full);
      }
    }
    return full;
  }

  // 非流式
  const resp = await ai.models.generateContent({
    model: geminiModel,
    contents,
    config,
  });
  return (resp as any).text ?? '';
}
