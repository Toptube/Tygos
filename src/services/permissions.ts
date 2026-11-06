/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED RBAC PERMISSION ENGINE (Phase 6 - Section 2)
 * Single source of truth: can(role, action)
 */

import { UserRole } from '../types/index.ts';

export type PermissionAction =
  | 'crm:view'
  | 'crm:edit'
  | 'crm:export'
  | 'crm:anonymize'
  | 'crm:blacklist'
  | 'crm:merge'
  | 'menu:view'
  | 'menu:edit'
  | 'menu:pricing'
  | 'kds:view'
  | 'kds:update_ticket'
  | 'pos:view'
  | 'pos:approve_order'
  | 'pos:refund'
  | 'pos:close_shift'
  | 'inventory:view'
  | 'inventory:adjust'
  | 'finance:view'
  | 'finance:edit'
  | 'settings:view'
  | 'settings:edit'
  | 'customer_pii:view'
  | 'shift:open'
  | 'shift:close'
  | 'shift:view_all'
  | 'treasury:deposit'
  | 'treasury:view'
  | 'pos:cancel_sent_item'
  | 'pos:refund_paid_order'
  | 'order:trace'
  | 'tables:manage';

const ADMIN_ROLES: UserRole[] = ['super_admin', 'tenant_admin', 'general_manager'];

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  super_admin: [
    'crm:view', 'crm:edit', 'crm:export', 'crm:anonymize', 'crm:blacklist', 'crm:merge',
    'menu:view', 'menu:edit', 'menu:pricing',
    'kds:view', 'kds:update_ticket',
    'pos:view', 'pos:approve_order', 'pos:refund', 'pos:close_shift',
    'inventory:view', 'inventory:adjust',
    'finance:view', 'finance:edit',
    'settings:view', 'settings:edit',
    'customer_pii:view',
  ],
  tenant_admin: [
    'crm:view', 'crm:edit', 'crm:export', 'crm:anonymize', 'crm:blacklist', 'crm:merge',
    'menu:view', 'menu:edit', 'menu:pricing',
    'kds:view', 'kds:update_ticket',
    'pos:view', 'pos:approve_order', 'pos:refund', 'pos:close_shift',
    'inventory:view', 'inventory:adjust',
    'finance:view', 'finance:edit',
    'settings:view', 'settings:edit',
    'customer_pii:view',
  ],
  general_manager: [
    'crm:view', 'crm:edit', 'crm:export', 'crm:anonymize', 'crm:blacklist', 'crm:merge',
    'menu:view', 'menu:edit', 'menu:pricing',
    'kds:view', 'kds:update_ticket',
    'pos:view', 'pos:approve_order', 'pos:refund', 'pos:close_shift',
    'inventory:view', 'inventory:adjust',
    'finance:view', 'finance:edit',
    'settings:view', 'settings:edit',
    'customer_pii:view',
  ],
  financial_manager: [
    'crm:view', 'crm:export',
    'menu:view', 'menu:pricing',
    'pos:view', 'pos:refund', 'pos:close_shift', 'pos:refund_paid_order', 'pos:cancel_sent_item',
    'shift:open', 'shift:close', 'shift:view_all',
    'treasury:view', 'treasury:deposit',
    'order:trace',
    'inventory:view',
    'finance:view', 'finance:edit',
    'settings:view',
    'customer_pii:view',
  ],
  financial_accountant: [
    'menu:view',
    'inventory:view',
    'finance:view', 'finance:edit',
  ],
  cost_accountant: [
    'menu:view', 'menu:pricing',
    'inventory:view',
    'finance:view',
  ],
  tax_accountant: [
    'finance:view',
  ],
  store_manager: [
    'inventory:view', 'inventory:adjust',
    'menu:view',
  ],
  cashier: [
    'crm:view', 'crm:edit',
    'menu:view',
    'pos:view', 'pos:approve_order', 'pos:close_shift',
    'shift:open', 'shift:close',
    'customer_pii:view',
  ],
  waiter: [
    'crm:view',
    'menu:view',
    'pos:view',
    'customer_pii:view',
  ],
  hr_manager: [
    'settings:view',
  ],
  public_relations: [
    'crm:view', 'crm:edit', 'crm:export',
    'menu:view',
    'customer_pii:view',
  ],
  kitchen_manager: [
    'menu:view', 'menu:edit',
    'kds:view', 'kds:update_ticket',
    'inventory:view',
    // Note: kitchen_manager does NOT have customer_pii:view
  ],
  bar_manager: [
    'menu:view',
    'kds:view', 'kds:update_ticket',
    'inventory:view',
    // Note: bar_manager does NOT have customer_pii:view
  ],
  marketing_officer: [
    'crm:view',
    'menu:view', 'menu:edit',
    'settings:view',
  ],
};

/**
 * Single canonical permission check across all TYGOS modules.
 */
export function can(role: UserRole | undefined | null, action: PermissionAction): boolean {
  if (!role) return false;
  if (ADMIN_ROLES.includes(role)) return true;
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(action);
}
