// 文件路径: components/director3d/utils/screenshot.ts
import { CameraPose } from '../types';
import { getCaptureHandler } from '../captureBridge';

/**
 * 截取当前 3D 摄影机画面的高级实用工具
 * 自动根据当前的画面比例 (Aspect Ratio) 裁剪安全区以外的多余遮罩边缘，确保输出纯净的摄影画面。
 * 集成到 MOKE 无限画布后，若注册了截图桥回调，则将结果发送到画布/素材库而非下载。
 */
export function captureCameraSnapshot(cameraPose: CameraPose, onFlashTrigger?: () => void) {
  // 1. 获取 WebGL Canvas 元素（优先在 3D 导演场景容器内查找，避免命中其他 canvas）
  const sceneRoot = document.getElementById('director3d-scene-root');
  const canvas = (sceneRoot?.querySelector('canvas') ?? document.querySelector('canvas')) as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Cannot find WebGL canvas context.');
    return;
  }

  // 2. 触发快门闪烁反馈
  if (onFlashTrigger) {
    onFlashTrigger();
  }

  // 3. 计算当前的父级容器比例与缩放
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) {
    console.error('Canvas viewport has invalid dimensions.');
    return;
  }

  const containerAspect = width / height;

  // 4. 解析预设比例 (如 "16:9")
  const aspectStr = cameraPose.aspect || '16:9';
  let targetAspect = 16 / 9;

  if (aspectStr.includes(':')) {
    const parts = aspectStr.split(':');
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1])) && Number(parts[1]) !== 0) {
      targetAspect = Number(parts[0]) / Number(parts[1]);
    }
  } else if (!isNaN(Number(aspectStr)) && Number(aspectStr) > 0) {
    targetAspect = Number(aspectStr);
  }

  // 5. 计算当前画面占比裁切百分比 (与 CameraOverlay 的缩减公式完美对应)
  let px = 0;
  let py = 0;

  if (containerAspect > targetAspect) {
    // 容器太宽，左右有遮罩
    const targetWidth = 100 * targetAspect / containerAspect; 
    px = (100 - targetWidth) / 2;
  } else if (containerAspect < targetAspect) {
    // 容器太高，上下有遮罩
    const targetHeight = 100 * containerAspect / targetAspect;
    py = (100 - targetHeight) / 2;
  }

  // 6. 获取 WebGL Backbuffer 高清像素尺寸
  const backBufferWidth = canvas.width;
  const backBufferHeight = canvas.height;

  // 转换为像素级别裁切坐标
  const cropX = Math.round((px / 100) * backBufferWidth);
  const cropY = Math.round((py / 100) * backBufferHeight);
  const cropWidth = Math.round((1 - (2 * px / 100)) * backBufferWidth);
  const cropHeight = Math.round((1 - (2 * py / 100)) * backBufferHeight);

  // 工具：根据截图桥决定是发送回调还是下载
  const dispatch = (dataURL: string, fileName: string) => {
    const handler = getCaptureHandler();
    if (handler) {
      // 发送至无限画布 + 全局素材库
      handler(dataURL, { aspect: aspectStr, cameraName: cameraPose.name });
      console.log(`Screenshot dispatched to canvas/asset library: ${fileName}`);
      return;
    }
    // 回退：浏览器下载
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataURL;
    link.click();
    console.log(`Successfully exported screenshot: ${fileName}`);
  };

  // 7. 使用 Canvas 2D 复制裁切并导出
  try {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropWidth;
    tempCanvas.height = cropHeight;

    const ctx = tempCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context for screenshot clipping.');
    }

    // 绘制被选中的裁切核心区域
    ctx.drawImage(
      canvas,
      cropX, cropY, cropWidth, cropHeight, // 源位置
      0, 0, cropWidth, cropHeight          // 目标位置
    );

    // 8. 触发文件名和下载流程
    const formattedDate = new Date().toISOString().slice(0, 10);
    const formattedTime = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
    const cleanAspect = aspectStr.replace(/:/g, '_');
    const fileName = `MOKE_REC_${cleanAspect}_${formattedDate}_${formattedTime}.png`;

    const dataURL = tempCanvas.toDataURL('image/png');
    dispatch(dataURL, fileName);
  } catch (error) {
    console.error('Failed to clip or export screenshot:', error);
    
    // 备用机制：如果 2D 裁切异常，直接发送/下载完整 canvas
    try {
      const dataURL = canvas.toDataURL('image/png');
      dispatch(dataURL, `MOKE_FULL_${new Date().toISOString().slice(0, 10)}.png`);
    } catch (fallbackError) {
      console.error('Fallback capture also failed:', fallbackError);
    }
  }
}
