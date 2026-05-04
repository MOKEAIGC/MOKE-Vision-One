/**
 * ============================================================================
 *  LLM Connection Diagnostics & Retry Utility
 * ----------------------------------------------------------------------------
 *  通用的大语言模型连接失败诊断 + 自动重试工具。
 *
 *  设计目标：
 *    1. 精确识别失败原因（网络超时 / DNS / 认证失败 / 模型不存在 / 限流 /
 *       服务端 5xx / 被安全策略拦截 / 未知错误）。
 *    2. 提供带指数退避 + 抖动的重试机制，可配置最大重试次数和超时时间。
 *    3. 只对「瞬时性错误」重试（网络超时、5xx、429），对「永久性错误」
 *       （401/403/404 模型不存在）直接失败，避免无意义等待。
 *    4. 返回结构化的 LlmConnectionResult，成功/失败都带清晰的 humanMessage。
 *    5. 所有过程日志统一通过 diagLog() 输出，带时间戳和分类 tag，
 *       方便在浏览器控制台 / Electron 日志里定位问题。
 *
 *  使用方法（最简）：
 *
 *      const result = await callLlmWithDiagnostics(
 *        () => ai.models.generateContent({ ... }),
 *        { label: 'image-generation', maxRetries: 2 },
 *      );
 *      if (!result.success) throw new Error(result.humanMessage);
 *      return result.data;
 *
 *  或者只用分类器：
 *
 *      const kind = classifyLlmError(err);
 *      if (kind.category === 'MODEL_NOT_FOUND') { ... }
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// 错误类型分类
// ---------------------------------------------------------------------------

export type LlmErrorCategory =
  | 'NETWORK_TIMEOUT'     // 请求超时（AbortError / timeout）
  | 'NETWORK_OFFLINE'     // DNS / 断网 / fetch failed
  | 'AUTH_FAILED'         // 401 / 403 / invalid api key
  | 'MODEL_NOT_FOUND'     // 404 模型不存在
  | 'RATE_LIMITED'        // 429 限流
  | 'SERVER_ERROR'        // 5xx 服务端异常
  | 'SAFETY_BLOCKED'      // 被安全策略拦截
  | 'BAD_REQUEST'         // 400 参数错误
  | 'UNKNOWN';            // 其他

export interface LlmErrorInfo {
  category: LlmErrorCategory;
  httpStatus: number;      // 0 表示没有 HTTP 状态（如网络层错误）
  rawMessage: string;      // 原始 error.message
  retryable: boolean;      // 是否应该重试
  humanMessage: string;    // 面向用户的中文诊断文本
}

// ---------------------------------------------------------------------------
// 统一日志输出
// ---------------------------------------------------------------------------

const ts = () => new Date().toISOString().split('T')[1].replace('Z', '');

export const diagLog = (
  level: 'info' | 'warn' | 'error',
  label: string,
  ...args: any[]
) => {
  const prefix = `[LLM-DIAG ${ts()}] [${label}]`;
  if (level === 'error')      console.error(prefix, ...args);
  else if (level === 'warn')  console.warn(prefix, ...args);
  else                        console.log(prefix, ...args);
};

// ---------------------------------------------------------------------------
// 错误分类器
// ---------------------------------------------------------------------------

/**
 * 从任意 error/response 中提取 HTTP 状态码。
 * 兼容 @google/genai SDK 抛出的结构化错误（message 里嵌了 JSON）。
 */
const extractHttpStatus = (err: any): number => {
  if (!err) return 0;
  if (typeof err.status === 'number') return err.status;
  if (typeof err.httpStatus === 'number') return err.httpStatus;
  const msg = (err.message || String(err)).toLowerCase();

  // 优先从 message 里解析嵌套 JSON：{"error":{"code":404,...}}
  const codeMatch = msg.match(/"code"\s*:\s*(\d{3})/);
  if (codeMatch) return parseInt(codeMatch[1], 10);

  // 退化：匹配 "HTTP 404" / "status 404" / "got 404" 等
  const httpMatch = msg.match(/\b(4\d{2}|5\d{2})\b/);
  if (httpMatch) return parseInt(httpMatch[1], 10);

  return 0;
};

