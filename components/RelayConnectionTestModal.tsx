// 文件路径: components/RelayConnectionTestModal.tsx
// 功能说明: 中转站连接测试结果可视化弹窗（自包含独立组件）
// -------------------------------------------------------------------
// 作用:
//   - 启动多轮异步连通性测试，实时显示进度
//   - 渲染指标卡片：连接状态 / 平均延迟 / 丢包率 / 抖动 / 评级
//   - 渲染延迟条形图：每轮一根条，颜色区分成功/失败
//   - 渲染单轮日志列表
//   - 支持中途取消、测完后重测
// -------------------------------------------------------------------
// 依赖:
//   - services/relayConnectionTester  (纯逻辑，零 UI 耦合)
// -------------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  RelayPingAttempt,
  RelayTestSummary,
  runRelayConnectionTest,
} from '../services/relayConnectionTester';

interface RelayConnectionTestModalProps {
  /** 中转站名称 */
  stationName: string;
  /** API base URL */
  baseUrl: string;
  /** API Key */
  apiKey: string;
  /** 关闭回调 */
  onClose: () => void;
  /** 暗色主题 */
  isDark?: boolean;
  /** 中文环境 */
  isCN?: boolean;
  /** 探测轮次（默认 5） */
  rounds?: number;
}

/**
 * 中转站连接测试弹窗
 */
