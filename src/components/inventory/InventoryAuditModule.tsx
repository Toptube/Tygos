/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHYSICAL INVENTORY AUDIT & VARIANCE MODULE (شاشة الجرد والانحراف - Package 3)
 *
 * Core Features:
 * - Branch filter (فلتر الفرع) & Location selector (Kitchen, Bar, Bakery, Main warehouse).
 * - Adjustable shelf counting order (ترتيب الرفوف).
 * - Exact Formula: Estimated = Opening + In - Out.
 * - Segregated "In-Transit" (في الطريق) column - NOT added to section stock.
 * - Days with In/Out splits and mixed units decomposition.
 * - Keyboard numeric input for physical counts with live base unit conversion.
 * - Surplus (+) in Green, Deficit (-) in Red.
 * - Permanent columns: Estimated, Physical, Variance (Qty, Value in EGP, %), Reason.
 * - Two Closing Modes:
 *   1. "جرد اختباري" (Test audit, computes variance without locking period).
 *   2. "إغلاق فعلي" (Official close, locks period, produces reconciliation entry).
 * - Integration with Daily Notes (الملاحظات اليومية) & Item Card («فتح كارت الصنف»).
 * - Receive Purchase Order modal («استلام مشتريات للمخزن الرئيسي»).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardCheck,
  Calendar,
  Building2,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Lock,
  Unlock,
  Printer,
  Plus,
  Search,
  ExternalLink,
  ChevronDown,
  Info,
  Truck,
  Layers,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { warehouseService, Branch, WarehouseLocation } from '../../services/warehouseService.ts';
import {
  inventoryAuditService,
  AuditPeriod,
  AuditItemRecord,
} from '../../services/inventoryAuditService.ts';
import { multiUnitService } from '../../services/multiUnitService.ts';
import { ItemCardModal } from '../warehouses/ItemCardModal.tsx';
import {
  semiFinishedService,
  SemiFinishedItem,
  DecomposedRawRequirement,
} from '../../services/semiFinishedService.ts';

