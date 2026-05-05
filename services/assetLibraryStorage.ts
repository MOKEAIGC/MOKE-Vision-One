const DB_NAME = 'moke-vision-one-storage';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';
const GLOBAL_ASSET_RECORD_KEY = 'global-assets';
const GLOBAL_ASSET_LEGACY_STORAGE_KEY = 'moke_global_asset_library';

type KeyValueRecord<T> = {
  key: string;
  value: T;
};

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function readLegacyLocalStorage<T>(legacyStorageKey: string): T[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(legacyStorageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('读取旧版全局资产库失败:', error);
    return [];
  }
}

function clearLegacyLocalStorage(legacyStorageKey: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(legacyStorageKey);
  } catch (error) {
    console.warn('清理旧版全局资产库失败:', error);
  }
}

function writeLegacyLocalStorage<T>(legacyStorageKey: string, items: T[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(legacyStorageKey, JSON.stringify(items));
  } catch (error) {
    console.error('回退保存全局资产库到 localStorage 失败:', error);
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open asset library database'));
  });
}

function readRecord<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const record = request.result as KeyValueRecord<T> | undefined;
      resolve(record?.value ?? null);
    };
    request.onerror = () => reject(request.error ?? new Error(`Failed to read ${key}`));
  });
}

function writeRecord<T>(db: IDBDatabase, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ key, value } satisfies KeyValueRecord<T>);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error(`Failed to write ${key}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Aborted writing ${key}`));
  });
}

export async function loadStoredCollection<T>(recordKey: string, legacyStorageKey: string): Promise<T[]> {
  const legacyItems = readLegacyLocalStorage<T>(legacyStorageKey);

  if (!hasIndexedDb()) {
    return legacyItems;
  }

  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    const storedItems = (await readRecord<T[]>(db, recordKey)) ?? [];
    if (storedItems.length > 0) {
      return storedItems;
    }

    if (legacyItems.length > 0) {
      await writeRecord(db, recordKey, legacyItems);
      clearLegacyLocalStorage(legacyStorageKey);
      return legacyItems;
    }

    return [];
  } catch (error) {
    console.error('读取 IndexedDB 全局资产库失败，回退 localStorage:', error);
    return legacyItems;
  } finally {
    db?.close();
  }
}

export async function saveStoredCollection<T>(recordKey: string, legacyStorageKey: string, items: T[]): Promise<void> {
  if (!hasIndexedDb()) {
    writeLegacyLocalStorage(legacyStorageKey, items);
    return;
  }

  let db: IDBDatabase | null = null;
  try {
    db = await openDb();
    await writeRecord(db, recordKey, items);
    clearLegacyLocalStorage(legacyStorageKey);
  } catch (error) {
    console.error('保存 IndexedDB 全局资产库失败，回退 localStorage:', error);
    writeLegacyLocalStorage(legacyStorageKey, items);
  } finally {
    db?.close();
  }
}

export async function loadGlobalAssetLibrary<T>(): Promise<T[]> {
  return loadStoredCollection<T>(GLOBAL_ASSET_RECORD_KEY, GLOBAL_ASSET_LEGACY_STORAGE_KEY);
}

export async function saveGlobalAssetLibrary<T>(items: T[]): Promise<void> {
  return saveStoredCollection<T>(GLOBAL_ASSET_RECORD_KEY, GLOBAL_ASSET_LEGACY_STORAGE_KEY, items);
}