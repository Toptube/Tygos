/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Package 6 — Section 8: PreLaunchChecklistView (Scenarios أ–ط + RBAC + Persistence + Clean Arabic Terms)
 */

import assert from 'node:assert/strict';
// @ts-ignore - jsdom types
import { JSDOM } from 'jsdom';
import React from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
(globalThis as unknown as { SVGElement: typeof SVGElement }).SVGElement = dom.window.SVGElement;
(globalThis as unknown as { matchMedia?: unknown }).matchMedia = () => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react');
const { ThemeProvider } = await import('../theme/ThemeContext.tsx');
const { I18nProvider } = await import('../i18n/I18nContext.tsx');
const { ToastProvider } = await import('../context/ToastContext.tsx');
const { AuthProvider, useAuth } = await import('../context/AuthContext.tsx');
const { BusinessProvider } = await import('../context/BusinessContext.tsx');
const { PreLaunchChecklistView } = await import('../components/settings/PreLaunchChecklistView.tsx');
const { uiPreferencesRepository } = await import('../repositories/repositories.ts');
const { CURRENT_SCHEMA_VERSION } = await import('../services/migrationService.ts');

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    dom.window.localStorage.clear();
    await fn();
    cleanup();
    passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    cleanup();
    console.error(`❌ ${name}`);
    throw err;
  }
}

const RoleGateHost: React.FC<{
  role: 'tenant_admin' | 'general_manager' | 'cashier';
  children: React.ReactNode;
}> = ({ role, children }) => {
  const { currentUser, switchRole } = useAuth();
  React.useEffect(() => {
    if (currentUser?.role !== role) {
      switchRole(role);
    }
  }, [role, currentUser?.role, switchRole]);
  return <>{children}</>;
};

function renderWithRole(
  role: 'tenant_admin' | 'general_manager' | 'cashier',
  ui: React.ReactElement
) {
  return render(
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <BusinessProvider>
              <RoleGateHost role={role}>{ui}</RoleGateHost>
            </BusinessProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

// 1. Owner/GM renders all 9 Package 6 launch scenarios (أ–ط), toggles persist & reset cleanly, zero BOM/What-If
await test('B8-1: المالك يرى جميع سيناريوهات الإطلاق التسعة (أ–ط) ويحفظ حالة التفعيل ويعيد الضبط بلا BOM أو What-If', () => {
  renderWithRole('tenant_admin', <PreLaunchChecklistView />);

  const scenarioPrefixes = [
    'سيناريو أ:',
    'سيناريو ب:',
    'سيناريو ج:',
    'سيناريو د:',
    'سيناريو هـ:',
    'سيناريو و:',
    'سيناريو ز:',
    'سيناريو ح:',
    'سيناريو ط:',
  ];

  for (const prefix of scenarioPrefixes) {
    const matches = screen.getAllByText(new RegExp(prefix));
    assert.ok(matches.length >= 1, `Missing Package 6 scenario starting with "${prefix}"`);
  }

  // Verify zero BOM / What-If leakage in UI text
  assert.equal(screen.queryByText(/\bBOM\b/i), null, 'Zero BOM in checklist UI');
  assert.equal(screen.queryByText(/What-If/i), null, 'Zero What-If in checklist UI');

  // Toggle scenario أ and verify persistence in uiPreferencesRepository
  const scenarioABtn = screen.getByText(/سيناريو أ:/).closest('button');
  assert.ok(scenarioABtn, 'Scenario أ must be wrapped in clickable button');
  fireEvent.click(scenarioABtn);

  const savedAfterClick = uiPreferencesRepository.getPrelaunchChecklist('est-1');
  assert.equal(savedAfterClick.pkg6_scenario_a, true, 'pkg6_scenario_a must persist as true');

  // Reset all clears persistence
  const resetBtn = screen.getByText('إعادة ضبط').closest('button');
  assert.ok(resetBtn, 'Reset button must exist');
  fireEvent.click(resetBtn);
  const savedAfterReset = uiPreferencesRepository.getPrelaunchChecklist('est-1');
  assert.equal(Object.keys(savedAfterReset).length, 0, 'Reset clears persisted checklist state');
});

// 2. Cashier is strictly blocked from PreLaunchChecklistView
await test('B8-2: الكاشير ممنوع من شاشة الفحص قبل التشغيل وتظهر له رسالة الحظر العربية', () => {
  renderWithRole('cashier', <PreLaunchChecklistView />);

  assert.ok(
    screen.getByText('شاشة مقصورة على المالك والمدير العام'),
    'Cashier restriction heading must be shown'
  );
  assert.equal(screen.queryByText(/سيناريو أ:/), null, 'Checklist scenarios hidden for cashier');
});

// 3. Architecture documentation files exist and match code schema constants
await test('B8-3: وثائق الجاهزية الأربع موجودة في /docs ومطابقة لإصدار المخطط والصلاحيات', () => {
  const requiredDocs = [
    'docs/DATA_MODEL.md',
    'docs/API_CONTRACT.md',
    'docs/SERVER_AUTHORIZATION.md',
    'docs/SYNC_AND_LOCAL_SERVER.md',
  ];

  for (const rel of requiredDocs) {
    const full = resolve(process.cwd(), rel);
    assert.ok(existsSync(full), `Missing architecture document: ${rel}`);
    const content = readFileSync(full, 'utf8');
    assert.ok(content.length > 1500, `Document ${rel} unexpectedly brief`);
  }

  const dataModelDoc = readFileSync(resolve(process.cwd(), 'docs/DATA_MODEL.md'), 'utf8');
  assert.ok(
    dataModelDoc.includes(String(CURRENT_SCHEMA_VERSION)),
    'DATA_MODEL.md must reference current schema version 6'
  );
  const serverAuthDoc = readFileSync(resolve(process.cwd(), 'docs/SERVER_AUTHORIZATION.md'), 'utf8');
  assert.ok(
    serverAuthDoc.includes('shift:edit_closed') && serverAuthDoc.includes('treasury:view_vault'),
    'SERVER_AUTHORIZATION.md must document critical RBAC actions'
  );
  const syncDoc = readFileSync(resolve(process.cwd(), 'docs/SYNC_AND_LOCAL_SERVER.md'), 'utf8');
  assert.ok(
    syncDoc.includes('idempotencyKey') && syncDoc.includes('Math.min(30000'),
    'SYNC_AND_LOCAL_SERVER.md must match exact outbox backoff & idempotency logic'
  );
});

console.log(`\n🎉 Package 6 Checklist & Docs Verification Passed: ${passed}/${passed}`);
