// 文件路径: services/atmosphereRecommender.ts
// 环境参数推荐引擎 — 纯函数、无副作用、可独立单测
//
// 输入：任一 FilmPreset / CustomFilm
// 输出：{ atmospheric, aerial, humidity }  三个 0-100 整数
//
// 三层优先级（从高到低）：
// ① 关键词命中表 —— 主流胶片（Portra / Velvia / CineStill / HP5 / Ektar / Tri-X 等）手工标注
// ② 字段规则公式 —— 基于 ISO / filmType / grain / 描述关键词推导
// ③ 兜底默认值 [50, 50, 50]
//
// 三个维度的语义约定（与 prompt 片段一致）：
// - atmospheric  大气透视：远景压缩/色彩衰减强度（反转片、低 ISO、细颗粒 → 偏低；胶片柔雾、高 ISO → 偏高）
// - aerial       空气透视：画面纵深蓝移/明度衰减（风光胶片、日光型偏高；人像胶片偏低）
// - humidity     空气雾气/湿度：环境湿润感、光晕、朦胧柔焦（CineStill/钨丝灯/柔焦胶片偏高）

import type { FilmPreset } from '../data/filmData';
import type { CustomFilm, FilmType, FilmGrain } from './customFilmStore';

/** 推荐结果三元组 */
export interface AtmosphereRecommendation {
  atmospheric: number; // 0-100
  aerial: number;      // 0-100
  humidity: number;    // 0-100
}

/** 兜底默认值，当所有规则都不命中时使用 */
export const DEFAULT_ATMOSPHERE: AtmosphereRecommendation = {
  atmospheric: 50,
  aerial: 50,
  humidity: 50,
};

/**
 * 关键词 → 推荐值映射表（第一优先级）
 * key 在胶片 id 或 name 中大小写不敏感匹配任意子串即命中
 * 顺序有意义：更具体的关键词放前面，先命中先返回
 */
