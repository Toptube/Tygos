/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRODUCT AVAILABILITY SERVICE (خدمة إتاحة الأصناف - Package 3)
 *
 * Logic:
 * - Computes real-time availability from raw materials in the SECTION WAREHOUSE.
 * - Extensible `resolveRawRequirements` to calculate maximum portions.
 * - Optional manual batch production counter for bakery/kitchen (e.g. "24 croissants prepared").
 * - Status: 'available' (green/normal), 'low_stock' (yellow at cashier only), 'out_of_stock' (gray disabled).
 * - Customer Menu sees only 'available' or 'غير متاح' (never yellow or raw quantities).
 * - Kitchen/Bar station head can override with «متوفر / غير متوفر» toggle.
 */

import { productRepository, rawMaterialRepository } from '../repositories/repositories.ts';
import { warehouseService } from './warehouseService.ts';
import { MenuItemProduct, ProductRecipeItem } from './dataService.ts';

export type AvailabilityStatus = 'available' | 'low_stock' | 'out_of_stock';

export interface RawRequirementItem {
  ingredientId: string;
  ingredientNameAr: string;
  requiredPerPortionBase: number;
  availableSectionStockBase: number;
  portionsPossible: number;
  isBottleneck: boolean;
}

export interface ProductAvailabilityInfo {
  productId: string;
  productNameAr: string;
  category: string;
  prepStation: string;
  status: AvailabilityStatus;
  statusNameAr: string;
  portionsAvailable: number;
  limitingIngredientNameAr?: string;
  isManualOverrideDisabled: boolean;
  isBatchTracked: boolean;
  batchCount?: number;
}

class ProductAvailabilityService {
  /**
   * Resolves raw ingredient requirements from the section warehouse corresponding
   * to the product's preparation station.
   */
  public resolveRawRequirements(
    productId: string,
    establishmentId: string = 'default'
  ): {
    requirements: RawRequirementItem[];
    maxPortions: number;
    bottleneckIngredient?: string;
    sectionWarehouseNameAr: string;
  } {
    const products = productRepository.getAllSync(establishmentId, false);
    const prod = products.find((p) => p.id === productId);
    if (!prod) {
      return { requirements: [], maxPortions: 0, sectionWarehouseNameAr: 'المطبخ' };
    }

    const targetWh = warehouseService.resolveSectionWarehouseForStation(
      establishmentId,
      prod.prepStation
    );
    const materials = warehouseService.getMaterials(establishmentId);

    const recipe = prod.recipeIngredients || [];
    if (recipe.length === 0) {
      // Products without recipe default to high portion count or batch count
      return {
        requirements: [],
        maxPortions: prod.enableBatchStock ? (prod.batchStockCount || 0) : 999,
        sectionWarehouseNameAr: targetWh.nameAr,
      };
    }

    let minPortions = Infinity;
    let bottleneckName: string | undefined = undefined;

    const requirements: RawRequirementItem[] = recipe.map((rec: ProductRecipeItem) => {
      const mat = materials.find((m) => m.id === rec.ingredientId);
      const sectionStock = mat?.warehouseStockMap?.[targetWh.id] || 0;
      const reqPerPortion = rec.quantity || 1;

      const portionsPossible = reqPerPortion > 0 ? Math.floor(sectionStock / reqPerPortion) : 999;
      if (portionsPossible < minPortions) {
        minPortions = portionsPossible;
        bottleneckName = rec.ingredientNameAr;
      }

      return {
        ingredientId: rec.ingredientId,
        ingredientNameAr: rec.ingredientNameAr,
        requiredPerPortionBase: reqPerPortion,
        availableSectionStockBase: sectionStock,
        portionsPossible: Math.max(0, portionsPossible),
        isBottleneck: false,
      };
    });

    const maxPortions = minPortions === Infinity ? 0 : Math.max(0, minPortions);

    requirements.forEach((req) => {
      if (req.ingredientNameAr === bottleneckName) {
        req.isBottleneck = true;
      }
    });

    return {
      requirements,
      maxPortions,
      bottleneckIngredient: bottleneckName,
      sectionWarehouseNameAr: targetWh.nameAr,
    };
  }