export const InventoryAuditModule: React.FC = () => {
  const { currentUser, currentEstablishment } = useAuth();
  const user = currentUser;
  const establishmentId = currentEstablishment?.id || 'default';
  const { showToast } = useToast();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  // Duration preset: 'week' | 'month' | 'custom'
  const [durationPreset, setDurationPreset] = useState<'week' | 'month' | 'custom'>('week');

  // Date range (defaults to current week)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [currentPeriod, setCurrentPeriod] = useState<AuditPeriod | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'surplus' | 'deficit' | 'balanced'>('all');

  // Remaining Preparations Modal state (Package 4 - Section 7)
  const [isRemainingPrepsModalOpen, setIsRemainingPrepsModalOpen] = useState<boolean>(false);
  const [selectedPrepIdForRemaining, setSelectedPrepIdForRemaining] = useState<string>('');
  const [remainingPrepAmount, setRemainingPrepAmount] = useState<number>(5);
  const [remainingPrepPortionId, setRemainingPrepPortionId] = useState<string>('');
  const [decomposedPreview, setDecomposedPreview] = useState<DecomposedRawRequirement[]>([]);

  // Daily Report Modal state (Package 3 - Section 0-د)
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState<boolean>(false);

  // Item Card Modal state
  const [selectedMaterialIdForCard, setSelectedMaterialIdForCard] = useState<string | null>(null);

  // Day breakdown modal
  const [selectedDayBreakdown, setSelectedDayBreakdown] = useState<{
    date: string;
    item: AuditItemRecord;
  } | null>(null);

  // Receive Purchase Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [purchaseMaterialId, setPurchaseMaterialId] = useState<string>('');
  const [purchaseQty, setPurchaseQty] = useState<number>(10);
  const [purchaseUnit, setPurchaseUnit] = useState<'major' | 'sub' | 'base'>('sub');
  const [purchaseUnitPrice, setPurchaseUnitPrice] = useState<number>(20);
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState<string>('');
  const [purchaseSupplier, setPurchaseSupplier] = useState<string>('شركة التوريدات الممتازة');

  // Load branches & warehouses
  useEffect(() => {
    const brs = warehouseService.getBranches(establishmentId);
    setBranches(brs);

    const whs = warehouseService.getWarehouses(establishmentId);
    setWarehouses(whs);

    if (whs.length > 0 && !selectedWarehouseId) {
      // Default to kitchen section warehouse or first warehouse
      const kitchenWh = whs.find((w) => w.sectionType === 'kitchen') || whs[0];
      setSelectedWarehouseId(kitchenWh.id);
      setSelectedBranchId(kitchenWh.branchId);
    }
  }, [establishmentId]);

  // Load / reload Audit Period
  const loadPeriod = () => {
    if (!selectedWarehouseId) return;
    const wh = warehouses.find((w) => w.id === selectedWarehouseId);
    const branchId = wh?.branchId || branches[0]?.id || 'branch-main';

    const p = inventoryAuditService.getOrCreatePeriod(
      establishmentId,
      branchId,
      selectedWarehouseId,
      startDate,
      endDate
    );
    setCurrentPeriod(p);
  };

  useEffect(() => {
    loadPeriod();
  }, [establishmentId, selectedWarehouseId, startDate, endDate, warehouses]);

  // Filter warehouses by branch
  const filteredWarehouses = useMemo(() => {
    if (selectedBranchId === 'all') return warehouses;
    return warehouses.filter((w) => w.branchId === selectedBranchId);
  }, [warehouses, selectedBranchId]);

  // Handle Physical Count Input
  const handlePhysicalCountChange = (
    materialId: string,
    valStr: string,
    unit: 'major' | 'sub' | 'base' = 'base'
  ) => {
    if (!currentPeriod || currentPeriod.type === 'closed') return;
    const count = parseFloat(valStr);
    if (isNaN(count) || count < 0) return;

    try {
      const updated = inventoryAuditService.recordPhysicalCount(
        establishmentId,
        currentPeriod.id,
        materialId,
        count,
        unit,
        undefined,
        undefined,
        user?.fullName || 'محاسب التكاليف'
      );
      setCurrentPeriod({ ...updated });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في تسجيل الجرد', type: 'error' });
    }
  };

  // Handle Reason / Note change
  const handleReasonNoteChange = (
    materialId: string,
    reason: string,
    notes: string
  ) => {
    if (!currentPeriod || currentPeriod.type === 'closed') return;
    try {
      const item = currentPeriod.items.find((i) => i.materialId === materialId);
      const updated = inventoryAuditService.recordPhysicalCount(
        establishmentId,
        currentPeriod.id,
        materialId,
        item?.physicalStockBase || 0,
        'base',
        reason,
        notes,
        user?.fullName || 'محاسب التكاليف'
      );
      setCurrentPeriod({ ...updated });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في حفظ الملاحظة', type: 'error' });
    }
  };

  // Handle Close Period (Draft or Official)
  const handleClosePeriodAction = (isOfficial: boolean) => {
    if (!currentPeriod) return;
    try {
      const { period, reconciliationEntries } = inventoryAuditService.closePeriod(
        establishmentId,
        currentPeriod.id,
        isOfficial,
        user?.fullName || 'محاسب التكاليف',
        isOfficial
          ? 'تم الإغلاق الفعلي واعتماد الأرصدة وتسوية الفروقات'
          : 'جرد اختباري تدقيقي'
      );
      setCurrentPeriod({ ...period });

      if (isOfficial) {
        const ovMsg = period.overheadVarianceSummary
          ? ` — تم قفل مصاريف شهر [${period.overheadVarianceSummary.month}] (${period.overheadVarianceSummary.labelAr})`
          : '';
        showToast({
          title: `تم الإغلاق الفعلي للفترة بنجاح وتثبيت الأرصدة وتسجيل ${reconciliationEntries} قيد تسوية ✓${ovMsg}`,
          type: 'success',
        });
      } else {
        showToast({
          title: 'تم حفظ الجرد الاختباري وحساب الانحرافات بنجاح دون إغلاق الفترة ✓',
          type: 'success',
        });
      }
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في إغلاق الفترة', type: 'error' });
    }
  };

  // Handle Submit Purchase Order
  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseMaterialId) {
      showToast({ title: 'يرجى اختيار الخامة المستلمة', type: 'warning' });
      return;
    }

    try {
      const materials = warehouseService.getMaterials(establishmentId);
      const mat = materials.find((m) => m.id === purchaseMaterialId);
      if (!mat) return;

      const qtyBase = multiUnitService.convertToBase(purchaseQty, purchaseUnit, mat);
      const unitPriceBase = purchaseUnitPrice;

      warehouseService.receivePurchaseOrder(establishmentId, {
        materialId: mat.id,
        quantityBase: qtyBase,
        unitPriceBase,
        invoiceNumber: purchaseInvoiceNumber || `INV-${Date.now().toString().slice(-5)}`,
        supplierName: purchaseSupplier,
        targetWarehouseId: 'wh-main', // Enters Main Warehouse
        actorName: user?.fullName || 'أمين المخزن الرئيسي',
      });

      setIsPurchaseModalOpen(false);
      loadPeriod();
      showToast({
        title: `تم استلام الشراء للخامة [${mat.nameAr}] بنجاح في المخزن الرئيسي وتحديث متوسط التكلفة ✓`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في استلام الشراء', type: 'error' });
    }
  };

  // Duration Presets (Package 3 - Section 0-ج)
  const handleSelectDurationPreset = (preset: 'week' | 'month' | 'custom') => {
    setDurationPreset(preset);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    setEndDate(endStr);

    if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setStartDate(d.toISOString().split('T')[0]);
    }
  };

  // Remaining Preparations Preview (Package 4 - Section 7)
  const handleUpdateRemainingPreview = (prepId: string, amount: number, portionId?: string) => {
    setSelectedPrepIdForRemaining(prepId);
    setRemainingPrepAmount(amount);
    setRemainingPrepPortionId(portionId || '');
    if (!prepId || amount <= 0) {
      setDecomposedPreview([]);
      return;
    }
    const decomposed = semiFinishedService.calculateEquivalentRawForRemainingPrep(
      establishmentId,
      prepId,
      amount,
      portionId
    );
    setDecomposedPreview(decomposed);
  };

  // Confirm Remaining Preparations and Add to Raw Physical Audit
  const handleConfirmRemainingPreparations = () => {
    if (!currentPeriod || decomposedPreview.length === 0) return;

    try {
      decomposedPreview.forEach((raw) => {
        const item = currentPeriod.items.find((i) => i.materialId === raw.materialId);
        if (item) {
          const currentExtra = item.extraSemiFinishedBase || 0;
          const newExtra = currentExtra + raw.requiredBaseQty;
          inventoryAuditService.recordPhysicalCount(
            establishmentId,
            currentPeriod.id,
            raw.materialId,
            item.physicalStockBase,
            'base',
            item.reason,
            item.notes ? `${item.notes} | منها بالتجهيزات: ${raw.viaPrepNameAr}` : `منها بالتجهيزات: ${raw.viaPrepNameAr}`,
            user?.fullName || 'محاسب التكاليف',
            undefined,
            newExtra
          );
        }
      });

      loadPeriod();
      setIsRemainingPrepsModalOpen(false);
      showToast({
        title: 'تم اعتماد مكافئ التجهيزات المتبقية وإضافتها للجرد الفعلي بنجاح ✓',
        message: 'تم دمج الخامات المكافئة تحت خانة «منها داخل تجهيزات» دون مساس بالأرصدة النظرية',
        type: 'success',
      });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في اعتماد التجهيزات', type: 'error' });
    }
  };

  // Filter items in table
  const filteredItems = useMemo(() => {
    if (!currentPeriod) return [];
    return currentPeriod.items.filter((item) => {
      const matchesSearch =
        item.materialNameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryAr.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ? true : item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [currentPeriod, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    if (!currentPeriod) return { total: 0, surplus: 0, deficit: 0, netCost: 0, inTransit: 0 };
    let surplus = 0;
    let deficit = 0;
    let netCost = 0;
    let inTransit = 0;

    currentPeriod.items.forEach((item) => {
      if (item.status === 'surplus') surplus++;
      if (item.status === 'deficit') deficit++;
      netCost += item.varianceCostEgp;
      inTransit += item.inTransitBase;
    });

    return {
      total: currentPeriod.items.length,
      surplus,
      deficit,
      netCost: Math.round(netCost * 100) / 100,
      inTransit,
    };
  }, [currentPeriod]);

  // Format number
  const fmt = (n: number) => {
    return Number(n.toFixed(2)).toLocaleString('ar-EG');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
      {/* 1. Header & Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                الجرد الفعلي ومراقبة الانحراف
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                مقارنة الرصيد التقديري بالفعلي المعدود، استبعاد بضاعة «في الطريق»، وإغلاق الفترات المحاسبية.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsRemainingPrepsModalOpen(true);
              const preps = semiFinishedService.getPreparations(establishmentId);
              if (preps.length > 0 && !selectedPrepIdForRemaining) {
                handleUpdateRemainingPreview(preps[0].id, 5);
              }
            }}
            className="gap-1.5 font-bold text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-700 bg-cyan-50 dark:bg-cyan-950/40"
          >
            <Layers className="w-4 h-4 text-cyan-600" />
            <span>إدخال التجهيزات المتبقية (عجين/صوص)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDailyReportModalOpen(true)}
            className="gap-1.5 font-bold text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/40"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-600" />
            <span>التقرير اليومي التلقائي</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPurchaseModalOpen(true)}
            className="gap-1.5 font-bold"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>استلام مشتريات</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleClosePeriodAction(false)}
            disabled={currentPeriod?.type === 'closed'}
            className="gap-1.5 font-bold text-slate-700 dark:text-slate-200"
          >
            <Unlock className="w-4 h-4 text-amber-500" />
            <span>جرد اختباري</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => handleClosePeriodAction(true)}
            disabled={currentPeriod?.type === 'closed'}
            className="gap-1.5 font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
          >
            <Lock className="w-4 h-4" />
            <span>إغلاق فعلي للفترة</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة</span>
          </Button>
        </div>
      </div>

      {/* 2. Filters & Location Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        {/* Branch Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            الفرع:
          </label>
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                // Adjust warehouse if needed
                const match = warehouses.find(
                  (w) => e.target.value === 'all' || w.branchId === e.target.value
                );
                if (match) setSelectedWarehouseId(match.id);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Warehouse / Section Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            المخزن أو القسم المراد جرده:
          </label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
          >
            {filteredWarehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nameAr} ({w.type === 'section' ? `قسم: ${w.sectionType}` : w.type})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range & Duration Presets (Package 3 - Section 0-ج) */}
        <div className="sm:col-span-2 space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              فترة الجرد:
            </label>
            <div className="flex items-center gap-1">
              <Button variant="unstyled"
                type="button"
                onClick={() => handleSelectDurationPreset('week')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                  durationPreset === 'week'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                أسبوع
              </Button>
              <Button variant="unstyled"
                type="button"
                onClick={() => handleSelectDurationPreset('month')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                  durationPreset === 'month'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                شهر
              </Button>
              <Button variant="unstyled"
                type="button"
                onClick={() => setDurationPreset('custom')}
                className={`px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer ${
                  durationPreset === 'custom'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                مخصصة
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDurationPreset('custom');
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDurationPreset('custom');
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Summary Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">حالة الفترة</span>
          <div className="flex items-center gap-1.5 mt-1">
            {currentPeriod?.type === 'closed' ? (
              <span className="flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded">
                <Lock className="w-3.5 h-3.5" /> مغلقة فعلياً
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                <Unlock className="w-3.5 h-3.5" /> مفتوحة / مسودة
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">أصناف بزيادة (+)</span>
          <div className="text-lg font-black text-emerald-600 mt-0.5">{stats.surplus} خامة</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">أصناف بعجز (−)</span>
          <div className="text-lg font-black text-rose-600 mt-0.5">{stats.deficit} خامة</div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500">صافي قيمة الانحراف</span>
          <div
            className={`text-lg font-black mt-0.5 ${
              stats.netCost >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {fmt(stats.netCost)} ج.م
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-purple-500" />
            <span>«في الطريق» للقسم</span>
          </span>
          <div className="text-lg font-black text-purple-600 mt-0.5">
            {fmt(stats.inTransit)} <span className="text-xs font-normal">أساسي</span>
          </div>
        </div>
      </div>

      {/* Period Close Overhead Absorption Variance Banner (Package 5) */}
      {currentPeriod?.overheadVarianceSummary && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
              <Lock className="w-4 h-4 text-rose-600" />
              <span>تم قفل مصاريف شهر {currentPeriod.overheadVarianceSummary.month} وحساب فروق التحميل</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {currentPeriod.overheadVarianceSummary.labelAr}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 block font-sans">المصاريف الفعلية</span>
              <strong className="text-slate-900 dark:text-white">{fmt(currentPeriod.overheadVarianceSummary.totalExpenses)} ج.م</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-sans">المحمّل على المبيعات</span>
              <strong className="text-cyan-700 dark:text-cyan-400">{fmt(currentPeriod.overheadVarianceSummary.totalCharged)} ج.م</strong>
            </div>
            <div>
              <span className="text-slate-500 block font-sans">فروق التحميل</span>
              <strong
                className={
                  currentPeriod.overheadVarianceSummary.status === 'over_absorbed'
                    ? 'text-emerald-600'
                    : currentPeriod.overheadVarianceSummary.status === 'under_absorbed'
                    ? 'text-rose-600'
                    : 'text-slate-700 dark:text-slate-300'
                }
              >
                {fmt(currentPeriod.overheadVarianceSummary.varianceAmount)} ج.م
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 4. Table Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالخامة أو التصنيف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <Button variant="unstyled"
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            الكل ({currentPeriod?.items.length || 0})
          </Button>
          <Button variant="unstyled"
            type="button"
            onClick={() => setStatusFilter('deficit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'deficit'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            عجز فقط (−)
          </Button>
          <Button variant="unstyled"
            type="button"
            onClick={() => setStatusFilter('surplus')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'surplus'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            فائض فقط (+)
          </Button>
          <Button variant="unstyled"
            type="button"
            onClick={() => setStatusFilter('balanced')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'balanced'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            مطابق
          </Button>
        </div>
      </div>

      {/* 5. Main Physical Audit Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-3 text-center w-12">ترتيب</th>
                <th className="py-3 px-3 text-start">الخامة والتصنيف</th>
                <th className="py-3 px-3 text-end">أول الفترة</th>
                <th className="py-3 px-3 text-end text-emerald-600">الوارد (+)</th>
                <th className="py-3 px-3 text-end text-rose-600">المنصرف (−)</th>
                <th className="py-3 px-3 text-end text-purple-600 font-bold bg-purple-50/50 dark:bg-purple-950/20">
                  في الطريق
                </th>
                <th className="py-3 px-3 text-end font-bold text-slate-900 dark:text-white bg-slate-100/60 dark:bg-slate-800/40">
                  التقديري
                </th>
                <th className="py-3 px-3 text-center w-36 bg-cyan-50/40 dark:bg-cyan-950/20 text-cyan-900 dark:text-cyan-300 font-bold">
                  الجرد الفعلي
                </th>
                <th className="py-3 px-3 text-end font-bold">الانحراف (كمية)</th>
                <th className="py-3 px-3 text-end font-bold">الانحراف (ج.م)</th>
                <th className="py-3 px-3 text-start min-w-[180px]">السبب والملاحظات</th>
                <th className="py-3 px-3 text-center w-16">كارت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => {
                const isSurplus = item.status === 'surplus';
                const isDeficit = item.status === 'deficit';

                return (
                  <tr
                    key={item.materialId}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Rack order */}
                    <td className="py-3 px-2 text-center text-slate-400 font-mono">
                      {item.rackOrder}
                    </td>

                    {/* Material */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.materialNameAr}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.categoryAr}</div>
                    </td>

                    {/* Opening Stock */}
                    <td className="py-3 px-3 text-end font-mono text-slate-600 dark:text-slate-400">
                      {fmt(item.openingStockBase)}
                    </td>

                    {/* Total In */}
                    <td className="py-3 px-3 text-end font-mono text-emerald-600 font-bold">
                      +{fmt(item.totalInBase)}
                    </td>

                    {/* Total Out */}
                    <td className="py-3 px-3 text-end font-mono text-rose-600 font-bold">
                      −{fmt(item.totalOutBase)}
                    </td>

                    {/* In-Transit (Segregated) */}
                    <td className="py-3 px-3 text-end font-mono text-purple-600 font-bold bg-purple-50/30 dark:bg-purple-950/10">
                      {item.inTransitBase > 0 ? fmt(item.inTransitBase) : '—'}
                    </td>

                    {/* Estimated Stock */}
                    <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/20">
                      {fmt(item.estimatedStockBase)}
                    </td>

                    {/* Physical Count Input */}
                    <td className="py-3 px-3 bg-cyan-50/20 dark:bg-cyan-950/10 text-center">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={currentPeriod?.type === 'closed'}
                        defaultValue={item.physicalStockBase}
                        onBlur={(e) =>
                          handlePhysicalCountChange(item.materialId, e.target.value, 'base')
                        }
                        className="w-28 px-2 py-1 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      />
                      {item.extraSemiFinishedBase && item.extraSemiFinishedBase > 0 ? (
                        <div className="text-[10px] text-cyan-700 dark:text-cyan-300 font-bold mt-1">
                          منها بالتجهيزات: +{fmt(item.extraSemiFinishedBase)}
                          <span className="block text-slate-500 font-mono">
                            الإجمالي: {fmt(item.totalActualStockBase)}
                          </span>
                        </div>
                      ) : null}
                    </td>

                    {/* Variance Qty */}
                    <td
                      className={`py-3 px-3 text-end font-mono font-bold ${
                        isSurplus
                          ? 'text-emerald-600'
                          : isDeficit
                          ? 'text-rose-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.varianceBase > 0 ? `+${fmt(item.varianceBase)}` : fmt(item.varianceBase)}
                    </td>

                    {/* Variance Cost EGP */}
                    <td
                      className={`py-3 px-3 text-end font-mono font-bold ${
                        isSurplus
                          ? 'text-emerald-600'
                          : isDeficit
                          ? 'text-rose-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.varianceCostEgp > 0
                        ? `+${fmt(item.varianceCostEgp)}`
                        : fmt(item.varianceCostEgp)}{' '}
                      ج.م
                    </td>

                    {/* Reason & Notes Input */}
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="سبب الانحراف أو ملاحظة..."
                        disabled={currentPeriod?.type === 'closed'}
                        defaultValue={item.notes || item.reason || ''}
                        onBlur={(e) =>
                          handleReasonNoteChange(item.materialId, e.target.value, e.target.value)
                        }
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                      />
                    </td>

                    {/* Item Card Trigger */}
                    <td className="py-3 px-2 text-center">
                      <Button variant="unstyled"
                        type="button"
                        onClick={() => setSelectedMaterialIdForCard(item.materialId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors"
                        title="فتح كارت الصنف"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    لا توجد خامات مطابقة لشروط البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Purchase Receipt Modal */}
      {isPurchaseModalOpen && (
        <ModalShell
          isOpen={isPurchaseModalOpen}
          onClose={() => setIsPurchaseModalOpen(false)}
          title="إذن استلام مشتريات (للمخزن الرئيسي)"
          subtitle="إدخال بضاعة للمخزن وتحديث متوسط التكلفة المرجح (WAC) وتسجيل حركة فورية"
          size="lg"
        >
          <form onSubmit={handleSavePurchaseOrder} className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الخامة المشتراة:
              </label>
              <select
                value={purchaseMaterialId}
                onChange={(e) => setPurchaseMaterialId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="">-- اختر الخامة --</option>
                {warehouseService.getMaterials(establishmentId).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameAr} ({m.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الكمية المشتراة:
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={purchaseQty}
                  onChange={(e) => setPurchaseQty(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الوحدة:
                </label>
                <select
                  value={purchaseUnit}
                  onChange={(e) => setPurchaseUnit(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="major">وحدة كبرى (كرتونة/شوال)</option>
                  <option value="sub">وحدة تجزئة (علبة/كيس/زجاجة)</option>
                  <option value="base">وحدة أساسية (جرام/مل/قطعة)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سعر الشراء (للوحدة الأساسية):
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={purchaseUnitPrice}
                  onChange={(e) => setPurchaseUnitPrice(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الفاتورة / المستند:
                </label>
                <input
                  type="text"
                  placeholder="INV-1049"
                  value={purchaseInvoiceNumber}
                  onChange={(e) => setPurchaseInvoiceNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم المورد:
              </label>
              <input
                type="text"
                value={purchaseSupplier}
                onChange={(e) => setPurchaseSupplier(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsPurchaseModalOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" className="bg-emerald-600 text-white font-bold">
                تأكيد الاستلام بالمخزن
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* 8. Remaining Preparations Modal (Package 4 - Section 7) */}
      {isRemainingPrepsModalOpen && (
        <ModalShell
          isOpen={isRemainingPrepsModalOpen}
          onClose={() => setIsRemainingPrepsModalOpen(false)}
          title="إدخال التجهيزات المتبقية (تحويل المتبقي لخامات أولية)"
          size="lg"
        >
          <div className="space-y-4" dir="rtl">
            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200 space-y-1">
              <p className="font-bold">تحويل المتبقي من التجهيزات والصيغ لخامات أولية بالجرد:</p>
              <p>
                أدخل الكميات المتبقية على خط الطهي أو الثلاجات (مثل: 5 كجم صوص بيتزا أو 6 بولة أرز أو 10 قطع عجين)، وسيقوم النظام فوراً بتفكيكها إلى مكافئها الدقيق من الخامات الأولية وإضافتها لخانة «منها داخل تجهيزات» دون مساس بالأرصدة النظرية.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اختر التجهيز المتبقي:
                </label>
                <select
                  value={selectedPrepIdForRemaining}
                  onChange={(e) =>
                    handleUpdateRemainingPreview(e.target.value, remainingPrepAmount, remainingPrepPortionId)
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                >
                  <option value="">-- اختر التجهيز --</option>
                  {semiFinishedService.getPreparations(establishmentId).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameAr} ({p.category}) - {p.totalYield} {p.yieldUnit}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الكمية المتبقية:
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={remainingPrepAmount}
                  onChange={(e) =>
                    handleUpdateRemainingPreview(
                      selectedPrepIdForRemaining,
                      parseFloat(e.target.value) || 0,
                      remainingPrepPortionId
                    )
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              </div>
            </div>

            {/* If prep has portions, allow choosing portion */}
            {(() => {
              const selectedPrep = semiFinishedService.getPreparationById(
                establishmentId,
                selectedPrepIdForRemaining
              );
              if (!selectedPrep || selectedPrep.portions.length === 0) return null;
              return (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    أو اختر بالحصص المسمّاة:
                  </label>
                  <select
                    value={remainingPrepPortionId}
                    onChange={(e) =>
                      handleUpdateRemainingPreview(
                        selectedPrepIdForRemaining,
                        remainingPrepAmount,
                        e.target.value
                      )
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="">بالوحدة المباشرة ({selectedPrep.yieldUnit})</option>
                    {selectedPrep.portions.map((portion) => (
                      <option key={portion.id} value={portion.id}>
                        {portion.nameAr} ({portion.sizeInYieldUnits} {selectedPrep.yieldUnit})
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            {/* Live Decomposition Preview Card */}
            {decomposedPreview.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    المعاينة الفورية قبل الاعتماد (يعادل بالخامات الأولية):
                  </span>
                  <span className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400">
                    {decomposedPreview.length} خامات أولية
                  </span>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {decomposedPreview.map((raw) => (
                    <div key={raw.materialId} className="py-2 flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {raw.materialNameAr}
                      </span>
                      <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        {raw.requiredBaseQty} {raw.baseUnit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRemainingPrepsModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={decomposedPreview.length === 0}
                onClick={handleConfirmRemainingPreparations}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
              >
                اعتماد وإضافة للجرد الفعلي للخامات
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 9. Daily Report Modal (Package 3 - Section 0-د) */}
      {isDailyReportModalOpen && currentPeriod && (
        <ModalShell
          isOpen={isDailyReportModalOpen}
          onClose={() => setIsDailyReportModalOpen(false)}
          title="التقرير اليومي التلقائي لحركة الجرد والانحراف"
          size="xl"
        >
          <div className="space-y-4" dir="rtl">
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
              <p className="font-bold">حركة الأيام التلقائية خلال الفترة:</p>
              <p>
                تفصيل حركة كل يوم على حدة: إجمالي الوارد، المنصرف، ورصيد الجرد والانحراف المسجل مع الأسباب والملاحظات المدونة.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-900/60 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 text-start">التاريخ</th>
                    <th className="p-3 text-end text-emerald-600">إجمالي الوارد (+)</th>
                    <th className="p-3 text-end text-rose-600">إجمالي المنصرف (−)</th>
                    <th className="p-3 text-end font-bold">الرصيد الفعلي</th>
                    <th className="p-3 text-end font-bold">الانحراف</th>
                    <th className="p-3 text-start">الحالة</th>
                    <th className="p-3 text-center">تفاصيل اليوم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentPeriod.items[0]?.dailyRecords?.map((daily, idx) => {
                    const dayIn = currentPeriod.items.reduce((s, it) => s + (it.dailyRecords[idx]?.inBase || 0), 0);
                    const dayOut = currentPeriod.items.reduce((s, it) => s + (it.dailyRecords[idx]?.outBase || 0), 0);
                    const dayCount = currentPeriod.items.reduce((s, it) => s + (it.dailyRecords[idx]?.physicalCountBase || 0), 0);
                    const dayVar = currentPeriod.items.reduce((s, it) => s + (it.dailyRecords[idx]?.varianceBase || 0), 0);

                    return (
                      <tr key={daily.date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {daily.date}
                        </td>
                        <td className="p-3 text-end font-mono text-emerald-600">+{fmt(dayIn)}</td>
                        <td className="p-3 text-end font-mono text-rose-600">−{fmt(dayOut)}</td>
                        <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                          {fmt(dayCount)}
                        </td>
                        <td className="p-3 text-end font-mono font-bold">
                          <span className={dayVar > 0 ? 'text-emerald-600' : dayVar < 0 ? 'text-rose-600' : 'text-slate-400'}>
                            {dayVar > 0 ? `+${fmt(dayVar)}` : fmt(dayVar)}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            daily.isClosed
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {daily.isClosed ? 'مغلق (مجمد)' : 'نشط'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            data-testid={`inspect-day-${daily.date}`}
                            onClick={() => {
                              const firstItem = currentPeriod.items[0];
                              if (firstItem) {
                                setSelectedDayBreakdown({ date: daily.date, item: firstItem });
                              }
                            }}
                            className="text-[11px] font-bold"
                          >
                            عرض الأصناف
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDailyReportModalOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 10. Day Breakdown Modal (تفاصيل اليوم لكل خامة) */}
      {selectedDayBreakdown && currentPeriod && (
        <ModalShell
          isOpen={!!selectedDayBreakdown}
          onClose={() => setSelectedDayBreakdown(null)}
          title={`تفاصيل حركات يوم ${selectedDayBreakdown.date}`}
          subtitle="الوارد (+) والمنصرف (−) والانحراف والملاحظات المسجلة (الأيام المغلقة مجمدة وغير قابلة للتعديل)"
          size="lg"
        >
          <div className="space-y-3 text-xs" dir="rtl">
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-start">
                <thead className="bg-slate-50 dark:bg-slate-900/60 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 text-start">الخامة</th>
                    <th className="p-2.5 text-end text-emerald-600">وارد (+)</th>
                    <th className="p-2.5 text-end text-rose-600">منصرف (−)</th>
                    <th className="p-2.5 text-end">الانحراف</th>
                    <th className="p-2.5 text-start">السبب والملاحظات</th>
                    <th className="p-2.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {currentPeriod.items.map((it) => {
                    const rec = it.dailyRecords.find((d) => d.date === selectedDayBreakdown.date);
                    return (
                      <tr key={it.materialId}>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">{it.materialNameAr}</td>
                        <td className="p-2.5 text-end font-mono text-emerald-600">+{fmt(rec?.inBase || 0)}</td>
                        <td className="p-2.5 text-end font-mono text-rose-600">−{fmt(rec?.outBase || 0)}</td>
                        <td className="p-2.5 text-end font-mono font-bold">
                          {rec?.varianceBase !== undefined
                            ? (rec.varianceBase > 0 ? `+${fmt(rec.varianceBase)}` : fmt(rec.varianceBase))
                            : '—'}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">
                          {it.notes || it.reason || '—'}
                        </td>
                        <td className="p-2.5 text-center">
                          {rec?.isClosed ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold text-[10px]">
                              مجمد
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-bold text-[10px]">
                              مفتوح
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedDayBreakdown(null)}>
                إغلاق
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 7. Item Card Modal */}
      {selectedMaterialIdForCard && (
        <ItemCardModal
          isOpen={!!selectedMaterialIdForCard}
          onClose={() => setSelectedMaterialIdForCard(null)}
          establishmentId={establishmentId}
          materialId={selectedMaterialIdForCard}
        />
      )}
    </div>
  );
};

export default InventoryAuditModule;
