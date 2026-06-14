// 文件路径: components/canvas/nodes/LLMNode.tsx
// LLM 对话节点 — 支持多模态输入的 AI 对话

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { CanvasNode, CanvasConnection } from '../types';

interface LLMNodeProps {
  node: CanvasNode;
  isDark: boolean;
  onDataChange: (nodeId: string, data: Record<string, any>) => void;
  isSelected: boolean;
  connections: CanvasConnection[];
  nodes: CanvasNode[];
  onRun: (nodeId: string) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const LLMNode: React.FC<LLMNodeProps> = ({
  node, isDark, onDataChange, isSelected, connections, nodes, onRun,
}) => {
  const model = (node.data.model as string) || 'gemini-3-flash-preview';
  const messages = (node.data.messages as ChatMessage[]) || [];
  const isRunning = node.data.isRunning as boolean || false;
  const inputText = (node.data.inputText as string) || '';
  const error = node.data.error as string | undefined;
  const chatLogRef = useRef<HTMLDivElement>(null);

  // 滚到底部
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim() || isRunning) return;
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: inputText.trim() }];
    onDataChange(node.id, { ...node.data, messages: newMessages, inputText: '' });
    // 触发 LLM 调用
    setTimeout(() => onRun(node.id), 50);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b cursor-move select-none ${
          isDark ? 'border-white/10' : 'border-black/5'
        }`}
        data-drag-handle
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-blue-400 animate-pulse' : 'bg-blue-500'}`} />
          <span className={`text-[10px] font-bold tracking-[0.12em] uppercase ${
            isDark ? 'text-blue-400' : 'text-blue-600'
          }`}>
            LLM
          </span>
        </div>
        <span className={`text-[9px] font-mono truncate max-w-[120px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {model}
        </span>
      </div>

      {/* 对话区域 */}
      <div className="flex-1 flex flex-col min-h-0" onMouseDown={(e) => e.stopPropagation()}>
        {/* 模型配置 */}
        <div className={`px-3 py-2 border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <input
            type="text"
            value={model}
            onChange={(e) => onDataChange(node.id, { ...node.data, model: e.target.value })}
            className={`w-full h-7 px-2.5 rounded-lg text-[10px] font-mono border outline-none ${
              isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}
            placeholder="Model name"
          />
        </div>

        {/* 聊天记录 */}
        <div
          ref={chatLogRef}
          className="flex-1 overflow-auto p-2.5 space-y-2"
        >
          {messages.length === 0 && (
            <div className={`text-center py-6 text-[10px] font-mono ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              输入消息开始对话
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 rounded-xl text-[11px] leading-relaxed max-w-[90%] ${
                msg.role === 'user'
                  ? `ml-auto ${isDark ? 'bg-blue-500/15 text-blue-200 border border-blue-500/20' : 'bg-blue-50 text-blue-800 border border-blue-200'}`
                  : `mr-auto ${isDark ? 'bg-white/5 text-gray-300 border border-white/8' : 'bg-gray-50 text-gray-700 border border-gray-200'}`
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isRunning && (
            <div className={`mr-auto px-3 py-2 rounded-xl ${isDark ? 'bg-white/5 border border-white/8' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* 错误 */}
        {error && (
          <div className={`mx-2.5 mb-1 px-3 py-1.5 rounded-lg text-[9px] font-mono ${
            isDark ? 'bg-red-500/10 text-red-300' : 'bg-red-50 text-red-600'
          }`}>
            {error}
          </div>
        )}

        {/* 输入区域 */}
        <div className={`p-2.5 border-t ${isDark ? 'border-white/5' : 'border-black/5'}`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => onDataChange(node.id, { ...node.data, inputText: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="输入消息..."
              disabled={isRunning}
              className={`flex-1 h-8 px-3 rounded-lg text-[11px] border outline-none transition-colors ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder-gray-600 focus:border-blue-500/40'
                  : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-blue-500/50'
              }`}
            />
            <button
              onClick={handleSend}
              disabled={isRunning || !inputText.trim()}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isRunning || !inputText.trim()
                  ? isDark ? 'bg-white/5 text-gray-600' : 'bg-gray-100 text-gray-400'
                  : isDark ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
