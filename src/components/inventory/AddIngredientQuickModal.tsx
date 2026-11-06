/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RAPID RAW MATERIAL ENTRY MODAL (إضافة خامة في أقل من دقيقة)
 * Philosophy: 4 essential fields only. Advanced options collapsed.
 * Smart duplicate detection, instant yield waste calculation, and rapid sequential entry.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../common/Button.tsx';
import { X, Plus, ChevronDown, ChevronUp, AlertCircle, Check, Sparkles, Scale } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { dataService, RawMaterialItem } from '../../services/dataService.ts';
import { calculateUnitCostAfterWaste } from '../../domain/formulas.ts';

interface AddIngredientQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngredientAdded?: (newIngredient: RawMaterialItem) => void;
  establishmentId: string;
  existingIngredients?: RawMaterialItem[];
}

export const AddIngredientQuickModal: React.FC<AddIngredientQuickModalProps> = ({
  isOpen,
  onClose,
  onIngredientAdded,
  establishmentId,
  existingIngredients = [],
}) => {
  const { t, language } = useI18n();
  const isAr = language === 'ar';

  // 4 Essential Fields Only
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [purchaseUnit, setPurchaseUnit] = useState('كجم');
  const [purchasePrice, setPurchasePrice] = useState<string>('20.00');
  const [purchasedQuantity, setPurchasedQuantity] = useState<string>('5');

  // Collapsed Advanced Options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [consumptionUnit, setConsumptionUnit] = useState('جرام');
  const [conversionFactor, setConversionFactor] = useState<string>('1000');
  const [wastePercentage, setWastePercentage] = useState<string>('10');
  const [category, setCategory] = useState(isAr ? 'خضروات وفاكهة' : 'Produce');
  const [supplierName, setSupplierName] = useState('');
  const [reorderPoint, setReorderPoint] = useState<string>('2');
  const [expirationDate, setExpirationDate] = useState('');

  const [successToast, setSuccessToast] = useState(false);

  // Auto-adapt consumption unit and conversion factor when purchase unit changes
  useEffect(() => {
    if (purchaseUnit === 'كجم' || purchaseUnit === 'kg') {
      setConsumptionUnit(isAr ? 'جرام' : 'g');
      setConversionFactor('1000');
    } else if (purchaseUnit === 'لتر' || purchaseUnit === 'liter') {
      setConsumptionUnit(isAr ? 'مل' : 'ml');
      setConversionFactor('1000');
    } else if (purchaseUnit.includes('كرتونة') || purchaseUnit.includes('box')) {
      setConsumptionUnit(isAr ? 'قطعة' : 'piece');
      setConversionFactor('24');
    } else if (purchaseUnit.includes('علبة') || purchaseUnit.includes('pack')) {
      setConsumptionUnit(isAr ? 'جرام' : 'g');
      setConversionFactor('1000');
    }
  }, [purchaseUnit, isAr]);

  // Real-time calculation of effective cost after waste
  const liveCalculation = useMemo(() => {
    const price = parseFloat(purchasePrice) || 0;
    const factor = parseFloat(conversionFactor) || 1;
    const waste = parseFloat(wastePercentage) || 0;

    const baseCostPerUnit = factor > 0 ? price / factor : price;
    const effectiveCost = calculateUnitCostAfterWaste(baseCostPerUnit, waste);

    return {
      baseCostPerUnit,
      effectiveCost,
    };
  }, [purchasePrice, conversionFactor, wastePercentage]);

  // Smart local duplicate search ("هل تقصد: طماطم؟")
  const potentialDuplicate = useMemo(() => {
    const query = (nameAr || nameEn).trim().toLowerCase();
    if (query.length < 2) return null;

    return existingIngredients.find((ing) => {
      const existingAr = ing.nameAr.toLowerCase();
      const existingEn = ing.nameEn.toLowerCase();
      return (
        existingAr.includes(query) ||
        query.includes(existingAr) ||
        existingEn.includes(query) ||
        query.includes(existingEn)
      );
    });
  }, [nameAr, nameEn, existingIngredients]);

  // Popular waste presets for fast tapping
  const wastePresets = [
    { labelAr: 'طماطم وخضار (15%)', labelEn: 'Tomatoes/Veg (15%)', val: 15 },
    { labelAr: 'لحوم ودواجن (18%)', labelEn: 'Meat/Poultry (18%)', val: 18 },
    { labelAr: 'بصل وتقشير (12%)', labelEn: 'Onions/Peeling (12%)', val: 12 },
    { labelAr: 'أجبان وبقالة (4%)', labelEn: 'Cheese/Dairy (4%)', val: 4 },
  ];

  const resetForm = () => {
    setNameAr('');
    setNameEn('');
    setPurchasePrice('20.00');
    setPurchasedQuantity('5');
    setWastePercentage('10');
    setShowAdvanced(false);
  };

  const handleSave = async (andAddAnother: boolean = false) => {
    if (!nameAr.trim() && !nameEn.trim()) return;

    const price = parseFloat(purchasePrice) || 0;
    const qty = parseFloat(purchasedQuantity) || 1;
    const factor = parseFloat(conversionFactor) || 1;
    const waste = parseFloat(wastePercentage) || 0;
    const reorder = parseFloat(reorderPoint) || 2;

    const newItem = await dataService.addRawMaterial(establishmentId, {
      nameAr: nameAr.trim() || nameEn.trim(),
      nameEn: nameEn.trim() || nameAr.trim(),
      category,
      purchaseUnit,
      purchasePrice: price,
      purchasedQuantity: qty,
      consumptionUnit,
      conversionFactor: factor,
      wastePercentage: waste,
      currentStock: qty * factor,
      reorderPoint: reorder * factor,
      supplierName: supplierName.trim() || undefined,
      expirationDate: expirationDate || undefined,
    });

    if (onIngredientAdded) {
      onIngredientAdded(newItem);
    }

    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 2500);

    if (andAddAnother) {
      resetForm();
    } else {
      onClose();
      resetForm();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'إضافة خامة جديدة سريعة' : 'Quick Add Raw Material'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'أدخل البيانات الأساسية الأربعة فقط وسيتكفل النظام بالباقي' : 'Fill only 4 essential fields; system handles the rest'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Success toast inside modal */}
        {successToast && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'تمت إضافة الخامة بنجاح، يمكنك إضافة خامة أخرى الآن!' : 'Raw material saved! You can add another.'}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Smart Duplicate Warning */}
          {potentialDuplicate && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <span className="font-bold">
                  {isAr ? 'تنبيه لمنع التكرار:' : 'Duplicate check:'}{' '}
                </span>
                <span>
                  {isAr
                    ? `هل تقصد [${potentialDuplicate.nameAr}] الموجودة بالفعل بسعر $${potentialDuplicate.purchasePrice}؟`
                    : `Did you mean [${potentialDuplicate.nameEn}] which already exists at $${potentialDuplicate.purchasePrice}?`}
                </span>
              </div>
            </div>
          )}

          {/* 1. Raw Material Name */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? 'اسم الخامة' : 'Ingredient Name'} *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                placeholder={isAr ? 'مثال: طماطم بلدي طازجة' : 'Arabic Name (e.g. طماطم)'}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
              />
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="English Name (e.g. Fresh Tomatoes)"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2 & 3 & 4. Purchase Unit, Price, Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'وحدة الشراء' : 'Purchase Unit'} *
              </label>
              <select
                value={purchaseUnit}
                onChange={(e) => setPurchaseUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                <option value="كجم">{isAr ? 'كيلوجرام (كجم)' : 'Kilogram (kg)'}</option>
                <option value="لتر">{isAr ? 'لتر' : 'Liter'}</option>
                <option value="قطعة">{isAr ? 'قطعة / حبة' : 'Piece'}</option>
                <option value="كرتونة 12 لتر">{isAr ? 'كرتونة (12 لتر)' : 'Carton (12L)'}</option>
                <option value="كرتونة 24 قطعة">{isAr ? 'كرتونة (24 قطعة)' : 'Carton (24 pcs)'}</option>
                <option value="علبة 3 كجم">{isAr ? 'علبة (3 كجم)' : 'Can (3 kg)'}</option>
                <option value="شيكارة 25 كجم">{isAr ? 'شيكارة (25 كجم)' : 'Bag (25 kg)'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'سعر الشراء للوحدة ($)' : 'Purchase Price ($)'} *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الكمية المشتراة' : 'Quantity Purchased'} *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={purchasedQuantity}
                onChange={(e) => setPurchasedQuantity(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Live Calculated Metric Banner */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-500 shrink-0" />
              <div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                  {isAr ? 'التكلفة الحقيقية بعد امتصاص الهالك:' : 'Effective True Cost After Waste:'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {isAr
                    ? `بناءً على نسبة هالك ${wastePercentage}% وتفكيك ${consumptionUnit}`
                    : `Based on ${wastePercentage}% waste and ${consumptionUnit} unit`}
                </span>
              </div>
            </div>
            <div className="text-end">
              <span className="text-sm font-black font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                ${liveCalculation.effectiveCost.toFixed(4)}
              </span>
              <span className="text-[10px] text-slate-400 block">/{consumptionUnit}</span>
            </div>
          </div>

          {/* Quick Waste Presets */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 block">
              {isAr ? 'اقتراح هالك شائع للصنف:' : 'Common yield waste presets:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {wastePresets.map((wp) => (
                <Button
                  key={wp.val}
                  type="button"
                  onClick={() => setWastePercentage(wp.val.toString())}
                  className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    wastePercentage === wp.val.toString()
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-500'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-cyan-500/40'
                  }`}
                >
                  {isAr ? wp.labelAr : wp.labelEn}
                </Button>
              ))}
            </div>
          </div>

          {/* Collapsible Advanced Options Toggle */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-cyan-500 transition-colors cursor-pointer py-1"
            >
              <span>{isAr ? 'خيارات إضافية (وحدة الاستهلاك، المورد، حد الطلب)' : 'Advanced Options (Consumption Unit, Supplier, Reorder)'}</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'وحدة الاستهلاك في الوصفات' : 'Recipe Consumption Unit'}
                    </label>
                    <input
                      type="text"
                      value={consumptionUnit}
                      onChange={(e) => setConsumptionUnit(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'معامل التحويل (كم وحدة استهلاك بالوحدة؟)' : 'Conversion Factor'}
                    </label>
                    <input
                      type="number"
                      value={conversionFactor}
                      onChange={(e) => setConversionFactor(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'نسبة الهالك (%)' : 'Waste Loss (%)'}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="90"
                      value={wastePercentage}
                      onChange={(e) => setWastePercentage(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'حد إعادة الطلب' : 'Reorder Alert'}
                    </label>
                    <input
                      type="number"
                      value={reorderPoint}
                      onChange={(e) => setReorderPoint(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'المورد' : 'Supplier'}
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder={isAr ? 'شركة التوريدات...' : 'Supplier Name'}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/50">
          <Button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t('common.cancel', 'Cancel')}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => handleSave(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/10 transition-colors cursor-pointer"
            >
              {isAr ? 'حفظ وإضافة أخرى' : 'Save & Add Another'}
            </Button>

            <Button
              type="button"
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-900/30 transition-all cursor-pointer"
            >
              {isAr ? 'حفظ الخامة' : 'Save Raw Material'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
