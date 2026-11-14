/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PACKAGE 5 AUTOMATED TEST SUITE
 * تحميل التكاليف المباشرة وغير المباشرة (التكلفة الكاملة للمنتج)
 * Covers all 8 required verification scenarios:
 * 1. Gas expense allocation: equal_per_sold_unit vs prep_time_minutes yields distinct full costs.
 * 2. Shared rent (مشترك) distributes across operational cost centers proportionally by areaSqm.
 * 3. Burden rate (معدل التحميل) and over/under absorption variance (فروق التحميل) at period close.
 * 4. raw_only mode («خامات فقط») loads 0 overhead onto products.
 * 5. Importing HR payroll & Finance expenses twice does NOT duplicate entries or totals.
 * 6. Official period close locks the target month and blocks any expense mutations/imports.
 * 7. RBAC enforcement blocks Cashiers & Chefs and permits Cost Accountant / CFO / GM / Owner.
 * 8. Strict Arabic RTL UI hygiene check: zero English words (except TYGOS & QR) & zero '$' symbol in rendered UI copy.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { overheadService, OverheadExpense } from '../services/overheadService.ts';
import { can } from '../services/permissions.ts';
import { dataService, MenuItemProduct } from '../services/dataService.ts';
import { inventoryAuditService } from '../services/inventoryAuditService.ts';

