// 文件路径: components/director3d/components/RightPanel.tsx
import React from 'react';
import { useSceneStore } from '../store';
import { Sliders, RefreshCw, ChevronLeft, ChevronRight, Compass, ShieldAlert, Maximize, Trash2, Tag, Eye, Layers, FileText, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RightPanel() {
  const { 
    objects, 
    selectedId, 
    updateObject, 
    removeObject, 
    setSelectedId, 
    isRightPanelCollapsed, 
    setIsRightPanelCollapsed,
    themeMode,
    setThemeMode
  } = useSceneStore();
  
  const selectedObj = objects.find(o => o.id === selectedId);

  // 精确数字格式化辅助
  const formatNum = (num: number) => {
    return parseFloat(num.toFixed(2));
  };

  // 精准更新单个坐标轴
  const handleCoordChange = (key: 'position' | 'rotation' | 'scale', axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObj) return;
    const current = selectedObj[key] || { x: 0, y: 0, z: 0 };
    updateObject(selectedObj.id, {
      [key]: {
        ...current,
        [axis]: value,
      }
    });
  };

  // 快捷工业微调函数
  const quickAlignFloor = () => {
    if (!selectedObj) return;
    // 重置旋转并对齐地面
    const currentScaleY = selectedObj.scale?.y || 1.7;
    const groundY = selectedObj.type === 'actor' ? 0.85 : (currentScaleY / 2);
    updateObject(selectedObj.id, {
      position: { ...selectedObj.position, y: groundY },
      rotation: { x: 0, y: 0, z: 0 }
    });
  };

  const quickCenter = () => {
    if (!selectedObj) return;
    updateObject(selectedObj.id, {
      position: { ...selectedObj.position, x: 0, z: 0 }
    });
  };

  const quickResetScale = () => {
    if (!selectedObj) return;
    const defaultScale = selectedObj.type === 'actor' ? { x: 0.6, y: 1.7, z: 0.4 } : { x: 1, y: 1, z: 1 };
    updateObject(selectedObj.id, {
      scale: defaultScale
    });
  };

  const isLight = themeMode === 'light';

  // 动态日夜配色映射
  const containerBg = isLight 
    ? 'bg-white/95 border-neutral-200 text-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.06)]' 
    : 'bg-[#070707]/90 border-neutral-800 text-neutral-200 shadow-[0_25px_60px_rgba(0,0,0,0.85)]';
  
  const sectionBg = isLight ? 'bg-neutral-50 border-neutral-200/70' : 'bg-[#0f0f0f]/60 border-neutral-850';
  const blockHeaderBorder = isLight ? 'border-neutral-200' : 'border-neutral-800';
  const textTitle = isLight ? 'text-neutral-500' : 'text-neutral-400';
  const textSub = isLight ? 'text-neutral-400' : 'text-neutral-500';
  const inputBg = isLight 
    ? 'bg-white border-neutral-200 text-neutral-900 focus:border-neutral-400' 
    : 'bg-[#030303] border-neutral-800 text-neutral-200 focus:border-neutral-500';

  return (
    <div className="absolute right-4 top-4 bottom-4 flex items-stretch z-15 font-mono pointer-events-none">
      <AnimatePresence mode="wait">
        {!isRightPanelCollapsed ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, x: 50, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`w-[290px] border p-4 flex flex-col justify-between pointer-events-auto backdrop-blur-md max-h-full overflow-y-auto ${containerBg} style-custom-scroll`}
          >
            <div className="flex flex-col gap-4">
              {/* 头部导航与日夜切换 */}
              <div className={`flex items-center justify-between border-b pb-2.5 ${blockHeaderBorder}`}>
                <div className="flex items-center gap-2">
                  <Sliders className={`w-3.5 h-3.5 ${textTitle}`} />
                  <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${isLight ? 'text-neutral-700' : 'text-neutral-200'}`}>中控台 / CONSOLE</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {/* 日夜模式切换按钮 */}
                  <button
                    onClick={() => setThemeMode(isLight ? 'dark' : 'light')}
                    className={`p-1 transition-all rounded-none border border-transparent hover:border-neutral-500 cursor-pointer ${isLight ? 'hover:bg-neutral-100 text-orange-500' : 'hover:bg-neutral-850 text-sky-400'}`}
                    title={isLight ? "切换至夜间模式" : "切换至日间模式"}
                  >
                    {isLight ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => setIsRightPanelCollapsed(true)}
                    className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-all rounded-none border border-transparent cursor-pointer"
                    title="收起面板"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 场景元素列表部分 (SCENE ELEMENTS) */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${textTitle}`}>
                    <Layers className="w-3 h-3 text-neutral-500" /> 场景元素 / SCENE ({objects.length})
                  </span>
                </div>
                <div className={`max-h-[140px] overflow-y-auto border divide-y style-custom-scroll ${isLight ? 'border-neutral-200 bg-neutral-100/30 divide-neutral-200/60' : 'border-neutral-850 bg-[#0c0c0c]/70 divide-neutral-900'}`}>
                  {objects.map(obj => (
                    <div
                      key={obj.id}
                      className={`flex items-center gap-2 p-2 cursor-pointer transition-all ${
                        selectedId === obj.id 
                          ? `${isLight ? 'bg-neutral-200 text-neutral-950 border-neutral-950' : 'bg-neutral-800 text-white border-white'} font-bold border-l-2` 
                          : `border-l-2 border-transparent ${isLight ? 'hover:bg-neutral-100/70 text-neutral-600' : 'hover:bg-neutral-900/50 text-neutral-400'}`
                      }`}
                      onClick={() => setSelectedId(obj.id)}
                    >
                      <span 
                        className="w-2.5 h-2.5 border shrink-0 transition-colors" 
                        style={{ borderColor: obj.color, backgroundColor: selectedId === obj.id ? obj.color : 'transparent' }} 
                      />
                      <span className="truncate tracking-wide text-[10px] uppercase flex-1">
                        {obj.label} <span className={`text-[8px] font-normal ${textSub}`}>({obj.type})</span>
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeObject(obj.id); }}
                        className={`${isLight ? 'text-neutral-400 hover:text-red-600' : 'text-neutral-600 hover:text-red-400'} transition-colors p-0.5`}
                        title="删除该元素"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {objects.length === 0 && (
                    <div className={`text-[9px] text-center py-5 uppercase font-mono tracking-widest ${textSub}`}>
                      空无一物 (EMPTY STAGE)
                    </div>
                  )}
                </div>
              </div>

              {selectedObj ? (
                <div className={`space-y-4 pt-1 border-t ${isLight ? 'border-neutral-100' : 'border-neutral-900'}`}>
                  {/* 对象基础属性 (ATTRIBUTES) */}
                  <div className={`p-2.5 border space-y-3 ${sectionBg}`}>
                    <div className={`flex justify-between items-center pb-1 border-b ${isLight ? 'border-neutral-200' : 'border-neutral-800'}`}>
                      <span className={`text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${textTitle}`}>
                        <Tag className="w-2.5 h-2.5" /> 基础属性 / ATTRIBUTES
                      </span>
                      <span className={`text-[8px] px-1 font-bold uppercase ${isLight ? 'bg-neutral-200 text-neutral-700' : 'bg-neutral-800 text-neutral-400'}`}>
                        {selectedObj.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-[8px] uppercase tracking-widest block mb-1 ${textSub}`}>标签名称 TAG</label>
                        <input
                          type="text"
                          value={selectedObj.label}
                          onChange={e => updateObject(selectedObj.id, { label: e.target.value })}
                          className={`w-full h-6 px-1.5 border transition-all text-[10px] ${inputBg}`}
                        />
                      </div>
                      <div>
                        <label className={`text-[8px] uppercase tracking-widest block mb-1 ${textSub}`}>色彩外观 COL</label>
                        <div className="flex items-center gap-1.5 h-6">
                          <input
                            type="color"
                            value={selectedObj.color}
                            onChange={e => updateObject(selectedObj.id, { color: e.target.value })}
                            className={`w-7 h-full p-0 border bg-transparent rounded-none cursor-pointer shrink-0 ${isLight ? 'border-neutral-200' : 'border-neutral-800'}`}
                          />
                          <span className={`text-[8px] font-mono select-all tracking-tight uppercase ${textSub}`}>{selectedObj.color}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedObj.showLabel || false}
                          onChange={(e) => updateObject(selectedObj.id, { showLabel: e.target.checked })}
                          className={`scale-90 ${isLight ? 'accent-neutral-900' : 'accent-white'}`}
                        />
                        <span className={`text-[9px] uppercase tracking-wider flex items-center gap-1 ${textTitle}`}><Eye className="w-2.5 h-2.5" /> 悬浮名称标签</span>
                      </label>
                    </div>

                    {selectedObj.type === 'actor' && (
                      <div>
                        <label className={`text-[8px] uppercase tracking-widest block mb-1 ${textSub}`}>角色定位 ROLE</label>
                        <select
                          value={selectedObj.role || 'hero'}
                          onChange={e => updateObject(selectedObj.id, { role: e.target.value as any })}
                          className={`w-full h-6 px-1 border text-[10px] ${isLight ? 'bg-white border-neutral-200 text-neutral-800' : 'bg-[#030303] border-neutral-800 text-neutral-200'}`}
                        >
                          <option value="hero">主角 HERO</option>
                          <option value="supporting">配角 SUPPORTING</option>
                          <option value="background">背景 BACKGROUND</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className={`text-[8px] uppercase tracking-widest block mb-1 flex items-center gap-1 ${textSub}`}><FileText className="w-2.5 h-2.5" /> 拍摄备注 NOTE</label>
                      <textarea
                        rows={2}
                        value={selectedObj.note || ''}
                        onChange={e => updateObject(selectedObj.id, { note: e.target.value })}
                        placeholder="记录服饰、动作或定位描述..."
                        className={`w-full p-1 border text-[9px] placeholder-neutral-500 resize-none font-sans ${inputBg}`}
                      />
                    </div>
                  </div>

                  {/* 位置微调 POSITION */}
                  <div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${textTitle}`}>位置 / POSITION (M)</span>
                    <div className="space-y-1">
                      {['x', 'y', 'z'].map((axis) => {
                        const val = selectedObj.position?.[axis as 'x'|'y'|'z'] ?? 0;
                        return (
                          <div key={axis} className={`flex items-center h-6 text-[10px] border ${isLight ? 'bg-white border-neutral-200' : 'bg-[#070707] border-neutral-850'}`}>
                            <span className={`w-5 text-center select-none border-r font-bold uppercase text-[9px] ${isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-500' : 'bg-neutral-900 border-neutral-850 text-neutral-500'}`}>{axis}</span>
                            <input
                              type="number"
                              step="0.05"
                              value={formatNum(val)}
                              onChange={(e) => handleCoordChange('position', axis as 'x'|'y'|'z', parseFloat(e.target.value) || 0)}
                              className={`flex-1 bg-transparent px-1.5 font-medium focus:outline-none text-right font-mono text-[10px] ${isLight ? 'text-neutral-900' : 'text-white'}`}
                            />
                            <div className={`flex flex-col h-full border-l shrink-0 ${isLight ? 'border-neutral-200' : 'border-neutral-850'}`}>
                              <button
                                onClick={() => handleCoordChange('position', axis as 'x'|'y'|'z', val + 0.1)}
                                className={`flex-1 px-1 text-[6px] transition-all hover:bg-neutral-200/50 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleCoordChange('position', axis as 'x'|'y'|'z', val - 0.1)}
                                className={`flex-1 px-1 border-t text-[6px] transition-all hover:bg-neutral-200/50 ${isLight ? 'border-neutral-200 text-neutral-500' : 'border-neutral-850 text-neutral-400'}`}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 旋转微调 ROTATION */}
                  <div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${textTitle}`}>旋转 / ROTATION (DEG)</span>
                    <div className="space-y-1">
                      {['x', 'y', 'z'].map((axis) => {
                        const valRad = selectedObj.rotation?.[axis as 'x'|'y'|'z'] ?? 0;
                        const valDeg = Math.round((valRad * 180) / Math.PI);
                        return (
                          <div key={axis} className={`flex items-center h-6 text-[10px] border ${isLight ? 'bg-white border-neutral-200' : 'bg-[#070707] border-neutral-850'}`}>
                            <span className={`w-5 text-center select-none border-r font-bold uppercase text-[9px] ${isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-500' : 'bg-neutral-900 border-neutral-850 text-neutral-500'}`}>{axis}</span>
                            <input
                              type="number"
                              value={valDeg}
                              min="-180"
                              max="180"
                              onChange={(e) => {
                                const deg = parseInt(e.target.value) || 0;
                                handleCoordChange('rotation', axis as 'x'|'y'|'z', (deg * Math.PI) / 180);
                              }}
                              className={`flex-1 bg-transparent px-1.5 font-medium focus:outline-none text-right font-mono text-[10px] ${isLight ? 'text-neutral-900' : 'text-white'}`}
                            />
                            <div className={`flex flex-col h-full border-l shrink-0 ${isLight ? 'border-neutral-200' : 'border-neutral-850'}`}>
                              <button
                                onClick={() => handleCoordChange('rotation', axis as 'x'|'y'|'z', ((valDeg + 5) * Math.PI) / 180)}
                                className={`flex-1 px-1 text-[6px] transition-all hover:bg-neutral-200/50 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleCoordChange('rotation', axis as 'x'|'y'|'z', ((valDeg - 5) * Math.PI) / 180)}
                                className={`flex-1 px-1 border-t text-[6px] transition-all hover:bg-neutral-200/50 ${isLight ? 'border-neutral-200 text-neutral-500' : 'border-neutral-850 text-neutral-400'}`}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 缩放微调 SCALE */}
                  <div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${textTitle}`}>尺寸 / SCALE (S)</span>
                    <div className="space-y-1">
                      {['x', 'y', 'z'].map((axis) => {
                        const val = selectedObj.scale?.[axis as 'x'|'y'|'z'] ?? 1;
                        return (
                          <div key={axis} className={`flex items-center h-6 text-[10px] border ${isLight ? 'bg-white border-neutral-200' : 'bg-[#070707] border-neutral-850'}`}>
                            <span className={`w-5 text-center select-none border-r font-bold uppercase text-[9px] ${isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-500' : 'bg-neutral-900 border-neutral-850 text-neutral-500'}`}>{axis}</span>
                            <input
                              type="number"
                              step="0.05"
                              value={formatNum(val)}
                              onChange={(e) => handleCoordChange('scale', axis as 'x'|'y'|'z', Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                              className={`flex-1 bg-transparent px-1.5 font-medium focus:outline-none text-right font-mono text-[10px] ${isLight ? 'text-neutral-900' : 'text-white'}`}
                            />
                            <div className={`flex flex-col h-full border-l shrink-0 ${isLight ? 'border-neutral-200' : 'border-neutral-850'}`}>
                              <button
                                onClick={() => handleCoordChange('scale', axis as 'x'|'y'|'z', val + 0.1)}
                                className={`flex-1 px-1 text-[6px] transition-all hover:bg-neutral-200/50 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleCoordChange('scale', axis as 'x'|'y'|'z', Math.max(0.01, val - 0.1))}
                                className={`flex-1 px-1 border-t text-[6px] transition-all hover:bg-neutral-200/50 ${isLight ? 'border-neutral-200 text-neutral-500' : 'border-neutral-850 text-neutral-400'}`}
                              >
                                ▼
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 快捷工具 */}
                  <div className="pt-2 border-t border-neutral-900 space-y-1">
                    <span className={`text-[8px] uppercase tracking-widest block mb-0.5 ${textSub}`}>快捷对齐 / MATRIX AXIS</span>
                    <button
                      onClick={quickAlignFloor}
                      className={`w-full h-6 border bg-transparent text-[9px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isLight 
                          ? 'border-neutral-200 hover:border-neutral-500 text-neutral-800 hover:bg-neutral-50' 
                          : 'border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <RefreshCw className="w-2.5 h-2.5 text-neutral-500" />
                      吸附到地面 (ALIGN FLOOR)
                    </button>
                    <button
                      onClick={quickCenter}
                      className={`w-full h-6 border bg-transparent text-[9px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isLight 
                          ? 'border-neutral-200 hover:border-neutral-500 text-neutral-800 hover:bg-neutral-50' 
                          : 'border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Compass className="w-2.5 h-2.5 text-neutral-500" />
                      坐标中线回归 (CENTER RADIAL)
                    </button>
                    <button
                      onClick={quickResetScale}
                      className={`w-full h-6 border bg-transparent text-[9px] transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        isLight 
                          ? 'border-neutral-200 hover:border-neutral-500 text-neutral-800 hover:bg-neutral-50' 
                          : 'border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Maximize className="w-2.5 h-2.5 text-neutral-500" />
                      比例规格化 (RESET SIZE)
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center py-8 px-4 border border-dashed text-center select-none ${isLight ? 'border-neutral-200 text-neutral-400 bg-neutral-50/50' : 'border-neutral-850 text-neutral-600 bg-transparent'}`}>
                  <ShieldAlert className="w-4 h-4 mb-2 stroke-[1.5]" />
                  <span className={`text-[9px] font-bold tracking-widest uppercase mb-1 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>未选中场景元素</span>
                  <span className="text-[8px] tracking-wide leading-relaxed">请点击上方列表中任意元素或<br/>在场景画布中直接点选开展高级调节</span>
                </div>
              )}
            </div>

            {/* 底部指示 */}
            <div className={`text-[8px] border-t pt-2.5 mt-4 flex justify-between items-center select-none ${isLight ? 'border-neutral-100 text-neutral-400' : 'border-neutral-900 text-neutral-600'}`}>
              <span>SHIFT+DRAG SNAP</span>
              <span className="font-bold">MOKE ALPHA</span>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15 }}
            onClick={() => setIsRightPanelCollapsed(false)}
            className={`w-8 border flex flex-col items-center justify-between py-4 cursor-pointer transition-all pointer-events-auto block select-none h-full ${
              isLight 
                ? 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400' 
                : 'bg-black/90 border-neutral-800 text-neutral-200 hover:bg-neutral-950 hover:border-neutral-500'
            }`}
            title="展开面板"
          >
            <ChevronLeft className={`w-4 h-4 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`} />
            <div className={`writing-mode-vertical text-[9px] font-black uppercase tracking-[0.25em] flex items-center gap-1 ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
              <span>C</span><span>O</span><span>N</span><span>S</span><span>O</span><span>L</span><span>E</span>
            </div>
            <div className={`w-1.5 h-1.5 rounded-none animate-pulse ${isLight ? 'bg-neutral-400' : 'bg-neutral-600'}`} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
