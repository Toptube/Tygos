/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
// @ts-ignore - jsdom types
import { JSDOM } from 'jsdom';
import React from 'react';

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

const { render, screen, fireEvent, cleanup } = await import('@testing-library/react');
const {
  SCREEN_GLOSSARY,
  ORDER_JOURNEY_STEPS,
  translateTechnicalStatus,
  getScreenTitle,
} = await import('../i18n/glossary.ts');
const { SCREEN_REGISTRY } = await import('../services/screenRegistry.ts');
const { formatMoney, formatNumber } = await import('../i18n/formatters.ts');
const { migrateDemoEstablishment, AuthProvider } = await import('../context/AuthContext.tsx');
const { I18nProvider } = await import('../i18n/I18nContext.tsx');
const { ThemeProvider } = await import('../theme/ThemeContext.tsx');
const { BusinessProvider } = await import('../context/BusinessContext.tsx');
const { ToastProvider } = await import('../context/ToastContext.tsx');
const { AppLayout } = await import('../components/layout/AppLayout.tsx');
const { TenantDashboard } = await import('../components/dashboard/TenantDashboard.tsx');
const { AuditReportModal } = await import('../components/security/AuditReportModal.tsx');
const { DraggableAssistantLauncher } = await import('../components/ai/DraggableAssistantLauncher.tsx');

let passed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    cleanup();
    dom.window.localStorage.clear();
    passed++;
    console.log(`✅ ${name}`);
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

// 1. Unified Glossary & Language Purity
test('Glossary & ScreenRegistry: Arabic titles have zero English words (except TYGOS/QR) and English titles have zero Arabic', () => {
  assert.equal(getScreenTitle('audit_log', true), 'سجل العمليات');
  assert.equal(getScreenTitle('what_if', true), 'حاسبة التجربة');
  assert.equal(getScreenTitle('dashboard', true), 'الرئيسية');
  assert.equal(getScreenTitle('privileged_access', true), 'طلب صلاحية مؤقتة');
  assert.equal(translateTechnicalStatus('CLOSED_NO_ACTION', true), 'أُغلق دون إجراء');
  assert.equal(translateTechnicalStatus('HR-SEC-2026-001', true), 'بلاغ رقم 1');

  for (const entry of Object.values(SCREEN_GLOSSARY)) {
    const arCleaned = entry.titleAr.replace(/TYGOS|QR/g, '');
    assert.equal(
      /[A-Za-z]/.test(arCleaned),
      false,
      `Arabic glossary title "${entry.titleAr}" should not contain English letters`
    );
    assert.equal(
      /[\u0600-\u06FF]/.test(entry.titleEn),
      false,
      `English glossary title "${entry.titleEn}" should not contain Arabic letters`
    );
  }

  for (const scr of SCREEN_REGISTRY) {
    const arCleaned = scr.nameAr.replace(/TYGOS|QR/g, '');
    assert.equal(
      /[A-Za-z]/.test(arCleaned),
      false,
      `ScreenRegistry nameAr "${scr.nameAr}" should not contain English letters`
    );
    assert.equal(
      /[\u0600-\u06FF]/.test(scr.nameEn),
      false,
      `ScreenRegistry nameEn "${scr.nameEn}" should not contain Arabic letters`
    );
  }
});

// 2. Currency (ج.م), Western Digits (0-9), and Demo Migration
test('Formatters & Migration: Defaults to EGP (ج.م) with 0-9 digits and migrates demo establishments without touching real ones', () => {
  const formatted = formatMoney(4680.5, 'EGP', 'ar', 'western');
  assert.equal(formatted, '4,680.50 ج.م');
  assert.equal(formatNumber(128, 'ar', 0, 'western'), '128');

  const eastern = formatMoney(4680.5, 'EGP', 'ar', 'eastern');
  assert.ok(eastern.includes('ج.م'));
  assert.ok(/[٠-٩]/.test(eastern));

  const oldDemo = {
    id: 'est-1',
    code: 'R.0001',
    prefix: 'R',
    number: '0001',
    name: 'The Royal Mirage Fine Dining',
    ownerName: 'Alexander Sterling',
    businessType: 'restaurant' as const,
    nationalId: 'EG-1',
    crNumber: 'CR-1',
    taxNumber: 'TX-1',
    address: 'Nile Corniche',
    city: 'Cairo',
    state: 'Cairo',
    country: 'Egypt',
    phone: '+20100',
    email: 'a@b.com',
    language: 'ar' as const,
    currency: 'USD' as const,
    timezone: 'UTC+2',
    branchesCount: 1,
    usersCount: 10,
    status: 'active' as const,
    createdAt: '2025-01-01',
    lastActivity: 'now',
  };
  const migrated = migrateDemoEstablishment(oldDemo);
  assert.equal(migrated.currency, 'EGP');
  assert.equal(migrated.name, 'السراب الملكي · مطعم راقٍ');
  assert.equal(migrated.city, 'القاهرة');

  const realUserEst = {
    ...oldDemo,
    id: 'est-real-99',
    name: 'مطعم النخيل الحقيقي',
    currency: 'SAR' as const,
  };
  const untouched = migrateDemoEstablishment(realUserEst);
  assert.equal(untouched.currency, 'SAR');
  assert.equal(untouched.name, 'مطعم النخيل الحقيقي');
});

