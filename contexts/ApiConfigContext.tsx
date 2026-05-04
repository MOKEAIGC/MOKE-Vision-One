// 文件路径: contexts/ApiConfigContext.tsx
// Gemini 原生 API 配置上下文 — 中转模式已整体下线
// [CHANGED] 移除所有硬编码的"默认预设值"：
//   - aspectRatio / resolution：不再预选，初值为空字符串，由 UI 明确提示"未设置"
//   - model / textModel：Context 层保留空字符串，消费方（_gen.py / geminiService）
//     应在调用时自行兜底；旧存档数据通过 STORAGE_KEY 回填，保持兼容。
// [FIX v2] 把"同步运行时配置"从 QuantumCamera 上提到 Provider：
//   无论当前渲染的是 Intro / QuantumCamera / 任何子窗口，都能保证 geminiService
//   和 chatService 的运行时 Key/Model 与 Context 一致，修复"大语言模型没接上"的问题。
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setRuntimeApiConfig } from '../services/geminiService';
import { setChatGeminiConfig } from '../services/chatService';
import { secureLoadWithMigration, secureSave } from '../services/secureStorage';

// 运行时兜底模型常量（仅在用户完全没设置时使用）
//   · 官方 API：推荐使用最新的 gemini-3-flash-preview / gemini-2.5-flash-image-preview 等
//   · 云雾中转：支持 gemini-3.1-flash-image-preview / gemini-3-pro-preview 等增强模型
const FALLBACK_IMAGE_MODEL_GEMINI = 'gemini-3-flash-preview';          // 官方
const FALLBACK_TEXT_MODEL_GEMINI = 'gemini-3-flash-preview';           // 官方
const FALLBACK_IMAGE_MODEL_YUNWU = 'gemini-3.1-flash-image-preview';   // 云雾
const FALLBACK_TEXT_MODEL_YUNWU = 'gemini-3-flash-preview';            // 云雾

// 服务商类型 —— 决定运行时把哪一组配置注入到底层 service
//   gemini  → 官方 Google Gemini API
//   yunwu   → 云雾 AI 中转（预设）
//   custom  → 任意第三方 Gemini 兼容中转（用户自定义 BASE URL）
export type ApiProvider = 'gemini' | 'yunwu' | 'custom';

// 云雾 AI 端点模式 —— 决定用哪个 OpenAI/Gemini 兼容路径
//   gemini  → /v1beta/models/{model}:generateContent  （Gemini 协议，与官方完全一致）
//   image   → /v1/images/generations                  （OpenAI Images 协议，仅图像生成）
export type YunwuEndpointMode = 'gemini' | 'image';

// 云雾 AI 中转配置（第二个窗口）
export interface YunwuConfig {
  /** 中转站基础地址：https://yunwu.ai | https://yunwu.ai/v1 | https://yunwu.ai/v1/chat/completions */
  baseUrl: string;
  /** 后台「令牌」页获取的 API Key */
  apiKey: string;
  /** 模型名称（来自首页「支持模型」列表第一列） */
  model: string;
  /** 端点模式（gemini 协议 / OpenAI image 协议） */
  endpointMode: YunwuEndpointMode;
}

// 自定义中转配置（第三个窗口）
// 结构与 YunwuConfig 基本一致，但字段独立持久化，允许用户接任意 Gemini 兼容中转站。
export interface CustomRelayConfig {
  /** 自定义中转站名称（仅展示用） */
  name: string;
  /** 中转站基础地址，例如 https://my-relay.example.com */
  baseUrl: string;
  /** 中转站提供的 API Key */
  apiKey: string;
  /** 图像模型名称 */
  imageModel: string;
  /** 文本模型名称 */
  textModel: string;
}

// Gemini 原生 API 配置
export interface ApiConfig {
  /** 当前激活的服务商（决定运行时注入到 geminiService/chatService 的来源） */
  provider: ApiProvider;
  baseUrl: string;
  apiKey: string;
  /** 图片模式模型（图像生成 / 卫星 / Seedance 等图像类功能）— 空字符串表示未设置 */
  model: string;
  /** 文本模式模型（聊天对话 / 提示词增强等纯文本功能）— 空字符串表示未设置 */
  textModel?: string;
  /** 生成宽高比（对应 _gen.py 的 aspect_ratio 参数）— 空字符串表示未设置，不注入到请求 */
  aspectRatio?: string;
  /** 生成分辨率（对应 _gen.py 的 image_size / resolution 参数）— 空字符串表示未设置 */
  resolution?: string;
  /** 云雾 AI 中转配置（第二个窗口，独立持久化，不影响 Gemini 主配置） */
  yunwu?: YunwuConfig;
  /** 自定义中转配置（第三个窗口，独立持久化） */
  custom?: CustomRelayConfig;
}

