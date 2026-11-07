/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DISHES & RECIPES MODULE (الأطباق والوصفات)
 * Replaces old technical BOM engineering with natural everyday language.
 * Connects raw materials, recipes, pricing, and role-based permissions.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../common/Button.tsx';
import {
  ChefHat,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
  History,
  TrendingUp,
  Boxes,
  Package as PackageIcon,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { JourneyProgressBar } from '../costcontrol/JourneyProgressBar.tsx';
import { MenuItemProduct, ProductRecipeItem, RawMaterialItem, dataService } from '../../services/dataService.ts';
import { calculateIngredientLineCost, STANDARD_UNITS } from '../../services/unitConversion.ts';
import { calculateFoodCostPercentage, calculateGrossMargin, calculateSuggestedSellingPrice } from '../../domain/formulas.ts';

type ActiveDishTab = 'info' | 'recipe' | 'pricing' | 'history';

export const MenuRecipeModule: React.FC = () => {
  const { t, formatCurrency, formatNumber, language, isRtl } = useI18n();
  const isAr = language === 'ar';
  const { currentUser, currentEstablishment, setActiveView } = useAuth();
  const estId = currentEstablishment?.id || 'default';
  const role = currentUser?.role || 'tenant_admin';

  // Role permissions
  const isChef = role === 'kitchen_manager' || role === 'bar_manager';
  const isCashier = role === 'cashier' || role === 'waiter';
  const canViewFinancials = !isChef && !isCashier; // cost_accountant, tenant_admin, general_manager, financial_manager, super_admin
  const canEdit = role !== 'cashier' && role !== 'waiter';

  const {
    rawMaterials,
    menuProducts,
    refreshMaterialsAndProducts,
    updateProduct,
    deleteProduct,
    clearExampleProducts,
  } = useBusiness();

  // Filters & State
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState<MenuItemProduct | null>(null);
  const [dishTab, setDishTab] = useState<ActiveDishTab>('info');
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showIncompleteRecipeModal, setShowIncompleteRecipeModal] = useState(false);

  // Edit draft state for selected dish
  const [draftDish, setDraftDish] = useState<MenuItemProduct | null>(null);

  // In-recipe "Add New Material" mini modal
  const [isQuickAddMaterialOpen, setIsQuickAddMaterialOpen] = useState(false);
  const [quickMatNameAr, setQuickMatNameAr] = useState('');
  const [quickMatUnit, setQuickMatUnit] = useState('كجم');
  const [quickMatPrice, setQuickMatPrice] = useState(50);
  const [quickMatStock, setQuickMatStock] = useState(10);
  const [quickMatWaste, setQuickMatWaste] = useState(5);

  // New ingredient selection in recipe tab
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');

  // Arabic section filters
  const sections = [
    { id: 'all', nameAr: 'الكل', nameEn: 'All' },
    { id: 'المطبخ', nameAr: 'المطبخ', nameEn: 'Kitchen' },
    { id: 'المشويات', nameAr: 'المشويات', nameEn: 'Grill' },
    { id: 'مخبوزات', nameAr: 'مخبوزات', nameEn: 'Bakery' },
    { id: 'المشروبات', nameAr: 'المشروبات', nameEn: 'Beverages' },
    { id: 'الحلويات', nameAr: 'الحلويات', nameEn: 'Desserts' },
    { id: 'البار', nameAr: 'البار', nameEn: 'Bar' },
  ];

  // Filter products
  const filteredDishes = useMemo(() => {
    return menuProducts.filter((p) => {
      const matchesSection = selectedSection === 'all' || p.category === selectedSection;
      const matchesSearch =
        p.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSection && matchesSearch;
    });
  }, [menuProducts, selectedSection, searchQuery]);

  // Open Dish Details Modal
  const handleOpenDish = (dish: MenuItemProduct, initialTab: ActiveDishTab = 'info') => {
    setSelectedDish(dish);
    setDraftDish(JSON.parse(JSON.stringify(dish)));
    setDishTab(initialTab);
    setHasUnsavedChanges(false);
    setIsEditingModalOpen(true);
  };

  // Open "+ New Dish" Modal
  const handleCreateNewDish = () => {
    const newDish: MenuItemProduct = {
      id: `prod-${Date.now()}`,
      establishmentId: estId,
      code: `DISH-${Math.floor(100 + Math.random() * 900)}`,
      nameAr: isAr ? 'طبق جديد' : 'New Dish',
      nameEn: 'New Dish',
      category: 'المطبخ',
      sellingPrice: 120,
      targetMarginPercentage: 65,
      suggestedPrice: 120,
      trueCost: 0,
      foodCostPercentage: 0,
      grossMarginPercentage: 100,
      isActive: false, // Inactive until recipe is set or confirmed
      recipeIngredients: [],
      directLaborMinutes: 10,
      laborHourlyRate: 20,
      wasteLossBuffer: 0,
      utilitiesCost: 2,
      consumablesCost: 1,
      servingsYield: 1,
      prepStation: 'المطبخ الرئيسي',
      auditHistory: [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          user: currentUser?.fullName || 'User',
          action: 'إنشاء طبق',
          details: 'تم إنشاء مسودة طبق جديد',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSelectedDish(newDish);
    setDraftDish(newDish);
    setDishTab('info');
    setHasUnsavedChanges(true);
    setIsEditingModalOpen(true);
  };

  // Clone Dish
  const handleCloneDish = async () => {
    if (!draftDish) return;
    const cloned: MenuItemProduct = {
      ...draftDish,
      id: `prod-${Date.now()}`,
      code: `${draftDish.code}-COPY`,
      nameAr: `${draftDish.nameAr} (نسخة)`,
      nameEn: `${draftDish.nameEn} (Copy)`,
      isExample: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await dataService.addProductWithRecipe(estId, cloned);
    await refreshMaterialsAndProducts();
    handleOpenDish(cloned, 'info');
  };

  // Delete Dish
  const handleDeleteDish = async () => {
    if (!draftDish) return;
    if (confirm(isAr ? `هل أنت متأكد من حذف [${draftDish.nameAr}]؟` : `Delete [${draftDish.nameEn}]?`)) {
      await deleteProduct(draftDish.id);
      setIsEditingModalOpen(false);
      setSelectedDish(null);
    }
  };

  // Save changes to current draft dish
  const handleSaveDraft = async () => {
    if (!draftDish) return;

    // Recalculate true cost based on recipe ingredients
    const rawCost = (draftDish.recipeIngredients || []).reduce((sum, item) => sum + item.totalCost, 0);
    const pkgCost = (draftDish.packagingItems || []).reduce((sum, item) => sum + item.cost, 0);
    const portions = Math.max(1, draftDish.servingsYield || 1);
    const portionCost = (rawCost + pkgCost + (draftDish.consumablesCost || 0) + (draftDish.utilitiesCost || 0)) / portions;

    const foodCostPct = calculateFoodCostPercentage(portionCost, draftDish.sellingPrice);
    const marginPct = calculateGrossMargin(draftDish.sellingPrice, portionCost);
    const suggested = calculateSuggestedSellingPrice(portionCost, draftDish.targetMarginPercentage || 65);

    const updatedAudit = draftDish.auditHistory || [];
    updatedAudit.unshift({
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      user: currentUser?.fullName || 'User',
      action: 'تعديل وحفظ الوصفة',
      details: `تم حفظ التعديلات. التكلفة: ${portionCost.toFixed(2)} ج.م، السعر: ${draftDish.sellingPrice} ج.م`,
    });

    const finalProduct: MenuItemProduct = {
      ...draftDish,
      trueCost: portionCost,
      foodCostPercentage: foodCostPct,
      grossMarginPercentage: marginPct,
      suggestedPrice: suggested,
      auditHistory: updatedAudit.slice(0, 20),
      updatedAt: new Date().toISOString(),
    };

    const exists = menuProducts.some((p) => p.id === finalProduct.id);
    if (exists) {
      await updateProduct(finalProduct);
    } else {
      await dataService.addProductWithRecipe(estId, finalProduct);
      await refreshMaterialsAndProducts();
    }

    setSelectedDish(finalProduct);
    setDraftDish(finalProduct);
    setHasUnsavedChanges(false);
  };

  // Recipe Ingredient Line: Quantity +/-
  const handleUpdateIngredientQty = (ingId: string, delta: number) => {
    if (!draftDish) return;
    const items = [...(draftDish.recipeIngredients || [])];
    const index = items.findIndex((i) => i.ingredientId === ingId);
    if (index >= 0) {
      const current = items[index];
      const newQty = Math.max(0.1, Math.round((current.quantity + delta) * 10) / 10);
      const newTotal = Math.round(newQty * current.unitCost * 100) / 100;
      items[index] = { ...current, quantity: newQty, totalCost: newTotal };
      setDraftDish({ ...draftDish, recipeIngredients: items });
      setHasUnsavedChanges(true);
    }
  };

  // Recipe Ingredient Line: Remove
  const handleRemoveIngredient = (ingId: string) => {
    if (!draftDish) return;
    const items = (draftDish.recipeIngredients || []).filter((i) => i.ingredientId !== ingId);
    setDraftDish({ ...draftDish, recipeIngredients: items });
    setHasUnsavedChanges(true);
  };

  // Add ingredient from raw materials to recipe
  const handleSelectMaterialForRecipe = (mat: RawMaterialItem) => {
    if (!draftDish) return;
    const existing = (draftDish.recipeIngredients || []).find((i) => i.ingredientId === mat.id);
    if (existing) {
      handleUpdateIngredientQty(mat.id, 1);
      setIsAddIngredientOpen(false);
      return;
    }

    const { unitCost, totalCost } = calculateIngredientLineCost({
      purchasePrice: mat.purchasePrice,
      purchaseUnit: mat.purchaseUnit,
      recipeQuantity: 1,
      recipeUnit: mat.consumptionUnit || 'جرام',
      wastePercentage: mat.wastePercentage,
    });

    const newItem: ProductRecipeItem = {
      ingredientId: mat.id,
      ingredientNameAr: mat.nameAr,
      ingredientNameEn: mat.nameEn,
      quantity: 1,
      unit: mat.consumptionUnit || mat.purchaseUnit,
      unitCost: unitCost || mat.effectiveUnitCost || 1,
      totalCost: totalCost || mat.effectiveUnitCost || 1,
    };

    setDraftDish({
      ...draftDish,
      recipeIngredients: [...(draftDish.recipeIngredients || []), newItem],
    });
    setHasUnsavedChanges(true);
    setIsAddIngredientOpen(false);
  };

  // Quick Add Raw Material In-Place
  const handleSaveQuickMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMatNameAr.trim()) return;

    const newMat = await dataService.addRawMaterial(estId, {
      nameAr: quickMatNameAr.trim(),
      nameEn: quickMatNameAr.trim(),
      category: 'عام',
      purchaseUnit: quickMatUnit,
      purchasePrice: quickMatPrice,
      purchasedQuantity: quickMatStock,
      consumptionUnit: quickMatUnit === 'كجم' ? 'جرام' : quickMatUnit === 'لتر' ? 'مل' : 'قطعة',
      conversionFactor: quickMatUnit === 'كجم' || quickMatUnit === 'لتر' ? 1000 : 1,
      wastePercentage: quickMatWaste,
      currentStock: quickMatStock * (quickMatUnit === 'كجم' || quickMatUnit === 'لتر' ? 1000 : 1),
      reorderPoint: 5,
    });

    await refreshMaterialsAndProducts();
    handleSelectMaterialForRecipe(newMat);
    setIsQuickAddMaterialOpen(false);
    setQuickMatNameAr('');
  };

  // Toggle Ready For Sale
  const handleToggleReadyForSale = () => {
    if (!draftDish) return;
    const hasRecipe = draftDish.recipeIngredients && draftDish.recipeIngredients.length > 0;

    if (!draftDish.isActive && !hasRecipe) {
      // Dish is missing recipe! Warn user before enabling
      setShowIncompleteRecipeModal(true);
      return;
    }

    setDraftDish({ ...draftDish, isActive: !draftDish.isActive });
    setHasUnsavedChanges(true);
  };

  // Attempting to close modal with unsaved changes
  const handleCloseModal = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      setIsEditingModalOpen(false);
      setSelectedDish(null);
    }
  };

  // Calculate live numbers for draft dish
  const liveRawCost = useMemo(() => {
    return (draftDish?.recipeIngredients || []).reduce((sum, item) => sum + item.totalCost, 0);
  }, [draftDish]);

  const liveTrueCost = useMemo(() => {
    if (!draftDish) return 0;
    const pkg = (draftDish.packagingItems || []).reduce((sum, item) => sum + item.cost, 0);
    const portions = Math.max(1, draftDish.servingsYield || 1);
    return (liveRawCost + pkg + (draftDish.consumablesCost || 0) + (draftDish.utilitiesCost || 0)) / portions;
  }, [draftDish, liveRawCost]);

  const liveProfit = useMemo(() => {
    if (!draftDish) return 0;
    return draftDish.sellingPrice - liveTrueCost;
  }, [draftDish, liveTrueCost]);

  const liveMarginPct = useMemo(() => {
    if (!draftDish || draftDish.sellingPrice <= 0) return 0;
    return (liveProfit / draftDish.sellingPrice) * 100;
  }, [draftDish, liveProfit]);

  return (
    <div className="space-y-6">
      {/* 1. 7-Step Journey Interactive Bar */}
      <JourneyProgressBar
        currentStep={3}
        onSelectDishMissingRecipe={(id) => {
          const d = menuProducts.find((p) => p.id === id);
          if (d) handleOpenDish(d, 'recipe');
        }}
      />

      {/* 2. Top Header & Primary Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>{isAr ? 'الأطباق والوصفات' : 'Dishes & Recipes'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تحديد مكونات كل طبق بدقة، وحساب تكلفته وسعر بيعه وهامش الربح تلقائياً'
              : 'Define dish ingredients, calculate true portion cost, prices, and profit margins'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {menuProducts.some((p) => p.isExample) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (confirm(isAr ? 'هل تريد حذف جميع الأطباق التجريبية للبدء من الصفر؟' : 'Clear demo examples to start fresh?')) {
                  await clearExampleProducts();
                }
              }}
              className="text-xs font-semibold"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>{isAr ? 'ابدأ من الصفر' : 'Start Fresh'}</span>
            </Button>
          )}

          {canEdit && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCreateNewDish}
              data-testid="add-new-dish-button"
              className="px-4 py-2 text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? '+ طبق جديد' : '+ New Dish'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. Section Filter Tabs & Simple Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0b101e] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Arabic Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSelectedSection(sec.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedSection === sec.id
                  ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isAr ? sec.nameAr : sec.nameEn}
            </button>
          ))}
        </div>

        {/* Search Input: Simple, NO ⌘K */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
          <input
            type="text"
            placeholder={isAr ? 'ابحث عن طبق...' : 'Search for a dish...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 4. Dish Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="dishes-grid">
        {filteredDishes.map((dish) => {
          const hasRecipe = dish.recipeIngredients && dish.recipeIngredients.length > 0;
          const status = !hasRecipe
            ? 'missing_recipe'
            : dish.isActive
            ? 'ready'
            : 'unavailable';

          return (
            <div
              key={dish.id}
              onClick={() => handleOpenDish(dish, 'info')}
              data-testid={`dish-card-${dish.id}`}
              className="p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3"
            >
              {/* Header: Name & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {dish.nameAr}
                  </h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    <span>{dish.category}</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono">{dish.code}</span>
                  </div>
                </div>

                {/* Status Badge */}
                {status === 'missing_recipe' ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800/80">
                    {isAr ? 'ينقصه وصفة' : 'Missing Recipe'}
                  </span>
                ) : status === 'ready' ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80">
                    {isAr ? 'جاهز للبيع' : 'Ready for Sale'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {isAr ? 'غير متاح' : 'Unavailable'}
                  </span>
                )}
              </div>

              {/* Tag for Demo Example */}
              {dish.isExample && (
                <div className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 px-2 py-0.5 rounded-md inline-block">
                  {isAr ? 'مثال، عدّله أو احذفه' : 'Example, edit or delete'}
                </div>
              )}

              {/* Price, Cost & Profit */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'سعر البيع' : 'Price'}</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                    {formatCurrency(dish.sellingPrice)}
                  </strong>
                </div>

                {canViewFinancials ? (
                  <>
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'التكلفة' : 'Cost'}</span>
                      <strong className="text-xs font-mono font-bold text-amber-500" dir="ltr">
                        {dish.trueCost > 0 ? formatCurrency(dish.trueCost) : '0.00 ج.م'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الربح' : 'Margin'}</span>
                      <strong
                        className={`text-xs font-mono font-bold ${
                          dish.grossMarginPercentage >= 60 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                      >
                        {dish.grossMarginPercentage.toFixed(0)}%
                      </strong>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-end text-[11px] text-slate-400 pt-2">
                    {dish.recipeIngredients?.length || 0} {isAr ? 'مكونات' : 'items'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Dish Details Modal / Drawer (4 Tabs: البيانات, الوصفة, السعر والربح, سجل التعديلات) */}
      {isEditingModalOpen && draftDish && (
        <div
          data-testid="dish-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-3xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-cyan-500" />
                <div>
                  <h2 className="text-base font-black truncate">{draftDish.nameAr}</h2>
                  <span className="text-[11px] text-slate-400 font-mono">{draftDish.code}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canEdit && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCloneDish}
                      title={isAr ? 'نسخ طبق' : 'Clone Dish'}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteDish}
                      title={isAr ? 'حذف الطبق' : 'Delete Dish'}
                      className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={handleCloseModal}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 4 Tabs Bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 gap-2 sm:gap-4 text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDishTab('info')}
                className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  dishTab === 'info'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                1. {isAr ? 'بيانات الطبق' : 'Dish Info'}
              </button>

              <button
                type="button"
                onClick={() => setDishTab('recipe')}
                className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  dishTab === 'recipe'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                2. {isAr ? 'الوصفة (المكونات)' : 'Recipe (Ingredients)'}
              </button>

              {canViewFinancials && (
                <button
                  type="button"
                  onClick={() => setDishTab('pricing')}
                  className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    dishTab === 'pricing'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  3. {isAr ? 'السعر والربح' : 'Price & Profit'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setDishTab('history')}
                className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  dishTab === 'history'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                4. {isAr ? 'سجل التعديلات' : 'Audit History'}
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Tab 1: Dish Info */}
              {dishTab === 'info' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {isAr ? 'اسم الطبق (بالعربية):' : 'Dish Name (Arabic):'}
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={draftDish.nameAr}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, nameAr: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {isAr ? 'اسم الطبق (بالإنجليزية):' : 'Dish Name (English):'}
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={draftDish.nameEn}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, nameEn: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {isAr ? 'القسم:' : 'Category:'}
                      </label>
                      <select
                        disabled={!canEdit}
                        value={draftDish.category}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, category: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      >
                        {sections.filter((s) => s.id !== 'all').map((s) => (
                          <option key={s.id} value={s.nameAr}>
                            {isAr ? s.nameAr : s.nameEn}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {isAr ? 'محطة التحضير (KDS):' : 'Prep Station:'}
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={draftDish.prepStation || 'المطبخ الرئيسي'}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, prepStation: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {isAr ? 'وقت التحضير (دقائق):' : 'Prep Time (mins):'}
                      </label>
                      <input
                        type="number"
                        disabled={!canEdit}
                        value={draftDish.directLaborMinutes || 10}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, directLaborMinutes: Number(e.target.value) });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {isAr ? 'سعر البيع للجمهور (ج.م):' : 'Selling Price (EGP):'}
                      </label>
                      <input
                        type="number"
                        step="1"
                        disabled={!canEdit}
                        value={draftDish.sellingPrice}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, sellingPrice: Number(e.target.value) });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-base font-bold text-cyan-600 dark:text-cyan-400"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        {isAr ? 'حالة العرض والبيع:' : 'Sales Availability:'}
                      </label>
                      <Button
                        type="button"
                        variant={draftDish.isActive ? 'primary' : 'outline'}
                        onClick={handleToggleReadyForSale}
                        className="w-full justify-center font-bold"
                      >
                        {draftDish.isActive
                          ? isAr ? 'جاهز للبيع في الكاشير والمنيو' : 'Available for Sale'
                          : isAr ? 'غير متاح للبيع (مسودة)' : 'Not Available (Draft)'}
                      </Button>
                    </div>
                  </div>

                  {/* Smart Progression: Next Step */}
                  <div className="pt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setDishTab('recipe')}
                      className="font-bold"
                    >
                      <span>{isAr ? 'التالي: تحديد مقادير الوصفة' : 'Next: Ingredients Recipe'}</span>
                      {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Tab 2: Recipe Ingredients */}
              {dishTab === 'recipe' && (
                <div className="space-y-4 text-xs">
                  {/* Top Bar: Add Ingredient / Servings Yield */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => setIsAddIngredientOpen(true)}
                        data-testid="add-recipe-ingredient-button"
                        className="font-bold"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isAr ? '+ أضف مكوناً للطبق' : '+ Add Ingredient'}</span>
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold">{isAr ? 'عدد الحصص (وجبة):' : 'Portions Yield:'}</span>
                      <input
                        type="number"
                        min="1"
                        value={draftDish.servingsYield || 1}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, servingsYield: Math.max(1, Number(e.target.value)) });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-16 p-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Ingredients Cards List (Mobile-Friendly) */}
                  <div className="space-y-2.5">
                    {(!draftDish.recipeIngredients || draftDish.recipeIngredients.length === 0) ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 space-y-2">
                        <ChefHat className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                        <div className="font-bold text-slate-600 dark:text-slate-300">
                          {isAr ? 'لا توجد مكونات في هذا الطبق بعد' : 'No ingredients added to this dish yet'}
                        </div>
                        <p className="text-[11px]">
                          {isAr
                            ? 'اضغط على «+ أضف مكوناً» لاختيار الخامات من المستودع أو إضافة خامة جديدة فوراً.'
                            : 'Click "+ Add Ingredient" to select from raw materials or add a new material.'}
                        </p>
                      </div>
                    ) : (
                      draftDish.recipeIngredients.map((item) => (
                        <div
                          key={item.ingredientId}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">
                              {item.ingredientNameAr}
                            </h4>
                            <div className="text-[11px] text-slate-400">
                              <span>{isAr ? 'الوحدة:' : 'Unit:'} {item.unit}</span>
                              {canViewFinancials && (
                                <>
                                  <span className="mx-1.5">·</span>
                                  <span>{isAr ? 'سعر الوحدة:' : 'Unit Cost:'} {item.unitCost} ج.م</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Mobile Big +/- Touch Buttons */}
                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                              <button
                                type="button"
                                onClick={() => handleUpdateIngredientQty(item.ingredientId, -1)}
                                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-base flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-12 text-center font-mono font-bold text-slate-900 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateIngredientQty(item.ingredientId, 1)}
                                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-base flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {canViewFinancials && (
                              <div className="font-mono font-bold text-slate-900 dark:text-white min-w-16 text-end" dir="ltr">
                                {formatCurrency(item.totalCost)}
                              </div>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveIngredient(item.ingredientId)}
                              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Packaging & Consumables Row */}
                  <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="w-4 h-4 text-cyan-500" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {isAr ? 'مواد التعبئة والتغليف (علب، أكياس، مناديل):' : 'Packaging & Wraps:'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isAr ? 'تضاف مباشرة لتكلفة الوجبة' : 'Added directly to meal cost'}
                        </span>
                      </div>
                    </div>
                    {canViewFinancials && (
                      <div className="flex items-center gap-1 font-mono">
                        <input
                          type="number"
                          step="0.5"
                          value={draftDish.consumablesCost || 0}
                          onChange={(e) => {
                            setDraftDish({ ...draftDish, consumablesCost: Number(e.target.value) });
                            setHasUnsavedChanges(true);
                          }}
                          className="w-20 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-end font-bold"
                        />
                        <span className="text-slate-500 font-bold">ج.م</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Price & Profit (Financials) */}
              {dishTab === 'pricing' && canViewFinancials && (
                <div className="space-y-4 text-xs">
                  {/* Financial Breakdown Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-slate-500 block mb-1">{isAr ? 'سعر البيع الحالي' : 'Selling Price'}</span>
                      <strong className="text-xl font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(draftDish.sellingPrice)}
                      </strong>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-slate-500 block mb-1">{isAr ? 'التكلفة الحقيقية للحصة' : 'True Cost'}</span>
                      <strong className="text-xl font-mono font-black text-amber-500" dir="ltr">
                        {formatCurrency(liveTrueCost)}
                      </strong>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {isAr ? 'خامات + هالك + مصاريف' : 'Materials + Waste + Overhead'}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-slate-500 block mb-1">{isAr ? 'صافي الربح ونسبته' : 'Profit & Margin'}</span>
                      <strong
                        className={`text-xl font-mono font-black ${
                          liveMarginPct >= 60 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                        dir="ltr"
                      >
                        {formatCurrency(liveProfit)} ({liveMarginPct.toFixed(0)}%)
                      </strong>
                    </div>
                  </div>

                  {/* Warning on Low Profit Margin */}
                  {liveMarginPct < 50 && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <strong>{isAr ? 'تنبيه: هامش ربح ضعيف لهذا الطبق!' : 'Warning: Low Profit Margin!'}</strong>
                        <p className="mt-0.5 text-[11px]">
                          {isAr
                            ? `هامش الربح الحالي (${liveMarginPct.toFixed(0)}%) أقل من المستهدف المعتاد (65%). السعر المقترح لتغطية تكاليفك وتحقيق ربح آمن هو `
                            : `Current margin (${liveMarginPct.toFixed(0)}%) is below standard target. Suggested safe price is `}
                          <strong className="font-mono underline">{Math.ceil(liveTrueCost / 0.35)} ج.م</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Detailed Expenses Absorption */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">
                      {isAr ? 'تفصيل تكاليف التشغيل الموزعة على الحصة:' : 'Per-Portion Cost Absorption:'}
                    </h4>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>{isAr ? '1. تكلفة الخامات الصافية:' : '1. Raw Ingredients:'}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white" dir="ltr">{formatCurrency(liveRawCost)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>{isAr ? '2. التعبئة والتغليف:' : '2. Packaging:'}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white" dir="ltr">{formatCurrency(draftDish.consumablesCost || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>{isAr ? '3. المرافق والغاز والكهرباء الموزعة:' : '3. Utilities (Gas/Power):'}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white" dir="ltr">{formatCurrency(draftDish.utilitiesCost || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Audit History */}
              {dishTab === 'history' && (
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center gap-2 pb-2 text-slate-500 font-bold">
                    <History className="w-4 h-4 text-cyan-500" />
                    <span>{isAr ? 'سجل العمليات والتعديلات على هذا الطبق' : 'Tamper-Evident History Log'}</span>
                  </div>

                  {(!draftDish.auditHistory || draftDish.auditHistory.length === 0) ? (
                    <div className="p-4 text-center text-slate-400">
                      {isAr ? 'لا توجد تعديلات مسجلة بعد' : 'No audit entries recorded yet'}
                    </div>
                  ) : (
                    draftDish.auditHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{item.action}</div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.details}</p>
                          <span className="text-[10px] text-slate-400">
                            {item.user} · {item.timestamp}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Sticky Bottom Bar: Cost, Profit, Save Changes */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-4 text-xs">
                {canViewFinancials ? (
                  <>
                    <div>
                      <span className="text-slate-400 block">{isAr ? 'التكلفة اللحظية:' : 'Live Cost:'}</span>
                      <strong className="font-mono text-amber-500 font-black text-sm" dir="ltr">
                        {formatCurrency(liveTrueCost)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">{isAr ? 'الربح المتوقع:' : 'Expected Profit:'}</span>
                      <strong
                        className={`font-mono font-black text-sm ${
                          liveMarginPct >= 60 ? 'text-emerald-500' : 'text-rose-500'
                        }`}
                        dir="ltr"
                      >
                        {formatCurrency(liveProfit)} ({liveMarginPct.toFixed(0)}%)
                      </strong>
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="text-slate-400 block">{isAr ? 'عدد المكونات:' : 'Total Ingredients:'}</span>
                    <strong className="font-mono text-slate-900 dark:text-white font-bold text-sm">
                      {draftDish.recipeIngredients?.length || 0}
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>

                {canEdit && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSaveDraft}
                    data-testid="save-dish-changes-button"
                    className="font-bold px-4"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isAr ? 'حفظ التعديلات' : 'Save Changes'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Select Material Modal inside Recipe Tab */}
      {isAddIngredientOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold">{isAr ? 'اختر خامة لإضافتها للوصفة' : 'Select Raw Material'}</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddIngredientOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
                <input
                  type="text"
                  placeholder={isAr ? 'ابحث في الخامات...' : 'Search materials...'}
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsQuickAddMaterialOpen(true);
                  setIsAddIngredientOpen(false);
                }}
                className="font-bold text-cyan-600 dark:text-cyan-400"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? '+ خامة جديدة' : '+ New Material'}</span>
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 text-xs">
              {rawMaterials
                .filter((m) => m.nameAr.toLowerCase().includes(ingredientSearch.toLowerCase()))
                .map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => handleSelectMaterialForRecipe(mat)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-slate-200 dark:border-slate-800 text-start flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <strong className="block text-slate-900 dark:text-white">{mat.nameAr}</strong>
                      <span className="text-[11px] text-slate-400">
                        {mat.purchaseUnit} · {isAr ? 'الرصيد:' : 'Stock:'} {mat.currentStock} {mat.consumptionUnit}
                      </span>
                    </div>
                    {canViewFinancials && (
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {mat.purchasePrice} ج.م
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Raw Material Modal In-Place */}
      {isQuickAddMaterialOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold">{isAr ? '+ إضافة خامة جديدة فوراً' : '+ Quick Add Raw Material'}</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsQuickAddMaterialOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveQuickMaterial} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {isAr ? 'اسم الخامة:' : 'Material Name:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isAr ? 'مثال: جبنة موزاريلا' : 'e.g. Mozzarella'}
                  value={quickMatNameAr}
                  onChange={(e) => setQuickMatNameAr(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'وحدة الشراء:' : 'Purchase Unit:'}
                  </label>
                  <select
                    value={quickMatUnit}
                    onChange={(e) => setQuickMatUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="كجم">{isAr ? 'كيلو (كجم)' : 'Kilogram'}</option>
                    <option value="لتر">{isAr ? 'لتر' : 'Liter'}</option>
                    <option value="قطعة">{isAr ? 'قطعة' : 'Piece'}</option>
                    <option value="علبة">{isAr ? 'علبة' : 'Box'}</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'سعر الشراء (ج.م):' : 'Purchase Price:'}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={quickMatPrice}
                    onChange={(e) => setQuickMatPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'الكمية الحالية:' : 'Stock Qty:'}
                  </label>
                  <input
                    type="number"
                    value={quickMatStock}
                    onChange={(e) => setQuickMatStock(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'نسبة الهالك (%):' : 'Waste %:'}
                  </label>
                  <input
                    type="number"
                    value={quickMatWaste}
                    onChange={(e) => setQuickMatWaste(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <Button type="submit" variant="primary" size="sm" className="flex-1 font-bold">
                  {isAr ? 'حفظ وإضافة للوصفة' : 'Save & Add to Recipe'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAddMaterialOpen(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Incomplete Recipe Warning Modal: Dish is missing recipe! */}
      {showIncompleteRecipeModal && draftDish && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-black text-sm">
                {isAr ? 'تنبيه: هذا الطبق ينقصه وصفة!' : 'Warning: Dish Missing Recipe!'}
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? `الطبق [${draftDish.nameAr}] لا يحتوي على أي مكونات حتى الآن. إذا عرضته للبيع، لن يتم خصم الخامات من المستودع عند كل عملية بيع ولن تُحسب الأرباح الحقيقية بدقة.`
                : `Dish [${draftDish.nameEn}] has no ingredients yet. Selling it will not deplete raw materials.`}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowIncompleteRecipeModal(false);
                  setDishTab('recipe');
                }}
                className="flex-1 font-bold"
              >
                {isAr ? 'إضافة مقادير الوصفة أولاً' : 'Add Recipe Ingredients First'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraftDish({ ...draftDish, isActive: true });
                  setShowIncompleteRecipeModal(false);
                  setHasUnsavedChanges(true);
                }}
                className="text-amber-600 font-bold"
              >
                {isAr ? 'عرضه للبيع على أي حال' : 'Enable Anyway'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100 text-xs">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm">{isAr ? 'تعديلات غير محفوظة!' : 'Unsaved Changes!'}</h3>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? 'لديك تعديلات لم تقم بحفظها على هذا الطبق. هل تريد تجاهلها والخروج؟'
                : 'You have unsaved changes. Discard and exit?'}
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={async () => {
                  await handleSaveDraft();
                  setShowUnsavedWarning(false);
                  setIsEditingModalOpen(false);
                }}
                className="flex-1 font-bold"
              >
                {isAr ? 'حفظ ثم خروج' : 'Save & Exit'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowUnsavedWarning(false);
                  setIsEditingModalOpen(false);
                  setHasUnsavedChanges(false);
                }}
              >
                {isAr ? 'تجاهل الخروج' : 'Discard'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
