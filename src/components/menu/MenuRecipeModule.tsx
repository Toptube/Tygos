/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Utensils,
  Layers,
  ChefHat,
  Search,
  Plus,
  Scale,
  DollarSign,
  TrendingUp,
  Percent,
  Check,
  X,
  FileSpreadsheet,
  Clock,
  Droplet,
  Zap,
  Flame,
  Package as PackageIcon,
  ShieldAlert,
  History,
} from 'lucide-react';
import { MOCK_MENU_ITEMS } from '../../data/mockData.ts';
import { MenuItem, ProductionDepartment } from '../../types/index.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { RecipeVersion } from '../../domain/types.ts';

export const MenuRecipeModule: React.FC = () => {
  const { t, formatCurrency, formatNumber, language } = useI18n();
  const { activeRecipe, createRecipeVersion } = useBusiness();

  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem>(MOCK_MENU_ITEMS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVersionNumber, setActiveVersionNumber] = useState<number>(activeRecipe.activeVersionNumber);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState(44.5);
  const [activeTab, setActiveTab] = useState<'bom_table' | 'true_cost_breakdown' | 'version_history'>('bom_table');

  const isAr = language === 'ar';

  const departments: (ProductionDepartment | 'All')[] = [
    'All',
    'Grill',
    'Kitchen',
    'Bakery',
    'Pastry',
    'Bar',
    'Preparation',
  ];

  const filteredProducts = MOCK_MENU_ITEMS.filter((p) => {
    const matchesDept = selectedDepartment === 'All' || p.department === selectedDepartment;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const selectedVersion: RecipeVersion =
    activeRecipe.versions.find((v) => v.versionNumber === activeVersionNumber) ||
    activeRecipe.versions[activeRecipe.versions.length - 1];

  const breakdown = selectedVersion.costBreakdown;

  const handleCreateVersionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) return;
    createRecipeVersion(activeRecipe.id, changeReason.trim(), newSellingPrice);
    setIsNewVersionModalOpen(false);
    setChangeReason('');
    setActiveVersionNumber(activeRecipe.versions.length + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('menu.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'محرك الوصفات المعيارية المتقدم، إصدارات الوصفات (V1, V2)، واحتساب التكلفة الحقيقية الشاملة للمنتج.'
              : 'Advanced Recipe Engine, immutable versioning (V1, V2), and true product cost breakdown.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewVersionModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إصدار نسخة جديدة من الوصفة' : 'Create New Recipe Version'}</span>
          </button>
        </div>
      </div>

      {/* Production Department Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => setSelectedDepartment(dept)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              selectedDepartment === dept
                ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {dept === 'All' ? t('menu.allStations') : dept}
          </button>
        ))}
      </div>

      {/* 2-Column Split: Product Catalog on Left, Comprehensive Recipe Engine on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Catalog */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pe-1">
            {filteredProducts.map((p) => {
              const isSelected = selectedProduct.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-slate-900 dark:text-white shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {p.category} · {p.department}
                      </p>
                    </div>
                    <span className="font-mono font-black text-xs text-cyan-600 dark:text-cyan-400" dir="ltr">
                      {formatCurrency(p.sellingPrice)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]">
                    <span className="text-slate-400">
                      BOM: <strong className="font-mono text-slate-700 dark:text-slate-300" dir="ltr">{formatCurrency(p.recipeCost)}</strong>
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        p.foodCostPercentage <= 30
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {t('menu.foodCost')} {p.foodCostPercentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Recipe Engine & True Cost Explorer */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
          {/* Header of Selected Item & Version Selector */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedProduct.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-bold" dir="ltr">
                  {selectedProduct.barcode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {selectedProduct.category} · {selectedProduct.department} · {t('common.unit')}: {selectedProduct.unit}
              </p>
            </div>

            {/* Version Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <History className="w-3.5 h-3.5 text-slate-400 ms-1" />
              {activeRecipe.versions.map((ver) => (
                <button
                  key={ver.versionNumber}
                  onClick={() => setActiveVersionNumber(ver.versionNumber)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md font-mono transition-colors cursor-pointer ${
                    activeVersionNumber === ver.versionNumber
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  V{ver.versionNumber}.0
                </button>
              ))}
            </div>
          </div>

          {/* Version Metadata Tag */}
          <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500">
              {isAr ? 'الإصدار النشط:' : 'Selected Version:'} <strong className="text-slate-800 dark:text-white font-mono">{selectedVersion.versionLabel}</strong> ({selectedVersion.status})
            </span>
            <span className="text-cyan-600 dark:text-cyan-400 text-[11px]">
              {selectedVersion.changeLogReason}
            </span>
          </div>

          {/* Financial Metrics Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 block">{t('menu.sellingPrice')}</span>
              <span className="text-lg font-black font-mono text-slate-900 dark:text-white" dir="ltr">
                {formatCurrency(breakdown.currentSellingPrice)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Menu Price</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 block">{isAr ? 'التكلفة الحقيقية الشاملة' : 'True Product Cost'}</span>
              <span className="text-lg font-black font-mono text-amber-500" dir="ltr">
                {formatCurrency(breakdown.costPerPortion)}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {isAr ? 'تشمل العمالة والمنافع' : 'Incl. Labor & Utilities'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 block">{t('menu.foodCost')} / {t('menu.grossMargin')}</span>
              <span className={`text-lg font-black font-mono ${breakdown.foodCostPercentage > 32 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {breakdown.foodCostPercentage.toFixed(1)}%
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                {breakdown.grossMarginPercentage.toFixed(1)}% {t('menu.grossMargin')}
              </span>
            </div>
          </div>

          {/* Sub-tabs: BOM Table vs True Cost Breakdown vs History */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('bom_table')}
              className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'bom_table'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {isAr ? 'جدول المكونات المعيارية (BOM)' : 'Ingredients BOM Table'}
            </button>
            <button
              onClick={() => setActiveTab('true_cost_breakdown')}
              className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'true_cost_breakdown'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {isAr ? 'تفصيل التكلفة الحقيقية (True Cost Breakdown)' : 'True Product Cost Breakdown'}
            </button>
            <button
              onClick={() => setActiveTab('version_history')}
              className={`pb-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'version_history'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              {isAr ? 'سجل النسخ والتدقيق' : 'Version History Log'}
            </button>
          </div>

          {/* Tab 1: BOM Table */}
          {activeTab === 'bom_table' && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 text-start">{t('menu.ingredient')}</th>
                    <th className="py-2.5 px-3 text-end">{t('menu.qty')}</th>
                    <th className="py-2.5 px-3 text-start">{t('common.unit')}</th>
                    <th className="py-2.5 px-3 text-end">{isAr ? 'نسبة الفاقد' : 'Waste %'}</th>
                    <th className="py-2.5 px-3 text-end">{t('menu.portionCost')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {selectedVersion.ingredients.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                      <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200 text-start">
                        {isAr ? ing.ingredientNameAr : ing.ingredientNameEn}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                        {ing.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-start">
                        {ing.unit}
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono text-amber-500" dir="ltr">
                        {(ing.wastePercentage * 100).toFixed(0)}%
                      </td>
                      <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                        {formatCurrency(ing.effectiveCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 2: True Cost Breakdown ("From One Drop of Water to Profit") */}
          {activeTab === 'true_cost_breakdown' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isAr ? '1. تكلفة المكونات الخام الصافية (شاملة الفاقد):' : '1. Raw Ingredients Net Cost (Adjusted for Waste):'}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200" dir="ltr">
                    {formatCurrency(breakdown.rawIngredientsCost)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <PackageIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isAr ? '2. مواد التعبئة والتغليف (علب وأكياس):' : '2. Food Packaging & Wraps:'}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200" dir="ltr">
                    {formatCurrency(breakdown.packagingCost)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isAr ? '3. العمالة المباشرة (15 دقيقة تحضير × $15/ساعة):' : '3. Direct Kitchen Labor (15 mins @ $15/hr):'}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200" dir="ltr">
                    {formatCurrency(breakdown.directLaborCost)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{isAr ? '4. استهلاك المنافع والمرافق (مياه $0.14، كهرباء $0.38، غاز $0.32):' : '4. Utility Absorption (Water $0.14, Power $0.38, Gas $0.32):'}</span>
                  </span>
                  <span className="font-mono font-bold text-cyan-400" dir="ltr">
                    {formatCurrency(breakdown.utilitiesAllocation.water + breakdown.utilitiesAllocation.electricity + breakdown.utilitiesAllocation.gas)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isAr ? '5. المواد الاستهلاكية ونظافة المحطة:' : '5. Station Consumables & Sanitation:'}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-200" dir="ltr">
                    {formatCurrency(breakdown.consumablesCost)}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                  <span>{isAr ? 'إجمالي التكلفة الحقيقية للحصة:' : 'Total True Cost Per Portion:'}</span>
                  <span className="font-mono text-cyan-400 font-black text-base" dir="ltr">
                    {formatCurrency(breakdown.costPerPortion)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Version History Log */}
          {activeTab === 'version_history' && (
            <div className="space-y-2 text-xs">
              {activeRecipe.versions.map((v) => (
                <div
                  key={v.versionNumber}
                  className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold font-mono text-cyan-400">{v.versionLabel}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {v.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{v.changeLogReason}</p>
                    <span className="text-[10px] text-slate-400">By: {v.authorUsername} · Effective: {v.effectiveFrom}</span>
                  </div>

                  <div className="text-end font-mono">
                    <span className="font-bold text-white" dir="ltr">{formatCurrency(v.costBreakdown.costPerPortion)}</span>
                    <span className="block text-[10px] text-slate-500">Portion Cost</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Version Modal */}
      {isNewVersionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-sm">
                {isAr ? 'إصدار نسخة جديدة من الوصفة (V3.0)' : 'Create New Recipe Version (V3.0)'}
              </h3>
              <button
                onClick={() => setIsNewVersionModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVersionSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  {isAr ? 'سبب التعديل والتحديث (يسجل في سجل التدقيق):' : 'Reason for Versioning (Audit Trail):'}
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder={
                    isAr
                      ? 'مثال: تحديث أسعار مورد اللحوم الأخير وتعديل وزن الحصة...'
                      : 'e.g. Updated beef purveyor pricing and portion realignment...'
                  }
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  {isAr ? 'سعر البيع المقترح في القائمة ($):' : 'Proposed Menu Selling Price ($):'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newSellingPrice}
                  onChange={(e) => setNewSellingPrice(Number(e.target.value))}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="p-2.5 bg-cyan-950/30 border border-cyan-500/30 rounded-lg text-[11px] text-cyan-300">
                {isAr
                  ? 'سيتم حفظ النسخة السابقة V2.0 بشكل دائم وغير قابل للتعديل للحفاظ على دقة التكاليف التاريخية.'
                  : 'Previous versions remain immutable to preserve historical audit trail accuracy.'}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold cursor-pointer"
                >
                  {isAr ? 'اعتماد وحفظ النسخة الجديدة' : 'Approve & Save Version'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewVersionModalOpen(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
