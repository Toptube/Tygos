/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SEMI-FINISHED PREPARATIONS MODULE (شاشة التجهيزات والتحضيرات الأساسية - Package 4)
 *
 * Core Features:
 * - Category tree: عجائن ومخبوزات، صوصات، تتبيلات ومرينيهات، حشوات، خلطات وتوابل، مسلوقات ومطهيات، بار.
 * - Preparation Types:
 *   1. Compound (مركّب): Multiple raw/semi-finished ingredients -> Total yield.
 *   2. Processing (معالجة): Single raw material transformed with cooking factor (e.g. 50g raw -> 100g cooked).
 *   3. Named Portions (حصص): "بولة زر = 100 جم", "قطعة عجين = 170 جم", "ملعقتان كبيرتان = 50 جم".
 * - Default Mode: "On-Formula" (على الصيغة) - zero stock, automatic decomposition to raw on sale.
 * - Optional Batch Production Tracking (تسجيل الدفعات الاختياري):
 *   - "سجّل دفعات هذا التجهيز" toggle.
 *   - "تجهيز دفعة" button for chef/station head, deducts raw from section warehouse, adds yield to prep stock.
 *   - Disabling reverts remaining stock to equivalent raw materials into section warehouse.
 * - Live cost recalculation & dynamic propagation to affected menu products.
 * - Copy preparation ("نسخ تجهيز").
 * - Circular dependency prevention (منع الدوران التكراري).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  Copy,
  Trash2,
  Edit,
  ExternalLink,
  ChefHat,
  Scale,
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  FolderTree,
  ChevronRight,
  Flame,
  Coffee,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import {
  semiFinishedService,
  SemiFinishedItem,
  PreparationType,
  PreparationIngredient,
  PreparationPortion,
  PREP_UNIT_CONVERSIONS,
  convertPrepUnitToBase,
} from '../../services/semiFinishedService.ts';
import { warehouseService, WarehouseLocation } from '../../services/warehouseService.ts';
import { RawMaterialItem } from '../../services/dataService.ts';
import { PreparationCardModal } from './PreparationCardModal.tsx';

// Categories for preparations
const PREP_CATEGORIES = [
  { id: 'all', nameAr: 'كل التجهيزات' },
  { id: 'عجائن ومخبوزات', nameAr: 'عجائن ومخبوزات' },
  { id: 'صوصات وتتبيلات', nameAr: 'صوصات وتتبيلات' },
  { id: 'مرينيهات ولحوم', nameAr: 'مرينيهات ولحوم' },
  { id: 'حشوات وخلطات', nameAr: 'حشوات وخلطات' },
  { id: 'مسلوقات ومطهيات', nameAr: 'مسلوقات ومطهيات' },
  { id: 'تجهيزات بار وعصائر', nameAr: 'تجهيزات بار وعصائر' },
];

