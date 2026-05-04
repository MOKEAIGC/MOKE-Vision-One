// 文件路径: data/filmPresetTemplates.ts
// 胶片预设模板库 — 数据来源: /Users/moke/Desktop/skills-moke/skills/film-camera-prompts/SKILL.md
//
// 设计要点：
// 1. 独立文件，不污染 data/filmData.ts（内置胶片保持原貌）
// 2. 每条模板包含完整的 CustomFilmInput 字段（brand/name/iso/filmType/grain/description）
//    + 推荐 snippet（来自 SKILL.md 的原生英文提示词，作为 promptSnippet 覆盖）
// 3. 与内置 filmPresets.name 判重由使用方（AddFilmForm/批量导入）处理
// 4. 所有中文注释，便于后续维护

import type { CustomFilmInput } from '../services/customFilmStore';

/**
 * 预设模板条目 — 在 CustomFilmInput 基础上追加：
 * - recommendedSnippet: 来自 SKILL.md 的原生英文片段（可选，导入时覆盖默认拼接）
 * - category: 原 SKILL.md 分类标签（仅用于 UI 分组展示，存储时仍归到『我的自定义』）
 */
export interface FilmPresetTemplate extends CustomFilmInput {
  /** 人类可读的唯一 key（与 name 同值，便于去重） */
  templateId: string;
  /** 来自 SKILL.md 的分类（用于下拉分组） */
  sourceCategory: '彩色负片' | '反转片' | '电影胶片' | '黑白胶片' | '特殊/即时';
  /** 原生英文 prompt 片段（优先级高于自动拼接） */
  recommendedSnippet: string;
}

/**
 * SKILL.md 完整胶片词库结构化
 * 共 30 款（已扣除 SKILL 中与内置完全重名的项由使用方在导入时过滤）
 */
