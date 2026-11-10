/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TYGOS ABSTRACT REPOSITORY & SERVICE LAYER
 * Decouples all React views and hooks from physical storage mechanisms.
 * Multi-tenant isolation enforced via establishment-prefixed namespaces.
 * 
 * // INTEGRATION POINT: Replace local storage adapter with Firestore, PostgreSQL, or REST API client.
 */

import {
  calculateUnitCostAfterWaste,
  calculateRecipeTrueCost,
  calculateSuggestedSellingPrice,
  calculateGrossMargin,
  calculateFoodCostPercentage,
} from '../domain/formulas.ts';
import { UserRole, Establishment } from '../types/index.ts';
import {
  rawMaterialRepository,
  productRepository,
  settingsRepository,
  auditRepository,
  menuOverridesRepository,
  orderRepository,
} from '../repositories/repositories.ts';
import { generateUuid } from '../sync/syncTypes.ts';
import {
  MenuItemOverride,
  formatOrderSerialNumber,
} from '../domain/qrMenuTypes.ts';

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

export interface DeliveryZone {
  id: string;
  nameAr: string;
  nameEn: string;
  fee: number;
}

export interface VenueSettings {
  publicAppUrl: string;
  currency: string;
  taxStandard: number;
  taxReduced: number;
  serviceCharge: number;
  deliveryFee: number;
  isTaxInclusive: boolean;
  valuationMethod: 'weighted_average' | 'fifo';
  targetMargin: number;
  numberFormat: 'standard' | 'european';
  autoAcceptOrders: boolean;
  menuThemeColor?: string;
  logoUrl?: string;
  hideUnavailableMenuItems: boolean;
  orderHoursStart?: string;
  orderHoursEnd?: string;
  minDeliveryOrder?: number;
  deliveryZones?: DeliveryZone[];
  welcomeMessageAr?: string;
  welcomeMessageEn?: string;
  customerDataRetentionDays: number;
  tableCount?: number;
  loyaltyEnabled?: boolean;
  loyaltyPointsPerUnit?: number;
  loyaltyRedeemValue?: number;
  allowNegativeStockSale?: boolean; // إعداد: السماح بالبيع عند رصيد صفر (افتراضياً false)
}

export interface RawMaterialItem {
  id: string;
  establishmentId: string;
  nameAr: string;
  nameEn: string;
  category: string;
  categoryNodeId?: string;
  purchaseUnit: string; // e.g., 'kg', 'liter', 'piece', 'box'
  purchasePrice: number; // e.g., 50.00
  purchasedQuantity: number; // e.g., 10
  consumptionUnit: string; // e.g., 'g', 'ml', 'piece'
  conversionFactor: number; // how many consumption units in 1 purchase unit (e.g., 1000g in 1kg)
  wastePercentage: number; // e.g., 15 for 15% trimming/prep loss
  effectiveUnitCost: number; // calculated cost per consumption unit after waste
  currentStock: number; // in consumption units
  costPerUnit?: number; // average cost per base consumption unit (WAC)

  // Multi-level Packaging Chain (Package 2)
  majorUnit?: string; // وحدة كبرى (كرتونة / شوال / جركن / صندوق)
  majorUnitCapacity?: number; // سعة الوحدة الكبرى كم وحدة فرعية (مثلاً: 12 علبة)
  subUnit?: string; // وحدة فرعية (علبة / كيس / زجاجة)
  subUnitCapacity?: number; // سعة الوحدة الفرعية بوحدة الأساس (مثلاً: 700 مل أو 500 جم)
  baseUnit?: string; // أصغر وحدة قياس (جرام / مل / قطعة)

  // Multi-warehouse & Location stock breakdown (in base units)
  warehouseStockMap?: Record<string, number>; // { 'wh-main': 12000, 'wh-kitchen': 2000, 'wh-bar': 500 }
  inTransitStockMap?: Record<string, number>; // كميات محجوزة في الطريق
  assignedWarehouseId?: string; // مخزن الصرف الافتراضي للخامة

