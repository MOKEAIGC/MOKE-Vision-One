// 文件路径: components/canvas/ConnectionLayer.tsx
// SVG 连线层 — 绘制节点间的贝塞尔曲线连接

import React from 'react';
import { CanvasConnection, CanvasNode, ConnectionDragState } from './types';

interface ConnectionLayerProps {
  connections: CanvasConnection[];
  nodes: CanvasNode[];
  tempConnection: ConnectionDragState | null;
  selectedConnectionId: string | null;
  onConnectionClick: (id: string) => void;
  isDark: boolean;
}

function getPortPosition(
  node: CanvasNode,
  portId: string,
  portType: 'input' | 'output'
): { x: number; y: number } {
  const port = node.ports.find((p) => p.id === portId);
  if (!port) {
    // fallback: 输出在右侧中间，输入在左侧中间
    if (portType === 'output') {
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    }
    return { x: node.x, y: node.y + node.height / 2 };
  }

  const outputPorts = node.ports.filter((p) => p.type === 'output');
  const inputPorts = node.ports.filter((p) => p.type === 'input');

  if (port.type === 'output') {
    const idx = outputPorts.indexOf(port);
    const spacing = node.height / (outputPorts.length + 1);
    return { x: node.x + node.width, y: node.y + spacing * (idx + 1) };
  } else {
    const idx = inputPorts.indexOf(port);
    const spacing = node.height / (inputPorts.length + 1);
    return { x: node.x, y: node.y + spacing * (idx + 1) };
  }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  const cp1x = x1 + dx;
  const cp1y = y1;
  const cp2x = x2 - dx;
  const cp2y = y2;
  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

export const ConnectionLayer: React.FC<ConnectionLayerProps> = ({
  connections,
  nodes,
  tempConnection,
  selectedConnectionId,
  onConnectionClick,
  isDark,
}) => {
  const strokeColor = isDark ? 'rgba(204,34,34,0.35)' : 'rgba(185,28,28,0.3)';
  const selectedColor = isDark ? '#ff4444' : '#dc2626';
  const tempColor = isDark ? 'rgba(255,68,68,0.6)' : 'rgba(220,38,38,0.6)';

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      style={{ zIndex: 1 }}
    >
      {connections.map((conn) => {
        const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
        const toNode = nodes.find((n) => n.id === conn.toNodeId);
        if (!fromNode || !toNode) return null;

        const from = getPortPosition(fromNode, conn.fromPortId, 'output');
        const to = getPortPosition(toNode, conn.toPortId, 'input');
        const path = bezierPath(from.x, from.y, to.x, to.y);
        const isSelected = conn.id === selectedConnectionId;

        return (
          <g key={conn.id}>
            {/* 不可见的宽点击区域 */}
            <path
              d={path}
              fill="none"
              stroke="transparent"
              strokeWidth={16}
              className="pointer-events-stroke cursor-pointer"
              onClick={() => onConnectionClick(conn.id)}
            />
            {/* 可见连线 */}
            <path
              d={path}
              fill="none"
              stroke={isSelected ? selectedColor : strokeColor}
              strokeWidth={isSelected ? 3 : 2.5}
              strokeLinecap="round"
              style={{
                filter: isSelected ? `drop-shadow(0 0 6px ${selectedColor})` : undefined,
                transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
              }}
            />
          </g>
        );
      })}

      {/* 临时连线（拖拽中） */}
      {tempConnection && tempConnection.isDragging && (
        <path
          d={bezierPath(
            tempConnection.fromX,
            tempConnection.fromY,
            tempConnection.toX,
            tempConnection.toY
          )}
          fill="none"
          stroke={tempColor}
          strokeWidth={2.5}
          strokeDasharray="8 6"
          strokeLinecap="round"
          style={{ opacity: 0.85 }}
        />
      )}
    </svg>
  );
};
