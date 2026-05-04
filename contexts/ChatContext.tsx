// 文件路径: contexts/ChatContext.tsx
// 对话全局状态管理 — 多会话、历史持久化、发送/取消、技能切换
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatMessage,
  createMessageId,
  sendChatMessage,
} from '../services/chatService';
import { DEFAULT_SKILL_ID, getSkill } from '../services/chatSkills';

export interface ChatSession {
  id: string;
  title: string;
  skillId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatContextValue {
  /** 所有会话 */
  sessions: ChatSession[];
  /** 当前激活的会话 ID */
  activeSessionId: string;
  /** 当前会话（便捷） */
  activeSession: ChatSession | null;
  /** 是否正在发送请求 */
  isLoading: boolean;
  /** 切换会话 */
  switchSession: (id: string) => void;
  /** 新建会话 */
  createSession: (skillId?: string) => string;
  /** 删除会话 */
  deleteSession: (id: string) => void;
  /** 重命名会话 */
  renameSession: (id: string, title: string) => void;
  /** 切换会话使用的技能 */
  setSessionSkill: (sessionId: string, skillId: string) => void;
  /** 发送用户消息并获取助手回复（流式） */
  sendMessage: (content: string) => Promise<void>;
  /** 取消当前生成 */
  cancelGeneration: () => void;
  /** 清空当前会话的消息 */
  clearCurrentSession: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const STORAGE_KEY = 'moke_chat_sessions_v1';
const ACTIVE_KEY = 'moke_chat_active_v1';

/** 从 LocalStorage 加载历史 */
const loadSessions = (): { sessions: ChatSession[]; activeId: string } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const activeId = localStorage.getItem(ACTIVE_KEY) || '';
    if (raw) {
      const sessions: ChatSession[] = JSON.parse(raw);
      if (Array.isArray(sessions) && sessions.length > 0) {
        return { sessions, activeId: activeId || sessions[0].id };
      }
    }
  } catch (e) {
    console.warn('[Chat] LocalStorage 读取失败', e);
  }
  // 初始化一个空会话
  const init: ChatSession = {
    id: `sess_${Date.now()}`,
    title: '新对话',
    skillId: DEFAULT_SKILL_ID,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return { sessions: [init], activeId: init.id };
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [{ sessions, activeId: activeSessionId }, setState] = useState(loadSessions);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 持久化
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('[Chat] LocalStorage 写入失败', e);
    }
  }, [sessions]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, activeSessionId);
    } catch {}
  }, [activeSessionId]);

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const updateSession = useCallback((id: string, updater: (s: ChatSession) => ChatSession) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => (s.id === id ? { ...updater(s), updatedAt: Date.now() } : s)),
    }));
  }, []);

  const switchSession = useCallback((id: string) => {
    setState(prev => ({ ...prev, activeId: id }));
  }, []);

  const createSession = useCallback((skillId: string = DEFAULT_SKILL_ID): string => {
    const newSess: ChatSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: '新对话',
      skillId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setState(prev => ({
      sessions: [newSess, ...prev.sessions],
      activeId: newSess.id,
    }));
    return newSess.id;
  }, []);

  const deleteSession = useCallback((id: string) => {
    setState(prev => {
      const remaining = prev.sessions.filter(s => s.id !== id);
      if (remaining.length === 0) {
        // 至少保留一个空会话
        const fresh: ChatSession = {
          id: `sess_${Date.now()}`,
          title: '新对话',
          skillId: DEFAULT_SKILL_ID,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return { sessions: [fresh], activeId: fresh.id };
      }
      return {
        sessions: remaining,
        activeId: prev.activeId === id ? remaining[0].id : prev.activeId,
      };
    });
  }, []);

  const renameSession = useCallback((id: string, title: string) => {
    updateSession(id, s => ({ ...s, title }));
  }, [updateSession]);

  const setSessionSkill = useCallback((sessionId: string, skillId: string) => {
    updateSession(sessionId, s => ({ ...s, skillId }));
  }, [updateSession]);

  const clearCurrentSession = useCallback(() => {
    if (!activeSessionId) return;
    updateSession(activeSessionId, s => ({ ...s, messages: [] }));
  }, [activeSessionId, updateSession]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const sess = sessions.find(s => s.id === activeSessionId);
      if (!sess || !content.trim()) return;

      const skill = getSkill(sess.skillId) || getSkill(DEFAULT_SKILL_ID)!;

      // 追加用户消息
      const userMsg: ChatMessage = {
        id: createMessageId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      // 占位助手消息（流式填充）
      const asstMsg: ChatMessage = {
        id: createMessageId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        streaming: true,
      };

      updateSession(activeSessionId, s => ({
        ...s,
        title: s.messages.length === 0 ? content.trim().slice(0, 20) : s.title,
        messages: [...s.messages, userMsg, asstMsg],
      }));

      // 构造请求历史（不含占位的 assistant）
      const historyForRequest = [...sess.messages, userMsg];

      // 技能预处理输入
      const processedContent = skill.preprocessInput
        ? skill.preprocessInput(content.trim())
        : content.trim();
      if (skill.preprocessInput) {
        historyForRequest[historyForRequest.length - 1] = {
          ...userMsg,
          content: processedContent,
        };
      }

      setIsLoading(true);
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        await sendChatMessage({
          messages: historyForRequest,
          systemPrompt: skill.systemPrompt,
          temperature: skill.temperature,
          signal: ac.signal,
          onStream: (_chunk, fullText) => {
            updateSession(activeSessionId, s => ({
              ...s,
              messages: s.messages.map(m =>
                m.id === asstMsg.id ? { ...m, content: fullText } : m
              ),
            }));
          },
        });
        // 流式结束：清除 streaming 标志
        updateSession(activeSessionId, s => ({
          ...s,
          messages: s.messages.map(m =>
            m.id === asstMsg.id ? { ...m, streaming: false } : m
          ),
        }));
      } catch (err: any) {
        const msg = err?.name === 'AbortError' ? '已取消' : err?.message || '请求失败';
        updateSession(activeSessionId, s => ({
          ...s,
          messages: s.messages.map(m =>
            m.id === asstMsg.id
              ? { ...m, streaming: false, error: msg, content: m.content || `⚠️ ${msg}` }
              : m
          ),
        }));
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [sessions, activeSessionId, updateSession]
  );

  const value = useMemo<ChatContextValue>(() => ({
    sessions,
    activeSessionId,
    activeSession,
    isLoading,
    switchSession,
    createSession,
    deleteSession,
    renameSession,
    setSessionSkill,
    sendMessage,
    cancelGeneration,
    clearCurrentSession,
  }), [sessions, activeSessionId, activeSession, isLoading, switchSession, createSession, deleteSession, renameSession, setSessionSkill, sendMessage, cancelGeneration, clearCurrentSession]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = (): ChatContextValue => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat 必须在 ChatProvider 内使用');
  return ctx;
};
