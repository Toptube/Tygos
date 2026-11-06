/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TABLES & ZONES MANAGEMENT SERVICE (Phase 7 - Section 5)
 * Supports custom table naming, zones, batch creation (1-20), reservations,
 * status tracking, elapsed time, transfer, merge, and QR menu linking.
 */

import { TenantRepository } from '../repositories/repositories.ts';
import { generateUuid } from '../sync/syncTypes.ts';
import { domainEvents } from '../events/domainEvents.ts';

export type TableStatus = 'available' | 'occupied' | 'awaiting_bill' | 'reserved';

export interface TableZone {
  id: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

export interface TableReservation {
  customerName: string;
  customerPhone?: string;
  reservedForTime: string;
  guestCount: number;
  notes?: string;
}

export interface RestaurantTable {
  id: string;
  number: number;
  nameAr: string;
  nameEn: string;
  zoneId: string;
  capacity: number;
  status: TableStatus;
  sortOrder: number;
  activeOrderId?: string;
  activeOrderSerial?: string;
  activeOrderTotal?: number;
  guestCount?: number;
  occupiedAt?: string;
  hasPendingQrOrder?: boolean;
  reservation?: TableReservation | null;
}

const DEFAULT_ZONES: TableZone[] = [
  { id: 'zone-hall', nameAr: 'الصالة الرئيسية', nameEn: 'Main Hall', sortOrder: 1 },
  { id: 'zone-terrace', nameAr: 'التراس', nameEn: 'Terrace', sortOrder: 2 },
  { id: 'zone-vip', nameAr: 'كبار الشخصيات VIP', nameEn: 'VIP Lounge', sortOrder: 3 },
];

class TableService {
  private zonesRepo = new TenantRepository<TableZone>('table_zones', 'settings');
  private tablesRepo = new TenantRepository<RestaurantTable>('tables', 'settings');

