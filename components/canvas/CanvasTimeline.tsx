// 文件路径: components/canvas/CanvasTimeline.tsx
// 剪辑线模式 — 将画布中的图片节点按顺序排列为时间线
// 每个图片支持拖拽调整时长，支持拖拽排序、分割线、弹出播放窗口

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CanvasNode } from './types';

interface TimelineClip {
  id: string;
  imageUrl: string;
  duration: number; // 秒
  label: string;
  splitAfter: boolean; // 该片段后是否有分割线
}

interface CanvasTimelineProps {
  isDark: boolean;
  nodes: CanvasNode[];
  onClose: () => void;
}

// ===== 可缩放移动的播放窗口 =====
const TimelinePlayerWindow: React.FC<{
  isDark: boolean;
  clips: TimelineClip[];
  onClose: () => void;
}> = ({ isDark, clips, onClose }) => {
  const [position, setPosition] = useState({ x: 200, y: 100 });
  const [size, setSize] = useState({ w: 480, h: 320 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const playTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  // 播放逻辑：根据每帧 duration 播放
  const startPlayback = useCallback(() => {
    if (clips.length === 0) return;
    setIsPlaying(true);
    setProgress(0);
    let idx = currentIdx;

    const scheduleNext = (i: number) => {
      const dur = clips[i]?.duration || 5;
      setProgress(0);
      // 进度条动画
      const step = 50; // 50ms 间隔
      const total = dur * 1000;
      let elapsed = 0;
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressTimerRef.current = window.setInterval(() => {
        elapsed += step;
        setProgress(Math.min(elapsed / total, 1));
      }, step);

      playTimerRef.current = window.setTimeout(() => {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        setProgress(1);
        const next = i + 1;
        if (next >= clips.length) {
          setIsPlaying(false);
          setCurrentIdx(0);
          setProgress(0);
          return;
        }
        setCurrentIdx(next);
        scheduleNext(next);
      }, total);
    };

    scheduleNext(idx);
  }, [clips, currentIdx]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // 窗口拖拽
  const handleTitleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  };

  // 窗口缩放
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
      }
      if (isResizing) {
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        setSize({
          w: Math.max(320, resizeStartRef.current.w + dx),
          h: Math.max(240, resizeStartRef.current.h + dy),
        });
      }
    };
    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, isResizing]);

  const currentClip = clips[currentIdx];

  return (
    <div
      className={`absolute z-[200] border shadow-2xl flex flex-col ${
        isDark ? 'bg-[#0a0a0a] border-[#1f1f1f]' : 'bg-white border-[#e0e0e0]'
      }`}
      style={{ left: position.x, top: position.y, width: size.w, height: size.h }}
    >
      {/* 标题栏 - 可拖拽 */}
      <div
        className={`shrink-0 flex items-center justify-between px-3 py-1.5 cursor-move select-none border-b ${
          isDark ? 'border-[#1a1a1a] bg-[#0c0c0c]' : 'border-[#eee] bg-[#fafafa]'
        }`}
        onMouseDown={handleTitleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[9px] font-mono font-bold tracking-[0.15em] ${
            isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
          }`}>PLAYER</span>
          <span className={`text-[8px] font-mono ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>
            {currentIdx + 1}/{clips.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* 播放/停止 */}
          {isPlaying ? (
            <button onClick={stopPlayback} className={`px-2 py-0.5 text-[9px] font-mono ${
              isDark ? 'text-[#ff4444]' : 'text-[#dc2626]'
            }`}>■</button>
          ) : (
            <button onClick={startPlayback} disabled={clips.length === 0} className={`px-2 py-0.5 text-[9px] font-mono ${
              isDark ? 'text-[#888] hover:text-[#ff4444]' : 'text-[#666] hover:text-[#dc2626]'
            }`}>▶</button>
          )}
          <button
            onClick={onClose}
            className={`text-[12px] leading-none ml-1 ${isDark ? 'text-[#555] hover:text-[#ff4444]' : 'text-[#999] hover:text-[#dc2626]'}`}
          >×</button>
        </div>
      </div>

      {/* 画面区域 */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {currentClip ? (
          <img src={currentClip.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
        ) : (
          <span className="text-[11px] font-mono text-[#555]">无帧</span>
        )}
      </div>

      {/* 底部进度条 + 帧导航 */}
      <div className={`shrink-0 px-2 py-1.5 border-t ${isDark ? 'border-[#1a1a1a]' : 'border-[#eee]'}`}>
        {/* 进度条 */}
        <div className={`w-full h-1 mb-1.5 ${isDark ? 'bg-[#1f1f1f]' : 'bg-[#e0e0e0]'}`}>
          <div
            className={`h-full transition-[width] ${isDark ? 'bg-[#cc2222]' : 'bg-[#dc2626]'}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {/* 帧缩略图导航 */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {clips.map((clip, idx) => (
            <div
              key={clip.id}
              onClick={() => { if (!isPlaying) setCurrentIdx(idx); }}
              className={`shrink-0 w-8 h-5 cursor-pointer border transition-colors overflow-hidden ${
                idx === currentIdx
                  ? isDark ? 'border-[#cc2222]' : 'border-[#dc2626]'
                  : isDark ? 'border-[#222] hover:border-[#441111]' : 'border-[#ddd] hover:border-[#fca5a5]'
              }`}
            >
              <img src={clip.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* 缩放手柄 */}
      <div
        className={`absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize ${
          isDark ? 'text-[#333]' : 'text-[#ccc]'
        }`}
        onMouseDown={handleResizeMouseDown}
      >
        <svg className="w-full h-full" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 14H10L14 10V14ZM14 14H12L14 12V14Z" />
          <path d="M14 8L8 14H10L14 10V8Z" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
};

export const CanvasTimeline: React.FC<CanvasTimelineProps> = ({ isDark, nodes, onClose }) => {
  // 从画布节点中提取所有图片
  const extractClips = (): TimelineClip[] => {
    const clips: TimelineClip[] = [];

    nodes.forEach((node) => {
      // Generator 节点的生成图片
      if (node.type === 'generator') {
        const images = (node.data.generatedImages as string[]) || [];
        images.forEach((img, idx) => {
          clips.push({
            id: `${node.id}_gen_${idx}`,
            imageUrl: img,
            duration: 5,
            label: `生成 ${idx + 1}`,
            splitAfter: false,
          });
        });
      }
      // Output 节点的图片
      if (node.type === 'output') {
        const images = (node.data.images as string[]) || [];
        images.forEach((img, idx) => {
          clips.push({
            id: `${node.id}_out_${idx}`,
            imageUrl: img,
            duration: 5,
            label: `输出 ${idx + 1}`,
            splitAfter: false,
          });
        });
      }
      // Image 节点
      if (node.type === 'image' && node.data.imageUrl) {
        clips.push({
          id: `${node.id}_img`,
          imageUrl: node.data.imageUrl as string,
          duration: 5,
          label: '图片',
          splitAfter: false,
        });
      }
    });

    return clips;
  };

  const [clips, setClips] = useState<TimelineClip[]>(extractClips);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [playheadPos, setPlayheadPos] = useState(0); // 百分比
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [showPlayerWindow, setShowPlayerWindow] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // ===== 拖拽调整时长 =====
  const [durationDragIdx, setDurationDragIdx] = useState<number | null>(null);
  const durationDragRef = useRef<{ startX: number; startDuration: number } | null>(null);

  const handleDurationDragStart = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDurationDragIdx(idx);
    durationDragRef.current = { startX: e.clientX, startDuration: clips[idx].duration };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (durationDragIdx !== null && durationDragRef.current) {
        const dx = e.clientX - durationDragRef.current.startX;
        // 每 20px = 1 秒
        const newDuration = Math.max(1, Math.min(30, durationDragRef.current.startDuration + dx / 20));
        setClips((prev) => prev.map((c, i) => i === durationDragIdx ? { ...c, duration: Math.round(newDuration * 10) / 10 } : c));
      }
    };
    const handleUp = () => {
      setDurationDragIdx(null);
      durationDragRef.current = null;
    };
    if (durationDragIdx !== null) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [durationDragIdx]);

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

  // 拖拽排序
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newClips = [...clips];
    const [moved] = newClips.splice(dragIdx, 1);
    newClips.splice(idx, 0, moved);
    setClips(newClips);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // 分割线切换
  const toggleSplit = (idx: number) => {
    setClips((prev) => prev.map((c, i) => i === idx ? { ...c, splitAfter: !c.splitAfter } : c));
  };

  // 删除片段
  const removeClip = (idx: number) => {
    setClips((prev) => prev.filter((_, i) => i !== idx));
  };

  // 播放预览
  const startPlayback = useCallback(() => {
    if (clips.length === 0) return;
    setIsPlaying(true);
    setPreviewIdx(0);
    let currentIdx = 0;

    const scheduleNext = () => {
      const dur = clips[currentIdx]?.duration || 5;
      playIntervalRef.current = window.setTimeout(() => {
        currentIdx++;
        if (currentIdx >= clips.length) {
          setIsPlaying(false);
          setPreviewIdx(0);
          return;
        }
        setPreviewIdx(currentIdx);
        scheduleNext();
      }, dur * 1000);
    };

    scheduleNext();
  }, [clips]);

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playIntervalRef.current) clearTimeout(playIntervalRef.current);
  };

  // 导出（下载所有图片 + 生成时间线 JSON）
  const handleExport = () => {
    const timeline = clips.map((c, idx) => ({
      order: idx + 1,
      duration: c.duration,
      label: c.label,
      splitAfter: c.splitAfter,
    }));

    // 下载时间线配置
    const blob = new Blob([JSON.stringify({ totalDuration, clips: timeline }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timeline_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // 下载所有图片
    clips.forEach((clip, idx) => {
      const imgA = document.createElement('a');
      imgA.href = clip.imageUrl;
      imgA.download = `frame_${String(idx + 1).padStart(3, '0')}.png`;
      document.body.appendChild(imgA);
      imgA.click();
      document.body.removeChild(imgA);
    });
  };

  return (
    <>
      {/* 播放窗口 */}
      {showPlayerWindow && clips.length > 0 && (
        <TimelinePlayerWindow
          isDark={isDark}
          clips={clips}
          onClose={() => setShowPlayerWindow(false)}
        />
      )}

      <div className={`absolute bottom-0 left-0 right-0 z-[100] border-t ${
        isDark ? 'bg-[#080808] border-[#1f1f1f]' : 'bg-white border-[#e0e0e0]'
      }`}>
        {/* 标题栏 */}
        <div className={`flex items-center justify-between px-4 py-1.5 border-b ${
          isDark ? 'border-[#1a1a1a]' : 'border-[#eee]'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`text-[9px] font-mono font-bold tracking-[0.15em] ${
              isDark ? 'text-[#cc2222]' : 'text-[#b91c1c]'
            }`}>TIMELINE</span>
            <span className={`text-[8px] font-mono ${isDark ? 'text-[#555]' : 'text-[#999]'}`}>
              {clips.length} 帧 · {totalDuration.toFixed(1)}s
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* 弹出播放窗口 */}
            <button
              onClick={() => setShowPlayerWindow(!showPlayerWindow)}
              disabled={clips.length === 0}
              className={`px-2 py-0.5 text-[9px] font-mono font-bold transition-colors ${
                showPlayerWindow
                  ? isDark ? 'bg-[#330000] text-[#ff4444]' : 'bg-[#fee2e2] text-[#dc2626]'
                  : clips.length > 0
                    ? isDark ? 'text-[#888] hover:text-[#ff4444]' : 'text-[#666] hover:text-[#dc2626]'
                    : isDark ? 'text-[#333]' : 'text-[#ccc]'
              }`}
              title="弹出播放窗口"
            >
              ⬜ 窗口
            </button>
            {/* 播放 */}
            {isPlaying ? (
              <button onClick={stopPlayback} className={`px-2 py-0.5 text-[9px] font-mono ${
                isDark ? 'bg-[#330000] text-[#ff4444]' : 'bg-[#fee2e2] text-[#dc2626]'
              }`}>■</button>
            ) : (
              <button onClick={startPlayback} disabled={clips.length === 0} className={`px-2 py-0.5 text-[9px] font-mono ${
                isDark ? 'text-[#888] hover:text-[#ff4444]' : 'text-[#666] hover:text-[#dc2626]'
              }`}>▶</button>
            )}
            {/* 导出 */}
            <button
              onClick={handleExport}
              disabled={clips.length === 0}
              className={`px-2 py-0.5 text-[9px] font-mono font-bold ${
                clips.length > 0
                  ? isDark ? 'text-[#cc2222] hover:text-[#ff4444]' : 'text-[#b91c1c] hover:text-[#dc2626]'
                  : isDark ? 'text-[#333]' : 'text-[#ccc]'
              }`}
            >
              导出
            </button>
            {/* 关闭 */}
            <button
              onClick={onClose}
              className={`text-[12px] leading-none ${isDark ? 'text-[#555] hover:text-[#ff4444]' : 'text-[#999] hover:text-[#dc2626]'}`}
            >×</button>
          </div>
        </div>

        {/* 片段轨道 */}
        <div className="flex items-stretch h-[64px] px-3 py-1.5 gap-0 overflow-x-auto">
          {clips.length > 0 ? clips.map((clip, idx) => (
            <React.Fragment key={clip.id}>
              <div
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => setPreviewIdx(idx)}
                className={`relative flex items-center cursor-pointer border transition-all shrink-0 ${
                  previewIdx === idx
                    ? isDark ? 'border-[#cc2222] bg-[#1a0808]' : 'border-[#dc2626] bg-[#fff5f5]'
                    : isDark ? 'border-[#1f1f1f] bg-[#0c0c0c] hover:border-[#331111]' : 'border-[#e0e0e0] bg-white hover:border-[#fecaca]'
                }`}
                style={{ width: Math.max(40, clip.duration * 16), minWidth: 40 }}
              >
                <img src={clip.imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                <div className={`absolute bottom-0 left-0 right-0 px-1 py-0.5 text-[7px] font-mono ${
                  isDark ? 'bg-black/70 text-[#888]' : 'bg-white/80 text-[#666]'
                }`}>
                  {clip.duration}s
                </div>
                {/* 右侧拖拽调整时长手柄 */}
                <div
                  className={`absolute top-0 right-0 w-[6px] h-full cursor-ew-resize z-10 transition-colors ${
                    isDark ? 'hover:bg-[#cc2222]/40' : 'hover:bg-[#dc2626]/30'
                  }`}
                  onMouseDown={(e) => handleDurationDragStart(e, idx)}
                  title="拖拽调整时长"
                >
                  <div className={`absolute top-1/2 right-[1px] -translate-y-1/2 w-[2px] h-3 ${
                    isDark ? 'bg-[#444]' : 'bg-[#bbb]'
                  }`} />
                </div>
                {/* 删除 */}
                <button
                  onClick={(e) => { e.stopPropagation(); removeClip(idx); }}
                  className={`absolute top-0 left-0 w-3 h-3 text-[7px] flex items-center justify-center opacity-0 hover:opacity-100 ${
                    isDark ? 'text-[#ff4444] bg-black/70' : 'text-[#dc2626] bg-white/80'
                  }`}
                >×</button>
              </div>
              {/* 分割线 */}
              {idx < clips.length - 1 && (
                <div
                  onClick={() => toggleSplit(idx)}
                  className={`w-[3px] shrink-0 cursor-pointer transition-colors ${
                    clip.splitAfter
                      ? isDark ? 'bg-[#cc2222]' : 'bg-[#dc2626]'
                      : isDark ? 'bg-[#1a1a1a] hover:bg-[#cc2222]/50' : 'bg-[#eee] hover:bg-[#dc2626]/30'
                  }`}
                  title={clip.splitAfter ? '移除分割' : '添加分割'}
                />
              )}
            </React.Fragment>
          )) : (
            <div className={`flex items-center justify-center w-full text-[10px] font-mono ${isDark ? 'text-[#444]' : 'text-[#bbb]'}`}>
              暂无图片帧 · 生成图片后自动出现
            </div>
          )}
        </div>
      </div>
    </>
  );
};
