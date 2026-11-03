/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  X,
  Sliders,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RotateCcw,
  AlertCircle,
  Percent,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { formatCurrency, formatPercent } from '../../i18n/formatters.ts';

export const CostSimulationWorkspace: React.FC = () => {
  const {
    isSimulationModalOpen,
    setIsSimulationModalOpen,
    simulationScenario,
    simulationResult,
    updateSimulationParam,
    resetSimulation,
  } = useBusiness();
  const { language } = useI18n();

  if (!isSimulationModalOpen) return null;

  const isAr = language === 'ar';
  const { baseline, simulated, delta } = simulationResult;

  const isPositiveImpact = delta.monthlyProfitDelta >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isAr ? 'مساحة محاكاة التكلفة وتحليل السيناريوهات (What-If)' : 'What-If Cost Simulation Workspace'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                  {isAr ? 'محاكاة افتراضية · غير فعلية' : 'Simulation · Not Actual'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'اختبار أثر تقلبات أسعار الموردين، تعديل أسعار البيع، وتقليل الهالك على هامش الربح وصافي العائد.'
                  : 'Test the impact of supplier price fluctuations, menu price changes, and waste reduction on gross margin and net profit.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetSimulation}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title={isAr ? 'إعادة ضبط' : 'Reset'}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </button>
            <button
              onClick={() => setIsSimulationModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs">
          {/* Top Live Impact Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">
                {isAr ? 'تكلفة الحصة المعيارية' : 'Portion True Cost'}
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-xl font-bold font-mono text-white" dir="ltr">
                  {formatCurrency(simulated.unitCost, language)}
                </span>
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    delta.unitCostDelta > 0 ? 'text-rose-400' : delta.unitCostDelta < 0 ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                  dir="ltr"
                >
                  {delta.unitCostDelta > 0 ? `+${delta.unitCostDelta}` : delta.unitCostDelta}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isAr ? 'السابق:' : 'Baseline:'} {formatCurrency(baseline.unitCost, language)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">
                {isAr ? 'نسبة تكلفة الطعام (Food Cost %)' : 'Food Cost Ratio'}
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span
                  className={`text-xl font-bold font-mono ${
                    simulated.foodCostPercent > 32 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                  dir="ltr"
                >
                  {simulated.foodCostPercent}%
                </span>
                <span
                  className={`text-[11px] font-mono ${
                    delta.foodCostDeltaPercent > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                  dir="ltr"
                >
                  {delta.foodCostDeltaPercent > 0 ? `+${delta.foodCostDeltaPercent}%` : `${delta.foodCostDeltaPercent}%`}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isAr ? 'المعيار المستهدف: 30.0%' : 'Benchmark Target: 30.0%'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">
                {isAr ? 'هامش الربح الإجمالي' : 'Gross Margin %'}
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-xl font-bold font-mono text-cyan-300" dir="ltr">
                  {simulated.grossMarginPercent}%
                </span>
                <span
                  className={`text-[11px] font-mono ${
                    delta.grossMarginDeltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                  dir="ltr"
                >
                  {delta.grossMarginDeltaPercent >= 0
                    ? `+${delta.grossMarginDeltaPercent}%`
                    : `${delta.grossMarginDeltaPercent}%`}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {isAr ? 'السعر المقترح:' : 'Simulated Price:'} {formatCurrency(simulated.sellingPrice, language)}
              </span>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                isPositiveImpact
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/20 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">
                  {isAr ? 'الأثر المالي الشهري' : 'Monthly Net Impact'}
                </span>
                {isPositiveImpact ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div className="text-xl font-black font-mono mt-1.5" dir="ltr">
                {delta.monthlyProfitDelta >= 0 ? `+${formatCurrency(delta.monthlyProfitDelta, language)}` : formatCurrency(delta.monthlyProfitDelta, language)}
              </div>
              <span className="text-[10px] opacity-80 mt-1 block">
                {isAr ? 'سنوياً:' : 'Annualized:'} {delta.annualizedImpact >= 0 ? `+${formatCurrency(delta.annualizedImpact, language)}` : formatCurrency(delta.annualizedImpact, language)}
              </span>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>{isAr ? 'متغيرات المحاكاة والتحكم الذكي' : 'Simulation Controls & Parameters'}</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Ingredient Price Change */}
              <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    {isAr ? 'تغير أسعار شراء المواد الخام من الموردين' : 'Supplier Ingredient Price Delta'}
                  </span>
                  <span className="font-mono font-bold text-cyan-400" dir="ltr">
                    {simulationScenario.ingredientPriceDeltaPercent > 0
                      ? `+${simulationScenario.ingredientPriceDeltaPercent}%`
                      : `${simulationScenario.ingredientPriceDeltaPercent}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="30"
                  step="1"
                  value={simulationScenario.ingredientPriceDeltaPercent}
                  onChange={(e) =>
                    updateSimulationParam('ingredientPriceDeltaPercent', Number(e.target.value))
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono" dir="ltr">
                  <span>-20% (Volume Discount)</span>
                  <span>0%</span>
                  <span>+30% (Inflation Shock)</span>
                </div>
              </div>

              {/* 2. Selling Price Change */}
              <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    {isAr ? 'تعديل سعر بيع الصنف في القائمة' : 'Menu Selling Price Adjustment'}
                  </span>
                  <span className="font-mono font-bold text-cyan-400" dir="ltr">
                    {simulationScenario.sellingPriceDeltaPercent > 0
                      ? `+${simulationScenario.sellingPriceDeltaPercent}%`
                      : `${simulationScenario.sellingPriceDeltaPercent}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="25"
                  step="1"
                  value={simulationScenario.sellingPriceDeltaPercent}
                  onChange={(e) =>
                    updateSimulationParam('sellingPriceDeltaPercent', Number(e.target.value))
                  }
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono" dir="ltr">
                  <span>-15% (Promo)</span>
                  <span>0%</span>
                  <span>+25% (Price Realignment)</span>
                </div>
              </div>

              {/* 3. Waste Reduction */}
              <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    {isAr ? 'تقليل نسبة الهالك التشغيلي (Waste Reduction)' : 'Operational Waste Reduction'}
                  </span>
                  <span className="font-mono font-bold text-emerald-400" dir="ltr">
                    -{simulationScenario.wasteReductionPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={simulationScenario.wasteReductionPercent}
                  onChange={(e) =>
                    updateSimulationParam('wasteReductionPercent', Number(e.target.value))
                  }
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono" dir="ltr">
                  <span>0%</span>
                  <span>10% (SOP Portioning)</span>
                  <span>20% (Zero-Waste Goal)</span>
                </div>
              </div>

              {/* 4. Labor Wage Fluctuation */}
              <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">
                    {isAr ? 'تغير معدل أجور وساعات العمالة المباشرة' : 'Direct Kitchen Labor Wage Adjustment'}
                  </span>
                  <span className="font-mono font-bold text-purple-400" dir="ltr">
                    {simulationScenario.laborRateDeltaPercent > 0
                      ? `+${simulationScenario.laborRateDeltaPercent}%`
                      : `${simulationScenario.laborRateDeltaPercent}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="20"
                  step="1"
                  value={simulationScenario.laborRateDeltaPercent}
                  onChange={(e) =>
                    updateSimulationParam('laborRateDeltaPercent', Number(e.target.value))
                  }
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono" dir="ltr">
                  <span>-10%</span>
                  <span>0%</span>
                  <span>+20% (Overtime Peak)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              {isAr
                ? 'الحسابات مبنية على محرك تسعير قطاع الضيافة المعياري لـ Tygos بحجم مبيعات شهري مقدر بـ 1,850 وجبة.'
                : 'Calculations powered by deterministic Tygos Hospitality Cost Engine based on estimated 1,850 monthly portions.'}
            </span>
          </div>

          <button
            onClick={() => setIsSimulationModalOpen(false)}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق المحاكاة' : 'Close Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
};
