// 文件路径: components/ApiConfigPanel.tsx
// Gemini 原生 API 配置面板（中转模式已下线）
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useApiConfig } from '../contexts/ApiConfigContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { testGeminiConnection, ApiTestResult } from '../services/geminiService';
import { ModelSelector } from './ModelSelector';
import { useTextShortcuts } from './useTextShortcuts';

interface ApiConfigPanelProps {
  onClose: () => void;
}

export const ApiConfigPanel: React.FC<ApiConfigPanelProps> = ({ onClose }) => {
  const { config, saveConfig, isConfigured } = useApiConfig();
  const { isDark } = useTheme();
  const { lang } = useLanguage();

  // Gemini 本地状态
  const [localBaseUrl, setLocalBaseUrl] = useState(config.baseUrl);
  const [localApiKey, setLocalApiKey] = useState(config.apiKey);
  const [localModel, setLocalModel] = useState(config.model);
  const [showKey, setShowKey] = useState(false);

  const [saved, setSaved] = useState(false);
  const inputShortcuts = useTextShortcuts();

  // 连接测试状态
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ApiTestResult | null>(null);

  // 测试 API 连接
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testGeminiConnection(localApiKey.trim(), localBaseUrl.trim(), localModel.trim());
      setTestResult(result);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || '测试失败' });
    } finally {
      setTesting(false);
    }
  };

  // 同步 context 变化
  useEffect(() => {
    setLocalBaseUrl(config.baseUrl);
    setLocalApiKey(config.apiKey);
    setLocalModel(config.model);
  }, [config]);

  const handleSave = async () => {
    await saveConfig({
      baseUrl: localBaseUrl.trim(),
      apiKey: localApiKey.trim(),
      model: localModel.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setLocalBaseUrl('');
    setLocalApiKey('');
    setLocalModel('gemini-3.1-flash-image-preview');
  };

  const isCN = lang === 'CN';

  // 样式变量
  const overlayBg = 'bg-black/70 backdrop-blur-md';
  const panelBg = isDark ? 'bg-[#0A0A0A]' : 'bg-white';
  const borderColor = isDark ? 'border-gray-800' : 'border-gray-300';
  const inputBg = isDark ? 'bg-[#111]' : 'bg-gray-50';
  const inputText = isDark ? 'text-gray-100' : 'text-gray-900';
  const inputBorder = isDark ? 'border-gray-700 focus:border-moke-red' : 'border-gray-300 focus:border-moke-red';
  const labelText = isDark ? 'text-gray-400' : 'text-gray-500';
  const descText = isDark ? 'text-gray-600' : 'text-gray-400';

  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-[9998] flex items-center justify-center ${overlayBg}`} onClick={onClose}>
      <div
        className={`relative w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto ${panelBg} border ${borderColor} rounded-sm shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b ${borderColor} ${panelBg}`}>
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-moke-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h2 className="font-mono text-xs font-bold tracking-[0.2em] uppercase">
              {isCN ? 'API 接口配置' : 'API CONFIGURATION'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-sm border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-300 text-gray-400'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 新增：Tab 切换栏 — 主配置 / 中转站 */}

        {/* ===== 主配置 ===== */}

        {/* 连接状态指示器 */}
        <div className={`mx-6 mt-4 px-4 py-3 rounded-sm border ${isConfigured ? (isDark ? 'border-emerald-900 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50') : (isDark ? 'border-yellow-900 bg-yellow-950/30' : 'border-yellow-200 bg-yellow-50')}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]'} animate-pulse`}></div>
            <span className={`font-mono text-[10px] font-bold tracking-widest uppercase ${isConfigured ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-yellow-400' : 'text-yellow-600')}`}>
              {isConfigured
                ? (isCN ? '已配置 · 就绪' : 'CONFIGURED · READY')
                : (isCN ? '未配置 · 需要 API KEY' : 'NOT CONFIGURED · KEY REQUIRED')}
            </span>
          </div>
        </div>

        {/* ========== Gemini 表单 ========== */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Gemini 官方 API 说明 */}
          <div className={`rounded-sm border px-4 py-3 ${isDark ? 'border-blue-900/50 bg-blue-950/20' : 'border-blue-200 bg-blue-50'}`}>
            <div className="flex items-start gap-2">
              <span className="text-blue-500 text-sm mt-0.5">✦</span>
              <div>
                <p className={`font-mono text-[11px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  {isCN ? 'Gemini 官方 API 直连' : 'Gemini Official API Direct Connection'}
                </p>
                <p className={`font-mono text-[10px] mt-1 leading-relaxed ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {isCN
                    ? '直接连接 Google Gemini 官方 API（generativelanguage.googleapis.com）。仅需填入 API Key 即可使用，BASE URL 留空将自动使用 Google 官方地址。API Key 从 Google AI Studio 免费获取。'
                    : 'Direct connection to Google Gemini API. Just fill in your API Key. Leave BASE URL empty to use the official Google endpoint. Get free API Key from Google AI Studio.'}
                </p>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 mt-1.5 font-mono text-[10px] font-bold transition-colors ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {isCN ? '前往 Google AI Studio 获取 API Key →' : 'Get API Key from Google AI Studio →'}
                </a>
              </div>
            </div>
          </div>

          {/* API Key — 放在最前面，最重要 */}
          <div className="flex flex-col gap-1.5">
            <label className={`font-mono text-[10px] font-bold tracking-[0.15em] uppercase ${labelText}`}>
              API KEY
              <span className="ml-2 text-moke-red">*</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                onKeyDown={inputShortcuts.onKeyDown}
                placeholder={isCN ? '输入你的 Gemini API Key（从 aistudio.google.com 获取）' : 'Enter your Gemini API Key (from aistudio.google.com)'}
                className={`w-full px-4 py-3 pr-12 font-mono text-xs rounded-sm border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-sm transition-colors ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                title={showKey ? (isCN ? '隐藏' : 'Hide') : (isCN ? '显示' : 'Show')}
              >
                {showKey ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className={`font-mono text-[10px] ${descText}`}>
              {isCN ? '从 Google AI Studio 免费获取: aistudio.google.com/apikey' : 'Get free from Google AI Studio: aistudio.google.com/apikey'}
            </p>
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1.5">
            <label className={`font-mono text-[10px] font-bold tracking-[0.15em] uppercase ${labelText}`}>
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
              placeholder={isCN ? '留空 = generativelanguage.googleapis.com（官方地址）' : 'Empty = generativelanguage.googleapis.com (official)'}
              className={`w-full px-4 py-3 font-mono text-xs rounded-sm border outline-none transition-colors ${inputBg} ${inputText} ${inputBorder}`}
            />
            <p className={`font-mono text-[10px] ${descText}`}>
              {isCN ? '默认直连 Google 官方 API，如需代理可填写自定义地址' : 'Direct to Google API by default, fill custom URL for proxy'}
            </p>
          </div>

          {/* Model Selector */}
          <ModelSelector
            selectedModel={localModel || 'gemini-3.1-flash-image-preview'}
            onSelectModel={(modelId) => setLocalModel(modelId)}
          />
        </div>

        {/* 连接测试结果 */}
        {testResult && (
          <div className={`mx-6 mb-2 px-4 py-3 rounded-sm border transition-all ${
            testResult.success
              ? (isDark ? 'border-emerald-800 bg-emerald-950/30' : 'border-emerald-200 bg-emerald-50')
              : (isDark ? 'border-red-900 bg-red-950/30' : 'border-red-200 bg-red-50')
          }`}>
            <div className="flex items-start gap-2">
              {testResult.success ? (
                <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div className="flex-1 min-w-0">
                <p className={`font-mono text-[11px] font-bold ${
                  testResult.success
                    ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                    : (isDark ? 'text-red-400' : 'text-red-700')
                }`}>
                  {testResult.success ? (isCN ? '连接成功' : 'CONNECTION OK') : (isCN ? '连接失败' : 'CONNECTION FAILED')}
                  {testResult.latency !== undefined && (
                    <span className={`ml-2 font-normal ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {testResult.latency}ms
                    </span>
                  )}
                </p>
                <p className={`font-mono text-[10px] mt-0.5 break-all ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {testResult.message}
                </p>
              </div>
              <button
                onClick={() => setTestResult(null)}
                className={`p-0.5 rounded-sm transition-colors flex-shrink-0 ${isDark ? 'text-gray-700 hover:text-gray-400' : 'text-gray-300 hover:text-gray-500'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* 底部操作栏 */}
        <div className={`sticky bottom-0 flex items-center justify-between px-6 py-4 border-t ${borderColor} ${panelBg}`}>
          <div className="flex items-center gap-2">
            <button
                  onClick={handleReset}
                  className={`font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2.5 rounded-sm border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 ${isDark ? 'border-gray-800 text-gray-500' : 'border-gray-300 text-gray-400'}`}
                >
                  {isCN ? '重置' : 'RESET'}
                </button>
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className={`font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2.5 rounded-sm border transition-all active:scale-95 ${
                    testing
                      ? (isDark ? 'border-gray-800 text-gray-700 cursor-wait' : 'border-gray-200 text-gray-300 cursor-wait')
                      : isDark
                        ? 'border-cyan-900 text-cyan-500 hover:border-cyan-600 hover:bg-cyan-950/30'
                        : 'border-cyan-300 text-cyan-600 hover:border-cyan-500 hover:bg-cyan-50'
                  }`}
                >
                  {testing ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isCN ? '测试中...' : 'TESTING...'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {isCN ? '测试连接' : 'TEST'}
                    </span>
                  )}
                </button>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="font-mono text-[10px] font-bold tracking-widest text-emerald-500 animate-pulse">
                {isCN ? '✓ 已保存' : '✓ SAVED'}
              </span>
            )}
            <button
                onClick={handleSave}
                className="font-mono text-[10px] font-bold tracking-widest uppercase px-6 py-2.5 rounded-sm border border-moke-red bg-moke-red text-white transition-all hover:brightness-110 active:scale-95 shadow-lg"
              >
                {isCN ? '保存并启用' : 'SAVE & ACTIVATE'}
              </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
