// 文件路径: components/hooks/useAutoFitText.ts
// 功能：根据文本长度自动计算合适的字号，让长文本也能完整显示
// 策略：分段阈值 → 字号/行高映射
//   - < 60 字：16px（默认 base）
//   - 60-150 字：14px
//   - 150-300 字：13px
//   - 300-600 字：12px
//   - > 600 字：11px（最小保底，确保可读）
import { useMemo } from 'react';

export interface AutoFitTextResult {
  fontSize: number;
  lineHeight: number;
  /** 统计信息，供外部显示 */
  charCount: number;
  level: 'xs' | 'sm' | 'base' | 'lg';
}

export const useAutoFitText = (text: string): AutoFitTextResult => {
  return useMemo(() => {
    const charCount = (text || '').length;

    // 字号阶梯
    let fontSize = 16;
    let lineHeight = 1.6;
    let level: AutoFitTextResult['level'] = 'lg';

    if (charCount > 600) {
      fontSize = 11;
      lineHeight = 1.55;
      level = 'xs';
    } else if (charCount > 300) {
      fontSize = 12;
      lineHeight = 1.6;
      level = 'xs';
    } else if (charCount > 150) {
      fontSize = 13;
      lineHeight = 1.65;
      level = 'sm';
    } else if (charCount > 60) {
      fontSize = 14;
      lineHeight = 1.65;
      level = 'base';
    } else {
      fontSize = 16;
      lineHeight = 1.6;
      level = 'lg';
    }

    return { fontSize, lineHeight, charCount, level };
  }, [text]);
};
