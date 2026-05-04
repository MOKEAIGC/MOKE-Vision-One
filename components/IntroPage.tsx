import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
// 视频背景：自包含独立组件，负责自动/静音/循环播放与遮罩，不影响原有粒子 UI
import { VideoBackground } from './VideoBackground';
// 小红书外链图标按钮：自包含独立组件，点击跳转小红书主页
import { XiaohongshuLink } from './XiaohongshuLink';
// 通过 new URL(..., import.meta.url) 引用视频资源，Vite 会在构建时处理路径，兼容 Electron file:// 协议
const videoBgSrc = new URL('../Video-1777092713178.mp4', import.meta.url).href;

interface IntroPageProps {
  onEnter: () => void;
}

export const IntroPage: React.FC<IntroPageProps> = ({ onEnter }) => {
  const { lang } = useLanguage();
  const isCN = lang === 'CN';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Trigger entrance animation
  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  // Interactive Background Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (spotlightRef.current) {
        const x = e.clientX;
        const y = e.clientY;
        // Dynamic red spotlight tracking mouse
        spotlightRef.current.style.background = `radial-gradient(circle 800px at ${x}px ${y}px, rgba(208, 0, 0, 0.12), transparent 70%)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    
    // High DPI Canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Donut Geometry Parameters
    const R = Math.min(width, height) * 0.25; // Major radius relative to screen
    const r = Math.min(width, height) * 0.1;  // Minor radius
    const numParticles = width < 768 ? 1200 : 2500; // Adjust density based on screen
    
    const mouse = { x: -5000, y: -5000, isActive: false };

    // Particle Class
    class Particle {
      u: number; v: number; // Parametric coordinates
      x: number; y: number; z: number; // Current position
      ox: number; oy: number; oz: number; // Target origin position
      vx: number; vy: number; vz: number; // Velocity
      size: number;
      baseColor: string;
      activeColor: string;

      constructor() {
        this.u = Math.random() * Math.PI * 2;
        this.v = Math.random() * Math.PI * 2;
        this.x = 0; this.y = 0; this.z = 0;
        this.ox = 0; this.oy = 0; this.oz = 0;
        this.vx = 0; this.vy = 0; this.vz = 0;
        this.size = Math.random() * 1.5 + 0.5;
        // Red Theme Colors
        this.baseColor = Math.random() > 0.9 ? 'rgba(208, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.3)';
        this.activeColor = 'rgba(208, 0, 0, 1)';
        this.calculateOrigin();
        
        // Explode in from random start
        this.x = (Math.random() - 0.5) * width * 2;
        this.y = (Math.random() - 0.5) * height * 2;
        this.z = (Math.random() - 0.5) * 1000;
      }

      calculateOrigin() {
        // Torus Math
        this.ox = (R + r * Math.cos(this.v)) * Math.cos(this.u);
        this.oy = (R + r * Math.cos(this.v)) * Math.sin(this.u);
        this.oz = r * Math.sin(this.v);
      }

      update(rotX: number, rotY: number) {
        // 3D Rotation Matrix
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);

        // Rotate the "Target" Structure
        let y1 = this.ox * cosX - this.oz * sinX;
        let z1 = this.ox * sinX + this.oz * cosX;
        let x1 = this.oy * cosY - z1 * sinY;
        let z2 = this.oy * sinY + z1 * cosY;

        const targetX = x1;
        const targetY = y1;
        const targetZ = z2;

        // Interaction Physics
        const perspective = 1000;
        const scale = perspective / (perspective + this.z);
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;

        const dx = mouse.x - screenX;
        const dy = mouse.y - screenY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const forceRadius = 250;

        if (dist < forceRadius) {
            const force = (forceRadius - dist) / forceRadius;
            const angle = Math.atan2(dy, dx);
            
            // Push away (Destruction effect)
            this.vx -= Math.cos(angle) * force * 2;
            this.vy -= Math.sin(angle) * force * 2;
            this.vz -= force * 10; // Push back in Z space too
        }

        // Elastic Recovery (Spring force to target)
        const springStrength = 0.04;
        this.vx += (targetX - this.x) * springStrength;
        this.vy += (targetY - this.y) * springStrength;
        this.vz += (targetZ - this.z) * springStrength;

        // Physics Integration
        this.vx *= 0.92; // Friction
        this.vy *= 0.92;
        this.vz *= 0.92;

        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;
      }

      draw(ctx: CanvasRenderingContext2D) {
        const perspective = 1000;
        // Z-clipping
        if (this.z < -perspective + 10) return;

        const scale = perspective / (perspective + this.z);
        const screenX = width / 2 + this.x * scale;
        const screenY = height / 2 + this.y * scale;

        // Depth of Field / Fog
        const alpha = Math.max(0, Math.min(1, (scale - 0.2) * 1.5));
        
        ctx.fillStyle = this.baseColor;
        
        // Highlight logic
        if (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 1) {
             ctx.fillStyle = this.activeColor;
        }

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.size * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Init Particles
    const particles: Particle[] = [];
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }

    let rotX = 0;
    let rotY = 0;
    let animationId: number;

    const animate = () => {
        // Clear with fade effect for motion blur trail
        ctx.clearRect(0, 0, width, height);

        rotX += 0.002;
        rotY += 0.003;

        // Update & Draw
        particles.forEach(p => {
            p.update(rotX, rotY);
            p.draw(ctx);
        });

        animationId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.isActive = true;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - rect.left;
        mouse.y = e.touches[0].clientY - rect.top;
        mouse.isActive = true;
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    
    animate();

    return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden text-gray-200 font-sans selection:bg-moke-red selection:text-white">
      
      {/* 0. Static Gradient Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050000] to-[#1a0000] opacity-80 z-0 pointer-events-none" />

      {/* 0.5 视频背景层：叠加在渐变之上、粒子/UI 之下，不拦截鼠标事件 */}
      <VideoBackground videoSrc={videoBgSrc} />

      {/* 1. Interactive Spotlight (Mouse Following) */}
      <div ref={spotlightRef} className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300 ease-out" />

      {/* 2. Canvas Layer */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* 3. Atmospheric Lighting (Red Glows) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[20vh] bg-moke-red opacity-10 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-0 w-[40vw] h-[30vh] bg-red-900 opacity-5 blur-[100px] pointer-events-none mix-blend-screen" />

      {/* 4. Grid Lines (Industrial Feel) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-5" 
           style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '100px 100px' }}>
      </div>

      {/* 5. UI Layer */}
      <div className={`relative z-10 flex flex-col items-center justify-between h-full py-12 px-6 transition-all duration-1000 ease-out ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        
        {/* Top Bar */}
        <div className="w-full flex justify-between items-start max-w-7xl">
            <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full border border-gray-800 bg-white/5 backdrop-blur flex items-center justify-center">
                     <div className="w-2 h-2 bg-moke-red rounded-full animate-pulse shadow-[0_0_15px_#D00000]" />
                 </div>
                 <div className="flex flex-col font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                    <span>MOKE SYSTEM</span>
                    <span className="text-white font-bold">Concept Prototype</span>
                 </div>
            </div>
            <div className="hidden md:flex flex-col text-right font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                <span>EST. 2025</span>
                <span className="text-moke-red font-bold">CHINA 2026</span>
            </div>
        </div>

        {/* 新增包裹层：将 Hero 推到屏幕左半区，右半区完整留给视频中的角色
            只包裹不修改内部任何原有 className，保持字号/颜色/间距等视觉风格不变 */}
        <div className="w-full max-w-7xl flex justify-start items-center">
          <div className="w-full md:w-[55%] lg:w-[50%] md:pl-4 lg:pl-8">
        {/* Center Hero */}
        <div className="text-center space-y-8 max-w-4xl relative pointer-events-none">
            {/* 小红书外链按钮 — 置于标题正上方（点击跳转小红书主页）
                父容器 pointer-events-none，故需单独开启自身 pointer-events-auto */}
            <div className="flex justify-center pointer-events-auto">
                <XiaohongshuLink
                    href="https://xhslink.com/m/75BJA86cWgk"
                    size="lg"
                    title="前往小红书主页"
                />
            </div>

            {/* Title with Glass effect */}
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none text-white drop-shadow-[0_0_30px_rgba(208,0,0,0.2)]">
                <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-600">MOKE</span>
                <span className="block text-4xl md:text-7xl mt-2 font-bold stroke-text text-transparent bg-clip-text bg-gradient-to-b from-gray-400 to-gray-800">VISION ONE</span>
            </h1>
            
            {/* Typing Subtitle */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-xs md:text-sm font-mono text-moke-red tracking-[0.2em] font-bold">
                <span className="glass-panel px-3 py-1 rounded-full border border-red-900/30 bg-red-900/10">{isCN ? '[ 极限物理 ]' : '[ EXTREME PHYSICS ]'}</span>
                <span className="w-px h-4 bg-gray-800 hidden md:block" />
                <span className="glass-panel px-3 py-1 rounded-full border border-red-900/30 bg-red-900/10">{isCN ? '[ 计算摄影终端 ]' : '[ COMPUTATIONAL IMAGING ]'}</span>
            </div>

            <p className="max-w-xl mx-auto text-gray-400 font-sans font-light text-sm md:text-base leading-relaxed tracking-wide mt-8 mix-blend-plus-lighter">
                {isCN ? '光即数据，无形之像。' : 'Light is data, image is formless.'}<br/>
                <span className="text-gray-600">The boundary between photons and data dissolves.</span>
            </p>
        </div>
        </div>
        {/* 左对齐包裹层结束 */}
        </div>

        {/* Bottom Area: Specs & Button */}
        <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-end gap-10">
            
            {/* Industrial Specs */}
            <div className="flex flex-col gap-4 font-mono text-[10px] text-gray-600 tracking-widest uppercase">
                <div className="flex gap-2 items-center">
                    <span className="w-1 h-1 bg-moke-red"></span>
                    <span>Thickness: 8.0mm Slate</span>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="w-1 h-1 bg-gray-700"></span>
                    <span>Sensor: 10GP Organic Curve</span>
                </div>
                <div className="flex gap-2 items-center">
                    <span className="w-1 h-1 bg-gray-700"></span>
                    <span>Lens: 82mm Flat Metalens</span>
                </div>
            </div>

            {/* Main Action Button */}
            <button
                onClick={onEnter}
                onMouseEnter={() => setIsHoveringButton(true)}
                onMouseLeave={() => setIsHoveringButton(false)}
                className="group relative px-16 py-6 bg-transparent overflow-hidden border border-white/10 hover:border-moke-red/50 transition-colors duration-500 backdrop-blur-sm pointer-events-auto"
            >
                {/* Hover Fill */}
                <div className={`absolute inset-0 bg-moke-red/10 transform origin-left transition-transform duration-500 ease-out ${isHoveringButton ? 'scale-x-100' : 'scale-x-0'}`} />
                
                {/* Text */}
                <span className="relative z-10 font-mono font-bold text-sm tracking-[0.3em] group-hover:text-white transition-colors duration-300 flex items-center gap-4">
                    ENTER SYSTEM
                    <svg className={`w-4 h-4 transition-transform duration-300 ${isHoveringButton ? 'translate-x-2' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>

                {/* Technical Corners */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/50 group-hover:border-moke-red transition-colors" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/50 group-hover:border-moke-red transition-colors" />
            </button>
        </div>
      </div>
    </div>
  );
};