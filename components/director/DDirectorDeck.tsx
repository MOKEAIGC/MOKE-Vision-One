// 文件路径: components/director/DDirectorDeck.tsx
// DirectorDeck 导演控制台 — 量子相机风格

import React, { useState, useRef } from 'react';
import { DButton } from './DButton';
import { DirectorAspectRatio, DirectorImageSize, DirectorGenerationMode, DirectorCharacter, DirectorModelId } from '../../types_director';
import { Grid2X2, Grid3X3, Zap, Layers, Sparkles, MonitorPlay, Square, UserPlus, Users, Trash2, ChevronDown, ChevronUp, Plus, Cpu, Lock, X as XIcon, MapPin, Upload } from 'lucide-react';
import { useTextShortcuts } from '../useTextShortcuts';

interface DDirectorDeckProps {
  mode: DirectorGenerationMode;
  setMode: (mode: DirectorGenerationMode) => void;
  modelId: DirectorModelId;
  setModelId: (modelId: DirectorModelId) => void;
  aspectRatio: DirectorAspectRatio;
  setAspectRatio: (ar: DirectorAspectRatio) => void;
  imageSize: DirectorImageSize;
  setImageSize: (size: DirectorImageSize) => void;
  batchSize: number;
  setBatchSize: (size: number) => void;
  prompt: string;
  setPrompt: (text: string) => void;
  lockedPrompt: string;
  setLockedPrompt: (text: string) => void;
  characters: DirectorCharacter[];
  onAddCharacter: (name: string, description: string, imageFile?: File) => void;
  onRemoveCharacter: (id: string) => void;
  scenes: DirectorCharacter[];
  onAddScene: (name: string, description: string, imageFile?: File) => void;
  onRemoveScene: (id: string) => void;
  onGenerate: () => void;
  onGenerateCharacterAsset?: (charName: string, charDesc: string) => void;
  onGenerateSceneAsset?: (sceneName: string, sceneDesc: string) => void;
  isGenerating: boolean;
  onEnhancePrompt?: () => void;
  activeSection?: 'settings' | 'cast' | 'prompt';
}

const CINEMATIC_PRESETS = [
  { label: "特写", value: "extreme close-up shot, detailed facial features, shallow depth of field, sharp focus" },
  { label: "广角", value: "wide angle anamorphic shot, establishing context, majestic environment" },
  { label: "赛博朋克", value: "neon-noir aesthetics, atmospheric haze, rim lighting, vibrant blue and magenta" },
  { label: "黄金时刻", value: "warm golden light, long shadows, natural warmth, sun flare" },
  { label: "纪实", value: "handheld camera look, realistic lighting, raw textures, authentic atmosphere" },
  { label: "分镜大师", value: `<role>
你是一位获奖预告片导演+摄影师+故事板艺术家。你的工作:将单张参考图转化为连贯的电影级短镜头序列,然后输出适用于AI视频生成的关键帧
</role>
<non-negotiable rules>
1)分析完整构图:识别所有核心主体,描述空间关系与互动
2)不得猜测真实身份、确切地点或品牌归属权
3)所有镜头保持严格连贯性:相同主体、相同服装/外观、相同环境
4)景深需符合现实逻辑
5)不得引入参考图中未出现的新角色/物体
</non-negotiable rules>
<goal>
将图像扩展为10-20秒的电影级片段,具备清晰主题与情绪递进(铺垫→升级→转折→收尾)
</goal>
<output>
输出单张主联络表图像(3X3网格),包含所有关键帧,每帧标注编号+镜头类型+建议时长
</output>` }
];

