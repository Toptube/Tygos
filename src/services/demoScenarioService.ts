/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED COHERENT DEMO SCENARIO SERVICE (Package 6 - Section 5)
 * Single source of truth for loading a cohesive multi-branch demo establishment
 * in EGP: 2 branches, 7 warehouses, 30 raw materials (including untracked water),
 * 8 semi-finished preparations, 25 EGP menu products, 12 tables, monthly overhead,
 * daily notes, and sample customer orders — strictly via getStorageAdapter().
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';
import {
  dataService,
  RawMaterialItem,
  MenuItemProduct,
  ProductRecipeItem,
} from './dataService.ts';
import { warehouseService, Branch, WarehouseLocation } from './warehouseService.ts';
import { semiFinishedService, SemiFinishedItem } from './semiFinishedService.ts';
import { overheadService, getCurrentMonthKey } from './overheadService.ts';
import { tableService, RestaurantTable } from './tableService.ts';
import { dailyNotesService } from './dailyNotesService.ts';
import { categoryService } from './categoryService.ts';
import { migrationService } from './migrationService.ts';
import {
  calculateFoodCostPercentage,
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  calculateUnitCostAfterWaste,
} from '../domain/formulas.ts';

export interface DemoLoadSummary {
  branches: number;
  warehouses: number;
  materials: number;
  preparations: number;
  products: number;
  tables: number;
  expenses: number;
  notes: number;
}

class DemoScenarioService {
  /**
   * Clears operational demo data for a given establishment cleanly while
   * keeping user accounts, passwords, and active login session intact.
   */
  public clearDemoEstablishmentData(estId: string = 'est-1'): void {
    const storage = getStorageAdapter();
    const id = estId || 'est-1';

    const keysToClear = [
      `tygos_${id}_raw_materials`,
      `tygos_${id}_products`,
      `tygos_${id}_semi_finished_items`,
      `tygos_${id}_overhead_expenses`,
      `tygos_${id}_overhead_locks`,
      `tygos_${id}_daily_notes`,
      `tygos_${id}_audit_periods`,
      `tygos_${id}_notifications`,
      `tygos_${id}_tables`,
      `tygos_${id}_table_zones`,
      `tygos_${id}_orders`,
      `tygos_${id}_customers`,
      `tygos_${id}_categories_product`,
      `tygos_${id}_categories_material`,
      `tygos_branches_${id}`,
      `tygos_warehouses_${id}`,
      `tygos_stock_movements_${id}`,
      `tygos_requisitions_${id}`,
    ];

    for (const k of keysToClear) {
      storage.removeItemSync(k);
    }

    // Explicitly mark primary collections as intentionally empty so example seeders do not resurrect defaults
    const cleanEmptyArrayKeys = [
      `tygos_${id}_raw_materials`,
      `tygos_${id}_products`,
      `tygos_${id}_semi_finished_items`,
      `tygos_${id}_overhead_expenses`,
      `tygos_${id}_tables`,
    ];
    for (const k of cleanEmptyArrayKeys) {
      storage.setItemSync(k, '[]');
    }
  }

