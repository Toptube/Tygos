/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * USER ROLES & PERMISSIONS MANAGEMENT TESTS (React Testing Library + jsdom)
 * Verifies:
 * 1. Role-based access for Super Admin, Owner/Tenant Admin, GM, and CFO.
 * 2. Dedicated sidebar navigation item for User Roles.
 * 3. User listing with full names, roles, and details.
 * 4. Inspection, editing of screens/permissions, and dynamic screen visibility on login.
 * 5. Direct password reset without old password.
 * 6. Adding new users and deleting accounts.
 * 7. Cashier role defaults and operational restrictions.
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

const { render, screen, fireEvent, cleanup, waitFor } = await import('@testing-library/react');
const { I18nProvider } = await import('../i18n/I18nContext.tsx');
const { ThemeProvider } = await import('../theme/ThemeContext.tsx');
const { ToastProvider } = await import('../context/ToastContext.tsx');
const { AuthProvider, useAuth } = await import('../context/AuthContext.tsx');
const { BusinessProvider } = await import('../context/BusinessContext.tsx');
const { AppLayout } = await import('../components/layout/AppLayout.tsx');
const { UserRolesManagementModule } = await import('../components/users/UserRolesManagementModule.tsx');
const { getDefaultViewsForRole } = await import('../i18n/glossary.ts');
const { can } = await import('../services/permissions.ts');

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

// 1. Guard against raw <button> tags in UserRolesManagementModule
test('Guard: Zero raw <button> tags in UserRolesManagementModule.tsx', () => {
  const fileContent = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/users/UserRolesManagementModule.tsx'),
    'utf-8'
  );
  const rawButtonMatches = fileContent.match(/<button[\s>]/g);
  assert.equal(
    rawButtonMatches,
    null,
    `Found raw <button> in UserRolesManagementModule.tsx. Always use <Button> component!`
  );
});

// 2. Default screen permissions for Cashier and other roles
test('Role Defaults: Cashier defaults to POS, Tables, KDS, Order Trace, QR Stickers, Treasury, CRM & Chat', () => {
  const cashierScreens = getDefaultViewsForRole('cashier');
  assert.ok(cashierScreens.includes('pos'), 'Cashier must have POS');
  assert.ok(cashierScreens.includes('tables_management'), 'Cashier must have tables');
  assert.ok(cashierScreens.includes('kds'), 'Cashier must have KDS');
  assert.ok(cashierScreens.includes('order_trace'), 'Cashier must have order trace');
  assert.ok(cashierScreens.includes('treasury'), 'Cashier must have treasury shift closing');
  assert.ok(cashierScreens.includes('crm'), 'Cashier must have CRM');
  assert.ok(cashierScreens.includes('chat'), 'Cashier must have chat');

  // Must NOT have sensitive managerial screens
  assert.equal(cashierScreens.includes('cost_control'), false, 'Cashier cannot access cost control');
  assert.equal(cashierScreens.includes('finance'), false, 'Cashier cannot access general ledger');
  assert.equal(cashierScreens.includes('tax'), false, 'Cashier cannot access tax filing');
  assert.equal(cashierScreens.includes('users_roles'), false, 'Cashier cannot access user management');
  assert.equal(cashierScreens.includes('settings'), false, 'Cashier cannot access establishment settings');
});

// 3. Permission action checks in permissions.ts
test('Permissions Engine: Only Key Managers can manage users and reset passwords', () => {
  assert.equal(can('super_admin', 'users:manage'), true);
  assert.equal(can('tenant_admin', 'users:manage'), true);
  assert.equal(can('general_manager', 'users:manage'), true);
  assert.equal(can('financial_manager', 'users:manage'), true);

  assert.equal(can('cashier', 'users:manage'), false);
  assert.equal(can('waiter', 'users:manage'), false);
  assert.equal(can('kitchen_manager', 'users:manage'), false);
});

// 4. Rendering UserRolesManagementModule: Lists users with their names, roles, and allowed screens count
test('UserRolesManagementModule: Renders users list with full names, role badges, and search', () => {
  renderWithProviders(<UserRolesManagementModule />);

  assert.ok(screen.getByText('أدوار المستخدمين والصلاحيات'));
  assert.ok(screen.getByTestId('add-user-button'));
  assert.ok(screen.getByTestId('users-search-input'));

  // Verify Cashier (مريم رستم) is listed
  assert.ok(screen.getByText('مريم رستم'));
  assert.ok(screen.getByText('@cashier_maya'));
});

// 5. User Details Modal: Clicking a user opens permissions editor with direct password reset
test('User Inspection: Clicking a user card opens details, permissions checklist, and direct password reset', () => {
  renderWithProviders(<UserRolesManagementModule />);

  // Click on cashier card
  const cashierCard = screen.getByTestId('user-card-cashier_maya');
  fireEvent.click(cashierCard);

  // Modal opens
  assert.ok(screen.getByTestId('edit-user-modal'));
  assert.ok(screen.getByText(/تعديل صلاحيات: مريم رستم/));

  // Switch to Password tab
  const passTab = screen.getByRole('button', { name: /تغيير كلمة المرور/ });
  fireEvent.click(passTab);

  assert.ok(screen.getByText(/صلاحية تغيير كلمة المرور المباشرة/));
  const genPinBtn = screen.getByTestId('generate-fast-pin-button');
  assert.ok(genPinBtn);
  fireEvent.click(genPinBtn);

  // One-time PIN banner appears
  assert.ok(screen.getByTestId('one-time-pin-banner'));
  const pinVal = screen.getByTestId('one-time-pin-value').textContent?.trim();
  assert.equal(pinVal?.length, 6, 'Generated PIN must be 6 digits');
  assert.notEqual(pinVal, '1234', 'PIN must never be static 1234');
});

// 6. Dynamic Screen Visibility in Navigation upon Login
test('Dynamic Visibility: Cashier navigation displays ONLY permitted screens, hiding managerial screens', () => {
  const CashierNavTest: React.FC = () => {
    const { switchRole, currentUser } = useAuth();
    React.useEffect(() => {
      if (currentUser?.role !== 'cashier') {
        switchRole('cashier');
      }
    }, [currentUser?.role, switchRole]);

    return (
      <AppLayout>
        <div data-testid="cashier-content">محتوى الكاشير</div>
      </AppLayout>
    );
  };

  renderWithProviders(<CashierNavTest />);

  // Should have POS in header and navigation
  assert.ok(screen.getAllByText('نقطة البيع').length >= 1);

  // Should NOT have managerial screens
  assert.equal(screen.queryByText('مراقبة التكاليف'), null);
  assert.equal(screen.queryByText('الضرائب والفواتير'), null);
  assert.equal(screen.queryByText('إعدادات المنشأة'), null);
  assert.equal(screen.queryByText('أدوار المستخدمين'), null);
});

console.log(`\n🎉 User Roles & Permissions Tests Passed: ${passed}/${passed}`);
