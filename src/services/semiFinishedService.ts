/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SEMI-FINISHED PREPARATIONS SERVICE (خدمة التجهيزات والتحضيرات الأساسية - Package 4)
 *
 * Design Principles:
 * 1. Default Mode: "On-Formula" (على الصيغة).
 *    - Preparations do NOT have stock by default.
 *    - Defined once by cost accountant with the chef.
 *    - Automatically decomposed into raw materials when sold, and deducted from section warehouse.
 * 2. Types:
 *    - Compound (مركّب): Multiple ingredients (raw or other preparations) with total yield.
 *    - Processing (معالجة): Single raw material transformed by cooking/cleaning factor (e.g. 50g raw -> 100g cooked).
 *    - Portions (حصص): Named portions (e.g. "بولة زر = 100 جم", "قطعة عجين = 170 جم", "ملعقتان كبيرتان = 50 جم").
 * 3. Standard Recipe Units Conversion:
 *    - gram, kg, ml, liter, piece, tablespoon (15g/ml), teaspoon (5g/ml), cup (240ml/g).
 * 4. Circular Dependency Prevention (منع الدوران التكراري).
 * 5. Dynamic Cost Propagation:
 *    - Material cost change -> Prep cost change -> Product BOM cost change -> Margin update.
 * 6. Optional Batch Production Tracking (تسجيل الدفعات الاختياري):
 *    - Activated per preparation.
 *    - Deducts actual raw ingredients, creates preparation stock in section warehouse, recalculates WAC.
 *    - When disabled, remaining prep stock converts back to equivalent raw materials into section warehouse.
 * 7. Physical Inventory Audit Hook:
 *    - Unsold remaining preparations decomposed to equivalent raw materials and added to physical count.
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';
import { warehouseService, StockMovementRecord } from './warehouseService.ts';
import { multiUnitService } from './multiUnitService.ts';
import { RawMaterialItem, MenuItemProduct, ProductRecipeItem, dataService } from './dataService.ts';
import { productRepository, rawMaterialRepository } from '../repositories/repositories.ts';

export type PreparationType = 'compound' | 'processing' | 'portion';

export interface PreparationIngredient {
  id: string;
  type: 'raw_material' | 'semi_finished';
  itemId: string;
  itemNameAr: string;
  quantity: number;
  unit: string; // 'جرام' | 'كجم' | 'مل' | 'لتر' | 'قطعة' | 'ملعقة كبيرة' | 'ملعقة صغيرة' | 'كوب'
  wastePercent?: number; // هالك إعداد اختياري
  unitCostSnapshot?: number;
  totalCostSnapshot?: number;
}

export interface PreparationPortion {
  id: string;
  nameAr: string; // e.g. "بولة زر", "قطعة عجين", "ملعقتان كبيرتان"
  sizeInYieldUnits: number; // e.g. 100, 170, 50
  calculatedCost: number;
  descriptionAr?: string;
}

export interface PreparationBatchRecord {
  id: string;
  date: string;
  batchCount: number;
  actualRawUsed: {
    materialId: string;
    materialNameAr: string;
    quantityBase: number;
    unitName: string;
    cost: number;
  }[];
  standardYieldBase: number;
  actualYieldBase: number;
  yieldVarianceBase: number;
  yieldVariancePercent: number;
  batchCostEgp: number;
  unitCostEgp: number;
  actorName: string;
  notes?: string;
}

export interface SemiFinishedItem {
  id: string;
  establishmentId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: string; // عجائن، صوصات، تتبيلات، مسلوقات...
  categoryNodeId?: string;
  producingDepartment: string; // kitchen, bakery, bar, grill...
  type: PreparationType;
  enableBatchTracking: boolean; // مفتاح «سجّل دفعات هذا التجهيز»
  currentBatchStock: number; // رصيد الدفعات المحضرة المتبقية
  batchStockMap?: Record<string, number>; // لكل مخزن قسم
  wacUnitCost: number; // تكلفة وحدة الناتج
  ingredients: PreparationIngredient[];
  totalYield: number; // الناتج الكلي للصيغة بالوحدة الصغرى
  yieldUnit: string; // 'جرام' | 'مل' | 'قطعة'

  // Processing specific
  processingRawQty?: number; // e.g. 50g raw rice
  processingCookedQty?: number; // e.g. 100g cooked rice
  processingMaterialId?: string;
  processingMaterialNameAr?: string;

  // Portions
  portions: PreparationPortion[];

  // Auditing & Batches
  batches: PreparationBatchRecord[];
  auditHistory: {
    timestamp: string;
    user: string;
    action: string;
    details: string;
  }[];
  isExample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DecomposedRawRequirement {
  materialId: string;
  materialNameAr: string;
  requiredBaseQty: number;
  baseUnit: string;
  viaPrepNameAr: string;
  costEgp: number;
}

// Standard Unit Conversion Constants
export const PREP_UNIT_CONVERSIONS: Record<string, { toBaseFactor: number; baseUnitType: 'mass' | 'volume' | 'count' }> = {
  'جرام': { toBaseFactor: 1, baseUnitType: 'mass' },
  'جم': { toBaseFactor: 1, baseUnitType: 'mass' },
  'كجم': { toBaseFactor: 1000, baseUnitType: 'mass' },
  'كيلو': { toBaseFactor: 1000, baseUnitType: 'mass' },
  'مل': { toBaseFactor: 1, baseUnitType: 'volume' },
  'لتر': { toBaseFactor: 1000, baseUnitType: 'volume' },
  'قطعة': { toBaseFactor: 1, baseUnitType: 'count' },
  'ملعقة كبيرة': { toBaseFactor: 15, baseUnitType: 'volume' },
  'ملعقة صغيرة': { toBaseFactor: 5, baseUnitType: 'volume' },
  'كوب': { toBaseFactor: 240, baseUnitType: 'volume' },
};

export function convertPrepUnitToBase(qty: number, unit: string): number {
  const norm = unit.trim();
  const conv = PREP_UNIT_CONVERSIONS[norm];
  if (!conv) return qty;
  return qty * conv.toBaseFactor;
}

class SemiFinishedService {
  private storage = getStorageAdapter();

