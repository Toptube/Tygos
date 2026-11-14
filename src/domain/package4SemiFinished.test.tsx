/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PACKAGE 4 AUTOMATED TEST SUITE
 * التجهيزات (عجين، مرينيهات، صوصات) كمرشّح تحويل بين الخامات والمنتجات
 * Covers all 12 core requirements and operational edge-cases.
 */

import { test } from 'node:test';
import assert from 'node:assert';
import {
  semiFinishedService,
  SemiFinishedItem,
  PreparationIngredient,
  PreparationPortion,
} from '../services/semiFinishedService.ts';
import { dataService, MenuItemProduct } from '../services/dataService.ts';
import { warehouseService } from '../services/warehouseService.ts';
import { orderService } from '../services/orderService.ts';
import { inventoryAuditService } from '../services/inventoryAuditService.ts';
import { productAvailabilityService } from '../services/productAvailabilityService.ts';
import { productRepository } from '../repositories/repositories.ts';

const EST_ID = 'default';

// Initialize and seed materials repository for default establishment
await dataService.getRawMaterials(EST_ID);

const getStock = (matId: string, whId: string): number => {
  const mat = warehouseService.getMaterials(EST_ID).find((m) => m.id === matId);
  return mat?.warehouseStockMap?.[whId] ?? mat?.currentStock ?? 0;
};

test('1. استلام فاتورة شراء خامة يحدّث متوسط التكلفة المرجح (WAC) ديناميكياً', () => {
  const materials = warehouseService.getMaterials(EST_ID);
  const flour = materials.find((m) => m.nameAr.includes('دقيق'))!;
  assert.ok(flour, 'Flour material must exist in default establishment');

  const prevStock = flour.currentStock || 0;
  const prevEffective = flour.effectiveUnitCost || 0;

  // Record a purchase of 20000g (20 kg) flour at higher price (0.05 EGP per gram vs ~0.0008 EGP/g)
  const receipt = warehouseService.recordPurchaseReceipt(
    EST_ID,
    flour.id,
    20000, // 20000 grams
    0.05,  // 0.05 EGP per gram (50 EGP per kg)
    'مورد الدقيق الفاخر',
    'فاتورة تجريبية #991'
  );

  const updatedFlour = warehouseService.getMaterials(EST_ID).find((m) => m.id === flour.id)!;
  assert.strictEqual(updatedFlour.currentStock, prevStock + 20000, 'Flour stock must increase by received grams');
  assert.ok(receipt.newAvgCost > 0 && updatedFlour.costPerUnit! > 0.001, 'WAC cost per unit must update');
  assert.ok(updatedFlour.effectiveUnitCost > prevEffective, 'Effective WAC unit cost must increase dynamically');
});

test('2. تجهيز عجين بيتزا (1700 جم، 170 جم للقطعة = 10 كرات، حساب التكلفة الصحيح للحصة)', () => {
  const dough = semiFinishedService.getPreparationById('prep-pizza-dough');
  assert.ok(dough, 'Italian Pizza Dough prep-pizza-dough must exist');
  assert.strictEqual(dough.totalYield, 1700, 'Yield should be 1700 grams');
  assert.strictEqual(dough.yieldUnit, 'جرام', 'Yield unit should be grams');

  // Verify portion: كرة بيتزا 170 جم
  const ballPortion = dough.portions.find((p) => p.nameAr.includes('كرة عجين') || p.nameAr.includes('قطعة عجين'));
  assert.ok(ballPortion, 'Pizza ball portion must be defined');
  assert.strictEqual(ballPortion.sizeInYieldUnits, 170, 'Ball size must be 170g');

  // Verify unit cost and portion cost calculation
  const costInfo = semiFinishedService.calculatePreparationUnitCost(dough);
  assert.ok(costInfo.unitCost > 0, 'Unit cost per gram must be > 0');
  const expectedPortionCost = Math.round(costInfo.unitCost * 170 * 100) / 100;
  assert.ok(expectedPortionCost > 0, 'Expected portion cost must be > 0');
  assert.ok(
    Math.abs(ballPortion.calculatedCost - expectedPortionCost) <= 0.5,
    'Portion cost must match calculated formula cost within rounding tolerance'
  );
});

