// 文件路径: components/ModelRegistryPanel.tsx
// 模型总览面板 — 分类展示项目中使用的所有大语言模型 (LLM) 和图片生成模型 (Image)
// 以及相关 API 服务的配置状态

import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { resolveActiveImageRuntimeConfig, resolveActiveTextRuntimeConfig, useApiConfig } from '../contexts/ApiConfigContext';
import { testGeminiConnection, ApiTestResult } from '../services/geminiService';
import { testOpenAIImageConnection } from '../services/imageGenerationService';
// [v2] 统一跳转到"新版"API 设置（双窗口面板），替代旧版 ApiConfigPanel
import { ApiSettingsModal } from './ApiSettingsModal';

// ==================== 模型注册表数据 ====================

/** 模型用途分类 */
type ModelCategory = 'image_generation' | 'llm_chat' | 'llm_analysis' | 'llm_enhance' | 'map_service';

/** 模型条目 */
interface ModelEntry {
  id: string;              // 模型 API ID
  name: string;            // 显示名称
  nameCN: string;          // 中文名
  category: ModelCategory;
  provider: string;        // 提供商
  usedIn: string;          // 使用模块
  usedInCN: string;        // 中文模块名
  description: string;     // 英文描述
  descCN: string;          // 中文描述
  maxRes?: string;         // 最大分辨率（图片模型）
  speed?: string;          // 速度
  tag?: string;            // 标签
  tagCN?: string;          // 中文标签
  configurable?: boolean;  // 是否可在 UI 中配置
}

/** API 服务条目 */
interface ApiServiceEntry {
  name: string;
  nameCN: string;
  icon: string;
  baseUrl: string;
  description: string;
  descCN: string;
  usedIn: string;
  usedInCN: string;
  keyType: string;         // API Key 类型
}

