// 文件路径: components/director3d/Director3DApp.tsx
// 从原独立 3D 导演系统的 App.tsx 适配而来。
// 主要改动：根布局由 w-screen/h-screen 改为 w-full/h-full，以便嵌入无限画布浮层。
// 保留 moke-camera-flash 快门闪光 与 c/w/e/r/delete 键盘快捷键。
import React, { useEffect, useState } from 'react';
import Scene from './components/Scene';
import Sidebar from './components/Sidebar';
import ViewportControls from './components/ViewportControls';
import CameraOverlay from './components/CameraOverlay';
import RightPanel from './components/RightPanel';
import BlockingBoard from './components/BlockingBoard';
import { useSceneStore } from './store';
import { captureCameraSnapshot } from './utils/screenshot';

export default function Director3DApp() {
  const { setTransformMode, isRightPanelCollapsed, themeMode } = useSceneStore();
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    const handleFlash = () => {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 150);
      return () => clearTimeout(timer);
    };
    window.addEventListener('moke-camera-flash', handleFlash);
    return () => window.removeEventListener('moke-camera-flash', handleFlash);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 输入框中输入时忽略快捷键
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'c': {
          const pose = useSceneStore.getState().cameraPose;
          captureCameraSnapshot(pose, () => {
            window.dispatchEvent(new CustomEvent('moke-camera-flash'));
          });
          break;
        }
        case 'w': setTransformMode('translate'); break;
        case 'e': setTransformMode('rotate'); break;
        case 'r': setTransformMode('scale'); break;
        case 'delete':
        case 'backspace': {
          const selectedId = useSceneStore.getState().selectedId;
          if (selectedId) useSceneStore.getState().removeObject(selectedId);
          break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTransformMode]);

  const isLight = themeMode === 'light';

  return (
    <div className={`flex w-full h-full transition-colors duration-300 font-sans overflow-hidden select-none ${isLight ? 'bg-[#f4f4f5] text-neutral-900' : 'bg-[#050505] text-neutral-200'}`}>
      <Sidebar />
      <main className="flex-1 relative overflow-hidden flex items-stretch">
        <div className={`flex-1 relative h-full flex flex-col overflow-hidden transition-all duration-300 ${isRightPanelCollapsed ? 'mr-0' : 'mr-[310px]'}`}>
          <div className="flex-1 relative min-h-0">
            <Scene />
            <CameraOverlay />
            <ViewportControls />
            {showFlash && (
              <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-all duration-150 ease-out animate-none" />
            )}
          </div>
          <BlockingBoard />
        </div>
        <RightPanel />
      </main>
    </div>
  );
}
