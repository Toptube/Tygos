/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHYSICAL INVENTORY AUDIT & PERIOD CLOSING SERVICE (Package 3)
 *
 * Requirements:
 * - Multi-location physical inventory audit (Kitchen, Bar, Bakery, Pastry, Main & Sub warehouses, per branch).
 * - Adjustable shelf / rack counting order (ترتيب الرفوف).
 * - Exact Formula:
 *   Estimated Stock = Opening Stock + Total In (Receipts, In-transfers) - Total Out (POS recipe-deducted sales, waste, Out-transfers).
 *   CRITICAL: "In-Transit" (في الطريق) quantities are segregated and NEVER counted as section stock.
 * - Days columns with In/Out splits, mixed units in sections ("2 كرتونة و 2 علبة و 500 مل") vs major/base in warehouses.
 * - Daily discrepancy status: Green (+) for surplus, Red (-) for deficit.
 * - Persistent columns: Estimated Stock, Physical Stock, Variance (Quantity, Value in EGP, Percent %), and Reason.
 * - Cumulative variance across the period, with immutable frozen numbers for closed days.
 * - Two Closing Modes:
 *   1. Test/Draft Audit (جرد اختباري): Computes variances without locking the period.
 *   2. Official Period Close (إغلاق فعلي): Closes period, freezes balances, logs reconciliation entry.
 * - Preparation for future extension: accepts `extraCountSource` (تجهيزات نصف مصنعة).
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';
import { warehouseService, WarehouseLocation, StockMovementRecord } from './warehouseService.ts';
import { multiUnitService } from './multiUnitService.ts';
import { RawMaterialItem } from './dataService.ts';
import { dailyNotesService } from './dailyNotesService.ts';

export type AuditPeriodType = 'draft' | 'closed';

export interface AuditDailyRecord {
  date: string; // YYYY-MM-DD
  inBase: number;
  outBase: number;
  physicalCountBase?: number;
  varianceBase?: number;
  isClosed?: boolean;
}

export interface AuditItemRecord {
  materialId: string;
  materialNameAr: string;
  categoryAr: string;
  rackOrder: number; // ترتيب الرفوف
  openingStockBase: number;
  totalInBase: number;
  totalOutBase: number;
  inTransitBase: number; // كميات في الطريق مفصولة
  estimatedStockBase: number; // التقديري = أول + وارد - منصرف
  physicalStockBase: number; // الفعلي المعدود
  extraSemiFinishedBase?: number; // مصدر إضافي للتجهيزات المتبقية مستقبلاً
  totalActualStockBase: number; // الفعلي + الإضافي
  varianceBase: number; // الانحراف بالكمية (فعلي - تقديري)
  varianceCostEgp: number; // قيمة الانحراف بالجنيه المصري
  variancePercent: number; // نسبة الانحراف
  status: 'surplus' | 'deficit' | 'balanced'; // فائض (+) أخضر أو عجز (-) أحمر
  reason?: string;
  notes?: string;
  isLocked?: boolean;
  dailyRecords: AuditDailyRecord[];
}

export interface AuditPeriod {
  id: string;
  establishmentId: string;
  branchId: string;
  branchNameAr: string;
  warehouseId: string;
  warehouseNameAr: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: AuditPeriodType;
  closedAt?: string;
  closedBy?: string;
  isOfficialClose?: boolean;
  notes?: string;
  items: AuditItemRecord[];
  createdAt: string;
  updatedAt: string;
}

class InventoryAuditService {
  private storage = getStorageAdapter();

  private getPeriodsKey(estId: string): string {
    return `tygos_${estId}_audit_periods`;
  }

  private getRackOrderKey(estId: string, whId: string): string {
    return `tygos_${estId}_wh_${whId}_rack_order`;
  }