export const filmPresetTemplates: FilmPresetTemplate[] = [
  // ========== 彩色负片 ==========
  {
    templateId: 'Kodak Portra 400',
    brand: 'Kodak',
    name: 'Kodak Portra 400',
    iso: 400,
    filmType: '彩色负片',
    grain: 'fine',
    description: '柔和肤色、低饱和、奶油质感',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Kodak Portra 400, soft pastel tones, creamy skin tones, natural warm colors, fine film grain',
  },
  {
    templateId: 'Kodak Portra 160',
    brand: 'Kodak',
    name: 'Kodak Portra 160',
    iso: 160,
    filmType: '彩色负片',
    grain: 'ultra-fine',
    description: '精细颗粒、自然色彩、低对比',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Kodak Portra 160, ultra-fine grain, natural color rendition, low contrast, smooth tonal transitions',
  },
  {
    templateId: 'Kodak Portra 800',
    brand: 'Kodak',
    name: 'Kodak Portra 800',
    iso: 800,
    filmType: '彩色负片',
    grain: 'medium',
    description: '高感光、颗粒感、温暖偏色',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Kodak Portra 800, visible film grain, warm color cast, slightly desaturated, good for low light',
  },
  {
    templateId: 'Kodak Gold 200',
    brand: 'Kodak',
    name: 'Kodak Gold 200',
    iso: 200,
    filmType: '彩色负片',
    grain: 'fine',
    description: '暖色调、高饱和、怀旧感',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Kodak Gold 200, warm golden tones, saturated colors, nostalgic vintage feel, consumer film look',
  },
  {
    templateId: 'Kodak ColorPlus 200',
    brand: 'Kodak',
    name: 'Kodak ColorPlus 200',
    iso: 200,
    filmType: '彩色负片',
    grain: 'medium',
    description: '经济型、偏暖、日常感',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Kodak ColorPlus 200, warm tones, everyday casual look, moderate grain, slightly saturated',
  },
  {
    templateId: 'Kodak Ultramax 400',
    brand: 'Kodak',
    name: 'Kodak Ultramax 400',
    iso: 400,
    filmType: '彩色负片',
    grain: 'medium',
    description: '鲜艳色彩、蓝调偏冷',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Kodak Ultramax 400, vivid saturated colors, slightly cool blue tones, punchy contrast',
  },
  {
    templateId: 'Kodak Ektar 100',
    brand: 'Kodak',
    name: 'Kodak Ektar 100',
    iso: 100,
    filmType: '彩色负片',
    grain: 'ultra-fine',
    description: '超细颗粒、极高饱和、鲜艳',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Kodak Ektar 100, extremely fine grain, hyper-saturated vivid colors, deep reds and blues, high contrast',
  },
  {
    templateId: 'Fuji Superia 400',
    brand: 'Fujifilm',
    name: 'Fuji Superia 400',
    iso: 400,
    filmType: '彩色负片',
    grain: 'medium',
    description: '绿色偏移、冷调、清新',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Fuji Superia 400, cool green-blue tones, slightly muted, clean and fresh look, moderate grain',
  },
  {
    templateId: 'Fuji C200',
    brand: 'Fujifilm',
    name: 'Fuji C200',
    iso: 200,
    filmType: '彩色负片',
    grain: 'medium',
    description: '冷色调、日常消费级',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Fuji C200, cool tone color palette, slightly blue-green cast, casual consumer film aesthetic',
  },
  {
    templateId: 'Fuji Pro 400H',
    brand: 'Fujifilm',
    name: 'Fuji Pro 400H',
    iso: 400,
    filmType: '彩色负片',
    grain: 'fine',
    description: '柔和过曝、低饱和、婚礼感',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Fuji Pro 400H, soft pastel overexposed look, low saturation, delicate skin tones, ethereal dreamy quality',
  },
  {
    templateId: 'Fuji Pro 160NS',
    brand: 'Fujifilm',
    name: 'Fuji Pro 160NS',
    iso: 160,
    filmType: '彩色负片',
    grain: 'ultra-fine',
    description: '极细颗粒、自然肤色、专业人像片',
    sourceCategory: '彩色负片',
    recommendedSnippet: 'shot on Fuji Pro 160NS, extremely fine grain, natural skin reproduction, neutral color balance, professional portrait film',
  },

  // ========== 反转片 / 正片 ==========
  {
    templateId: 'Kodak Ektachrome E100',
    brand: 'Kodak',
    name: 'Kodak Ektachrome E100',
    iso: 100,
    filmType: '彩色反转片',
    grain: 'fine',
    description: '精细颗粒、冷蓝色调、高对比',
    sourceCategory: '反转片',
    recommendedSnippet: 'shot on Kodak Ektachrome E100, cool blue tones, fine grain, high contrast, vivid but natural colors, slide film transparency',
  },
  {
    templateId: 'Fuji Velvia 50',
    brand: 'Fujifilm',
    name: 'Fuji Velvia 50',
    iso: 50,
    filmType: '彩色反转片',
    grain: 'ultra-fine',
    description: '极高饱和、浓郁色彩、风光王',
    sourceCategory: '反转片',
    recommendedSnippet: 'shot on Fuji Velvia 50, ultra-saturated colors, deep rich greens and reds, high contrast, extremely fine grain, landscape film',
  },
  {
    templateId: 'Fuji Velvia 100',
    brand: 'Fujifilm',
    name: 'Fuji Velvia 100',
    iso: 100,
    filmType: '彩色反转片',
    grain: 'fine',
    description: '高饱和但比 50 柔和',
    sourceCategory: '反转片',
    recommendedSnippet: 'shot on Fuji Velvia 100, saturated vibrant colors, slightly softer than Velvia 50, rich tones, fine grain',
  },
  {
    templateId: 'Fuji Provia 100F',
    brand: 'Fujifilm',
    name: 'Fuji Provia 100F',
    iso: 100,
    filmType: '彩色反转片',
    grain: 'fine',
    description: '自然色彩、中性、万用型',
    sourceCategory: '反转片',
    recommendedSnippet: 'shot on Fuji Provia 100F, natural accurate colors, neutral tone, fine grain, versatile slide film',
  },

  // ========== 电影胶片 ==========
  {
    templateId: 'Cinestill 800T',
    brand: 'Cinestill',
    name: 'Cinestill 800T',
    iso: 800,
    filmType: '彩色负片',
    grain: 'medium',
    description: '霓虹光晕、红移、电影质感',
    sourceCategory: '电影胶片',
    recommendedSnippet: 'shot on Cinestill 800T, halation around highlights, warm red-orange glow on lights, cinematic tungsten-balanced, neon light halos, urban night atmosphere',
  },
  {
    templateId: 'Cinestill 50D',
    brand: 'Cinestill',
    name: 'Cinestill 50D',
    iso: 50,
    filmType: '彩色负片',
    grain: 'ultra-fine',
    description: '日光型电影卷、细腻',
    sourceCategory: '电影胶片',
    recommendedSnippet: 'shot on Cinestill 50D, daylight-balanced cinema film, fine grain, natural colors, soft cinematic quality',
  },
  {
    templateId: 'Kodak Vision3 500T',
    brand: 'Kodak',
    name: 'Kodak Vision3 500T',
    iso: 500,
    filmType: '彩色负片',
    grain: 'fine',
    description: '电影工业级、钨丝灯平衡',
    sourceCategory: '电影胶片',
    recommendedSnippet: 'shot on Kodak Vision3 500T, cinema film stock, tungsten balanced, rich shadow detail, cinematic color science',
  },
  {
    templateId: 'Kodak Vision3 250D',
    brand: 'Kodak',
    name: 'Kodak Vision3 250D',
    iso: 250,
    filmType: '彩色负片',
    grain: 'fine',
    description: '电影日光卷',
    sourceCategory: '电影胶片',
    recommendedSnippet: 'shot on Kodak Vision3 250D, cinema daylight film, natural color rendition, fine grain, motion picture quality',
  },

  // ========== 黑白胶片 ==========
  {
    templateId: 'Kodak Tri-X 400',
    brand: 'Kodak',
    name: 'Kodak Tri-X 400',
    iso: 400,
    filmType: '黑白',
    grain: 'medium',
    description: '经典黑白、高对比、明显颗粒',
    sourceCategory: '黑白胶片',
    recommendedSnippet: 'shot on Kodak Tri-X 400, classic black and white, high contrast, visible grain, rich blacks, timeless photojournalistic look',
  },
  {
    templateId: 'Ilford HP5 Plus 400',
    brand: 'Ilford',
    name: 'Ilford HP5 Plus 400',
    iso: 400,
    filmType: '黑白',
    grain: 'medium',
    description: '宽容度高、中等对比',
    sourceCategory: '黑白胶片',
    recommendedSnippet: 'shot on Ilford HP5 Plus 400, black and white, wide exposure latitude, medium contrast, versatile grain structure',
  },
  {
    templateId: 'Ilford Delta 3200',
    brand: 'Ilford',
    name: 'Ilford Delta 3200',
    iso: 3200,
    filmType: '黑白',
    grain: 'coarse',
    description: '极高感光、粗颗粒、暗光',
    sourceCategory: '黑白胶片',
    recommendedSnippet: 'shot on Ilford Delta 3200, black and white, pronounced grain, high ISO low light capability, gritty dramatic look',
  },
  {
    templateId: 'Kodak T-Max 400',
    brand: 'Kodak',
    name: 'Kodak T-Max 400',
    iso: 400,
    filmType: '黑白',
    grain: 'fine',
    description: '细颗粒黑白、现代感',
    sourceCategory: '黑白胶片',
    recommendedSnippet: 'shot on Kodak T-Max 400, black and white, fine grain for its speed, modern tonal range, smooth gradations',
  },
  {
    templateId: 'Ilford FP4 Plus 125',
    brand: 'Ilford',
    name: 'Ilford FP4 Plus 125',
    iso: 125,
    filmType: '黑白',
    grain: 'ultra-fine',
    description: '极细颗粒、经典黑白',
    sourceCategory: '黑白胶片',
    recommendedSnippet: 'shot on Ilford FP4 Plus 125, black and white, extremely fine grain, classic tonal range, beautiful highlight detail',
  },
  {
    templateId: 'Ilford Pan F Plus 50',
    brand: 'Ilford',
    name: 'Ilford Pan F Plus 50',
    iso: 50,
    filmType: '黑白',
    grain: 'ultra-fine',
    description: '超细颗粒、极高解析',
    sourceCategory: '黑白胶片',
    recommendedSnippet: 'shot on Ilford Pan F Plus 50, black and white, ultra-fine grain, extraordinary sharpness, rich tonal gradation',
  },

  // ========== 特殊 / 即时成像 ==========
  {
    templateId: 'Lomography Color 400',
    brand: 'Lomography',
    name: 'Lomography Color 400',
    iso: 400,
    filmType: '彩色负片',
    grain: 'coarse',
    description: '交叉冲洗、偏色、实验感',
    sourceCategory: '特殊/即时',
    recommendedSnippet: 'shot on Lomography Color 400, cross-processed colors, color shifts, experimental lo-fi aesthetic, unpredictable tones',
  },
  {
    templateId: 'Kodak Aerochrome',
    brand: 'Kodak',
    name: 'Kodak Aerochrome',
    iso: 400,
    filmType: '彩色反转片',
    grain: 'medium',
    description: '红外彩色、植物变粉红',
    sourceCategory: '特殊/即时',
    recommendedSnippet: 'shot on Kodak Aerochrome infrared film, false color, pink-magenta foliage, surreal dreamlike landscape, infrared photography',
  },
  {
    templateId: 'Polaroid 600',
    brand: 'Polaroid',
    name: 'Polaroid 600',
    iso: 640,
    filmType: '彩色负片',
    grain: 'medium',
    description: '即时成像、方形画幅、褪色感',
    sourceCategory: '特殊/即时',
    recommendedSnippet: 'shot on Polaroid 600 instant film, square format, slightly faded colors, soft vintage look, white border frame',
  },
  {
    templateId: 'Fujifilm Instax',
    brand: 'Fujifilm',
    name: 'Fujifilm Instax',
    iso: 800,
    filmType: '彩色负片',
    grain: 'medium',
    description: '即时成像、鲜艳、小画幅',
    sourceCategory: '特殊/即时',
    recommendedSnippet: 'shot on Fujifilm Instax, instant film, bright cheerful colors, small format, casual snapshot aesthetic',
  },
];

/** 按 SKILL.md 原分类分组（用于下拉 optgroup 渲染） */
export function groupTemplatesByCategory(): Record<string, FilmPresetTemplate[]> {
  return filmPresetTemplates.reduce<Record<string, FilmPresetTemplate[]>>((acc, tpl) => {
    const key = tpl.sourceCategory;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tpl);
    return acc;
  }, {});
}
