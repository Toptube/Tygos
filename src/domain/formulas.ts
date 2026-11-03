/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TYGOS CORE DOMAIN MATHEMATICAL ENGINE
 * Comprehensive, production-grade formulas for Food & Beverage, Hospitality, and Tourism.
 * Covers: True Costing, Yield & Waste, BOM, Pricing, Margins, Variance, FIFO/WAC, Taxes, and Overhead Allocations.
 */

// ---------------------------------------------------------------------------
// 1. INGREDIENT YIELD & USABLE UNIT COST (هالك التشفية والتقشير)
// ---------------------------------------------------------------------------

/**
 * Calculates effective unit cost after prep trimming, peeling, bone removal, or moisture loss.
 * Formula: Effective Cost = Purchase Cost / (1 - Waste Rate)
 * Or: Purchase Cost / Yield Percentage
 *
 * Example: Meat bought at $10/kg with 20% trim loss (yield = 80%):
 * Effective Cost = $10 / 0.80 = $12.50/kg usable.
 *
 * @param purchaseCost Cost per unit as purchased
 * @param wastePercentage Loss percentage (0 to 100, e.g., 15 for 15%)
 */
export function calculateUnitCostAfterWaste(purchaseCost: number, wastePercentage: number): number {
  if (purchaseCost <= 0) return 0;
  const safeWaste = Math.max(0, Math.min(wastePercentage, 99.9));
  const yieldFraction = 1 - safeWaste / 100;
  return Number((purchaseCost / yieldFraction).toFixed(4));
}

/**
 * Calculates raw purchase yield fraction from initial gross weight and final net usable weight.
 * Yield % = (Net Usable Weight / Gross Purchased Weight) * 100
 */
export function calculateYieldPercentage(grossWeight: number, netUsableWeight: number): number {
  if (grossWeight <= 0) return 0;
  return Number(((netUsableWeight / grossWeight) * 100).toFixed(2));
}

// ---------------------------------------------------------------------------
// 2. RECIPE BILL OF MATERIALS (BOM) & TRUE PRODUCT COST (التكلفة الحقيقية الشاملة)
// ---------------------------------------------------------------------------

export interface RecipeCostInput {
  rawIngredientsCost: number;
  wasteLossBuffer: number;
  packagingCost?: number;
  directLaborMinutes?: number;
  laborHourlyRate?: number;
  utilitiesAllocation?: {
    water?: number;
    electricity?: number;
    gas?: number;
  };
  consumablesCost?: number;
  portionsYield?: number;
}

export interface RecipeCostResult {
  totalBatchTrueCost: number;
  costPerPortion: number;
  rawAndWasteCost: number;
  laborCost: number;
  utilitiesCost: number;
  packagingAndConsumables: number;
}

/**
 * Calculates True Product Cost incorporating:
 * - Net ingredients cost
 * - Production waste & trimming buffer
 * - Direct preparation labor
 * - Allocated utilities (gas, electricity, water)
 * - Portion packaging and service consumables
 */