  private getStorageKey(estId: string): string {
    return `tygos_${estId}_semi_finished_items`;
  }

  // Initial Seed Examples
  private generateSeedExamples(estId: string): SemiFinishedItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'prep-pizza-dough',
        establishmentId: estId,
        code: 'PREP-01',
        nameAr: 'عجينة بيتزا إيطالية مخمرة',
        nameEn: 'Italian Neapolitan Pizza Dough',
        category: 'عجائن ومخبوزات',
        producingDepartment: 'bakery',
        type: 'compound',
        enableBatchTracking: false,
        currentBatchStock: 0,
        wacUnitCost: 0.045, // ~45 EGP for 1000g
        ingredients: [
          {
            id: 'ing-1',
            type: 'raw_material',
            itemId: 'mat-flour-01',
            itemNameAr: 'دقيق فاخر بيتزا 00',
            quantity: 1,
            unit: 'كجم',
            wastePercent: 0,
            unitCostSnapshot: 18,
            totalCostSnapshot: 18,
          },
          {
            id: 'ing-2',
            type: 'raw_material',
            itemId: 'mat-water',
            itemNameAr: 'ماء نقي مفلتر',
            quantity: 650,
            unit: 'مل',
            wastePercent: 0,
            unitCostSnapshot: 0.005,
            totalCostSnapshot: 3.25,
          },
          {
            id: 'ing-3',
            type: 'raw_material',
            itemId: 'mat-yeast',
            itemNameAr: 'خميرة فورية جافة',
            quantity: 1,
            unit: 'ملعقة صغيرة',
            wastePercent: 0,
            unitCostSnapshot: 0.2,
            totalCostSnapshot: 1.0,
          },
          {
            id: 'ing-4',
            type: 'raw_material',
            itemId: 'mat-salt',
            itemNameAr: 'ملح طعام ناعم',
            quantity: 1,
            unit: 'ملعقة كبيرة',
            wastePercent: 0,
            unitCostSnapshot: 0.1,
            totalCostSnapshot: 1.5,
          },
          {
            id: 'ing-5',
            type: 'raw_material',
            itemId: 'mat-sugar',
            itemNameAr: 'سكر أبيض ناعم',
            quantity: 2,
            unit: 'ملعقة كبيرة',
            wastePercent: 0,
            unitCostSnapshot: 0.1,
            totalCostSnapshot: 3.0,
          },
          {
            id: 'ing-6',
            type: 'raw_material',
            itemId: 'mat-olive-oil',
            itemNameAr: 'زيت زيتون بكر ممتاز',
            quantity: 2,
            unit: 'ملعقة كبيرة',
            wastePercent: 0,
            unitCostSnapshot: 0.3,
            totalCostSnapshot: 9.0,
          },
        ],
        totalYield: 1700, // 1700g total dough yield
        yieldUnit: 'جرام',
        portions: [
          {
            id: 'por-dough-ball',
            nameAr: 'قطعة عجين (كرة بيتزا)',
            sizeInYieldUnits: 170, // 170g per pizza ball
            calculatedCost: 4.5,
            descriptionAr: 'كرة عجين قياسية لصنع بيتزا مقاس 28-30 سم',
          },
          {
            id: 'por-dough-calzone',
            nameAr: 'قطعة كالزوني دبل',
            sizeInYieldUnits: 250,
            calculatedCost: 6.6,
            descriptionAr: 'حصة كالزوني حجم عائلي',
          },
        ],
        batches: [],
        auditHistory: [
          {
            timestamp: now,
            user: 'النظام',
            action: 'إنشاء مثال جاهز',
            details: 'تم إنشاء وصفة عجينة البيتزا الإيطالية كصيغة قياسية',
          },
        ],
        isExample: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prep-pizza-sauce',
        establishmentId: estId,
        code: 'PREP-02',
        nameAr: 'صلصة بيتزا إيطالية مطبوخة',
        nameEn: 'Cooked Italian Pizza Sauce',
        category: 'صوصات وتتبيلات',
        producingDepartment: 'kitchen',
        type: 'compound',
        enableBatchTracking: false,
        currentBatchStock: 0,
        wacUnitCost: 0.035,
        ingredients: [
          {
            id: 'ing-s1',
            type: 'raw_material',
            itemId: 'mat-tomato-sauce',
            itemNameAr: 'صلصة طماطم إيطالية مطبوخة',
            quantity: 3,
            unit: 'كجم',
            wastePercent: 2,
            unitCostSnapshot: 15,
            totalCostSnapshot: 45,
          },
          {
            id: 'ing-s2',
            type: 'raw_material',
            itemId: 'mat-water',
            itemNameAr: 'ماء نقي مفلتر',
            quantity: 1,
            unit: 'لتر',
            wastePercent: 0,
            unitCostSnapshot: 0.005,
            totalCostSnapshot: 5,
          },
          {
            id: 'ing-s3',
            type: 'raw_material',
            itemId: 'mat-olive-oil',
            itemNameAr: 'زيت زيتون بكر ممتاز',
            quantity: 3,
            unit: 'ملعقة كبيرة',
            wastePercent: 0,
            unitCostSnapshot: 0.3,
            totalCostSnapshot: 13.5,
          },
          {
            id: 'ing-s4',
            type: 'raw_material',
            itemId: 'mat-salt',
            itemNameAr: 'ملح طعام ناعم',
            quantity: 1,
            unit: 'ملعقة كبيرة',
            wastePercent: 0,
            unitCostSnapshot: 0.1,
            totalCostSnapshot: 1.5,
          },
        ],
        totalYield: 3800,
        yieldUnit: 'جرام',
        portions: [
          {
            id: 'por-sauce-pizza',
            nameAr: 'ملعقتان كبيرتان صوص',
            sizeInYieldUnits: 50,
            calculatedCost: 1.75,
            descriptionAr: 'الكمية المعيارية لفرد البيتزا الواحدة',
          },
          {
            id: 'por-sauce-pasta',
            nameAr: 'بولة صوص معكرونة',
            sizeInYieldUnits: 150,
            calculatedCost: 5.25,
            descriptionAr: 'حصة طبق باستا نابوليتانا',
          },
        ],
        batches: [],
        auditHistory: [
          {
            timestamp: now,
            user: 'النظام',
            action: 'إنشاء مثال جاهز',
            details: 'تم إنشاء صوص البيتزا كصيغة قياسية',
          },
        ],
        isExample: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'prep-cooked-rice',
        establishmentId: estId,
        code: 'PREP-03',
        nameAr: 'أرز بسمتي مسلوق ومبهر',
        nameEn: 'Cooked Steamed Basmati Rice',
        category: 'مسلوقات ومطهيات',
        producingDepartment: 'kitchen',
        type: 'processing',
        enableBatchTracking: false,
        currentBatchStock: 0,
        wacUnitCost: 0.028,
        ingredients: [],
        processingRawQty: 50, // 50g raw rice
        processingCookedQty: 100, // becomes 100g cooked rice
        processingMaterialId: 'mat-basmati-rice',
        processingMaterialNameAr: 'أرز بسمتي هندي ممتاز',
        totalYield: 1000,
        yieldUnit: 'جرام',
        portions: [
          {
            id: 'por-rice-bowl',
            nameAr: 'بولة أرز',
            sizeInYieldUnits: 100, // 100g cooked = 50g raw
            calculatedCost: 2.8,
            descriptionAr: 'بولة أرز معيارية سعة 100 جم مطهو تخصم 50 جم أرز نيء',
          },
          {
            id: 'por-rice-platter',
            nameAr: 'سرفيس أرز عائلي',
            sizeInYieldUnits: 300, // 300g cooked = 150g raw
            calculatedCost: 8.4,
            descriptionAr: 'سرفيس أرز كبير يخصم 150 جم أرز نيء',
          },
        ],
        batches: [],
        auditHistory: [
          {
            timestamp: now,
            user: 'النظام',
            action: 'إنشاء مثال جاهز',
            details: 'تم إنشاء معالجة الأرز المسلوق بمعامل طهي 1:2',
          },
        ],
        isExample: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  public getPreparations(establishmentId: string = 'default'): SemiFinishedItem[] {
    const raw = this.storage.getItemSync(this.getStorageKey(establishmentId));
    if (!raw) {
      const seeded = this.generateSeedExamples(establishmentId);
      this.savePreparations(establishmentId, seeded);
      return seeded;
    }
    try {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
      const seeded = this.generateSeedExamples(establishmentId);
      this.savePreparations(establishmentId, seeded);
      return seeded;
    } catch {
      return this.generateSeedExamples(establishmentId);
    }
  }

