export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

class LocalStorageProvider implements StorageProvider {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('LocalStorage is not available, falling back.', e);
      return null;
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('LocalStorage setItem failed.', e);
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('LocalStorage removeItem failed.', e);
    }
  }

  clear(): void {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('LocalStorage clear failed.', e);
    }
  }
}

class MemoryStorageProvider implements StorageProvider {
  private cache: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.cache[key] || null;
  }

  setItem(key: string, value: string): void {
    this.cache[key] = value;
  }

  removeItem(key: string): void {
    delete this.cache[key];
  }

  clear(): void {
    this.cache = {};
  }
}

class StorageServiceClass {
  private provider: StorageProvider;

  constructor() {
    // Detect environment capability
    if (typeof window !== 'undefined' && window.localStorage) {
      this.provider = new LocalStorageProvider();
    } else {
      this.provider = new MemoryStorageProvider();
    }
  }

  /**
   * Set storage provider backend dynamically (e.g. for testing or cloud syncing)
   */
  setProvider(customProvider: StorageProvider) {
    this.provider = customProvider;
  }

  get<T>(key: string, fallback: T): T {
    const val = this.provider.getItem(key);
    if (val === null) return fallback;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as unknown as T;
    }
  }

  set<T>(key: string, value: T): void {
    const stringified = typeof value === 'string' ? value : JSON.stringify(value);
    this.provider.setItem(key, stringified);
  }

  remove(key: string): void {
    this.provider.removeItem(key);
  }

  clear(): void {
    this.provider.clear();
  }
}

export const StorageService = new StorageServiceClass();
