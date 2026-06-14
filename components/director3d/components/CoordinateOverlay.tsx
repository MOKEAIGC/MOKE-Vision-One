// 文件路径: components/director3d/components/CoordinateOverlay.tsx
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export function CoordinateUpdater({ controlsRef }: { controlsRef: React.MutableRefObject<OrbitControlsImpl | null> }) {
  const textRef = useRef<HTMLDivElement>(null);
  
  useFrame(({ camera }) => {
    if (!textRef.current) return;
    
    // Fallbacks
    let targetX = 0, targetY = 0, targetZ = 0;
    
    if (controlsRef.current) {
       targetX = controlsRef.current.target.x;
       targetY = controlsRef.current.target.y;
       targetZ = controlsRef.current.target.z;
    }
    
    const cx = camera.position.x.toFixed(2);
    const cy = camera.position.y.toFixed(2);
    const cz = camera.position.z.toFixed(2);
    
    const tx = targetX.toFixed(2);
    const ty = targetY.toFixed(2);
    const tz = targetZ.toFixed(2);

    textRef.current.innerHTML = `
      <div class="flex gap-4">
        <div>
          <span class="text-white opacity-80 font-bold">CAM (WORLD)</span><br/>
          X: ${cx}<br/>
          Y: ${cy}<br/>
          Z: ${cz}
        </div>
        <div>
          <span class="text-white opacity-80 font-bold">TARGET (CENTER)</span><br/>
          X: ${tx}<br/>
          Y: ${ty}<br/>
          Z: ${tz}
        </div>
      </div>
    `;
  });
  
  return (
    <Html fullscreen zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
      <div
        ref={textRef}
        className="absolute bottom-4 left-4 text-[10px] font-mono text-[#70707A] z-10 pointer-events-none"
      />
    </Html>
  );
}