  reorderPoint: number;
  supplierName?: string;
  expirationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRecipeItem {
  ingredientId: string;
  ingredientNameAr: string;
  ingredientNameEn: string;
  quantity: number; // in ingredient's consumption unit
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface MenuItemProduct {
  id: string;
  establishmentId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  sellingPrice: number;
  targetMarginPercentage: number;
  suggestedPrice: number;
  trueCost: number;
  foodCostPercentage: number;
  grossMarginPercentage: number;
  isActive: boolean;
  recipeIngredients: ProductRecipeItem[];
  directLaborMinutes: number;
  laborHourlyRate: number;
  wasteLossBuffer: number;
  utilitiesCost: number;
  consumablesCost: number;
  prepStation?: string;
  isExample?: boolean;
  servingsYield?: number;
  packagingItems?: Array<{ id: string; nameAr: string; cost: number }>;
  auditHistory?: Array<{ timestamp: string; user: string; action: string; details: string }>;
  variants?: Array<{ id: string; nameAr: string; nameEn: string; priceMultiplier: number; price: number }>;
  // Package 3: Product Availability & Batch Tracking
  isAvailable?: boolean; // Manual override toggle by station chef (default: true)
  batchStockCount?: number; // Optional manual batch count for baked goods / items (e.g. 24 croissants prepared)
  enableBatchStock?: boolean; // Toggle for manual batch stock tracking
  lowStockThresholdPortions?: number; // Portions remaining for yellow alert warning
  createdAt: string;
  updatedAt: string;
}

export interface CashierShiftRecord {
  id: string;
  establishmentId: string;
  cashierUsername: string;
  openedAt: string;
  closedAt?: string;
  startingFloatCash: number;
  cashSales: number;
  cardSales: number;
  totalSales: number;
  ordersCount: number;
  actualCashInDrawer?: number;
  cashDiscrepancy?: number;
  status: 'open' | 'closed';
  zReportNumber?: string;
}

export interface AuditLogEntry {
  id: string;
  establishmentId: string;
  timestamp: string;
  username: string;
  userRole: UserRole;
  action: string;
  module: string;
  detailsAr: string;
  detailsEn: string;
  ipAddress?: string;
}

export interface EstablishmentSettings {
  currency: string;
  taxRateStandard: number;
  taxRateReduced: number;
  isTaxInclusive: boolean;
  inventoryValuationMethod: 'weighted_average' | 'fifo';
  targetGrossMargin: number;
  defaultWasteRate: number;
  numberFormat: 'western' | 'eastern';
  theme: 'dark' | 'light' | 'system';
  language: 'ar' | 'en';
  // Package 3: Stock Settings
  allowNegativeStockSale?: boolean;
  lowStockYellowThresholdPercent?: number; // Percentage or portions
  enableBatchStockDefault?: boolean;
}

// ---------------------------------------------------------------------------
// DEFAULT TEMPLATES (RESTAURANT, CAFE, TOURIST VENUE)
// ---------------------------------------------------------------------------

export const TEMPLATES_DATA = {
  restaurant: {
    nameAr: 'قالب مطعم نموذج (لحوم، باستا، بيتزا، مقبلات)',
    nameEn: 'Model Restaurant Template (Meat, Pasta, Pizza, Soups)',
    materials: [
      { nameAr: 'لحم بقري ريب آي صافي', nameEn: 'Beef Ribeye Prime', category: 'لحوم', purchaseUnit: 'كجم', purchasePrice: 22.0, purchasedQuantity: 15, consumptionUnit: 'جرام', conversionFactor: 1000, wastePercentage: 15, currentStock: 12000, reorderPoint: 3000, supplierName: 'شركة اللحوم الوطنية' },
      { nameAr: 'صلصة طماطم إيطالية مطبوخة', nameEn: 'Italian Tomato Sauce', category: 'بقالة ومعلبات', purchaseUnit: 'علبة 3 كجم', purchasePrice: 7.5, purchasedQuantity: 20, consumptionUnit: 'جرام', conversionFactor: 3000, wastePercentage: 5, currentStock: 45000, reorderPoint: 9000, supplierName: 'مورد الأغذية الممتازة' },
      { nameAr: 'جبنة موزاريلا مبشورة طبيعية', nameEn: 'Mozzarella Shredded', category: 'ألبان وأجبان', purchaseUnit: 'كجم', purchasePrice: 9.0, purchasedQuantity: 25, consumptionUnit: 'جرام', conversionFactor: 1000, wastePercentage: 3, currentStock: 20000, reorderPoint: 5000, supplierName: 'مزارع الوادي' },
      { nameAr: 'دقيق فاخر بيتزا 00', nameEn: 'Pizza Flour 00', category: 'مطاحن ومخبوزات', purchaseUnit: 'شيكارة 25 كجم', purchasePrice: 18.0, purchasedQuantity: 10, consumptionUnit: 'جرام', conversionFactor: 25000, wastePercentage: 4, currentStock: 180000, reorderPoint: 25000, supplierName: 'المطاحن الحديثة' },
      { nameAr: 'زيت زيتون بكر ممتاز', nameEn: 'Extra Virgin Olive Oil', category: 'زيوت ومواد دهنية', purchaseUnit: 'لتر', purchasePrice: 12.0, purchasedQuantity: 30, consumptionUnit: 'مل', conversionFactor: 1000, wastePercentage: 2, currentStock: 25000, reorderPoint: 5000, supplierName: 'زيوت الشام' },
    ],
    products: [
      { code: 'R-01', nameAr: 'بيتزا مارغريتا نابوليتان', nameEn: 'Pizza Margherita Neapolitan', category: 'بيتزا', sellingPrice: 14.5, targetMarginPercentage: 72, laborMinutes: 8, laborRate: 15, utilitiesCost: 0.6, consumablesCost: 0.4 },
      { code: 'R-02', nameAr: 'ستيك ريب آي مع بطاطا بوريه', nameEn: 'Ribeye Steak with Puree', category: 'أطباق رئيسية', sellingPrice: 34.0, targetMarginPercentage: 68, laborMinutes: 18, laborRate: 18, utilitiesCost: 1.2, consumablesCost: 0.8 },
    ],
  },
  cafe: {
    nameAr: 'قالب كافيه ومشروبات متخصصة (إسبريسو، ماتشا، كرواسون)',
    nameEn: 'Specialty Cafe & Bakery Template (Espresso, Matcha, Bakery)',
    materials: [
      { nameAr: 'حبوب قهوة إسبريسو مختصة (إثيوبيا)', nameEn: 'Specialty Coffee Beans Ethiopia', category: 'بن ومشروبات', purchaseUnit: 'كجم', purchasePrice: 28.0, purchasedQuantity: 10, consumptionUnit: 'جرام', conversionFactor: 1000, wastePercentage: 6, currentStock: 8000, reorderPoint: 2000, supplierName: 'محمصة النخبة' },
      { nameAr: 'حليب كامل الدسم مبستر', nameEn: 'Whole Milk Fresh', category: 'ألبان', purchaseUnit: 'كرتونة 12 لتر', purchasePrice: 16.0, purchasedQuantity: 20, consumptionUnit: 'مل', conversionFactor: 12000, wastePercentage: 8, currentStock: 150000, reorderPoint: 24000, supplierName: 'شركة الألبان الطازجة' },
      { nameAr: 'ماتشا ياباني درجة احتفالية', nameEn: 'Ceremonial Japanese Matcha', category: 'شاي وماتشا', purchaseUnit: 'عبوة 500 جرام', purchasePrice: 35.0, purchasedQuantity: 4, consumptionUnit: 'جرام', conversionFactor: 500, wastePercentage: 3, currentStock: 1800, reorderPoint: 300, supplierName: 'مستورد الشرق' },
      { nameAr: 'سيروب فانيليا طبيعي', nameEn: 'Madagascar Vanilla Syrup', category: 'منكهات وصوصات', purchaseUnit: 'زجاجة 1 لتر', purchasePrice: 11.5, purchasedQuantity: 12, consumptionUnit: 'مل', conversionFactor: 1000, wastePercentage: 2, currentStock: 9500, reorderPoint: 2000, supplierName: 'سيروبات الذواقة' },
      { nameAr: 'عجينة كرواسون زبدة فرنسية', nameEn: 'French Butter Croissant Dough', category: 'مخبوزات', purchaseUnit: 'كرتونة 60 قطعة', purchasePrice: 42.0, purchasedQuantity: 5, consumptionUnit: 'قطعة', conversionFactor: 60, wastePercentage: 5, currentStock: 220, reorderPoint: 60, supplierName: 'المخبز الباريسي' },
    ],
    products: [
      { code: 'C-01', nameAr: 'فلات وايت بالحليب الطازج', nameEn: 'Flat White Double Shot', category: 'قهوة ساخنة', sellingPrice: 5.5, targetMarginPercentage: 80, laborMinutes: 4, laborRate: 14, utilitiesCost: 0.25, consumablesCost: 0.3 },
      { code: 'C-02', nameAr: 'إسبانش لاتيه مثلج', nameEn: 'Iced Spanish Latte', category: 'مشروبات مثلجة', sellingPrice: 6.8, targetMarginPercentage: 78, laborMinutes: 5, laborRate: 14, utilitiesCost: 0.3, consumablesCost: 0.45 },
    ],
  },
  tourist_venue: {
    nameAr: 'قالب منشأة سياحية وفندقية (بوفيه، إفطار، كلوب ساندوتش)',
    nameEn: 'Resort & Tourist Venue Template (Buffet, Breakfast, Dining)',
    materials: [
      { nameAr: 'فيليه سلمون نرويجي طازج', nameEn: 'Fresh Norwegian Salmon Fillet', category: 'مأكولات بحرية', purchaseUnit: 'كجم', purchasePrice: 26.0, purchasedQuantity: 12, consumptionUnit: 'جرام', conversionFactor: 1000, wastePercentage: 12, currentStock: 9000, reorderPoint: 2500, supplierName: 'شركة الأسماك العالمية' },
      { nameAr: 'خبز توست بريوش فاخر', nameEn: 'Brioche Toast Loaf', category: 'مخبوزات فندقية', purchaseUnit: 'كيس 20 شريحة', purchasePrice: 4.5, purchasedQuantity: 15, consumptionUnit: 'شريحة', conversionFactor: 20, wastePercentage: 5, currentStock: 240, reorderPoint: 40, supplierName: 'مخبز الفندق الرئيسي' },
      { nameAr: 'سلة فواكه استوائية مشكلة', nameEn: 'Tropical Fruit Basket', category: 'خضار وفواكه', purchaseUnit: 'صندوق 10 كجم', purchasePrice: 22.0, purchasedQuantity: 6, consumptionUnit: 'جرام', conversionFactor: 10000, wastePercentage: 18, currentStock: 40000, reorderPoint: 10000, supplierName: 'مزارع الاستواء' },
    ],
    products: [
      { code: 'T-01', nameAr: 'تذكرة إفطار بوفيه مفتوح', nameEn: 'International Breakfast Buffet', category: 'إفطار فندقي', sellingPrice: 25.0, targetMarginPercentage: 65, laborMinutes: 20, laborRate: 16, utilitiesCost: 1.5, consumablesCost: 0.8 },
      { code: 'T-02', nameAr: 'كلوب ساندوتش سياحي ديلوكس', nameEn: 'Resort Deluxe Club Sandwich', category: 'وجبات خفيفة', sellingPrice: 16.5, targetMarginPercentage: 70, laborMinutes: 10, laborRate: 15, utilitiesCost: 0.5, consumablesCost: 0.5 },
    ],
  },
};

// ---------------------------------------------------------------------------
// SERVICE CLASS
// ---------------------------------------------------------------------------

class DataService {
  // --- RAW MATERIALS (INGREDIENTS) ---

  async getRawMaterials(estId: string): Promise<RawMaterialItem[]> {
    const existing = rawMaterialRepository.getAllSync(estId, false);
    if (existing.length > 0) return existing;

    // Default seed
    const seeded = this.generateSeedMaterials(estId);
    await this.saveRawMaterials(estId, seeded);
    return seeded;
  }

  async saveRawMaterials(estId: string, items: RawMaterialItem[]): Promise<void> {
    rawMaterialRepository.saveAllSync(estId, items, true);
  }

  async addRawMaterial(
    estId: string,
    input: Omit<RawMaterialItem, 'id' | 'establishmentId' | 'effectiveUnitCost' | 'createdAt' | 'updatedAt'>
  ): Promise<RawMaterialItem> {
    const list = await this.getRawMaterials(estId);

    // Compute effective unit cost using canonical domain formula
    const conversion = Math.max(1, input.conversionFactor || 1);
    const costPerBaseUnit = input.purchasePrice / conversion;
    const effectiveCost = calculateUnitCostAfterWaste(costPerBaseUnit, input.wastePercentage || 0);

    const newItem: RawMaterialItem = {
      ...input,
      id: `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      establishmentId: estId,
      effectiveUnitCost: effectiveCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newItem);
    await this.saveRawMaterials(estId, list);
    await this.logAudit(estId, 'إضافة خامة', `تمت إضافة خامة جديدة [${newItem.nameAr}] بسعر ${newItem.purchasePrice} ج.م`, 'inventory');
    return newItem;
  }

  async updateRawMaterial(estId: string, updated: RawMaterialItem): Promise<void> {
    const list = await this.getRawMaterials(estId);
    const index = list.findIndex((i) => i.id === updated.id);
    if (index >= 0) {
      const conversion = Math.max(1, updated.conversionFactor || 1);
      const costPerBaseUnit = updated.purchasePrice / conversion;
      updated.effectiveUnitCost = calculateUnitCostAfterWaste(costPerBaseUnit, updated.wastePercentage || 0);
      updated.updatedAt = new Date().toISOString();
      list[index] = updated;
      await this.saveRawMaterials(estId, list);
    }
  }

  async deleteRawMaterial(estId: string, ingredientId: string): Promise<RawMaterialItem | null> {
    const list = await this.getRawMaterials(estId);
    const index = list.findIndex((i) => i.id === ingredientId);
    if (index >= 0) {
      const removed = list.splice(index, 1)[0];
      await this.saveRawMaterials(estId, list);
      await this.logAudit(estId, 'حذف خامة', `تم حذف الخامة [${removed.nameAr}]`, 'inventory');
      return removed;
    }
    return null;
  }

  // --- PRODUCTS & RECIPES ---

  async getProducts(estId: string): Promise<MenuItemProduct[]> {
    const existing = productRepository.getAllSync(estId, false);
    if (existing.length > 0) return existing;

    const seeded = this.generateSeedProducts(estId);
    await this.saveProducts(estId, seeded);
    return seeded;
  }

  async saveProducts(estId: string, items: MenuItemProduct[]): Promise<void> {
    productRepository.saveAllSync(estId, items, true);
  }

  async addProductWithRecipe(
    estId: string,
    productData: Omit<MenuItemProduct, 'id' | 'establishmentId' | 'trueCost' | 'foodCostPercentage' | 'grossMarginPercentage' | 'suggestedPrice' | 'createdAt' | 'updatedAt'>
  ): Promise<MenuItemProduct> {
    const list = await this.getProducts(estId);

    // Calculate raw materials cost
    const rawCost = productData.recipeIngredients.reduce((sum, item) => sum + item.totalCost, 0);

    // Run recipe true cost engine
    const costResult = calculateRecipeTrueCost({
      rawIngredientsCost: rawCost,
      wasteLossBuffer: productData.wasteLossBuffer || 0,
      packagingCost: productData.consumablesCost || 0,
      directLaborMinutes: productData.directLaborMinutes || 0,
      laborHourlyRate: productData.laborHourlyRate || 15,
      utilitiesAllocation: {
        gas: (productData.utilitiesCost || 0) * 0.4,
        electricity: (productData.utilitiesCost || 0) * 0.4,
        water: (productData.utilitiesCost || 0) * 0.2,
      },
      portionsYield: 1,
    });

    const trueCost = costResult.costPerPortion;
    const foodCostPct = calculateFoodCostPercentage(trueCost, productData.sellingPrice);
    const grossMarginPct = calculateGrossMargin(productData.sellingPrice, trueCost);
    const suggestedPrice = calculateSuggestedSellingPrice(trueCost, productData.targetMarginPercentage || 70);

    const newProduct: MenuItemProduct = {
      ...productData,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      establishmentId: estId,
      trueCost,
      foodCostPercentage: foodCostPct,
      grossMarginPercentage: grossMarginPct,
      suggestedPrice,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newProduct);
    await this.saveProducts(estId, list);
    await this.logAudit(estId, 'إضافة منتج ووصفة', `تم إنشاء الصنف [${newProduct.nameAr}] بتكلفة ${trueCost.toFixed(2)} ج.م وسعر ${newProduct.sellingPrice.toFixed(2)} ج.م`, 'menu');
    return newProduct;
  }

  async updateProduct(estId: string, updated: MenuItemProduct): Promise<void> {
    const list = await this.getProducts(estId);
    const index = list.findIndex((p) => p.id === updated.id);
    if (index >= 0) {
      // Recalculate true cost and margins
      const rawCost = (updated.recipeIngredients || []).reduce((sum, item) => sum + item.totalCost, 0);
      const pkgCost = (updated.packagingItems || []).reduce((sum, item) => sum + item.cost, 0);
      const portions = Math.max(1, updated.servingsYield || 1);

      const costResult = calculateRecipeTrueCost({
        rawIngredientsCost: rawCost,
        wasteLossBuffer: updated.wasteLossBuffer || 0,
        packagingCost: pkgCost + (updated.consumablesCost || 0),
        directLaborMinutes: updated.directLaborMinutes || 0,
        laborHourlyRate: updated.laborHourlyRate || 15,
        utilitiesAllocation: {
          gas: (updated.utilitiesCost || 0) * 0.4,
          electricity: (updated.utilitiesCost || 0) * 0.4,
          water: (updated.utilitiesCost || 0) * 0.2,
        },
        portionsYield: portions,
      });

      const trueCost = costResult.costPerPortion;
      const foodCostPct = calculateFoodCostPercentage(trueCost, updated.sellingPrice);
      const grossMarginPct = calculateGrossMargin(updated.sellingPrice, trueCost);
      const suggestedPrice = calculateSuggestedSellingPrice(trueCost, updated.targetMarginPercentage || 70);

      list[index] = {
        ...updated,
        trueCost,
        foodCostPercentage: foodCostPct,
        grossMarginPercentage: grossMarginPct,
        suggestedPrice,
        updatedAt: new Date().toISOString(),
      };
      await this.saveProducts(estId, list);
      await this.logAudit(estId, 'تعديل طبق', `تم تعديل بيانات ووصفة الصنف [${updated.nameAr}]`, 'menu');
    }
  }

  async deleteProduct(estId: string, productId: string): Promise<MenuItemProduct | null> {
    const list = await this.getProducts(estId);
    const index = list.findIndex((p) => p.id === productId);
    if (index >= 0) {
      const removed = list.splice(index, 1)[0];
      await this.saveProducts(estId, list);
      await this.logAudit(estId, 'حذف طبق', `تم حذف الصنف [${removed.nameAr}]`, 'menu');
      return removed;
    }
    return null;
  }

  async restoreProduct(estId: string, product: MenuItemProduct): Promise<void> {
    const list = await this.getProducts(estId);
    const existingIndex = list.findIndex((p) => p.id === product.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...product, updatedAt: new Date().toISOString() });
    }
    await this.saveProducts(estId, list);
    await this.logAudit(estId, 'استرجاع طبق', `تم التراجع عن حذف الصنف [${product.nameAr}]`, 'menu');
  }

  async archiveProduct(estId: string, productId: string): Promise<MenuItemProduct | null> {
    const list = await this.getProducts(estId);
    const target = list.find((p) => p.id === productId);
    if (target) {
      target.isActive = false;
      target.updatedAt = new Date().toISOString();
      await this.saveProducts(estId, list);
      await this.logAudit(estId, 'أرشفة طبق', `تم أرشفة الصنف [${target.nameAr}] لوجود مبيعات سابقة`, 'menu');
      return target;
    }
    return null;
  }

  async clearExampleProducts(estId: string): Promise<number> {
    const list = await this.getProducts(estId);
    const nonExamples = list.filter((p) => !p.isExample);
    const removedCount = list.length - nonExamples.length;
    await this.saveProducts(estId, nonExamples);
    await this.logAudit(estId, 'حذف الأمثلة التجريبية', `تم حذف ${removedCount} من الأمثلة التجريبية للبدء من الصفر`, 'menu');
    return removedCount;
  }

  // --- CASHIER SHIFTS ---

  async getActiveShift(estId: string): Promise<CashierShiftRecord | null> {
    const existing = settingsRepository.getActiveShift<CashierShiftRecord>(estId);
    if (existing) return existing;

    return {
      id: `shift-${Date.now()}`,
      establishmentId: estId,
      cashierUsername: 'maya_cashier',
      openedAt: new Date(Date.now() - 3600000 * 5).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      startingFloatCash: 150.0,
      cashSales: 740.0,
      cardSales: 1105.5,
      totalSales: 1845.5,
      ordersCount: 38,
      status: 'open',
    };
  }

  async closeCashierShift(
    estId: string,
    actualCash: number
  ): Promise<CashierShiftRecord> {
    const shift = (await this.getActiveShift(estId)) || {
      id: `shift-${Date.now()}`,
      establishmentId: estId,
      cashierUsername: 'cashier',
      openedAt: new Date().toISOString(),
      startingFloatCash: 100,
      cashSales: 500,
      cardSales: 500,
      totalSales: 1000,
      ordersCount: 20,
      status: 'open',
    };

    const expectedCash = shift.startingFloatCash + shift.cashSales;
    const discrepancy = actualCash - expectedCash;

    const closedShift: CashierShiftRecord = {
      ...shift,
      closedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actualCashInDrawer: actualCash,
      cashDiscrepancy: discrepancy,
      status: 'closed',
      zReportNumber: `Z-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    settingsRepository.closeActiveShift(estId, closedShift);

    await this.logAudit(
      estId,
      'إغلاق وردية كاشير (تقرير Z)',
      `تم إغلاق الوردية برقم تقرير [${closedShift.zReportNumber}] بإجمالي مبيعات ${closedShift.totalSales} ج.م`,
      'pos'
    );

    return closedShift;
  }

  // --- TEMPLATES LOADER ---

  async loadTemplate(estId: string, templateType: 'restaurant' | 'cafe' | 'tourist_venue'): Promise<{ materialsCount: number; productsCount: number }> {
    const template = TEMPLATES_DATA[templateType] || TEMPLATES_DATA.restaurant;
    const materials: RawMaterialItem[] = [];

    for (const m of template.materials) {
      const conversion = m.conversionFactor || 1;
      const costPerBaseUnit = m.purchasePrice / conversion;
      const effectiveCost = calculateUnitCostAfterWaste(costPerBaseUnit, m.wastePercentage || 0);

      materials.push({
        id: `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        establishmentId: estId,
        nameAr: m.nameAr,
        nameEn: m.nameEn,
        category: m.category,
        purchaseUnit: m.purchaseUnit,
        purchasePrice: m.purchasePrice,
        purchasedQuantity: m.purchasedQuantity,
        consumptionUnit: m.consumptionUnit,
        conversionFactor: m.conversionFactor,
        wastePercentage: m.wastePercentage,
        effectiveUnitCost: effectiveCost,
        currentStock: m.currentStock,
        reorderPoint: m.reorderPoint,
        supplierName: m.supplierName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await this.saveRawMaterials(estId, materials);

    // Products
    const products: MenuItemProduct[] = [];
    for (const p of template.products) {
      const sampleRecipeItems: ProductRecipeItem[] = materials.slice(0, 2).map((mat) => ({
        ingredientId: mat.id,
        ingredientNameAr: mat.nameAr,
        ingredientNameEn: mat.nameEn,
        quantity: 200,
        unit: mat.consumptionUnit,
        unitCost: mat.effectiveUnitCost,
        totalCost: Number((mat.effectiveUnitCost * 200).toFixed(2)),
      }));

      const rawCost = sampleRecipeItems.reduce((acc, cur) => acc + cur.totalCost, 0);
      const trueCost = rawCost + (p.laborMinutes / 60) * p.laborRate + p.utilitiesCost + p.consumablesCost;
      const foodCostPct = calculateFoodCostPercentage(trueCost, p.sellingPrice);
      const grossMarginPct = calculateGrossMargin(p.sellingPrice, trueCost);

      products.push({
        id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        establishmentId: estId,
        code: p.code,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        category: p.category,
        sellingPrice: p.sellingPrice,
        targetMarginPercentage: p.targetMarginPercentage,
        suggestedPrice: calculateSuggestedSellingPrice(trueCost, p.targetMarginPercentage),
        trueCost: Number(trueCost.toFixed(2)),
        foodCostPercentage: foodCostPct,
        grossMarginPercentage: grossMarginPct,
        isActive: true,
        recipeIngredients: sampleRecipeItems,
        directLaborMinutes: p.laborMinutes,
        laborHourlyRate: p.laborRate,
        wasteLossBuffer: 0.5,
        utilitiesCost: p.utilitiesCost,
        consumablesCost: p.consumablesCost,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    await this.saveProducts(estId, products);
    await this.logAudit(estId, 'تحميل قالب جاهز', `تم تحميل قالب [${template.nameAr}] بنجاح`, 'system');

    return { materialsCount: materials.length, productsCount: products.length };
  }

  // --- AUDIT LOG ---

  async logAudit(
    estId: string,
    action: string,
    detailsAr: string,
    module: string,
    username: string = 'User',
    userRole: UserRole = 'tenant_admin'
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: `aud-${generateUuid().slice(0, 8)}`,
      establishmentId: estId,
      timestamp: new Date().toISOString(),
      username,
      userRole,
      action,
      module,
      detailsAr,
      detailsEn: action,
    };
    auditRepository.appendLog(estId, entry, 100);
  }

  async getAuditLogs(estId: string): Promise<AuditLogEntry[]> {
    return auditRepository.getLogs<AuditLogEntry>(estId);
  }

  // --- LOCAL JSON BACKUP & RESTORE ---

  async exportPartitionBackupJSON(estId: string): Promise<string> {
    const materials = await this.getRawMaterials(estId);
    const products = await this.getProducts(estId);
    const audit = await this.getAuditLogs(estId);

    const payload = {
      version: '1.0',
      establishmentId: estId,
      exportedAt: new Date().toISOString(),
      materials,
      products,
      audit,
    };

    return JSON.stringify(payload, null, 2);
  }

  async restorePartitionBackupJSON(estId: string, jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.materials)) {
        await this.saveRawMaterials(estId, parsed.materials);
      }
      if (Array.isArray(parsed.products)) {
        await this.saveProducts(estId, parsed.products);
      }
      await this.logAudit(estId, 'استعادة نسخة احتياطية', 'تمت استعادة بيانات المنشأة من ملف JSON محلي بنجاح', 'system');
      return true;
    } catch {
      return false;
    }
  }

  // --- SEED GENERATORS ---

  private generateSeedMaterials(estId: string): RawMaterialItem[] {
    const raw = TEMPLATES_DATA.restaurant.materials;
    return raw.map((m, idx) => {
      const conversion = m.conversionFactor || 1;
      const costPerBaseUnit = m.purchasePrice / conversion;
      const effectiveCost = calculateUnitCostAfterWaste(costPerBaseUnit, m.wastePercentage || 0);
      return {
        id: `mat-${idx + 1}`,
        establishmentId: estId,
        nameAr: m.nameAr,
        nameEn: m.nameEn,
        category: m.category,
        purchaseUnit: m.purchaseUnit,
        purchasePrice: m.purchasePrice,
        purchasedQuantity: m.purchasedQuantity,
        consumptionUnit: m.consumptionUnit,
        conversionFactor: m.conversionFactor,
        wastePercentage: m.wastePercentage,
        effectiveUnitCost: effectiveCost,
        currentStock: m.currentStock,
        reorderPoint: m.reorderPoint,
        supplierName: m.supplierName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  private generateSeedProducts(estId: string): MenuItemProduct[] {
    return [
      {
        id: 'prod-seed-1',
        establishmentId: estId,
        code: 'R-01',
        nameAr: 'بيتزا مارغريتا نابوليتان',
        nameEn: 'Pizza Margherita Neapolitan',
        category: 'بيتزا',
        sellingPrice: 14.5,
        targetMarginPercentage: 72,
        suggestedPrice: 14.5,
        trueCost: 4.06,
        foodCostPercentage: 28.0,
        grossMarginPercentage: 72.0,
        isActive: true,
        recipeIngredients: [
          { ingredientId: 'mat-4', ingredientNameAr: 'دقيق فاخر بيتزا 00', ingredientNameEn: 'Pizza Flour 00', quantity: 250, unit: 'جرام', unitCost: 0.00075, totalCost: 0.19 },
          { ingredientId: 'mat-2', ingredientNameAr: 'صلصة طماطم إيطالية مطبوخة', ingredientNameEn: 'Italian Tomato Sauce', quantity: 100, unit: 'جرام', unitCost: 0.0026, totalCost: 0.26 },
          { ingredientId: 'mat-3', ingredientNameAr: 'جبنة موزاريلا مبشورة طبيعية', ingredientNameEn: 'Mozzarella Shredded', quantity: 180, unit: 'جرام', unitCost: 0.0093, totalCost: 1.67 },
        ],
        directLaborMinutes: 8,
        laborHourlyRate: 15,
        wasteLossBuffer: 0.44,
        utilitiesCost: 0.6,
        consumablesCost: 0.4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prod-seed-2',
        establishmentId: estId,
        code: 'R-02',
        nameAr: 'ستيك ريب آي مع بطاطا بوريه',
        nameEn: 'Ribeye Steak with Puree',
        category: 'أطباق رئيسية',
        sellingPrice: 34.0,
        targetMarginPercentage: 68,
        suggestedPrice: 34.0,
        trueCost: 10.88,
        foodCostPercentage: 32.0,
        grossMarginPercentage: 68.0,
        isActive: true,
        recipeIngredients: [
          { ingredientId: 'mat-1', ingredientNameAr: 'لحم بقري ريب آي صافي', ingredientNameEn: 'Beef Ribeye Prime', quantity: 300, unit: 'جرام', unitCost: 0.0259, totalCost: 7.77 },
          { ingredientId: 'mat-5', ingredientNameAr: 'زيت زيتون بكر ممتاز', ingredientNameEn: 'Extra Virgin Olive Oil', quantity: 30, unit: 'مل', unitCost: 0.0122, totalCost: 0.37 },
        ],
        directLaborMinutes: 18,
        laborHourlyRate: 18,
        wasteLossBuffer: 1.24,
        utilitiesCost: 1.2,
        consumablesCost: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  // ---------------------------------------------------------------------------
  // PHASE 5: MENU OVERRIDES, SERIAL GENERATOR & VENUE SETTINGS
  // ---------------------------------------------------------------------------

  public async getMenuItemOverrides(estId: string): Promise<MenuItemOverride[]> {
    return menuOverridesRepository.getAllSync(estId, false);
  }

  public async saveMenuItemOverride(estId: string, override: MenuItemOverride): Promise<void> {
    const list = await this.getMenuItemOverrides(estId);
    const existing = list.find((m) => m.productId === override.productId);
    const merged: MenuItemOverride & { id: string } = {
      ...(existing || {}),
      ...override,
      id: (existing as any)?.id || override.productId,
    };
    menuOverridesRepository.upsertSync(estId, merged);
  }

  public async getNextOrderSerialNumber(estId: string): Promise<string> {
    return orderRepository.getNextSerial(estId, false);
  }

  public async getVenueSettings(estId: string): Promise<VenueSettings> {
    const defaultUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const defaults: VenueSettings = {
      publicAppUrl: defaultUrl,
      currency: 'USD',
      taxStandard: 14.0,
      taxReduced: 5.0,
      serviceCharge: 12.0,
      deliveryFee: 5.0,
      isTaxInclusive: false,
      valuationMethod: 'weighted_average',
      targetMargin: 70,
      numberFormat: 'standard',
      autoAcceptOrders: false,
      menuThemeColor: '#0891b2',
      hideUnavailableMenuItems: false,
      customerDataRetentionDays: 90,
    };
    const stored = settingsRepository.getVenueSettings<VenueSettings>(estId);
    return stored ? { ...defaults, ...stored } : defaults;
  }

  public async saveVenueSettings(estId: string, partial: Partial<VenueSettings>): Promise<VenueSettings> {
    const current = await this.getVenueSettings(estId);
    const updated = { ...current, ...partial };
    settingsRepository.saveVenueSettings(estId, updated);
    return updated;
  }

  public async getEstablishmentByCode(code: string): Promise<Establishment | null> {
    const list = settingsRepository.getRegisteredEstablishments<Establishment>();
    const match = list.find((e) => e.code.toLowerCase() === code.toLowerCase());
    if (match) return match;
    // Fallback seed establishment
    if (code.toUpperCase().includes('R.0001') || code.toUpperCase() === 'R.0001' || code === 'default') {
      return {
        id: 'est-restaurant-1',
        name: 'مطعم وكافيه الأفق الأزرق',
        businessType: 'restaurant_cafe',
        prefix: 'R',
        number: '0001',
        code: 'R.0001',
        ownerName: 'ألكسندر فانك',
        email: 'alexander@azurebistro.com',
        phone: '+20 100 482 9182',
        address: 'شارع كورنيش النيل، برج الأفق',
        city: 'القاهرة',
        state: 'القاهرة',
        country: 'مصر',
        nationalId: '29801011234567',
        status: 'active',
        currency: 'USD',
        language: 'ar',
        timezone: 'UTC+2',
        branchesCount: 1,
        usersCount: 8,
        lastActivity: 'Just now',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
    }
    return null;
  }
}

export const dataService = new DataService();
