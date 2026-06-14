// 文件路径: components/director3d/captureBridge.ts
// 截图桥接：将 3D 导演的截图路由到外部回调（无限画布 + 全局素材库），
// 而不是触发浏览器下载。当未注册回调时回退到默认下载行为。

export type CaptureHandler = (dataUrl: string, meta: { aspect: string; cameraName: string }) => void;

let captureHandler: CaptureHandler | null = null;

export function setCaptureHandler(handler: CaptureHandler | null) {
  captureHandler = handler;
}

export function getCaptureHandler(): CaptureHandler | null {
  return captureHandler;
}
