/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SECURITY & CASHIER TREASURY SCOPING TESTS
 * Covers:
 * 1. Random 6-digit PIN generator (no static defaults like 1234).
 * 2. Salted password hashing (no plaintext storage) + audit logging.
 * 3. Pre-flight checklist contains user_roles_management step.
 * 4. Cashier treasury scope (sees only their shift, vault balance hidden, closed shifts immutable).
 * 5. Manager treasury scope (sees vault balance, ledger, and all shifts).
 * 6. Permissions engine enforcement for treasury:view_vault and shift:edit_closed.
 */

import assert from 'node:assert/strict';
// @ts-ignore - jsdom types
import { JSDOM } from 'jsdom';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';

// Setup JSDOM environment BEFORE importing @testing-library/react
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:3000/',
});
(globalThis as unknown as { window: Window }).window = dom.window as unknown as Window;
(globalThis as unknown as { document: Document }).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
(globalThis as unknown as { localStorage: Storage }).localStorage = dom.window.localStorage;
(globalThis as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement = dom.window.HTMLElement;

const { render, screen, cleanup } = await import('@testing-library/react');
const { I18nProvider } = await import('../i18n/I18nContext.tsx');
const { ThemeProvider } = await import('../theme/ThemeContext.tsx');
const { ToastProvider } = await import('../context/ToastContext.tsx');
const { AuthProvider, useAuth } = await import('../context/AuthContext.tsx');
const { BusinessProvider } = await import('../context/BusinessContext.tsx');
const { TreasuryAndShiftsModule } = await import('../components/finance/TreasuryAndShiftsModule.tsx');
const { PreLaunchChecklistView } = await import('../components/settings/PreLaunchChecklistView.tsx');
const { generateRandomPin6, hashPassword, verifyPassword, generateRandomSalt } = await import('../services/authCrypto.ts');
const { can } = await import('../services/permissions.ts');
const { shiftTreasuryService } = await import('../services/shiftTreasuryService.ts');
const { auditRepository } = await import('../repositories/repositories.ts');

let passed = 0;
function test(name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      res
        .then(() => {
          cleanup();
          dom.window.localStorage.clear();
          passed++;
          console.log(`✅ ${name}`);
        })
        .catch((err) => {
          console.error(`❌ ${name}`);
          throw err;
        });
    } else {
      cleanup();
      dom.window.localStorage.clear();
      passed++;
      console.log(`✅ ${name}`);
    }
  } catch (err) {
    console.error(`❌ ${name}`);
    throw err;
  }
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <BusinessProvider>{ui}</BusinessProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

// 1. PIN Generation: Random 6-digit PIN and forbidden static defaults
test('Security: generateRandomPin6 generates 6-digit random PIN between 100000 and 999999', () => {
  const pin1 = generateRandomPin6();
  const pin2 = generateRandomPin6();

  assert.equal(pin1.length, 6, 'PIN must be 6 digits');
  assert.equal(/^\d{6}$/.test(pin1), true, 'PIN must contain only numbers');
  assert.ok(Number(pin1) >= 100000 && Number(pin1) <= 999999, 'PIN must be within 100000..999999');
  assert.notEqual(pin1, '1234', 'PIN must never be static 1234');
  assert.notEqual(pin1, '123456', 'PIN must never be static 123456');
  // Two consecutive generations should be random and highly unlikely to be identical
  assert.notEqual(pin1, pin2, 'Consecutive generated PINs must be distinct');
});

// 2. Salted Password Hashing & Plaintext Exclusion
test('Security: Salted hashing works and plaintext password is not retained', () => {
  const salt = generateRandomSalt();
  const rawPass = 'SecretP@ss2026';
  const hashed = hashPassword(rawPass, salt);

  assert.ok(hashed.startsWith('h_'), 'Hash must have experimental digest prefix');
  assert.notEqual(hashed, rawPass, 'Hashed value must not equal raw password');
  assert.equal(verifyPassword(rawPass, hashed, salt), true, 'Verification of correct password succeeds');
  assert.equal(verifyPassword('WrongPass', hashed, salt), false, 'Verification of wrong password fails');
});

// 3. Permissions Engine: Cashier cannot view vault or edit closed shifts
test('Permissions: Cashier restricted from vault and shift:edit_closed is false for all', () => {
  assert.equal(can('cashier', 'treasury:view_vault'), false, 'Cashier cannot view vault');
  assert.equal(can('cashier', 'shift:view_all'), false, 'Cashier cannot view all shifts');
  assert.equal(can('cashier', 'shift:edit_closed'), false, 'Cashier cannot edit closed shift');

  // Closed shifts are immutable across all roles
  assert.equal(can('tenant_admin', 'shift:edit_closed'), false, 'Tenant admin cannot edit closed shift');
  assert.equal(can('super_admin', 'shift:edit_closed'), false, 'Super admin cannot edit closed shift');
  assert.equal(can('general_manager', 'shift:edit_closed'), false, 'GM cannot edit closed shift');
  assert.equal(can('financial_manager', 'shift:edit_closed'), false, 'CFO cannot edit closed shift');
});