  public savePreparations(establishmentId: string, items: SemiFinishedItem[]): void {
    this.storage.setItemSync(this.getStorageKey(establishmentId), JSON.stringify(items));
  }

  public getAllPreparations(establishmentId: string = 'default'): SemiFinishedItem[] {
    return this.getPreparations(establishmentId);
  }

  public getPreparationById(idOrEst: string, optionalId?: string): SemiFinishedItem | undefined {
    const estId = optionalId ? idOrEst : 'default';
    const id = optionalId ? optionalId : idOrEst;
    return this.getPreparations(estId).find((p) => p.id === id || p.code === id);
  }

  /**
   * Recalculates unit cost and portion costs for a preparation based on current material prices.
   */
  public calculatePreparationUnitCost(
    estOrPrep: string | SemiFinishedItem,
    maybePrep?: SemiFinishedItem
  ): { unitCost: number; portionCosts: Record<string, number>; totalBatchCost: number } {
    const establishmentId = typeof estOrPrep === 'string' ? estOrPrep : 'default';
    const prep = typeof estOrPrep === 'string' ? maybePrep! : estOrPrep;

    const materials = warehouseService.getMaterials(establishmentId);
    const allPreps = this.getPreparations(establishmentId);

    if (prep.type === 'processing') {
      const rawMat = materials.find((m) => m.id === prep.processingMaterialId);
      const rawCostPerBase = rawMat?.costPerUnit || (rawMat?.purchasePrice ? rawMat.purchasePrice / (rawMat.conversionFactor || 1) : 0.05);
      const rawQty = prep.processingRawQty || 50;
      const cookedQty = prep.processingCookedQty || 100;
      const yieldFactor = cookedQty > 0 ? rawQty / cookedQty : 0.5;
      const unitCost = rawCostPerBase * yieldFactor;

      const portionCosts: Record<string, number> = {};
      prep.portions.forEach((p) => {
        portionCosts[p.id] = Math.round(unitCost * p.sizeInYieldUnits * 100) / 100;
        p.calculatedCost = portionCosts[p.id];
      });

      return {
        unitCost: Math.round(unitCost * 1000) / 1000,
        portionCosts,
        totalBatchCost: Math.round(unitCost * prep.totalYield * 100) / 100,
      };
    }

    // Compound Preparation
    let totalCost = 0;
    prep.ingredients.forEach((ing) => {
      let costPerBase = 0;
      if (ing.type === 'raw_material') {
        const mat = materials.find((m) => m.id === ing.itemId || m.nameAr === ing.itemNameAr || m.nameAr.includes(ing.itemNameAr) || ing.itemNameAr.includes(m.nameAr));
        costPerBase = mat?.costPerUnit || (mat?.purchasePrice ? mat.purchasePrice / (mat.conversionFactor || 1) : (mat?.effectiveUnitCost ? mat.effectiveUnitCost / (mat.conversionFactor || 1) : 0.02));
      } else {
        const childPrep = allPreps.find((p) => p.id === ing.itemId || p.code === ing.itemId);
        costPerBase = childPrep?.wacUnitCost || 0.03;
      }

      const qtyBase = convertPrepUnitToBase(ing.quantity, ing.unit);
      const wasteMultiplier = 1 + (ing.wastePercent || 0) / 100;
      const lineCost = qtyBase * costPerBase * wasteMultiplier;
      totalCost += lineCost;
      ing.unitCostSnapshot = costPerBase;
      ing.totalCostSnapshot = Math.round(lineCost * 100) / 100;
    });

    const totalYield = prep.totalYield > 0 ? prep.totalYield : 1000;
    const unitCost = totalCost / totalYield;

    const portionCosts: Record<string, number> = {};
    prep.portions.forEach((p) => {
      portionCosts[p.id] = Math.round(unitCost * p.sizeInYieldUnits * 100) / 100;
      p.calculatedCost = portionCosts[p.id];
    });

    return {
      unitCost: Math.round(unitCost * 1000) / 1000,
      portionCosts,
      totalBatchCost: Math.round(totalCost * 100) / 100,
    };
  }

