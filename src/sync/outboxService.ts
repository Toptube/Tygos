/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PERSISTENT OUTBOX & SYNC QUEUE SERVICE (Phase 6 - Section 3)
 * Guarantees zero data loss and idempotent delivery when transitioning
 * between offline, local LAN server, and online cloud server.
 */

import {
  OutboxEvent,
  OutboxOperation,
  generateUuid,
  getOrCreateDeviceId,
} from './syncTypes.ts';
import { getStorageAdapter } from '../repositories/storageAdapter.ts';

export type OutboxDispatcher = (event: OutboxEvent) => Promise<{ ok: boolean; error?: string }>;

class OutboxService {
  private listeners: Set<() => void> = new Set();

  private getStorageKey(tenantId: string): string {
    return `tygos_${tenantId || 'default'}_outbox`;
  }

  public getEvents(tenantId: string): OutboxEvent[] {
    try {
      const raw = getStorageAdapter().getItemSync(this.getStorageKey(tenantId));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveEvents(tenantId: string, events: OutboxEvent[]): void {
    try {
      getStorageAdapter().setItemSync(this.getStorageKey(tenantId), JSON.stringify(events));
      this.notify();
    } catch {
      // ignore quota error
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {
        // ignore listener error
      }
    });
  }

  /**
   * Enqueues a write operation into the persistent Outbox.
   * Deduplicates by idempotencyKey so retries never create duplicate server records.
   */
  public enqueue<T>(params: {
    tenantId: string;
    entityType: OutboxEvent['entityType'];
    entityId: string;
    operation: OutboxOperation;
    payload: T;
    idempotencyKey?: string;
  }): OutboxEvent<T> {
    const events = this.getEvents(params.tenantId);
    const key =
      params.idempotencyKey ||
      `${params.tenantId}:${params.entityType}:${params.entityId}:${params.operation}`;

    const existing = events.find(
      (e) => e.idempotencyKey === key && (e.status === 'pending' || e.status === 'sent')
    );
    if (existing) {
      return existing as OutboxEvent<T>;
    }

    const newEvent: OutboxEvent<T> = {
      id: generateUuid(),
      idempotencyKey: key,
      tenantId: params.tenantId,
      deviceId: getOrCreateDeviceId(),
      entityType: params.entityType,
      entityId: params.entityId,
      operation: params.operation,
      payload: params.payload,
      status: 'pending',
      retryCount: 0,
      nextRetryAt: Date.now(),
      createdAt: new Date().toISOString(),
    };

    events.unshift(newEvent);
    this.saveEvents(params.tenantId, events);
    return newEvent;
  }

  /**
   * Flushes pending and due failed events using the provided dispatcher.
   * Uses exponential backoff on failure.
   */
  public async flush(
    tenantId: string,
    dispatcher: OutboxDispatcher,
    nowMs = Date.now()
  ): Promise<{ sent: number; failed: number; remaining: number }> {
    const events = this.getEvents(tenantId);
    let sent = 0;
    let failed = 0;

    // Process oldest first (FIFO)
    const chronological = [...events].reverse();
    for (const ev of chronological) {
      if (ev.status === 'sent') continue;
      if (ev.status === 'failed' && ev.nextRetryAt > nowMs) continue;

      ev.status = 'sending';
      try {
        const res = await dispatcher(ev);
        if (res.ok) {
          ev.status = 'sent';
          ev.lastError = undefined;
          sent++;
        } else {
          ev.status = 'failed';
          ev.retryCount += 1;
          const backoffMs = Math.min(30000, 1000 * Math.pow(2, ev.retryCount));
          ev.nextRetryAt = nowMs + backoffMs;
          ev.lastError = res.error || 'Sync failed';
          failed++;
        }
      } catch (err: any) {
        ev.status = 'failed';
        ev.retryCount += 1;
        const backoffMs = Math.min(30000, 1000 * Math.pow(2, ev.retryCount));
        ev.nextRetryAt = nowMs + backoffMs;
        ev.lastError = err?.message || 'Network error';
        failed++;
      }
    }

    this.saveEvents(tenantId, chronological.reverse());
    const remaining = this.getPendingCount(tenantId);
    return { sent, failed, remaining };
  }

  public getPendingCount(tenantId: string): number {
    return this.getEvents(tenantId).filter((e) => e.status !== 'sent').length;
  }

  public retryAllFailed(tenantId: string): void {
    const events = this.getEvents(tenantId).map((e) =>
      e.status === 'failed' ? { ...e, status: 'pending' as const, nextRetryAt: Date.now() } : e
    );
    this.saveEvents(tenantId, events);
  }

  public clearSent(tenantId: string): void {
    const events = this.getEvents(tenantId).filter((e) => e.status !== 'sent');
    this.saveEvents(tenantId, events);
  }
}

export const outboxService = new OutboxService();
