// 文件路径: components/IntroExitTransition.tsx
// 功能说明: IntroPage 退出过渡协调器（自包含独立模块）
// -------------------------------------------------------------------
// 作用:
//   1. 解决"进入 Vision One 界面后 Logo 延时消失"的卡顿问题
//   2. 通过两阶段切换：
//      阶段 A（立即）：CSS opacity 淡出 + pointer-events:none 立即禁用交互
//      阶段 B（下一帧后）：等浏览器完成下层 QuantumCamera 首次布局/绘制，
//                         再真正切换 showIntro state，避免"下层还没画上层就走了"
//   3. 提供统一的淡出/淡入样式 helper，外部容器直接用即可
// -------------------------------------------------------------------
// 不修改任何现有代码；不引入第三方依赖；零副作用纯函数 hook。
// -------------------------------------------------------------------

import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * 统一的 IntroPage 内视频选择器
 * 用 DOM 查询避免对 IntroPage 组件做侵入性改动
 */
const INTRO_VIDEO_SELECTOR = '.fixed.inset-0.bg-black video';

/**
 * 暂停 IntroPage 内部的所有视频（退出时释放 GPU 解码线程）
 */
function pauseIntroVideos(): void {
  try {
    const videos = document.querySelectorAll<HTMLVideoElement>(
      INTRO_VIDEO_SELECTOR,
    );
    videos.forEach((v) => {
      try {
        v.pause();
      } catch (_) {
        /* 静默忽略单个 video 的异常 */
      }
    });
  } catch (_) {
    /* DOM 查询异常不影响主流程 */
  }
}

/**
 * 恢复 IntroPage 内部所有视频的循环播放
 * 用于从 Vision One 返回主页、或 Tab 重新激活后重建播放状态
 * - 确保 muted（自动播放策略必需）
 * - 确保 loop 属性
 * - 若 paused 则 play()（Promise 异常静默处理）
 * - 若 ended 则 currentTime = 0 再 play
 */
function resumeIntroVideos(): void {
  try {
    const videos = document.querySelectorAll<HTMLVideoElement>(
      INTRO_VIDEO_SELECTOR,
    );
    videos.forEach((v) => {
      try {
        // 确保属性：某些浏览器/Electron 场景下 DOM 可能被外部修改
        v.muted = true;
        if (!v.loop) v.loop = true;

        // 若视频已播放到末尾且未循环回 0，主动回到起点
        if (v.ended) {
          v.currentTime = 0;
        }

        if (v.paused) {
          const maybePromise = v.play();
          // play() 返回 Promise，在自动播放策略拦截时会 reject，静默处理
          if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => {
              /* 自动播放被拦截，静默忽略，用户交互后会自动恢复 */
            });
          }
        }
      } catch (_) {
        /* 静默忽略单个 video 的异常 */
      }
    });
  } catch (_) {
    /* DOM 查询异常不影响主流程 */
  }
}

/**
 * IntroPage 退出过渡配置
 */
interface IntroExitConfig {
  /** 淡出持续时间（毫秒），默认 450ms，与 CSS transition 对齐 */
  fadeDurationMs?: number;
  /**
   * 等待 QuantumCamera 首帧渲染的预热时间（毫秒）
   * 给浏览器 2 帧窗口（≈33ms @60fps）去完成下层 DOM 挂载与首次 paint
   * 然后 Intro 开始淡出，视觉上"下层已就绪、上层优雅退出"
   */
  warmupMs?: number;
}

/**
 * 退出过渡状态机
 * - idle: 初始状态（IntroPage 正常显示）
 * - exiting: 淡出中（opacity 从 1 → 0）
 * - finished: 淡出完成（可以彻底隐藏/卸载）
 */
export type IntroExitPhase = 'idle' | 'exiting' | 'finished';

/**
 * IntroPage 退出过渡协调 hook
 *
 * @example
 * const { phase, wrapEnter, overlayStyle } = useIntroExitTransition(
 *   () => setShowIntro(false)
 * );
 * <IntroPage onEnter={wrapEnter} />
 * <div style={overlayStyle}>...Intro content...</div>
 */
