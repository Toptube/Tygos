/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OVERHEAD ALLOCATION & FULL COSTING MODULE (شاشة المصاريف وتوزيعها - Package 5)
 *
 * Features:
 * - Two-stage cost allocation: Stage 1 (مشترك -> مراكز التكلفة) & Stage 2 (مركز التكلفة -> منتجات).
 * - Cost Centers CRUD (+, Edit, Delete confirmation + 8s Undo).
 * - Monthly Overhead Expenses Sheet with Direct / Indirect classification, illustrative note,
 *   1-click "نسخ الشهر السابق", deduplicated "استيراد من الموارد البشرية والمالية", and Month Lock enforcement.
 * - Establishment Overhead Mode selector: خامات فقط / خامات + نسبة ثابتة / التوزيع بالقواعد.
 * - Department Burden Rates, Period Absorption Variance (فروق التحميل: زائد / ناقص),
 *   and Product Full Cost Profitability identifying «خاسر بعد التحميل».
 * - Strict RBAC: Cost Accountant, Financial Manager, GM, Owner, Super Admin only.
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Copy,
  Download,
  Lock,
  Unlock,
  Edit3,
  Trash2,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  Sliders,
  CheckCircle2,
  Undo2,
  ChevronRight,
  ChevronLeft,
  Filter,
} from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import { NumericInput } from '../common/NumericInput.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { can } from '../../services/permissions.ts';
import {
  overheadService,
  getCurrentMonthKey,
  getPreviousMonthKey,
  EXPENSE_CATEGORY_LABELS_AR,
  STAGE1_RULE_LABELS_AR,
  STAGE2_RULE_LABELS_AR,
  OVERHEAD_MODE_LABELS_AR,
  OverheadMode,
  CostType,
  ExpenseCategory,
  Stage1AllocationRule,
  Stage2AllocationRule,
  CostCenter,
  OverheadExpense,
} from '../../services/overheadService.ts';

type ActiveOverheadTab = 'expenses' | 'centers' | 'profitability';

