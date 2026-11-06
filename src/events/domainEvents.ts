/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * INTERNAL DOMAIN EVENT BUS (Phase 7 - Section 7)
 * Decouples POS, KDS, Inventory, Accounting, Treasury, CRM, Reports,
 * Dashboard, Assistant, and Audit Log via typed domain events.
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';
import { generateUuid, getOrCreateDeviceId } from '../sync/syncTypes.ts';

export type DomainEventType =
  | 'order.created'
  | 'order.sent'
  | 'order.station_updated'
  | 'order.served'
  | 'order.paid'
  | 'order.cancelled'
  | 'order.refunded'
  | 'shift.opened'
  | 'shift.closed'
  | 'cash.drawer_movement'
  | 'cash.deposited'
  | 'table.updated';

export interface DomainEvent<T = Record<string, unknown>> {
  id: string;
  type: DomainEventType;
  tenantId: string;
  deviceId: string;
  timestamp: string;
  actorName?: string;
  actorRole?: string;
  entityId?: string;
  payload: T;
}

type EventListener<T = any> = (event: DomainEvent<T>) => void;

class DomainEventBus {
  private listeners: Map<DomainEventType | '*', Set<EventListener>> = new Map();

  private getStorageKey(tenantId: string): string {
    return `tygos_${tenantId || 'default'}_domain_events`;
  }

  public subscribe<T = Record<string, unknown>>(
    type: DomainEventType | '*',
    listener: EventListener<T>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as EventListener);
    return () => {
      this.listeners.get(type)?.delete(listener as EventListener);
    };
  }

  public publish<T = Record<string, unknown>>(params: {
    type: DomainEventType;
    tenantId: string;
    entityId?: string;
    actorName?: string;
    actorRole?: string;
    payload: T;
  }): DomainEvent<T> {
    const event: DomainEvent<T> = {
      id: `evt-${generateUuid().slice(0, 8)}`,
      type: params.type,
      tenantId: params.tenantId,
      deviceId: getOrCreateDeviceId(),
      timestamp: new Date().toISOString(),
      actorName: params.actorName,
      actorRole: params.actorRole,
      entityId: params.entityId,
      payload: params.payload,
    };

    // Persist to tenant event stream (capped at 300 latest events)
    try {
      const adapter = getStorageAdapter();
      const key = this.getStorageKey(params.tenantId);
      const raw = adapter.getItemSync(key);
      const list: DomainEvent[] = raw ? JSON.parse(raw) : [];
      list.unshift(event as DomainEvent);
      adapter.setItemSync(key, JSON.stringify(list.slice(0, 300)));
    } catch {
      // Ignore storage errors
    }

    // Notify specific listeners
    this.listeners.get(params.type)?.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error(`DomainEvent listener error (${params.type}):`, err);
      }
    });

    // Notify wildcard listeners
    this.listeners.get('*')?.forEach((fn) => {
      try {
        fn(event);
      } catch (err) {
        console.error('DomainEvent wildcard listener error:', err);
      }
    });

    return event;
  }

  public getEvents(tenantId: string, entityId?: string): DomainEvent[] {
    try {
      const raw = getStorageAdapter().getItemSync(this.getStorageKey(tenantId));
      const list: DomainEvent[] = raw ? JSON.parse(raw) : [];
      if (entityId) {
        return list.filter((e) => e.entityId === entityId);
      }
      return list;
    } catch {
      return [];
    }
  }

  public getRecentEvents(tenantId: string): DomainEvent[] {
    return this.getEvents(tenantId);
  }
}

export const domainEvents = new DomainEventBus();
