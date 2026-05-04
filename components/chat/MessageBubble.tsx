// 文件路径: components/chat/MessageBubble.tsx
// 单条消息气泡 — 识别 Markdown 代码块，交替渲染文本和 PromptBlock 卡片
// 助手消息顶部提供"复制全部代码块"按钮
import React, { useMemo, useState } from 'react';
import { ChatMessage } from '../../services/chatService';
import { parsePromptBlocks, getAllBlocksText, countBlocks } from '../../services/promptBlockParser';
import { PromptBlock } from './PromptBlock';

interface MessageBubbleProps {
  message: ChatMessage;
  isDark: boolean;
  /** 锁定到胶片系统回调（点击 PromptBlock 锁定按钮时调用） */
  onLockPrompt?: (content: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isDark, onLockPrompt }) => {
  const isUser = message.role === 'user';
  const isErr = !!message.error;
  const [copiedAll, setCopiedAll] = useState(false);

  // 解析消息内容中的代码块
  const segments = useMemo(() => parsePromptBlocks(message.content || ''), [message.content]);
  const blockCount = useMemo(() => countBlocks(message.content || ''), [message.content]);
  // 提示词段索引（用于 PromptBlock 的 index/total 显示）
  let blockIndex = -1;

  const handleCopyAll = async () => {
    const allText = getAllBlocksText(message.content);
    try {
      await navigator.clipboard.writeText(allText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = allText;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? 'bg-moke-red text-white shadow-md shadow-red-900/20'
            : isErr
            ? isDark
              ? 'bg-red-900/30 border border-red-500/40 text-red-300'
              : 'bg-red-50 border border-red-300 text-red-700'
            : isDark
            ? 'bg-white/[0.06] border border-white/10 text-gray-100'
            : 'bg-black/[0.04] border border-black/10 text-gray-900'
        }`}
      >
        {/* 角色标签 */}
        {!isUser && (
          <div className="flex items-center justify-between mb-1 gap-2">
            <div
              className={`flex items-center gap-1.5 font-mono text-[9px] font-bold tracking-widest uppercase ${
                isErr ? 'text-red-400' : isDark ? 'text-gray-500' : 'text-gray-500'
              }`}
            >
              <span className={`w-1 h-1 rounded-full ${isErr ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></span>
              {isErr ? 'ERROR' : 'ASSISTANT'}
              {message.streaming && (
                <span className="ml-1 flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-moke-red animate-pulse"></span>
                  <span className="w-1 h-1 rounded-full bg-moke-red animate-pulse [animation-delay:0.2s]"></span>
                  <span className="w-1 h-1 rounded-full bg-moke-red animate-pulse [animation-delay:0.4s]"></span>
                </span>
              )}
            </div>
            {/* 一键复制全部代码块 — 只在有代码块且未流式时显示 */}
            {blockCount > 0 && !message.streaming && (
              <button
                onClick={handleCopyAll}
                title={`复制全部 ${blockCount} 段提示词`}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all ${
                  copiedAll
                    ? 'bg-emerald-500 text-white'
                    : isDark
                    ? 'bg-moke-red/20 hover:bg-moke-red/30 text-moke-red'
                    : 'bg-moke-red/10 hover:bg-moke-red/20 text-moke-red'
                }`}
              >
                {copiedAll ? (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    全部已复制
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    复制全部 ({blockCount})
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* 消息内容：交替渲染文本段和代码块卡片 */}
        {isUser ? (
          // 用户消息：直接显示文本
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </div>
        ) : (
          <div className="text-sm leading-relaxed">
            {segments.map((seg, i) => {
              if (seg.isBlock) {
                blockIndex++;
                // 卡片标题统一显示为"大师（N）"，N 为当前段的序号（从 1 开始）
                const masterTitle = `大师（${blockIndex + 1}）`;
                return (
                  <PromptBlock
                    key={i}
                    content={seg.content}
                    title={masterTitle}
                    index={blockIndex}
                    total={blockCount}
                    isDark={isDark}
                    onLock={onLockPrompt}
                  />
                );
              }
              // 普通文本段
              const trimmed = seg.content;
              if (!trimmed) return null;
              return (
                <div key={i} className="whitespace-pre-wrap break-words">
                  {trimmed}
                </div>
              );
            })}
            {/* 流式光标 */}
            {message.streaming && message.content && (
              <span className={`inline-block w-1.5 h-4 ml-0.5 align-middle ${isDark ? 'bg-gray-300' : 'bg-gray-700'} animate-pulse`}></span>
            )}
            {/* 空内容占位 */}
            {!message.content && message.streaming && <span>…</span>}
          </div>
        )}
      </div>
    </div>
  );
};