interface ApiConfigContextType {
  config: ApiConfig;
  updateConfig: (newConfig: Partial<ApiConfig>) => void;
  isConfigured: boolean;
}

const STORAGE_KEY = 'moke_vision_api_config';
// [SEC] 新的加密存储键名（与旧 localStorage 键区分，便于迁移检测）
const SECURE_STORAGE_KEY = 'api-config';

// 云雾 AI 默认空白配置
const emptyYunwu: YunwuConfig = {
  baseUrl: 'https://yunwu.ai',
  apiKey: '',
  model: 'gemini-3.1-flash-image-preview',
  endpointMode: 'gemini',
};

// 自定义中转默认空白配置（不预填任何 URL，让用户自行填写）
const emptyCustom: CustomRelayConfig = {
  name: '',
  baseUrl: '',
  apiKey: '',
  imageModel: '',
  textModel: '',
};

// [CHANGED] 空白初始配置 — 不预设任何业务默认值
const emptyConfig: ApiConfig = {
  provider: 'gemini',
  baseUrl: '',
  apiKey: '',
  model: '',
  textModel: '',
  aspectRatio: '',
  resolution: '',
  yunwu: { ...emptyYunwu },
  custom: { ...emptyCustom },
};

// 从 localStorage 读取已保存的配置（兼容老版本：缺失字段补齐默认值）
// [SEC] 这里保持同步读取以避免首次渲染空配置导致的 UI 闪烁；
//       真正的"加密读取+迁移"在 Provider 的第一个 useEffect 里异步执行。
const loadConfig = (): ApiConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return mergeConfig(parsed);
    }
  } catch (e) {
    console.error('读取 API 配置失败:', e);
  }
  return emptyConfig;
};

// 合并任意来源的配置对象与默认值，补齐缺失字段
const mergeConfig = (parsed: any): ApiConfig => ({
  ...emptyConfig,
  ...parsed,
  provider: (parsed?.provider === 'yunwu'
    ? 'yunwu'
    : parsed?.provider === 'custom'
      ? 'custom'
      : 'gemini'),
  yunwu: { ...emptyYunwu, ...(parsed?.yunwu || {}) },
  custom: { ...emptyCustom, ...(parsed?.custom || {}) },
});

const ApiConfigContext = createContext<ApiConfigContextType | undefined>(undefined);

