// 文件路径: services/downloadService.ts
// 统一下载服务 — 封装 Electron 系统另存为 / 浏览器降级下载

// ====== Electron 环境检测 ======
function getElectronAPI(): any | null {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
    return (window as any).electronAPI;
  }
  return null;
}

/**
 * 下载单张图片（base64 data URL 或 blob URL）
 * - Electron: 弹出系统另存为对话框
 * - 浏览器: 使用 <a> 标签触发下载
 */
export async function downloadImage(dataUrl: string, defaultName: string): Promise<void> {
  const api = getElectronAPI();

  if (api?.downloadImage) {
    // Electron 环境：通过 IPC 弹出系统另存为对话框
    try {
      const result = await api.downloadImage(dataUrl, defaultName);
      if (result.error) {
        console.error('[Download] 保存失败:', result.error);
      }
    } catch (err) {
      console.error('[Download] IPC 调用失败:', err);
    }
    return;
  }

  // 浏览器降级：创建 <a> 标签
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('[Download] 浏览器下载失败:', err);
  }
}

/**
 * 下载二进制数据（如 ZIP 包）
 * - Electron: 弹出系统另存为对话框
 * - 浏览器: 使用 Blob URL + <a> 标签
 */
export async function downloadBlob(
  data: Blob | Uint8Array,
  defaultName: string,
  filters?: Array<{ name: string; extensions: string[] }>
): Promise<void> {
  const api = getElectronAPI();

  if (api?.downloadBlob) {
    // Electron 环境：转换为 Uint8Array 通过 IPC 传递
    try {
      let uint8: Uint8Array;
      if (data instanceof Blob) {
        const arrayBuffer = await data.arrayBuffer();
        uint8 = new Uint8Array(arrayBuffer);
      } else {
        uint8 = data;
      }
      const result = await api.downloadBlob(uint8, defaultName, filters);
      if (result.error) {
        console.error('[Download] ZIP 保存失败:', result.error);
      }
    } catch (err) {
      console.error('[Download] IPC 调用失败:', err);
    }
    return;
  }

  // 浏览器降级
  try {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[Download] 浏览器下载失败:', err);
  }
}
