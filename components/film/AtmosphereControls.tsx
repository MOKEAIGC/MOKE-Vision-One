// 文件路径: components/film/AtmosphereControls.tsx
// 环境参数三滑块受控组件 —— 独立文件
//
// 功能：
//   - 渲染三对 [复选框 + 滑块 + 数值 + 单项重置]：大气透视 / 空气透视 / 空气雾气湿度
//   - 全部是受控组件：values 由父组件持有，通过 onChange 上抛变更
//   - "使用胶片推荐" 一键把 values 覆盖为 recommended
//   - "全部重置"      一键把启用状态全部关闭（未启用项不会拼入 prompt）
//
// 与 FilmSystem.tsx 的关系：
//   - FilmSystem 持有 AtmosphereState + recommended（recommendAtmosphere 结果）
//   - 本组件只负责交互与展示，getPromptSnippet 在 FilmSystem 内部拼接

import React from 'react';
import { Wind, Mountain, Droplets, RotateCcw, Sparkles } from 'lucide-react';
import type { AtmosphereRecommendation } from '../../services/atmosphereRecommender';

/** 单个维度的受控状态 */
export interface AtmosphereDimensionState {
  enabled: boolean;
  value: number; // 0-100
}

/** 三个维度组合 */
export interface AtmosphereState {
  atmospheric: AtmosphereDimensionState;
  aerial: AtmosphereDimensionState;
  humidity: AtmosphereDimensionState;
}

/** 默认值构造器 — 供父组件初始化 */
export function makeInitialAtmosphereState(): AtmosphereState {
  return {
    atmospheric: { enabled: false, value: 50 },
    aerial: { enabled: false, value: 50 },
    humidity: { enabled: false, value: 50 },
  };
}

type DimKey = keyof AtmosphereState;

interface AtmosphereControlsProps {
  /** 当前受控值 */
  values: AtmosphereState;
  /** 推荐值（由 recommendAtmosphere 计算得出，可为 null 表示未选胶片） */
  recommended: AtmosphereRecommendation | null;
  /** 单维度变更 */
  onChange: (next: AtmosphereState) => void;
}

/** 三个维度的文案与图标映射 */
const DIM_META: Record<DimKey, { label: string; hint: string; Icon: React.ComponentType<{ className?: string }> }> = {
  atmospheric: {
    label: '大气透视',
    hint: '远景的色彩衰减与柔化程度',
    Icon: Mountain,
  },
  aerial: {
    label: '空气透视',
    hint: '纵深处的蓝移与明度衰减',
    Icon: Wind,
  },
  humidity: {
    label: '空气雾气 / 湿度',
    hint: '画面湿润感、光晕与朦胧柔焦',
    Icon: Droplets,
  },
};

