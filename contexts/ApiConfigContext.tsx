// 文件路径: contexts/ApiConfigContext.tsx
// API 配置上下文
// ----------------------------------------------------------------------------
// 当前版本将配置拆成两层：
//   1) 文本认证（Gemini 官方 / 自定义中转）
//   2) 图片生成供应商（Google / OpenAI）
// 其中图片生成页拥有自己的默认 BASE URL / Token，供应商留空时继承页级默认值。

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  FALLBACK_OFFICIAL_IMAGE_MODEL,
  FALLBACK_OPENAI_IMAGE_MODEL,
  ImageGenerationProtocol,
  setRuntimeImageGenerationConfig,
} from '../services/imageGenerationService';
import { setRuntimeApiConfig } from '../services/geminiService';
import { setChatGeminiConfig } from '../services/chatService';
import { secureLoadWithMigration, secureSave } from '../services/secureStorage';

const FALLBACK_TEXT_MODEL_GEMINI = 'gemini-3-flash-preview';

export type ApiProvider = 'gemini' | 'custom';
export type ImageGenerationProvider = 'google' | 'openai';

interface LegacyYunwuConfig {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  imageProtocol?: ImageGenerationProtocol;
  endpointMode?: 'gemini' | 'image';
}

export interface CustomRelayConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  imageModel: string;
  textModel: string;
}

export interface ImageSupplierConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
}

export interface ImageGenerationConfig {
  activeProvider: ImageGenerationProvider;
  baseUrl: string;
  apiKey: string;
  google: ImageSupplierConfig;
  openai: ImageSupplierConfig;
}

export interface ApiConfig {
  provider: ApiProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  textModel?: string;
  aspectRatio?: string;
  resolution?: string;
  custom?: CustomRelayConfig;
  imageGeneration?: ImageGenerationConfig;
}

interface ApiConfigContextType {
  config: ApiConfig;
  updateConfig: (newConfig: Partial<ApiConfig>) => void;
  isConfigured: boolean;
}

export interface ResolvedTextRuntimeConfig {
  provider: ApiProvider;
  label: string;
  apiKey: string;
  baseUrl: string;
  textModel: string;
}

export interface ResolvedImageRuntimeConfig {
  provider: ImageGenerationProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  protocol: ImageGenerationProtocol;
}

const STORAGE_KEY = 'moke_vision_api_config';
const SECURE_STORAGE_KEY = 'api-config';

// 默认空白配置
const emptyCustom: CustomRelayConfig = {
  name: '',
  baseUrl: '',
  apiKey: '',
  imageModel: '',
  textModel: '',
};

// 图片生成页默认配置
const emptyImageGeneration: ImageGenerationConfig = {
  activeProvider: 'google',
  baseUrl: '',
  apiKey: '',
  google: {
    model: FALLBACK_OFFICIAL_IMAGE_MODEL,
    baseUrl: '',
    apiKey: '',
  },
  openai: {
    model: FALLBACK_OPENAI_IMAGE_MODEL,
    baseUrl: '',
    apiKey: '',
  },
};

const emptyConfig: ApiConfig = {
  provider: 'gemini',
  baseUrl: '',
  apiKey: '',
  model: '',
  textModel: '',
  aspectRatio: '',
  resolution: '',
  custom: { ...emptyCustom },
  imageGeneration: { ...emptyImageGeneration },
};

// 兼容旧存档中的 yunwu / 旧 imageGeneration 字段，并合并成当前结构
const mergeCustomConfig = (parsed: any, legacyYunwu?: LegacyYunwuConfig): CustomRelayConfig => {
  const merged = {
    ...emptyCustom,
    ...(parsed?.custom || {}),
  };

  return {
    ...merged,
    name: merged.name || ((parsed?.provider === 'yunwu' || legacyYunwu?.baseUrl || legacyYunwu?.apiKey) ? 'Yunwu Relay' : ''),
    baseUrl: merged.baseUrl || legacyYunwu?.baseUrl || '',
    apiKey: merged.apiKey || legacyYunwu?.apiKey || '',
    imageModel: merged.imageModel || '',
    textModel: merged.textModel || legacyYunwu?.model || '',
  };
};

