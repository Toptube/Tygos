/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED REPOSITORY & STORAGE ADAPTER LAYER (Phase 6 - Section 3 & Storage Audit)
 * Decouples all React components and services from direct localStorage/sessionStorage/IndexedDB calls.
 *
 * Repositories:
 * - ProductRepository
 * - RawMaterialRepository
 * - OrderRepository
 * - CustomerRepository
 * - MenuOverridesRepository
 * - SettingsRepository
 * - AuditRepository
 * - DeviceRepository
 * - UiPreferencesRepository
 */

import {
  SyncEntityMetadata,
  DeploymentMode,
  RegisteredDevice,
  generateUuid,
  getOrCreateDeviceId,
  generateNextOrderSerial,
} from '../sync/syncTypes.ts';
import { outboxService } from '../sync/outboxService.ts';
import { CustomerOrder, PublicMenuItem } from '../domain/qrMenuTypes.ts';
import {
  StorageAdapter,
  LocalStorageAdapter,
  MemoryStorageAdapter,
  RemoteApiAdapter,
  LocalServerAdapter,
  getStorageAdapter,
  setStorageAdapter,
} from './storageAdapter.ts';

export type { StorageAdapter };
export {
  LocalStorageAdapter,
  MemoryStorageAdapter,
  RemoteApiAdapter,
  LocalServerAdapter,
  getStorageAdapter,
  setStorageAdapter,
};

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
    protected readonly resourceName: string,
    protected readonly outboxEntityType: Parameters<typeof outboxService.enqueue>[0]['entityType']
  ) {}

  protected get adapter(): StorageAdapter {
    return getStorageAdapter();
  }

  protected getKey(tenantId: string): string {
    return `tygos_${tenantId || 'default'}_${this.resourceName}`;
  }

  public getAllSync(tenantId: string, includeDeleted = false): T[] {
    const raw = this.adapter.getItemSync(this.getKey(tenantId));
    if (!raw) return [];
    try {
      const parsed: T[] = JSON.parse(raw);
      return includeDeleted ? parsed : parsed.filter((item) => !item.deletedAt);
    } catch {
      return [];
    }
  }

  public async getAll(tenantId: string, includeDeleted = false): Promise<T[]> {
    return this.getAllSync(tenantId, includeDeleted);
  }

  public getByIdSync(tenantId: string, id: string): T | null {
    const all = this.getAllSync(tenantId, false);
    return all.find((item) => item.id === id) || null;
  }

  public async getById(tenantId: string, id: string): Promise<T | null> {
    return this.getByIdSync(tenantId, id);
  }

  public saveAllSync(tenantId: string, items: T[], emitOutbox = false): (T & SyncEntityMetadata)[] {
    const existingAll = this.getAllSync(tenantId, true);
    const existingMap = new Map(existingAll.map((e) => [e.id, e]));
    const stampedList = items.map((item) => {
      const prev = existingMap.get(item.id);
      const stamped = stampSyncMetadata(item, tenantId, !prev);
      if (emitOutbox) {
        outboxService.enqueue({
          tenantId,
          entityType: this.outboxEntityType,
          entityId: stamped.id,
          operation: !prev ? 'create' : 'update',
          payload: stamped,
        });
      }
      return stamped;
    });
    this.adapter.setItemSync(this.getKey(tenantId), JSON.stringify(stampedList));
    return stampedList;
  }

  public async saveAll(tenantId: string, items: T[]): Promise<void> {
    this.saveAllSync(tenantId, items, false);
  }

  public upsertSync(tenantId: string, item: T, idempotencyKey?: string): T & SyncEntityMetadata {
    const all = this.getAllSync(tenantId, true);
    const idx = all.findIndex((x) => x.id === item.id);
    const isNew = idx === -1;
    const baseRecord = isNew ? item : { ...all[idx], ...item, version: all[idx].version };
    const stamped = stampSyncMetadata(baseRecord, tenantId, isNew);

    if (isNew) {
      all.unshift(stamped);
    } else {
      all[idx] = stamped;
    }

    this.adapter.setItemSync(this.getKey(tenantId), JSON.stringify(all));
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

  public async upsert(tenantId: string, item: T, idempotencyKey?: string): Promise<T & SyncEntityMetadata> {
    return this.upsertSync(tenantId, item, idempotencyKey);
  }

  public softDeleteSync(tenantId: string, id: string): boolean {
    const all = this.getAllSync(tenantId, true);
    const idx = all.findIndex((x) => x.id === id);
    if (idx === -1) return false;

    const updated = stampSyncMetadata(
      { ...all[idx], deletedAt: new Date().toISOString() },
      tenantId,
      false
    );
    all[idx] = updated;
    this.adapter.setItemSync(this.getKey(tenantId), JSON.stringify(all));

    outboxService.enqueue({
      tenantId,
      entityType: this.outboxEntityType,
      entityId: id,
      operation: 'delete',
      payload: updated,
    });

    return true;
  }

  public async softDelete(tenantId: string, id: string): Promise<boolean> {
    return this.softDeleteSync(tenantId, id);
  }
}