function createSampleDish(id: string, nameAr: string, prepMinutes: number, sellingPrice = 150): MenuItemProduct {
  const now = new Date().toISOString();
  return {
    id,
    establishmentId: 'default',
    code: id.toUpperCase(),
    nameAr,
    nameEn: id,
    category: 'مشويات المطبخ',
    prepStation: 'المطبخ الساخن',
    directLaborMinutes: prepMinutes,
    prepTimeMinutes: prepMinutes,
    laborHourlyRate: 40,
    wasteLossBuffer: 0,
    utilitiesCost: 0,
    servingsYield: 1,
    sellingPrice,
    targetMarginPercentage: 65,
    consumablesCost: 2,
    foodCostPercentage: Math.round((42 / sellingPrice) * 100),
    recipeIngredients: [
      {
        ingredientId: 'mat-test-1',
        ingredientNameAr: 'خامة اختبار',
        ingredientNameEn: 'Test Material',
        quantity: 100,
        unit: 'جرام',
        unitCost: 0.4,
        totalCost: 40,
      },
    ],
    trueCost: 42,
    suggestedPrice: 120,
    grossMarginPercentage: 72,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

test('1. توزيع مصروف الغاز بقاعدة equal_per_sold_unit مقابل prep_time_minutes يُنتج تكلفة كاملة مختلفة للطبق', () => {
  const estId = `test-p5-gas-${Date.now()}`;
  const month = '2026-10';
  overheadService.saveSettings(estId, { mode: 'rules_based' });

  const fastSalad = createSampleDish('dish-fast', 'سلطة خضراء سريعة', 5, 90);
  const slowSteak = createSampleDish('dish-slow', 'ستيك مشوي مطوّل', 45, 280);

  const gasExpenseEqual: OverheadExpense = {
    id: 'exp-gas-1',
    establishmentId: estId,
    month,
    nameAr: 'غاز المطبخ',
    category: 'gas',
    costType: 'indirect',
    monthlyAmount: 5000,
    costCenterId: 'cc-kitchen',
    stage1Rule: 'equal',
    stage2Rule: 'equal_per_sold_unit',
    createdAt: '',
    updatedAt: '',
  };

  const salesOverride = {
    'dish-fast': { actualSoldQty: 100, expectedQty: 100 },
    'dish-slow': { actualSoldQty: 100, expectedQty: 100 },
  };

  const equalRes = overheadService.calculateFullProductCosting(
    estId,
    month,
    [fastSalad, slowSteak],
    { expensesOverride: [gasExpenseEqual], salesStatsOverride: salesOverride }
  );

  const prepRes = overheadService.calculateFullProductCosting(
    estId,
    month,
    [fastSalad, slowSteak],
    {
      expensesOverride: [{ ...gasExpenseEqual, stage2Rule: 'prep_time_minutes' }],
      salesStatsOverride: salesOverride,
    }
  );

  const equalSteak = equalRes.products.find((p) => p.productId === 'dish-slow')!;
  const prepSteak = prepRes.products.find((p) => p.productId === 'dish-slow')!;
  const prepSalad = prepRes.products.find((p) => p.productId === 'dish-fast')!;

  assert.strictEqual(equalSteak.indirectOverhead, 25, 'Equal split (5000 / 200 units) should yield 25 EGP');
  assert.strictEqual(prepSteak.indirectOverhead, 45, 'Prep-time split (45 / (5+45) * 5000 / 100) should yield 45 EGP');
  assert.strictEqual(prepSalad.indirectOverhead, 5, 'Prep-time split for 5m salad should yield 5 EGP');
  assert.notStrictEqual(equalSteak.fullCost, prepSteak.fullCost, 'Different Stage 2 allocation rules must produce distinct fullCost');
});

test('2. مصروف الإيجار في المركز «مشترك» يتوزع على الأقسام بالتناسب مع المساحة (areaSqm)', () => {
  const estId = `test-p5-rent-${Date.now()}`;
  const month = '2026-10';
  overheadService.saveSettings(estId, { mode: 'rules_based' });

  const centers = overheadService.getCostCenters(estId).filter((c) => !c.isShared);
  const totalOperationalArea = centers.reduce((s, c) => s + c.areaSqm, 0); // 60 + 25 + 20 + 15 = 120
  const kitchenCenter = centers.find((c) => c.id === 'cc-kitchen')!;
  const barCenter = centers.find((c) => c.id === 'cc-bar')!;

  const rentExp: OverheadExpense = {
    id: 'exp-rent-area',
    establishmentId: estId,
    month,
    nameAr: 'إيجار المكان الشهري',
    category: 'rent',
    costType: 'indirect',
    monthlyAmount: 12000,
    costCenterId: 'cc-shared',
    stage1Rule: 'area',
    stage2Rule: 'equal_per_sold_unit',
    createdAt: '',
    updatedAt: '',
  };

  const summary = overheadService.calculateFullProductCosting(estId, month, [], {
    expensesOverride: [rentExp],
  });

  const kitchenSummary = summary.centers.find((c) => c.costCenterId === 'cc-kitchen')!;
  const barSummary = summary.centers.find((c) => c.costCenterId === 'cc-bar')!;

  const expectedKitchenRent = Math.round((12000 * (kitchenCenter.areaSqm / totalOperationalArea)) * 100) / 100;
  const expectedBarRent = Math.round((12000 * (barCenter.areaSqm / totalOperationalArea)) * 100) / 100;

  assert.strictEqual(kitchenSummary.sharedAllocatedIn, expectedKitchenRent);
  assert.strictEqual(barSummary.sharedAllocatedIn, expectedBarRent);
  assert.ok(kitchenSummary.sharedAllocatedIn > barSummary.sharedAllocatedIn, 'Larger area kitchen must receive more shared rent');
});

test('3. حساب معدل التحميل وفروق التحميل (زائد / ناقص) عند إغلاق الفترة', () => {
  const estId = `test-p5-variance-${Date.now()}`;
  const month = '2026-10';

  // Under-absorbed scenario: Actual expenses = 10,000, Expected = 500 -> rate = 20 EGP/unit, Sold = 400 -> charged = 8,000 -> variance = +2,000 (ناقص / عجز)
  const underVar = overheadService.computePeriodOverheadVariance(estId, month, 10000, 500, 400);
  assert.strictEqual(underVar.burdenRatePerUnit, 20);
  assert.strictEqual(underVar.chargedAmount, 8000);
  assert.strictEqual(underVar.varianceAmount, 2000);
  assert.strictEqual(underVar.status, 'under_absorbed');
  assert.ok(underVar.labelAr.includes('عجز تحميل'), 'Label must clearly state عجز تحميل');

  // Over-absorbed scenario: Actual = 10,000, Expected = 500 -> rate = 20, Sold = 600 -> charged = 12,000 -> variance = -2,000 (زائد / فائض)
  const overVar = overheadService.computePeriodOverheadVariance(estId, month, 10000, 500, 600);
  assert.strictEqual(overVar.chargedAmount, 12000);
  assert.strictEqual(overVar.varianceAmount, -2000);
  assert.strictEqual(overVar.status, 'over_absorbed');
  assert.ok(overVar.labelAr.includes('فائض تحميل'), 'Label must clearly state فائض تحميل');
});

test('4. وضع «خامات فقط» (raw_only) يضيف 0 ج.م مصاريف محمّلة على المنتجات', () => {
  const estId = `test-p5-rawonly-${Date.now()}`;
  const month = '2026-10';
  overheadService.saveSettings(estId, { mode: 'raw_only' });

  const dish = createSampleDish('dish-raw-only', 'برجر مشوي', 12, 160);
  const res = overheadService.calculateFullProductCosting(estId, month, [dish]);
  const prod = res.products[0];

  assert.strictEqual(res.mode, 'raw_only');
  assert.strictEqual(prod.directLabor, 0);
  assert.strictEqual(prod.indirectOverhead, 0);
  assert.strictEqual(prod.consumables, 0);
  assert.strictEqual(prod.fullCost, prod.rawCost + prod.prepCost);
});

test('5. استيراد الرواتب والمصاريف مرتين متتاليتين لا يكرر البنود ولا يضاعف الإجمالي', () => {
  const estId = `test-p5-dedup-${Date.now()}`;
  const month = '2026-11';

  const firstImport = overheadService.importFromHrAndFinance(estId, month);
  assert.ok(firstImport.importedCount > 0, 'First import must insert HR & Finance items');
  const countAfterFirst = overheadService.getExpensesForMonth(estId, month).length;

  const secondImport = overheadService.importFromHrAndFinance(estId, month);
  assert.strictEqual(secondImport.importedCount, 0, 'Second import for same month must insert 0 duplicates');
  assert.ok(secondImport.skippedDuplicateCount > 0, 'Second import must report skipped duplicates');

  const countAfterSecond = overheadService.getExpensesForMonth(estId, month).length;
  assert.strictEqual(countAfterSecond, countAfterFirst, 'Total expenses count must remain identical');
});

test('6. الإغلاق الرسمي للفترة يقفل الشهر ويمنع أي تعديل أو إضافة أو حذف لمصاريفه', async () => {
  const estId = `test-p5-lock-${Date.now()}`;
  await dataService.getRawMaterials(estId);
  const period = inventoryAuditService.getOrCreatePeriod(
    estId,
    'branch-main',
    'wh-main',
    '2026-09-01',
    '2026-09-30'
  );

  // Add an expense before close
  const exp = overheadService.upsertExpense(estId, {
    month: '2026-09',
    nameAr: 'صيانة أجهزة سبتمبر',
    category: 'maintenance',
    costType: 'indirect',
    monthlyAmount: 950,
    costCenterId: 'cc-kitchen',
  });
  assert.ok(exp.id);

  // Perform official close
  const closed = inventoryAuditService.closePeriod(estId, period.id, true, 'محاسب التكاليف');
  assert.strictEqual(closed.period.type, 'closed');
  assert.ok(closed.period.overheadVarianceSummary, 'Official close must include overheadVarianceSummary');
  assert.strictEqual(overheadService.isMonthLocked(estId, '2026-09'), true, 'Month 2026-09 must be locked');

  // Verify mutations throw Lock Error
  assert.throws(
    () =>
      overheadService.upsertExpense(estId, {
        month: '2026-09',
        nameAr: 'مصروف متأخر',
        category: 'other',
        costType: 'indirect',
        monthlyAmount: 500,
        costCenterId: 'cc-shared',
      }),
    /مقفل/,
    'Adding expense into locked month must throw error'
  );

  assert.throws(
    () => overheadService.deleteExpense(estId, exp.id),
    /مقفل/,
    'Deleting expense from locked month must throw error'
  );

  assert.throws(
    () => overheadService.importFromHrAndFinance(estId, '2026-09'),
    /مقفل/,
    'Importing into locked month must throw error'
  );
});

test('7. صلاحيات RBAC: حجب الشاشة عن الكاشير والشيفات وإتاحتها لمحاسب التكاليف والمدير المالي والمدير العام', () => {
  assert.strictEqual(can('cashier', 'overhead:view'), false, 'Cashier cannot view overhead');
  assert.strictEqual(can('waiter', 'overhead:view'), false, 'Waiter cannot view overhead');
  assert.strictEqual(can('head_chef', 'overhead:view'), false, 'Head chef cannot view overhead');
  assert.strictEqual(can('kitchen_manager', 'overhead:view'), false, 'Kitchen manager cannot view overhead');
  assert.strictEqual(can('bar_manager', 'overhead:view'), false, 'Bar manager cannot view overhead');
  assert.strictEqual(can('section_manager', 'overhead:view'), false, 'Section manager cannot view overhead');

  assert.strictEqual(can('cost_accountant', 'overhead:view'), true, 'Cost accountant can view overhead');
  assert.strictEqual(can('cost_accountant', 'overhead:manage'), true, 'Cost accountant can manage overhead');
  assert.strictEqual(can('financial_manager', 'overhead:view'), true, 'Financial manager can view overhead');
  assert.strictEqual(can('general_manager', 'overhead:manage'), true, 'GM can manage overhead');
  assert.strictEqual(can('tenant_admin', 'overhead:manage'), true, 'Owner can manage overhead');
  assert.strictEqual(can('super_admin', 'overhead:manage'), true, 'Super Admin can manage overhead');
});

test('8. التحقق من خلو نصوص واجهة المصاريف وتوزيعها من رمز $ ومن الإنجليزية (عدا TYGOS وQR)', () => {
  const uiPath = path.resolve(process.cwd(), 'src/components/finance/OverheadAllocationModule.tsx');
  const source = fs.readFileSync(uiPath, 'utf-8');

  // Verify currency in UI copy never uses standalone currency '$' (ignoring JS template interpolation '${')
  const withoutTemplateLiteral = source.replace(/\$\{/g, '');
  assert.strictEqual(withoutTemplateLiteral.includes('$'), false, 'OverheadAllocationModule must not contain currency $ symbol');

  // Extract visible JSX text inside closing/opening tags (e.g. <h1 ...>النص</h1>, <span>النص</span>)
  const returnIdx = source.indexOf('return (');
  const jsxSection = returnIdx >= 0 ? source.slice(returnIdx) : source;
  const tagTexts = Array.from(jsxSection.matchAll(/<(?:span|h1|h2|h3|th|p|label|button|strong|option)[^>]*>([^<>{}]+)<\/(?:span|h1|h2|h3|th|p|label|button|strong|option)>/g))
    .map((m) => m[1].trim())
    .filter(Boolean);

  assert.ok(tagTexts.length > 20, 'Should extract rendered Arabic JSX labels');
  for (const text of tagTexts) {
    const stripped = text.replace(/\b(TYGOS|QR)\b/g, '').trim();
    const hasLatinLetters = /[A-Za-z]/.test(stripped);
    assert.strictEqual(
      hasLatinLetters,
      false,
      `Visible JSX UI text node contains non-Arabic Latin letters: "${text}"`
    );
  }
});