const mergeImageGenerationConfig = (parsed: any, legacyYunwu?: LegacyYunwuConfig): ImageGenerationConfig => {
  const { defaultStrategy: _legacyDefaultStrategy, ...merged } = parsed?.imageGeneration || {};
  const mergedGoogle = merged?.google || {};
  const mergedOpenAI = merged?.openai || {};
  const legacyProtocol: ImageGenerationProtocol = legacyYunwu?.imageProtocol
    || (legacyYunwu?.endpointMode === 'image' ? 'openai-image' : 'gemini');
  const activeProvider: ImageGenerationProvider = merged?.activeProvider === 'openai'
    ? 'openai'
    : legacyProtocol === 'openai-image'
      ? 'openai'
      : 'google';

  return {
    ...emptyImageGeneration,
    ...merged,
    activeProvider,
    baseUrl: typeof merged?.baseUrl === 'string' ? merged.baseUrl : legacyYunwu?.baseUrl || '',
    apiKey: typeof merged?.apiKey === 'string' ? merged.apiKey : '',
    google: {
      ...emptyImageGeneration.google,
      ...mergedGoogle,
      model: mergedGoogle?.model || parsed?.model || legacyYunwu?.model || emptyImageGeneration.google.model,
      baseUrl: mergedGoogle?.baseUrl || '',
      apiKey: mergedGoogle?.apiKey || '',
    },
    openai: {
      ...emptyImageGeneration.openai,
      ...mergedOpenAI,
      model: mergedOpenAI?.model || (legacyProtocol === 'openai-image' ? legacyYunwu?.model || '' : '') || emptyImageGeneration.openai.model,
      baseUrl: mergedOpenAI?.baseUrl || '',
      apiKey: mergedOpenAI?.apiKey || '',
    },
  };
};

const mergeConfig = (parsed: any): ApiConfig => {
  const { defaultImageStrategy: _legacyDefaultImageStrategy, ...parsedRest } = parsed || {};
  const legacyYunwu = parsed?.yunwu as LegacyYunwuConfig | undefined;
  const custom = mergeCustomConfig(parsed, legacyYunwu);
  const imageGeneration = mergeImageGenerationConfig(parsed, legacyYunwu);

  return {
    ...emptyConfig,
    ...parsedRest,
    provider: parsed?.provider === 'custom' || parsed?.provider === 'yunwu' ? 'custom' : 'gemini',
    custom,
    imageGeneration,
  };
};

const loadConfig = (): ApiConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return mergeConfig(JSON.parse(saved));
    }
  } catch (error) {
    console.error('读取 API 配置失败:', error);
  }
  return emptyConfig;
};

// 解析当前文本运行时配置
export const resolveActiveTextRuntimeConfig = (config: ApiConfig): ResolvedTextRuntimeConfig => {
  if (config.provider === 'custom') {
    const custom = {
      ...emptyCustom,
      ...(config.custom || {}),
    };
    return {
      provider: 'custom',
      label: custom.name || 'custom-relay',
      apiKey: (custom.apiKey || '').trim(),
      baseUrl: (custom.baseUrl || '').trim(),
      textModel: (custom.textModel || '').trim() || FALLBACK_TEXT_MODEL_GEMINI,
    };
  }

  return {
    provider: 'gemini',
    label: 'gemini-official',
    apiKey: (config.apiKey || '').trim(),
    baseUrl: (config.baseUrl || '').trim(),
    textModel: (config.textModel || '').trim() || FALLBACK_TEXT_MODEL_GEMINI,
  };
};

// 解析当前图片运行时配置：供应商覆盖 > 图片页默认 > 文本认证回退
export const resolveActiveImageRuntimeConfig = (config: ApiConfig): ResolvedImageRuntimeConfig => {
  const textRuntime = resolveActiveTextRuntimeConfig(config);
  const imageGeneration = {
    ...emptyImageGeneration,
    ...(config.imageGeneration || {}),
    google: {
      ...emptyImageGeneration.google,
      ...(config.imageGeneration?.google || {}),
    },
    openai: {
      ...emptyImageGeneration.openai,
      ...(config.imageGeneration?.openai || {}),
    },
  };

  const activeProvider = imageGeneration.activeProvider === 'openai' ? 'openai' : 'google';
  const activeSupplier = activeProvider === 'openai' ? imageGeneration.openai : imageGeneration.google;
  const protocol: ImageGenerationProtocol = activeProvider === 'openai' ? 'openai-image' : 'gemini';

  return {
    provider: activeProvider,
    apiKey: (activeSupplier.apiKey || '').trim() || (imageGeneration.apiKey || '').trim() || textRuntime.apiKey,
    baseUrl: (activeSupplier.baseUrl || '').trim() || (imageGeneration.baseUrl || '').trim() || textRuntime.baseUrl,
    model: (activeSupplier.model || '').trim() || (activeProvider === 'openai' ? FALLBACK_OPENAI_IMAGE_MODEL : FALLBACK_OFFICIAL_IMAGE_MODEL),
    protocol,
  };
};

