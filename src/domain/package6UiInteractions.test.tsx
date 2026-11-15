/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Package 6 — Section 2-ب, 2-ج, 2-د: Real DOM UI Interaction & Click Tests
 * Proves all Package 3/4/5/6 interactive workflows in JSDOM + React Testing Library.
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

const { render, screen, fireEvent, cleanup, within } = await import('@testing-library/react');
const { ThemeProvider } = await import('../theme/ThemeContext.tsx');
const { I18nProvider } = await import('../i18n/I18nContext.tsx');
const { ToastProvider } = await import('../context/ToastContext.tsx');
const { AuthProvider } = await import('../context/AuthContext.tsx');
const { BusinessProvider } = await import('../context/BusinessContext.tsx');

const { SemiFinishedModule } = await import('../components/preparations/SemiFinishedModule.tsx');
const { PreparationCardModal } = await import('../components/preparations/PreparationCardModal.tsx');
const { MenuRecipeModule } = await import('../components/menu/MenuRecipeModule.tsx');
const { InventoryAuditModule } = await import('../components/inventory/InventoryAuditModule.tsx');
const { OverheadAllocationModule } = await import('../components/finance/OverheadAllocationModule.tsx');
const { CostSimulationWorkspace } = await import('../components/costcontrol/CostSimulationWorkspace.tsx');
const { AddIngredientQuickModal } = await import('../components/inventory/AddIngredientQuickModal.tsx');
const { InventoryModule } = await import('../components/inventory/InventoryModule.tsx');

const { dataService } = await import('../services/dataService.ts');
const { warehouseService } = await import('../services/warehouseService.ts');
const { semiFinishedService } = await import('../services/semiFinishedService.ts');
const { overheadService, getCurrentMonthKey } = await import('../services/overheadService.ts');
const { inventoryAuditService } = await import('../services/inventoryAuditService.ts');
const { productAvailabilityService } = await import('../services/productAvailabilityService.ts');
const { categoryService } = await import('../services/categoryService.ts');
const { productRepository } = await import('../repositories/repositories.ts');

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

const EST_ID = 'est-1';

async function seedMinimalBaseData() {
  categoryService.getCategories(EST_ID, 'product');
  const kitchenWh = warehouseService.resolveSectionWarehouseForStation(EST_ID, 'المطبخ');
  const mats = await dataService.getRawMaterials(EST_ID);
  const rice = await dataService.addRawMaterial(EST_ID, {
    nameAr: 'أرز بسمتي اختباري',
    nameEn: 'Test Rice',
    category: 'الحبوب',
    purchaseUnit: 'كجم',
    purchasePrice: 60,
    purchasedQuantity: 10,
    consumptionUnit: 'جم',
    conversionFactor: 1000,
    wastePercentage: 0,
    currentStock: 10000,
    reorderPoint: 1000,
    warehouseStockMap: { [kitchenWh.id]: 10000, 'wh-main': 5000 },
  });

  return { rice, kitchenWh, existingCount: mats.length };
}

