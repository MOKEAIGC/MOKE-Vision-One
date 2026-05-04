// 文件路径: components/chat/PromptBlock.tsx
// 提示词卡片 — 渲染单个提示词段，提供复制 + "添加到 CMD" 两个操作
// 设计变更：原"锁定到胶片系统"按钮改为"添加到 CMD"：
//   点击后将该段提示词追加到相机 CMD 输入框（由 PromptAppendContext 提供通道）
//   若 Context 不可用，回退到旧的 onLock 回调（兼容性）
import React, { useState } from 'react';
import { usePromptAppend } from '../../contexts/PromptAppendContext';

interface PromptBlockProps {
  /** 提示词正文 */
  content: string;
  /** 可选标题（代码块语言标识） */
  title?: string;
  /** 序号（用于 "段 2/5" 指示） */
  index?: number;
  /** 总段数 */
  total?: number;
  /** 是否深色模式 */
  isDark: boolean;
  /** 可选：锁定到胶片系统回调 */
  onLock?: (content: string) => void;
}

export const PromptBlock: React.FC<PromptBlockProps> = ({
  content,
  title,
  index,
  total,
  isDark,
  onLock,
}) => {
  const [copied, setCopied] = useState(false);
  const [locked, setLocked] = useState(false);
  // 提示词追加通道（优先使用）
  const promptAppend = usePromptAppend();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      // 降级方案
      const ta = document.createElement('textarea');
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  /** 添加到 CMD：优先走 PromptAppendContext，兜底调 onLock */
  const handleAddToCmd = () => {
    if (promptAppend) {
      promptAppend.appendToPrompt(content);
    } else if (onLock) {
      onLock(content);
    } else {
      return;
    }
    setLocked(true);
    setTimeout(() => setLocked(false), 2000);
  };

  return (
    <div
      className={`my-2 rounded-xl border overflow-hidden transition-colors ${
        isDark
          ? 'border-moke-red/30 bg-black/40 hover:border-moke-red/50'
          : 'border-moke-red/40 bg-white/60 hover:border-moke-red/60'
      }`}
    >
      {/* 卡片头部：标题 + 段号 + 操作按钮组 */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b ${
          isDark ? 'border-moke-red/20 bg-moke-red/10' : 'border-moke-red/30 bg-moke-red/5'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-3.5 h-3.5 text-moke-red shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span className="font-mono text-[11px] font-black tracking-[0.15em] text-moke-red truncate">
            {title || '大师'}
          </span>
          {typeof index === 'number' && typeof total === 'number' && total > 1 && (
            <span className={`font-mono text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-500'} shrink-0`}>
              {index + 1}/{total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 添加到 CMD 输入框 */}
          {(promptAppend || onLock) && (
            <button
              onClick={handleAddToCmd}
              title="将此段提示词追加到 CMD 输入框"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all ${
                locked
                  ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.55)]'
                  : isDark
                  ? 'hover:bg-moke-red/20 text-moke-red'
                  : 'hover:bg-moke-red/10 text-moke-red'
              }`}
            >
              {locked ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  已添加
                </>
              ) : (
                <>
                  {/* 下箭头 + CMD 图标：寓意"发送至 CMD" */}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  加到 CMD
                </>
              )}
            </button>
          )}

          {/* 复制当前段 */}
          <button
            onClick={handleCopy}
            title="复制此段提示词"
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all ${
              copied
                ? 'bg-emerald-500 text-white'
                : isDark
                ? 'hover:bg-white/10 text-gray-300'
                : 'hover:bg-black/5 text-gray-700'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                已复制
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                复制
              </>
            )}
          </button>
        </div>
      </div>

      {/* 提示词正文 */}
      <pre
        className={`px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words overflow-x-auto scrollbar-thin ${
          isDark ? 'text-gray-200' : 'text-gray-800'
        }`}
      >
        {content}
      </pre>
    </div>
  );
};
