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

export const InventoryAuditModule: React.FC = () => {
  const { user, establishmentId = 'default' } = useAuth();
  const { showToast } = useToast();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

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
        showToast({
          title: `تم الإغلاق الفعلي للفترة بنجاح وتثبيت الأرصدة وتسجيل ${reconciliationEntries} قيد تسوية ✓`,
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
                الجرد الفعلي ومراقبة الانحراف (BOM Variance)
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
            onClick={() => setIsPurchaseModalOpen(true)}
            className="gap-1.5 font-bold"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>استلام مشتريات (للمخزن الرئيسي)</span>
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
            <span>جرد اختباري (تدقيق)</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => handleClosePeriodAction(true)}
            disabled={currentPeriod?.type === 'closed'}
            className="gap-1.5 font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm"
          >
            <Lock className="w-4 h-4" />
            <span>إغلاق فعلي للفترة (قفل)</span>
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

        {/* Start Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            من تاريخ:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            إلى تاريخ:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
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
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            الكل ({currentPeriod?.items.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('deficit')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'deficit'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            عجز فقط (−)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('surplus')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'surplus'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            فائض فقط (+)
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('balanced')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              statusFilter === 'balanced'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            مطابق
          </button>
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
                      <button
                        type="button"
                        onClick={() => setSelectedMaterialIdForCard(item.materialId)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-colors"
                        title="فتح كارت الصنف"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
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
              <Button type="submit" variant="default" className="bg-emerald-600 text-white font-bold">
                تأكيد الاستلام بالمخزن
              </Button>
            </div>
          </form>
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