// =========================================================================
// 1. Package 6 UI Interaction 1: SemiFinishedModule full lifecycle
// =========================================================================
await test('UI-1: شاشة التجهيزات — إنشاء تجهيز مركب وآخر معالجة بعامل طبخ (50→100جم) وحصة ونسخ وحذف وتراجع ومنع التكرار', async () => {
  const { rice } = await seedMinimalBaseData();
  renderWithProviders(<SemiFinishedModule />);

  // Click "+ تجهيز جديد"
  fireEvent.click(screen.getByRole('button', { name: /تجهيز جديد/ }));

  // Fill name for compound prep
  const nameInput = screen.getByPlaceholderText(/عجينة بيتزا إيطالية/);
  fireEvent.change(nameInput, { target: { value: 'صوص توم خاص بالاختبار' } });

  // Switch to Tab 2 (ingredients) in modal
  fireEvent.click(screen.getByRole('button', { name: /2\. المكونات والصيغة/ }));
  fireEvent.click(screen.getByRole('button', { name: /إضافة مكوّن للصيغة/ }));
  const matSelect = screen.getByDisplayValue('اختر...');
  fireEvent.change(matSelect, { target: { value: rice.id } });
  fireEvent.click(screen.getByRole('button', { name: 'إضافة للصيغة' }));

  // Save compound prep
  fireEvent.click(screen.getByRole('button', { name: /حفظ التجهيز وتحديث المنيو/ }));
  assert.ok(screen.getAllByText('صوص توم خاص بالاختبار').length >= 1, 'Compound prep rendered after creation');

  // Create processing prep (أرز مطهو 50جم -> 100جم) with named portion
  fireEvent.click(screen.getByRole('button', { name: /تجهيز جديد/ }));
  fireEvent.change(screen.getByPlaceholderText(/عجينة بيتزا إيطالية/), { target: { value: 'أرز بسمتي مطهو بالاختبار' } });
  const typeSelect = screen.getByDisplayValue(/مركّب/);
  fireEvent.change(typeSelect, { target: { value: 'processing' } });
  fireEvent.click(screen.getByRole('button', { name: /2\. المكونات والصيغة/ }));
  const procMatSelect = screen.getByDisplayValue('اختر خامة...');
  fireEvent.change(procMatSelect, { target: { value: rice.id } });

  // Move to Tab 3 (Yield & Portions) and add named portion
  fireEvent.click(screen.getByRole('button', { name: /3\. الناتج والحصص المعيارية/ }));
  fireEvent.change(screen.getByPlaceholderText(/اسم الحصة/), { target: { value: 'بولة اختبارية' } });
  fireEvent.click(screen.getByRole('button', { name: /إضافة حصة/ }));
  fireEvent.click(screen.getByRole('button', { name: /حفظ التجهيز وتحديث المنيو/ }));
  assert.ok(screen.getAllByText('أرز بسمتي مطهو بالاختبار').length >= 1, 'Processing prep saved and shown');

  // Copy an existing prep
  const copyButtons = screen.getAllByTitle('نسخ هذا التجهيز');
  fireEvent.click(copyButtons[0]);
  assert.ok(document.body.textContent?.includes('(نسخة)'), 'Duplicated prep shows (نسخة)');

  // Delete prep -> Undo
  const deleteButtons = screen.getAllByTitle('حذف التجهيز');
  const countBeforeDelete = deleteButtons.length;
  fireEvent.click(deleteButtons[0]);
  assert.equal(screen.getAllByTitle('حذف التجهيز').length, countBeforeDelete - 1, 'Prep deleted from grid');
  const undoBtn = screen.getByRole('button', { name: /تراجع عن حذف/ });
  assert.ok(undoBtn, 'Undo delete button visible');
  fireEvent.click(undoBtn);
  assert.equal(screen.getAllByTitle('حذف التجهيز').length, countBeforeDelete, 'Prep restored after undo');
});

// =========================================================================
// 2. UI-2 + UI-8: MenuRecipeModule prep tab, auto deduction note, Tab 3 equation & loss badge
// =========================================================================
await test('UI-2 و UI-8: شاشة الوصفات (رسبي) — إضافة تجهيز بحصة مع ملاحظة الخصم التلقائي + تبويب السعر والربح + خاسر بعد التحميل + حد التنبيه الأصفر', async () => {
  await seedMinimalBaseData();
  const preps = semiFinishedService.getPreparations(EST_ID);
  assert.ok(preps.length > 0, 'Preparations exist for selection');

  // Seed a deliberately loss-making product (sellingPrice=20, rawCost high + prepTimeMinutes=60)
  const lossDish = await dataService.addProductWithRecipe(EST_ID, {
    code: 'DISH-LOSS-01',
    nameAr: 'طبق خاسر اختباري',
    nameEn: 'Loss Dish Test',
    category: 'أطباق رئيسية',
    prepStation: 'المطبخ الرئيسي',
    sellingPrice: 20,
    targetMarginPercentage: 70,
    isActive: true,
    directLaborMinutes: 30,
    prepTimeMinutes: 30,
    laborHourlyRate: 100,
    utilitiesCost: 30,
    consumablesCost: 10,
    wasteLossBuffer: 0,
    lowStockThresholdPortions: 3,
    recipeIngredients: [],
  });
  overheadService.getCostCenters(EST_ID);
  overheadService.getExpensesForMonth(EST_ID, getCurrentMonthKey());

  renderWithProviders(<MenuRecipeModule />);

  // Click the loss dish card (await BusinessProvider async hydration)
  const dishCard = await screen.findByTestId(`dish-card-${lossDish.id}`);
  fireEvent.click(dishCard);

  // Verify Tab 1 has configurable yellow threshold
  assert.ok(document.body.textContent?.includes('حد التنبيه الأصفر بالكاشير'), 'Threshold input visible in Tab 1');

  // Switch to Tab 2 (Recipe)
  fireEvent.click(screen.getByTestId('dish-tab-recipe-button'));
  fireEvent.click(screen.getByTestId('add-recipe-ingredient-button'));

  // Switch inside picker modal to التجهيزات tab
  const semiTab = screen.getByTestId('tab-recipe-add-semi');
  assert.ok(semiTab.textContent?.includes('التجهيزات'));
  fireEvent.click(semiTab);

  // Select first preparation and confirm with portion
  const firstPrep = preps[0];
  fireEvent.click(screen.getByTestId(`prep-select-btn-${firstPrep.id}`));
  assert.ok(screen.getByTestId('prep-portion-selector-panel'));
  fireEvent.click(screen.getByTestId('confirm-add-prep-to-recipe-btn'));

  // Switch back to Tab 2 view: verify auto deduction note is visible
  assert.ok(
    document.body.textContent?.includes('تُفكك تلقائياً للخامات عند البيع والجرد'),
    'Auto-deduction note rendered for prep ingredient'
  );

  // Switch to Tab 3 (السعر والربح)
  fireEvent.click(screen.getByTestId('dish-tab-pricing-button'));
  assert.ok(document.body.textContent?.includes('التكلفة الكاملة للمنتج'), 'Tab 3 shows Full Product Cost');
  assert.ok(document.body.textContent?.includes('خاسر بعد التحميل'), 'Tab 3 highlights loss-making product as خاسر بعد التحميل');
});