// —— 图片生成模型 ——
const IMAGE_MODELS: ModelEntry[] = [
  {
    id: 'gemini-2.0-flash-preview-image-generation',
    name: 'Gemini 2.0 Flash Image',
    nameCN: 'Gemini 2.0 Flash 图片生成',
    category: 'image_generation',
    provider: 'Google DeepMind',
    usedIn: 'Quantum Camera',
    usedInCN: '量子相机 · 主界面',
    description: 'Fast image generation, good quality. Legacy model.',
    descCN: '快速图片生成，质量良好。旧版模型。',
    maxRes: '2K', speed: '⚡ 快速',
    tag: 'LEGACY', tagCN: '旧版',
    configurable: true,
  },
  {
    id: 'gemini-3.0-flash-image-generation',
    name: 'Gemini 3.0 Flash Image',
    nameCN: 'Gemini 3.0 Flash 图片生成',
    category: 'image_generation',
    provider: 'Google DeepMind',
    usedIn: 'Quantum Camera',
    usedInCN: '量子相机 · 主界面',
    description: 'Balanced speed and quality. New generation model.',
    descCN: '速度与质量均衡。新一代模型。',
    maxRes: '2K', speed: '⚡ 快速',
    tag: 'NEW', tagCN: '新',
    configurable: true,
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Gemini 3.1 Flash Image',
    nameCN: 'Gemini 3.1 Flash 图片预览',
    category: 'image_generation',
    provider: 'Google DeepMind',
    usedIn: 'Quantum Camera / Director / Script',
    usedInCN: '量子相机 · 主界面 / 分镜大师 / 剧本提取',
    description: 'Latest flash model, recommended. Supports 4K output & multi-aspect-ratio.',
    descCN: '最新 Flash 模型，推荐使用。支持 4K 输出和多种宽高比。',
    maxRes: '4K', speed: '⚡ 快速',
    tag: 'RECOMMENDED', tagCN: '推荐',
    configurable: true,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 2.0 Flash Experimental',
    nameCN: 'Gemini 2.0 Flash 实验版',
    category: 'image_generation',
    provider: 'Google DeepMind',
    usedIn: 'Quantum Camera',
    usedInCN: '量子相机 · 主界面',
    description: 'Experimental features, may be unstable.',
    descCN: '实验性功能，可能不稳定。',
    maxRes: '2K', speed: '⚡ 快速',
    tag: 'EXPERIMENTAL', tagCN: '实验',
    configurable: true,
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image',
    nameCN: 'Gemini 3 Pro 图片预览',
    category: 'image_generation',
    provider: 'Google DeepMind',
    usedIn: 'Director',
    usedInCN: '分镜大师 · 高质量渲染',
    description: 'Pro-level image generation with superior detail and consistency.',
    descCN: 'Pro 级图片生成，更高细节和一致性。',
    maxRes: '4K', speed: '🔬 精细',
    tag: 'PRO', tagCN: '专业',
    configurable: true,
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    nameCN: 'Gemini 2.5 Flash 图片',
    category: 'image_generation',
    provider: 'Google DeepMind',
    usedIn: 'Director',
    usedInCN: '分镜大师 · 备选模型',
    description: 'Mid-generation flash model for image tasks.',
    descCN: '中间代 Flash 模型，用于图片任务。',
    maxRes: '2K', speed: '⚡ 快速',
    tag: 'LEGACY', tagCN: '旧版',
    configurable: true,
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana 1',
    nameCN: 'Nano Banana 1 图片生成',
    category: 'image_generation',
    provider: 'Google DeepMind (Nano Banana)',
    usedIn: 'Quantum Camera',
    usedInCN: '量子相机 · 主界面',
    description: 'Nano Banana (gemini-2.5-flash-image), fast and efficient image generation.',
    descCN: 'Nano Banana 第一代（gemini-2.5-flash-image），快速高效图片生成。',
    maxRes: '2K', speed: '⚡ 快速',
    tag: 'NANO', tagCN: '纳米',
    configurable: true,
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    nameCN: 'Nano Banana 2 图片生成',
    category: 'image_generation',
    provider: 'Google DeepMind (Nano Banana)',
    usedIn: 'Quantum Camera',
    usedInCN: '量子相机 · 主界面',
    description: 'Nano Banana 2 (gemini-3.1-flash-image-preview), improved quality and detail.',
    descCN: 'Nano Banana 第二代（gemini-3.1-flash-image-preview），提升画质与细节表现。',
    maxRes: '2K', speed: '⚡ 快速',
    tag: 'NANO', tagCN: '纳米',
    configurable: true,
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    nameCN: 'Nano Banana Pro 专业版',
    category: 'image_generation',
    provider: 'Google DeepMind (Nano Banana)',
    usedIn: 'Quantum Camera / Director',
    usedInCN: '量子相机 · 主界面 / 分镜大师',
    description: 'Nano Banana Pro (gemini-3-pro-image-preview), highest quality with superior detail.',
    descCN: 'Nano Banana 专业版（gemini-3-pro-image-preview），最高画质，细节与一致性卓越。',
    maxRes: '4K', speed: '🔄 中等',
    tag: 'PRO', tagCN: '专业',
    configurable: true,
  },
];

// —— 大语言模型 (LLM) ——
const LLM_MODELS: ModelEntry[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    nameCN: 'Gemini 2.5 Flash',
    category: 'llm_chat',
    provider: 'Google DeepMind',
    usedIn: 'Satellite Link',
    usedInCN: '卫星-链路 · AI 地图对话',
    description: 'Fast reasoning model for chat & MCP tool calling. Powers the 3D map AI assistant.',
    descCN: '快速推理模型，用于对话和 MCP 工具调用。驱动 3D 地图 AI 助手。',
    speed: '⚡ 快速',
    tag: 'CHAT + TOOLS', tagCN: '对话 + 工具调用',
    configurable: false,
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    nameCN: 'Gemini 3 Pro 预览版',
    category: 'llm_analysis',
    provider: 'Google DeepMind',
    usedIn: 'Director / Script',
    usedInCN: '分镜大师 · AI 分析 / 剧本提取 · 场景&角色提取',
    description: 'Pro model for visual analysis (asset inspection) and script extraction (scene diptych, character sheet).',
    descCN: 'Pro 模型，用于视觉分析（资产检视）和剧本提取（场景双联画、角色设计图）。',
    speed: '🔬 精细',
    tag: 'ANALYSIS', tagCN: '分析',
    configurable: false,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    nameCN: 'Gemini 3 Flash 预览版',
    category: 'llm_enhance',
    provider: 'Google DeepMind',
    usedIn: 'Director',
    usedInCN: '分镜大师 · 提示词增强',
    description: 'Fast model for prompt enhancement. Rewrites raw prompts into detailed cinematic descriptions.',
    descCN: '快速模型，用于提示词增强。将原始描述改写为详细的电影级画面描述。',
    speed: '⚡ 快速',
    tag: 'ENHANCE', tagCN: '增强',
    configurable: false,
  },
];

