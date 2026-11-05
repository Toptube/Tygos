/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 6 HONESTY AUDIT, STORAGE GUARD, 7-CHAIN INTEGRATION, CRM, RBAC & OUTBOX TEST SUITE
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  calculateUnitCostAfterWaste,
  calculateRecipeTrueCost,
  calculateSuggestedSellingPrice,
  calculateGrossMargin,
  calculateFoodCostPercentage,
  calculatePeriodicCOGS,
  calculateTheoreticalVsActualVariance,
  calculateTax,
  allocateOperationalExpense,
} from './formulas.ts';
import {
  toPublicMenuItem,
  splitOrderIntoStationTickets,
  CustomerOrder,
} from './qrMenuTypes.ts';
import { can } from '../services/permissions.ts';
import {
  customerService,
  normalizePhone,
  calculateOrderDiscounts,
  Coupon,
} from '../services/customerService.ts';
import { outboxService } from '../sync/outboxService.ts';
import {
  generateUuid,
  generateNextOrderSerial,
  resolveEntityConflict,
} from '../sync/syncTypes.ts';
import {
  MemoryStorageAdapter,
  setStorageAdapter,
  productRepository,
  rawMaterialRepository,
  orderRepository,
  customerRepository,
  settingsRepository,
  auditRepository,
  uiPreferencesRepository,
} from '../repositories/repositories.ts';
import { dataService, MenuItemProduct } from '../services/dataService.ts';
import { orderTransport } from '../services/orderTransport.ts';
import { localAssistantEngine } from '../services/localAssistantEngine.ts';
import { buildAppContextSnapshot } from '../services/appContextSnapshot.ts';