export const SemiFinishedModule: React.FC = () => {
  const { currentEstablishment, currentUser } = useAuth();
  const establishmentId = currentEstablishment?.id || 'default';
  const { showToast } = useToast();

  const isChef =
    currentUser?.role === 'head_chef' ||
    currentUser?.role === 'kitchen_manager' ||
    currentUser?.role === 'section_manager' ||
    currentUser?.role === 'bar_manager';
  const isCostAccountantOrAdmin =
    currentUser?.role === 'tenant_admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'general_manager' ||
    currentUser?.role === 'cost_accountant';

  const [preparations, setPreparations] = useState<SemiFinishedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPrep, setEditingPrep] = useState<Partial<SemiFinishedItem> | null>(null);
  const [cardPrepId, setCardPrepId] = useState<string | null>(null);
  const [batchPrep, setBatchPrep] = useState<SemiFinishedItem | null>(null);

  // Undo delete state
  const [recentlyDeleted, setRecentlyDeleted] = useState<SemiFinishedItem | null>(null);

  // Batch production modal state
  const [batchCountInput, setBatchCountInput] = useState<number>(1);
  const [actualYieldInput, setActualYieldInput] = useState<number>(0);
  const [batchNotesInput, setBatchNotesInput] = useState<string>('');

  const loadData = () => {
    const list = semiFinishedService.getPreparations(establishmentId);
    setPreparations([...list]);
  };

  useEffect(() => {
    loadData();
  }, [establishmentId]);

  // Filtered list
  const filteredList = useMemo(() => {
    return preparations.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (departmentFilter !== 'all' && item.producingDepartment !== departmentFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.nameAr.toLowerCase().includes(q) || item.nameEn.toLowerCase().includes(q);
        const matchCode = item.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [preparations, selectedCategory, departmentFilter, searchQuery]);

  // Delete Action with Undo
  const handleDelete = (item: SemiFinishedItem) => {
    const deleted = semiFinishedService.deletePreparation(establishmentId, item.id);
    if (deleted) {
      setRecentlyDeleted(deleted);
      loadData();
      showToast({
        title: `تم حذف التجهيز [${item.nameAr}] بنجاح`,
        message: 'يمكنك التراجع عن الحذف بالضغط على زر التراجع أدناه',
        type: 'info',
      });
    }
  };

  const handleUndoDelete = () => {
    if (recentlyDeleted) {
      semiFinishedService.restorePreparation(establishmentId, recentlyDeleted);
      showToast({
        title: `تم استرجاع التجهيز [${recentlyDeleted.nameAr}] بنجاح ✓`,
        type: 'success',
      });
      setRecentlyDeleted(null);
      loadData();
    }
  };

  // Duplicate Action
  const handleDuplicate = (item: SemiFinishedItem) => {
    const copyName = `${item.nameAr} (نسخة)`;
    try {
      const copied = semiFinishedService.duplicatePreparation(
        establishmentId,
        item.id,
        copyName,
        currentUser?.fullName || 'محاسب التكاليف'
      );
      loadData();
      showToast({
        title: `تم نسخ التجهيز بنجاح باسم [${copied.nameAr}] ✓`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في نسخ التجهيز', type: 'error' });
    }
  };

  // Open Editor for New Preparation
  const handleOpenNew = () => {
    const defaultCat = selectedCategory === 'all' ? 'عجائن ومخبوزات' : selectedCategory;
    setEditingPrep({
      code: `PREP-${String(preparations.length + 1).padStart(2, '0')}`,
      nameAr: '',
      nameEn: '',
      category: defaultCat,
      producingDepartment: 'kitchen',
      type: 'compound',
      enableBatchTracking: false,
      currentBatchStock: 0,
      totalYield: 1000,
      yieldUnit: 'جرام',
      ingredients: [],
      portions: [
        {
          id: `por-${Date.now()}`,
          nameAr: 'حصة معيارية',
          sizeInYieldUnits: 100,
          calculatedCost: 0,
        },
      ],
    });
    setIsEditorOpen(true);
  };

  // Open Editor for Existing Preparation
  const handleOpenEdit = (item: SemiFinishedItem) => {
    setEditingPrep(JSON.parse(JSON.stringify(item)));
    setIsEditorOpen(true);
  };

  // Open Batch Production Modal
  const handleOpenBatch = (item: SemiFinishedItem) => {
    setBatchPrep(item);
    setBatchCountInput(1);
    setActualYieldInput(item.totalYield);
    setBatchNotesInput('');
  };

  // Execute Batch Production
  const handleConfirmBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchPrep) return;

    try {
      const result = semiFinishedService.recordBatchProduction(establishmentId, batchPrep.id, {
        batchCount: batchCountInput,
        actualYieldBase: actualYieldInput,
        actorName: currentUser?.fullName || 'الشيف المسؤول',
        notes: batchNotesInput,
      });

      loadData();
      setBatchPrep(null);

      showToast({
        title: `تم تسجيل تشغيل الدفعة بنجاح وإضافة ${actualYieldInput} ${batchPrep.yieldUnit} للرصيد ✓`,
        message: result.varianceNotice || 'تم خصم الخامات الأولية من مخزن القسم وتحديث التكلفة',
        type: result.varianceNotice ? 'warning' : 'success',
      });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في تسجيل الدفعة', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
      {/* 1. Header & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                التجهيزات والتحضيرات الأساسية (Semi-Finished Goods)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                هنا تكتب مرة واحدة إزاي الخامات بتتحول لعجين وصوصات وتتبيلات، والنظام هو اللي بيخصم الخامات لوحده تلقائياً عند البيع.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {recentlyDeleted && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndoDelete}
              className="gap-1.5 text-amber-600 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تراجع عن حذف [{recentlyDeleted.nameAr}]</span>
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleOpenNew}
            className="gap-1.5 font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ تجهيز جديد</span>
          </Button>
        </div>
      </div>

      {/* 2. Search & Category Tree Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم التجهيز أو الكود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-slate-500 shrink-0">المحطة:</span>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">كل المحطات</option>
            <option value="kitchen">المطبخ الساخن</option>
            <option value="bakery">المخبز والحلواني</option>
            <option value="bar">البار والمشروبات</option>
            <option value="grill">الشواية</option>
          </select>
        </div>
      </div>

      {/* 3. Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {PREP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {cat.nameAr}
          </button>
        ))}
      </div>

      {/* 4. Preparations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredList.map((item) => {
          const costInfo = semiFinishedService.calculatePreparationUnitCost(establishmentId, item);
          const affectedCount = semiFinishedService.getAffectedProducts(establishmentId, item.id).length;

          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                {/* Badges Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.code}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300">
                      {item.category}
                    </span>
                    {item.isExample && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        مثال، عدّله أو احذفه
                      </span>
                    )}
                  </div>
                </div>

                {/* Name & Type */}
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {item.nameAr}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>النوع:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {item.type === 'compound'
                        ? 'مركّب (صيغة مكونات)'
                        : item.type === 'processing'
                        ? 'معالجة بطهي'
                        : 'حصص معيارية'}
                    </strong>
                    <span>·</span>
                    <span>محطة: {item.producingDepartment}</span>
                  </div>
                </div>

                {/* Yield & Portions Info */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">ناتج الصيغة المعياري:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {item.totalYield} {item.yieldUnit}
                    </span>
                  </div>

                  {!isChef && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">تكلفة الوحدة المحسوبة:</span>
                      <span className="font-mono font-black text-cyan-700 dark:text-cyan-400">
                        {costInfo.unitCost.toFixed(3)} ج.م / {item.yieldUnit}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الحصص المعيارية:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.portions.length} حصص مسمّاة
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">الأطباق المتأثرة في المنيو:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {affectedCount} أطباق
                    </span>
                  </div>
                </div>

                {/* Batch Status Badge */}
                <div className="text-[11px]">
                  {item.enableBatchTracking ? (
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        تسجيل الدفعات مفعل
                      </span>
                      <span className="font-mono font-black">
                        الرصيد: {item.currentBatchStock} {item.yieldUnit}
                      </span>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span className="font-bold">وضع الصيغة الافتراضي (على الصيغة)</span>
                      <span className="text-[10px]">لا رصيد · يخصم الخامات تلقائياً</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCardPrepId(item.id)}
                    className="gap-1 text-xs px-2.5 py-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>الكارت</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="gap-1 text-xs px-2.5 py-1"
                  >
                    <Edit className="w-3.5 h-3.5 text-cyan-600" />
                    <span>تعديل الصيغة</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(item)}
                    title="نسخ هذا التجهيز"
                    className="text-xs px-2 py-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    title="حذف التجهيز"
                    className="text-xs px-2 py-1 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {item.enableBatchTracking && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => handleOpenBatch(item)}
                    className="gap-1 text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>تجهيز دفعة</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="col-span-full p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <Layers className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">
              لا توجد تجهيزات مطابقة لبحثك
            </h4>
            <p className="text-xs text-slate-500">
              يمكنك إضافة أول تجهيز بالضغط على «+ تجهيز جديد» بالأعلى.
            </p>
          </div>
        )}
      </div>

      {/* 5. Preparation Editor Modal (Tabs: Data, Ingredients, Yield & Portions) */}
      {isEditorOpen && editingPrep && (
        <PreparationEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          initialData={editingPrep}
          allPreparations={preparations}
          onSave={(saved) => {
            loadData();
            setIsEditorOpen(false);
            showToast({
              title: `تم حفظ التجهيز [${saved.nameAr}] وتحديث تكاليف الأطباق المتأثرة ✓`,
              type: 'success',
            });
          }}
        />
      )}

      {/* 6. Preparation Card Modal */}
      {cardPrepId && (
        <PreparationCardModal
          isOpen={!!cardPrepId}
          onClose={() => setCardPrepId(null)}
          preparationId={cardPrepId}
          onOpenBatchModal={(prep) => {
            setCardPrepId(null);
            handleOpenBatch(prep);
          }}
        />
      )}

      {/* 7. Batch Production Modal */}
      {batchPrep && (
        <ModalShell
          isOpen={!!batchPrep}
          onClose={() => setBatchPrep(null)}
          title={`تسجيل دفعة تجهيز: ${batchPrep.nameAr}`}
          size="md"
        >
          <form onSubmit={handleConfirmBatch} className="space-y-4" dir="rtl">
            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200 space-y-1">
              <p className="font-bold">تشغيل دفعة جديدة للشيف:</p>
              <p>
                سيتم خصم الخامات الأولية الفعلية من مخزن محطة [{batchPrep.producingDepartment}]، وإضافة الناتج الفعلي المعدود لرصيد التجهيز بمخزن القسم مع إعادة احتساب متوسط التكلفة WAC.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                عدد الدفعات المراد تشغيلها:
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={batchCountInput}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 1;
                  setBatchCountInput(val);
                  setActualYieldInput(val * batchPrep.totalYield);
                }}
                className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                الناتج القياسي المتوقع: {batchCountInput * batchPrep.totalYield} {batchPrep.yieldUnit}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الناتج الفعلي بعد التحضير ({batchPrep.yieldUnit}):
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={actualYieldInput}
                onChange={(e) => setActualYieldInput(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              {actualYieldInput !== batchCountInput * batchPrep.totalYield && (
                <div className="text-[11px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    انحراف عن القياسي:{' '}
                    {(
                      ((actualYieldInput - batchCountInput * batchPrep.totalYield) /
                        (batchCountInput * batchPrep.totalYield)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظات الشيف / أسباب الانحراف إن وجدت:
              </label>
              <textarea
                rows={2}
                value={batchNotesInput}
                onChange={(e) => setBatchNotesInput(e.target.value)}
                placeholder="مثال: زيادة في نسبة الرطوبة بالدقيق مما رفع الناتج بنسبة 3%"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBatchPrep(null)}>
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                تأكيد تشغيل الدفعة وخصم الخامات
              </Button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
};

// =====================================================================
// PREPARATION EDITOR MODAL (Tabs: General, Ingredients, Yield & Portions)
// =====================================================================
interface PreparationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Partial<SemiFinishedItem>;
  allPreparations: SemiFinishedItem[];
  onSave: (saved: SemiFinishedItem) => void;
}

const PreparationEditorModal: React.FC<PreparationEditorModalProps> = ({
  isOpen,
  onClose,
  initialData,
  allPreparations,
  onSave,
}) => {
  const { currentEstablishment, currentUser } = useAuth();
  const establishmentId = currentEstablishment?.id || 'default';
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'data' | 'ingredients' | 'yield'>('data');
  const [formData, setFormData] = useState<Partial<SemiFinishedItem>>({ ...initialData });

  const rawMaterials = warehouseService.getMaterials(establishmentId);

  // Raw Material / Prep Selector in Ingredients Tab
  const [isAddIngRowOpen, setIsAddIngRowOpen] = useState(false);
  const [selectedIngType, setSelectedIngType] = useState<'raw_material' | 'semi_finished'>('raw_material');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [ingQuantity, setIngQuantity] = useState<number>(100);
  const [ingUnit, setIngUnit] = useState<string>('جرام');
  const [ingWaste, setIngWaste] = useState<number>(0);

  // New portion row
  const [newPortionName, setNewPortionName] = useState<string>('');
  const [newPortionSize, setNewPortionSize] = useState<number>(100);

  const handleAddIngredient = () => {
    if (!selectedItemId) {
      showToast({ title: 'يرجى اختيار الخامة أو التجهيز', type: 'warning' });
      return;
    }

    // Circular Dependency Prevention
    if (selectedIngType === 'semi_finished' && formData.id) {
      const isCycle = semiFinishedService.checkCircularDependency(
        establishmentId,
        formData.id,
        selectedItemId
      );
      if (isCycle) {
        showToast({
          title: 'لا يمكن إضافة هذا التجهيز لمنع الدوران التكراري',
          message: 'التجهيز المختار يعتمد بالفعل في صيغته على التجهيز الحالي!',
          type: 'error',
        });
        return;
      }
    }

    let itemNameAr = '';
    let unitCostSnapshot = 0;

    if (selectedIngType === 'raw_material') {
      const mat = rawMaterials.find((m) => m.id === selectedItemId);
      itemNameAr = mat?.nameAr || 'خامة';
      unitCostSnapshot = mat?.costPerUnit || (mat?.purchasePrice ? mat.purchasePrice / (mat.conversionFactor || 1) : 0.05);
    } else {
      const p = allPreparations.find((item) => item.id === selectedItemId);
      itemNameAr = p?.nameAr || 'تجهيز';
      unitCostSnapshot = p?.wacUnitCost || 0.03;
    }

    const newIng: PreparationIngredient = {
      id: `ing-${Date.now()}`,
      type: selectedIngType,
      itemId: selectedItemId,
      itemNameAr,
      quantity: ingQuantity,
      unit: ingUnit,
      wastePercent: ingWaste,
      unitCostSnapshot,
      totalCostSnapshot:
        Math.round(convertPrepUnitToBase(ingQuantity, ingUnit) * unitCostSnapshot * (1 + ingWaste / 100) * 100) / 100,
    };

    const currentIngredients = [...(formData.ingredients || [])];
    currentIngredients.push(newIng);
    setFormData({ ...formData, ingredients: currentIngredients });
    setIsAddIngRowOpen(false);
    setSelectedItemId('');
  };

  const handleRemoveIngredient = (id: string) => {
    const filtered = (formData.ingredients || []).filter((i) => i.id !== id);
    setFormData({ ...formData, ingredients: filtered });
  };

  const handleAddPortion = () => {
    if (!newPortionName.trim() || newPortionSize <= 0) return;
    const currentPortions = [...(formData.portions || [])];
    currentPortions.push({
      id: `por-${Date.now()}`,
      nameAr: newPortionName.trim(),
      sizeInYieldUnits: newPortionSize,
      calculatedCost: 0,
    });
    setFormData({ ...formData, portions: currentPortions });
    setNewPortionName('');
    setNewPortionSize(100);
  };

  const handleRemovePortion = (id: string) => {
    const filtered = (formData.portions || []).filter((p) => p.id !== id);
    setFormData({ ...formData, portions: filtered });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nameAr?.trim()) {
      showToast({ title: 'يرجى إدخال اسم التجهيز بالعربية', type: 'warning' });
      return;
    }

    try {
      const saved = semiFinishedService.upsertPreparation(
        establishmentId,
        formData as any,
        currentUser?.fullName || 'محاسب التكاليف'
      );
      onSave(saved);
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في حفظ التجهيز', type: 'error' });
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={formData.id ? `تعديل صيغة التجهيز: ${formData.nameAr}` : 'إنشاء تجهيز جديد'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'data'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            1. بيانات التجهيز والمحطة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ingredients')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'ingredients'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            2. المكونات والصيغة ({formData.ingredients?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('yield')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'yield'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            3. الناتج والحصص المعيارية ({formData.portions?.length || 0})
          </button>
        </div>

        {/* Tab 1: General Data */}
        {activeTab === 'data' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كود التجهيز:
                </label>
                <input
                  type="text"
                  required
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم التجهيز بالعربية:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: عجينة بيتزا إيطالية"
                  value={formData.nameAr || ''}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  القسم التصنيفي:
                </label>
                <select
                  value={formData.category || 'عجائن ومخبوزات'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  {PREP_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المحطة / القسم المنتِج:
                </label>
                <select
                  value={formData.producingDepartment || 'kitchen'}
                  onChange={(e) => setFormData({ ...formData, producingDepartment: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="kitchen">المطبخ الساخن</option>
                  <option value="bakery">المخبز والحلواني</option>
                  <option value="bar">البار والمشروبات</option>
                  <option value="grill">الشواية</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نوع التجهيز:
                </label>
                <select
                  value={formData.type || 'compound'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PreparationType })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="compound">مركّب (صيغة مكونات متعددة)</option>
                  <option value="processing">معالجة (خامة واحدة بمعامل طهي/تنظيف)</option>
                  <option value="portion">حصص معيارية فقط</option>
                </select>
              </div>
            </div>

            {/* Batch Tracking Toggle (Feature 6) */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    ميزة تسجيل الدفعات لهذا التجهيز (اختيارية):
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    الوضع الافتراضي (معطل): يعمل «على الصيغة»، لا يحتاج الشيف لتسجيل أي شيء، وتُفكك الخامات وتُخصم تلقائياً عند بيع كل طبق.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!formData.enableBatchTracking}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setFormData({ ...formData, enableBatchTracking: enabled });
                  }}
                  className="w-5 h-5 accent-cyan-600 cursor-pointer"
                />
              </div>

              {formData.enableBatchTracking && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                  سيتم إظهار زر «تجهيز دفعة» للشيف في شاشته، لخصم الخامات الأولية وإضافة رصيد للتجهيز في مخزن القسم.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Ingredients Editor */}
        {activeTab === 'ingredients' && (
          <div className="space-y-4">
            {formData.type === 'processing' ? (
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  معالجة خامة واحدة (أرز مسلوق، فراخ مشوية، معكرونة مسلوقة):
                </h4>
                <div>
                  <label className="block text-xs font-bold mb-1">الخامة الأولية المراد معالجتها:</label>
                  <select
                    value={formData.processingMaterialId || ''}
                    onChange={(e) => {
                      const mat = rawMaterials.find((m) => m.id === e.target.value);
                      setFormData({
                        ...formData,
                        processingMaterialId: e.target.value,
                        processingMaterialNameAr: mat?.nameAr,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                  >
                    <option value="">اختر خامة...</option>
                    {rawMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameAr} ({m.purchaseUnit})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-bold mb-1">الكمية النيئة (قبل الطهي):</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.processingRawQty || 50}
                      onChange={(e) =>
                        setFormData({ ...formData, processingRawQty: parseFloat(e.target.value) || 50 })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">مثال: 50 جم أرز نيء</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">الكمية الناتجة بعد الطهي:</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.processingCookedQty || 100}
                      onChange={(e) =>
                        setFormData({ ...formData, processingCookedQty: parseFloat(e.target.value) || 100 })
                      }
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                    <span className="text-[10px] text-slate-500">مثال: 100 جم أرز مسلوق</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    مكونات الصيغة المركبة (خامات أو تجهيزات متداخلة):
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddIngRowOpen(true)}
                    className="gap-1 font-bold"
                  >
                    <Plus className="w-4 h-4 text-cyan-600" />
                    <span>+ إضافة مكوّن للصيغة</span>
                  </Button>
                </div>

                {/* Ingredients Table */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-xs text-start">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2.5 text-start">النوع</th>
                        <th className="p-2.5 text-start">المكوّن</th>
                        <th className="p-2.5 text-start">الكمية</th>
                        <th className="p-2.5 text-start">الوحدة</th>
                        <th className="p-2.5 text-start">هالك %</th>
                        <th className="p-2.5 text-start">التكلفة</th>
                        <th className="p-2.5 text-start">حذف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(formData.ingredients || []).map((ing) => (
                        <tr key={ing.id}>
                          <td className="p-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                ing.type === 'raw_material'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                              }`}
                            >
                              {ing.type === 'raw_material' ? 'خامة' : 'تجهيز'}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                            {ing.itemNameAr}
                          </td>
                          <td className="p-2.5 font-mono font-bold">{ing.quantity}</td>
                          <td className="p-2.5 text-slate-500">{ing.unit}</td>
                          <td className="p-2.5 font-mono text-slate-500">{ing.wastePercent || 0}%</td>
                          <td className="p-2.5 font-mono font-bold text-cyan-700 dark:text-cyan-400">
                            {ing.totalCostSnapshot || 0} ج.م
                          </td>
                          <td className="p-2.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveIngredient(ing.id)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(!formData.ingredients || formData.ingredients.length === 0) && (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400">
                            لم تُضف أي مكونات للصيغة بعد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Ingredient Row Inline Drawer */}
                {isAddIngRowOpen && (
                  <div className="p-4 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-900 dark:text-cyan-200">
                        اختيار المكون ووحدته:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIngType('raw_material');
                            setSelectedItemId('');
                          }}
                          className={`px-2.5 py-1 text-xs font-bold rounded ${
                            selectedIngType === 'raw_material'
                              ? 'bg-cyan-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          خامات أولية
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIngType('semi_finished');
                            setSelectedItemId('');
                          }}
                          className={`px-2.5 py-1 text-xs font-bold rounded ${
                            selectedIngType === 'semi_finished'
                              ? 'bg-cyan-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          تجهيزات متداخلة
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold mb-1">المادة:</label>
                        <select
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                        >
                          <option value="">اختر...</option>
                          {selectedIngType === 'raw_material'
                            ? rawMaterials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nameAr} ({m.purchaseUnit})
                                </option>
                              ))
                            : allPreparations
                                .filter((p) => p.id !== formData.id)
                                .map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.nameAr} ({p.yieldUnit})
                                  </option>
                                ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold mb-1">الكمية:</label>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={ingQuantity}
                          onChange={(e) => setIngQuantity(parseFloat(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold mb-1">الوحدة:</label>
                        <select
                          value={ingUnit}
                          onChange={(e) => setIngUnit(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                        >
                          <option value="جرام">جرام</option>
                          <option value="كجم">كجم</option>
                          <option value="مل">مل</option>
                          <option value="لتر">لتر</option>
                          <option value="قطعة">قطعة</option>
                          <option value="ملعقة كبيرة">ملعقة كبيرة (15 جم/مل)</option>
                          <option value="ملعقة صغيرة">ملعقة صغيرة (5 جم/مل)</option>
                          <option value="كوب">كوب (240 جم/مل)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddIngRowOpen(false)}
                      >
                        إلغاء
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleAddIngredient}
                      >
                        إضافة للصيغة
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Yield & Portions */}
        {activeTab === 'yield' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="block text-xs font-bold mb-1">الناتج الكلي للصيغة بالوحدة الصغرى:</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.totalYield || 1000}
                  onChange={(e) =>
                    setFormData({ ...formData, totalYield: parseFloat(e.target.value) || 1000 })
                  }
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <span className="text-[10px] text-slate-500">
                  مثال: 1700 جم عجين، أو 3800 جم صوص بيتزا
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">وحدة الناتج:</label>
                <select
                  value={formData.yieldUnit || 'جرام'}
                  onChange={(e) => setFormData({ ...formData, yieldUnit: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold"
                >
                  <option value="جرام">جرام</option>
                  <option value="مل">مل</option>
                  <option value="قطعة">قطعة</option>
                </select>
              </div>
            </div>

            {/* Portions Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    الحصص المعيارية المسمّاة (Portions):
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    عرّف الحصص المستخدمة في المنيو ليتم خصمها آلياً، مثل «قطعة عجين = 170 جم» أو «ملعقتان كبيرتان = 50 جم» أو «بولة رز = 100 جم».
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="اسم الحصة (مثلاً: قطعة عجين)"
                  value={newPortionName}
                  onChange={(e) => setNewPortionName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="number"
                  placeholder={`الحجم بـ ${formData.yieldUnit || 'جم'}`}
                  value={newPortionSize}
                  onChange={(e) => setNewPortionSize(parseFloat(e.target.value) || 0)}
                  className="w-28 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPortion}
                  className="gap-1 font-bold shrink-0"
                >
                  <Plus className="w-4 h-4 text-cyan-600" />
                  <span>+ إضافة حصة</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(formData.portions || []).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {p.nameAr}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {p.sizeInYieldUnits} {formData.yieldUnit || 'جم'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePortion(p.id)}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
          >
            حفظ التجهيز وتحديث المنيو
          </Button>
        </div>
      </form>
    </ModalShell>
  );
};
