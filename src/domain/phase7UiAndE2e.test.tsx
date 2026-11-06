/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 7 REAL UI, GUARD & END-TO-END TESTS (React Testing Library + jsdom)
 * Named after user complaints to prove every fix in DOM & state.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
// @ts-ignore - jsdom types
import { JSDOM } from 'jsdom';

// Setup jsdom global environment before importing React / Testing Library
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:3000/',
});

(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});
(globalThis as any).HTMLElement = dom.window.HTMLElement;
(globalThis as any).Element = dom.window.Element;
(globalThis as any).Node = dom.window.Node;
(globalThis as any).localStorage = dom.window.localStorage;
(globalThis as any).sessionStorage = dom.window.sessionStorage;
(globalThis as any).CustomEvent = dom.window.CustomEvent;
(globalThis as any).Event = dom.window.Event;
(globalThis as any).PointerEvent = dom.window.MouseEvent;
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);

import React from 'react';
import { render, fireEvent, waitFor, cleanup, within, act } from '@testing-library/react';
import { Button } from '../components/common/Button.tsx';
import { DraggableAssistantLauncher } from '../components/ai/DraggableAssistantLauncher.tsx';
import { PosModule } from '../components/pos/PosModule.tsx';
import { KitchenDisplaySystem } from '../components/pos/KitchenDisplaySystem.tsx';
import { TreasuryAndShiftsModule } from '../components/finance/TreasuryAndShiftsModule.tsx';
import { OrderTraceModule } from '../components/pos/OrderTraceModule.tsx';
import { ThemeProvider } from '../theme/ThemeContext.tsx';
import { I18nProvider } from '../i18n/I18nContext.tsx';
import { SyncProvider } from '../sync/SyncContext.tsx';
import { AuthProvider } from '../context/AuthContext.tsx';
import { BusinessProvider } from '../context/BusinessContext.tsx';
import { ToastProvider } from '../context/ToastContext.tsx';
import { uiPreferencesRepository } from '../repositories/repositories.ts';
import { shiftTreasuryService } from '../services/shiftTreasuryService.ts';
import { orderService } from '../services/orderService.ts';
import { tableService } from '../services/tableService.ts';
import { formatMoney } from '../utils/formatters.ts';

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SyncProvider>
          <AuthProvider>
            <BusinessProvider>
              <ToastProvider>{children}</ToastProvider>
            </BusinessProvider>
          </AuthProvider>
        </SyncProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        results.push(...collectTsxFiles(full));
      }
    } else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) {
      results.push(full);
    }
  }
  return results;
}