  /**
   * Evaluates comprehensive availability status for a product.
   */
  public getProductAvailability(
    productId: string,
    establishmentId: string = 'default'
  ): ProductAvailabilityInfo {
    const products = productRepository.getAllSync(establishmentId, false);
    const prod = products.find((p) => p.id === productId);

    if (!prod) {
      return {
        productId,
        productNameAr: 'غير معروف',
        category: '',
        prepStation: 'kitchen',
        status: 'out_of_stock',
        statusNameAr: 'غير متوفر',
        portionsAvailable: 0,
        isManualOverrideDisabled: true,
        isBatchTracked: false,
      };
    }

    // Manual override by Chef (isAvailable === false)
    if (prod.isAvailable === false) {
      return {
        productId: prod.id,
        productNameAr: prod.nameAr,
        category: prod.category,
        prepStation: prod.prepStation || 'kitchen',
        status: 'out_of_stock',
        statusNameAr: 'غير متوفر مؤقتاً (بإيقاف يدوي من المحطة)',
        portionsAvailable: 0,
        isManualOverrideDisabled: true,
        isBatchTracked: !!prod.enableBatchStock,
        batchCount: prod.batchStockCount,
      };
    }

    // Batch stock counting (e.g. 24 croissants prepared)
    if (prod.enableBatchStock) {
      const batchCount = prod.batchStockCount || 0;
      let status: AvailabilityStatus = 'available';
      if (batchCount <= 0) status = 'out_of_stock';
      else if (batchCount <= (prod.lowStockThresholdPortions || 5)) status = 'low_stock';

      return {
        productId: prod.id,
        productNameAr: prod.nameAr,
        category: prod.category,
        prepStation: prod.prepStation || 'bakery',
        status,
        statusNameAr: status === 'available' ? 'متوفر' : status === 'low_stock' ? 'قارب على النفاد' : 'غير متوفر الآن مؤقتاً',
        portionsAvailable: batchCount,
        isManualOverrideDisabled: false,
        isBatchTracked: true,
        batchCount,
      };
    }

    // Raw Recipe Ingredient calculation
    const { maxPortions, bottleneckIngredient } = this.resolveRawRequirements(
      prod.id,
      establishmentId
    );

    const threshold = prod.lowStockThresholdPortions || 5;
    let status: AvailabilityStatus = 'available';

    if (maxPortions <= 0) {
      status = 'out_of_stock';
    } else if (maxPortions <= threshold) {
      status = 'low_stock';
    }

    return {
      productId: prod.id,
      productNameAr: prod.nameAr,
      category: prod.category,
      prepStation: prod.prepStation || 'kitchen',
      status,
      statusNameAr:
        status === 'available'
          ? 'متوفر'
          : status === 'low_stock'
          ? `قارب على النفاد (المتبقي ${maxPortions})`
          : 'غير متوفر الآن مؤقتاً',
      portionsAvailable: maxPortions,
      limitingIngredientNameAr: bottleneckIngredient,
      isManualOverrideDisabled: false,
      isBatchTracked: false,
    };
  }

  /**
   * Toggles product availability manually from kitchen/bar station.
   */
  public setManualAvailability(
    establishmentId: string,
    productId: string,
    isAvailable: boolean,
    actorName: string = 'رئيس المحطة'
  ): MenuItemProduct {
    const products = productRepository.getAllSync(establishmentId, false);
    const prod = products.find((p) => p.id === productId);
    if (!prod) throw new Error('المنتج غير موجود');

    prod.isAvailable = isAvailable;
    prod.manualAvailabilityOverride = !isAvailable;
    prod.updatedAt = new Date().toISOString();

    if (!prod.auditHistory) prod.auditHistory = [];
    prod.auditHistory.unshift({
      timestamp: new Date().toISOString(),
      user: actorName,
      action: isAvailable ? 'تفعيل إتاحة الصنف' : 'إيقاف الصنف مؤقتاً',
      details: isAvailable
        ? `قام [${actorName}] بإعادة إتاحة المنتج [${prod.nameAr}] للبيع في الكاشير والمنيو`
        : `قام [${actorName}] بإيقاف إتاحة المنتج [${prod.nameAr}] مؤقتاً لنفاد الخامات`,
    });

    productRepository.upsertSync(establishmentId, prod);
    return prod;
  }

  /**
   * Updates manual batch stock counter (e.g. prepared 24 pieces).
   */
  public updateBatchStockCount(
    establishmentId: string,
    productId: string,
    newCount: number,
    actorName: string = 'الخباز / الشيف'
  ): MenuItemProduct {
    const products = productRepository.getAllSync(establishmentId, false);
    const prod = products.find((p) => p.id === productId);
    if (!prod) throw new Error('المنتج غير موجود');

    prod.enableBatchStock = true;
    prod.batchStockCount = Math.max(0, newCount);
    prod.isAvailable = newCount > 0;
    prod.updatedAt = new Date().toISOString();

    if (!prod.auditHistory) prod.auditHistory = [];
    prod.auditHistory.unshift({
      timestamp: new Date().toISOString(),
      user: actorName,
      action: 'تحديث كمية التشغيلة المحضرة',
      details: `تم تحديث رصيد التشغيلة المحضرة لـ [${prod.nameAr}] إلى [${newCount}] قطعة`,
    });

    productRepository.upsertSync(establishmentId, prod);
    return prod;
  }

  /**
   * Deducts from batch stock count upon sale.
   */
  public deductBatchStockOnSale(
    establishmentId: string,
    productId: string,
    quantity: number
  ): void {
    const products = productRepository.getAllSync(establishmentId, false);
    const prod = products.find((p) => p.id === productId);
    if (!prod || !prod.enableBatchStock) return;

    const current = prod.batchStockCount || 0;
    prod.batchStockCount = Math.max(0, current - quantity);
    productRepository.upsertSync(establishmentId, prod);
  }
}

export const productAvailabilityService = new ProductAvailabilityService();
