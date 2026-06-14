// 文件路径: components/canvas/Minimap.tsx
// 画布小地图 — 实时显示节点位置和视口范围

import React, { useMemo } from 'react';
import { CanvasNode, CanvasViewport, NodeType } from './types';

interface MinimapProps {
  nodes: CanvasNode[];
  viewport: CanvasViewport;
  containerWidth: number;
  containerHeight: number;
  isDark: boolean;
  visible: boolean;
}

const NODE_COLORS: Record<NodeType, string> = {
  prompt: '#f59e0b',
  image: '#8b5cf6',
  generator: '#06b6d4',
  output: '#10b981',
  llm: '#3b82f6',
  video: '#f43f5e',
  loop: '#f97316',
  group: '#64748b',
  comfyui: '#a855f7',
  composer: '#ec4899',
  asset: '#eab308',
};

export const Minimap: React.FC<MinimapProps> = ({ nodes, viewport, containerWidth, containerHeight, isDark, visible }) => {
  if (!visible || nodes.length === 0) return null;

  const MAP_W = 160;
  const MAP_H = 100;

  // 计算画布总边界
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    const padding = 200;
    return {
      minX: Math.min(...nodes.map((n) => n.x)) - padding,
      minY: Math.min(...nodes.map((n) => n.y)) - padding,
      maxX: Math.max(...nodes.map((n) => n.x + n.width)) + padding,
      maxY: Math.max(...nodes.map((n) => n.y + n.height)) + padding,
    };
  }, [nodes]);

  const worldW = bounds.maxX - bounds.minX;
  const worldH = bounds.maxY - bounds.minY;
  const scaleX = MAP_W / worldW;
  const scaleY = MAP_H / worldH;
  const mapScale = Math.min(scaleX, scaleY);

  // 视口矩形在小地图中的位置
  const vpLeft = (-viewport.x / viewport.scale - bounds.minX) * mapScale;
  const vpTop = (-viewport.y / viewport.scale - bounds.minY) * mapScale;
  const vpWidth = (containerWidth / viewport.scale) * mapScale;
  const vpHeight = (containerHeight / viewport.scale) * mapScale;

  return (
    <div
      className={`absolute bottom-20 right-5 z-30 rounded-xl overflow-hidden border backdrop-blur-sm ${
        isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-black/10'
      }`}
      style={{ width: MAP_W, height: MAP_H }}
    >
      {/* 节点点 */}
      {nodes.map((node) => {
        const x = (node.x - bounds.minX) * mapScale;
        const y = (node.y - bounds.minY) * mapScale;
        const w = Math.max(4, node.width * mapScale);
        const h = Math.max(3, node.height * mapScale);
        return (
          <div
            key={node.id}
            className="absolute rounded-[2px]"
            style={{
              left: x,
              top: y,
              width: w,
              height: h,
              backgroundColor: NODE_COLORS[node.type] || '#64748b',
              opacity: 0.75,
            }}
          />
        );
      })}

      {/* 视口框 */}
      <div
        className="absolute border-2 border-cyan-400/60 rounded-sm"
        style={{
          left: Math.max(0, vpLeft),
          top: Math.max(0, vpTop),
          width: Math.min(MAP_W, vpWidth),
          height: Math.min(MAP_H, vpHeight),
        }}
      />
    </div>
  );
};
