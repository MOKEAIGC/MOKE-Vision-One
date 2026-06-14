// 文件路径: components/director3d/components/Scene.tsx
import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls, Grid, Environment, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useSceneStore } from '../store';
import { StageObject } from '../types';
import { CoordinateUpdater } from './CoordinateOverlay';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

// 角色模型路径（public/models/xbot.glb → 运行时 /models/xbot.glb）
const ACTOR_MODEL_URL = '/models/xbot.glb';

// 场景比例约定：原始 GLB 单位极小，按需求统一放大 100 倍。
// 脚底贴地 (局部 y=0)、水平居中。选中时材质自发光高亮。每个实例独立克隆骨骼与材质。
const ACTOR_SCALE = 100; // 缩放 100 倍

function ActorModel({ selected }: { selected: boolean }) {
  const { scene } = useGLTF(ACTOR_MODEL_URL);

  const model = useMemo(() => {
    const cloned = SkeletonUtils.clone(scene) as THREE.Object3D;

    // 1. 固定放大 100 倍
    cloned.scale.setScalar(ACTOR_SCALE);

    // 2. 缩放后计算包围盒，脚底贴地并水平居中（若包围盒无效则跳过偏移）
    cloned.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(cloned);
    if (isFinite(box.min.y) && isFinite(box.max.y)) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      cloned.position.set(-center.x, -box.min.y, -center.z);
    }

    // 3. 克隆材质，避免不同实例的高亮互相污染
    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m: THREE.Material) => m.clone());
        } else if (child.material) {
          child.material = child.material.clone();
        }
      }
    });

    return cloned;
  }, [scene]);

  // 选中高亮
  useEffect(() => {
    model.traverse((child: any) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m: any) => {
          if (m.emissive) {
            m.emissive.set(selected ? '#3B82F6' : '#000000');
            m.emissiveIntensity = selected ? 0.35 : 0;
            m.needsUpdate = true;
          }
        });
      }
    });
  }, [selected, model]);

  return <primitive object={model} />;
}

useGLTF.preload(ACTOR_MODEL_URL);

// Camera helper to override OrbitControls and set custom poses
function CameraSetup() {
  const { camera, controls } = useThree();
  const cameraPose = useSceneStore(state => state.cameraPose);

  useEffect(() => {
    camera.position.set(cameraPose.position.x, cameraPose.position.y, cameraPose.position.z);
    // Approximate focal length setup (vertical fov)
    // Three.js perspective camera uses fov. 35mm equivalent conversion approximation:
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = (2 * Math.atan(24 / (2 * cameraPose.focalLength))) * (180 / Math.PI);
      camera.updateProjectionMatrix();
    }
    
    if (controls) {
      if ('target' in controls) {
        (controls as any).target.set(cameraPose.target.x, cameraPose.target.y, cameraPose.target.z);
        (controls as any).update();
      }
    } else {
      camera.lookAt(cameraPose.target.x, cameraPose.target.y, cameraPose.target.z);
    }
  }, [cameraPose, camera, controls]);

  return null;
}