test('3. بيع بيتزا على الصيغة (On-Formula): يفكك التجهيزات للخامات الأولية ويخصمها من مخزن القسم دون إنشاء رصيد للتجهيز، مع تسجيل كارت الصنف', async () => {
  const dough = semiFinishedService.getPreparationById('prep-pizza-dough')!;
  const sauce = semiFinishedService.getPreparationById('prep-pizza-sauce')!;
  const ballPortion = dough.portions.find((p) => p.nameAr.includes('كرة عجين') || p.nameAr.includes('قطعة عجين'))!;

  // Decompose 1 pizza ball + 50g sauce
  const reqs1 = semiFinishedService.decomposePreparationToRaw(dough.id, 1, ballPortion.id);
  const reqs2 = semiFinishedService.decomposePreparationToRaw(sauce.id, 50);

  assert.ok(reqs1.length >= 2, 'Dough must decompose to flour and water/salt');
  const flourReq = reqs1.find((r) => r.materialNameAr.includes('دقيق'));
  assert.ok(flourReq, 'Flour must be an ultimate decomposed requirement');
  // In 1700g total dough yield with 1000g flour, a 170g ball uses exactly 100g flour
  assert.strictEqual(flourReq.requiredBaseQty, 100, '170g ball uses exactly 100g raw flour');

  // Test POS order settlement with recipe containing prep
  const nowIso = new Date().toISOString();
  const pizzaProduct: MenuItemProduct = {
    id: 'prod-pizza-p4',
    establishmentId: EST_ID,
    code: 'PZ-01',
    nameAr: 'بيتزا مارجريتا إيطالي',
    nameEn: 'Margherita Pizza',
    category: 'البيتزا والمعجنات',
    sellingPrice: 150,
    targetMarginPercentage: 70,
    suggestedPrice: 150,
    trueCost: 15,
    foodCostPercentage: 10,
    grossMarginPercentage: 90,
    directLaborMinutes: 5,
    laborHourlyRate: 15,
    wasteLossBuffer: 0,
    utilitiesCost: 0.5,
    consumablesCost: 0.5,
    prepStation: 'kitchen',
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    recipeIngredients: [
      {
        ingredientId: dough.id,
        ingredientNameAr: dough.nameAr,
        ingredientNameEn: dough.nameEn,
        quantity: 1,
        unit: 'كرة عجين',
        unitCost: 6.8,
        totalCost: 6.8,
        type: 'semi_finished',
        portionId: ballPortion.id,
        portionNameAr: ballPortion.nameAr,
      },
      {
        ingredientId: sauce.id,
        ingredientNameAr: sauce.nameAr,
        ingredientNameEn: sauce.nameEn,
        quantity: 50,
        unit: 'جرام',
        unitCost: 0.08,
        totalCost: 4.0,
        type: 'semi_finished',
      },
    ],
  };

  productRepository.upsertSync(EST_ID, pizzaProduct);

  const kitchenWh = warehouseService.resolveSectionWarehouseForStation(EST_ID, 'kitchen');
  const flourMat = warehouseService.getMaterials(EST_ID).find((m) => m.nameAr.includes('دقيق'))!;
  
  // Ensure stock is available in section warehouse
  warehouseService.adjustPhysicalStock(kitchenWh.id, flourMat.id, 5000, 'رصيد بدائي للاختبار');
  const beforeStock = getStock(flourMat.id, kitchenWh.id);

  // Settle order via POS
  await orderService.settleOrder(
    EST_ID,
    'pos',
    'table-1',
    [{ product: pizzaProduct, quantity: 1 }],
    'cash',
    150,
    'كاشير وردية البيتزا'
  );

  const afterStock = getStock(flourMat.id, kitchenWh.id);
  // Stock must decrease by 100g decomposed from the dough ball
  assert.strictEqual(afterStock, beforeStock - 100, 'Flour stock must be deducted by exactly 100g');

  // Check ledger item card
  const ledger = warehouseService.getItemLedger(flourMat.id, kitchenWh.id);
  const lastEntry = ledger[ledger.length - 1];
  assert.ok(lastEntry.notes?.includes('استهلاك عبر تجهيز'), 'Item card notes must indicate consumption via prep');
});

