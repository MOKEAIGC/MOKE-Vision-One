// 文件路径: contexts/PromptAppendContext.tsx
// 功能：为"提示词卡片"的【添加到 CMD】按钮提供全局的追加通道
// 设计：不侵入原有 prompt state 逻辑，只提供一个 appendToPrompt(text) 方法
//       由 App.tsx 注入当前 prompt 的 setter，由 ChatWindow 中的 PromptBlock 消费
import React, { createContext, useContext, useCallback, useRef } from 'react';

interface PromptAppendContextValue {
  /** 将一段文本追加到当前 CMD 输入框，自动处理分隔符与去重 */
  appendToPrompt: (text: string) => void;
  /** 【内部使用】注册当前 CMD 的 getter/setter */
  __register: (getter: () => string, setter: (v: string) => void) => void;
}

const PromptAppendContext = createContext<PromptAppendContextValue | null>(null);

export const PromptAppendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 使用 ref 存储最新的 getter/setter，避免 Provider re-render 引起级联
  const getterRef = useRef<() => string>(() => '');
  const setterRef = useRef<(v: string) => void>(() => {});

  const __register = useCallback((getter: () => string, setter: (v: string) => void) => {
    getterRef.current = getter;
    setterRef.current = setter;
  }, []);

  const appendToPrompt = useCallback((text: string) => {
    const clean = (text || '').trim();
    if (!clean) return;
    const current = (getterRef.current() || '').trim();

    // 去重：如果当前已经包含了这段文本，跳过
    if (current && current.includes(clean)) {
      return;
    }

    // 拼接：空时直接用；非空时用 ", " 连接（符合 prompt 语义）
    let next = '';
    if (!current) {
      next = clean;
    } else if (/[,，。.;；]$/.test(current)) {
      next = `${current} ${clean}`;
    } else {
      next = `${current}, ${clean}`;
    }

    setterRef.current(next);
  }, []);

  return (
    <PromptAppendContext.Provider value={{ appendToPrompt, __register }}>
      {children}
    </PromptAppendContext.Provider>
  );
};

/** 消费者：卡片/技能侧用 */
export const usePromptAppend = () => {
  const ctx = useContext(PromptAppendContext);
  return ctx;
};

/** App 侧用：把当前 prompt 状态注册进来 */
export const usePromptAppendRegistrar = (getter: () => string, setter: (v: string) => void) => {
  const ctx = useContext(PromptAppendContext);
  React.useEffect(() => {
    if (ctx) {
      ctx.__register(getter, setter);
    }
  }, [ctx, getter, setter]);
};