const KEYWORD_TABLE: ReadonlyArray<{
  keywords: readonly string[];
  rec: AtmosphereRecommendation;
  reason: string;
}> = [
  // ===== CineStill 系列 — 标志性红色光晕与湿润感 =====
  { keywords: ['cinestill 800t', 'cinestill-800t', '800t'],
    rec: { atmospheric: 70, aerial: 55, humidity: 85 }, reason: 'CineStill 800T 钨丝灯红光晕 + 雾化' },
  { keywords: ['cinestill 50d', 'cinestill-50d', '50d'],
    rec: { atmospheric: 55, aerial: 70, humidity: 60 }, reason: 'CineStill 50D 日光细腻远景' },
  { keywords: ['cinestill'], rec: { atmospheric: 65, aerial: 60, humidity: 75 }, reason: 'CineStill 通用电影感湿润' },

  // ===== Kodak Portra 人像线 — 柔和低对比 =====
  { keywords: ['portra 160', 'portra-160'], rec: { atmospheric: 35, aerial: 40, humidity: 30 }, reason: 'Portra 160 清透自然' },
  { keywords: ['portra 400', 'portra-400'], rec: { atmospheric: 40, aerial: 45, humidity: 40 }, reason: 'Portra 400 经典人像奶油' },
  { keywords: ['portra 800', 'portra-800'], rec: { atmospheric: 55, aerial: 50, humidity: 55 }, reason: 'Portra 800 暗光暖雾' },
  { keywords: ['portra'], rec: { atmospheric: 40, aerial: 45, humidity: 40 }, reason: 'Portra 系列兜底' },

  // ===== Kodak Ektar/Gold/Ultramax — 高饱和风光线 =====
  { keywords: ['ektar 100', 'ektar-100', 'ektar'], rec: { atmospheric: 25, aerial: 75, humidity: 20 }, reason: 'Ektar 100 超细颗粒 + 高饱和远景清晰' },
  { keywords: ['gold 200', 'gold-200', 'gold'], rec: { atmospheric: 45, aerial: 50, humidity: 45 }, reason: 'Gold 200 暖调日常怀旧' },
  { keywords: ['ultramax 400', 'ultramax'], rec: { atmospheric: 40, aerial: 55, humidity: 35 }, reason: 'Ultramax 400 鲜艳通透' },
  { keywords: ['colorplus'], rec: { atmospheric: 45, aerial: 45, humidity: 50 }, reason: 'ColorPlus 日常温柔' },
  { keywords: ['pro image'], rec: { atmospheric: 40, aerial: 50, humidity: 40 }, reason: 'Pro Image 100 专业入门' },

  // ===== Kodak 电影胶片 Vision 系列 =====
  { keywords: ['vision3 500t', '5219', '7219'], rec: { atmospheric: 70, aerial: 55, humidity: 75 }, reason: 'Vision3 500T 钨丝灯电影夜景' },
  { keywords: ['vision3 250d', '5207', '7207'], rec: { atmospheric: 50, aerial: 65, humidity: 45 }, reason: 'Vision3 250D 日光电影日景' },
  { keywords: ['vision3 200t', '5213'], rec: { atmospheric: 60, aerial: 55, humidity: 60 }, reason: 'Vision3 200T 室内电影' },
  { keywords: ['vision3 50d', '5203'], rec: { atmospheric: 30, aerial: 75, humidity: 25 }, reason: 'Vision3 50D 超细远景清晰' },
  { keywords: ['vision'], rec: { atmospheric: 55, aerial: 60, humidity: 55 }, reason: 'Vision 电影胶片兜底' },

  // ===== Kodak Ektachrome / 反转片 =====
  { keywords: ['ektachrome', 'e100'], rec: { atmospheric: 30, aerial: 70, humidity: 25 }, reason: 'Ektachrome 反转片高通透' },
  { keywords: ['kodachrome'], rec: { atmospheric: 35, aerial: 65, humidity: 30 }, reason: 'Kodachrome 传奇饱和' },

  // ===== Kodak 黑白线 =====
  { keywords: ['tri-x', 'trix', 'tri x'], rec: { atmospheric: 60, aerial: 40, humidity: 45 }, reason: 'Tri-X 400 高反差纪实' },
  { keywords: ['t-max 100', 'tmax 100', 't-max-100'], rec: { atmospheric: 25, aerial: 50, humidity: 20 }, reason: 'T-MAX 100 超细颗粒' },
  { keywords: ['t-max 400', 'tmax 400'], rec: { atmospheric: 45, aerial: 45, humidity: 35 }, reason: 'T-MAX 400 现代黑白' },
  { keywords: ['t-max p3200', 'p3200', 'tmz'], rec: { atmospheric: 75, aerial: 35, humidity: 55 }, reason: 'P3200 极高速粗颗粒' },
  { keywords: ['double-x', '5222', '7222', 'bwxx'], rec: { atmospheric: 55, aerial: 45, humidity: 50 }, reason: 'Double-X 经典黑白电影' },

  // ===== Fujifilm =====
  { keywords: ['velvia 50'], rec: { atmospheric: 20, aerial: 85, humidity: 15 }, reason: 'Velvia 50 风光之王极致通透' },
  { keywords: ['velvia 100', 'velvia'], rec: { atmospheric: 25, aerial: 80, humidity: 20 }, reason: 'Velvia 100 饱和风光' },
  { keywords: ['provia'], rec: { atmospheric: 35, aerial: 65, humidity: 30 }, reason: 'Provia 100F 标准反转' },
  { keywords: ['astia'], rec: { atmospheric: 40, aerial: 55, humidity: 40 }, reason: 'Astia 柔和肤色反转' },
  { keywords: ['pro 400h', 'pro-400h'], rec: { atmospheric: 50, aerial: 50, humidity: 55 }, reason: 'Pro 400H 仙气柔雾' },
  { keywords: ['superia'], rec: { atmospheric: 45, aerial: 55, humidity: 40 }, reason: 'Superia 冷调日系' },
  { keywords: ['fujicolor'], rec: { atmospheric: 45, aerial: 55, humidity: 40 }, reason: 'Fujicolor 通用' },
  { keywords: ['natura 1600'], rec: { atmospheric: 65, aerial: 45, humidity: 65 }, reason: 'Natura 1600 自然光夜景' },
  { keywords: ['neopan', 'acros'], rec: { atmospheric: 30, aerial: 55, humidity: 25 }, reason: 'Acros II 超细黑白' },
  { keywords: ['eterna'], rec: { atmospheric: 55, aerial: 60, humidity: 55 }, reason: 'Fuji Eterna 电影线' },

  // ===== Ilford =====
  { keywords: ['pan f'], rec: { atmospheric: 25, aerial: 55, humidity: 20 }, reason: 'Pan F Plus 超细慢速' },
  { keywords: ['fp4'], rec: { atmospheric: 40, aerial: 50, humidity: 35 }, reason: 'FP4 Plus 中速经典' },
  { keywords: ['hp5'], rec: { atmospheric: 55, aerial: 45, humidity: 45 }, reason: 'HP5 Plus 高速通用' },
  { keywords: ['delta 100'], rec: { atmospheric: 30, aerial: 55, humidity: 25 }, reason: 'Delta 100 核壳细颗粒' },
  { keywords: ['delta 400'], rec: { atmospheric: 45, aerial: 50, humidity: 35 }, reason: 'Delta 400 核壳高速' },
  { keywords: ['delta 3200'], rec: { atmospheric: 75, aerial: 35, humidity: 55 }, reason: 'Delta 3200 推片王' },
  { keywords: ['sfx', 'infrared'], rec: { atmospheric: 60, aerial: 70, humidity: 40 }, reason: '红外近红外效果' },
  { keywords: ['xp2'], rec: { atmospheric: 45, aerial: 50, humidity: 45 }, reason: 'XP2 C-41 黑白' },
  { keywords: ['ortho'], rec: { atmospheric: 40, aerial: 55, humidity: 35 }, reason: '正色性黑白' },

  // ===== Lomography =====
  { keywords: ['lomochrome purple'], rec: { atmospheric: 60, aerial: 60, humidity: 55 }, reason: 'LomoChrome Purple 创意紫' },
  { keywords: ['lomochrome turquoise'], rec: { atmospheric: 55, aerial: 65, humidity: 50 }, reason: 'LomoChrome Turquoise 青绿' },
  { keywords: ['metropolis'], rec: { atmospheric: 60, aerial: 50, humidity: 50 }, reason: 'Metropolis 低饱和都市' },
  { keywords: ['berlin kino'], rec: { atmospheric: 65, aerial: 40, humidity: 45 }, reason: 'Berlin Kino 高反差电影黑白' },
  { keywords: ['babylon kino', 'fantôme', 'fantome'], rec: { atmospheric: 30, aerial: 50, humidity: 25 }, reason: '超低感极细颗粒' },

  // ===== ADOX / Foma / Rollei / 其他 =====
  { keywords: ['cms 20'], rec: { atmospheric: 15, aerial: 60, humidity: 15 }, reason: 'CMS 20 II 世界最高分辨率' },
  { keywords: ['silvermax'], rec: { atmospheric: 30, aerial: 50, humidity: 25 }, reason: 'ADOX Silvermax 高银含量' },
  { keywords: ['fomapan'], rec: { atmospheric: 50, aerial: 45, humidity: 45 }, reason: 'Fomapan 经典黑白' },
  { keywords: ['rollei retro', 'rpx'], rec: { atmospheric: 45, aerial: 55, humidity: 35 }, reason: 'Rollei 高分辨率黑白' },
  { keywords: ['ferrania p30'], rec: { atmospheric: 50, aerial: 50, humidity: 40 }, reason: 'Ferrania P30 意大利黑白' },
  { keywords: ['phoenix'], rec: { atmospheric: 65, aerial: 55, humidity: 70 }, reason: 'Harman Phoenix 实验高颗粒漏光' },
  { keywords: ['washi'], rec: { atmospheric: 70, aerial: 50, humidity: 60 }, reason: '和纸片基特种质感' },
  { keywords: ['polaroid', 'instax'], rec: { atmospheric: 55, aerial: 45, humidity: 60 }, reason: '即时胶片柔雾感' },
];

