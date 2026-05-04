export interface FilmPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  promptSnippet: string;
}

export const filmPresets: FilmPreset[] = [
  {
    id: 'kodak-portra-400',
    name: 'Kodak Portra 400',
    category: '彩色负片 (Color Negative)',
    description: '最受欢迎的人像胶片，肤色表现极佳，宽容度高，色彩温暖自然。',
    promptSnippet: 'shot on Kodak Portra 400, warm natural colors, excellent skin tones, fine grain'
  },
  {
    id: 'fuji-pro-400h',
    name: 'Fujifilm Pro 400H',
    category: '彩色负片 (Color Negative)',
    description: '日系小清新代表，偏青绿冷色调，高光柔和，适合风景与人像。',
    promptSnippet: 'shot on Fujifilm Pro 400H, pastel tones, slightly cyan/green shadows, soft highlights, airy feel'
  },
  {
    id: 'cinestill-800t',
    name: 'CineStill 800T',
    category: '电影卷 (Cinematic)',
    description: '夜景神器，基于电影胶片，高光处有标志性的红色光晕（Halation），偏冷色调。',
    promptSnippet: 'shot on CineStill 800T, cinematic lighting, red halation around highlights, cool tungsten tones, night photography'
  },
  {
    id: 'ilford-hp5',
    name: 'Ilford HP5 Plus 400',
    category: '黑白胶片 (Black & White)',
    description: '经典的黑白胶片，反差适中，颗粒感明显，适合纪实与街拍。',
    promptSnippet: 'shot on Ilford HP5 Plus 400, black and white photography, classic contrast, noticeable film grain, documentary style'
  },
  {
    id: 'kodak-gold-200',
    name: 'Kodak Gold 200',
    category: '彩色负片 (Color Negative)',
    description: '充满复古感和怀旧气息，色彩浓郁，偏黄暖色调，适合日常记录。',
    promptSnippet: 'shot on Kodak Gold 200, vintage feel, warm golden tones, rich colors, nostalgic atmosphere'
  },
  {
    id: 'fuji-velvia-50',
    name: 'Fujifilm Velvia 50',
    category: '彩色反转片 (Color Reversal)',
    description: '风光摄影传奇，色彩极其鲜艳饱和，反差大，对红绿色表现极佳。',
    promptSnippet: 'shot on Fujifilm Velvia 50, highly saturated colors, high contrast, vibrant reds and greens, landscape photography'
  }
];

export const cameraPresets = [
  'Leica M6',
  'Hasselblad 500C/M',
  'Contax T2',
  'Pentax 67',
  'Nikon F3',
  'Canon AE-1',
  'Mamiya RB67',
  'Polaroid SX-70'
];

export const lensPresets = [
  '35mm f/1.4 lens',
  '50mm f/1.2 lens',
  '85mm f/1.8 lens',
  '28mm f/2.8 lens',
  'Medium format 80mm lens',
  'Anamorphic lens',
  'Fisheye lens'
];

export const lightingPresets = [
  'Golden hour lighting',
  'Blue hour lighting',
  'Overcast soft light',
  'Harsh midday sunlight',
  'Cinematic studio lighting',
  'Neon city lights',
  'Flash photography, direct flash'
];

export const aestheticPresets = [
  { name: '重度颗粒 (Heavy Grain)', snippet: 'heavy analog film grain' },
  { name: '漏光效果 (Light Leaks)', snippet: 'vintage light leaks, edge fogging' },
  { name: '红色光晕 (Red Halation)', snippet: 'strong red halation effect' },
  { name: '柔焦/朦胧 (Soft Focus/Bloom)', snippet: 'soft focus, dreamlike bloom, pro-mist filter effect' },
  { name: '褪色/过期 (Expired/Faded)', snippet: 'expired film effect, faded colors, color shifts' },
  { name: '拍立得边框 (Polaroid Style)', snippet: 'polaroid aesthetic, instant film look' }
];
