// 文件路径: components/useTextShortcuts.ts
// 通用文字输入框键盘快捷键 Hook — 确保所有文本框支持系统级快捷键
// 支持：Cmd/Ctrl+A 全选、Cmd/Ctrl+Z 撤销、Cmd/Ctrl+Shift+Z/Y 重做、
//       Cmd/Ctrl+X 剪切、Cmd/Ctrl+C 复制、Cmd/Ctrl+V 粘贴、
//       Tab 制表符（仅 textarea）、Escape 失焦

import { useCallback } from 'react';

/**
 * 判断是否为 macOS 系统
 */
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/**
 * 判断修饰键 — macOS 用 metaKey (⌘), 其他用 ctrlKey
 */
const isModKey = (e: React.KeyboardEvent): boolean => isMac ? e.metaKey : e.ctrlKey;

/**
 * 通用快捷键处理选项
 */
interface TextShortcutsOptions {
  /** 按下 Enter 时的回调（单行 input 用） */
  onEnter?: () => void;
  /** 按下 Escape 时的回调 */
  onEscape?: () => void;
  /** 是否为 textarea（启用 Tab 缩进） */
  isTextarea?: boolean;
  /** 按下 Cmd/Ctrl+Enter 时的回调（textarea 提交用） */
  onCmdEnter?: () => void;
}

/**
 * useTextShortcuts — 通用文本输入框键盘快捷键处理 Hook
 * 
 * 核心功能：
 * 1. 阻止事件冒泡，防止全局键盘监听器拦截输入框内的按键
 * 2. 确保 Cmd/Ctrl+A/Z/X/C/V 等系统快捷键正常工作
 * 3. 支持 Tab 缩进（textarea）
 * 4. 支持 Enter 提交（input）和 Cmd+Enter 提交（textarea）
 * 5. 支持 Escape 失焦
 */
export function useTextShortcuts(options: TextShortcutsOptions = {}) {
  const { onEnter, onEscape, isTextarea = false, onCmdEnter } = options;

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const mod = isModKey(e);

    // ====== 系统级快捷键 — 阻止冒泡但不阻止默认行为 ======
    // 确保 Cmd/Ctrl + A/Z/X/C/V/Y 等不被外层全局 keydown 拦截
    if (mod && !e.shiftKey && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'a': // 全选
        case 'z': // 撤销
        case 'x': // 剪切
        case 'c': // 复制
        case 'v': // 粘贴
          e.stopPropagation();
          return; // 让浏览器默认行为正常执行
        case 'y': // 重做 (Windows)
          e.stopPropagation();
          return;
      }
    }

    // Cmd/Ctrl + Shift + Z — 重做 (macOS)
    if (mod && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.stopPropagation();
      return;
    }

    // ====== Tab 缩进（仅 textarea）======
    if (isTextarea && e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      if (e.shiftKey) {
        // Shift+Tab — 反缩进（删除行首的 2 个空格）
        const value = target.value;
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const linePrefix = value.substring(lineStart, lineStart + 2);
        if (linePrefix === '  ') {
          const newValue = value.substring(0, lineStart) + value.substring(lineStart + 2);
          // 使用 execCommand 以支持撤销栈
          target.focus();
          target.setSelectionRange(lineStart, lineStart + 2);
          document.execCommand('delete');
          target.setSelectionRange(Math.max(lineStart, start - 2), Math.max(lineStart, end - 2));
        }
      } else {
        // Tab — 插入 2 个空格（使用 execCommand 以支持撤销栈）
        target.focus();
        document.execCommand('insertText', false, '  ');
      }
      return;
    }

    // ====== Enter 处理 ======
    if (e.key === 'Enter') {
      // Cmd/Ctrl + Enter — textarea 提交
      if (mod && onCmdEnter) {
        e.preventDefault();
        e.stopPropagation();
        onCmdEnter();
        return;
      }
      // 单行 input — Enter 提交
      if (!isTextarea && onEnter) {
        e.preventDefault();
        e.stopPropagation();
        onEnter();
        return;
      }
    }

    // ====== Escape — 失焦 ======
    if (e.key === 'Escape') {
      e.stopPropagation();
      (e.target as HTMLElement).blur();
      if (onEscape) onEscape();
      return;
    }

    // ====== 普通字符键 — 阻止冒泡，防止全局快捷键拦截 ======
    // 当焦点在文本框中时，单个字母/数字/符号键不应触发全局快捷键（如地图 WASD 移动）
    if (
      !mod && !e.altKey &&
      e.key.length === 1 // 单个字符
    ) {
      e.stopPropagation();
      return;
    }

    // 方向键也在输入框中阻止冒泡
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.stopPropagation();
      return;
    }

    // 退格键和删除键也阻止冒泡
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.stopPropagation();
      return;
    }

    // Home/End 键在输入框中也阻止冒泡
    if (e.key === 'Home' || e.key === 'End') {
      e.stopPropagation();
      return;
    }

  }, [onEnter, onEscape, isTextarea, onCmdEnter]);

  return { onKeyDown: handleKeyDown };
}