test('4. "2 بولة أرز مسلوق" (prep-cooked-rice): تخصم 100 جم أرز نيء بناءً على معامل الطبخ', () => {
  const ricePrep = semiFinishedService.getPreparationById('prep-cooked-rice')!;
  assert.strictEqual(ricePrep.type, 'processing', 'Cooked rice should be processing type');

  const ricePortion = ricePrep.portions.find((p) => p.nameAr.includes('بولة'))!;
  assert.ok(ricePortion, 'Rice bowl portion must exist');
  assert.strictEqual(ricePortion.sizeInYieldUnits, 100, 'Rice bowl must be 100g cooked');

  // 2 portions of 100g cooked rice = 200g cooked rice
  const decomposed = semiFinishedService.decomposePreparationToRaw(ricePrep.id, 2, ricePortion.id);
  assert.strictEqual(decomposed.length, 1, 'Should decompose to raw basmati rice');
  // 200g cooked rice / cookFactor 2.0 (50g raw -> 100g cooked) = 100g raw rice
  assert.strictEqual(decomposed[0].requiredBaseQty, 100, '2 bowls (200g cooked) must require 100g raw basmati rice');
});

test('5. الجرد الفعلي: إدخال 5 كجم صوص بيتزا متبقٍ يعرض المعاينة اللحظية لتفكيك الخامات، ويضيفها للجرد الفعلي كـ extraSemiFinishedBase', () => {
  const saucePrep = semiFinishedService.getPreparationById('prep-pizza-sauce')!;

  // 5 kg = 5000 grams
  const preview = semiFinishedService.calculateEquivalentRawForRemainingPrep([
    { preparationId: saucePrep.id, quantityRemaining: 5000 },
  ]);

  assert.ok(preview.length > 0, 'Should return decomposed raw ingredients for 5kg sauce');
  const tomatoReq = preview.find((p: any) => p.rawMaterialNameAr.includes('طماطم'));
  assert.ok(tomatoReq, 'Tomatoes must be part of equivalent raw materials');
  assert.ok(tomatoReq.equivalentRawQuantity > 0, 'Tomato quantity must be calculated');

  // Audit record physical count with extraSemiFinishedBase inside an open period
  const branches = warehouseService.getBranches(EST_ID);
  const branchId = branches[0]?.id || 'branch-main';
  const period = inventoryAuditService.getOrCreatePeriod(
    EST_ID,
    branchId,
    'wh-kitchen-hot',
    '2026-11-01',
    '2026-11-30'
  );

  const tomatoMat = warehouseService.getMaterials(EST_ID).find((m) => m.nameAr.includes('طماطم'))!;
  const updatedPeriod = inventoryAuditService.recordPhysicalCount(
    EST_ID,
    period.id,
    tomatoMat.id,
    2000, // 2000g physically in storage box
    'base',
    'شيف الصوصات',
    'جرد دوري',
    'محاسب التكاليف',
    undefined,
    tomatoReq.equivalentRawQuantity // extra count from remaining sauce
  );

  const rec = updatedPeriod.items.find((i) => i.materialId === tomatoMat.id)!;
  assert.strictEqual(rec.extraSemiFinishedBase, tomatoReq.equivalentRawQuantity, 'extraSemiFinishedBase must be recorded');
  assert.strictEqual(rec.totalActualStockBase, 2000 + tomatoReq.equivalentRawQuantity, 'Total actual must sum shelf count + prep count');
});

test('6. انتشار التكلفة الديناميكي (Dynamic Cost Propagation): تغيير سعر شراء الدقيق يحدّث تكلفة التجهيز والحصص والمنتجات المرتبطة فورياً', () => {
  const dough = semiFinishedService.getPreparationById('prep-pizza-dough')!;
  const initialCost = semiFinishedService.calculatePreparationUnitCost(dough).unitCost;

  // Increase flour price
  const materials = warehouseService.getMaterials(EST_ID);
  const flour = materials.find((m) => m.nameAr.includes('دقيق'))!;
  flour.purchasePrice = 100;
  flour.effectiveUnitCost = 100;
  flour.costPerUnit = 0.1;
  warehouseService.saveMaterials(EST_ID, materials);

  // Recalculate cost & propagate to linked product
  const updatedCost = semiFinishedService.calculatePreparationUnitCost(dough);
  assert.ok(updatedCost.unitCost > initialCost, 'Recalculated unit cost must increase with higher flour cost');
  const ballPortion = dough.portions.find((p) => p.nameAr.includes('كرة عجين') || p.nameAr.includes('قطعة عجين'))!;
  assert.ok(updatedCost.portionCosts[ballPortion.id] > 0, 'Portion cost must be calculated');

  const beforeProd = productRepository.getByIdSync(EST_ID, 'prod-pizza-p4');
  const beforeTrueCost = beforeProd?.trueCost ?? 0;
  dough.wacUnitCost = updatedCost.unitCost;
  dough.portions.forEach((p) => {
    if (updatedCost.portionCosts[p.id] !== undefined) p.calculatedCost = updatedCost.portionCosts[p.id];
  });
  semiFinishedService.upsertPreparation(EST_ID, dough, 'محاسب التكاليف');
  const afterProd = productRepository.getByIdSync(EST_ID, 'prod-pizza-p4');
  assert.ok(afterProd && afterProd.trueCost !== beforeTrueCost, 'Linked product trueCost must update dynamically');
});

