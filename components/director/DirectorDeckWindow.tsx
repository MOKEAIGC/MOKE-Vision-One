// 文件路径: components/director/DirectorDeckWindow.tsx
// DirectorDeck 分镜大师完整视窗 — 量子相机统一风格
// 这是 DirectorDeck 的主入口组件，包含完整的三面板布局和状态管理

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DAssetBay } from './DAssetBay';
import { DDirectorDeck } from './DDirectorDeck';
import { DCanvas } from './DCanvas';
import { DInspector } from './DInspector';
import { 
  DirectorAsset, DirectorGeneratedImage, DirectorGenerationMode, DirectorAspectRatio, 
  DirectorImageSize, DirectorCharacter, DirectorLanguage, DirectorModelId 
} from '../../types_director';
import { directorTranslations } from '../../translations_director';
import { 
  generateMultiViewGrid, fileToBase64, enhancePrompt, analyzeAsset, 
  ReferenceImageData, mergeImages, base64ToFile,
  setDirectorApiConfig 
} from '../../services/directorGeminiService';
import { saveDirectorProject, loadDirectorProject } from '../../services/directorProjectService';
import { useApiConfig } from '../../contexts/ApiConfigContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { AlertCircle, X, Loader2, Save, FolderOpen, Images, Cpu, Grid3X3, Users, MessageSquare, Settings } from 'lucide-react';
import { HeaderToolbar } from '../HeaderToolbar';
// @ts-ignore
import JSZip from 'jszip';

interface DirectorDeckWindowProps {
  onBack: () => void;
}

