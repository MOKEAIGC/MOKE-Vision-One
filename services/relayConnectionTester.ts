// 文件路径: services/relayConnectionTester.ts
// 功能说明: 中转站连接测试服务（自包含独立模块）
// -------------------------------------------------------------------
// 作用:
//   - 对 OpenAI 兼容协议的中转站执行多轮异步连通性探测
//   - 返回: 平均/最小/最大延迟、丢包率、抖动 (jitter)、连接状态、单轮明细、质量评级
//   - 采用 AbortController + 超时保护，异步执行不阻塞主线程/数据转发
// -------------------------------------------------------------------
// 设计要点:
//   1. 使用 GET {baseUrl}/models 作为探测端点 — OpenAI 兼容中转站普遍支持，
//      无需 POST，无 token 消耗，最低成本探活
//   2. 多轮串行 + 间隔，避免被中转站速率限制误判
//   3. 单轮失败不中断，记录到 attempts；最终统计聚合
//   4. 通过 onProgress 回调向 UI 实时反馈每轮结果（用于进度条/动画）
// -------------------------------------------------------------------

/** 单轮探测结果 */
export interface RelayPingAttempt {
  /** 第几轮（从 1 开始） */
  index: number;
  /** 是否成功 */
  success: boolean;
  /** 延迟（ms），失败时仍记录到失败时刻 */
  latency: number;
  /** HTTP 状态码（如 200 / 401 / 403 / 0=网络层失败） */
  status: number;
  /** 错误描述（失败时） */
  error?: string;
}

/** 测试聚合结果 */
export interface RelayTestSummary {
  /** 中转站名称（透传，便于 UI 显示） */
  stationName: string;
  /** 测试目标 URL（实际探测的端点） */
  endpoint: string;
  /** 总轮次 */
  total: number;
  /** 成功轮次 */
  successCount: number;
  /** 丢包率 0~1（失败轮次 / 总轮次） */
  packetLoss: number;
  /** 平均延迟（仅统计成功轮次） */
  avgLatency: number;
  /** 最小延迟（成功轮次） */
  minLatency: number;
  /** 最大延迟（成功轮次） */
  maxLatency: number;
  /** 抖动 / 标准差（成功轮次延迟离散度） */
  jitter: number;
  /** 综合评级 */
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'failed';
  /** 评级人类可读文字 */
  ratingLabel: string;
  /** 推荐颜色（用于 UI 展示） */
  ratingColor: string;
  /** 总耗时（ms） */
  totalDurationMs: number;
  /** 全部明细 */
  attempts: RelayPingAttempt[];
  /** 是否被用户中断 */
  aborted: boolean;
}

/** 测试参数 */
export interface RelayTestOptions {
  /** API Base URL (如 https://yunwu.ai/v1) */
  baseUrl: string;
  /** API Key */
  apiKey: string;
  /** 中转站名称（透传） */
  stationName?: string;
  /** 探测轮次（默认 5） */
  rounds?: number;
  /** 单轮超时（默认 8000ms） */
  timeoutMs?: number;
  /** 轮次之间间隔（默认 200ms，让中转站有时间响应） */
  intervalMs?: number;
  /** 进度回调（每完成一轮就触发） */
  onProgress?: (attempt: RelayPingAttempt, doneCount: number, total: number) => void;
  /** 用户中断信号 */
  signal?: AbortSignal;
}

/** 评级映射 */
function computeRating(packetLoss: number, avgLatency: number): {
  rating: RelayTestSummary['rating'];
  label: string;
  color: string;
} {
  if (packetLoss >= 1) return { rating: 'failed', label: '不可达', color: '#EF4444' };
  if (packetLoss >= 0.4) return { rating: 'poor', label: '较差', color: '#F97316' };
  if (packetLoss >= 0.2 || avgLatency > 2000) return { rating: 'fair', label: '一般', color: '#EAB308' };
  if (avgLatency > 800) return { rating: 'good', label: '良好', color: '#22C55E' };
  return { rating: 'excellent', label: '优秀', color: '#10B981' };
}

/** 计算标准差（jitter） */
function calcJitter(latencies: number[]): number {
  if (latencies.length === 0) return 0;
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const variance = latencies.reduce((sum, x) => sum + (x - mean) ** 2, 0) / latencies.length;
  return Math.round(Math.sqrt(variance));
}

/** 拼接探测 URL */
function buildEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  return `${base}/models`;
}

/**
 * 单轮探测：轻量 GET /models
 * - 失败不抛出，统一返回 RelayPingAttempt
 */