/**
 * 1. ProductRepository
 */
export class ProductRepository<T extends { id: string } & Partial<SyncEntityMetadata> = any> extends TenantRepository<T> {
  constructor() {
    super('products', 'product');
  }
}

/**
 * 2. RawMaterialRepository (with Stock Movement Outbox emission)
 */
export class RawMaterialRepository<T extends { id: string } & Partial<SyncEntityMetadata> = any> extends TenantRepository<T> {
  constructor() {
    super('ingredients', 'stock_movement');
  }

  public recordStockMovementSync(
    tenantId: string,
    materialId: string,
    deltaQty: number,
    reason: string,
    idempotencyKey?: string
  ): void {
    outboxService.enqueue({
      tenantId,
      entityType: 'stock_movement',
      entityId: materialId,
      operation: 'append',
      payload: {
        id: generateUuid(),
        materialId,
        deltaQty,
        reason,
        deviceId: getOrCreateDeviceId(),
        timestamp: new Date().toISOString(),
      },
      idempotencyKey,
    });
  }
}

/**
 * 3. OrderRepository
 */
export class OrderRepository extends TenantRepository<CustomerOrder> {
  constructor() {
    super('orders', 'order');
  }

  public getNextSerial(tenantId: string, isOffline = false, deviceId?: string): string {
    return generateNextOrderSerial(tenantId, isOffline, deviceId);
  }

  public getOrderTimestamps(): number[] {
    const raw = this.adapter.getItemSync('tygos_order_timestamps');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public saveOrderTimestamps(timestamps: number[]): void {
    this.adapter.setItemSync('tygos_order_timestamps', JSON.stringify(timestamps));
  }
}

/**
 * 4. CustomerRepository
 */
export class CustomerRepository<T extends { id: string } & Partial<SyncEntityMetadata> = any> extends TenantRepository<T> {
  constructor() {
    super('customers', 'customer');
  }
}

/**
 * 5. MenuOverridesRepository
 */
export class MenuOverridesRepository<T extends { id: string } & Partial<SyncEntityMetadata> = any> extends TenantRepository<T> {
  constructor() {
    super('menu_overrides', 'menu_override');
  }
}

/**
 * 6. SettingsRepository (Venue Settings, Auth/Establishments, Shifts, Printers, Public URL)
 */
export class SettingsRepository {
  private get adapter(): StorageAdapter {
    return getStorageAdapter();
  }