export const OverheadAllocationModule: React.FC = () => {
  const { currentUser, currentEstablishment } = useAuth();
  const { showToast } = useToast();
  const { menuProducts, setIsSimulationModalOpen } = useBusiness();
  const estId = currentEstablishment?.id || 'default';
  const role = currentUser?.role || 'cashier';

  const canView = can(role, 'overhead:view');
  const canManage = can(role, 'overhead:manage');

  const [selectedMonth, setSelectedMonth] = useState<string>(() => getCurrentMonthKey());
  const [activeTab, setActiveTab] = useState<ActiveOverheadTab>('expenses');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Filters
  const [costTypeFilter, setCostTypeFilter] = useState<'all' | CostType>('all');
  const [centerFilter, setCenterFilter] = useState<string>('all');
  const [onlyLossProducts, setOnlyLossProducts] = useState<boolean>(false);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Partial<OverheadExpense>>({});

  // Cost Center Modal State
  const [isCenterModalOpen, setIsCenterModalOpen] = useState<boolean>(false);
  const [editingCenter, setEditingCenter] = useState<Partial<CostCenter>>({});

  // Delete Confirm + 8s Undo
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState<OverheadExpense | null>(null);
  const [confirmDeleteCenter, setConfirmDeleteCenter] = useState<CostCenter | null>(null);
  const [undoBanner, setUndoBanner] = useState<{
    kind: 'expense' | 'center';
    label: string;
    payload: OverheadExpense | CostCenter;
  } | null>(null);

  const reload = () => setRefreshTick((t) => t + 1);

  const settings = useMemo(() => overheadService.getSettings(estId), [estId, refreshTick]);
  const centers = useMemo(() => overheadService.getCostCenters(estId), [estId, refreshTick]);
  const expenses = useMemo(
    () => overheadService.getExpensesForMonth(estId, selectedMonth),
    [estId, selectedMonth, refreshTick]
  );
  const isMonthLocked = useMemo(
    () => overheadService.isMonthLocked(estId, selectedMonth),
    [estId, selectedMonth, refreshTick]
  );

  const calculationSummary = useMemo(
    () => overheadService.calculateFullProductCosting(estId, selectedMonth, menuProducts),
    [estId, selectedMonth, menuProducts, refreshTick]
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (costTypeFilter !== 'all' && exp.costType !== costTypeFilter) return false;
      if (centerFilter !== 'all' && exp.costCenterId !== centerFilter) return false;
      return true;
    });
  }, [expenses, costTypeFilter, centerFilter]);

  const displayedProducts = useMemo(() => {
    if (onlyLossProducts) {
      return calculationSummary.products.filter((p) => p.isLossAfterOverhead);
    }
    return calculationSummary.products;
  }, [calculationSummary.products, onlyLossProducts]);

  const fmt = (n: number) => Number(n.toFixed(2)).toLocaleString('ar-EG');

  // Guard: Unauthorized roles (Cashier, Waiter, Chefs)
  if (!canView) {
    return (
      <div className="max-w-3xl mx-auto p-6 mt-8" dir="rtl">
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            صلاحية الوصول مقيّدة
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            شاشة «المصاريف وتوزيعها والتكلفة الكاملة» مخصصة فقط لمحاسب التكاليف، المدير المالي، المدير العام، والمالك. غير متاحة للكاشير أو الشيفات لحماية البيانات المالية.
          </p>
        </div>
      </div>
    );
  }

  const handleModeChange = (nextMode: OverheadMode) => {
    if (!canManage) return;
    overheadService.saveSettings(estId, { mode: nextMode });
    reload();
    showToast({
      title: `تم تحديث وضع تحميل المصاريف إلى «${OVERHEAD_MODE_LABELS_AR[nextMode]}» ✓`,
      type: 'success',
    });
  };

  const handleFixedPctChange = (pct: number) => {
    if (!canManage) return;
    overheadService.saveSettings(estId, { fixedOverheadPercent: pct });
    reload();
  };

  const handleCopyPreviousMonth = () => {
    if (!canManage) return;
    try {
      const res = overheadService.copyFromPreviousMonth(estId, selectedMonth);
      reload();
      if (res.copiedCount === 0) {
        showToast({
          title: `لا توجد مصاريف جديدة للنسخ من شهر ${res.sourceMonth} (أو البنود موجودة بالفعل)`,
          type: 'warning',
        });
      } else {
        showToast({
          title: `تم نسخ ${res.copiedCount} مصروف من شهر ${res.sourceMonth} بنجاح ✓`,
          type: 'success',
        });
      }
    } catch (err: any) {
      showToast({ title: err.message || 'تعذر نسخ مصاريف الشهر السابق', type: 'error' });
    }
  };

  const handleImportHrFinance = () => {
    if (!canManage) return;
    try {
      const res = overheadService.importFromHrAndFinance(estId, selectedMonth);
      reload();
      if (res.importedCount === 0) {
        showToast({
          title: `جميع بنود الرواتب والمالية مستوردة بالفعل لشهر ${selectedMonth} دون تكرار ✓`,
          type: 'info',
        });
      } else {
        showToast({
          title: `تم استيراد ${res.importedCount} بند من الموارد البشرية والمالية بإجمالي ${fmt(res.totalImportedAmount)} ج.م ✓`,
          type: 'success',
        });
      }
    } catch (err: any) {
      showToast({ title: err.message || 'تعذر الاستيراد من الموارد البشرية والمالية', type: 'error' });
    }
  };

  const openNewExpenseModal = () => {
    setEditingExpense({
      month: selectedMonth,
      nameAr: '',
      category: 'gas',
      costType: 'indirect',
      monthlyAmount: 0,
      costCenterId: 'cc-kitchen',
      stage1Rule: 'area',
      stage2Rule: 'prep_time_minutes',
      manualProductPercents: {},
    });
    setIsExpenseModalOpen(true);
  };

  const openEditExpenseModal = (exp: OverheadExpense) => {
    setEditingExpense({ ...exp });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      overheadService.upsertExpense(estId, {
        id: editingExpense.id,
        month: editingExpense.month || selectedMonth,
        nameAr: editingExpense.nameAr || '',
        category: editingExpense.category || 'other',
        costType: editingExpense.costType || 'indirect',
        monthlyAmount: Number(editingExpense.monthlyAmount) || 0,
        costCenterId: editingExpense.costCenterId || 'cc-shared',
        stage1Rule: editingExpense.stage1Rule || 'area',
        stage2Rule: editingExpense.stage2Rule || 'equal_per_sold_unit',
        manualProductPercents: editingExpense.manualProductPercents,
        notes: editingExpense.notes,
      });
      setIsExpenseModalOpen(false);
      reload();
      showToast({ title: 'تم حفظ المصروف وقواعد التوزيع بنجاح ✓', type: 'success' });
    } catch (err: any) {
      showToast({ title: err.message || 'تعذر حفظ المصروف', type: 'error' });
    }
  };

  const handleConfirmDeleteExpense = () => {
    if (!confirmDeleteExpense || !canManage) return;
    try {
      const removed = overheadService.deleteExpense(estId, confirmDeleteExpense.id);
      setConfirmDeleteExpense(null);
      if (removed) {
        setUndoBanner({
          kind: 'expense',
          label: `تم حذف المصروف «${removed.nameAr}»`,
          payload: removed,
        });
        setTimeout(() => setUndoBanner((cur) => (cur?.payload.id === removed.id ? null : cur)), 8000);
        reload();
      }
    } catch (err: any) {
      setConfirmDeleteExpense(null);
      showToast({ title: err.message || 'تعذر حذف المصروف', type: 'error' });
    }
  };

  const openNewCenterModal = () => {
    setEditingCenter({
      nameAr: '',
      departmentKey: '',
      isShared: false,
      areaSqm: 20,
      headcount: 2,
      manualSharePercent: 10,
      active: true,
    });
    setIsCenterModalOpen(true);
  };

  const handleSaveCenter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    try {
      overheadService.upsertCostCenter(estId, {
        id: editingCenter.id,
        nameAr: editingCenter.nameAr || '',
        departmentKey: editingCenter.departmentKey || editingCenter.nameAr,
        isShared: Boolean(editingCenter.isShared),
        areaSqm: Number(editingCenter.areaSqm) || 20,
        headcount: Number(editingCenter.headcount) || 2,
        manualSharePercent: Number(editingCenter.manualSharePercent) || 0,
      });
      setIsCenterModalOpen(false);
      reload();
      showToast({ title: 'تم حفظ مركز التكلفة بنجاح ✓', type: 'success' });
    } catch (err: any) {
      showToast({ title: err.message || 'تعذر حفظ مركز التكلفة', type: 'error' });
    }
  };

  const handleConfirmDeleteCenter = () => {
    if (!confirmDeleteCenter || !canManage) return;
    try {
      const removed = overheadService.deleteCostCenter(estId, confirmDeleteCenter.id);
      setConfirmDeleteCenter(null);
      if (removed) {
        setUndoBanner({
          kind: 'center',
          label: `تم حذف مركز التكلفة «${removed.nameAr}»`,
          payload: removed,
        });
        setTimeout(() => setUndoBanner((cur) => (cur?.payload.id === removed.id ? null : cur)), 8000);
        reload();
      }
    } catch (err: any) {
      setConfirmDeleteCenter(null);
      showToast({ title: err.message || 'تعذر حذف مركز التكلفة', type: 'error' });
    }
  };

  const handleUndo = () => {
    if (!undoBanner) return;
    try {
      if (undoBanner.kind === 'expense') {
        overheadService.restoreExpense(estId, undoBanner.payload as OverheadExpense);
      } else {
        overheadService.restoreCostCenter(estId, undoBanner.payload as CostCenter);
      }
      setUndoBanner(null);
      reload();
      showToast({ title: 'تم التراجع واستعادة السجل بنجاح ✓', type: 'success' });
    } catch (err: any) {
      showToast({ title: err.message || 'تعذر الاستعادة', type: 'error' });
    }
  };

  const shiftMonth = (delta: number) => {
    if (delta < 0) {
      setSelectedMonth(getPreviousMonthKey(selectedMonth));
    } else {
      const [yStr, mStr] = selectedMonth.split('-');
      let year = parseInt(yStr, 10) || new Date().getFullYear();
      let m = (parseInt(mStr, 10) || 1) + 1;
      if (m > 12) {
        m = 1;
        year += 1;
      }
      setSelectedMonth(`${year}-${String(m).padStart(2, '0')}`);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
      {/* 1. Top Header Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                المصاريف وتوزيعها والتكلفة الكاملة
              </h1>
              {isMonthLocked ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                  <Lock className="w-3 h-3" />
                  <span>الشهر مقفل بعد الإغلاق الرسمي</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  <Unlock className="w-3 h-3" />
                  <span>شهر مفتوح للتعديل</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              تحميل المصاريف المباشرة وغير المباشرة على مرحلتين لحساب صافي ربح كل قسم وكل منتج بدقة محاسبية.
            </p>
          </div>
        </div>

        {/* Month Selector & Primary Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5">
            <Button variant="unstyled"
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white px-2 py-1 focus:outline-hidden"
            />
            <Button variant="unstyled"
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsSimulationModalOpen(true)}
            className="gap-1.5 font-bold"
          >
            <Sliders className="w-4 h-4 text-cyan-600" />
            <span>محاكاة تغيير القواعد</span>
          </Button>

          {canManage && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMonthLocked}
                onClick={handleCopyPreviousMonth}
                className="gap-1.5 font-bold"
              >
                <Copy className="w-4 h-4 text-slate-500" />
                <span>نسخ الشهر السابق</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMonthLocked}
                onClick={handleImportHrFinance}
                className="gap-1.5 font-bold"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>استيراد الرواتب والمالية</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isMonthLocked}
                onClick={openNewExpenseModal}
                className="gap-1.5 font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>مصروف جديد</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Undo Banner (8 Seconds) */}
      {undoBanner && (
        <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs shadow-sm">
          <span>{undoBanner.label}</span>
          <Button variant="unstyled"
            type="button"
            onClick={handleUndo}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-bold cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>تراجع عن الحذف</span>
          </Button>
        </div>
      )}

      {/* 2. Establishment Overhead Mode Switcher */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-xs font-black text-slate-900 dark:text-white">
            وضع احتساب التكلفة المعتمد للمنشأة
          </h2>
          <p className="text-[11px] text-slate-500">
            اختر طريقة تحميل المصاريف على المنتجات في التسعير والتقارير دون تعديل وصفات الخامات.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(OVERHEAD_MODE_LABELS_AR) as OverheadMode[]).map((modeKey) => (
            <Button variant="unstyled"
              key={modeKey}
              type="button"
              disabled={!canManage}
              onClick={() => handleModeChange(modeKey)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                settings.mode === modeKey
                  ? 'bg-cyan-600 text-white border-cyan-600'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {OVERHEAD_MODE_LABELS_AR[modeKey]}
            </Button>
          ))}

          {settings.mode === 'raw_plus_fixed_pct' && (
            <div className="flex items-center gap-2 ms-2">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">النسبة الثابتة:</span>
              <div className="w-24">
                <NumericInput
                  disabled={!canManage}
                  value={settings.fixedOverheadPercent}
                  onChange={handleFixedPctChange}
                  min={0}
                  max={200}
                  unit="%"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">إجمالي مصاريف الشهر</span>
          <strong className="text-lg font-mono font-black text-slate-900 dark:text-white mt-1 block">
            {fmt(calculationSummary.totalActualExpenses)} ج.م
          </strong>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
            مباشر: {fmt(calculationSummary.totalDirectExpenses)} · غير مباشر: {fmt(calculationSummary.totalIndirectExpenses)}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">معدل التحميل التقديري للوحدة</span>
          <strong className="text-lg font-mono font-black text-cyan-700 dark:text-cyan-400 mt-1 block">
            {fmt(calculationSummary.overallBurdenRatePerUnit)} ج.م
          </strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            متوسط النصيب التقديري للوحدة
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">المحمّل فعلياً على المبيعات</span>
          <strong className="text-lg font-mono font-black text-slate-900 dark:text-white mt-1 block">
            {fmt(calculationSummary.totalChargedOverhead)} ج.م
          </strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            بناءً على مبيعات آخر 30 يوماً
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">فروق التحميل للفترة</span>
          <strong
            className={`text-lg font-mono font-black mt-1 block ${
              calculationSummary.varianceStatus === 'over_absorbed'
                ? 'text-emerald-600'
                : calculationSummary.varianceStatus === 'under_absorbed'
                ? 'text-rose-600'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {calculationSummary.totalOverheadVariance > 0
              ? `ناقص ${fmt(Math.abs(calculationSummary.totalOverheadVariance))}`
              : calculationSummary.totalOverheadVariance < 0
              ? `زائد ${fmt(Math.abs(calculationSummary.totalOverheadVariance))}`
              : '0'}{' '}
            ج.م
          </strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {calculationSummary.varianceStatus === 'over_absorbed'
              ? 'تحميل زائد عن المصروف الفعلي'
              : calculationSummary.varianceStatus === 'under_absorbed'
              ? 'تحميل ناقص (فجوة مصاريف غير مستردة)'
              : 'تحميل متوازن'}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 block">أصناف خاسرة بعد التحميل</span>
          <strong
            className={`text-lg font-mono font-black mt-1 block ${
              calculationSummary.lossMakingProducts.length > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {calculationSummary.lossMakingProducts.length} صنف
          </strong>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            من إجمالي {calculationSummary.products.length} صنف مفعّل
          </span>
        </div>
      </div>

      {/* 4. Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <Button variant="unstyled"
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-cyan-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          1. جدول المصاريف وقواعد التوزيع ({expenses.length})
        </Button>

        <Button variant="unstyled"
          type="button"
          onClick={() => setActiveTab('centers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'centers'
              ? 'bg-cyan-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          2. مراكز التكلفة والأقسام ({centers.length})
        </Button>

        <Button variant="unstyled"
          type="button"
          onClick={() => setActiveTab('profitability')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'profitability'
              ? 'bg-cyan-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          3. ربحية الأقسام والمنتجات بالتكلفة الكاملة
        </Button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: EXPENSES & ALLOCATION RULES */}
      {/* =================================================================== */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Illustrative Notice & Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="px-3.5 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
              المبالغ الافتراضية المبدئية أمثلة توضيحية لتسهيل التهيئة — يمكنك تعديل أي مصروف أو حذفه أو استيراد الرواتب والمصاريف الحقيقية لشهرك.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                <Button variant="unstyled"
                  type="button"
                  onClick={() => setCostTypeFilter('all')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                    costTypeFilter === 'all' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white' : 'text-slate-500'
                  }`}
                >
                  الكل
                </Button>
                <Button variant="unstyled"
                  type="button"
                  onClick={() => setCostTypeFilter('direct')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                    costTypeFilter === 'direct' ? 'bg-white dark:bg-slate-900 shadow-xs text-cyan-700' : 'text-slate-500'
                  }`}
                >
                  مباشر
                </Button>
                <Button variant="unstyled"
                  type="button"
                  onClick={() => setCostTypeFilter('indirect')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                    costTypeFilter === 'indirect' ? 'bg-white dark:bg-slate-900 shadow-xs text-amber-700' : 'text-slate-500'
                  }`}
                >
                  غير مباشر
                </Button>
              </div>

              <select
                value={centerFilter}
                onChange={(e) => setCenterFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
              >
                <option value="all">كل مراكز التكلفة</option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            {filteredExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300">
                  لا توجد مصاريف مسجلة للشهر المحدد ({selectedMonth})
                </p>
                <p>اضغط على «مصروف جديد» أو «نسخ الشهر السابق» أو «استيراد الرواتب والمالية» للبدء.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 text-start">بند المصروف</th>
                      <th className="py-3 px-3 text-start">التصنيف والنوع</th>
                      <th className="py-3 px-3 text-start">مركز التكلفة</th>
                      <th className="py-3 px-3 text-start">المرحلة ١ (المشترك)</th>
                      <th className="py-3 px-3 text-start">المرحلة ٢ (المنتجات)</th>
                      <th className="py-3 px-3 text-end">المبلغ الشهري</th>
                      {canManage && <th className="py-3 px-3 text-center">إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredExpenses.map((exp) => {
                      const center = centers.find((c) => c.id === exp.costCenterId);
                      const isSharedCenter = center?.isShared || exp.costCenterId === 'cc-shared';
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">{exp.nameAr}</div>
                            {exp.sourceModule && exp.sourceModule !== 'manual' && (
                              <span className="text-[10px] text-cyan-700 dark:text-cyan-400">
                                مستورد: {exp.sourceModule === 'hr' ? 'الموارد البشرية' : 'المالية'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="block font-medium text-slate-700 dark:text-slate-300">
                              {EXPENSE_CATEGORY_LABELS_AR[exp.category]}
                            </span>
                            <span
                              className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                exp.costType === 'direct'
                                  ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {exp.costType === 'direct' ? 'مباشر' : 'غير مباشر'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                            {center?.nameAr || 'مشترك'}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                            {isSharedCenter ? STAGE1_RULE_LABELS_AR[exp.stage1Rule] : 'مباشر للقسم'}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                            {STAGE2_RULE_LABELS_AR[exp.stage2Rule]}
                          </td>
                          <td className="py-3 px-3 text-end font-mono font-black text-slate-900 dark:text-white">
                            {fmt(exp.monthlyAmount)} ج.م
                          </td>
                          {canManage && (
                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1">
                                <Button variant="unstyled"
                                  type="button"
                                  disabled={isMonthLocked}
                                  onClick={() => openEditExpenseModal(exp)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                  title="تعديل"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button variant="unstyled"
                                  type="button"
                                  disabled={isMonthLocked}
                                  onClick={() => setConfirmDeleteExpense(exp)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: COST CENTERS */}
      {/* =================================================================== */}
      {activeTab === 'centers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              تُستخدم بيانات المساحة وعدد العاملين والنسب اليدوية لتوزيع مصاريف المركز «مشترك» على الأقسام التشغيلية.
            </p>
            {canManage && (
              <Button type="button" variant="primary" size="sm" onClick={openNewCenterModal} className="gap-1.5 font-bold">
                <Plus className="w-4 h-4" />
                <span>مركز تكلفة جديد</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centers.map((cc) => (
              <div
                key={cc.id}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">{cc.nameAr}</h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        {cc.code} · {cc.isShared ? 'مركز مشترك' : 'قسم تشغيلي'}
                      </span>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button variant="unstyled"
                        type="button"
                        onClick={() => {
                          setEditingCenter({ ...cc });
                          setIsCenterModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-600 cursor-pointer"
                        title="تعديل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      {!cc.isShared && (
                        <Button variant="unstyled"
                          type="button"
                          onClick={() => setConfirmDeleteCenter(cc)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {!cc.isShared && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">المساحة</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{cc.areaSqm} م²</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">العاملون</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{cc.headcount} فرد</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">النسبة اليدوية</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{cc.manualSharePercent}%</strong>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: DEPARTMENT & PRODUCT FULL COST PROFITABILITY */}
      {/* =================================================================== */}
      {activeTab === 'profitability' && (
        <div className="space-y-6">
          {/* Department Summary & Burden Rates */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ربحية مراكز التكلفة والأقسام ومعدلات التحميل ({selectedMonth})
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                يوضّح نصيب كل قسم من مصاريفه المباشرة وحصته من «مشترك»، ومعدل التحميل وفروق التحميل للوحدات المباعة.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-start">القسم / المركز</th>
                    <th className="py-3 px-3 text-end">مباشر + خاص</th>
                    <th className="py-3 px-3 text-end">حصة المشترك</th>
                    <th className="py-3 px-3 text-end">إجمالي المصاريف</th>
                    <th className="py-3 px-3 text-end">معدل التحميل/وحدة</th>
                    <th className="py-3 px-3 text-end">المحمّل فعلياً</th>
                    <th className="py-3 px-3 text-end">فروق التحميل</th>
                    <th className="py-3 px-3 text-end">صافي ربح القسم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {calculationSummary.centers.map((cs) => (
                    <tr key={cs.costCenterId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {cs.costCenterNameAr}
                        <span className="block text-[10px] font-normal text-slate-400">
                          {cs.productsCount} صنف · {cs.actualSoldUnits} وحدة مباعة
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end font-mono">{fmt(cs.directPool + cs.indirectOwnPool)} ج.م</td>
                      <td className="py-3 px-3 text-end font-mono text-amber-600">{fmt(cs.sharedAllocatedIn)} ج.م</td>
                      <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 dark:text-white">{fmt(cs.totalPool)} ج.م</td>
                      <td className="py-3 px-3 text-end font-mono text-cyan-700 dark:text-cyan-400">{fmt(cs.burdenRatePerUnit)} ج.م</td>
                      <td className="py-3 px-3 text-end font-mono">{fmt(cs.chargedAmount)} ج.م</td>
                      <td
                        className={`py-3 px-3 text-end font-mono font-bold ${
                          cs.varianceStatus === 'over_absorbed'
                            ? 'text-emerald-600'
                            : cs.varianceStatus === 'under_absorbed'
                            ? 'text-rose-600'
                            : 'text-slate-500'
                        }`}
                      >
                        {cs.varianceAmount > 0
                          ? `ناقص ${fmt(Math.abs(cs.varianceAmount))}`
                          : cs.varianceAmount < 0
                          ? `زائد ${fmt(Math.abs(cs.varianceAmount))}`
                          : '0'}{' '}
                        ج.م
                      </td>
                      <td
                        className={`py-3 px-3 text-end font-mono font-black ${
                          cs.netProfitTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {fmt(cs.netProfitTotal)} ج.م ({cs.marginPercent}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Full Profitability */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  ربحية المنتجات بالتكلفة الكاملة
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  تكشف المنتجات التي قد تبدو رابحة على الخامات فقط لكنها تصبح خاسرة بعد تحميل مصاريف التشغيل.
                </p>
              </div>
              <Button variant="unstyled"
                type="button"
                onClick={() => setOnlyLossProducts((v) => !v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                  onlyLossProducts
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white dark:bg-slate-800 text-rose-600 border-rose-200 dark:border-rose-800'
                }`}
              >
                عرض الخاسرة بعد التحميل فقط ({calculationSummary.lossMakingProducts.length})
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-start">المنتج والمركز</th>
                    <th className="py-3 px-3 text-end">سعر البيع</th>
                    <th className="py-3 px-3 text-end">خامات وتجهيزات</th>
                    <th className="py-3 px-3 text-end">عمالة مباشرة</th>
                    <th className="py-3 px-3 text-end">غير مباشرة + مستهلكات</th>
                    <th className="py-3 px-3 text-end">التكلفة الكاملة</th>
                    <th className="py-3 px-3 text-end">صافي الربح</th>
                    <th className="py-3 px-3 text-center">التقييم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedProducts.map((p) => (
                    <tr
                      key={p.productId}
                      className={
                        p.isLossAfterOverhead
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{p.productNameAr}</div>
                        <span className="text-[10px] text-slate-400">
                          {p.costCenterNameAr} · {p.effectivePrepTimeMinutes} دقيقة
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-bold">{fmt(p.sellingPrice)} ج.م</td>
                      <td className="py-3 px-3 text-end font-mono">{fmt(p.rawCost + p.prepCost)} ج.م</td>
                      <td className="py-3 px-3 text-end font-mono text-cyan-700 dark:text-cyan-400">{fmt(p.directLabor)} ج.م</td>
                      <td className="py-3 px-3 text-end font-mono text-amber-600">{fmt(p.indirectOverhead + p.consumables)} ج.م</td>
                      <td className="py-3 px-3 text-end font-mono font-black text-slate-900 dark:text-white">{fmt(p.fullCost)} ج.م</td>
                      <td
                        className={`py-3 px-3 text-end font-mono font-black ${
                          p.fullProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {fmt(p.fullProfit)} ج.م ({p.fullMarginPercent}%)
                      </td>
                      <td className="py-3 px-3 text-center">
                        {p.isLossAfterOverhead ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <AlertTriangle className="w-3 h-3" />
                            <span>خاسر بعد التحميل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>مربح</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: ADD / EDIT EXPENSE */}
      {/* =================================================================== */}
      <ModalShell
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title={editingExpense.id ? 'تعديل مصروف وقواعد توزيعه' : 'إضافة مصروف شهري جديد'}
        size="lg"
      >
        <form onSubmit={handleSaveExpense} className="space-y-4 text-xs" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المصروف:</label>
              <input
                type="text"
                required
                placeholder="مثال: فاتورة غاز المطبخ"
                value={editingExpense.nameAr || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, nameAr: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ الشهري (ج.م):</label>
              <NumericInput
                value={editingExpense.monthlyAmount || 0}
                onChange={(val) => setEditingExpense({ ...editingExpense, monthlyAmount: val })}
                min={0}
                step={50}
                unit="ج.م"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">النوع المحاسبي:</label>
              <select
                value={editingExpense.costType || 'indirect'}
                onChange={(e) => setEditingExpense({ ...editingExpense, costType: e.target.value as CostType })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="direct">مباشر (عمالة مباشرة / مستهلكات)</option>
                <option value="indirect">غير مباشر (إيجار / كهرباء / غاز / صيانة...)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">التصنيف:</label>
              <select
                value={editingExpense.category || 'other'}
                onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value as ExpenseCategory })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                {(Object.keys(EXPENSE_CATEGORY_LABELS_AR) as ExpenseCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORY_LABELS_AR[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">مركز التكلفة:</label>
              <select
                value={editingExpense.costCenterId || 'cc-shared'}
                onChange={(e) => setEditingExpense({ ...editingExpense, costCenterId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {editingExpense.costCenterId === 'cc-shared' && (
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  قاعدة المرحلة ١ (توزيع «مشترك» على الأقسام):
                </label>
                <select
                  value={editingExpense.stage1Rule || 'area'}
                  onChange={(e) => setEditingExpense({ ...editingExpense, stage1Rule: e.target.value as Stage1AllocationRule })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  {(Object.keys(STAGE1_RULE_LABELS_AR) as Stage1AllocationRule[]).map((r) => (
                    <option key={r} value={r}>
                      {STAGE1_RULE_LABELS_AR[r]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                قاعدة المرحلة ٢ (توزيع نصيب القسم على المنتجات):
              </label>
              <select
                value={editingExpense.stage2Rule || 'equal_per_sold_unit'}
                onChange={(e) => setEditingExpense({ ...editingExpense, stage2Rule: e.target.value as Stage2AllocationRule })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                {(Object.keys(STAGE2_RULE_LABELS_AR) as Stage2AllocationRule[]).map((r) => (
                  <option key={r} value={r}>
                    {STAGE2_RULE_LABELS_AR[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editingExpense.stage2Rule === 'manual_percent' && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 max-h-44 overflow-y-auto">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                تحديد النسب اليدوية لكل منتج (%):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {menuProducts.slice(0, 12).map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                    <span className="truncate text-[11px] font-bold">{prod.nameAr}</span>
                    <div className="w-20 shrink-0">
                      <NumericInput
                        value={editingExpense.manualProductPercents?.[prod.id] ?? 0}
                        onChange={(val) =>
                          setEditingExpense({
                            ...editingExpense,
                            manualProductPercents: {
                              ...(editingExpense.manualProductPercents || {}),
                              [prod.id]: val,
                            },
                          })
                        }
                        min={0}
                        max={100}
                        unit="%"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsExpenseModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              حفظ المصروف
            </Button>
          </div>
        </form>
      </ModalShell>

      {/* =================================================================== */}
      {/* MODAL: ADD / EDIT COST CENTER */}
      {/* =================================================================== */}
      <ModalShell
        isOpen={isCenterModalOpen}
        onClose={() => setIsCenterModalOpen(false)}
        title={editingCenter.id ? `تعديل مركز التكلفة: ${editingCenter.nameAr}` : 'إضافة مركز تكلفة جديد'}
        size="md"
      >
        <form onSubmit={handleSaveCenter} className="space-y-4 text-xs" dir="rtl">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم مركز التكلفة:</label>
            <input
              type="text"
              required
              placeholder="مثال: قسم المشويات"
              value={editingCenter.nameAr || ''}
              onChange={(e) => setEditingCenter({ ...editingCenter, nameAr: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المساحة (م²):</label>
              <NumericInput
                value={editingCenter.areaSqm || 20}
                onChange={(val) => setEditingCenter({ ...editingCenter, areaSqm: val })}
                min={1}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عدد العاملين:</label>
              <NumericInput
                value={editingCenter.headcount || 2}
                onChange={(val) => setEditingCenter({ ...editingCenter, headcount: val })}
                min={1}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">النسبة اليدوية %:</label>
              <NumericInput
                value={editingCenter.manualSharePercent || 10}
                onChange={(val) => setEditingCenter({ ...editingCenter, manualSharePercent: val })}
                min={0}
                max={100}
                unit="%"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCenterModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" size="sm" className="font-bold">
              حفظ المركز
            </Button>
          </div>
        </form>
      </ModalShell>

      {/* =================================================================== */}
      {/* MODAL: DELETE CONFIRMATION (EXPENSE OR CENTER) */}
      {/* =================================================================== */}
      <ModalShell
        isOpen={!!confirmDeleteExpense || !!confirmDeleteCenter}
        onClose={() => {
          setConfirmDeleteExpense(null);
          setConfirmDeleteCenter(null);
        }}
        title="تأكيد الحذف"
        size="sm"
      >
        <div className="space-y-4 text-xs" dir="rtl">
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            هل تريد بالتأكيد حذف{' '}
            <strong className="text-slate-900 dark:text-white">
              «{confirmDeleteExpense?.nameAr || confirmDeleteCenter?.nameAr}»
            </strong>
            ؟ يمكنك التراجع خلال 8 ثوانٍ بعد الحذف.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmDeleteExpense(null);
                setConfirmDeleteCenter(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={confirmDeleteExpense ? handleConfirmDeleteExpense : handleConfirmDeleteCenter}
              className="font-bold"
            >
              نعم، احذف
            </Button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};