export function calculateRecipeTrueCost(input: RecipeCostInput): RecipeCostResult {
  const rawAndWaste = (input.rawIngredientsCost || 0) + (input.wasteLossBuffer || 0);

  const laborCost =
    input.directLaborMinutes && input.laborHourlyRate
      ? Number(((input.directLaborMinutes / 60) * input.laborHourlyRate).toFixed(4))
      : 0;

  const utilitiesCost =
    (input.utilitiesAllocation?.water || 0) +
    (input.utilitiesAllocation?.electricity || 0) +
    (input.utilitiesAllocation?.gas || 0);

  const packagingAndConsumables = (input.packagingCost || 0) + (input.consumablesCost || 0);

  const totalBatchTrueCost = Number(
    (rawAndWaste + laborCost + utilitiesCost + packagingAndConsumables).toFixed(4)
  );

  const portions = Math.max(1, input.portionsYield || 1);
  const costPerPortion = Number((totalBatchTrueCost / portions).toFixed(2));

  return {
    totalBatchTrueCost,
    costPerPortion,
    rawAndWasteCost: Number(rawAndWaste.toFixed(2)),
    laborCost: Number(laborCost.toFixed(2)),
    utilitiesCost: Number(utilitiesCost.toFixed(2)),
    packagingAndConsumables: Number(packagingAndConsumables.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// 3. PRICING, FOOD COST %, GROSS MARGIN & MARKUP (التسعير والهوامش)
// ---------------------------------------------------------------------------

/**
 * Food Cost Percentage = (Cost / Selling Price) * 100
 */
export function calculateFoodCostPercentage(portionCost: number, sellingPrice: number): number {
  if (sellingPrice <= 0) return 0;
  return Number(((portionCost / sellingPrice) * 100).toFixed(2));
}

/**
 * Gross Profit Margin = ((Selling Price - Cost) / Selling Price) * 100
 */
export function calculateGrossMargin(sellingPrice: number, cost: number): number {
  if (sellingPrice <= 0) return 0;
  return Number((((sellingPrice - cost) / sellingPrice) * 100).toFixed(2));
}

/**
 * Markup Percentage = ((Selling Price - Cost) / Cost) * 100
 */
export function calculateMarkupPercentage(sellingPrice: number, cost: number): number {
  if (cost <= 0) return 0;
  return Number((((sellingPrice - cost) / cost) * 100).toFixed(2));
}

/**
 * Suggests selling price to achieve a desired gross profit margin.
 * Selling Price = Cost / (1 - (Target Margin % / 100))
 *
 * Example: Cost = $15, Target Margin = 70% (Food cost = 30%):
 * Price = $15 / 0.30 = $50.00
 */
export function calculateSuggestedSellingPrice(cost: number, targetMarginPercentage: number): number {
  if (cost <= 0) return 0;
  const safeMargin = Math.max(1, Math.min(targetMarginPercentage, 95));
  const divisor = 1 - safeMargin / 100;
  return Number((cost / divisor).toFixed(2));
}

// ---------------------------------------------------------------------------
// 4. COST OF GOODS SOLD (COGS / تكلفة المبيعات)
// ---------------------------------------------------------------------------

/**
 * Basic Periodic COGS Formula:
 * COGS = Beginning Inventory + New Purchases - Ending Physical Inventory
 */
export function calculatePeriodicCOGS(
  beginningInventoryValuation: number,
  purchasesValuation: number,
  endingInventoryValuation: number
): number {
  return Number(
    (beginningInventoryValuation + purchasesValuation - endingInventoryValuation).toFixed(2)
  );
}

// ---------------------------------------------------------------------------
// 5. THEORETICAL VS ACTUAL VARIANCE (مراقبة الانحراف والهدر)
// ---------------------------------------------------------------------------

export interface VarianceAnalysis {
  varianceQuantity: number; // positive = excess consumption (loss/waste), negative = surplus
  varianceCostValue: number;
  variancePercentage: number;
  unexplainedVarianceCost: number;
}

/**
 * Compares theoretical consumption (sales volume × BOM recipe) with actual consumption (stock depletion).
 */
export function calculateTheoreticalVsActualVariance(
  theoreticalConsumption: number,
  actualConsumption: number,
  unitCost: number,
  recordedWasteQuantity: number = 0
): VarianceAnalysis {
  const varianceQuantity = Number((actualConsumption - theoreticalConsumption).toFixed(4));
  const varianceCostValue = Number((varianceQuantity * unitCost).toFixed(2));

  const variancePercentage =
    theoreticalConsumption > 0
      ? Number(((varianceQuantity / theoreticalConsumption) * 100).toFixed(2))
      : 0;

  const unexplainedQty = Math.max(0, varianceQuantity - recordedWasteQuantity);
  const unexplainedVarianceCost = Number((unexplainedQty * unitCost).toFixed(2));

  return {
    varianceQuantity,
    varianceCostValue,
    variancePercentage,
    unexplainedVarianceCost,
  };
}

// ---------------------------------------------------------------------------
// 6. INVENTORY VALUATION: WEIGHTED AVERAGE & FIFO (تقييم المخزون)
// ---------------------------------------------------------------------------

/**
 * Calculates new Weighted Average Unit Cost (WAC) upon goods receipt.
 * Formula: ((Old Qty * Old Unit Cost) + (New Qty * New Unit Cost)) / (Old Qty + New Qty)
 */
export function calculateWeightedAverageCost(
  existingQty: number,
  existingUnitCost: number,
  receivedQty: number,
  receivedUnitCost: number
): number {
  const totalQty = existingQty + receivedQty;
  if (totalQty <= 0) return receivedUnitCost || existingUnitCost || 0;

  const totalValuation = existingQty * existingUnitCost + receivedQty * receivedUnitCost;
  return Number((totalValuation / totalQty).toFixed(4));
}

export interface InventoryLot {
  id: string;
  qtyAvailable: number;
  unitCost: number;
}

/**
 * First-In, First-Out (FIFO) consumption depletion.
 * Depletes oldest lots first and returns consumed value and remaining lots.
 */
export function calculateFifoConsumption(
  lots: InventoryLot[],
  qtyToConsume: number
): { consumedCost: number; remainingLots: InventoryLot[]; unfulfilledQty: number } {
  let needed = qtyToConsume;
  let totalCost = 0;
  const newLots: InventoryLot[] = [];

  for (const lot of lots) {
    if (needed <= 0) {
      newLots.push({ ...lot });
      continue;
    }

    if (lot.qtyAvailable <= needed) {
      totalCost += lot.qtyAvailable * lot.unitCost;
      needed -= lot.qtyAvailable;
      // Lot is fully exhausted, not pushed
    } else {
      totalCost += needed * lot.unitCost;
      newLots.push({
        ...lot,
        qtyAvailable: lot.qtyAvailable - needed,
      });
      needed = 0;
    }
  }

  return {
    consumedCost: Number(totalCost.toFixed(2)),
    remainingLots: newLots,
    unfulfilledQty: Number(needed.toFixed(4)),
  };
}

// ---------------------------------------------------------------------------
// 7. TAX CALCULATIONS (EXCLUSIVE & INCLUSIVE VAT / الضريبة)
// ---------------------------------------------------------------------------

export interface TaxCalculationResult {
  baseAmount: number;
  taxAmount: number;
  totalWithTax: number;
}

/**
 * Calculates tax whether the input amount already includes tax or is net exclusive.
 *
 * @param amount Total or net currency amount
 * @param taxRatePercentage e.g. 14 for 14% VAT
 * @param isInclusive True if input amount already has tax included
 */
export function calculateTax(
  amount: number,
  taxRatePercentage: number,
  isInclusive: boolean = false
): TaxCalculationResult {
  if (amount <= 0 || taxRatePercentage <= 0) {
    return { baseAmount: amount, taxAmount: 0, totalWithTax: amount };
  }

  const rateFraction = taxRatePercentage / 100;

  if (isInclusive) {
    const baseAmount = Number((amount / (1 + rateFraction)).toFixed(2));
    const taxAmount = Number((amount - baseAmount).toFixed(2));
    return { baseAmount, taxAmount, totalWithTax: amount };
  } else {
    const taxAmount = Number((amount * rateFraction).toFixed(2));
    const totalWithTax = Number((amount + taxAmount).toFixed(2));
    return { baseAmount: amount, taxAmount, totalWithTax };
  }
}

// ---------------------------------------------------------------------------
// 8. OPERATIONAL EXPENSE ALLOCATION (توزيع المصاريف التشغيلية على المنتجات)
// ---------------------------------------------------------------------------

export type ExpenseAllocationMethod = 'production_volume' | 'revenue_share' | 'equal_split';

/**
 * Allocates general overhead or utility expenses across products.
 */
export function allocateOperationalExpense(
  totalExpenseAmount: number,
  productMetric: number,
  totalSystemMetric: number
): number {
  if (totalSystemMetric <= 0 || totalExpenseAmount <= 0) return 0;
  const ratio = productMetric / totalSystemMetric;
  return Number((totalExpenseAmount * ratio).toFixed(4));
}