  public getVenueSettings<T>(tenantId: string): Partial<T> | null {
    const raw = this.adapter.getItemSync(`tygos_${tenantId}_venue_settings`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public saveVenueSettings<T extends Record<string, any>>(tenantId: string, settings: T): void {
    this.adapter.setItemSync(`tygos_${tenantId}_venue_settings`, JSON.stringify(settings));
    if (settings.publicAppUrl) {
      this.adapter.setItemSync('tygos_settings_publicAppUrl', String(settings.publicAppUrl));
    }
    outboxService.enqueue({
      tenantId,
      entityType: 'settings',
      entityId: tenantId,
      operation: 'update',
      payload: stampSyncMetadata({ id: tenantId, ...settings }, tenantId, false),
    });
  }

  public getPublicAppUrl(): string | null {
    return this.adapter.getItemSync('tygos_settings_publicAppUrl');
  }

  public getEstablishments<T>(): T[] | null {
    const raw = this.adapter.getItemSync('tygos_establishments');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public saveEstablishments<T>(establishments: T[]): void {
    this.adapter.setItemSync('tygos_establishments', JSON.stringify(establishments));
  }

  public getRegisteredEstablishments<T>(): T[] {
    const raw = this.adapter.getItemSync('tygos_registered_establishments');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public getAuthSession<T>(): T | null {
    const raw = this.adapter.getItemSync('tygos_auth_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public saveAuthSession<T>(session: T): void {
    this.adapter.setItemSync('tygos_auth_session', JSON.stringify(session));
  }

  public clearAuthSession(): void {
    this.adapter.removeItemSync('tygos_auth_session');
  }

  public getActiveShift<T>(tenantId: string): T | null {
    const raw = this.adapter.getItemSync(`tygos_${tenantId}_active_shift`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public saveActiveShift<T>(tenantId: string, shift: T): void {
    this.adapter.setItemSync(`tygos_${tenantId}_active_shift`, JSON.stringify(shift));
  }

  public closeActiveShift<T>(tenantId: string, closedShift: T): void {
    this.adapter.setItemSync(`tygos_${tenantId}_last_closed_shift`, JSON.stringify(closedShift));
    this.adapter.removeItemSync(`tygos_${tenantId}_active_shift`);
  }

  public getLastClosedShift<T>(tenantId: string): T | null {
    const raw = this.adapter.getItemSync(`tygos_${tenantId}_last_closed_shift`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public getPrinterConfigs<T>(): T[] | null {
    const raw = this.adapter.getItemSync('tygos_printer_configs');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public savePrinterConfigs<T>(configs: T[]): void {
    this.adapter.setItemSync('tygos_printer_configs', JSON.stringify(configs));
  }
}

/**
 * 7. AuditRepository (Append-Only Immutable Audit Logs)
 */
export class AuditRepository {
  private get adapter(): StorageAdapter {
    return getStorageAdapter();
  }

  public getLogs<T>(tenantId: string): T[] {
    const raw = this.adapter.getItemSync(`tygos_${tenantId || 'default'}_audit_logs`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public appendLog<T>(tenantId: string, entry: T, maxEntries = 100): void {
    const key = `tygos_${tenantId || 'default'}_audit_logs`;
    const existing = this.getLogs<T>(tenantId);
    existing.unshift(entry);
    this.adapter.setItemSync(key, JSON.stringify(existing.slice(0, maxEntries)));
  }
}

/**
 * 8. DeviceRepository (Device Identity, Deployment Mode, Registered Terminals)
 */
export class DeviceRepository {
  private get adapter(): StorageAdapter {
    return getStorageAdapter();
  }

  public getDeviceId(): string {
    return getOrCreateDeviceId();
  }

  public getDeploymentMode(): DeploymentMode {
    return (this.adapter.getItemSync('tygos_deployment_mode') as DeploymentMode) || 'standalone';
  }

  public setDeploymentMode(mode: DeploymentMode): void {
    this.adapter.setItemSync('tygos_deployment_mode', mode);
  }

  public getServerBaseUrl(): string {
    return this.adapter.getItemSync('tygos_server_base_url') || '';
  }

  public setServerBaseUrl(url: string): void {
    this.adapter.setItemSync('tygos_server_base_url', url);
  }

  public getRegisteredDevices(): RegisteredDevice[] {
    const raw = this.adapter.getItemSync('tygos_registered_devices');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveRegisteredDevices(devices: RegisteredDevice[]): void {
    this.adapter.setItemSync('tygos_registered_devices', JSON.stringify(devices));
  }

  public getActiveEstId(): string | null {
    return this.adapter.getItemSync('tygos_active_est_id');
  }

  public setActiveEstId(estId: string): void {
    this.adapter.setItemSync('tygos_active_est_id', estId);
  }
}

/**
 * 9. UiPreferencesRepository (POS Prefill, Pre-Launch Checklist, Storage Diagnostics)
 */
export class UiPreferencesRepository {
  private get adapter(): StorageAdapter {
    return getStorageAdapter();
  }

  public getPosPrefillCustomer<T>(): T | null {
    const raw = this.adapter.getItemSync('tygos_pos_prefill_customer');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public setPosPrefillCustomer<T>(payload: T): void {
    this.adapter.setItemSync('tygos_pos_prefill_customer', JSON.stringify(payload));
  }

  public clearPosPrefillCustomer(): void {
    this.adapter.removeItemSync('tygos_pos_prefill_customer');
  }

  public getPrelaunchChecklist(tenantId: string): Record<string, boolean> {
    const raw = this.adapter.getItemSync(`tygos_${tenantId || 'default'}_prelaunch_checklist`);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  public savePrelaunchChecklist(tenantId: string, state: Record<string, boolean>): void {
    this.adapter.setItemSync(`tygos_${tenantId || 'default'}_prelaunch_checklist`, JSON.stringify(state));
  }

  public getClickSoundEnabled(): boolean {
    return this.adapter.getItemSync('tygos_click_sound_enabled') === 'true';
  }

  public setClickSoundEnabled(enabled: boolean): void {
    this.adapter.setItemSync('tygos_click_sound_enabled', enabled ? 'true' : 'false');
  }

  public getLauncherPosition(): { pctX: number; pctY: number } | null {
    const raw = this.adapter.getItemSync('tygos_assistant_launcher_pos_pct');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public setLauncherPosition(pos: { pctX: number; pctY: number }): void {
    this.adapter.setItemSync('tygos_assistant_launcher_pos_pct', JSON.stringify(pos));
  }

  public getDigitStyle(): 'western' | 'eastern' {
    const val = this.adapter.getItemSync('tygos_digit_style');
    return val === 'eastern' ? 'eastern' : 'western';
  }

  public setDigitStyle(style: 'western' | 'eastern'): void {
    this.adapter.setItemSync('tygos_digit_style', style);
  }

  public getStorageUsageBytes(): number {
    let totalBytes = 0;
    for (const key of this.adapter.keysSync()) {
      const val = this.adapter.getItemSync(key) || '';
      totalBytes += (val.length + key.length) * 2;
    }
    return totalBytes;
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
  public async getCachedMenu(tenantId: string): Promise<PublicMenuItem[]> {
    const raw = await getStorageAdapter().getItem(`tygos_${tenantId}_public_menu_cache`);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async cacheMenu(tenantId: string, items: PublicMenuItem[]): Promise<void> {
    await getStorageAdapter().setItem(`tygos_${tenantId}_public_menu_cache`, JSON.stringify(items));
  }
}

/**
 * 10. UserRepository (Staff accounts, roles, credentials, and custom screen permissions)
 */
export class UserRepository<T extends { id: string } & Partial<SyncEntityMetadata> = any> extends TenantRepository<T> {
  constructor() {
    super('staff_users', 'user');
  }

  public getUsersSync(tenantId: string): T[] {
    return this.getAllSync(tenantId, false);
  }

  public saveUsersSync(tenantId: string, users: T[]): void {
    this.saveAllSync(tenantId, users, true);
  }
}

// Singleton default repositories
export const defaultStorageAdapter: StorageAdapter = getStorageAdapter();
export const productRepository = new ProductRepository();
export const rawMaterialRepository = new RawMaterialRepository();
export const orderRepository = new OrderRepository();
export const customerRepository = new CustomerRepository();
export const menuOverridesRepository = new MenuOverridesRepository();
export const settingsRepository = new SettingsRepository();
export const auditRepository = new AuditRepository();
export const deviceRepository = new DeviceRepository();
export const uiPreferencesRepository = new UiPreferencesRepository();
export const userRepository = new UserRepository();
export const publicMenuProvider: PublicMenuProvider = new LocalPublicMenuProvider();
