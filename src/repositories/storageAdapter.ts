/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * STORAGE ADAPTER ABSTRACTION (Phase 6 - Section 3 & Storage Audit)
 * Single gateway for all persistence (LocalStorage, Memory, Remote Cloud API, Local LAN Server).
 */

export interface StorageAdapter {
  readonly name: string;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): void;
  keysSync(): string[];
}

/**
 * Default Browser LocalStorage Adapter (Standalone / Offline-First)
 */
export class LocalStorageAdapter implements StorageAdapter {
  public readonly name: string = 'LocalStorageAdapter';

  public async getItem(key: string): Promise<string | null> {
    return this.getItemSync(key);
  }

  public async setItem(key: string, value: string): Promise<void> {
    this.setItemSync(key, value);
  }

  public async removeItem(key: string): Promise<void> {
    this.removeItemSync(key);
  }

  public getItemSync(key: string): string | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  public setItemSync(key: string, value: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore quota/security errors
    }
  }

  public removeItemSync(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  public keysSync(): string[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      return Object.keys(window.localStorage);
    } catch {
      return [];
    }
  }
}

/**
 * In-Memory Storage Adapter for Node.js tests & SSR
 */
export class MemoryStorageAdapter implements StorageAdapter {
  public readonly name = 'MemoryStorageAdapter';
  private store: Map<string, string> = new Map();

  public async getItem(key: string): Promise<string | null> {
    return this.getItemSync(key);
  }

  public async setItem(key: string, value: string): Promise<void> {
    this.setItemSync(key, value);
  }

  public async removeItem(key: string): Promise<void> {
    this.removeItemSync(key);
  }

  public getItemSync(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  public setItemSync(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  public removeItemSync(key: string): void {
    this.store.delete(key);
  }

  public keysSync(): string[] {
    return Array.from(this.store.keys());
  }

  public clear(): void {
    this.store.clear();
  }
}

/**
 * // INTEGRATION POINT: Future Remote Cloud API Adapter
 * Will communicate with https://api.tygos.cloud/v1/... using Bearer JWT
 */
export class RemoteApiAdapter extends LocalStorageAdapter {
  public override readonly name = 'RemoteApiAdapter';
  constructor(public readonly baseUrl: string) {
    super();
  }
}

/**
 * // INTEGRATION POINT: Future Local LAN Emergency Server Adapter
 * Will communicate with http://192.168.x.x:4000/api/... inside the venue
 */
export class LocalServerAdapter extends LocalStorageAdapter {
  public override readonly name = 'LocalServerAdapter';
  constructor(public readonly lanUrl: string) {
    super();
  }
}

let activeStorageAdapter: StorageAdapter =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
    ? new LocalStorageAdapter()
    : new MemoryStorageAdapter();

export function getStorageAdapter(): StorageAdapter {
  return activeStorageAdapter;
}

export function setStorageAdapter(adapter: StorageAdapter): void {
  activeStorageAdapter = adapter;
}
