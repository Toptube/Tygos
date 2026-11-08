/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RECIPES MODULE (الوصفات - رسبي) (Package 1 - Section 3)
 * The central gateway for all venue recipes (dishes, bakery, bar, desserts, etc.)
 * Features:
 * - 3-level tree category selector (Main -> Subcategory -> Classification) + '+' everywhere
 * - Fast "+ صنف جديد" pre-filling category and immediately switching to Ingredients tab
 * - Duplicate prevention in same category with Arabic text normalization
 * - Update mode on first save (never duplicating records on repeated clicks)
 * - Clear save notification «تم حفظ الوصفة ✓»
 * - In-app delete confirmation with item name and 8-second undo toast
 * - Keyboard numeric inputs via <NumericInput> (inputMode="decimal", select-all, ٠-٩ normalization)
 * - Tool «المكرر» for duplicate detection & merge
 * - Sub-recipes (تحضيرات أساسية: صوص/عجينة) & packaging consumables
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import { NumericInput } from '../common/NumericInput.tsx';
import {
  ChefHat,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
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
  GitMerge,
  Undo2,
  CheckCircle2,
  FolderPlus,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { JourneyProgressBar } from '../costcontrol/JourneyProgressBar.tsx';
import { MenuItemProduct, ProductRecipeItem, RawMaterialItem, dataService } from '../../services/dataService.ts';
import { calculateIngredientLineCost, STANDARD_UNITS } from '../../services/unitConversion.ts';
import { calculateFoodCostPercentage, calculateGrossMargin, calculateSuggestedSellingPrice } from '../../domain/formulas.ts';
import { categoryService, CategoryNode, normalizeArabicText } from '../../services/categoryService.ts';
import { DuplicatesResolverModal } from './DuplicatesResolverModal.tsx';

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
  const canViewFinancials = !isChef && !isCashier;
  const canEdit = role !== 'cashier' && role !== 'waiter';

  const {
    rawMaterials,
    menuProducts,
    refreshMaterialsAndProducts,
    updateProduct,
    deleteProduct,
    restoreDeletedProduct,
    archiveProduct,
    clearExampleProducts,
    refreshCategories,
  } = useBusiness();

  // Category Tree State (3 Levels)
  const productCategories = useMemo(() => {
    return categoryService.getCategories(estId, 'product');
  }, [estId, menuProducts]);

  const mainCategories = useMemo(() => {
    return productCategories.filter((c) => !c.parentId && c.active);
  }, [productCategories]);

  const [selectedMainCatId, setSelectedMainCatId] = useState<string>('all');
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  // Subcategories dependent on selected main
  const subCategories = useMemo(() => {
    if (selectedMainCatId === 'all') return [];
    return productCategories.filter((c) => c.parentId === selectedMainCatId && c.active);
  }, [productCategories, selectedMainCatId]);

  // Classifications dependent on selected subcategory
  const classifications = useMemo(() => {
    if (selectedSubCatId === 'all') return [];
    return productCategories.filter((c) => c.parentId === selectedSubCatId && c.active);
  }, [productCategories, selectedSubCatId]);

  // Quick Add Category Modal
  const [categoryModalMode, setCategoryModalMode] = useState<'main' | 'sub' | 'class' | null>(null);
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [catModalError, setCatModalError] = useState<string | null>(null);

  // Search & Dish Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDish, setSelectedDish] = useState<MenuItemProduct | null>(null);
  const [dishTab, setDishTab] = useState<ActiveDishTab>('info');
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showIncompleteRecipeModal, setShowIncompleteRecipeModal] = useState(false);

  // Edit draft state for selected dish
  const [draftDish, setDraftDish] = useState<MenuItemProduct | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // Delete Confirmation Modal & Undo Toast State
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [undoToast, setUndoToast] = useState<{ dish: MenuItemProduct; timerId: any } | null>(null);

  // Duplicates Tool Modal
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);

  // Fast "+ صنف جديد" Dialog
  const [isNewDishModalOpen, setIsNewDishModalOpen] = useState(false);
  const [newDishNameAr, setNewDishNameAr] = useState('');
  const [newDishCategory, setNewDishCategory] = useState('');
  const [newDishPrice, setNewDishPrice] = useState(120);
  const [newDishStation, setNewDishStation] = useState('المطبخ الرئيسي');
  const [newDishError, setNewDishError] = useState<string | null>(null);

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

  // Toast notification
  const [generalToast, setGeneralToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setGeneralToast(msg);
    setTimeout(() => setGeneralToast(null), 3500);
  };

  // Check for navigation tab / edit intents from Journey Bar
  useEffect(() => {
    try {
      const editId = localStorage.getItem('tygos_edit_dish_id');
      const tabIntent = localStorage.getItem('tygos_active_dish_tab_intent') as ActiveDishTab;
      localStorage.removeItem('tygos_edit_dish_id');
      localStorage.removeItem('tygos_active_dish_tab_intent');

      if (editId) {
        const found = menuProducts.find((p) => p.id === editId);
        if (found) {
          handleOpenDish(found, tabIntent || 'info');
          return;
        }
      } else if (tabIntent && menuProducts.length > 0) {
        handleOpenDish(menuProducts[0], tabIntent);
      }
    } catch {}
  }, [menuProducts]);

  // Filter products based on 3 levels + search
  const filteredDishes = useMemo(() => {
    return menuProducts.filter((p) => {
      let matchesCategory = true;
      if (selectedMainCatId !== 'all') {
        const mainCat = mainCategories.find((c) => c.id === selectedMainCatId);
        if (mainCat) {
          // If subcategory selected, match subcategory name
          if (selectedSubCatId !== 'all') {
            const subCat = subCategories.find((c) => c.id === selectedSubCatId);
            if (subCat) {
              matchesCategory = p.category === subCat.nameAr || (p as any).subCategory === subCat.nameAr;
            }
          } else {
            // Match main category or any of its subcategories
            const subNames = subCategories.map((s) => s.nameAr);
            matchesCategory = p.category === mainCat.nameAr || subNames.includes(p.category);
          }
        }
      }

      const q = normalizeArabicText(searchQuery);
      const matchesSearch =
        !q ||
        normalizeArabicText(p.nameAr).includes(q) ||
        p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [menuProducts, selectedMainCatId, selectedSubCatId, mainCategories, subCategories, searchQuery]);

  // Open Dish Details Modal
  const handleOpenDish = (dish: MenuItemProduct, initialTab: ActiveDishTab = 'info') => {
    setSelectedDish(dish);
    setDraftDish(JSON.parse(JSON.stringify(dish)));
    setDishTab(initialTab);
    setHasUnsavedChanges(false);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    setIsEditingModalOpen(true);
  };

  // Open "+ صنف جديد" Modal (Pre-filling current category)
  const handleOpenCreateModal = () => {
    let prefillCat = 'المطبخ';
    if (selectedSubCatId !== 'all') {
      const sub = subCategories.find((s) => s.id === selectedSubCatId);
      if (sub) prefillCat = sub.nameAr;
    } else if (selectedMainCatId !== 'all') {
      const main = mainCategories.find((m) => m.id === selectedMainCatId);
      if (main) prefillCat = main.nameAr;
    }

    setNewDishNameAr('');
    setNewDishCategory(prefillCat);
    setNewDishPrice(120);
    setNewDishStation(prefillCat.includes('بار') || prefillCat.includes('مشروب') ? 'البار والمشروبات' : 'المطبخ الرئيسي');
    setNewDishError(null);
    setIsNewDishModalOpen(true);
  };

  // Submit Fast Add Dish -> Directly transitions to Recipe/Ingredients tab
  const handleConfirmCreateDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishNameAr.trim()) {
      setNewDishError('يرجى كتابة اسم الصنف بالعربية');
      return;
    }

    // Check duplicate in same category
    const norm = normalizeArabicText(newDishNameAr);
    const dup = menuProducts.find(
      (p) => (p.category || '').trim() === newDishCategory.trim() && normalizeArabicText(p.nameAr) === norm
    );
    if (dup) {
      setNewDishError(`يوجد صنف بنفس الاسم «${newDishNameAr}» في نفس القسم [${newDishCategory}]. يُسمح بتكرار الاسم فقط في قسم مختلف.`);
      return;
    }

    const newDish: MenuItemProduct = {
      id: `prod-${Date.now()}`,
      establishmentId: estId,
      code: `DISH-${Math.floor(100 + Math.random() * 900)}`,
      nameAr: newDishNameAr.trim(),
      nameEn: newDishNameAr.trim(),
      category: newDishCategory.trim(),
      sellingPrice: newDishPrice,
      targetMarginPercentage: 65,
      suggestedPrice: newDishPrice,
      trueCost: 0,
      foodCostPercentage: 0,
      grossMarginPercentage: 100,
      isActive: false, // Inactive until recipe is confirmed
      recipeIngredients: [],
      directLaborMinutes: 10,
      laborHourlyRate: 20,
      wasteLossBuffer: 0,
      utilitiesCost: 2,
      consumablesCost: 1,
      servingsYield: 1,
      prepStation: newDishStation,
      auditHistory: [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          user: currentUser?.fullName || 'User',
          action: 'إنشاء صنف',
          details: `تم إنشاء صنف جديد [${newDishNameAr}] في قسم [${newDishCategory}]`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsNewDishModalOpen(false);
    setSelectedDish(newDish);
    setDraftDish(newDish);
    setDishTab('recipe'); // Immediately switch to Ingredients tab!
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
    showToast(`تم نسخ الصنف [${cloned.nameAr}] بنجاح ✓`);
  };

  // Confirm Delete Dish (with prior sales check & 8-second undo toast)
  const handleConfirmDeleteDish = async () => {
    if (!draftDish) return;
    const target = draftDish;
    setShowDeleteConfirmModal(false);
    setIsEditingModalOpen(false);
    setSelectedDish(null);

    // Check if dish has prior sales (or simulated sale audit)
    const hasPriorSales = Boolean((target as any).hasSales || (target.auditHistory || []).some((a) => a.details.includes('بيع')));
    if (hasPriorSales) {
      await archiveProduct(target.id);
      showToast(`تم أرشفة [${target.nameAr}] بدلاً من حذفه للحفاظ على سجل المبيعات والتقارير المالية.`);
      return;
    }

    // Hard delete with undo toast
    await deleteProduct(target.id);

    if (undoToast?.timerId) {
      clearTimeout(undoToast.timerId);
    }

    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 8000);

    setUndoToast({
      dish: target,
      timerId: timer,
    });
  };

  const handleUndoDelete = async () => {
    if (!undoToast) return;
    clearTimeout(undoToast.timerId);
    await restoreDeletedProduct(undoToast.dish);
    showToast(`تم استرجاع [${undoToast.dish.nameAr}] بنجاح ✓`);
    setUndoToast(null);
  };

  // Save changes to current draft dish (Update mode, never duplicates, validates duplicate in same category)
  const handleSaveDraft = async () => {
    if (!draftDish || isSubmitting) return;

    if (!draftDish.nameAr.trim()) {
      setSaveErrorMsg('يرجى كتابة اسم الصنف بالعربية');
      return;
    }

    // Check duplicate in same category
    const norm = normalizeArabicText(draftDish.nameAr);
    const dupInSameCat = menuProducts.find(
      (p) =>
        p.id !== draftDish.id &&
        (p.category || '').trim() === (draftDish.category || '').trim() &&
        normalizeArabicText(p.nameAr) === norm
    );

    if (dupInSameCat) {
      setSaveErrorMsg(`يوجد صنف بنفس الاسم «${draftDish.nameAr}» في نفس القسم [${draftDish.category}]. يُسمح بتكرار الاسم فقط في قسم مختلف.`);
      return;
    }

    setIsSubmitting(true);
    setSaveErrorMsg(null);

    try {
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

      // Switch form to update mode on same record
      setSelectedDish(finalProduct);
      setDraftDish(finalProduct);
      setHasUnsavedChanges(false);
      setSaveSuccessMsg('تم حفظ الوصفة ✓');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      setSaveErrorMsg(err?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recipe Ingredient Line: Direct Numeric Setting
  const handleSetIngredientQty = (ingId: string, newQty: number) => {
    if (!draftDish) return;
    const items = [...(draftDish.recipeIngredients || [])];
    const index = items.findIndex((i) => i.ingredientId === ingId);
    if (index >= 0) {
      const current = items[index];
      const validQty = Math.max(0.001, newQty);
      const newTotal = Math.round(validQty * current.unitCost * 100) / 100;
      items[index] = { ...current, quantity: validQty, totalCost: newTotal };
      setDraftDish({ ...draftDish, recipeIngredients: items });
      setHasUnsavedChanges(true);
    }
  };

  // Recipe Ingredient Line: Waste %
  const handleSetIngredientWaste = (ingId: string, wastePct: number) => {
    if (!draftDish) return;
    const items = [...(draftDish.recipeIngredients || [])];
    const index = items.findIndex((i) => i.ingredientId === ingId);
    if (index >= 0) {
      const current = items[index];
      const mat = rawMaterials.find((m) => m.id === ingId);
      const baseCost = mat ? mat.effectiveUnitCost : current.unitCost;
      const wasteFactor = 1 / (1 - Math.min(0.9, Math.max(0, wastePct / 100)));
      const adjustedUnitCost = Math.round(baseCost * wasteFactor * 100) / 100;
      const newTotal = Math.round(current.quantity * adjustedUnitCost * 100) / 100;

      items[index] = {
        ...current,
        unitCost: adjustedUnitCost,
        totalCost: newTotal,
        wastePercentage: wastePct,
      } as any;
      setDraftDish({ ...draftDish, recipeIngredients: items });
      setHasUnsavedChanges(true);
    }
  };

  // Remove Ingredient
  const handleRemoveIngredient = (ingId: string) => {
    if (!draftDish) return;
    const items = (draftDish.recipeIngredients || []).filter((i) => i.ingredientId !== ingId);
    setDraftDish({ ...draftDish, recipeIngredients: items });
    setHasUnsavedChanges(true);
  };

  // Add Ingredient from Raw Materials
  const handleAddIngredientToDraft = (material: RawMaterialItem) => {
    if (!draftDish) return;
    const items = [...(draftDish.recipeIngredients || [])];
    const existing = items.find((i) => i.ingredientId === material.id);

    if (existing) {
      handleSetIngredientQty(material.id, existing.quantity + 1);
    } else {
      const unit = material.consumptionUnit || 'جرام';
      const defaultQty = unit === 'جرام' ? 150 : unit === 'مل' ? 200 : 1;
      const lineCost = calculateIngredientLineCost({
        purchasePrice: material.purchasePrice || material.effectiveUnitCost || 0,
        purchaseUnit: material.purchaseUnit || 'كجم',
        recipeQuantity: defaultQty,
        recipeUnit: unit,
        wastePercentage: material.wastePercentage || 0,
      });

      items.push({
        ingredientId: material.id,
        ingredientNameAr: material.nameAr,
        ingredientNameEn: material.nameEn,
        quantity: defaultQty,
        unit: unit,
        unitCost: lineCost.unitCost,
        totalCost: lineCost.totalCost,
      });

      setDraftDish({ ...draftDish, recipeIngredients: items });
      setHasUnsavedChanges(true);
    }

    setIsAddIngredientOpen(false);
  };

  // In-Recipe Quick Material Creation
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
      currentStock: (quickMatUnit === 'كجم' || quickMatUnit === 'لتر' ? 1000 : 1) * quickMatStock,
      reorderPoint: 200,
      supplierName: 'مورد محلي',
    });

    await refreshMaterialsAndProducts();
    handleAddIngredientToDraft(newMat);

    setIsQuickAddMaterialOpen(false);
    setQuickMatNameAr('');
    showToast(`تمت إضافة الخامة «${newMat.nameAr}» وإدراجها بالوصفة ✓`);
  };

  // Safe Close Modal
  const handleCloseModal = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      setIsEditingModalOpen(false);
      setSelectedDish(null);
      setDraftDish(null);
    }
  };

  const handleConfirmDiscard = () => {
    setShowUnsavedWarning(false);
    setIsEditingModalOpen(false);
    setSelectedDish(null);
    setDraftDish(null);
    setHasUnsavedChanges(false);
  };

  // Toggle "Ready for Sale"
  const handleToggleReadyForSale = () => {
    if (!draftDish) return;
    const hasRecipe = draftDish.recipeIngredients && draftDish.recipeIngredients.length > 0;
    if (!hasRecipe && !draftDish.isActive) {
      setShowIncompleteRecipeModal(true);
      return;
    }
    setDraftDish({ ...draftDish, isActive: !draftDish.isActive });
    setHasUnsavedChanges(true);
  };

  // Quick Add Category from inline '+' buttons
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatNameAr.trim()) return;

    try {
      let parentId: string | null = null;
      if (categoryModalMode === 'sub') parentId = selectedMainCatId;
      if (categoryModalMode === 'class') parentId = selectedSubCatId;

      categoryService.addCategory(estId, {
        nameAr: newCatNameAr.trim(),
        nameEn: newCatNameAr.trim(),
        type: 'product',
        parentId,
      });

      refreshCategories();
      setCategoryModalMode(null);
      setNewCatNameAr('');
      showToast('تمت إضافة القسم بنجاح ✓');
    } catch (err: any) {
      setCatModalError(err.message || 'حدث خطأ أثناء إضافة القسم');
    }
  };

  return (
    <div className="space-y-6" data-testid="menu-recipe-module">
      {/* Toast Notification */}
      {generalToast && (
        <div className="fixed top-5 start-1/2 -translate-x-1/2 z-60 px-4 py-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{generalToast}</span>
        </div>
      )}

      {/* 8-Second Undo Toast */}
      {undoToast && (
        <div
          data-testid="undo-delete-toast"
          className="fixed bottom-6 start-1/2 -translate-x-1/2 z-60 px-4 py-3 rounded-2xl bg-slate-950 text-white border border-rose-500/50 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>تم حذف <strong>«{undoToast.dish.nameAr}»</strong> (متاح التراجع لمدة 8 ثوان)</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleUndoDelete}
            data-testid="undo-delete-button"
            className="gap-1 font-bold bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>تراجع الآن</span>
          </Button>
        </div>
      )}

      {/* 1. Journey Progress Bar */}
      <JourneyProgressBar
        currentStep={3}
        onSelectDishMissingRecipe={(dishId) => {
          const dish = menuProducts.find((p) => p.id === dishId);
          if (dish) handleOpenDish(dish, 'recipe');
        }}
      />

      {/* 2. Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              الوصفات (رسبي)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            بوابة كل منتجات المنشأة (أطباق ومخبوزات ومشروبات وحلويات): ربط المكونات، حساب التكلفة الحقيقية، وإعداد التسعير
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Tool «المكرر» */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDuplicatesModalOpen(true)}
            data-testid="open-duplicates-modal-button"
            className="gap-1.5 font-bold"
            title="فحص وتصفية المنتجات المكررة"
          >
            <GitMerge className="w-4 h-4 text-cyan-500" />
            <span>فحص المكرر</span>
          </Button>

          {/* "+ صنف جديد" Fast Add Button */}
          {canEdit && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              data-testid="add-new-dish-button"
              className="gap-1.5 font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>+ صنف جديد</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. 3-Level Category Tree Navigation & '+' buttons */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 space-y-3">
        {/* Row 1: Main Categories */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>الأقسام الرئيسية:</span>
            <button
              type="button"
              onClick={() => {
                setCategoryModalMode('main');
                setNewCatNameAr('');
                setCatModalError(null);
              }}
              data-testid="add-main-category-inline-btn"
              className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
            >
              <Plus className="w-3 h-3" />
              <span>+ قسم رئيسي</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedMainCatId('all');
                setSelectedSubCatId('all');
                setSelectedClassId('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedMainCatId === 'all'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              الكل ({menuProducts.length})
            </button>

            {mainCategories.map((main) => (
              <button
                key={main.id}
                type="button"
                data-testid={`main-cat-${main.id}`}
                onClick={() => {
                  setSelectedMainCatId(main.id);
                  setSelectedSubCatId('all');
                  setSelectedClassId('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedMainCatId === main.id
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {main.nameAr}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Subcategories (only when a main category is selected) */}
        {selectedMainCatId !== 'all' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span>الأقسام الفرعية:</span>
              <button
                type="button"
                onClick={() => {
                  setCategoryModalMode('sub');
                  setNewCatNameAr('');
                  setCatModalError(null);
                }}
                data-testid="add-subcategory-inline-btn"
                className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3 h-3" />
                <span>+ قسم فرعي</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubCatId('all');
                  setSelectedClassId('all');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedSubCatId === 'all'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                كل الفروع
              </button>

              {subCategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  data-testid={`sub-cat-${sub.id}`}
                  onClick={() => {
                    setSelectedSubCatId(sub.id);
                    setSelectedClassId('all');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedSubCatId === sub.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {sub.nameAr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Classifications (only when subcategory has children) */}
        {selectedSubCatId !== 'all' && classifications.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 me-1">التصنيفات:</span>
            {classifications.map((cl) => (
              <button
                key={cl.id}
                type="button"
                onClick={() => setSelectedClassId(cl.id)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  selectedClassId === cl.id
                    ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-500 hover:text-slate-900'
                }`}
              >
                {cl.nameAr}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="ابحث بالاسم أو المكونات أو القسم..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full ps-9 pe-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      {/* 4. Dishes Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDishes.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <ChefHat className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              لا توجد أصناف مسجلة في هذا الاختيار
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              اضغط على «+ صنف جديد» لإضافة طبق أو مشروب وتحديد مكوناته فوراً.
            </p>
          </div>
        ) : (
          filteredDishes.map((dish) => {
            const hasRecipe = dish.recipeIngredients && dish.recipeIngredients.length > 0;
            const profitAmount = Math.max(0, dish.sellingPrice - (dish.trueCost || 0));

            return (
              <div
                key={dish.id}
                data-testid={`dish-card-${dish.id}`}
                onClick={() => handleOpenDish(dish, 'info')}
                className="p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 text-start group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {dish.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      dish.isActive
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {dish.isActive ? 'متاح للبيع' : 'مسودة'}
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-cyan-500 transition-colors">
                    {dish.nameAr}
                  </h3>

                  <div className="flex items-center gap-2 text-xs">
                    {hasRecipe ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="w-3.5 h-3.5" />
                        <span>{dish.recipeIngredients.length} مكونات</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>ينقصه وصفة</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">سعر البيع</span>
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {dish.sellingPrice} ج.م
                    </strong>
                  </div>

                  {canViewFinancials && (
                    <div className="text-end">
                      <span className="text-[10px] text-slate-400 font-sans block">الربح المقدر</span>
                      <strong className={`font-bold ${
                        (dish.grossMarginPercentage || 0) >= 60
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {profitAmount.toFixed(1)} ج.م ({Math.round(dish.grossMarginPercentage || 0)}%)
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. Dish Details Modal / Drawer (4 Tabs) */}
      {isEditingModalOpen && draftDish && (
        <div
          data-testid="dish-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
        >
          <div className="w-full max-w-3xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-900 dark:text-slate-100">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <ChefHat className="w-5 h-5 text-cyan-500 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-base font-black truncate">{draftDish.nameAr}</h2>
                  <span className="text-[11px] text-slate-400">قسم: {draftDish.category}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCloneDish}
                      title="نسخ طبق"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirmModal(true)}
                      data-testid="delete-dish-btn"
                      title="حذف الطبق"
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

            {/* Save Status / Error Banner */}
            {saveErrorMsg && (
              <div className="p-3 mx-4 mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            {saveSuccessMsg && (
              <div className="p-3 mx-4 mt-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* 4 Tabs Bar */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 gap-2 sm:gap-4 text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setDishTab('info')}
                className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  dishTab === 'info'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:white'
                }`}
              >
                1. بيانات الطبق
              </button>

              <button
                type="button"
                onClick={() => setDishTab('recipe')}
                data-testid="dish-tab-recipe-button"
                className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  dishTab === 'recipe'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:white'
                }`}
              >
                2. الوصفة والمكونات
              </button>

              {canViewFinancials && (
                <button
                  type="button"
                  onClick={() => setDishTab('pricing')}
                  data-testid="dish-tab-pricing-button"
                  className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    dishTab === 'pricing'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:white'
                  }`}
                >
                  3. السعر والربح
                </button>
              )}

              <button
                type="button"
                onClick={() => setDishTab('history')}
                className={`py-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                  dishTab === 'history'
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:white'
                }`}
              >
                4. سجل التعديلات
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* Tab 1: Info */}
              {dishTab === 'info' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        اسم الطبق أو المشروب بالعربية:
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={draftDish.nameAr}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, nameAr: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        القسم:
                      </label>
                      <select
                        disabled={!canEdit}
                        value={draftDish.category}
                        onChange={(e) => {
                          setDraftDish({ ...draftDish, category: e.target.value });
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                      >
                        {productCategories.filter((c) => c.active).map((c) => (
                          <option key={c.id} value={c.nameAr}>
                            {c.nameAr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        محطة التحضير (KDS):
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
                        وقت التحضير (دقائق):
                      </label>
                      <NumericInput
                        disabled={!canEdit}
                        value={draftDish.directLaborMinutes || 10}
                        onChange={(m) => {
                          setDraftDish({ ...draftDish, directLaborMinutes: m });
                          setHasUnsavedChanges(true);
                        }}
                        min={1}
                        step={1}
                        unit="دقيقة"
                        showSteppers={true}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        سعر البيع للجمهور (ج.م):
                      </label>
                      <NumericInput
                        disabled={!canEdit}
                        value={draftDish.sellingPrice}
                        onChange={(p) => {
                          setDraftDish({ ...draftDish, sellingPrice: p });
                          setHasUnsavedChanges(true);
                        }}
                        min={0}
                        step={5}
                        unit="ج.م"
                        showSteppers={true}
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        حالة العرض والبيع:
                      </label>
                      <Button
                        type="button"
                        variant={draftDish.isActive ? 'primary' : 'outline'}
                        onClick={handleToggleReadyForSale}
                        className="w-full justify-center font-bold"
                      >
                        {draftDish.isActive ? 'جاهز للبيع في الكاشير والمنيو' : 'غير متاح للبيع (مسودة)'}
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setDishTab('recipe')}
                      className="font-bold"
                    >
                      <span>التالي: تحديد مقادير الوصفة</span>
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
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddIngredientOpen(true)}
                      data-testid="add-recipe-ingredient-button"
                      className="font-bold"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ أضف مكوناً للطبق</span>
                    </Button>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold">عدد الحصص (وجبة):</span>
                      <div className="w-28">
                        <NumericInput
                          value={draftDish.servingsYield || 1}
                          onChange={(y) => {
                            setDraftDish({ ...draftDish, servingsYield: Math.max(1, y) });
                            setHasUnsavedChanges(true);
                          }}
                          min={1}
                          step={1}
                          showSteppers={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Ingredients Cards List (With NumericInput typing) */}
                  <div className="space-y-2.5">
                    {(!draftDish.recipeIngredients || draftDish.recipeIngredients.length === 0) ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 space-y-2">
                        <ChefHat className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                        <div className="font-bold text-slate-600 dark:text-slate-300">
                          لا توجد مكونات في هذا الطبق بعد
                        </div>
                        <p className="text-[11px]">
                          اضغط على «+ أضف مكوناً» لاختيار الخامات من المستودع أو إضافة خامة جديدة فوراً.
                        </p>
                      </div>
                    ) : (
                      draftDish.recipeIngredients.map((item) => (
                        <div
                          key={item.ingredientId}
                          data-testid={`ingredient-row-${item.ingredientId}`}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white truncate">
                              {item.ingredientNameAr}
                            </h4>
                            <div className="text-[11px] text-slate-400">
                              <span>الوحدة: {item.unit}</span>
                              {canViewFinancials && (
                                <>
                                  <span className="mx-1.5">·</span>
                                  <span>سعر الوحدة: {item.unitCost} ج.م</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Numeric Keyboard Typing & Optional Steppers */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                            <div className="w-32">
                              <NumericInput
                                value={item.quantity}
                                onChange={(q) => handleSetIngredientQty(item.ingredientId, q)}
                                min={0.001}
                                step={item.unit === 'جرام' || item.unit === 'مل' ? 10 : 1}
                                unit={item.unit}
                                showSteppers={true}
                              />
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
                  <div className="p-3.5 rounded-xl bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <PackageIcon className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          مواد التعبئة والتغليف (علب، أكياس، مناديل):
                        </span>
                        <span className="text-[10px] text-slate-400">
                          تضاف مباشرة لتكلفة الوجبة
                        </span>
                      </div>
                    </div>
                    {canViewFinancials && (
                      <div className="w-32">
                        <NumericInput
                          value={draftDish.consumablesCost || 0}
                          onChange={(c) => {
                            setDraftDish({ ...draftDish, consumablesCost: c });
                            setHasUnsavedChanges(true);
                          }}
                          min={0}
                          step={0.5}
                          unit="ج.م"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Price & Profit (Financials) */}
              {dishTab === 'pricing' && canViewFinancials && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-slate-500 block mb-1">سعر البيع الحالي</span>
                      <strong className="text-xl font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(draftDish.sellingPrice)}
                      </strong>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-slate-500 block mb-1">التكلفة الحقيقية الصافية</span>
                      <strong className="text-xl font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(draftDish.trueCost || 0)}
                      </strong>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      <span className="text-slate-500 block mb-1">نسبة هامش الربح</span>
                      <strong className={`text-xl font-mono font-black ${
                        (draftDish.grossMarginPercentage || 0) >= 60
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}>
                        {Math.round(draftDish.grossMarginPercentage || 0)}%
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">
                      تعديل نسبة الربح المستهدفة والسعر المقترح:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-500 block mb-1 font-bold">الهامش المستهدف (%):</label>
                        <NumericInput
                          value={draftDish.targetMarginPercentage || 65}
                          onChange={(m) => {
                            setDraftDish({ ...draftDish, targetMarginPercentage: m });
                            setHasUnsavedChanges(true);
                          }}
                          min={1}
                          max={99}
                          unit="%"
                          showSteppers={true}
                        />
                      </div>

                      <div>
                        <label className="text-slate-500 block mb-1 font-bold">السعر المقترح حسابياً:</label>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">
                          {formatCurrency(draftDish.suggestedPrice || draftDish.sellingPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: History */}
              {dishTab === 'history' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                      سجل التعديلات والعمليات:
                    </span>
                    <p className="text-[11px] text-slate-500">
                      كل تعديل على الوصفة أو السعر يوثق تلقائياً مع اسم المستخدم والتوقيت.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {(!draftDish.auditHistory || draftDish.auditHistory.length === 0) ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        لا توجد تعديلات سابقة مسجلة لهذا الصنف.
                      </div>
                    ) : (
                      draftDish.auditHistory.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {item.action}
                            </span>
                            <span className="text-[11px] text-slate-500">{item.details}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {item.timestamp} · {item.user}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Bar: Cost Summary & Action Buttons */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-4 text-xs">
                {canViewFinancials ? (
                  <>
                    <div>
                      <span className="text-slate-400 block">التكلفة للوجبة:</span>
                      <strong className="font-mono text-slate-900 dark:text-white font-bold text-sm">
                        {formatCurrency(draftDish.trueCost || 0)}
                      </strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block">نسبة الربح:</span>
                      <strong className={`font-mono font-bold text-sm ${
                        (draftDish.grossMarginPercentage || 0) >= 60
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}>
                        {Math.round(draftDish.grossMarginPercentage || 0)}%
                      </strong>
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="text-slate-400 block">عدد المكونات:</span>
                    <strong className="font-mono text-slate-900 dark:text-white font-bold text-sm">
                      {draftDish.recipeIngredients?.length || 0}
                    </strong>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCloseModal}>
                  إلغاء
                </Button>

                {canEdit && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={handleSaveDraft}
                    data-testid="save-dish-changes-button"
                    className="font-bold px-4"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ الوصفة'}</span>
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
              <h3 className="text-sm font-bold">اختر خامة لإضافتها للوصفة</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddIngredientOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث في الخامات..."
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setIsQuickAddMaterialOpen(true)}
                className="gap-1 font-bold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>خامة جديدة</span>
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
              {rawMaterials
                .filter((m) =>
                  m.nameAr.toLowerCase().includes(ingredientSearch.toLowerCase()) ||
                  m.nameEn.toLowerCase().includes(ingredientSearch.toLowerCase())
                )
                .map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => handleAddIngredientToDraft(mat)}
                    className="w-full p-2.5 rounded-xl flex items-center justify-between text-start hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer text-xs"
                  >
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">{mat.nameAr}</span>
                      <span className="text-[10px] text-slate-400">الوحدة: {mat.consumptionUnit}</span>
                    </div>
                    {canViewFinancials && (
                      <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                        {mat.effectiveUnitCost} ج.م / {mat.consumptionUnit}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* In-Recipe Quick Material Creation Modal */}
      {isQuickAddMaterialOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold">إضافة خامة سريعة للوصفة</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsQuickAddMaterialOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveQuickMaterial} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">اسم الخامة:</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: لحم مفروم بلدي..."
                  value={quickMatNameAr}
                  onChange={(e) => setQuickMatNameAr(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">وحدة الشراء:</label>
                  <select
                    value={quickMatUnit}
                    onChange={(e) => setQuickMatUnit(e.target.value)}
                    className="w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <option value="كجم">كجم</option>
                    <option value="لتر">لتر</option>
                    <option value="قطعة">قطعة</option>
                    <option value="علبة">علبة</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">سعر الشراء (ج.م):</label>
                  <NumericInput
                    value={quickMatPrice}
                    onChange={setQuickMatPrice}
                    min={0}
                    step={1}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsQuickAddMaterialOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
                  حفظ وإدراج بالوصفة
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fast "+ صنف جديد" Dialog */}
      {isNewDishModalOpen && (
        <ModalShell
          isOpen={true}
          onClose={() => setIsNewDishModalOpen(false)}
          title="إضافة صنف جديد"
          subtitle="سجل الاسم الأساسي وسينتقل بك النموذج فوراً لإضافة مقادير الوصفة"
          size="md"
        >
          <form onSubmit={handleConfirmCreateDish} className="space-y-4 text-xs">
            {newDishError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{newDishError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                اسم الصنف أو الطبق بالعربية <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                required
                data-testid="new-dish-name-input"
                placeholder="مثال: شيش طاووق، بيتزا مارغريتا..."
                value={newDishNameAr}
                onChange={(e) => setNewDishNameAr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">القسم (مُعبّأ تلقائياً):</label>
                <select
                  value={newDishCategory}
                  onChange={(e) => setNewDishCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
                >
                  {productCategories.filter((c) => c.active).map((c) => (
                    <option key={c.id} value={c.nameAr}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">سعر البيع المقترح (ج.م):</label>
                <NumericInput
                  value={newDishPrice}
                  onChange={setNewDishPrice}
                  min={0}
                  step={5}
                  unit="ج.م"
                  showSteppers={true}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsNewDishModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                data-testid="confirm-add-dish-btn"
                className="font-bold"
              >
                <span>إنشاء والبدء في المكونات</span>
                {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Inline Quick Add Category Modal */}
      {categoryModalMode && (
        <ModalShell
          isOpen={true}
          onClose={() => setCategoryModalMode(null)}
          title={
            categoryModalMode === 'main'
              ? 'إضافة قسم رئيسي للمنتجات'
              : categoryModalMode === 'sub'
              ? 'إضافة قسم فرعي'
              : 'إضافة تصنيف'
          }
          subtitle="أدخل اسم القسم وسينضم لشجرة الأقسام فوراً"
          size="sm"
        >
          <form onSubmit={handleAddCategorySubmit} className="space-y-3 text-xs">
            {catModalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold">
                {catModalError}
              </div>
            )}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 dark:text-slate-300">اسم القسم:</label>
              <input
                type="text"
                autoFocus
                required
                data-testid="inline-category-name-input"
                placeholder="مثال: مشويات، بيتزا، مشروبات مثلجة..."
                value={newCatNameAr}
                onChange={(e) => setNewCatNameAr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setCategoryModalMode(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" data-testid="save-inline-cat-btn" className="font-bold">
                حفظ
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && draftDish && (
        <ModalShell
          isOpen={true}
          onClose={() => setShowDeleteConfirmModal(false)}
          title={`متأكد من حذف «${draftDish.nameAr}»؟`}
          subtitle="سيتم حذف الطبق مع إمكانية التراجع لمدة 8 ثوان"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              هل تريد بالتأكيد حذف الصنف <strong>«{draftDish.nameAr}»</strong> من قسم [<strong>{draftDish.category}</strong>]؟
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteConfirmModal(false)}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                data-testid="confirm-delete-dish-btn"
                onClick={handleConfirmDeleteDish}
                className="font-bold"
              >
                تأكيد الحذف
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <ModalShell
          isOpen={true}
          onClose={() => setShowUnsavedWarning(false)}
          title="تنبيه: توجد تعديلات غير محفوظة"
          subtitle="هل تريد الخروج وتجاهل التعديلات التي قمت بها؟"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              إذا خرجت الآن دون الضغط على «حفظ الوصفة»، فستفقد التعديلات الأخيرة التي أدخلتها.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowUnsavedWarning(false)}>
                متابعة التعديل
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleConfirmDiscard} className="font-bold">
                تجاهل والخروج
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Incomplete Recipe Modal Warning before Sales activation */}
      {showIncompleteRecipeModal && (
        <ModalShell
          isOpen={true}
          onClose={() => setShowIncompleteRecipeModal(false)}
          title="تنبيه: الطبق ينقصه وصفة"
          subtitle="لم تسجل مكونات هذا الصنف بعد"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              هذا الطبق لا يحتوي على أي مكونات خامات بعد. إتاحته للبيع الآن سيمنع الخصم التلقائي للمخزون وحساب التكلفة الدقيقة. هل تريد إتاحته على أي حال؟
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowIncompleteRecipeModal(false)}>
                إكمال الوصفة أولاً
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setShowIncompleteRecipeModal(false);
                  if (draftDish) {
                    setDraftDish({ ...draftDish, isActive: true });
                    setHasUnsavedChanges(true);
                  }
                }}
                className="font-bold"
              >
                تأكيد الإتاحة للبيع
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Duplicates Resolver Modal */}
      <DuplicatesResolverModal
        isOpen={isDuplicatesModalOpen}
        onClose={() => setIsDuplicatesModalOpen(false)}
        products={menuProducts}
        onMerge={async (master, duplicatesToDelete) => {
          for (const dupId of duplicatesToDelete) {
            await deleteProduct(dupId);
          }
        }}
        onDeleteDuplicate={async (dupId) => {
          await deleteProduct(dupId);
        }}
      />
    </div>
  );
};
