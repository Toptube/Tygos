/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 3-STEP PRODUCT & RECIPE BUILDER WIZARD (إضافة منتج وبناء الوصفة بثلاث خطوات)
 * Step 1: Name, Category, Selling Price
 * Step 2: Recipe Bill of Materials (BOM) with inline "Add New Ingredient" child modal
 * Step 3: True Cost Breakdown, Margin Preview, Color-Coded Health Check, and Target Price Suggestion
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../common/Button.tsx';
import {
  X,
  ArrowRight,
  ArrowLeft,
  ChefHat,
  Search,
  Plus,
  Trash2,
  Scale,
  Sparkles,
  CheckCircle2,
  Copy,
  Layers,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { dataService, RawMaterialItem, MenuItemProduct } from '../../services/dataService.ts';
import { AddIngredientQuickModal } from '../inventory/AddIngredientQuickModal.tsx';
import {
  calculateRecipeTrueCost,
  calculateFoodCostPercentage,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
} from '../../domain/formulas.ts';

interface AddProductWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: (product: MenuItemProduct) => void;
  establishmentId: string;
  availableMaterials: RawMaterialItem[];
  onRefreshMaterials?: () => void;
}

export const AddProductWizardModal: React.FC<AddProductWizardModalProps> = ({
  isOpen,
  onClose,
  onProductCreated,
  establishmentId,
  availableMaterials = [],
  onRefreshMaterials,
}) => {
  const { t, language } = useI18n();
  const isAr = language === 'ar';

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Product Basic Details
  const [productCode, setProductCode] = useState(`PRD-${Math.floor(100 + Math.random() * 900)}`);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState(isAr ? 'أطباق رئيسية' : 'Main Courses');
  const [sellingPrice, setSellingPrice] = useState<string>('24.00');
  const [targetMargin, setTargetMargin] = useState<string>('70');

  // Step 2: Recipe Builder
  const [recipeItems, setRecipeItems] = useState<
    Array<{ ingredientId: string; quantity: number }>
  >([]);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [laborMinutes, setLaborMinutes] = useState<string>('12');
  const [laborHourlyRate, setLaborHourlyRate] = useState<string>('15.00');
  const [wasteBuffer, setWasteBuffer] = useState<string>('0.50');
  const [utilitiesCost, setUtilitiesCost] = useState<string>('0.80');
  const [consumablesCost, setConsumablesCost] = useState<string>('0.40');

  // Child modal for adding raw materials inline without losing recipe state
  const [isChildMaterialModalOpen, setIsChildMaterialModalOpen] = useState(false);

  // Variants state (Small / Large)
  const [enableVariants, setEnableVariants] = useState(false);

  // Calculate ingredients live
  const populatedRecipe = useMemo(() => {
    return recipeItems.map((item) => {
      const mat = availableMaterials.find((m) => m.id === item.ingredientId);
      const unitCost = mat?.effectiveUnitCost || 0.01;
      const totalCost = Number((unitCost * item.quantity).toFixed(2));
      return {
        ingredientId: item.ingredientId,
        ingredientNameAr: mat?.nameAr || 'خامة',
        ingredientNameEn: mat?.nameEn || 'Ingredient',
        quantity: item.quantity,
        unit: mat?.consumptionUnit || 'جرام',
        unitCost,
        totalCost,
      };
    });
  }, [recipeItems, availableMaterials]);

  const rawMaterialsTotalCost = useMemo(() => {
    return populatedRecipe.reduce((acc, cur) => acc + cur.totalCost, 0);
  }, [populatedRecipe]);

  // Step 3 Live Calculations
  const liveCostAnalysis = useMemo(() => {
    const price = parseFloat(sellingPrice) || 0;
    const lMin = parseFloat(laborMinutes) || 0;
    const lRate = parseFloat(laborHourlyRate) || 0;
    const waste = parseFloat(wasteBuffer) || 0;
    const utils = parseFloat(utilitiesCost) || 0;
    const pack = parseFloat(consumablesCost) || 0;
    const target = parseFloat(targetMargin) || 70;

    const result = calculateRecipeTrueCost({
      rawIngredientsCost: rawMaterialsTotalCost,
      wasteLossBuffer: waste,
      packagingCost: pack,
      directLaborMinutes: lMin,
      laborHourlyRate: lRate,
      utilitiesAllocation: {
        gas: utils * 0.4,
        electricity: utils * 0.4,
        water: utils * 0.2,
      },
      portionsYield: 1,
    });

    const trueCost = result.costPerPortion;
    const foodCostPct = calculateFoodCostPercentage(trueCost, price);
    const grossMarginPct = calculateGrossMargin(price, trueCost);
    const suggestedPrice = calculateSuggestedSellingPrice(trueCost, target);

    return {
      trueCost,
      foodCostPct,
      grossMarginPct,
      suggestedPrice,
      rawCost: result.rawAndWasteCost,
      laborCost: result.laborCost,
      utilitiesCost: result.utilitiesCost,
      packagingCost: result.packagingAndConsumables,
    };
  }, [
    rawMaterialsTotalCost,
    sellingPrice,
    laborMinutes,
    laborHourlyRate,
    wasteBuffer,
    utilitiesCost,
    consumablesCost,
    targetMargin,
  ]);

  // Search filtered materials for step 2
  const filteredMaterials = useMemo(() => {
    if (!materialSearchQuery.trim()) return availableMaterials.slice(0, 8);
    const q = materialSearchQuery.toLowerCase();
    return availableMaterials.filter(
      (m) => m.nameAr.toLowerCase().includes(q) || m.nameEn.toLowerCase().includes(q)
    );
  }, [availableMaterials, materialSearchQuery]);

  const handleAddIngredientRow = (mat: RawMaterialItem) => {
    if (recipeItems.some((r) => r.ingredientId === mat.id)) return;
    setRecipeItems([...recipeItems, { ingredientId: mat.id, quantity: 100 }]);
  };

  const handleUpdateIngredientQty = (ingredientId: string, qty: number) => {
    setRecipeItems(
      recipeItems.map((r) => (r.ingredientId === ingredientId ? { ...r, quantity: Math.max(1, qty) } : r))
    );
  };

  const handleRemoveIngredientRow = (ingredientId: string) => {
    setRecipeItems(recipeItems.filter((r) => r.ingredientId !== ingredientId));
  };

  // Called when child modal adds a new raw material
  const handleChildMaterialAdded = (newMat: RawMaterialItem) => {
    if (onRefreshMaterials) onRefreshMaterials();
    // Auto add to current recipe
    setRecipeItems((prev) => [...prev, { ingredientId: newMat.id, quantity: 150 }]);
    setIsChildMaterialModalOpen(false);
  };

  const handleSaveProduct = async () => {
    if (!nameAr.trim() && !nameEn.trim()) return;

    const variants = enableVariants
      ? [
          { id: 'v-sml', nameAr: 'حجم عادي', nameEn: 'Regular', priceMultiplier: 1.0, price: parseFloat(sellingPrice) || 20 },
          { id: 'v-lrg', nameAr: 'حجم عائلي كبير', nameEn: 'Large Size', priceMultiplier: 1.5, price: (parseFloat(sellingPrice) || 20) * 1.5 },
        ]
      : undefined;

    const newProd = await dataService.addProductWithRecipe(establishmentId, {
      code: productCode,
      nameAr: nameAr.trim() || nameEn.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      category,
      sellingPrice: parseFloat(sellingPrice) || 20,
      targetMarginPercentage: parseFloat(targetMargin) || 70,
      isActive: true,
      recipeIngredients: populatedRecipe,
      directLaborMinutes: parseFloat(laborMinutes) || 10,
      laborHourlyRate: parseFloat(laborHourlyRate) || 15,
      wasteLossBuffer: parseFloat(wasteBuffer) || 0.5,
      utilitiesCost: parseFloat(utilitiesCost) || 0.8,
      consumablesCost: parseFloat(consumablesCost) || 0.4,
      variants,
    });

    if (onProductCreated) {
      onProductCreated(newProd);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
        <div className="w-full max-w-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? 'معالج إضافة منتج وبناء الوصفة (BOM)' : '3-Step Product & Recipe Builder'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {step === 1 && (isAr ? 'الخطوة ١: البيانات الأساسية والتسعير' : 'Step 1: Basic Info & Selling Price')}
                  {step === 2 && (isAr ? 'الخطوة ٢: تركيب الوصفة وخامات الإعداد' : 'Step 2: Recipe Ingredients BOM')}
                  {step === 3 && (isAr ? 'الخطوة ٣: المعاينة الحية وهوامش الربح' : 'Step 3: True Cost & Margin Analysis')}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Step Progress Bar */}
          <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold">
            <Button
              type="button"
              onClick={() => setStep(1)}
              className={`py-2.5 transition-colors cursor-pointer border-b-2 ${
                step === 1 ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5' : 'border-transparent text-slate-400'
              }`}
            >
              1. {isAr ? 'بيانات الصنف' : 'Basic Info'}
            </Button>
            <Button
              type="button"
              onClick={() => setStep(2)}
              className={`py-2.5 transition-colors cursor-pointer border-b-2 ${
                step === 2 ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5' : 'border-transparent text-slate-400'
              }`}
            >
              2. {isAr ? 'تركيب الوصفة' : 'BOM Recipe'}
            </Button>
            <Button
              type="button"
              onClick={() => setStep(3)}
              className={`py-2.5 transition-colors cursor-pointer border-b-2 ${
                step === 3 ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5' : 'border-transparent text-slate-400'
              }`}
            >
              3. {isAr ? 'التكلفة والربحية' : 'True Cost & Margin'}
            </Button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* STEP 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'كود الصنف' : 'Product Code'}
                    </label>
                    <input
                      type="text"
                      value={productCode}
                      onChange={(e) => setProductCode(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'التصنيف' : 'Category'}
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="أطباق رئيسية">{isAr ? 'أطباق رئيسية' : 'Main Courses'}</option>
                      <option value="مقبلات وشوربات">{isAr ? 'مقبلات وشوربات' : 'Appetizers & Soups'}</option>
                      <option value="بيتزا وباستا">{isAr ? 'بيتزا وباستا' : 'Pizza & Pasta'}</option>
                      <option value="مشروبات ساخنة">{isAr ? 'مشروبات ساخنة' : 'Hot Beverages'}</option>
                      <option value="مشروبات مثلجة">{isAr ? 'مشروبات مثلجة' : 'Cold Beverages'}</option>
                      <option value="حلويات">{isAr ? 'حلويات ومعجنات' : 'Desserts'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'اسم الصنف بالعربية' : 'Arabic Name'} *
                    </label>
                    <input
                      type="text"
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      placeholder={isAr ? 'مثال: باستا تروفل ألفريدو' : 'Arabic Name'}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'اسم الصنف بالإنجليزية' : 'English Name'} *
                    </label>
                    <input
                      type="text"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder="e.g. Truffle Alfredo Pasta"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'سعر البيع المقترح في المنيو ($)' : 'Selling Price ($)'} *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'هامش الربح المستهدف (%)' : 'Target Gross Margin (%)'}
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="90"
                      value={targetMargin}
                      onChange={(e) => setTargetMargin(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Enable variants checkbox */}
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={enableVariants}
                      onChange={(e) => setEnableVariants(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <Layers className="w-3.5 h-3.5 text-cyan-500" />
                    <span>
                      {isAr
                        ? 'إنشاء أحجام تلقائية (حجم عادي / حجم كبير 1.5x) من نفس الوصفة'
                        : 'Generate size variants (Regular / Large 1.5x) from this recipe'}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Recipe Builder */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                {/* Search & Add Material bar + New Raw Material button */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={materialSearchQuery}
                      onChange={(e) => setMaterialSearchQuery(e.target.value)}
                      placeholder={isAr ? 'ابحث في الخامات المتاحة لإضافتها للوصفة...' : 'Search raw materials to add...'}
                      className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => setIsChildMaterialModalOpen(true)}
                    className="px-3 py-2 text-xs font-bold rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? 'خامة جديدة' : 'New Ingredient'}</span>
                  </Button>
                </div>

                {/* Available Ingredients Quick Chips */}
                {filteredMaterials.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      {isAr ? 'انقر لإضافة الخامة إلى الوصفة:' : 'Tap to add to recipe:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {filteredMaterials.map((mat) => {
                        const isAdded = recipeItems.some((r) => r.ingredientId === mat.id);
                        return (
                          <Button
                            key={mat.id}
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleAddIngredientRow(mat)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isAdded
                                ? 'opacity-40 bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-cyan-500 hover:text-cyan-400'
                            }`}
                          >
                            <span>{isAr ? mat.nameAr : mat.nameEn}</span>
                            <span className="font-mono text-[10px] opacity-70">
                              (${mat.effectiveUnitCost.toFixed(3)}/{mat.consumptionUnit})
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Recipe Ingredients Table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{isAr ? 'مكونات الطبق المحددة (BOM):' : 'Configured Recipe Items (BOM):'}</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400">
                      {isAr ? 'إجمالي الخامات:' : 'Raw Total:'} ${rawMaterialsTotalCost.toFixed(2)}
                    </span>
                  </div>

                  {populatedRecipe.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                      {isAr
                        ? 'لم يتم تحديد أي خامات بعد. اختر من الأعلى أو أضف خامة جديدة.'
                        : 'No ingredients added yet. Select from above or create a new one.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {populatedRecipe.map((item) => (
                        <div
                          key={item.ingredientId}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {isAr ? item.ingredientNameAr : item.ingredientNameEn}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              ${item.unitCost.toFixed(4)} / {item.unit}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateIngredientQty(item.ingredientId, parseFloat(e.target.value) || 1)
                              }
                              className="w-20 px-2 py-1 text-xs font-mono text-center rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none"
                            />
                            <span className="text-[11px] text-slate-400 w-10 truncate">{item.unit}</span>
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 w-14 text-end" dir="ltr">
                              ${item.totalCost.toFixed(2)}
                            </span>
                            <Button
                              type="button"
                              onClick={() => handleRemoveIngredientRow(item.ingredientId)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Direct Labor and Utilities Parameters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      {isAr ? 'وقت التحضير (دقيقة)' : 'Prep Time (min)'}
                    </label>
                    <input
                      type="number"
                      value={laborMinutes}
                      onChange={(e) => setLaborMinutes(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      {isAr ? 'أجر العمالة ($/ساعة)' : 'Labor Rate ($/h)'}
                    </label>
                    <input
                      type="number"
                      value={laborHourlyRate}
                      onChange={(e) => setLaborHourlyRate(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      {isAr ? 'غاز وكهرباء ومياه ($)' : 'Utilities ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={utilitiesCost}
                      onChange={(e) => setUtilitiesCost(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                      {isAr ? 'تغليف ومستهلكات ($)' : 'Packaging ($)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={consumablesCost}
                      onChange={(e) => setConsumablesCost(e.target.value)}
                      className="w-full px-2 py-1 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Live Preview & Margin Analysis */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                {/* Health color banner */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    liveCostAnalysis.grossMarginPct >= 65
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : liveCostAnalysis.grossMarginPct >= 55
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Scale className="w-6 h-6 shrink-0" />
                    <div>
                      <div className="text-sm font-black">
                        {liveCostAnalysis.grossMarginPct >= 65 && (isAr ? 'هامش ربح ممتاز وصحي' : 'Excellent Healthy Margin')}
                        {liveCostAnalysis.grossMarginPct >= 55 && liveCostAnalysis.grossMarginPct < 65 && (isAr ? 'هامش ربح مقبول' : 'Acceptable Margin')}
                        {liveCostAnalysis.grossMarginPct < 55 && (isAr ? 'تنبيه: تكلفة مرتفعة أو تسعير منخفض' : 'Warning: High Cost / Underpriced')}
                      </div>
                      <div className="text-xs opacity-80 mt-0.5">
                        {isAr
                          ? `هامش الربح: ${liveCostAnalysis.grossMarginPct}% · نسبة تكلفة الطعام: ${liveCostAnalysis.foodCostPct}%`
                          : `Gross Margin: ${liveCostAnalysis.grossMarginPct}% · Food Cost: ${liveCostAnalysis.foodCostPct}%`}
                      </div>
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="text-2xl font-black font-mono" dir="ltr">
                      ${liveCostAnalysis.trueCost.toFixed(2)}
                    </span>
                    <span className="text-[10px] block opacity-75">{isAr ? 'التكلفة الشاملة للوجبة' : 'True Portion Cost'}</span>
                  </div>
                </div>

                {/* Cost Decomposition Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'المواد الخام الصافية' : 'Raw Materials'}</span>
                    <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                      ${liveCostAnalysis.rawCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'العمالة المباشرة' : 'Direct Labor'}</span>
                    <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                      ${liveCostAnalysis.laborCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'المنافع (غاز/كهرباء)' : 'Utilities'}</span>
                    <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                      ${liveCostAnalysis.utilitiesCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'التغليف والمستهلكات' : 'Packaging'}</span>
                    <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                      ${liveCostAnalysis.packagingCost.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Target Price Recommendation */}
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {isAr ? 'السعر المقترح لتحقيق هامشك المستهدف:' : 'Recommended Selling Price for Target Margin:'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isAr
                        ? `بناءً على تكلفة $${liveCostAnalysis.trueCost.toFixed(2)} وهامش مستهدف ${targetMargin}%`
                        : `Based on $${liveCostAnalysis.trueCost.toFixed(2)} cost and ${targetMargin}% margin`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                      ${liveCostAnalysis.suggestedPrice.toFixed(2)}
                    </span>
                    <Button
                      type="button"
                      onClick={() => setSellingPrice(liveCostAnalysis.suggestedPrice.toFixed(2))}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 cursor-pointer"
                    >
                      {isAr ? 'اعتماد' : 'Apply'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            {step > 1 ? (
              <Button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span>{t('common.back', 'Back')}</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {t('common.cancel', 'Cancel')}
              </Button>
            )}

            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((step + 1) as 2 | 3)}
                className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-cyan-900/30"
              >
                <span>{t('common.continue', 'Continue')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSaveProduct}
                className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-900/40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'اعتماد الصنف والوصفة' : 'Save Product & Recipe'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Child Quick Raw Material Modal (without losing recipe builder state!) */}
      {isChildMaterialModalOpen && (
        <AddIngredientQuickModal
          isOpen={isChildMaterialModalOpen}
          onClose={() => setIsChildMaterialModalOpen(false)}
          onIngredientAdded={handleChildMaterialAdded}
          establishmentId={establishmentId}
          existingIngredients={availableMaterials}
        />
      )}
    </>
  );
};
