// 文件路径: components/film/AddFilmForm.tsx
// 折叠式"添加胶片"表单 — 独立组件，通过 FilmSystem 传入 builtinNames/customNames 做重名校验
//
// 设计约束（符合项目规则）：
// - 一功能一文件：全部逻辑在本文件
// - 全中文：标签/占位/错误提示/按钮文案
// - 防御性：提交前实时校验 + 捕获 store 抛错 + 数量达上限禁用
// - 自包含样式：深色 moke-red 风格，与 FilmSystem 弹窗一致
//
// 外部接口：
//   - onCancel()     折叠关闭
//   - onAdded(film)  成功添加后回调，父组件可用于自动选中新胶片
//   - builtinNames   内置胶片 name 列表（用于重名校验）
//   - customNames    已存在自定义胶片 name 列表（用于重名校验）

import React, { useMemo, useState } from 'react';
import { X, Check, AlertCircle, Plus, BookOpen, Download } from 'lucide-react';
import {
  addCustomFilm,
  bulkImportCustomFilms,
  CUSTOM_FILM_MAX,
  GRAIN_LABELS,
  type CustomFilm,
  type CustomFilmInput,
  type FilmGrain,
  type FilmType,
} from '../../services/customFilmStore';
import {
  FILM_GRAIN_OPTIONS,
  FILM_TYPE_OPTIONS,
  ISO_MAX,
  ISO_MIN,
  isFormRoughlyFilled,
  validateCustomFilm,
  type ValidationErrors,
} from '../../services/filmValidator';
import {
  filmPresetTemplates,
  groupTemplatesByCategory,
  type FilmPresetTemplate,
} from '../../data/filmPresetTemplates';

interface AddFilmFormProps {
  /** 取消 / 关闭折叠面板 */
  onCancel: () => void;
  /** 新胶片添加成功后回调 */
  onAdded: (film: CustomFilm) => void;
  /** 内置 filmPresets.name 列表（用于重名校验） */
  builtinNames: readonly string[];
  /** 已存在自定义胶片 name 列表（用于重名校验） */
  customNames: readonly string[];
  /** 当前已有自定义胶片数量（用于上限禁用） */
  currentCount: number;
}

/** 初始空表单 */
const initialForm: Partial<CustomFilmInput> = {
  brand: '',
  name: '',
  iso: undefined,
  filmType: undefined,
  grain: undefined,
};

/** 常见品牌候选（datalist 提示） */
const BRAND_SUGGESTIONS = [
  'Kodak', 'Fujifilm', 'Ilford', 'CineStill',
  'Lomography', 'ADOX', 'Foma', 'Rollei',
  'Agfa Photo', 'Harman', 'Ferrania', 'Polaroid',
];