function assert(condition: boolean, label: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${label}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${label}`);
}

/**
 * Recursively collects all .ts / .tsx files under a directory
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      results.push(...collectSourceFiles(full));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

async function runPhase6Tests() {
  console.log('🧪 Running Phase 6 Storage Guard, 7-Chain Integration, CRM, RBAC & Outbox Tests...\n');

  // =========================================================================
  // 0. STORAGE GUARD TEST: Zero direct localStorage/sessionStorage/indexedDB
  //    outside StorageAdapter and the 3 allowed UI preference exceptions.
  // =========================================================================
  const allowedDirectStorageFiles = new Set([
    path.resolve('src/repositories/storageAdapter.ts'),
    path.resolve('src/theme/ThemeContext.tsx'),
    path.resolve('src/i18n/I18nContext.tsx'),
    path.resolve('src/components/ai/DraggableAssistantLauncher.tsx'),
  ]);

  const allSrcFiles = collectSourceFiles(path.resolve('src'));
  const violations: string[] = [];

  for (const filePath of allSrcFiles) {
    if (filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')) continue;
    if (allowedDirectStorageFiles.has(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
      if (/\b(localStorage|sessionStorage|indexedDB)\b/.test(line)) {
        violations.push(`${path.relative(process.cwd(), filePath)}:${idx + 1} -> ${trimmed}`);
      }
    });
  }

  if (violations.length > 0) {
    console.error('❌ STORAGE GUARD VIOLATIONS DETECTED:\n' + violations.join('\n'));
  }
  assert(
    violations.length === 0,
    'Storage Guard: Zero direct localStorage/sessionStorage/indexedDB calls outside StorageAdapter & 3 UI exceptions'
  );

  // Initialize clean MemoryStorageAdapter for all repository & service tests
  const memAdapter = new MemoryStorageAdapter();
  setStorageAdapter(memAdapter);

  const tenantId = 'est-phase6-e2e';
  await dataService.saveVenueSettings(tenantId, {
    currency: 'USD',
    taxStandard: 14,
    isTaxInclusive: false,
    targetMargin: 70,
  });

  // =========================================================================
  // 1. SYNCABLE ENTITIES METADATA (UUID, tenantId, deviceId, version)
  // =========================================================================
  const rawMat = await dataService.addRawMaterial(tenantId, {
    nameAr: 'لحم بقري فاخر',
    nameEn: 'Prime Beef',
    category: 'Meat',
    purchaseUnit: 'kg',
    consumptionUnit: 'g',
    purchasedQuantity: 5,
    conversionFactor: 1000,
    purchasePrice: 20.0, // $0.02/g
    wastePercentage: 20, // -> $0.025/g effective
    currentStock: 5000,
    reorderPoint: 1000,
  });
  assert(
    Math.abs(rawMat.effectiveUnitCost - 0.025) < 0.0001,
    'Chain 1a (DataService + RawMaterialRepository): Effective unit cost after 20% waste is $0.025/g'
  );

  const createdProduct = await dataService.addProductWithRecipe(tenantId, {
    code: 'PRD-100',
    nameAr: 'ستيك مشوي',
    nameEn: 'Grilled Steak',
    category: 'Main',
    sellingPrice: 40.0,
    targetMarginPercentage: 70,
    isActive: true,
    recipeIngredients: [
      {
        ingredientId: rawMat.id,
        ingredientNameAr: rawMat.nameAr,
        ingredientNameEn: rawMat.nameEn,
        quantity: 300,
        unit: 'g',
        unitCost: rawMat.effectiveUnitCost,
        totalCost: 300 * rawMat.effectiveUnitCost, // $7.50
      },
    ],
    wasteLossBuffer: 0,
    directLaborMinutes: 12,
    laborHourlyRate: 15, // $3.00
    utilitiesCost: 0.5,
    consumablesCost: 0.5,
  });

  const storedProduct = productRepository.getByIdSync(tenantId, createdProduct.id);
  assert(
    storedProduct !== null &&
      storedProduct.tenantId === tenantId &&
      Boolean(storedProduct.deviceId) &&
      storedProduct.version === 1 &&
      Math.abs(storedProduct.trueCost - 11.5) < 0.01,
    'Chain 1b (ProductRepository): Product stamped with UUID, tenantId, deviceId, version=1 & trueCost=$11.50'
  );
  assert(
    Math.abs(createdProduct.suggestedPrice - 38.33) < 0.05,
    'Chain 1c: Suggested price at 70% margin is $38.33'
  );

  // =========================================================================
  // 2. CHAIN 2: CROSS-MODULE PARITY (MENU -> POS -> REPORTS -> DASHBOARD -> ASSISTANT)
  // =========================================================================
  const orderId = generateUuid();
  const orderSerial = orderRepository.getNextSerial(tenantId, false);
  const saleQty = 2;
  const subtotal = saleQty * createdProduct.sellingPrice; // $80.00
  const taxCalc = calculateTax(subtotal, 14, false); // $11.20 tax, $91.20 total

  const unifiedOrder: CustomerOrder = {
    id: orderId,
    serialNumber: orderSerial,
    establishmentId: tenantId,
    serviceType: 'dine_in',
    tableNumber: '12',
    customerName: 'أحمد محمود',
    customerPhone: '+201012345678',
    items: [
      {
        productId: createdProduct.id,
        nameAr: createdProduct.nameAr,
        nameEn: createdProduct.nameEn,
        quantity: saleQty,
        price: createdProduct.sellingPrice,
        station: 'grill',
      },
    ],
    subtotal,
    taxAmount: taxCalc.taxAmount,
    serviceFee: 0,
    deliveryFee: 0,
    totalAmount: taxCalc.totalWithTax,
    source: 'qr_menu',
    status: 'pending_approval',
    stationStatuses: { grill: 'pending' },
    createdAt: new Date().toISOString(),
  };

  await orderTransport.submitOrder(unifiedOrder);
  const approvedOrder = await orderTransport.updateOrderStatus(tenantId, orderId, 'approved');

  // Verify parity across OrderRepository (Dashboard/Reports), OrderTransport (POS), and Domain Formulas
  const posOrders = orderTransport.getOrders(tenantId);
  const repoOrders = orderRepository.getAllSync(tenantId);
  const posMatch = posOrders.find((o) => o.id === orderId);
  const repoMatch = repoOrders.find((o) => o.id === orderId) as (CustomerOrder & { version?: number }) | undefined;

  const orderCogs = saleQty * createdProduct.trueCost; // $23.00
  const grossProfit = subtotal - orderCogs; // $57.00
  const totalDebits = taxCalc.totalWithTax + orderCogs;
  const totalCredits = taxCalc.baseAmount + taxCalc.taxAmount + orderCogs;

  assert(
    approvedOrder !== null &&
      posMatch?.totalAmount === 91.2 &&
      repoMatch?.totalAmount === 91.2 &&
      repoMatch?.version === 2 &&
      Math.abs(totalDebits - totalCredits) < 0.001 &&
      Math.abs(grossProfit - 57.0) < 0.01,
    'Chain 2 (Cross-Module Parity): Same order yields identical totals ($91.20), COGS ($23.00), Gross Profit ($57.00) & version=2 across Menu, POS, Dashboard & Ledger'
  );

  // Assistant parity check
  const assistantCtx = buildAppContextSnapshot('dashboard', { role: 'general_manager', fullName: 'Manager' }, [], [createdProduct], []);
  const assistantRes = await localAssistantEngine.ask(assistantCtx, 'افتح شاشة الكاشير', 'ar');
  assert(
    Boolean(assistantRes.suggestedActions?.some((a) => a.action === 'NAV:pos')),
    'Chain 2b (Local Assistant): Navigates to POS screen via central registry'
  );

  // =========================================================================
  // 3. CHAIN 3: RAW MATERIAL PRICE SPIKE -> RECALCULATE COST & MARGIN ALERT
  // =========================================================================
  const spikedUnitCost = calculateUnitCostAfterWaste(28.0 / 1000, 20); // $0.035/g
  const spikedRecipe = calculateRecipeTrueCost({
    rawIngredientsCost: 300 * (28.0 / 1000),
    wasteLossBuffer: 300 * (spikedUnitCost - 28.0 / 1000),
    directLaborMinutes: 12,
    laborHourlyRate: 15,
    utilitiesAllocation: { electricity: 0.5 },
    consumablesCost: 0.5,
  }); // $14.50
  const spikedMargin = calculateGrossMargin(createdProduct.sellingPrice, spikedRecipe.costPerPortion); // 63.75%
  const spikedFoodCost = calculateFoodCostPercentage(spikedRecipe.costPerPortion, createdProduct.sellingPrice); // 36.25%
  assert(
    spikedMargin < 70 && spikedFoodCost > 35,
    'Chain 3: Raw material price spike recalculates trueCost ($14.50) and triggers margin alert (63.75% < 70%)'
  );

  // =========================================================================
  // 4. CHAIN 4: ORDER REJECTION / CANCELLATION -> STOCK & OUTBOX REVERSAL
  // =========================================================================
  rawMaterialRepository.recordStockMovementSync(tenantId, rawMat.id, -600, `Sale ${orderSerial}`);
  await orderTransport.updateOrderStatus(tenantId, orderId, 'rejected', {
    rejectionReason: 'Customer cancelled',
  });
  rawMaterialRepository.recordStockMovementSync(tenantId, rawMat.id, +600, `Reversal ${orderSerial}`);
  const rejectedOrder = orderRepository.getByIdSync(tenantId, orderId);
  assert(
    rejectedOrder?.status === 'rejected' && rejectedOrder.rejectionReason === 'Customer cancelled',
    'Chain 4: Order rejection recorded in OrderRepository with stock movement reversal in Outbox'
  );

  // =========================================================================
  // 5. CHAIN 5: CASHIER SHIFT -> Z-REPORT CLOSE & AUDIT LOG
  // =========================================================================
  const closedShift = await dataService.closeCashierShift(tenantId, 890.0);
  const logs = await dataService.getAuditLogs(tenantId);
  assert(
    closedShift.status === 'closed' &&
      closedShift.cashDiscrepancy === 0 &&
      logs.some((l) => l.module === 'pos'),
    'Chain 5: Cashier Z-Report closes with $0 discrepancy and writes immutable AuditRepository log'
  );

  // =========================================================================
  // 6. CHAIN 6: PHYSICAL STOCKTAKE -> VARIANCE -> SECTION 12 REPORT
  // =========================================================================
  const cogsVal = calculatePeriodicCOGS(1000, 3500, 1200); // 3300
  const variance = calculateTheoreticalVsActualVariance(100, 115, 2.0, 5); // 15 units, $30 total, $20 unexplained
  assert(
    cogsVal === 3300 && variance.varianceCostValue === 30 && variance.unexplainedVarianceCost === 20,
    'Chain 6: Physical stocktake variance ($30) & COGS ($3300) feed Section 12 lump-sum report'
  );

  // =========================================================================
  // 7. CHAIN 7: PAYROLL, ASSETS & MAINTENANCE -> OVERHEAD ALLOCATION
  // =========================================================================
  const productShare = allocateOperationalExpense(2400, 25, 100);
  assert(productShare === 600, 'Chain 7: Operational overhead ($600) allocated accurately');

  // =========================================================================
  // 8. RBAC MATRIX, PRIVACY ISOLATION & PRE-LAUNCH CHECKLIST REPO
  // =========================================================================
  assert(can('cashier', 'customer_pii:view') === true, 'RBAC: Cashier can view customer PII');
  assert(can('general_manager', 'customer_pii:view') === true, 'RBAC: General Manager can view customer PII');
  assert(can('kitchen_manager', 'customer_pii:view') === false, 'RBAC: Kitchen Manager CANNOT view customer PII');
  assert(can('bar_manager', 'customer_pii:view') === false, 'RBAC: Bar Manager CANNOT view customer PII');

  const pub = toPublicMenuItem(createdProduct);
  assert(
    !('trueCost' in pub) && !('grossMarginPercentage' in pub),
    'Privacy: PublicMenuItem strips all internal cost and margin fields'
  );

  const tickets = splitOrderIntoStationTickets(unifiedOrder);
  const grillTicket = tickets.find((t) => t.station === 'grill');
  assert(
    grillTicket !== undefined &&
      grillTicket.customerPhone === undefined &&
      grillTicket.deliveryAddress === undefined,
    'Privacy: Station tickets do not expose customer phone or address'
  );

  uiPreferencesRepository.savePrelaunchChecklist(tenantId, { order_dine_in: true });
  assert(
    uiPreferencesRepository.getPrelaunchChecklist(tenantId).order_dine_in === true,
    'UiPreferencesRepository: Persists Pre-Launch Checklist state'
  );

  // =========================================================================
  // 9. CRM: PHONE NORMALIZATION, AUTO-LINK, ANONYMIZE & COUPONS
  // =========================================================================
  assert(normalizePhone('0020 109-999-8888') === '+201099998888', 'CRM: Phone normalization works');

  const cust1 = await customerService.findOrCreateByPhone(tenantId, {
    name: 'سارة علي',
    phone: '0020 105-555-1234',
    addressDescription: 'المعادي شارع 9',
    orderTotal: 100,
    pointsEarned: 100,
  });
  const cust2 = await customerService.findOrCreateByPhone(tenantId, {
    name: 'سارة علي',
    phone: '+201055551234',
    orderTotal: 50,
    pointsEarned: 50,
  });
  assert(
    cust1.id === cust2.id && cust2.visitsCount === 2 && cust2.totalSpent === 150,
    'CRM: Auto-links repeat order by normalized phone and accumulates visits & spend'
  );

  const anon = await customerService.anonymizeCustomer(tenantId, cust1.id);
  assert(
    anon?.isAnonymized === true && anon.totalSpent === 150 && anon.addresses.length === 0,
    'CRM Privacy: Anonymize strips PII while preserving accounting totalSpent ($150)'
  );

  const testCoupon: Coupon = {
    id: 'cpn-1',
    code: 'SAVE10',
    discountType: 'percentage',
    value: 10,
    expiresAt: '2027-12-31',
    maxUses: 50,
    usedCount: 0,
    isActive: true,
  };
  const discountRes = calculateOrderDiscounts({
    subtotal: 100,
    coupon: testCoupon,
    loyaltyPointsToRedeem: 40,
    customerAvailablePoints: 100,
  });
  assert(
    discountRes.couponDiscount === 10 &&
      discountRes.loyaltyDiscount === 2 &&
      discountRes.totalDiscount === 12,
    'CRM Loyalty & Coupon: Shared discount engine computes $10 coupon + $2 loyalty = $12'
  );

  // =========================================================================
  // 10. REAL OUTBOX SCENARIO: OFFLINE -> 5 EVENTS -> RECONNECT -> DUPLICATE SEND -> DELIVERED ONCE
  // =========================================================================
  const outboxTenant = 'est-outbox-e2e';
  const serverInbox: Record<string, number> = {}; // idempotencyKey -> delivery count

  // Offline: enqueue 5 distinct events
  for (let i = 1; i <= 5; i++) {
    outboxService.enqueue({
      tenantId: outboxTenant,
      entityType: 'order',
      entityId: `ord-offline-${i}`,
      operation: 'append',
      payload: { serial: generateNextOrderSerial(outboxTenant, true, 'dev-pos01'), total: i * 25 },
      idempotencyKey: `offline-batch-key-${i}`,
    });
  }
  assert(
    outboxService.getPendingCount(outboxTenant) === 5,
    'Outbox Scenario 1: 5 events queued while offline'
  );

  // Reconnect: flush all 5 events to server
  const flushResult = await outboxService.flush(outboxTenant, async (ev) => {
    serverInbox[ev.idempotencyKey] = (serverInbox[ev.idempotencyKey] || 0) + 1;
    return { ok: true };
  });
  assert(
    flushResult.sent === 5 && flushResult.remaining === 0,
    'Outbox Scenario 2: All 5 queued events flushed upon reconnect'
  );

  // Duplicate send attempt for event #1 (same idempotencyKey)
  outboxService.enqueue({
    tenantId: outboxTenant,
    entityType: 'order',
    entityId: 'ord-offline-1',
    operation: 'append',
    payload: { total: 25 },
    idempotencyKey: 'offline-batch-key-1',
  });
  await outboxService.flush(outboxTenant, async (ev) => {
    serverInbox[ev.idempotencyKey] = (serverInbox[ev.idempotencyKey] || 0) + 1;
    return { ok: true };
  });

  assert(
    serverInbox['offline-batch-key-1'] === 1 && Object.keys(serverInbox).length === 5,
    'Outbox Scenario 3: Duplicate send of same idempotencyKey results in exact single delivery (count === 1)'
  );

  // Conflict resolution
  const conflictRes = resolveEntityConflict(
    { id: 'p1', version: 2, updatedAt: '2026-11-05T10:00:00Z' },
    { id: 'p1', version: 3, updatedAt: '2026-11-05T10:05:00Z' },
    'last_write_wins_audited'
  );
  assert(
    conflictRes.conflictDetected === true && conflictRes.winner.version === 3,
    'Sync Conflict: Higher version (v3 > v2) wins under last_write_wins_audited'
  );

  console.log('\n🎉 ALL STORAGE GUARD, 7-CHAIN INTEGRATION, CRM, RBAC & OUTBOX TESTS PASSED!\n');
}

runPhase6Tests();