export const ApiConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ApiConfig>(loadConfig);
  // [SEC] 标记：安全存储是否已完成首次异步加载，完成后才允许持久化回写
  // 避免"异步加载还没回来就把空初值写进安全存储"的竞态覆盖
  const [secureReady, setSecureReady] = React.useState(false);

  // [SEC] 首次挂载：尝试从加密存储加载（并自动迁移旧 localStorage）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await secureLoadWithMigration<any>(SECURE_STORAGE_KEY, STORAGE_KEY);
        if (!cancelled && loaded) {
          setConfig(mergeConfig(loaded));
        }
      } catch (e) {
        console.warn('[ApiConfig] 安全存储初始化失败，继续使用 localStorage:', e);
      } finally {
        if (!cancelled) setSecureReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 配置变化时自动保存（安全存储 + localStorage 双写）
  // localStorage 仅保存非敏感的"快速初始化快照"——但当前实现仍会包含 apiKey，
  // 因此生产上若 Keychain 可用会通过 secureLoadWithMigration 自动清掉旧 localStorage。
  useEffect(() => {
    if (!secureReady) return; // 防止首次加载前的空状态覆盖加密存储
    (async () => {
      try {
        await secureSave(SECURE_STORAGE_KEY, config);
      } catch (e) {
        console.error('[ApiConfig] 保存到安全存储失败，降级 localStorage:', e);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e2) {
          console.error('保存 API 配置失败:', e2);
        }
      }
    })();
  }, [config, secureReady]);

  // [FIX v2] 全局同步运行时配置 — Provider 级别，保证所有页面一致
  // [v3 升级] 支持云雾 AI 第二窗口：当 provider==='yunwu' 时，使用 yunwu 子配置注入底层 service
  // 兜底策略：空字段不会擦掉已有默认，而是注入项目约定的 fallback 模型
  useEffect(() => {
    // —— 根据当前激活的服务商，挑选要注入运行时的配置 ——
    let activeApiKey = '';
    let activeBaseUrl = '';
    let activeImageModel = '';
    let activeTextModel = '';
    let providerLabel = '';

    if (config.provider === 'yunwu') {
      const y = config.yunwu || emptyYunwu;
      activeApiKey = (y.apiKey || '').trim();
      activeBaseUrl = (y.baseUrl || '').trim();
      // 云雾 AI 暂时图像/文本共用同一个 model 字段（用户在第二窗口里只选了一个）
      activeImageModel = (y.model || '').trim() || FALLBACK_IMAGE_MODEL_YUNWU;
      activeTextModel = (y.model || '').trim() || FALLBACK_TEXT_MODEL_YUNWU;
      providerLabel = `yunwu(${y.endpointMode})`;
    } else if (config.provider === 'custom') {
      const c = config.custom || emptyCustom;
      activeApiKey = (c.apiKey || '').trim();
      activeBaseUrl = (c.baseUrl || '').trim();
      // 自定义中转：图像/文本模型分开存储；未填则兜底到官方推荐模型
      activeImageModel = (c.imageModel || '').trim() || FALLBACK_IMAGE_MODEL_GEMINI;
      activeTextModel = (c.textModel || '').trim() || FALLBACK_TEXT_MODEL_GEMINI;
      providerLabel = `custom(${c.name || 'unnamed'})`;
    } else {
      activeApiKey = (config.apiKey || '').trim();
      activeBaseUrl = (config.baseUrl || '').trim();
      activeImageModel = (config.model || '').trim() || FALLBACK_IMAGE_MODEL_GEMINI;
      activeTextModel = (config.textModel || '').trim() || FALLBACK_TEXT_MODEL_GEMINI;
      providerLabel = 'gemini-official';
    }

    // 同步到图像生成 service
    setRuntimeApiConfig(activeApiKey, activeBaseUrl, activeImageModel);
    // 同步到聊天 / 文本 service
    setChatGeminiConfig(activeApiKey, activeBaseUrl, activeTextModel);

    // 诊断日志：明确每次 Context 变更后两个 service 接收到的最终值
    // （只打印 key 的前 4 位 + 长度，避免泄露）
    const keyMask = activeApiKey ? `${activeApiKey.slice(0, 4)}…(${activeApiKey.length})` : '(empty)';
    console.info(
      '[ApiConfig] runtime sync →',
      {
        provider: providerLabel,
        keyMask,
        baseUrl: activeBaseUrl || '(official)',
        imageModel: activeImageModel,
        textModel: activeTextModel,
      },
    );
  }, [config]);

  const updateConfig = (newConfig: Partial<ApiConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...newConfig,
      // 深合并 yunwu，避免传入部分字段时把其他字段清空
      yunwu: newConfig.yunwu
        ? { ...(prev.yunwu || emptyYunwu), ...newConfig.yunwu }
        : prev.yunwu,
      // 深合并 custom，同理
      custom: newConfig.custom
        ? { ...(prev.custom || emptyCustom), ...newConfig.custom }
        : prev.custom,
    }));
  };

  // 判断当前激活服务商是否已配置（至少有 API Key）
  const isConfigured = config.provider === 'yunwu'
    ? !!(config.yunwu?.apiKey && config.yunwu.apiKey.trim().length > 0)
    : config.provider === 'custom'
      ? !!(config.custom?.apiKey && config.custom.apiKey.trim().length > 0
           && config.custom?.baseUrl && config.custom.baseUrl.trim().length > 0)
      : !!(config.apiKey && config.apiKey.trim().length > 0);

  return (
    <ApiConfigContext.Provider value={{
      config, updateConfig, isConfigured,
    }}>
      {children}
    </ApiConfigContext.Provider>
  );
};

export const useApiConfig = () => {
  const context = useContext(ApiConfigContext);
  if (!context) {
    throw new Error('useApiConfig must be used within an ApiConfigProvider');
  }
  return context;
};