export const DirectorDeckWindow: React.FC<DirectorDeckWindowProps> = ({ onBack }) => {
  const { config } = useApiConfig();
  const { isDark } = useTheme();
  const lang: DirectorLanguage = 'zh';
  const t = directorTranslations[lang];

  // 同步量子相机 API 配置到 DirectorDeck 服务层
  useEffect(() => {
    setDirectorApiConfig(config.apiKey, config.baseUrl);
  }, [config]);

  // --- 面板尺寸 ---
  const [leftWidth, setLeftWidth] = useState(380);
  const [rightWidth, setRightWidth] = useState(320);
  const [assetPanelHeight, setAssetPanelHeight] = useState(280);
  
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);
  const isResizingAssetPanel = useRef(false);

  // --- 应用状态 ---
  const [assets, setAssets] = useState<DirectorAsset[]>([]);
  const [images, setImages] = useState<DirectorGeneratedImage[]>([]);
  const [characters, setCharacters] = useState<DirectorCharacter[]>([]);
  const [scenes, setScenes] = useState<DirectorCharacter[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | undefined>(undefined);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>(undefined);
  const [mode, setMode] = useState<DirectorGenerationMode>(DirectorGenerationMode.GRID_2x2);
  const [modelId, setModelId] = useState<DirectorModelId>(DirectorModelId.GEMINI_3_1_FLASH);
  const [aspectRatio, setAspectRatio] = useState<DirectorAspectRatio>(DirectorAspectRatio.WIDE);
  const [imageSize, setImageSize] = useState<DirectorImageSize>(DirectorImageSize.K4);
  const [batchSize, setBatchSize] = useState<number>(1);
  const [prompt, setPrompt] = useState<string>('');
  const [lockedPrompt, setLockedPrompt] = useState<string>('');
  const [zoom, setZoom] = useState<number>(3);
  
  const [filenamePattern] = useState('Shot_{date}_{time}_{id}');
  const [projectName, setProjectName] = useState('DirectorDeck_Project');

  // --- 多选 ---
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);
  const [isAssetMultiSelectMode, setIsAssetMultiSelectMode] = useState(false);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingLoading, setIsSavingLoading] = useState(false); 
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const projectInputRef = useRef<HTMLInputElement>(null);

  // --- 文件名生成 ---
  const generateFilename = (img: DirectorGeneratedImage, ext: string = 'png') => {
    if (img.customName && img.customName.trim()) return `${img.customName}.${ext}`;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 5).replace(/:/g, '');
    const shortId = img.id.substring(0, 4);
    let name = filenamePattern
      .replace('{date}', dateStr).replace('{time}', timeStr)
      .replace('{project}', projectName || 'Project').replace('{id}', shortId)
      .replace('{char}', characters.length > 0 ? characters[0].name : 'Scene');
    if (!name.trim()) name = `Shot_${shortId}`;
    return `${name.replace(/[^a-z0-9_\-]/gi, '_')}.${ext}`;
  };

  // --- 缩放逻辑 ---
  const startResizingLeft = useCallback(() => { isResizingLeft.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }, []);
  const startResizingRight = useCallback(() => { isResizingRight.current = true; document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'; }, []);
  const startResizingAssetPanel = useCallback(() => { isResizingAssetPanel.current = true; document.body.style.cursor = 'row-resize'; document.body.style.userSelect = 'none'; }, []);

  const stopResizing = useCallback(() => { 
    isResizingLeft.current = false; isResizingRight.current = false; isResizingAssetPanel.current = false;
    document.body.style.cursor = 'default'; document.body.style.userSelect = '';
  }, []);

  const onResize = useCallback((e: MouseEvent) => {
    if (isResizingLeft.current) setLeftWidth(Math.min(Math.max(e.clientX, 280), 500));
    if (isResizingRight.current) setRightWidth(Math.min(Math.max(window.innerWidth - e.clientX, 280), 500));
    if (isResizingAssetPanel.current) {
      const headerOffset = 80; 
      setAssetPanelHeight(Math.min(Math.max(e.clientY - headerOffset, 120), window.innerHeight - 300));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResizing);
    return () => { window.removeEventListener('mousemove', onResize); window.removeEventListener('mouseup', stopResizing); };
  }, [onResize, stopResizing]);

  // --- 处理器 ---
  const handleUpdateImage = (id: string, updates: Partial<DirectorGeneratedImage>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updates } : img));
  };

  const handleAddCharacter = async (name: string, description: string, imageFile?: File) => {
    let imageBase64 = ''; let imageUrl = ''; let mimeType = '';
    if (imageFile) {
      try { imageBase64 = await fileToBase64(imageFile); imageUrl = URL.createObjectURL(imageFile); mimeType = imageFile.type; } catch (e) { console.error(e); }
    }
    const newChar: DirectorCharacter = { id: crypto.randomUUID(), name, description, imageUrl, imageBase64, mimeType };
    setCharacters(prev => [...prev, newChar]);
  };

  const handleAddScene = async (name: string, description: string, imageFile?: File) => {
    let imageBase64 = ''; let imageUrl = ''; let mimeType = '';
    if (imageFile) {
      try { imageBase64 = await fileToBase64(imageFile); imageUrl = URL.createObjectURL(imageFile); mimeType = imageFile.type; } catch (e) { console.error(e); }
    }
    const newScene: DirectorCharacter = { id: crypto.randomUUID(), name, description, imageUrl, imageBase64, mimeType };
    setScenes(prev => [...prev, newScene]);
  };

  const handleAddAsset = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const newAsset: DirectorAsset = { id: crypto.randomUUID(), file, previewUrl: url, type: file.type.startsWith('video') ? 'video' : 'image' };
      setAssets((prev) => [...prev, newAsset]);
    });
  };

  const handleImportImages = async (files: FileList) => {
    if (files.length === 0) return;
    const newImports: DirectorGeneratedImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const base64 = await fileToBase64(file);
        const url = `data:${file.type};base64,${base64}`;
        newImports.push({ id: crypto.randomUUID(), url, prompt: "导入的本地图片", aspectRatio: "CUSTOM", timestamp: Date.now(), customName: file.name.split('.')[0] });
      } catch (e) { console.error(`导入 ${file.name} 失败`, e); setError(`导入 ${file.name} 失败`); }
    }
    setImages(prev => [...newImports, ...prev]);
  };

  const handleAddToResources = (img: DirectorGeneratedImage) => {
    try {
      const fname = generateFilename(img, 'png');
      const file = base64ToFile(img.url, fname);
      const url = URL.createObjectURL(file);
      const newAsset: DirectorAsset = { id: crypto.randomUUID(), file, previewUrl: url, type: 'image', analysis: `从渲染结果导入: ${img.prompt.substring(0, 50)}...` };
      setAssets(prev => [newAsset, ...prev]);
    } catch (e) { console.error(e); setError("导入到资源库失败"); }
  };

  const handleDownload = async (img: DirectorGeneratedImage) => {
    const fileName = generateFilename(img, 'png');
    await downloadImage(img.url, fileName);
  };

  const handleDownloadAll = async () => {
    const imagesToExport = isMultiSelectMode && selectedExportIds.length > 0 
      ? selectedExportIds.map(id => images.find(img => img.id === id)).filter((img): img is DirectorGeneratedImage => !!img)
      : images;
    if (imagesToExport.length === 0) return;

    setIsGenerating(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder(projectName || "moke_renders");
      const addNumbering = isMultiSelectMode && selectedExportIds.length > 0;
      for (let i = 0; i < imagesToExport.length; i++) {
        const img = imagesToExport[i];
        const res = await fetch(img.url);
        const blob = await res.blob();
        let fname = generateFilename(img, 'png');
        if (addNumbering) fname = `${(i + 1).toString().padStart(3, '0')}_${fname}`;
        folder.file(fname, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      await downloadBlob(content, `${projectName}_Export_${Date.now()}.zip`);
    } catch (err) { console.error("ZIP 导出失败", err); }
    finally { setIsGenerating(false); }
  };

  const handleMerge = async () => {
    if (selectedExportIds.length < 2) return;
    setIsMerging(true);
    try {
      const selectedImages = selectedExportIds.map(id => images.find(img => img.id === id)).filter((img): img is DirectorGeneratedImage => !!img);
      const urls = selectedImages.map(img => img.url);
      const mergedBase64 = await mergeImages(urls);
      const newImage: DirectorGeneratedImage = { id: crypto.randomUUID(), url: mergedBase64, prompt: `合并了 ${selectedImages.length} 个镜头`, aspectRatio: 'CUSTOM', timestamp: Date.now(), customName: `${projectName}_Merged_${Date.now()}` };
      setImages(prev => [newImage, ...prev]);
      setSelectedExportIds([]); setIsMultiSelectMode(false); 
    } catch (err: any) { setError("合并失败: " + err.message); }
    finally { setIsMerging(false); }
  };

  const handleAssetMerge = async () => {
    if (selectedAssetIds.length < 2) return;
    setIsMerging(true);
    try {
      const selectedAssets = selectedAssetIds.map(id => assets.find(a => a.id === id)).filter((a): a is DirectorAsset => !!a);
      const urls = selectedAssets.map(a => a.previewUrl);
      const mergedBase64 = await mergeImages(urls);
      const file = base64ToFile(mergedBase64, `${projectName}_Reference_Merged_${Date.now()}.png`);
      const url = URL.createObjectURL(file);
      const newAsset: DirectorAsset = { id: crypto.randomUUID(), file, previewUrl: url, type: 'image', analysis: '合并的参考资源' };
      setAssets(prev => [newAsset, ...prev]);
      setSelectedAssetIds([]); setIsAssetMultiSelectMode(false);
    } catch (err: any) { setError("资源合并失败: " + err.message); }
    finally { setIsMerging(false); }
  };

  const handleToggleSelection = (id: string) => { selectedExportIds.includes(id) ? setSelectedExportIds(prev => prev.filter(x => x !== id)) : setSelectedExportIds(prev => [...prev, id]); };
  const handleToggleAssetSelection = (id: string) => { selectedAssetIds.includes(id) ? setSelectedAssetIds(prev => prev.filter(x => x !== id)) : setSelectedAssetIds(prev => [...prev, id]); };
  const handleToggleSelectAllImages = () => { selectedExportIds.length === images.length && images.length > 0 ? setSelectedExportIds([]) : setSelectedExportIds(images.map(img => img.id)); };
  const handleToggleSelectAllAssets = () => { selectedAssetIds.length === assets.length && assets.length > 0 ? setSelectedAssetIds([]) : setSelectedAssetIds(assets.map(a => a.id)); };
  const handleReorderImages = (fromIndex: number, toIndex: number) => { const n = [...selectedExportIds]; const [m] = n.splice(fromIndex, 1); n.splice(toIndex, 0, m); setSelectedExportIds(n); };
  const handleReorderCanvasImages = (fromIndex: number, toIndex: number) => { setImages(prev => { const n = [...prev]; const [m] = n.splice(fromIndex, 1); n.splice(toIndex, 0, m); return n; }); };
  const handleReorderAssets = (fromIndex: number, toIndex: number) => { const n = [...selectedAssetIds]; const [m] = n.splice(fromIndex, 1); n.splice(toIndex, 0, m); setSelectedAssetIds(n); };

  const handleGenerate = async () => {
    setError(null);
    if (!prompt.trim() && !lockedPrompt.trim()) { setError("请输入描述内容或选择锁定提示词"); return; }
    setIsGenerating(true);
    try {
      const referenceImages: ReferenceImageData[] = await Promise.all(
        assets.filter(a => a.type === 'image').map(async (asset) => ({ data: await fileToBase64(asset.file), mimeType: asset.file.type }))
      );
      let rows = 1, cols = 1;
      if (mode === DirectorGenerationMode.GRID_2x2) { rows = 2; cols = 2; }
      else if (mode === DirectorGenerationMode.GRID_3x3) { rows = 3; cols = 3; }
      
      // 拼接最终提示词：锁定提示词 + 场景描述
      const finalPrompt = lockedPrompt.trim() && prompt.trim()
        ? `${lockedPrompt.trim()}\n\n${prompt.trim()}`
        : lockedPrompt.trim() || prompt.trim();

      const batchId = crypto.randomUUID();
      const generationPromises = Array.from({ length: batchSize }).map(() =>
        generateMultiViewGrid(finalPrompt, rows, cols, aspectRatio, imageSize, referenceImages, characters, modelId)
      );
      const results = await Promise.all(generationPromises);
      const newImages: DirectorGeneratedImage[] = [];
      results.forEach((res, bIdx) => {
        res.slices.forEach((url, sIdx) => {
          newImages.push({ id: crypto.randomUUID(), url, prompt: finalPrompt, aspectRatio, timestamp: Date.now(), batchId, indexInBatch: sIdx + (bIdx * res.slices.length) });
        });
      });
      setImages(prev => [...newImages, ...prev]);
    } catch (err: any) { setError(err.message); }
    finally { setIsGenerating(false); }
  };

  // --- 工程保存/载入 ---
  const handleSaveProject = async () => {
    setIsSavingLoading(true);
    try {
      await saveDirectorProject(assets, images, characters, { projectName, filenamePattern, lang }, { mode, modelId, aspectRatio, imageSize, batchSize, prompt });
    } catch (err: any) { setError(err.message); }
    finally { setIsSavingLoading(false); }
  };

  const handleLoadProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSavingLoading(true);
    try {
      const data = await loadDirectorProject(file);
      setAssets(data.assets); setImages(data.images); setCharacters(data.characters);
      setProjectName(data.settings.projectName);
      setMode(data.deck.mode);
      if (data.deck.modelId) setModelId(data.deck.modelId);
      setAspectRatio(data.deck.aspectRatio); setImageSize(data.deck.imageSize);
      setBatchSize(data.deck.batchSize); setPrompt(data.deck.prompt);
      setSelectedAssetId(undefined); setSelectedImageId(undefined);
    } catch (err: any) { setError("载入工程失败: " + err.message); }
    finally { setIsSavingLoading(false); if (projectInputRef.current) projectInputRef.current.value = ''; }
  };

  // --- 左侧面板 Tab ---
  const [leftTab, setLeftTab] = useState<'create' | 'settings' | 'cast'>('create');

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-moke-black text-gray-200 font-mono transition-colors duration-500">
      
      {/* 顶部导航栏 */}
      <header className="h-14 border-b border-gray-800 bg-moke-black/90 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-6">
          {/* 返回按钮 */}
          <button 
            onClick={onBack}
            className="group flex items-center gap-2 px-4 py-2 border border-gray-800 rounded-sm transition-all active:scale-95 hover:border-moke-red text-gray-400"
          >
            <svg className="w-4 h-4 group-hover:text-moke-red transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs tracking-[0.2em] font-bold group-hover:text-moke-red uppercase">返回</span>
          </button>

          <div className="w-px h-6 bg-gray-800"></div>

          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase flex items-center gap-3">
              MOKE<span className="text-moke-red">.DIRECTOR</span>
              <span className="w-2 h-2 bg-moke-red rounded-full animate-pulse shadow-[0_0_8px_#D00000]"></span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 通用工具栏：设置⚙️、主题☀️、语言CN/EN */}
          <HeaderToolbar />

          <div className="w-px h-5 bg-gray-800" />

          <div className="flex items-center gap-2">
            <button 
              onClick={handleSaveProject}
              title={t.saveProject}
              className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/5 hover:bg-moke-red/50 text-gray-400 hover:text-white transition-all border border-gray-800"
            >
              {isSavingLoading ? <Loader2 size={14} className="animate-spin"/> : <Save size={14} />}
            </button>
            <button 
              onClick={() => projectInputRef.current?.click()}
              title={t.loadProject}
              className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/5 hover:bg-moke-red/50 text-gray-400 hover:text-white transition-all border border-gray-800"
            >
              <FolderOpen size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
      
        {/* 隐藏文件输入 */}
        <input type="file" ref={projectInputRef} onChange={handleLoadProject} accept=".moke,.json" className="hidden" />

        {/* 左侧面板 — Skills 风格 Tab 导航 */}
        <aside 
          style={{ width: `${leftWidth}px` }}
          className="flex border-r border-gray-800 bg-[#0A0A0A]/80 backdrop-blur-xl z-20 shadow-2xl shrink-0 transition-[width] duration-0 ease-linear"
        >
          {/* 侧边 Tab 导航栏 */}
          <div className="w-12 shrink-0 border-r border-gray-800 flex flex-col items-center py-3 gap-1 bg-[#050505]">
            {([
              { id: 'create' as const, icon: MessageSquare, label: '创作' },
              { id: 'settings' as const, icon: Settings, label: '设置' },
              { id: 'cast' as const, icon: Users, label: '角色' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLeftTab(tab.id)}
                className={`w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-sm transition-all ${
                  leftTab === tab.id
                    ? 'bg-moke-red/15 text-moke-red border border-moke-red/30'
                    : 'text-gray-600 hover:text-gray-300 hover:bg-white/5 border border-transparent'
                }`}
                title={tab.label}
              >
                <tab.icon size={14} />
                <span className="text-[7px] font-bold tracking-wider uppercase">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab 内容区 */}
          <div className="flex-1 overflow-hidden flex flex-col min-w-0">
            {/* 创作 Tab = 资源库 + 场景描述 */}
            {leftTab === 'create' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* 上方：资源库 */}
                <div className="shrink-0 max-h-[40%] overflow-y-auto p-4 border-b border-gray-800" style={{ scrollbarWidth: 'thin' }}>
                  <DAssetBay 
                    assets={assets} onAddAsset={handleAddAsset} 
                    onRemoveAsset={(id) => setAssets(a => a.filter(x => x.id !== id))} 
                    onSelectAsset={(a) => { setSelectedAssetId(a.id); setSelectedImageId(undefined); }} 
                    selectedAssetId={selectedAssetId}
                    isMultiSelectMode={isAssetMultiSelectMode}
                    selectedAssetIds={selectedAssetIds}
                    onToggleMultiSelect={() => { setIsAssetMultiSelectMode(!isAssetMultiSelectMode); setSelectedAssetIds([]); }}
                    onToggleSelectAll={handleToggleSelectAllAssets}
                    isAllSelected={selectedAssetIds.length === assets.length && assets.length > 0}
                    onToggleAssetSelection={handleToggleAssetSelection}
                    onMergeAssets={handleAssetMerge}
                    onReorderAssets={handleReorderAssets}
                    onAddToResources={handleAddToResources}
                  />
                </div>
                {/* 下方：场景描述 + 渲染 */}
                <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
                  <DDirectorDeck 
                    mode={mode} setMode={setMode}
                    modelId={modelId} setModelId={setModelId}
                    aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                    imageSize={imageSize} setImageSize={setImageSize}
                    batchSize={batchSize} setBatchSize={setBatchSize}
                    prompt={prompt} setPrompt={setPrompt}
                    lockedPrompt={lockedPrompt} setLockedPrompt={setLockedPrompt}
                    characters={characters}
                    onAddCharacter={handleAddCharacter}
                    onRemoveCharacter={(id) => setCharacters(c => c.filter(x => x.id !== id))}
                    scenes={scenes}
                    onAddScene={handleAddScene}
                    onRemoveScene={(id) => setScenes(s => s.filter(x => x.id !== id))}
                    onGenerate={handleGenerate}
                    onGenerateCharacterAsset={async (charName, charDesc) => {
                      setIsGenerating(true);
                      setError(null);
                      try {
                        const charPrompt = `角色人物资产图: "${charName}" — ${charDesc}。柔和均匀打光，无明显阴影，细腻质感，高清细节，8K分辨率，干净通透，真人画风。画面布局: 左侧放大头部细节展示，右侧放人物三视图（包含正面全身照、侧面全身照、背面全身照），超真实，超写实，16:9`;
                        const referenceImages: ReferenceImageData[] = await Promise.all(
                          assets.filter(a => a.type === 'image').map(async (asset) => ({ data: await fileToBase64(asset.file), mimeType: asset.file.type }))
                        );
                        const result = await generateMultiViewGrid(charPrompt, 1, 1, DirectorAspectRatio.WIDE, imageSize, referenceImages, characters, modelId);
                        const newImages: DirectorGeneratedImage[] = result.slices.map((url, i) => ({
                          id: crypto.randomUUID(), url, prompt: charPrompt, aspectRatio: DirectorAspectRatio.WIDE, timestamp: Date.now(), customName: `${charName}_资产图`
                        }));
                        setImages(prev => [...newImages, ...prev]);
                      } catch (err: any) { setError(err.message); }
                      finally { setIsGenerating(false); }
                    }}
                    isGenerating={isGenerating}
                    onEnhancePrompt={async () => { const e = await enhancePrompt(prompt); setPrompt(e); }}
                    onGenerateSceneAsset={async (sceneName, sceneDesc) => {
                      setIsGenerating(true); setError(null);
                      try {
                        const scenePrompt = `场景概念图: "${sceneName}" — ${sceneDesc}。电影级光照，大气透视，丰富细节，8K分辨率，超写实环境设计，16:9`;
                        const refs: ReferenceImageData[] = await Promise.all(assets.filter(a => a.type === 'image').map(async (a) => ({ data: await fileToBase64(a.file), mimeType: a.file.type })));
                        const result = await generateMultiViewGrid(scenePrompt, 1, 1, DirectorAspectRatio.WIDE, imageSize, refs, characters, modelId);
                        setImages(prev => [...result.slices.map(url => ({ id: crypto.randomUUID(), url, prompt: scenePrompt, aspectRatio: DirectorAspectRatio.WIDE, timestamp: Date.now(), customName: `${sceneName}_场景` })), ...prev]);
                      } catch (err: any) { setError(err.message); }
                      finally { setIsGenerating(false); }
                    }}
                    activeSection="prompt"
                  />
                </div>
              </div>
            )}

            {/* 设置 / 角色 Tab */}
            {leftTab !== 'create' && (
              <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
                <DDirectorDeck 
                  mode={mode} setMode={setMode}
                  modelId={modelId} setModelId={setModelId}
                  aspectRatio={aspectRatio} setAspectRatio={setAspectRatio}
                  imageSize={imageSize} setImageSize={setImageSize}
                  batchSize={batchSize} setBatchSize={setBatchSize}
                  prompt={prompt} setPrompt={setPrompt}
                  lockedPrompt={lockedPrompt} setLockedPrompt={setLockedPrompt}
                  characters={characters}
                  onAddCharacter={handleAddCharacter}
                  onRemoveCharacter={(id) => setCharacters(c => c.filter(x => x.id !== id))}
                  scenes={scenes}
                  onAddScene={handleAddScene}
                  onRemoveScene={(id) => setScenes(s => s.filter(x => x.id !== id))}
                  onGenerate={handleGenerate}
                  onGenerateCharacterAsset={async (charName, charDesc) => {
                    setIsGenerating(true);
                    setError(null);
                    try {
                      const charPrompt = `角色人物资产图: "${charName}" — ${charDesc}。柔和均匀打光，无明显阴影，细腻质感，高清细节，8K分辨率，干净通透，真人画风。画面布局: 左侧放大头部细节展示，右侧放人物三视图（包含正面全身照、侧面全身照、背面全身照），超真实，超写实，16:9`;
                      const referenceImages: ReferenceImageData[] = await Promise.all(
                        assets.filter(a => a.type === 'image').map(async (asset) => ({ data: await fileToBase64(asset.file), mimeType: asset.file.type }))
                      );
                      const result = await generateMultiViewGrid(charPrompt, 1, 1, DirectorAspectRatio.WIDE, imageSize, referenceImages, characters, modelId);
                      const newImages: DirectorGeneratedImage[] = result.slices.map((url, i) => ({
                        id: crypto.randomUUID(), url, prompt: charPrompt, aspectRatio: DirectorAspectRatio.WIDE, timestamp: Date.now(), customName: `${charName}_资产图`
                      }));
                      setImages(prev => [...newImages, ...prev]);
                    } catch (err: any) { setError(err.message); }
                    finally { setIsGenerating(false); }
                  }}
                  isGenerating={isGenerating}
                  onEnhancePrompt={async () => { const e = await enhancePrompt(prompt); setPrompt(e); }}
                  onGenerateSceneAsset={async (sceneName, sceneDesc) => {
                    setIsGenerating(true); setError(null);
                    try {
                      const scenePrompt = `场景概念图: "${sceneName}" — ${sceneDesc}。电影级光照，大气透视，丰富细节，8K分辨率，超写实环境设计，16:9`;
                      const refs: ReferenceImageData[] = await Promise.all(assets.filter(a => a.type === 'image').map(async (a) => ({ data: await fileToBase64(a.file), mimeType: a.file.type })));
                      const result = await generateMultiViewGrid(scenePrompt, 1, 1, DirectorAspectRatio.WIDE, imageSize, refs, characters, modelId);
                      setImages(prev => [...result.slices.map(url => ({ id: crypto.randomUUID(), url, prompt: scenePrompt, aspectRatio: DirectorAspectRatio.WIDE, timestamp: Date.now(), customName: `${sceneName}_场景` })), ...prev]);
                    } catch (err: any) { setError(err.message); }
                    finally { setIsGenerating(false); }
                  }}
                  activeSection={leftTab}
                />
              </div>
            )}
          </div>
        </aside>

        {/* 左侧拖拽条 */}
        <div 
          onMouseDown={startResizingLeft}
          className="w-1 hover:w-1.5 -ml-0.5 relative z-30 cursor-col-resize bg-transparent hover:bg-moke-red/40 transition-all shrink-0 active:bg-moke-red active:w-1.5 block"
        />

        {/* 中间画布 */}
        <main className="flex-1 relative overflow-hidden flex flex-col min-w-0" style={{ backgroundImage: 'radial-gradient(circle, #111 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <div className="absolute inset-0 flex flex-col">
            <DCanvas 
              t={t} images={images} selectedId={selectedImageId} 
              zoom={zoom} setZoom={setZoom}
              onSelect={(img) => { 
                if (isMultiSelectMode) { handleToggleSelection(img.id); } 
                else { setSelectedImageId(img.id); setSelectedAssetId(undefined); }
              }} 
              onDelete={(id) => setImages(i => i.filter(x => x.id !== id))}
              onDownload={handleDownload}
              onDownloadAll={handleDownloadAll}
              onMerge={handleMerge}
              isMultiSelectMode={isMultiSelectMode}
              onToggleMultiSelect={() => { setIsMultiSelectMode(!isMultiSelectMode); if (isMultiSelectMode) setSelectedExportIds([]); }}
              onToggleSelectAll={handleToggleSelectAllImages}
              isAllSelected={selectedExportIds.length === images.length && images.length > 0}
              selectedExportIds={selectedExportIds}
              isMerging={isMerging}
              onAddToResources={handleAddToResources}
              onReorderImages={handleReorderImages}
              onReorderCanvasImages={handleReorderCanvasImages}
              onImport={handleImportImages}
            />
          
            {/* 渲染进度 */}
            {isGenerating && (
              <div className="absolute bottom-6 right-6 z-50">
                <div className="bg-moke-black border border-moke-red/30 p-4 rounded-sm shadow-2xl flex items-center gap-4">
                  <Loader2 className="w-6 h-6 text-moke-red animate-spin" />
                  <div className="text-xs">
                    <p className="font-bold text-white uppercase tracking-widest">处理中</p>
                    <p className="text-gray-500 font-mono">分辨率: {imageSize}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-950/90 border border-moke-red/30 text-white p-4 rounded-sm text-xs flex gap-4 shadow-2xl backdrop-blur-xl">
                <AlertCircle size={18} className="text-red-400" />
                <div className="flex-1">
                  <p className="font-bold font-mono">执行错误</p>
                  <p className="opacity-80">{error}</p>
                </div>
                <button onClick={() => setError(null)}><X size={16}/></button>
              </div>
            )}
          </div>
        </main>

        {/* 右侧拖拽条 */}
        <div 
          onMouseDown={startResizingRight}
          className="w-1 hover:w-1.5 -mr-0.5 relative z-30 cursor-col-resize bg-transparent hover:bg-moke-red/40 transition-all shrink-0 active:bg-moke-red active:w-1.5 block"
        />

        {/* 右侧检视面板 */}
        <aside 
          style={{ width: `${rightWidth}px` }}
          className="bg-moke-black border-l border-gray-800 shadow-2xl shrink-0 transition-[width] duration-0 ease-linear block"
        >
          <DInspector 
            selectedImage={images.find(i => i.id === selectedImageId) || null} 
            selectedAsset={assets.find(a => a.id === selectedAssetId) || null} 
            onClose={() => { setSelectedImageId(undefined); setSelectedAssetId(undefined); }} 
            onAnalyze={async (p) => { 
              setIsAnalyzing(true); 
              const asset = assets.find(a => a.id === selectedAssetId);
              const img = images.find(i => i.id === selectedImageId);
              try {
                let data = ''; let mime = 'image/png';
                if (asset) { data = await fileToBase64(asset.file); mime = asset.file.type; }
                else if (img) { data = img.url.split(',')[1] || ''; }
                if (data) { const res = await analyzeAsset(data, mime, p); setAnalysisResult(res); }
              } catch (error) { console.error(error); }
              finally { setIsAnalyzing(false); }
            }} 
            onUpdate={handleUpdateImage}
            isAnalyzing={isAnalyzing} 
            analysisResult={analysisResult} 
          />
        </aside>
      </div>
    </div>
  );
};
