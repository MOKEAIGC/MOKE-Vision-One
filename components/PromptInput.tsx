// 文件路径: components/PromptInput.tsx
// 带 @ 引用图片功能的提示词输入框
import React, { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTextShortcuts } from './useTextShortcuts';
import { useAutoFitText } from './hooks/useAutoFitText';

export interface AttachedImage {
  id: string;
  base64: string;       // data:image/...;base64,...
  thumbnail: string;    // 同 base64（用于展示缩略图）
  name: string;         // 显示名称，如 @图片1
}

/** PromptInput 暴露给父组件的命令式 API */
export interface PromptInputHandle {
  /** 程序化打开 @ 菜单（供外部按钮触发） */
  openAtMenu: () => void;
  /** 聚焦输入框 */
  focus: () => void;
}

interface PromptInputProps {
  prompt: string;
  setPrompt: (p: string) => void;
  attachedImages: AttachedImage[];
  onAttachedImagesChange: (images: AttachedImage[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 来自 Gallery 的历史图片列表（base64 url） */
  galleryImages?: { id: string; url: string }[];
  /** 是否显示内嵌的 @ 按钮（默认 true；父组件若要自己放外部按钮，可设 false） */
  showInlineAtButton?: boolean;
}

// 用于生成唯一 ID
let _imgCounter = 0;
const nextImgId = () => `@img_${Date.now()}_${++_imgCounter}`;

export const PromptInput = forwardRef<PromptInputHandle, PromptInputProps>(({
  prompt,
  setPrompt,
  attachedImages,
  onAttachedImagesChange,
  placeholder,
  disabled,
  galleryImages,
  showInlineAtButton = true,
}, ref) => {
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const isCN = lang === 'CN';
  const textShortcuts = useTextShortcuts();
  // 输入框改为 textarea，支持多行自适应 + 自动字号缩放
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 根据文本长度自适应字号，确保长文本完整显示
  const autoFit = useAutoFitText(prompt);

  // 当 prompt 从外部（如 PromptBlock 追加）变化时，重新吸附高度
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
  }, [prompt, autoFit.fontSize]);

  // @ 菜单状态
  const [showAtMenu, setShowAtMenu] = useState(false);
  // 从 Gallery 选择子菜单
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);

  const textColor = isDark ? 'text-gray-200' : 'text-gray-900';

  // ==================== @ 菜单逻辑 ====================

  /**
   * 检测输入内容中是否触发了 @ 菜单
   * 规则：光标前最后一个字符是 @，且 @ 前面是空格/开头/中英文标点
   * 兼容中文输入法：不要求 val 必须 endsWith '@'
   */
  const shouldTriggerAtMenu = (val: string, caretPos: number): boolean => {
    if (caretPos <= 0) return false;
    const charBeforeCaret = val[caretPos - 1];
    if (charBeforeCaret !== '@') return false;
    // @ 前一个字符必须是空格、换行、开头、或中英文标点
    if (caretPos === 1) return true;
    const charBeforeAt = val[caretPos - 2];
    return /[\s,，。.、;；:：!！?？]/.test(charBeforeAt);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setPrompt(val);

    const caret = e.target.selectionStart ?? val.length;
    if (shouldTriggerAtMenu(val, caret)) {
      setShowAtMenu(true);
      setShowGalleryPicker(false);
    }
  };

