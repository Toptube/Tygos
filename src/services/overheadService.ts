/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DIRECT & INDIRECT OVERHEAD COST ALLOCATION SERVICE (Package 5)
 * تحميل التكاليف المباشرة وغير المباشرة وحساب التكلفة الكاملة للمنتج
 *
 * Features:
 * - Cost Centers (مراكز التكلفة): Operational sections (مطبخ، بار، مخبز، حلواني...) + Shared («مشترك»: إدارة وصالة).
 * - Monthly Overhead Expenses Sheet with Direct (عمالة مباشرة، مستهلكات) & Indirect (إيجار، كهرباء، غاز، مياه، صيانة، إهلاك، تسويق) classification.
 * - Deduplicated import from HR payroll & Finance expenses (`externalRefId` prevents double-counting).
 * - Two-Stage Allocation Rules:
 *   - Stage 1 (مشترك -> مراكز التكلفة): مساحة، عدد عاملين، نسبة يدوية، بالتساوي.
 *   - Stage 2 (مركز التكلفة -> منتجات): بالتساوي لكل حصة مباعة، كمية المبيعات، قيمة المبيعات، تكلفة الخامات، زمن التحضير بالدقائق، نسبة يدوية.
 * - Establishment Overhead Modes:
 *   - `raw_only`: خامات فقط (0 overhead loaded).
 *   - `raw_plus_fixed_pct`: خامات + نسبة ثابتة.
 *   - `rules_based`: التوزيع بالقواعد (الوضع المتكامل على مرحلتين).
 * - Overhead Burden Rate (معدل التحميل) & Absorption Variance (فروق التحميل: زائد / ناقص) at Period Close.
 * - Month Lock upon Official Period Close + Copy Previous Month Expenses.
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';
import { orderRepository, productRepository } from '../repositories/repositories.ts';
import { MenuItemProduct } from './dataService.ts';
import { semiFinishedService } from './semiFinishedService.ts';
import { MOCK_ACCOUNTS, MOCK_EMPLOYEES } from '../data/mockData.ts';
import {
  calculateOverheadBurdenRate,
  calculateOverheadAbsorptionVariance,
} from '../domain/formulas.ts';
import { CustomerOrder } from '../domain/qrMenuTypes.ts';

export type OverheadMode = 'raw_only' | 'raw_plus_fixed_pct' | 'rules_based';

export type CostType = 'direct' | 'indirect';

export type ExpenseCategory =
  | 'direct_labor'
  | 'consumables'
  | 'rent'
  | 'electricity'
  | 'gas'
  | 'water'
  | 'maintenance'
  | 'depreciation'
  | 'marketing'
  | 'other';

export type Stage1AllocationRule = 'area' | 'headcount' | 'manual_percent' | 'equal';

export type Stage2AllocationRule =
  | 'equal_per_sold_unit'
  | 'sales_qty'
  | 'sales_revenue'
  | 'raw_material_cost'
  | 'prep_time_minutes'
  | 'manual_percent';

export const EXPENSE_CATEGORY_LABELS_AR: Record<ExpenseCategory, string> = {
  direct_labor: 'عمالة مباشرة',
  consumables: 'مستهلكات تشغيل وتغليف',
  rent: 'إيجار ومرافق مكان',
  electricity: 'كهرباء وطاقة',
  gas: 'غاز وطهي',
  water: 'مياه',
  maintenance: 'صيانة وإصلاحات',
  depreciation: 'إهلاك معدات',
  marketing: 'تسويق وإعلانات',
  other: 'مصاريف عمومية أخرى',
};

export const STAGE1_RULE_LABELS_AR: Record<Stage1AllocationRule, string> = {
  area: 'حسب المساحة (م²)',
  headcount: 'حسب عدد العاملين',
  manual_percent: 'نسبة يدوية مخصصة',
  equal: 'بالتساوي على الأقسام',
};

export const STAGE2_RULE_LABELS_AR: Record<Stage2AllocationRule, string> = {
  equal_per_sold_unit: 'بالتساوي لكل حصة مباعة',
  sales_qty: 'حسب كمية المبيعات',
  sales_revenue: 'حسب قيمة المبيعات',
  raw_material_cost: 'حسب تكلفة الخامات',
  prep_time_minutes: 'حسب زمن التحضير بالدقائق',
  manual_percent: 'نسبة يدوية للمنتجات',
};

export const OVERHEAD_MODE_LABELS_AR: Record<OverheadMode, string> = {
  raw_only: 'خامات فقط',
  raw_plus_fixed_pct: 'خامات + نسبة ثابتة',
  rules_based: 'التوزيع بالقواعد',
};

