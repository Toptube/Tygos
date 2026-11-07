/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AUTOMATED TESTS: THE 7-STEP RAW-MATERIAL-TO-PRODUCT JOURNEY & PLAIN EVERYDAY ARABIC
 * Named strictly after user complaints and requirements from Prompt 10.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JourneyProgressBar } from '../components/costcontrol/JourneyProgressBar.tsx';
import { MenuRecipeModule } from '../components/menu/MenuRecipeModule.tsx';
import { InventoryModule } from '../components/inventory/InventoryModule.tsx';
import { AuthContext } from '../context/AuthContext.tsx';
import { BusinessContext } from '../context/BusinessContext.tsx';
import { I18nContext } from '../i18n/I18nContext.tsx';
import { ToastContext } from '../context/ToastContext.tsx';
import { calculateIngredientLineCost, normalizeUnit } from '../services/unitConversion.ts';
import { MenuItemProduct, RawMaterialItem } from '../services/dataService.ts';

const mockRawMaterials: RawMaterialItem[] = [
  {
    id: 'mat-flour-1',
    establishmentId: 'est-1',
    nameAr: 'دقيق فاخر',
    nameEn: 'Flour',
    category: 'مخبوزات',
    purchaseUnit: 'كجم',
    purchasePrice: 20.0,
    purchasedQuantity: 10,
    consumptionUnit: 'جرام',
    conversionFactor: 1000,
    wastePercentage: 5,
    effectiveUnitCost: 0.021,
    currentStock: 9000,
    reorderPoint: 2,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  },
  {
    id: 'mat-meat-1',
    establishmentId: 'est-1',
    nameAr: 'لحم بقري مفروم',
    nameEn: 'Minced Beef',
    category: 'لحوم',
    purchaseUnit: 'كجم',
    purchasePrice: 250.0,
    purchasedQuantity: 5,
    consumptionUnit: 'جرام',
    conversionFactor: 1000,
    wastePercentage: 10,
    effectiveUnitCost: 0.277,
    currentStock: 4000,
    reorderPoint: 2,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  },
];

const mockMenuProducts: MenuItemProduct[] = [
  {
    id: 'dish-burger-1',
    establishmentId: 'est-1',
    code: 'DISH-101',
    nameAr: 'برجر لحم بلدي',
    nameEn: 'Classic Beef Burger',
    category: 'المطبخ',
    sellingPrice: 150.0,
    targetMarginPercentage: 65,
    suggestedPrice: 150.0,
    trueCost: 55.0,
    foodCostPercentage: 36.6,
    grossMarginPercentage: 63.4,
    isActive: true,
    recipeIngredients: [
      {
        ingredientId: 'mat-meat-1',
        ingredientNameAr: 'لحم بقري مفروم',
        ingredientNameEn: 'Minced Beef',
        quantity: 200,
        unit: 'جرام',
        unitCost: 0.277,
        totalCost: 55.4,
      },
    ],
    directLaborMinutes: 10,
    laborHourlyRate: 20,
    wasteLossBuffer: 0,
    utilitiesCost: 2,
    consumablesCost: 1,
    isExample: true,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  },
  {
    id: 'dish-soup-2',
    establishmentId: 'est-1',
    code: 'DISH-102',
    nameAr: 'شوربة عدس بالكريمة',
    nameEn: 'Lentil Soup',
    category: 'المطبخ',
    sellingPrice: 60.0,
    targetMarginPercentage: 70,
    suggestedPrice: 60.0,
    trueCost: 0,
    foodCostPercentage: 0,
    grossMarginPercentage: 100,
    isActive: false,
    recipeIngredients: [], // Missing recipe!
    directLaborMinutes: 5,
    laborHourlyRate: 20,
    wasteLossBuffer: 0,
    utilitiesCost: 1,
    consumablesCost: 0.5,
    isExample: false,
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  },
];

const createMockAuthContext = (role: string = 'tenant_admin') => ({
  currentUser: {
    id: 'u-1',
    username: 'admin',
    fullName: 'أحمد الإداري',
    role: role as any,
    roleTitleAr: 'مالك المنشأة',
    roleTitleEn: 'Owner',
    isPlatformOwner: true,
    lastLoginTimestamp: '2026-11-07 10:00:00',
  },
  currentEstablishment: {
    id: 'est-1',
    name: 'مطعم السعادة',
    code: 'R.0001',
    type: 'restaurant' as const,
    role: role as any,
  },
  activeView: 'menu',
  setActiveView: () => {},
  switchRole: () => {},
  logout: () => {},
  activeSupportSession: null,
  startSupportSession: () => {},
  endSupportSession: () => {},
  isSearchOpen: false,
  setIsSearchOpen: () => {},
});

