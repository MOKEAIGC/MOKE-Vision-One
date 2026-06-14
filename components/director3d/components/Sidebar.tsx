// 文件路径: components/director3d/components/Sidebar.tsx
import React, { useState } from 'react';
import { useSceneStore } from '../store';
import { ObjectType } from '../types';
import { Box, User, Image as ImageIcon, Camera, Sun, Square, Trash2, Download } from 'lucide-react';
import { exportScene } from '../utils/exporter';
import { captureCameraSnapshot } from '../utils/screenshot';

export default function Sidebar() {
  const { 
    objects, 
    selectedId, 
    addObject, 
    cameraPose, 
    setCameraPose, 
    gridOpacity, 
    setGridOpacity,
    themeMode,
    showAllLabels,
    setShowAllLabels,
    cameras,
    activeCameraName,
    setActiveCamera,
    addCamera,
    removeCamera
  } = useSceneStore();

  const isLight = themeMode === 'light';

  // 预设生成参数状态 / CUSTOM ADVANCED SPAWN PARAMETERS
  const [useCustomSpawn, setUseCustomSpawn] = useState(false);
  const [spawnX, setSpawnX] = useState('0');
  const [spawnY, setSpawnY] = useState(''); // 空白则保持自动吸附地面 calculations
  const [spawnZ, setSpawnZ] = useState('0');
  const [spawnScaleX, setSpawnScaleX] = useState('1');
  const [spawnScaleY, setSpawnScaleY] = useState('1');
  const [spawnScaleZ, setSpawnScaleZ] = useState('1');
  const [spawnLabel, setSpawnLabel] = useState('');

  const handleAddObjectWithParams = (type: ObjectType) => {
    if (!useCustomSpawn) {
      addObject(type);
      return;
    }

    const posX = parseFloat(spawnX) || 0;
    const posZ = parseFloat(spawnZ) || 0;
    
    let scX = parseFloat(spawnScaleX);
    let scY = parseFloat(spawnScaleY);
    let scZ = parseFloat(spawnScaleZ);
    
    if (isNaN(scX) || scX <= 0) scX = 1;
    if (isNaN(scY) || scY <= 0) scY = 1;
    if (isNaN(scZ) || scZ <= 0) scZ = 1;

    // 自定义高度 Y ：如果不填，演员默认为身高的 1.5 倍或 0.85 支撑点，普通道具/墙壁默认为半高度对齐
    const defaultY = type === 'actor' ? 0.85 : (scY / 2);
    const posY = spawnY.trim() !== '' ? (parseFloat(spawnY) || 0) : defaultY;

    addObject(type, {
      position: { x: posX, y: posY, z: posZ },
      scale: { x: scX, y: scY, z: scZ },
      label: spawnLabel.trim() !== '' ? spawnLabel : undefined
    });

    // 体验微调：只清空标签，数字保留方便连续生成
    setSpawnLabel('');
  };

  const handleScreenshot = () => {
    captureCameraSnapshot(cameraPose, () => {
      window.dispatchEvent(new CustomEvent('moke-camera-flash'));
    });
  };

  // 动态主题配色
  const sidebarContainer = isLight 
    ? 'bg-white border-r border-neutral-200 text-neutral-800 shadow-[2px_0_12px_rgba(0,0,0,0.02)]' 
    : 'bg-[#0A0A0A] border-r border-neutral-900 text-neutral-200';
    
  const barHeader = isLight 
    ? 'bg-neutral-50/80 border-b border-neutral-200' 
    : 'bg-[#050505] border-b border-neutral-900';
    
  const barSegmentBorder = isLight ? 'border-neutral-100' : 'border-neutral-900';
  const textTitleClass = isLight ? 'text-neutral-500 font-bold' : 'text-neutral-400 font-semibold';
  const textSecondaryClass = isLight ? 'text-neutral-400' : 'text-neutral-500';

  const btnAdd = isLight
    ? 'bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200 hover:border-neutral-400 text-neutral-700 hover:text-neutral-950 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ' 
    : 'bg-neutral-900/40 border border-dashed border-neutral-800 text-neutral-300 hover:border-white hover:bg-neutral-800/30';

  const selectPreset = isLight
    ? 'bg-white border-neutral-200 text-neutral-800 focus:border-neutral-900'
    : 'bg-[#030303] border-neutral-800 text-neutral-300 focus:border-white';

  const inputNumber = isLight
    ? 'bg-white border-neutral-200 text-neutral-800 focus:border-neutral-900 placeholder-neutral-350'
    : 'bg-[#030303] border-neutral-800 text-neutral-300 focus:border-white placeholder-neutral-600';

  const gridBtn = (active: boolean) => {
    if (active) {
      return isLight 
        ? 'border-neutral-900 bg-neutral-900 text-white font-semibold shadow-sm' 
        : 'border-white bg-white text-black font-semibold';
    } else {
      return isLight
        ? 'border-neutral-200 text-neutral-500 hover:border-neutral-400 hover:text-neutral-900 bg-white'
        : 'border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white bg-transparent';
    }
  };

  return (
    <div className={`w-[280px] h-full flex flex-col overflow-y-auto font-mono transition-all duration-300 shrink-0 ${sidebarContainer}`}>
      <div className={`h-12 flex items-center justify-between px-4 shrink-0 transition-colors ${barHeader}`}>
        <div className="flex items-center gap-3">
          <div className={`px-1.5 py-0.5 rounded-none font-black tracking-[0.2em] text-[11px] transition-colors ${isLight ? 'bg-neutral-950 text-white' : 'bg-white text-black'}`}>
            MOKE
          </div>
          <h1 className={`text-[10px] tracking-[0.25em] uppercase ${textSecondaryClass}`}>Stage</h1>
        </div>
      </div>

      {/* ADD ELEMENTS */}
      <div className={`p-4 border-b ${barSegmentBorder}`}>
        <h2 className={`text-[10px] uppercase tracking-[0.15em] mb-3 ${textTitleClass}`}>添加元素 / ADD</h2>
        
        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => handleAddObjectWithParams('actor')} className={`p-2 flex flex-col items-center justify-center rounded-none cursor-pointer transition-all duration-200 group ${btnAdd}`}>
            <User className={`w-4 h-4 mb-1 text-neutral-400 group-hover:scale-105 transition-transform ${isLight ? 'group-hover:text-neutral-900' : 'group-hover:text-white'}`} />
            <span className="text-[9px] uppercase tracking-wider font-medium">角色</span>
          </button>
          <button onClick={() => handleAddObjectWithParams('prop')} className={`p-2 flex flex-col items-center justify-center rounded-none cursor-pointer transition-all duration-200 group ${btnAdd}`}>
            <Box className={`w-4 h-4 mb-1 text-neutral-400 group-hover:scale-105 transition-transform ${isLight ? 'group-hover:text-neutral-900' : 'group-hover:text-white'}`} />
            <span className="text-[9px] uppercase tracking-wider font-medium">道具</span>
          </button>
          <button onClick={() => handleAddObjectWithParams('wall')} className={`p-2 flex flex-col items-center justify-center rounded-none cursor-pointer transition-all duration-200 group ${btnAdd}`}>
            <Square className={`w-4 h-4 mb-1 text-neutral-400 group-hover:scale-105 transition-transform ${isLight ? 'group-hover:text-neutral-900' : 'group-hover:text-white'}`} />
            <span className="text-[9px] uppercase tracking-wider font-medium">墙面</span>
          </button>
          <button onClick={() => handleAddObjectWithParams('light')} className={`p-2 flex flex-col items-center justify-center rounded-none cursor-pointer transition-all duration-200 group ${btnAdd}`}>
            <Sun className={`w-4 h-4 mb-1 text-neutral-400 group-hover:scale-105 transition-transform ${isLight ? 'group-hover:text-neutral-900' : 'group-hover:text-white'}`} />
            <span className="text-[9px] uppercase tracking-wider font-medium">灯光</span>
          </button>
          <button onClick={() => handleAddObjectWithParams('marker')} className={`col-span-2 p-2 flex flex-col items-center justify-center rounded-none cursor-pointer transition-all duration-200 group ${btnAdd}`}>
            <ImageIcon className={`w-4 h-4 mb-1 text-neutral-400 group-hover:scale-105 transition-transform ${isLight ? 'group-hover:text-neutral-900' : 'group-hover:text-white'}`} />
            <span className="text-[9px] uppercase tracking-wider font-medium">标记点</span>
          </button>
        </div>

        {/* CUSTOM SPAWN PARAMETERS FORM */}
        <div className={`mt-3 pt-3 border-t border-dashed ${isLight ? 'border-neutral-200' : 'border-neutral-800'}`}>
          <label className="flex items-center gap-1.5 cursor-pointer text-[9.5px] uppercase tracking-wider font-semibold">
            <input 
              type="checkbox" 
              checked={useCustomSpawn} 
              onChange={(e) => setUseCustomSpawn(e.target.checked)}
              className={`scale-90 ${isLight ? 'accent-neutral-850' : 'accent-white'}`}
            />
            <span className={isLight ? 'text-neutral-700' : 'text-neutral-300'}>设定生成具体尺寸/位置</span>
          </label>
          
          {useCustomSpawn && (
            <div className={`mt-2.5 p-2 rounded-none space-y-2 border text-[9px] ${
              isLight ? 'bg-neutral-50/50 border-neutral-200' : 'bg-[#050505]/60 border-neutral-900'
            }`}>
              {/* Coordinates Inputs */}
              <div>
                <span className={`block uppercase tracking-wider mb-1 font-bold ${textSecondaryClass}`}>初始生成坐标 (X, Y, Z / 米)</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="relative flex items-center">
                    <span className="absolute left-1.5 font-bold text-neutral-400">X</span>
                    <input 
                      type="number" 
                      step="0.5"
                      value={spawnX}
                      onChange={e => setSpawnX(e.target.value)}
                      className={`w-full h-6 pl-4 pr-1 text-right focus:outline-none focus:border-neutral-500 border rounded-none font-mono ${inputNumber}`}
                    />
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-1.5 font-bold text-neutral-400">Y</span>
                    <input 
                      type="number" 
                      step="0.5"
                      placeholder="地面"
                      value={spawnY}
                      onChange={e => setSpawnY(e.target.value)}
                      className={`w-full h-6 pl-4 pr-1 text-right focus:outline-none focus:border-neutral-500 border rounded-none font-mono placeholder:text-[8px] ${inputNumber}`}
                    />
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-1.5 font-bold text-neutral-400">Z</span>
                    <input 
                      type="number" 
                      step="0.5"
                      value={spawnZ}
                      onChange={e => setSpawnZ(e.target.value)}
                      className={`w-full h-6 pl-4 pr-1 text-right focus:outline-none focus:border-neutral-500 border rounded-none font-mono ${inputNumber}`}
                    />
                  </div>
                </div>
              </div>

              {/* Scale/Size Dimensions */}
              <div>
                <span className={`block uppercase tracking-wider mb-1 font-bold ${textSecondaryClass}`}>初始生成尺寸 (宽 W, 高 H, 深 D)</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="relative flex items-center">
                    <span className="absolute left-1.5 font-bold text-neutral-400">W</span>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0.1"
                      value={spawnScaleX}
                      onChange={e => setSpawnScaleX(e.target.value)}
                      className={`w-full h-6 pl-4 pr-1 text-right focus:outline-none focus:border-neutral-500 border rounded-none font-mono ${inputNumber}`}
                    />
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-1.5 font-bold text-neutral-400">H</span>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0.1"
                      value={spawnScaleY}
                      onChange={e => setSpawnScaleY(e.target.value)}
                      className={`w-full h-6 pl-4 pr-1 text-right focus:outline-none focus:border-neutral-500 border rounded-none font-mono ${inputNumber}`}
                    />
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-1.5 font-bold text-neutral-400">D</span>
                    <input 
                      type="number" 
                      step="0.1"
                      min="0.1"
                      value={spawnScaleZ}
                      onChange={e => setSpawnScaleZ(e.target.value)}
                      className={`w-full h-6 pl-4 pr-1 text-right focus:outline-none focus:border-neutral-500 border rounded-none font-mono ${inputNumber}`}
                    />
                  </div>
                </div>
              </div>

              {/* Optional Label */}
              <div>
                <span className={`block uppercase tracking-wider mb-1 font-bold ${textSecondaryClass}`}>指定初始标签名称 label</span>
                <input 
                  type="text" 
                  value={spawnLabel}
                  onChange={e => setSpawnLabel(e.target.value)}
                  placeholder="例如: A / ACTOR_1 (留空则自动字母生成)"
                  className={`w-full h-6 px-2 focus:outline-none focus:border-neutral-500 border rounded-none font-mono ${inputNumber}`}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CAMERA SETTINGS */}
      <div className={`p-4 border-b ${barSegmentBorder}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-[10px] uppercase tracking-[0.15em] ${textTitleClass}`}>机位选择与切换 / CAMERA</h2>
          <button
            onClick={() => {
              const name = prompt("请输入新相机机位名称:", `机位-${cameras.length + 1}`);
              if (name !== null) {
                addCamera(name);
              }
            }}
            className={`text-[9px] px-2 py-0.5 border uppercase font-bold transition-all cursor-pointer ${
              isLight 
                ? 'bg-neutral-100 hover:bg-neutral-900 hover:text-white border-neutral-300' 
                : 'bg-neutral-950 hover:bg-white hover:text-black border-neutral-800'
            }`}
          >
            + 新建机位
          </button>
        </div>
        <div className="space-y-4">
          <div className="flex gap-1">
            <select 
              className={`flex-1 p-1.5 border rounded-none text-[11px] uppercase focus:outline-none transition-all ${selectPreset}`}
              value={activeCameraName}
              onChange={(e) => setActiveCamera(e.target.value)}
            >
              {cameras.map(pose => (
                <option key={pose.name} value={pose.name}>{pose.name}</option>
              ))}
            </select>
            {cameras.length > 1 && (
              <button
                onClick={() => {
                  if (confirm(`确定要移除机位 "${activeCameraName}" 吗？`)) {
                    removeCamera(activeCameraName);
                  }
                }}
                title="移除当前选中机位"
                className={`px-2 px-2.5 border transition-all text-neutral-400 hover:text-rose-500 hover:border-rose-500 cursor-pointer ${
                  isLight ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div>
            <label className={`text-[10px] uppercase tracking-wider block mb-1 ${textSecondaryClass}`}>焦距 Focal Length</label>
            <div className="flex items-center gap-3">
              <input 
                type="range" 
                className={`flex-1 h-0.5 rounded-none appearance-none cursor-pointer ${isLight ? 'bg-neutral-200 accent-neutral-800' : 'bg-neutral-800 accent-white'}`} 
                min="14" max="200"
                value={cameraPose.focalLength}
                onChange={(e) => setCameraPose({ ...cameraPose, focalLength: parseInt(e.target.value) })}
              />
              <span className={`text-[11px] font-mono w-10 text-right font-medium ${isLight ? 'text-neutral-800' : 'text-white'}`}>{cameraPose.focalLength}mm</span>
            </div>
          </div>
          <div>
            <label className={`text-[10px] uppercase tracking-wider block mb-1.5 ${textSecondaryClass}`}>画面比例 Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-1 mb-2">
              <button 
                onClick={() => setCameraPose({ ...cameraPose, aspect: '16:9' })}
                className={`py-1 border text-[10px] rounded-none transition-all ${gridBtn(cameraPose.aspect === '16:9')}`}>16:9</button>
              <button 
                onClick={() => setCameraPose({ ...cameraPose, aspect: '21:9' })}
                className={`py-1 border text-[10px] rounded-none transition-all ${gridBtn(cameraPose.aspect === '21:9')}`}>21:9</button>
              <button 
                onClick={() => setCameraPose({ ...cameraPose, aspect: '9:16' })}
                className={`py-1 border text-[10px] rounded-none transition-all ${gridBtn(cameraPose.aspect === '9:16')}`}>9:16</button>
            </div>
            <div className="flex gap-2 items-center">
              <input 
                type="text"
                className={`w-full p-1.5 border rounded-none text-[11px] focus:outline-none transition-all ${inputNumber}`}
                placeholder="自定义比例 (如: 4:3 或 2.35)"
                value={cameraPose.aspect}
                onChange={(e) => setCameraPose({ ...cameraPose, aspect: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* DISPLAY & GRID SYSTEM */}
      <div className={`p-4 border-b ${barSegmentBorder}`}>
        <h2 className={`text-[10px] uppercase tracking-[0.15em] mb-3 ${textTitleClass}`}>显示与网格 / DISPLAY & GRID</h2>
        <div className="space-y-3.5">
          {/* Global labels show checkbox */}
          <div className={`pb-2.5 border-b border-dashed ${isLight ? 'border-neutral-200' : 'border-neutral-800'}`}>
            <label className="flex items-center gap-1.5 cursor-pointer text-[9.5px] uppercase tracking-wider font-semibold">
              <input 
                type="checkbox" 
                checked={showAllLabels} 
                onChange={(e) => setShowAllLabels(e.target.checked)}
                className={`scale-90 ${isLight ? 'accent-neutral-850' : 'accent-white'}`}
              />
              <span className={isLight ? 'text-neutral-800' : 'text-neutral-300'}>统一显现全部标签名称</span>
            </label>
            <span className={`text-[8px] block mt-0.5 ${textSecondaryClass}`}>在整个三维场景中强制统一显现角色和元素标签</span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className={`text-[10px] uppercase tracking-wider block ${textSecondaryClass}`}>网格不透明度 Opacity</label>
              <span className={`text-[10px] font-mono font-medium ${isLight ? 'text-neutral-800' : 'text-white'}`}>{Math.round(gridOpacity * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="range" 
                className={`flex-1 h-0.5 rounded-none appearance-none cursor-pointer ${isLight ? 'bg-neutral-200 accent-neutral-800' : 'bg-neutral-800 accent-white'}`} 
                min="0" max="100" step="1"
                value={Math.round(gridOpacity * 100)}
                onChange={(e) => setGridOpacity(parseFloat(e.target.value) / 100)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button 
              onClick={() => setGridOpacity(0)}
              className={`py-1 border text-[10px] rounded-none transition-all ${gridBtn(gridOpacity === 0)}`}
            >
              隐藏
            </button>
            <button 
              onClick={() => setGridOpacity(0.4)}
              className={`py-1 border text-[10px] rounded-none transition-all ${gridBtn(gridOpacity === 0.4)}`}
            >
              40%
            </button>
            <button 
              onClick={() => setGridOpacity(0.85)}
              className={`py-1 border text-[10px] rounded-none transition-all ${gridBtn(gridOpacity === 0.85)}`}
            >
              85%
            </button>
          </div>
        </div>
      </div>

      {/* 填充剩余空间使布局垂直拉伸优雅平衡 */}
      <div className={`flex-1 pb-4 bg-transparent border-b ${barSegmentBorder}`} />

      <div className={`p-3 shrink-0 border-t ${isLight ? 'bg-neutral-50/80 border-neutral-200' : 'bg-[#050505] border-neutral-900'} space-y-1.5`}>
        <button 
          onClick={handleScreenshot}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 text-[11px] font-black rounded-none active:bg-neutral-300 transition-all uppercase tracking-[0.2em] cursor-pointer ${
            isLight
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_2px_10px_rgba(225,29,72,0.15)]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" /> 截图发送到画布 (C)
        </button>

        <button 
          onClick={exportScene}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 text-[11px] font-black rounded-none active:bg-neutral-300 transition-all uppercase tracking-[0.2em] cursor-pointer ${
            isLight
              ? 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm'
              : 'bg-white text-black hover:bg-neutral-200'
          }`}
        >
          <Download className="w-3.5 h-3.5" /> EXPORT ASSETS
        </button>
      </div>
    </div>
  );
}
