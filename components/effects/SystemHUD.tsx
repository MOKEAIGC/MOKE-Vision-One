// 文件路径: components/effects/SystemHUD.tsx
// 工业时尚：底部悬浮状态总线 HUD
// 显示：实时时间 / FPS / 鼠标坐标 / 图像计数
// 独立自包含、防御性编程、完全不影响业务交互

import React, { useEffect, useRef, useState } from 'react';

interface SystemHUDProps {
  isDark?: boolean;
  /** 当前图像总数（可选，用户传入则显示） */
  imageCount?: number;
  /** 当前模式标签（可选） */
  modeLabel?: string;
  /** z-index */
  zIndex?: number;
}

export const SystemHUD: React.FC<SystemHUDProps> = ({
  isDark = true,
  imageCount,
  modeLabel,
  zIndex = 45,
}) => {
  const [time, setTime] = useState<string>('');
  const [fps, setFps] = useState<number>(60);
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const lastRef = useRef<number>(performance.now());
  const framesRef = useRef<number>(0);

  // 时间 + FPS 循环
  useEffect(() => {
    const loop = () => {
      framesRef.current += 1;
      const now = performance.now();
      if (now - lastRef.current >= 1000) {
        setFps(framesRef.current);
        framesRef.current = 0;
        lastRef.current = now;
        // 同步更新时间
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        setTime(`${hh}:${mm}:${ss}`);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // 鼠标坐标
  useEffect(() => {
    let ticking = false;
    const onMove = (e: MouseEvent) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setMouse({ x: e.clientX, y: e.clientY });
        ticking = false;
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const textColor = isDark ? 'rgba(220,220,230,0.75)' : 'rgba(40,40,50,0.75)';
  const dimColor = isDark ? 'rgba(150,150,160,0.55)' : 'rgba(90,90,100,0.55)';
  const bg = isDark ? 'rgba(12,12,14,0.55)' : 'rgba(255,255,255,0.55)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const red = 'rgb(208, 0, 0)';

  return (
    <div
      className="pointer-events-none select-none"
      style={{
        position: 'fixed',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '6px 14px',
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 2,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 10,
          letterSpacing: '0.14em',
          color: textColor,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
          whiteSpace: 'nowrap',
        }}
      >
        {/* 脉冲指示点 */}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: red,
              boxShadow: `0 0 8px ${red}`,
              animation: 'moke-pulse 1.4s ease-in-out infinite',
            }}
          />
          <span style={{ color: dimColor }}>SYS</span>
          <span style={{ color: red, fontWeight: 700 }}>ONLINE</span>
        </span>

        <span style={{ width: 1, height: 10, background: border }} />

        <span>
          <span style={{ color: dimColor }}>TIME </span>
          <span style={{ fontWeight: 700 }}>{time || '--:--:--'}</span>
        </span>

        <span style={{ width: 1, height: 10, background: border }} />

        <span>
          <span style={{ color: dimColor }}>FPS </span>
          <span style={{ fontWeight: 700 }}>{String(fps).padStart(2, '0')}</span>
        </span>

        <span style={{ width: 1, height: 10, background: border }} />

        <span>
          <span style={{ color: dimColor }}>XY </span>
          <span style={{ fontWeight: 700 }}>
            {String(mouse.x).padStart(4, '0')}·{String(mouse.y).padStart(4, '0')}
          </span>
        </span>

        {typeof imageCount === 'number' && (
          <>
            <span style={{ width: 1, height: 10, background: border }} />
            <span>
              <span style={{ color: dimColor }}>IMG </span>
              <span style={{ fontWeight: 700 }}>{String(imageCount).padStart(3, '0')}</span>
            </span>
          </>
        )}

        {modeLabel && (
          <>
            <span style={{ width: 1, height: 10, background: border }} />
            <span>
              <span style={{ color: dimColor }}>MODE </span>
              <span style={{ fontWeight: 700, color: red }}>{modeLabel}</span>
            </span>
          </>
        )}
      </div>

      {/* 内联 keyframes */}
      <style>{`
        @keyframes moke-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.75); }
        }
      `}</style>
    </div>
  );
};

export default SystemHUD;