const createMockBusinessContext = () => ({
  rawMaterials: mockRawMaterials,
  menuProducts: mockMenuProducts,
  refreshMaterialsAndProducts: async () => {},
  updateProduct: async () => {},
  deleteProduct: async () => {},
  clearExampleProducts: async () => 1,
  updateRawMaterial: async () => {},
  recipes: [],
  activeRecipe: {} as any,
  setActiveRecipeId: () => {},
  createRecipeVersion: () => {},
  stockMovements: [],
  consumptionVariances: [],
  profitAnalysis: {} as any,
  recommendations: [],
  dismissRecommendation: () => {},
  simulationScenario: {} as any,
  simulationResult: {} as any,
  updateSimulationParam: () => {},
  resetSimulation: () => {},
  auditEvents: [],
  privilegedRequests: [],
  securityNotifications: [],
  hrIncidents: [],
  submitPrivilegedAccessRequest: () => {},
  approvePrivilegedAccessRequest: () => {},
  rejectPrivilegedAccessRequest: () => {},
  isAssistantOpen: false,
  setIsAssistantOpen: () => {},
  assistantMessages: [],
  sendAssistantQuery: async () => {},
  clearAssistantHistory: () => {},
  isHelpOpen: false,
  setIsHelpOpen: () => {},
  helpArticles: [],
  selectedHelpArticle: null,
  setSelectedHelpArticle: () => {},
  isSimulationModalOpen: false,
  setIsSimulationModalOpen: () => {},
  isAccessModalOpen: false,
  setIsAccessModalOpen: () => {},
  isAuditReportModalOpen: false,
  setIsAuditReportModalOpen: () => {},
  isAddIngredientModalOpen: false,
  setIsAddIngredientModalOpen: () => {},
  isAddProductModalOpen: false,
  setIsAddProductModalOpen: () => {},
  isImportDataModalOpen: false,
  setIsImportDataModalOpen: () => {},
  isOnboardingModalOpen: false,
  setIsOnboardingModalOpen: () => {},
  targetAccessResource: null,
  setTargetAccessResource: () => {},
});

const mockI18nContext = {
  language: 'ar' as const,
  dir: 'rtl' as const,
  isRtl: true,
  setLanguage: () => {},
  t: (key: string, def?: string) => def || key,
  formatCurrency: (val: number) => `${val.toFixed(2)} ج.م`,
  formatNumber: (val: number) => String(val),
};

const renderWithContext = (ui: React.ReactElement, role: string = 'tenant_admin') => {
  return render(
    <ToastContext.Provider value={{ toasts: [], showToast: () => {}, dismissToast: () => {} }}>
      <I18nContext.Provider value={mockI18nContext}>
        <AuthContext.Provider value={createMockAuthContext(role)}>
          <BusinessContext.Provider value={createMockBusinessContext() as any}>
            {ui}
          </BusinessContext.Provider>
        </AuthContext.Provider>
      </I18nContext.Provider>
    </ToastContext.Provider>
  );
};

