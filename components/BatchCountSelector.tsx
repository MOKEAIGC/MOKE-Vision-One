// 文件路径: components/BatchCountSelector.tsx
// 功能说明: 生成数量选择器（自包含独立组件）
// -------------------------------------------------------------------
// 作用:
//   - 在参数面板中提供"单次生成 1 / 2 / 4 张图片"的切换按钮
//   - 视觉风格与现有 QuantumSelector 一致（黑底 + moke-red 选中高亮 + font-mono）
//   - 完全不依赖 SettingsPanel 内部结构，可独立挂载在任意位置
//   - 防御性：数值非法时回退到 1
// -------------------------------------------------------------------

import React from 'react';

/** 支持的批量生成数量（固定枚举，便于类型约束） */
export type BatchCount = 1 | 2 | 4;

/** 可选数量列表 */
export const BATCH_COUNT_OPTIONS: BatchCount[] = [1, 2, 4];

interface BatchCountSelectorProps {
  /** 当前选中的数量 */
  value: BatchCount;
  /** 切换时回调 */
  onChange: (count: BatchCount) => void;
  /** 是否处于处理中（生成中禁用切换，避免中途改变） */
  disabled?: boolean;
  /** 是否深色主题（复用项目主题变量） */
  isDark?: boolean;
  /** 标签文字，支持国际化外部传入，默认中文 */
  label?: string;
}

/**
 * 生成数量选择器
 * 视觉：三段按钮组，每段显示 ×1 / ×2 / ×4
 * 选中态沿用 moke-red，未选中为灰色文字
 */
export const BatchCountSelector: React.FC<BatchCountSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  isDark = true,
  label = '生成数量',
}) => {
  // 防御性：value 不在允许集合内时视为 1
  const safeValue: BatchCount =
    (BATCH_COUNT_OPTIONS as number[]).includes(value) ? value : 1;

  const labelColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const groupBg = isDark
    ? 'bg-[#111] border-gray-800'
    : 'bg-gray-100 border-gray-200';
  const inactiveColor = isDark
    ? 'text-gray-400 hover:text-white hover:bg-opacity-10'
    : 'text-gray-600 hover:text-black hover:bg-gray-200';

  return (
    <div className="flex flex-col gap-3 w-full font-mono">
      <div className="flex justify-between items-center">
        <span
          className={`${labelColor} uppercase tracking-widest text-sm font-bold`}
        >
          {label}
        </span>
        <span className="text-[10px] text-moke-red font-bold tracking-widest">
          × {safeValue}
        </span>
      </div>

      <div
        className={`flex w-full ${groupBg} border rounded-md overflow-hidden`}
      >
        {BATCH_COUNT_OPTIONS.map((opt, idx) => {
          const active = opt === safeValue;
          return (
            <button
              key={opt}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                try {
                  onChange(opt);
                } catch (err) {
                  // 防御性：外部回调异常不影响组件自身
                  console.error('[BatchCountSelector] onChange error:', err);
                }
              }}
              className={[
                'flex-1 py-3 text-sm font-bold transition-all px-2',
                'border-gray-800 last:border-none',
                idx < BATCH_COUNT_OPTIONS.length - 1 ? 'border-r' : '',
                active
                  ? 'bg-moke-red text-white shadow-inner'
                  : inactiveColor,
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
              aria-pressed={active}
              aria-label={`每次生成 ${opt} 张`}
            >
              ×{opt}
            </button>
          );
        })}
      </div>

      <div className="text-[10px] text-gray-600 tracking-wide leading-relaxed">
        每次按下快门生成 {safeValue} 张图片
        {safeValue > 1 && <span>（串行生成，避免 API 并发限制）</span>}
      </div>
    </div>
  );
};

export default BatchCountSelector;