  /**
   * Checks for circular dependencies before adding a semi-finished ingredient.
   * Returns object with hasCircular boolean and cyclePath.
   */
  public checkCircularDependency(
    arg1: string,
    arg2: string | any[],
    arg3?: string
  ): { hasCircular: boolean; cyclePath?: string } {
    let establishmentId = 'default';
    let targetPrepId = '';
    let candidateIngredientId = '';

    if (typeof arg2 === 'string') {
      if (arg3) {
        establishmentId = arg1;
        targetPrepId = arg2;
        candidateIngredientId = arg3;
      } else {
        targetPrepId = arg1;
        candidateIngredientId = arg2;
      }
    } else if (Array.isArray(arg2)) {
      targetPrepId = arg1;
      for (const ing of arg2) {
        const ingId = ing.itemId || ing.ingredientId;
        if (ing.type === 'semi_finished' && (ingId === targetPrepId || this.checkCircularDependency(targetPrepId, ingId).hasCircular)) {
          return { hasCircular: true, cyclePath: `${targetPrepId} -> ${ingId}` };
        }
      }
      return { hasCircular: false };
    }

    if (targetPrepId === candidateIngredientId) {
      return { hasCircular: true, cyclePath: `${targetPrepId} -> ${candidateIngredientId}` };
    }

    const allPreps = this.getPreparations(establishmentId);
    const visited = new Set<string>();

    function dfs(currentId: string): boolean {
      if (currentId === targetPrepId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const item = allPreps.find((p) => p.id === currentId || p.code === currentId);
      if (!item) return false;

      for (const ing of item.ingredients) {
        if (ing.type === 'semi_finished') {
          if (dfs(ing.itemId)) return true;
        }
      }
      return false;
    }

    const hasCircular = dfs(candidateIngredientId);
    return { hasCircular, cyclePath: hasCircular ? `${targetPrepId} -> ${candidateIngredientId}` : undefined };
  }

  /**
   * Decomposes a preparation usage into its constituent raw materials.
   * Handles nested preparations, processing cooking factors, portions, and waste percentages.
   */
  public decomposePreparationToRaw(
    arg1: string,
    arg2: string | number,
    arg3?: number | string,
    arg4?: string
  ): DecomposedRawRequirement[] {
    let establishmentId = 'default';
    let prepId = '';
    let quantityUsed = 1;
    let unitOrPortionId: string | undefined = undefined;

    if (typeof arg2 === 'number') {
      prepId = arg1;
      quantityUsed = arg2;
      unitOrPortionId = typeof arg3 === 'string' ? arg3 : undefined;
    } else {
      establishmentId = arg1;
      prepId = arg2;
      quantityUsed = typeof arg3 === 'number' ? arg3 : 1;
      unitOrPortionId = arg4;
    }

    const prep = this.getPreparationById(establishmentId, prepId);
    if (!prep) return [];

    const materials = warehouseService.getMaterials(establishmentId);
    const results: DecomposedRawRequirement[] = [];

    // 1. Resolve quantity in base yield units
    let qtyInYieldUnits = quantityUsed;
    let viaLabel = prep.nameAr;

    if (unitOrPortionId) {
      const matchedPortion = prep.portions.find((p) => p.id === unitOrPortionId || p.nameAr.includes(unitOrPortionId));
      if (matchedPortion) {
        qtyInYieldUnits = quantityUsed * matchedPortion.sizeInYieldUnits;
        viaLabel = `${prep.nameAr} (${quantityUsed} ${matchedPortion.nameAr})`;
      } else {
        qtyInYieldUnits = convertPrepUnitToBase(quantityUsed, unitOrPortionId);
      }
    }

    // 2. Processing type (single raw material transformed)
    if (prep.type === 'processing') {
      const rawMat = materials.find((m) => m.id === prep.processingMaterialId);
      const rawQty = prep.processingRawQty || 50;
      const cookedQty = prep.processingCookedQty || 100;
      const factor = cookedQty > 0 ? rawQty / cookedQty : 0.5;
      const requiredRaw = Math.round(qtyInYieldUnits * factor * 100) / 100;

      results.push({
        materialId: prep.processingMaterialId || 'mat-raw',
        materialNameAr: prep.processingMaterialNameAr || rawMat?.nameAr || 'خامة معالجة',
        requiredBaseQty: requiredRaw,
        baseUnit: rawMat?.baseUnit || 'جرام',
        viaPrepNameAr: viaLabel,
        costEgp: Math.round(requiredRaw * (rawMat?.costPerUnit || 0.05) * 100) / 100,
      });
      return results;
    }

    // 3. Compound type (ratio = qtyInYieldUnits / totalYield)
    const totalYield = prep.totalYield > 0 ? prep.totalYield : 1;
    const ratio = qtyInYieldUnits / totalYield;

    prep.ingredients.forEach((ing) => {
      const ingBaseQty = convertPrepUnitToBase(ing.quantity, ing.unit) * (1 + (ing.wastePercent || 0) / 100);
      const requiredQty = Math.round(ingBaseQty * ratio * 100) / 100;

      if (ing.type === 'raw_material') {
        const mat = materials.find((m) => m.id === ing.itemId || m.nameAr === ing.itemNameAr || m.nameAr.includes(ing.itemNameAr) || ing.itemNameAr.includes(m.nameAr));
        results.push({
          materialId: mat ? mat.id : ing.itemId,
          materialNameAr: mat ? mat.nameAr : ing.itemNameAr,
          requiredBaseQty: requiredQty,
          baseUnit: mat?.baseUnit || ing.unit || 'جرام',
          viaPrepNameAr: viaLabel,
          costEgp: Math.round(requiredQty * (mat?.costPerUnit || 0.02) * 100) / 100,
        });
      } else {
        // Nested semi-finished: recursive decomposition
        const nestedDecomposed = this.decomposePreparationToRaw(
          establishmentId,
          ing.itemId,
          requiredQty,
          ing.unit
        );
        nestedDecomposed.forEach((nested) => {
          results.push({
            ...nested,
            viaPrepNameAr: `${viaLabel} ← ${nested.viaPrepNameAr}`,
          });
        });
      }
    });

    return results;
  }

  /**
   * Adds or updates a preparation.
   * Auto-calculates unit costs and logs audit trail.
   */
  public upsertPreparation(
    arg1: string | (Partial<SemiFinishedItem> & { nameAr: string; category?: string }),
    arg2?: any,
    arg3?: string
  ): SemiFinishedItem {
    let establishmentId = 'default';
    let prepData: any;
    let actorName = 'محاسب التكاليف';

    if (typeof arg1 === 'string') {
      establishmentId = arg1;
      prepData = arg2;
      actorName = arg3 || 'محاسب التكاليف';
    } else {
      prepData = arg1;
      actorName = typeof arg2 === 'string' ? arg2 : 'محاسب التكاليف';
    }

    if (!prepData.category) prepData.category = 'عام';

    const list = this.getPreparations(establishmentId);
    const now = new Date().toISOString();

    // Check duplicate name inside the same category
    const duplicate = list.find(
      (p) =>
        p.id !== prepData.id &&
        p.category === prepData.category &&
        p.nameAr.trim().replace(/\s+/g, ' ') === prepData.nameAr.trim().replace(/\s+/g, ' ')
    );
    if (duplicate) {
      throw new Error(`يوجد تجهيز بنفس الاسم [${prepData.nameAr}] داخل قسم [${prepData.category}] بالفعل`);
    }

    const found = list.find((p) => p.id === prepData.id);
    let savedItem: SemiFinishedItem;

    if (!found) {
      const codeNum = list.length + 1;
      savedItem = {
        id: prepData.id || `prep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        establishmentId,
        code: prepData.code || `PREP-${String(codeNum).padStart(2, '0')}`,
        nameAr: prepData.nameAr,
        nameEn: prepData.nameEn || prepData.nameAr,
        category: prepData.category,
        categoryNodeId: prepData.categoryNodeId,
        producingDepartment: prepData.producingDepartment || 'kitchen',
        type: prepData.type || 'compound',
        enableBatchTracking: !!prepData.enableBatchTracking,
        currentBatchStock: prepData.currentBatchStock || 0,
        batchStockMap: prepData.batchStockMap || {},
        wacUnitCost: 0,
        ingredients: prepData.ingredients || [],
        totalYield: prepData.totalYield || 1000,
        yieldUnit: prepData.yieldUnit || 'جرام',
        processingRawQty: prepData.processingRawQty,
        processingCookedQty: prepData.processingCookedQty,
        processingMaterialId: prepData.processingMaterialId,
        processingMaterialNameAr: prepData.processingMaterialNameAr,
        portions: prepData.portions || [],
        batches: [],
        auditHistory: [
          {
            timestamp: now,
            user: actorName,
            action: 'إنشاء تجهيز جديد',
            details: `تم إنشاء التجهيز [${prepData.nameAr}] بقسم [${prepData.category}]`,
          },
        ],
        isExample: false,
        createdAt: now,
        updatedAt: now,
      };
      list.push(savedItem);
    } else {
      // Update existing
      savedItem = found;
      const oldYield = savedItem.totalYield;

      savedItem.nameAr = prepData.nameAr;
      if (prepData.nameEn) savedItem.nameEn = prepData.nameEn;
      if (prepData.category) savedItem.category = prepData.category;
      if (prepData.categoryNodeId) savedItem.categoryNodeId = prepData.categoryNodeId;
      if (prepData.producingDepartment) savedItem.producingDepartment = prepData.producingDepartment;
      if (prepData.type) savedItem.type = prepData.type;
      if (prepData.ingredients) savedItem.ingredients = prepData.ingredients;
      if (prepData.totalYield !== undefined) savedItem.totalYield = prepData.totalYield;
      if (prepData.yieldUnit) savedItem.yieldUnit = prepData.yieldUnit;
      if (prepData.processingRawQty !== undefined) savedItem.processingRawQty = prepData.processingRawQty;
      if (prepData.processingCookedQty !== undefined) savedItem.processingCookedQty = prepData.processingCookedQty;
      if (prepData.processingMaterialId) savedItem.processingMaterialId = prepData.processingMaterialId;
      if (prepData.processingMaterialNameAr) savedItem.processingMaterialNameAr = prepData.processingMaterialNameAr;
      if (prepData.portions) savedItem.portions = prepData.portions;
      savedItem.updatedAt = now;

      savedItem.auditHistory.unshift({
        timestamp: now,
        user: actorName,
        action: 'تعديل الصيغة',
        details: prepData.notes || `تم تحديث مكونات وصيغة التجهيز (الناتج: ${oldYield} -> ${savedItem.totalYield})`,
      });
    }

    // Recalculate cost
    const costInfo = this.calculatePreparationUnitCost(establishmentId, savedItem);
    savedItem.wacUnitCost = costInfo.unitCost;

    this.savePreparations(establishmentId, list);

    // Propagate cost dynamically to products
    this.propagateCostToProducts(establishmentId, savedItem.id);

    return savedItem;
  }

  /**
   * Propagates changes in preparation costs to all products using this preparation.
   */
  public propagateCostToProducts(arg1: string, arg2?: string): any {
    const establishmentId = arg2 ? arg1 : 'default';
    const prepId = arg2 ? arg2 : arg1;

    const products: MenuItemProduct[] = productRepository.getAllSync(establishmentId, false);
    const prep = this.getPreparationById(establishmentId, prepId);
    if (!prep) return [];

    let affectedCount = 0;
    products.forEach((prod) => {
      const usesPrep = (prod.recipeIngredients || []).some(
        (rec: ProductRecipeItem) => rec.type === 'semi_finished' && rec.ingredientId === prepId
      );

      if (usesPrep) {
        // Recalculate product recipe cost
        let newRawCost = 0;
        prod.recipeIngredients.forEach((rec: ProductRecipeItem) => {
          if (rec.type === 'semi_finished' && rec.ingredientId === prepId) {
            let itemCost = prep.wacUnitCost;
            if (rec.portionId) {
              const portion = prep.portions.find((p) => p.id === rec.portionId);
              if (portion) itemCost = portion.calculatedCost;
            }
            rec.costPerUnit = itemCost;
            rec.totalCost = Math.round(itemCost * (rec.quantity || 1) * 100) / 100;
          }
          newRawCost += rec.totalCost || 0;
        });

        // Update product true cost
        const pkgCost = (prod.packagingItems || []).reduce((sum: number, p: { cost?: number }) => sum + (p.cost || 0), 0);
        const laborCost = ((prod.directLaborMinutes || 5) / 60) * (prod.laborHourlyRate || 15);
        const utilities = prod.utilitiesCost || 0.5;
        const consumables = prod.consumablesCost || 0.3;

        prod.trueCost = Math.round((newRawCost + pkgCost + laborCost + utilities + consumables) * 100) / 100;
        if (prod.sellingPrice > 0) {
          prod.foodCostPercentage = Math.round((newRawCost / prod.sellingPrice) * 100);
          prod.grossMarginPercentage = Math.round(((prod.sellingPrice - prod.trueCost) / prod.sellingPrice) * 100);
        }
        prod.updatedAt = new Date().toISOString();
        productRepository.upsertSync(establishmentId, prod);
        affectedCount++;
      }
    });

    return affectedCount;
  }

  /**
   * Gets list of products affected by a preparation.
   */
  public getAffectedProducts(establishmentId: string, prepId: string): MenuItemProduct[] {
    const products: MenuItemProduct[] = productRepository.getAllSync(establishmentId, false);
    return products.filter((prod) =>
      (prod.recipeIngredients || []).some(
        (rec: ProductRecipeItem) => rec.type === 'semi_finished' && rec.ingredientId === prepId
      )
    );
  }

  /**
   * Duplicates an existing preparation (e.g. مرينيه فراخ from مرينيه شيش).
   */
  public duplicatePreparation(
    establishmentId: string,
    sourcePrepId: string,
    newNameAr: string,
    actorName: string = 'محاسب التكاليف'
  ): SemiFinishedItem {
    const source = this.getPreparationById(establishmentId, sourcePrepId);
    if (!source) throw new Error('التجهيز الأصلي غير موجود');

    const copyData: Partial<SemiFinishedItem> & { nameAr: string; category: string } = {
      ...source,
      id: `prep-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: `${source.code}-نسخة`,
      nameAr: newNameAr,
      nameEn: `${source.nameEn} (Copy)`,
      enableBatchTracking: false,
      currentBatchStock: 0,
      batches: [],
      portions: source.portions.map((p) => ({ ...p, id: `por-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })),
      isExample: false,
    };

    return this.upsertPreparation(establishmentId, copyData, actorName);
  }

  /**
   * Deletes a preparation and provides undo restoration.
   */
  public deletePreparation(establishmentId: string, prepId: string): SemiFinishedItem | null {
    const list = this.getPreparations(establishmentId);
    const index = list.findIndex((p) => p.id === prepId);
    if (index === -1) return null;

    const removed = list.splice(index, 1)[0];
    this.savePreparations(establishmentId, list);
    return removed;
  }

  public restorePreparation(establishmentId: string, item: SemiFinishedItem): void {
    const list = this.getPreparations(establishmentId);
    list.push(item);
    this.savePreparations(establishmentId, list);
  }

  /**
   * Records production of an optional batch (تسجيل دفعة تجهيز للشيف).
   * Deducts actual raw ingredients from section warehouse, adds yield to prep stock,
   * and calculates actual batch cost and variance.
   */
  public recordBatchProduction(
    arg1: string,
    arg2?: string | any,
    arg3?: any,
    arg4?: any,
    arg5?: string
  ): {
    batch: PreparationBatchRecord;
    prep: SemiFinishedItem;
    varianceNotice?: string;
  } {
    let establishmentId = 'default';
    let prepId = '';
    let params: {
      batchCount: number;
      actualYieldBase: number;
      actualRawQuantities?: Record<string, number>;
      actorName: string;
      notes?: string;
    };

    if (typeof arg3 === 'number') {
      // (prepId, sectionWhId, actualYieldBase, actualRawQuantities, actorName)
      prepId = arg1;
      params = {
        batchCount: 1,
        actualYieldBase: arg3,
        actualRawQuantities: typeof arg4 === 'object' ? arg4 : undefined,
        actorName: typeof arg4 === 'string' ? arg4 : arg5 || 'الشيف',
      };
    } else if (typeof arg2 === 'object') {
      prepId = arg1;
      params = arg2;
    } else {
      establishmentId = arg1;
      prepId = arg2 as string;
      params = arg3;
    }

    const list = this.getPreparations(establishmentId);
    const prep = list.find((p) => p.id === prepId || p.code === prepId);
    if (!prep) throw new Error('التجهيز غير موجود');

    const targetWh = warehouseService.resolveSectionWarehouseForStation(
      establishmentId,
      prep.producingDepartment
    );
    const materials = warehouseService.getMaterials(establishmentId);

    const standardYieldBase = prep.totalYield * params.batchCount;
    const actualYieldBase = params.actualYieldBase;
    const yieldVarianceBase = Math.round((actualYieldBase - standardYieldBase) * 100) / 100;
    const yieldVariancePercent = standardYieldBase > 0 ? Math.round((yieldVarianceBase / standardYieldBase) * 100) : 0;

    let batchCostEgp = 0;
    const actualRawUsed: PreparationBatchRecord['actualRawUsed'] = [];

    // Deduct raw ingredients from section warehouse
    prep.ingredients.forEach((ing) => {
      if (ing.type === 'raw_material') {
        const mat = materials.find((m) => m.id === ing.itemId || m.nameAr === ing.itemNameAr || m.nameAr.includes(ing.itemNameAr) || ing.itemNameAr.includes(m.nameAr));
        const standardQty = convertPrepUnitToBase(ing.quantity, ing.unit) * params.batchCount;
        const actualQty = params.actualRawQuantities?.[ing.itemId] ?? standardQty;
        const lineCost = actualQty * (mat?.costPerUnit || 0.05);
        batchCostEgp += lineCost;

        // Deduct from section warehouse stock map
        if (mat) {
          if (!mat.warehouseStockMap) mat.warehouseStockMap = {};
          const curWhStock = mat.warehouseStockMap[targetWh.id] || 0;
          mat.warehouseStockMap[targetWh.id] = Math.max(0, curWhStock - actualQty);
          mat.currentStock = Math.max(0, (mat.currentStock || 0) - actualQty);

          // Record movement in Item Card
          warehouseService.recordMovement(establishmentId, {
            materialId: mat.id,
            materialNameAr: mat.nameAr,
            type: 'prep_batch_consume',
            typeNameAr: 'استهلاك تشغيل دفعة',
            fromLocationId: targetWh.id,
            fromLocationNameAr: targetWh.nameAr,
            toLocationId: prep.id,
            toLocationNameAr: `تجهيز: ${prep.nameAr}`,
            quantityBase: -actualQty,
            balanceAfterBase: mat.warehouseStockMap[targetWh.id],
            referenceDoc: `دفعة تجهيز #${prep.code}-${Date.now().toString().slice(-4)}`,
            actorName: params.actorName,
            notes: `سحب خامات لتشغيل ${params.batchCount} دفعة من [${prep.nameAr}]`,
          });
        }

        actualRawUsed.push({
          materialId: ing.itemId,
          materialNameAr: ing.itemNameAr,
          quantityBase: actualQty,
          unitName: mat?.baseUnit || ing.unit,
          cost: Math.round(lineCost * 100) / 100,
        });
      }
    });

    warehouseService.saveMaterials(establishmentId, materials);

    // Calculate new WAC for the preparation
    const oldStock = prep.currentBatchStock || 0;
    const oldTotalCost = oldStock * prep.wacUnitCost;
    const newStock = oldStock + actualYieldBase;
    const newWacUnitCost = newStock > 0 ? (oldTotalCost + batchCostEgp) / newStock : prep.wacUnitCost;

    prep.currentBatchStock = newStock;
    if (!prep.batchStockMap) prep.batchStockMap = {};
    prep.batchStockMap[targetWh.id] = (prep.batchStockMap[targetWh.id] || 0) + actualYieldBase;
    prep.wacUnitCost = Math.round(newWacUnitCost * 1000) / 1000;

    const batchRecord: PreparationBatchRecord = {
      id: `batch-${Date.now()}`,
      date: new Date().toISOString(),
      batchCount: params.batchCount,
      actualRawUsed,
      standardYieldBase,
      actualYieldBase,
      yieldVarianceBase,
      yieldVariancePercent,
      batchCostEgp: Math.round(batchCostEgp * 100) / 100,
      unitCostEgp: actualYieldBase > 0 ? Math.round((batchCostEgp / actualYieldBase) * 1000) / 1000 : prep.wacUnitCost,
      actorName: params.actorName,
      notes: params.notes,
    };

    if (!prep.batches) prep.batches = [];
    prep.batches.unshift(batchRecord);

    let varianceNotice: string | undefined = undefined;
    if (Math.abs(yieldVariancePercent) >= 5) {
      varianceNotice = `انحراف في ناتج التشغيلة بنسبة ${yieldVariancePercent}% (${yieldVarianceBase > 0 ? '+' : ''}${yieldVarianceBase} ${prep.yieldUnit}). القياسي: ${standardYieldBase}، الفعلي: ${actualYieldBase}. يُقترح مراجعة معيار الصيغة مع الشيف.`;
    }

    prep.auditHistory.unshift({
      timestamp: new Date().toISOString(),
      user: params.actorName,
      action: 'تسجيل دفعة تجهيز',
      details: `تم تشغيل ${params.batchCount} دفعة بناتج ${actualYieldBase} ${prep.yieldUnit} بتكلفة ${batchRecord.batchCostEgp} ج.م`,
    });

    this.savePreparations(establishmentId, list);
    return { batch: batchRecord, prep, varianceNotice };
  }

