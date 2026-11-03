/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DetailedRecipe,
  MeasurementUnit,
  RecipeCostBreakdown,
  RecipeIngredientItem,
  RecipePackagingItem,
  RecipeVersion,
  UnitConversion,
} from '../domain/types.ts';

export const STANDARD_UNITS: MeasurementUnit[] = [
  { id: 'u-kg', code: 'kg', nameAr: 'كيلوغرام', nameEn: 'Kilogram', category: 'weight', baseRatio: 1, isBase: true },
  { id: 'u-g', code: 'g', nameAr: 'غرام', nameEn: 'Gram', category: 'weight', baseRatio: 0.001, isBase: false },
  { id: 'u-l', code: 'l', nameAr: 'لتر', nameEn: 'Liter', category: 'volume', baseRatio: 1, isBase: true },
  { id: 'u-ml', code: 'ml', nameAr: 'مليلتر', nameEn: 'Milliliter', category: 'volume', baseRatio: 0.001, isBase: false },
  { id: 'u-pcs', code: 'pcs', nameAr: 'حبة / قطعة', nameEn: 'Piece', category: 'count', baseRatio: 1, isBase: true },
  { id: 'u-box', code: 'box', nameAr: 'صندوق / كرتونة', nameEn: 'Box', category: 'packaging', baseRatio: 12, isBase: false },
  { id: 'u-portion', code: 'portion', nameAr: 'حصة تقديم', nameEn: 'Portion', category: 'count', baseRatio: 1, isBase: true },
];

export const STANDARD_CONVERSIONS: UnitConversion[] = [
  { id: 'c-g-kg', fromUnit: 'g', toUnit: 'kg', factor: 0.001 },
  { id: 'c-kg-g', fromUnit: 'kg', toUnit: 'g', factor: 1000 },
  { id: 'c-ml-l', fromUnit: 'ml', toUnit: 'l', factor: 0.001 },
  { id: 'c-l-ml', fromUnit: 'l', toUnit: 'ml', factor: 1000 },
  { id: 'c-box-pcs', fromUnit: 'box', toUnit: 'pcs', factor: 12 },
];

/**
 * Deterministic Unit Conversion
 */
export function convertUnitQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;
  const direct = STANDARD_CONVERSIONS.find((c) => c.fromUnit === fromUnit && c.toUnit === toUnit);
  if (direct) return quantity * direct.factor;
  const inverse = STANDARD_CONVERSIONS.find((c) => c.fromUnit === toUnit && c.toUnit === fromUnit);
  if (inverse && inverse.factor !== 0) return quantity / inverse.factor;
  return quantity;
}

/**
 * Calculate Complete Product True Cost Formula:
 * Ingredient Cost (with Waste/Trim) + Packaging + Direct Labor + Indirect Labor Allocation +
 * Utilities (Water, Energy, Gas) + Consumables + Buffer
 */
