// 文件路径: electron/preload.cjs
// Electron Preload 脚本 — 在渲染进程中暴露安全的文件操作 API

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 平台标识
  platform: process.platform,
  // 是否为 Electron 环境
  isElectron: true,

  // ====== 文件操作 ======
  // 选择文件夹（返回路径字符串或 null）
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  // 保存 base64 图片到文件
  saveFile: (folderPath, fileName, base64Data) =>
    ipcRenderer.invoke('save-file', { folderPath, fileName, base64Data }),
  // 保存文本文件
  saveTextFile: (folderPath, fileName, content) =>
    ipcRenderer.invoke('save-text-file', { folderPath, fileName, content }),
  // 在系统文件管理器中打开文件夹
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),

  // ====== 自动保存设置 ======
  getAutoSaveSettings: () => ipcRenderer.invoke('get-autosave-settings'),
  setAutoSaveSettings: (data) => ipcRenderer.invoke('set-autosave-settings', data),

  // ====== 下载文件（系统另存为对话框） ======
  // 下载单张图片（base64 数据 → 系统另存为）
  downloadImage: (base64Data, defaultName) =>
    ipcRenderer.invoke('download-image', { base64Data, defaultName }),
  // 下载二进制文件（如 ZIP）（ArrayBuffer/Uint8Array → 系统另存为）
  downloadBlob: (buffer, defaultName, filters) =>
    ipcRenderer.invoke('download-blob', { buffer: Array.from(buffer), defaultName, filters }),

  // ====== 安全凭证（OS Keychain 加密）======
  // 通过 Electron safeStorage：macOS Keychain / Windows DPAPI / Linux libsecret
  // 仅在系统支持加密时可用；渲染进程应检查 isAvailable() 再决定是否启用
  secureCredentials: {
    isAvailable: () => ipcRenderer.invoke('secure-is-available'),
    get: (key) => ipcRenderer.invoke('secure-get', key),
    set: (key, value) => ipcRenderer.invoke('secure-set', { key, value }),
    delete: (key) => ipcRenderer.invoke('secure-delete', key),
  },
});