  /**
   * Toggles batch tracking for a preparation.
   * If disabling while stock exists, converts remaining batch stock back into equivalent raw materials into section warehouse.
   */
  public toggleBatchTracking(
    arg1: string,
    arg2: string | boolean,
    arg3?: boolean | string,
    arg4?: string
  ): { prep: SemiFinishedItem; returnedRaw: DecomposedRawRequirement[] } {
    let establishmentId = 'default';
    let prepId = '';
    let enable = true;
    let actorName = 'المدير';

    if (typeof arg2 === 'boolean') {
      prepId = arg1;
      enable = arg2;
      actorName = typeof arg3 === 'string' ? arg3 : 'المدير';
    } else {
      establishmentId = arg1;
      prepId = arg2;
      enable = !!arg3;
      actorName = arg4 || 'المدير';
    }

    const list = this.getPreparations(establishmentId);
    const prep = list.find((p) => p.id === prepId || p.code === prepId);
    if (!prep) throw new Error('التجهيز غير موجود');

    const returnedRaw: DecomposedRawRequirement[] = [];

    if (!enable && prep.currentBatchStock > 0) {
      // Revert remaining preparation stock back to raw materials into section warehouse
      const remainingStock = prep.currentBatchStock;
      const targetWh = warehouseService.resolveSectionWarehouseForStation(
        establishmentId,
        prep.producingDepartment
      );
      const materials = warehouseService.getMaterials(establishmentId);

      const rawEquivalents = this.decomposePreparationToRaw(establishmentId, prep.id, remainingStock);

      rawEquivalents.forEach((raw) => {
        const mat = materials.find((m) => m.id === raw.materialId);
        if (mat) {
          if (!mat.warehouseStockMap) mat.warehouseStockMap = {};
          mat.warehouseStockMap[targetWh.id] = (mat.warehouseStockMap[targetWh.id] || 0) + raw.requiredBaseQty;
          mat.currentStock = (mat.currentStock || 0) + raw.requiredBaseQty;

          // Record movement
          warehouseService.recordMovement(establishmentId, {
            materialId: mat.id,
            materialNameAr: mat.nameAr,
            type: 'prep_revert_to_raw',
            typeNameAr: 'إرجاع رصيد تجهيز لخامات',
            fromLocationId: prep.id,
            fromLocationNameAr: `تجهيز: ${prep.nameAr}`,
            toLocationId: targetWh.id,
            toLocationNameAr: targetWh.nameAr,
            quantityBase: raw.requiredBaseQty,
            balanceAfterBase: mat.warehouseStockMap[targetWh.id],
            referenceDoc: `إيقاف دفعات #${prep.code}`,
            actorName,
            notes: `تحويل رصيد متبقي (${remainingStock} ${prep.yieldUnit}) من التجهيز إلى خاماته الأولية بمخزن القسم`,
          });
        }
        returnedRaw.push(raw);
      });

      warehouseService.saveMaterials(establishmentId, materials);
      prep.currentBatchStock = 0;
      prep.batchStockMap = {};
    }

    prep.enableBatchTracking = enable;
    prep.updatedAt = new Date().toISOString();
    prep.auditHistory.unshift({
      timestamp: new Date().toISOString(),
      user: actorName,
      action: enable ? 'تفعيل تسجيل الدفعات' : 'إيقاف تسجيل الدفعات',
      details: enable
        ? 'تم تفعيل مفتاح تسجيل الدفعات لهذا التجهيز'
        : `تم إيقاف الدفعات والعودة للعمل «على الصيغة»${returnedRaw.length > 0 ? ' (وإرجاع الرصيد المتبقي لخامات مكافئة)' : ''}`,
    });

    this.savePreparations(establishmentId, list);
    return { prep, returnedRaw };
  }