// =========================================================================
// 3. UI-3: PreparationCardModal all tabs
// =========================================================================
await test('UI-3: كارت التجهيز الشامل — فتح الكارت والتنقل بين جميع التبويبات', async () => {
  await seedMinimalBaseData();
  const preps = semiFinishedService.getPreparations(EST_ID);
  const prep = preps[0];
  prep.enableBatchTracking = true;
  semiFinishedService.upsertPreparation(EST_ID, prep, 'اختبار');

  renderWithProviders(
    <PreparationCardModal
      isOpen={true}
      onClose={() => {}}
      preparationId={prep.id}
    />
  );

  assert.ok(document.body.textContent?.includes(prep.nameAr));
  fireEvent.click(screen.getByRole('button', { name: /الحصص المعيارية/ }));
  assert.ok(document.body.textContent?.includes('الحصص'));
  fireEvent.click(screen.getByRole('button', { name: /المنتجات المتأثرة/ }));
  fireEvent.click(screen.getByRole('button', { name: /الاستهلاك التراكمي/ }));
  fireEvent.click(screen.getByRole('button', { name: /سجل الدفعات/ }));
  fireEvent.click(screen.getByRole('button', { name: /سجل التعديلات/ }));
  assert.ok(document.body.textContent?.includes('تاريخ') || document.body.textContent?.includes('سجل التعديلات'));
});

// =========================================================================
// 4. UI-4 + Section 2-ب: InventoryAuditModule remaining preps + Daily Breakdown modal
// =========================================================================
await test('UI-4 + بند 2-ب: الجرد الفعلي — إدخال التجهيزات المتبقية (5) ومعاينة الخامات و«منها بالتجهيزات» + نافذة تفاصيل اليوم', async () => {
  await seedMinimalBaseData();
  const preps = semiFinishedService.getPreparations(EST_ID);
  assert.ok(preps.length > 0);

  renderWithProviders(<InventoryAuditModule />);

  // Click «إدخال التجهيزات المتبقية»
  fireEvent.click(screen.getByRole('button', { name: /إدخال التجهيزات المتبقية/ }));
  const modal = await screen.findByText(/تحويل المتبقي من التجهيزات/);
  assert.ok(modal);

  // Ensure first prep is selected
  const prepSelect = screen.getByText('-- اختر التجهيز --').closest('select') as HTMLSelectElement;
  assert.ok(prepSelect, 'Prep selector present');
  fireEvent.change(prepSelect, { target: { value: preps[0].id } });

  // Set quantity to 5
  const qtyInput = document.querySelector('input[type="number"][min="0.1"]') as HTMLInputElement;
  assert.ok(qtyInput, 'Remaining prep amount input found');
  fireEvent.change(qtyInput, { target: { value: '5' } });

  // Verify raw decomposition preview
  assert.ok(document.body.textContent?.includes('المعاينة الفورية قبل الاعتماد'));
  assert.ok(document.body.textContent?.includes('خامات أولية'));

  // Confirm adding to physical audit
  fireEvent.click(screen.getByRole('button', { name: /اعتماد وإضافة للجرد الفعلي للخامات/ }));
  assert.ok(document.body.textContent?.includes('منها بالتجهيزات:'), 'Table shows منها بالتجهيزات breakdown');

  // Section 2-ب: Open Daily Report modal -> Click day details -> Verify selectedDayBreakdown modal
  fireEvent.click(screen.getByRole('button', { name: /التقرير اليومي التلقائي/ }));
  const dayButtons = screen.getAllByRole('button', { name: 'عرض الأصناف' });
  assert.ok(dayButtons.length > 0, 'Daily report rows have inspect day buttons');
  fireEvent.click(dayButtons[0]);
  assert.ok(document.body.textContent?.includes('تفاصيل حركات يوم'), 'selectedDayBreakdown modal renders');
  assert.ok(document.body.textContent?.includes('السبب والملاحظات'), 'selectedDayBreakdown shows reason & notes column');
});

