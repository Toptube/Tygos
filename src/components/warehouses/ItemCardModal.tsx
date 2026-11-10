/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ITEM CARD MODAL (كارت الصنف - رحلة الخامة وحركات الأرصدة) (Package 2 - Section 3)
 *
 * Shows:
 * 1. Current stock in ALL locations (Main warehouse, Central kitchen, Kitchen, Bar, Bakery...).
 * 2. Mixed compound units display («1 كرتونة و 10 علب و 500 مل»).
 * 3. Detailed chronological movement ledger (Date, Time, Type, From/To, In/Out, Balance after, Document, Employee).
 * 4. Filters (Date, Location, Movement Type) and Print view.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ModalShell } from '../common/ModalShell.tsx';
import { Button } from '../common/Button.tsx';
import {
  FileText,
  Printer,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Building,
  Layers,
  Calendar,
  Clock,
  UserCheck,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';
import { warehouseService, StockMovementRecord } from '../../services/warehouseService.ts';
import { RawMaterialItem } from '../../services/dataService.ts';
import { multiUnitService } from '../../services/multiUnitService.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface ItemCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: RawMaterialItem | null;
  materialId?: string | null;
  establishmentId?: string;
}

export const ItemCardModal: React.FC<ItemCardModalProps> = ({
  isOpen,
  onClose,
  material: materialProp,
  materialId,
  establishmentId = 'default',
}) => {
  const { formatNumber } = useI18n();

  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const material = useMemo(() => {
    if (materialProp) return materialProp;
    if (materialId) {
      const all = warehouseService.getMaterials(establishmentId);
      return all.find((m) => m.id === materialId) || null;
    }
    return null;
  }, [materialProp, materialId, establishmentId]);

  const cardData = useMemo(() => {
    if (!material) return null;
    try {
      return warehouseService.getItemCardData(establishmentId, material.id, {
        locationId: locationFilter,
        movementType: typeFilter,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate + 'T23:59:59').toISOString() : undefined,
      });
    } catch {
      return null;
    }
  }, [material, establishmentId, locationFilter, typeFilter, startDate, endDate, refreshKey]);

  if (!isOpen || !material || !cardData) return null;

  const { locationStockBreakdown, movements, totalBaseStock, formattedTotalMixed } = cardData;

  const handlePrint = () => {
    window.print();
  };

  const getMovementBadge = (type: StockMovementRecord['type']) => {
    switch (type) {
      case 'purchase_receipt':
        return { label: 'استلام شراء', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' };
      case 'section_issue':
        return { label: 'صرف لقسم', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' };
      case 'sales':
        return { label: 'مبيعات كاشير', bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' };
      case 'transfer':
        return { label: 'تحويل داخلي', bg: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' };
      case 'waste':
        return { label: 'هالك وتالف', bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' };
      case 'inventory_audit':
        return { label: 'جرد فعلي', bg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' };
      case 'reconciliation':
        return { label: 'تسوية', bg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' };
      default:
        return { label: 'حركة مخزنية', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' };
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`كارت الصنف: ${material.nameAr}`}
      subtitle={`سجل حركات وأرصدة الخامة في كافة المخازن والأقسام (${material.category})`}
      size="4xl"
      headerExtra={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="gap-1.5 font-bold"
        >
          <Printer className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>طباعة الكارت</span>
        </Button>
      }
    >
      <div className="space-y-5 p-4 sm:p-6 overflow-y-auto">
        {/* 1. Header Metrics: Total Stock & Packaging Chain */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              إجمالي الرصيد الفعلي في المنشأة
            </span>
            <div className="text-lg font-black text-cyan-700 dark:text-cyan-300 mt-1">
              {formattedTotalMixed}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              يعادل ({formatNumber(totalBaseStock)} {material.baseUnit || material.consumptionUnit})
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-bold">سلسلة وحدات التعبئة</span>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1.5 space-y-0.5">
              {material.majorUnit && (
                <div>• الكبرى: 1 {material.majorUnit} = {material.majorUnitCapacity || 1} {material.subUnit || 'فرعية'}</div>
              )}
              {material.subUnit && (
                <div>• الفرعية: 1 {material.subUnit} = {material.subUnitCapacity || 1} {material.baseUnit || material.consumptionUnit}</div>
              )}
              <div>• الأساسية: {material.baseUnit || material.consumptionUnit || 'جم'}</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500 font-bold">حد إعادة الطلب وسعر الشراء</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              سعر الشراء: {formatNumber(material.purchasePrice)} ج.م / {material.purchaseUnit}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              حد الأمان: {formatNumber(material.reorderPoint)} {material.consumptionUnit}
            </div>
          </div>
        </div>

        {/* 2. Current Stock Breakdown Across ALL Locations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>الرصيد الحالي في كل مكان (مخازن وأقسام):</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {locationStockBreakdown.map((item) => (
              <div
                key={item.warehouse.id}
                className={`p-3 rounded-xl border transition-all ${
                  item.baseStock <= 0
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {item.warehouse.nameAr}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    {item.warehouse.type === 'main'
                      ? 'رئيسي'
                      : item.warehouse.type === 'central_kitchen'
                      ? 'مطبخ مركزي'
                      : 'قسم'}
                  </span>
                </div>

                <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {item.formattedMixed}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                  <span>{formatNumber(item.baseStock)} {material.baseUnit || material.consumptionUnit}</span>
                  {item.inTransitBase > 0 && (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      +{formatNumber(item.inTransitBase)} في الطريق
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Filters Bar */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Location filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500">المكان:</span>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium"
              >
                <option value="all">كل الأماكن</option>
                {locationStockBreakdown.map((item) => (
                  <option key={item.warehouse.id} value={item.warehouse.id}>
                    {item.warehouse.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500">نوع الحركة:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium"
              >
                <option value="all">كل الحركات</option>
                <option value="purchase_receipt">استلام شراء</option>
                <option value="section_issue">صرف لقسم</option>
                <option value="sales">مبيعات كاشير</option>
                <option value="transfer">تحويل داخلي</option>
                <option value="waste">هالك وتالف</option>
                <option value="inventory_audit">جرد فعلي</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setLocationFilter('all');
              setTypeFilter('all');
              setStartDate('');
              setEndDate('');
              setRefreshKey((k) => k + 1);
            }}
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>إعادة ضبط</span>
          </button>
        </div>

        {/* 4. Movements Ledger Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 text-start">التاريخ والساعة</th>
                  <th className="py-2.5 px-3 text-start">نوع الحركة</th>
                  <th className="py-2.5 px-3 text-start">من / إلى</th>
                  <th className="py-2.5 px-3 text-end">الوارد (+)</th>
                  <th className="py-2.5 px-3 text-end">المنصرف (-)</th>
                  <th className="py-2.5 px-3 text-end">الرصيد بعدها</th>
                  <th className="py-2.5 px-3 text-start">المستند والموظف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      لا توجد حركات مسجلة مطابقة للفلاتر المختارة
                    </td>
                  </tr>
                ) : (
                  movements.map((mov) => {
                    const badge = getMovementBadge(mov.type);
                    const isPositive = mov.quantityBase > 0;
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap" dir="ltr">
                          {new Date(mov.date).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          <div className="font-semibold">{mov.fromLocationNameAr}</div>
                          <div className="text-[10px] text-slate-400">← {mov.toLocationNameAr}</div>
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {isPositive ? `+${formatNumber(mov.quantityBase)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-rose-600 dark:text-rose-400">
                          {!isPositive ? `${formatNumber(Math.abs(mov.quantityBase))}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                          {formatNumber(mov.balanceAfterBase)} {material.baseUnit || material.consumptionUnit}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{mov.referenceDoc}</div>
                          <div className="text-[10px] text-slate-500">{mov.actorName}</div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
