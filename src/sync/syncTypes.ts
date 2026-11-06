/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SYNC & MULTI-DEPLOYMENT ARCHITECTURE TYPES (Phase 6 - Section 3)
 * Prepares TYGOS for Online Cloud Server and Local LAN Emergency Server
 * without modifying UI components.
 */

import { PrepStation } from '../domain/qrMenuTypes.ts';
import { getStorageAdapter } from '../repositories/storageAdapter.ts';

export type DeploymentMode = 'standalone' | 'cloud' | 'local' | 'hybrid';

export interface SyncEntityMetadata {
  id: string; // Client-generated UUID v4
  tenantId: string;
  deviceId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null; // Soft delete timestamp
}

export type OutboxEventStatus = 'pending' | 'sending' | 'sent' | 'failed';

export type OutboxOperation = 'create' | 'update' | 'delete' | 'append';

export interface OutboxEvent<T = unknown> {
  id: string;
  idempotencyKey: string;
  tenantId: string;
  deviceId: string;
  entityType:
    | 'product'
    | 'raw_material'
    | 'order'
    | 'customer'
    | 'settings'
    | 'stock_movement'
    | 'shift'
    | 'coupon'
    | 'user'
    | 'menu_override';
  entityId: string;
  operation: OutboxOperation;
  payload: T;
  status: OutboxEventStatus;
  retryCount: number;
  nextRetryAt: number; // Epoch ms
  createdAt: string;
  lastError?: string;
}

export type ConflictPolicy =
  | 'append_only' // Orders, Payments, Ledger entries
  | 'last_write_wins_audited' // Products, Prices, Customers, Settings
  | 'movement_ledger'; // Inventory derived from movements

export interface ConflictResolutionResult<T> {
  winner: T;
  conflictDetected: boolean;
  policyApplied: ConflictPolicy;
  reason: string;
}

export type DeviceRole = 'cashier' | 'kitchen' | 'bar' | 'kds_display' | 'manager';

export interface RegisteredDevice {
  id: string;
  name: string;
  role: DeviceRole;
  assignedStation?: PrepStation;
  printerName?: string;
  lastSeenAt: string;
  isActive: boolean;
}

/**
 * Generates a RFC-4122 compliant UUID v4 on the client.
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns or creates a persistent client device identifier.
 */
export function getOrCreateDeviceId(): string {
  const adapter = getStorageAdapter();
  const key = 'tygos_device_id';
  const existing = adapter.getItemSync(key);
  if (existing) return existing;
  const created = `dev-${generateUuid().slice(0, 8)}`;
  adapter.setItemSync(key, created);
  return created;
}

/**
 * Single-source Order Serial Number Generator per establishment.
 * When offline, prefixes with device short-code to prevent collisions across terminals.
 * // INTEGRATION POINT: Replace with server-issued monotonic sequence when connected to Cloud/Local server.
 */
export function generateNextOrderSerial(
  establishmentId: string,
  isOffline = false,
  deviceId?: string
): string {
  const adapter = getStorageAdapter();
  const key = `tygos_${establishmentId}_order_seq`;
  const current = parseInt(adapter.getItemSync(key) || '0', 10);
  const nextNum = (Number.isNaN(current) ? 0 : current) + 1;
  adapter.setItemSync(key, String(nextNum));
  const padded = String(nextNum).padStart(4, '0');
  if (isOffline) {
    const devPrefix = (deviceId || getOrCreateDeviceId()).replace(/^dev-/, '').slice(0, 3).toUpperCase();
    return `#${devPrefix}-${padded}`;
  }
  return `#${padded}`;
}

/**
 * Deterministic Conflict Resolution Engine.
 */
export function resolveEntityConflict<T extends Partial<SyncEntityMetadata>>(
  local: T,
  remote: T,
  policy: ConflictPolicy
): ConflictResolutionResult<T> {
  if (policy === 'append_only') {
    return {
      winner: remote,
      conflictDetected: false,
      policyApplied: policy,
      reason: 'Append-only log: both records preserved by unique ID/idempotencyKey.',
    };
  }

  if (policy === 'movement_ledger') {
    return {
      winner: remote,
      conflictDetected: false,
      policyApplied: policy,
      reason: 'Movement ledger: stock balance is recomputed from immutable movement sum.',
    };
  }

  // last_write_wins_audited
  const localVer = local.version ?? 1;
  const remoteVer = remote.version ?? 1;
  const localTime = local.updatedAt ? Date.parse(local.updatedAt) : 0;
  const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;

  const conflictDetected = localVer !== remoteVer || localTime !== remoteTime;

  if (remoteVer > localVer || (remoteVer === localVer && remoteTime >= localTime)) {
    return {
      winner: remote,
      conflictDetected,
      policyApplied: policy,
      reason: `Remote won (v${remoteVer} @ ${remote.updatedAt || 'n/a'} >= local v${localVer}).`,
    };
  }

  return {
    winner: local,
    conflictDetected,
    policyApplied: policy,
    reason: `Local won (v${localVer} @ ${local.updatedAt || 'n/a'} > remote v${remoteVer}).`,
  };
}
