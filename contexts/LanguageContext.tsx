import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'EN' | 'CN';

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // Header
  'APP_NAME': { EN: 'QUANTUMLENS X1', CN: '量子镜头 X1' },
  'BATTERY': { EN: 'BAT 98%', CN: '电量 98%' },
  'MEMORY': { EN: 'MEM 128TB', CN: '存储 128TB' },
  'NETWORK': { EN: 'NET 5G-Q', CN: '网络 5G-Q' },
  
  // Settings
  'LENS_MOUNT': { EN: 'LENS MOUNT', CN: '镜头系统' },
  'STD': { EN: 'STANDARD (STD)', CN: '标准镜头 (STD)' },
  'MACRO': { EN: 'MACRO', CN: '微距镜头 (MACRO)' },
  'PROBE': { EN: 'PROBE', CN: '探针镜头 (PROBE)' },
  'STORY': { EN: 'STORYBOARD', CN: '分镜脚本 (STORY)' },
  
  'ASPECT': { EN: 'ASPECT RATIO', CN: '画幅比例' },
  'RES': { EN: 'RESOLUTION', CN: '分辨率' },
  
  'FOCAL_LEN': { EN: 'FOCAL LENGTH', CN: '焦距' },
  'APERTURE': { EN: 'APERTURE', CN: '光圈' },
  'ISO': { EN: 'ISO', CN: '感光度 ISO' },
  'SHUTTER': { EN: 'SHUTTER SPEED', CN: '快门速度' },
  'FOCUS': { EN: 'FOCUS DIST', CN: '对焦距离' },
  
  'STATUS_NORMAL': { EN: 'QUANTUM CHIP: NORMAL', CN: '量子芯片状态: 正常' },
  'CURRENT_LENS': { EN: 'CURRENT LENS:', CN: '当前镜头:' },
  'LENS_DESC_STD': { EN: 'Metalens', CN: '平面超构透镜' },
  'LENS_DESC_MACRO': { EN: 'Compound Eye Macro', CN: '复眼微距系统' },
  'LENS_DESC_PROBE': { EN: 'Deep Depth Probe', CN: '深景深探针' },
  'LENS_DESC_STORY': { EN: 'Cinematic Sequencer', CN: '电影级分镜序列生成器' },

  // Viewfinder
  'NO_SIGNAL': { EN: 'NO SIGNAL / WAITING FOR PHOTONS', CN: '无信号 / 等待光子撞击' },
  'PROCESSING': { EN: 'QUANTUM DENOISING...', CN: '量子计算降噪中...' },
  'RAY_TRACING': { EN: 'RAY-TRACING ENABLED', CN: '光线追踪已启用' },
  'PROMPT_PLACEHOLDER_TXT': { EN: 'Enter scene description...', CN: '输入画面描述...' },
  'PROMPT_PLACEHOLDER_IMG': { EN: 'Enter modification (optional)...', CN: '输入修改指令 (可选)...' },
  'BTN_LOAD_LENS': { EN: 'LOAD LENS/REF', CN: '加载超构透镜/参考图' },
  'BTN_CHANGE_REF': { EN: 'CHANGE REF', CN: '更换参考图' },
  
  // HUD
  'HUD_CHIP': { EN: 'AI QUANTUM CHIP', CN: 'AI 量子芯片' },
  'HUD_LENS': { EN: 'METALENS', CN: '超构透镜' },
  'HUD_NIGHT': { EN: 'NIGHT VISION', CN: '夜视模式' },

  // Controls
  'BTN_SHUTTER': { EN: 'SHUTTER', CN: '快门' },
  'MODE_TXT': { EN: 'TXT-RAW', CN: '文字-原片' },
  'MODE_IMG': { EN: 'IMG-REF', CN: '参考-重绘' },
  'MODE_EARTH': { EN: 'SAT-LINK', CN: '卫星-链路' },
  'GALLERY_TITLE': { EN: 'MEMORY', CN: '相册' },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('CN'); // Default to Chinese

  const toggleLang = () => {
    setLang(prev => prev === 'EN' ? 'CN' : 'EN');
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};