test('7. منع الدوران التكراري (Circular Dependency Prevention): منع احتواء تجهيز على نفسه أو حلقة مغلقة', () => {
  const dough = semiFinishedService.getPreparationById('prep-pizza-dough')!;

  // 1. Direct circular: dough contains dough
  const selfCheck = semiFinishedService.checkCircularDependency(dough.id, [
    { type: 'semi_finished', itemId: dough.id, quantity: 100, unit: 'جرام' },
  ]);
  assert.strictEqual(selfCheck.hasCircular, true, 'Direct circular dependency must be detected');

  // 2. Valid nested prep
  const sauce = semiFinishedService.getPreparationById('prep-pizza-sauce')!;
  const validCheck = semiFinishedService.checkCircularDependency(dough.id, [
    { type: 'semi_finished', itemId: sauce.id, quantity: 100, unit: 'جرام' },
  ]);
  assert.strictEqual(validCheck.hasCircular, false, 'Valid nested prep should not be flagged');
});

test('8. حجب التجهيزات عن طلبيات شراء الخامات (خامات فقط)', () => {
  const rawList = warehouseService.getMaterials(EST_ID);
  const preps = semiFinishedService.getAllPreparations();

  // All items in raw materials must not be preparations
  preps.forEach((prep) => {
    const foundInRaw = rawList.find((r) => r.id === prep.id);
    assert.strictEqual(foundInRaw, undefined, `Preparation ${prep.id} must not exist in raw materials catalog`);
  });
});

test('9. تسجيل الدفعات الاختياري (Batch Production): تفعيل وتجهيز دفعة وخصم الخامات وإعادة التحويل عند الإلغاء', () => {
  const prep = semiFinishedService.getPreparationById('prep-pizza-sauce')!; // Pizza Sauce
  const targetWh = warehouseService.resolveSectionWarehouseForStation(EST_ID, prep.producingDepartment);
  const tomato = warehouseService.getMaterials(EST_ID).find((m) => m.nameAr.includes('طماطم'))!;

  // Ensure stock is available
  warehouseService.adjustPhysicalStock(targetWh.id, tomato.id, 10000, 'رصيد لاختبار الدفعات');

  // Enable batch tracking
  semiFinishedService.toggleBatchTracking(prep.id, true);
  const updatedPrep = semiFinishedService.getPreparationById(prep.id)!;
  assert.strictEqual(updatedPrep.enableBatchTracking, true, 'Batch tracking must be enabled');

  const beforeTomatoStock = getStock(tomato.id, targetWh.id);

  // Record batch production of 2000g sauce
  const batchResult = semiFinishedService.recordBatchProduction(
    EST_ID,
    prep.id,
    {
      batchCount: 1,
      actualYieldBase: 2000,
      actorName: 'شيف البيتزا',
    }
  );

  assert.ok(batchResult.batch, 'Batch record must be created');
  assert.strictEqual(batchResult.batch.actualYieldBase, 2000, 'Batch yield must be 2000g');
  const afterTomatoStock = getStock(tomato.id, targetWh.id);
  assert.ok(afterTomatoStock < beforeTomatoStock, 'Raw tomato stock must be deducted upon batch production');

  assert.strictEqual(batchResult.prep.currentBatchStock, 2000, 'Prep stock must be 2000g');

  // Disable batch tracking while stock remains -> converts remaining prep stock back to raw materials
  semiFinishedService.toggleBatchTracking(prep.id, false);
  const revertedPrep = semiFinishedService.getPreparationById(prep.id)!;
  assert.strictEqual(revertedPrep.currentBatchStock, 0, 'Prep stock must be 0 after disabling batch tracking');
});