const ApiConfigContext = createContext<ApiConfigContextType | undefined>(undefined);

export const ApiConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<ApiConfig>(loadConfig);
  const [secureReady, setSecureReady] = React.useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await secureLoadWithMigration<any>(SECURE_STORAGE_KEY, STORAGE_KEY);
        if (!cancelled && loaded) {
          setConfig(mergeConfig(loaded));
        }
      } catch (error) {
        console.warn('[ApiConfig] 安全存储初始化失败，继续使用 localStorage:', error);
      } finally {
        if (!cancelled) setSecureReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!secureReady) return;
    (async () => {
      try {
        await secureSave(SECURE_STORAGE_KEY, config);
      } catch (error) {
        console.error('[ApiConfig] 保存到安全存储失败，降级 localStorage:', error);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (fallbackError) {
          console.error('保存 API 配置失败:', fallbackError);
        }
      }
    })();
  }, [config, secureReady]);

  useEffect(() => {
    const textRuntime = resolveActiveTextRuntimeConfig(config);
    const imageRuntime = resolveActiveImageRuntimeConfig(config);

    if (imageRuntime.protocol === 'gemini') {
      setRuntimeApiConfig(imageRuntime.apiKey, imageRuntime.baseUrl, imageRuntime.model);
    } else {
      setRuntimeImageGenerationConfig({
        apiKey: imageRuntime.apiKey,
        baseUrl: imageRuntime.baseUrl,
        model: imageRuntime.model,
        protocol: imageRuntime.protocol,
      });
    }
    setChatGeminiConfig(textRuntime.apiKey, textRuntime.baseUrl, textRuntime.textModel);

    const keyMask = textRuntime.apiKey ? `${textRuntime.apiKey.slice(0, 4)}…(${textRuntime.apiKey.length})` : '(empty)';
    console.info('[ApiConfig] runtime sync →', {
      textProvider: textRuntime.label,
      keyMask,
      textBaseUrl: textRuntime.baseUrl || '(official)',
      textModel: textRuntime.textModel,
      imageProvider: imageRuntime.provider,
      imageBaseUrl: imageRuntime.baseUrl || '(inherit/official)',
      imageModel: imageRuntime.model,
      imageProtocol: imageRuntime.protocol,
    });
  }, [config]);

  const updateConfig = (newConfig: Partial<ApiConfig>) => {
    setConfig((prev) => {
      const { defaultImageStrategy: _prevLegacyDefaultImageStrategy, ...restPrev } = prev as ApiConfig & { defaultImageStrategy?: unknown };
      const { defaultImageStrategy: _newLegacyDefaultImageStrategy, ...restNewConfig } = newConfig as Partial<ApiConfig> & { defaultImageStrategy?: unknown };
      const { defaultStrategy: _prevLegacyImageStrategy, ...prevImageGeneration } = ((prev.imageGeneration || {}) as ImageGenerationConfig & { defaultStrategy?: unknown });
      const { defaultStrategy: _newLegacyImageStrategy, ...nextImageGeneration } = ((newConfig.imageGeneration || {}) as Partial<ImageGenerationConfig> & { defaultStrategy?: unknown });

      const mergedImageGeneration: ImageGenerationConfig = {
        ...emptyImageGeneration,
        ...prevImageGeneration,
        ...nextImageGeneration,
        google: {
          ...emptyImageGeneration.google,
          ...(prev.imageGeneration?.google || {}),
          ...(newConfig.imageGeneration?.google || {}),
        },
        openai: {
          ...emptyImageGeneration.openai,
          ...(prev.imageGeneration?.openai || {}),
          ...(newConfig.imageGeneration?.openai || {}),
        },
      };

      return {
        ...restPrev,
        ...restNewConfig,
        custom: newConfig.custom
          ? { ...(prev.custom || emptyCustom), ...newConfig.custom }
          : prev.custom,
        imageGeneration: mergedImageGeneration,
      };
    });
  };

  const textRuntime = resolveActiveTextRuntimeConfig(config);
  const isConfigured = !!textRuntime.apiKey && (config.provider !== 'custom' || !!textRuntime.baseUrl);

  return (
    <ApiConfigContext.Provider value={{ config, updateConfig, isConfigured }}>
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
