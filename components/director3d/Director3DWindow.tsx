// 文件路径: components/director3d/Director3DWindow.tsx
// 3D 导演台窗口包装 — 嵌入无限画布作为全屏浮层。
// 顶部提供返回栏，并在挂载时注册截图捕获桥，将"截图"路由到无限画布 + 全局素材库。
import React, { useEffect } from 'react';
import { X, Camera } from 'lucide-react';
import Director3DApp from './Director3DApp';
import { setCaptureHandler, CaptureHandler } from './captureBridge';

interface Director3DWindowProps {
  onBack: () => void;
  onCapture: CaptureHandler;
  isDark?: boolean;
}

export const Director3DWindow: React.FC<Director3DWindowProps> = ({ onBack, onCapture, isDark = true }) => {
  // 注册截图捕获桥：组件挂载期间，所有截图都路由到 onCapture；卸载时注销。
  useEffect(() => {
    setCaptureHandler(onCapture);
    return () => setCaptureHandler(null);
  }, [onCapture]);

  return (
    <div className={`flex flex-col w-full h-full ${isDark ? 'bg-[#050505]' : 'bg-[#f4f4f5]'}`}>
      {/* ====== 顶部返回栏 ====== */}
      <div
        className={`flex items-center justify-between px-3 h-10 shrink-0 border-b ${
          isDark ? 'bg-[#0a0a0a] border-[#1f1f1f]' : 'bg-white border-[#e5e5e5]'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono transition-colors ${
              isDark ? 'text-[#888] hover:text-[#ff4444] hover:bg-[#1a0808]' : 'text-[#666] hover:text-[#dc2626] hover:bg-[#fff0f0]'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>{isDark ? '返回画布' : '返回画布'}</span>
          </button>
          <div className={`w-px h-4 ${isDark ? 'bg-[#1f1f1f]' : 'bg-[#e0e0e0]'}`} />
          <div className="flex items-center gap-1.5">
            <Camera className={`w-3.5 h-3.5 ${isDark ? 'text-[#ff4444]' : 'text-[#dc2626]'}`} />
            <span className={`text-[11px] font-mono font-bold tracking-wider ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}>
              3D 导演台
            </span>
          </div>
        </div>
        <div className={`text-[9px] font-mono tracking-wider ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>
          按 C 截图 · 直达画布 + 素材库
        </div>
      </div>

      {/* ====== 3D 导演主体 ====== */}
      <div className="flex-1 relative min-h-0">
        <Director3DApp />
      </div>
    </div>
  );
};
