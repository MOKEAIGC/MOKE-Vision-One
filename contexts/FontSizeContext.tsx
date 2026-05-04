// 文件路径: contexts/FontSizeContext.tsx
// 全局字体大小 Context —— 以 HTML 根字号为锚点，配合 Tailwind 的 rem 体系实现全站等比缩放
// 范围：12 px ~ 22 px（默认 16 px，Tailwind 基准），步长 1 px
// 持久化：localStorage（key: moke.fontSize）
// 同步机制：修改 html.style.fontSize + 写 --app-font-scale CSS 变量，保证用 px 写死的组件也能兜底

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

const STORAGE_KEY = 'moke.fontSize';

/** 浏览器默认根字号（Tailwind 基准）*/
export const FONT_SIZE_DEFAULT = 16;
/** 最小字号 —— 再小会导致图标/按钮排版错乱 */
export const FONT_SIZE_MIN = 12;
/** 最大字号 —— 再大会打破紧凑布局（HeaderBar / SideRail / Dock） */
export const FONT_SIZE_MAX = 22;
/** 滑条步长 */
export const FONT_SIZE_STEP = 1;

interface FontSizeContextType {
  /** 当前根字号（px） */
  fontSize: number;
  /** 相对默认的缩放倍率（fontSize / 16） */
  scale: number;
  /** 直接设置字号（会被 clamp 到 [MIN, MAX]） */
  setFontSize: (size: number) => void;
  /** 增量调整 */
  increase: () => void;
  decrease: () => void;
  /** 重置为默认 */
  reset: () => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const clamp = (n: number) =>
  Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n)));

/** 读取初始值（同步）；SSR 兜底使用默认值 */
const readInitial = (): number => {
  if (typeof window === 'undefined') return FONT_SIZE_DEFAULT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FONT_SIZE_DEFAULT;
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return FONT_SIZE_DEFAULT;
    return clamp(n);
  } catch {
    return FONT_SIZE_DEFAULT;
  }
};

/**
 * 将字号应用到 DOM：
 * 1. html.style.fontSize —— Tailwind 的 text-* / p-* / m-* 基于 rem，自动等比
 * 2. CSS 变量 --app-font-scale —— 兜底，供组件按需使用
 */
const applyToDOM = (size: number) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.fontSize = `${size}px`;
  root.style.setProperty('--app-font-scale', `${size / FONT_SIZE_DEFAULT}`);
  root.style.setProperty('--app-font-size', `${size}px`);
};

export const FontSizeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<number>(readInitial);

  // 每次变化都同步到 DOM + 持久化
  useEffect(() => {
    applyToDOM(fontSize);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(fontSize));
    } catch {
      /* ignore quota */
    }
  }, [fontSize]);

  // 首次挂载也确保 DOM 是一致的（防止 index.html 内联脚本被禁用时首屏不对齐）
  useEffect(() => {
    applyToDOM(fontSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFontSize = useCallback((size: number) => {
    setFontSizeState(clamp(size));
  }, []);

  const increase = useCallback(() => {
    setFontSizeState((prev) => clamp(prev + FONT_SIZE_STEP));
  }, []);

  const decrease = useCallback(() => {
    setFontSizeState((prev) => clamp(prev - FONT_SIZE_STEP));
  }, []);

  const reset = useCallback(() => {
    setFontSizeState(FONT_SIZE_DEFAULT);
  }, []);

  const value: FontSizeContextType = {
    fontSize,
    scale: fontSize / FONT_SIZE_DEFAULT,
    setFontSize,
    increase,
    decrease,
    reset,
  };

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
};

export const useFontSize = (): FontSizeContextType => {
  const ctx = useContext(FontSizeContext);
  if (!ctx) {
    throw new Error('useFontSize must be used within a FontSizeProvider');
  }
  return ctx;
};
