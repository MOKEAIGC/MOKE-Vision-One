// 文件路径: components/director3d/components/CameraOverlay.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useSceneStore } from '../store';

export default function CameraOverlay() {
  const { cameraPose, themeMode } = useSceneStore();
  const [containerAspect, setContainerAspect] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ob = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setContainerAspect(entry.contentRect.width / entry.contentRect.height);
        }
      }
    });

    if (containerRef.current && containerRef.current.parentElement) {
      ob.observe(containerRef.current.parentElement);
      // initial 
      const rect = containerRef.current.parentElement.getBoundingClientRect();
       if (rect.height > 0) {
          setContainerAspect(rect.width / rect.height);
       }
    }

    return () => ob.disconnect();
  }, []);

  const aspectStr = cameraPose.aspect || '16:9';
  let targetAspect = 16 / 9;
  
  if (aspectStr.includes(':')) {
    const parts = aspectStr.split(':');
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1])) && Number(parts[1]) !== 0) {
      targetAspect = Number(parts[0]) / Number(parts[1]);
    }
  } else if (!isNaN(Number(aspectStr)) && Number(aspectStr) > 0) {
    targetAspect = Number(aspectStr);
  }

  let px = 0;
  let py = 0;

  if (containerAspect > targetAspect) {
    // window is wider than target. need pillarboxes on left/right.
    const targetWidth = 100 * targetAspect / containerAspect; 
    px = (100 - targetWidth) / 2;
  } else {
    // window is taller than target. need letterboxes on top/bottom.
    const targetHeight = 100 * containerAspect / targetAspect;
    py = (100 - targetHeight) / 2;
  }

  const isLight = themeMode === 'light';

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
      {/* Safe Area Box */}
      <div 
        className="absolute transition-all duration-300"
        style={{ left: `${px}%`, right: `${px}%`, top: `${py}%`, bottom: `${py}%` }}
      >
        {/* 外置掩模：日间轻盈温和，夜间硬核专业 */}
        <div className={`absolute inset-0 border transition-all ${
          isLight 
            ? 'border-neutral-400/25 shadow-[0_0_0_9999px_rgba(229,229,231,0.85)]' 
            : 'border-white/20 shadow-[0_0_0_9999px_rgba(3,3,3,0.85)]'
        }`} />
        
        {/* Frame Info */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-none border text-[9px] font-mono font-bold tracking-[0.1em] transition-colors ${
          isLight 
            ? 'bg-white border-neutral-300 text-neutral-800' 
            : 'bg-black border-neutral-800 text-white'
        }`}>
          REC {aspectStr}
        </div>
        
        {/* Corner Marks */}
        <div className={`absolute w-3.5 h-3.5 border-t border-l top-0 left-0 transition-colors ${isLight ? 'border-neutral-800' : 'border-white'}`} />
        <div className={`absolute w-3.5 h-3.5 border-t border-r top-0 right-0 transition-colors ${isLight ? 'border-neutral-800' : 'border-white'}`} />
        <div className={`absolute w-3.5 h-3.5 border-b border-l bottom-0 left-0 transition-colors ${isLight ? 'border-neutral-800' : 'border-white'}`} />
        <div className={`absolute w-3.5 h-3.5 border-b border-r bottom-0 right-0 transition-colors ${isLight ? 'border-neutral-800' : 'border-white'}`} />
        
        {/* Center Crosshair */}
        <div className="absolute top-1/2 left-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center opacity-60">
           <div className={`w-full h-[1px] ${isLight ? 'bg-neutral-800/40' : 'bg-white/50'}`} />
           <div className={`absolute h-full w-[1px] ${isLight ? 'bg-neutral-800/40' : 'bg-white/50'}`} />
        </div>
      </div>
    </div>
  );
}
