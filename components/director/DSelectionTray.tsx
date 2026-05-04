// 文件路径: components/director/DSelectionTray.tsx
// DirectorDeck 浮动选择托盘 — 量子相机风格

import React, { useState, useRef, useEffect } from 'react';
import { X, GripVertical, GripHorizontal, Scaling } from 'lucide-react';

interface TrayItem {
  id: string;
  url: string;
}

interface DSelectionTrayProps {
  items: TrayItem[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
  actions?: React.ReactNode;
  label?: string;
}

export const DSelectionTray: React.FC<DSelectionTrayProps> = ({ items, onReorder, onRemove, actions, label }) => {
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const [size, setSize] = useState<{ width: number, height: number } | null>(null);
  
  const isDraggingWindow = useRef(false);
  const isResizingWindow = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });

  useEffect(() => {
    if (!position && containerRef.current) {
      const defaultWidth = 240;
      const defaultHeight = Math.min(window.innerHeight - 200, 600);
      setPosition({
        x: window.innerWidth - defaultWidth - 40,
        y: (window.innerHeight - defaultHeight) / 2
      });
      setSize({ width: defaultWidth, height: defaultHeight });
    }
  }, [items.length]);

  const handleWindowDragStart = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDraggingWindow.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    dragStartOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.addEventListener('mousemove', handleWindowMouseMove);
    document.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleWindowMouseMove = (e: MouseEvent) => {
    if (isDraggingWindow.current) {
      setPosition({ x: e.clientX - dragStartOffset.current.x, y: e.clientY - dragStartOffset.current.y });
    }
  };

  const handleWindowMouseUp = () => {
    isDraggingWindow.current = false;
    document.removeEventListener('mousemove', handleWindowMouseMove);
    document.removeEventListener('mouseup', handleWindowMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current || !size) return;
    isResizingWindow.current = true;
    resizeStart.current = { w: size.width, h: size.height, x: e.clientX, y: e.clientY };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeUp);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (isResizingWindow.current) {
      const deltaX = e.clientX - resizeStart.current.x;
      const deltaY = e.clientY - resizeStart.current.y;
      setSize({
        width: Math.max(180, resizeStart.current.w + deltaX),
        height: Math.max(300, resizeStart.current.h + deltaY)
      });
    }
  };

  const handleResizeUp = () => {
    isResizingWindow.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeUp);
  };

  const handleItemDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleItemDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleItemDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItemIndex !== null && draggedItemIndex !== index) {
      onReorder(draggedItemIndex, index);
    }
    setDraggedItemIndex(null);
  };

  if (items.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      style={{ 
        left: position ? `${position.x}px` : 'auto',
        top: position ? `${position.y}px` : 'auto',
        right: position ? 'auto' : '24px',
        bottom: position ? 'auto' : '24px',
        width: size ? `${size.width}px` : '240px',
        height: size ? `${size.height}px` : '500px',
      }}
      className="fixed z-40 bg-[#0A0A0A]/95 backdrop-blur-2xl border border-gray-800 rounded-sm shadow-2xl flex flex-col overflow-hidden"
    >
      {/* 拖拽头部 */}
      <div 
        onMouseDown={handleWindowDragStart}
        className="h-8 bg-white/5 border-b border-gray-800 flex items-center justify-between px-3 cursor-move hover:bg-white/10 transition-colors shrink-0 select-none"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-600" />
          {label && <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400">{label}</span>}
        </div>
        <span className="text-[9px] text-gray-600 font-mono">{items.length} SHOTS</span>
      </div>

      {/* 垂直滚动区域 */}
      <div className="flex-1 overflow-y-auto p-3 relative bg-black/20" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex flex-col gap-3 pb-8">
          {items.map((item, index) => (
            <div key={item.id} className="relative flex flex-col items-center group/wrapper">
              {index < items.length - 1 && (
                <div className="absolute -bottom-4 left-1/2 w-px h-4 bg-white/10 z-0"></div>
              )}

              <div
                draggable
                onDragStart={(e) => handleItemDragStart(e, index)}
                onDragOver={(e) => handleItemDragOver(e, index)}
                onDrop={(e) => handleItemDrop(e, index)}
                className={`
                  relative group w-full cursor-grab active:cursor-grabbing transition-all rounded-sm overflow-hidden border bg-moke-black shadow-lg z-10
                  ${draggedItemIndex === index 
                    ? 'opacity-40 scale-95 border-moke-red border-dashed' 
                    : 'border-gray-800 hover:border-gray-600'
                  }
                `}
              >
                <img src={item.url} alt="selected" className="w-full h-auto block object-contain pointer-events-none" />
                
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <GripVertical size={20} className="text-white/80 drop-shadow-md" />
                </div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-sm text-white/80 hover:bg-moke-red hover:text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-auto shadow-sm border border-gray-800"
                >
                  <X size={12} />
                </button>
                
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[9px] font-mono font-bold text-white rounded-sm pointer-events-none border border-gray-800 shadow-sm">
                  {(index + 1).toString().padStart(2, '0')}
                </div>
              </div>

              {draggedItemIndex !== null && draggedItemIndex !== index && (
                <div className="absolute bottom-[-10px] w-full h-0.5 bg-moke-red opacity-0 group-hover/wrapper:opacity-100 transition-opacity z-20 pointer-events-none box-content py-1" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 底部操作栏 */}
      {actions && (
        <div className="p-3 border-t border-gray-800 bg-[#0A0A0A]/50 backdrop-blur-xl shrink-0 flex flex-col gap-2">
          <div className="flex flex-col gap-2">{actions}</div>
        </div>
      )}

      {/* 缩放手柄 */}
      <div 
        onMouseDown={handleResizeStart}
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-0.5 opacity-50 hover:opacity-100 z-50 hover:bg-white/5 rounded-tl-sm"
      >
        <Scaling size={12} className="text-gray-600 transform rotate-90" />
      </div>
    </div>
  );
};
