// 文件路径: components/ModelSelector.tsx
import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTextShortcuts } from './useTextShortcuts';

// 支持图片生成的 Gemini 模型列表
export interface ImageModel {
  id: string;          // 模型 ID（API 调用时使用）
  name: string;        // 显示名称
  nameCN: string;      // 中文显示名称
  description: string; // 英文描述
  descCN: string;      // 中文描述
  tag: 'recommended' | 'new' | 'legacy' | 'pro' | 'experimental' | 'nano'; // 标签
  maxRes: string;      // 最大分辨率
  speed: 'fast' | 'medium' | 'slow'; // 速度
}

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'gemini-2.0-flash-preview-image-generation',
    name: 'Gemini 2.0 Flash Image',
    nameCN: 'Gemini 2.0 Flash 图片生成',
    description: 'Fast image generation, good quality',
    descCN: '快速图片生成，质量良好',
    tag: 'legacy',
    maxRes: '2K',
    speed: 'fast',
  },
  {
    id: 'gemini-3.0-flash-image-generation',
    name: 'Gemini 3.0 Flash Image',
    nameCN: 'Gemini 3.0 Flash 图片生成',
    description: 'Balanced speed and quality',
    descCN: '速度与质量均衡',
    tag: 'new',
    maxRes: '2K',
    speed: 'fast',
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Gemini 3.1 Flash Image',
    nameCN: 'Gemini 3.1 Flash 图片预览',
    description: 'Latest flash model, recommended for most use cases',
    descCN: '最新 Flash 模型，推荐大多数场景使用',
    tag: 'recommended',
    maxRes: '4K',
    speed: 'fast',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 2.0 Flash Experimental',
    nameCN: 'Gemini 2.0 Flash 实验版',
    description: 'Experimental features, may be unstable',
    descCN: '实验性功能，可能不稳定',
    tag: 'experimental',
    maxRes: '2K',
    speed: 'fast',
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Nano Banana 1',
    nameCN: 'Nano Banana 1 图片生成',
    description: 'Nano Banana (gemini-2.5-flash-image), fast and efficient image generation',
    descCN: 'Nano Banana 第一代（gemini-2.5-flash-image），快速高效图片生成',
    tag: 'nano',
    maxRes: '2K',
    speed: 'fast',
  },
  {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    nameCN: 'Nano Banana 2 图片生成',
    description: 'Nano Banana 2 (gemini-3.1-flash-image-preview), improved quality and detail',
    descCN: 'Nano Banana 第二代（gemini-3.1-flash-image-preview），提升画质与细节表现',
    tag: 'nano',
    maxRes: '2K',
    speed: 'fast',
  },
  {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    nameCN: 'Nano Banana Pro 专业版',
    description: 'Nano Banana Pro (gemini-3-pro-image-preview), highest quality with superior detail',
    descCN: 'Nano Banana 专业版（gemini-3-pro-image-preview），最高画质，细节与一致性卓越',
    tag: 'pro',
    maxRes: '4K',
    speed: 'medium',
  },
];

// 标签样式配置
const TAG_STYLES: Record<ImageModel['tag'], { bg: string; text: string; label: string; labelCN: string }> = {
  recommended: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'RECOMMENDED', labelCN: '推荐' },
  new:         { bg: 'bg-blue-500/20',    text: 'text-blue-400',    label: 'NEW',         labelCN: '新' },
  legacy:      { bg: 'bg-gray-500/20',    text: 'text-gray-400',    label: 'LEGACY',      labelCN: '旧版' },
  pro:         { bg: 'bg-amber-500/20',   text: 'text-amber-400',   label: 'PRO',         labelCN: '专业' },
  experimental:{ bg: 'bg-purple-500/20',   text: 'text-purple-400',  label: 'EXPERIMENTAL',labelCN: '实验' },
  nano:        { bg: 'bg-yellow-500/20',  text: 'text-yellow-400',  label: 'NANO',        labelCN: '纳米' },
};

