// 文件路径: components/chat/SessionsPanel.tsx
// SESSIONS 框体 — 聚合展示当前会话中所有提示词卡片（大师 1 / 大师 2 ...）
// 功能：
//   1. 单段复制（每张卡片右上角"复制"按钮）
//   2. 多段复制（勾选多个 → 顶部"复制选中"）
//   3. 单段 / 多段 一键加到 CMD（PromptAppendContext.appendToPrompt）
//   4. 一键全选 / 全部加到 CMD / 一键清空选择
import React, { useMemo, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { parsePromptBlocks } from '../../services/promptBlockParser';
import { usePromptAppend } from '../../contexts/PromptAppendContext';

interface AggregatedBlock {
  id: string;            // 稳定 id：messageId_blockIndex
  title: string;         // "大师（N）"
  content: string;       // 正文
  messageIndex: number;  // 来自第几条 AI 消息
  globalIndex: number;   // 在整个会话中的全局序号（1 开始）
}

interface SessionsPanelProps {
  isDark: boolean;
  onClose: () => void;
}

export const SessionsPanel: React.FC<SessionsPanelProps> = ({ isDark, onClose }) => {
  const { activeSession } = useChat();
  const promptAppend = usePromptAppend();

  // 将当前会话中所有 AI 消息的代码块扁平化
  const blocks = useMemo<AggregatedBlock[]>(() => {
    if (!activeSession) return [];
    const out: AggregatedBlock[] = [];
    let global = 0;
    activeSession.messages.forEach((msg, mi) => {
      if (msg.role !== 'assistant') return;
      const segs = parsePromptBlocks(msg.content || '');
      segs.forEach((seg, si) => {
        if (!seg.isBlock) return;
        global += 1;
        out.push({
          id: `${msg.id}_${si}`,
          title: `大师（${global}）`,
          content: seg.content,
          messageIndex: mi,
          globalIndex: global,
        });
      });
    });
    return out;
  }, [activeSession]);

  // 选中集合
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // 展开的卡片 id（默认都折叠长文本，点击展开）
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // 交互反馈
  const [flashMsg, setFlashMsg] = useState<{ text: string; kind: 'ok' | 'warn' } | null>(null);
  const flashTimerRef = React.useRef<number | null>(null);
  const flash = (text: string, kind: 'ok' | 'warn' = 'ok') => {
    setFlashMsg({ text, kind });
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlashMsg(null), 1800);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === blocks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(blocks.map(b => b.id)));
    }
  };

  /** 稳健复制：优先 navigator.clipboard，降级到 execCommand */
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleCopySingle = async (block: AggregatedBlock) => {
    const ok = await copyText(block.content);
    flash(ok ? `✓ 已复制 ${block.title}` : '复制失败', ok ? 'ok' : 'warn');
  };

  const handleCopySelected = async () => {
    if (selectedIds.size === 0) {
      flash('请先勾选卡片', 'warn');
      return;
    }
    const picked = blocks.filter(b => selectedIds.has(b.id));
    const merged = picked.map(b => `### ${b.title}\n${b.content}`).join('\n\n---\n\n');
    const ok = await copyText(merged);
    flash(ok ? `✓ 已复制 ${picked.length} 段` : '复制失败', ok ? 'ok' : 'warn');
  };

  const handleCopyAll = async () => {
    if (blocks.length === 0) return;
    const merged = blocks.map(b => `### ${b.title}\n${b.content}`).join('\n\n---\n\n');
    const ok = await copyText(merged);
    flash(ok ? `✓ 已复制全部 ${blocks.length} 段` : '复制失败', ok ? 'ok' : 'warn');
  };

  /** 单段加到 CMD */
  const handleAppendSingle = (block: AggregatedBlock) => {
    if (!promptAppend) {
      flash('CMD 通道未就绪', 'warn');
      return;
    }
    promptAppend.appendToPrompt(block.content);
    flash(`✓ ${block.title} 已加到 CMD`, 'ok');
  };

  /** 多段加到 CMD */
  const handleAppendSelected = () => {
    if (!promptAppend) {
      flash('CMD 通道未就绪', 'warn');
      return;
    }
    if (selectedIds.size === 0) {
      flash('请先勾选卡片', 'warn');
      return;
    }
    const picked = blocks.filter(b => selectedIds.has(b.id));
    picked.forEach(b => promptAppend.appendToPrompt(b.content));
    flash(`✓ ${picked.length} 段已加到 CMD`, 'ok');
  };

  /** 全部加到 CMD */
  const handleAppendAll = () => {
    if (!promptAppend) {
      flash('CMD 通道未就绪', 'warn');
      return;
    }
    if (blocks.length === 0) return;
    blocks.forEach(b => promptAppend.appendToPrompt(b.content));
    flash(`✓ 全部 ${blocks.length} 段已加到 CMD`, 'ok');
  };

  // 主题
  const shellBg = isDark ? 'bg-[#0A0A0A]/95' : 'bg-white/95';
  const borderCls = isDark ? 'border-white/10' : 'border-black/10';
  const subText = isDark ? 'text-gray-500' : 'text-gray-500';
  const cardBg = isDark ? 'bg-black/40' : 'bg-white/70';
  const cardBorder = isDark ? 'border-moke-red/30' : 'border-moke-red/40';

  const allSelected = blocks.length > 0 && selectedIds.size === blocks.length;
  const anySelected = selectedIds.size > 0;

  return (
    <div
      className={`flex flex-col h-full ${shellBg} backdrop-blur-2xl`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 顶部标题栏 */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${borderCls}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-moke-red/15 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-moke-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h6" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className={`font-mono text-xs font-black tracking-[0.2em] ${isDark ? 'text-white' : 'text-black'}`}>
              SESSIONS · 提示词汇总
            </div>
            <div className={`font-mono text-[9px] ${subText} truncate`}>
              {blocks.length === 0
                ? '当前会话暂无提示词卡片'
                : `共 ${blocks.length} 段 · 已选 ${selectedIds.size}`}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'}`}
          title="关闭"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 操作工具条 */}
      <div className={`flex flex-wrap items-center gap-1.5 px-2 py-2 border-b ${borderCls} ${isDark ? 'bg-black/30' : 'bg-black/[0.02]'}`}>
        {/* 全选 */}
        <button
          onClick={selectAll}
          disabled={blocks.length === 0}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            allSelected
              ? 'bg-moke-red text-white'
              : isDark ? 'bg-white/5 hover:bg-white/10 text-gray-200' : 'bg-black/5 hover:bg-black/10 text-gray-800'
          }`}
          title={allSelected ? '取消全选' : '全选'}
        >
          <span className={`w-3 h-3 rounded border flex items-center justify-center ${allSelected ? 'bg-white border-white text-moke-red' : isDark ? 'border-gray-500' : 'border-gray-400'}`}>
            {allSelected && <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
          </span>
          {allSelected ? '取消全选' : '全选'}
        </button>

        {/* 复制选中 */}
        <button
          onClick={handleCopySelected}
          disabled={!anySelected}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark ? 'bg-white/5 hover:bg-white/10 text-gray-200' : 'bg-black/5 hover:bg-black/10 text-gray-800'
          }`}
          title="复制选中的提示词（多段合并）"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          复制选中{anySelected ? ` (${selectedIds.size})` : ''}
        </button>

        {/* 加到 CMD（选中） */}
        <button
          onClick={handleAppendSelected}
          disabled={!anySelected}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            anySelected
              ? 'bg-emerald-500 text-white hover:brightness-110 shadow-[0_0_8px_rgba(16,185,129,0.45)]'
              : isDark ? 'bg-white/5 text-gray-500' : 'bg-black/5 text-gray-400'
          }`}
          title="将选中的提示词一键加到 CMD 输入框"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          加到 CMD{anySelected ? ` (${selectedIds.size})` : ''}
        </button>

        <div className={`mx-1 h-4 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

        {/* 复制全部 */}
        <button
          onClick={handleCopyAll}
          disabled={blocks.length === 0}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            isDark ? 'bg-moke-red/20 hover:bg-moke-red/30 text-moke-red' : 'bg-moke-red/10 hover:bg-moke-red/20 text-moke-red'
          }`}
          title="复制全部提示词"
        >
          复制全部
        </button>

        {/* 全部加到 CMD */}
        <button
          onClick={handleAppendAll}
          disabled={blocks.length === 0}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono font-black tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            blocks.length === 0
              ? isDark ? 'bg-white/5 text-gray-500' : 'bg-black/5 text-gray-400'
              : 'bg-emerald-600 text-white hover:brightness-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
          }`}
          title="一键将所有提示词加到 CMD 输入框"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          全部加到 CMD
        </button>
      </div>

      {/* 飞行提示条 */}
      {flashMsg && (
        <div className={`px-3 py-1.5 text-[11px] font-mono font-bold border-b ${borderCls} animate-in fade-in slide-in-from-top-1 ${
          flashMsg.kind === 'ok'
            ? 'text-emerald-400 bg-emerald-500/10'
            : 'text-amber-400 bg-amber-500/10'
        }`}>
          {flashMsg.text}
        </div>
      )}

      {/* 卡片列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-2">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-10">
            <div className="text-4xl mb-3 opacity-40">🗂️</div>
            <div className={`font-mono text-xs font-bold tracking-widest ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
              暂无提示词
            </div>
            <div className={`text-[11px] ${subText} max-w-[280px] leading-relaxed`}>
              在对话中让 AI 输出代码块形式的提示词后，会自动在此聚合展示。
            </div>
          </div>
        ) : (
          blocks.map(block => {
            const checked = selectedIds.has(block.id);
            const expanded = expandedIds.has(block.id);
            const preview = block.content.length > 200 && !expanded
              ? block.content.slice(0, 200) + '…'
              : block.content;

            return (
              <div
                key={block.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  checked
                    ? 'border-emerald-400/80 shadow-[0_0_14px_rgba(16,185,129,0.35)] bg-emerald-500/5'
                    : `${cardBorder} ${cardBg} hover:border-moke-red/60`
                }`}
              >
                {/* 头部：勾选框 + 标题 + 操作按钮 */}
                <div className={`flex items-center justify-between px-3 py-1.5 border-b ${checked ? 'border-emerald-400/40 bg-emerald-500/10' : isDark ? 'border-moke-red/20 bg-moke-red/10' : 'border-moke-red/30 bg-moke-red/5'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {/* 勾选框 */}
                    <button
                      onClick={() => toggleSelect(block.id)}
                      className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-all ${
                        checked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : isDark ? 'border-gray-500 hover:border-moke-red' : 'border-gray-400 hover:border-moke-red'
                      }`}
                      title={checked ? '取消选中' : '选中此段'}
                    >
                      {checked && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    {/* 图标 */}
                    <svg className="w-3.5 h-3.5 text-moke-red shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    {/* 标题 */}
                    <span className="font-mono text-[11px] font-black tracking-[0.15em] text-moke-red truncate">
                      {block.title}
                    </span>
                    <span className={`font-mono text-[9px] ${subText} shrink-0`}>
                      {block.content.length} 字
                    </span>
                  </div>

                  {/* 右侧操作按钮 */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* 单段加到 CMD */}
                    <button
                      onClick={() => handleAppendSingle(block)}
                      title="加到 CMD 输入框"
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all bg-emerald-500/20 hover:bg-emerald-500 hover:text-white text-emerald-400"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                      加到CMD
                    </button>
                    {/* 单段复制 */}
                    <button
                      onClick={() => handleCopySingle(block)}
                      title="复制此段"
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider transition-all ${
                        isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-gray-700'
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      复制
                    </button>
                  </div>
                </div>

                {/* 内容区 */}
                <pre
                  onClick={() => block.content.length > 200 && toggleExpand(block.id)}
                  className={`px-3 py-2 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words overflow-x-auto scrollbar-thin ${
                    isDark ? 'text-gray-200' : 'text-gray-800'
                  } ${block.content.length > 200 ? 'cursor-pointer' : ''}`}
                  title={block.content.length > 200 ? '点击展开/折叠' : undefined}
                >
                  {preview}
                </pre>
                {block.content.length > 200 && (
                  <div
                    onClick={() => toggleExpand(block.id)}
                    className={`text-center py-1 text-[10px] font-mono cursor-pointer border-t ${borderCls} ${isDark ? 'bg-white/[0.03] text-gray-500 hover:text-moke-red' : 'bg-black/[0.02] text-gray-500 hover:text-moke-red'} transition-colors`}
                  >
                    {expanded ? '▲ 收起' : '▼ 展开全文'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 底部状态栏 */}
      <div className={`px-3 py-1.5 border-t ${borderCls} flex items-center justify-between text-[9px] font-mono ${subText}`}>
        <span>单击勾选框多选 · 点击正文展开长文</span>
        <span>SESSIONS v1.0</span>
      </div>
    </div>
  );
};
