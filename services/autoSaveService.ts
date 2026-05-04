// 文件路径: services/autoSaveService.ts
// 自动保存服务 — 封装 Electron IPC 文件操作，兼容浏览器环境降级

// ====== 类型定义 ======
export interface AutoSaveSettings {
  enabled: boolean;
  folderPath: string;
  saveImages: boolean;     // 自动保存生成的图片
  savePrompts: boolean;    // 自动保存提示词
}

interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  selectFolder: () => Promise<string | null>;
  saveFile: (folderPath: string, fileName: string, base64Data: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  saveTextFile: (folderPath: string, fileName: string, content: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  openFolder: (folderPath: string) => Promise<{ success: boolean }>;
  getAutoSaveSettings: () => Promise<Partial<AutoSaveSettings>>;
  setAutoSaveSettings: (data: AutoSaveSettings) => Promise<{ success: boolean }>;
  downloadImage: (base64Data: string, defaultName: string) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  downloadBlob: (buffer: Uint8Array, defaultName: string, filters?: any[]) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
}

// ====== 环境检测 ======
function getElectronAPI(): ElectronAPI | null {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.isElectron) {
    return (window as any).electronAPI as ElectronAPI;
  }
  return null;
}

export function isElectronEnv(): boolean {
  return getElectronAPI() !== null;
}

// ====== 默认设置 ======
const DEFAULT_SETTINGS: AutoSaveSettings = {
  enabled: false,
  folderPath: '',
  saveImages: true,
  savePrompts: true,
};

// 浏览器环境使用 localStorage 降级
const LS_KEY = 'moke-autosave-settings';

// ====== 设置读写 ======
export async function loadAutoSaveSettings(): Promise<AutoSaveSettings> {
  try {
    const api = getElectronAPI();
    if (api) {
      const saved = await api.getAutoSaveSettings();
      return { ...DEFAULT_SETTINGS, ...saved };
    }
    // 浏览器降级
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export async function saveAutoSaveSettings(settings: AutoSaveSettings): Promise<void> {
  try {
    const api = getElectronAPI();
    if (api) {
      await api.setAutoSaveSettings(settings);
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(settings));
    }
  } catch (e) { /* ignore */ }
}

// ====== 选择文件夹 ======
export async function selectSaveFolder(): Promise<string | null> {
  const api = getElectronAPI();
  if (api) {
    return await api.selectFolder();
  }
  // 浏览器环境无法选择文件夹
  return null;
}

// ====== 打开文件夹 ======
export async function openSaveFolder(folderPath: string): Promise<void> {
  const api = getElectronAPI();
  if (api) {
    await api.openFolder(folderPath);
  }
}

// ====== 生成时间戳文件名 ======
function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
}

// ====== 自动保存图片 ======
export async function autoSaveImage(
  settings: AutoSaveSettings,
  base64Data: string,
  prefix: string = 'MOKE'
): Promise<string | null> {
  if (!settings.enabled || !settings.saveImages || !settings.folderPath) return null;

  const api = getElectronAPI();
  if (!api) {
    // 浏览器环境降级：使用 <a> 下载
    try {
      const a = document.createElement('a');
      a.href = base64Data;
      a.download = `${prefix}_${timestamp()}.png`;
      a.click();
      return a.download;
    } catch (e) { return null; }
  }

  const fileName = `${prefix}_${timestamp()}.png`;
  const result = await api.saveFile(settings.folderPath, fileName, base64Data);
  if (result.success) {
    console.log(`[AutoSave] 图片已保存: ${result.filePath}`);
    return result.filePath!;
  } else {
    console.error(`[AutoSave] 图片保存失败: ${result.error}`);
    return null;
  }
}

// ====== 自动保存文本 ======
export async function autoSaveText(
  settings: AutoSaveSettings,
  content: string,
  prefix: string = 'MOKE_PROMPT'
): Promise<string | null> {
  if (!settings.enabled || !settings.savePrompts || !settings.folderPath) return null;

  const api = getElectronAPI();
  if (!api) {
    // 浏览器降级
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}_${timestamp()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      return a.download;
    } catch (e) { return null; }
  }

  const fileName = `${prefix}_${timestamp()}.txt`;
  const result = await api.saveTextFile(settings.folderPath, fileName, content);
  if (result.success) {
    console.log(`[AutoSave] 文本已保存: ${result.filePath}`);
    return result.filePath!;
  } else {
    console.error(`[AutoSave] 文本保存失败: ${result.error}`);
    return null;
  }
}