export interface CostCenter {
  id: string;
  establishmentId: string;
  code: string;
  nameAr: string;
  departmentKey: string; // 'kitchen' | 'bar' | 'bakery' | 'pastry' | 'shared' | custom
  isShared: boolean; // مركز «مشترك» (إدارة وصالة)
  areaSqm: number;
  headcount: number;
  manualSharePercent: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OverheadExpense {
  id: string;
  establishmentId: string;
  month: string; // YYYY-MM
  nameAr: string;
  category: ExpenseCategory;
  costType: CostType;
  monthlyAmount: number;
  costCenterId: string; // 'cc-shared' or operational cost center ID
  stage1Rule: Stage1AllocationRule; // How «مشترك» splits onto operational centers
  stage2Rule: Stage2AllocationRule; // How center amount splits onto products
  manualProductPercents?: Record<string, number>;
  expectedMonthlyUnitsOverride?: number;
  sourceModule?: 'manual' | 'hr' | 'finance';
  externalRefId?: string; // Deduplication ID for HR/Finance import
  notes?: string;
  isExample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OverheadSettings {
  mode: OverheadMode;
  fixedOverheadPercent: number; // Used when mode === 'raw_plus_fixed_pct'
  defaultExpectedMonthlyUnitsPerProduct: number;
}

export interface MonthLockRecord {
  month: string; // YYYY-MM
  lockedAt: string;
  lockedBy: string;
  auditPeriodId?: string;
}

export interface ProductFullCostResult {
  productId: string;
  productCode: string;
  productNameAr: string;
  category: string;
  costCenterId: string;
  costCenterNameAr: string;
  sellingPrice: number;
  expectedMonthlyUnits: number;
  actualSoldUnits: number;
  effectivePrepTimeMinutes: number;
  // Cost Breakdown Components (per 1 sold portion)
  rawCost: number;
  prepCost: number;
  directLabor: number;
  indirectOverhead: number;
  consumables: number;
  primeCost: number; // خامات + تجهيزات + عمالة مباشرة
  fullCost: number; // التكلفة الكاملة = الأولية + غير المباشرة + مستهلكات
  // Profit Metrics
  primeProfit: number;
  primeMarginPercent: number;
  fullProfit: number;
  fullMarginPercent: number;
  isLossAfterOverhead: boolean; // خاسر بعد التحميل
  appliedRulesAr: string;
  ruleDetailsAr: string[];
}

export interface CenterAllocationSummary {
  costCenterId: string;
  costCenterNameAr: string;
  directPool: number;
  indirectOwnPool: number;
  sharedAllocatedIn: number;
  totalPool: number;
  expectedUnits: number;
  actualSoldUnits: number;
  burdenRatePerUnit: number; // معدل التحميل للوحدة
  chargedAmount: number; // المحمّل على الوحدات المباعة
  varianceAmount: number; // فروق التحميل (فعلي - محمّل)
  varianceStatus: 'over_absorbed' | 'under_absorbed' | 'balanced';
  revenueTotal: number;
  fullCostTotal: number;
  netProfitTotal: number;
  marginPercent: number;
  productsCount: number;
  lossProductsCount: number;
}

export interface OverheadCalculationSummary {
  month: string;
  mode: OverheadMode;
  isLocked: boolean;
  totalActualExpenses: number;
  totalDirectExpenses: number;
  totalIndirectExpenses: number;
  totalChargedOverhead: number;
  totalOverheadVariance: number; // فعلي - محمّل (+ عجز تحميل / - فائض تحميل)
  varianceStatus: 'over_absorbed' | 'under_absorbed' | 'balanced';
  overallBurdenRatePerUnit: number;
  products: ProductFullCostResult[];
  centers: CenterAllocationSummary[];
  lossMakingProducts: ProductFullCostResult[];
}

const DEFAULT_SETTINGS: OverheadSettings = {
  mode: 'rules_based',
  fixedOverheadPercent: 15,
  defaultExpectedMonthlyUnitsPerProduct: 120,
};

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonthKey(month: string): string {
  const [yStr, mStr] = month.split('-');
  let year = parseInt(yStr, 10) || new Date().getFullYear();
  let m = parseInt(mStr, 10) || 1;
  m -= 1;
  if (m <= 0) {
    m = 12;
    year -= 1;
  }
  return `${year}-${String(m).padStart(2, '0')}`;
}

function normalizeAr(s: string): string {
  return (s || '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, '');
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

class OverheadService {
  private storage = getStorageAdapter();

  private getCostCentersKey(estId: string): string {
    return `tygos_${estId}_cost_centers`;
  }

  private getExpensesKey(estId: string): string {
    return `tygos_${estId}_overhead_expenses`;
  }

  private getSettingsKey(estId: string): string {
    return `tygos_${estId}_overhead_settings`;
  }

  private getLocksKey(estId: string): string {
    return `tygos_${estId}_overhead_locks`;
  }

  // -------------------------------------------------------------------------
  // 1. COST CENTERS (مراكز التكلفة)
  // -------------------------------------------------------------------------

  private generateSeedCostCenters(estId: string): CostCenter[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'cc-kitchen',
        establishmentId: estId,
        code: 'CC-01',
        nameAr: 'المطبخ',
        departmentKey: 'kitchen',
        isShared: false,
        areaSqm: 60,
        headcount: 6,
        manualSharePercent: 45,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cc-bar',
        establishmentId: estId,
        code: 'CC-02',
        nameAr: 'البار والمشروبات',
        departmentKey: 'bar',
        isShared: false,
        areaSqm: 25,
        headcount: 3,
        manualSharePercent: 20,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cc-bakery',
        establishmentId: estId,
        code: 'CC-03',
        nameAr: 'المخبز والبيتزا',
        departmentKey: 'bakery',
        isShared: false,
        areaSqm: 20,
        headcount: 2,
        manualSharePercent: 20,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cc-pastry',
        establishmentId: estId,
        code: 'CC-04',
        nameAr: 'الحلواني',
        departmentKey: 'pastry',
        isShared: false,
        areaSqm: 15,
        headcount: 2,
        manualSharePercent: 15,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'cc-shared',
        establishmentId: estId,
        code: 'CC-00',
        nameAr: 'مشترك (إدارة وصالة)',
        departmentKey: 'shared',
        isShared: true,
        areaSqm: 80,
        headcount: 4,
        manualSharePercent: 0,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  public getCostCenters(estId: string = 'default'): CostCenter[] {
    const raw = this.storage.getItemSync(this.getCostCentersKey(estId));
    if (!raw) {
      const seeded = this.generateSeedCostCenters(estId);
      this.saveCostCenters(estId, seeded);
      return seeded;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through
    }
    const seeded = this.generateSeedCostCenters(estId);
    this.saveCostCenters(estId, seeded);
    return seeded;
  }

  public saveCostCenters(estId: string, centers: CostCenter[]): void {
    this.storage.setItemSync(this.getCostCentersKey(estId), JSON.stringify(centers));
  }

  public upsertCostCenter(
    estId: string,
    input: Partial<CostCenter> & { nameAr: string }
  ): CostCenter {
    const list = this.getCostCenters(estId);
    const trimmedName = input.nameAr.trim();
    if (!trimmedName) {
      throw new Error('يرجى كتابة اسم مركز التكلفة');
    }

    const dup = list.find(
      (c) => c.id !== input.id && normalizeAr(c.nameAr) === normalizeAr(trimmedName)
    );
    if (dup) {
      throw new Error(`يوجد مركز تكلفة بنفس الاسم «${trimmedName}» بالفعل`);
    }

    const now = new Date().toISOString();
    const existingIdx = input.id ? list.findIndex((c) => c.id === input.id) : -1;

    if (existingIdx >= 0) {
      const updated: CostCenter = {
        ...list[existingIdx],
        ...input,
        nameAr: trimmedName,
        areaSqm: Math.max(0, Number(input.areaSqm ?? list[existingIdx].areaSqm) || 0),
        headcount: Math.max(0, Number(input.headcount ?? list[existingIdx].headcount) || 0),
        manualSharePercent: Math.max(
          0,
          Number(input.manualSharePercent ?? list[existingIdx].manualSharePercent) || 0
        ),
        updatedAt: now,
      };
      list[existingIdx] = updated;
      this.saveCostCenters(estId, list);
      return updated;
    }

    const created: CostCenter = {
      id: `cc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId: estId,
      code: input.code || `CC-${String(list.length + 1).padStart(2, '0')}`,
      nameAr: trimmedName,
      departmentKey: input.departmentKey || trimmedName,
      isShared: Boolean(input.isShared),
      areaSqm: Math.max(1, Number(input.areaSqm) || 20),
      headcount: Math.max(1, Number(input.headcount) || 2),
      manualSharePercent: Math.max(0, Number(input.manualSharePercent) || 10),
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    list.push(created);
    this.saveCostCenters(estId, list);
    return created;
  }

  public deleteCostCenter(estId: string, centerId: string): CostCenter | null {
    const list = this.getCostCenters(estId);
    const target = list.find((c) => c.id === centerId);
    if (!target) return null;
    if (target.isShared || centerId === 'cc-shared') {
      throw new Error('لا يمكن حذف المركز «مشترك» الأساسي');
    }
    const next = list.filter((c) => c.id !== centerId);
    this.saveCostCenters(estId, next);
    return target;
  }

  public restoreCostCenter(estId: string, center: CostCenter): void {
    const list = this.getCostCenters(estId);
    if (!list.some((c) => c.id === center.id)) {
      list.push(center);
      this.saveCostCenters(estId, list);
    }
  }

  /**
   * Maps a product (prepStation / category) to its operational cost center.
   */
  public resolveProductCostCenter(product: MenuItemProduct, centers?: CostCenter[]): CostCenter {
    const list = (centers || this.getCostCenters(product.establishmentId || 'default')).filter(
      (c) => !c.isShared && c.active
    );
    const fallback =
      list[0] || {
        id: 'cc-kitchen',
        establishmentId: product.establishmentId || 'default',
        code: 'CC-01',
        nameAr: 'المطبخ',
        departmentKey: 'kitchen',
        isShared: false,
        areaSqm: 60,
        headcount: 6,
        manualSharePercent: 100,
        active: true,
        createdAt: '',
        updatedAt: '',
      };

    const stationText = `${product.prepStation || ''} ${product.category || ''} ${product.nameAr || ''}`.toLowerCase();

    // Bar / Beverages
    if (
      stationText.includes('بار') ||
      stationText.includes('bar') ||
      stationText.includes('مشروب') ||
      stationText.includes('قهوة') ||
      stationText.includes('عصير') ||
      stationText.includes('لاتيه') ||
      stationText.includes('فلات وايت') ||
      stationText.includes('اسبريسو') ||
      stationText.includes('موكتيل')
    ) {
      const bar = list.find((c) => c.departmentKey === 'bar' || c.nameAr.includes('بار'));
      if (bar) return bar;
    }

    // Pastry / Desserts
    if (
      stationText.includes('حلواني') ||
      stationText.includes('حلويات') ||
      stationText.includes('pastry') ||
      stationText.includes('شوكولاته') ||
      stationText.includes('تشيز كيك') ||
      stationText.includes('كيك')
    ) {
      const pastry = list.find((c) => c.departmentKey === 'pastry' || c.nameAr.includes('حلوان'));
      if (pastry) return pastry;
    }

    // Bakery / Pizza / Oven
    if (
      stationText.includes('مخبز') ||
      stationText.includes('bakery') ||
      stationText.includes('بيتزا') ||
      stationText.includes('فرن') ||
      stationText.includes('كرواسون') ||
      stationText.includes('معجنات')
    ) {
      const bakery = list.find((c) => c.departmentKey === 'bakery' || c.nameAr.includes('مخبز'));
      if (bakery) return bakery;
    }

    // Custom explicit station match
    const exactMatch = list.find(
      (c) =>
        normalizeAr(c.nameAr) === normalizeAr(product.prepStation || '') ||
        c.departmentKey === product.prepStation
    );
    if (exactMatch) return exactMatch;

    // Default to kitchen
    return list.find((c) => c.departmentKey === 'kitchen' || c.nameAr.includes('مطبخ')) || fallback;
  }

  // -------------------------------------------------------------------------
  // 2. ESTABLISHMENT OVERHEAD SETTINGS (أوضاع التحميل)
  // -------------------------------------------------------------------------

  public getSettings(estId: string = 'default'): OverheadSettings {
    const raw = this.storage.getItemSync(this.getSettingsKey(estId));
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  public saveSettings(estId: string, partial: Partial<OverheadSettings>): OverheadSettings {
    const current = this.getSettings(estId);
    const next: OverheadSettings = {
      ...current,
      ...partial,
      fixedOverheadPercent: Math.max(0, Number(partial.fixedOverheadPercent ?? current.fixedOverheadPercent) || 0),
      defaultExpectedMonthlyUnitsPerProduct: Math.max(
        1,
        Number(partial.defaultExpectedMonthlyUnitsPerProduct ?? current.defaultExpectedMonthlyUnitsPerProduct) || 120
      ),
    };
    this.storage.setItemSync(this.getSettingsKey(estId), JSON.stringify(next));
    return next;
  }

  // -------------------------------------------------------------------------
  // 3. MONTH LOCKING (قفل الشهر عند الإغلاق الرسمي)
  // -------------------------------------------------------------------------

  public getLockedMonths(estId: string = 'default'): MonthLockRecord[] {
    const raw = this.storage.getItemSync(this.getLocksKey(estId));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  public isMonthLocked(estId: string, month: string): boolean {
    return this.getLockedMonths(estId).some((l) => l.month === month);
  }

  public lockMonth(
    estId: string,
    month: string,
    lockedBy: string = 'محاسب التكاليف',
    auditPeriodId?: string
  ): MonthLockRecord {
    const locks = this.getLockedMonths(estId);
    const existing = locks.find((l) => l.month === month);
    if (existing) return existing;

    const record: MonthLockRecord = {
      month,
      lockedAt: new Date().toISOString(),
      lockedBy,
      auditPeriodId,
    };
    locks.push(record);
    this.storage.setItemSync(this.getLocksKey(estId), JSON.stringify(locks));
    return record;
  }

  // -------------------------------------------------------------------------
  // 4. OVERHEAD EXPENSES CRUD + COPY PREVIOUS MONTH + HR/FINANCE IMPORT
  // -------------------------------------------------------------------------

  private generateSeedExpenses(estId: string, month: string): OverheadExpense[] {
    const now = new Date().toISOString();
    return [
      {
        id: `exp-seed-rent-${month}`,
        establishmentId: estId,
        month,
        nameAr: 'إيجار المكان الشهري (مثال توضيحي)',
        category: 'rent',
        costType: 'indirect',
        monthlyAmount: 18000,
        costCenterId: 'cc-shared',
        stage1Rule: 'area',
        stage2Rule: 'equal_per_sold_unit',
        sourceModule: 'manual',
        notes: 'مثال توضيحي للإيجار — يُوزّع على الأقسام حسب المساحة ثم بالتساوي لكل حصة',
        isExample: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `exp-seed-gas-${month}`,
        establishmentId: estId,
        month,
        nameAr: 'فاتورة غاز المطبخ (مثال توضيحي)',
        category: 'gas',
        costType: 'indirect',
        monthlyAmount: 3600,
        costCenterId: 'cc-kitchen',
        stage1Rule: 'equal',
        stage2Rule: 'prep_time_minutes',
        sourceModule: 'manual',
        notes: 'مثال توضيحي لاستهلاك الغاز — يُوزّع على منتجات المطبخ حسب زمن التحضير بالدقائق',
        isExample: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `exp-seed-elec-${month}`,
        establishmentId: estId,
        month,
        nameAr: 'كهرباء وتبريد عام (مثال توضيحي)',
        category: 'electricity',
        costType: 'indirect',
        monthlyAmount: 4800,
        costCenterId: 'cc-shared',
        stage1Rule: 'area',
        stage2Rule: 'sales_revenue',
        sourceModule: 'manual',
        notes: 'مثال توضيحي للكهرباء — يُوزّع بالمساحة ثم بنسبة قيمة المبيعات',
        isExample: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `exp-seed-labor-${month}`,
        establishmentId: estId,
        month,
        nameAr: 'رواتب عمالة المطبخ المباشرة (مثال توضيحي)',
        category: 'direct_labor',
        costType: 'direct',
        monthlyAmount: 12000,
        costCenterId: 'cc-kitchen',
        stage1Rule: 'headcount',
        stage2Rule: 'prep_time_minutes',
        sourceModule: 'manual',
        notes: 'مثال توضيحي لعمالة المطبخ — يُوزّع على الأطباق وفق دقائق التحضير',
        isExample: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `exp-seed-cons-${month}`,
        establishmentId: estId,
        month,
        nameAr: 'مستهلكات تغليف ومناديل وقفازات (مثال توضيحي)',
        category: 'consumables',
        costType: 'direct',
        monthlyAmount: 1500,
        costCenterId: 'cc-shared',
        stage1Rule: 'equal',
        stage2Rule: 'equal_per_sold_unit',
        sourceModule: 'manual',
        isExample: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  public getAllExpenses(estId: string = 'default'): OverheadExpense[] {
    const raw = this.storage.getItemSync(this.getExpensesKey(estId));
    if (!raw) {
      const currentMonth = getCurrentMonthKey();
      const seeded = this.generateSeedExpenses(estId, currentMonth);
      this.saveAllExpenses(estId, seeded);
      return seeded;
    }
    try {
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  public saveAllExpenses(estId: string, list: OverheadExpense[]): void {
    this.storage.setItemSync(this.getExpensesKey(estId), JSON.stringify(list));
  }

  public getExpensesForMonth(estId: string = 'default', month: string = getCurrentMonthKey()): OverheadExpense[] {
    const all = this.getAllExpenses(estId);
    return all.filter((e) => e.month === month);
  }

  public upsertExpense(
    estId: string,
    input: Partial<OverheadExpense> & {
      month: string;
      nameAr: string;
      monthlyAmount: number;
      category: ExpenseCategory;
      costType: CostType;
      costCenterId: string;
    }
  ): OverheadExpense {
    if (this.isMonthLocked(estId, input.month)) {
      throw new Error(`الشهر [${input.month}] مقفل بعد الإغلاق الرسمي للفترة ولا يمكن تعديل مصاريفه`);
    }

    const nameTrimmed = input.nameAr.trim();
    if (!nameTrimmed) {
      throw new Error('يرجى إدخال اسم المصروف');
    }

    const list = this.getAllExpenses(estId);

    // Check duplicate in same month and costCenter (for manual additions without ID match)
    const dup = list.find(
      (e) =>
        e.id !== input.id &&
        e.month === input.month &&
        e.costCenterId === input.costCenterId &&
        normalizeAr(e.nameAr) === normalizeAr(nameTrimmed)
    );
    if (dup) {
      throw new Error(`المصروف «${nameTrimmed}» مسجّل بالفعل في هذا الشهر لنفس مركز التكلفة`);
    }

    const now = new Date().toISOString();
    const existingIdx = input.id ? list.findIndex((e) => e.id === input.id) : -1;

    if (existingIdx >= 0) {
      const updated: OverheadExpense = {
        ...list[existingIdx],
        ...input,
        nameAr: nameTrimmed,
        monthlyAmount: Math.max(0, Number(input.monthlyAmount) || 0),
        stage1Rule: input.stage1Rule || list[existingIdx].stage1Rule || 'area',
        stage2Rule: input.stage2Rule || list[existingIdx].stage2Rule || 'equal_per_sold_unit',
        isExample: false,
        updatedAt: now,
      };
      list[existingIdx] = updated;
      this.saveAllExpenses(estId, list);
      return updated;
    }

    const created: OverheadExpense = {
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId: estId,
      month: input.month,
      nameAr: nameTrimmed,
      category: input.category,
      costType: input.costType,
      monthlyAmount: Math.max(0, Number(input.monthlyAmount) || 0),
      costCenterId: input.costCenterId || 'cc-shared',
      stage1Rule: input.stage1Rule || 'area',
      stage2Rule: input.stage2Rule || 'equal_per_sold_unit',
      manualProductPercents: input.manualProductPercents,
      expectedMonthlyUnitsOverride: input.expectedMonthlyUnitsOverride,
      sourceModule: input.sourceModule || 'manual',
      externalRefId: input.externalRefId,
      notes: input.notes,
      isExample: false,
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(created);
    this.saveAllExpenses(estId, list);
    return created;
  }

  public deleteExpense(estId: string, expenseId: string): OverheadExpense | null {
    const list = this.getAllExpenses(estId);
    const idx = list.findIndex((e) => e.id === expenseId);
    if (idx === -1) return null;

    const target = list[idx];
    if (this.isMonthLocked(estId, target.month)) {
      throw new Error(`الشهر [${target.month}] مقفل بعد الإغلاق الرسمي ولا يمكن حذف مصاريفه`);
    }

    const [removed] = list.splice(idx, 1);
    this.saveAllExpenses(estId, list);
    return removed;
  }

  public restoreExpense(estId: string, expense: OverheadExpense): void {
    if (this.isMonthLocked(estId, expense.month)) {
      throw new Error(`الشهر [${expense.month}] مقفل ولا يمكن استرجاع المصروف`);
    }
    const list = this.getAllExpenses(estId);
    if (!list.some((e) => e.id === expense.id)) {
      list.unshift(expense);
      this.saveAllExpenses(estId, list);
    }
  }

  /**
   * 1-Click copy expenses from previous month into targetMonth (respecting locks & deduplication).
   */
  public copyFromPreviousMonth(
    estId: string,
    targetMonth: string
  ): { copiedCount: number; skippedCount: number; sourceMonth: string } {
    if (this.isMonthLocked(estId, targetMonth)) {
      throw new Error(`الشهر [${targetMonth}] مقفل بعد الإغلاق الرسمي للفترة`);
    }

    const sourceMonth = getPreviousMonthKey(targetMonth);
    const all = this.getAllExpenses(estId);
    const sourceExpenses = all.filter((e) => e.month === sourceMonth);
    const targetExpenses = all.filter((e) => e.month === targetMonth);

    let copiedCount = 0;
    let skippedCount = 0;
    const now = new Date().toISOString();

    for (const src of sourceExpenses) {
      const alreadyExists = targetExpenses.some(
        (t) =>
          (src.externalRefId && t.externalRefId === `${src.sourceModule}-${targetMonth}-${src.externalRefId.split('-').pop()}`) ||
          (t.costCenterId === src.costCenterId && normalizeAr(t.nameAr) === normalizeAr(src.nameAr))
      );

      if (alreadyExists) {
        skippedCount++;
        continue;
      }

      const cloned: OverheadExpense = {
        ...src,
        id: `exp-copy-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        month: targetMonth,
        externalRefId: src.externalRefId
          ? `${src.sourceModule}-${targetMonth}-${src.externalRefId.split('-').pop()}`
          : undefined,
        createdAt: now,
        updatedAt: now,
      };
      all.unshift(cloned);
      targetExpenses.push(cloned);
      copiedCount++;
    }

    if (copiedCount > 0) {
      this.saveAllExpenses(estId, all);
    }

    return { copiedCount, skippedCount, sourceMonth };
  }

  /**
   * Imports Payroll from HR and Operational Expenses from Finance WITHOUT double-counting.
   * Uses stable `externalRefId` keys per month so repeating import never creates duplicates.
   */
  public importFromHrAndFinance(
    estId: string,
    month: string,
    options?: {
      customEmployees?: typeof MOCK_EMPLOYEES;
      customFinanceItems?: Array<{ id: string; nameAr: string; amount: number; category: ExpenseCategory; costCenterId?: string }>;
    }
  ): { importedCount: number; skippedDuplicateCount: number; totalImportedAmount: number } {
    if (this.isMonthLocked(estId, month)) {
      throw new Error(`الشهر [${month}] مقفل بعد الإغلاق الرسمي ولا يمكن الاستيراد إليه`);
    }

    const centers = this.getCostCenters(estId);
    const all = this.getAllExpenses(estId);
    const existingRefs = new Set(
      all
        .filter((e) => e.month === month && e.externalRefId)
        .map((e) => e.externalRefId as string)
    );

    const employees = options?.customEmployees || MOCK_EMPLOYEES;
    let importedCount = 0;
    let skippedDuplicateCount = 0;
    let totalImportedAmount = 0;
    const now = new Date().toISOString();

    const mapDepartmentToCostCenter = (dept: string, laborType: 'direct' | 'indirect'): string => {
      if (laborType === 'indirect') return 'cc-shared';
      const norm = dept.toLowerCase();
      if (norm.includes('بار') || norm.includes('مشروب')) {
        return centers.find((c) => c.departmentKey === 'bar')?.id || 'cc-shared';
      }
      if (norm.includes('مخبز') || norm.includes('حلوان')) {
        return centers.find((c) => c.departmentKey === 'bakery')?.id || 'cc-shared';
      }
      if (norm.includes('مطبخ')) {
        return centers.find((c) => c.departmentKey === 'kitchen')?.id || 'cc-kitchen';
      }
      return 'cc-shared';
    };

    // 1. HR Payroll Import
    for (const emp of employees) {
      const refId = `hr-payroll-${month}-${emp.id}`;
      if (existingRefs.has(refId)) {
        skippedDuplicateCount++;
        continue;
      }

      const ccId = mapDepartmentToCostCenter(emp.department, emp.laborType);
      const isDirect = emp.laborType === 'direct' && ccId !== 'cc-shared';

      const newExp: OverheadExpense = {
        id: `exp-hr-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        establishmentId: estId,
        month,
        nameAr: `راتب: ${emp.name} (${emp.position})`,
        category: isDirect ? 'direct_labor' : 'other',
        costType: isDirect ? 'direct' : 'indirect',
        monthlyAmount: emp.baseSalary,
        costCenterId: ccId,
        stage1Rule: 'headcount',
        stage2Rule: isDirect ? 'prep_time_minutes' : 'equal_per_sold_unit',
        sourceModule: 'hr',
        externalRefId: refId,
        notes: `مستورد تلقائياً من الموارد البشرية (كود ${emp.code})`,
        isExample: false,
        createdAt: now,
        updatedAt: now,
      };

      all.unshift(newExp);
      existingRefs.add(refId);
      importedCount++;
      totalImportedAmount += emp.baseSalary;
    }

    // 2. Finance Operating Expenses Import (skip COGS & Direct Labor accounts to prevent double counting!)
    const financeItems = options?.customFinanceItems || [
      {
        id: 'fin-maint-01',
        nameAr: 'صيانة دورية للأفران والثلاجات (محاسبة)',
        amount: 2200,
        category: 'maintenance' as ExpenseCategory,
        costCenterId: 'cc-kitchen',
      },
      {
        id: 'fin-depr-01',
        nameAr: 'إهلاك أصول ومعدات التشغيل الشهري (محاسبة)',
        amount: 3500,
        category: 'depreciation' as ExpenseCategory,
        costCenterId: 'cc-shared',
      },
      {
        id: 'fin-mkt-01',
        nameAr: 'ميزانية التسويق والإعلانات (محاسبة)',
        amount: 2500,
        category: 'marketing' as ExpenseCategory,
        costCenterId: 'cc-shared',
      },
    ];

    // Also inspect any explicit operating expense accounts (52xx+) from MOCK_ACCOUNTS if added later
    void MOCK_ACCOUNTS;

    for (const fItem of financeItems) {
      const refId = `fin-exp-${month}-${fItem.id}`;
      if (existingRefs.has(refId)) {
        skippedDuplicateCount++;
        continue;
      }

      const newExp: OverheadExpense = {
        id: `exp-fin-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        establishmentId: estId,
        month,
        nameAr: fItem.nameAr,
        category: fItem.category,
        costType: fItem.category === 'consumables' || fItem.category === 'direct_labor' ? 'direct' : 'indirect',
        monthlyAmount: fItem.amount,
        costCenterId: fItem.costCenterId || 'cc-shared',
        stage1Rule: 'area',
        stage2Rule: fItem.category === 'marketing' ? 'sales_revenue' : 'equal_per_sold_unit',
        sourceModule: 'finance',
        externalRefId: refId,
        notes: 'مستورد من شاشة المالية والحسابات العامة دون تكرار قيود المبيعات والمشتريات',
        isExample: false,
        createdAt: now,
        updatedAt: now,
      };

      all.unshift(newExp);
      existingRefs.add(refId);
      importedCount++;
      totalImportedAmount += fItem.amount;
    }

    if (importedCount > 0) {
      this.saveAllExpenses(estId, all);
    }

    return {
      importedCount,
      skippedDuplicateCount,
      totalImportedAmount: round2(totalImportedAmount),
    };
  }

  // -------------------------------------------------------------------------
  // 5. SALES HISTORY (LAST 30 DAYS) & PRODUCT RECIPE COST EXTRACTION
  // -------------------------------------------------------------------------

  public getLast30DaysSalesStats(
    estId: string,
    products: MenuItemProduct[],
    defaultExpectedUnits: number = 120
  ): Record<string, { actualSoldQty: number; expectedQty: number; actualRevenue: number }> {
    const orders = orderRepository.getAllSync(estId, false) as CustomerOrder[];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const soldMap: Record<string, { qty: number; rev: number }> = {};
    for (const ord of orders) {
      if (ord.status === 'cancelled' || ord.status === 'refunded') continue;
      const t = new Date(ord.createdAt).getTime();
      if (!isNaN(t) && t < cutoff) continue;
      for (const item of ord.items || []) {
        if (!soldMap[item.productId]) soldMap[item.productId] = { qty: 0, rev: 0 };
        soldMap[item.productId].qty += Number(item.quantity) || 0;
        soldMap[item.productId].rev += (Number(item.price) || 0) * (Number(item.quantity) || 0);
      }
    }

    const result: Record<string, { actualSoldQty: number; expectedQty: number; actualRevenue: number }> = {};
    for (const prod of products) {
      const stat = soldMap[prod.id];
      const actualSoldQty = stat ? stat.qty : 0;
      const expectedQty = actualSoldQty > 0 ? actualSoldQty : defaultExpectedUnits;
      result[prod.id] = {
        actualSoldQty,
        expectedQty,
        actualRevenue: stat ? stat.rev : prod.sellingPrice * expectedQty,
      };
    }
    return result;
  }

  public getProductMaterialComponents(
    estId: string,
    product: MenuItemProduct
  ): {
    rawCost: number;
    prepCost: number;
    recipeConsumables: number;
    effectivePrepTimeMinutes: number;
  } {
    let rawCost = 0;
    let prepCost = 0;
    let prepExtraMinutes = 0;

    for (const ing of product.recipeIngredients || []) {
      if (ing.type === 'semi_finished') {
        const prep = semiFinishedService.getPreparationById(estId, ing.ingredientId);
        if (prep) {
          const portion = ing.portionId ? prep.portions.find((p) => p.id === ing.portionId) : undefined;
          const unitCost = portion ? portion.calculatedCost : prep.wacUnitCost;
          prepCost += (ing.quantity || 0) * unitCost;
          if (prep.prepTimeMinutes && prep.totalYield > 0) {
            const portionUnits = portion ? portion.sizeInYieldUnits : 1;
            const share = (ing.quantity * portionUnits) / prep.totalYield;
            prepExtraMinutes += prep.prepTimeMinutes * share;
          }
        } else {
          prepCost += ing.totalCost || 0;
        }
      } else {
        rawCost += ing.totalCost || 0;
      }
    }

    const portions = Math.max(1, product.servingsYield || 1);
    const pkgCost = (product.packagingItems || []).reduce((s, p) => s + (p.cost || 0), 0);
    const recipeConsumables = (pkgCost + (product.consumablesCost || 0)) / portions;
    const basePrepTime =
      product.prepTimeMinutes !== undefined && product.prepTimeMinutes > 0
        ? product.prepTimeMinutes
        : product.directLaborMinutes || 10;

    return {
      rawCost: round2(rawCost / portions),
      prepCost: round2(prepCost / portions),
      recipeConsumables: round2(recipeConsumables),
      effectivePrepTimeMinutes: round2(basePrepTime + prepExtraMinutes),
    };
  }

  // -------------------------------------------------------------------------
  // 6. TWO-STAGE ALLOCATION ENGINE (STAGE 1 & STAGE 2 + BURDEN RATE & VARIANCE)
  // -------------------------------------------------------------------------

  public calculateFullProductCosting(
    estId: string = 'default',
    month: string = getCurrentMonthKey(),
    productsInput?: MenuItemProduct[],
    options?: {
      modeOverride?: OverheadMode;
      fixedPctOverride?: number;
      stage2RuleOverride?: Stage2AllocationRule;
      expensesOverride?: OverheadExpense[];
      salesStatsOverride?: Record<string, { actualSoldQty: number; expectedQty: number }>;
    }
  ): OverheadCalculationSummary {
    const settings = this.getSettings(estId);
    const mode: OverheadMode = options?.modeOverride || settings.mode;
    const fixedPct = options?.fixedPctOverride ?? settings.fixedOverheadPercent;
    const centers = this.getCostCenters(estId).filter((c) => c.active);
    const operationalCenters = centers.filter((c) => !c.isShared);
    const products = (productsInput || productRepository.getAllSync(estId, false)).filter(Boolean);
    const expenses = options?.expensesOverride || this.getExpensesForMonth(estId, month);
    const isLocked = this.isMonthLocked(estId, month);

    const salesStats = this.getLast30DaysSalesStats(
      estId,
      products,
      settings.defaultExpectedMonthlyUnitsPerProduct
    );
    if (options?.salesStatsOverride) {
      for (const [pid, ov] of Object.entries(options.salesStatsOverride)) {
        if (salesStats[pid]) {
          salesStats[pid].actualSoldQty = ov.actualSoldQty;
          salesStats[pid].expectedQty = ov.expectedQty;
        } else {
          salesStats[pid] = {
            actualSoldQty: ov.actualSoldQty,
            expectedQty: ov.expectedQty,
            actualRevenue: 0,
          };
        }
      }
    }

    // Group products by operational cost center
    const productCenterMap: Record<string, CostCenter> = {};
    const centerProductsMap: Record<string, MenuItemProduct[]> = {};
    for (const c of operationalCenters) centerProductsMap[c.id] = [];

    for (const prod of products) {
      const cc = this.resolveProductCostCenter(prod, centers);
      productCenterMap[prod.id] = cc;
      if (!centerProductsMap[cc.id]) centerProductsMap[cc.id] = [];
      centerProductsMap[cc.id].push(prod);
    }

    // Extract base recipe components per product
    const productBaseMap: Record<
      string,
      ReturnType<OverheadService['getProductMaterialComponents']>
    > = {};
    for (const prod of products) {
      productBaseMap[prod.id] = this.getProductMaterialComponents(estId, prod);
    }

    // Totals from expenses sheet
    const totalDirectExpenses = round2(
      expenses.filter((e) => e.costType === 'direct').reduce((s, e) => s + e.monthlyAmount, 0)
    );
    const totalIndirectExpenses = round2(
      expenses.filter((e) => e.costType === 'indirect').reduce((s, e) => s + e.monthlyAmount, 0)
    );
    const totalActualExpenses = round2(totalDirectExpenses + totalIndirectExpenses);

    // Initialize accumulator per product
    const perProductAlloc: Record<
      string,
      {
        directLabor: number;
        indirectOverhead: number;
        consumables: number;
        ruleDetails: string[];
      }
    > = {};
    for (const prod of products) {
      const base = productBaseMap[prod.id];
      perProductAlloc[prod.id] = {
        directLabor: 0,
        indirectOverhead: 0,
        consumables: mode === 'rules_based' ? base.recipeConsumables : 0,
        ruleDetails: [],
      };
    }

    // Initialize accumulator per operational center
    const centerPools: Record<
      string,
      { directOwn: number; indirectOwn: number; sharedIn: number }
    > = {};
    for (const c of operationalCenters) {
      centerPools[c.id] = { directOwn: 0, indirectOwn: 0, sharedIn: 0 };
    }

    // Perform Mode-specific Cost Allocation
    if (mode === 'raw_only') {
      for (const prod of products) {
        perProductAlloc[prod.id].ruleDetails.push('وضع «خامات فقط»: لا يُحمّل أي مصروف إضافي');
      }
    } else if (mode === 'raw_plus_fixed_pct') {
      for (const prod of products) {
        const base = productBaseMap[prod.id];
        const materialTotal = base.rawCost + base.prepCost;
        const fixedOverhead = round2(materialTotal * (fixedPct / 100));
        perProductAlloc[prod.id].indirectOverhead = fixedOverhead;
        perProductAlloc[prod.id].ruleDetails.push(`وضع «خامات + نسبة ثابتة (${fixedPct}%)»`);
      }
    } else {
      // RULES-BASED TWO-STAGE ALLOCATION
      // Step A: Stage 1 (Split each expense across target operational centers)
      interface CenterExpenseSlice {
        expense: OverheadExpense;
        centerId: string;
        amount: number;
        stage1Desc: string;
      }
      const slices: CenterExpenseSlice[] = [];

      for (const exp of expenses) {
        if (exp.monthlyAmount <= 0) continue;

        if (exp.costCenterId === 'cc-shared' || !operationalCenters.some((c) => c.id === exp.costCenterId)) {
          // Stage 1 distribution across operational centers (preferably ones that exist)
          const targetCenters = operationalCenters.length > 0 ? operationalCenters : centers;
          const weights = targetCenters.map((c) => {
            switch (exp.stage1Rule) {
              case 'area':
                return Math.max(0, c.areaSqm || 0);
              case 'headcount':
                return Math.max(0, c.headcount || 0);
              case 'manual_percent':
                return Math.max(0, c.manualSharePercent || 0);
              case 'equal':
              default:
                return 1;
            }
          });
          const totalWeight = weights.reduce((s, w) => s + w, 0);

          targetCenters.forEach((cc, idx) => {
            const share = totalWeight > 0 ? (exp.monthlyAmount * weights[idx]) / totalWeight : exp.monthlyAmount / targetCenters.length;
            if (share > 0) {
              if (centerPools[cc.id]) centerPools[cc.id].sharedIn += share;
              slices.push({
                expense: exp,
                centerId: cc.id,
                amount: share,
                stage1Desc: `من «مشترك» ${STAGE1_RULE_LABELS_AR[exp.stage1Rule]}`,
              });
            }
          });
        } else {
          // Direct to specific operational center
          if (centerPools[exp.costCenterId]) {
            if (exp.costType === 'direct') centerPools[exp.costCenterId].directOwn += exp.monthlyAmount;
            else centerPools[exp.costCenterId].indirectOwn += exp.monthlyAmount;
          }
          slices.push({
            expense: exp,
            centerId: exp.costCenterId,
            amount: exp.monthlyAmount,
            stage1Desc: 'مباشر على المركز',
          });
        }
      }

      // Step B: Stage 2 (Distribute each slice inside its center onto center's products)
      for (const slice of slices) {
        const centerProds = centerProductsMap[slice.centerId] || [];
        if (centerProds.length === 0) continue;

        const rule: Stage2AllocationRule = options?.stage2RuleOverride || slice.expense.stage2Rule || 'equal_per_sold_unit';

        // Compute product weights & total units in this center
        const totalCenterExpectedUnits = centerProds.reduce(
          (sum, p) => sum + Math.max(1, salesStats[p.id]?.expectedQty || 1),
          0
        );

        const productMetricWeights = centerProds.map((p) => {
          const qty = Math.max(1, salesStats[p.id]?.expectedQty || 1);
          const base = productBaseMap[p.id];
          switch (rule) {
            case 'equal_per_sold_unit':
              return qty; // equal per unit sold => total product share proportional to qty => per unit is identical across products
            case 'sales_qty':
              return qty;
            case 'sales_revenue':
              return qty * Math.max(1, p.sellingPrice || 1);
            case 'raw_material_cost':
              return qty * Math.max(0.01, base.rawCost + base.prepCost);
            case 'prep_time_minutes':
              return qty * Math.max(1, base.effectivePrepTimeMinutes || 1);
            case 'manual_percent': {
              const pct = slice.expense.manualProductPercents?.[p.id];
              return pct !== undefined ? Math.max(0, pct) : 100 / centerProds.length;
            }
            default:
              return qty;
          }
        });

        const totalMetricWeight = productMetricWeights.reduce((s, w) => s + w, 0);

        centerProds.forEach((p, idx) => {
          const prodQty = Math.max(1, salesStats[p.id]?.expectedQty || 1);
          let perUnitCost = 0;

          if (rule === 'equal_per_sold_unit') {
            perUnitCost = slice.amount / Math.max(1, slice.expense.expectedMonthlyUnitsOverride || totalCenterExpectedUnits);
          } else if (totalMetricWeight > 0) {
            const productTotalAllocated = (slice.amount * productMetricWeights[idx]) / totalMetricWeight;
            perUnitCost = productTotalAllocated / prodQty;
          }

          if (slice.expense.category === 'direct_labor') {
            perProductAlloc[p.id].directLabor += perUnitCost;
          } else if (slice.expense.category === 'consumables') {
            perProductAlloc[p.id].consumables += perUnitCost;
          } else {
            perProductAlloc[p.id].indirectOverhead += perUnitCost;
          }

          perProductAlloc[p.id].ruleDetails.push(
            `${slice.expense.nameAr}: ${STAGE2_RULE_LABELS_AR[rule]} (${slice.stage1Desc})`
          );
        });
      }
    }

    // Build Final Product Results
    const productResults: ProductFullCostResult[] = products.map((prod) => {
      const cc = productCenterMap[prod.id];
      const base = productBaseMap[prod.id];
      const alloc = perProductAlloc[prod.id];
      const stat = salesStats[prod.id] || {
        actualSoldQty: 0,
        expectedQty: settings.defaultExpectedMonthlyUnitsPerProduct,
      };

      const rawCost = round2(base.rawCost);
      const prepCost = round2(base.prepCost);
      const directLabor = round2(alloc.directLabor);
      const indirectOverhead = round2(alloc.indirectOverhead);
      const consumables = round2(alloc.consumables);

      const primeCost = round2(rawCost + prepCost + directLabor);
      const fullCost = round2(primeCost + indirectOverhead + consumables);

      const sellingPrice = round2(prod.sellingPrice || 0);
      const primeProfit = round2(sellingPrice - primeCost);
      const primeMarginPercent =
        sellingPrice > 0 ? round2((primeProfit / sellingPrice) * 100) : 0;

      const fullProfit = round2(sellingPrice - fullCost);
      const fullMarginPercent =
        sellingPrice > 0 ? round2((fullProfit / sellingPrice) * 100) : 0;

      const uniqueRules = Array.from(new Set(alloc.ruleDetails));
      const appliedRulesAr =
        mode === 'raw_only'
          ? 'خامات فقط (دون تحميل مصاريف)'
          : mode === 'raw_plus_fixed_pct'
          ? `خامات + نسبة ثابتة (${fixedPct}%)`
          : uniqueRules.length > 0
          ? uniqueRules.slice(0, 2).join(' · ')
          : 'التوزيع بالقواعد (لا توجد مصاريف مسجلة للمركز)';

      return {
        productId: prod.id,
        productCode: prod.code,
        productNameAr: prod.nameAr,
        category: prod.category,
        costCenterId: cc.id,
        costCenterNameAr: cc.nameAr,
        sellingPrice,
        expectedMonthlyUnits: stat.expectedQty,
        actualSoldUnits: stat.actualSoldQty,
        effectivePrepTimeMinutes: base.effectivePrepTimeMinutes,
        rawCost,
        prepCost,
        directLabor,
        indirectOverhead,
        consumables,
        primeCost,
        fullCost,
        primeProfit,
        primeMarginPercent,
        fullProfit,
        fullMarginPercent,
        isLossAfterOverhead: sellingPrice > 0 && fullProfit < 0,
        appliedRulesAr,
        ruleDetailsAr: uniqueRules,
      };
    });

    // Build Center Summaries with Burden Rate & Absorption Variance
    let totalChargedOverhead = 0;
    let totalExpectedAllUnits = 0;

    const centerSummaries: CenterAllocationSummary[] = operationalCenters.map((cc) => {
      const pool = centerPools[cc.id] || { directOwn: 0, indirectOwn: 0, sharedIn: 0 };
      const totalPool = round2(pool.directOwn + pool.indirectOwn + pool.sharedIn);
      const centerProds = productResults.filter((p) => p.costCenterId === cc.id);

      const expectedUnits = centerProds.reduce((s, p) => s + p.expectedMonthlyUnits, 0);
      const actualSoldUnits = centerProds.reduce((s, p) => s + p.actualSoldUnits, 0);
      totalExpectedAllUnits += expectedUnits;

      const burdenRatePerUnit = calculateOverheadBurdenRate(totalPool, Math.max(1, expectedUnits));
      const chargedFromProducts = centerProds.reduce(
        (s, p) =>
          s + (p.directLabor + p.indirectOverhead + p.consumables) * p.actualSoldUnits,
        0
      );
      const varianceCalc = calculateOverheadAbsorptionVariance(
        totalPool,
        burdenRatePerUnit,
        actualSoldUnits
      );

      const chargedAmount =
        actualSoldUnits > 0 && chargedFromProducts > 0
          ? round2(chargedFromProducts)
          : varianceCalc.chargedAmount;
      const varianceAmount = round2(totalPool - chargedAmount);
      const varianceStatus: 'over_absorbed' | 'under_absorbed' | 'balanced' =
        varianceAmount > 0.01
          ? 'under_absorbed'
          : varianceAmount < -0.01
          ? 'over_absorbed'
          : 'balanced';

      totalChargedOverhead += chargedAmount;

      const revenueTotal = round2(
        centerProds.reduce((s, p) => s + p.sellingPrice * (p.actualSoldUnits || p.expectedMonthlyUnits), 0)
      );
      const fullCostTotal = round2(
        centerProds.reduce((s, p) => s + p.fullCost * (p.actualSoldUnits || p.expectedMonthlyUnits), 0)
      );
      const netProfitTotal = round2(revenueTotal - fullCostTotal);
      const marginPercent = revenueTotal > 0 ? round2((netProfitTotal / revenueTotal) * 100) : 0;

      return {
        costCenterId: cc.id,
        costCenterNameAr: cc.nameAr,
        directPool: round2(pool.directOwn),
        indirectOwnPool: round2(pool.indirectOwn),
        sharedAllocatedIn: round2(pool.sharedIn),
        totalPool,
        expectedUnits,
        actualSoldUnits,
        burdenRatePerUnit: round3(burdenRatePerUnit),
        chargedAmount,
        varianceAmount,
        varianceStatus,
        revenueTotal,
        fullCostTotal,
        netProfitTotal,
        marginPercent,
        productsCount: centerProds.length,
        lossProductsCount: centerProds.filter((p) => p.isLossAfterOverhead).length,
      };
    });

    totalChargedOverhead = round2(totalChargedOverhead);
    const totalOverheadVariance = round2(totalActualExpenses - totalChargedOverhead);
    const varianceStatus: 'over_absorbed' | 'under_absorbed' | 'balanced' =
      totalOverheadVariance > 0.01
        ? 'under_absorbed'
        : totalOverheadVariance < -0.01
        ? 'over_absorbed'
        : 'balanced';

    const overallBurdenRatePerUnit = round3(
      calculateOverheadBurdenRate(totalActualExpenses, Math.max(1, totalExpectedAllUnits))
    );

    return {
      month,
      mode,
      isLocked,
      totalActualExpenses,
      totalDirectExpenses,
      totalIndirectExpenses,
      totalChargedOverhead,
      totalOverheadVariance,
      varianceStatus,
      overallBurdenRatePerUnit,
      products: productResults,
      centers: centerSummaries,
      lossMakingProducts: productResults.filter((p) => p.isLossAfterOverhead),
    };
  }

  /**
   * Computes overhead variance explicitly for period closing reporting (فروق التحميل).
   */
  public computePeriodOverheadVariance(
    estId: string,
    month: string,
    actualExpenseTotal: number,
    expectedUnits: number,
    actualSoldUnits: number
  ): {
    burdenRatePerUnit: number;
    chargedAmount: number;
    varianceAmount: number;
    status: 'over_absorbed' | 'under_absorbed' | 'balanced';
    labelAr: string;
  } {
    const burdenRatePerUnit = calculateOverheadBurdenRate(actualExpenseTotal, expectedUnits);
    const res = calculateOverheadAbsorptionVariance(
      actualExpenseTotal,
      burdenRatePerUnit,
      actualSoldUnits
    );
    const labelAr =
      res.status === 'over_absorbed'
        ? `فائض تحميل (زائد بمقدار ${Math.abs(res.varianceAmount)} ج.م)`
        : res.status === 'under_absorbed'
        ? `عجز تحميل (ناقص بمقدار ${Math.abs(res.varianceAmount)} ج.م)`
        : 'تحميل متوازن (صفر فروق)';
    return {
      burdenRatePerUnit: round3(burdenRatePerUnit),
      chargedAmount: res.chargedAmount,
      varianceAmount: res.varianceAmount,
      status: res.status,
      labelAr,
    };
  }
}

export const overheadService = new OverheadService();
