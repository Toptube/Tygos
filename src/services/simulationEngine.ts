/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CostSimulationResult, CostSimulationScenario } from '../domain/types.ts';

export const DEFAULT_SIMULATION_SCENARIO: CostSimulationScenario = {
  id: 'sim-default',
  nameAr: 'سيناريو ضبط كفاءة التشغيل وسعر البيع',
  nameEn: 'Operational Efficiency & Price Realignment Scenario',
  ingredientPriceDeltaPercent: 0,
  sellingPriceDeltaPercent: 0,
  laborRateDeltaPercent: 0,
  wasteReductionPercent: 0,
  yieldImprovementPercent: 0,
  utilityTariffDeltaPercent: 0,
};

/**
 * Deterministic What-If Simulation Engine
 */
export function runCostSimulation(
  scenario: CostSimulationScenario,
  baselineCost: number = 7.85,
  baselineSellingPrice: number = 24.50,
  estimatedMonthlyUnits: number = 1850
): CostSimulationResult {
  // Baseline Calculations
  const baselineGrossMargin = Math.max(0, baselineSellingPrice - baselineCost);
  const baselineGrossMarginPercent = (baselineGrossMargin / baselineSellingPrice) * 100;
  const baselineFoodCostPercent = (baselineCost / baselineSellingPrice) * 100;
  const baselineMonthlyProfit = baselineGrossMargin * estimatedMonthlyUnits;

  // Simulated Calculations
  // 1. Adjusted ingredient cost
  const ingredientImpact = 1 + scenario.ingredientPriceDeltaPercent / 100;

  // 2. Waste reduction factor (reduces overall unit cost)
  const wasteBenefit = 1 - (scenario.wasteReductionPercent / 100) * 0.15;

  // 3. Yield improvement (enhances extraction efficiency)
  const yieldBenefit = 1 - (scenario.yieldImprovementPercent / 100) * 0.1;

  // 4. Labor and utility cost adjustment
  const laborAdjustment = 1 + (scenario.laborRateDeltaPercent / 100) * 0.25;
  const utilityAdjustment = 1 + (scenario.utilityTariffDeltaPercent / 100) * 0.08;

  // Combined simulated unit cost
  const simulatedUnitCost = Math.max(
    0.5,
    baselineCost * ingredientImpact * wasteBenefit * yieldBenefit * laborAdjustment * utilityAdjustment
  );

  // Simulated Selling Price
  const simulatedSellingPrice = Math.max(
    1,
    baselineSellingPrice * (1 + scenario.sellingPriceDeltaPercent / 100)
  );

  const simulatedGrossMargin = Math.max(0, simulatedSellingPrice - simulatedUnitCost);
  const simulatedGrossMarginPercent = (simulatedGrossMargin / simulatedSellingPrice) * 100;
  const simulatedFoodCostPercent = (simulatedUnitCost / simulatedSellingPrice) * 100;
  const simulatedMonthlyProfit = simulatedGrossMargin * estimatedMonthlyUnits;

  const unitCostDelta = simulatedUnitCost - baselineCost;
  const grossMarginDeltaPercent = simulatedGrossMarginPercent - baselineGrossMarginPercent;
  const foodCostDeltaPercent = simulatedFoodCostPercent - baselineFoodCostPercent;
  const monthlyProfitDelta = simulatedMonthlyProfit - baselineMonthlyProfit;
  const annualizedImpact = monthlyProfitDelta * 12;

  return {
    scenario,
    baseline: {
      unitCost: Number(baselineCost.toFixed(2)),
      sellingPrice: Number(baselineSellingPrice.toFixed(2)),
      grossMarginPercent: Number(baselineGrossMarginPercent.toFixed(1)),
      foodCostPercent: Number(baselineFoodCostPercent.toFixed(1)),
      monthlyNetProfit: Number(baselineMonthlyProfit.toFixed(2)),
    },
    simulated: {
      unitCost: Number(simulatedUnitCost.toFixed(2)),
      sellingPrice: Number(simulatedSellingPrice.toFixed(2)),
      grossMarginPercent: Number(simulatedGrossMarginPercent.toFixed(1)),
      foodCostPercent: Number(simulatedFoodCostPercent.toFixed(1)),
      monthlyNetProfit: Number(simulatedMonthlyProfit.toFixed(2)),
    },
    delta: {
      unitCostDelta: Number(unitCostDelta.toFixed(2)),
      grossMarginDeltaPercent: Number(grossMarginDeltaPercent.toFixed(1)),
      foodCostDeltaPercent: Number(foodCostDeltaPercent.toFixed(1)),
      monthlyProfitDelta: Number(monthlyProfitDelta.toFixed(2)),
      annualizedImpact: Number(annualizedImpact.toFixed(2)),
    },
  };
}