export const AtmosphereControls: React.FC<AtmosphereControlsProps> = ({
  values,
  recommended,
  onChange,
}) => {
  /** 启用 / 禁用单个维度 */
  const toggleEnabled = (key: DimKey) => {
    onChange({
      ...values,
      [key]: { ...values[key], enabled: !values[key].enabled },
    });
  };

  /** 单个维度数值变更 */
  const setValue = (key: DimKey, value: number) => {
    onChange({
      ...values,
      [key]: { enabled: true, value: clamp(value) }, // 拖动滑块自动视为启用
    });
  };

  /** 单维度重置为推荐值（无推荐则回到 50） */
  const resetDim = (key: DimKey) => {
    const fallback = recommended ? recommended[key] : 50;
    onChange({
      ...values,
      [key]: { enabled: values[key].enabled, value: fallback },
    });
  };

  /** 一键使用胶片推荐 */
  const useRecommended = () => {
    if (!recommended) return;
    onChange({
      atmospheric: { enabled: true, value: recommended.atmospheric },
      aerial: { enabled: true, value: recommended.aerial },
      humidity: { enabled: true, value: recommended.humidity },
    });
  };

  /** 全部重置（关闭所有启用状态） */
  const resetAll = () => {
    onChange({
      atmospheric: { enabled: false, value: recommended?.atmospheric ?? 50 },
      aerial: { enabled: false, value: recommended?.aerial ?? 50 },
      humidity: { enabled: false, value: recommended?.humidity ?? 50 },
    });
  };

  const anyEnabled = values.atmospheric.enabled || values.aerial.enabled || values.humidity.enabled;

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5 space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <h3 className="text-lg font-semibold text-moke-red">3. 环境参数 (Atmosphere)</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={useRecommended}
            disabled={!recommended}
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 transition-colors ${
              recommended
                ? 'bg-moke-red/20 hover:bg-moke-red/40 text-moke-red'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
            title="根据当前胶片推荐值一键套用"
          >
            <Sparkles className="w-3 h-3" />
            使用推荐
          </button>
          <button
            type="button"
            onClick={resetAll}
            disabled={!anyEnabled}
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded flex items-center gap-1 transition-colors ${
              anyEnabled
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
            title="全部禁用（不写入提示词）"
          >
            <RotateCcw className="w-3 h-3" />
            全部重置
          </button>
        </div>
      </div>

      {/* 三个维度 */}
      {(Object.keys(DIM_META) as DimKey[]).map((key) => {
        const meta = DIM_META[key];
        const state = values[key];
        const rec = recommended ? recommended[key] : undefined;
        return (
          <DimensionRow
            key={key}
            icon={<meta.Icon className="w-4 h-4" />}
            label={meta.label}
            hint={meta.hint}
            state={state}
            recommended={rec}
            onToggle={() => toggleEnabled(key)}
            onValueChange={(v) => setValue(key, v)}
            onReset={() => resetDim(key)}
          />
        );
      })}

      {/* 提示 */}
      <p className="text-[10px] text-gray-500 italic leading-relaxed">
        提示：只有"已启用"的维度才会拼入提示词；未启用时不会影响生成结果。
        选中胶片时会自动推荐初始值，你可随时手动覆盖。
      </p>
    </div>
  );
};

// ========== 子组件：单行 ==========
interface RowProps {
  icon: React.ReactNode;
  label: string;
  hint: string;
  state: AtmosphereDimensionState;
  recommended?: number;
  onToggle: () => void;
  onValueChange: (v: number) => void;
  onReset: () => void;
}

const DimensionRow: React.FC<RowProps> = ({
  icon, label, hint, state, recommended, onToggle, onValueChange, onReset,
}) => {
  const enabled = state.enabled;
  return (
    <div className={`rounded-md border transition-colors p-3 ${
      enabled ? 'border-moke-red/40 bg-black/40' : 'border-gray-800 bg-black/20'
    }`}>
      {/* 第一行：启用 + 标题 + 数值 + 单项重置 */}
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="w-3.5 h-3.5 accent-moke-red cursor-pointer"
          />
          <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            enabled ? 'text-white' : 'text-gray-500'
          }`}>
            {icon}
            {label}
          </span>
        </label>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-xs font-bold tabular-nums w-9 text-right ${
            enabled ? 'text-moke-red' : 'text-gray-600'
          }`}>
            {state.value}%
          </span>
          <button
            type="button"
            onClick={onReset}
            disabled={recommended === undefined}
            className={`p-1 rounded transition-colors ${
              recommended !== undefined
                ? 'text-gray-400 hover:text-moke-red hover:bg-moke-red/10'
                : 'text-gray-700 cursor-not-allowed'
            }`}
            title={recommended !== undefined ? `重置为推荐值 ${recommended}%` : '无推荐值'}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 第二行：滑块 */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={state.value}
        onChange={(e) => onValueChange(parseInt(e.target.value, 10))}
        disabled={!enabled}
        className={`w-full accent-moke-red ${enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
      />

      {/* 第三行：说明 + 推荐值 */}
      <div className="flex items-center justify-between mt-1">
        <p className={`text-[10px] italic ${enabled ? 'text-gray-400' : 'text-gray-600'}`}>
          {hint}
        </p>
        {recommended !== undefined && (
          <span className="text-[10px] font-mono text-gray-500">
            推荐：<span className="text-moke-red/80 font-bold">{recommended}%</span>
          </span>
        )}
      </div>
    </div>
  );
};

// ========== 工具 ==========
function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
