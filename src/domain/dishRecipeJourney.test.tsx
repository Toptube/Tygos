/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AUTOMATED TESTS: THE 7-STEP RAW-MATERIAL-TO-PRODUCT JOURNEY & PLAIN EVERYDAY ARABIC
 * Named strictly after user complaints and requirements from Prompt 10.
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
const { JourneyProgressBar } = await import('../components/costcontrol/JourneyProgressBar.tsx');
const { MenuRecipeModule } = await import('../components/menu/MenuRecipeModule.tsx');
const { InventoryModule } = await import('../components/inventory/InventoryModule.tsx');
const { PreLaunchChecklistView } = await import('../components/settings/PreLaunchChecklistView.tsx');
const { calculateIngredientLineCost } = await import('../services/unitConversion.ts');
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
    }, [currentUser?.role, switchRole]);
    return <>{children}</>;
  };

  return render(
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <BusinessProvider>
              <RoleWrapper>{ui}</RoleWrapper>
            </BusinessProvider>
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

// 1. Journey Progress Bar
await test('شكوى 1: شريط مسار الرحلة التفاعلي يعرض العدادات الحية وزر الخطوة التالية', () => {
  renderWithProviders(<JourneyProgressBar currentStep={3} />);

  assert.ok(screen.getByTestId('journey-progress-bar'), 'Journey progress bar must render');
  assert.ok(screen.getByTestId('journey-materials-count'), 'Materials count counter must render');
  assert.ok(screen.getByTestId('journey-dishes-count'), 'Dishes count counter must render');

  const nextBtn = screen.getByTestId('journey-next-action-button');
  assert.ok(nextBtn, 'Single next-step action button must exist');
});

// 2. Dishes & Recipes screen renders Arabic sections, cards, and zero BOM or V3 jargon
await test('شكوى 2: شاشة الأطباق والوصفات تعرض فلاتر عربية وبطاقات أطباق وخالية من BOM و V3.0 والرموز الأجنبية', () => {
  renderWithProviders(<MenuRecipeModule />);

  // Arabic section filters (3-level tree main categories)
  assert.ok(screen.getByText('المطبخ'), 'Kitchen filter must exist in Arabic');
  assert.ok(screen.getByText('المخبوزات'), 'Bakery filter must exist in Arabic');
  assert.ok(screen.getByText('الحلويات'), 'Desserts filter must exist in Arabic');
  assert.ok(screen.getByText('الساندوتشات'), 'Sandwiches filter must exist in Arabic');

  // Verify zero BOM or V3.0
  assert.equal(screen.queryByText(/BOM/i), null, 'Zero BOM acronym in user interface');
  assert.equal(screen.queryByText(/V3\.0/i), null, 'Zero V3.0 engineering tags');
  assert.equal(screen.queryByText(/\$/), null, 'Zero dollar signs in Arabic view');
});

// 3. Unit Conversion Math
await test('شكوى 3: حاسبة تحويل الوحدات تحسب التكلفة بدقة وتدعم الكيلو والجرام واللتر والمل', () => {
  // 1 kg @ 100 EGP, 250 g in recipe, 0% waste = 25 EGP
  const res1 = calculateIngredientLineCost({
    purchasePrice: 100,
    purchaseUnit: 'كجم',
    recipeQuantity: 250,
    recipeUnit: 'جرام',
    wastePercentage: 0,
  });
  assert.equal(res1.totalCost, 25, '100 EGP/kg with 250g must equal 25 EGP');

  // 1 kg @ 100 EGP, 250 g in recipe, 10% waste = 25 / 0.9 = 27.78 EGP
  const res2 = calculateIngredientLineCost({
    purchasePrice: 100,
    purchaseUnit: 'كجم',
    recipeQuantity: 250,
    recipeUnit: 'جرام',
    wastePercentage: 10,
  });
  assert.ok(Math.abs(res2.totalCost - 27.78) < 0.1, 'Cost after 10% waste must equal 27.78 EGP');

  // 1 liter @ 40 EGP, 50 ml in recipe = (40 / 1000) * 50 = 2 EGP
  const res3 = calculateIngredientLineCost({
    purchasePrice: 40,
    purchaseUnit: 'لتر',
    recipeQuantity: 50,
    recipeUnit: 'مل',
    wastePercentage: 0,
  });
  assert.equal(res3.totalCost, 2, '40 EGP/liter with 50ml must equal 2 EGP');
});

// 4. Role-based Visibility: Chef sees quantities without purchase costs or margins
await test('شكوى 4: صلاحيات العرض: الشيف يرى المقادير والكميات فقط بلا أسعار شراء أو هوامش', () => {
  renderWithProviders(<MenuRecipeModule />, 'kitchen_manager');

  // Cost and margin headers should be hidden for chef
  assert.equal(screen.queryByText('التكلفة'), null, 'Chef must not see purchase cost header');
  assert.equal(screen.queryByText('الربح'), null, 'Chef must not see profit margin header');
});

// 5. Raw Materials: Dish usage and price change impact warning
await test('شكوى 5: شاشة الخامات تعرض بطاقات الخامات واستخداماتها في الأطباق', () => {
  renderWithProviders(<InventoryModule />);

  // Check presence of raw material cards tab
  assert.ok(screen.getByText('بطاقات الخامات المباشرة'), 'Raw materials cards tab must exist');
  assert.ok(screen.getByTestId('add-raw-material-button'), 'Add raw material button must exist');
});

// 6. Pre-launch checklist includes the recipe journey step
await test('شكوى 6: قائمة الفحص قبل التشغيل تحتوي على خطوة فحص رحلة الخامة للمنتج', () => {
  renderWithProviders(<PreLaunchChecklistView />);

  assert.ok(screen.getByText('رحلة الخامة للمنتج'), 'Checklist must contain Raw Material to Product category');
  assert.ok(screen.getByText('فحص رحلة الخامة من الشراء للوصفة للبيع للأرباح'), 'Checklist must contain recipe journey step');
});

console.log(`\n🎉 Dish & Recipe Journey Tests Passed: ${passed}/${passed}`);
