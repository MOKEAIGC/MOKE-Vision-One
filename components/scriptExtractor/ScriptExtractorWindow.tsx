// 文件路径: components/scriptExtractor/ScriptExtractorWindow.tsx
// 剧本资产提取器主窗口 — 全屏覆盖层

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Database } from 'lucide-react';
import { useApiConfig } from '../../contexts/ApiConfigContext';
import { useGlobalAssets } from '../../contexts/GlobalAssetContext';
import {
  setScriptApiConfig,
  extractSceneDiptych, extractCharacterSheet,
  SceneDiptychResult, CharacterSheetResult,
} from '../../services/scriptExtractorService';
import {
  generateMultiViewGrid, setDirectorApiConfig,
} from '../../services/directorGeminiService';
import { downloadImage } from '../../services/downloadService';
import { DirectorAspectRatio, DirectorImageSize } from '../../types_director';
import { STextInput } from './STextInput';
import { SResultPanel, GeneratedImage } from './SResultPanel';
import { SGlobalAssetPanel } from './SGlobalAssetPanel';
import { HeaderToolbar } from '../HeaderToolbar';

interface ScriptExtractorWindowProps {
  onBack: () => void;
}

export const ScriptExtractorWindow: React.FC<ScriptExtractorWindowProps> = ({ onBack }) => {
  const { config } = useApiConfig();
  const { assets, addAsset } = useGlobalAssets();

  // 同步 API 配置
  useEffect(() => {
    setScriptApiConfig(config.apiKey, config.baseUrl);
    setDirectorApiConfig(config.apiKey, config.baseUrl);
  }, [config]);

  // 状态管理
  const [scriptText, setScriptText] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractType, setExtractType] = useState<'scene' | 'character' | null>(null);
  const [sceneResult, setSceneResult] = useState<SceneDiptychResult | null>(null);
  const [characterResult, setCharacterResult] = useState<CharacterSheetResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 场景提取
  const handleExtractScene = useCallback(async () => {
    if (!scriptText.trim()) return;
    setIsExtracting(true);
    setExtractType('scene');
    setError(null);
    setSceneResult(null);
    try {
      const result = await extractSceneDiptych(scriptText);
      setSceneResult(result);
    } catch (err: any) {
      console.error('场景提取失败:', err);
      setError(err?.message || '场景提取失败');
    } finally {
      setIsExtracting(false);
      setExtractType(null);
    }
  }, [scriptText]);

  // 角色提取
  const handleExtractCharacter = useCallback(async () => {
    if (!scriptText.trim() || !characterName.trim()) return;
    setIsExtracting(true);
    setExtractType('character');
    setError(null);
    setCharacterResult(null);
    try {
      const result = await extractCharacterSheet(scriptText, characterName);
      setCharacterResult(result);
    } catch (err: any) {
      console.error('角色提取失败:', err);
      setError(err?.message || '角色提取失败');
    } finally {
      setIsExtracting(false);
      setExtractType(null);
    }
  }, [scriptText, characterName]);

  // 图片生成辅助函数
  const generateImage = useCallback(async (prompt: string, type: GeneratedImage['type'], label: string, genType: string) => {
    setIsGenerating(true);
    setGeneratingType(genType);
    setError(null);
    try {
      const result = await generateMultiViewGrid(
        prompt, 1, 1,
        type === 'character_sheet' ? DirectorAspectRatio.WIDE : DirectorAspectRatio.STANDARD,
        DirectorImageSize.K2,
        [], [],
      );
      const newImg: GeneratedImage = {
        id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        url: result.fullImage,
        type,
        prompt,
        label,
      };
      setGeneratedImages(prev => [newImg, ...prev]);
    } catch (err: any) {
      console.error('图片生成失败:', err);
      setError(err?.message || '图片生成失败');
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  }, []);

  // 生成场景双联画
  const handleGenerateScene = useCallback(() => {
    if (!sceneResult) return;
    generateImage(sceneResult.prompt, 'scene_diptych', sceneResult.scene_name, 'scene');
  }, [sceneResult, generateImage]);

  // 生成角色概念图
  const handleGenerateCharacterConcept = useCallback(() => {
    if (!characterResult) return;
    generateImage(characterResult.concept_art_prompt, 'character_concept', characterResult.character_name + ' 概念图', 'concept');
  }, [characterResult, generateImage]);

  // 生成角色三视图
  const handleGenerateCharacterSheet = useCallback(() => {
    if (!characterResult) return;
    generateImage(characterResult.character_sheet_prompt, 'character_sheet', characterResult.character_name + ' 三视图', 'sheet');
  }, [characterResult, generateImage]);

  // 保存到全局资产库
  const handleSaveToLibrary = useCallback((image: GeneratedImage) => {
    const assetType = image.type === 'scene_diptych' ? 'scene' : 'character';
    addAsset({
      name: image.label,
      type: assetType as 'scene' | 'character',
      thumbnailBase64: image.url,
      fullImageBase64: image.url,
      prompt: image.prompt,
      metadata: { generationType: image.type },
    });
  }, [addAsset]);

  // 下载图片
  const handleDownload = useCallback((image: GeneratedImage) => {
    downloadImage(image.url, `${image.label.replace(/\s+/g, '_')}_${Date.now()}.png`);
  }, []);

  // 编辑 prompt 回调
  const handleEditScenePrompt = useCallback((prompt: string) => {
    if (sceneResult) setSceneResult({ ...sceneResult, prompt });
  }, [sceneResult]);

  const handleEditConceptPrompt = useCallback((prompt: string) => {
    if (characterResult) setCharacterResult({ ...characterResult, concept_art_prompt: prompt });
  }, [characterResult]);

  const handleEditSheetPrompt = useCallback((prompt: string) => {
    if (characterResult) setCharacterResult({ ...characterResult, character_sheet_prompt: prompt });
  }, [characterResult]);

  return (
    <div className="fixed inset-0 z-[9997] bg-moke-black flex flex-col">
      {/* 顶部导航栏 */}
      <header className="h-14 bg-moke-black/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 px-3 py-1.5 border border-gray-800 rounded-sm hover:border-moke-red transition-all active:scale-95"
          >
            <ArrowLeft size={14} className="text-gray-400 group-hover:text-moke-red transition-colors" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-gray-400 group-hover:text-moke-red">返回</span>
          </button>
          <div className="w-px h-6 bg-gray-800" />
          <h1 className="font-mono text-sm font-black tracking-[0.15em] uppercase flex items-center gap-3">
            <span className="text-gray-300">MOKE.</span>
            <span className="text-moke-red">SCRIPT</span>
            <span className="w-2 h-2 bg-moke-red rounded-full animate-pulse shadow-[0_0_8px_#D00000]" />
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Database size={14} className="text-gray-600" />
            <span className="text-[10px] font-mono text-gray-500">
              资产库: <span className="text-moke-red font-bold">{assets.length}</span>
            </span>
          </div>

          <div className="w-px h-5 bg-gray-800" />

          {/* 通用工具栏：设置⚙️、主题☀️、语言CN/EN */}
          <HeaderToolbar />
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="mx-6 mt-2 px-4 py-2 bg-red-900/30 border border-red-800/50 rounded-sm flex items-center justify-between shrink-0">
          <span className="text-xs font-mono text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs font-mono">×</button>
        </div>
      )}

      {/* 三栏主体 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧 — 文本输入与提取控制 */}
        <div className="w-[380px] shrink-0 border-r border-gray-800 p-4 overflow-hidden">
          <STextInput
            scriptText={scriptText}
            setScriptText={setScriptText}
            characterName={characterName}
            setCharacterName={setCharacterName}
            onExtractScene={handleExtractScene}
            onExtractCharacter={handleExtractCharacter}
            isExtracting={isExtracting}
            extractType={extractType}
            sceneResult={sceneResult}
            characterResult={characterResult}
            onEditScenePrompt={handleEditScenePrompt}
            onEditConceptPrompt={handleEditConceptPrompt}
            onEditSheetPrompt={handleEditSheetPrompt}
          />
        </div>

        {/* 中间 — 生成结果与预览 */}
        <div className="flex-1 p-4 overflow-hidden">
          <SResultPanel
            sceneResult={sceneResult}
            characterResult={characterResult}
            generatedImages={generatedImages}
            isGenerating={isGenerating}
            generatingType={generatingType}
            onGenerateScene={handleGenerateScene}
            onGenerateCharacterConcept={handleGenerateCharacterConcept}
            onGenerateCharacterSheet={handleGenerateCharacterSheet}
            onSaveToLibrary={handleSaveToLibrary}
            onDownload={handleDownload}
          />
        </div>

        {/* 右侧 — 全局资产库 */}
        <div className="w-[320px] shrink-0 border-l border-gray-800 p-4 overflow-hidden">
          <SGlobalAssetPanel />
        </div>
      </div>
    </div>
  );
};
