// 文件路径: components/chat/ChatWindow.tsx
// AI 对话主窗口 — 可拖拽 + 可缩放浮层，支持会话切换 / 技能切换 / 流式输出 / 取消
import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useTheme } from '../../contexts/ThemeContext';
import { MessageBubble } from './MessageBubble';
import { SkillsBar } from './SkillsBar';
import { SessionsPanel } from './SessionsPanel';
import { getSkill, DEFAULT_SKILL_ID } from '../../services/chatSkills';
import { useDraggable } from '../hooks/useDraggable';
import { useResizable } from '../hooks/useResizable';

interface ChatWindowProps {
  onClose: () => void;
  /** 锁定提示词到胶片系统（点击 PromptBlock 的"锁定"按钮时调用） */
  onLockPrompt?: (content: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ onClose, onLockPrompt }) => {
  const { isDark } = useTheme();
  const {
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    switchSession,
    createSession,
    deleteSession,
    setSessionSkill,
    sendMessage,
    cancelGeneration,
    clearCurrentSession,
  } = useChat();

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // SESSIONS 框体开关（浮层覆盖在消息区上方）
  const [sessionsPanelOpen, setSessionsPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 窗口尺寸 — 可缩放，持久化
  const resize = useResizable({
    initial: { width: 520, height: 600 },
    min: { width: 360, height: 360 },
    storageKey: 'moke_chat_window_size_v1',
  });

  // 窗口拖拽状态（位置持久化到 localStorage）
  const drag = useDraggable({
    initial: { x: 0, y: 0 },
    size: resize.size,
    storageKey: 'moke_chat_window_pos_v1',
  });

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeSession?.messages]);

  // 窗口打开后聚焦输入框
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentSkill = activeSession ? getSkill(activeSession.skillId) : getSkill(DEFAULT_SKILL_ID);

  // 主题样式
  const shellBg = isDark ? 'bg-[#0A0A0A]/95' : 'bg-white/95';
  const borderCls = isDark ? 'border-white/10' : 'border-black/10';
  const subText = isDark ? 'text-gray-500' : 'text-gray-500';

  return (
    <div
      className={`fixed top-20 right-6 z-[9997] flex ${shellBg} backdrop-blur-2xl border ${borderCls} rounded-2xl shadow-2xl overflow-hidden ${
        drag.dragging || resize.resizing ? 'transition-none' : 'transition-transform'
      }`}
      style={{
        width: `${resize.size.width}px`,
        height: `${resize.size.height}px`,
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 120px)',
        transform: `translate(${drag.position.x}px, ${drag.position.y}px)`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ============ 左侧会话列表 ============ */}
      {sidebarOpen && (
        <aside className={`w-[140px] shrink-0 flex flex-col border-r ${borderCls} ${isDark ? 'bg-black/40' : 'bg-black/[0.02]'}`}>
          <div className="flex items-center justify-between px-2 py-2 border-b border-inherit">
            <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${subText}`}>SESSIONS</span>
            <button
              onClick={() => createSession(currentSkill?.id || DEFAULT_SKILL_ID)}
              className={`w-5 h-5 flex items-center justify-center rounded-full text-xs transition-colors ${
                isDark ? 'hover:bg-white/10 text-moke-red' : 'hover:bg-black/5 text-moke-red'
              }`}
              title="新建会话"
            >
              +
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => switchSession(s.id)}
                className={`group relative px-2 py-2 cursor-pointer border-b ${borderCls} transition-colors ${
                  s.id === activeSessionId
                    ? isDark ? 'bg-moke-red/15 text-white' : 'bg-moke-red/10 text-black'
                    : isDark ? 'text-gray-400 hover:bg-white/5' : 'text-gray-600 hover:bg-black/5'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className="text-xs leading-none shrink-0">{getSkill(s.skillId)?.icon || '💬'}</span>
                  <span className="text-[11px] font-mono font-bold truncate flex-1">{s.title}</span>
                </div>
                <div className={`text-[9px] font-mono mt-0.5 ${subText}`}>
                  {new Date(s.updatedAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })} · {s.messages.length}
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] opacity-0 group-hover:opacity-100 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                    title="删除"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* ============ 右侧主区 ============ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 — 作为拖拽 handle */}
        <div
          {...drag.handleProps}
          className={`flex items-center justify-between px-3 py-2 border-b ${borderCls} select-none`}
          style={{ ...drag.handleProps.style, cursor: drag.dragging ? 'grabbing' : 'grab' }}
          title="拖拽移动窗口"
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* 拖拽指示 grip */}
            <div className={`flex flex-col gap-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} data-no-drag="false" aria-hidden>
              <div className="flex gap-0.5"><span className="w-1 h-1 rounded-full bg-current"></span><span className="w-1 h-1 rounded-full bg-current"></span></div>
              <div className="flex gap-0.5"><span className="w-1 h-1 rounded-full bg-current"></span><span className="w-1 h-1 rounded-full bg-current"></span></div>
              <div className="flex gap-0.5"><span className="w-1 h-1 rounded-full bg-current"></span><span className="w-1 h-1 rounded-full bg-current"></span></div>
            </div>
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'}`}
              title={sidebarOpen ? '隐藏会话列表' : '显示会话列表'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className={`font-mono text-xs font-black tracking-widest uppercase ${isDark ? 'text-white' : 'text-black'} truncate`}>
                {currentSkill?.icon} AI CHAT · {currentSkill?.label}
              </div>
              <div className={`font-mono text-[9px] ${subText} truncate`}>{activeSession?.title}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={drag.reset}
              className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'}`}
              title="重置窗口位置"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={clearCurrentSession}
              disabled={!activeSession?.messages.length}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-black/5 text-gray-600'
              }`}
              title="清空当前会话"
            >
              清空
            </button>
            {/* SESSIONS 面板入口 — 聚合所有提示词卡片，支持多段/单段复制与加到 CMD */}
            <button
              onClick={() => setSessionsPanelOpen(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-black tracking-wider uppercase transition-all ${
                sessionsPanelOpen
                  ? 'bg-moke-red text-white shadow-[0_0_10px_rgba(208,0,0,0.5)]'
                  : isDark
                  ? 'bg-moke-red/15 hover:bg-moke-red/25 text-moke-red'
                  : 'bg-moke-red/10 hover:bg-moke-red/20 text-moke-red'
              }`}
              title="打开 SESSIONS 框体：汇总所有提示词，支持多段/单段复制与一键加到 CMD"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h6" />
              </svg>
              Sessions
            </button>
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
        </div>

        {/* 技能选择栏 */}
        <div className={`px-3 py-2 border-b ${borderCls}`}>
          <SkillsBar
            currentSkillId={activeSession?.skillId || DEFAULT_SKILL_ID}
            onSelect={(skillId) => activeSessionId && setSessionSkill(activeSessionId, skillId)}
            isDark={isDark}
          />
        </div>

        {/* 消息列表 */}
        <div className={`relative flex-1 overflow-y-auto scrollbar-thin px-3 py-3 ${isDark ? 'bg-black/20' : 'bg-black/[0.01]'}`}>
          {activeSession?.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="text-4xl mb-3 opacity-60">{currentSkill?.icon}</div>
              <div className={`font-mono text-xs font-bold tracking-widest uppercase ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                {currentSkill?.label}
              </div>
              <div className={`text-[11px] ${subText} max-w-[280px] leading-relaxed`}>
                {currentSkill?.description}
              </div>
              <div className={`mt-4 text-[10px] font-mono ${subText} opacity-70`}>
                输入消息开始对话 · Enter 发送 · Shift+Enter 换行
              </div>
            </div>
          ) : (
            <>
              {activeSession?.messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} isDark={isDark} onLockPrompt={onLockPrompt} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}

          {/* SESSIONS 浮层 — 覆盖在消息区上方，保留消息滚动位置 */}
          {sessionsPanelOpen && (
            <div className="absolute inset-0 z-20 animate-in fade-in slide-in-from-right-2 duration-200">
              <SessionsPanel isDark={isDark} onClose={() => setSessionsPanelOpen(false)} />
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className={`border-t ${borderCls} p-2`}>
          <div className={`flex items-end gap-2 rounded-xl border ${isDark ? 'bg-black/40 border-white/10 focus-within:border-moke-red/60' : 'bg-white/60 border-black/10 focus-within:border-moke-red/60'} transition-colors px-2.5 py-1.5`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? '思考中…' : '输入消息…'}
              rows={1}
              disabled={isLoading}
              className={`flex-1 bg-transparent resize-none outline-none text-sm font-mono max-h-32 min-h-[24px] py-1 ${isDark ? 'text-gray-100 placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'}`}
              style={{ lineHeight: '1.5' }}
            />
            {isLoading ? (
              <button
                onClick={cancelGeneration}
                className="shrink-0 w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                title="取消"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  input.trim()
                    ? 'bg-moke-red text-white hover:brightness-110 shadow-md shadow-red-900/30'
                    : isDark ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-black/5 text-gray-400 cursor-not-allowed'
                }`}
                title="发送 (Enter)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            )}
          </div>
          <div className={`mt-1 flex justify-between text-[9px] font-mono ${subText} px-1`}>
            <span>Enter 发送 · Shift+Enter 换行</span>
            <span>{activeSession?.messages.length || 0} 条消息</span>
          </div>
        </div>
      </div>

      {/* 右下角缩放手柄 */}
      <div
        {...resize.cornerHandleProps}
        className={`absolute bottom-0 right-0 w-4 h-4 flex items-end justify-end p-0.5 z-[10] group ${
          resize.resizing ? 'bg-moke-red/20' : ''
        }`}
        title="拖拽调整窗口大小 · 双击恢复默认"
        onDoubleClick={resize.reset}
      >
        {/* 视觉指示：三条斜线 */}
        <svg
          className={`w-3 h-3 transition-colors ${
            resize.resizing ? 'text-moke-red' : isDark ? 'text-gray-600 group-hover:text-moke-red' : 'text-gray-400 group-hover:text-moke-red'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 12 12"
        >
          <line x1="11" y1="5" x2="5" y2="11" strokeWidth={1.5} strokeLinecap="round" />
          <line x1="11" y1="8" x2="8" y2="11" strokeWidth={1.5} strokeLinecap="round" />
          <line x1="11" y1="2" x2="2" y2="11" strokeWidth={1} strokeLinecap="round" opacity="0.4" />
        </svg>
      </div>

      {/* 尺寸指示徽章 — 仅缩放中显示 */}
      {resize.resizing && (
        <div
          className={`absolute top-2 left-1/2 -translate-x-1/2 z-[11] px-3 py-1 rounded-full pointer-events-none border backdrop-blur-md font-mono text-[10px] font-bold tracking-wider shadow-[0_0_12px_rgba(208,0,0,0.4)] ${
            isDark ? 'bg-black/80 border-moke-red/50 text-moke-red' : 'bg-white/90 border-moke-red/50 text-moke-red'
          }`}
        >
          {Math.round(resize.size.width)} × {Math.round(resize.size.height)}
        </div>
      )}
    </div>
  );
};
