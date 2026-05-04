// 文件路径: services/customFilmStore.ts
// 自定义胶片的本地持久化层 — 独立模块，完全不污染 data/filmData.ts
//
// 设计要点：
// 1. CustomFilm 继承 FilmPreset，额外携带 brand/iso/filmType/grain 等元数据
// 2. 所有 localStorage 读写全 try-catch，失败自动降级到内存 Map，保证 UI 不崩
// 3. makeCustomFilm 工厂根据字段自动拼接 promptSnippet（对齐内置胶片英文风格）
// 4. 对外只暴露纯函数：load / save / add / remove / exists / list
//
// 与内置 filmPresets 兼容：CustomFilm 强制 category = '我的自定义'，
// 让 FilmSystem 分组渲染时自然归到独立组里，保留统一的网格样式。

import type { FilmPreset } from '../data/filmData';

// ========== 常量 ==========
/** localStorage 中存储自定义胶片数组的 key，升级时只需改版本号 */
export const CUSTOM_FILM_STORAGE_KEY = 'moke_custom_films_v1';

/** 自定义胶片数量上限，防止 localStorage 爆满 */
export const CUSTOM_FILM_MAX = 100;

/** 统一的分类名称 — 渲染时作为独立分组标题 */
export const CUSTOM_FILM_CATEGORY = '我的自定义';

// ========== 类型定义 ==========
/** 胶片类型枚举（中文显式表达，避免歧义） */
export type FilmType = '彩色负片' | '黑白' | '彩色反转片';

/** 颗粒度枚举（对齐摄影行话） */
export type FilmGrain = 'ultra-fine' | 'fine' | 'medium' | 'coarse';

/** 颗粒度中文标签（仅用于 UI 展示） */
export const GRAIN_LABELS: Record<FilmGrain, string> = {
  'ultra-fine': '超细颗粒',
  'fine': '细颗粒',
  'medium': '中等颗粒',
  'coarse': '粗颗粒',
};

/** 颗粒度英文描述（拼到 promptSnippet 用） */
export const GRAIN_PROMPT_FRAGMENTS: Record<FilmGrain, string> = {
  'ultra-fine': 'ultra-fine grain',
  'fine': 'fine grain',
  'medium': 'moderate grain',
  'coarse': 'coarse visible grain',
};

/** 胶片类型 → 英文片段（拼到 promptSnippet 用） */
export const FILM_TYPE_PROMPT_FRAGMENTS: Record<FilmType, string> = {
  '彩色负片': 'color negative film',
  '黑白': 'black and white film',
  '彩色反转片': 'color reversal slide film',
};

/**
 * 自定义胶片完整形态 — 与内置 FilmPreset 结构兼容
 * isCustom 作为判别字段，方便 UI 区分
 */
export interface CustomFilm extends FilmPreset {
  isCustom: true;
  brand: string;
  iso: number;
  filmType: FilmType;
  grain: FilmGrain;
  createdAt: number;
}

/** 新建表单的输入 shape（未 id 化） */
export interface CustomFilmInput {
  brand: string;
  name: string;
  iso: number;
  filmType: FilmType;
  grain: FilmGrain;
  description?: string;
}

// ========== 内存降级缓存 ==========
/** 当 localStorage 不可用时（隐私模式/配额满），落在这里，至少保证当前会话能用 */
let memoryFallback: CustomFilm[] | null = null;

// ========== 内部工具 ==========
/** 安全获取 localStorage，SSR/禁用场景返回 null */
function safeGetStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 生成唯一 id：custom-{timestamp}-{rand}，避免与内置胶片 id 冲突 */
function genId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `custom-${Date.now()}-${rand}`;
}

/** 根据字段拼出英文 promptSnippet，风格对齐内置胶片 */
function buildPromptSnippet(input: CustomFilmInput): string {
  const typeFrag = FILM_TYPE_PROMPT_FRAGMENTS[input.filmType];
  const grainFrag = GRAIN_PROMPT_FRAGMENTS[input.grain];
  // 示例：shot on Kodak MyStock 400, ISO 400, color negative film, fine grain
  return `shot on ${input.brand} ${input.name}, ISO ${input.iso}, ${typeFrag}, ${grainFrag}`;
}

// ========== 工厂 ==========
/** 将表单输入工厂化为完整 CustomFilm（自动生成 id/promptSnippet/category） */
export function makeCustomFilm(input: CustomFilmInput): CustomFilm {
  const description =
    input.description?.trim() ||
    `${input.brand} ${input.name} · ISO ${input.iso} · ${input.filmType}`;

  return {
    id: genId(),
    name: input.name.trim(),
    brand: input.brand.trim(),
    iso: input.iso,
    filmType: input.filmType,
    grain: input.grain,
    category: CUSTOM_FILM_CATEGORY,
    description,
    promptSnippet: buildPromptSnippet({
      ...input,
      brand: input.brand.trim(),
      name: input.name.trim(),
    }),
    isCustom: true,
    createdAt: Date.now(),
  };
}

// ========== 持久化 API ==========
/**
 * 读取所有自定义胶片
 * 解析失败自动重置 key，返回空数组，保证 UI 不崩
 */
export function loadCustomFilms(): CustomFilm[] {
  const store = safeGetStorage();
  if (!store) return memoryFallback ?? [];

  try {
    const raw = store.getItem(CUSTOM_FILM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[customFilmStore] 数据格式异常，已重置');
      store.removeItem(CUSTOM_FILM_STORAGE_KEY);
      return [];
    }
    // 基本字段校验，过滤掉脏数据
    return parsed.filter(
      (x: any) =>
        x &&
        typeof x === 'object' &&
        typeof x.id === 'string' &&
        typeof x.name === 'string' &&
        x.isCustom === true,
    ) as CustomFilm[];
  } catch (err) {
    console.warn('[customFilmStore] 读取失败，走内存降级:', err);
    return memoryFallback ?? [];
  }
}

