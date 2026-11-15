/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Package 6 — Section 4: Schema Migrations (v1→v6), Corrupt JSON Quarantine,
 * Atomic Backup Export/Preview/Restore + Rollback, Data Repair, & Settings UI Tests
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

// Polyfill FileReader in JSDOM cleanly if needed
const { render, screen, fireEvent, cleanup } = await import('@testing-library/react');
const { ThemeProvider } = await import('../theme/ThemeContext.tsx');
const { I18nProvider } = await import('../i18n/I18nContext.tsx');
const { ToastProvider } = await import('../context/ToastContext.tsx');
const { AuthProvider } = await import('../context/AuthContext.tsx');
const { SyncProvider } = await import('../sync/SyncContext.tsx');
const { BusinessProvider } = await import('../context/BusinessContext.tsx');
const { SettingsModule } = await import('../components/settings/SettingsModule.tsx');

const { getStorageAdapter } = await import('../repositories/storageAdapter.ts');
const { migrationService, CURRENT_SCHEMA_VERSION } = await import('../services/migrationService.ts');

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

// 1. Idempotent Migration v1 -> v6 + Corrupt JSON Quarantine
await test('B4-1: ترقية البيانات v1→v6 بشكل متكرر آمن (Idempotent) وعزل JSON التالف', async () => {
  const storage = getStorageAdapter();
  // Seed legacy v1 records
  storage.setItemSync(
    `tygos_${EST_ID}_venue_settings`,
    JSON.stringify({ currency: 'USD', taxStandard: 14 })
  );
  storage.setItemSync(
    `tygos_${EST_ID}_raw_materials`,
    JSON.stringify([{ id: 'm1', nameAr: 'طماطم قديمة', purchasePrice: 20, conversionFactor: 1000 }])
  );
  storage.setItemSync(
    `tygos_${EST_ID}_products`,
    JSON.stringify([{ id: 'p1', nameAr: 'طبق قديم', sellingPrice: 120 }])
  );
  // Inject a malformed JSON key
  storage.setItemSync(`tygos_${EST_ID}_broken_key`, '{broken-json');

  const rep1 = migrationService.migrateEstablishmentData(EST_ID);
  assert.equal(rep1.previousVersion, 1);
  assert.equal(rep1.currentVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(rep1.quarantinedCount, 1, 'Broken JSON quarantined');
  assert.equal(migrationService.getQuarantineRecords(EST_ID).length, 1);

  const migratedMats = JSON.parse(storage.getItemSync(`tygos_${EST_ID}_raw_materials`) || '[]');
  assert.equal(migratedMats[0].isStockTracked, true, 'v2->v3 added isStockTracked');
  const migratedProds = JSON.parse(storage.getItemSync(`tygos_${EST_ID}_products`) || '[]');
  assert.equal(migratedProds[0].lowStockThresholdPortions, 5, 'v3->v4 added lowStockThresholdPortions');
  assert.ok(migratedProds[0].code, 'v3->v4 added missing product code');
  const migratedSettings = JSON.parse(storage.getItemSync(`tygos_${EST_ID}_venue_settings`) || '{}');
  assert.equal(migratedSettings.currency, 'EGP', 'Legacy USD migrated to EGP');

  // Re-running must be idempotent (0 steps, 0 new quarantines)
  const rep2 = migrationService.migrateEstablishmentData(EST_ID);
  assert.equal(rep2.previousVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(rep2.migratedSteps.length, 0);
  assert.equal(rep2.quarantinedCount, 0);
});

// 2. Full Export + Checksum Verification + Preview + Rollback on Failure
await test('B4-2: تصدير نسخة كاملة ومعاينتها ورفض التالف والتراجع الكامل (Rollback) عند تعثر الاستعادة', async () => {
  const storage = getStorageAdapter();
  storage.setItemSync(
    `tygos_${EST_ID}_raw_materials`,
    JSON.stringify([{ id: 'mat-a', nameAr: 'مادة أصلية', purchasePrice: 50, isStockTracked: true }])
  );
  storage.setItemSync(
    `tygos_${EST_ID}_products`,
    JSON.stringify([{ id: 'prd-a', code: 'A-1', nameAr: 'طبق أصلي', sellingPrice: 100 }])
  );
  migrationService.migrateEstablishmentData(EST_ID);

  const backupJson = migrationService.exportEstablishmentBackup(EST_ID);
  const preview = migrationService.previewBackupImport(backupJson);
  assert.equal(preview.valid, true);
  assert.equal(preview.counts.materials, 1);
  assert.equal(preview.counts.products, 1);

  // Tamper checksum detection
  const tampered = JSON.parse(backupJson);
  tampered.keysData['part:products'] = [{ id: 'prd-hack', code: 'X', nameAr: 'مزيف' }];
  const badPreview = migrationService.previewBackupImport(JSON.stringify(tampered));
  assert.equal(badPreview.valid, false);
  assert.match(badPreview.error || '', /Checksum mismatch/);

  // Simulate mid-import failure -> rollback must restore original state untouched
  storage.setItemSync(
    `tygos_${EST_ID}_products`,
    JSON.stringify([{ id: 'prd-before-fail', code: 'B-1', nameAr: 'طبق قبل الفشل', sellingPrice: 200 }])
  );
  const failedImport = migrationService.importEstablishmentBackup(EST_ID, backupJson, {
    simulateFailureAfterWrite: true,
  });
  assert.equal(failedImport.success, false);
  assert.equal(failedImport.rolledBack, true);
  const afterRollback = JSON.parse(storage.getItemSync(`tygos_${EST_ID}_products`) || '[]');
  assert.equal(afterRollback[0].nameAr, 'طبق قبل الفشل', 'State completely rolled back to pre-import snapshot');

  // Legacy v1 import auto-migrates to v6
  const v1Json = JSON.stringify({
    version: '1.0',
    materials: [{ id: 'legacy-m', nameAr: 'خامة قديمة', purchasePrice: 15, conversionFactor: 100 }],
    products: [{ id: 'legacy-p', nameAr: 'طبق قديم جداً', sellingPrice: 90 }],
  });
  const okImport = migrationService.importEstablishmentBackup(EST_ID, v1Json);
  assert.equal(okImport.success, true);
  assert.equal(okImport.migratedFromVersion, 1);
  assert.equal(migrationService.getSchemaVersion(EST_ID), CURRENT_SCHEMA_VERSION);
});

// 3. Data Integrity Repair + SettingsModule Interactive UI Clicks
await test('B4-3: فحص وإصلاح البيانات ومعاينة الاستعادة من واجهة SettingsModule', async () => {
  const storage = getStorageAdapter();
  // Seed broken duplicate code, negative price, and missing warehouseStockMap
  storage.setItemSync(
    `tygos_${EST_ID}_raw_materials`,
    JSON.stringify([{ id: 'm-fix', nameAr: 'سمن', purchasePrice: -10, effectiveUnitCost: -1, currentStock: 500 }])
  );
  storage.setItemSync(
    `tygos_${EST_ID}_products`,
    JSON.stringify([
      { id: 'p-1', code: 'DUP', nameAr: 'صنف 1', sellingPrice: 50, recipeIngredients: [null, { ingredientId: 'missing-id', quantity: 10 }] },
      { id: 'p-2', code: 'DUP', nameAr: 'صنف 2', sellingPrice: -5, recipeIngredients: [] },
    ])
  );

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

  assert.ok(await screen.findByTestId('schema-version-badge'));

  // Click Data Repair in UI
  fireEvent.click(screen.getByTestId('settings-repair-data-btn'));
  assert.ok(await screen.findByTestId('repair-report-card'));

  const fixedProds = JSON.parse(storage.getItemSync(`tygos_${EST_ID}_products`) || '[]');
  assert.notEqual(fixedProds[0].code, fixedProds[1].code, 'Duplicate product code repaired');
  assert.equal(fixedProds[1].sellingPrice, 0, 'Negative price fixed to 0');
  assert.equal(fixedProds[0].recipeIngredients.length, 1, 'Null recipe line removed');
  assert.ok(screen.getByText(/يشير إلى مكوّن مفقود/), 'Orphan ingredient warning surfaced in UI');
});

console.log(`\n🎉 Package 6 Section 4 Tests Passed: ${passed}/3`);
