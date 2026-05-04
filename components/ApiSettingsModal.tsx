// 文件路径: components/ApiSettingsModal.tsx
// ============================================================================
// API 设置模态窗口（独立新组件，不影响旧的 ApiConfigPanel.tsx）
// ----------------------------------------------------------------------------
// [REVISION v2] 完全自适应 + 零默认预设
//   1) 不再硬编码任何"默认业务值"（模型名/宽高比/分辨率均从空开始）
//      · Context 里存空字符串表示"未设置"
//      · UI 直接显示"— 未设置 —"而非偷偷帮用户选中 16:9 / 2K
//   2) 完全流体化布局（不依赖固定像素 / 固定断点）
//      · 宽度：clamp(18rem, 92vw, 40rem)
//      · 高度：min(92dvh, 56rem) + overflow-y:auto（dvh 兼容移动端底栏）
//      · 内边距 / 字号 / 间距：全部 clamp(min, fluid, max) 按视口线性缩放
//      · Chip / 按钮：flex-wrap + min-w-[…] 自然换行
//   3) 兼容各种设备：手机竖屏 360px、平板、桌面 1080p、2K、4K、超宽屏
//      · safe-area-inset 适配 iPhone 刘海屏
//      · touch 设备 active:scale-95 提供明确反馈
//
// 持久化：复用 ApiConfigContext（localStorage key: moke_vision_api_config）
// 关闭路径统一 handleCloseWithAutoSave（X / 遮罩 / Esc 自动保存）
// ============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useApiConfig, ApiProvider } from '../contexts/ApiConfigContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { testGeminiConnection, testYunwuConnection, ApiTestResult } from '../services/geminiService';
import { ModelSelector } from './ModelSelector';
import { useTextShortcuts } from './useTextShortcuts';

// ---------------- Types ----------------
interface ApiSettingsModalProps {
  onClose: () => void;
}

// 候选项（仅用于 Chip 渲染 — 注意：不再预选任何一项）
const ASPECT_RATIOS = ['16:9', '1:1', '9:16', '4:3', '3:4'] as const;
const RESOLUTIONS = ['1K', '2K', '4K'] as const;

// 云雾 AI BASE URL 候选（用户可点击快速填充）
const YUNWU_BASE_URLS = [
  'https://yunwu.ai',
  'https://yunwu.ai/v1',
  'https://yunwu.ai/v1/chat/completions',
] as const;

// ---------------- Fluid size tokens（CSS clamp — 一套全量流体 token） ----------------
// 使用内联 style 以便在 Tailwind Play CDN 下稳定解析 clamp()
const FLUID = {
  pad:      'clamp(0.75rem, 2.5vw, 1.5rem)',       // 主内边距
  gapVert:  'clamp(0.875rem, 1.8vw + 0.25rem, 1.5rem)', // 字段纵向间距
  gapSmall: 'clamp(0.375rem, 0.8vw, 0.625rem)',
  radius:   'clamp(0.125rem, 0.3vw, 0.3rem)',
  title:    'clamp(0.6875rem, 0.7vw + 0.5rem, 0.875rem)',    // 标题字号
  label:    'clamp(0.5625rem, 0.25vw + 0.5rem, 0.75rem)',    // Label
  input:    'clamp(0.6875rem, 0.3vw + 0.625rem, 0.8125rem)', // 输入框
  hint:     'clamp(0.5rem, 0.2vw + 0.5rem, 0.6875rem)',      // 提示
  chip:     'clamp(0.5625rem, 0.2vw + 0.5rem, 0.75rem)',
  btn:      'clamp(0.5625rem, 0.22vw + 0.5rem, 0.75rem)',
  inputPadY:'clamp(0.625rem, 0.8vw, 0.875rem)',
  inputPadX:'clamp(0.75rem, 1.2vw, 1rem)',
  iconSm:   'clamp(0.875rem, 0.5vw + 0.75rem, 1.125rem)',
  iconMd:   'clamp(1rem, 0.7vw + 0.8rem, 1.25rem)',
  // 模态容器
  width:    'clamp(18rem, 92vw, 40rem)',
  maxH:     'min(92dvh, 56rem)',
} as const;

