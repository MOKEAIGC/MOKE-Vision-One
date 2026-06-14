// 文件路径: components/FontSizeControl.tsx
// 全局字体大小调节控件 —— 悬浮面板
// ┌──────────────────────────────────────┐
// │  A⁻   [ ━━━●━━━━ ]  A⁺   16 px   ↺  │
// └──────────────────────────────────────┘
// · 折叠态：右下角圆形按钮（Type 图标 + 当前字号）
// · 展开态：悬浮面板（减号 / 滑块 / 加号 / 当前值 / 重置）
// · 快捷键：⌘/Ctrl +  = 放大，⌘/Ctrl -  = 缩小，⌘/Ctrl 0 = 重置

import React, { useEffect, useRef, useState } from 'react';
import { Type as TypeIcon, Minus, Plus, RotateCcw, X } from 'lucide-react';
import {
  useFontSize,
  FONT_SIZE_DEFAULT,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  FONT_SIZE_STEP,
} from '../contexts/FontSizeContext';

interface FontSizeControlProps {
  /** 是否使用浅色主题 */
  isDark?: boolean;
  /** 自定义定位，默认 bottom-right */
  position?: 'bottom-right' | 'bottom-left' | 'top-right';
  /** 语言 CN / EN */
  lang?: 'cn' | 'en' | string;
}

const L = {
  cn: {
    title: '字体大小',
    decrease: '缩小',
    increase: '放大',
    reset: '重置',
    close: '收起',
    open: '调节字体大小',
    unit: 'px',
  },
  en: {
    title: 'Font Size',
    decrease: 'Decrease',
    increase: 'Increase',
    reset: 'Reset',
    close: 'Close',
    open: 'Adjust font size',
    unit: 'px',
  },
};