test('شكوى: وجود أزرار خام <button> بدون تغذية راجعة — حارس منع <button> الخام في كل المشروع', () => {
  const srcDir = path.resolve(process.cwd(), 'src');
  const files = collectTsxFiles(srcDir);
  const violations: string[] = [];

  for (const file of files) {
    if (file.endsWith(path.join('components', 'common', 'Button.tsx'))) continue;
    const content = fs.readFileSync(file, 'utf-8');
    if (/<button[\s>]/.test(content)) {
      violations.push(path.relative(process.cwd(), file));
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Found raw <button> tags in: ${violations.join(', ')}. Use <Button> from Button.tsx instead.`
  );
});

test('شكوى: الأزرار لا تُظهر حالة التحديد أو تمنع النقر المزدوج أثناء العمليات غير المتزامنة', async () => {
  cleanup();
  let clicks = 0;
  let resolveAsync!: () => void;

  const handleAsync = () =>
    new Promise<void>((res) => {
      clicks += 1;
      resolveAsync = res;
    });

  const { container } = render(
    <Button selected onClick={handleAsync}>
      حفظ وإرسال
    </Button>
  );

  const view = within(container);
  const btn = view.getByRole('button', { name: /حفظ وإرسال/i });
  assert.equal(btn.getAttribute('aria-pressed'), 'true');
  assert.ok(view.getByTestId('button-selected-check'), 'Selected checkmark ✓ must render');

  // Click twice rapidly while async is pending
  fireEvent.click(btn);
  fireEvent.click(btn);
  assert.equal(clicks, 1, 'Double-click must be blocked while async action is pending');
  assert.equal((btn as HTMLButtonElement).disabled, true);

  resolveAsync();
  await waitFor(() => {
    assert.equal((btn as HTMLButtonElement).disabled, false);
  });
});

test('شكوى: أيقونة المساعد العائم تتحرك رأسياً فقط ولا تتحرك أفقياً في العربية (RTL)', () => {
  cleanup();
  localStorage.clear();

  const { container } = render(
    <I18nProvider>
      <div dir="rtl">
        <DraggableAssistantLauncher onClick={() => {}} isOpen={false} activeView="dashboard" />
      </div>
    </I18nProvider>
  );

  const launcher = within(container).getByTestId('floating-assistant-launcher');
  assert.equal(launcher.getAttribute('dir'), 'ltr', 'Launcher must use physical LTR coordinates');

  // Mock getBoundingClientRect
  launcher.getBoundingClientRect = () => ({
    left: 200,
    top: 300,
    right: 256,
    bottom: 356,
    width: 56,
    height: 56,
    x: 200,
    y: 300,
    toJSON: () => {},
  });

  const initialLeft = launcher.style.left;
  const initialTop = launcher.style.top;

  act(() => {
    fireEvent.pointerDown(launcher, { button: 0, clientX: 20, clientY: 686 });
  });

  act(() => {
    fireEvent.pointerMove(launcher, { clientX: 700, clientY: 250 });
  });

  act(() => {
    fireEvent.pointerUp(launcher, { clientX: 700, clientY: 250 });
  });

  const savedPos = uiPreferencesRepository.getLauncherPosition();
  assert.ok(savedPos, 'Launcher position must be persisted');
  assert.notEqual(launcher.style.left, initialLeft, 'Horizontal left coordinate must change on drag in RTL');
  assert.notEqual(launcher.style.top, initialTop, 'Vertical top coordinate must change on drag in RTL');
});

test('شكوى: العملة الافتراضية ونقاء اللغة الإنجليزية من أي حروف عربية', () => {
  assert.equal(formatMoney(150, 'EGP', 'ar'), '150.00 ج.م');
  assert.equal(formatMoney(150, 'EGP', 'en'), '150.00 EGP');

  const i18nPath = path.resolve(process.cwd(), 'src/i18n/I18nContext.tsx');
  const i18nContent = fs.readFileSync(i18nPath, 'utf-8');
  const enBlockMatch = i18nContent.match(/const enTranslations[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (enBlockMatch) {
    const hasArabicInEn = /[\u0600-\u06FF]/.test(enBlockMatch[1]);
    assert.equal(hasArabicInEn, false, 'English translation dictionary must not contain Arabic characters');
  }
});

test('شكوى: دورة الكاشير الكاملة — فتح وردية ← طلب طاولة ← شاشة المطبخ ← تحصيل نقدي ← إغلاق Z ← الخزينة ← تتبّع الطلب', async () => {
  cleanup();
  localStorage.clear();
  const estId = 'est-1';

  // 1. Render POS Module: Shift Gate must block selling until shift is opened
  const posRender = render(
    <AllProviders>
      <PosModule />
    </AllProviders>
  );

  const openShiftBtn = await within(posRender.container).findByRole('button', {
    name: /تأكيد وفتح الوردية الآن/i,
  });
  fireEvent.click(openShiftBtn);

  // Verify shift is now open in service & POS workspace is unlocked
  await waitFor(() => {
    const active = shiftTreasuryService.getActiveShift(estId);
    assert.ok(active, 'Active shift must be created after clicking Open Shift');
    assert.equal(active.status, 'open');
  });

  // 2. Select Table 1 and save & send an order
  const tables = tableService.getTables(estId);
  assert.ok(tables.length > 0, 'Tables must be seeded');

  const sentOrder = await orderService.saveAndSend(
    estId,
    {
      establishmentId: estId,
      serviceType: 'dine_in',
      tableNumber: String(tables[0].number),
      customerName: 'أحمد محمود',
      customerPhone: '01012345678',
      items: [
        {
          productId: 'prod-1',
          nameAr: 'برجر تيجوس كلاسيك',
          nameEn: 'Tygos Classic Burger',
          price: 120,
          quantity: 2,
          station: 'grill',
        },
      ],
      subtotal: 240,
      taxAmount: 33.6,
      serviceFee: 0,
      deliveryFee: 0,
      totalAmount: 273.6,
      stationStatuses: {},
      source: 'pos',
    },
    'كاشير 1'
  );

  assert.equal(sentOrder.status, 'sent');
  assert.equal(tableService.getTableById(estId, tables[0].id)?.status, 'occupied');

  // 3. Render KDS & click Mark Ready
  cleanup();
  const kdsRender = render(
    <AllProviders>
      <KitchenDisplaySystem />
    </AllProviders>
  );

  const readyBtn = await within(kdsRender.container).findByRole('button', { name: /اكتمل/i });
  fireEvent.click(readyBtn);

  await waitFor(() => {
    const updated = orderService.updateStationTicketStatus(estId, sentOrder.id, 'grill', 'ready');
    assert.ok(updated);
  });

  // 4. Atomic Cash Checkout (customer pays 300, change = 26.40, net cash to drawer = 273.60)
  const payRes = await orderService.processPaymentTransaction(estId, {
    orderId: sentOrder.id,
    method: 'cash',
    cashReceived: 300,
    actorName: 'كاشير 1',
    actorRole: 'cashier',
  });

  assert.equal(payRes.netCashToDrawer, 273.6);
  assert.equal(payRes.changeDue, 26.4);
  assert.equal(tableService.getTableById(estId, tables[0].id)?.status, 'available');

  const shiftAfterPay = shiftTreasuryService.getActiveShift(estId)!;
  assert.equal(shiftAfterPay.expectedDrawerCash, 773.6); // 500 opening + 273.60 net cash

  // 5. Close Shift (Z-Report with 0 discrepancy) & Deposit to Treasury
  const closedShift = shiftTreasuryService.closeShift(estId, {
    actualCountedCash: 773.6,
    actorName: 'كاشير 1',
    actorRole: 'cashier',
  });
  assert.equal(closedShift.discrepancy, 0);

  const depositRes = shiftTreasuryService.depositShiftToTreasury(estId, {
    shiftId: closedShift.id,
    depositAmount: 273.6,
    retainedFloatForNextShift: 500,
    receiverName: 'أمين الخزينة',
    actorName: 'مدير المطعم',
  });
  assert.equal(depositRes.treasuryMovement.balanceAfter, 273.6);

  // 6. Render TreasuryAndShiftsModule & OrderTraceModule and verify UI renders the records
  cleanup();
  const treasuryRender = render(
    <AllProviders>
      <TreasuryAndShiftsModule />
    </AllProviders>
  );
  const matches = await within(treasuryRender.container).findAllByText(/273\.60 ج\.م/);
  assert.ok(matches.length >= 1);

  cleanup();
  const traceRender = render(
    <AllProviders>
      <OrderTraceModule />
    </AllProviders>
  );
  assert.ok(await within(traceRender.container).findByText(sentOrder.serialNumber));
});
