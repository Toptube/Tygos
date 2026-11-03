/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Standalone Unit Verification for TYGOS Domain Formulas
 */

import {
  calculateUnitCostAfterWaste,
  calculateYieldPercentage,
  calculateRecipeTrueCost,
  calculateFoodCostPercentage,
  calculateGrossMargin,
  calculateMarkupPercentage,
  calculateSuggestedSellingPrice,
  calculatePeriodicCOGS,
  calculateTheoreticalVsActualVariance,
  calculateWeightedAverageCost,
  calculateFifoConsumption,
  calculateTax,
  allocateOperationalExpense,
} from './formulas.ts';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

console.log('🧪 Running Domain Formulas Unit Tests...\n');

// 1. Yield and Unit Cost After Waste
const costAfterWaste = calculateUnitCostAfterWaste(10, 20); // $10 / 0.8 = $12.50
assert(costAfterWaste === 12.5, 'Unit cost after 20% waste from $10 is $12.50');

const yieldPct = calculateYieldPercentage(100, 80);
assert(yieldPct === 80, 'Yield percentage 80kg from 100kg is 80%');

// 2. Recipe True Cost
const recipe = calculateRecipeTrueCost({
  rawIngredientsCost: 10,
  wasteLossBuffer: 1.5,
  packagingCost: 0.5,
  directLaborMinutes: 15,
  laborHourlyRate: 20, // 0.25h * 20 = $5.00
  utilitiesAllocation: {
    water: 0.2,
    electricity: 0.5,
    gas: 0.3,
  },
  consumablesCost: 0.5,
  portionsYield: 1,
});
// 10 + 1.5 + 0.5 + 5 + 1.0 + 0.5 = $18.50
assert(recipe.costPerPortion === 18.5, 'Recipe true portion cost is $18.50');

// 3. Margin, Markup & Pricing
const margin = calculateGrossMargin(50, 15);
assert(margin === 70, 'Gross margin for $50 price and $15 cost is 70%');

const markup = calculateMarkupPercentage(50, 15);
assert(Math.round(markup) === 233, 'Markup percentage for $50 from $15 is ~233%');

const suggestedPrice = calculateSuggestedSellingPrice(15, 70);
assert(suggestedPrice === 50, 'Suggested price for $15 cost with 70% target margin is $50.00');

const foodCost = calculateFoodCostPercentage(15, 50);
assert(foodCost === 30, 'Food cost percentage for $15 on $50 is 30%');

// 4. Periodic COGS
const cogs = calculatePeriodicCOGS(1000, 4000, 1500); // 1000 + 4000 - 1500 = 3500
assert(cogs === 3500, 'COGS calculation equals $3500');

// 5. Theoretical vs Actual Variance
const variance = calculateTheoreticalVsActualVariance(100, 115, 2, 5);
assert(variance.varianceQuantity === 15, 'Variance quantity is 15 units');
assert(variance.varianceCostValue === 30, 'Variance cost value is $30');
assert(variance.unexplainedVarianceCost === 20, 'Unexplained variance (10 units * $2) is $20');

// 6. Weighted Average Cost
const wac = calculateWeightedAverageCost(100, 10, 100, 12);
assert(wac === 11, 'Weighted average cost of (100@10 + 100@12) is $11.00');

// 7. FIFO Consumption
const fifoResult = calculateFifoConsumption(
  [
    { id: 'lot-1', qtyAvailable: 50, unitCost: 10 },
    { id: 'lot-2', qtyAvailable: 50, unitCost: 15 },
  ],
  60
);
// 50 @ 10 + 10 @ 15 = 500 + 150 = 650
assert(fifoResult.consumedCost === 650, 'FIFO consumes 50@10 + 10@15 = $650');
assert(fifoResult.remainingLots[0].qtyAvailable === 40, 'Remaining in lot-2 is 40 units');

// 8. Tax Calculations
const exclusiveTax = calculateTax(100, 14, false);
assert(exclusiveTax.taxAmount === 14 && exclusiveTax.totalWithTax === 114, 'Exclusive 14% tax on $100 is $14, total $114');

const inclusiveTax = calculateTax(114, 14, true);
assert(inclusiveTax.baseAmount === 100 && inclusiveTax.taxAmount === 14, 'Inclusive 14% tax on $114 separates to $100 base and $14 tax');

// 9. Operational Expense Allocation
const allocated = allocateOperationalExpense(1000, 25, 100);
assert(allocated === 250, 'Operational expense allocation 25/100 of 1000 is 250');

console.log('\n🎉 ALL DOMAIN FORMULAS UNIT TESTS PASSED SUCCESSFULLY!\n');