// —— API 服务 ——
const API_SERVICES: ApiServiceEntry[] = [
  {
    name: 'Gemini API (Native)',
    nameCN: 'Gemini 原生 API',
    icon: '🔷',
    baseUrl: 'https://generativelanguage.googleapis.com',
    description: 'Direct access to Google Gemini models. Default provider.',
    descCN: '直接访问 Google Gemini 模型。默认提供者。',
    usedIn: 'All modules',
    usedInCN: '所有模块',
    keyType: 'Gemini API Key',
  },
  {
    name: 'Google Maps 3D API',
    nameCN: 'Google Maps 3D API',
    icon: '🗺️',
    baseUrl: 'https://maps.googleapis.com',
    description: 'Google Maps Platform for 3D satellite view, geocoding, routes & geometry.',
    descCN: 'Google 地图平台，用于 3D 卫星视图、地理编码、路线和几何计算。',
    usedIn: 'Satellite Link',
    usedInCN: '卫星-链路 · 3D 地图',
    keyType: 'Google Maps API Key',
  },
  {
    name: 'MCP Protocol (In-Memory)',
    nameCN: 'MCP 协议（内存通信）',
    icon: '🔗',
    baseUrl: 'localhost (InMemoryTransport)',
    description: 'Model Context Protocol for AI ↔ Map tool bridge. Local in-memory transport, no external server.',
    descCN: 'Model Context Protocol，AI ↔ 地图工具桥接。本地内存传输，无需外部服务器。',
    usedIn: 'Satellite Link',
    usedInCN: '卫星-链路 · AI 工具调用',
    keyType: '无需 Key（内部通信）',
  },
];

// ==================== 分类标签样式 ====================

const CATEGORY_STYLES: Record<ModelCategory, { bg: string; text: string; label: string; labelCN: string; icon: string }> = {
  image_generation: { bg: 'bg-rose-500/15', text: 'text-rose-400', label: 'IMAGE GEN', labelCN: '图片生成', icon: '🎨' },
  llm_chat:         { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'LLM CHAT', labelCN: '大模型对话', icon: '💬' },
  llm_analysis:     { bg: 'bg-violet-500/15', text: 'text-violet-400', label: 'LLM ANALYSIS', labelCN: '大模型分析', icon: '🔍' },
  llm_enhance:      { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'LLM ENHANCE', labelCN: '大模型增强', icon: '✨' },
  map_service:      { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label: 'MAP SERVICE', labelCN: '地图服务', icon: '🛰️' },
};

const TAG_COLORS: Record<string, string> = {
  'RECOMMENDED': 'bg-emerald-500/20 text-emerald-400',
  'NEW': 'bg-blue-500/20 text-blue-400',
  'LEGACY': 'bg-gray-500/20 text-gray-400',
  'PRO': 'bg-amber-500/20 text-amber-400',
  'EXPERIMENTAL': 'bg-purple-500/20 text-purple-400',
  'NANO': 'bg-yellow-500/20 text-yellow-400',
  'CHAT + TOOLS': 'bg-emerald-500/20 text-emerald-400',
  'ANALYSIS': 'bg-violet-500/20 text-violet-400',
  'ENHANCE': 'bg-amber-500/20 text-amber-400',
};

// ==================== 组件 ====================

interface ModelRegistryPanelProps {
  onClose: () => void;
  /** 点击"可配置"时跳转到 API 配置面板 */
  onOpenApiConfig?: () => void;
}