  /**
   * Calculates equivalent raw materials for remaining preparations entered in Physical Audit.
   * e.g. "5 kg pizza sauce" -> 3.94 kg tomatoes, 1.31 L water, etc.
   */
  public calculateEquivalentRawForRemainingPrep(
    arg1: any,
    arg2?: string | number,
    arg3?: number,
    arg4?: string
  ): any {
    if (Array.isArray(arg1)) {
      const list = arg1;
      const combined: {
        rawMaterialId: string;
        rawMaterialNameAr: string;
        equivalentRawQuantity: number;
        baseUnit: string;
        viaPrepNameAr: string;
      }[] = [];

      list.forEach((item: any) => {
        const decomposed = this.decomposePreparationToRaw(
          item.preparationId,
          item.quantityRemaining,
          item.portionId
        );
        decomposed.forEach((dec) => {
          const existing = combined.find((c) => c.rawMaterialId === dec.materialId);
          if (existing) {
            existing.equivalentRawQuantity += dec.requiredBaseQty;
          } else {
            combined.push({
              rawMaterialId: dec.materialId,
              rawMaterialNameAr: dec.materialNameAr,
              equivalentRawQuantity: dec.requiredBaseQty,
              baseUnit: dec.baseUnit,
              viaPrepNameAr: dec.viaPrepNameAr,
            });
          }
        });
      });
      return combined;
    }

    if (typeof arg2 === 'number') {
      return this.decomposePreparationToRaw('default', arg1, arg2, typeof arg3 === 'string' ? arg3 : undefined);
    }

    return this.decomposePreparationToRaw(arg1, arg2 as string, arg3 || 0, arg4);
  }