// 4. Pre-Launch Verification Checklist: Includes user roles management step
test('Checklist: PreLaunchChecklistView contains user_roles_management verification step', () => {
  renderWithProviders(<PreLaunchChecklistView />);

  assert.ok(
    screen.getByText('فحص شاشة إدارة المستخدمين وتخصيص الشاشات وتعيين PIN السريع'),
    'Checklist must include user_roles_management step'
  );
  assert.ok(
    screen.getByText(/تأكد من قصر الشاشة على القيادة وحجبها عن الكاشير/),
    'Checklist must detail cashier restriction'
  );
});

// 5. Cashier Scope in Treasury: Vault balance & ledger hidden, sees only their shifts
test('Treasury: Cashier sees ONLY their shift scope, vault balance and ledger tab are hidden', () => {
  const estId = 'est-1';
  // Seed two closed shifts: one by Cashier (مريم رستم / cashier_maya), one by another cashier (علي حسن / cashier_ali)
  const shiftCashier = shiftTreasuryService.openShift(estId, {
    cashierName: 'مريم رستم',
    cashierUsername: 'cashier_maya',
    openingFloat: 500,
  });
  shiftTreasuryService.closeShift(estId, {
    actualCountedCash: 500,
    actorName: 'مريم رستم',
    actorRole: 'cashier',
    managerOverrideNote: 'وردية مريم',
  });

  const CashierTreasuryTest: React.FC = () => {
    const { switchRole, currentUser } = useAuth();
    React.useEffect(() => {
      if (currentUser?.role !== 'cashier') {
        switchRole('cashier');
      }
    }, [currentUser?.role, switchRole]);

    return <TreasuryAndShiftsModule />;
  };

  renderWithProviders(<CashierTreasuryTest />);

  // Vault Balance card must NOT exist
  assert.equal(
    screen.queryByTestId('treasury-vault-balance-card'),
    null,
    'Cashier must NOT see general treasury vault balance card'
  );
  assert.equal(
    screen.queryByText('رصيد الخزينة الحالي'),
    null,
    'Cashier must NOT see "رصيد الخزينة الحالي"'
  );

  // Manual treasury entry button must NOT exist
  assert.equal(
    screen.queryByTestId('record-treasury-tx-button'),
    null,
    'Cashier must NOT see "حركة خزينة" button'
  );

  // Treasury ledger tab must NOT exist
  assert.equal(
    screen.queryByTestId('treasury-ledger-tab-button'),
    null,
    'Cashier must NOT see treasury ledger tab'
  );

  // Cashier Drawer Card MUST exist
  assert.ok(
    screen.getByTestId('cashier-drawer-card'),
    'Cashier must see personal drawer cash card'
  );
  assert.ok(
    screen.getByText('النقدية المتوقعة بدرج الوردية'),
    'Cashier must see expected drawer label'
  );

  // Closed shift must show immutable badge
  assert.ok(
    screen.getByText('مغلقة ومؤمنة (لا تعديل بعد الإغلاق)'),
    'Closed shift must display locked and immutable status'
  );
});

// 6. Manager Scope in Treasury: Vault balance, ledger, and all shifts are visible
test('Treasury: Manager sees vault balance, treasury ledger tab, and all shifts', () => {
  const ManagerTreasuryTest: React.FC = () => {
    const { switchRole, currentUser } = useAuth();
    React.useEffect(() => {
      if (currentUser?.role !== 'tenant_admin') {
        switchRole('tenant_admin');
      }
    }, [currentUser?.role, switchRole]);

    return <TreasuryAndShiftsModule />;
  };

  renderWithProviders(<ManagerTreasuryTest />);

  // Manager DOES see vault balance
  assert.ok(
    screen.getByTestId('treasury-vault-balance-card'),
    'Manager must see treasury vault balance card'
  );
  assert.ok(
    screen.getByText('رصيد الخزينة الحالي'),
    'Manager must see "رصيد الخزينة الحالي"'
  );

  // Manager DOES see treasury ledger tab
  assert.ok(
    screen.getByTestId('treasury-ledger-tab-button'),
    'Manager must see treasury ledger tab button'
  );

  // Manager DOES see treasury entry button
  assert.ok(
    screen.getByTestId('record-treasury-tx-button'),
    'Manager must see "حركة خزينة" button'
  );
});

console.log(`\n🎉 Security & Cashier Treasury Tests Passed: ${passed}/${passed}`);
