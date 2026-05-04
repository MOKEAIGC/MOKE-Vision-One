// 文件路径: components/seedance/SeedancePromptWindow.tsx
// Seedance 2.0 一键提示词生成窗口 — 量子相机统一 MOKE UI 风格
// 集成功能：提示词生成器 + 模板库 + 影视术语速查表

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useApiConfig } from '../../contexts/ApiConfigContext';
import { HeaderToolbar } from '../HeaderToolbar';
import { templates, Template } from './templates';
import { cheatSheetData } from './cheatSheet';
import { Asset } from './seedanceTypes';

// ======================= 接口 =======================
interface SeedancePromptWindowProps {
  onBack: () => void;
}

// ======================= 速查表分类 =======================
const cheatCategories = [
  { id: 'cameraShots', cn: '景别', en: 'Shot Size' },
  { id: 'cameraMoves', cn: '镜头运动', en: 'Camera Move' },
  { id: 'cameraAngles', cn: '机位角度', en: 'Camera Angle' },
  { id: 'focusDepth', cn: '焦点景深', en: 'Focus & DOF' },
  { id: 'transitions', cn: '转场', en: 'Transitions' },
  { id: 'rhythm', cn: '节奏术语', en: 'Rhythm' },
  { id: 'lighting', cn: '灯光设置', en: 'Lighting' },
  { id: 'colorPalette', cn: '色彩方案', en: 'Color' },
  { id: 'artStyle', cn: '艺术风格', en: 'Art Style' },
  { id: 'filmGrain', cn: '胶片纹理', en: 'Film Grain' },
];