/** 大小写不敏感的子串匹配 */
function hitKeyword(haystack: string, keywords: readonly string[]): boolean {
  const low = haystack.toLowerCase();
  return keywords.some((k) => low.includes(k.toLowerCase()));
}

/**
 * 第二层规则：基于 ISO / 类型 / 颗粒 / 描述 的公式推导
 * 当关键词未命中时兜底使用
 */
function ruleBasedRecommend(
  iso: number | undefined,
  filmType: FilmType | undefined,
  grain: FilmGrain | undefined,
  description: string,
): AtmosphereRecommendation {
  // --- atmospheric（大气透视）：ISO 越高、颗粒越粗 → 值越大 ---
  let atmospheric = 50;
  if (typeof iso === 'number' && iso > 0) {
    if (iso <= 50) atmospheric = 25;
    else if (iso <= 100) atmospheric = 35;
    else if (iso <= 200) atmospheric = 40;
    else if (iso <= 400) atmospheric = 50;
    else if (iso <= 800) atmospheric = 60;
    else if (iso <= 1600) atmospheric = 70;
    else atmospheric = 80;
  }
  if (grain === 'ultra-fine') atmospheric -= 10;
  else if (grain === 'fine') atmospheric -= 5;
  else if (grain === 'coarse') atmospheric += 10;

  // --- aerial（空气透视）：反转片/日光型 → 偏高；黑白/钨丝 → 偏低 ---
  let aerial = 50;
  if (filmType === '彩色反转片') aerial += 20;
  else if (filmType === '黑白') aerial -= 5;
  if (grain === 'ultra-fine') aerial += 10;
  else if (grain === 'coarse') aerial -= 10;
  // 描述关键词微调
  const descLow = description.toLowerCase();
  if (/日光|daylight|风光|landscape/.test(descLow)) aerial += 8;
  if (/钨丝|tungsten|室内|indoor/.test(descLow)) aerial -= 8;

  // --- humidity（雾气湿度）：高 ISO + 电影感 + 钨丝 → 偏高；反转片超细 → 偏低 ---
  let humidity = 45;
  if (typeof iso === 'number' && iso > 0) {
    if (iso >= 800) humidity += 15;
    else if (iso >= 400) humidity += 5;
    else if (iso <= 50) humidity -= 15;
    else if (iso <= 100) humidity -= 10;
  }
  if (filmType === '彩色反转片') humidity -= 10;
  if (grain === 'coarse') humidity += 10;
  if (/钨丝|tungsten|halation|光晕|电影|cinema/.test(descLow)) humidity += 15;
  if (/风光|landscape|scenic/.test(descLow)) humidity -= 10;

  return {
    atmospheric: clamp(atmospheric),
    aerial: clamp(aerial),
    humidity: clamp(humidity),
  };
}