export const DDirectorDeck: React.FC<DDirectorDeckProps> = ({
  mode, setMode, modelId, setModelId,
  aspectRatio, setAspectRatio, imageSize, setImageSize,
  batchSize, setBatchSize, prompt, setPrompt,
  lockedPrompt, setLockedPrompt,
  characters, onAddCharacter, onRemoveCharacter,
  scenes, onAddScene, onRemoveScene,
  onGenerate, onGenerateCharacterAsset, onGenerateSceneAsset, isGenerating, onEnhancePrompt,
  activeSection = 'prompt',
}) => {
  const [newCharName, setNewCharName] = useState('');
  const [newCharDesc, setNewCharDesc] = useState('');
  const [newCharImage, setNewCharImage] = useState<File | null>(null);
  const [newCharPreview, setNewCharPreview] = useState<string | null>(null);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);
  const charFileInputRef = useRef<HTMLInputElement>(null);

  // 场景相关状态
  const [castSubTab, setCastSubTab] = useState<'characters' | 'scenes'>('characters');
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneDesc, setNewSceneDesc] = useState('');
  const [newSceneImage, setNewSceneImage] = useState<File | null>(null);
  const [newScenePreview, setNewScenePreview] = useState<string | null>(null);
  const sceneFileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setNewCharImage(file); setNewCharPreview(URL.createObjectURL(file)); }
  };

  const handleSceneImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setNewSceneImage(file); setNewScenePreview(URL.createObjectURL(file)); }
  };

  const textareaShortcuts = useTextShortcuts({ isTextarea: true, onCmdEnter: onGenerate });
  const inputShortcuts = useTextShortcuts();

  const handleAdd = () => {
    if (newCharName.trim()) {
      onAddCharacter(newCharName.trim(), newCharDesc.trim(), newCharImage || undefined);
      setNewCharName(''); setNewCharDesc(''); setNewCharImage(null);
      if (newCharPreview) URL.revokeObjectURL(newCharPreview);
      setNewCharPreview(null);
    }
  };

  const handleAddScene = () => {
    if (newSceneName.trim()) {
      onAddScene(newSceneName.trim(), newSceneDesc.trim(), newSceneImage || undefined);
      setNewSceneName(''); setNewSceneDesc(''); setNewSceneImage(null);
      if (newScenePreview) URL.revokeObjectURL(newScenePreview);
      setNewScenePreview(null);
    }
  };

  // 预设点击 → 锁定为提示词
  const lockPreset = (label: string, value: string) => {
    setLockedPrompt(value);
  };

  // 角色资产生成提示词模板
  const CHARACTER_ASSET_PROMPT = (name: string, desc: string) =>
    `角色人物资产图: "${name}" — ${desc}。柔和均匀打光，无明显阴影，细腻质感，高清细节，8K分辨率，干净通透，真人画风。画面布局: 左侧放大头部细节展示，右侧放人物三视图（包含正面全身照、侧面全身照、背面全身照），超真实，超写实，16:9`;

  const SCENE_ASSET_PROMPT = (name: string, desc: string) =>
    `场景概念图: "${name}" — ${desc}。电影级光照，大气透视，丰富细节，8K分辨率，超写实环境设计。画面布局: 主视角全景展示场景全貌，包含光影氛围、材质纹理、空间纵深，16:9`;

  return (
    <div className="flex flex-col h-full space-y-4 select-none font-mono pb-4">
      {/* 标题 + 状态 */}
      <div className="flex items-center justify-between pl-1">
        <span className="text-moke-red text-[10px] font-bold uppercase tracking-[0.2em]">
          {activeSection === 'settings' && '引擎 & 构图'}
          {activeSection === 'cast' && '角色资产'}
          {activeSection === 'prompt' && '场景描述'}
        </span>
        {isGenerating && (
          <div className="flex items-center gap-2 px-3 py-1 bg-moke-red/10 rounded-sm border border-moke-red/20">
            <div className="w-1.5 h-1.5 bg-moke-red rounded-full animate-pulse"></div>
            <span className="text-[9px] text-moke-red font-bold tracking-widest uppercase">渲染中</span>
          </div>
        )}
      </div>

      {/* ===== 设置 Tab（引擎 + 构图 合并） ===== */}
      {activeSection === 'settings' && (
        <div className="space-y-4 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">引擎</label>
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-sm p-3 shadow-inner">
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: DirectorModelId.GEMINI_3_1_FLASH, label: "Nano Banana 2", desc: "快速高质量" },
                { id: DirectorModelId.GEMINI_3_PRO, label: "Nano Banana Pro", desc: "专业级智能" },
                { id: DirectorModelId.GEMINI_2_5_FLASH, label: "Nano Banana", desc: "标准生成" }
              ].map((item) => (
                <button key={item.id} onClick={() => setModelId(item.id)}
                  className={`flex items-center justify-between p-2.5 rounded-sm transition-all border text-left ${
                    modelId === item.id ? 'bg-moke-red/10 border-moke-red/50 text-white' : 'bg-moke-black/40 border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                  }`}>
                  <div className="flex items-center gap-2">
                    <Cpu size={14} className={modelId === item.id ? 'text-moke-red' : 'opacity-50'} />
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest">{item.label}</div>
                      <div className="text-[8px] opacity-60">{item.desc}</div>
                    </div>
                  </div>
                  {modelId === item.id && <div className="w-1.5 h-1.5 rounded-full bg-moke-red" />}
                </button>
              ))}
            </div>
          </div>

          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">构图</label>
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-sm p-3 space-y-3 shadow-inner">
            <div className="space-y-1.5">
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest opacity-60">布局模式</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { m: DirectorGenerationMode.SINGLE, icon: Square, label: "单图" },
                  { m: DirectorGenerationMode.GRID_2x2, icon: Grid2X2, label: "2x2" },
                  { m: DirectorGenerationMode.GRID_3x3, icon: Grid3X3, label: "3x3" }
                ].map((item) => (
                  <button key={item.label} onClick={() => setMode(item.m)}
                    className={`flex flex-col items-center justify-center gap-1 py-2 rounded-sm transition-all border ${
                      mode === item.m ? 'bg-moke-red/10 border-moke-red/50 text-white' : 'bg-moke-black/40 border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                    }`}>
                    <item.icon size={14} className={mode === item.m ? 'text-moke-red' : ''} />
                    <span className="text-[8px] font-bold uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest opacity-60">宽高比</span>
              <div className="flex flex-wrap gap-1">
                {Object.values(DirectorAspectRatio).map((ar) => (
                  <button key={ar} onClick={() => setAspectRatio(ar)}
                    className={`text-[9px] px-2.5 py-1.5 rounded-sm font-bold transition-all border ${
                      aspectRatio === ar ? 'bg-gradient-to-r from-moke-red to-[#900000] text-white border-transparent' : 'bg-moke-black/40 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
                    }`}>
                    {ar}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pl-1">数量 & 质量</label>
          <div className="bg-[#0A0A0A] border border-gray-800 rounded-sm p-3 space-y-3 shadow-inner">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} onClick={() => setBatchSize(n)}
                  className={`flex-1 py-1.5 rounded-sm transition-all text-[10px] font-bold border ${
                    batchSize === n ? 'bg-moke-red text-white border-transparent' : 'bg-moke-black/40 border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}>{n}</button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {[{ s: DirectorImageSize.K2, label: "2K" }, { s: DirectorImageSize.K4, label: "4K" }].map((item) => (
                <button key={item.label} onClick={() => setImageSize(item.s)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm transition-all text-[9px] font-bold uppercase tracking-widest border ${
                    imageSize === item.s ? 'bg-white/10 border-gray-600 text-white' : 'bg-moke-black/40 border-gray-800 text-gray-500'
                  }`}>
                  {item.s === DirectorImageSize.K4 && <MonitorPlay size={10} />}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== 角色 & 场景 Tab ===== */}
      {activeSection === 'cast' && (
        <div className="space-y-3 flex-1 flex flex-col">
          {/* 子 Tab 切换 */}
          <div className="flex gap-1 bg-[#050505] rounded-sm p-0.5 border border-gray-800">
            <button onClick={() => setCastSubTab('characters')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all ${castSubTab === 'characters' ? 'bg-moke-red/15 text-moke-red' : 'text-gray-500 hover:text-gray-300'}`}>
              <Users size={10} /> 角色
            </button>
            <button onClick={() => setCastSubTab('scenes')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-all ${castSubTab === 'scenes' ? 'bg-emerald-500/15 text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <MapPin size={10} /> 场景
            </button>
          </div>

          {/* 角色子页 */}
          {castSubTab === 'characters' && (
            <div className="space-y-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {characters.length > 0 && (<div className="space-y-1.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {characters.map((char) => (
                  <div key={char.id} className="flex items-center gap-2 p-2 bg-[#0A0A0A] border border-gray-800 rounded-sm group">
                    <div className="w-8 h-8 rounded-sm bg-moke-black border border-gray-800 overflow-hidden shrink-0">
                      {char.imageUrl ? <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-moke-red">{char.name[0]}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-white truncate">{char.name}</div>
                      <div className="text-[8px] text-gray-500 truncate">{char.description || '无描述'}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onGenerateCharacterAsset && <button onClick={() => onGenerateCharacterAsset(char.name, char.description)} disabled={isGenerating} className="p-1 text-cyan-500 hover:text-cyan-300" title="生成资产图"><Sparkles size={10} /></button>}
                      <button onClick={() => onRemoveCharacter(char.id)} className="p-1 text-gray-600 hover:text-moke-red"><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))}
              </div>)}
              {characters.length > 0 && onGenerateCharacterAsset && (
                <button onClick={() => characters.forEach(c => onGenerateCharacterAsset!(c.name, c.description))} disabled={isGenerating}
                  className="w-full py-2 bg-gradient-to-r from-cyan-900/40 to-cyan-800/20 text-cyan-400 text-[9px] font-bold tracking-widest uppercase rounded-sm border border-cyan-800/50 flex items-center justify-center gap-2 disabled:opacity-30">
                  <Sparkles size={10} /> 生成所有人物资产
                </button>
              )}
              <div className="bg-[#0A0A0A]/40 border border-gray-800 rounded-sm p-3 space-y-2">
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">手动录入</span>
                <div className="flex gap-2">
                  <div className="w-10 h-10 shrink-0 rounded-sm border border-dashed border-gray-800 bg-moke-black hover:border-moke-red/50 cursor-pointer flex items-center justify-center overflow-hidden" onClick={() => charFileInputRef.current?.click()}>
                    {newCharPreview ? <img src={newCharPreview} className="w-full h-full object-cover" /> : <Plus size={12} className="text-gray-600" />}
                    <input type="file" ref={charFileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input type="text" value={newCharName} onChange={(e) => setNewCharName(e.target.value)} placeholder="角色名称" onKeyDown={inputShortcuts.onKeyDown} className="w-full bg-moke-black border border-gray-800 rounded-sm py-1 px-2 text-[10px] text-white focus:border-moke-red/50 outline-none placeholder:text-gray-600 font-mono" />
                    <input type="text" value={newCharDesc} onChange={(e) => setNewCharDesc(e.target.value)} placeholder="外观描述" onKeyDown={inputShortcuts.onKeyDown} className="w-full bg-moke-black border border-gray-800 rounded-sm py-1 px-2 text-[10px] text-white focus:border-moke-red/50 outline-none placeholder:text-gray-600 font-mono" />
                  </div>
                </div>
                <button onClick={handleAdd} disabled={!newCharName.trim()} className="w-full py-1.5 bg-white/5 hover:bg-moke-red hover:text-white text-[9px] text-gray-400 rounded-sm border border-gray-800 flex items-center justify-center gap-2 font-bold uppercase tracking-widest disabled:opacity-30">
                  <UserPlus size={10} /> 录入角色
                </button>
              </div>
            </div>
          )}

          {/* 场景子页 */}
          {castSubTab === 'scenes' && (
            <div className="space-y-3 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {scenes.length > 0 && (<div className="space-y-1.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {scenes.map((scene) => (
                  <div key={scene.id} className="flex items-center gap-2 p-2 bg-[#0A0A0A] border border-gray-800 rounded-sm group">
                    <div className="w-8 h-8 rounded-sm bg-moke-black border border-gray-800 overflow-hidden shrink-0">
                      {scene.imageUrl ? <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><MapPin size={12} className="text-emerald-500" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-white truncate">{scene.name}</div>
                      <div className="text-[8px] text-gray-500 truncate">{scene.description || '无描述'}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onGenerateSceneAsset && <button onClick={() => onGenerateSceneAsset(scene.name, scene.description)} disabled={isGenerating} className="p-1 text-emerald-500 hover:text-emerald-300" title="生成场景概念图"><Sparkles size={10} /></button>}
                      <button onClick={() => onRemoveScene(scene.id)} className="p-1 text-gray-600 hover:text-moke-red"><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))}
              </div>)}
              {scenes.length > 0 && onGenerateSceneAsset && (
                <button onClick={() => scenes.forEach(s => onGenerateSceneAsset!(s.name, s.description))} disabled={isGenerating}
                  className="w-full py-2 bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 text-emerald-400 text-[9px] font-bold tracking-widest uppercase rounded-sm border border-emerald-800/50 flex items-center justify-center gap-2 disabled:opacity-30">
                  <Sparkles size={10} /> 生成所有场景概念图
                </button>
              )}
              <div className="bg-[#0A0A0A]/40 border border-gray-800 rounded-sm p-3 space-y-2">
                <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">手动录入场景</span>
                <div className="flex gap-2">
                  <div className="w-10 h-10 shrink-0 rounded-sm border border-dashed border-gray-800 bg-moke-black hover:border-emerald-500/50 cursor-pointer flex items-center justify-center overflow-hidden" onClick={() => sceneFileInputRef.current?.click()}>
                    {newScenePreview ? <img src={newScenePreview} className="w-full h-full object-cover" /> : <Upload size={12} className="text-gray-600" />}
                    <input type="file" ref={sceneFileInputRef} className="hidden" accept="image/*" onChange={handleSceneImageChange} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <input type="text" value={newSceneName} onChange={(e) => setNewSceneName(e.target.value)} placeholder="场景名称" onKeyDown={inputShortcuts.onKeyDown} className="w-full bg-moke-black border border-gray-800 rounded-sm py-1 px-2 text-[10px] text-white focus:border-emerald-500/50 outline-none placeholder:text-gray-600 font-mono" />
                    <input type="text" value={newSceneDesc} onChange={(e) => setNewSceneDesc(e.target.value)} placeholder="环境、氛围、时间" onKeyDown={inputShortcuts.onKeyDown} className="w-full bg-moke-black border border-gray-800 rounded-sm py-1 px-2 text-[10px] text-white focus:border-emerald-500/50 outline-none placeholder:text-gray-600 font-mono" />
                  </div>
                </div>
                <button onClick={handleAddScene} disabled={!newSceneName.trim()} className="w-full py-1.5 bg-white/5 hover:bg-emerald-600 hover:text-white text-[9px] text-gray-400 rounded-sm border border-gray-800 flex items-center justify-center gap-2 font-bold uppercase tracking-widest disabled:opacity-30">
                  <MapPin size={10} /> 录入场景
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== 场景描述 Tab ===== */}
      {activeSection === 'prompt' && (
        <div className="space-y-3 flex-1 flex flex-col min-h-[180px]">
          <div className="flex justify-between items-center pl-1">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">场景描述</label>
            <button className="text-[10px] text-moke-red/70 hover:text-moke-red transition-colors flex items-center gap-1.5 font-bold uppercase tracking-widest" onClick={onEnhancePrompt}>
              <Sparkles size={12} /> AI增强
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 pb-1">
            {CINEMATIC_PRESETS.map((preset) => {
              const isHighlight = preset.label === "分镜大师";
              const isLocked = lockedPrompt === preset.value;
              return (
                <button key={preset.label} onClick={() => isLocked ? setLockedPrompt('') : lockPreset(preset.label, preset.value)}
                  className={`text-[9px] font-bold uppercase tracking-tighter px-2 py-1 rounded-sm transition-all border flex items-center gap-1 ${
                    isLocked
                    ? "bg-moke-red text-white border-moke-red shadow-[0_0_12px_rgba(208,0,0,0.3)]"
                    : isHighlight 
                      ? "bg-gradient-to-r from-moke-red to-[#900000] text-white border-transparent shadow-[0_0_12px_rgba(208,0,0,0.2)] hover:scale-105" 
                      : "bg-white/5 text-gray-500 hover:text-white hover:bg-moke-red/20 border-gray-800"
                  }`}>
                  {isLocked && <Lock size={8} />}
                  {isHighlight && !isLocked && <Sparkles size={10} className="fill-current" />}
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* 锁定提示词框 */}
          {lockedPrompt && (
            <div className="bg-[#0A0A0A] border border-moke-red/30 rounded-sm p-3 relative group">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lock size={9} className="text-moke-red" />
                <span className="text-[9px] text-moke-red font-bold tracking-widest uppercase">锁定提示词 · 每次生成自动附加</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono leading-relaxed break-all max-h-[80px] overflow-y-auto pr-6" style={{ scrollbarWidth: 'thin' }}>
                {lockedPrompt.length > 200 ? lockedPrompt.substring(0, 200) + '...' : lockedPrompt}
              </p>
              <button 
                onClick={() => setLockedPrompt('')}
                className="absolute top-2 right-2 p-1 text-gray-700 hover:text-moke-red transition-colors opacity-0 group-hover:opacity-100"
                title="清除锁定"
              >
                <XIcon size={12} />
              </button>
            </div>
          )}
          
          <div className="relative flex-1 group shadow-2xl">
            <textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="输入导演创意描述..."
              className="w-full h-full absolute inset-0 bg-moke-black border border-gray-800 rounded-sm p-5 text-[12px] text-gray-200 focus:border-moke-red/50 focus:ring-4 focus:ring-moke-red/5 ring-inset resize-none leading-relaxed placeholder:text-gray-600 transition-all outline-none font-mono tracking-tight"
              spellCheck={false}
              onKeyDown={textareaShortcuts.onKeyDown}
            />
          </div>
        </div>
      )}

      {/* 渲染按钮 — 始终显示 */}
      <DButton 
        variant="gradient" 
        className="w-full py-5 text-[11px] font-bold tracking-[0.2em] rounded-sm uppercase shrink-0"
        onClick={onGenerate}
        disabled={isGenerating || (!prompt.trim() && !lockedPrompt.trim())}
      >
        <span className="flex items-center justify-center gap-3">
          {isGenerating ? <Zap size={18} className="animate-spin" /> : <Layers size={18} />}
          {isGenerating ? '渲染中' : '开始渲染'}
        </span>
      </DButton>
    </div>
  );
};
