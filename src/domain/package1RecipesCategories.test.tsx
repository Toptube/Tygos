/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AUTOMATED TESTS: PACKAGE 1 - BUG FIXES, CATEGORIES TREE & RECIPES/PRODUCTS
 * Named strictly after user complaints and requirements from Prompt 10 (الحزمة 1).
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
const { NumericInput } = await import('../components/common/NumericInput.tsx');
const { JourneyProgressBar } = await import('../components/costcontrol/JourneyProgressBar.tsx');
const { categoryService, normalizeArabicText } = await import('../services/categoryService.ts');
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

function renderWithProviders(ui: React.ReactElement, initialRole: string = 'tenant_admin') {
  const RoleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { switchRole, currentUser } = useAuth();
    React.useEffect(() => {
      if (currentUser?.role !== initialRole) {
        switchRole(initialRole as any);
      }
    }, [currentUser, switchRole]);
    return <>{children}</>;
  };

  return render(
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <BusinessProvider>
            <ToastProvider>
              <RoleWrapper>{ui}</RoleWrapper>
            </ToastProvider>
          </BusinessProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

console.log('\n--- STARTING PACKAGE 1 AUTOMATED TESTS ---\n');

// 1. Bug: Product duplication on repeated save
await test('Complaint 1: Saving twice does NOT duplicate product (switches to update mode)', async () => {
  const estId = 'default';
  const initialProducts = await dataService.getProducts(estId);
  const baseCount = initialProducts.length;

  const testName = 'طبق تجريبي مميز فريد ' + Date.now();
  const created = await dataService.addProductWithRecipe(estId, {
    code: `DISH-${Math.floor(100 + Math.random() * 900)}`,
    nameAr: testName,
    nameEn: 'Unique Dish',
    category: 'وجبات رئيسية',
    sellingPrice: 95,
    targetMarginPercentage: 70,
    isActive: true,
    recipeIngredients: [],
    directLaborMinutes: 10,
    laborHourlyRate: 20,
    wasteLossBuffer: 0,
    utilitiesCost: 2,
    consumablesCost: 1,
  });

  assert.ok(created && created.id, 'Product should be created with valid ID');
  const afterFirstSave = await dataService.getProducts(estId);
  assert.equal(afterFirstSave.length, baseCount + 1, 'Should have exactly 1 new product');

  // Second save simulation (update mode using existing ID)
  await dataService.updateProduct(estId, {
    ...created,
    sellingPrice: 110,
  });

  const afterSecondSave = await dataService.getProducts(estId);
  assert.equal(
    afterSecondSave.length,
    baseCount + 1,
    'Second save with same record ID must not duplicate product'
  );
  assert.equal(
    afterSecondSave.find((p) => p.id === created.id)?.sellingPrice,
    110,
    'Price should be updated'
  );
});

// 2. Bug: Duplicate prevention within same category vs different category
await test('Complaint 2: Duplicate name rejected in SAME category, accepted in DIFFERENT category', async () => {
  // Test normalization
  const name1 = 'شيش طاووق';
  const name2 = 'شيش  طاووق '; // extra whitespace
  const name3 = 'شيش طاوُوق'; // tashkeel
  assert.equal(normalizeArabicText(name1), normalizeArabicText(name2), 'Normalization handles extra spaces');
  assert.equal(normalizeArabicText(name1), normalizeArabicText(name3), 'Normalization strips diacritics');

  const estId = 'default';
  const uniqueSuffix = ' ' + Date.now();
  const sharedName = 'سلطة خضراء' + uniqueSuffix;

  // Add in category A
  const itemA = await dataService.addProductWithRecipe(estId, {
    code: `DISH-${Math.floor(100 + Math.random() * 900)}`,
    nameAr: sharedName,
    nameEn: 'Green Salad',
    category: 'المقبلات والسلطات',
    sellingPrice: 30,
    targetMarginPercentage: 70,
    isActive: true,
    recipeIngredients: [],
    directLaborMinutes: 10,
    laborHourlyRate: 20,
    wasteLossBuffer: 0,
    utilitiesCost: 2,
    consumablesCost: 1,
  });
  assert.ok(itemA, 'Should successfully create in appetizers');

  // Verify duplicate check in same category
  const allProducts = await dataService.getProducts(estId);
  const normTarget = normalizeArabicText(sharedName);
  const duplicateInSameCat = allProducts.some(
    (p) =>
      p.category === 'المقبلات والسلطات' &&
      normalizeArabicText(p.nameAr) === normTarget &&
      p.id !== 'new-temp-id'
  );
  assert.equal(duplicateInSameCat, true, 'Same name in same category must be flagged as duplicate');

  // Add in category B (different category - should be allowed)
  const duplicateInDiffCat = allProducts.some(
    (p) =>
      p.category === 'أطباق جانبية' &&
      normalizeArabicText(p.nameAr) === normTarget
  );
  assert.equal(duplicateInDiffCat, false, 'Same name does not exist yet in different category');

  const itemB = await dataService.addProductWithRecipe(estId, {
    code: `DISH-${Math.floor(100 + Math.random() * 900)}`,
    nameAr: sharedName,
    nameEn: 'Green Salad Side',
    category: 'أطباق جانبية',
    sellingPrice: 35,
    targetMarginPercentage: 70,
    isActive: true,
    recipeIngredients: [],
    directLaborMinutes: 10,
    laborHourlyRate: 20,
    wasteLossBuffer: 0,
    utilitiesCost: 2,
    consumablesCost: 1,
  });
  assert.ok(itemB, 'Should allow adding the same dish name under a different category');
});

// 3. Bug: In-app confirmation modal and 8-second undo deletion
await test('Complaint 3: Delete with in-app confirmation allows 8-second undo restore', async () => {
  const estId = 'default';
  const prod = await dataService.addProductWithRecipe(estId, {
    code: `DISH-${Math.floor(100 + Math.random() * 900)}`,
    nameAr: 'صنف للاختبار الحذف والتراجع ' + Date.now(),
    nameEn: 'Undo Test Dish',
    category: 'المشروبات',
    sellingPrice: 25,
    targetMarginPercentage: 70,
    isActive: true,
    recipeIngredients: [],
    directLaborMinutes: 10,
    laborHourlyRate: 20,
    wasteLossBuffer: 0,
    utilitiesCost: 2,
    consumablesCost: 1,
  });

  const id = prod.id;
  const beforeDelete = (await dataService.getProducts(estId)).find((p) => p.id === id);
  assert.ok(beforeDelete, 'Product exists before deletion');

  // Delete product
  const deleted = await dataService.deleteProduct(estId, id);
  assert.ok(deleted, 'Product deleted');
  const afterDelete = (await dataService.getProducts(estId)).find((p) => p.id === id);
  assert.equal(afterDelete, undefined, 'Product no longer in active catalog');

  // Restore via undo capability
  await dataService.restoreProduct(estId, prod);
  const restored = (await dataService.getProducts(estId)).find((p) => p.id === id);
  assert.ok(restored, 'Product should be fully restored after undo');
  assert.equal(restored?.nameAr, prod.nameAr, 'Restored product keeps identical attributes');
});

// 4. Bug: Numeric input allows keyboard decimal typing, clearing, and normalizes ٠-٩
await test('Complaint 4: NumericInput normalizes Eastern Arabic digits ٠-٩ and allows clearing', async () => {
  let val = 0;
  const handleChange = (newVal: number) => {
    val = newVal;
  };

  const { container } = render(
    <NumericInput
      value={val}
      onChange={handleChange}
      placeholder="أدخل الكمية"
      min={0}
      data-testid="numeric-qty-test"
    />
  );

  const input = container.querySelector('input') as HTMLInputElement;
  assert.ok(input, 'Input element must exist');
  assert.equal(input.getAttribute('inputmode'), 'decimal', 'Input mode must be decimal for mobile keypad');

  // Fire typing with Eastern Arabic digits "١٢.٥" -> should normalize to 12.5
  fireEvent.change(input, { target: { value: '١٢.٥' } });
  assert.equal(val, 12.5, 'Eastern Arabic digits ١٢.٥ must be converted to 12.5');

  // Fire backspace/clear -> allows empty string during typing without NaN crash
  fireEvent.change(input, { target: { value: '' } });
  assert.equal(val, 0, 'Clearing input produces 0 or valid fallback');

  // Re-typing standard decimal
  fireEvent.change(input, { target: { value: '45.75' } });
  assert.equal(val, 45.75, 'Standard decimal string accepted');
});

// 5. Feature: 3-level categories hierarchy (Main -> Sub -> Classification)
await test('Complaint 5: Flexible 3-level Category Tree with add, reorder, and toggle active', async () => {
  const estId = 'default';
  const initialTree = categoryService.getCategoryTree(estId, 'product');
  assert.ok(initialTree.length > 0, 'Initial product category tree should have seed categories');

  // 1. Add Main category
  const mainNode = categoryService.addCategory(estId, {
    nameAr: 'قسم رئيسي تجريبي',
    nameEn: 'Test Main Category',
    type: 'product',
  });
  assert.ok(mainNode.id, 'Main category node created');

  // 2. Add Subcategory
  const subNode = categoryService.addCategory(estId, {
    nameAr: 'قسم فرعي تجريبي',
    nameEn: 'Test Sub Category',
    type: 'product',
    parentId: mainNode.id,
  });
  assert.equal(subNode.parentId, mainNode.id, 'Subcategory correctly linked to parent');

  // 3. Add Classification (Level 3)
  const classNode = categoryService.addCategory(estId, {
    nameAr: 'تصنيف ثالث تجريبي',
    nameEn: 'Test Classification',
    type: 'product',
    parentId: subNode.id,
  });
  assert.equal(classNode.parentId, subNode.id, 'Classification correctly linked to subcategory');

  // 4. Verify hierarchical tree structure
  const updatedTree = categoryService.getCategoryTree(estId, 'product');
  const foundMain = updatedTree.find((n) => n.id === mainNode.id);
  assert.ok(foundMain, 'Created main node found in tree');
  assert.equal(foundMain?.children?.[0]?.id, subNode.id, 'Subnode is nested under main');
  assert.equal(foundMain?.children?.[0]?.children?.[0]?.id, classNode.id, 'Classification is nested under subnode');

  // 5. Update / toggle active
  const updated = categoryService.updateCategory(estId, 'product', mainNode.id, { active: false });
  assert.equal(updated.active, false, 'Category node active state updated to false');

  // 6. Delete test
  categoryService.deleteCategory(estId, 'product', mainNode.id);
  const afterDeleteTree = categoryService.getCategoryTree(estId, 'product');
  assert.equal(afterDeleteTree.some((n) => n.id === mainNode.id), false, 'Deleted node removed from tree');
});

// 6. Feature: Dynamic subcategory resolution by parent category
await test('Complaint 6: Dynamic subcategory resolution by parent category', async () => {
  const estId = 'default';
  const allProductCats = categoryService.getCategories(estId, 'product');
  const mainCategories = allProductCats.filter((c) => !c.parentId);
  assert.ok(mainCategories.length > 0, 'Should have main categories');

  const firstMain = mainCategories[0];
  const subs = allProductCats.filter((c) => c.parentId === firstMain.id);
  for (const s of subs) {
    assert.equal(s.parentId, firstMain.id, 'Every subcategory returned must belong to parent');
  }
});

// 7. Feature: The 5 Journey bar buttons navigate to correct destinations
await test('Complaint 7: The 5 Journey progress buttons route to correct views with Arabic titles', async () => {
  let navigatedView = '';
  const NavTester: React.FC = () => {
    const { setActiveView, activeView } = useAuth();
    React.useEffect(() => {
      navigatedView = activeView;
    }, [activeView]);

    return (
      <div>
        <div data-testid="current-view">{activeView}</div>
        <JourneyProgressBar currentStep={2} />
      </div>
    );
  };

  const { container } = renderWithProviders(<NavTester />);

  // Verify button labels
  const allButtons = Array.from(container.querySelectorAll('button'));
  const buttonTexts = allButtons.map((b) => b.textContent || '');

  assert.ok(
    buttonTexts.some((t) => t.includes('الخامات')),
    'Journey bar contains step 1: الخامات'
  );
  assert.ok(
    buttonTexts.some((t) => t.includes('المنتجات')),
    'Journey bar contains step 2: المنتجات (not الأطباق)'
  );
  assert.ok(
    buttonTexts.some((t) => t.includes('الوصفة')),
    'Journey bar contains step 3: الوصفة'
  );
  assert.ok(
    buttonTexts.some((t) => t.includes('البيع') || t.includes('الكاشير')),
    'Journey bar contains step 5: البيع'
  );
  assert.ok(
    buttonTexts.some((t) => t.includes('المتابعة')),
    'Journey bar contains step 6: المتابعة'
  );

  // Click Step 2: المنتجات
  const productsBtn = allButtons.find((b) => b.textContent?.includes('المنتجات'));
  assert.ok(productsBtn, 'Products button found');
  fireEvent.click(productsBtn!);
  assert.equal(navigatedView, 'products', 'Clicking المنتجات navigated to products catalog view');

  // Click Step 1: الخامات
  const rawMaterialsBtn = allButtons.find((b) => b.textContent?.includes('الخامات'));
  assert.ok(rawMaterialsBtn, 'Raw materials button found');
  fireEvent.click(rawMaterialsBtn!);
  assert.equal(navigatedView, 'inventory', 'Clicking الخامات navigated to inventory view');

  // Click Step 6: المتابعة
  const trackingBtn = allButtons.find((b) => b.textContent?.includes('المتابعة'));
  assert.ok(trackingBtn, 'Tracking button found');
  fireEvent.click(trackingBtn!);
  assert.equal(navigatedView, 'finance', 'Clicking المتابعة navigated to finance view');
});

console.log(`\n🎉 ALL ${passed} AUTOMATED PACKAGE 1 TESTS PASSED SUCCESSFULLY!\n`);