const SPEED_ICONS: Record<ImageModel['speed'], { icon: string; label: string; labelCN: string }> = {
  fast:   { icon: '⚡', label: 'Fast',   labelCN: '快速' },
  medium: { icon: '🔄', label: 'Medium', labelCN: '中等' },
  slow:   { icon: '🔬', label: 'Slow',   labelCN: '精细' },
};

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelectModel }) => {
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const isCN = lang === 'CN';

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const inputShortcuts = useTextShortcuts();

  // 检查当前选择是否在预设列表中
  const isPresetModel = IMAGE_MODELS.some(m => m.id === selectedModel);

  const handleCustomSubmit = () => {
    if (customModel.trim()) {
      onSelectModel(customModel.trim());
      setShowCustomInput(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* 标签 */}
      <label className={`font-mono text-[10px] font-bold tracking-[0.15em] uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {isCN ? '图片生成模型' : 'IMAGE MODEL'}
        <span className="ml-2 text-moke-red">*</span>
      </label>

      {/* 模型卡片列表 */}
      <div className="flex flex-col gap-2">
        {/*
          按 id 去重（防御性）：历史原因 IMAGE_MODELS 中 gemini-3.1-flash-image-preview
          有两条（技术名 + Nano Banana 2 营销名），渲染时保留"后出现的"版本，
          避免 React 触发 duplicate key 警告；不改动原始数据数组以保持兼容性
        */}
        {Array.from(
          new Map(IMAGE_MODELS.map((m) => [m.id, m])).values(),
        ).map((model) => {
          const isSelected = selectedModel === model.id;
          const tagStyle = TAG_STYLES[model.tag];
          const speedInfo = SPEED_ICONS[model.speed];

          return (
            <button
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className={`relative w-full text-left px-4 py-3 rounded-sm border transition-all active:scale-[0.99] ${
                isSelected
                  ? 'border-moke-red bg-moke-red/5 shadow-[0_0_12px_rgba(208,0,0,0.1)]'
                  : isDark
                    ? 'border-gray-800 hover:border-gray-600 bg-[#0D0D0D]'
                    : 'border-gray-200 hover:border-gray-400 bg-gray-50'
              }`}
            >
              {/* 选中指示器 */}
              {isSelected && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-moke-red rounded-r-full" />
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* 模型名称 + 标签 */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-mono text-[11px] font-bold truncate ${
                      isSelected ? 'text-moke-red' : isDark ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      {isCN ? model.nameCN : model.name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[8px] font-bold tracking-wider ${tagStyle.bg} ${tagStyle.text}`}>
                      {isCN ? tagStyle.labelCN : tagStyle.label}
                    </span>
                  </div>

                  {/* 模型 ID */}
                  <p className={`font-mono text-[9px] mt-1 truncate ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {model.id}
                  </p>

                  {/* 描述 */}
                  <p className={`font-mono text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {isCN ? model.descCN : model.description}
                  </p>
                </div>

                {/* 右侧信息 */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`font-mono text-[9px] font-bold ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                    {speedInfo.icon} {isCN ? speedInfo.labelCN : speedInfo.label}
                  </span>
                  <span className={`font-mono text-[9px] ${isDark ? 'text-gray-700' : 'text-gray-400'}`}>
                    max {model.maxRes}
                  </span>
                  {/* 选中勾选 */}
                  {isSelected && (
                    <svg className="w-4 h-4 text-moke-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 自定义模型输入 */}
      <div className="mt-1">
        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            className={`w-full px-4 py-2 font-mono text-[10px] tracking-widest rounded-sm border border-dashed transition-all ${
              isDark
                ? 'border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'
                : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600'
            } ${!isPresetModel ? 'border-moke-red/50 text-moke-red/70' : ''}`}
          >
            {!isPresetModel
              ? `✎ ${isCN ? '当前自定义模型' : 'CUSTOM MODEL'}: ${selectedModel}`
              : (isCN ? '+ 输入自定义模型名称' : '+ ENTER CUSTOM MODEL NAME')
            }
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              onKeyDown={(e) => { inputShortcuts.onKeyDown(e); if (e.key === 'Enter') handleCustomSubmit(); }}
              placeholder={isCN ? '输入完整的模型名称...' : 'Enter full model name...'}
              autoFocus
              className={`flex-1 px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${
                isDark ? 'bg-[#111] text-gray-100 border-gray-700 focus:border-moke-red' : 'bg-gray-50 text-gray-900 border-gray-300 focus:border-moke-red'
              }`}
            />
            <button
              onClick={handleCustomSubmit}
              className="px-3 py-2 font-mono text-[10px] font-bold rounded-sm border border-moke-red bg-moke-red/10 text-moke-red hover:bg-moke-red/20 transition-all active:scale-95"
            >
              {isCN ? '确认' : 'OK'}
            </button>
            <button
              onClick={() => { setShowCustomInput(false); setCustomModel(''); }}
              className={`px-3 py-2 font-mono text-[10px] rounded-sm border transition-all active:scale-95 ${
                isDark ? 'border-gray-800 text-gray-500 hover:text-gray-300' : 'border-gray-300 text-gray-400 hover:text-gray-600'
              }`}
            >
              {isCN ? '取消' : 'CANCEL'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