export const classifyLlmError = (err: any): LlmErrorInfo => {
  const rawMessage = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
  const lower = (rawMessage || '').toLowerCase();
  const httpStatus = extractHttpStatus(err);

  // ========== 1) 网络层错误（无 HTTP 状态） ==========
  if (err?.name === 'AbortError' || lower.includes('timeout') || lower.includes('timed out')) {
    return {
      category: 'NETWORK_TIMEOUT',
      httpStatus: 0,
      rawMessage,
      retryable: true,
      humanMessage: '⏱ 请求超时：模型服务端未在预期时间内响应。可能是网络慢或服务器繁忙，建议稍后重试。',
    };
  }
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('socket hang up')
  ) {
    return {
      category: 'NETWORK_OFFLINE',
      httpStatus: 0,
      rawMessage,
      retryable: true,
      humanMessage: '🌐 网络连接失败：无法到达 API 服务器。请检查：\n  · 本机网络是否正常；\n  · BASE URL 是否拼写正确；\n  · 是否需要科学上网访问 Google 官方 API。',
    };
  }

  // ========== 2) HTTP 错误 ==========
  if (httpStatus === 401 || lower.includes('unauthenticated') || lower.includes('api key not valid')) {
    return {
      category: 'AUTH_FAILED',
      httpStatus: httpStatus || 401,
      rawMessage,
      retryable: false,
      humanMessage: '🔒 认证失败（401）：API Key 无效或未授权。\n请在「API 设置」中重新填写正确的密钥，并确认密钥对应的服务商与 BASE URL 匹配。',
    };
  }
  if (httpStatus === 403 || lower.includes('permission denied') || lower.includes('forbidden')) {
    return {
      category: 'AUTH_FAILED',
      httpStatus: 403,
      rawMessage,
      retryable: false,
      humanMessage: '🚫 权限被拒（403）：密钥合法但无权访问该模型/端点。可能原因：\n  · 密钥未开通该模型的使用权限；\n  · 账户余额不足；\n  · 触发了地域限制。',
    };
  }
  if (
    httpStatus === 404 ||
    lower.includes('is not found') ||
    lower.includes('not_found') ||
    (lower.includes('model') && lower.includes('not found'))
  ) {
    // 尝试从 message 提取模型名
    const modelMatch = rawMessage.match(/models\/([\w.\-:]+)/i);
    const modelName = modelMatch ? modelMatch[1] : '（未知）';
    
    // 中转站和官方支持的模型可能会有差异
    const hint = [
      `❌ 模型「${modelName}」未找到（404）。`,
      '',
      '请在「API 设置」中确认：',
      '  · 模型名是否拼写正确（Google 官方目前支持：gemini-3-flash-preview）；',
      '  · 当前服务商是否支持该模型；',
      '  · BASE URL 是否匹配所选服务商。',
    ].join('\n');

    return {
      category: 'MODEL_NOT_FOUND',
      httpStatus: 404,
      rawMessage,
      retryable: false,
      humanMessage: hint,
    };
  }
  if (httpStatus === 429 || lower.includes('rate limit') || lower.includes('quota')) {
    return {
      category: 'RATE_LIMITED',
      httpStatus: httpStatus || 429,
      rawMessage,
      retryable: true,
      humanMessage: '⏳ 请求频率过高（429）：触发了 API 限流或配额耗尽。将自动等待后重试；如持续失败请降低请求频率或检查账户配额。',
    };
  }
  if (httpStatus >= 500 && httpStatus < 600) {
    return {
      category: 'SERVER_ERROR',
      httpStatus,
      rawMessage,
      retryable: true,
      humanMessage: `🔧 服务端异常（${httpStatus}）：API 服务器暂时故障。将自动重试；如持续失败请稍后再试。`,
    };
  }
  if (httpStatus === 400 || lower.includes('invalid argument')) {
    return {
      category: 'BAD_REQUEST',
      httpStatus: 400,
      rawMessage,
      retryable: false,
      humanMessage: '⚠️ 请求参数错误（400）：模型拒绝了本次请求的参数。请检查提示词长度、图片大小或其他生成参数。',
    };
  }
  if (lower.includes('safety') || lower.includes('blocked') || lower.includes('prohibited_content')) {
    return {
      category: 'SAFETY_BLOCKED',
      httpStatus: httpStatus || 0,
      rawMessage,
      retryable: false,
      humanMessage: '🛡️ 被安全策略拦截：模型判定输入/输出不符合内容安全规则。请调整提示词或参考图后再试。',
    };
  }

  // ========== 3) 兜底 ==========
  return {
    category: 'UNKNOWN',
    httpStatus,
    rawMessage,
    retryable: false,
    humanMessage: `❓ 未知错误：${rawMessage.slice(0, 300)}`,
  };
};

