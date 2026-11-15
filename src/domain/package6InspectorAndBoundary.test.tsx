/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Package 6 — Section 3: Error Boundary, Error Log & Mobile/UI Inspector UI Tests
 */

import assert from 'node:assert/strict';
// @ts-ignore - jsdom types
import { JSDOM } from 'jsdom';
import React from 'react';

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
const { ScreenErrorBoundary } = await import('../components/common/ScreenErrorBoundary.tsx');
const { ErrorLogModule } = await import('../components/system/ErrorLogModule.tsx');
const { UiInspectorModule, inspectDomForIssues } = await import('../components/system/UiInspectorModule.tsx');
const { errorLogService } = await import('../services/errorLogService.ts');
const { can } = await import('../services/permissions.ts');

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

const RoleGateHost: React.FC<{ role: 'tenant_admin' | 'general_manager' | 'cashier' | 'head_chef'; children: React.ReactNode }> = ({
  role,
  children,
}) => {
  const { currentUser, switchRole } = useAuth();
  React.useEffect(() => {
    if (currentUser?.role !== role) {
      switchRole(role);
    }
  }, [role, currentUser?.role, switchRole]);
  return <>{children}</>;
};

function renderWithRole(role: 'tenant_admin' | 'general_manager' | 'cashier' | 'head_chef', ui: React.ReactElement) {
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

const EST_ID = 'est-1';

// 1. ScreenErrorBoundary catches throw, renders Arabic fallback, logs error, returns home
await test('B3-1: ScreenErrorBoundary يلتقط أعطال الشاشة ويسجلها في errorLogService ويعرض استعادة عربية', async () => {
  const CrashyScreen: React.FC = () => {
    throw new Error('انهيار تجريبي في الشاشة');
  };

  let wentHome = false;
  const origConsoleError = console.error;
  console.error = () => {};
  try {
    render(
      <ScreenErrorBoundary
        viewId="menu"
        establishmentId={EST_ID}
        onGoHome={() => {
          wentHome = true;
        }}
      >
        <CrashyScreen />
      </ScreenErrorBoundary>
    );
  } finally {
    console.error = origConsoleError;
  }

  assert.ok(screen.getByText('حدث عطل غير متوقع في هذه الشاشة'), 'Fallback heading shown in Arabic');
  assert.ok(screen.getByText('انهيار تجريبي في الشاشة'), 'Error message rendered');
  const logged = errorLogService.getErrors(EST_ID);
  assert.equal(logged.length, 1, 'Error persisted in errorLogService');
  assert.equal(logged[0].viewId, 'menu');
  assert.equal(logged[0].source, 'error_boundary');

  fireEvent.click(screen.getByTestId('error-boundary-copy-btn'));
  assert.ok(screen.getByText('تم النسخ ✓'), 'Copy button confirms copy');

  fireEvent.click(screen.getByTestId('error-boundary-back-btn'));
  assert.equal(wentHome, true, 'Go home callback invoked');
});

// 2. ErrorLogModule renders errors for Owner/GM, supports clear with confirm, and blocks Cashier/Chef
await test('B3-2: ErrorLogModule يعرض السجل للمالك ويمسحه بتأكيد ويحجب الكاشير والشيف', async () => {
  assert.equal(can('tenant_admin', 'system:error_log'), true);
  assert.equal(can('general_manager', 'system:inspect_ui'), true);
  assert.equal(can('cashier', 'system:inspect_ui'), false);
  assert.equal(can('head_chef', 'system:error_log'), false);

  errorLogService.logError(EST_ID, {
    viewId: 'pos',
    message: 'خطأ تجريبي مسجل',
    source: 'window_error',
  });

  renderWithRole('tenant_admin', <ErrorLogModule />);
  assert.ok(await screen.findByText('سجل أخطاء الواجهة والتشغيل'));
  assert.ok(screen.getByText('خطأ تجريبي مسجل'));

  fireEvent.click(screen.getByRole('button', { name: /مسح السجل/ }));
  fireEvent.click(screen.getByRole('button', { name: /تأكيد المسح النهائي/ }));
  assert.ok(await screen.findByText('لا توجد أي أخطاء مسجلة'));
  assert.equal(errorLogService.getErrors(EST_ID).length, 0);

  cleanup();
  renderWithRole('cashier', <ErrorLogModule />);
  assert.ok(await screen.findByText('شاشة مقصورة على المالك والمدير العام'));
});

// 3. UiInspectorModule + inspectDomForIssues detects overflow, modal missing close, mixed English, $, and small touch target
await test('B3-3: فاحص الواجهة والموبايل يكتشف الفيض والنوافذ بلا إغلاق والإنجليزية و$ و<44px ويحجب غير المخولين', async () => {
  const host = document.createElement('div');
  host.innerHTML = `
    <div id="test-dialog" role="dialog"><span>نافذة مفتوحة بلا إغلاق</span></div>
    <p id="mixed-text">تكلفة الصنف بالخطأ Inventory هنا بقيمة 50$</p>
  `;
  const smallBtn = document.createElement('a');
  smallBtn.textContent = 'رابط صغير';
  smallBtn.getBoundingClientRect = () =>
    ({ width: 28, height: 24, left: 0, right: 28, top: 0, bottom: 24, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  host.appendChild(smallBtn);

  const wideEl = document.createElement('div');
  wideEl.className = 'overflow-box';
  wideEl.getBoundingClientRect = () =>
    ({ width: 420, height: 40, left: 0, right: 420, top: 0, bottom: 40, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  host.appendChild(wideEl);

  document.body.appendChild(host);
  const findings = inspectDomForIssues('test_view', 'شاشة الاختبار', host, {
    viewportWidth: 360,
    checkTouchTargets: true,
  });

  const types = new Set(findings.map((f) => f.issueType));
  assert.ok(types.has('نافذة بلا زر إغلاق'), 'Detects open dialog without close button');
  assert.ok(types.has('إنجليزي في نص عربي'), 'Detects mixed English token inside Arabic');
  assert.ok(types.has('رمز دولار غير معتمد'), 'Detects forbidden $ currency sign');
  assert.ok(types.has('زر لمس أصغر من 44px'), 'Detects <44px touch target');
  assert.ok(types.has('عنصر خارج الشاشة'), 'Detects out-of-viewport element (>360px)');
  document.body.removeChild(host);

  // Interactive DOM render & click scan
  renderWithRole('general_manager', <UiInspectorModule />);
  assert.ok(await screen.findByText('فاحص الواجهة والموبايل'));
  fireEvent.click(screen.getByTestId('inspector-scan-current-btn'));
  assert.ok(await screen.findByText(/نتائج الفحص/));
  assert.ok(screen.getByText(/يفحص هذا الفاحص هندسة العناصر الظاهرة/), 'Shows explicit honesty notice');

  // Cashier must be blocked
  cleanup();
  renderWithRole('cashier', <UiInspectorModule />);
  assert.ok(await screen.findByText('شاشة مقصورة على المالك والمدير العام'));
});

console.log(`\n🎉 Package 6 Section 3 UI Tests Passed: ${passed}/3`);
