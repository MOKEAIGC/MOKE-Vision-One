// 文件路径: services/filmValidator.ts
// 自定义胶片数据校验器 — 独立纯函数，无任何副作用
//
// 职责：
// 1. 对 AddFilmForm 的 5 字段（品牌 / 型号 / ISO / 类型 / 颗粒度）做实时与提交前全量校验
// 2. 型号名称全局去重（与内置 filmPresets 和已有自定义共同判重，大小写不敏感）
// 3. 错误消息全中文，字段 key 与表单受控字段一一对应，便于组件直接渲染
//
// 与 customFilmStore 的关系：本模块只做校验，不触碰 localStorage；
// 表单组件在调用 addCustomFilm 之前先用本校验器拦截非法输入。

import {
  isNameTaken,
  type CustomFilmInput,
  type FilmType,
  type FilmGrain,
} from './customFilmStore';

// ========== 约束常量 ==========
/** 品牌字段最小长度 */
export const BRAND_MIN = 2;
/** 品牌字段最大长度（防止恶意输入） */
export const BRAND_MAX = 40;
/** 型号字段最小长度 */
export const NAME_MIN = 2;
/** 型号字段最大长度 */
export const NAME_MAX = 60;
/** ISO 下限（部分实验胶片低至 8） */
export const ISO_MIN = 1;
/** ISO 上限（T-MAX P3200 推片极限） */
export const ISO_MAX = 12800;

/** 合法的胶片类型候选（与 customFilmStore 保持同步） */
export const FILM_TYPE_OPTIONS: readonly FilmType[] = ['彩色负片', '黑白', '彩色反转片'];

/** 合法的颗粒度候选（与 customFilmStore 保持同步） */
export const FILM_GRAIN_OPTIONS: readonly FilmGrain[] = [
  'ultra-fine',
  'fine',
  'medium',
  'coarse',
];

// ========== 校验结果 ==========
/**
 * 错误字段映射：key 与表单受控字段 1:1 对齐
 * 组件可直接用 errors.brand / errors.name 等在字段下方显示
 */
export interface ValidationErrors {
  brand?: string;
  name?: string;
  iso?: string;
  filmType?: string;
  grain?: string;
}

/** 校验结果总容器 */
export interface ValidationResult {
  ok: boolean;
  errors: ValidationErrors;
}

// ========== 校验主函数 ==========
/**
 * 对一条自定义胶片输入执行完整校验
 * @param input           表单字段（品牌/型号/ISO/类型/颗粒度）
 * @param builtinNames    内置 filmPresets 的 name 列表（用于去重）
 * @param customNames     已存在自定义胶片的 name 列表（用于去重，需排除正在编辑的那条）
 * @returns { ok, errors } ok=true 表示全部字段合法
 */
export function validateCustomFilm(
  input: Partial<CustomFilmInput>,
  builtinNames: readonly string[],
  customNames: readonly string[],
): ValidationResult {
  const errors: ValidationErrors = {};

  // 1. 品牌：非空 + 长度
  const brand = (input.brand ?? '').trim();
  if (!brand) {
    errors.brand = '请填写品牌名称';
  } else if (brand.length < BRAND_MIN) {
    errors.brand = `品牌至少 ${BRAND_MIN} 个字符`;
  } else if (brand.length > BRAND_MAX) {
    errors.brand = `品牌不能超过 ${BRAND_MAX} 个字符`;
  }

  // 2. 型号：非空 + 长度 + 全局唯一
  const name = (input.name ?? '').trim();
  if (!name) {
    errors.name = '请填写胶片型号';
  } else if (name.length < NAME_MIN) {
    errors.name = `型号至少 ${NAME_MIN} 个字符`;
  } else if (name.length > NAME_MAX) {
    errors.name = `型号不能超过 ${NAME_MAX} 个字符`;
  } else if (isNameTaken(name, builtinNames, customNames)) {
    errors.name = `已存在同名胶片「${name}」，请换一个名称`;
  }

  // 3. ISO：必须是 [ISO_MIN, ISO_MAX] 内的有限整数
  const iso = input.iso;
  if (iso === undefined || iso === null || Number.isNaN(iso as number)) {
    errors.iso = '请填写 ISO 感光度';
  } else if (!Number.isFinite(iso as number)) {
    errors.iso = 'ISO 必须是有效数字';
  } else if (!Number.isInteger(iso as number)) {
    errors.iso = 'ISO 必须是整数';
  } else if ((iso as number) < ISO_MIN || (iso as number) > ISO_MAX) {
    errors.iso = `ISO 应在 ${ISO_MIN} ~ ${ISO_MAX} 之间`;
  }

  // 4. 胶片类型：必须在枚举内
  if (!input.filmType || !FILM_TYPE_OPTIONS.includes(input.filmType)) {
    errors.filmType = '请选择胶片类型';
  }

  // 5. 颗粒度：必须在枚举内
  if (!input.grain || !FILM_GRAIN_OPTIONS.includes(input.grain)) {
    errors.grain = '请选择颗粒度';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * 轻量预检：只判断是否"基本可提交"（非空即可），供按钮 disabled 状态使用
 * 与 validateCustomFilm 的差别：不做重名/范围细节校验，减少每次按键都跑完整规则
 */
export function isFormRoughlyFilled(input: Partial<CustomFilmInput>): boolean {
  return !!(
    input.brand?.trim() &&
    input.name?.trim() &&
    input.iso !== undefined &&
    input.iso !== null &&
    input.filmType &&
    input.grain
  );
}