export function calculateRecipeTrueCost(
  ingredients: RecipeIngredientItem[],
  packaging: RecipePackagingItem[],
  directLaborMinutes: number,
  laborRatePerHour: number,
  currentSellingPrice: number,
  yieldQuantity: number,
  targetFoodCostPercentage: number = 30
): RecipeCostBreakdown {
  // 1. Raw Ingredients with Scrap/Waste Loss
  const rawIngredientsCost = ingredients.reduce((sum, item) => {
    const rawCost = item.quantity * item.costPerUnit;
    const wasteFactor = item.wastePercentage > 0 && item.wastePercentage < 1 ? 1 - item.wastePercentage : 1;
    const effectiveCost = rawCost / wasteFactor;
    return sum + effectiveCost;
  }, 0);

  // 2. Packaging Components
  const packagingCost = packaging.reduce((sum, p) => sum + p.costPerUnit * p.quantity, 0);

  // 3. Direct Kitchen/Bar Labor (e.g. 12 mins at $14/hr = $2.80)
  const directLaborCost = (directLaborMinutes / 60) * laborRatePerHour;

  // 4. Indirect Labor Allocation (Fixed SG&A absorption ~ 6% of direct labor)
  const indirectLaborAllocation = directLaborCost * 0.15;

  // 5. "From One Drop of Water to Profit": Utility Allocations
  // Production absorption for water, electricity, and cooking gas per portion batch
  const utilitiesAllocation = {
    water: 0.12, // Culinary prep, dishwashing, sanitation
    electricity: 0.35, // Cold storage refrigeration, hood ventilation, combi oven
    gas: 0.28, // High-BTU range and chargrill consumption
  };
  const totalUtilities = utilitiesAllocation.water + utilitiesAllocation.electricity + utilitiesAllocation.gas;

  // 6. Consumables & Sanitation (baking paper, foil, sanitizing solution)
  const consumablesCost = 0.18;

  // 7. General Waste/Loss buffer (shrinkage tolerance ~ 2% of ingredients)
  const wasteLossBuffer = rawIngredientsCost * 0.02;

  // Total True Product Batch Cost
  const totalTrueProductCost =
    rawIngredientsCost +
    packagingCost +
    directLaborCost +
    indirectLaborAllocation +
    totalUtilities +
    consumablesCost +
    wasteLossBuffer;

  const validYield = yieldQuantity > 0 ? yieldQuantity : 1;
  const costPerPortion = totalTrueProductCost / validYield;

  const suggestedSellingPrice =
    targetFoodCostPercentage > 0 ? (costPerPortion / (targetFoodCostPercentage / 100)) : costPerPortion * 3;

  const grossMarginAmount = Math.max(0, currentSellingPrice - costPerPortion);
  const grossMarginPercentage = currentSellingPrice > 0 ? (grossMarginAmount / currentSellingPrice) * 100 : 0;
  const foodCostPercentage = currentSellingPrice > 0 ? (costPerPortion / currentSellingPrice) * 100 : 0;
  const variancePercentage = foodCostPercentage - targetFoodCostPercentage;

  return {
    rawIngredientsCost,
    packagingCost,
    directLaborCost,
    indirectLaborAllocation,
    utilitiesAllocation,
    consumablesCost,
    wasteLossBuffer,
    totalTrueProductCost,
    costPerPortion,
    suggestedSellingPrice,
    currentSellingPrice,
    grossMarginAmount,
    grossMarginPercentage,
    foodCostPercentage,
    targetFoodCostPercentage,
    variancePercentage,
  };
}

/**
 * Recipe Version Factory: Creates an immutable historical version snapshot
 */
export function createRecipeVersionSnapshot(
  existingRecipe: DetailedRecipe,
  newIngredients: RecipeIngredientItem[],
  newPackaging: RecipePackagingItem[],
  directLaborMinutes: number,
  laborRatePerHour: number,
  sellingPrice: number,
  yieldQuantity: number,
  changeReason: string,
  author: string
): RecipeVersion {
  const nextVersionNumber = existingRecipe.versions.length + 1;
  const costBreakdown = calculateRecipeTrueCost(
    newIngredients,
    newPackaging,
    directLaborMinutes,
    laborRatePerHour,
    sellingPrice,
    yieldQuantity
  );

  return {
    versionNumber: nextVersionNumber,
    versionLabel: `V${nextVersionNumber}.0`,
    effectiveFrom: new Date().toISOString().split('T')[0],
    status: 'active',
    yieldQuantity,
    yieldUnit: 'portion',
    portionSize: 1,
    portionUnit: 'serving',
    ingredients: newIngredients,
    packaging: newPackaging,
    directLaborMinutes,
    laborRatePerHour,
    costBreakdown,
    sopInstructionsAr: 'التحضير المعياري بحسب مواصفات الجودة المعتمدة لسلسلة Tygos.',
    sopInstructionsEn: 'Standard operational preparation according to approved Tygos SOP specifications.',
    changeLogReason: changeReason,
    authorUsername: author,
  };
}