async function singlePing(
  endpoint: string,
  apiKey: string,
  index: number,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<RelayPingAttempt> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  // 把外部 signal 也合并进来（任一触发即中止）
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      // OpenAI 兼容中转站 /models 一般不需要请求体
    });
    const latency = Math.round(performance.now() - start);

    // 2xx 视为成功；401/403 也"通"了（认证问题，但网络层 OK）
    // 但用户期望的"成功"应该包含鉴权通过，所以 4xx 仍记录为失败
    if (res.ok) {
      return { index, success: true, latency, status: res.status };
    }
    let errMsg = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      try {
        const j = JSON.parse(text);
        errMsg = j.error?.message || j.message || errMsg;
      } catch {
        if (text && text.length < 200) errMsg = text;
      }
    } catch { /* ignore */ }
    return { index, success: false, latency, status: res.status, error: errMsg };
  } catch (e: any) {
    const latency = Math.round(performance.now() - start);
    if (e.name === 'AbortError') {
      return {
        index,
        success: false,
        latency,
        status: 0,
        error: latency >= timeoutMs - 50 ? `超时 (${timeoutMs}ms)` : '已取消',
      };
    }
    return {
      index,
      success: false,
      latency,
      status: 0,
      error: e?.message || '网络错误',
    };
  } finally {
    window.clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * 异步小睡眠（轮次间隔）
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = window.setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          window.clearTimeout(t);
          resolve();
        },
        { once: true },
      );
    }
  });
}

/**
 * 主入口：对中转站执行多轮连通性测试
 * - 异步执行，不阻塞调用方
 * - 通过 onProgress 实时反馈每轮结果
 * - 返回聚合 RelayTestSummary
 *
 * @example
 *   const ctrl = new AbortController();
 *   const summary = await runRelayConnectionTest({
 *     baseUrl: 'https://yunwu.ai/v1',
 *     apiKey: 'sk-...',
 *     rounds: 5,
 *     onProgress: (att, done, total) => console.log(att, `${done}/${total}`),
 *     signal: ctrl.signal,
 *   });
 *   // 中途取消: ctrl.abort();
 */
export async function runRelayConnectionTest(
  options: RelayTestOptions,
): Promise<RelayTestSummary> {
  const {
    baseUrl,
    apiKey,
    stationName = '中转站',
    rounds = 5,
    timeoutMs = 8000,
    intervalMs = 200,
    onProgress,
    signal,
  } = options;

  const startWall = Date.now();
  const endpoint = buildEndpoint(baseUrl);
  const attempts: RelayPingAttempt[] = [];

  // 入参校验
  if (!baseUrl || !baseUrl.trim()) {
    return summarize(stationName, endpoint, [], startWall, false);
  }

  let aborted = false;
  for (let i = 1; i <= rounds; i++) {
    if (signal?.aborted) {
      aborted = true;
      break;
    }
    const att = await singlePing(endpoint, apiKey || '', i, timeoutMs, signal);
    attempts.push(att);
    try {
      onProgress?.(att, i, rounds);
    } catch (cbErr) {
      console.error('[RelayConnTester] onProgress callback error:', cbErr);
    }
    if (i < rounds) {
      await sleep(intervalMs, signal);
    }
  }
  if (signal?.aborted) aborted = true;

  return summarize(stationName, endpoint, attempts, startWall, aborted);
}

/** 聚合结果 */
function summarize(
  stationName: string,
  endpoint: string,
  attempts: RelayPingAttempt[],
  startWall: number,
  aborted: boolean,
): RelayTestSummary {
  const total = attempts.length || 0;
  const successCount = attempts.filter((a) => a.success).length;
  const packetLoss = total > 0 ? (total - successCount) / total : 1;
  const successLatencies = attempts.filter((a) => a.success).map((a) => a.latency);
  const avgLatency = successLatencies.length
    ? Math.round(successLatencies.reduce((a, b) => a + b, 0) / successLatencies.length)
    : 0;
  const minLatency = successLatencies.length ? Math.min(...successLatencies) : 0;
  const maxLatency = successLatencies.length ? Math.max(...successLatencies) : 0;
  const jitter = calcJitter(successLatencies);
  const { rating, label, color } = computeRating(packetLoss, avgLatency);

  return {
    stationName,
    endpoint,
    total,
    successCount,
    packetLoss,
    avgLatency,
    minLatency,
    maxLatency,
    jitter,
    rating,
    ratingLabel: label,
    ratingColor: color,
    totalDurationMs: Date.now() - startWall,
    attempts,
    aborted,
  };
}