test('10. تعديل الصيغة ينطبق على المبيعات المستقبلية دون أثر رجعي مع توثيق سجل التعديلات', () => {
  const dough = semiFinishedService.getPreparationById('prep-pizza-dough')!;
  const auditCountBefore = dough.auditHistory.length;

  // Edit dough formula: add oregano
  const updatedDough: SemiFinishedItem = {
    ...dough,
    ingredients: [
      ...dough.ingredients,
      {
        id: 'ing-oregano-test',
        type: 'raw_material',
        itemId: 'raw-oregano',
        itemNameAr: 'زعتر بري مجفف',
        quantity: 15,
        unit: 'جرام',
      },
    ],
  };

  semiFinishedService.upsertPreparation(updatedDough, 'شيف المخبوزات');
  const savedDough = semiFinishedService.getPreparationById('prep-pizza-dough')!;

  assert.strictEqual(savedDough.auditHistory.length, auditCountBefore + 1, 'Audit history must record the edit');
});

test('11. نفاد الخامة الأولية (Bottleneck) يحدد إتاحة الأصناف المحتوية على تجهيزات', () => {
  const dough = semiFinishedService.getPreparationById('prep-pizza-dough')!;
  const ballPortion = dough.portions.find((p) => p.nameAr.includes('كرة عجين') || p.nameAr.includes('قطعة عجين'))!;
  const materials = warehouseService.getMaterials(EST_ID);
  const flour = materials.find((m) => m.nameAr.includes('دقيق'))!;
  const oliveOil = materials.find((m) => m.nameAr.includes('زيت'))!;
  const kitchenWh = warehouseService.resolveSectionWarehouseForStation(EST_ID, 'kitchen');

  // Ensure other tracked dough ingredients have ample stock in kitchen section warehouse
  if (oliveOil) {
    warehouseService.adjustPhysicalStock(kitchenWh.id, oliveOil.id, 5000, 'رصيد زيت وافر للاختبار');
  }

  // Set flour stock to 200g in kitchen section warehouse (enough for exactly 2 pizza dough balls of 100g each)
  warehouseService.adjustPhysicalStock(
    kitchenWh.id,
    flour.id,
    200,
    'تعديل رصيد لاختبار عنق الزجاجة'
  );

  const nowIso = new Date().toISOString();
  const testPizza: MenuItemProduct = {
    id: 'prod-bottleneck-pizza',
    establishmentId: EST_ID,
    code: 'PZ-BN',
    nameAr: 'بيتزا اختبار عنق الزجاجة',
    nameEn: 'Bottleneck Pizza',
    category: 'البيتزا والمعجنات',
    sellingPrice: 120,
    targetMarginPercentage: 70,
    suggestedPrice: 120,
    trueCost: 12,
    foodCostPercentage: 10,
    grossMarginPercentage: 90,
    directLaborMinutes: 5,
    laborHourlyRate: 15,
    wasteLossBuffer: 0,
    utilitiesCost: 0.5,
    consumablesCost: 0.5,
    prepStation: 'kitchen',
    isActive: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    recipeIngredients: [
      {
        ingredientId: dough.id,
        ingredientNameAr: dough.nameAr,
        ingredientNameEn: dough.nameEn,
        quantity: 1,
        unit: 'كرة عجين',
        unitCost: 6.8,
        totalCost: 6.8,
        type: 'semi_finished',
        portionId: ballPortion.id,
        portionNameAr: ballPortion.nameAr,
      },
    ],
  };

  productRepository.upsertSync(EST_ID, testPizza);

  const availability = productAvailabilityService.resolveRawRequirements(testPizza.id, EST_ID);
  assert.strictEqual(availability.maxPortions, 2, 'With 200g flour, exactly 2 pizzas are possible');
  assert.strictEqual(availability.bottleneckIngredient, flour.nameAr, 'Flour must be identified as the bottleneck');
});

test('12. لغة الواجهة: لا توجد كلمات إنجليزية في التجهيزات والعملة ج.م دائماً', () => {
  const preps = semiFinishedService.getAllPreparations();
  preps.forEach((p) => {
    assert.ok(p.nameAr && p.nameAr.trim().length > 0, `Preparation ${p.id} must have Arabic name`);
    assert.ok(p.category && p.category.trim().length > 0, `Preparation ${p.id} must have Arabic category`);
    p.portions.forEach((port) => {
      assert.ok(port.nameAr && port.nameAr.trim().length > 0, `Portion ${port.id} must have Arabic name`);
    });
  });
});

console.log('🎉 All 12 Package 4 Automated Tests Passed Successfully!');