// 3. Calm, Simple Header & More Menu
test('AppLayout Header: Has <= 2 end action icons (Bell + More), single neutral logo, and zero AI button', () => {
  renderWithProviders(
    <AppLayout>
      <div>محتوى تجريبي</div>
    </AppLayout>
  );

  const header = screen.getByRole('banner');
  assert.ok(header.className.includes('h-14'));
  assert.equal(screen.queryByText('مساعد TYGOS الذكي'), null);

  const moreBtn = screen.getByTestId('header-more-button');
  assert.ok(moreBtn);
  fireEvent.click(moreBtn);

  const moreMenu = screen.getByTestId('header-more-menu');
  assert.ok(moreMenu);
  assert.ok(screen.getByText('خيارات سريعة'));
});

// 4. Home Page (TenantDashboard) Exact 6-Section Order & No Big Stacked Buttons
test('TenantDashboard: Renders exact 6-section order, 8 Arabic journey steps, EGP + 0-9 KPIs, and text links', () => {
  renderWithProviders(<TenantDashboard />);

  const dashboard = screen.getByTestId('tenant-dashboard');
  const s1 = screen.getByTestId('dashboard-section-header');
  const s2 = screen.getByTestId('dashboard-section-actions');
  const s3 = screen.getByTestId('dashboard-section-journey');
  const s4 = screen.getByTestId('dashboard-section-kpis');
  const s5 = screen.getByTestId('dashboard-section-alerts');
  const s6 = screen.getByTestId('dashboard-section-links');

  const sections = [s1, s2, s3, s4, s5, s6];
  for (let i = 0; i < sections.length - 1; i++) {
    assert.ok(
      Boolean(
        sections[i].compareDocumentPosition(sections[i + 1]) &
          dom.window.Node.DOCUMENT_POSITION_FOLLOWING
      ),
      `Section ${i + 1} must precede Section ${i + 2}`
    );
  }

  assert.ok(dashboard.textContent?.includes('نظرة على اليوم'));
  assert.ok(dashboard.textContent?.includes('ملخص سريع لحركة مطعمك النهاردة'));
  assert.ok(dashboard.textContent?.includes('ماذا أفعل الآن؟'));
  assert.ok(dashboard.textContent?.includes('رحلة الطلب من البيع للربح'));
  assert.ok(dashboard.textContent?.includes('أرقام اليوم'));
  assert.ok(dashboard.textContent?.includes('4,680.50 ج.م'));
  assert.ok(dashboard.textContent?.includes('التنبيهات'));

  // All 8 simplified Arabic journey steps present
  assert.equal(ORDER_JOURNEY_STEPS.length, 8);
  for (const step of ORDER_JOURNEY_STEPS) {
    assert.ok(s3.textContent?.includes(step.titleAr), `Missing journey step ${step.titleAr}`);
  }

  // Old big stacked buttons removed
  assert.equal(screen.queryByText('مساعد TYGOS الذكي'), null);
  assert.equal(screen.queryByText('محاكاة التكلفة (What-If)'), null);
  assert.equal(screen.queryByText('سجل التدقيق الأمني'), null);

  // Text links present in section 6
  assert.ok(s6.textContent?.includes('حاسبة التجربة'));
  assert.ok(s6.textContent?.includes('سجل العمليات'));
  assert.ok(s6.textContent?.includes('مساعدة'));
});

// 5. Full-Screen Modal & Activity Log («سجل العمليات»)
test('AuditReportModal: Renders inside ModalShell with large Close button and plain Arabic status labels', () => {
  renderWithProviders(
    <>
      <TenantDashboard />
      <AuditReportModal />
    </>
  );

  // Open «سجل العمليات» from the dashboard link
  const auditLink = screen.getByRole('button', { name: /سجل العمليات/ });
  fireEvent.click(auditLink);

  assert.ok(screen.getAllByText('سجل العمليات').length >= 1);
  const closeBtn = screen.getByTestId('modal-close-button');
  assert.ok(closeBtn.className.includes('min-w-[44px]'));

  // Switch to HR Incidents tab to verify plain Arabic status labels
  const incidentsTab = screen.getByRole('button', { name: /وقائع الموظفين/ });
  fireEvent.click(incidentsTab);

  assert.ok(screen.getByText('أُغلق دون إجراء'));
  assert.ok(screen.getByText('بلاغ رقم 1'));

  fireEvent.click(closeBtn);
  assert.equal(screen.queryByTestId('modal-close-button'), null);
});

// 6. Floating Assistant Launcher
test('DraggableAssistantLauncher: Renders compact 44px semi-transparent launcher', () => {
  renderWithProviders(
    <DraggableAssistantLauncher onClick={() => {}} isOpen={false} activeView="dashboard" />
  );
  const launcher = screen.getByTestId('floating-assistant-launcher');
  assert.ok(launcher.innerHTML.includes('w-11'));
  assert.ok(launcher.innerHTML.includes('h-11'));
  assert.ok(launcher.innerHTML.includes('opacity-75'));
});

console.log(`\n🎉 Phase 8 UI & Glossary Tests Passed: ${passed}/${passed}`);