  public getPeriods(establishmentId: string = 'default'): AuditPeriod[] {
    const raw = this.storage.getItemSync(this.getPeriodsKey(establishmentId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public savePeriods(establishmentId: string, periods: AuditPeriod[]): void {
    this.storage.setItemSync(this.getPeriodsKey(establishmentId), JSON.stringify(periods));
  }

  public getRackOrder(establishmentId: string, warehouseId: string): Record<string, number> {
    const raw = this.storage.getItemSync(this.getRackOrderKey(establishmentId, warehouseId));
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  public saveRackOrder(
    establishmentId: string,
    warehouseId: string,
    orderMap: Record<string, number>
  ): void {
    this.storage.setItemSync(
      this.getRackOrderKey(establishmentId, warehouseId),
      JSON.stringify(orderMap)
    );
  }

  /**
   * Generates or fetches an active audit period for a given warehouse and date range.
   */
  public getOrCreatePeriod(
    establishmentId: string,
    branchId: string,
    warehouseId: string,
    startDate: string,
    endDate: string
  ): AuditPeriod {
    const periods = this.getPeriods(establishmentId);
    let period = periods.find(
      (p) =>
        p.branchId === branchId &&
        p.warehouseId === warehouseId &&
        p.startDate === startDate &&
        p.endDate === endDate
    );

    if (period) return period;

    const warehouses = warehouseService.getWarehouses(establishmentId);
    const branches = warehouseService.getBranches(establishmentId);
    const wh = warehouses.find((w) => w.id === warehouseId) || warehouses[0];
    const branch = branches.find((b) => b.id === branchId) || branches[0];

    const materials = warehouseService.getMaterials(establishmentId);
    const rackOrderMap = this.getRackOrder(establishmentId, warehouseId);
    const movements = warehouseService.getMovements(establishmentId);

    // Calculate dates array
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const items: AuditItemRecord[] = materials.map((mat, idx) => {
      const rackOrder = rackOrderMap[mat.id] !== undefined ? rackOrderMap[mat.id] : idx + 1;
      const currentWhStock = mat.warehouseStockMap?.[wh.id] || 0;
      const inTransitStock = mat.inTransitStockMap?.[wh.id] || 0;

      // Filter movements for this warehouse within date range
      const whMovements = movements.filter(
        (m) =>
          m.materialId === mat.id &&
          (m.fromLocationId === wh.id || m.toLocationId === wh.id) &&
          m.date >= `${startDate}T00:00:00.000Z` &&
          m.date <= `${endDate}T23:59:59.999Z`
      );

      let totalIn = 0;
      let totalOut = 0;

      // Daily breakdown
      const dailyRecords: AuditDailyRecord[] = dates.map((dateStr) => {
        const dayMovs = whMovements.filter((m) => m.date.startsWith(dateStr));
        let dayIn = 0;
        let dayOut = 0;

        dayMovs.forEach((m) => {
          if (m.toLocationId === wh.id) {
            dayIn += Math.abs(m.quantityBase);
          } else if (m.fromLocationId === wh.id) {
            dayOut += Math.abs(m.quantityBase);
          }
        });

        totalIn += dayIn;
        totalOut += dayOut;

        return {
          date: dateStr,
          inBase: dayIn,
          outBase: dayOut,
          physicalCountBase: undefined,
          varianceBase: undefined,
          isClosed: false,
        };
      });

      // Opening stock calculation:
      // If no past movements, opening stock = current stock + totalOut - totalIn
      const openingStockBase = Math.max(0, currentWhStock + totalOut - totalIn);

      // Estimated Stock Formula:
      // Opening + In - Out
      // In-transit is deliberately EXCLUDED from section estimated stock!
      const estimatedStockBase = Math.max(0, openingStockBase + totalIn - totalOut);
      const physicalStockBase = currentWhStock;
      const extraSemiFinishedBase = 0; // Future hook
      const totalActualStockBase = physicalStockBase + extraSemiFinishedBase;

      const varianceBase = Math.round((totalActualStockBase - estimatedStockBase) * 1000) / 1000;
      const unitCost = mat.costPerUnit || (mat.purchasePrice / (mat.conversionFactor || 1)) || 1;
      const varianceCostEgp = Math.round(varianceBase * unitCost * 100) / 100;
      const variancePercent =
        estimatedStockBase > 0
          ? Math.round((varianceBase / estimatedStockBase) * 1000) / 10
          : varianceBase !== 0
          ? 100
          : 0;

      const status: 'surplus' | 'deficit' | 'balanced' =
        varianceBase > 0.001 ? 'surplus' : varianceBase < -0.001 ? 'deficit' : 'balanced';

      return {
        materialId: mat.id,
        materialNameAr: mat.nameAr,
        categoryAr: mat.category,
        rackOrder,
        openingStockBase,
        totalInBase: totalIn,
        totalOutBase: totalOut,
        inTransitBase: inTransitStock,
        estimatedStockBase,
        physicalStockBase,
        extraSemiFinishedBase,
        totalActualStockBase,
        varianceBase,
        varianceCostEgp,
        variancePercent,
        status,
        dailyRecords,
        isLocked: false,
      };
    });

    // Sort items by rackOrder
    items.sort((a, b) => a.rackOrder - b.rackOrder);

    const newPeriod: AuditPeriod = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId,
      branchId: branch.id,
      branchNameAr: branch.nameAr,
      warehouseId: wh.id,
      warehouseNameAr: wh.nameAr,
      startDate,
      endDate,
      type: 'draft',
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    periods.unshift(newPeriod);
    this.savePeriods(establishmentId, periods);
    return newPeriod;
  }

  /**
   * Updates physical count for an item (supports typing keyboard in any unit).
   */
  public recordPhysicalCount(
    establishmentId: string,
    periodId: string,
    materialId: string,
    countQuantity: number,
    countUnit: 'major' | 'sub' | 'base',
    reason?: string,
    notes?: string,
    authorName: string = 'محاسب التكاليف',
    dateStr?: string,
    extraCountSource?: number // Hook for semi-finished goods
  ): AuditPeriod {
    const periods = this.getPeriods(establishmentId);
    const pIndex = periods.findIndex((p) => p.id === periodId);
    if (pIndex === -1) throw new Error('فترة الجرد غير موجودة');

    const period = periods[pIndex];
    if (period.type === 'closed') {
      throw new Error('لا يمكن تعديل الجرد بعد الإغلاق الفعلي للفترة إلا بصلاحية مدير');
    }

    const item = period.items.find((i) => i.materialId === materialId);
    if (!item) throw new Error('الخامة غير موجودة في جدول الجرد');

    const materials = warehouseService.getMaterials(establishmentId);
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) throw new Error('الخامة غير موجودة');

    const physicalStockBase = multiUnitService.convertToBase(countQuantity, countUnit, mat);
    item.physicalStockBase = physicalStockBase;
    if (extraCountSource !== undefined) {
      item.extraSemiFinishedBase = extraCountSource;
    }

    const extra = item.extraSemiFinishedBase || 0;
    item.totalActualStockBase = Math.round((physicalStockBase + extra) * 1000) / 1000;

    item.varianceBase = Math.round((item.totalActualStockBase - item.estimatedStockBase) * 1000) / 1000;
    const unitCost = mat.costPerUnit || (mat.purchasePrice / (mat.conversionFactor || 1)) || 1;
    item.varianceCostEgp = Math.round(item.varianceBase * unitCost * 100) / 100;
    item.variancePercent =
      item.estimatedStockBase > 0
        ? Math.round((item.varianceBase / item.estimatedStockBase) * 1000) / 10
        : item.varianceBase !== 0
        ? 100
        : 0;

    item.status =
      item.varianceBase > 0.001 ? 'surplus' : item.varianceBase < -0.001 ? 'deficit' : 'balanced';

    if (reason !== undefined) item.reason = reason;
    if (notes !== undefined) item.notes = notes;

    // Update daily count if date provided
    if (dateStr) {
      const day = item.dailyRecords.find((d) => d.date === dateStr);
      if (day) {
        day.physicalCountBase = physicalStockBase;
        day.varianceBase = item.varianceBase;
      }
    }

    // Auto-save daily note if notes/reason provided by cost accountant
    if (notes && notes.trim().length > 0) {
      dailyNotesService.addNote(establishmentId, {
        branchId: period.branchId,
        warehouseId: period.warehouseId,
        materialId: mat.id,
        materialNameAr: mat.nameAr,
        authorName,
        authorRole: 'cost_accountant',
        text: notes.trim(),
        targetSection: period.warehouseNameAr,
      });
    }

    period.updatedAt = new Date().toISOString();
    periods[pIndex] = period;
    this.savePeriods(establishmentId, periods);
    return period;
  }

  /**
   * Reorders items for rack/shelf counting.
   */
  public updateRackOrder(
    establishmentId: string,
    periodId: string,
    materialId: string,
    newOrder: number
  ): AuditPeriod {
    const periods = this.getPeriods(establishmentId);
    const period = periods.find((p) => p.id === periodId);
    if (!period) throw new Error('فترة الجرد غير موجودة');

    const item = period.items.find((i) => i.materialId === materialId);
    if (item) {
      item.rackOrder = newOrder;
      period.items.sort((a, b) => a.rackOrder - b.rackOrder);

      // Save rack order mapping
      const rackMap: Record<string, number> = {};
      period.items.forEach((it, idx) => {
        it.rackOrder = idx + 1;
        rackMap[it.materialId] = it.rackOrder;
      });
      this.saveRackOrder(establishmentId, period.warehouseId, rackMap);
      this.savePeriods(establishmentId, periods);
    }

    return period;
  }

  /**
   * Closes Period:
   * - Test Audit (`isOfficialClose: false`): updates computations, keeps editable.
   * - Official Close (`isOfficialClose: true`): locks period, generates reconciliation entries.
   */
  public closePeriod(
    establishmentId: string,
    periodId: string,
    isOfficialClose: boolean,
    closedBy: string = 'محاسب التكاليف',
    notes?: string
  ): { period: AuditPeriod; reconciliationEntries: number } {
    const periods = this.getPeriods(establishmentId);
    const pIndex = periods.findIndex((p) => p.id === periodId);
    if (pIndex === -1) throw new Error('فترة الجرد غير موجودة');

    const period = periods[pIndex];

    if (!isOfficialClose) {
      // Test audit: keep draft, update calculations
      period.notes = notes || 'جرد اختباري تدقيقي للمراجعة والفحص';
      period.updatedAt = new Date().toISOString();
      periods[pIndex] = period;
      this.savePeriods(establishmentId, periods);
      return { period, reconciliationEntries: 0 };
    }

    // Official Period Close: Freeze records and reconcile
    period.type = 'closed';
    period.isOfficialClose = true;
    period.closedAt = new Date().toISOString();
    period.closedBy = closedBy;
    period.notes = notes || 'إغلاق فعلي واعتماد أرصدة الجرد وتسوية الانحرافات';
    period.updatedAt = new Date().toISOString();

    const materials = warehouseService.getMaterials(establishmentId);
    let reconciliationEntries = 0;

    period.items.forEach((item) => {
      item.isLocked = true;
      item.dailyRecords.forEach((d) => (d.isClosed = true));

      const mat = materials.find((m) => m.id === item.materialId);
      if (mat) {
        if (!mat.warehouseStockMap) mat.warehouseStockMap = {};

        // Update warehouse stock to match physical counted stock
        const prevStock = mat.warehouseStockMap[period.warehouseId] || 0;
        mat.warehouseStockMap[period.warehouseId] = item.totalActualStockBase;

        // If variance exists, create reconciliation movement
        if (Math.abs(item.varianceBase) > 0.001) {
          reconciliationEntries++;
          warehouseService.recordMovement(establishmentId, {
            materialId: mat.id,
            materialNameAr: mat.nameAr,
            type: 'reconciliation',
            typeNameAr: 'تسوية انحراف جرد',
            fromLocationId: period.warehouseId,
            fromLocationNameAr: period.warehouseNameAr,
            toLocationId: item.varianceBase > 0 ? period.warehouseId : 'waste_inventory_loss',
            toLocationNameAr: item.varianceBase > 0 ? 'فائض جرد معتمد' : 'عجز جرد معتمد',
            quantityBase: item.varianceBase,
            balanceAfterBase: item.totalActualStockBase,
            referenceDoc: `إغلاق جرد #${period.id}`,
            actorName: closedBy,
            notes: `تسوية جردية رسمية للفترة [${period.startDate} إلى ${period.endDate}] - سبب: ${item.reason || 'إغلاق دوري'}`,
          });
        }
      }
    });

    warehouseService.saveMaterials(establishmentId, materials);
    periods[pIndex] = period;
    this.savePeriods(establishmentId, periods);

    return { period, reconciliationEntries };
  }
}

export const inventoryAuditService = new InventoryAuditService();