export function useIntroExitTransition(
  realOnEnter: () => void,
  config?: IntroExitConfig,
) {
  const fadeDurationMs = config?.fadeDurationMs ?? 450;
  const warmupMs = config?.warmupMs ?? 16; // 约 1 帧

  const [phase, setPhase] = useState<IntroExitPhase>('idle');
  const timerRef = useRef<number | null>(null);
  const finishTimerRef = useRef<number | null>(null);

  // 清理定时器，防止组件卸载后回调仍在运行（防御性编程）
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (finishTimerRef.current !== null) window.clearTimeout(finishTimerRef.current);
    };
  }, []);

  // 兜底 1：phase 变回 idle 时（例如从 Vision One 返回），强制恢复视频循环播放
  // 这比 resetExit 内部的 rAF 更保险，因为 React 的 state commit 在 useEffect 之前
  useEffect(() => {
    if (phase === 'idle') {
      // 使用 rAF 确保 DOM 已重绘（Intro 容器从 display:none 切回 block）
      const raf = requestAnimationFrame(() => {
        resumeIntroVideos();
      });
      return () => cancelAnimationFrame(raf);
    }
    return undefined;
  }, [phase]);

  // 兜底 2：Tab 切换可见性变化时，若当前处于 idle 态，恢复视频循环
  // 浏览器会在 Tab 隐藏时自动暂停视频，切回来不会自动恢复
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && phase === 'idle') {
        resumeIntroVideos();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Electron 下还可能触发 window focus
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [phase]);

  /**
   * 重置状态机到 idle
   * 用途：从 Vision One 返回 IntroPage 时调用，恢复 Intro 显示与视频循环播放
   * 注意：Intro 容器先从 display:none 切回 block，再调用 play() 才会生效
   * 因此使用 requestAnimationFrame 确保下一帧 DOM 已可见后再触发 play
   */
  const resetExit = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    setPhase('idle');

    // 下一帧恢复视频播放：
    // 此时 React 已将 phase='idle' commit，IntroPage 容器从 display:none 恢复为 block
    // 浏览器已经可以对 video 元素执行 play()
    requestAnimationFrame(() => {
      // 双帧保险：某些 Electron / Safari 下单帧后合成层尚未就绪
      requestAnimationFrame(() => {
        resumeIntroVideos();
      });
    });
  }, []);

  /**
   * 包装后的 onEnter —— 把即时切换变成两阶段过渡
   * 1) 立即 setPhase('exiting') → IntroPage 开始淡出 + 禁用交互
   * 2) 等 warmupMs + 1 帧 → 真正切 showIntro 让 QuantumCamera 显示
   * 3) 等 fadeDurationMs → setPhase('finished') 允许外层彻底隐藏
   */
  const wrapEnter = useCallback(() => {
    // 防抖：避免连点按钮重复触发
    if (phase !== 'idle') return;

    setPhase('exiting');

    // 性能优化：立即暂停 IntroPage 内部的视频背景，释放 GPU 解码线程
    pauseIntroVideos();

    // 第一步：在下一帧触发真实的 state 切换
    // 使用 requestAnimationFrame 确保浏览器已完成 "exiting" class 的 DOM commit
    // 这样 opacity transition 能真正起效（而非被同步切换吞掉）
    requestAnimationFrame(() => {
      timerRef.current = window.setTimeout(() => {
        try {
          realOnEnter();
        } catch (err) {
          // 防御性处理：真实回调异常不影响状态机
          console.error('[IntroExitTransition] realOnEnter error:', err);
        }
      }, warmupMs);
    });

    // 第二步：等淡出时长后标记 finished（外层可据此彻底隐藏/暂停资源）
    finishTimerRef.current = window.setTimeout(() => {
      setPhase('finished');
    }, fadeDurationMs);
  }, [phase, realOnEnter, warmupMs, fadeDurationMs]);

  /**
   * 生成 IntroPage 外层容器的样式对象（供 style={} 使用）
   * - opacity: 根据 phase 平滑过渡
   * - transition: 统一过渡曲线
   * - pointerEvents: 淡出开始立即禁用，避免误点
   * - willChange: 提示浏览器合成层优化
   */
  const overlayStyle: React.CSSProperties = {
    opacity: phase === 'idle' ? 1 : 0,
    transition: `opacity ${fadeDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    pointerEvents: phase === 'idle' ? 'auto' : 'none',
    willChange: 'opacity',
  };

  return {
    phase,
    wrapEnter,
    overlayStyle,
    isExiting: phase !== 'idle',
    resetExit,
  };
}