// ---------------------------------------------------------------------------
// 重试执行器
// ---------------------------------------------------------------------------

export interface CallLlmOptions {
  /** 业务标签，用于日志分类（如 "image-generation" / "text-chat"） */
  label: string;
  /** 最大重试次数，默认 2（即总共尝试 3 次） */
  maxRetries?: number;
  /** 单次请求超时时间(ms)，默认 60s，设为 0 关闭 */
  timeoutMs?: number;
  /** 基础退避(ms)，实际退避 = base * 2^(attempt-1) + 随机抖动 */
  backoffBaseMs?: number;
  /** 每次重试前的钩子，可用于 UI 提示 */
  onRetry?: (attempt: number, errorInfo: LlmErrorInfo) => void;
}

export interface LlmConnectionResult<T> {
  success: boolean;
  data?: T;                    // 成功时的返回值
  errorInfo?: LlmErrorInfo;    // 失败时的结构化错误
  humanMessage: string;        // 面向用户的中文提示（成功/失败都有）
  attempts: number;            // 实际尝试次数
  totalMs: number;             // 总耗时
}

/**
 * 为任意返回 Promise 的异步任务添加超时控制。
 */
const withTimeout = <T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  if (!timeoutMs || timeoutMs <= 0) return task;
  return new Promise<T>((resolve, reject) => {
    const tid = setTimeout(() => {
      const err = new Error(`[${label}] request timeout after ${timeoutMs}ms`);
      err.name = 'AbortError';
      reject(err);
    }, timeoutMs);
    task.then(
      (v) => { clearTimeout(tid); resolve(v); },
      (e) => { clearTimeout(tid); reject(e); },
    );
  });
};

/**
 * 核心：带诊断和重试的 LLM 调用包装器。
 *
 * @param task  实际的 LLM 调用函数（通常是 () => ai.models.generateContent(...)）
 * @param opts  配置
 */
export const callLlmWithDiagnostics = async <T>(
  task: () => Promise<T>,
  opts: CallLlmOptions,
): Promise<LlmConnectionResult<T>> => {
  const {
    label,
    maxRetries = 2,
    timeoutMs = 60_000,
    backoffBaseMs = 800,
    onRetry,
  } = opts;

  const start = Date.now();
  let lastErrorInfo: LlmErrorInfo | null = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    diagLog('info', label, `尝试 #${attempt}/${maxRetries + 1} 开始`);
    try {
      const data = await withTimeout(task(), timeoutMs, label);
      const totalMs = Date.now() - start;
      diagLog('info', label, `✅ 成功，耗时 ${totalMs}ms（第 ${attempt} 次尝试）`);
      return {
        success: true,
        data,
        humanMessage: `连接成功（第 ${attempt} 次尝试，耗时 ${totalMs}ms）`,
        attempts: attempt,
        totalMs,
      };
    } catch (err: any) {
      const info = classifyLlmError(err);
      lastErrorInfo = info;
      diagLog('error', label,
        `❌ 尝试 #${attempt} 失败 [${info.category} / HTTP ${info.httpStatus}]`,
        '\n  raw:', info.rawMessage.slice(0, 400),
      );

      // 不可重试 or 已到最后一次 → 直接退出
      if (!info.retryable || attempt > maxRetries) {
        break;
      }

      // 指数退避 + 抖动
      const delay = Math.round(backoffBaseMs * Math.pow(2, attempt - 1) * (0.8 + Math.random() * 0.4));
      diagLog('warn', label, `⏸ ${delay}ms 后重试（原因: ${info.category}）`);
      onRetry?.(attempt, info);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  // 所有尝试都失败
  const totalMs = Date.now() - start;
  const attempts = Math.min(maxRetries + 1, (lastErrorInfo ? maxRetries + 1 : 0));
  const failInfo = lastErrorInfo || classifyLlmError(new Error('unknown failure'));
  diagLog('error', label, `🛑 最终失败，共尝试 ${attempts} 次，耗时 ${totalMs}ms`);
  return {
    success: false,
    errorInfo: failInfo,
    humanMessage: failInfo.humanMessage,
    attempts,
    totalMs,
  };
};