  /**
   * 兜底：监听 keyup 的 @ 键 —— 覆盖中文输入法场景下 onChange 未触发的情况
   * 例如某些输入法在按 Shift+2 后先提交 @ 再清空 composition，onChange 可能不触发
   */
  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '@' || (e.shiftKey && e.key === '2')) {
      // 给一个微小延迟，等 value 更新完
      setTimeout(() => {
        const el = inputRef.current;
        if (!el) return;
        const val = el.value;
        const caret = el.selectionStart ?? val.length;
        if (shouldTriggerAtMenu(val, caret)) {
          setShowAtMenu(true);
          setShowGalleryPicker(false);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 先处理 @ 菜单
    if (showAtMenu) {
      if (e.key === 'Escape') {
        setShowAtMenu(false);
        setShowGalleryPicker(false);
        e.preventDefault();
        return;
      }
    }
    // 然后调用文字快捷键
    textShortcuts.onKeyDown(e as unknown as React.KeyboardEvent<HTMLInputElement>);
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAtMenu(false);
        setShowGalleryPicker(false);
      }
    };
    if (showAtMenu) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [showAtMenu]);

  // 向父组件暴露命令式 API（供外部按钮触发 @ 菜单）
  useImperativeHandle(ref, () => ({
    openAtMenu: () => {
      setShowAtMenu(true);
      setShowGalleryPicker(false);
    },
    focus: () => inputRef.current?.focus(),
  }), []);

  // ==================== 图片添加逻辑 ====================

  /**
   * 清理输入框中最近的那个 @ 触发字符
   * 优先使用光标位置精确删除；兜底使用 endsWith。
   */
  const removeTriggerAt = () => {
    const el = inputRef.current;
    if (el) {
      const val = el.value;
      const caret = el.selectionStart ?? val.length;
      // 光标前一个字符是 @，则删除它
      if (caret > 0 && val[caret - 1] === '@') {
        const next = val.slice(0, caret - 1) + val.slice(caret);
        setPrompt(next);
        // 恢复光标位置
        requestAnimationFrame(() => {
          if (inputRef.current) {
            inputRef.current.selectionStart = caret - 1;
            inputRef.current.selectionEnd = caret - 1;
            inputRef.current.focus();
          }
        });
        return;
      }
    }
    // 兜底：末尾是 @ 就删除
    if (prompt.endsWith('@')) {
      setPrompt(prompt.slice(0, -1));
    }
  };

  // 从文件选择
  const handleFileSelect = () => {
    setShowAtMenu(false);
    setShowGalleryPicker(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const readers: Promise<AttachedImage>[] = [];
    Array.from(files).forEach((file, idx) => {
      readers.push(new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const imgId = nextImgId();
          const displayName = `@图片${attachedImages.length + idx + 1}`;
          resolve({
            id: imgId,
            base64,
            thumbnail: base64,
            name: displayName,
          });
        };
        reader.readAsDataURL(file);
      }));
    });

    Promise.all(readers).then((newImages) => {
      onAttachedImagesChange([...attachedImages, ...newImages]);
      removeTriggerAt();
    });

    if (e.target) e.target.value = '';
  };

  // 从 Gallery 选择
  const handleGallerySelect = (galleryImg: { id: string; url: string }) => {
    const imgId = nextImgId();
    const displayName = `@图片${attachedImages.length + 1}`;
    const newImg: AttachedImage = {
      id: imgId,
      base64: galleryImg.url,
      thumbnail: galleryImg.url,
      name: displayName,
    };
    onAttachedImagesChange([...attachedImages, newImg]);
    removeTriggerAt();
    setShowAtMenu(false);
    setShowGalleryPicker(false);
  };

  // 从剪贴板粘贴
  const handlePaste = useCallback(async () => {
    try {
      const clipItems = await navigator.clipboard.read();
      for (const item of clipItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              const imgId = nextImgId();
              const displayName = `@图片${attachedImages.length + 1}`;
              onAttachedImagesChange([...attachedImages, {
                id: imgId,
                base64,
                thumbnail: base64,
                name: displayName,
              }]);
              removeTriggerAt();
            };
            reader.readAsDataURL(blob);
            setShowAtMenu(false);
            setShowGalleryPicker(false);
            return;
          }
        }
      }
      // 没有图片在剪贴板
      alert(isCN ? '剪贴板中没有图片' : 'No image in clipboard');
    } catch {
      alert(isCN ? '无法读取剪贴板，请检查浏览器权限' : 'Cannot read clipboard, check browser permissions');
    }
  }, [attachedImages, onAttachedImagesChange, prompt, setPrompt, isCN]);

  // 移除附加图片
  const removeImage = (imgId: string) => {
    onAttachedImagesChange(attachedImages.filter(img => img.id !== imgId));
  };

  // ==================== 渲染 ====================

  const menuBg = isDark ? 'bg-[#111] border-gray-700' : 'bg-white border-gray-300';
  const menuHover = isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-100';
  const menuText = isDark ? 'text-gray-300' : 'text-gray-700';
  const menuSubText = isDark ? 'text-gray-600' : 'text-gray-400';

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* 附加图片标签区域 */}
      {attachedImages.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center px-1">
          {attachedImages.map((img) => (
            <div
              key={img.id}
              className={`group flex items-center gap-1.5 px-2 py-1 rounded-sm border transition-colors ${
                isDark
                  ? 'border-gray-700 bg-gray-900 hover:border-moke-red'
                  : 'border-gray-300 bg-gray-100 hover:border-moke-red'
              }`}
            >
              <img
                src={img.thumbnail}
                alt={img.name}
                className="w-6 h-6 rounded-sm object-cover"
              />
              <span className="font-mono text-[10px] font-bold text-moke-red">{img.name}</span>
              <button
                onClick={() => removeImage(img.id)}
                className={`ml-0.5 w-4 h-4 flex items-center justify-center rounded-sm text-[10px] font-bold transition-colors ${
                  isDark
                    ? 'text-gray-600 hover:text-white hover:bg-moke-red'
                    : 'text-gray-400 hover:text-white hover:bg-moke-red'
                }`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入栏 */}
      <div className="relative flex gap-6 items-start w-full">
        <span className="text-moke-red font-mono text-base whitespace-nowrap font-black pt-0.5 shrink-0">CMD_</span>
        {/* 改为 textarea：支持多行、自动扩展高度、字号随文本长度自动缩放 */}
        {/* 确保所有文本内容完整可见，不被截断 */}
        <textarea
          value={prompt}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          disabled={disabled}
          rows={1}
          placeholder={placeholder || (isCN ? '输入画面描述，输入 @ 添加参考图...' : 'Enter prompt, type @ to attach reference...')}
          className={`bg-transparent border-none ${textColor} font-mono font-bold tracking-normal w-full focus:outline-none placeholder-gray-500 resize-none overflow-y-auto scrollbar-thin`}
          style={{
            fontSize: `${autoFit.fontSize}px`,
            lineHeight: autoFit.lineHeight,
            minHeight: '1.6em',
            maxHeight: '260px',
          }}
          // 自适应高度：内容变化时自动吸附到 scrollHeight
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
          }}
          // 合并 ref：赋给 inputRef 并在首次挂载/更新时自动吸附高度
          ref={(el) => {
            (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            if (el) {
              requestAnimationFrame(() => {
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 260)}px`;
              });
            }
          }}
        />

        {/* @ 添加参考图按钮 — 放大+带文字标注，视觉更显眼；可通过 showInlineAtButton=false 隐藏 */}
        {showInlineAtButton && (
        <button
          onClick={() => { setShowAtMenu(!showAtMenu); setShowGalleryPicker(false); }}
          className={`group shrink-0 relative flex items-center gap-2 pl-3 pr-4 py-2.5 rounded-lg border-2 font-mono text-xs font-black tracking-wider uppercase transition-all hover:scale-[1.03] active:scale-[0.97] ${
            attachedImages.length > 0
              ? 'border-moke-red bg-moke-red/15 text-moke-red shadow-[0_0_16px_rgba(208,0,0,0.35)]'
              : isDark
                ? 'border-moke-red/50 bg-moke-red/5 text-moke-red hover:border-moke-red hover:bg-moke-red/20 hover:shadow-[0_0_16px_rgba(208,0,0,0.3)]'
                : 'border-moke-red/60 bg-moke-red/5 text-moke-red hover:border-moke-red hover:bg-moke-red/15 hover:shadow-[0_0_16px_rgba(208,0,0,0.25)]'
          }`}
          title={isCN ? '@ 添加参考图片（支持文件 / 相册 / 剪贴板）' : '@ Attach reference image (File / Gallery / Clipboard)'}
        >
          {/* 放大的图片图标 */}
          <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {/* 高亮文字标注 */}
          <span className="flex items-center gap-1 leading-none">
            <span className="text-sm font-black">@</span>
            <span className="text-[10px] opacity-90">{isCN ? '参考图' : 'REF'}</span>
          </span>
          {/* 数量徽章（已附件时） */}
          {attachedImages.length > 0 && (
            <span className="ml-0.5 bg-moke-red text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-black shadow-md animate-pulse-fast">
              {attachedImages.length}
            </span>
          )}
        </button>
        )}

        {/* 隐藏文件输入 */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />

        {/* @ 下拉菜单 */}
        {showAtMenu && (
          <div
            ref={dropdownRef}
            className={`absolute bottom-full right-0 mb-2 w-56 border rounded-sm shadow-2xl z-50 overflow-hidden ${menuBg}`}
          >
            {!showGalleryPicker ? (
              /* 主菜单 */
              <div className="py-1">
                <div className={`px-3 py-1.5 font-mono text-[9px] font-bold tracking-widest uppercase ${menuSubText}`}>
                  {isCN ? '@ 添加参考图片' : '@ ATTACH REFERENCE'}
                </div>

                {/* 从文件选择 */}
                <button
                  onClick={handleFileSelect}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${menuHover} ${menuText}`}
                >
                  <svg className="w-4 h-4 text-moke-red shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <div>
                    <div className="font-mono text-[11px] font-bold">{isCN ? '从文件选择' : 'Choose File'}</div>
                    <div className={`font-mono text-[9px] ${menuSubText}`}>{isCN ? '支持多选图片' : 'Multiple images'}</div>
                  </div>
                </button>

                {/* 从 Gallery 选择 */}
                {galleryImages && galleryImages.length > 0 && (
                  <button
                    onClick={() => setShowGalleryPicker(true)}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${menuHover} ${menuText}`}
                  >
                    <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <div className="font-mono text-[11px] font-bold">{isCN ? '从相册选择' : 'From Gallery'}</div>
                      <div className={`font-mono text-[9px] ${menuSubText}`}>{isCN ? `${galleryImages.length} 张可用` : `${galleryImages.length} available`}</div>
                    </div>
                    <svg className="w-3 h-3 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {/* 粘贴剪贴板 */}
                <button
                  onClick={handlePaste}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${menuHover} ${menuText}`}
                >
                  <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div>
                    <div className="font-mono text-[11px] font-bold">{isCN ? '粘贴剪贴板图片' : 'Paste from Clipboard'}</div>
                    <div className={`font-mono text-[9px] ${menuSubText}`}>Ctrl+V</div>
                  </div>
                </button>

                {/* 清除全部 */}
                {attachedImages.length > 0 && (
                  <>
                    <div className={`mx-3 h-px ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}></div>
                    <button
                      onClick={() => { onAttachedImagesChange([]); setShowAtMenu(false); }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${menuHover} text-red-500`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="font-mono text-[11px] font-bold">{isCN ? '清除全部参考图' : 'Clear All'} ({attachedImages.length})</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Gallery 选择子菜单 */
              <div className="py-1">
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <button
                    onClick={() => setShowGalleryPicker(false)}
                    className={`font-mono text-[10px] font-bold ${menuText} hover:text-moke-red transition-colors`}
                  >
                    ← {isCN ? '返回' : 'Back'}
                  </button>
                  <span className={`font-mono text-[9px] font-bold tracking-widest uppercase ${menuSubText}`}>
                    {isCN ? '选择相册图片' : 'SELECT FROM GALLERY'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 px-2 pb-2 max-h-48 overflow-y-auto scrollbar-thin">
                  {galleryImages?.map((gImg) => (
                    <button
                      key={gImg.id}
                      onClick={() => handleGallerySelect(gImg)}
                      className="aspect-square overflow-hidden rounded-sm border border-transparent hover:border-moke-red transition-colors"
                    >
                      <img src={gImg.url} alt="gallery" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PromptInput.displayName = 'PromptInput';
