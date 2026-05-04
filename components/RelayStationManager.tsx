// 文件路径: components/RelayStationManager.tsx
// 功能说明: API 中转站管理面板（自包含独立组件）
// -------------------------------------------------------------------
// 作用:
//   - 列表展示所有中转站（含内置云雾）
//   - 添加 / 编辑 / 删除（内置条目可重置不可删除）
//   - "应用到当前 API"按钮 —— 一键把选中条目的 baseUrl/apiKey/model 写入 ApiConfigContext
//   - 完全自包含：不修改 ApiConfigContext，仅通过 onApply 回调与父级通信
// -------------------------------------------------------------------
// 设计:
//   - 视觉风格延续 ApiConfigPanel（黑底 + moke-red 强调 + font-mono 工业风）
//   - 单卡片可展开/折叠，避免一屏太挤
//   - "Chat 接口"字段在用户输入 baseUrl 时自动建议补全（仅建议，不强制）
// -------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from 'react';
import {
  RelayStation,
  loadRelayStations,
  saveRelayStations,
  loadActiveStationId,
  saveActiveStationId,
  createBlankStation,
  addStation,
  updateStation,
  removeStation,
  isValidUrl,
  deriveChatEndpoint,
} from '../services/relayStationService';
// 连接测试弹窗（自包含独立模块）
import { RelayConnectionTestModal } from './RelayConnectionTestModal';

interface RelayStationManagerProps {
  /** 暗色主题 */
  isDark?: boolean;
  /** 中文环境 */
  isCN?: boolean;
  /**
   * 应用一条中转站到当前 API 配置
   * 父组件实现：调用 ApiConfigContext.updateConfig({ baseUrl, apiKey, model, textModel })
   * - model: 图片模式模型（用于图像生成等）
   * - textModel: 文本模式模型（用于聊天对话等）
   */
  onApply?: (payload: {
    baseUrl: string;
    apiKey: string;
    model: string;
    textModel: string;
    name: string;
  }) => void;
}

/**
 * 中转站管理面板
 */