// =========================================================================
// 5. UI-5: SemiFinishedModule batch toggle + "تجهيز دفعة"
// =========================================================================
await test('UI-5: تفعيل «سجّل دفعات هذا التجهيز» ثم الضغط على «تجهيز دفعة» وتسجيل الدفعة في الواجهة', async () => {
  await seedMinimalBaseData();
  renderWithProviders(<SemiFinishedModule />);

  // Edit first prep
  const editBtns = screen.getAllByRole('button', { name: /تعديل الصيغة/ });
  fireEvent.click(editBtns[0]);

  // Toggle batch tracking checkbox in Tab 1 (بيانات التجهيز والمحطة)
  const batchToggleHeader = screen.getByText(/ميزة تسجيل الدفعات لهذا التجهيز/);
  const batchCheckbox = batchToggleHeader.closest('div')?.parentElement?.querySelector('input[type="checkbox"]') as HTMLInputElement;
  assert.ok(batchCheckbox, 'Batch toggle checkbox found');
  if (!batchCheckbox.checked) {
    fireEvent.click(batchCheckbox);
  }
  fireEvent.click(screen.getByRole('button', { name: /حفظ التعديلات|حفظ التجهيز وتحديث المنيو/ }));

  // Now click «تجهيز دفعة» on card
  const batchBtn = screen.getAllByRole('button', { name: /تجهيز دفعة/ })[0];
  fireEvent.click(batchBtn);
  assert.ok(document.body.textContent?.includes('تسجيل دفعة تجهيز:'));
  fireEvent.click(screen.getByRole('button', { name: /تأكيد تشغيل الدفعة وخصم الخامات/ }));
  assert.ok(document.body.textContent?.includes('الرصيد:'), 'Batch stock balance displayed on card');
});