export const ModelRegistryPanel: React.FC<ModelRegistryPanelProps> = ({ onClose, onOpenApiConfig }) => {
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const { config, isConfigured } = useApiConfig();

  const isCN = lang === 'CN';

  type TabType = 'image' | 'llm' | 'api';
  const [activeTab, setActiveTab] = useState<TabType>('image');

  // [v2] 内置"新版 API 设置"弹窗状态；
  //  - 所有"⚙️ 可配置"按钮 & 激活配置卡片统一调用 handleOpenApiConfig
  //  - 若父组件传了 onOpenApiConfig（遗留兼容），优先使用外部；否则打开内置 Modal
  const [showApiSettings, setShowApiSettings] = useState(false);
  const handleOpenApiConfig = () => {
    if (onOpenApiConfig) onOpenApiConfig();
    else setShowApiSettings(true);
  };

  // ====== 连接状态检测 ======
  type ConnStatus = 'idle' | 'testing' | 'success' | 'fail';
  const [geminiStatus, setGeminiStatus] = useState<ConnStatus>('idle');
  const [geminiMsg, setGeminiMsg] = useState<string>('');
  const [geminiLatency, setGeminiLatency] = useState<number | undefined>();

  // 组件加载时自动测试已配置的连接（按当前激活 provider 路由到对应 tester）
  useEffect(() => {
    if (!isConfigured) return;

    setGeminiStatus('testing');
    const run = async (): Promise<ApiTestResult> => {
      const textRuntime = resolveActiveTextRuntimeConfig(config);
      const imageRuntime = resolveActiveImageRuntimeConfig(config);
      if (!textRuntime.apiKey) return { success: false, message: '未配置 API Key' };
      if (textRuntime.provider === 'custom' && !textRuntime.baseUrl) {
        return { success: false, message: '自定义中转未配置完整' };
      }
      if (imageRuntime.protocol === 'openai-image') {
        return testOpenAIImageConnection(imageRuntime.apiKey, imageRuntime.baseUrl, imageRuntime.model);
      }
      return testGeminiConnection(imageRuntime.apiKey, imageRuntime.baseUrl, imageRuntime.model);
    };

    run().then((r) => {
      setGeminiStatus(r.success ? 'success' : 'fail');
      setGeminiMsg(r.message);
      setGeminiLatency(r.latency);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 样式
  const panelBg = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-300';
  const cardBg = isDark ? 'bg-[#0D0D0D]' : 'bg-gray-50';
  const descText = isDark ? 'text-gray-500' : 'text-gray-400';

  const renderModelCard = (model: ModelEntry) => {
    const catStyle = CATEGORY_STYLES[model.category];
    const tagColor = model.tag ? TAG_COLORS[model.tag] || 'bg-gray-500/20 text-gray-400' : '';

    return (
      <div
        // [fix] 部分模型 id 在 IMAGE_MODELS 中重复（Nano Banana 系列与官方 Gemini 条目共用同一模型名），
        //       使用 `${id}__${name}` 组合键确保 React key 唯一，避免列表渲染冲突。
        key={`${model.id}__${model.name}`}
        className={`relative p-4 rounded-sm border transition-all ${isDark ? 'border-gray-800 hover:border-gray-600' : 'border-gray-200 hover:border-gray-400'} ${cardBg}`}
      >
        {/* 顶部：名称 + 标签行 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-[11px] font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                {isCN ? model.nameCN : model.name}
              </span>
              {/* 分类标签 */}
              <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[7px] font-bold tracking-wider ${catStyle.bg} ${catStyle.text}`}>
                {catStyle.icon} {isCN ? catStyle.labelCN : catStyle.label}
              </span>
              {/* 功能标签 */}
              {model.tag && (
                <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[7px] font-bold tracking-wider ${tagColor}`}>
                  {isCN ? model.tagCN : model.tag}
                </span>
              )}
            </div>
            {/* 模型 ID */}
            <p className={`font-mono text-[9px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {model.id}
            </p>
          </div>

          {/* 右侧：速度 & 分辨率 */}
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            {model.speed && (
              <span className={`font-mono text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {model.speed}
              </span>
            )}
            {model.maxRes && (
              <span className={`font-mono text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                max {model.maxRes}
              </span>
            )}
            {model.configurable && (
              <button
                onClick={(e) => { e.stopPropagation(); handleOpenApiConfig(); }}
                className="font-mono text-[8px] text-emerald-500/70 hover:text-emerald-400 hover:underline transition-colors cursor-pointer"
                title={isCN ? '点击打开 API 设置面板' : 'Click to open API settings'}
              >
                ⚙️ {isCN ? '可配置' : 'CONFIG'}
              </button>
            )}
          </div>
        </div>

        {/* 描述 */}
        <p className={`font-mono text-[10px] ${descText} mb-2`}>
          {isCN ? model.descCN : model.description}
        </p>

        {/* 使用模块 */}
        <div className="flex items-center gap-1.5">
          <span className={`font-mono text-[8px] font-bold tracking-wider uppercase ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {isCN ? '使用模块:' : 'USED IN:'}
          </span>
          <span className={`font-mono text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {isCN ? model.usedInCN : model.usedIn}
          </span>
        </div>

        {/* 提供商 */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`font-mono text-[8px] font-bold tracking-wider uppercase ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            {isCN ? '提供商:' : 'PROVIDER:'}
          </span>
          <span className={`font-mono text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {model.provider}
          </span>
        </div>
      </div>
    );
  };

  const renderApiServiceCard = (service: ApiServiceEntry) => {
    return (
      <div
        key={service.name}
        className={`relative p-4 rounded-sm border transition-all ${isDark ? 'border-gray-800 hover:border-gray-600' : 'border-gray-200 hover:border-gray-400'} ${cardBg}`}
      >
        <div className="flex items-start gap-3 mb-2">
          <span className="text-lg">{service.icon}</span>
          <div className="flex-1 min-w-0">
            <span className={`font-mono text-[11px] font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              {isCN ? service.nameCN : service.name}
            </span>
            <p className={`font-mono text-[9px] mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {service.baseUrl}
            </p>
          </div>
        </div>

        <p className={`font-mono text-[10px] ${descText} mb-2`}>
          {isCN ? service.descCN : service.description}
        </p>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-[8px] font-bold tracking-wider uppercase ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {isCN ? 'Key 类型:' : 'KEY TYPE:'}
            </span>
            <span className={`font-mono text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {service.keyType}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-[8px] font-bold tracking-wider uppercase ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {isCN ? '使用模块:' : 'USED IN:'}
            </span>
            <span className={`font-mono text-[9px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {isCN ? service.usedInCN : service.usedIn}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div
        className={`relative w-[680px] max-w-[95vw] max-h-[90vh] overflow-y-auto ${panelBg} border ${borderColor} rounded-sm shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${borderColor} ${panelBg}`}>
          <div className="flex items-center gap-3">
            <span className="text-base">🧠</span>
            <h2 className="font-mono text-xs font-bold tracking-[0.2em] uppercase">
              {isCN ? 'AI 模型 & API 总览' : 'AI MODEL & API REGISTRY'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-sm border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-300 text-gray-400'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 当前 API 配置状态 */}
        <div className={`mx-6 mt-4 px-4 py-3 rounded-sm border ${isDark ? 'border-gray-800 bg-[#0D0D0D]' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-gray-500">
              {isCN ? '当前激活配置' : 'ACTIVE CONFIGURATION'}
            </span>
            {/* 「打开配置面板」按钮已移除：入口统一收敛到右下角 ApiSettingsFab */}
          </div>
          <div className="grid grid-cols-1 gap-3">
            {/* Gemini 原生 */}
            <div
              className={`px-3 py-2 rounded-sm border transition-all cursor-pointer hover:border-moke-red/50 ${
                isConfigured
                  ? (isDark ? 'border-emerald-800 bg-emerald-950/20' : 'border-emerald-200 bg-emerald-50')
                  : (isDark ? 'border-gray-800' : 'border-gray-200')
              }`}
              onClick={handleOpenApiConfig}
              title={isCN ? '点击打开 API 设置' : 'Click to open API settings'}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-gray-600'}`} />
                <span className="font-mono text-[9px] font-bold">Gemini {isCN ? '原生' : 'Native'}</span>
                {isConfigured && (
                  <span className="font-mono text-[7px] text-emerald-500 tracking-widest">{isCN ? '使用中' : 'ACTIVE'}</span>
                )}
              </div>
              <p className={`font-mono text-[8px] mt-0.5 truncate ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {config.model || 'gemini-3.1-flash-image-preview'}
              </p>
              {/* 连接状态 */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {geminiStatus === 'idle' && !isConfigured && (
                  <span className="font-mono text-[8px] text-gray-600">⚠️ {isCN ? '未配置' : 'NOT SET'}</span>
                )}
                {geminiStatus === 'idle' && isConfigured && (
                  <span className="font-mono text-[8px] text-gray-500">⏳ {isCN ? '检测中...' : 'CHECKING...'}</span>
                )}
                {geminiStatus === 'testing' && (
                  <span className="font-mono text-[8px] text-amber-400 animate-pulse">⏳ {isCN ? '测试连接中...' : 'TESTING...'}</span>
                )}
                {geminiStatus === 'success' && (
                  <span className="font-mono text-[8px] text-emerald-400">
                    ✅ {isCN ? '已连接' : 'CONNECTED'}
                    {geminiLatency != null && <span className="text-emerald-600 ml-1">{geminiLatency}ms</span>}
                  </span>
                )}
                {geminiStatus === 'fail' && (
                  <span className="font-mono text-[8px] text-red-400" title={geminiMsg}>
                    ❌ {isCN ? '连接失败' : 'FAILED'}
                    {geminiLatency != null && <span className="text-red-600 ml-1">{geminiLatency}ms</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab 切换栏 */}
        <div className={`flex mx-6 mt-4 border rounded-sm overflow-hidden ${borderColor}`}>
          {(['image', 'llm', 'api'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const labels: Record<TabType, { en: string; cn: string; icon: string; count: number }> = {
              image: { en: 'IMAGE MODELS', cn: '图片生成模型', icon: '🎨', count: IMAGE_MODELS.length },
              llm:   { en: 'LLM MODELS', cn: '大语言模型', icon: '🧠', count: LLM_MODELS.length },
              api:   { en: 'API SERVICES', cn: 'API 服务', icon: '🔌', count: API_SERVICES.length },
            };
            const info = labels[tab];

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 font-mono text-[9px] font-bold tracking-widest uppercase transition-all relative ${
                  isActive
                    ? (isDark ? 'bg-moke-red/10 text-moke-red' : 'bg-moke-red/5 text-moke-red')
                    : (isDark ? 'text-gray-600 hover:text-gray-400 hover:bg-gray-900/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50')
                }`}
              >
                <span>{info.icon}</span>
                <span>{isCN ? info.cn : info.en}</span>
                <span className={`px-1 py-0 rounded-sm text-[8px] ${isActive ? 'bg-moke-red/20 text-moke-red' : (isDark ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400')}`}>
                  {info.count}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-moke-red" />
                )}
              </button>
            );
          })}
        </div>

        {/* 内容区域 */}
        <div className="px-6 py-4 flex flex-col gap-3">
          {activeTab === 'image' && (
            <>
              <p className={`font-mono text-[10px] ${descText} mb-1`}>
                {isCN
                  ? '以下图片生成模型均基于 Google Gemini 系列。通过 ⚙️ API 设置面板可切换主界面使用的模型。'
                  : 'All image models are Google Gemini series. Switch via ⚙️ API Config panel.'}
              </p>
              {IMAGE_MODELS.map(renderModelCard)}
            </>
          )}

          {activeTab === 'llm' && (
            <>
              <p className={`font-mono text-[10px] ${descText} mb-1`}>
                {isCN
                  ? '以下大语言模型用于 AI 对话、视觉分析、剧本解析和提示词增强等功能。模型已在各模块中预设，暂不支持 UI 切换。'
                  : 'LLM models for AI chat, visual analysis, script parsing, and prompt enhancement. Pre-configured per module.'}
              </p>
              {LLM_MODELS.map(renderModelCard)}
            </>
          )}

          {activeTab === 'api' && (
            <>
              <p className={`font-mono text-[10px] ${descText} mb-1`}>
                {isCN
                  ? '项目使用的 API 服务和通信协议。'
                  : 'API services and protocols.'}
              </p>
              {API_SERVICES.map(renderApiServiceCard)}
            </>
          )}
        </div>

        {/* 底部统计 */}
        <div className={`sticky bottom-0 flex items-center justify-between px-6 py-3 border-t ${borderColor} ${panelBg}`}>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {isCN ? '图片模型' : 'Image'}: <span className="text-rose-400 font-bold">{IMAGE_MODELS.length}</span>
            </span>
            <span className={`font-mono text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {isCN ? '大语言模型' : 'LLM'}: <span className="text-emerald-400 font-bold">{LLM_MODELS.length}</span>
            </span>
            <span className={`font-mono text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              {isCN ? 'API 服务' : 'API'}: <span className="text-cyan-400 font-bold">{API_SERVICES.length}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className={`font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-sm border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-300 text-gray-400'}`}
          >
            {isCN ? '关闭' : 'CLOSE'}
          </button>
        </div>
      </div>

      {/* [v2] 内置的"新版" API 设置弹窗 —— 自管理，关闭时回收本地 state */}
      {showApiSettings && (
        <ApiSettingsModal onClose={() => setShowApiSettings(false)} />
      )}
    </div>
  );
};