export const RelayStationManager: React.FC<RelayStationManagerProps> = ({
  isDark = true,
  isCN = true,
  onApply,
}) => {
  const [stations, setStations] = useState<RelayStation[]>(() => loadRelayStations());
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveStationId());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [appliedToast, setAppliedToast] = useState<string | null>(null);
  // 当前正在打开测试弹窗的中转站（null 表示未打开）
  const [testingStation, setTestingStation] = useState<RelayStation | null>(null);

  // 任何变化都同步到 localStorage
  useEffect(() => {
    saveRelayStations(stations);
  }, [stations]);

  useEffect(() => {
    saveActiveStationId(activeId);
  }, [activeId]);

  // 主题样式（与 ApiConfigPanel 对齐）
  const styles = useMemo(() => ({
    panelBg: isDark ? 'bg-[#0F0F0F]' : 'bg-gray-50',
    cardBg: isDark ? 'bg-[#0A0A0A]' : 'bg-white',
    border: isDark ? 'border-gray-800' : 'border-gray-300',
    inputBg: isDark ? 'bg-[#111]' : 'bg-white',
    inputBorder: isDark ? 'border-gray-700 focus:border-moke-red' : 'border-gray-300 focus:border-moke-red',
    inputText: isDark ? 'text-gray-100' : 'text-gray-900',
    label: isDark ? 'text-gray-400' : 'text-gray-500',
    desc: isDark ? 'text-gray-600' : 'text-gray-400',
    softBtn: isDark
      ? 'border-gray-800 text-gray-500 hover:border-moke-red hover:text-moke-red'
      : 'border-gray-300 text-gray-500 hover:border-moke-red hover:text-moke-red',
  }), [isDark]);

  /** 添加新中转站（默认展开新增项） */
  const handleAdd = () => {
    const blank = createBlankStation();
    setStations(addStation(stations, blank));
    setExpandedId(blank.id);
  };

  /** 删除（含 builtin 重置） */
  const handleRemove = (id: string) => {
    const target = stations.find((s) => s.id === id);
    if (!target) return;
    const isBuiltin = !!target.builtin;
    const confirmMsg = isBuiltin
      ? (isCN ? `重置内置中转站【${target.name}】到出厂状态？\n（API Key 与备注会被清除）` : `Reset built-in station【${target.name}】?`)
      : (isCN ? `确认删除中转站【${target.name || '未命名'}】？` : `Delete station【${target.name || 'Untitled'}】?`);
    if (!window.confirm(confirmMsg)) return;
    setStations(removeStation(stations, id));
    if (activeId === id) setActiveId(null);
  };

  /** 字段更新 */
  const patch = (id: string, p: Partial<RelayStation>) => {
    setStations(updateStation(stations, id, p));
  };

  /** 应用到当前 API 配置 */
  const handleApply = (s: RelayStation) => {
    if (!isValidUrl(s.baseUrl)) {
      window.alert(isCN ? `API 基地址无效，请检查格式（必须为 http/https）` : `Invalid base URL`);
      return;
    }
    if (!s.apiKey || s.apiKey.trim().length === 0) {
      const ok = window.confirm(
        isCN
          ? '当前条目尚未填写 API Key，应用后将清空主配置 Key，是否继续？'
          : 'No API Key set. Applying will clear current key. Continue?',
      );
      if (!ok) return;
    }
    onApply?.({
      baseUrl: s.baseUrl.trim().replace(/\/+$/, ''),
      apiKey: s.apiKey.trim(),
      model: (s.imageModel || '').trim() || 'gemini-3.1-flash-image-preview',
      textModel: (s.textModel || '').trim() || 'gemini-3-flash-preview',
      name: s.name || '未命名',
    });
    setActiveId(s.id);
    setAppliedToast(s.name || '中转站');
    window.setTimeout(() => setAppliedToast(null), 2400);
  };

  /** 切换 key 显示 */
  const toggleShowKey = (id: string) => {
    setShowKeyMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-sm border ${styles.border} ${styles.panelBg}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-moke-red shadow-[0_0_8px_#D00000] animate-pulse"></span>
          <h3 className={`font-mono text-[11px] font-bold tracking-[0.2em] uppercase ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {isCN ? 'API 中转站管理' : 'RELAY STATIONS'}
          </h3>
          <span className={`font-mono text-[10px] ${styles.desc}`}>
            ({stations.length})
          </span>
        </div>
        <button
          onClick={handleAdd}
          className={`font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-sm border transition-all active:scale-95 ${styles.softBtn}`}
          title={isCN ? '新增中转站' : 'Add new'}
        >
          + {isCN ? '新增' : 'ADD'}
        </button>
      </div>

      <p className={`font-mono text-[10px] leading-relaxed ${styles.desc}`}>
        {isCN
          ? '应用一条中转站后，其 API 基地址、Key、默认模型会写入主配置，所有功能（图像 / 聊天 / 导演 / 卫星 / Seedance）自动接入该中转。'
          : 'Applying a station writes its baseUrl/key/model into main config; all features will route through it.'}
      </p>

      {/* 应用成功提示 */}
      {appliedToast && (
        <div className={`px-3 py-2 rounded-sm border ${isDark ? 'border-emerald-800 bg-emerald-950/30 text-emerald-400' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          <span className="font-mono text-[10px] font-bold tracking-widest">
            ✓ {isCN ? `已应用：${appliedToast} → 主配置已同步` : `APPLIED: ${appliedToast}`}
          </span>
        </div>
      )}

      {/* 列表 */}
      <div className="flex flex-col gap-2">
        {stations.map((s) => {
          const expanded = expandedId === s.id;
          const isActive = activeId === s.id;
          const isShowKey = !!showKeyMap[s.id];

          return (
            <div
              key={s.id}
              className={`rounded-sm border transition-colors ${
                isActive
                  ? 'border-moke-red shadow-[0_0_0_1px_rgba(208,0,0,0.3),0_0_12px_rgba(208,0,0,0.15)]'
                  : styles.border
              } ${styles.cardBg}`}
            >
              {/* 卡片头：始终可见 */}
              <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  {/* 展开图标 */}
                  <svg
                    className={`w-3 h-3 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''} ${isDark ? 'text-gray-600' : 'text-gray-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className={`font-mono text-xs font-bold truncate ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                    {s.name || (isCN ? '（未命名）' : '(Untitled)')}
                  </span>
                  {s.builtin && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm bg-moke-red/15 text-moke-red border border-moke-red/30 tracking-widest">
                      {isCN ? '内置' : 'BUILT-IN'}
                    </span>
                  )}
                  {isActive && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 tracking-widest">
                      {isCN ? '使用中' : 'ACTIVE'}
                    </span>
                  )}
                  <span className={`font-mono text-[10px] truncate ${styles.desc}`}>
                    {s.baseUrl}
                  </span>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* 测试按钮：打开连接测试弹窗（异步多轮探测） */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isValidUrl(s.baseUrl)) {
                        window.alert(
                          isCN
                            ? 'API 基地址无效，请先填写正确的 baseUrl'
                            : 'Invalid base URL',
                        );
                        return;
                      }
                      setTestingStation(s);
                    }}
                    className={`flex items-center gap-1 font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border transition-all active:scale-95 ${
                      isDark
                        ? 'border-cyan-900 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-950/30'
                        : 'border-cyan-300 text-cyan-600 hover:border-cyan-500 hover:bg-cyan-50'
                    }`}
                    title={isCN ? '测试与该中转站的连通性' : 'Test connection'}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {isCN ? '测试' : 'TEST'}
                  </button>

                  <button
                    onClick={() => handleApply(s)}
                    className="font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-sm border border-moke-red text-moke-red hover:bg-moke-red hover:text-white transition-all active:scale-95"
                    title={isCN ? '应用此中转站到主配置' : 'Apply to main config'}
                  >
                    {isCN ? '应用' : 'APPLY'}
                  </button>
                  {/* 内置条目不显示删除按钮（不能删除）；只为自定义条目保留删除按钮 */}
                  {!s.builtin && (
                    <button
                      onClick={() => handleRemove(s.id)}
                      className={`p-1.5 rounded-sm border transition-all hover:border-red-500 hover:text-red-500 active:scale-95 ${styles.softBtn}`}
                      title={isCN ? '删除' : 'Delete'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                      </svg>
                    </button>
                  )}
                  {/* 内置条目用锁图标占位，悬停提示"内置不可删除" */}
                  {s.builtin && (
                    <div
                      className={`p-1.5 rounded-sm border ${styles.border} ${isDark ? 'text-gray-700' : 'text-gray-300'} cursor-not-allowed`}
                      title={isCN ? '内置中转站，不可删除' : 'Built-in, cannot be deleted'}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* 展开后的编辑表单 */}
              {expanded && (
                <div className={`flex flex-col gap-3 px-3 pb-3 border-t ${styles.border}`}>
                  {/* 名称 */}
                  <Field label={isCN ? '名称' : 'NAME'} styles={styles}>
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => patch(s.id, { name: e.target.value })}
                      placeholder={isCN ? '例如：云雾' : 'e.g. YunWu'}
                      className={`w-full px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${styles.inputBg} ${styles.inputText} ${styles.inputBorder}`}
                    />
                  </Field>

                  {/* 主页 */}
                  <Field label={isCN ? '主页' : 'HOMEPAGE'} styles={styles}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={s.homepage}
                        onChange={(e) => patch(s.id, { homepage: e.target.value })}
                        placeholder="https://..."
                        className={`flex-1 px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${styles.inputBg} ${styles.inputText} ${styles.inputBorder}`}
                      />
                      {isValidUrl(s.homepage) && (
                        <a
                          href={s.homepage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1 px-3 py-2 rounded-sm border font-mono text-[10px] font-bold tracking-widest transition-all ${styles.softBtn}`}
                          title={isCN ? '打开主页' : 'Open homepage'}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {isCN ? '打开' : 'OPEN'}
                        </a>
                      )}
                    </div>
                  </Field>

                  {/* API 基地址 */}
                  <Field label={isCN ? 'API 基地址 (BASE URL)' : 'BASE URL'} styles={styles} required>
                    <input
                      type="text"
                      value={s.baseUrl}
                      onChange={(e) => {
                        const next = e.target.value;
                        const auto = !s.chatEndpoint || s.chatEndpoint === deriveChatEndpoint(s.baseUrl);
                        patch(s.id, {
                          baseUrl: next,
                          // 仅在用户没自定义 chatEndpoint 时联动更新
                          ...(auto ? { chatEndpoint: deriveChatEndpoint(next) } : {}),
                        });
                      }}
                      placeholder="https://yunwu.ai/v1"
                      className={`w-full px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${styles.inputBg} ${styles.inputText} ${styles.inputBorder}`}
                    />
                    <p className={`font-mono text-[10px] mt-1 ${styles.desc}`}>
                      {isCN ? '应用后写入主配置 baseUrl，自动作用于所有 API 调用' : 'Applied to main config baseUrl'}
                    </p>
                  </Field>

                  {/* Chat 接口 */}
                  <Field label={isCN ? 'Chat 接口（OpenAI 兼容）' : 'CHAT ENDPOINT'} styles={styles}>
                    <input
                      type="text"
                      value={s.chatEndpoint}
                      onChange={(e) => patch(s.id, { chatEndpoint: e.target.value })}
                      placeholder="https://yunwu.ai/v1/chat/completions"
                      className={`w-full px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${styles.inputBg} ${styles.inputText} ${styles.inputBorder}`}
                    />
                    <p className={`font-mono text-[10px] mt-1 ${styles.desc}`}>
                      {isCN ? '展示用途；本应用通过 baseUrl 自动派生 Chat 路径' : 'Display only; chat path derived from baseUrl'}
                    </p>
                  </Field>

                  {/* 默认模型：图片模式 + 文本模式 双字段 */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-[10px] font-bold tracking-[0.15em] uppercase ${styles.label}`}>
                        {isCN ? '默认模型' : 'DEFAULT MODELS'}
                      </span>
                      <span className={`font-mono text-[10px] ${styles.desc}`}>
                        {isCN ? '· 应用后双模型分别绑定到图像与文本通道' : '· Applied to image / text channels separately'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 图片模式 */}
                      <div className="flex flex-col gap-1">
                        <label className={`flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.15em] uppercase ${styles.label}`}>
                          <svg className="w-3 h-3 text-moke-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {isCN ? '图片模式' : 'IMAGE MODE'}
                        </label>
                        <input
                          type="text"
                          value={s.imageModel}
                          onChange={(e) => patch(s.id, { imageModel: e.target.value })}
                          placeholder="gemini-3.1-flash-image-preview"
                          className={`w-full px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${styles.inputBg} ${styles.inputText} ${styles.inputBorder}`}
                        />
                        <p className={`font-mono text-[9px] mt-0.5 ${styles.desc}`}>
                          {isCN ? '用于：图像生成 / 卫星 / Seedance / 导演' : 'Image / Satellite / Seedance / Director'}
                        </p>
                      </div>

                      {/* 文本模式 */}
                      <div className="flex flex-col gap-1">
                        <label className={`flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.15em] uppercase ${styles.label}`}>
                          <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {isCN ? '文本模式' : 'TEXT MODE'}
                        </label>
                        <input
                          type="text"
                          value={s.textModel}
                          onChange={(e) => patch(s.id, { textModel: e.target.value })}
                          placeholder="gemini-3-flash-preview"
                          className={`w-full px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${styles.inputBg} ${styles.inputText} ${styles.inputBorder}`}
                        />
                        <p className={`font-mono text-[9px] mt-0.5 ${styles.desc}`}>
                          {isCN ? '用于：AI 对话 / 提示词增强' : 'Chat / Prompt enhance'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* API Key */}
                  <Field label={isCN ? 'API KEY' : 'API KEY'} styles={styles} required>
                    <div className="relative">
                      <input
                        type={isShowKey ? 'text' : 'password'}
                        value={s.apiKey}
                        onChange={(e) => patch(s.id, { apiKey: e.target.value })}
                        placeholder={isCN ? '在该中转站获取的 API Key' : 'Your API Key from this relay'}
                        className={`w-full pr-10 px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${styles.inputBg} ${styles.inputText} ${styles.inputBorder}`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowKey(s.id)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm transition-colors ${isDark ? 'text-gray-600 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isShowKey ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          ) : (
                            <>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </>
                          )}
                        </svg>
                      </button>
                    </div>
                  </Field>

                  {/* 备注 */}
                  <Field label={isCN ? '备注' : 'NOTE'} styles={styles}>
                    <input
                      type="text"
                      value={s.note || ''}
                      onChange={(e) => patch(s.id, { note: e.target.value })}
                      placeholder={isCN ? '可选 · 标识用途/账号等' : 'Optional'}
                      className={`w-full px-3 py-2 font-mono text-xs rounded-sm border outline-none transition-colors ${styles.inputBg} ${styles.inputText} ${styles.inputBorder}`}
                    />
                  </Field>

                  {/* 卡片底部操作 */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* 内置条目可重置到出厂；自定义条目无此按钮 */}
                    {s.builtin ? (
                      <button
                        onClick={() => handleRemove(s.id)}
                        className={`flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-2 rounded-sm border transition-all active:scale-95 ${styles.softBtn}`}
                        title={isCN ? '清空 API Key 并恢复出厂值' : 'Reset to factory defaults'}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isCN ? '重置出厂' : 'RESET'}
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={() => handleApply(s)}
                      className="font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-sm border border-moke-red bg-moke-red text-white hover:brightness-110 transition-all active:scale-95"
                    >
                      {isCN ? '应用并保存' : 'APPLY & SAVE'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 连接测试弹窗（受控渲染，关闭即卸载，停止后台请求） */}
      {testingStation && (
        <RelayConnectionTestModal
          stationName={testingStation.name || (isCN ? '未命名' : 'Untitled')}
          baseUrl={testingStation.baseUrl}
          apiKey={testingStation.apiKey}
          isDark={isDark}
          isCN={isCN}
          rounds={5}
          onClose={() => setTestingStation(null)}
        />
      )}
    </div>
  );
};

/** 表单字段包装组件（私有） */
const Field: React.FC<{
  label: string;
  required?: boolean;
  styles: { label: string };
  children: React.ReactNode;
}> = ({ label, required, styles, children }) => (
  <div className="flex flex-col gap-1">
    <label className={`font-mono text-[10px] font-bold tracking-[0.15em] uppercase ${styles.label}`}>
      {label}
      {required && <span className="ml-1.5 text-moke-red">*</span>}
    </label>
    {children}
  </div>
);

export default RelayStationManager;
