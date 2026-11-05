/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED REPOSITORY & STORAGE ADAPTER LAYER (Phase 6 - Section 3)
 * Decouples all React components and services from direct localStorage/IndexedDB calls.
 *
 * // INTEGRATION POINT: Swap LocalStorageAdapter with RemoteApiAdapter (Cloud)
 * or LocalServerAdapter (LAN Emergency Server) based on deploymentMode.
 */

import {
  SyncEntityMetadata,
  generateUuid,
  getOrCreateDeviceId,
} from '../sync/syncTypes.ts';
import { outboxService } from '../sync/outboxService.ts';
import { CustomerOrder, PublicMenuItem } from '../domain/qrMenuTypes.ts';

export interface StorageAdapter {
  readonly name: string;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/**
 * Default Browser LocalStorage Adapter (Standalone / Offline-First)
 */
export class LocalStorageAdapter implements StorageAdapter {
  public readonly name = 'LocalStorageAdapter';

  public async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  }

  public async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  }

  public async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  }
}

/**
 * // INTEGRATION POINT: Future Remote Cloud API Adapter
 * Will communicate with https://api.tygos.cloud/v1/... using Bearer JWT
 */
export class RemoteApiAdapter implements StorageAdapter {
  public readonly name = 'RemoteApiAdapter';
  constructor(private readonly baseUrl: string) {}

  public async getItem(key: string): Promise<string | null> {
    // Fallback to local cache until backend endpoint is wired
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    void this.baseUrl;
    return null;
  }

  public async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }

  public async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  }
}

/**
 * // INTEGRATION POINT: Future Local LAN Emergency Server Adapter
 * Will communicate with http://192.168.x.x:4000/api/... inside the venue
 */
export class LocalServerAdapter implements StorageAdapter {
  public readonly name = 'LocalServerAdapter';
  constructor(private readonly lanUrl: string) {}

  public async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    void this.lanUrl;
    return null;
  }

  public async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  }

  public async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  }
}

/**
 * Stamps client-generated UUID, version, deviceId, tenantId, and timestamps on any record.
 */
export function stampSyncMetadata<T extends Record<string, any>>(
  record: T,
  tenantId: string,
  isNew = false
): T & SyncEntityMetadata {
  const now = new Date().toISOString();
  return {
    ...record,
    id: record.id || generateUuid(),
    tenantId,
    deviceId: record.deviceId || getOrCreateDeviceId(),
    version: isNew ? 1 : (record.version || 0) + 1,
    createdAt: record.createdAt || now,
    updatedAt: now,
    deletedAt: record.deletedAt ?? null,
  };
}

/**
 * Generic Tenant-Scoped Repository with Soft Delete & Outbox Event Emission
 */
export class TenantRepository<T extends { id: string } & Partial<SyncEntityMetadata>> {
  constructor(
    private readonly adapter: StorageAdapter,
    private readonly resourceName: string,
    private readonly outboxEntityType: Parameters<typeof outboxService.enqueue>[0]['entityType']
  ) {}

  private getKey(tenantId: string): string {
    return `tygos_${tenantId || 'default'}_${this.resourceName}`;
  }

  public async getAll(tenantId: string, includeDeleted = false): Promise<T[]> {
    const raw = await this.adapter.getItem(this.getKey(tenantId));
    if (!raw) return [];
    try {
      const parsed: T[] = JSON.parse(raw);
      return includeDeleted ? parsed : parsed.filter((item) => !item.deletedAt);
    } catch {
      return [];
    }
  }

  public async getById(tenantId: string, id: string): Promise<T | null> {
    const all = await this.getAll(tenantId, false);
    return all.find((item) => item.id === id) || null;
  }

  public async saveAll(tenantId: string, items: T[]): Promise<void> {
    await this.adapter.setItem(this.getKey(tenantId), JSON.stringify(items));
  }

  public async upsert(tenantId: string, item: T, idempotencyKey?: string): Promise<T & SyncEntityMetadata> {
    const all = await this.getAll(tenantId, true);
    const idx = all.findIndex((x) => x.id === item.id);
    const isNew = idx === -1;
    const stamped = stampSyncMetadata(item, tenantId, isNew);

    if (isNew) {
      all.unshift(stamped);
    } else {
      all[idx] = stamped;
    }

    await this.saveAll(tenantId, all);
    outboxService.enqueue({
      tenantId,
      entityType: this.outboxEntityType,
      entityId: stamped.id,
      operation: isNew ? 'create' : 'update',
      payload: stamped,
      idempotencyKey,
    });

    return stamped;
  }

  public async softDelete(tenantId: string, id: string): Promise<boolean> {
    const all = await this.getAll(tenantId, true);
    const idx = all.findIndex((x) => x.id === id);
    if (idx === -1) return false;

    const updated = stampSyncMetadata(
      { ...all[idx], deletedAt: new Date().toISOString() },
      tenantId,
      false
    );
    all[idx] = updated;
    await this.saveAll(tenantId, all);

    outboxService.enqueue({
      tenantId,
      entityType: this.outboxEntityType,
      entityId: id,
      operation: 'delete',
      payload: updated,
    });

    return true;
  }
}

/**
 * Public Menu Provider Interface & Offline-Cached Local Implementation
 * // INTEGRATION POINT: Replace with RemotePublicMenuProvider for CDN/Server-served menus.
 */
export interface PublicMenuProvider {
  getCachedMenu(tenantId: string): Promise<PublicMenuItem[]>;
  cacheMenu(tenantId: string, items: PublicMenuItem[]): Promise<void>;
}

export class LocalPublicMenuProvider implements PublicMenuProvider {
  constructor(private readonly adapter: StorageAdapter) {}

  public async getCachedMenu(tenantId: string): Promise<PublicMenuItem[]> {
    const raw = await this.adapter.getItem(`tygos_${tenantId}_public_menu_cache`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async cacheMenu(tenantId: string, items: PublicMenuItem[]): Promise<void> {
    await this.adapter.setItem(`tygos_${tenantId}_public_menu_cache`, JSON.stringify(items));
  }
}

// Singleton default adapter & repositories
export const defaultStorageAdapter: StorageAdapter = new LocalStorageAdapter();
export const orderRepository = new TenantRepository<CustomerOrder>(
  defaultStorageAdapter,
  'orders',
  'order'
);
export const publicMenuProvider: PublicMenuProvider = new LocalPublicMenuProvider(
  defaultStorageAdapter
);
