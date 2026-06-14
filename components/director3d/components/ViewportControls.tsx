// 文件路径: components/director3d/components/ViewportControls.tsx
import React from 'react';
import { useSceneStore } from '../store';
import { Move, RotateCcw, Maximize2, Camera, Lock, Unlock } from 'lucide-react';
import { captureCameraSnapshot } from '../utils/screenshot';

export default function ViewportControls() {
  const { transformMode, setTransformMode, themeMode, cameraPose, isCameraLocked, setIsCameraLocked } = useSceneStore();
  const isLight = themeMode === 'light';

  const handleScreenshot = () => {
    captureCameraSnapshot(cameraPose, () => {
      window.dispatchEvent(new CustomEvent('moke-camera-flash'));
    });
  };

  return (
    <div className="absolute top-4 left-4 flex gap-2 font-mono z-10 select-none">
      <div className={`backdrop-blur-md px-3 py-1.5 rounded-none border flex items-center gap-4 text-[10px] font-bold tracking-widest transition-all ${
        isLight 
          ? 'bg-white/90 border-neutral-250 text-neutral-800 shadow-[0_4px_16px_rgba(0,0,0,0.04)]' 
          : 'bg-black/75 border-neutral-800/80 text-white shadow-xl'
      }`}>
        <button 
          onClick={() => setTransformMode('translate')}
          className={`uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
            transformMode === 'translate' 
              ? (isLight ? 'text-neutral-950 font-black scale-[1.02]' : 'text-white font-extrabold') 
              : (isLight ? 'text-neutral-450 hover:text-neutral-700' : 'text-neutral-500 hover:text-neutral-300')
          }`}
          title="移动 (W)"
        >
          <Move className="w-3 h-3" /> MOVE
        </button>
        <button 
          onClick={() => setTransformMode('rotate')}
          className={`uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
            transformMode === 'rotate' 
              ? (isLight ? 'text-neutral-950 font-black scale-[1.02]' : 'text-white font-extrabold') 
              : (isLight ? 'text-neutral-450 hover:text-neutral-700' : 'text-neutral-500 hover:text-neutral-300')
          }`}
          title="旋转 (E)"
        >
          <RotateCcw className="w-3 h-3" /> ROTATE
        </button>
        <button 
          onClick={() => setTransformMode('scale')}
          className={`uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
            transformMode === 'scale' 
              ? (isLight ? 'text-neutral-950 font-black scale-[1.02]' : 'text-white font-extrabold') 
              : (isLight ? 'text-neutral-450 hover:text-neutral-700' : 'text-neutral-500 hover:text-neutral-300')
          }`}
          title="缩放 (R)"
        >
          <Maximize2 className="w-3 h-3" /> SCALE
        </button>

        {/* Divider */}
        <div className={`h-3.5 w-[1px] ${isLight ? 'bg-neutral-200' : 'bg-neutral-800'}`} />

        {/* Lock Camera */}
        <button 
          onClick={() => setIsCameraLocked(!isCameraLocked)}
          className={`uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
            isCameraLocked
              ? (isLight ? 'text-amber-600 font-extrabold' : 'text-amber-500 font-extrabold')
              : (isLight ? 'text-neutral-450 hover:text-neutral-700' : 'text-neutral-500 hover:text-neutral-300')
          }`}
          title={isCameraLocked ? "解锁摄影机" : "锁定摄影机"}
        >
          {isCameraLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          {isCameraLocked ? '已锁摄影机' : '锁定摄影机'}
        </button>

        {/* Divider */}
        <div className={`h-3.5 w-[1px] ${isLight ? 'bg-neutral-200' : 'bg-neutral-800'}`} />

        {/* Camera snapshot action */}
        <button 
          onClick={handleScreenshot}
          className={`uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
            isLight 
              ? 'text-rose-600 hover:text-rose-800 font-extrabold' 
              : 'text-rose-500 hover:text-rose-450 font-extrabold'
          }`}
          title="截取当前摄影机画面 (C)"
        >
          <Camera className="w-3.5 h-3.5 animate-pulse" /> 截图 SNAP
        </button>
      </div>
    </div>
  );
}