  /**
   * Returns cumulative consumption of a preparation across sales orders.
   */
  public getCumulativeConsumption(
    establishmentId: string,
    prepId: string,
    startDate?: string,
    endDate?: string
  ): {
    totalUnitsConsumed: number;
    totalCostEgp: number;
    equivalentRawConsumed: Record<string, { materialNameAr: string; quantity: number; unit: string }>;
  } {
    const movements = warehouseService.getMovements(establishmentId);
    const prep = this.getPreparationById(establishmentId, prepId);

    // Filter movements related to this prep
    let totalUnits = 0;
    const equivalentRawConsumed: Record<string, { materialNameAr: string; quantity: number; unit: string }> = {};

    movements.forEach((m) => {
      if (m.notes && m.notes.includes(prep?.nameAr || '___')) {
        const qty = Math.abs(m.quantityBase);
        if (!equivalentRawConsumed[m.materialId]) {
          equivalentRawConsumed[m.materialId] = {
            materialNameAr: m.materialNameAr,
            quantity: 0,
            unit: 'جم/مل',
          };
        }
        equivalentRawConsumed[m.materialId].quantity += qty;
        totalUnits += qty;
      }
    });

    const unitCost = prep?.wacUnitCost || 0.03;
    return {
      totalUnitsConsumed: Math.round(totalUnits * 100) / 100,
      totalCostEgp: Math.round(totalUnits * unitCost * 100) / 100,
      equivalentRawConsumed,
    };
  }
}

export const semiFinishedService = new SemiFinishedService();
