/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * INVENTORY & RAW MATERIALS MODULE (الخامات والمخزون)
 * Seamless journey tracking, raw material cards, dish usage link,
 * and price-change impact calculation.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../common/Button.tsx';
import {
  Package,
  Layers,
  ArrowRightLeft,
  Search,
  Building,
  Plus,
  AlertTriangle,
  X,
  Boxes,
  TrendingUp,
  ChefHat,
  Eye,
  Edit2,
  Check,
} from 'lucide-react';
import { MOCK_STOCK_BALANCES, MOCK_WAREHOUSES } from '../../data/mockData.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { JourneyProgressBar } from '../costcontrol/JourneyProgressBar.tsx';
import { RawMaterialItem } from '../../services/dataService.ts';

export const InventoryModule: React.FC = () => {
  const { t, formatCurrency, language } = useI18n();
  const isAr = language === 'ar';
  const { setActiveView } = useAuth();
  const {
    rawMaterials,
    menuProducts,
    setIsAddIngredientModalOpen,
    updateRawMaterial,
  } = useBusiness();

  const [activeTab, setActiveTab] = useState<'materials' | 'balances'>('materials');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer Modal
  const [transferModal, setTransferModal] = useState(false);
  const [transferSource, setTransferSource] = useState('wh-1');
  const [transferDest, setTransferDest] = useState('wh-2');
  const [transferItem, setTransferItem] = useState('');
  const [transferQty, setTransferQty] = useState('10');
  const [toastMessage, setToastMessage] = useState('');

  // Dish Usage Modal (تستخدم في كام طبق؟)
  const [usageMat, setUsageMat] = useState<RawMaterialItem | null>(null);

  // Price Impact Modal (تنبيه أثر تغيير السعر)
  const [editingMat, setEditingMat] = useState<RawMaterialItem | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [showImpactModal, setShowImpactModal] = useState(false);

  // Filter raw materials
  const filteredMaterials = useMemo(() => {
    return rawMaterials.filter((m) => {
      const q = searchQuery.toLowerCase();
      return (
        m.nameAr.toLowerCase().includes(q) ||
        m.nameEn.toLowerCase().includes(q) ||
        (m.category && m.category.toLowerCase().includes(q))
      );
    });
  }, [rawMaterials, searchQuery]);

  // Map each material to the dishes that use it
  const materialDishesMap = useMemo(() => {
    const map: Record<string, typeof menuProducts> = {};
    for (const mat of rawMaterials) {
      map[mat.id] = menuProducts.filter((p) =>
        (p.recipeIngredients || []).some((item) => item.ingredientId === mat.id)
      );
    }
    return map;
  }, [rawMaterials, menuProducts]);

  // Open Edit Price & Check Impact
  const handleOpenPriceEdit = (mat: RawMaterialItem) => {
    setEditingMat(mat);
    setNewPrice(mat.purchasePrice);
    setShowImpactModal(false);
  };

  // Preview Impact of price change
  const affectedDishes = useMemo(() => {
    if (!editingMat) return [];
    return materialDishesMap[editingMat.id] || [];
  }, [editingMat, materialDishesMap]);

  // Save new material price
  const handleSaveMaterialPrice = async () => {
    if (!editingMat) return;
    const updated: RawMaterialItem = {
      ...editingMat,
      purchasePrice: newPrice,
    };
    await updateRawMaterial(updated);
    setEditingMat(null);
    setShowImpactModal(false);
    setToastMessage(isAr ? `تم تحديث سعر [${editingMat.nameAr}] بنجاح` : `Updated price for [${editingMat.nameEn}]`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Journey Progress Bar */}
      <JourneyProgressBar currentStep={1} />

      {/* 2. Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <span>{isAr ? 'الخامات والمخزون' : 'Raw Materials & Stock'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'متابعة أرصدة الخامات، ربطها بالأطباق، وتنبيهات أثر تغيير الأسعار على الأرباح'
              : 'Track raw material stocks, links to dishes, and price impact on profitability'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsAddIngredientModalOpen(true)}
            data-testid="add-raw-material-button"
            className="font-bold shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? '+ خامة جديدة' : '+ New Material'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTransferModal(true)}
            className="text-xs font-semibold"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{isAr ? 'تحويل بين المستودعات' : 'Transfer Stock'}</span>
          </Button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center justify-between animate-fade-in font-bold">
          <span>{toastMessage}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setToastMessage('')}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* 3. Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0b101e] p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'بطاقات الخامات المباشرة' : 'Raw Material Cards'}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('balances')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'balances'
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'أرصدة المستودعات التفصيلية' : 'Warehouse Balances'}
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
          <input
            type="text"
            placeholder={isAr ? 'ابحث عن خامة...' : 'Search raw materials...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* 4. Tab 1: Raw Materials Cards Grid */}
      {activeTab === 'materials' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="raw-materials-grid">
          {filteredMaterials.map((mat) => {
            const usingDishes = materialDishesMap[mat.id] || [];
            const isLowStock = mat.currentStock <= (mat.reorderPoint || 5) * (mat.conversionFactor || 1);

            return (
              <div
                key={mat.id}
                data-testid={`material-card-${mat.id}`}
                className="p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                {/* Header: Name, Unit, Low Stock Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {mat.nameAr}
                    </h3>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span>{mat.category || (isAr ? 'عام' : 'General')}</span>
                      <span className="mx-1.5">·</span>
                      <span>{isAr ? 'وحدة الشراء:' : 'Unit:'} {mat.purchaseUnit}</span>
                    </div>
                  </div>

                  {isLowStock ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800/80 shrink-0">
                      {isAr ? 'تحت الحد' : 'Low Stock'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/80 shrink-0">
                      {isAr ? 'متوفر' : 'In Stock'}
                    </span>
                  )}
                </div>

                {/* Stock & Price Strip */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-start">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الرصيد المتاح' : 'Stock'}</span>
                    <strong className="text-sm font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {mat.currentStock} {mat.consumptionUnit}
                    </strong>
                  </div>

                  <div className="text-end">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'سعر الشراء' : 'Price'}</span>
                    <div className="flex items-center justify-end gap-1">
                      <strong className="text-sm font-mono font-bold text-cyan-600 dark:text-cyan-400" dir="ltr">
                        {formatCurrency(mat.purchasePrice)}
                      </strong>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPriceEdit(mat)}
                        title={isAr ? 'تعديل السعر وفحص الأثر' : 'Edit Price'}
                        className="p-1 text-slate-400 hover:text-cyan-500"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Dish Usage Button Link: "تستخدم في كام طبق؟" */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setUsageMat(mat)}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>
                      {isAr
                        ? `تستخدم في ${usingDishes.length} أطباق`
                        : `Used in ${usingDishes.length} dishes`}
                    </span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {isAr ? 'هالك:' : 'Waste:'} {mat.wastePercentage || 0}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Tab 2: Detailed Warehouse Balances Table */}
      {activeTab === 'balances' && (
        <div className="bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">{t('finance.accountCode')}</th>
                  <th className="py-3 px-4 text-start">{t('menu.ingredient')}</th>
                  <th className="py-3 px-3 text-start">{t('inventory.title')}</th>
                  <th className="py-3 px-3 text-end">{t('menu.portionCost')}</th>
                  <th className="py-3 px-3 text-end">{isAr ? 'المخزون الفعلي' : 'Physical Stock'}</th>
                  <th className="py-3 px-4 text-center">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {MOCK_STOCK_BALANCES.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 text-start" dir="ltr">
                      {item.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 text-start">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-start">{item.warehouseName}</td>
                    <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                      {formatCurrency(item.costPerUnit)}
                    </td>
                    <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {item.physicalStock} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                        {isAr ? 'مطابق' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Modal: Dish Usage ("تستخدم في كام طبق؟") */}
      {usageMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-cyan-500" />
                <h3 className="font-bold text-sm">
                  {isAr ? `الأطباق التي تستخدم [${usageMat.nameAr}]:` : `Dishes using [${usageMat.nameEn}]:`}
                </h3>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setUsageMat(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {(materialDishesMap[usageMat.id] || []).length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  {isAr ? 'هذه الخامة غير مستخدمة في أي وصفة بعد' : 'Not used in any recipe yet'}
                </div>
              ) : (
                (materialDishesMap[usageMat.id] || []).map((dish) => {
                  const ingLine = dish.recipeIngredients?.find((i) => i.ingredientId === usageMat.id);
                  return (
                    <div
                      key={dish.id}
                      onClick={() => {
                        setUsageMat(null);
                        setActiveView('menu');
                      }}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <strong className="block text-slate-900 dark:text-white">{dish.nameAr}</strong>
                        <span className="text-[11px] text-slate-400">
                          {isAr ? 'الكمية في الوجبة:' : 'Portion qty:'} {ingLine?.quantity} {ingLine?.unit}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(dish.sellingPrice)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setUsageMat(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Price Edit & Impact Warning ("هيغيّر تكلفة X أطباق") */}
      {editingMat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm">
                {isAr ? `تعديل سعر [${editingMat.nameAr}]` : `Edit Price for [${editingMat.nameEn}]`}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditingMat(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-500 block mb-1 font-bold">
                  {isAr ? 'سعر الشراء الجديد (ج.م):' : 'New Purchase Price (EGP):'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newPrice}
                  onChange={(e) => {
                    setNewPrice(Number(e.target.value));
                    setShowImpactModal(false);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-base font-bold text-cyan-600 dark:text-cyan-400"
                />
              </div>

              {/* Price Impact Warning Card */}
              {affectedDishes.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {isAr
                        ? `تنبيه: هذا التعديل هيغيّر تكلفة ${affectedDishes.length} أطباق مرتبطة!`
                        : `Warning: This change will affect true cost of ${affectedDishes.length} dishes!`}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImpactModal(!showImpactModal)}
                    className="w-full justify-center text-xs font-bold bg-white/80 dark:bg-slate-900"
                  >
                    <span>{showImpactModal ? (isAr ? 'إخفاء الأثر' : 'Hide Impact') : (isAr ? 'شوف الأثر' : 'View Impact')}</span>
                  </Button>

                  {/* Impact Breakdown Table */}
                  {showImpactModal && (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pt-2 text-[11px] border-t border-amber-200 dark:border-amber-800/80">
                      {affectedDishes.map((dish) => {
                        const ing = dish.recipeIngredients?.find((i) => i.ingredientId === editingMat.id);
                        const oldLineCost = ing?.totalCost || 0;
                        const factor = editingMat.conversionFactor || 1;
                        const newLineCost = ((newPrice / factor) * (ing?.quantity || 1));
                        const diff = newLineCost - oldLineCost;

                        return (
                          <div key={dish.id} className="flex justify-between items-center py-1">
                            <span className="font-bold">{dish.nameAr}</span>
                            <span className="font-mono" dir="ltr">
                              {diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} ج.م
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSaveMaterialPrice}
                className="flex-1 font-bold"
              >
                <Check className="w-4 h-4" />
                <span>{isAr ? 'اعتماد وحفظ السعر' : 'Save Price'}</span>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingMat(null)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'تحويل كميات بين المستودعات' : 'Transfer Stock'}</span>
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setTransferModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">{isAr ? 'من مستودع:' : 'From:'}</label>
                <select
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  <option value="wh-1">{isAr ? 'المستودع الرئيسي الجاف والمبرد' : 'Central Hub'}</option>
                  <option value="wh-2">{isAr ? 'مستودع المطبخ اليومي' : 'Kitchen Store'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{isAr ? 'إلى مستودع:' : 'To:'}</label>
                <select
                  value={transferDest}
                  onChange={(e) => setTransferDest(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                >
                  <option value="wh-2">{isAr ? 'مستودع المطبخ اليومي' : 'Kitchen Store'}</option>
                  <option value="wh-3">{isAr ? 'مستودع البار والمشروبات' : 'Bar Store'}</option>
                  <option value="wh-4">{isAr ? 'مستودع المخبوزات والحلويات' : 'Bakery Store'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{isAr ? 'الكمية المحولة:' : 'Quantity:'}</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setTransferModal(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setTransferModal(false);
                  setToastMessage(isAr ? 'تم تسجيل حركة التحويل بنجاح' : 'Transfer recorded successfully');
                  setTimeout(() => setToastMessage(''), 3000);
                }}
                className="font-bold"
              >
                {isAr ? 'تنفيذ التحويل' : 'Dispatch'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
