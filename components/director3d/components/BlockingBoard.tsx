// 文件路径: components/director3d/components/BlockingBoard.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useSceneStore } from '../store';
import { StageObject } from '../types';
import { 
  Move, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  RefreshCw, 
  ChevronUp, 
  ChevronDown, 
  Trash2,
  Tv,
  Lock,
  Unlock
} from 'lucide-react';

interface DragState {
  type: 'object-pos' | 'object-rot' | 'camera-pos' | 'camera-target' | 'pan-board';
  id?: string; // 选中的 3D 元素 ID
  startX: number; // 鼠标 / 触摸屏开始时的 pageX
  startY: number; // 鼠标 / 触摸屏开始时的 pageY
  startPosX?: number; // 仅限元素/摄影机：开始拖拽时的真实坐标 X
  startPosZ?: number; // 仅限元素/摄影机：开始拖拽时的真实坐标 Z
  startRotY?: number; // 仅限元素旋转：开始时的弧度角 Y
  startPanX?: number; // 仅限视口画布：开始平移时的偏移 X
  startPanY?: number; // 仅限视口画布：开始平移时的偏移 Y
}

export default function BlockingBoard() {
  const { 
    objects, 
    selectedId, 
    setSelectedId, 
    updateObject, 
    removeObject,
    cameraPose, 
    setCameraPose, 
    themeMode,
    isCameraLocked,
    setIsCameraLocked,
    cameras,
    activeCameraName,
    setActiveCamera,
    addCamera,
    renameCamera
  } = useSceneStore();

  const isLight = themeMode === 'light';
  
  // 底部面板折叠状态 (默认展开，方便查看及引导操作)
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // 高级视图比例：网格每 1 米对应多少像素，支持 10px 到 45px，默认 24px
  const [zoom, setZoom] = useState(24);
  
  // 视口平移值 (用于在拖拽画布时进行自由平移)
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // 临时状态，用来记录目前正处于拖拽状态中的交互详情
  const dragRef = useRef<DragState | null>(null);

  // 监听容器大小以提供响应式的 1:1 二维网格
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 260 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 600,
          height: entry.contentRect.height || 260,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // 坐标系转换公式 (3D XZ Plane -> 2D SVG Canvas)
  const cx = dimensions.width / 2 + pan.x;
  const cy = dimensions.height / 2 + pan.y;

  const toSvgX = (x: number) => cx + x * zoom;
  const toSvgY = (z: number) => cy + z * zoom;

  const toWorldX = (svgX: number) => (svgX - cx) / zoom;
  const toWorldZ = (svgY: number) => (svgY - cy) / zoom;

  // 获取当前被选中元素的详情
  const selectedObj = objects.find(o => o.id === selectedId);

  // 快速"面朝摄影机"计算：让选中的演员脸部转向摄影机所在位置
  const handleFaceCamera = () => {
    if (!selectedObj) return;
    // 向量计算：从物体指向摄影机 position
    const dx = cameraPose.position.x - selectedObj.position.x;
    const dz = cameraPose.position.z - selectedObj.position.z;
    // 计算弧度
    const angle = Math.atan2(dx, dz);
    updateObject(selectedObj.id, {
      rotation: { ...selectedObj.rotation, y: angle }
    });
  };

  // 重置 2D 平面机位图的平移和缩放比例为标准中心视口
  const handleResetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(24);
  };

  // 一键对齐 3D 摄影机为 2D 完美的俯视正交视角结构
  const handleAlign3DToTopDown = () => {
    setCameraPose({
      name: '导演俯视对齐',
      position: { x: 0, y: 10, z: 0.01 }, // 维持 0.01 z 防止万向锁计算退化
      target: { x: 0, y: 0, z: 0 },
      focalLength: 35,
      aspect: cameraPose.aspect
    });
  };

  // 将旋转角度调整 90 度
  const handleRotate90 = () => {
    if (!selectedObj) return;
    const currentRotY = selectedObj.rotation.y;
    updateObject(selectedObj.id, {
      rotation: { ...selectedObj.rotation, y: currentRotY + Math.PI / 2 }
    });
  };

  // 启动鼠标或手势拖拽的状态机处理器
  const handleStartDrag = (
    e: any,
    type: DragState['type'],
    id?: string
  ) => {
    // 阻止原生行为和冒泡
    e.stopPropagation();
    
    // 如果摄影机被锁定，并且尝试拖拽相机或相机目标，直接阻止
    if (isCameraLocked && (type === 'camera-pos' || type === 'camera-target')) {
      return;
    }
    
    // 如果是鼠标右键，通常不进行拖拽
    if ('button' in e && e.button !== 0) return;

    const pageX = 'touches' in e ? e.touches[0].pageX : e.clientX;
    const pageY = 'touches' in e ? e.touches[0].pageY : e.clientY;

    let startPosX = 0;
    let startPosZ = 0;
    let startRotY = 0;

    if (type === 'object-pos' && id) {
      const obj = objects.find(o => o.id === id);
      if (obj) {
        startPosX = obj.position.x;
        startPosZ = obj.position.z;
        // 自动选中拖拽目标
        setSelectedId(id);
      }
    } else if (type === 'object-rot' && id) {
      const obj = objects.find(o => o.id === id);
      if (obj) {
        startRotY = obj.rotation.y;
        setSelectedId(id);
      }
    } else if (type === 'camera-pos') {
      startPosX = cameraPose.position.x;
      startPosZ = cameraPose.position.z;
    } else if (type === 'camera-target') {
      startPosX = cameraPose.target.x;
      startPosZ = cameraPose.target.z;
    }

    dragRef.current = {
      type,
      id,
      startX: pageX,
      startY: pageY,
      startPosX,
      startPosZ,
      startRotY,
      startPanX: pan.x,
      startPanY: pan.y
    };
  };

  // 运行中的实时拖拽移动事件 (XZ 平面降维拖拽的关键在此)
  const handleMoveDrag = (e: any) => {
    if (!dragRef.current) return;
    e.preventDefault();

    const pageX = 'touches' in e ? e.touches[0].pageX : e.clientX;
    const pageY = 'touches' in e ? e.touches[0].pageY : e.clientY;

    const info = dragRef.current;
    const deltaX = pageX - info.startX;
    const deltaY = pageY - info.startY;

    // 根据像素偏移转换为真实的 3D 世界位移距离： deltaMeters = deltaPixels / zoom
    const deltaXWorld = deltaX / zoom;
    const deltaZWorld = deltaY / zoom;

    switch (info.type) {
      case 'object-pos': {
        if (info.id && info.startPosX !== undefined && info.startPosZ !== undefined) {
          const newX = info.startPosX + deltaXWorld;
          const newZ = info.startPosZ + deltaZWorld;
          
          // 获取当前高度 Y，保证仅仅更新平面 XZ 坐标，剥离高度
          const currentY = objects.find(o => o.id === info.id)?.position.y ?? 0;
          
          updateObject(info.id, {
            position: { x: newX, y: currentY, z: newZ }
          });
        }
        break;
      }
      case 'object-rot': {
        if (info.id && info.startRotY !== undefined) {
          const obj = objects.find(o => o.id === info.id);
          if (obj) {
            const centerSvgX = toSvgX(obj.position.x);
            const centerSvgY = toSvgY(obj.position.z);
            
            // 当前鼠标在画布上的局部坐标
            const svgRect = e.currentTarget.getBoundingClientRect();
            const mouseCanvasX = pageX - svgRect.left;
            const mouseCanvasY = pageY - svgRect.top;

            const dx = mouseCanvasX - centerSvgX;
            const dy = mouseCanvasY - centerSvgY;

            // 联动旋转：计算角度，由于 3D 中 +Z 是向下 +X 是向右, 
            // 弧度 theta_euler = Math.atan2(dx, dy)
            const angle = Math.atan2(dx, dy);
            updateObject(info.id, {
              rotation: { ...obj.rotation, y: angle }
            });
          }
        }
        break;
      }
      case 'camera-pos': {
        if (info.startPosX !== undefined && info.startPosZ !== undefined) {
          const newX = info.startPosX + deltaXWorld;
          const newZ = info.startPosZ + deltaZWorld;
          setCameraPose({
            ...cameraPose,
            position: { ...cameraPose.position, x: newX, z: newZ }
          });
        }
        break;
      }
      case 'camera-target': {
        if (info.startPosX !== undefined && info.startPosZ !== undefined) {
          const newX = info.startPosX + deltaXWorld;
          const newZ = info.startPosZ + deltaZWorld;
          setCameraPose({
            ...cameraPose,
            target: { ...cameraPose.target, x: newX, z: newZ }
          });
        }
        break;
      }
      case 'pan-board': {
        if (info.startPanX !== undefined && info.startPanY !== undefined) {
          setPan({
            x: info.startPanX + deltaX,
            y: info.startPanY + deltaY
          });
        }
        break;
      }
    }
  };

  // 释放拖拽
  const handleEndDrag = () => {
    dragRef.current = null;
  };

  // 动态渲染网格交叉线与主轴 label、刻度线
  const minX = Math.floor(toWorldX(0));
  const maxX = Math.ceil(toWorldX(dimensions.width));
  const minZ = Math.floor(toWorldZ(0));
  const maxZ = Math.ceil(toWorldZ(dimensions.height));

  const gridLineX = [];
  const gridLineZ = [];

  for (let x = minX; x <= maxX; x++) {
    // 降噪：只绘制可视区间内的格网线
    gridLineX.push(x);
  }
  for (let z = minZ; z <= maxZ; z++) {
    gridLineZ.push(z);
  }

  // 二维平面上元素的颜色主题映射
  const get2DColor = (obj: StageObject) => {
    const isSelected = obj.id === selectedId;
    if (isSelected) return '#f43f5e'; // 醒目蔷薇红表示被聚焦选择中
    return obj.color;
  };

  // 计算摄影机朝向
  const camAngle = Math.atan2(
    cameraPose.target.x - cameraPose.position.x,
    cameraPose.target.z - cameraPose.position.z
  );

  return (
    <div className={`w-full shrink-0 flex flex-col font-mono border-t transition-all duration-300 ${
      isLight 
        ? 'bg-white border-neutral-200 text-neutral-800' 
        : 'bg-[#080808] border-neutral-900 text-neutral-200'
    } ${isCollapsed ? 'h-[40px]' : 'h-[300px]'}`} style={{ zIndex: 30 }}>
      
      {/* 头部导航控制条 */}
      <div className={`h-[40px] flex items-center justify-between px-4 shrink-0 border-b cursor-pointer ${
        isLight ? 'bg-neutral-50/90 border-neutral-200' : 'bg-black/90 border-neutral-900'
      }`} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="flex items-center gap-2.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-rose-600' : 'bg-rose-500'} animate-pulse`} />
          <h3 className="text-[10px] tracking-[0.2em] font-black uppercase">
            导演平面调度棋盘 / FLOOR PLAN BLOCKING BOARD
          </h3>
          <span className={`text-[9px] px-1.5 py-0.2 select-none border font-semibold ${
            isLight ? 'bg-white border-neutral-250 text-neutral-500' : 'bg-[#050505] border-neutral-800 text-neutral-400'
          }`}>
            降维推子 1:1 联动
          </span>
        </div>

        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          {/* 当展开时，提供视图操作快捷按钮 */}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 scale-90 sm:scale-100 origin-right">
              {/* 摄影机 alignment */}
              <button 
                onClick={handleAlign3DToTopDown}
                title="垂直俯视：一键将 3D 取景器设置为对应俯视图"
                className={`flex items-center gap-1 py-1 px-2.5 border text-[9px] font-black tracking-wider uppercase transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-neutral-100 border-neutral-250 hover:bg-neutral-900 hover:text-white' 
                    : 'bg-[#040404]/60 border-neutral-800 text-neutral-300 hover:bg-white hover:text-black'
                }`}
              >
                <Tv className="w-3 h-3" /> 俯视对齐 3D
              </button>

              <button 
                onClick={() => setIsCameraLocked(!isCameraLocked)}
                title={isCameraLocked ? "解锁摄影机：允许旋转/平移/缩放 3D 摄像机" : "锁定摄影机：禁止改变当前 3D 摄像机位置与视角"}
                className={`flex items-center gap-1.5 py-1 px-2.5 border text-[9px] font-black tracking-wider uppercase transition-colors cursor-pointer ${
                  isCameraLocked
                    ? 'bg-rose-600 border-rose-700 text-white'
                    : isLight 
                      ? 'bg-neutral-100 border-neutral-250 hover:bg-neutral-900 hover:text-white text-neutral-750' 
                      : 'bg-[#040404]/60 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900'
                }`}
              >
                {isCameraLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {isCameraLocked ? '已锁摄影机' : '锁定摄影机'}
              </button>

              <div className={`h-3.5 w-[1px] mx-1 ${isLight ? 'bg-neutral-200' : 'bg-neutral-800'}`} />

              {/* 2D 棋盘快捷按钮 */}
              <button 
                onClick={handleResetView}
                title="重置 2D 棋盘的大小与对齐平移中心"
                className={`p-1 border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-neutral-100 border-neutral-250 hover:bg-neutral-900 hover:text-white' 
                    : 'bg-[#040404]/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button 
                onClick={() => setZoom(Math.max(12, zoom - 4))}
                title="缩小网格比例"
                className={`p-1 border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-neutral-100 border-neutral-250 hover:bg-neutral-900 hover:text-white' 
                    : 'bg-[#040404]/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <button 
                onClick={() => setZoom(Math.min(45, zoom + 4))}
                title="放大网格比例"
                className={`p-1 border transition-colors cursor-pointer ${
                  isLight 
                    ? 'bg-neutral-100 border-neutral-250 hover:bg-neutral-900 hover:text-white' 
                    : 'bg-[#040404]/60 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className={`h-4 w-[1px] ${isLight ? 'bg-neutral-200' : 'bg-neutral-800'}`} />

          <button 
            type="button"
            className={`p-0.5 border cursor-pointer hover:scale-105 transition-transform ${
              isLight ? 'border-neutral-250 hover:bg-neutral-100' : 'border-neutral-800 hover:bg-neutral-900'
            }`}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2D 棋盘核心面板 (在被展开时才会出现渲染，性能高，体积轻) */}
      {!isCollapsed && (
        <div className="flex-1 flex min-h-0 relative">
          
          {/* 左侧主视口操作区 */}
          <div 
            ref={containerRef}
            className="flex-1 relative h-full overflow-hidden outline-none"
            style={{ cursor: dragRef.current?.type === 'pan-board' ? 'grabbing' : 'grab' }}
          >
            {/* 浮动独立剧组多机位控制台 / FLOATING CREW CAMERAS DOCK */}
            <div className={`absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 p-1 px-1.5 border backdrop-blur-sm shadow-md transition-all select-none ${
              isLight 
                ? 'bg-white/95 border-neutral-250 text-neutral-800' 
                : 'bg-black/95 border-neutral-850 text-neutral-200'
            }`}>
              <div className="flex items-center gap-1 pl-0.5 pr-2 border-r border-neutral-200 md:border-neutral-800 shrink-0">
                <span className="text-[8px] font-black tracking-widest uppercase opacity-75">现场机位 CAM</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 pr-1 max-w-[180px] sm:max-w-[400px] scrollbar-none">
                {cameras.map(cam => {
                  const isActive = cam.name === activeCameraName;
                  return (
                    <button
                      key={`floor-dock-cam-${cam.name}`}
                      onClick={() => setActiveCamera(cam.name)}
                      onDoubleClick={() => {
                        const newName = prompt(`将该镜头的机位 "${cam.name}" 重新命名为:`, cam.name);
                        if (newName && newName.trim()) {
                          renameCamera(cam.name, newName);
                        }
                      }}
                      title="单击一键切换，双击重命名机位"
                      className={`px-2 py-0.5 text-[8.5px] font-bold border rounded-none transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-orange-500 border-orange-600 text-white shadow-sm font-black'
                          : isLight
                            ? 'bg-neutral-50 hover:bg-neutral-200 border-neutral-250 text-neutral-700 font-medium'
                            : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-450 font-medium'
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-white animate-pulse' : 'bg-neutral-500'} shrink-0`} />
                      {cam.name}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => {
                  const name = prompt("请输入新增机位的名称（例如: 侧面大广角）:", `机位-${cameras.length + 1}`);
                  if (name !== null) {
                    addCamera(name);
                  }
                }}
                title="克隆或添加当前主视口坐标的新机台"
                className={`py-0.5 px-2 text-[8px] font-black border transition-colors flex items-center gap-1 cursor-pointer shrink-0 ${
                  isLight 
                    ? 'bg-neutral-900 border-neutral-950 hover:bg-neutral-800 text-white' 
                    : 'bg-white border-white hover:bg-neutral-200 text-black'
                }`}
              >
                + 添加
              </button>
            </div>

            <svg
              className="absolute inset-0 w-full h-full select-none"
              onMouseMove={handleMoveDrag}
              onTouchMove={handleMoveDrag}
              onMouseUp={handleEndDrag}
              onTouchEnd={handleEndDrag}
              onMouseLeave={handleEndDrag}
              onMouseDown={(e) => {
                // 点击空白网格，触发自由平移平推 canvas
                handleStartDrag(e, 'pan-board');
              }}
              onTouchStart={(e) => {
                // 触摸空白网格触发触摸平移
                handleStartDrag(e, 'pan-board');
              }}
            >
              <defs>
                {/* 投影滤镜 - 创造高级层次悬浮高光 */}
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity={isLight ? "0.1" : "0.4"} />
                </filter>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* DRAW GRID - 绘制无缝平移网格背景 */}
              <g>
                {/* Z 刻度横向虚线 */}
                {gridLineZ.map(z => {
                  const yPos = toSvgY(z);
                  const isMain = z === 0;
                  return (
                    <g key={`hz-${z}`}>
                      <line
                        x1="0"
                        y1={yPos}
                        x2={dimensions.width}
                        y2={yPos}
                        stroke={isMain ? (isLight ? '#52525b' : '#a1a1aa') : (isLight ? '#e5e5e5' : '#18181b')}
                        strokeWidth={isMain ? 1.5 : 0.75}
                        strokeDasharray={isMain ? '' : '3, 4'}
                      />
                      {/* 横轴数字显示 */}
                      {z % 2 === 0 && (
                        <text
                          x={cx + 6}
                          y={yPos - 4}
                          fontSize="8px"
                          className={`${isLight ? 'fill-neutral-400' : 'fill-neutral-600'} font-bold`}
                        >
                          {z}m
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* X 刻度纵向虚线 */}
                {gridLineX.map(x => {
                  const xPos = toSvgX(x);
                  const isMain = x === 0;
                  return (
                    <g key={`vt-${x}`}>
                      <line
                        x1={xPos}
                        y1="0"
                        x2={xPos}
                        y2={dimensions.height}
                        stroke={isMain ? (isLight ? '#52525b' : '#a1a1aa') : (isLight ? '#e5e5e5' : '#18181b')}
                        strokeWidth={isMain ? 1.5 : 0.75}
                        strokeDasharray={isMain ? '' : '3, 4'}
                      />
                      {/* 纵轴数字 */}
                      {x !== 0 && x % 2 === 0 && (
                        <text
                          x={xPos + 3}
                          y={cy - 6}
                          fontSize="8px"
                          className={`${isLight ? 'fill-neutral-400' : 'fill-neutral-600'} font-bold`}
                        >
                          {x > 0 ? `+${x}` : x}m
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* THREE.JS STAGE CENTER Cross 标志中心 */}
              <circle cx={cx} cy={cy} r="3" className={isLight ? 'fill-neutral-400' : 'fill-neutral-700'} />

              {/* RENDER STAGE OBJECT TOKENS / 绘制舞台上的角色 & 模型棋子 */}
              {objects.map(obj => {
                const ox = toSvgX(obj.position.x);
                const oz = toSvgY(obj.position.z);
                const isSelected = selectedId === obj.id;
                
                // 二维展示上不同角色棋子拥有独立大小形式
                const isActor = obj.type === 'actor';
                const isLightSource = obj.type === 'light';
                const isProps = obj.type === 'prop';
                const isWall = obj.type === 'wall';
                const isMarker = obj.type === 'marker';

                // 底座半径
                const radius = isActor ? 14 : isMarker ? 12 : 11;

                // 2D 棋子朝向旋转计算，用来画出朝向方向箭头和朝向拨盘
                const rYaw = obj.rotation.y; 
                const indicatorLen = radius + 8;
                // 在二维视角中：dx = sin(yaw), dz = cos(yaw)
                const dxIndicator = Math.sin(rYaw) * indicatorLen;
                const dzIndicator = Math.cos(rYaw) * indicatorLen;
                const pxIndicator = ox + dxIndicator;
                const pyIndicator = oz + dzIndicator;

                return (
                  <g 
                    key={`token-${obj.id}`}
                    className="group"
                    filter="url(#shadow)"
                  >
                    {/* 朝向箭头 / 方向锁定连接线 (仅限可选择的角色面朝向，道具、墙等均支持) */}
                    {!isMarker && (
                      <g>
                        {/* 朝向延长线 */}
                        <line
                          x1={ox}
                          y1={oz}
                          x2={pxIndicator}
                          y2={pyIndicator}
                          stroke={isSelected ? '#f43f5e' : (isLight ? '#737373' : '#a3a3a3')}
                          strokeWidth="1.5"
                          strokeDasharray={isSelected ? '' : '1, 1'}
                        />
                        {/* 箭角 */}
                        <polygon
                          points={`${pxIndicator},${pyIndicator} ${pxIndicator - Math.sin(rYaw + 0.35) * 5},${pyIndicator - Math.cos(rYaw + 0.35) * 5} ${pxIndicator - Math.sin(rYaw - 0.35) * 5},${pyIndicator - Math.cos(rYaw - 0.35) * 5}`}
                          fill={isSelected ? '#f43f5e' : (isLight ? '#737373' : '#a3a3a3')}
                        />
                        {/* 贴心的旋转控制手柄（拖拽此处实现二维一键指向朝向变更） */}
                        <circle
                          cx={pxIndicator}
                          cy={pyIndicator}
                          r="5.5"
                          className={`${
                            isSelected 
                              ? 'fill-rose-500 hover:fill-rose-400 stroke-white' 
                              : (isLight ? 'fill-neutral-500 hover:fill-neutral-800' : 'fill-neutral-400 hover:fill-neutral-100')
                          } cursor-alias`}
                          stroke="transparent"
                          strokeWidth="3"
                          onMouseDown={(e) => handleStartDrag(e, 'object-rot', obj.id)}
                          onTouchStart={(e) => handleStartDrag(e, 'object-rot', obj.id)}
                        >
                          <title>拖拽改变该元素的面向朝向 (Facing Y)</title>
                        </circle>
                      </g>
                    )}

                    {/* 具体类型的图形表达 */}
                    {isActor && (
                      <circle
                        cx={ox}
                        cy={oz}
                        r={radius}
                        className="transition-all cursor-move stroke-2"
                        stroke={isSelected ? '#f43f5e' : (isLight ? '#3f3f46' : '#f4f4f5')}
                        fill={isSelected ? '#fff1f2' : (isLight ? '#f4f4f5' : '#27272a')}
                        onMouseDown={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                        onTouchStart={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                      />
                    )}

                    {isProps && (
                      <g
                        transform={`translate(${ox}, ${oz}) rotate(${rYaw * 180 / Math.PI})`}
                        className="cursor-move"
                        onMouseDown={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                        onTouchStart={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                      >
                        <rect
                          x={Math.max(-25, -obj.scale.x * zoom * 0.5)}
                          y={Math.max(-25, -obj.scale.z * zoom * 0.5)}
                          width={Math.max(12, obj.scale.x * zoom)}
                          height={Math.max(12, obj.scale.z * zoom)}
                          rx="1.5"
                          className="stroke-2"
                          stroke={isSelected ? '#f43f5e' : (isLight ? '#52525b' : '#a1a1aa')}
                          fill={isSelected ? '#fff1f2' : (isLight ? '#e4e4e7' : '#3f3f46')}
                        />
                      </g>
                    )}

                    {isWall && (
                      <g
                        transform={`translate(${ox}, ${oz}) rotate(${rYaw * 180 / Math.PI})`}
                        className="cursor-move"
                        onMouseDown={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                        onTouchStart={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                      >
                        <rect
                          x={Math.max(-45, -obj.scale.x * zoom * 0.5)}
                          y={Math.max(-5, -obj.scale.z * zoom * 0.5)}
                          width={Math.max(20, obj.scale.x * zoom)}
                          height={Math.max(4, obj.scale.z * zoom)}
                          rx="0"
                          className="stroke-2"
                          stroke={isSelected ? '#f43f5e' : (isLight ? '#18181b' : '#f4f4f5')}
                          fill={isSelected ? '#ffe4e6' : (isLight ? '#52525b' : '#18181b')}
                        />
                      </g>
                    )}

                    {isLightSource && (
                      <g
                        className="cursor-move"
                        onMouseDown={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                        onTouchStart={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                      >
                        {/* 放射性晕圈 */}
                        <circle
                          cx={ox}
                          cy={oz}
                          r={radius * 1.5}
                          className="fill-yellow-500/10 stroke-1 stroke-dashed stroke-yellow-400"
                        />
                        <circle
                          cx={ox}
                          cy={oz}
                          r={radius}
                          className="stroke-2 stroke-yellow-500 fill-amber-100"
                        />
                      </g>
                    )}

                    {isMarker && (
                      <circle
                        cx={ox}
                        cy={oz}
                        r={radius}
                        className="stroke-2 stroke-dashed stroke-blue-500 fill-blue-500/10 cursor-move"
                        onMouseDown={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                        onTouchStart={(e) => handleStartDrag(e, 'object-pos', obj.id)}
                      />
                    )}

                    {/* 文字标签 Label 居中显示 */}
                    {isActor && (
                      <text
                        x={ox}
                        y={oz + 3}
                        textAnchor="middle"
                        fontSize="9.5px"
                        fontWeight="900"
                        className={`${isSelected ? 'fill-rose-600' : (isLight ? 'fill-neutral-900' : 'fill-neutral-100')} pointer-events-none select-none`}
                      >
                        {obj.label}
                      </text>
                    )}

                    {!isActor && (
                      <text
                        x={ox}
                        y={oz + (isWall ? 12 : isProps ? -12 : 3)}
                        textAnchor="middle"
                        fontSize="8px"
                        fontWeight="bold"
                        className={`font-mono px-0.5 rounded-none pointer-events-none ${
                          isSelected ? 'fill-rose-500' : (isLight ? 'fill-neutral-500' : 'fill-neutral-400')
                        }`}
                      >
                        {obj.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* RENDER INACTIVE CAMERAS / 渲染其他非处于活跃的摄像机机位，提供直观的空间参考，一击即可进行机台切换 */}
              {cameras.map(cam => {
                if (cam.name === activeCameraName) return null;

                // 计算不活跃机器人的角度以绘制其朝向
                const inactiveAngle = Math.atan2(
                  cam.target.x - cam.position.x,
                  cam.target.z - cam.position.z
                );

                return (
                  <g 
                    key={`inactive-cam-drawing-${cam.name}`}
                    className="cursor-pointer group opacity-35 hover:opacity-85 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCamera(cam.name);
                    }}
                  >
                    <title>{`点击以切换并激活 ${cam.name} 镜头机位`}</title>
                    {/* 不活跃相机视线：灰色细柔虚线 */}
                    <line
                      x1={toSvgX(cam.position.x)}
                      y1={toSvgY(cam.position.z)}
                      x2={toSvgX(cam.target.x)}
                      y2={toSvgY(cam.target.z)}
                      className={`${isLight ? 'stroke-neutral-300' : 'stroke-neutral-800'}`}
                      strokeWidth="0.8"
                      strokeDasharray="3, 4"
                    />

                    {/* 虚弱聚焦靶点 */}
                    <circle
                      cx={toSvgX(cam.target.x)}
                      cy={toSvgY(cam.target.z)}
                      r="4.5"
                      className={`fill-none stroke-1 ${isLight ? 'stroke-neutral-400' : 'stroke-neutral-600'}`}
                    />
                    <circle
                      cx={toSvgX(cam.target.x)}
                      cy={toSvgY(cam.target.z)}
                      r="1.2"
                      className={isLight ? 'fill-neutral-400' : 'fill-neutral-600'}
                    />
                    <text
                      x={toSvgX(cam.target.x)}
                      y={toSvgY(cam.target.z) - 6}
                      textAnchor="middle"
                      fontSize="6.5px"
                      className="fill-neutral-500 font-mono opacity-80"
                    >
                      {cam.name}_T
                    </text>

                    {/* 不活跃相机主体 */}
                    <circle
                      cx={toSvgX(cam.position.x)}
                      cy={toSvgY(cam.position.z)}
                      r="9.5"
                      className={`${
                        isLight 
                          ? 'fill-neutral-100 hover:fill-neutral-200 stroke-neutral-400' 
                          : 'fill-neutral-900 hover:fill-neutral-800 stroke-neutral-750'
                      } stroke-1`}
                    />
                    {/* 三角方向小指针 */}
                    <polygon
                      points={`
                        ${toSvgX(cam.position.x) - 3.5},${toSvgY(cam.position.z) - 2.5}
                        ${toSvgX(cam.position.x) + 3.5},${toSvgY(cam.position.z) - 2.5}
                        ${toSvgX(cam.position.x) + 3.5},${toSvgY(cam.position.z) + 3}
                        ${toSvgX(cam.position.x) - 3.5},${toSvgY(cam.position.z) + 3}
                      `}
                      className={isLight ? 'fill-neutral-400' : 'fill-neutral-600'}
                      transform={`rotate(${(-inactiveAngle * 180) / Math.PI + 90}, ${toSvgX(cam.position.x)}, ${toSvgY(cam.position.z)})`}
                    />
                    <polygon
                      points={`
                        ${toSvgX(cam.position.x) + 3.5},${toSvgY(cam.position.z)}
                        ${toSvgX(cam.position.x) + 7},${toSvgY(cam.position.z) - 3}
                        ${toSvgX(cam.position.x) + 7},${toSvgY(cam.position.z) + 3}
                      `}
                      className={isLight ? 'fill-neutral-400' : 'fill-neutral-600'}
                      transform={`rotate(${(-inactiveAngle * 180) / Math.PI + 90}, ${toSvgX(cam.position.x)}, ${toSvgY(cam.position.z)})`}
                    />

                    {/* 相机名字 */}
                    <text
                      x={toSvgX(cam.position.x)}
                      y={toSvgY(cam.position.z) + 13}
                      textAnchor="middle"
                      fontSize="7px"
                      fontWeight="bold"
                      className={isLight ? 'fill-neutral-500 font-mono tracking-wide' : 'fill-neutral-400 font-mono tracking-wide'}
                    >
                      {cam.name}
                    </text>
                  </g>
                );
              })}

              {/* RENDER DYNAMIC 3D CAMERA / 渲染 3D 摄影机本身及其取景虚线与视角区 (Frustum) */}
              <g filter="url(#shadow)">
                {/* 摄影机指引连线：从摄影机位置指向其 Target 视点 */}
                <line
                  x1={toSvgX(cameraPose.position.x)}
                  y1={toSvgY(cameraPose.position.z)}
                  x2={toSvgX(cameraPose.target.x)}
                  y2={toSvgY(cameraPose.target.z)}
                  stroke="#f97316" // 暖亮橘代表焦点光轴
                  strokeWidth="1.2"
                  strokeDasharray="4, 5"
                />

                {/* 3D 摄影机锥形视角遮罩 cone frustum (角度取焦距对应的折中视角，增加氛围) */}
                <path
                  d={`
                    M ${toSvgX(cameraPose.position.x)} ${toSvgY(cameraPose.position.z)}
                    L ${toSvgX(cameraPose.position.x) + Math.sin(camAngle - 0.35) * 55} ${toSvgY(cameraPose.position.z) + Math.cos(camAngle - 0.35) * 55}
                    A 55 55 0 0 1 ${toSvgX(cameraPose.position.x) + Math.sin(camAngle + 0.35) * 55} ${toSvgY(cameraPose.position.z) + Math.cos(camAngle + 0.35) * 55}
                    Z
                  `}
                  className="fill-orange-500/10 pointer-events-none"
                />

                {/* 摄影机 Target 三点聚焦红圈 */}
                <g 
                  className="cursor-crosshair"
                  onMouseDown={(e) => handleStartDrag(e, 'camera-target')}
                  onTouchStart={(e) => handleStartDrag(e, 'camera-target')}
                >
                  <circle
                    cx={toSvgX(cameraPose.target.x)}
                    cy={toSvgY(cameraPose.target.z)}
                    r="8"
                    className="fill-orange-500/10 stroke-1.5 stroke-orange-500 hover:scale-110 active:scale-95 transition-transform"
                  />
                  <circle
                    cx={toSvgX(cameraPose.target.x)}
                    cy={toSvgY(cameraPose.target.z)}
                    r="2"
                    className="fill-orange-600"
                  />
                  {/* 文字标签 target */}
                  <text
                    x={toSvgX(cameraPose.target.x)}
                    y={toSvgY(cameraPose.target.z) - 10}
                    textAnchor="middle"
                    fontSize="7.5px"
                    fontWeight="black"
                    className="fill-orange-500 font-mono tracking-wider"
                  >
                    FOCUS_TGT
                  </text>
                </g>

                {/* 摄影机主体 Token 造型 */}
                <g 
                  className="cursor-move group"
                  onMouseDown={(e) => handleStartDrag(e, 'camera-pos')}
                  onTouchStart={(e) => handleStartDrag(e, 'camera-pos')}
                >
                  {/* 外遮罩环 */}
                  <circle
                    cx={toSvgX(cameraPose.position.x)}
                    cy={toSvgY(cameraPose.position.z)}
                    r="12.5"
                    className="fill-orange-500 hover:fill-orange-600 stroke-[1.5] stroke-white group-hover:scale-105 transition-transform"
                  />
                  {/* 电影摄影机特征标志：镜头三角形等 */}
                  <polygon
                    points={`
                      ${toSvgX(cameraPose.position.x) - 4},${toSvgY(cameraPose.position.z) - 3}
                      ${toSvgX(cameraPose.position.x) + 4},${toSvgY(cameraPose.position.z) - 3}
                      ${toSvgX(cameraPose.position.x) + 4},${toSvgY(cameraPose.position.z) + 4}
                      ${toSvgX(cameraPose.position.x) - 4},${toSvgY(cameraPose.position.z) + 4}
                    `}
                    className="fill-white"
                  />
                  <polygon
                    points={`
                      ${toSvgX(cameraPose.position.x) + 4},${toSvgY(cameraPose.position.z)}
                      ${toSvgX(cameraPose.position.x) + 9},${toSvgY(cameraPose.position.z) - 4}
                      ${toSvgX(cameraPose.position.x) + 9},${toSvgY(cameraPose.position.z) + 4}
                    `}
                    className="fill-white"
                  />
                  {/* 刻字 CAM */}
                  <text
                    x={toSvgX(cameraPose.position.x)}
                    y={toSvgY(cameraPose.position.z) + 16}
                    textAnchor="middle"
                    fontSize="8px"
                    fontWeight="black"
                    className="fill-orange-600 tracking-[0.1em]"
                  >
                    CAM
                  </text>
                </g>
              </g>
            </svg>

            {/* 左下角小指南针/指示信息 */}
            <div className={`absolute bottom-3 left-3 p-1.5 backdrop-blur-md border text-[8.5px] tracking-widest font-mono flex flex-col gap-1 rounded-none pointer-events-none select-none ${
              isLight ? 'bg-white/90 border-neutral-250 text-neutral-500' : 'bg-black/95 border-neutral-900 text-neutral-400'
            }`}>
              <div className="flex items-center gap-1.5">
                <Compass className={`w-3 h-3 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`} />
                <span>XZ 棋盘: 1 格 = 1 X 1 米 (MOKE_SYSTEM)</span>
              </div>
              <div className="text-[7.5px] opacity-75">
                拖拽元素块平移 | 拖拽朝向点自旋转 | CAM橙色机头控制焦域
              </div>
            </div>
          </div>

          {/* 右侧微调小控制台 (当选中元素时激活，进行极其高效便捷的扁平化操作，减少跨面障碍) */}
          <div className={`w-[220px] h-full overflow-y-auto shrink-0 border-l flex flex-col p-3 text-[10px] space-y-3 justify-between ${
            isLight ? 'bg-neutral-50/70 border-neutral-200' : 'bg-[#040404]/80 border-neutral-900'
          }`}>
            {selectedObj ? (
              <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold tracking-wider text-[11px] text-rose-500 uppercase">
                      [{selectedObj.label}] 快速微调 / SETS
                    </span>
                    <button 
                      onClick={() => removeObject(selectedObj.id)}
                      className={`p-1 border rounded-none transition-all text-neutral-400 hover:text-red-500 hover:border-red-500 cursor-pointer ${
                        isLight ? 'border-neutral-200 hover:bg-neutral-100' : 'border-neutral-800 hover:bg-neutral-900'
                      }`}
                      title="一键移除该元素"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {/* 显示物体类型与尺寸 */}
                    <div className="flex justify-between items-center text-[9px] py-1 border-b border-dashed border-neutral-800/10 dark:border-neutral-800">
                      <span className="text-neutral-400">组件类型:</span>
                      <span className="font-bold uppercase tracking-wider">
                        {selectedObj.type === 'actor' ? '角色 / Actor' : 
                         selectedObj.type === 'prop' ? '道具 / Prop' : 
                         selectedObj.type === 'wall' ? '墙壁 / Wall' : 
                         selectedObj.type === 'light' ? '灯光 / Light' : '标记点 / Marker'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[9px] py-1 border-b border-dashed border-neutral-800/10 dark:border-neutral-800">
                      <span className="text-neutral-400">XZ 坐标位 (米):</span>
                      <span className="font-mono font-medium">
                        X:{selectedObj.position.x.toFixed(2)}, Z:{selectedObj.position.z.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[9px] py-1 border-b border-dashed border-neutral-800/10 dark:border-neutral-800">
                      <span className="text-neutral-400">高度 Y (固定高度):</span>
                      <span className="font-mono text-neutral-500">
                        {selectedObj.position.y.toFixed(2)}m
                      </span>
                    </div>

                    {/* 朝向滑块：快速调整 Y-rotation 面向角度 */}
                    <div className="space-y-1.5 pt-1.5">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-neutral-400">面向朝向角 (Y-Rotation):</span>
                        <span className="font-mono font-bold">
                          {Math.round(selectedObj.rotation.y * 180 / Math.PI)}°
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="-180"
                        max="180"
                        step="5"
                        value={Math.round(selectedObj.rotation.y * 180 / Math.PI)}
                        onChange={(e) => {
                          const rad = parseInt(e.target.value) * Math.PI / 180;
                          updateObject(selectedObj.id, {
                            rotation: { ...selectedObj.rotation, y: rad }
                          });
                        }}
                        className={`w-full h-1 rounded-none appearance-none cursor-pointer ${
                          isLight ? 'bg-neutral-200 accent-neutral-800' : 'bg-neutral-800 accent-white'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* 扁平调度高价值按钮 */}
                <div className="space-y-1.5 pt-4 border-t border-dashed border-orange-500/10">
                  <span className="block text-[8.5px] text-neutral-400 uppercase tracking-widest leading-normal mb-1">
                    电影机位一键指向 / DIRECTOR LOCKS
                  </span>
                  
                  {selectedObj.type === 'actor' && (
                    <button
                      onClick={handleFaceCamera}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[9.5px] font-black border tracking-wider rounded-none uppercase cursor-pointer transition-all ${
                        isLight 
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700' 
                          : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-600'
                      }`}
                      title="控制选中角色面朝摄影机"
                    >
                      朝向 3D 摄影机
                    </button>
                  )}

                  <button
                    onClick={handleRotate90}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-[9px] font-bold border rounded-none uppercase cursor-pointer transition-colors ${
                      isLight 
                        ? 'bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100' 
                        : 'bg-[#030303] border-neutral-800 text-neutral-300 hover:bg-neutral-900'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" /> 瞬转 90度 (平面)
                  </button>
                  
                  <div className="text-[8.5px] leading-relaxed text-neutral-500 text-center scale-95 pt-0.5">
                    选中 {selectedObj.label} 并在三维场景中实时同步
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-2 space-y-2 text-neutral-500 select-none">
                <Move className="w-6 h-6 stroke-1 text-neutral-400 animate-bounce" />
                <span className="font-bold tracking-wider text-[10px] uppercase text-neutral-400">
                  未选中任何棋子 / NO TOKEN
                </span>
                <p className="text-[8px] leading-relaxed text-neutral-400">
                  点击二维平面棋子或三维模型、或者下侧底盘拖动其绿色方向锚点
                </p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
