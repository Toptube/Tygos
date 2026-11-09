/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AUTOMATED TESTS: PACKAGE 2 - WAREHOUSES, MULTI-UNITS, ITEM CARD & REQUISITIONS
 * Named strictly after user complaints and requirements from Prompt (الحزمة 2).
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

const { render, screen, cleanup, fireEvent } = await import('@testing-library/react');
const { I18nProvider } = await import('../i18n/I18nContext.tsx');
const { ThemeProvider } = await import('../theme/ThemeContext.tsx');
const { ToastProvider } = await import('../context/ToastContext.tsx');
const { AuthProvider, useAuth } = await import('../context/AuthContext.tsx');
const { BusinessProvider } = await import('../context/BusinessContext.tsx');
import type { RawMaterialItem } from '../services/dataService.ts';
const { multiUnitService } = await import('../services/multiUnitService.ts');
const { warehouseService } = await import('../services/warehouseService.ts');
const { dataService } = await import('../services/dataService.ts');

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    cleanup();
    dom.window.localStorage.clear();
    passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    console.error(`❌ ${name}`);
    throw err;
  }
}

console.log('\n--- STARTING PACKAGE 2 AUTOMATED TESTS ---\n');

// 1. Multi-level Unit Chain and Compound Mixed Unit Decomposition
await test('المطلب 1: سلسلة الوحدات المتعددة (2 علبة = 1400 مل) والعرض المركب (1 كرتونة و 10 علب و 500 مل)', async () => {
  const sampleMaterial: Partial<RawMaterialItem> = {
    majorUnit: 'كرتونة',
    majorUnitCapacity: 12, // 1 carton = 12 cans
    subUnit: 'علبة',
    subUnitCapacity: 700, // 1 can = 700 ml
    baseUnit: 'مل',
    consumptionUnit: 'مل',
  };

  // Test 1-a: Entering 2 sub-units converts to 1400 base units
  const baseFromTwoCans = multiUnitService.convertToBase(2, 'sub', sampleMaterial);
  assert.equal(baseFromTwoCans, 1400, '2 cans of 700ml must convert to 1400ml base');

  // Test 1-b: Entering 1 major unit converts to 8400 base units (12 * 700)
  const baseFromOneCarton = multiUnitService.convertToBase(1, 'major', sampleMaterial);
  assert.equal(baseFromOneCarton, 8400, '1 carton of 12 cans * 700ml must convert to 8400ml');

  // Test 1-c: Decomposing 15900 ml into compound mixed units:
  // 15900 = 1 carton (8400) + 10 cans (7000) + 500 ml
  const breakdown = multiUnitService.decomposeToCompoundUnits(15900, sampleMaterial);
  assert.equal(breakdown.majorQty, 1, 'Major qty must be 1 carton');
  assert.equal(breakdown.subQty, 10, 'Sub qty must be 10 cans');
  assert.equal(breakdown.baseQty, 500, 'Base remainder must be 500 ml');
  assert.ok(
    breakdown.formattedMixed.includes('1 كرتونة') &&
      breakdown.formattedMixed.includes('10 علبة') &&
      breakdown.formattedMixed.includes('500 مل'),
    `Compound string must be mixed: got ${breakdown.formattedMixed}`
  );
});

// 2. Sales Deduction from SECTION Warehouse (Kitchen/Bar/Bakery), NOT Main Warehouse
await test('المطلب 2: مبيعات الكاشير تخصم من مخزن القسم المرتبط بمحطة التحضير لا المخزن الرئيسي', async () => {
  const estId = 'test_sales_deplete';
  const initialStock = 10000;

  // Add test material
  const mat = await dataService.addRawMaterial(estId, {
    nameAr: 'صلصة طماطم ممتازة ' + Date.now(),
    nameEn: 'Tomato Sauce',
    category: 'خضروات وبقالة',
    purchaseUnit: 'كرتونة',
    purchasePrice: 120,
    purchasedQuantity: 10,
    consumptionUnit: 'مل',
    conversionFactor: 1000,
    wastePercentage: 0,
    currentStock: initialStock,
    reorderPoint: 500,
    majorUnit: 'كرتونة',
    majorUnitCapacity: 12,
    subUnit: 'علبة',
    subUnitCapacity: 700,
    baseUnit: 'مل',
    warehouseStockMap: {
      'wh-main': 7000, // 7000ml in main warehouse
      'wh-kitchen': 2000, // 2000ml in hot kitchen
      'wh-bar': 1000, // 1000ml in bar
    },
  });

  // Deduct sale for dish prepared at station 'kitchen' for 500ml
  const res = warehouseService.deductSalesStock(
    estId,
    mat.id,
    'kitchen',
    500,
    '0042',
    'كاشير محمود'
  );

  assert.equal(res.success, true, 'Sale deduction must succeed');
  assert.equal(res.deductedFromWhId, 'wh-kitchen', 'Deducted from hot kitchen section warehouse');

  // Verify stock in warehouses
  const updatedMaterials = warehouseService.getMaterials(estId);
  const updatedMat = updatedMaterials.find((m) => m.id === mat.id)!;

  assert.equal(
    updatedMat.warehouseStockMap?.['wh-main'],
    7000,
    'Main warehouse stock must remain completely UNTOUCHED at 7000ml'
  );
  assert.equal(
    updatedMat.warehouseStockMap?.['wh-kitchen'],
    1500,
    'Kitchen warehouse stock must be reduced from 2000ml to 1500ml'
  );
  assert.equal(
    updatedMat.warehouseStockMap?.['wh-bar'],
    1000,
    'Bar warehouse stock must remain at 1000ml'
  );
  assert.equal(
    updatedMat.currentStock,
    9500,
    'Total stock must be reduced to 9500ml'
  );
});