export const AddFilmForm: React.FC<AddFilmFormProps> = ({
  onCancel,
  onAdded,
  builtinNames,
  customNames,
  currentCount,
}) => {
  const [form, setForm] = useState<Partial<CustomFilmInput>>(initialForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);
  /** 当前选中的预设模板 templateId（受控下拉值） */
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  /** 批量导入后反馈信息（自动 3s 消失） */
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);
  /** 保存「填充模板」时的原生 snippet，提交时覆盖默认拼接 */
  const [pendingSnippet, setPendingSnippet] = useState<string | null>(null);

  // 是否已达上限
  const reachedLimit = currentCount >= CUSTOM_FILM_MAX;

  /** 模板按分类分组（useMemo 缓存，避免每次渲染重算） */
  const grouped = useMemo(() => groupTemplatesByCategory(), []);

  /**
   * 哪些模板已经在系统里（内置 或 已添加到自定义）— 用于下拉禁用 & 批量导入提示
   * 判重：name 大小写 + 空白不敏感
   */
  const existingNameSet = useMemo(() => {
    const set = new Set<string>();
    builtinNames.forEach((n) => set.add(n.trim().toLowerCase()));
    customNames.forEach((n) => set.add(n.trim().toLowerCase()));
    return set;
  }, [builtinNames, customNames]);

  const isTemplateExisting = (tpl: FilmPresetTemplate) =>
    existingNameSet.has(tpl.name.trim().toLowerCase());

  /** 尚未导入的模板数量（用于按钮文案与禁用态） */
  const notImportedCount = useMemo(
    () => filmPresetTemplates.filter((t) => !isTemplateExisting(t)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [existingNameSet],
  );

  // 实时校验：仅对已 touched 的字段显示错误，避免刚打开就满屏红字
  const validation = useMemo(
    () => validateCustomFilm(form, builtinNames, customNames),
    [form, builtinNames, customNames],
  );

  /** 只展示用户交互过的字段错误，提升体验 */
  const visibleErrors: ValidationErrors = useMemo(() => {
    const out: ValidationErrors = {};
    (Object.keys(validation.errors) as Array<keyof ValidationErrors>).forEach((k) => {
      if (touched[k]) out[k] = validation.errors[k];
    });
    return out;
  }, [validation.errors, touched]);

  /** 统一的字段 setter + 标记 touched */
  const setField = <K extends keyof CustomFilmInput>(key: K, val: CustomFilmInput[K] | undefined) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setTouched((prev) => ({ ...prev, [key]: true }));
    setSubmitError(null);
  };

  /** 提交：全量校验 → 写入 store → 回调 */
  const handleSubmit = () => {
    // 强制展示全部错误
    setTouched({ brand: true, name: true, iso: true, filmType: true, grain: true });
    const full = validateCustomFilm(form, builtinNames, customNames);
    if (!full.ok) return;
    if (reachedLimit) {
      setSubmitError(`已达上限 ${CUSTOM_FILM_MAX} 条，请先删除再添加。`);
      return;
    }
    try {
      // 若此次填充来自预设模板，把模板原生 snippet 传给 store 以覆盖默认拼接
      const saved = addCustomFilm({
        ...(form as CustomFilmInput),
        overrideSnippet: pendingSnippet || undefined,
      });
      setSuccessFlash(true);
      // 1.2s 后重置 + 回调父组件选中
      setTimeout(() => {
        setSuccessFlash(false);
        setForm(initialForm);
        setTouched({});
        setSelectedTemplateId('');
        setPendingSnippet(null);
        onAdded(saved);
      }, 800);
    } catch (err: any) {
      setSubmitError(err?.message || '保存失败，请稍后重试');
    }
  };

  /**
   * 预设模板下拉变化 → 自动填充 5 字段
   * 若名称已被占用，仅做提示不填充
   */
  const handlePickTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setPendingSnippet(null);
      return;
    }
    const tpl = filmPresetTemplates.find((t) => t.templateId === templateId);
    if (!tpl) return;
    if (isTemplateExisting(tpl)) {
      setSubmitError(`「${tpl.name}」已存在于系统中，无需重复添加。`);
      setPendingSnippet(null);
      return;
    }
    setSubmitError(null);
    setForm({
      brand: tpl.brand,
      name: tpl.name,
      iso: tpl.iso,
      filmType: tpl.filmType,
      grain: tpl.grain,
      description: tpl.description,
    });
    setTouched({ brand: true, name: true, iso: true, filmType: true, grain: true });
    setPendingSnippet(tpl.recommendedSnippet);
  };

  /**
   * 一键批量导入全部未导入的模板（自动跳过重复 & 超上限）
   * 成功后刷新父组件（通过 onAdded 传入最后一条新增）
   */
  const handleBulkImport = () => {
    if (notImportedCount === 0) {
      setBulkMsg('所有预设模板均已存在，无需导入。');
      setTimeout(() => setBulkMsg(null), 3000);
      return;
    }
    // 准备带 overrideSnippet 的输入
    const inputs = filmPresetTemplates
      .filter((t) => !isTemplateExisting(t))
      .map((t) => ({
        brand: t.brand,
        name: t.name,
        iso: t.iso,
        filmType: t.filmType,
        grain: t.grain,
        description: t.description,
        overrideSnippet: t.recommendedSnippet,
      }));

    try {
      const result = bulkImportCustomFilms(inputs, builtinNames);
      const parts: string[] = [];
      if (result.added > 0) parts.push(`新增 ${result.added} 条`);
      if (result.skippedDuplicate > 0) parts.push(`跳过重复 ${result.skippedDuplicate} 条`);
      if (result.skippedByLimit > 0) parts.push(`超上限跳过 ${result.skippedByLimit} 条`);
      setBulkMsg(parts.length > 0 ? parts.join('，') : '未添加任何胶片');
      setTimeout(() => setBulkMsg(null), 4000);

      // 若有新增，自动选中最后一条并通知父组件刷新
      if (result.addedFilms.length > 0) {
        onAdded(result.addedFilms[result.addedFilms.length - 1]);
      }
    } catch (err: any) {
      setSubmitError(err?.message || '批量导入失败，请稍后重试');
    }
  };

  /** 提交按钮是否可点击 */
  const canSubmit = !reachedLimit && isFormRoughlyFilled(form) && validation.ok;

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-black/80 border border-moke-red/40 rounded-lg p-5 mb-4 shadow-[0_0_20px_rgba(208,0,0,0.08)] animate-in fade-in slide-in-from-top-2 duration-200">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-moke-red" />
          <h4 className="text-sm font-bold text-white tracking-wider">添加自定义胶片</h4>
          <span className="text-[10px] font-mono text-gray-500 ml-2">
            {currentCount} / {CUSTOM_FILM_MAX}
          </span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          aria-label="关闭表单"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* === 预设模板导入区 === */}
      <div className="mb-4 p-3 rounded border border-moke-red/30 bg-black/40">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-3.5 h-3.5 text-moke-red" />
          <h5 className="text-[11px] font-bold text-moke-red uppercase tracking-wider">
            从预设模板导入
          </h5>
          <span className="text-[10px] font-mono text-gray-500">
            共 {filmPresetTemplates.length} 款 · 可导入 {notImportedCount} 款
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* 单条选择下拉 */}
          <select
            value={selectedTemplateId}
            onChange={(e) => handlePickTemplate(e.target.value)}
            className="flex-1 bg-black border border-gray-800 rounded p-2 text-xs outline-none focus:border-moke-red transition-colors"
          >
            <option value="">— 选择模板自动填充表单 —</option>
            {(Object.keys(grouped) as Array<keyof typeof grouped>).map((cat) => (
              <optgroup key={String(cat)} label={String(cat)}>
                {grouped[cat].map((tpl) => {
                  const taken = isTemplateExisting(tpl);
                  return (
                    <option
                      key={tpl.templateId}
                      value={tpl.templateId}
                      disabled={taken}
                    >
                      {tpl.name}（ISO {tpl.iso}）{taken ? ' — 已存在' : ''}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>

          {/* 一键批量导入全部（跳过重复） */}
          <button
            type="button"
            onClick={handleBulkImport}
            disabled={reachedLimit || notImportedCount === 0}
            title={
              reachedLimit
                ? '已达自定义胶片数量上限'
                : notImportedCount === 0
                ? '所有模板均已存在'
                : `一键批量导入 ${notImportedCount} 款（自动跳过重复）`
            }
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded border transition-all ${
              reachedLimit || notImportedCount === 0
                ? 'border-gray-800 bg-gray-900 text-gray-600 cursor-not-allowed'
                : 'border-moke-red/60 bg-moke-red/10 text-moke-red hover:bg-moke-red hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            一键导入
          </button>
        </div>

        {/* 批量导入反馈 */}
        {bulkMsg && (
          <div className="mt-2 p-1.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center gap-1.5">
            <Check className="w-3 h-3" />
            {bulkMsg}
          </div>
        )}
      </div>

      {/* 字段网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 品牌 */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">品牌 *</label>
          <input
            type="text"
            list="moke-brand-suggestions"
            value={form.brand ?? ''}
            onChange={(e) => setField('brand', e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, brand: true }))}
            placeholder="例如：Kodak / Fujifilm / Ilford"
            className={`w-full bg-black border rounded p-2 text-sm outline-none transition-colors ${
              visibleErrors.brand
                ? 'border-red-500 focus:border-red-400'
                : 'border-gray-800 focus:border-moke-red'
            }`}
          />
          <datalist id="moke-brand-suggestions">
            {BRAND_SUGGESTIONS.map((b) => <option key={b} value={b} />)}
          </datalist>
          {visibleErrors.brand && <ErrorLine msg={visibleErrors.brand} />}
        </div>

        {/* 型号 */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">型号 *</label>
          <input
            type="text"
            value={form.name ?? ''}
            onChange={(e) => setField('name', e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, name: true }))}
            placeholder="例如：Portra 400 / HP5 Plus"
            className={`w-full bg-black border rounded p-2 text-sm outline-none transition-colors ${
              visibleErrors.name
                ? 'border-red-500 focus:border-red-400'
                : 'border-gray-800 focus:border-moke-red'
            }`}
          />
          {visibleErrors.name && <ErrorLine msg={visibleErrors.name} />}
        </div>

        {/* ISO */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            ISO 感光度 * <span className="text-gray-600 font-normal normal-case">（{ISO_MIN} ~ {ISO_MAX}）</span>
          </label>
          <input
            type="number"
            min={ISO_MIN}
            max={ISO_MAX}
            step={1}
            value={form.iso ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setField('iso', v === '' ? undefined : Number(v));
            }}
            onBlur={() => setTouched((p) => ({ ...p, iso: true }))}
            placeholder="例如：400"
            className={`w-full bg-black border rounded p-2 text-sm outline-none transition-colors ${
              visibleErrors.iso
                ? 'border-red-500 focus:border-red-400'
                : 'border-gray-800 focus:border-moke-red'
            }`}
          />
          {visibleErrors.iso && <ErrorLine msg={visibleErrors.iso} />}
        </div>

        {/* 类型 */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">胶片类型 *</label>
          <select
            value={form.filmType ?? ''}
            onChange={(e) => setField('filmType', (e.target.value || undefined) as FilmType | undefined)}
            onBlur={() => setTouched((p) => ({ ...p, filmType: true }))}
            className={`w-full bg-black border rounded p-2 text-sm outline-none transition-colors ${
              visibleErrors.filmType
                ? 'border-red-500 focus:border-red-400'
                : 'border-gray-800 focus:border-moke-red'
            }`}
          >
            <option value="">— 请选择 —</option>
            {FILM_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {visibleErrors.filmType && <ErrorLine msg={visibleErrors.filmType} />}
        </div>

        {/* 颗粒度 — 跨两列 */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">颗粒度 *</label>
          <div className="grid grid-cols-4 gap-2">
            {FILM_GRAIN_OPTIONS.map((g) => (
              <button
                type="button"
                key={g}
                onClick={() => setField('grain', g as FilmGrain)}
                className={`px-2 py-2 text-xs font-medium rounded border transition-all ${
                  form.grain === g
                    ? 'bg-moke-red text-white border-moke-red shadow-[0_0_10px_rgba(208,0,0,0.4)]'
                    : 'bg-black border-gray-800 text-gray-400 hover:border-moke-red/60 hover:text-white'
                }`}
              >
                {GRAIN_LABELS[g]}
              </button>
            ))}
          </div>
          {visibleErrors.grain && <ErrorLine msg={visibleErrors.grain} />}
        </div>
      </div>

      {/* 上限提示 */}
      {reachedLimit && (
        <div className="mt-4 p-2 rounded bg-amber-500/10 border border-amber-500/40 text-[11px] text-amber-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          已达自定义胶片数量上限 {CUSTOM_FILM_MAX} 条，请先在列表中删除部分后再添加。
        </div>
      )}

      {/* 提交错误 */}
      {submitError && !reachedLimit && (
        <div className="mt-4 p-2 rounded bg-red-500/10 border border-red-500/40 text-[11px] text-red-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          {submitError}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-bold rounded border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || successFlash}
          className={`px-5 py-2 text-xs font-bold rounded flex items-center gap-1.5 transition-all ${
            successFlash
              ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.55)]'
              : canSubmit
              ? 'bg-moke-red hover:bg-red-600 text-white'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          {successFlash ? (
            <>
              <Check className="w-3.5 h-3.5" />
              已添加
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              确认添加
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/** 字段下方红色错误行（统一样式） */
const ErrorLine: React.FC<{ msg: string }> = ({ msg }) => (
  <p className="text-[11px] text-red-400 flex items-center gap-1 mt-0.5">
    <AlertCircle className="w-3 h-3 shrink-0" />
    <span>{msg}</span>
  </p>
);