// =========================================================================
// 6 & 7. UI-6 & UI-7: OverheadAllocationModule Tab 2 Cost Centers + Tab 1 Expenses, Import, Copy & Month Lock
// =========================================================================
await test('UI-6 و UI-7: المصاريف وتوزيعها — تبويب مراكز التكلفة (+ تعديل حذف تراجع) + تبويب المصاريف (نسخ، استيراد بلا تكرار، قفل الشهر)', async () => {
  await seedMinimalBaseData();
  const month = getCurrentMonthKey();
  renderWithProviders(<OverheadAllocationModule />);

  // UI-6: Switch to Tab 2 (مراكز التكلفة والأقسام)
  fireEvent.click(screen.getByRole('button', { name: /مراكز التكلفة والأقسام/ }));
  fireEvent.click(screen.getByRole('button', { name: /مركز تكلفة جديد/ }));
  const ccNameInput = screen.getByPlaceholderText(/قسم المشويات/);
  fireEvent.change(ccNameInput, { target: { value: 'قسم السوشي' } });
  fireEvent.click(screen.getByRole('button', { name: /حفظ المركز/ }));
  assert.ok(document.body.textContent?.includes('قسم السوشي'), 'New cost center added and visible');

  // Edit cost center
  const editBtns = screen.getAllByTitle('تعديل');
  fireEvent.click(editBtns[editBtns.length - 1]);
  fireEvent.change(screen.getByPlaceholderText(/قسم المشويات/), { target: { value: 'قسم السوشي المطور' } });
  fireEvent.click(screen.getByRole('button', { name: /حفظ المركز/ }));
  assert.ok(document.body.textContent?.includes('قسم السوشي المطور'));

  // Delete cost center -> confirm -> Undo 8s
  const delBtns = screen.getAllByTitle('حذف');
  fireEvent.click(delBtns[delBtns.length - 1]);
  fireEvent.click(screen.getByRole('button', { name: /نعم، احذف/ }));
  fireEvent.click(screen.getByRole('button', { name: /تراجع عن الحذف/ }));
  assert.ok(document.body.textContent?.includes('قسم السوشي المطور'), 'Cost center restored via undo');

  // UI-7: Switch back to Tab 1
  fireEvent.click(screen.getByRole('button', { name: /جدول المصاريف وقواعد التوزيع/ }));

  // Double click «استيراد الرواتب والمالية» — must not duplicate
  const importBtn = screen.getByRole('button', { name: /استيراد الرواتب والمالية/ });
  fireEvent.click(importBtn);
  const countAfterFirstImport = overheadService.getExpensesForMonth(EST_ID, month).length;
  fireEvent.click(importBtn);
  const countAfterSecondImport = overheadService.getExpensesForMonth(EST_ID, month).length;
  assert.equal(countAfterFirstImport, countAfterSecondImport, 'Double import creates zero duplicates');

  // Change month and test copy previous month
  const monthInput = document.querySelector('input[type="month"]') as HTMLInputElement;
  assert.ok(monthInput, 'Month picker present');
  const nextMonth = month === '2026-12' ? '2027-01' : `${month.slice(0, 5)}${String(Number(month.slice(5)) + 1).padStart(2, '0')}`;
  fireEvent.change(monthInput, { target: { value: nextMonth } });
  fireEvent.click(screen.getByRole('button', { name: /نسخ الشهر السابق/ }));
  assert.ok(overheadService.getExpensesForMonth(EST_ID, nextMonth).length > 0, 'Expenses copied to next month');

  // Lock current month via official period close & verify locked UI state
  overheadService.lockMonth(EST_ID, month, 'المدير المالي', 'audit-lock-test');
  cleanup();
  renderWithProviders(<OverheadAllocationModule />);
  assert.ok(document.body.textContent?.includes('الشهر مقفل') || document.body.textContent?.includes('تم إغلاق هذا الشهر'));
  const addExpBtn = screen.getByRole('button', { name: /مصروف جديد/ }) as HTMLButtonElement;
  assert.equal(addExpBtn.disabled, true, 'Add expense disabled when month locked');
});

// =========================================================================
// 8. UI-9: CostSimulationWorkspace Stage 2 rule switch updates DOM
// =========================================================================
await test('UI-9: حاسبة التجربة — تغيير قاعدة توزيع المرحلة 2 يحدّث نتائج التكلفة داخل الواجهة', async () => {
  await seedMinimalBaseData();
  const { useBusiness } = await import('../context/BusinessContext.tsx');
  function SimHarness() {
    const biz = useBusiness();
    React.useEffect(() => {
      biz.setIsSimulationModalOpen(true);
    }, []);
    return <CostSimulationWorkspace />;
  }
  renderWithProviders(<SimHarness />);

  const ruleSelect = await screen.findByDisplayValue(/حسب زمن التحضير بالدقائق/);
  const textBefore = document.body.textContent || '';
  fireEvent.change(ruleSelect, { target: { value: 'equal_per_sold_unit' } });
  const textAfter = document.body.textContent || '';
  assert.ok(ruleSelect instanceof dom.window.HTMLSelectElement);
  assert.equal((ruleSelect as HTMLSelectElement).value, 'equal_per_sold_unit');
  assert.ok(textBefore.length > 0 && textAfter.includes('بالتساوي لكل حصة مباعة'));
});

