// 文件路径: services/secureStorage.ts
// 密钥安全存储 — 统一的 apiKey 持久化接入点
//
// 策略（按优先级自动降级）：
//   ① Electron 环境 + 系统 Keychain 可用 → safeStorage 加密（macOS Keychain / Windows DPAPI）
//   ② 否则（纯浏览器 / Keychain 不可用）→ 回退到 localStorage 明文
//
// 对上层（ApiConfigContext）：统一暴露 async load/save，无论底层是哪种存储。
//
// 存储键名约定：
//   - 'api-config'   整个 ApiConfig 对象（含所有 apiKey 字段）
//
// 迁移策略：
//   首次启动时，若新存储为空 + localStorage 有旧数据 → 自动搬迁 + 清理 localStorage

export interface SecureStorageAdapter {
  /** 人类可读的存储描述，用于诊断日志 */
  readonly label: string;
  /** 读取完整 JSON 对象；不存在返回 null */
  load(key: string): Promise<unknown | null>;
  /** 写入完整 JSON 对象 */
  save(key: string, value: unknown): Promise<void>;
  /** 删除指定 key */
  remove(key: string): Promise<void>;
}

// ============ Electron safeStorage 适配器 ============
class ElectronSecureAdapter implements SecureStorageAdapter {
  readonly label = 'electron-safeStorage';
  private api: any;

  constructor(api: any) {
    this.api = api;
  }

  async load(key: string): Promise<unknown | null> {
    const r = await this.api.get(key);
    if (r?.value == null) return null;
    try {
      return typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
    } catch {
      return null;
    }
  }
  async save(key: string, value: unknown): Promise<void> {
    const serialized = JSON.stringify(value);
    const r = await this.api.set(key, serialized);
    if (!r?.success) {
      throw new Error(`secure-set failed: ${r?.error || 'unknown'}`);
    }
  }
  async remove(key: string): Promise<void> {
    await this.api.delete(key);
  }
}

// ============ localStorage 回退适配器 ============
class LocalStorageAdapter implements SecureStorageAdapter {
  readonly label = 'localStorage(plaintext)';
  async load(key: string): Promise<unknown | null> {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  async save(key: string, value: unknown): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

// ============ 工厂：首选 Electron 加密，失败自动降级 ============
let _adapter: SecureStorageAdapter | null = null;

export async function getSecureStorage(): Promise<SecureStorageAdapter> {
  if (_adapter) return _adapter;

  // 仅在 Electron 环境尝试加密存储
  const electronAPI = (typeof window !== 'undefined' ? (window as any).electronAPI : null);
  const secureAPI = electronAPI?.secureCredentials;

  if (secureAPI?.isAvailable && secureAPI?.get && secureAPI?.set) {
    try {
      const r = await secureAPI.isAvailable();
      if (r?.available) {
        _adapter = new ElectronSecureAdapter(secureAPI);
        console.info('[secureStorage] 使用 OS Keychain 加密存储');
        return _adapter;
      }
      console.warn('[secureStorage] 系统加密不可用，回退到 localStorage');
    } catch (e) {
      console.warn('[secureStorage] 加密探测失败，回退 localStorage:', e);
    }
  }

  _adapter = new LocalStorageAdapter();
  console.info('[secureStorage] 使用 localStorage（明文）');
  return _adapter;
}

// ============ 便捷封装（带 localStorage 迁移） ============
/**
 * 读取配置。若安全存储为空，尝试从 localStorage 迁移旧数据并清除明文。
 */
export async function secureLoadWithMigration<T = unknown>(
  key: string,
  legacyLocalStorageKey?: string,
): Promise<T | null> {
  const store = await getSecureStorage();
  const existing = await store.load(key);
  if (existing != null) return existing as T;

  // 尝试从旧的 localStorage 迁移
  if (legacyLocalStorageKey && typeof localStorage !== 'undefined') {
    try {
      const legacy = localStorage.getItem(legacyLocalStorageKey);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        await store.save(key, parsed);
        // 仅当我们切换到了加密存储时，才清理 localStorage 明文
        if (store.label !== 'localStorage(plaintext)') {
          localStorage.removeItem(legacyLocalStorageKey);
          console.info(`[secureStorage] 已从 localStorage.${legacyLocalStorageKey} 迁移到 ${store.label}，明文已清除`);
        } else {
          console.info(`[secureStorage] 保持在 localStorage（无加密能力），未清理旧键 ${legacyLocalStorageKey}`);
        }
        return parsed as T;
      }
    } catch (e) {
      console.warn(`[secureStorage] 迁移 ${legacyLocalStorageKey} 失败:`, e);
    }
  }
  return null;
}

export async function secureSave(key: string, value: unknown): Promise<void> {
  const store = await getSecureStorage();
  await store.save(key, value);
}