// 3. Full Internal Requisition Cycle: Draft -> Submitted (with auto signature) -> Dispatched (in transit) -> Partial Receipt
await test('المطلب 3: دورة الطلبية بالكامل: كاتب الطلبية بتوقيعه ← صرف المخزن (في الطريق) ← استلام جزئي بالقسم وسبب الرفض', async () => {
  const estId = 'test_req_cycle';

  // Seed material
  const mat = await dataService.addRawMaterial(estId, {
    nameAr: 'حليب كامل الدسم ' + Date.now(),
    nameEn: 'Full Cream Milk',
    category: 'ألبان',
    purchaseUnit: 'كرتونة',
    purchasePrice: 240,
    purchasedQuantity: 10,
    consumptionUnit: 'مل',
    conversionFactor: 1000,
    wastePercentage: 0,
    currentStock: 10000,
    reorderPoint: 1000,
    majorUnit: 'كرتونة',
    majorUnitCapacity: 12,
    subUnit: 'علبة',
    subUnitCapacity: 1000,
    baseUnit: 'مل',
    warehouseStockMap: {
      'wh-main': 8000,
      'wh-kitchen': 2000,
    },
  });

  // Step 1: Head Chef creates Requisition
  const mockChefUser = {
    id: 'usr-chef-nabil',
    fullName: 'الشيف نبيل السيد',
    role: 'head_chef' as const,
  };

  const req = warehouseService.createRequisition(
    estId,
    {
      sourceWarehouseId: 'wh-main',
      targetWarehouseId: 'wh-kitchen',
      lines: [
        {
          materialId: mat.id,
          requestedQuantity: 3, // 3 cans = 3000 ml
          requestedUnit: 'sub',
          notes: 'مطلوب لوجبات اليوم',
        },
      ],
    },
    mockChefUser
  );

  assert.equal(req.status, 'submitted', 'Status must be submitted');
  assert.equal(req.createdByUserName, 'الشيف نبيل السيد', 'Auto-author signature must match logged-in user');
  assert.equal(req.lines[0].currentStockAtSectionBase, 2000, 'Section stock at moment of order must be recorded');
  assert.equal(req.lines[0].requestedQuantityBase, 3000, '3 cans of 1000ml = 3000ml base');

  // Step 2: Storekeeper Dispatches Requisition -> Becomes IN TRANSIT
  const dispatchedReq = warehouseService.dispatchRequisition(
    estId,
    req.id,
    'أمين المخزن محمود',
    'usr-storekeeper-1'
  );

  assert.equal(dispatchedReq.status, 'dispatched', 'Status must be dispatched');
  assert.equal(dispatchedReq.dispatchedByUserName, 'أمين المخزن محمود', 'Storekeeper signature recorded');

  // Verify stock: Source warehouse reduced, but target section warehouse NOT yet credited!
  const matAfterDispatch = warehouseService.getMaterials(estId).find((m) => m.id === mat.id)!;
  assert.equal(matAfterDispatch.warehouseStockMap?.['wh-main'], 5000, 'Main warehouse reduced from 8000 to 5000');
  assert.equal(matAfterDispatch.warehouseStockMap?.['wh-kitchen'], 2000, 'Section warehouse still 2000 (NOT yet received)');
  assert.equal(matAfterDispatch.inTransitStockMap?.['wh-kitchen'], 3000, '3000ml is marked IN TRANSIT');

  // Step 3: Chef Receives PARTIALLY (2 cans accepted = 2000ml, 1 can rejected = 1000ml due to damage)
  const receivedReq = warehouseService.receiveRequisition(
    estId,
    req.id,
    [
      {
        lineId: dispatchedReq.lines[0].id,
        receivedQuantityBase: 2000,
        rejectedQuantityBase: 1000,
        rejectionReason: 'علبة مثقوبة وتالفة',
      },
    ],
    'الشيف نبيل السيد',
    'usr-chef-nabil'
  );

  assert.equal(receivedReq.status, 'partially_received', 'Status must be partially_received');
  assert.equal(receivedReq.lines[0].lineStatus, 'rejected', 'Line marked as rejected/partially rejected');
  assert.equal(receivedReq.lines[0].rejectionReason, 'علبة مثقوبة وتالفة', 'Rejection reason documented');

  // Verify final stock:
  // - 2000ml entered Kitchen section -> 2000 + 2000 = 4000
  // - 1000ml rejected returned to Main warehouse -> 5000 + 1000 = 6000
  // - In transit cleared to 0
  const matFinal = warehouseService.getMaterials(estId).find((m) => m.id === mat.id)!;
  assert.equal(matFinal.warehouseStockMap?.['wh-kitchen'], 4000, 'Kitchen section received 2000ml -> total 4000ml');
  assert.equal(matFinal.warehouseStockMap?.['wh-main'], 6000, 'Main warehouse restored 1000ml rejected -> total 6000ml');
  assert.equal(matFinal.inTransitStockMap?.['wh-kitchen'], 0, 'In-transit stock cleared to 0');
});