function ObjectMesh({ obj: inputObj }: { obj: StageObject }) {
  const { selectedId, setSelectedId, updateObject, transformMode, themeMode, showAllLabels } = useSceneStore();
  const isCurrentlySelected = selectedId === inputObj.id;
  const isLight = themeMode === 'light';
  
  // 极智工业风材质代理：选中时强制亮白/暗黑反差高亮，未选中时采用柔和色调
  const obj = {
    ...inputObj,
    color: isCurrentlySelected ? (isLight ? '#111111' : '#ffffff') : inputObj.color
  };
  
  const isSelected = false; // 驱动子 mesh `isSelected ? '#3B82F6' : obj.color` 走向 obj.color (即上述设定的白)
  
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setSelectedId(obj.id);
  };

  if (obj.type === 'actor') {
    return (
      <>
        <group
          ref={groupRef as any}
          position={[obj.position.x, obj.position.y, obj.position.z]}
          rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}
          scale={[
            (obj.scale?.x ?? 0.6) / 0.6,
            (obj.scale?.y ?? 1.7) / 1.7,
            (obj.scale?.z ?? 0.4) / 0.4
          ]}
          onPointerDown={handlePointerDown}
        >
          {/* 角色 GLB 模型 (xbot.glb) */}
          <ActorModel selected={isCurrentlySelected} />

          {/* Direction indicator */}
          <mesh position={[0, 0.95, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.04, 0.1, 8]} />
            <meshStandardMaterial color="white" />
          </mesh>
          {(showAllLabels || obj.showLabel) && (
            <Html position={[0, 1.1, 0]} center style={{ pointerEvents: 'none' }}>
              <div className="bg-black/90 backdrop-blur-md text-white text-[9px] font-bold tracking-[0.15em] px-2 py-0.5 rounded-none border border-neutral-800 font-mono whitespace-nowrap uppercase">
                {obj.label}
              </div>
            </Html>
          )}
        </group>
        {isCurrentlySelected && (
          <TransformControls 
            object={groupRef as any} 
            mode={transformMode}
            onObjectChange={() => {
              if (!groupRef.current) return;
              const target = groupRef.current;
              updateObject(obj.id, {
                position: { x: target.position.x, y: target.position.y, z: target.position.z },
                rotation: { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
                scale: {
                  x: target.scale.x * 0.6,
                  y: target.scale.y * 1.7,
                  z: target.scale.z * 0.4
                }
              });
            }}
          />
        )}
      </>
    );
  }

  // Decide geometry based on type
  let geometry;
  switch (obj.type) {
    case 'prop': geometry = <boxGeometry args={[1, 1, 1]} />; break;
    case 'wall': geometry = <boxGeometry args={[1, 1, 1]} />; break;
    case 'marker': geometry = <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />; break;
    case 'light': geometry = <sphereGeometry args={[0.5, 16, 16]} />; break;
    default: geometry = <boxGeometry args={[1, 1, 1]} />;
  }

  return (
    <>
      <mesh
        ref={meshRef}
        position={[obj.position.x, obj.position.y, obj.position.z]}
        rotation={[obj.rotation.x, obj.rotation.y, obj.rotation.z]}
        scale={obj.type === 'marker' || obj.type === 'light' ? [1,1,1] : [obj.scale.x, obj.scale.y, obj.scale.z]}
        onPointerDown={handlePointerDown}
      >
        {geometry}
        <meshStandardMaterial color={isSelected ? '#3B82F6' : obj.color} roughness={0.7} />
        {(showAllLabels || obj.showLabel) && (
          <Html position={[0, 0.6, 0]} center style={{ pointerEvents: 'none' }}>
            <div className={`backdrop-blur-md text-[9px] font-bold tracking-[0.15em] px-2 py-0.5 rounded-none border font-mono whitespace-nowrap uppercase transition-colors ${isLight ? 'bg-white/95 text-neutral-800 border-neutral-350 shadow-sm' : 'bg-black/90 text-white border-neutral-800'}`}>
              {obj.label}
            </div>
          </Html>
        )}
      </mesh>
      
      {isCurrentlySelected && (
        <TransformControls 
          object={meshRef} 
          mode={transformMode}
          onObjectChange={(e) => {
            if (!meshRef.current) return;
            const target = meshRef.current;
            updateObject(obj.id, {
              position: { x: target.position.x, y: target.position.y, z: target.position.z },
              rotation: { x: target.rotation.x, y: target.rotation.y, z: target.rotation.z },
              // In scale mode TransformControls changes scale of the mesh directly
              ...(obj.type === 'prop' || obj.type === 'wall' ? { scale: { x: target.scale.x, y: target.scale.y, z: target.scale.z } } : {})
            });
          }}
        />
      )}
    </>
  );
}

export default function Scene() {
  const { 
    objects, 
    setSelectedId, 
    gridOpacity, 
    themeMode, 
    isCameraLocked, 
    cameraPose, 
    setCameraPose 
  } = useSceneStore();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const isLight = themeMode === 'light';

  const handleOrbitEnd = () => {
    if (!controlsRef.current) return;
    const { object, target } = controlsRef.current;
    setCameraPose({
      ...cameraPose,
      position: { x: object.position.x, y: object.position.y, z: object.position.z },
      target: { x: target.x, y: target.y, z: target.z }
    });
  };

  return (
    <div id="director3d-scene-root" className="w-full h-full relative group">
      {/* Center Crosshair Overlay */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none z-10 flex items-center justify-center">
        <div className={`w-full h-[1px] transition-colors ${isLight ? 'bg-neutral-800/20' : 'bg-white/30'}`} />
        <div className={`absolute h-full w-[1px] transition-colors ${isLight ? 'bg-neutral-800/20' : 'bg-white/30'}`} />
      </div>

      <Canvas 
        gl={{ preserveDrawingBuffer: true }}
        onPointerMissed={() => setSelectedId(null)}
      >
        <color attach="background" args={[isLight ? '#e5e5e7' : '#060606']} />
        
        <ambientLight intensity={isLight ? 0.75 : 0.55} />
        <directionalLight position={[10, 10, 5]} intensity={isLight ? 1.5 : 1.2} castShadow />
        
        <Environment preset="city" />
        
        <Grid 
          infiniteGrid 
          fadeDistance={30} 
          sectionColor={isLight ? '#000000' : '#ffffff'} 
          cellColor={isLight ? '#444444' : '#888888'}
          sectionThickness={1.0}
          cellThickness={0.7}
          position={[0, -0.01, 0]} 
          transparent
          {...{ opacity: gridOpacity } as any}
        />
        
        <CameraSetup />
        <OrbitControls 
          ref={controlsRef} 
          makeDefault 
          enabled={!isCameraLocked} 
          onEnd={handleOrbitEnd}
        />

        {objects.map(obj => (
          <ObjectMesh key={obj.id} obj={obj} />
        ))}
        
        <CoordinateUpdater controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}
