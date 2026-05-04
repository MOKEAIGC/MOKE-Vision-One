// 文件路径: components/effects/InteractiveParticles.tsx
// 独立的交互式粒子背景组件（工业时尚风格）
// 特性：
//   1. 全屏微弱动态粒子（低密度、低透明度，不干扰 UI）
//   2. 鼠标靠近时产生"排斥-回弹"交互，模拟量子场扰动
//   3. 自动适配深色/浅色主题
//   4. 自包含：自己管理 canvas、事件、动画循环，离开时完全清理
//   5. 防御性：窗口缩放/隐藏时自动停止动画，节省性能
//   6. 使用 pointer-events-none，绝对不阻挡任何业务交互

import React, { useEffect, useRef } from 'react';

interface InteractiveParticlesProps {
  /** 是否深色模式，控制粒子基础颜色 */
  isDark?: boolean;
  /** 粒子数量（可选，默认按屏幕尺寸自适应） */
  density?: number;
  /** 鼠标作用半径 */
  interactRadius?: number;
  /** 是否启用连线（相邻粒子间） */
  enableLines?: boolean;
  /** 层级 z-index，默认 0（最底层） */
  zIndex?: number;
  /** 整体透明度（0~1），让粒子保持"微弱"观感 */
  opacity?: number;
}

export const InteractiveParticles: React.FC<InteractiveParticlesProps> = ({
  isDark = true,
  density,
  interactRadius = 140,
  enableLines = true,
  zIndex = 0,
  opacity = 0.55,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // 防御性编程：canvas 可能为空
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();

    // 自适应密度：小屏少粒子，避免性能问题
    const area = width * height;
    const defaultCount = Math.min(140, Math.max(40, Math.round(area / 16000)));
    const numParticles = density ?? defaultCount;

    // 颜色方案：深色模式偏冷银白 + 红色点缀；浅色模式偏深灰
    const baseColor = isDark ? 'rgba(220, 220, 230,' : 'rgba(40, 40, 50,';
    const accentColor = 'rgba(208, 0, 0,'; // moke-red 品牌色点缀
    const lineColor = isDark ? 'rgba(200, 200, 210,' : 'rgba(60, 60, 70,';

    const mouse = { x: -9999, y: -9999, active: false };

    // 粒子类：简洁 2D 粒子 + 鼠标排斥 + 回归原位
    class Particle {
      x: number;
      y: number;
      ox: number;
      oy: number;
      vx: number;
      vy: number;
      size: number;
      isAccent: boolean;
      baseAlpha: number;
      drift: number;
      driftSpeed: number;

      constructor() {
        this.ox = Math.random() * width;
        this.oy = Math.random() * height;
        this.x = this.ox;
        this.y = this.oy;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.size = Math.random() * 1.4 + 0.4;
        this.isAccent = Math.random() > 0.9; // 10% 红色点缀
        this.baseAlpha = Math.random() * 0.5 + 0.3;
        this.drift = Math.random() * Math.PI * 2;
        this.driftSpeed = Math.random() * 0.002 + 0.0008;
      }

      update() {
        // 缓慢漂移：给原点加一个正弦扰动，形成"呼吸感"
        this.drift += this.driftSpeed;
        const driftX = Math.cos(this.drift) * 12;
        const driftY = Math.sin(this.drift) * 12;
        const targetX = this.ox + driftX;
        const targetY = this.oy + driftY;

        // 鼠标排斥力
        if (mouse.active) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const distSq = dx * dx + dy * dy;
          const radiusSq = interactRadius * interactRadius;
          if (distSq < radiusSq && distSq > 0.01) {
            const dist = Math.sqrt(distSq);
            const force = (interactRadius - dist) / interactRadius;
            this.vx += (dx / dist) * force * 0.9;
            this.vy += (dy / dist) * force * 0.9;
          }
        }

        // 弹簧回归力：回到漂移目标点
        this.vx += (targetX - this.x) * 0.012;
        this.vy += (targetY - this.y) * 0.012;

        // 摩擦
        this.vx *= 0.92;
        this.vy *= 0.92;

        this.x += this.vx;
        this.y += this.vy;
      }

      draw(c: CanvasRenderingContext2D) {
        const color = this.isAccent ? accentColor : baseColor;
        c.fillStyle = `${color}${this.baseAlpha})`;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fill();
      }
    }

    const particles: Particle[] = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle());
    }

    let animationId = 0;
    let running = true;

    const render = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      // 更新 & 绘制粒子
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(ctx);
      }

      // 相邻粒子连线（工业科技感）
      if (enableLines) {
        const maxLineDist = 110;
        const maxLineDistSq = maxLineDist * maxLineDist;
        for (let i = 0; i < particles.length; i++) {
          const pi = particles[i];
          for (let j = i + 1; j < particles.length; j++) {
            const pj = particles[j];
            const dx = pi.x - pj.x;
            const dy = pi.y - pj.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < maxLineDistSq) {
              const alpha = (1 - dSq / maxLineDistSq) * 0.18;
              ctx.strokeStyle = `${lineColor}${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.beginPath();
              ctx.moveTo(pi.x, pi.y);
              ctx.lineTo(pj.x, pj.y);
              ctx.stroke();
            }
          }
        }

        // 鼠标到附近粒子的高亮连线
        if (mouse.active) {
          const mouseLineDist = interactRadius;
          const mouseLineDistSq = mouseLineDist * mouseLineDist;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < mouseLineDistSq) {
              const alpha = (1 - dSq / mouseLineDistSq) * 0.45;
              ctx.strokeStyle = `${accentColor}${alpha})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(mouse.x, mouse.y);
              ctx.stroke();
            }
          }
        }
      }

      animationId = requestAnimationFrame(render);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const handleVisibility = () => {
      // 页面隐藏时暂停动画，节省资源
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(animationId);
      } else if (!running) {
        running = true;
        render();
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibility);

    render();

    return () => {
      running = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isDark, density, interactRadius, enableLines]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex,
        opacity,
        mixBlendMode: isDark ? 'screen' : 'multiply',
      }}
    />
  );
};

export default InteractiveParticles;