// 4. Item Card Movements Ledger (كارت الصنف)
await test('المطلب 4: كارت الصنف يعرض حركات الوارد والمنصرف والرصيد اللحظي في كل مكان', async () => {
  const estId = 'test_item_card';

  const mat = await dataService.addRawMaterial(estId, {
    nameAr: 'جبنة موزاريلا ' + Date.now(),
    nameEn: 'Mozzarella Cheese',
    category: 'ألبان',
    purchaseUnit: 'كرتونة',
    purchasePrice: 500,
    purchasedQuantity: 5,
    consumptionUnit: 'جرام',
    conversionFactor: 1000,
    wastePercentage: 0,
    currentStock: 5000,
    reorderPoint: 1000,
    majorUnit: 'كرتونة',
    majorUnitCapacity: 10,
    subUnit: 'كيس',
    subUnitCapacity: 1000,
    baseUnit: 'جرام',
  });

  // Record a purchase movement
  warehouseService.recordMovement(estId, {
    materialId: mat.id,
    materialNameAr: mat.nameAr,
    type: 'purchase_receipt',
    typeNameAr: 'استلام شراء',
    fromLocationId: 'supplier',
    fromLocationNameAr: 'شركة الألبان الحديثة',
    toLocationId: 'wh-main',
    toLocationNameAr: 'المخزن الرئيسي',
    quantityBase: 5000,
    balanceAfterBase: 5000,
    referenceDoc: 'فاتورة توريد #PO-900',
    actorName: 'أمين المخزن',
  });

  const cardData = warehouseService.getItemCardData(estId, mat.id);
  assert.ok(cardData, 'Item card data must be returned');
  assert.equal(cardData.movements.length, 1, 'Should contain 1 recorded movement');
  assert.equal(cardData.movements[0].type, 'purchase_receipt', 'Movement type matches');
  assert.equal(cardData.totalBaseStock, 5000, 'Total base stock equals 5000g');
  assert.ok(cardData.locationStockBreakdown.length > 0, 'Must have location breakdown for warehouses');
});

// 5. Role-based Warehouse Access Control
await test('المطلب 5: حظر الصلاحيات: أمين المخزن يرى مخازنه فقط، ومدير المخازن ومحاسب التكاليف يريان الكل', async () => {
  const estId = 'default';

  const storekeeperUser = {
    id: 'usr-storekeeper-1',
    role: 'storekeeper' as const,
    assignedWarehouseIds: ['wh-main'],
  };

  const costAccountantUser = {
    id: 'usr-cost-accountant',
    role: 'cost_accountant' as const,
  };

  const storekeeperWarehouses = warehouseService.getWarehousesForUser(estId, storekeeperUser);
  assert.equal(
    storekeeperWarehouses.every((w) => w.id === 'wh-main' || w.keeperIds.includes('usr-storekeeper-1')),
    true,
    'Storekeeper must only see their assigned warehouse'
  );

  const costAccountantWarehouses = warehouseService.getWarehousesForUser(estId, costAccountantUser);
  const allWarehouses = warehouseService.getWarehouses(estId);
  assert.equal(
    costAccountantWarehouses.length,
    allWarehouses.length,
    'Cost accountant must see all warehouses across all branches'
  );
});

console.log(`\n🎉 ALL ${passed} AUTOMATED PACKAGE 2 TESTS PASSED SUCCESSFULLY!\n`);
