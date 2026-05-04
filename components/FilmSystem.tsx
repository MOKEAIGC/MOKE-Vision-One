// 文件路径: src/components/FilmSystem.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { filmPresets, cameraPresets, lensPresets, lightingPresets, aestheticPresets, FilmPreset } from '../data/filmData';
import { X, Plus, Camera, Aperture, Sun, Sparkles, Film, Lock, Trash2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
// === 新增：自定义胶片 + 环境参数 独立模块 ===
import { AddFilmForm } from './film/AddFilmForm';
import { AtmosphereControls, makeInitialAtmosphereState, type AtmosphereState } from './film/AtmosphereControls';
import {
  loadCustomFilms,
  removeCustomFilm,
  CUSTOM_FILM_CATEGORY,
  type CustomFilm,
} from '../services/customFilmStore';
import {
  recommendAtmosphere,
  formatAtmospherePromptFragment,
} from '../services/atmosphereRecommender';

interface FilmSystemProps {
  onClose: () => void;
  onApplyPrompt: (prompt: string) => void;
  onLockStyle: (prompt: string) => void;
  currentPrompt: string;
}

export const FilmSystem: React.FC<FilmSystemProps> = ({ onClose, onApplyPrompt, onLockStyle, currentPrompt }) => {
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const isCN = lang === 'CN';
  const [selectedFilm, setSelectedFilm] = useState<FilmPreset | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedLens, setSelectedLens] = useState<string>('');
  const [selectedLighting, setSelectedLighting] = useState<string>('');
  const [selectedAesthetic, setSelectedAesthetic] = useState<string>('');
  const [gridColumns, setGridColumns] = useState<number>(3);

  // === 新增状态：自定义胶片、表单开关、环境参数 ===
  /** 自定义胶片列表（从 localStorage 加载） */
  const [customFilms, setCustomFilms] = useState<CustomFilm[]>(() => loadCustomFilms());
  /** 是否展开「添加胶片」折叠表单 */
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  /** 环境参数三滑块受控状态 */
  const [atmosphere, setAtmosphere] = useState<AtmosphereState>(() => makeInitialAtmosphereState());
  /** 记录哪些维度被用户手动改过（切换胶片时不会覆盖手动值） */
  const [atmosphereOverride, setAtmosphereOverride] = useState<Set<keyof AtmosphereState>>(new Set());

  /** 合并后的胶片数据（内置 + 自定义），useMemo 缓存 */
  const allFilms = useMemo<FilmPreset[]>(
    () => [...filmPresets, ...customFilms],
    [customFilms],
  );

  /** 分类列表（含自定义分类，动态追加到末尾） */
  const categories = useMemo(() => {
    const base = Array.from(new Set(filmPresets.map(f => f.category)));
    return customFilms.length > 0 ? [...base, CUSTOM_FILM_CATEGORY] : base;
  }, [customFilms]);

  /** 当前选中胶片对应的推荐值（未选时为 null） */
  const recommendedAtmosphere = useMemo(
    () => (selectedFilm ? recommendAtmosphere(selectedFilm) : null),
    [selectedFilm],
  );

  /** 选中胶片变化时：只覆盖"未被手动改过"的维度，保留用户已手动调整的项 */
  useEffect(() => {
    if (!selectedFilm || !recommendedAtmosphere) return;
    setAtmosphere(prev => ({
      atmospheric: atmosphereOverride.has('atmospheric')
        ? prev.atmospheric
        : { enabled: prev.atmospheric.enabled, value: recommendedAtmosphere.atmospheric },
      aerial: atmosphereOverride.has('aerial')
        ? prev.aerial
        : { enabled: prev.aerial.enabled, value: recommendedAtmosphere.aerial },
      humidity: atmosphereOverride.has('humidity')
        ? prev.humidity
        : { enabled: prev.humidity.enabled, value: recommendedAtmosphere.humidity },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilm?.id]);

  /** 用户手动改动环境参数时，记录覆盖位并更新值 */
  const handleAtmosphereChange = (next: AtmosphereState) => {
    const changed = new Set(atmosphereOverride);
    (Object.keys(next) as Array<keyof AtmosphereState>).forEach(k => {
      if (
        next[k].value !== atmosphere[k].value ||
        next[k].enabled !== atmosphere[k].enabled
      ) {
        changed.add(k);
      }
    });
    setAtmosphereOverride(changed);
    setAtmosphere(next);
  };

  /** 删除一条自定义胶片（二次确认） */
  const handleDeleteCustomFilm = (film: CustomFilm, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定删除自定义胶片「${film.name}」？此操作不可撤销。`)) return;
    removeCustomFilm(film.id);
    setCustomFilms(loadCustomFilms());
    if (selectedFilm?.id === film.id) setSelectedFilm(null);
  };

  /** 新胶片添加成功后的回调：合并列表 + 自动选中 + 关闭表单 */
  const handleFilmAdded = (film: CustomFilm) => {
    setCustomFilms(loadCustomFilms());
    setSelectedFilm(film);
    setShowAddForm(false);
  };

  const getPromptSnippet = () => {
    const parts = [];
    if (selectedFilm) parts.push(selectedFilm.promptSnippet);
    if (selectedCamera) parts.push(selectedCamera);
    if (selectedLens) parts.push(selectedLens);
    if (selectedLighting) parts.push(selectedLighting);
    if (selectedAesthetic) parts.push(selectedAesthetic);
    // === 新增：末尾追加环境参数片段（仅启用项生效） ===
    const atmoFrag = formatAtmospherePromptFragment(atmosphere);
    if (atmoFrag) parts.push(atmoFrag);
    return parts.join(', ');
  };

  /** 是否有任意可生成片段（用于按钮 disabled） */
  const hasAnySelection =
    !!selectedFilm ||
    !!selectedCamera ||
    !!selectedLens ||
    !!selectedLighting ||
    !!selectedAesthetic ||
    atmosphere.atmospheric.enabled ||
    atmosphere.aerial.enabled ||
    atmosphere.humidity.enabled;

  const handleApply = () => {
    const newPromptSnippet = getPromptSnippet();
    if (newPromptSnippet) {
      const finalPrompt = currentPrompt 
        ? `${currentPrompt}, ${newPromptSnippet}`
        : newPromptSnippet;
      onApplyPrompt(finalPrompt);
    }
    onClose();
  };

  const handleLock = () => {
    const newPromptSnippet = getPromptSnippet();
    if (newPromptSnippet) {
      onLockStyle(newPromptSnippet);
    }
    onClose();
  };

  return (
    <div className={`absolute inset-0 z-[1000] ${isDark ? 'bg-moke-black/95' : 'bg-white/95'} backdrop-blur-md flex flex-col font-sans ${isDark ? 'text-gray-200' : 'text-gray-800'} overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <Film className="w-6 h-6 text-moke-red" />
          <h2 className="text-xl font-bold tracking-wider">{isCN ? '胶片系统' : 'FILM SYSTEM'}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8">
        {/* Left Column: Film Selection */}
        <div className="flex-1 space-y-8">
          <div>
            <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-4">
               <h3 className="text-lg font-semibold text-moke-red">1. 选择胶片型号 (Film Stock)</h3>
               <div className="flex items-center gap-3">
                 {/* === 新增：＋ 添加胶片入口按钮 === */}
                 <button
                   type="button"
                   onClick={() => setShowAddForm(v => !v)}
                   className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all ${
                     showAddForm
                       ? 'bg-moke-red text-white border-moke-red shadow-[0_0_10px_rgba(208,0,0,0.45)]'
                       : 'bg-gray-900/50 border-gray-800 text-moke-red hover:border-moke-red/60'
                   }`}
                   title="添加自定义胶片"
                 >
                   <Plus className="w-3 h-3" />
                   {showAddForm ? '关闭' : '添加'}
                 </button>
                 <div className="flex items-center gap-3 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800">
                    <span className="text-[10px] text-gray-400 font-mono font-bold tracking-widest">ZOOM</span>
                    <input 
                      type="range" 
                      min="2" 
                      max="6" 
                      step="1"
                      value={gridColumns}
                      onChange={(e) => setGridColumns(parseInt(e.target.value))}
                      className="w-24 accent-moke-red"
                    />
                 </div>
               </div>
            </div>

            {/* === 新增：折叠式添加胶片表单 === */}
            {showAddForm && (
              <AddFilmForm
                onCancel={() => setShowAddForm(false)}
                onAdded={handleFilmAdded}
                builtinNames={filmPresets.map(f => f.name)}
                customNames={customFilms.map(f => f.name)}
                currentCount={customFilms.length}
              />
            )}

            <div className="space-y-6">
              {categories.map(category => (
                <div key={category}>
                  <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    {category}
                    {/* 自定义分组显示数量徽标 */}
                    {category === CUSTOM_FILM_CATEGORY && (
                      <span className="text-[9px] font-mono bg-moke-red/20 text-moke-red px-1.5 py-0.5 rounded">
                        {customFilms.length}
                      </span>
                    )}
                  </h4>
                  <div 
                    className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
                  >
                    {allFilms.filter(f => f.category === category).map(film => {
                      // 判别是否自定义（用于右上角删除按钮）
                      const isCustom = (film as CustomFilm).isCustom === true;
                      return (
                      <button
                        key={film.id}
                        onClick={() => setSelectedFilm(film)}
                        className={`text-left border rounded-lg transition-all flex flex-col overflow-hidden group relative ${
                          selectedFilm?.id === film.id 
                            ? 'border-moke-red shadow-[0_0_15px_rgba(208,0,0,0.2)]' 
                            : 'border-gray-800 hover:border-gray-500'
                        }`}
                      >
                        <div className="w-full aspect-square bg-gray-800 relative overflow-hidden">
                           <img 
                             src={`https://picsum.photos/seed/${film.id}/400/400?blur=1`} 
                             alt={film.name}
                             className={`w-full h-full object-cover transition-all duration-700 ${selectedFilm?.id === film.id ? 'opacity-100 scale-110' : 'opacity-70 mix-blend-luminosity group-hover:opacity-100 group-hover:mix-blend-normal group-hover:scale-105'}`}
                             referrerPolicy="no-referrer"
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col justify-end p-3">
                             <div className="font-bold text-sm text-white drop-shadow-md flex items-center gap-1.5">
                               {film.name}
                               {/* 自定义胶片徽标 */}
                               {isCustom && (
                                 <span className="text-[8px] font-mono bg-moke-red/80 text-white px-1 py-0.5 rounded tracking-wider">
                                   CUSTOM
                                 </span>
                               )}
                             </div>
                             {gridColumns < 5 && (
                               <div className="text-xs text-gray-300 mt-1 drop-shadow-md line-clamp-2 leading-relaxed">{film.description}</div>
                             )}
                             {gridColumns < 4 && (
                               <div className="text-[9px] text-moke-red mt-2 font-mono opacity-80 line-clamp-2 break-all bg-black/50 p-1 rounded" title={film.promptSnippet}>
                                 {film.promptSnippet}
                               </div>
                             )}
                           </div>
                        </div>
                        {selectedFilm?.id === film.id && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-moke-red rounded-full shadow-[0_0_8px_#D00000]"></div>
                        )}
                        {/* 自定义胶片右上角删除按钮（悬停显示） */}
                        {isCustom && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleDeleteCustomFilm(film as CustomFilm, e)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                handleDeleteCustomFilm(film as CustomFilm, e as unknown as React.MouseEvent);
                              }
                            }}
                            className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/70 hover:bg-red-600 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title="删除此自定义胶片"
                          >
                            <Trash2 className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Modifiers & Preview */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6 sticky top-0 h-fit max-h-full overflow-y-auto pb-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5 space-y-5">
            <h3 className="text-lg font-semibold text-moke-red border-b border-gray-800 pb-2">2. 附加参数 (Modifiers)</h3>
            
            {/* Camera */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                <Camera className="w-4 h-4" /> 相机机型
              </label>
              <select 
                className="w-full bg-black border border-gray-800 rounded p-2 text-sm focus:border-moke-red outline-none"
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
              >
                <option value="">{isCN ? '-- 不指定 --' : '-- None --'}</option>
                {cameraPresets.map(c => (
                  <option key={c.name} value={c.snippet}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Lens */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                <Aperture className="w-4 h-4" /> 镜头特性
              </label>
              <select 
                className="w-full bg-black border border-gray-800 rounded p-2 text-sm focus:border-moke-red outline-none"
                value={selectedLens}
                onChange={(e) => setSelectedLens(e.target.value)}
              >
                <option value="">-- 不指定 --</option>
                {lensPresets.map(l => (
                  <option key={l.name} value={l.snippet}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Lighting */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                <Sun className="w-4 h-4" /> 光线条件
              </label>
              <select 
                className="w-full bg-black border border-gray-800 rounded p-2 text-sm focus:border-moke-red outline-none"
                value={selectedLighting}
                onChange={(e) => setSelectedLighting(e.target.value)}
              >
                <option value="">-- 不指定 --</option>
                {lightingPresets.map(l => (
                  <option key={l.name} value={l.snippet}>{l.name}</option>
                ))}
              </select>
            </div>

            {/* Aesthetic */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                <Sparkles className="w-4 h-4" /> 美学修饰
              </label>
              <select 
                className="w-full bg-black border border-gray-800 rounded p-2 text-sm focus:border-moke-red outline-none"
                value={selectedAesthetic}
                onChange={(e) => setSelectedAesthetic(e.target.value)}
              >
                <option value="">{isCN ? '-- 不指定 --' : '-- None --'}</option>
                {aestheticPresets.map(a => (
                  <option key={a.name} value={a.snippet}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* === 新增：3. 环境参数（大气透视/空气透视/雾气湿度） === */}
          <AtmosphereControls
            values={atmosphere}
            recommended={recommendedAtmosphere}
            onChange={handleAtmosphereChange}
          />

          {/* Preview & Action */}
          <div className="bg-black border border-moke-red/30 rounded-lg p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-moke-red uppercase tracking-wider">提示词预览 (Preview)</h3>
            <div className="bg-gray-900 p-3 rounded text-xs text-gray-300 font-mono min-h-[100px] break-words">
              {hasAnySelection ? (
                getPromptSnippet()
              ) : (
                <span className="text-gray-600 italic">请在左侧选择胶片或参数...</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleLock}
                disabled={!hasAnySelection}
                className="w-full py-3 bg-moke-red hover:bg-red-600 text-white font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                锁定胶片风格 (Lock Style)
              </button>
              <button
                onClick={handleApply}
                disabled={!hasAnySelection}
                className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
              >
                <Plus className="w-3 h-3" />
                {isCN ? '仅追加到输入框 (Append Once)' : 'Append Once'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