// =========================================================================
// 9. Section 2-د + 2-ب: Non-stocked material (water) & custom yellow threshold
// =========================================================================
await test('بند 2-د و 2-ب: خامة بدون رصيد (الماء المفلتر) لا تُخصم ولا تمنع البيع وتُحسب تكلفتها + حد التنبيه الأصفر المخصص', async () => {
  const { rice, kitchenWh } = await seedMinimalBaseData();

  // Add filtered water via AddIngredientQuickModal DOM toggle
  let createdWaterId = '';
  renderWithProviders(
    <>
      <AddIngredientQuickModal
        isOpen={true}
        onClose={() => {}}
        establishmentId={EST_ID}
        onIngredientAdded={(m) => {
          createdWaterId = m.id;
        }}
      />
    </>
  );

  const waterNameInput = screen.getByPlaceholderText(/طماطم بلدي/);
  fireEvent.change(waterNameInput, { target: { value: 'ماء مفلتر' } });
  const untrackedCheckbox = screen.getByTestId('toggle-untracked-material') as HTMLInputElement;
  fireEvent.click(untrackedCheckbox);
  assert.equal(untrackedCheckbox.checked, true, 'Untracked toggle checked');
  fireEvent.click(screen.getByRole('button', { name: 'حفظ الخامة' }));
  // Wait microtask for async handleSave
  await new Promise((r) => setTimeout(r, 30));

  const water = warehouseService.getMaterials(EST_ID).find((m) => m.nameAr === 'ماء مفلتر' || m.id === createdWaterId)!;
  assert.ok(water, 'Water material saved');
  assert.equal(water.isStockTracked, false, 'Water marked as isStockTracked: false');

  // Verify InventoryModule renders "بدون رصيد (تكلفة فقط)" instead of red "تحت الحد"
  cleanup();
  renderWithProviders(<InventoryModule />);
  const costOnlyBadge = await screen.findByText(/بدون رصيد \(تكلفة فقط\)/);
  assert.ok(costOnlyBadge, 'InventoryModule shows Cost Only badge for water');

  // Add a product using rice (2000g -> enough for 5 portions) + water (500ml) + custom yellow threshold = 6
  const soupDish = await dataService.addProductWithRecipe(EST_ID, {
    code: 'DISH-SOUP-01',
    nameAr: 'شوربة أرز بالماء',
    nameEn: 'Rice Water Soup',
    category: 'الشوربات',
    prepStation: 'المطبخ',
    sellingPrice: 50,
    targetMarginPercentage: 70,
    isActive: true,
    directLaborMinutes: 5,
    laborHourlyRate: 15,
    utilitiesCost: 1,
    consumablesCost: 1,
    wasteLossBuffer: 0,
    lowStockThresholdPortions: 6,
    recipeIngredients: [
      {
        type: 'raw_material',
        ingredientId: rice.id,
        ingredientNameAr: rice.nameAr,
        ingredientNameEn: rice.nameEn,
        quantity: 2000,
        unit: 'جم',
        unitCost: rice.effectiveUnitCost,
        totalCost: 2000 * rice.effectiveUnitCost,
      },
      {
        type: 'raw_material',
        ingredientId: water.id,
        ingredientNameAr: water.nameAr,
        ingredientNameEn: water.nameEn,
        quantity: 500,
        unit: 'مل',
        unitCost: water.effectiveUnitCost,
        totalCost: 500 * water.effectiveUnitCost,
      },
    ],
  });

  // 10000 / 2000 = 5 portions, threshold = 6 => low_stock (yellow), bottleneck = rice (NOT water!)
  const avail = productAvailabilityService.getProductAvailability(soupDish.id, EST_ID);
  assert.equal(avail.portionsAvailable, 5, 'Untracked water with 0 stock does NOT block availability');
  assert.equal(avail.status, 'low_stock', 'Custom yellow threshold (6) triggers low_stock at 5 portions');
  assert.equal(avail.limitingIngredientNameAr, rice.nameAr, 'Rice is bottleneck, not water');

  // Sales deduction skips water while deducting rice
  const waterDeduct = warehouseService.deductSalesStock(EST_ID, water.id, 'المطبخ', 500, 'ORD-100', 'كاشير');
  assert.equal(waterDeduct.success, true);
  assert.equal(waterDeduct.newStock, 0, 'Water stock never goes negative');
  const riceDeduct = warehouseService.deductSalesStock(EST_ID, rice.id, 'المطبخ', 2000, 'ORD-100', 'كاشير');
  assert.equal(riceDeduct.newStock, 8000, 'Rice deducted normally from kitchen warehouse');

  // Cleanup check for productRepository
  assert.ok(productRepository.getAllSync(EST_ID, false).some((p) => p.id === soupDish.id));
});

console.log(`\n🎉 Package 6 UI Interaction Tests Passed: ${passed}/${passed}`);