export const RelayConnectionTestModal: React.FC<RelayConnectionTestModalProps> = ({
  stationName,
  baseUrl,
  apiKey,
  onClose,
  isDark = true,
  isCN = true,
  rounds = 5,
}) => {
  const [attempts, setAttempts] = useState<RelayPingAttempt[]>([]);
  const [summary, setSummary] = useState<RelayTestSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // 主题样式
  const styles = useMemo(() => ({
    overlay: 'bg-black/70 backdrop-blur-md',
    panelBg: isDark ? 'bg-[#0A0A0A]' : 'bg-white',
    border: isDark ? 'border-gray-800' : 'border-gray-300',
    cardBg: isDark ? 'bg-[#111]' : 'bg-gray-50',
    text: isDark ? 'text-gray-200' : 'text-gray-900',
    label: isDark ? 'text-gray-400' : 'text-gray-500',
    desc: isDark ? 'text-gray-600' : 'text-gray-400',
    softBtn: isDark
      ? 'border-gray-800 text-gray-500 hover:border-moke-red hover:text-moke-red'
      : 'border-gray-300 text-gray-500 hover:border-moke-red hover:text-moke-red',
  }), [isDark]);

  /** 启动测试 */
  const startTest = async () => {
    if (running) return;
    setAttempts([]);
    setSummary(null);
    setDoneCount(0);
    setRunning(true);
    abortRef.current = new AbortController();

    try {
      const result = await runRelayConnectionTest({
        baseUrl,
        apiKey,
        stationName,
        rounds,
        timeoutMs: 8000,
        intervalMs: 200,
        signal: abortRef.current.signal,
        onProgress: (att, done) => {
          setAttempts((prev) => [...prev, att]);
          setDoneCount(done);
        },
      });
      setSummary(result);
    } catch (e) {
      console.error('[RelayConnectionTestModal] 测试异常:', e);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  /** 中途取消 */
  const cancelTest = () => {
    abortRef.current?.abort();
  };

  // 自动启动一次
  useEffect(() => {
    startTest();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 进度百分比
  const progressPct = Math.min(100, Math.round((doneCount / rounds) * 100));

  // 即时聚合（测试中也可看到部分指标）
  const liveStats = useMemo(() => {
    const total = attempts.length;
    if (total === 0) return null;
    const success = attempts.filter((a) => a.success);
    const successCount = success.length;
    const loss = (total - successCount) / total;
    const lats = success.map((a) => a.latency);
    const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0;
    return { total, successCount, loss, avg };
  }, [attempts]);

  // 柱状图最大延迟（用于归一化）
  const maxBarLatency = useMemo(() => {
    const maxFromAttempts = Math.max(0, ...attempts.map((a) => a.latency));
    return Math.max(maxFromAttempts, 500); // 至少 500ms 作为参考线
  }, [attempts]);

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 z-[10000] flex items-center justify-center ${styles.overlay}`}
      onClick={onClose}
    >
      <div
        className={`relative w-[640px] max-w-[95vw] max-h-[90vh] overflow-y-auto ${styles.panelBg} border ${styles.border} rounded-sm shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className={`sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b ${styles.border} ${styles.panelBg}`}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className={`w-2 h-2 rounded-full ${running ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.7)]' : summary ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
            </div>
            <h2 className={`font-mono text-xs font-bold tracking-[0.2em] uppercase ${styles.text}`}>
              {isCN ? '连接测试' : 'CONNECTION TEST'}
            </h2>
            <span className={`font-mono text-[10px] ${styles.desc} truncate max-w-[260px]`}>
              · {stationName}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-sm border transition-all hover:border-moke-red hover:text-moke-red active:scale-95 ${styles.softBtn}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* 端点信息 */}
          <div className={`px-3 py-2 rounded-sm border ${styles.border} ${styles.cardBg}`}>
            <p className={`font-mono text-[10px] tracking-widest uppercase ${styles.label}`}>
              {isCN ? '探测端点' : 'PROBE ENDPOINT'}
            </p>
            <p className={`font-mono text-[11px] mt-1 break-all ${styles.text}`}>
              GET {(baseUrl || '').replace(/\/+$/, '')}/models
            </p>
          </div>

          {/* 进度条 + 取消按钮 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`font-mono text-[10px] tracking-widest uppercase ${styles.label}`}>
                {isCN ? '进度' : 'PROGRESS'}
                <span className="ml-2 text-moke-red font-bold">
                  {doneCount}/{rounds}
                </span>
              </span>
              {running && (
                <button
                  onClick={cancelTest}
                  className={`font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-sm border transition-all active:scale-95 ${styles.softBtn}`}
                >
                  {isCN ? '取消' : 'CANCEL'}
                </button>
              )}
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-200'}`}>
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-moke-red transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* 指标卡片网格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatCard
              isDark={isDark}
              label={isCN ? '连接状态' : 'STATUS'}
              value={
                summary
                  ? summary.ratingLabel
                  : running
                    ? (isCN ? '测试中…' : 'TESTING…')
                    : (isCN ? '待开始' : 'IDLE')
              }
              color={summary?.ratingColor}
              accent
            />
            <StatCard
              isDark={isDark}
              label={isCN ? '平均延迟' : 'AVG LATENCY'}
              value={
                summary
                  ? `${summary.avgLatency}ms`
                  : liveStats
                    ? `${liveStats.avg}ms`
                    : '—'
              }
              hint={summary ? `${summary.minLatency}~${summary.maxLatency}ms` : undefined}
            />
            <StatCard
              isDark={isDark}
              label={isCN ? '丢包率' : 'PACKET LOSS'}
              value={
                summary
                  ? `${(summary.packetLoss * 100).toFixed(0)}%`
                  : liveStats
                    ? `${(liveStats.loss * 100).toFixed(0)}%`
                    : '—'
              }
              hint={summary ? `${summary.successCount}/${summary.total}` : undefined}
              color={summary && summary.packetLoss > 0.2 ? '#F97316' : undefined}
            />
            <StatCard
              isDark={isDark}
              label={isCN ? '抖动' : 'JITTER'}
              value={summary ? `${summary.jitter}ms` : '—'}
              hint={isCN ? '延迟标准差' : 'std dev'}
            />
          </div>

          {/* 延迟柱状图 */}
          <div className={`p-3 rounded-sm border ${styles.border} ${styles.cardBg}`}>
            <p className={`font-mono text-[10px] tracking-widest uppercase mb-2 ${styles.label}`}>
              {isCN ? '延迟分布' : 'LATENCY CHART'}
              <span className={`ml-2 font-normal normal-case tracking-normal ${styles.desc}`}>
                ({isCN ? `每根条 = 一轮探测，绿色=成功 / 红色=失败` : 'green=ok, red=fail'})
              </span>
            </p>
            <div className="flex items-end gap-1 h-24">
              {Array.from({ length: rounds }).map((_, i) => {
                const att = attempts[i];
                const isPending = !att && (running || i + 1 > attempts.length);
                const heightPct = att
                  ? Math.max(8, Math.min(100, (att.latency / maxBarLatency) * 100))
                  : 0;
                const barColor = !att
                  ? (isDark ? '#1F2937' : '#E5E7EB')
                  : att.success
                    ? '#10B981'
                    : '#EF4444';
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end gap-1"
                    title={att ? `${att.latency}ms ${att.success ? '成功' : att.error || '失败'}` : ''}
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-500 ${isPending ? 'animate-pulse' : ''}`}
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: barColor,
                        boxShadow: att?.success
                          ? '0 0 8px rgba(16,185,129,0.4)'
                          : att && !att.success
                            ? '0 0 8px rgba(239,68,68,0.4)'
                            : 'none',
                      }}
                    />
                    <span className={`font-mono text-[9px] ${styles.desc}`}>
                      {att ? `${att.latency}` : '·'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 详细日志 */}
          <div>
            <p className={`font-mono text-[10px] tracking-widest uppercase mb-1.5 ${styles.label}`}>
              {isCN ? '探测日志' : 'PROBE LOG'}
            </p>
            <div className={`flex flex-col gap-1 max-h-40 overflow-y-auto p-2 rounded-sm border ${styles.border} ${styles.cardBg}`}>
              {attempts.length === 0 && (
                <p className={`font-mono text-[10px] ${styles.desc}`}>
                  {isCN ? '等待数据…' : 'Waiting for data…'}
                </p>
              )}
              {attempts.map((a) => (
                <div
                  key={a.index}
                  className="flex items-center justify-between font-mono text-[10px] gap-2"
                >
                  <span className={`flex items-center gap-1.5 ${a.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className="font-bold">#{a.index}</span>
                    {a.success ? '✓' : '✗'}
                    <span className={styles.text}>
                      {a.latency}ms
                      {a.status > 0 && <span className={`ml-2 ${styles.desc}`}>HTTP {a.status}</span>}
                    </span>
                  </span>
                  {a.error && (
                    <span className={`truncate text-[9px] ${styles.desc}`}>
                      {a.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 总结提示（完成后） */}
          {summary && (
            <div
              className={`px-3 py-2.5 rounded-sm border-l-2 ${isDark ? 'bg-[#0F0F0F]' : 'bg-gray-50'}`}
              style={{ borderLeftColor: summary.ratingColor }}
            >
              <p className={`font-mono text-[11px] font-bold ${styles.text}`}>
                {summary.aborted
                  ? (isCN ? '测试已取消' : 'Aborted')
                  : summary.rating === 'failed'
                    ? (isCN ? '中转站不可达' : 'Relay station unreachable')
                    : summary.rating === 'excellent'
                      ? (isCN ? '连接优秀，可放心使用' : 'Excellent connection')
                      : summary.rating === 'good'
                        ? (isCN ? '连接良好，正常可用' : 'Good connection')
                        : summary.rating === 'fair'
                          ? (isCN ? '连接一般，可能偶有延迟波动' : 'Fair connection')
                          : (isCN ? '连接较差，建议更换中转或检查网络' : 'Poor connection')}
              </p>
              <p className={`font-mono text-[10px] mt-1 ${styles.desc}`}>
                {isCN
                  ? `耗时 ${summary.totalDurationMs}ms · 成功 ${summary.successCount}/${summary.total} · 平均 ${summary.avgLatency}ms · 抖动 ${summary.jitter}ms`
                  : `${summary.totalDurationMs}ms · ${summary.successCount}/${summary.total} · avg ${summary.avgLatency}ms · jitter ${summary.jitter}ms`}
              </p>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className={`sticky bottom-0 flex items-center justify-end gap-2 px-5 py-3 border-t ${styles.border} ${styles.panelBg}`}>
          <button
            onClick={onClose}
            className={`font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-sm border transition-all active:scale-95 ${styles.softBtn}`}
          >
            {isCN ? '关闭' : 'CLOSE'}
          </button>
          <button
            onClick={startTest}
            disabled={running}
            className={`font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-sm border transition-all active:scale-95 ${
              running
                ? (isDark ? 'border-gray-800 text-gray-700 cursor-wait' : 'border-gray-200 text-gray-300 cursor-wait')
                : 'border-moke-red bg-moke-red text-white hover:brightness-110'
            }`}
          >
            {running ? (isCN ? '测试中…' : 'TESTING…') : (isCN ? '↻ 重新测试' : '↻ RETEST')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

/** 指标卡片（私有） */
const StatCard: React.FC<{
  isDark: boolean;
  label: string;
  value: string;
  hint?: string;
  color?: string;
  accent?: boolean;
}> = ({ isDark, label, value, hint, color, accent }) => (
  <div
    className={`px-3 py-2 rounded-sm border ${
      isDark ? 'border-gray-800 bg-[#111]' : 'border-gray-300 bg-gray-50'
    } ${accent ? 'shadow-[0_0_0_1px_rgba(208,0,0,0.15)]' : ''}`}
  >
    <p
      className={`font-mono text-[9px] tracking-widest uppercase ${
        isDark ? 'text-gray-500' : 'text-gray-500'
      }`}
    >
      {label}
    </p>
    <p
      className="font-mono text-base font-bold mt-0.5 truncate"
      style={{ color: color || (isDark ? '#fff' : '#111') }}
      title={value}
    >
      {value}
    </p>
    {hint && (
      <p className={`font-mono text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        {hint}
      </p>
    )}
  </div>
);

export default RelayConnectionTestModal;
