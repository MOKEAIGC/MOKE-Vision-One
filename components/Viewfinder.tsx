// 文件路径: components/Viewfinder.tsx
// 取景器组件 — 图片按原始比例完整显示（object-contain），不被裁切
// 结构：外层容器 → 取景器边框（overflow-hidden）→ CMD 输入区（边框外部下方）
import React, { useState, useEffect, useRef } from 'react';
import { CameraMode } from '../types';
import { StatusBadge } from './UIComponents';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { DirectorPromptBox } from './DirectorPromptBox';
import { PromptInput, AttachedImage, PromptInputHandle } from './PromptInput';
import { useWheelResize } from './hooks/useWheelResize';
// 新增：边缘拖动缩放（CMD 卡片宽度方向）
import { useEdgeResize } from './hooks/useEdgeResize';
import { ResizableHandle } from './ResizableHandle';

interface ViewfinderProps {
  mode: CameraMode;
  isProcessing: boolean;
  prompt: string;
  setPrompt: (p: string) => void;
  /** @ 引用的参考图片 */
  attachedImages: AttachedImage[];
  onAttachedImagesChange: (images: AttachedImage[]) => void;
  /** Gallery 图片列表（供 @ 菜单中"从相册选择"使用） */
  galleryImages?: { id: string; url: string }[];
  lastCapturedImage: string | null;
  onZoom: (url: string) => void;
  onOpenFilmSystem?: () => void;
  lockedFilmStyle?: string;
  onClearLockedFilm?: () => void;
  onCapture?: () => void;
}