/**
 * 覆盖写入整个列表
 * 捕获 QuotaExceededError，落入内存降级
 * @returns true = 写入磁盘成功；false = 仅写入内存
 */
export function saveCustomFilms(list: CustomFilm[]): boolean {
  const store = safeGetStorage();
  memoryFallback = [...list]; // 先更新内存副本

  if (!store) return false;

  try {
    store.setItem(CUSTOM_FILM_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.warn('[customFilmStore] 写入失败（可能配额超限），走内存降级:', err);
    return false;
  }
}

/**
 * 追加一条新胶片
 * @param input  基础输入，可选携带 overrideSnippet 覆盖默认拼接
 * @returns 新建的 CustomFilm
 * @throws 超过上限时抛错
 */
export function addCustomFilm(input: CustomFilmInputWithSnippet): CustomFilm {
  const existing = loadCustomFilms();
  if (existing.length >= CUSTOM_FILM_MAX) {
    throw new Error(`自定义胶片数量已达上限（${CUSTOM_FILM_MAX} 条），请先删除部分后再添加。`);
  }
  const film = makeCustomFilm(input);
  // 可选 snippet 覆盖（用于预设模板导入时保留原生英文片段）
  if (input.overrideSnippet && input.overrideSnippet.trim()) {
    film.promptSnippet = input.overrideSnippet.trim();
  }
  const next = [...existing, film];
  saveCustomFilms(next);
  return film;
}

/** 按 id 删除一条，找不到时静默返回 false */
export function removeCustomFilm(id: string): boolean {
  const existing = loadCustomFilms();
  const next = existing.filter((f) => f.id !== id);
  if (next.length === existing.length) return false;
  saveCustomFilms(next);
  return true;
}

/**
 * 按型号名称判重（大小写不敏感，空白忽略）
 * 同时检查内置 filmPresets 与已有自定义
 */
export function isNameTaken(
  name: string,
  builtinNames: readonly string[],
  customNames: readonly string[],
): boolean {
  const needle = name.trim().toLowerCase();
  if (!needle) return false;
  return (
    builtinNames.some((n) => n.trim().toLowerCase() === needle) ||
    customNames.some((n) => n.trim().toLowerCase() === needle)
  );
}

// ========== 批量导入 API ==========
/**
 * 批量导入结果 — 用于 UI 反馈
 */
export interface BulkImportResult {
  /** 实际新增到 customFilms 的条数 */
  added: number;
  /** 因与内置胶片/已有自定义重名而跳过的条数 */
  skippedDuplicate: number;
  /** 因达到上限（CUSTOM_FILM_MAX）而跳过的条数 */
  skippedByLimit: number;
  /** 新增胶片列表（供 UI 自动选中第一条等场景使用） */
  addedFilms: CustomFilm[];
}

/**
 * 支持自定义 snippet 覆盖的输入类型（批量导入预设模板时使用）
 * 若提供 overrideSnippet，将直接写入 promptSnippet，不走 buildPromptSnippet 拼接
 */
export interface CustomFilmInputWithSnippet extends CustomFilmInput {
  /** 原生推荐 snippet，优先级高于自动拼接 */
  overrideSnippet?: string;
}

/**
 * 批量导入多条胶片（典型场景：从 filmPresetTemplates 一键导入）
 *
 * 规则：
 * 1. 按 name 与内置 filmPresets + 已有 customFilms 判重（大小写不敏感），重复全部跳过
 * 2. 超过 CUSTOM_FILM_MAX 上限的剩余条目统一跳过并计数
 * 3. 写入失败（localStorage 不可用）会走内存降级，仍返回实际已加条数
 *
 * @param inputs  待导入的胶片输入列表（可携带 overrideSnippet）
 * @param builtinNames  当前内置 filmPresets 的 name 列表（由调用方传入，避免循环依赖）
 * @returns BulkImportResult
 */
export function bulkImportCustomFilms(
  inputs: readonly CustomFilmInputWithSnippet[],
  builtinNames: readonly string[],
): BulkImportResult {
  const existing = loadCustomFilms();
  const existingNames = existing.map((f) => f.name);
  const result: BulkImportResult = {
    added: 0,
    skippedDuplicate: 0,
    skippedByLimit: 0,
    addedFilms: [],
  };
  const next: CustomFilm[] = [...existing];

  for (const input of inputs) {
    // 1) 重名跳过（含已累积的本次新增）
    const takenNames = [...existingNames, ...result.addedFilms.map((f) => f.name)];
    if (isNameTaken(input.name, builtinNames, takenNames)) {
      result.skippedDuplicate += 1;
      continue;
    }
    // 2) 容量上限跳过
    if (next.length >= CUSTOM_FILM_MAX) {
      result.skippedByLimit += 1;
      continue;
    }
    // 3) 工厂化 + 可选 snippet 覆盖
    const film = makeCustomFilm(input);
    if (input.overrideSnippet && input.overrideSnippet.trim()) {
      film.promptSnippet = input.overrideSnippet.trim();
    }
    next.push(film);
    result.addedFilms.push(film);
    result.added += 1;
  }

  if (result.added > 0) {
    saveCustomFilms(next);
  }
  return result;
}