  public getZones(estId: string): TableZone[] {
    const list = this.zonesRepo.getAllSync(estId, false);
    if (list.length === 0) {
      this.zonesRepo.saveAllSync(estId, DEFAULT_ZONES, false);
      return DEFAULT_ZONES;
    }
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public addZone(estId: string, nameAr: string, nameEn: string): TableZone {
    const zones = this.getZones(estId);
    const created: TableZone = {
      id: `zone-${generateUuid().slice(0, 8)}`,
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      sortOrder: zones.length + 1,
    };
    this.zonesRepo.upsertSync(estId, created);
    return created;
  }

  public getTables(estId: string): RestaurantTable[] {
    const list = this.tablesRepo.getAllSync(estId, false);
    if (list.length === 0) {
      const seeded: RestaurantTable[] = Array.from({ length: 8 }, (_, idx) => {
        const num = idx + 1;
        const zoneId = num <= 5 ? 'zone-hall' : num <= 7 ? 'zone-terrace' : 'zone-vip';
        return {
          id: `tbl-${num}`,
          number: num,
          nameAr: num === 8 ? 'VIP 1' : `طاولة ${num}`,
          nameEn: num === 8 ? 'VIP 1' : `Table ${num}`,
          zoneId,
          capacity: num === 8 ? 8 : 4,
          status: 'available',
          sortOrder: num,
        };
      });
      this.tablesRepo.saveAllSync(estId, seeded, false);
      return seeded;
    }
    return [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public getTableById(estId: string, tableId: string): RestaurantTable | null {
    return this.tablesRepo.getByIdSync(estId, tableId);
  }

  public getTableByNumber(estId: string, tableNumber: string | number): RestaurantTable | null {
    const num = Number(tableNumber);
    const tables = this.getTables(estId);
    return (
      tables.find(
        (t) =>
          t.id === String(tableNumber) ||
          (!Number.isNaN(num) && t.number === num) ||
          t.nameAr === String(tableNumber) ||
          t.nameEn === String(tableNumber)
      ) || null
    );
  }

  public addTable(
    estId: string,
    input: { nameAr: string; nameEn?: string; zoneId: string; capacity: number; number?: number }
  ): RestaurantTable {
    const tables = this.getTables(estId);
    const nextNum = input.number || (tables.reduce((max, t) => Math.max(max, t.number), 0) + 1);
    const created: RestaurantTable = {
      id: `tbl-${generateUuid().slice(0, 8)}`,
      number: nextNum,
      nameAr: input.nameAr.trim() || `طاولة ${nextNum}`,
      nameEn: (input.nameEn || input.nameAr).trim() || `Table ${nextNum}`,
      zoneId: input.zoneId || 'zone-hall',
      capacity: Math.max(1, input.capacity || 4),
      status: 'available',
      sortOrder: tables.length + 1,
    };
    this.tablesRepo.upsertSync(estId, created);
    domainEvents.publish({
      type: 'table.updated',
      tenantId: estId,
      entityId: created.id,
      payload: { action: 'created', table: created },
    });
    return created;
  }

  public addBatchTables(
    estId: string,
    count: number,
    zoneId: string,
    capacity = 4,
    prefixAr = 'طاولة',
    prefixEn = 'Table'
  ): RestaurantTable[] {
    const safeCount = Math.max(1, Math.min(20, count));
    const tables = this.getTables(estId);
    let nextNum = tables.reduce((max, t) => Math.max(max, t.number), 0) + 1;
    const createdList: RestaurantTable[] = [];

    for (let i = 0; i < safeCount; i++) {
      const tbl: RestaurantTable = {
        id: `tbl-${generateUuid().slice(0, 8)}`,
        number: nextNum,
        nameAr: `${prefixAr} ${nextNum}`,
        nameEn: `${prefixEn} ${nextNum}`,
        zoneId,
        capacity,
        status: 'available',
        sortOrder: tables.length + i + 1,
      };
      this.tablesRepo.upsertSync(estId, tbl);
      createdList.push(tbl);
      nextNum++;
    }

    domainEvents.publish({
      type: 'table.updated',
      tenantId: estId,
      payload: { action: 'batch_created', count: safeCount },
    });
    return createdList;
  }

  public updateTable(
    estId: string,
    tableId: string,
    updates: Partial<RestaurantTable>
  ): RestaurantTable | null {
    const existing = this.getTableById(estId, tableId);
    if (!existing) return null;
    const updated: RestaurantTable = { ...existing, ...updates };
    this.tablesRepo.upsertSync(estId, updated);
    domainEvents.publish({
      type: 'table.updated',
      tenantId: estId,
      entityId: tableId,
      payload: { action: 'updated', table: updated },
    });
    return updated;
  }

  public deleteTable(estId: string, tableId: string): boolean {
    const existing = this.getTableById(estId, tableId);
    if (!existing || existing.status === 'occupied') return false;
    const ok = this.tablesRepo.softDeleteSync(estId, tableId);
    if (ok) {
      domainEvents.publish({
        type: 'table.updated',
        tenantId: estId,
        entityId: tableId,
        payload: { action: 'deleted' },
      });
    }
    return ok;
  }

  public reserveTable(estId: string, tableId: string, reservation: TableReservation): RestaurantTable | null {
    return this.updateTable(estId, tableId, {
      status: 'reserved',
      reservation,
      guestCount: reservation.guestCount,
    });
  }

  public occupyTable(
    estId: string,
    tableId: string,
    orderId: string,
    orderSerial: string,
    total: number,
    guestCount = 2
  ): RestaurantTable | null {
    const existing = this.getTableById(estId, tableId);
    if (!existing) return null;
    return this.updateTable(estId, tableId, {
      status: 'occupied',
      activeOrderId: orderId,
      activeOrderSerial: orderSerial,
      activeOrderTotal: total,
      guestCount: existing.guestCount || guestCount,
      occupiedAt: existing.occupiedAt || new Date().toISOString(),
      reservation: null,
      hasPendingQrOrder: false,
    });
  }

  public markAwaitingBill(estId: string, tableId: string): RestaurantTable | null {
    return this.updateTable(estId, tableId, { status: 'awaiting_bill' });
  }

  public releaseTable(estId: string, tableId: string): RestaurantTable | null {
    return this.updateTable(estId, tableId, {
      status: 'available',
      activeOrderId: undefined,
      activeOrderSerial: undefined,
      activeOrderTotal: undefined,
      guestCount: undefined,
      occupiedAt: undefined,
      hasPendingQrOrder: false,
      reservation: null,
    });
  }

  public flagPendingQrOrder(estId: string, tableNumberOrId: string): void {
    const tbl = this.getTableByNumber(estId, tableNumberOrId);
    if (tbl) {
      this.updateTable(estId, tbl.id, { hasPendingQrOrder: true });
    }
  }

  public getOpenTables(estId: string): RestaurantTable[] {
    return this.getTables(estId).filter(
      (t) => t.status === 'occupied' || t.status === 'awaiting_bill'
    );
  }
}

export const tableService = new TableService();