export const Viewfinder: React.FC<ViewfinderProps> = ({
  mode,
  isProcessing,
  prompt,
  setPrompt,
  attachedImages,
  onAttachedImagesChange,
  galleryImages,
  lastCapturedImage,
  onZoom,
  onOpenFilmSystem,
  lockedFilmStyle,
  onClearLockedFilm,
  onCapture,
}) => {
  const { t, lang } = useLanguage();
  const { isDark } = useTheme();

  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // CMD 输入卡片的滚轮缩放（调整 padding-block 来平滑改变卡片高度）
  // 同一份 size 状态同时接收：① 滚轮 ② 上下边缘拖拽 ③ 双击重置
  const cmdResize = useWheelResize({
    initial: 12,
    min: 8,
    max: 96, // [v2] 放宽上限，配合上下拖拽手柄能把卡片拉得更高
    step: 4,
    idleMs: 700,
  });

  // ========== 上下边缘拖拽调整高度（padding-block）==========
  // 策略：top 边被往上拉 → paddingBlock 增加；bottom 边被往下拉 → paddingBlock 增加
  //      直觉上"抓住边缘向外拉 = 卡片变大"。
  //      拖拽期间调用 cmdResize.setSize(clamp) 与滚轮共享同一状态，视觉反馈复用高亮样式。
  const verticalDragRef = useRef<{
    dir: 'top' | 'bottom';
    startY: number;
    startSize: number;
  } | null>(null);
  const [verticalDragDir, setVerticalDragDir] = useState<'top' | 'bottom' | null>(null);

  const onVerticalHandleMouseDown = (dir: 'top' | 'bottom') => (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    verticalDragRef.current = {
      dir,
      startY: e.clientY,
      startSize: cmdResize.size,
    };
    setVerticalDragDir(dir);
  };

  const onVerticalHandleTouchStart = (dir: 'top' | 'bottom') => (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    e.stopPropagation();
    const t = e.touches[0];
    verticalDragRef.current = {
      dir,
      startY: t.clientY,
      startSize: cmdResize.size,
    };
    setVerticalDragDir(dir);
  };

  useEffect(() => {
    if (!verticalDragDir) return;

    const computeAndApply = (clientY: number) => {
      const s = verticalDragRef.current;
      if (!s) return;
      const dy = clientY - s.startY;
      // top 边：dy<0（向上拖）→ 增大；bottom 边：dy>0（向下拖）→ 增大
      const delta = s.dir === 'top' ? -dy : dy;
      // 每像素贡献 0.5px paddingBlock（上下各一份，总高度增量 ≈ dy）
      const next = s.startSize + delta * 0.5;
      cmdResize.setSize(next);
      cmdResize.pulseActive();
    };

    const onMouseMove = (e: MouseEvent) => computeAndApply(e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      computeAndApply(e.touches[0].clientY);
    };
    const onUp = () => {
      setVerticalDragDir(null);
      verticalDragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    window.addEventListener('touchcancel', onUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('touchcancel', onUp);
    };
  }, [verticalDragDir, cmdResize]);

  // CMD 卡片宽度方向的边缘拖拽缩放（与滚轮高度调节互不干扰）
  // 默认 100%（宽度 0 表示跟随父容器），通过 marginInline 做收缩
  // 边界：最小 360px（保证输入框与按钮可用），最大不限（受父容器限制）
  const cmdEdgeResize = useEdgeResize({
    initial: { width: 0, height: 0 }, // 0 = 自动（跟随父容器）
    min: { width: 360, height: 40 },
    enabled: ['left', 'right', 'sw', 'se'],
    storageKey: 'moke_vision_cmd_card_size',
  });

  // 用于从外部 @ 按钮触发 PromptInput 的 @ 菜单
  const promptInputRef = useRef<PromptInputHandle>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (zoomLevel <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  const gridColor = isDark ? 'bg-gray-800' : 'bg-gray-400';
  const overlayBg = isDark ? 'bg-moke-black/80' : 'bg-white/80';
  const subTextColor = isDark ? 'text-gray-500' : 'text-gray-600';

  // 第一张 @ 引用的图片作为背景幻影展示
  const ghostImage = attachedImages.length > 0 ? attachedImages[0].base64 : null;

  return (
    <div className="absolute inset-x-4 top-4 bottom-[160px] flex items-stretch justify-center transition-colors duration-500">
      {/* ========== 取景器边框容器（工业风明显边框 + 四角标记） ========== */}
      <div className={`relative flex-1 ${isDark ? 'bg-black' : 'bg-[#EAEAEA]'} overflow-hidden border-[3px] ${isDark ? 'border-gray-700' : 'border-gray-400'} rounded-sm shadow-[0_8px_40px_rgba(0,0,0,0.6)] group ring-1 ring-moke-red/20`}>
        
        {/* 四角工业风角标 — 增强边框存在感 */}
        <div className="absolute top-0 left-0 w-5 h-5 z-30 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-moke-red"></div>
          <div className="absolute top-0 left-0 h-full w-[3px] bg-moke-red"></div>
        </div>
        <div className="absolute top-0 right-0 w-5 h-5 z-30 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-[3px] bg-moke-red"></div>
          <div className="absolute top-0 right-0 h-full w-[3px] bg-moke-red"></div>
        </div>
        <div className="absolute bottom-0 left-0 w-5 h-5 z-30 pointer-events-none">
          <div className="absolute bottom-0 left-0 w-full h-[3px] bg-moke-red"></div>
          <div className="absolute bottom-0 left-0 h-full w-[3px] bg-moke-red"></div>
        </div>
        <div className="absolute bottom-0 right-0 w-5 h-5 z-30 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-full h-[3px] bg-moke-red"></div>
          <div className="absolute bottom-0 right-0 h-full w-[3px] bg-moke-red"></div>
        </div>
        
        {/* 三分法网格 */}
        <div className="absolute inset-0 pointer-events-none z-10 opacity-30">
          <div className="w-full h-full relative">
            <div className={`absolute top-1/3 left-0 w-full h-px ${gridColor}`}></div>
            <div className={`absolute top-2/3 left-0 w-full h-px ${gridColor}`}></div>
            <div className={`absolute left-1/3 top-0 h-full w-px ${gridColor}`}></div>
            <div className={`absolute left-2/3 top-0 h-full w-px ${gridColor}`}></div>
            {/* 中心十字 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-0.5 bg-moke-red opacity-50"></div>
              <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-0.5 bg-moke-red opacity-50"></div>
            </div>
          </div>
        </div>

        {/* 图片显示区（按原始比例完整显示） */}
        <div className="relative w-full h-full flex items-center justify-center p-6 z-0">
          <div
            className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                transformOrigin: 'center',
              }}
              className="w-full h-full flex items-center justify-center"
            >
              {/* 处理中状态 */}
              {isProcessing && (
                <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center ${overlayBg} backdrop-blur-sm`}>
                  <div className="w-24 h-24 border-t-4 border-moke-red rounded-full animate-spin mb-8"></div>
                  <p className="text-moke-red font-mono animate-pulse tracking-[0.2em] text-xl font-bold">{t('PROCESSING')}</p>
                  <p className={`text-sm ${subTextColor} font-mono mt-4 font-bold`}>{t('RAY_TRACING')}</p>
                </div>
              )}

              {/* 图片：object-contain 按原始比例完整显示，不裁剪 */}
              {!isProcessing && lastCapturedImage ? (
                <img
                  src={lastCapturedImage}
                  alt="Capture"
                  className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl cursor-zoom-in"
                  onDoubleClick={() => onZoom(lastCapturedImage)}
                  title="Double click to zoom"
                  draggable={false}
                />
              ) : !isProcessing && ghostImage ? (
                <img
                  src={ghostImage}
                  alt="Ref"
                  className="max-w-full max-h-full w-auto h-auto object-contain opacity-90 grayscale hover:grayscale-0 transition-all duration-500 cursor-zoom-in"
                  onDoubleClick={() => onZoom(ghostImage)}
                  title="Double click to zoom (First Reference)"
                  draggable={false}
                />
              ) : (
                <div className={`${isDark ? 'text-gray-800' : 'text-gray-300'} font-mono text-center select-none`}>
                  <div className="text-9xl mb-8 font-black tracking-tighter opacity-30">X1</div>
                  <p className="text-sm tracking-[0.5em] font-bold text-moke-red uppercase">{t('NO_SIGNAL')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* HUD 顶部徽章（精简，取景器内部） */}
        <div className="absolute top-3 left-3 z-20 hidden md:flex gap-2 opacity-50 hover:opacity-100 transition-opacity pointer-events-none">
          <StatusBadge label={t('HUD_CHIP')} active={true} />
          <StatusBadge label={t('HUD_LENS')} active={true} />
          <StatusBadge label={t('HUD_NIGHT')} active={isDark} />
        </div>
        <div className="absolute top-3 right-3 z-20 font-mono text-[10px] text-moke-red text-right font-bold tracking-wider opacity-50 hover:opacity-100 transition-opacity hidden md:block pointer-events-none">
          <p>REC.2020</p>
          <p>RAW 16-BIT</p>
        </div>

        {/* @ 引用参考图缩略（取景器内部右上角） — 激活时绿色高亮指示成功状态 */}
        {attachedImages.length > 0 && (
          <div className="absolute top-14 right-3 z-40 animate-in fade-in slide-in-from-right-4 duration-500 max-w-[280px]">
            <div className={`border-2 border-emerald-400/70 ${isDark ? 'bg-emerald-950/40' : 'bg-emerald-50/70'} backdrop-blur-md p-1 relative shadow-[0_0_18px_rgba(16,185,129,0.35)] rounded-sm transition-all duration-300`}>
              <div className="flex justify-between items-center mb-1 px-1">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]"></div>
                  <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-emerald-400 leading-none">✓ REF_IN ({attachedImages.length})</span>
                </div>
                <button
                  onClick={() => onAttachedImagesChange([])}
                  className={`text-[9px] font-mono font-bold hover:text-moke-red transition-colors ${subTextColor}`}
                  title="Clear All References"
                >
                  CLR
                </button>
              </div>
              <div className="flex gap-1 overflow-x-auto scrollbar-thin pb-1 max-w-[260px]">
                {attachedImages.map((img) => (
                  <div key={img.id} className="relative shrink-0 w-20 aspect-video overflow-hidden bg-gray-900 border border-emerald-400/40 hover:border-emerald-300 transition-colors group/item rounded-sm">
                    <img
                      src={img.thumbnail}
                      alt={img.name}
                      className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                    />
                    <button
                      onClick={() => onAttachedImagesChange(attachedImages.filter(i => i.id !== img.id))}
                      className="absolute top-0 right-0 bg-moke-red/80 text-white w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover/item:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 取景器内部左下角 — Zoom 滑块 */}
        <div className="absolute bottom-3 left-3 z-20">
          <div className={`flex items-center gap-3 ${isDark ? 'bg-black/60 border-white/10' : 'bg-white/70 border-black/10'} backdrop-blur-md px-3 py-1.5 rounded-lg border shadow-lg`}>
            <span className={`font-mono text-[9px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ZOOM</span>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-24 accent-moke-red"
            />
            <span className="text-moke-red font-mono text-[9px] w-7 text-right font-bold">{zoomLevel.toFixed(1)}x</span>
            <button
              onClick={() => { setZoomLevel(1); setPan({ x: 0, y: 0 }); }}
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${isDark ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-600 hover:text-black hover:bg-black/10'}`}
            >
              RESET
            </button>
          </div>
        </div>

        {/* 取景器内部右下角 — 胶片锁定提示已移到外部大按钮，这里保持空白 */}
      </div>
      {/* ========== 取景器边框容器结束 ========== */}

      {/* ========== CMD 输入区（取景器外部下方，不被边框裁切） ========== */}
      <div className="absolute -bottom-[130px] left-0 right-0 z-20">
        {/* 滚轮/上下拖拽高度指示徽章 — 交互时浮现 */}
        <div
          className={`absolute -top-7 right-2 z-30 flex items-center gap-1.5 pointer-events-none transition-all duration-200 ${
            cmdResize.active || verticalDragDir ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border backdrop-blur-md font-mono text-[10px] font-bold tracking-wider ${
              isDark
                ? 'bg-black/70 border-moke-red/50 text-moke-red'
                : 'bg-white/80 border-moke-red/50 text-moke-red'
            } shadow-[0_0_12px_rgba(208,0,0,0.3)]`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <span>H · {cmdResize.size}px</span>
            {cmdResize.isScrolling && <span className="w-1 h-1 rounded-full bg-moke-red animate-pulse" />}
          </span>
        </div>
        {/* 功能工具栏：@ 参考图 + FILM SYSTEM 并排右对齐 */}
        {onOpenFilmSystem && (
          <div className="flex justify-end items-stretch gap-2 mb-2">
            {/* @ 参考图按钮（与 FILM SYSTEM 同风格） */}
            {/* 激活态（已添加参考图）→ 绿色高亮 emerald，表示"成功添加"状态 */}
            <button
              onClick={() => promptInputRef.current?.openAtMenu()}
              className={`group relative flex items-center gap-3 pl-4 pr-5 py-2.5 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl backdrop-blur-xl ${
                attachedImages.length > 0
                  ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/25 to-emerald-700/15 shadow-[0_0_24px_rgba(16,185,129,0.45)] animate-in fade-in zoom-in-95'
                  : isDark
                  ? 'border-moke-red/60 bg-black/70 hover:border-moke-red hover:bg-moke-red/10 hover:shadow-[0_0_24px_rgba(208,0,0,0.35)]'
                  : 'border-moke-red/70 bg-white/90 hover:border-moke-red hover:bg-moke-red/5 hover:shadow-[0_0_24px_rgba(208,0,0,0.3)]'
              }`}
              title={lang === 'CN' ? '@ 添加参考图片（文件 / 相册 / 剪贴板）' : '@ Attach reference (File / Gallery / Clipboard)'}
            >
              {/* 左侧图标块 */}
              <div className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
                attachedImages.length > 0
                  ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                  : 'bg-moke-red/15 text-moke-red group-hover:bg-moke-red group-hover:text-white'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {/* 附件数量徽章 — 激活态改为绿色与白字，与品牌红区分 */}
                {attachedImages.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-300 text-emerald-950 text-[10px] font-black flex items-center justify-center shadow-[0_0_6px_rgba(110,231,183,0.9)] animate-pulse-fast">
                    {attachedImages.length}
                  </span>
                )}
                {/* 成功勾选小徽章（右下角） */}
                {attachedImages.length > 0 && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.9)]">
                    <svg className="w-2.5 h-2.5 text-emerald-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>

              {/* 右侧文字 */}
              <div className="flex flex-col items-start text-left leading-tight">
                <span className={`font-mono text-[13px] font-black tracking-[0.15em] uppercase transition-colors duration-300 ${
                  attachedImages.length > 0
                    ? 'text-emerald-300 drop-shadow-[0_0_6px_rgba(110,231,183,0.7)]'
                    : isDark ? 'text-white group-hover:text-moke-red' : 'text-black group-hover:text-moke-red'
                }`}>
                  @ {lang === 'CN' ? '参考图' : 'REFERENCE'}
                </span>
                <span className={`font-mono text-[10px] font-bold tracking-wider transition-colors duration-300 ${
                  attachedImages.length > 0
                    ? 'text-emerald-400/90'
                    : isDark ? 'text-gray-500 group-hover:text-moke-red/70' : 'text-gray-500 group-hover:text-moke-red/70'
                }`}>
                  {attachedImages.length > 0
                    ? `✓ 已引用 ${attachedImages.length} 张 · CLICK TO MANAGE`
                    : '添加参考图片 · FILE / GALLERY / PASTE'}
                </span>
              </div>
            </button>

            {/* FILM SYSTEM 高亮大按钮 — 带图标、标题、副标题说明 */}
            {/* 激活态（已锁定胶片风格）→ 绿色高亮 emerald，表示"成功锁定"状态 */}
            <button
              onClick={onOpenFilmSystem}
              className={`group relative flex items-center gap-3 pl-4 pr-5 py-2.5 rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-xl ${
                lockedFilmStyle
                  ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/25 to-emerald-700/15 shadow-[0_0_24px_rgba(16,185,129,0.45)] animate-in fade-in zoom-in-95'
                  : isDark
                  ? 'border-moke-red/60 bg-black/70 hover:border-moke-red hover:bg-moke-red/10 hover:shadow-[0_0_24px_rgba(208,0,0,0.35)]'
                  : 'border-moke-red/70 bg-white/90 hover:border-moke-red hover:bg-moke-red/5 hover:shadow-[0_0_24px_rgba(208,0,0,0.3)]'
              } backdrop-blur-xl`}
              title={lockedFilmStyle ? `当前锁定：${lockedFilmStyle}` : '打开胶片系统 — 选择风格预设'}
            >
              {/* 左侧胶片图标（放大） */}
              <div className={`relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-300 ${
                lockedFilmStyle
                  ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)]'
                  : 'bg-moke-red/15 text-moke-red group-hover:bg-moke-red group-hover:text-white'
              }`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="5" width="18" height="14" rx="1" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3" />
                  <rect x="8" y="8" width="8" height="8" rx="0.5" strokeWidth={1.5} opacity="0.7" />
                </svg>
                {/* 激活状态指示灯 — 改为绿色呼吸点 */}
                {lockedFilmStyle && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full animate-pulse-fast shadow-[0_0_6px_rgba(110,231,183,0.9)]" />
                )}
                {/* 成功勾选小徽章（右下角） */}
                {lockedFilmStyle && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center shadow-[0_0_8px_rgba(52,211,153,0.9)]">
                    <svg className="w-2.5 h-2.5 text-emerald-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>

              {/* 右侧文字：标题 + 副标题 */}
              <div className="flex flex-col items-start text-left leading-tight">
                <span className={`font-mono text-[13px] font-black tracking-[0.15em] uppercase transition-colors duration-300 ${
                  lockedFilmStyle
                    ? 'text-emerald-300 drop-shadow-[0_0_6px_rgba(110,231,183,0.7)]'
                    : isDark ? 'text-white group-hover:text-moke-red' : 'text-black group-hover:text-moke-red'
                }`}>
                  FILM SYSTEM
                </span>
                <span className={`font-mono text-[10px] font-bold tracking-wider transition-colors duration-300 ${
                  lockedFilmStyle
                    ? 'text-emerald-400/90'
                    : isDark
                    ? 'text-gray-500 group-hover:text-moke-red/70'
                    : 'text-gray-500 group-hover:text-moke-red/70'
                }`}>
                  {lockedFilmStyle
                    ? `🔒 ${lockedFilmStyle.length > 20 ? lockedFilmStyle.slice(0, 20) + '…' : lockedFilmStyle}`
                    : '胶片风格预设 · CLICK TO BROWSE'}
                </span>
              </div>

              {/* 右侧清除按钮（锁定时）— 使用 span + role 避免 button 嵌套 */}
              {/* 激活态下也改为绿色系 */}
              {lockedFilmStyle && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onClearLockedFilm?.(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onClearLockedFilm?.(); } }}
                  className="ml-1 w-6 h-6 flex items-center justify-center rounded-full bg-emerald-500/25 hover:bg-emerald-500 hover:text-white text-emerald-300 text-xs transition-all cursor-pointer"
                  title="清除胶片锁定"
                >
                  ✕
                </span>
              )}

              {/* 右侧箭头装饰 */}
              {!lockedFilmStyle && (
                <svg className={`w-4 h-4 ml-1 transition-all group-hover:translate-x-0.5 ${isDark ? 'text-gray-500 group-hover:text-moke-red' : 'text-gray-400 group-hover:text-moke-red'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        )}

        {/* CMD 卡片宽度缩放包裹层：相对定位承载边缘手柄，width 由 useEdgeResize 控制 */}
        <div
          className="relative mx-auto"
          style={{
            // width=0 时 = auto（跟随父容器），否则 = 用户拖拽后的固定宽度
            width: cmdEdgeResize.size.width > 0 ? cmdEdgeResize.size.width : '100%',
            maxWidth: '100%',
          }}
        >
          {/* 宽度指示徽章：拖拽中显示 */}
          {cmdEdgeResize.resizing && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <span className="font-mono text-[10px] tracking-widest text-moke-red font-bold px-2 py-0.5 rounded bg-black/80 border border-moke-red/40 backdrop-blur">
                W · {cmdEdgeResize.size.width}px
              </span>
            </div>
          )}

        {/* CMD 输入卡片 — 滚轮/上下边缘拖拽均可调高度，交互时边缘高亮 */}
        <div
          {...cmdResize.bindProps}
          className={`relative backdrop-blur-xl border-2 rounded-xl transition-[border-color,box-shadow,background-color] duration-200 ${
            cmdResize.active || verticalDragDir
              ? // 激活态：红色高亮边缘 + 光晕
                isDark
                ? 'bg-black/80 border-moke-red/70 shadow-[0_0_24px_rgba(208,0,0,0.35)]'
                : 'bg-white/90 border-moke-red/70 shadow-[0_0_24px_rgba(208,0,0,0.3)]'
              : // 默认态：淡边框
                isDark
                ? 'bg-black/70 border-white/10 shadow-2xl'
                : 'bg-white/80 border-black/10 shadow-2xl'
          }`}
          style={{
            paddingInline: '16px',
            paddingBlock: `${cmdResize.size}px`,
            transition: 'padding 120ms cubic-bezier(0.22, 1, 0.36, 1), border-color 200ms, box-shadow 200ms, background-color 200ms',
          }}
          title="滚轮/上下边缘拖拽调高度 · 左右边缘拖拽调宽度 · 双击恢复"
        >
          <PromptInput
            ref={promptInputRef}
            prompt={prompt}
            setPrompt={setPrompt}
            attachedImages={attachedImages}
            onAttachedImagesChange={onAttachedImagesChange}
            placeholder={t('PROMPT_PLACEHOLDER_TXT')}
            disabled={mode === CameraMode.EARTH_TO_IMAGE}
            galleryImages={galleryImages}
            showInlineAtButton={false}
          />

          {/* 上边缘拖拽手柄：往上拉 → 卡片变高 */}
          <div
            onMouseDown={onVerticalHandleMouseDown('top')}
            onTouchStart={onVerticalHandleTouchStart('top')}
            role="separator"
            aria-label="拖拽调整卡片高度（上边缘）"
            className="group absolute left-3 right-3 top-0 h-2 -translate-y-1/2 z-[105]"
            style={{ cursor: 'ns-resize', touchAction: 'none' }}
          >
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-[3px] rounded-full transition-all duration-200 ${
                verticalDragDir === 'top'
                  ? 'w-16 opacity-100 bg-moke-red shadow-[0_0_10px_rgba(208,0,0,0.8)]'
                  : 'w-10 opacity-0 group-hover:opacity-90 bg-moke-red/70'
              }`}
            />
          </div>

          {/* 下边缘拖拽手柄：往下拉 → 卡片变高 */}
          <div
            onMouseDown={onVerticalHandleMouseDown('bottom')}
            onTouchStart={onVerticalHandleTouchStart('bottom')}
            role="separator"
            aria-label="拖拽调整卡片高度（下边缘）"
            className="group absolute left-3 right-3 bottom-0 h-2 translate-y-1/2 z-[105]"
            style={{ cursor: 'ns-resize', touchAction: 'none' }}
          >
            <div
              className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 h-[3px] rounded-full transition-all duration-200 ${
                verticalDragDir === 'bottom'
                  ? 'w-16 opacity-100 bg-moke-red shadow-[0_0_10px_rgba(208,0,0,0.8)]'
                  : 'w-10 opacity-0 group-hover:opacity-90 bg-moke-red/70'
              }`}
            />
          </div>
        </div>

          {/* 左右边缘 + 左右下角 拖拽手柄（角手柄也会动宽度） */}
          {cmdEdgeResize.handles.left && (
            <ResizableHandle
              {...cmdEdgeResize.handles.left}
              active={cmdEdgeResize.resizing && cmdEdgeResize.direction === 'left'}
              isDark={isDark}
            />
          )}
          {cmdEdgeResize.handles.right && (
            <ResizableHandle
              {...cmdEdgeResize.handles.right}
              active={cmdEdgeResize.resizing && cmdEdgeResize.direction === 'right'}
              isDark={isDark}
            />
          )}
          {cmdEdgeResize.handles.sw && (
            <ResizableHandle
              {...cmdEdgeResize.handles.sw}
              active={cmdEdgeResize.resizing && cmdEdgeResize.direction === 'sw'}
              isDark={isDark}
            />
          )}
          {cmdEdgeResize.handles.se && (
            <ResizableHandle
              {...cmdEdgeResize.handles.se}
              active={cmdEdgeResize.resizing && cmdEdgeResize.direction === 'se'}
              isDark={isDark}
            />
          )}
        </div>
        {/* /CMD 卡片宽度缩放包裹层 */}

        {/* Director 场景描述框 — 可拖拽缩放浮层 */}
        <DirectorPromptBox
          prompt={prompt}
          setPrompt={setPrompt}
          onCapture={onCapture || (() => {})}
          isProcessing={isProcessing}
          disabled={mode === CameraMode.EARTH_TO_IMAGE}
          placeholder={t('PROMPT_PLACEHOLDER_TXT')}
        />
      </div>
    </div>
  );
};