  /**
   * Loads one cohesive, linked EGP multi-branch demo establishment.
   */
  public async loadFullDemoEstablishment(estId: string = 'est-1'): Promise<DemoLoadSummary> {
    const id = estId || 'est-1';
    const now = new Date().toISOString();

    this.clearDemoEstablishmentData(id);

    // 1. Venue settings in EGP
    await dataService.saveVenueSettings(id, {
      currency: 'EGP',
      taxStandard: 14,
      targetMargin: 68,
      autoAcceptOrders: false,
      deliveryFee: 25,
      minDeliveryOrder: 100,
      loyaltyEnabled: true,
      loyaltyPointsPerUnit: 1,
      loyaltyRedeemValue: 0.25,
      welcomeMessageAr: 'أهلاً بكم في منشأة تيست النموذجية - الأسعار شاملة الضريبة',
      welcomeMessageEn: 'Welcome to TYGOS Demo Venue',
    });

    // 2. Two coherent branches
    const branches: Branch[] = [
      {
        id: 'br-zamalek',
        establishmentId: id,
        code: 'BR-001',
        nameAr: 'الفرع الرئيسي - الزمالك',
        nameEn: 'Main Branch - Zamalek',
        address: '26 يوليو، الزمالك، القاهرة',
        isMain: true,
        active: true,
        phone: '01001234567',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'br-maadi',
        establishmentId: id,
        code: 'BR-002',
        nameAr: 'فرع المعادي',
        nameEn: 'Maadi Branch',
        address: 'شارع 9، المعادي، القاهرة',
        isMain: false,
        active: true,
        phone: '01007654321',
        createdAt: now,
        updatedAt: now,
      },
    ];
    warehouseService.saveBranches(id, branches);

    // 3. Multi-warehouse hierarchy across both branches
    const warehouses: WarehouseLocation[] = [
      {
        id: 'wh-main',
        establishmentId: id,
        branchId: 'br-zamalek',
        code: 'WH-001',
        nameAr: 'المخزن الرئيسي - الزمالك',
        nameEn: 'Main Warehouse - Zamalek',
        type: 'main',
        keeperIds: [],
        order: 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wh-central-kitchen',
        establishmentId: id,
        branchId: 'br-zamalek',
        code: 'WH-002',
        nameAr: 'المطبخ المركزي',
        nameEn: 'Central Kitchen',
        type: 'central_kitchen',
        keeperIds: [],
        order: 2,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wh-kitchen',
        establishmentId: id,
        branchId: 'br-zamalek',
        code: 'WH-003',
        nameAr: 'مخزن المطبخ - الزمالك',
        nameEn: 'Kitchen Store - Zamalek',
        type: 'section',
        sectionType: 'kitchen',
        keeperIds: [],
        order: 3,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wh-bar',
        establishmentId: id,
        branchId: 'br-zamalek',
        code: 'WH-004',
        nameAr: 'مخزن البار - الزمالك',
        nameEn: 'Bar Store - Zamalek',
        type: 'section',
        sectionType: 'bar',
        keeperIds: [],
        order: 4,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wh-bakery',
        establishmentId: id,
        branchId: 'br-zamalek',
        code: 'WH-005',
        nameAr: 'مخزن المخبز والحلواني',
        nameEn: 'Bakery & Pastry Store',
        type: 'section',
        sectionType: 'bakery',
        keeperIds: [],
        order: 5,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wh-maadi-kitchen',
        establishmentId: id,
        branchId: 'br-maadi',
        code: 'WH-006',
        nameAr: 'مخزن مطبخ المعادي',
        nameEn: 'Maadi Kitchen Store',
        type: 'section',
        sectionType: 'kitchen',
        keeperIds: [],
        order: 6,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'wh-maadi-bar',
        establishmentId: id,
        branchId: 'br-maadi',
        code: 'WH-007',
        nameAr: 'مخزن بار المعادي',
        nameEn: 'Maadi Bar Store',
        type: 'section',
        sectionType: 'bar',
        keeperIds: [],
        order: 7,
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    warehouseService.saveWarehouses(id, warehouses);

    // Ensure categories trees exist
    categoryService.getCategories(id, 'product');
    categoryService.getCategories(id, 'material');

    // 4. 30 Raw Materials (realistic Egyptian market prices in EGP, including untracked filtered water)
    const rawSpecs: Array<{
      id: string;
      nameAr: string;
      nameEn: string;
      category: string;
      purchaseUnit: string;
      purchasePrice: number;
      purchasedQuantity: number;
      consumptionUnit: string;
      conversionFactor: number;
      wastePercentage: number;
      kitchenStock: number;
      mainStock: number;
      reorderPoint: number;
      supplierName: string;
      isStockTracked?: boolean;
      targetWh?: string;
    }> = [
      { id: 'demo-mat-1', nameAr: 'لحم ريب آي بقري', nameEn: 'Beef Ribeye', category: 'لحوم', purchaseUnit: 'كجم', purchasePrice: 480, purchasedQuantity: 10, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 6, kitchenStock: 12000, mainStock: 25000, reorderPoint: 3000, supplierName: 'مزارع الدلتا للحوم' },
      { id: 'demo-mat-2', nameAr: 'صدور دجاج فيليه', nameEn: 'Chicken Breast Fillet', category: 'دواجن', purchaseUnit: 'كجم', purchasePrice: 210, purchasedQuantity: 20, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 4, kitchenStock: 18000, mainStock: 35000, reorderPoint: 4000, supplierName: 'شركة النيل للدواجن' },
      { id: 'demo-mat-3', nameAr: 'لحم مفروم برجر صافي', nameEn: 'Ground Beef Burger', category: 'لحوم', purchaseUnit: 'كجم', purchasePrice: 360, purchasedQuantity: 15, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 2, kitchenStock: 14000, mainStock: 20000, reorderPoint: 3000, supplierName: 'مزارع الدلتا للحوم' },
      { id: 'demo-mat-4', nameAr: 'دقيق بيتزا 00 إيطالي', nameEn: 'Pizza Flour 00', category: 'مخبوزات', purchaseUnit: 'شيكارة 25 كجم', purchasePrice: 950, purchasedQuantity: 2, consumptionUnit: 'جم', conversionFactor: 25000, wastePercentage: 1, kitchenStock: 40000, mainStock: 75000, reorderPoint: 10000, supplierName: 'مطاحن القاهرة' },
      { id: 'demo-mat-5', nameAr: 'جبن موتزاريلا مبشور', nameEn: 'Mozzarella Cheese', category: 'ألبان وأجبان', purchaseUnit: 'كجم', purchasePrice: 240, purchasedQuantity: 10, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 2, kitchenStock: 10000, mainStock: 20000, reorderPoint: 2500, supplierName: 'ألبان طيبة' },
      { id: 'demo-mat-6', nameAr: 'طماطم طازجة للصلصة', nameEn: 'Fresh Tomatoes', category: 'خضروات', purchaseUnit: 'كجم', purchasePrice: 22, purchasedQuantity: 25, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 8, kitchenStock: 16000, mainStock: 30000, reorderPoint: 4000, supplierName: 'سوق العبور' },
      { id: 'demo-mat-7', nameAr: 'زيت زيتون بكر ممتاز', nameEn: 'Extra Virgin Olive Oil', category: 'زيوت', purchaseUnit: 'لتر', purchasePrice: 320, purchasedQuantity: 5, consumptionUnit: 'مل', conversionFactor: 1000, wastePercentage: 1, kitchenStock: 4000, mainStock: 10000, reorderPoint: 1000, supplierName: 'شركة الواحة للزيوت' },
      { id: 'demo-mat-8', nameAr: 'أرز بسمتي ذهبي', nameEn: 'Basmati Rice', category: 'حبوب', purchaseUnit: 'كجم', purchasePrice: 78, purchasedQuantity: 20, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 0, kitchenStock: 15000, mainStock: 40000, reorderPoint: 5000, supplierName: 'شركة الحبوب الذهبية' },
      { id: 'demo-mat-9', nameAr: 'مكرونة بنا إيطالية', nameEn: 'Penne Pasta', category: 'حبوب', purchaseUnit: 'كجم', purchasePrice: 55, purchasedQuantity: 15, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 0, kitchenStock: 12000, mainStock: 25000, reorderPoint: 3000, supplierName: 'مطاحن القاهرة' },
      { id: 'demo-mat-10', nameAr: 'كريمة طهي طبيعية', nameEn: 'Cooking Cream', category: 'ألبان وأجبان', purchaseUnit: 'لتر', purchasePrice: 145, purchasedQuantity: 12, consumptionUnit: 'مل', conversionFactor: 1000, wastePercentage: 2, kitchenStock: 8000, mainStock: 15000, reorderPoint: 2000, supplierName: 'ألبان طيبة' },
      { id: 'demo-mat-11', nameAr: 'زبدة طبيعية نيوزيلندي', nameEn: 'Natural Butter', category: 'ألبان وأجبان', purchaseUnit: 'كجم', purchasePrice: 380, purchasedQuantity: 10, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 1, kitchenStock: 7000, mainStock: 12000, reorderPoint: 1500, supplierName: 'ألبان طيبة', targetWh: 'wh-bakery' },
      { id: 'demo-mat-12', nameAr: 'لبن طازج كامل الدسم', nameEn: 'Fresh Whole Milk', category: 'ألبان وأجبان', purchaseUnit: 'لتر', purchasePrice: 42, purchasedQuantity: 24, consumptionUnit: 'مل', conversionFactor: 1000, wastePercentage: 2, kitchenStock: 18000, mainStock: 36000, reorderPoint: 5000, supplierName: 'ألبان طيبة', targetWh: 'wh-bar' },
      { id: 'demo-mat-13', nameAr: 'بن إسبريسو مختص', nameEn: 'Specialty Espresso Beans', category: 'قهوة ومشروبات', purchaseUnit: 'كجم', purchasePrice: 720, purchasedQuantity: 6, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 2, kitchenStock: 5000, mainStock: 10000, reorderPoint: 1000, supplierName: 'محمصة القاهرة المختصة', targetWh: 'wh-bar' },
      { id: 'demo-mat-14', nameAr: 'سيروب فانيليا فرنسي', nameEn: 'Vanilla Syrup', category: 'قهوة ومشروبات', purchaseUnit: 'زجاجة 700 مل', purchasePrice: 280, purchasedQuantity: 6, consumptionUnit: 'مل', conversionFactor: 700, wastePercentage: 1, kitchenStock: 3500, mainStock: 7000, reorderPoint: 700, supplierName: 'تجهيزات الكافيه الحديث', targetWh: 'wh-bar' },
      { id: 'demo-mat-15', nameAr: 'سيروب كراميل مملح', nameEn: 'Salted Caramel Syrup', category: 'قهوة ومشروبات', purchaseUnit: 'زجاجة 700 مل', purchasePrice: 290, purchasedQuantity: 6, consumptionUnit: 'مل', conversionFactor: 700, wastePercentage: 1, kitchenStock: 2800, mainStock: 6300, reorderPoint: 700, supplierName: 'تجهيزات الكافيه الحديث', targetWh: 'wh-bar' },
      { id: 'demo-mat-16', nameAr: 'ليمون طازج', nameEn: 'Fresh Lemon', category: 'خضروات وفواكه', purchaseUnit: 'كجم', purchasePrice: 35, purchasedQuantity: 10, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 10, kitchenStock: 5000, mainStock: 12000, reorderPoint: 1500, supplierName: 'سوق العبور', targetWh: 'wh-bar' },
      { id: 'demo-mat-17', nameAr: 'نعناع أخضر طازج', nameEn: 'Fresh Mint', category: 'خضروات وفواكه', purchaseUnit: 'كجم', purchasePrice: 60, purchasedQuantity: 3, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 15, kitchenStock: 1500, mainStock: 3000, reorderPoint: 500, supplierName: 'سوق العبور', targetWh: 'wh-bar' },
      { id: 'demo-mat-18', nameAr: 'فراولة مجمدة للعصير', nameEn: 'Frozen Strawberry', category: 'خضروات وفواكه', purchaseUnit: 'كجم', purchasePrice: 70, purchasedQuantity: 10, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 3, kitchenStock: 8000, mainStock: 15000, reorderPoint: 2000, supplierName: 'سوق العبور', targetWh: 'wh-bar' },
      { id: 'demo-mat-19', nameAr: 'مانجو طبيعية مجمدة', nameEn: 'Frozen Mango Pulp', category: 'خضروات وفواكه', purchaseUnit: 'كجم', purchasePrice: 85, purchasedQuantity: 10, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 3, kitchenStock: 7500, mainStock: 14000, reorderPoint: 2000, supplierName: 'سوق العبور', targetWh: 'wh-bar' },
      { id: 'demo-mat-20', nameAr: 'بطاطس فريز فارم', nameEn: 'Frozen French Fries', category: 'مجمدات', purchaseUnit: 'كيس 2.5 كجم', purchasePrice: 175, purchasedQuantity: 10, consumptionUnit: 'جم', conversionFactor: 2500, wastePercentage: 2, kitchenStock: 18000, mainStock: 30000, reorderPoint: 5000, supplierName: 'المجمدات المتحدة' },
      { id: 'demo-mat-21', nameAr: 'ثوم مقشر جاهز', nameEn: 'Peeled Garlic', category: 'خضروات', purchaseUnit: 'كجم', purchasePrice: 95, purchasedQuantity: 5, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 2, kitchenStock: 3500, mainStock: 8000, reorderPoint: 1000, supplierName: 'سوق العبور' },
      { id: 'demo-mat-22', nameAr: 'صلصة طماطم مركزة', nameEn: 'Tomato Paste', category: 'معلبات', purchaseUnit: 'علبة 800 جم', purchasePrice: 68, purchasedQuantity: 12, consumptionUnit: 'جم', conversionFactor: 800, wastePercentage: 1, kitchenStock: 6400, mainStock: 14400, reorderPoint: 1600, supplierName: 'شركة المواد الغذائية' },
      { id: 'demo-mat-23', nameAr: 'سكر أبيض ناعم', nameEn: 'Fine White Sugar', category: 'أساسيات', purchaseUnit: 'كجم', purchasePrice: 38, purchasedQuantity: 25, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 0, kitchenStock: 15000, mainStock: 35000, reorderPoint: 5000, supplierName: 'شركة المواد الغذائية' },
      { id: 'demo-mat-24', nameAr: 'عسل أسود ودبس رمان', nameEn: 'Molasses & Pomegranate Sauce', category: 'صوصات', purchaseUnit: 'زجاجة 500 مل', purchasePrice: 95, purchasedQuantity: 8, consumptionUnit: 'مل', conversionFactor: 500, wastePercentage: 2, kitchenStock: 3000, mainStock: 6000, reorderPoint: 1000, supplierName: 'شركة المواد الغذائية' },
      { id: 'demo-mat-25', nameAr: 'خبز بريوش برجر', nameEn: 'Brioche Burger Bun', category: 'مخبوزات', purchaseUnit: 'عبوة 6 قطع', purchasePrice: 48, purchasedQuantity: 15, consumptionUnit: 'قطعة', conversionFactor: 6, wastePercentage: 2, kitchenStock: 60, mainStock: 120, reorderPoint: 18, supplierName: 'مخبز الزمالك' },
      { id: 'demo-mat-26', nameAr: 'جبن شيدر شرائح', nameEn: 'Cheddar Slices', category: 'ألبان وأجبان', purchaseUnit: 'كجم', purchasePrice: 310, purchasedQuantity: 5, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 0, kitchenStock: 4000, mainStock: 8000, reorderPoint: 1000, supplierName: 'ألبان طيبة' },
      { id: 'demo-mat-27', nameAr: 'شوكولاتة دارك للحلويات', nameEn: 'Dark Chocolate Couverture', category: 'حلويات', purchaseUnit: 'كجم', purchasePrice: 460, purchasedQuantity: 5, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 1, kitchenStock: 3500, mainStock: 7000, reorderPoint: 1000, supplierName: 'مخبز الزمالك', targetWh: 'wh-bakery' },
      { id: 'demo-mat-28', nameAr: 'عبوة تيك أواي كرتون', nameEn: 'Kraft Takeaway Box', category: 'تغليف', purchaseUnit: 'ربطة 50 عبوة', purchasePrice: 225, purchasedQuantity: 4, consumptionUnit: 'عبوة', conversionFactor: 50, wastePercentage: 0, kitchenStock: 120, mainStock: 300, reorderPoint: 40, supplierName: 'مصنع التغليف الحديث' },
      { id: 'demo-mat-29', nameAr: 'بهارات مشويات وتتبيل', nameEn: 'Grill Spice Blend', category: 'توابل', purchaseUnit: 'كجم', purchasePrice: 340, purchasedQuantity: 3, consumptionUnit: 'جم', conversionFactor: 1000, wastePercentage: 1, kitchenStock: 2000, mainStock: 5000, reorderPoint: 500, supplierName: 'عطارة الحسين' },
      { id: 'demo-mat-30', nameAr: 'ماء مفلتر', nameEn: 'Filtered Water', category: 'أساسيات', purchaseUnit: 'متر مكعب', purchasePrice: 5, purchasedQuantity: 1, consumptionUnit: 'مل', conversionFactor: 1000, wastePercentage: 0, kitchenStock: 0, mainStock: 0, reorderPoint: 0, supplierName: 'شبكة المياه والفلتر', isStockTracked: false },
    ];

    const rawMaterials: RawMaterialItem[] = rawSpecs.map((spec) => {
      const costPerBase = spec.purchasePrice / spec.conversionFactor;
      const eff = calculateUnitCostAfterWaste(costPerBase, spec.wastePercentage);
      const sectionWhId = spec.targetWh || 'wh-kitchen';
      const tracked = spec.isStockTracked !== false;
      const stockMap: Record<string, number> = tracked
        ? {
            'wh-main': spec.mainStock,
            [sectionWhId]: spec.kitchenStock,
            ...(spec.id === 'demo-mat-4' || spec.id === 'demo-mat-23' || spec.id === 'demo-mat-12'
              ? { 'wh-bakery': Math.round(spec.kitchenStock * 0.5) }
              : {}),
          }
        : {};
      return {
        id: spec.id,
        establishmentId: id,
        nameAr: spec.nameAr,
        nameEn: spec.nameEn,
        category: spec.category,
        purchaseUnit: spec.purchaseUnit,
        purchasePrice: spec.purchasePrice,
        purchasedQuantity: spec.purchasedQuantity,
        consumptionUnit: spec.consumptionUnit,
        conversionFactor: spec.conversionFactor,
        wastePercentage: spec.wastePercentage,
        effectiveUnitCost: Number(eff.toFixed(6)),
        currentStock: tracked ? spec.kitchenStock : 0,
        reorderPoint: spec.reorderPoint,
        supplierName: spec.supplierName,
        isStockTracked: tracked,
        warehouseStockMap: stockMap,
        isExample: true,
        createdAt: now,
        updatedAt: now,
      };
    });

    await dataService.saveRawMaterials(id, rawMaterials);
    const matMap = new Map(rawMaterials.map((m) => [m.id, m]));

    // 5. 8 Semi-Finished Preparations linked directly to the seeded raw materials
    const makePrepIng = (matId: string, qty: number) => {
      const m = matMap.get(matId)!;
      return {
        id: `pi-${matId}`,
        type: 'raw_material' as const,
        itemId: m.id,
        itemNameAr: m.nameAr,
        quantity: qty,
        unit: m.consumptionUnit,
        unitCostSnapshot: m.effectiveUnitCost,
        totalCostSnapshot: Number((m.effectiveUnitCost * qty).toFixed(4)),
      };
    };

    const preparations: SemiFinishedItem[] = [];
    const prepDefs: Array<Partial<SemiFinishedItem> & { nameAr: string }> = [
      {
        id: 'demo-prep-1',
        code: 'PRP-001',
        nameAr: 'عجينة بيتزا إيطالية',
        nameEn: 'Italian Pizza Dough',
        category: 'عجائن',
        producingDepartment: 'kitchen',
        type: 'portion',
        enableBatchTracking: false,
        totalYield: 2000,
        yieldUnit: 'جرام',
        prepTimeMinutes: 25,
        ingredients: [
          makePrepIng('demo-mat-4', 1200),
          makePrepIng('demo-mat-7', 60),
          makePrepIng('demo-mat-30', 650),
          makePrepIng('demo-mat-23', 20),
        ],
        portions: [
          { id: 'por-pizza-s', nameAr: 'كرة بيتزا وسط (250 جم)', sizeInYieldUnits: 250, calculatedCost: 0 },
          { id: 'por-pizza-l', nameAr: 'كرة بيتزا كبيرة (350 جم)', sizeInYieldUnits: 350, calculatedCost: 0 },
        ],
        isExample: true,
      },
      {
        id: 'demo-prep-2',
        code: 'PRP-002',
        nameAr: 'صلصة مارينارا إيطالية',
        nameEn: 'Marinara Sauce',
        category: 'صوصات',
        producingDepartment: 'kitchen',
        type: 'compound',
        enableBatchTracking: false,
        totalYield: 1000,
        yieldUnit: 'جرام',
        prepTimeMinutes: 20,
        ingredients: [
          makePrepIng('demo-mat-6', 800),
          makePrepIng('demo-mat-22', 150),
          makePrepIng('demo-mat-7', 40),
          makePrepIng('demo-mat-21', 25),
        ],
        portions: [
          { id: 'por-mar-80', nameAr: 'مغرفة صلصة بيتزا (80 جم)', sizeInYieldUnits: 80, calculatedCost: 0 },
        ],
        isExample: true,
      },
      {
        id: 'demo-prep-3',
        code: 'PRP-003',
        nameAr: 'أرز بسمتي مطهو بالبخار',
        nameEn: 'Steamed Basmati Rice',
        category: 'مسلوقات',
        producingDepartment: 'kitchen',
        type: 'processing',
        enableBatchTracking: false,
        processingRawQty: 500,
        processingCookedQty: 1000,
        processingMaterialId: 'demo-mat-8',
        processingMaterialNameAr: 'أرز بسمتي ذهبي',
        totalYield: 1000,
        yieldUnit: 'جرام',
        prepTimeMinutes: 15,
        ingredients: [
          makePrepIng('demo-mat-8', 500),
          makePrepIng('demo-mat-11', 25),
          makePrepIng('demo-mat-30', 700),
        ],
        portions: [
          { id: 'por-rice-250', nameAr: 'طبق أرز مطهو (250 جم)', sizeInYieldUnits: 250, calculatedCost: 0 },
        ],
        isExample: true,
      },
      {
        id: 'demo-prep-4',
        code: 'PRP-004',
        nameAr: 'مارينيه شيش طاووق بالزبادي والتوابل',
        nameEn: 'Shish Tawook Marinade',
        category: 'تتبيلات',
        producingDepartment: 'kitchen',
        type: 'compound',
        enableBatchTracking: false,
        totalYield: 1000,
        yieldUnit: 'جرام',
        prepTimeMinutes: 10,
        ingredients: [
          makePrepIng('demo-mat-29', 120),
          makePrepIng('demo-mat-7', 120),
          makePrepIng('demo-mat-21', 60),
          makePrepIng('demo-mat-16', 100),
        ],
        portions: [],
        isExample: true,
      },
      {
        id: 'demo-prep-5',
        code: 'PRP-005',
        nameAr: 'صوص باربكيو مدخن',
        nameEn: 'Smoked BBQ Sauce',
        category: 'صوصات',
        producingDepartment: 'kitchen',
        type: 'compound',
        enableBatchTracking: false,
        totalYield: 1000,
        yieldUnit: 'مل',
        prepTimeMinutes: 15,
        ingredients: [
          makePrepIng('demo-mat-22', 400),
          makePrepIng('demo-mat-24', 250),
          makePrepIng('demo-mat-23', 100),
          makePrepIng('demo-mat-29', 40),
        ],
        portions: [
          { id: 'por-bbq-40', nameAr: 'بولة صوص باربكيو (40 مل)', sizeInYieldUnits: 40, calculatedCost: 0 },
        ],
        isExample: true,
      },
      {
        id: 'demo-prep-6',
        code: 'PRP-006',
        nameAr: 'صوص تومية كريمي',
        nameEn: 'Garlic Toumia Sauce',
        category: 'صوصات',
        producingDepartment: 'kitchen',
        type: 'compound',
        enableBatchTracking: false,
        totalYield: 1000,
        yieldUnit: 'جرام',
        prepTimeMinutes: 10,
        ingredients: [
          makePrepIng('demo-mat-21', 120),
          makePrepIng('demo-mat-7', 350),
          makePrepIng('demo-mat-16', 80),
          makePrepIng('demo-mat-30', 250),
        ],
        portions: [],
        isExample: true,
      },
      {
        id: 'demo-prep-7',
        code: 'PRP-007',
        nameAr: 'عجينة كرواسون زبدة فرنسية',
        nameEn: 'Butter Croissant Dough',
        category: 'عجائن',
        producingDepartment: 'bakery',
        type: 'portion',
        enableBatchTracking: false,
        totalYield: 1000,
        yieldUnit: 'جرام',
        prepTimeMinutes: 35,
        ingredients: [
          makePrepIng('demo-mat-4', 550),
          makePrepIng('demo-mat-11', 280),
          makePrepIng('demo-mat-12', 140),
          makePrepIng('demo-mat-23', 60),
        ],
        portions: [
          { id: 'por-crois-100', nameAr: 'قطعة كرواسون (100 جم)', sizeInYieldUnits: 100, calculatedCost: 0 },
        ],
        isExample: true,
      },
      {
        id: 'demo-prep-8',
        code: 'PRP-008',
        nameAr: 'كريمة شوكولاتة جاناش (دفعات)',
        nameEn: 'Chocolate Ganache (Batch Tracked)',
        category: 'حلويات',
        producingDepartment: 'bakery',
        type: 'compound',
        enableBatchTracking: true,
        totalYield: 1000,
        yieldUnit: 'جرام',
        prepTimeMinutes: 15,
        ingredients: [
          makePrepIng('demo-mat-27', 500),
          makePrepIng('demo-mat-10', 450),
          makePrepIng('demo-mat-11', 50),
        ],
        portions: [
          { id: 'por-gan-60', nameAr: 'تغطية تورتة/مولتن (60 جم)', sizeInYieldUnits: 60, calculatedCost: 0 },
        ],
        isExample: true,
      },
    ];

    for (const def of prepDefs) {
      const created = semiFinishedService.upsertPreparation(id, def, 'مدير التشغيل');
      preparations.push(created);
    }
    // Overwrite any auto-seeded defaults from semiFinishedService so only the 8 cohesive demo preps exist
    semiFinishedService.savePreparations(id, preparations);

    // Record one initial production batch on batch-tracked prep #8 so UI displays active batch stock
    semiFinishedService.recordBatchProduction(id, 'demo-prep-8', {
      batchCount: 1,
      actualYieldBase: 1000,
      actorName: 'شيف الحلواني',
      notes: 'دفعة افتتاحية نموذجية',
    });

    const prepMap = new Map(semiFinishedService.getPreparations(id).map((p) => [p.id, p]));

    // 6. 25 EGP Menu Products across categories (using valid raw materials + semi-finished preparations)
    type LineSpec =
      | { kind: 'raw'; matId: string; qty: number }
      | { kind: 'prep'; prepId: string; qty: number; portionId?: string; portionName?: string };

    const productSpecs: Array<{
      code: string;
      nameAr: string;
      nameEn: string;
      category: string;
      station: string;
      sellingPrice: number;
      prepTimeMinutes: number;
      lines: LineSpec[];
    }> = [
      { code: 'GRL-001', nameAr: 'شيش طاووق مشوي مع أرز بسمتي', nameEn: 'Grilled Shish Tawook w/ Rice', category: 'مشويات', station: 'المطبخ', sellingPrice: 225, prepTimeMinutes: 14, lines: [{ kind: 'raw', matId: 'demo-mat-2', qty: 240 }, { kind: 'prep', prepId: 'demo-prep-4', qty: 60 }, { kind: 'prep', prepId: 'demo-prep-3', qty: 1, portionId: 'por-rice-250', portionName: 'طبق أرز مطهو (250 جم)' }, { kind: 'prep', prepId: 'demo-prep-6', qty: 40 }] },
      { code: 'GRL-002', nameAr: 'ستيك ريب آي مشوي 300 جم', nameEn: 'Ribeye Steak 300g', category: 'مشويات', station: 'المطبخ', sellingPrice: 420, prepTimeMinutes: 18, lines: [{ kind: 'raw', matId: 'demo-mat-1', qty: 300 }, { kind: 'raw', matId: 'demo-mat-11', qty: 30 }, { kind: 'raw', matId: 'demo-mat-20', qty: 180 }] },
      { code: 'GRL-003', nameAr: 'صدور دجاج بصوص الباربكيو والأرز', nameEn: 'BBQ Chicken Platter', category: 'مشويات', station: 'المطبخ', sellingPrice: 240, prepTimeMinutes: 15, lines: [{ kind: 'raw', matId: 'demo-mat-2', qty: 260 }, { kind: 'prep', prepId: 'demo-prep-5', qty: 50 }, { kind: 'prep', prepId: 'demo-prep-3', qty: 1, portionId: 'por-rice-250', portionName: 'طبق أرز مطهو (250 جم)' }] },
      { code: 'GRL-004', nameAr: 'فاهيتا دجاج سيزلينج', nameEn: 'Chicken Fajita Sizzling', category: 'مشويات', station: 'المطبخ', sellingPrice: 255, prepTimeMinutes: 16, lines: [{ kind: 'raw', matId: 'demo-mat-2', qty: 250 }, { kind: 'raw', matId: 'demo-mat-7', qty: 25 }, { kind: 'raw', matId: 'demo-mat-29', qty: 15 }, { kind: 'prep', prepId: 'demo-prep-3', qty: 200 }] },
      { code: 'PZA-001', nameAr: 'بيتزا مارجريتا كلاسيك', nameEn: 'Margherita Pizza', category: 'بيتزا', station: 'المطبخ', sellingPrice: 175, prepTimeMinutes: 12, lines: [{ kind: 'prep', prepId: 'demo-prep-1', qty: 1, portionId: 'por-pizza-s', portionName: 'كرة بيتزا وسط (250 جم)' }, { kind: 'prep', prepId: 'demo-prep-2', qty: 1, portionId: 'por-mar-80', portionName: 'مغرفة صلصة بيتزا (80 جم)' }, { kind: 'raw', matId: 'demo-mat-5', qty: 140 }] },
      { code: 'PZA-002', nameAr: 'بيتزا دجاج باربكيو مدخن', nameEn: 'BBQ Chicken Pizza', category: 'بيتزا', station: 'المطبخ', sellingPrice: 235, prepTimeMinutes: 14, lines: [{ kind: 'prep', prepId: 'demo-prep-1', qty: 1, portionId: 'por-pizza-l', portionName: 'كرة بيتزا كبيرة (350 جم)' }, { kind: 'prep', prepId: 'demo-prep-5', qty: 60 }, { kind: 'raw', matId: 'demo-mat-2', qty: 140 }, { kind: 'raw', matId: 'demo-mat-5', qty: 150 }] },
      { code: 'PZA-003', nameAr: 'بيتزا فور تشيز وموتزاريلا', nameEn: 'Cheese Lovers Pizza', category: 'بيتزا', station: 'المطبخ', sellingPrice: 220, prepTimeMinutes: 12, lines: [{ kind: 'prep', prepId: 'demo-prep-1', qty: 1, portionId: 'por-pizza-s', portionName: 'كرة بيتزا وسط (250 جم)' }, { kind: 'prep', prepId: 'demo-prep-2', qty: 70 }, { kind: 'raw', matId: 'demo-mat-5', qty: 180 }, { kind: 'raw', matId: 'demo-mat-26', qty: 60 }] },
      { code: 'PST-001', nameAr: 'باستا ألفريدو دجاج بالكريمة', nameEn: 'Chicken Alfredo Pasta', category: 'باستا', station: 'المطبخ', sellingPrice: 215, prepTimeMinutes: 13, lines: [{ kind: 'raw', matId: 'demo-mat-9', qty: 200 }, { kind: 'raw', matId: 'demo-mat-10', qty: 150 }, { kind: 'raw', matId: 'demo-mat-2', qty: 160 }, { kind: 'raw', matId: 'demo-mat-5', qty: 50 }] },
      { code: 'PST-002', nameAr: 'باستا أرابياتا بصلصة المارينارا', nameEn: 'Penne Arrabbiata', category: 'باستا', station: 'المطبخ', sellingPrice: 155, prepTimeMinutes: 10, lines: [{ kind: 'raw', matId: 'demo-mat-9', qty: 200 }, { kind: 'prep', prepId: 'demo-prep-2', qty: 140 }, { kind: 'raw', matId: 'demo-mat-7', qty: 15 }] },
      { code: 'PST-003', nameAr: 'مكرونة باللحم المفروم والموتزاريلا', nameEn: 'Beef Baked Pasta', category: 'باستا', station: 'المطبخ', sellingPrice: 245, prepTimeMinutes: 16, lines: [{ kind: 'raw', matId: 'demo-mat-9', qty: 200 }, { kind: 'raw', matId: 'demo-mat-3', qty: 140 }, { kind: 'prep', prepId: 'demo-prep-2', qty: 120 }, { kind: 'raw', matId: 'demo-mat-5', qty: 80 }] },
      { code: 'BRG-001', nameAr: 'سماش برجر كلاسيك بالجبن الشيدر', nameEn: 'Classic Cheese Smash Burger', category: 'ساندوتشات', station: 'المطبخ', sellingPrice: 185, prepTimeMinutes: 10, lines: [{ kind: 'raw', matId: 'demo-mat-25', qty: 1 }, { kind: 'raw', matId: 'demo-mat-3', qty: 160 }, { kind: 'raw', matId: 'demo-mat-26', qty: 40 }, { kind: 'raw', matId: 'demo-mat-20', qty: 140 }] },
      { code: 'BRG-002', nameAr: 'دبل برجر باربكيو مدخن', nameEn: 'Double BBQ Burger', category: 'ساندوتشات', station: 'المطبخ', sellingPrice: 245, prepTimeMinutes: 12, lines: [{ kind: 'raw', matId: 'demo-mat-25', qty: 1 }, { kind: 'raw', matId: 'demo-mat-3', qty: 280 }, { kind: 'prep', prepId: 'demo-prep-5', qty: 40 }, { kind: 'raw', matId: 'demo-mat-26', qty: 60 }] },
      { code: 'BRG-003', nameAr: 'ساندوتش شيش طاووق بالتومية', nameEn: 'Shish Tawook Sandwich', category: 'ساندوتشات', station: 'المطبخ', sellingPrice: 145, prepTimeMinutes: 9, lines: [{ kind: 'raw', matId: 'demo-mat-25', qty: 1 }, { kind: 'raw', matId: 'demo-mat-2', qty: 150 }, { kind: 'prep', prepId: 'demo-prep-4', qty: 35 }, { kind: 'prep', prepId: 'demo-prep-6', qty: 35 }] },
      { code: 'SID-001', nameAr: 'بطاطس مقلية مقرمشة بالشيدر', nameEn: 'Loaded Cheese Fries', category: 'مقبلات', station: 'المطبخ', sellingPrice: 95, prepTimeMinutes: 7, lines: [{ kind: 'raw', matId: 'demo-mat-20', qty: 250 }, { kind: 'raw', matId: 'demo-mat-26', qty: 50 }] },
      { code: 'SID-002', nameAr: 'أرز بسمتي سادة بالزبدة', nameEn: 'Buttered Basmati Rice', category: 'مقبلات', station: 'المطبخ', sellingPrice: 65, prepTimeMinutes: 5, lines: [{ kind: 'prep', prepId: 'demo-prep-3', qty: 1, portionId: 'por-rice-250', portionName: 'طبق أرز مطهو (250 جم)' }] },
      { code: 'COF-001', nameAr: 'إسبريسو دبل شوت', nameEn: 'Double Espresso', category: 'مشروبات ساخنة', station: 'البار', sellingPrice: 60, prepTimeMinutes: 3, lines: [{ kind: 'raw', matId: 'demo-mat-13', qty: 18 }, { kind: 'raw', matId: 'demo-mat-30', qty: 60 }] },
      { code: 'COF-002', nameAr: 'كابتشينو إيطالي', nameEn: 'Cappuccino', category: 'مشروبات ساخنة', station: 'البار', sellingPrice: 85, prepTimeMinutes: 4, lines: [{ kind: 'raw', matId: 'demo-mat-13', qty: 18 }, { kind: 'raw', matId: 'demo-mat-12', qty: 180 }, { kind: 'raw', matId: 'demo-mat-30', qty: 40 }] },
      { code: 'COF-003', nameAr: 'سبانش لاتيه فانيليا', nameEn: 'Vanilla Spanish Latte', category: 'مشروبات ساخنة', station: 'البار', sellingPrice: 105, prepTimeMinutes: 4, lines: [{ kind: 'raw', matId: 'demo-mat-13', qty: 18 }, { kind: 'raw', matId: 'demo-mat-12', qty: 200 }, { kind: 'raw', matId: 'demo-mat-14', qty: 20 }] },
      { code: 'COF-004', nameAr: 'كراميل ماكياتو ساخن', nameEn: 'Hot Caramel Macchiato', category: 'مشروبات ساخنة', station: 'البار', sellingPrice: 110, prepTimeMinutes: 4, lines: [{ kind: 'raw', matId: 'demo-mat-13', qty: 18 }, { kind: 'raw', matId: 'demo-mat-12', qty: 200 }, { kind: 'raw', matId: 'demo-mat-15', qty: 25 }] },
      { code: 'BAR-001', nameAr: 'ليمون بالنعناع مثلج', nameEn: 'Mint Lemonade', category: 'مشروبات باردة', station: 'البار', sellingPrice: 75, prepTimeMinutes: 4, lines: [{ kind: 'raw', matId: 'demo-mat-16', qty: 80 }, { kind: 'raw', matId: 'demo-mat-17', qty: 15 }, { kind: 'raw', matId: 'demo-mat-23', qty: 25 }, { kind: 'raw', matId: 'demo-mat-30', qty: 220 }] },
      { code: 'BAR-002', nameAr: 'سموزي مانجو طازج', nameEn: 'Fresh Mango Smoothie', category: 'مشروبات باردة', station: 'البار', sellingPrice: 95, prepTimeMinutes: 4, lines: [{ kind: 'raw', matId: 'demo-mat-19', qty: 180 }, { kind: 'raw', matId: 'demo-mat-23', qty: 15 }, { kind: 'raw', matId: 'demo-mat-30', qty: 80 }] },
      { code: 'BAR-003', nameAr: 'سموزي فراولة طبيعي', nameEn: 'Fresh Strawberry Smoothie', category: 'مشروبات باردة', station: 'البار', sellingPrice: 90, prepTimeMinutes: 4, lines: [{ kind: 'raw', matId: 'demo-mat-18', qty: 180 }, { kind: 'raw', matId: 'demo-mat-23', qty: 15 }, { kind: 'raw', matId: 'demo-mat-30', qty: 80 }] },
      { code: 'BKR-001', nameAr: 'كرواسون زبدة فرنسي', nameEn: 'French Butter Croissant', category: 'مخبوزات وحلويات', station: 'المخبز', sellingPrice: 70, prepTimeMinutes: 8, lines: [{ kind: 'prep', prepId: 'demo-prep-7', qty: 1, portionId: 'por-crois-100', portionName: 'قطعة كرواسون (100 جم)' }] },
      { code: 'BKR-002', nameAr: 'كرواسون شوكولاتة جاناش', nameEn: 'Chocolate Ganache Croissant', category: 'مخبوزات وحلويات', station: 'المخبز', sellingPrice: 95, prepTimeMinutes: 9, lines: [{ kind: 'prep', prepId: 'demo-prep-7', qty: 1, portionId: 'por-crois-100', portionName: 'قطعة كرواسون (100 جم)' }, { kind: 'prep', prepId: 'demo-prep-8', qty: 50 }] },
      { code: 'DES-001', nameAr: 'مولتن كيك شوكولاتة جاناش', nameEn: 'Chocolate Molten Cake', category: 'مخبوزات وحلويات', station: 'المخبز', sellingPrice: 135, prepTimeMinutes: 11, lines: [{ kind: 'raw', matId: 'demo-mat-27', qty: 70 }, { kind: 'raw', matId: 'demo-mat-11', qty: 35 }, { kind: 'raw', matId: 'demo-mat-4', qty: 30 }, { kind: 'prep', prepId: 'demo-prep-8', qty: 1, portionId: 'por-gan-60', portionName: 'تغطية تورتة/مولتن (60 جم)' }] },
    ];

    const products: MenuItemProduct[] = productSpecs.map((spec, idx) => {
      const recipeIngredients: ProductRecipeItem[] = spec.lines.map((line) => {
        if (line.kind === 'raw') {
          const mat = matMap.get(line.matId)!;
          return {
            ingredientId: mat.id,
            type: 'raw_material',
            ingredientNameAr: mat.nameAr,
            ingredientNameEn: mat.nameEn,
            quantity: line.qty,
            unit: mat.consumptionUnit,
            unitCost: mat.effectiveUnitCost,
            totalCost: Number((mat.effectiveUnitCost * line.qty).toFixed(2)),
          };
        }
        const prep = prepMap.get(line.prepId)!;
        const matchedPortion = line.portionId
          ? prep.portions.find((p) => p.id === line.portionId)
          : undefined;
        const portionScale = matchedPortion ? matchedPortion.sizeInYieldUnits : 1;
        const unitCost = Number((prep.wacUnitCost * portionScale).toFixed(4));
        return {
          ingredientId: prep.id,
          type: 'semi_finished',
          ingredientNameAr: prep.nameAr,
          ingredientNameEn: prep.nameEn,
          portionId: line.portionId,
          portionNameAr: line.portionName,
          quantity: line.qty,
          unit: line.portionName || prep.yieldUnit,
          unitCost,
          totalCost: Number((unitCost * line.qty).toFixed(2)),
        };
      });

      const trueCost = Number(recipeIngredients.reduce((s, r) => s + r.totalCost, 0).toFixed(2));
      const foodCostPct = calculateFoodCostPercentage(trueCost, spec.sellingPrice);
      const marginPct = calculateGrossMargin(spec.sellingPrice, trueCost);
      const suggested = calculateSuggestedSellingPrice(trueCost, 68);

      return {
        id: `demo-prod-${idx + 1}`,
        establishmentId: id,
        code: spec.code,
        nameAr: spec.nameAr,
        nameEn: spec.nameEn,
        category: spec.category,
        prepStation: spec.station,
        sellingPrice: spec.sellingPrice,
        targetMarginPercentage: 68,
        suggestedPrice: suggested,
        trueCost,
        foodCostPercentage: foodCostPct,
        grossMarginPercentage: marginPct,
        isActive: true,
        isExample: true,
        lowStockThresholdPortions: 5,
        prepTimeMinutes: spec.prepTimeMinutes,
        recipeIngredients,
        directLaborMinutes: spec.prepTimeMinutes,
        laborHourlyRate: 45,
        wasteLossBuffer: 0,
        utilitiesCost: 0,
        consumablesCost: 0,
        createdAt: now,
        updatedAt: now,
      };
    });

    await dataService.saveProducts(id, products);

    // 7. 12 Tables across zones
    tableService.getZones(id);
    const storage = getStorageAdapter();
    const tables: RestaurantTable[] = Array.from({ length: 12 }, (_, idx) => {
      const num = idx + 1;
      const zoneId = num <= 7 ? 'zone-hall' : num <= 10 ? 'zone-terrace' : 'zone-vip';
      return {
        id: `demo-tbl-${num}`,
        number: num,
        nameAr: num >= 11 ? `VIP ${num - 10}` : num >= 8 ? `تراس ${num - 7}` : `طاولة ${num}`,
        nameEn: num >= 11 ? `VIP ${num - 10}` : num >= 8 ? `Terrace ${num - 7}` : `Table ${num}`,
        zoneId,
        capacity: num >= 11 ? 8 : 4,
        status: 'available',
        sortOrder: num,
      };
    });
    storage.setItemSync(`tygos_${id}_tables`, JSON.stringify(tables));

    // 8. Cost centers + 6 coherent EGP monthly overhead expenses
    overheadService.getCostCenters(id);
    const month = getCurrentMonthKey();
    const demoExpenses = [
      { nameAr: 'أجور طهاة ومساعدي المطبخ', monthlyAmount: 28000, category: 'direct_labor' as const, costType: 'direct' as const, costCenterId: 'cc-kitchen', stage1Rule: 'area' as const, stage2Rule: 'prep_time_minutes' as const },
      { nameAr: 'أجور باريستا البار والمشروبات', monthlyAmount: 14000, category: 'direct_labor' as const, costType: 'direct' as const, costCenterId: 'cc-bar', stage1Rule: 'area' as const, stage2Rule: 'prep_time_minutes' as const },
      { nameAr: 'إيجار الفرعين الشهري', monthlyAmount: 45000, category: 'rent' as const, costType: 'indirect' as const, costCenterId: 'cc-shared', stage1Rule: 'area' as const, stage2Rule: 'sales_revenue' as const },
      { nameAr: 'كهرباء وتكييف المطبخ والصالة', monthlyAmount: 12500, category: 'electricity' as const, costType: 'indirect' as const, costCenterId: 'cc-shared', stage1Rule: 'area' as const, stage2Rule: 'prep_time_minutes' as const },
      { nameAr: 'غاز أفران المطبخ والمخبز', monthlyAmount: 6500, category: 'gas' as const, costType: 'indirect' as const, costCenterId: 'cc-kitchen', stage1Rule: 'area' as const, stage2Rule: 'prep_time_minutes' as const },
      { nameAr: 'رواتب الإدارة والكاشير والصالة', monthlyAmount: 32000, category: 'other' as const, costType: 'indirect' as const, costCenterId: 'cc-shared', stage1Rule: 'headcount' as const, stage2Rule: 'sales_revenue' as const },
    ];
    const seededExpenses = [];
    for (const exp of demoExpenses) {
      seededExpenses.push(overheadService.upsertExpense(id, { month, ...exp, isExample: true }));
    }
    overheadService.saveAllExpenses(id, seededExpenses);

    // 9. Daily audit notes linked to real seeded materials & branches
    dailyNotesService.addNote(id, {
      branchId: 'br-zamalek',
      warehouseId: 'wh-kitchen',
      materialId: 'demo-mat-1',
      materialNameAr: 'لحم ريب آي بقري',
      text: 'مراجعة وزن شرائح الريب آي قبل الشوي (300 جم صافي) لتقليل الفارق عن المعيار.',
      authorName: 'محاسب التكاليف',
      authorRole: 'cost_accountant',
      targetSection: 'المطبخ',
    });
    dailyNotesService.addNote(id, {
      branchId: 'br-zamalek',
      warehouseId: 'wh-bar',
      materialId: 'demo-mat-13',
      materialNameAr: 'بن إسبريسو مختص',
      text: 'فحص معايرة مطحنة الإسبريسو كل صباح (18 جم للدبل شوت).',
      authorName: 'مدير التشغيل',
      authorRole: 'general_manager',
      targetSection: 'البار',
    });

    migrationService.migrateEstablishmentData(id);

    await dataService.logAudit(
      id,
      'تحميل المنشأة التجريبية الكاملة',
      'تم تحميل البيانات التجريبية المترابطة: فرعان، 7 مخازن، 30 خامة، 8 تجهيزات، 25 منتجاً، 12 طاولة، ومصاريف الشهر بالجنيه.',
      'system'
    );

    return {
      branches: branches.length,
      warehouses: warehouses.length,
      materials: rawMaterials.length,
      preparations: preparations.length,
      products: products.length,
      tables: tables.length,
      expenses: demoExpenses.length,
      notes: 2,
    };
  }
}

export const demoScenarioService = new DemoScenarioService();