// ---------------- Component ----------------
export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ onClose }) => {
  const { config, updateConfig, isConfigured } = useApiConfig();
  const { isDark } = useTheme();
  const { lang } = useLanguage();
  const isCN = lang === 'CN';
  const inputShortcuts = useTextShortcuts();

  // ---------------- 本地受控状态（初始化自 context，不再注入业务默认值） ----------------
  // 当前 Tab：'gemini' = 第一个窗口（官方）；'yunwu' = 第二个窗口（云雾 AI 中转）
  const [activeTab, setActiveTab] = useState<ApiProvider>(config.provider || 'gemini');

  // —— Gemini 官方窗口的本地状态 ——
  const [localBaseUrl, setLocalBaseUrl] = useState(config.baseUrl);
  const [localApiKey, setLocalApiKey] = useState(config.apiKey);
  const [localImageModel, setLocalImageModel] = useState(config.model || '');
  const [localTextModel, setLocalTextModel] = useState(config.textModel || '');
  const [localAspectRatio, setLocalAspectRatio] = useState(config.aspectRatio || '');
  const [localResolution, setLocalResolution] = useState(config.resolution || '');
  const [showKey, setShowKey] = useState(false);

  // —— 云雾 AI 第二窗口的本地状态 ——
  const [yunwuBaseUrl, setYunwuBaseUrl] = useState(config.yunwu?.baseUrl || 'https://yunwu.ai');
  const [yunwuApiKey, setYunwuApiKey] = useState(config.yunwu?.apiKey || '');
  const [yunwuModel, setYunwuModel] = useState(config.yunwu?.model || 'gemini-3.1-flash-image-preview');
  // 端点模式已从 UI 移除：内部固定走 Gemini 协议（/v1beta/models/{model}:generateContent）
  // 仍保留持久化字段以兼容旧数据/底层 testYunwuConnection 签名
  const yunwuEndpointMode = 'gemini' as const;
  const [showYunwuKey, setShowYunwuKey] = useState(false);

  // —— 第三窗口「自定义中转」的本地状态 ——
  const [customName, setCustomName] = useState(config.custom?.name || '');
  const [customBaseUrl, setCustomBaseUrl] = useState(config.custom?.baseUrl || '');
  const [customApiKey, setCustomApiKey] = useState(config.custom?.apiKey || '');
  const [customImageModel, setCustomImageModel] = useState(config.custom?.imageModel || '');
  const [customTextModel, setCustomTextModel] = useState(config.custom?.textModel || '');
  const [showCustomKey, setShowCustomKey] = useState(false);

  // UI 瞬态
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);

  // 关闭路径防重入（Esc + 遮罩可能同帧双触发）
  const closedRef = useRef(false);

  // ---------------- 工具：把本地状态整体写回 context ----------------
  // 两个窗口各自字段独立持久化；同时把当前激活 Tab 作为 provider 写回，
  // Context 会依据 provider 把对应字段注入底层 service 运行时。
  const commitToContext = () => {
    updateConfig({
      provider: activeTab,
      baseUrl: localBaseUrl.trim(),
      apiKey: localApiKey.trim(),
      // [CHANGED] 不再硬编码兜底字符串，用户未填就是空
      model: localImageModel.trim(),
      textModel: localTextModel.trim(),
      aspectRatio: localAspectRatio,
      resolution: localResolution,
      yunwu: {
        baseUrl: yunwuBaseUrl.trim(),
        apiKey: yunwuApiKey.trim(),
        model: yunwuModel.trim(),
        endpointMode: yunwuEndpointMode,
      },
      custom: {
        name: customName.trim(),
        baseUrl: customBaseUrl.trim(),
        apiKey: customApiKey.trim(),
        imageModel: customImageModel.trim(),
        textModel: customTextModel.trim(),
      },
    });
  };

  // 关闭即保存（X / 遮罩 / Esc 统一入口，防重入）
  const handleCloseWithAutoSave = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    commitToContext();
    onClose();
  };

  // 显式保存：写回 + 高亮提示 2s（不关闭）
  const handleSave = () => {
    commitToContext();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  // 取消：丢弃修改直接关闭
  const handleCancel = () => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose();
  };

  // 清空：当前 Tab 所有字段回到"未设置"状态（仅重置本地草稿，不落盘）
  const handleReset = () => {
    if (activeTab === 'yunwu') {
      setYunwuBaseUrl('https://yunwu.ai');
      setYunwuApiKey('');
      setYunwuModel('gemini-3.1-flash-image-preview');
    } else if (activeTab === 'custom') {
      setCustomName('');
      setCustomBaseUrl('');
      setCustomApiKey('');
      setCustomImageModel('');
      setCustomTextModel('');
    } else {
      setLocalBaseUrl('');
      setLocalApiKey('');
      setLocalImageModel('');
      setLocalTextModel('');
      setLocalAspectRatio('');
      setLocalResolution('');
    }
    setTestResult(null);
  };

  // 测试连接 —— 根据当前 Tab 路由到对应 tester
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      let result: ApiTestResult;
      if (activeTab === 'yunwu') {
        result = await testYunwuConnection(
          yunwuApiKey.trim(),
          yunwuBaseUrl.trim(),
          yunwuModel.trim(),
          yunwuEndpointMode,
        );
      } else if (activeTab === 'custom') {
        // 自定义中转站同样走 Gemini 协议，复用 testYunwuConnection
        result = await testYunwuConnection(
          customApiKey.trim(),
          customBaseUrl.trim(),
          (customImageModel.trim() || customTextModel.trim()),
          'gemini',
        );
      } else {
        result = await testGeminiConnection(
          localApiKey.trim(),
          localBaseUrl.trim(),
          localImageModel.trim(),
        );
      }
      setTestResult(result);
    } catch (e: any) {
      console.error('[ApiSettingsModal] test connection failed:', String(e?.message || e).slice(0, 300));
      setTestResult({ success: false, message: e?.message || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  // ---------------- Effects ----------------
  // 监听 Esc 关闭（走自动保存路径）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseWithAutoSave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    localBaseUrl, localApiKey, localImageModel, localTextModel, localAspectRatio, localResolution,
    yunwuBaseUrl, yunwuApiKey, yunwuModel,
    customName, customBaseUrl, customApiKey, customImageModel, customTextModel,
    activeTab,
  ]);

  // 外部 config 变化 → 回填本地（不注入默认值）
  useEffect(() => {
    setLocalBaseUrl(config.baseUrl);
    setLocalApiKey(config.apiKey);
    setLocalImageModel(config.model || '');
    setLocalTextModel(config.textModel || '');
    setLocalAspectRatio(config.aspectRatio || '');
    setLocalResolution(config.resolution || '');
    setYunwuBaseUrl(config.yunwu?.baseUrl || 'https://yunwu.ai');
    setYunwuApiKey(config.yunwu?.apiKey || '');
    setYunwuModel(config.yunwu?.model || 'gemini-3.1-flash-image-preview');
    setCustomName(config.custom?.name || '');
    setCustomBaseUrl(config.custom?.baseUrl || '');
    setCustomApiKey(config.custom?.apiKey || '');
    setCustomImageModel(config.custom?.imageModel || '');
    setCustomTextModel(config.custom?.textModel || '');
  }, [config]);

  // ---------------- 校验（非阻塞，按 Tab 区分） ----------------
  const validation = useMemo(() => {
    if (activeTab === 'yunwu') {
      const apiKeyWarn = !yunwuApiKey.trim()
        ? (isCN ? '云雾 API Key 为空，保存后仍可继续填写' : 'Yunwu API Key is empty; you can still save')
        : '';
      const url = yunwuBaseUrl.trim();
      const baseUrlError = url && !/^https?:\/\//i.test(url)
        ? (isCN ? '请以 http:// 或 https:// 开头' : 'Must start with http:// or https://')
        : '';
      return { apiKeyWarn, baseUrlError };
    }
    if (activeTab === 'custom') {
      const apiKeyWarn = !customApiKey.trim()
        ? (isCN ? 'API Key 为空，保存后仍可继续填写' : 'API Key is empty; you can still save')
        : '';
      const url = customBaseUrl.trim();
      const baseUrlError = !url
        ? (isCN ? '请填写中转站 BASE URL' : 'BASE URL is required')
        : !/^https?:\/\//i.test(url)
          ? (isCN ? '请以 http:// 或 https:// 开头' : 'Must start with http:// or https://')
          : '';
      return { apiKeyWarn, baseUrlError };
    }
    const apiKeyWarn = !localApiKey.trim()
      ? (isCN ? 'API Key 为空，保存后仍可继续填写' : 'API Key is empty; you can still save and fill later')
      : '';
    const url = localBaseUrl.trim();
    const baseUrlError = url && !/^https?:\/\//i.test(url)
      ? (isCN ? '请以 http:// 或 https:// 开头' : 'Must start with http:// or https://')
      : '';
    return { apiKeyWarn, baseUrlError };
  }, [activeTab, localApiKey, localBaseUrl, yunwuApiKey, yunwuBaseUrl, customApiKey, customBaseUrl, isCN]);

  // ---------------- 主题 token ----------------
  const panelBg = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-300';
  const inputBg = isDark ? 'bg-[#111]' : 'bg-gray-50';
  const inputText = isDark ? 'text-gray-100' : 'text-gray-900';
  const inputBorder = isDark
    ? 'border-gray-700 focus:border-moke-red'
    : 'border-gray-300 focus:border-moke-red';
  const labelText = isDark ? 'text-gray-400' : 'text-gray-500';
  const descText = isDark ? 'text-gray-600' : 'text-gray-400';

  // 流体 Chip 样式（不固定 padding，改 clamp）
  const chipStyle: React.CSSProperties = {
    padding: `clamp(0.375rem, 0.7vw, 0.625rem) clamp(0.625rem, 1.2vw, 1rem)`,
    fontSize: FLUID.chip,
    borderRadius: FLUID.radius,
    minWidth: 'clamp(3rem, 6vw, 4.5rem)',
  };
  const chipClass = (active: boolean) =>
    [
      'font-mono font-bold tracking-widest uppercase border transition-all active:scale-95 cursor-pointer text-center',
      active
        ? 'border-moke-red text-moke-red bg-moke-red/10 shadow-[0_0_8px_rgba(225,6,0,0.15)]'
        : isDark
          ? 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
          : 'border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600',
    ].join(' ');

  // 流体输入框 style
  const fluidInputStyle: React.CSSProperties = {
    padding: `${FLUID.inputPadY} ${FLUID.inputPadX}`,
    fontSize: FLUID.input,
    borderRadius: FLUID.radius,
  };
  const fluidLabelStyle: React.CSSProperties = {
    fontSize: FLUID.label,
    letterSpacing: '0.15em',
  };
  const fluidHintStyle: React.CSSProperties = { fontSize: FLUID.hint };

  // 流体按钮 style
  const fluidBtnStyle: React.CSSProperties = {
    padding: `clamp(0.5rem, 1vw, 0.75rem) clamp(0.875rem, 2vw, 1.5rem)`,
    fontSize: FLUID.btn,
    borderRadius: FLUID.radius,
  };

  // ---------------- Render ----------------
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={handleCloseWithAutoSave}
      style={{
        // 自适应内边距：小屏几乎贴边；大屏留白
        padding: 'clamp(0.25rem, 2vw, 1.5rem)',
        // iOS 刘海屏 safe area
        paddingTop: 'max(clamp(0.25rem, 2vw, 1.5rem), env(safe-area-inset-top))',
        paddingBottom: 'max(clamp(0.25rem, 2vw, 1.5rem), env(safe-area-inset-bottom))',
      }}
    >
      <div
        className={`relative overflow-y-auto ${panelBg} border ${borderColor} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: FLUID.width,
          maxWidth: '100%',
          maxHeight: FLUID.maxH,
          borderRadius: FLUID.radius,
        }}
      >
        {/* ================= 顶部标题栏（sticky） ================= */}
        <div
          className={`sticky top-0 z-10 flex items-center justify-between border-b ${borderColor} ${panelBg}`}
          style={{ padding: `clamp(0.75rem, 1.2vw, 1rem) ${FLUID.pad}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <svg
              className="text-moke-red shrink-0"
              style={{ width: FLUID.iconSm, height: FLUID.iconSm }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2
              className={`font-mono font-bold uppercase truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}
              style={{ fontSize: FLUID.title, letterSpacing: '0.2em' }}
            >
              {isCN ? 'API 接口设置' : 'API SETTINGS'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCloseWithAutoSave}
            className={`rounded-sm border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 cursor-pointer ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-300 text-gray-400'}`}
            style={{ padding: 'clamp(0.25rem, 0.6vw, 0.5rem)' }}
            title={isCN ? '关闭（自动保存）' : 'Close (auto-save)'}
          >
            <svg style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ================= Tab 切换栏（双窗口入口） ================= */}
        <div
          className={`flex items-stretch border-b ${borderColor}`}
          style={{ padding: `0 ${FLUID.pad}` }}
          role="tablist"
          aria-label={isCN ? 'API 服务商' : 'API Provider'}
        >
          {([
            { key: 'gemini' as ApiProvider, label: isCN ? 'Gemini 官方' : 'GEMINI OFFICIAL', sub: 'aistudio.google.com' },
            { key: 'yunwu' as ApiProvider, label: isCN ? '云雾 AI 中转' : 'YUNWU RELAY', sub: 'yunwu.ai' },
            { key: 'custom' as ApiProvider, label: isCN ? '自定义中转' : 'CUSTOM RELAY', sub: isCN ? '任意 Gemini 兼容站点' : 'any Gemini-compat site' },
          ]).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => { setActiveTab(tab.key); setTestResult(null); }}
                className={`relative font-mono font-bold uppercase tracking-widest transition-all cursor-pointer flex flex-col items-start ${
                  active
                    ? 'text-moke-red'
                    : isDark
                      ? 'text-gray-500 hover:text-gray-300'
                      : 'text-gray-400 hover:text-gray-600'
                }`}
                style={{
                  padding: `clamp(0.625rem, 1vw, 0.875rem) clamp(0.75rem, 1.4vw, 1.25rem)`,
                  fontSize: FLUID.label,
                  letterSpacing: '0.18em',
                  marginRight: 'clamp(0.25rem, 0.6vw, 0.5rem)',
                }}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-normal normal-case tracking-normal ${descText}`}
                  style={{ fontSize: FLUID.hint, marginTop: '0.125rem' }}
                >
                  {tab.sub}
                </span>
                {/* 底部高亮条 */}
                <span
                  className={`absolute left-0 right-0 bottom-[-1px] h-[2px] transition-all ${
                    active ? 'bg-moke-red' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* ================= 连接状态条 ================= */}
        <div
          className={`border ${
            isConfigured
              ? (isDark ? 'border-emerald-900 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50')
              : (isDark ? 'border-yellow-900 bg-yellow-950/30' : 'border-yellow-200 bg-yellow-50')
          }`}
          style={{
            margin: `clamp(0.75rem, 1.2vw, 1rem) ${FLUID.pad} 0`,
            padding: `clamp(0.5rem, 1vw, 0.75rem) clamp(0.75rem, 1.2vw, 1rem)`,
            borderRadius: FLUID.radius,
          }}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              isConfigured
                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                : 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]'
            }`} />
            <span
              className={`font-mono font-bold uppercase ${
                isConfigured
                  ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                  : (isDark ? 'text-yellow-400' : 'text-yellow-600')
              }`}
              style={{ fontSize: FLUID.label, letterSpacing: '0.15em' }}
            >
              {isConfigured
                ? (isCN ? '已配置 · 就绪' : 'CONFIGURED · READY')
                : (isCN ? '未配置 · 需要 API KEY' : 'NOT CONFIGURED · KEY REQUIRED')}
            </span>
          </div>
        </div>

        {/* ================= 核心表单（流体布局） ================= */}
        {activeTab === 'gemini' && (
        <div
          className="flex flex-col"
          style={{
            padding: `clamp(1rem, 1.8vw, 1.5rem) ${FLUID.pad}`,
            gap: FLUID.gapVert,
          }}
        >
          {/* API KEY */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              API KEY
              <span className="ml-2 text-moke-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                onKeyDown={inputShortcuts.onKeyDown}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={isCN ? '输入你的 Gemini API Key（从 aistudio.google.com 获取）' : 'Enter your Gemini API Key (from aistudio.google.com)'}
                className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
                style={{ ...fluidInputStyle, paddingRight: 'clamp(2.25rem, 4vw, 3rem)' }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className={`absolute right-[clamp(0.5rem,1vw,0.75rem)] top-1/2 -translate-y-1/2 rounded-sm transition-colors cursor-pointer ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                style={{ padding: 'clamp(0.125rem, 0.4vw, 0.25rem)' }}
                title={showKey ? (isCN ? '隐藏' : 'Hide') : (isCN ? '显示' : 'Show')}
              >
                {showKey ? (
                  <svg style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {validation.apiKeyWarn ? (
              <p className="font-mono text-yellow-500" style={fluidHintStyle}>⚠ {validation.apiKeyWarn}</p>
            ) : (
              <p className={`font-mono ${descText}`} style={fluidHintStyle}>
                {isCN ? '从 Google AI Studio 免费获取: aistudio.google.com/apikey' : 'Get free from Google AI Studio: aistudio.google.com/apikey'}
              </p>
            )}
          </div>

          {/* BASE URL */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              BASE URL
              <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                ({isCN ? '可选，留空即为 Google 官方地址' : 'Optional, leave empty for Google official'})
              </span>
            </label>
            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              onKeyDown={inputShortcuts.onKeyDown}
              spellCheck={false}
              placeholder={isCN ? '留空 = generativelanguage.googleapis.com（官方）' : 'Empty = generativelanguage.googleapis.com (official)'}
              className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${
                validation.baseUrlError ? 'border-red-500 focus:border-red-500' : inputBorder
              }`}
              style={fluidInputStyle}
            />
            {validation.baseUrlError ? (
              <p className="font-mono text-red-500" style={fluidHintStyle}>✕ {validation.baseUrlError}</p>
            ) : (
              <p className={`font-mono ${descText}`} style={fluidHintStyle}>
                {isCN ? '默认直连 Google 官方 API，如需代理可填写自定义地址' : 'Direct to Google API by default, fill custom URL for proxy'}
              </p>
            )}
          </div>

          {/* 图像模型（复用 ModelSelector；未选中时传空串而非默认值） */}
          <ModelSelector
            selectedModel={localImageModel}
            onSelectModel={(id) => setLocalImageModel(id)}
          />

          {/* 文本模型 */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              {isCN ? '文本模型' : 'TEXT MODEL'}
              <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                ({isCN ? '用于聊天 / 提示词增强' : 'for chat / prompt enhance'})
              </span>
            </label>
            <input
              type="text"
              value={localTextModel}
              onChange={(e) => setLocalTextModel(e.target.value)}
              onKeyDown={inputShortcuts.onKeyDown}
              spellCheck={false}
              placeholder={isCN ? '未设置 — 例如 gemini-3-flash-preview' : 'Unset — e.g. gemini-3-flash-preview'}
              className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
              style={fluidInputStyle}
            />
          </div>

          {/* 宽高比 — 无预选，允许 "清除" 回到未设置 */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
                {isCN ? '宽高比' : 'ASPECT RATIO'}
                {!localAspectRatio && (
                  <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                    — {isCN ? '未设置' : 'UNSET'}
                  </span>
                )}
              </label>
              {localAspectRatio && (
                <button
                  type="button"
                  onClick={() => setLocalAspectRatio('')}
                  className={`font-mono uppercase transition-colors cursor-pointer ${isDark ? 'text-gray-600 hover:text-moke-red' : 'text-gray-400 hover:text-moke-red'}`}
                  style={{ fontSize: FLUID.hint, letterSpacing: '0.15em' }}
                >
                  {isCN ? '× 清除' : '× CLEAR'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap" style={{ gap: FLUID.gapSmall }}>
              {ASPECT_RATIOS.map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => setLocalAspectRatio(ar)}
                  className={chipClass(localAspectRatio === ar)}
                  style={chipStyle}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* 分辨率 — 无预选 */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
                {isCN ? '分辨率' : 'RESOLUTION'}
                {!localResolution && (
                  <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                    — {isCN ? '未设置' : 'UNSET'}
                  </span>
                )}
              </label>
              {localResolution && (
                <button
                  type="button"
                  onClick={() => setLocalResolution('')}
                  className={`font-mono uppercase transition-colors cursor-pointer ${isDark ? 'text-gray-600 hover:text-moke-red' : 'text-gray-400 hover:text-moke-red'}`}
                  style={{ fontSize: FLUID.hint, letterSpacing: '0.15em' }}
                >
                  {isCN ? '× 清除' : '× CLEAR'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap" style={{ gap: FLUID.gapSmall }}>
              {RESOLUTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setLocalResolution(r)}
                  className={chipClass(localResolution === r)}
                  style={chipStyle}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}

        {/* ================= 第二窗口：云雾 AI 中转配置 ================= */}
        {activeTab === 'yunwu' && (
        <div
          className="flex flex-col"
          style={{
            padding: `clamp(1rem, 1.8vw, 1.5rem) ${FLUID.pad}`,
            gap: FLUID.gapVert,
          }}
        >
          {/* 引导说明 */}
          <div
            className={`border ${isDark ? 'border-cyan-900/60 bg-cyan-950/20' : 'border-cyan-200 bg-cyan-50'}`}
            style={{ padding: `clamp(0.625rem, 1.1vw, 0.875rem)`, borderRadius: FLUID.radius }}
          >
            <p
              className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}
              style={{ fontSize: FLUID.label, letterSpacing: '0.12em' }}
            >
              ✦ {isCN ? '云雾 AI 中转 · 配置步骤' : 'YUNWU AI RELAY · STEPS'}
            </p>
            <ol
              className={`font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
              style={{ fontSize: FLUID.hint, marginTop: '0.375rem', paddingLeft: '1.1rem', listStyleType: 'decimal', lineHeight: 1.7 }}
            >
              <li>{isCN ? '登录后台 → 「令牌」页 → 「添加令牌」获取 API Key' : 'Login backend → Token page → Add token'}</li>
              <li>{isCN ? '选择 BASE URL（不同客户端建议依次尝试）' : 'Pick BASE URL (try them in order)'}</li>
              <li>{isCN ? '从首页「支持模型」列表第一列复制模型名称' : 'Copy model name from "Supported Models" list'}</li>
            </ol>
            <a
              href="https://yunwu.ai"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 font-mono font-bold transition-colors ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-500'}`}
              style={{ fontSize: FLUID.hint, marginTop: '0.5rem', letterSpacing: '0.05em' }}
            >
              <svg style={{ width: '0.75rem', height: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {isCN ? '前往 yunwu.ai 控制台 →' : 'Open yunwu.ai console →'}
            </a>
          </div>

          {/* 云雾 API KEY */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              {isCN ? '云雾 API KEY（令牌）' : 'YUNWU API KEY (TOKEN)'}
              <span className="ml-2 text-moke-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showYunwuKey ? 'text' : 'password'}
                value={yunwuApiKey}
                onChange={(e) => setYunwuApiKey(e.target.value)}
                onKeyDown={inputShortcuts.onKeyDown}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={isCN ? '从「令牌」页生成的 API Key' : 'API key from Tokens page'}
                className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
                style={{ ...fluidInputStyle, paddingRight: 'clamp(2.25rem, 4vw, 3rem)' }}
              />
              <button
                type="button"
                onClick={() => setShowYunwuKey(!showYunwuKey)}
                className={`absolute right-[clamp(0.5rem,1vw,0.75rem)] top-1/2 -translate-y-1/2 rounded-sm transition-colors cursor-pointer ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                style={{ padding: 'clamp(0.125rem, 0.4vw, 0.25rem)' }}
                title={showYunwuKey ? (isCN ? '隐藏' : 'Hide') : (isCN ? '显示' : 'Show')}
              >
                {showYunwuKey ? (
                  <svg style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {validation.apiKeyWarn ? (
              <p className="font-mono text-yellow-500" style={fluidHintStyle}>⚠ {validation.apiKeyWarn}</p>
            ) : (
              <p className={`font-mono ${descText}`} style={fluidHintStyle}>
                {isCN ? '从「令牌」页面点击「添加令牌」获取' : 'Generate from "Tokens" page'}
              </p>
            )}
          </div>

          {/* BASE URL + 三选一快速填充 */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              BASE URL
              <span className="ml-2 text-moke-red">*</span>
              <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                ({isCN ? '不同客户端建议依次尝试' : 'try in order if one fails'})
              </span>
            </label>
            <input
              type="text"
              value={yunwuBaseUrl}
              onChange={(e) => setYunwuBaseUrl(e.target.value)}
              onKeyDown={inputShortcuts.onKeyDown}
              spellCheck={false}
              placeholder="https://yunwu.ai"
              className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${
                validation.baseUrlError ? 'border-red-500 focus:border-red-500' : inputBorder
              }`}
              style={fluidInputStyle}
            />
            {/* 三个候选 chip */}
            <div className="flex flex-wrap" style={{ gap: FLUID.gapSmall, marginTop: '0.125rem' }}>
              {YUNWU_BASE_URLS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setYunwuBaseUrl(u)}
                  className={chipClass(yunwuBaseUrl.trim() === u)}
                  style={{ ...chipStyle, minWidth: 'auto', textTransform: 'none' }}
                >
                  {u.replace('https://', '')}
                </button>
              ))}
            </div>
            {validation.baseUrlError ? (
              <p className="font-mono text-red-500" style={fluidHintStyle}>✕ {validation.baseUrlError}</p>
            ) : (
              <p className={`font-mono ${descText}`} style={fluidHintStyle}>
                {isCN ? '点击上方候选可快速填充；保存时会自动归一化路径' : 'Click a chip to fill; path is normalized on save'}
              </p>
            )}
          </div>

          {/* 模型名称 */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              {isCN ? '模型名称' : 'MODEL'}
              <span className="ml-2 text-moke-red">*</span>
              <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                ({isCN ? '首页「支持模型」列表第一列' : 'first column of supported models'})
              </span>
            </label>
            <input
              type="text"
              value={yunwuModel}
              onChange={(e) => setYunwuModel(e.target.value)}
              onKeyDown={inputShortcuts.onKeyDown}
              spellCheck={false}
              placeholder="gemini-3.1-flash-image-preview"
              className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
              style={fluidInputStyle}
            />
            <p className={`font-mono ${descText}`} style={fluidHintStyle}>
              {isCN ? '请填写云雾后台「支持模型」列表中第一列的模型名（如 gemini-3.1-flash-image-preview）' : 'Use the model name from the first column of supported models'}
            </p>
          </div>

          {/* 配置示例 */}
          <details className={`border ${borderColor} rounded-sm`} style={{ padding: `clamp(0.5rem, 1vw, 0.75rem)` }}>
            <summary
              className={`font-mono font-bold uppercase cursor-pointer ${labelText}`}
              style={{ fontSize: FLUID.label, letterSpacing: '0.15em' }}
            >
              {isCN ? '查看配置示例 JSON' : 'View example JSON'}
            </summary>
            <pre
              className={`font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'} whitespace-pre-wrap break-all`}
              style={{ fontSize: FLUID.hint, marginTop: '0.5rem', lineHeight: 1.6 }}
            >
{`{
  "base_url": "${yunwuBaseUrl || 'https://yunwu.ai'}",
  "api_key": "${yunwuApiKey ? '***' + yunwuApiKey.slice(-4) : 'your_token_here'}",
  "model": "${yunwuModel || 'selected_model_name'}"
}`}
            </pre>
          </details>
        </div>
        )}

        {/* ================= 第三窗口：自定义中转配置 ================= */}
        {activeTab === 'custom' && (
        <div
          className="flex flex-col"
          style={{
            padding: `clamp(1rem, 1.8vw, 1.5rem) ${FLUID.pad}`,
            gap: FLUID.gapVert,
          }}
        >
          {/* 引导说明 */}
          <div
            className={`border ${isDark ? 'border-purple-900/60 bg-purple-950/20' : 'border-purple-200 bg-purple-50'}`}
            style={{ padding: `clamp(0.625rem, 1.1vw, 0.875rem)`, borderRadius: FLUID.radius }}
          >
            <p
              className={`font-mono font-bold ${isDark ? 'text-purple-400' : 'text-purple-700'}`}
              style={{ fontSize: FLUID.label, letterSpacing: '0.12em' }}
            >
              ✦ {isCN ? '自定义中转 · 使用说明' : 'CUSTOM RELAY · GUIDE'}
            </p>
            <ol
              className={`font-mono ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
              style={{ fontSize: FLUID.hint, marginTop: '0.375rem', paddingLeft: '1.1rem', listStyleType: 'decimal', lineHeight: 1.7 }}
            >
              <li>{isCN ? '适用于任意 Gemini 兼容的第三方中转/自建站点' : 'For any Gemini-compatible third-party relay or self-hosted site'}</li>
              <li>{isCN ? '必须支持 /v1beta/models/{model}:generateContent 端点' : 'Must support /v1beta/models/{model}:generateContent'}</li>
              <li>{isCN ? '图像 / 文本模型可分别指定；留空则使用官方推荐兜底模型' : 'Image / text models can be set separately; fallback to official defaults if empty'}</li>
            </ol>
          </div>

          {/* 站点名称（仅展示用） */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              {isCN ? '站点名称' : 'SITE NAME'}
              <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                ({isCN ? '可选 · 仅用于显示' : 'optional · display only'})
              </span>
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={inputShortcuts.onKeyDown}
              spellCheck={false}
              placeholder={isCN ? '例如：我的中转站' : 'e.g. My Relay'}
              className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
              style={fluidInputStyle}
            />
          </div>

          {/* BASE URL */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              BASE URL
              <span className="ml-2 text-moke-red">*</span>
            </label>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              onKeyDown={inputShortcuts.onKeyDown}
              spellCheck={false}
              placeholder="https://your-relay.example.com"
              className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${
                validation.baseUrlError ? 'border-red-500 focus:border-red-500' : inputBorder
              }`}
              style={fluidInputStyle}
            />
            {validation.baseUrlError ? (
              <p className="font-mono text-red-500" style={fluidHintStyle}>✕ {validation.baseUrlError}</p>
            ) : (
              <p className={`font-mono ${descText}`} style={fluidHintStyle}>
                {isCN ? '填写中转站根域名；保存时会自动去除 /v1、/v1beta、/v1/chat/completions 等常见后缀' : 'Enter the root origin; /v1, /v1beta, /v1/chat/completions suffixes are auto-stripped'}
              </p>
            )}
          </div>

          {/* API KEY */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              API KEY
              <span className="ml-2 text-moke-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showCustomKey ? 'text' : 'password'}
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                onKeyDown={inputShortcuts.onKeyDown}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={isCN ? '输入中转站提供的 API Key' : 'Enter API key from your relay'}
                className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
                style={{ ...fluidInputStyle, paddingRight: 'clamp(2.25rem, 4vw, 3rem)' }}
              />
              <button
                type="button"
                onClick={() => setShowCustomKey(!showCustomKey)}
                className={`absolute right-[clamp(0.5rem,1vw,0.75rem)] top-1/2 -translate-y-1/2 rounded-sm transition-colors cursor-pointer ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                style={{ padding: 'clamp(0.125rem, 0.4vw, 0.25rem)' }}
                title={showCustomKey ? (isCN ? '隐藏' : 'Hide') : (isCN ? '显示' : 'Show')}
              >
                {showCustomKey ? (
                  <svg style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {validation.apiKeyWarn && (
              <p className="font-mono text-yellow-500" style={fluidHintStyle}>⚠ {validation.apiKeyWarn}</p>
            )}
          </div>

          {/* 图像模型 */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              {isCN ? '图像模型' : 'IMAGE MODEL'}
              <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                ({isCN ? '图像生成 / 卫星 / Seedance 等图像类功能' : 'image generation tasks'})
              </span>
            </label>
            <input
              type="text"
              value={customImageModel}
              onChange={(e) => setCustomImageModel(e.target.value)}
              onKeyDown={inputShortcuts.onKeyDown}
              spellCheck={false}
              placeholder={isCN ? '留空 = gemini-3-flash-preview' : 'Empty = gemini-3-flash-preview'}
              className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
              style={fluidInputStyle}
            />
          </div>

          {/* 文本模型 */}
          <div className="flex flex-col" style={{ gap: FLUID.gapSmall }}>
            <label className={`font-mono font-bold uppercase ${labelText}`} style={fluidLabelStyle}>
              {isCN ? '文本模型' : 'TEXT MODEL'}
              <span className={`ml-2 font-normal normal-case tracking-normal ${descText}`}>
                ({isCN ? '聊天 / 提示词增强' : 'for chat / prompt enhance'})
              </span>
            </label>
            <input
              type="text"
              value={customTextModel}
              onChange={(e) => setCustomTextModel(e.target.value)}
              onKeyDown={inputShortcuts.onKeyDown}
              spellCheck={false}
              placeholder={isCN ? '留空 = gemini-3-flash-preview' : 'Empty = gemini-3-flash-preview'}
              className={`w-full font-mono border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
              style={fluidInputStyle}
            />
          </div>

          {/* 配置示例 JSON */}
          <details className={`border ${borderColor} rounded-sm`} style={{ padding: `clamp(0.5rem, 1vw, 0.75rem)` }}>
            <summary
              className={`font-mono font-bold uppercase cursor-pointer ${labelText}`}
              style={{ fontSize: FLUID.label, letterSpacing: '0.15em' }}
            >
              {isCN ? '查看配置示例 JSON' : 'View example JSON'}
            </summary>
            <pre
              className={`font-mono ${isDark ? 'text-gray-400' : 'text-gray-600'} whitespace-pre-wrap break-all`}
              style={{ fontSize: FLUID.hint, marginTop: '0.5rem', lineHeight: 1.6 }}
            >
{`{
  "name": "${customName || 'My Relay'}",
  "base_url": "${customBaseUrl || 'https://your-relay.example.com'}",
  "api_key": "${customApiKey ? '***' + customApiKey.slice(-4) : 'your_api_key'}",
  "image_model": "${customImageModel || 'gemini-3-flash-preview'}",
  "text_model": "${customTextModel || 'gemini-3-flash-preview'}"
}`}
            </pre>
          </details>
        </div>
        )}

        {/* ================= 连接测试结果卡 ================= */}
        {testResult && (
          <div
            className={`border transition-all ${
              testResult.success
                ? (isDark ? 'border-emerald-800 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50')
                : (isDark ? 'border-red-900 bg-red-950/30' : 'border-red-200 bg-red-50')
            }`}
            style={{
              margin: `0 ${FLUID.pad} clamp(0.375rem, 0.8vw, 0.625rem)`,
              padding: `clamp(0.5rem, 1vw, 0.75rem) clamp(0.75rem, 1.2vw, 1rem)`,
              borderRadius: FLUID.radius,
            }}
          >
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <svg className="text-emerald-500 mt-0.5 flex-shrink-0" style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="text-red-500 mt-0.5 flex-shrink-0" style={{ width: FLUID.iconSm, height: FLUID.iconSm }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-mono font-bold ${
                    testResult.success
                      ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                      : (isDark ? 'text-red-400' : 'text-red-700')
                  }`}
                  style={{ fontSize: FLUID.label }}
                >
                  {testResult.success
                    ? (isCN ? '连接成功' : 'CONNECTION OK')
                    : (isCN ? '连接失败' : 'CONNECTION FAILED')}
                  {testResult.latency !== undefined && (
                    <span className={`ml-2 font-normal ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {testResult.latency}ms
                    </span>
                  )}
                </p>
                <p className={`font-mono break-all ${isDark ? 'text-gray-500' : 'text-gray-500'}`} style={{ fontSize: FLUID.hint, marginTop: '0.125rem' }}>
                  {testResult.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className={`rounded-sm transition-colors flex-shrink-0 cursor-pointer ${isDark ? 'text-gray-700 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}`}
                style={{ padding: 'clamp(0.0625rem, 0.2vw, 0.125rem)' }}
              >
                <svg style={{ width: 'clamp(0.75rem, 0.4vw + 0.625rem, 1rem)', height: 'clamp(0.75rem, 0.4vw + 0.625rem, 1rem)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ================= 底部操作栏（sticky） ================= */}
        <div
          className={`sticky bottom-0 flex flex-wrap items-center justify-between border-t ${borderColor} ${panelBg}`}
          style={{
            padding: `clamp(0.625rem, 1.2vw, 1rem) ${FLUID.pad}`,
            gap: FLUID.gapSmall,
          }}
        >
          <div className="flex items-center flex-wrap" style={{ gap: FLUID.gapSmall }}>
            <button
              type="button"
              onClick={handleReset}
              className={`font-mono font-bold tracking-widest uppercase border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 cursor-pointer ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-300 text-gray-400'}`}
              style={fluidBtnStyle}
              title={isCN ? '清空所有字段（不保存）' : 'Clear all (no save)'}
            >
              {isCN ? '清空' : 'CLEAR'}
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className={`font-mono font-bold tracking-widest uppercase border transition-all active:scale-95 ${
                testing
                  ? (isDark ? 'border-gray-800 text-gray-700 cursor-wait' : 'border-gray-200 text-gray-300 cursor-wait')
                  : `cursor-pointer ${isDark
                      ? 'border-cyan-900 text-cyan-500 hover:border-cyan-600 hover:bg-cyan-950/30'
                      : 'border-cyan-300 text-cyan-600 hover:border-cyan-500 hover:bg-cyan-50'}`
              }`}
              style={fluidBtnStyle}
            >
              {testing ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin" style={{ width: 'clamp(0.625rem, 0.3vw + 0.5rem, 0.875rem)', height: 'clamp(0.625rem, 0.3vw + 0.5rem, 0.875rem)' }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isCN ? '测试中...' : 'TESTING...'}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg style={{ width: 'clamp(0.625rem, 0.3vw + 0.5rem, 0.875rem)', height: 'clamp(0.625rem, 0.3vw + 0.5rem, 0.875rem)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {isCN ? '测试连接' : 'TEST'}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center flex-wrap" style={{ gap: FLUID.gapSmall }}>
            {saved && (
              <span
                className="font-mono font-bold tracking-widest text-emerald-500 animate-pulse"
                style={{ fontSize: FLUID.hint }}
              >
                {isCN ? '✓ 已保存' : '✓ SAVED'}
              </span>
            )}
            <button
              type="button"
              onClick={handleCancel}
              className={`font-mono font-bold tracking-widest uppercase border transition-all active:scale-95 cursor-pointer ${isDark ? 'border-gray-800 text-gray-500 hover:text-gray-300' : 'border-gray-300 text-gray-400 hover:text-gray-600'}`}
              style={fluidBtnStyle}
              title={isCN ? '取消并关闭（丢弃未保存修改）' : 'Cancel & close (discard unsaved changes)'}
            >
              {isCN ? '取消' : 'CANCEL'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="font-mono font-bold tracking-widest uppercase border border-moke-red bg-moke-red text-white transition-all hover:brightness-110 active:scale-95 shadow-lg cursor-pointer"
              style={{
                ...fluidBtnStyle,
                padding: `clamp(0.5rem, 1vw, 0.75rem) clamp(1rem, 2.4vw, 1.75rem)`,
              }}
            >
              {isCN ? '保存并启用' : 'SAVE & ACTIVATE'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ApiSettingsModal;
