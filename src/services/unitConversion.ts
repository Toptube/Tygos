/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SIMPLE UNIT CONVERSION & SUB-RECIPE SYSTEM
 * Everyday units used in restaurants, cafes, and bakeries.
 * Egyptian Arabic plain terminology with zero technical jargon.
 */

export interface MeasurementUnit {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'weight' | 'volume' | 'count';
  baseFactor: number; // Factor relative to base unit (grams for weight, ml for volume, piece for count)
  symbolAr: string;
}

export const STANDARD_UNITS: Record<string, MeasurementUnit> = {
  // Weight (base: gram)
  kg: { id: 'kg', nameAr: 'كيلو', nameEn: 'Kilogram', category: 'weight', baseFactor: 1000, symbolAr: 'كجم' },
  g: { id: 'g', nameAr: 'جرام', nameEn: 'Gram', category: 'weight', baseFactor: 1, symbolAr: 'جم' },
  spoon_g: { id: 'spoon_g', nameAr: 'ملعقة (15 جم)', nameEn: 'Tablespoon (15g)', category: 'weight', baseFactor: 15, symbolAr: 'ملعقة' },

  // Volume (base: ml)
  liter: { id: 'liter', nameAr: 'لتر', nameEn: 'Liter', category: 'volume', baseFactor: 1000, symbolAr: 'لتر' },
  ml: { id: 'ml', nameAr: 'مل', nameEn: 'Milliliter', category: 'volume', baseFactor: 1, symbolAr: 'مل' },
  spoon_ml: { id: 'spoon_ml', nameAr: 'ملعقة (15 مل)', nameEn: 'Tablespoon (15ml)', category: 'volume', baseFactor: 15, symbolAr: 'ملعقة' },
  cup_ml: { id: 'cup_ml', nameAr: 'كوب (250 مل)', nameEn: 'Cup (250ml)', category: 'volume', baseFactor: 250, symbolAr: 'كوب' },

  // Count / Packaging (base: piece)
  piece: { id: 'piece', nameAr: 'قطعة', nameEn: 'Piece', category: 'count', baseFactor: 1, symbolAr: 'قطعة' },
  box: { id: 'box', nameAr: 'علبة (24 قطعة)', nameEn: 'Box (24 pcs)', category: 'count', baseFactor: 24, symbolAr: 'علبة' },
  carton: { id: 'carton', nameAr: 'كرتونة (12 قطعة)', nameEn: 'Carton (12 pcs)', category: 'count', baseFactor: 12, symbolAr: 'كرتونة' },
};

/**
 * Normalizes any unit string to a known unit or returns reasonable fallback.
 */
export function normalizeUnit(rawUnit: string): MeasurementUnit {
  const clean = (rawUnit || '').trim().toLowerCase();

  if (clean === 'كجم' || clean === 'كيلو' || clean === 'كيلوجرام' || clean === 'kg') return STANDARD_UNITS.kg;
  if (clean === 'جم' || clean === 'جرام' || clean === 'غرام' || clean === 'g') return STANDARD_UNITS.g;
  if (clean === 'لتر' || clean === 'l' || clean === 'liter') return STANDARD_UNITS.liter;
  if (clean === 'مل' || clean === 'مليلتر' || clean === 'ml') return STANDARD_UNITS.ml;
  if (clean.includes('ملعقة') || clean === 'tbsp') return STANDARD_UNITS.spoon_g;
  if (clean.includes('كوب') || clean === 'cup') return STANDARD_UNITS.cup_ml;
  if (clean.includes('علبة') || clean === 'box') return STANDARD_UNITS.box;
  if (clean.includes('كرتونة') || clean === 'carton') return STANDARD_UNITS.carton;

  return {
    id: clean || 'piece',
    nameAr: rawUnit || 'قطعة',
    nameEn: rawUnit || 'Piece',
    category: 'count',
    baseFactor: 1,
    symbolAr: rawUnit || 'قطعة',
  };
}

/**
 * Calculates effective cost for a quantity in recipe unit from purchase price and purchase unit.
 * Example: 1 kg @ 100 EGP purchase price, recipe uses 250 g:
 * - 1 kg has baseFactor 1000
 * - 250 g has baseFactor 250
 * - Cost = (100 / 1000) * 250 = 25 EGP (adjusted for waste if any)
 */
export function calculateIngredientLineCost(params: {
  purchasePrice: number;
  purchaseUnit: string;
  recipeQuantity: number;
  recipeUnit: string;
  wastePercentage?: number;
}): {
  unitCost: number; // cost per recipe unit
  totalCost: number; // line total
  effectiveWasteMultiplier: number;
} {
  const { purchasePrice, purchaseUnit, recipeQuantity, recipeUnit, wastePercentage = 0 } = params;

  const pUnit = normalizeUnit(purchaseUnit);
  const rUnit = normalizeUnit(recipeUnit);

  let costPerBase = purchasePrice;
  if (pUnit.category === rUnit.category && pUnit.baseFactor > 0) {
    costPerBase = purchasePrice / pUnit.baseFactor;
  }

  // Adjust for waste: e.g. 10% waste means 1/(1 - 0.10)
  const wasteDecimal = Math.min(0.9, Math.max(0, (wastePercentage || 0) / 100));
  const wasteMultiplier = 1 / (1 - wasteDecimal);

  const costPerRecipeUnit = costPerBase * rUnit.baseFactor * wasteMultiplier;
  const totalCost = costPerRecipeUnit * Math.max(0, recipeQuantity);

  return {
    unitCost: Math.round(costPerRecipeUnit * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    effectiveWasteMultiplier: Math.round(wasteMultiplier * 100) / 100,
  };
}