// ======================= 主组件 =======================
export const SeedancePromptWindow: React.FC<SeedancePromptWindowProps> = ({ onBack }) => {
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const { config } = useApiConfig();
  const isCN = lang === 'CN';

  // ======================= AI 客户端工厂 =======================
  // 使用 Gemini 原生配置
  const getAIClient = async () => {
    const { GoogleGenAI } = await import('@google/genai');
    if (config.apiKey) {
      const options: any = { apiKey: config.apiKey };
      if (config.baseUrl) {
        options.httpOptions = { baseUrl: config.baseUrl.trim().replace(/\/+$/, '') };
      }
      return new GoogleGenAI(options);
    }
    throw new Error('请先在 API 配置面板设置 Gemini API Key');
  };

  // 检查是否已配置 API Key
  const hasApiKey = !!config.apiKey;

  // 获取当前用户配置的模型名（文本任务用）
  const getTextModel = () => {
    return config.model || 'gemini-2.5-flash-preview-05-20';
  };
  // 获取图片生成模型（优先使用用户配置的模型）
  const getImageModel = () => {
    return config.model || 'gemini-3-flash-preview';
  };

  // --- 页签 ---
  type MainTab = 'create' | 'library' | 'cheatsheet';
  const [activeTab, setActiveTab] = useState<MainTab>('create');

  // --- Create 页面状态 ---
  const [mode, setMode] = useState('全素材参考');
  const [assets, setAssets] = useState<Asset[]>([{ name: '@image1', description: '' }]);
  const [scriptText, setScriptText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptSegments, setPromptSegments] = useState<{ id: string; english: string; chinese: string }[]>([{ id: '1', english: '', chinese: '' }]);
  const [negative, setNegative] = useState('no watermark, no logo, no subtitles, no on-screen text, no music.');
  const [duration, setDuration] = useState('15');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [fps, setFps] = useState('');
  const [style, setStyle] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedSegmentId, setCopiedSegmentId] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'segments' | 'assets'>('segments');

  // --- CheatSheet 状态 ---
  const [cheatCategory, setCheatCategory] = useState(cheatCategories[0].id);
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);

  // --- Library 状态 ---
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // --- 错误提示 ---
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Assets 图片生成状态 ---
  const [generatingPromptIdx, setGeneratingPromptIdx] = useState<number | null>(null);
  const [generatingImageIdx, setGeneratingImageIdx] = useState<number | null>(null);
  // 资产扩展字段：AI 提示词 + 生成图片
  const [assetPrompts, setAssetPrompts] = useState<Record<number, { concept?: string; sheet?: string; diptych?: string; analysis?: string }>>({});
  const [assetImages, setAssetImages] = useState<Record<number, string>>({});

  // ======================= 样式变量 =======================
  const bg = isDark ? 'bg-[#0A0A0A]' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-[#111]' : 'bg-white';
  const border = isDark ? 'border-gray-800' : 'border-gray-200';
  const textPrimary = isDark ? 'text-gray-200' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-500' : 'text-gray-400';
  const inputBg = isDark ? 'bg-[#0A0A0A]' : 'bg-gray-100';
  const hoverBg = isDark ? 'hover:bg-gray-900' : 'hover:bg-gray-100';

  // ======================= 模板应用 =======================
  const handleSelectTemplate = (template: Template) => {
    setMode(template.mode);
    setAssets(template.assets.length > 0 ? [...template.assets] : [{ name: '@image1', description: '' }]);
    setPromptSegments([{ id: '1', english: template.prompt, chinese: '' }]);
    setNegative(template.negative);
    setDuration(template.settings.duration.replace(/[^0-9]/g, '') || '15');
    setAspectRatio(template.settings.aspectRatio);
    setFps(template.settings.fps || '');
    setStyle(template.settings.style || '');
    setActiveTab('create');
  };

  // ======================= 素材管理 =======================
  const handleAddAsset = () => setAssets([...assets, { name: '', description: '' }]);
  const handleRemoveAsset = (i: number) => setAssets(assets.filter((_, idx) => idx !== i));
  const handleAssetChange = (i: number, field: 'name' | 'description', value: string) => {
    const n = [...assets]; n[i] = { ...n[i], [field]: value }; setAssets(n);
  };

  // ======================= 段落管理 =======================
  const handleSegmentChange = (i: number, field: 'english' | 'chinese', value: string) => {
    const n = [...promptSegments]; n[i] = { ...n[i], [field]: value }; setPromptSegments(n);
  };
  const handleRemoveSegment = (i: number) => setPromptSegments(promptSegments.filter((_, idx) => idx !== i));

  // ======================= AI 提取资产 =======================
  const handleExtractAssets = async () => {
    if (!scriptText.trim() || !hasApiKey) return;
    setIsExtracting(true);
    setErrorMsg(null);
    try {
      const ai = await getAIClient();
      if (!ai) { setErrorMsg('未配置 API Key'); return; }

      const extractPrompt = `请从以下剧本中提取出主要的角色和场景资产，用于AI视频生成的素材映射。
返回纯 JSON 数组，每个对象包含 name（如 @image1, @scene1）和 description（描述外观特征）。
注意：只返回 JSON，不要包含 markdown 代码块标记。
剧本：
${scriptText}`;

      // 先尝试结构化输出
      let responseText = '';
      try {
        const { Type } = await import('@google/genai');
        const response = await ai.models.generateContent({
          model: getTextModel(),
          contents: extractPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ['name', 'description'],
              },
            },
          },
        });
        responseText = response.text || '';
      } catch {
        // 结构化输出不支持时，fallback 到普通模式
        const response = await ai.models.generateContent({
          model: getTextModel(),
          contents: extractPrompt,
        });
        responseText = response.text || '';
      }

      if (responseText) {
        // 清理 markdown 包裹
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const extracted = JSON.parse(jsonStr);
        if (Array.isArray(extracted) && extracted.length > 0) {
          if (assets.length === 1 && !assets[0].name && !assets[0].description) {
            setAssets(extracted);
          } else {
            setAssets([...assets, ...extracted]);
          }
        }
      }
    } catch (err: any) {
      console.error('提取失败:', err);
      setErrorMsg(`提取资产失败: ${err?.message || err}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // ======================= AI 生成提示词 =======================
  const handleGeneratePrompt = async () => {
    if (!scriptText.trim() || !hasApiKey) return;
    setIsGeneratingPrompt(true);
    setErrorMsg(null);
    try {
      const ai = await getAIClient();
      if (!ai) { setErrorMsg('未配置 API Key'); return; }
      const assetContext = assets.filter(a => a.name).map(a => `${a.name}: ${a.description}`).join('\n');
      const promptText = `你是一个专业的 AI 视频提示词工程师，精通 Seedance 2.0 格式。
请根据以下剧本和参数，分析剧本长度。如果剧本较长，请拆分为多个连贯的 ${duration}秒 视频段落。
为每段生成英文正式提示词（包含时间轴节拍），以及对应的中文翻译版本。

【剧本内容】
${scriptText}

【素材映射】
${assetContext || '无'}

【生成参数】
每段时长: ${duration}秒
画面比例: ${aspectRatio}
风格: ${style || '未指定'}
帧率: ${fps || '未指定'}

请返回纯 JSON 格式（不要 markdown 代码块），包含 "segments" 数组，每项含 "english" 和 "chinese"。`;

      // 先尝试结构化输出
      let responseText = '';
      try {
        const { Type } = await import('@google/genai');
        const response = await ai.models.generateContent({
          model: getTextModel(),
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                segments: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      english: { type: Type.STRING },
                      chinese: { type: Type.STRING },
                    },
                    required: ['english', 'chinese'],
                  },
                },
              },
              required: ['segments'],
            },
          },
        });
        responseText = response.text || '';
      } catch {
        // fallback: 不使用 responseSchema
        const response = await ai.models.generateContent({
          model: getTextModel(),
          contents: promptText,
        });
        responseText = response.text || '';
      }

      if (responseText) {
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const result = JSON.parse(jsonStr);
        if (result.segments?.length) {
          setPromptSegments(result.segments.map((seg: any, i: number) => ({
            id: Date.now().toString() + i,
            english: seg.english || '',
            chinese: seg.chinese || '',
          })));
        }
      }
    } catch (err: any) {
      console.error('生成失败:', err);
      setErrorMsg(`生成提示词失败: ${err?.message || err}`);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // ======================= 资产：AI 生成提示词 =======================
  const isSceneAsset = (asset: Asset) => {
    const n = (asset.name + asset.description).toLowerCase();
    return n.includes('scene') || n.includes('场景') || n.includes('环境') || n.includes('location') || n.includes('room') || n.includes('背景');
  };

  const handleGenerateAssetPrompt = async (index: number) => {
    const asset = assets[index];
    if (!asset.description || !hasApiKey) return;
    setGeneratingPromptIdx(index);
    try {
      const ai = await getAIClient();
      if (!ai) { console.error('未配置 API Key'); return; }
      const isScene = isSceneAsset(asset);

      const systemPrompt = isScene
        ? `你是一位专业的影视概念设计师和分镜师。根据用户提供的场景描述，生成一个"双联画（Diptych）"风格的AI绘图提示词。
生成一张16:9的单张图片，被垂直分割为左右两部分：
- 左侧(Panel 1): 摄影机正前方视图 — 场景的核心焦点
- 右侧(Panel 2): 摄影机反向180度视图 — 摄影机背后的景象
请严格以JSON格式输出：
{"scene_name":"场景名称","view_logic":"中文分析","prompt":"完整英文Prompt，包含 diptych, split screen, side by side, --ar 16:9"}`
        : `你是一位世界顶尖的影视概念设计师和AI绘画提示词专家。根据用户提供的角色描述，生成用于AI绘画的英文Prompt。
请严格以JSON格式输出：
{"character_name":"角色名","visual_analysis":"中文外貌分析","common_tags":"核心特征英文关键词","concept_art_prompt":"氛围概念图Prompt(16:9, cinematic)","character_sheet_prompt":"三视图Prompt(front view, side view, back view, white background, --ar 16:9)"}`;

      const userContent = isScene
        ? `场景名称：${asset.name}\n场景描述：${asset.description}${scriptText ? `\n\n相关剧本：\n${scriptText.substring(0, 500)}` : ''}`
        : `角色名称：${asset.name}\n角色描述：${asset.description}${scriptText ? `\n\n相关剧本：\n${scriptText.substring(0, 500)}` : ''}`;

      const response = await ai.models.generateContent({
        model: getTextModel(),
        contents: userContent,
        config: { systemInstruction: systemPrompt },
      });

      if (response.text) {
        // 清理 markdown 包裹
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const result = JSON.parse(jsonStr);
        if (isScene) {
          setAssetPrompts(prev => ({ ...prev, [index]: { diptych: result.prompt, analysis: result.view_logic } }));
        } else {
          setAssetPrompts(prev => ({
            ...prev,
            [index]: { concept: result.concept_art_prompt, sheet: result.character_sheet_prompt, analysis: result.visual_analysis },
          }));
        }
      }
    } catch (err: any) {
      console.error('资产提示词生成失败:', err);
      setErrorMsg(`资产提示词生成失败: ${err?.message || err}`);
    } finally {
      setGeneratingPromptIdx(null);
    }
  };

  // ======================= 资产：AI 生成图片 =======================
  const handleGenerateAssetImage = async (index: number) => {
    const prompts = assetPrompts[index];
    const asset = assets[index];
    if (!hasApiKey) return;

    // 使用已生成的提示词，或 fallback 到描述
    const isScene = isSceneAsset(asset);
    const imagePrompt = isScene
      ? (prompts?.diptych || `cinematic concept art, ${asset.description}, 16:9 widescreen, detailed environment, volumetric lighting`)
      : (prompts?.concept || `cinematic concept art of ${asset.name}, ${asset.description}, 16:9 widescreen, dramatic lighting, Unreal Engine 5 render`);

    setGeneratingImageIdx(index);
    try {
      const ai = await getAIClient();
      if (!ai) { console.error('未配置 API Key'); return; }
      const response = await ai.models.generateContent({
        model: getImageModel(),
        contents: { parts: [{ text: imagePrompt }] },
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          // @ts-ignore
          imageConfig: { aspectRatio: '16:9', imageSize: '1K' },
        },
      });
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const dataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          setAssetImages(prev => ({ ...prev, [index]: dataUrl }));
          break;
        }
      }
    } catch (err: any) {
      console.error('资产图片生成失败:', err);
      setErrorMsg(`资产图片生成失败: ${err?.message || err}`);
    } finally {
      setGeneratingImageIdx(null);
    }
  };

  // ======================= 复制 =======================
  const generateOutput = () => {
    let result = `模式：${mode}\n`;
    if (assets.some(a => a.name)) {
      result += `\n素材映射：\n`;
      assets.forEach(a => { if (a.name) result += `- ${a.name}：${a.description}\n`; });
    }
    if (negative) result += `\n负面约束：\n${negative}\n`;
    result += `\n生成设置：\n时长：${duration}秒  画面比例：${aspectRatio}`;
    if (fps) result += `  帧率：${fps}`;
    if (style) result += `  风格：${style}`;
    result += '\n';
    promptSegments.forEach((seg, i) => {
      result += `\n--- 段落 ${i + 1} ---\n英文提示词：\n${seg.english}\n`;
      if (seg.chinese) result += `\n中文参考：\n${seg.chinese}\n`;
    });
    return result;
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(generateOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySegment = (seg: { english: string; chinese: string; id: string }, type: 'en' | 'zh') => {
    navigator.clipboard.writeText(type === 'en' ? seg.english : seg.chinese);
    setCopiedSegmentId(`${seg.id}-${type}`);
    setTimeout(() => setCopiedSegmentId(null), 2000);
  };

  const handleCopyTerm = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTerm(text);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  const generateFullPrompt = (t: Template) => {
    let r = `模式：${t.mode}\n`;
    if (t.assets.length) { r += `素材映射：\n`; t.assets.forEach(a => { r += `- ${a.name}：${a.description}\n`; }); r += '\n'; }
    r += `提示词：\n${t.prompt}\n\n负面约束：\n${t.negative}\n\n`;
    r += `设置：时长${t.settings.duration} 比例${t.settings.aspectRatio}`;
    if (t.settings.fps) r += ` 帧率${t.settings.fps}`;
    if (t.settings.style) r += ` 风格${t.settings.style}`;
    return r;
  };

  // ======================= 渲染 =======================
  return (
    <div className={`flex flex-col h-full w-full ${bg} overflow-hidden select-none`}>
      {/* ===== HEADER ===== */}
      <header className={`flex items-center justify-between px-6 py-3 border-b ${border} ${isDark ? 'bg-[#0A0A0A]/90' : 'bg-white/90'} backdrop-blur-md shrink-0 z-50`}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className={`group flex items-center gap-2 px-3 py-1.5 border rounded-sm transition-all active:scale-95 ${isDark ? 'border-gray-800 hover:border-moke-red text-gray-400' : 'border-gray-300 hover:border-moke-red text-gray-600'}`}
          >
            <svg className="w-3.5 h-3.5 group-hover:text-moke-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-mono text-[10px] tracking-[0.2em] font-bold group-hover:text-moke-red uppercase">{isCN ? '返回' : 'BACK'}</span>
          </button>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-sm font-black tracking-[0.15em] uppercase flex items-center gap-3">
              <span className={textPrimary}>MOKE.</span>
              <span className="text-moke-red">SEEDANCE</span>
              <span className="w-2 h-2 bg-moke-red rounded-full animate-pulse shadow-[0_0_8px_#D00000]" />
            </h1>
          </div>
        </div>
        <HeaderToolbar />
      </header>

      {/* ===== 三页签导航 ===== */}
      <div className={`flex items-center gap-1 px-6 py-2 border-b ${border} shrink-0`}>
        {([
          { key: 'create' as MainTab, label: isCN ? '✨ 提示词生成' : '✨ GENERATOR' },
          { key: 'library' as MainTab, label: isCN ? '📚 模板库' : '📚 LIBRARY' },
          { key: 'cheatsheet' as MainTab, label: isCN ? '📖 速查表' : '📖 CHEAT SHEET' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-mono text-[10px] font-bold tracking-wider px-4 py-2 rounded-sm transition-all ${
              activeTab === tab.key
                ? 'bg-moke-red text-white'
                : `${isDark ? 'text-gray-500 hover:text-white hover:bg-gray-900' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 页面内容 ===== */}
      <div className="flex-1 overflow-hidden relative">

        {/* ==================== CREATE 页面 ==================== */}
        <div className={`absolute inset-0 flex ${activeTab === 'create' ? '' : 'hidden'}`}>
          {/* 左列 - 配置 */}
          <div className={`w-[420px] shrink-0 border-r ${border} flex flex-col ${bg} relative`}>
            {/* 模式切换 */}
            <div className={`flex items-center gap-1 p-3 border-b ${border}`}>
              {(isCN ? ['纯文本', '首尾帧', '全素材', '多段拼接'] : ['TEXT', 'KEYFRAME', 'FULL REF', 'MULTI']).map((m, mi) => {
                const modes = ['纯文本', '首尾帧', '全素材', '多段拼接'];
                const mVal = modes[mi];
                return (
                <button
                  key={m}
                  onClick={() => setMode(mVal === '纯文本' ? '纯文本生成' : mVal === '全素材' ? '全素材参考' : mVal)}
                  className={`flex-1 font-mono text-[9px] font-bold tracking-wider py-2 rounded-sm transition-all ${
                    mode.includes(mVal) || (mVal === '纯文本' && mode === '纯文本生成') || (mVal === '全素材' && mode === '全素材参考')
                      ? 'bg-moke-red text-white'
                      : `${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'} ${hoverBg}`
                  }`}
                >
                  {m}
                </button>
              )})}
            </div>

            {/* 配置区域 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-20 scrollbar-thin">
              {/* 当前模型 + 错误提示 */}
              <div className="space-y-2">
                <div className={`flex items-center gap-2 font-mono text-[9px] ${textSecondary}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>MODEL: <span className={textPrimary}>{getTextModel()}</span></span>
                </div>
                {errorMsg && (
                  <div className={`flex items-start gap-2 px-3 py-2 rounded-sm border ${isDark ? 'border-red-900/50 bg-red-950/20' : 'border-red-200 bg-red-50'}`}>
                    <span className="text-red-500 text-xs shrink-0">⚠</span>
                    <div className="flex-1">
                      <p className={`font-mono text-[10px] ${isDark ? 'text-red-400' : 'text-red-600'} break-all`}>{errorMsg}</p>
                    </div>
                    <button onClick={() => setErrorMsg(null)} className={`text-[10px] shrink-0 ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>✕</button>
                  </div>
                )}
              </div>
              {/* 剧本参考 */}
              <div className={`rounded-sm border ${border} overflow-hidden`}>
                <div className={`flex justify-between items-center px-3 py-2 ${cardBg}`}>
                  <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${textSecondary}`}>📖 剧本参考</span>
                  <button
                    onClick={handleExtractAssets}
                    disabled={isExtracting || !scriptText.trim()}
                    className={`font-mono text-[8px] font-bold px-2 py-1 rounded-sm border transition-all disabled:opacity-30 ${isDark ? 'border-gray-700 text-gray-400 hover:border-moke-red hover:text-moke-red' : 'border-gray-300 text-gray-500 hover:border-moke-red'}`}
                  >
                    {isExtracting ? '⏳ 提取中...' : '提取资产'}
                  </button>
                </div>
                <textarea
                  value={scriptText}
                  onChange={e => setScriptText(e.target.value)}
                  className={`w-full ${inputBg} border-t ${border} font-mono text-xs ${textPrimary} resize-none min-h-[100px] p-3 focus:outline-none placeholder:${textSecondary}`}
                  placeholder={isCN ? '输入剧本或创意描述...' : 'Enter script or creative description...'}
                />
              </div>

              {/* 生成设置 */}
              <div className={`rounded-sm border ${border} overflow-hidden`}>
                <div className={`px-3 py-2 ${cardBg}`}>
                  <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${textSecondary}`}>⚙ 生成设置</span>
                </div>
                <div className={`grid grid-cols-2 gap-2 p-3 border-t ${border}`}>
                  {[
                    { label: '时长(秒)', value: duration, onChange: setDuration, placeholder: '15' },
                    { label: '帧率', value: fps, onChange: setFps, placeholder: '24fps' },
                    { label: '风格', value: style, onChange: setStyle, placeholder: 'Cinematic' },
                  ].map(item => (
                    <div key={item.label}>
                      <label className={`font-mono text-[8px] font-bold ${textSecondary} block mb-1`}>{item.label}</label>
                      <input
                        type="text"
                        value={item.value}
                        onChange={e => item.onChange(e.target.value)}
                        className={`w-full ${inputBg} border ${border} rounded-sm px-2 py-1.5 font-mono text-[11px] ${textPrimary} focus:outline-none focus:border-moke-red`}
                        placeholder={item.placeholder}
                      />
                    </div>
                  ))}
                  <div>
                    <label className={`font-mono text-[8px] font-bold ${textSecondary} block mb-1`}>画面比例</label>
                    <select
                      value={aspectRatio}
                      onChange={e => setAspectRatio(e.target.value)}
                      className={`w-full ${inputBg} border ${border} rounded-sm px-2 py-1.5 font-mono text-[11px] ${textPrimary} focus:outline-none focus:border-moke-red`}
                    >
                      <option value="9:16">9:16</option>
                      <option value="16:9">16:9</option>
                      <option value="1:1">1:1</option>
                      <option value="原比例">原比例</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 素材映射 */}
              <div className={`rounded-sm border ${border} overflow-hidden`}>
                <div className={`flex justify-between items-center px-3 py-2 ${cardBg}`}>
                  <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${textSecondary}`}>🖼 素材映射</span>
                  <button onClick={handleAddAsset} className={`font-mono text-[10px] ${textSecondary} hover:text-moke-red transition-colors`}>+</button>
                </div>
                <div className={`p-2 space-y-2 border-t ${border}`}>
                  {assets.map((asset, i) => (
                    <div key={i} className={`flex gap-2 items-center ${inputBg} p-2 rounded-sm border ${border}`}>
                      <div className="flex-1 space-y-1 min-w-0">
                        <input
                          type="text"
                          value={asset.name}
                          onChange={e => handleAssetChange(i, 'name', e.target.value)}
                          className={`w-full bg-transparent font-mono text-[11px] font-bold ${textPrimary} focus:outline-none`}
                          placeholder="@image1"
                        />
                        <input
                          type="text"
                          value={asset.description}
                          onChange={e => handleAssetChange(i, 'description', e.target.value)}
                          className={`w-full bg-transparent font-mono text-[10px] ${textSecondary} focus:outline-none`}
                          placeholder="描述..."
                        />
                      </div>
                      <button onClick={() => handleRemoveAsset(i)} className={`text-[10px] ${textSecondary} hover:text-red-400`}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 负面约束 */}
              <div className={`rounded-sm border ${border} overflow-hidden`}>
                <div className={`px-3 py-2 ${cardBg}`}>
                  <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${textSecondary}`}>🚫 负面约束</span>
                </div>
                <textarea
                  value={negative}
                  onChange={e => setNegative(e.target.value)}
                  className={`w-full ${inputBg} border-t ${border} font-mono text-[10px] ${textPrimary} resize-none min-h-[50px] p-3 focus:outline-none`}
                  placeholder="排除元素..."
                />
              </div>
            </div>

            {/* 生成按钮 - 固定底部 */}
            <div className={`absolute bottom-0 left-0 right-0 p-3 ${isDark ? 'bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/90 to-transparent' : 'bg-gradient-to-t from-gray-50 via-gray-50/90 to-transparent'}`}>
              <button
                onClick={handleGeneratePrompt}
                disabled={isGeneratingPrompt || !scriptText.trim()}
                className="w-full py-3 rounded-sm bg-moke-red text-white font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isGeneratingPrompt ? '⏳ 生成中...' : '✨ CREATE'}
              </button>
            </div>
          </div>

          {/* 右列 - 输出 */}
          <div className={`flex-1 flex flex-col ${bg} overflow-hidden`}>
            {/* 右侧顶栏 */}
            <div className={`flex items-center justify-between px-4 py-2 border-b ${border} shrink-0`}>
              <div className="flex gap-4">
                {(['segments', 'assets'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setRightTab(tab)}
                    className={`font-mono text-[10px] font-bold tracking-wider py-1 border-b-2 transition-all ${
                      rightTab === tab
                        ? 'border-moke-red text-moke-red'
                        : `border-transparent ${textSecondary} hover:${textPrimary}`
                    }`}
                  >
                    {tab === 'segments' ? 'SEGMENTS' : 'ASSETS'}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCopyAll}
                className={`font-mono text-[8px] font-bold px-3 py-1.5 rounded-sm border transition-all ${
                  copied
                    ? 'border-emerald-600 text-emerald-400'
                    : `${isDark ? 'border-gray-700 text-gray-400 hover:border-moke-red hover:text-moke-red' : 'border-gray-300 text-gray-500 hover:border-moke-red'}`
                }`}
              >
                {copied ? '✅ 已复制' : '📋 复制全部'}
              </button>
            </div>

            {/* 段落列表 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
              {rightTab === 'segments' ? (
                promptSegments.map((seg, i) => (
                  <div key={seg.id} className={`rounded-sm border ${border} ${cardBg} overflow-hidden group`}>
                    <div className={`flex items-center justify-between px-3 py-2 border-b ${border}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-[9px] font-bold ${textPrimary}`}>SEGMENT {i + 1}</span>
                        <span className={`font-mono text-[7px] px-1.5 py-0.5 rounded-sm ${isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400'}`}>v2.0</span>
                        <span className={`font-mono text-[7px] px-1.5 py-0.5 rounded-sm ${isDark ? 'bg-gray-800 text-gray-500' : 'bg-gray-200 text-gray-400'}`}>{duration}s</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleCopySegment(seg, 'en')} className={`font-mono text-[7px] px-1.5 py-0.5 rounded-sm ${isDark ? 'bg-gray-800 text-gray-400 hover:text-emerald-400' : 'bg-gray-200 text-gray-500'}`}>
                          {copiedSegmentId === `${seg.id}-en` ? '✅' : 'EN'}
                        </button>
                        <button onClick={() => handleCopySegment(seg, 'zh')} className={`font-mono text-[7px] px-1.5 py-0.5 rounded-sm ${isDark ? 'bg-gray-800 text-gray-400 hover:text-emerald-400' : 'bg-gray-200 text-gray-500'}`}>
                          {copiedSegmentId === `${seg.id}-zh` ? '✅' : 'ZH'}
                        </button>
                        <button onClick={() => handleRemoveSegment(i)} className={`font-mono text-[7px] px-1.5 py-0.5 rounded-sm ${isDark ? 'bg-gray-800 text-gray-400 hover:text-red-400' : 'bg-gray-200 text-gray-500'}`}>✕</button>
                      </div>
                    </div>
                    {/* 英文 */}
                    <div className={`p-3 font-mono text-[10px] leading-relaxed ${textPrimary} whitespace-pre-wrap cursor-pointer ${hoverBg}`} onClick={() => handleCopySegment(seg, 'en')}>
                      {seg.english || 'No prompt generated yet.'}
                    </div>
                    {/* 中文 */}
                    <textarea
                      value={seg.chinese}
                      onChange={e => handleSegmentChange(i, 'chinese', e.target.value)}
                      className={`w-full ${inputBg} border-t ${border} font-mono text-[10px] ${textSecondary} resize-none min-h-[60px] p-3 focus:outline-none`}
                      placeholder="中文参考..."
                    />
                  </div>
                ))
              ) : (
                <div className="space-y-6">
                  {/* 角色资产 */}
                  {assets.some(a => !isSceneAsset(a)) && (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`font-mono text-[8px] font-bold tracking-[0.2em] uppercase ${textSecondary}`}>CHARACTERS</span>
                        <div className={`flex-1 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {assets.map((asset, i) => {
                          if (isSceneAsset(asset)) return null;
                          const prompts = assetPrompts[i];
                          const image = assetImages[i];
                          return (
                            <div key={i} className={`rounded-sm border ${border} ${cardBg} overflow-hidden group`}>
                              {/* 图片区域 */}
                              <div className={`aspect-video ${inputBg} relative flex items-center justify-center`}>
                                {image ? (
                                  <img src={image} alt={asset.name} className="w-full h-full object-cover" />
                                ) : (
                                  <span className={`font-mono text-[9px] ${textSecondary}`}>{isCN ? '16:9 概念图' : '16:9 Concept'}</span>
                                )}
                                {generatingImageIdx === i && (
                                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <span className="font-mono text-[10px] text-white animate-pulse">⏳ 生成图片中...</span>
                                  </div>
                                )}
                              </div>
                              {/* 信息区域 */}
                              <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`font-mono text-[10px] font-bold ${textPrimary} truncate`}>{asset.name || '未命名'}</span>
                                  <span className={`font-mono text-[7px] px-1.5 py-0.5 rounded-sm ${isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>角色</span>
                                </div>
                                <div className={`font-mono text-[8px] ${textSecondary} line-clamp-2`}>{asset.description || '暂无描述'}</div>
                                {/* AI 分析 */}
                                {prompts?.analysis && (
                                  <div className={`font-mono text-[8px] p-2 rounded-sm ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    📋 {prompts.analysis}
                                  </div>
                                )}
                                {/* 提示词展示 */}
                                {prompts?.concept && (
                                  <div className={`space-y-1`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`font-mono text-[7px] font-bold ${textSecondary}`}>概念图 PROMPT</span>
                                      <button onClick={() => { navigator.clipboard.writeText(prompts.concept!); }} className={`font-mono text-[7px] ${textSecondary} hover:text-moke-red`}>📋</button>
                                    </div>
                                    <div className={`font-mono text-[7px] p-2 rounded-sm leading-relaxed max-h-[60px] overflow-y-auto scrollbar-thin ${isDark ? 'bg-gray-900 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{prompts.concept}</div>
                                  </div>
                                )}
                                {prompts?.sheet && (
                                  <div className={`space-y-1`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`font-mono text-[7px] font-bold ${textSecondary}`}>三视图 PROMPT</span>
                                      <button onClick={() => { navigator.clipboard.writeText(prompts.sheet!); }} className={`font-mono text-[7px] ${textSecondary} hover:text-moke-red`}>📋</button>
                                    </div>
                                    <div className={`font-mono text-[7px] p-2 rounded-sm leading-relaxed max-h-[60px] overflow-y-auto scrollbar-thin ${isDark ? 'bg-gray-900 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{prompts.sheet}</div>
                                  </div>
                                )}
                                {/* 操作按钮 */}
                                <div className="flex gap-1.5 pt-1">
                                  <button
                                    onClick={() => handleGenerateAssetPrompt(i)}
                                    disabled={generatingPromptIdx === i || !asset.description}
                                    className={`flex-1 font-mono text-[8px] font-bold py-1.5 rounded-sm border transition-all disabled:opacity-30 ${isDark ? 'border-gray-700 text-gray-400 hover:border-moke-red hover:text-moke-red' : 'border-gray-300 text-gray-500 hover:border-moke-red'}`}
                                  >
                                    {generatingPromptIdx === i ? '⏳' : '🎯'} {isCN ? '生成提示词' : 'GEN PROMPT'}
                                  </button>
                                  <button
                                    onClick={() => handleGenerateAssetImage(i)}
                                    disabled={generatingImageIdx === i}
                                    className="flex-1 font-mono text-[8px] font-bold py-1.5 rounded-sm bg-moke-red text-white hover:brightness-110 transition-all disabled:opacity-30"
                                  >
                                    {generatingImageIdx === i ? '⏳' : '✨'} {isCN ? '生成图片' : 'GEN IMAGE'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 场景资产 */}
                  {assets.some(a => isSceneAsset(a)) && (
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`font-mono text-[8px] font-bold tracking-[0.2em] uppercase ${textSecondary}`}>SCENES</span>
                        <div className={`flex-1 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {assets.map((asset, i) => {
                          if (!isSceneAsset(asset)) return null;
                          const prompts = assetPrompts[i];
                          const image = assetImages[i];
                          return (
                            <div key={i} className={`rounded-sm border ${border} ${cardBg} overflow-hidden group`}>
                              {/* 图片区域 - 双联画 */}
                              <div className={`aspect-video ${inputBg} relative flex items-center justify-center`}>
                                {image ? (
                                  <img src={image} alt={asset.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono text-[8px] ${textSecondary}`}>{isCN ? '正视' : 'FRONT'}</span>
                                    <div className={`w-px h-6 ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
                                    <span className={`font-mono text-[8px] ${textSecondary}`}>{isCN ? '反视' : 'REVERSE'}</span>
                                  </div>
                                )}
                                {generatingImageIdx === i && (
                                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                    <span className="font-mono text-[10px] text-white animate-pulse">{isCN ? '⏳ 生成双联画中...' : '⏳ GENERATING DIPTYCH...'}</span>
                                  </div>
                                )}
                              </div>
                              {/* 信息区域 */}
                              <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`font-mono text-[10px] font-bold ${textPrimary} truncate`}>{asset.name || (isCN ? '未命名' : 'Unnamed')}</span>
                                  <span className={`font-mono text-[7px] px-1.5 py-0.5 rounded-sm ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>{isCN ? '场景' : 'SCENE'}</span>
                                </div>
                                <div className={`font-mono text-[8px] ${textSecondary} line-clamp-2`}>{asset.description || (isCN ? '暂无描述' : 'No description')}</div>
                                {/* AI 分析 */}
                                {prompts?.analysis && (
                                  <div className={`font-mono text-[8px] p-2 rounded-sm ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    📋 {prompts.analysis}
                                  </div>
                                )}
                                {/* 双联画提示词 */}
                                {prompts?.diptych && (
                                  <div className={`space-y-1`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`font-mono text-[7px] font-bold ${textSecondary}`}>DIPTYCH PROMPT</span>
                                      <button onClick={() => { navigator.clipboard.writeText(prompts.diptych!); }} className={`font-mono text-[7px] ${textSecondary} hover:text-moke-red`}>📋</button>
                                    </div>
                                    <div className={`font-mono text-[7px] p-2 rounded-sm leading-relaxed max-h-[60px] overflow-y-auto scrollbar-thin ${isDark ? 'bg-gray-900 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>{prompts.diptych}</div>
                                  </div>
                                )}
                                {/* 操作按钮 */}
                                <div className="flex gap-1.5 pt-1">
                                  <button
                                    onClick={() => handleGenerateAssetPrompt(i)}
                                    disabled={generatingPromptIdx === i || !asset.description}
                                    className={`flex-1 font-mono text-[8px] font-bold py-1.5 rounded-sm border transition-all disabled:opacity-30 ${isDark ? 'border-gray-700 text-gray-400 hover:border-moke-red hover:text-moke-red' : 'border-gray-300 text-gray-500 hover:border-moke-red'}`}
                                  >
                                    {generatingPromptIdx === i ? '⏳' : '🎯'} {isCN ? '生成提示词' : 'GEN PROMPT'}
                                  </button>
                                  <button
                                    onClick={() => handleGenerateAssetImage(i)}
                                    disabled={generatingImageIdx === i}
                                    className="flex-1 font-mono text-[8px] font-bold py-1.5 rounded-sm bg-moke-red text-white hover:brightness-110 transition-all disabled:opacity-30"
                                  >
                                    {generatingImageIdx === i ? '⏳' : '✨'} {isCN ? '生成图片' : 'GEN IMAGE'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {assets.length === 0 && (
                    <div className={`text-center py-16 font-mono text-[10px] ${textSecondary}`}>
                      {isCN ? '暂无资产。请在左侧提取或手动添加资产。' : 'No assets. Extract or add assets from the left panel.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== LIBRARY 页面 ==================== */}
        <div className={`absolute inset-0 overflow-y-auto p-4 space-y-3 scrollbar-thin ${activeTab === 'library' ? '' : 'hidden'}`}>
          {templates.map(tmpl => (
            <div key={tmpl.id} className={`rounded-sm border ${border} ${cardBg} overflow-hidden`}>
              <div className={`flex items-center justify-between px-4 py-3 border-b ${border}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[8px] font-bold px-2 py-0.5 rounded-sm bg-moke-red text-white`}>模板 {tmpl.id}</span>
                    <span className={`font-mono text-xs font-bold ${textPrimary}`}>{tmpl.name}</span>
                  </div>
                  <div className={`font-mono text-[8px] ${textSecondary} mt-1 flex gap-3`}>
                    <span>模式: {tmpl.mode}</span>
                    <span>时长: {tmpl.settings.duration}</span>
                    <span>比例: {tmpl.settings.aspectRatio}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`font-mono text-[8px] font-bold px-3 py-1.5 rounded-sm border ${isDark ? 'border-gray-700 text-gray-400 hover:border-moke-red hover:text-moke-red' : 'border-gray-300 text-gray-500 hover:border-moke-red'} transition-all`}
                  >
                    ▶ {isCN ? '应用' : 'APPLY'}
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(generateFullPrompt(tmpl)); setCopiedTemplateId(tmpl.id); setTimeout(() => setCopiedTemplateId(null), 2000); }}
                    className={`font-mono text-[8px] font-bold px-3 py-1.5 rounded-sm transition-all ${
                      copiedTemplateId === tmpl.id
                        ? 'bg-emerald-600/20 border border-emerald-600 text-emerald-400'
                        : 'bg-moke-red text-white hover:brightness-110'
                    }`}
                  >
                    {copiedTemplateId === tmpl.id ? '✅ 已复制' : '📋 复制'}
                  </button>
                </div>
              </div>
              <pre className={`p-4 font-mono text-[9px] ${textSecondary} whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin`}>
                {generateFullPrompt(tmpl)}
              </pre>
            </div>
          ))}
        </div>

        {/* ==================== CHEAT SHEET 页面 ==================== */}
        <div className={`absolute inset-0 flex ${activeTab === 'cheatsheet' ? '' : 'hidden'}`}>
          {/* 左侧分类 */}
          <div className={`w-36 shrink-0 border-r ${border} overflow-y-auto scrollbar-thin`}>
            {cheatCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCheatCategory(cat.id)}
                className={`w-full text-left px-3 py-2.5 font-mono text-[9px] font-bold transition-all ${
                  cheatCategory === cat.id
                    ? `${isDark ? 'bg-gray-900' : 'bg-gray-100'} text-moke-red border-r-2 border-moke-red`
                    : `${textSecondary} ${hoverBg}`
                }`}
              >
                {isCN ? cat.cn : cat.en}
              </button>
            ))}
          </div>
          {/* 右侧表格 */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            <table className={`w-full border ${border} rounded-sm overflow-hidden`}>
              <thead>
                <tr className={cardBg}>
                  <th className={`px-3 py-2 text-left font-mono text-[8px] font-bold tracking-wider uppercase ${textSecondary} border-b ${border}`}>{isCN ? '中文' : 'Chinese'}</th>
                  <th className={`px-3 py-2 text-left font-mono text-[8px] font-bold tracking-wider uppercase ${textSecondary} border-b ${border}`}>{isCN ? '英文 (Prompt)' : 'English (Prompt)'}</th>
                  <th className={`px-3 py-2 text-left font-mono text-[8px] font-bold tracking-wider uppercase ${textSecondary} border-b ${border}`}>{isCN ? '描述' : 'Description'}</th>
                </tr>
              </thead>
              <tbody>
                {((cheatSheetData as any)[cheatCategory] || []).map((item: any, i: number) => (
                  <tr
                    key={i}
                    onClick={() => handleCopyTerm(item.en)}
                    className={`border-b ${border} ${hoverBg} cursor-pointer transition-colors group`}
                  >
                    <td className={`px-3 py-2 font-mono text-[10px] font-bold ${textPrimary}`}>{item.zh}</td>
                    <td className={`px-3 py-2 font-mono text-[10px] ${textSecondary}`}>
                      <span className="flex items-center gap-1">
                        {item.en}
                        {copiedTerm === item.en ? (
                          <span className="text-emerald-400 text-[8px]">✅</span>
                        ) : (
                          <span className={`text-[8px] ${textSecondary} opacity-0 group-hover:opacity-100`}>📋</span>
                        )}
                      </span>
                    </td>
                    <td className={`px-3 py-2 font-mono text-[9px] ${textSecondary}`}>{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