export const FontSizeControl: React.FC<FontSizeControlProps> = ({
  isDark = true,
  position = 'bottom-right',
  lang = 'cn',
}) => {
  const { fontSize, setFontSize, increase, decrease, reset } = useFontSize();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const t = L[lang === 'en' ? 'en' : 'cn'];

  // ⌘/Ctrl 快捷键
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      // 忽略在 input/textarea 内的 +/- 0 组合（避免干扰表单）
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;

      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        increase();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        decrease();
      } else if (e.key === '0') {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [increase, decrease, reset]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // 延时绑定，避免触发按钮自身的点击导致立即关闭
    const timer = window.setTimeout(() => document.addEventListener('mousedown', onClick), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const posClass =
    position === 'bottom-right'
      ? 'right-4 bottom-4'
      : position === 'bottom-left'
      ? 'left-4 bottom-4'
      : 'right-4 top-20';

  const surface = isDark
    ? 'bg-black/70 border-white/10 text-white'
    : 'bg-white/85 border-black/10 text-neutral-900';

  const btnBase =
    'electron-no-drag flex items-center justify-center rounded-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed';

  const btnColor = isDark
    ? 'hover:bg-white/10 text-white/80 hover:text-white'
    : 'hover:bg-black/5 text-neutral-700 hover:text-neutral-900';

  const pct = ((fontSize - FONT_SIZE_MIN) / (FONT_SIZE_MAX - FONT_SIZE_MIN)) * 100;

  return (
    <div
      className={`absolute ${posClass} z-[60] electron-no-drag select-none`}
      style={{
        // 控件本身用固定 px 显示，不跟随根字号放大，否则面板会越调越大
        fontSize: '14px',
      }}
    >
      {/* 折叠态：圆形触发按钮 */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.open}
          title={`${t.title} · ${fontSize}${t.unit}`}
          className={`group flex items-center gap-2 rounded-full border backdrop-blur-xl px-3 py-2 shadow-lg ${surface} hover:border-moke-red/60 transition-all electron-no-drag`}
        >
          <TypeIcon className="w-4 h-4 text-moke-red" strokeWidth={2.25} />
          <span className="font-mono text-xs tabular-nums opacity-80 group-hover:opacity-100">
            {fontSize}
          </span>
        </button>
      )}

      {/* 展开态：控制面板 */}
      {open && (
        <div
          ref={panelRef}
          className={`flex items-center gap-2 rounded-xl border backdrop-blur-xl px-3 py-2 shadow-2xl ${surface}`}
          style={{ minWidth: 320 }}
          role="dialog"
          aria-label={t.title}
        >
          {/* 标题 icon */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-white/10">
            <TypeIcon className="w-4 h-4 text-moke-red" strokeWidth={2.25} />
            <span className="text-xs tracking-wider uppercase opacity-70 hidden sm:inline">
              {t.title}
            </span>
          </div>

          {/* 减号 */}
          <button
            type="button"
            onClick={decrease}
            disabled={fontSize <= FONT_SIZE_MIN}
            aria-label={t.decrease}
            title={`${t.decrease} (⌘-)`}
            className={`${btnBase} ${btnColor} w-8 h-8`}
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* 滑块 */}
          <div className="relative flex-1 flex items-center h-8 px-1" style={{ minWidth: 140 }}>
            <div
              className={`absolute left-1 right-1 h-1 rounded-full ${
                isDark ? 'bg-white/15' : 'bg-black/10'
              }`}
            />
            <div
              className="absolute left-1 h-1 rounded-full bg-moke-red"
              style={{ width: `calc(${pct}% )` }}
            />
            <input
              type="range"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              step={FONT_SIZE_STEP}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              aria-label={t.title}
              className="relative w-full appearance-none bg-transparent cursor-pointer font-size-range"
              style={{ zIndex: 1 }}
            />
          </div>

          {/* 加号 */}
          <button
            type="button"
            onClick={increase}
            disabled={fontSize >= FONT_SIZE_MAX}
            aria-label={t.increase}
            title={`${t.increase} (⌘+)`}
            className={`${btnBase} ${btnColor} w-8 h-8`}
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* 当前值 */}
          <div
            className={`font-mono text-xs tabular-nums px-2 py-1 rounded-md ${
              isDark ? 'bg-white/5' : 'bg-black/5'
            } min-w-[3.5rem] text-center`}
            style={{ fontSize: '12px' }}
          >
            {fontSize}
            <span className="opacity-50 ml-0.5">{t.unit}</span>
          </div>

          {/* 重置 */}
          <button
            type="button"
            onClick={reset}
            disabled={fontSize === FONT_SIZE_DEFAULT}
            aria-label={t.reset}
            title={`${t.reset} (⌘0)`}
            className={`${btnBase} ${btnColor} w-8 h-8`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* 关闭 */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t.close}
            title={t.close}
            className={`${btnBase} ${btnColor} w-8 h-8 border-l border-white/10 ml-1 pl-3 rounded-none rounded-r-md`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 自定义 range 样式 —— 隐藏原生 track，只保留自定义 thumb */}
      <style>{`
        .font-size-range {
          height: 20px;
        }
        .font-size-range::-webkit-slider-runnable-track {
          height: 4px;
          background: transparent;
        }
        .font-size-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #D00000;
          border: 2px solid ${isDark ? '#1a1a1a' : '#ffffff'};
          box-shadow: 0 1px 4px rgba(208, 0, 0, 0.5);
          cursor: grab;
          margin-top: -5px;
          transition: transform 120ms ease;
        }
        .font-size-range:active::-webkit-slider-thumb {
          transform: scale(1.2);
          cursor: grabbing;
        }
        .font-size-range::-moz-range-track {
          height: 4px;
          background: transparent;
        }
        .font-size-range::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #D00000;
          border: 2px solid ${isDark ? '#1a1a1a' : '#ffffff'};
          box-shadow: 0 1px 4px rgba(208, 0, 0, 0.5);
          cursor: grab;
        }
        .font-size-range:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};
