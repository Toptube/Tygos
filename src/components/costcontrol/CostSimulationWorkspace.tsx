/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Button } from '../common/Button.tsx';
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
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { formatCurrency } from '../../i18n/formatters.ts';
import {
  overheadService,
  getCurrentMonthKey,
  OVERHEAD_MODE_LABELS_AR,
  STAGE2_RULE_LABELS_AR,
  OverheadMode,
  Stage2AllocationRule,
} from '../../services/overheadService.ts';

export const CostSimulationWorkspace: React.FC = () => {
  const {
    isSimulationModalOpen,
    setIsSimulationModalOpen,
    simulationScenario,
    simulationResult,
    updateSimulationParam,
    resetSimulation,
  } = useBusiness();
  const { currentEstablishment } = useAuth();
  const { language } = useI18n();
  const estId = currentEstablishment?.id || 'default';

  const [simOverheadMode, setSimOverheadMode] = React.useState<OverheadMode>('rules_based');
  const [simStage2Rule, setSimStage2Rule] = React.useState<Stage2AllocationRule | 'current'>('prep_time_minutes');
  const [simFixedPct, setSimFixedPct] = React.useState<number>(15);

  if (!isSimulationModalOpen) return null;

  const isAr = language === 'ar';
  const { baseline, simulated, delta } = simulationResult;
  const currentMonth = getCurrentMonthKey();

  const currentOverheadCalc = overheadService.calculateFullProductCosting(estId, currentMonth);
  const simOverheadCalc = overheadService.calculateFullProductCosting(estId, currentMonth, undefined, {
    modeOverride: simOverheadMode,
    fixedPctOverride: simFixedPct,
    stage2RuleOverride: simStage2Rule === 'current' ? undefined : simStage2Rule,
  });

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
                  {isAr ? 'حاسبة التجربة وتحليل السيناريوهات' : 'Experiment & Scenario Cost Calculator'}
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
            <Button
              onClick={resetSimulation}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title={isAr ? 'إعادة ضبط' : 'Reset'}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'إعادة ضبط' : 'Reset'}</span>
            </Button>
            <Button
              onClick={() => setIsSimulationModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
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

          {/* What-If Overhead Allocation Rule Simulator (Package 5) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span>لو غيّرت قاعدة توزيع المصاريف، إيه اللي هيحصل لتكلفة المنتجات؟</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  معاينة افتراضية فورية لنتائج التكلفة الكاملة دون تعديل القواعد الفعلية المحفوظة.
                </p>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-bold">
                الحالي: {OVERHEAD_MODE_LABELS_AR[currentOverheadCalc.mode]}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">وضع التحميل الافتراضي:</label>
                <select
                  value={simOverheadMode}
                  onChange={(e) => setSimOverheadMode(e.target.value as OverheadMode)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                >
                  {(Object.keys(OVERHEAD_MODE_LABELS_AR) as OverheadMode[]).map((m) => (
                    <option key={m} value={m}>
                      {OVERHEAD_MODE_LABELS_AR[m]}
                    </option>
                  ))}
                </select>
              </div>

              {simOverheadMode === 'rules_based' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">قاعدة التوزيع على المنتجات:</label>
                  <select
                    value={simStage2Rule}
                    onChange={(e) => setSimStage2Rule(e.target.value as Stage2AllocationRule | 'current')}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                  >
                    <option value="current">الإبقاء على القاعدة المسجلة لكل مصروف</option>
                    {(Object.keys(STAGE2_RULE_LABELS_AR) as Stage2AllocationRule[]).map((r) => (
                      <option key={r} value={r}>
                        {STAGE2_RULE_LABELS_AR[r]}
                      </option>
                    ))}
                  </select>
                </div>
              ) : simOverheadMode === 'raw_plus_fixed_pct' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">النسبة الثابتة على الخامات (%):</label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={simFixedPct}
                    onChange={(e) => setSimFixedPct(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono font-bold"
                  />
                </div>
              ) : (
                <div className="flex items-end text-[11px] text-amber-300 pb-2">
                  في وضع «خامات فقط» تصبح المصاريف المحمّلة على كل صنف = 0 ج.م
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">المنتجات الخاسرة بعد التحميل:</span>
                <strong className="font-mono text-sm text-rose-400">
                  {simOverheadCalc.lossMakingProducts.length} منتج
                </strong>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3 text-start">المنتج</th>
                    <th className="py-2 px-3 text-end">سعر البيع</th>
                    <th className="py-2 px-3 text-end">التكلفة الكاملة الحالية</th>
                    <th className="py-2 px-3 text-end">التكلفة بالقاعدة المقترحة</th>
                    <th className="py-2 px-3 text-end">الفرق</th>
                    <th className="py-2 px-3 text-end">الربح الصافي بعد التغيير</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {simOverheadCalc.products.slice(0, 8).map((simP) => {
                    const baseP = currentOverheadCalc.products.find((b) => b.productId === simP.productId);
                    const diff = Math.round((simP.fullCost - (baseP?.fullCost || 0)) * 100) / 100;
                    return (
                      <tr key={simP.productId} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-bold text-white">{simP.productNameAr}</td>
                        <td className="py-2 px-3 text-end font-mono text-slate-300">{simP.sellingPrice} ج.م</td>
                        <td className="py-2 px-3 text-end font-mono text-slate-400">{baseP?.fullCost ?? simP.fullCost} ج.م</td>
                        <td className="py-2 px-3 text-end font-mono font-bold text-cyan-300">{simP.fullCost} ج.م</td>
                        <td className={`py-2 px-3 text-end font-mono font-bold ${diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {diff > 0 ? `+${diff}` : diff} ج.م
                        </td>
                        <td className={`py-2 px-3 text-end font-mono font-bold ${simP.fullProfit < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {simP.fullProfit} ج.م ({simP.fullMarginPercent}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

          <Button
            onClick={() => setIsSimulationModalOpen(false)}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق المحاكاة' : 'Close Workspace'}
          </Button>
        </div>
      </div>
    </div>
  );
};