/** 把任意数值限制到 [0, 100] 整数 */
function clamp(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * 核心入口：根据胶片推荐三个环境参数值
 *
 * @param film  内置 FilmPreset 或 CustomFilm，可为 null（用户未选中）
 * @returns 三元组；film 为空时返回默认值
 */
export function recommendAtmosphere(
  film: FilmPreset | CustomFilm | null | undefined,
): AtmosphereRecommendation {
  if (!film) return { ...DEFAULT_ATMOSPHERE };

  // 层 ① 关键词命中（内置胶片主路径）
  const haystack = `${film.id} ${film.name} ${film.promptSnippet}`;
  for (const entry of KEYWORD_TABLE) {
    if (hitKeyword(haystack, entry.keywords)) {
      return { ...entry.rec };
    }
  }

  // 层 ② 字段规则（自定义胶片主路径 + 未命中关键词的内置胶片兜底）
  const custom = film as Partial<CustomFilm>;
  const iso = typeof custom.iso === 'number' ? custom.iso : extractIsoFromText(haystack);
  const filmType = custom.filmType;
  const grain = custom.grain;

  return ruleBasedRecommend(iso, filmType, grain, film.description ?? '');
}

/** 从 id/name/promptSnippet 文本里尝试提取数字 ISO（内置胶片无 iso 字段时） */
function extractIsoFromText(text: string): number | undefined {
  // 优先匹配 "ISO 400" / "ISO400" 形式
  const m1 = /ISO\s*(\d{1,5})/i.exec(text);
  if (m1) return parseInt(m1[1], 10);
  // 其次匹配 Portra 400 / Gold 200 这种末尾数字
  const m2 = /\b(\d{2,5})\b/.exec(text);
  if (m2) {
    const n = parseInt(m2[1], 10);
    if (n >= 8 && n <= 12800) return n;
  }
  return undefined;
}

/**
 * 辅助：把启用的三滑块值格式化为 prompt 英文片段
 * 未启用或值为 0 的维度会被忽略
 */
export function formatAtmospherePromptFragment(
  values: {
    atmospheric: { enabled: boolean; value: number };
    aerial: { enabled: boolean; value: number };
    humidity: { enabled: boolean; value: number };
  },
): string {
  const parts: string[] = [];
  if (values.atmospheric.enabled)
    parts.push(`atmospheric perspective ${clamp(values.atmospheric.value)}%`);
  if (values.aerial.enabled)
    parts.push(`aerial haze ${clamp(values.aerial.value)}%`);
  if (values.humidity.enabled)
    parts.push(`atmospheric humidity ${clamp(values.humidity.value)}%`);
  return parts.join(', ');
}
