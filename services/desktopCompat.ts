import type { AutoSaveSettings } from './autoSaveService';

type FileDialogFilter = {
  name: string;
  extensions: string[];
};

type FileOperationResult = {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
};

type SecureAvailabilityResult = {
  available: boolean;
  error?: string;
};

type SecureValueResult = {
  value: string | null;
  error?: string;
};

type DesktopCompatAPI = {
  isElectron: boolean;
  runtime: 'tauri';
  platform: string;
  selectFolder: () => Promise<string | null>;
  saveFile: (folderPath: string, fileName: string, base64Data: string) => Promise<FileOperationResult>;
  saveTextFile: (folderPath: string, fileName: string, content: string) => Promise<FileOperationResult>;
  openFolder: (folderPath: string) => Promise<FileOperationResult>;
  getAutoSaveSettings: () => Promise<Partial<AutoSaveSettings>>;
  setAutoSaveSettings: (data: AutoSaveSettings) => Promise<{ success: boolean }>;
  downloadImage: (base64Data: string, defaultName: string) => Promise<FileOperationResult>;
  downloadBlob: (
    buffer: Uint8Array,
    defaultName: string,
    filters?: FileDialogFilter[],
  ) => Promise<FileOperationResult>;
  secureCredentials: {
    isAvailable: () => Promise<SecureAvailabilityResult>;
    get: (key: string) => Promise<SecureValueResult>;
    set: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;
    delete: (key: string) => Promise<{ success: boolean; error?: string }>;
  };
};

declare global {
  interface Window {
    electronAPI?: DesktopCompatAPI;
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

const AUTO_SAVE_SETTINGS_KEY = 'moke-autosave-settings';

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__TAURI__ || window.__TAURI_INTERNALS__);
}

function detectPlatform(): string {
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  if (/mac/i.test(platform)) return 'darwin';
  if (/win/i.test(platform)) return 'win32';
  if (/linux/i.test(platform)) return 'linux';
  return platform.toLowerCase() || 'unknown';
}

function normalizeDialogSelection(selection: string | string[] | null): string | null {
  if (typeof selection === 'string') return selection;
  if (Array.isArray(selection)) return selection[0] || null;
  return null;
}

function readAutoSaveSettings(): Partial<AutoSaveSettings> {
  try {
    const raw = localStorage.getItem(AUTO_SAVE_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function toImageFilters(defaultName: string): FileDialogFilter[] {
  const ext = defaultName.split('.').pop()?.toLowerCase();
  const extensions = ext ? [ext] : ['png', 'jpg', 'jpeg', 'webp'];
  return [{ name: 'Images', extensions }];
}

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}

async function pickSavePath(defaultName: string, filters?: FileDialogFilter[]): Promise<string | null> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const filePath = await save({
    defaultPath: defaultName,
    filters,
  });
  return filePath || null;
}

function ensureUint8Array(buffer: Uint8Array | ArrayBuffer): Uint8Array {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

export async function installDesktopCompat(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.electronAPI?.isElectron) return;
  if (!isTauriRuntime()) return;

  const { open } = await import('@tauri-apps/plugin-dialog');

  window.electronAPI = {
    isElectron: true,
    runtime: 'tauri',
    platform: detectPlatform(),
    selectFolder: async () => {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      return normalizeDialogSelection(selected);
    },
    saveFile: async (folderPath, fileName, base64Data) => invokeTauri<FileOperationResult>('save_base64_file', {
      folderPath,
      fileName,
      base64Data,
    }),
    saveTextFile: async (folderPath, fileName, content) => invokeTauri<FileOperationResult>('save_text_file', {
      folderPath,
      fileName,
      content,
    }),
    openFolder: async (folderPath) => invokeTauri<FileOperationResult>('open_folder', { folderPath }),
    getAutoSaveSettings: async () => readAutoSaveSettings(),
    setAutoSaveSettings: async (data) => {
      localStorage.setItem(AUTO_SAVE_SETTINGS_KEY, JSON.stringify(data));
      return { success: true };
    },
    downloadImage: async (base64Data, defaultName) => {
      const filePath = await pickSavePath(defaultName, toImageFilters(defaultName));
      if (!filePath) {
        return { success: false, canceled: true };
      }
      return invokeTauri<FileOperationResult>('write_base64_file_at_path', {
        filePath,
        base64Data,
      });
    },
    downloadBlob: async (buffer, defaultName, filters) => {
      const filePath = await pickSavePath(defaultName, filters);
      if (!filePath) {
        return { success: false, canceled: true };
      }
      return invokeTauri<FileOperationResult>('write_binary_file_at_path', {
        filePath,
        bytes: Array.from(ensureUint8Array(buffer)),
      });
    },
    secureCredentials: {
      isAvailable: () => invokeTauri<SecureAvailabilityResult>('secure_is_available'),
      get: (key) => invokeTauri<SecureValueResult>('secure_get', { key }),
      set: (key, value) => invokeTauri<{ success: boolean; error?: string }>('secure_set', { key, value }),
      delete: (key) => invokeTauri<{ success: boolean; error?: string }>('secure_delete', { key }),
    },
  };
}