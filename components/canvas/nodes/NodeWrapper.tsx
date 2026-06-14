// 文件路径: components/canvas/nodes/NodeWrapper.tsx
// 节点容器 — 统一外框、拖拽、端口渲染

import React, { useCallback, useRef } from 'react';
import { CanvasNode, NodeType, PortDefinition } from '../types';

interface NodeWrapperProps {
  node: CanvasNode;
  isDark: boolean;
  isSelected: boolean;
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string, portId: string, portType: 'input' | 'output') => void;
  onResize?: (nodeId: string, width: number, height: number) => void;
}

const PORT_COLORS: Record<NodeType, string> = {
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

export const NodeWrapper: React.FC<NodeWrapperProps> = ({
  node, isDark, isSelected, children, onMouseDown, onPortMouseDown, onResize,
}) => {
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: node.width,
      startH: node.height,
    };

    const handleResizeMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dw = ev.clientX - resizeRef.current.startX;
      const dh = ev.clientY - resizeRef.current.startY;
      const newW = Math.max(180, resizeRef.current.startW + dw);
      const newH = Math.max(120, resizeRef.current.startH + dh);
      onResize?.(node.id, newW, newH);
    };

    const handleResizeEnd = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [node.id, node.width, node.height, onResize]);

  const borderColor = isSelected
    ? isDark ? 'border-[#cc2222]' : 'border-[#dc2626]'
    : isDark ? 'border-[#1f1f1f]' : 'border-[#e0e0e0]';

  const shadowClass = isSelected
    ? isDark ? 'shadow-[0_0_0_1px_rgba(204,34,34,0.3)]' : 'shadow-[0_0_0_1px_rgba(220,38,38,0.2)]'
    : '';

  const inputPorts = node.ports.filter((p) => p.type === 'input');
  const outputPorts = node.ports.filter((p) => p.type === 'output');

  return (
    <div
      className={`absolute border overflow-visible select-none transition-[border-color] duration-100 ${borderColor} ${shadowClass} ${
        isDark ? 'bg-[#0c0c0c]' : 'bg-white'
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        zIndex: isSelected ? 10 : 2,
      }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
    >
      {/* 节点内容 */}
      <div className="w-full h-full overflow-hidden flex flex-col">
        {children}
      </div>

      {/* 输入端口（左侧） */}
      {inputPorts.map((port, idx) => {
        const spacing = node.height / (inputPorts.length + 1);
        const y = spacing * (idx + 1);
        return (
          <div
            key={port.id}
            className="absolute w-4 h-4 -left-2 flex items-center justify-center group cursor-crosshair z-20"
            style={{ top: y - 8 }}
            onMouseDown={(e) => onPortMouseDown(e, node.id, port.id, 'input')}
            title={port.label || 'Input'}
          >
            <div
              className={`w-3 h-3 rounded-full border-2 transition-all group-hover:scale-125 ${
                isDark
                  ? 'bg-gray-800 border-gray-500 group-hover:border-cyan-400 group-hover:bg-gray-700'
                  : 'bg-white border-gray-400 group-hover:border-cyan-500 group-hover:bg-gray-50'
              }`}
            />
          </div>
        );
      })}

      {/* 输出端口（右侧） */}
      {outputPorts.map((port, idx) => {
        const spacing = node.height / (outputPorts.length + 1);
        const y = spacing * (idx + 1);
        return (
          <div
            key={port.id}
            className="absolute w-4 h-4 -right-2 flex items-center justify-center group cursor-crosshair z-20"
            style={{ top: y - 8 }}
            onMouseDown={(e) => onPortMouseDown(e, node.id, port.id, 'output')}
            title={port.label || 'Output'}
          >
            <div
              className={`w-3 h-3 rounded-full border-2 transition-all group-hover:scale-125`}
              style={{ borderColor: PORT_COLORS[node.type], backgroundColor: isDark ? '#1a1a2e' : '#fff' }}
            />
          </div>
        );
      })}

      {/* 缩放手柄 */}
      <div
        className={`absolute right-1.5 bottom-1.5 w-4 h-4 rounded-md cursor-nwse-resize flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20 ${
          isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'
        }`}
        onMouseDown={handleResizeStart}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeWidth={2} d="M21 21l-6-6m0 6h6v-6" />
        </svg>
      </div>

      {/* 选中指示 */}
      {isSelected && (
        <div className="absolute inset-0 rounded-[18px] border-2 border-cyan-400/40 pointer-events-none" />
      )}
    </div>
  );
};
