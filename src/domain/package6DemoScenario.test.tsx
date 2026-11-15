/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Package 6 — Section 5: Unified Coherent Demo Establishment Dataset & Settings UI Tests
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
const { AuthProvider } = await import('../context/AuthContext.tsx');
const { SyncProvider } = await import('../sync/SyncContext.tsx');
const { BusinessProvider } = await import('../context/BusinessContext.tsx');
const { SettingsModule } = await import('../components/settings/SettingsModule.tsx');

const { demoScenarioService } = await import('../services/demoScenarioService.ts');
const { dataService } = await import('../services/dataService.ts');
const { warehouseService } = await import('../services/warehouseService.ts');
const { semiFinishedService } = await import('../services/semiFinishedService.ts');
const { tableService } = await import('../services/tableService.ts');
const { overheadService, getCurrentMonthKey } = await import('../services/overheadService.ts');
const { productAvailabilityService } = await import('../services/productAvailabilityService.ts');

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

const EST_ID = 'est-1';

// 1. Service verification of all linked counts & integrity
await test('B5-1: تحميل منشأة تجريبية كاملة ينشئ فرعين و7 مخازن و30 خامة (منها ماء غير متتبع) و8 تجهيزات و25 منتجاً و12 طاولة', async () => {
  const summary = await demoScenarioService.loadFullDemoEstablishment(EST_ID);
  assert.equal(summary.branches, 2);
  assert.equal(summary.warehouses, 7);
  assert.equal(summary.materials, 30);
  assert.equal(summary.preparations, 8);
  assert.equal(summary.products, 25);
  assert.equal(summary.tables, 12);

  const branches = warehouseService.getBranches(EST_ID);
  const warehouses = warehouseService.getWarehouses(EST_ID);
  const mats = await dataService.getRawMaterials(EST_ID);
  const preps = semiFinishedService.getPreparations(EST_ID);
  const prods = await dataService.getProducts(EST_ID);
  const tables = tableService.getTables(EST_ID);
  const settings = await dataService.getVenueSettings(EST_ID);

  assert.equal(branches.length, 2);
  assert.equal(warehouses.length, 7);
  assert.equal(mats.length, 30);
  assert.equal(preps.length, 8);
  assert.equal(prods.length, 25);
  assert.equal(tables.length, 12);
  assert.equal(settings.currency, 'EGP');

  const untrackedWater = mats.find((m) => m.nameAr === 'ماء مفلتر');
  assert.ok(untrackedWater, 'Filtered water material exists');
  assert.equal(untrackedWater.isStockTracked, false, 'Water marked as non-tracked cost-only');

  const matIds = new Set(mats.map((m) => m.id));
  const prepIds = new Set(preps.map((p) => p.id));

  for (const prod of prods) {
    assert.ok(prod.recipeIngredients.length > 0, `Product ${prod.nameAr} has ingredients`);
    assert.ok(prod.trueCost > 0, `Product ${prod.nameAr} has EGP cost > 0`);
    for (const line of prod.recipeIngredients) {
      if (line.type === 'semi_finished') {
        assert.ok(prepIds.has(line.ingredientId), `Valid prep link ${line.ingredientId}`);
      } else {
        assert.ok(matIds.has(line.ingredientId), `Valid raw material link ${line.ingredientId}`);
      }
    }
  }

  // Availability check on a complex prep + water product succeeds with > 0 portions
  const pizza = prods.find((p) => p.code === 'PZA-001')!;
  const avail = productAvailabilityService.getProductAvailability(pizza.id, EST_ID);
  assert.ok((avail.portionsAvailable ?? 0) > 0 && avail.status === 'available', 'Seeded pizza is immediately available in kitchen');

  const expenses = overheadService.getExpensesForMonth(EST_ID, getCurrentMonthKey());
  assert.equal(expenses.length, 6);
});

// 2. Interactive Settings UI clicks: Load Full Demo & Double-Confirm Clear Demo
await test('B5-2: أزرار تحميل المنشأة التجريبية وحذف بيانات التجربة بتأكيد مزدوج من شاشة الإعدادات', async () => {
  render(
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <SyncProvider>
            <AuthProvider>
              <BusinessProvider>
                <SettingsModule />
              </BusinessProvider>
            </AuthProvider>
          </SyncProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );

  // Load Full Demo (double click confirmation)
  fireEvent.click(await screen.findByTestId('settings-load-full-demo-btn'));
  fireEvent.click(await screen.findByTestId('settings-confirm-load-demo-btn'));
  assert.ok(await screen.findByText(/تم تحميل منشأة تجريبية متكاملة/));
  assert.equal((await dataService.getProducts(EST_ID)).length, 25);

  // Double-Confirm Clear Demo Data
  fireEvent.click(screen.getByTestId('settings-clear-demo-btn'));
  fireEvent.click(await screen.findByTestId('settings-confirm-clear-demo-btn'));
  assert.ok(await screen.findByText(/تم حذف بيانات التجربة وبدء منشأة نظيفة/));
  assert.equal(semiFinishedService.getPreparations(EST_ID).length, 0);
});

console.log(`\n🎉 Package 6 Section 5 Tests Passed: ${passed}/2`);
