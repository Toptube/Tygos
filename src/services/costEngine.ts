/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CostCenter,
  PurchasePriceIntelligence,
  SupplierPricePoint,
} from '../domain/types.ts';

export interface ComprehensiveCostStructure {
  directCosts: {
    rawIngredients: number;
    packaging: number;
    directKitchenLabor: number;
    totalDirect: number;
  };
  indirectCosts: {
    productionOverhead: number;
    utilities: {
      water: number;
      electricity: number;
      cookingGas: number;
    };
    indirectSupervision: number;
    totalIndirect: number;
  };
  operationalExpenses: {
    storeRent: number;
    posSoftwareLicense: number;
    sanitationMaintenance: number;
    marketingDeliveryCommissions: number;
    totalOpex: number;
  };
  grandTotalCost: number;
}

/**
 * Calculates weighted average cost (WAC) and price trend for an ingredient
 */
export function computePurchasePriceIntelligence(
  ingredientId: string,
  ingredientNameAr: string,
  ingredientNameEn: string,
  standardCost: number,
  history: SupplierPricePoint[]
): PurchasePriceIntelligence {
  if (history.length === 0) {
    return {
      ingredientId,
      ingredientNameAr,
      ingredientNameEn,
      currentStandardCost: standardCost,
      lastPurchasePrice: standardCost,
      averagePurchasePrice: standardCost,
      weightedAverageCost: standardCost,
      priceTrend: 'stable',
      variancePercentage: 0,
      priceHistory: [],
    };
  }

  // Sort chronologically ascending
  const sorted = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const lastPurchasePrice = sorted[sorted.length - 1].unitPrice;
  const sumPrices = sorted.reduce((sum, h) => sum + h.unitPrice, 0);
  const averagePurchasePrice = sumPrices / sorted.length;

  // Weighted average simulation (giving higher weight to more recent purchases)
  const weightedSum = sorted.reduce((sum, h, idx) => sum + h.unitPrice * (idx + 1), 0);
  const weightsTotal = (sorted.length * (sorted.length + 1)) / 2;
  const weightedAverageCost = weightedSum / weightsTotal;

  // Trend detection
  let priceTrend: 'rising' | 'falling' | 'stable' = 'stable';
  if (sorted.length >= 2) {
    const prior = sorted[sorted.length - 2].unitPrice;
    if (lastPurchasePrice > prior * 1.02) priceTrend = 'rising';
    else if (lastPurchasePrice < prior * 0.98) priceTrend = 'falling';
  }

  const variancePercentage = standardCost > 0 ? ((lastPurchasePrice - standardCost) / standardCost) * 100 : 0;

  return {
    ingredientId,
    ingredientNameAr,
    ingredientNameEn,
    currentStandardCost: standardCost,
    lastPurchasePrice,
    averagePurchasePrice,
    weightedAverageCost,
    priceTrend,
    variancePercentage,
    priceHistory: sorted,
  };
}

/**
 * "From One Drop of Water to Profit": Overhead utility allocation across Cost Centers
 */
export function allocateUtilityCostsToDepartments(
  totalWaterBill: number,
  totalElectricityBill: number,
  totalGasBill: number,
  costCenters: CostCenter[]
): Record<string, { water: number; electricity: number; gas: number; total: number }> {
  const result: Record<string, { water: number; electricity: number; gas: number; total: number }> = {};

  costCenters.forEach((cc) => {
    const waterAllocated = totalWaterBill * (cc.utilityWeights.waterPercent / 100);
    const electricityAllocated = totalElectricityBill * (cc.utilityWeights.electricityPercent / 100);
    const gasAllocated = totalGasBill * (cc.utilityWeights.gasPercent / 100);

    result[cc.id] = {
      water: waterAllocated,
      electricity: electricityAllocated,
      gas: gasAllocated,
      total: waterAllocated + electricityAllocated + gasAllocated,
    };
  });

  return result;
}