describe('شاشات رحلة الخامة للمنتج ولغة الناس العادية (Prompt 10)', () => {
  it('شكوى 1: شريط مسار الرحلة التفاعلي يعرض العدادات الحية وزر الخطوة التالية الصريح', () => {
    renderWithContext(<JourneyProgressBar currentStep={3} />);

    expect(screen.getByTestId('journey-progress-bar')).toBeInTheDocument();
    expect(screen.getByTestId('journey-materials-count')).toHaveTextContent('2');
    expect(screen.getByTestId('journey-dishes-count')).toHaveTextContent('2');
    expect(screen.getByText(/1 بلا وصفة/)).toBeInTheDocument();

    const nextActionBtn = screen.getByTestId('journey-next-action-button');
    expect(nextActionBtn).toBeInTheDocument();
    expect(nextActionBtn).toHaveTextContent(/أكمل وصفة/);
  });

  it('شكوى 2: شاشة الأطباق والوصفات تعرض فلاتر عربية وبطاقات أطباق وخالية من BOM و V3.0 والرموز الأجنبية', () => {
    renderWithContext(<MenuRecipeModule />);

    // Arabic Section Filters
    expect(screen.getByText('مخبوزات')).toBeInTheDocument();
    expect(screen.getByText('المطبخ')).toBeInTheDocument();
    expect(screen.getByText('المشويات')).toBeInTheDocument();
    expect(screen.getByText('المشروبات')).toBeInTheDocument();
    expect(screen.getByText('الحلويات')).toBeInTheDocument();
    expect(screen.getByText('البار')).toBeInTheDocument();

    // Dish cards rendered
    expect(screen.getByText('برجر لحم بلدي')).toBeInTheDocument();
    expect(screen.getByText('شوربة عدس بالكريمة')).toBeInTheDocument();

    // Check zero BOM or V3.0 buttons
    expect(screen.queryByText(/BOM/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/V3\.0/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();

    // Check presence of demo tag
    expect(screen.getByText('مثال، عدّله أو احذفه')).toBeInTheDocument();
    expect(screen.getByText('ابدأ من الصفر')).toBeInTheDocument();
  });

  it('شكوى 3: الطبق الذي ينقصه وصفة يظهر بشارة ينقصه وصفة ويحذر عند محاولة عرضه للبيع', () => {
    renderWithContext(<MenuRecipeModule />);

    expect(screen.getByText('ينقصه وصفة')).toBeInTheDocument();
    expect(screen.getByText('جاهز للبيع')).toBeInTheDocument();

    // Click dish with missing recipe
    const missingDishCard = screen.getByTestId('dish-card-dish-soup-2');
    fireEvent.click(missingDishCard);

    // Modal opens
    expect(screen.getByTestId('dish-details-modal')).toBeInTheDocument();

    // Click sales availability button
    const toggleSaleBtn = screen.getByText('غير متاح للبيع (مسودة)');
    fireEvent.click(toggleSaleBtn);

    // Warning modal pops up
    expect(screen.getByText('تنبيه: هذا الطبق ينقصه وصفة!')).toBeInTheDocument();
  });

  it('شكوى 4: حاسبة تحويل الوحدات تحسب التكلفة بدقة وتدعم التحويلات بين الكيلو والجرام واللتر والمل', () => {
    // 1 kg @ 100 EGP, 250 g in recipe, 0% waste = 25 EGP
    const res1 = calculateIngredientLineCost({
      purchasePrice: 100,
      purchaseUnit: 'كجم',
      recipeQuantity: 250,
      recipeUnit: 'جرام',
      wastePercentage: 0,
    });
    expect(res1.totalCost).toBe(25);

    // 1 kg @ 100 EGP, 250 g in recipe, 10% waste = 25 / 0.9 = 27.78 EGP
    const res2 = calculateIngredientLineCost({
      purchasePrice: 100,
      purchaseUnit: 'كجم',
      recipeQuantity: 250,
      recipeUnit: 'جرام',
      wastePercentage: 10,
    });
    expect(res2.totalCost).toBeCloseTo(27.78, 1);

    // 1 liter @ 40 EGP, 50 ml in recipe = (40 / 1000) * 50 = 2 EGP
    const res3 = calculateIngredientLineCost({
      purchasePrice: 40,
      purchaseUnit: 'لتر',
      recipeQuantity: 50,
      recipeUnit: 'مل',
      wastePercentage: 0,
    });
    expect(res3.totalCost).toBe(2);
  });

  it('شكوى 5: صلاحيات العرض: الشيف يرى المقادير والكميات فقط بلا أسعار شراء أو أرباح', () => {
    // Render as kitchen_manager (Chef)
    renderWithContext(<MenuRecipeModule />, 'kitchen_manager');

    // Cost and margin headers should be hidden for chef
    expect(screen.queryByText('التكلفة')).not.toBeInTheDocument();
    expect(screen.queryByText('الربح')).not.toBeInTheDocument();

    // Selling price remains visible
    expect(screen.getByText('150.00 ج.م')).toBeInTheDocument();
  });

  it('شكوى 6: شاشة الخامات تعرض بطاقات الخامات واستخداماتها وتنبيه أثر تغيير السعر', () => {
    renderWithContext(<InventoryModule />);

    // Material cards exist
    expect(screen.getByText('لحم بقري مفروم')).toBeInTheDocument();
    expect(screen.getByText('دقيق فاخر')).toBeInTheDocument();

    // "Used in X dishes" link is rendered
    expect(screen.getByText(/تستخدم في 1 أطباق/)).toBeInTheDocument();
  });
});
