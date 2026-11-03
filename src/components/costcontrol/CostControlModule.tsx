/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Scale,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Calendar,
  Filter,
  DollarSign,
  PieChart,
  Sliders,
  Sparkles,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { MOCK_COST_KPIS } from '../../data/mockData.ts';
import { TheoreticalVsActualVariance } from '../../domain/types.ts';

export const CostControlModule: React.FC = () => {
  const { t, formatCurrency, formatNumber, language } = useI18n();
  const {
    consumptionVariances,
    setIsSimulationModalOpen,
    setIsAssistantOpen,
    sendAssistantQuery,
  } = useBusiness();
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('All');
  const [selectedVariance, setSelectedVariance] = useState<TheoreticalVsActualVariance | null>(
    consumptionVariances[0] || null
  );

  const isAr = language === 'ar';

  const costCenters = [
    { name: t('common.all'), code: 'ALL' },
    { name: 'Kitchen Hot Line', code: 'CC-01' },
    { name: 'Butchery & Meat Prep', code: 'CC-02' },
    { name: 'Lounge Bar & Mixology', code: 'CC-03' },
    { name: 'Artisan Bakehouse & Pastry', code: 'CC-04' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('cost.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('cost.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulationModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sliders className="w-4 h-4" />
            <span>{isAr ? 'محاكاة التكلفة (What-If)' : 'Cost Simulation'}</span>
          </button>
          <button
            onClick={() => {
              setIsAssistantOpen(true);
              sendAssistantQuery(isAr ? 'ليه الـ Food Cost زاد؟' : 'Why did food cost increase?');
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>{isAr ? 'تحليل الذكاء التشغيلي' : 'AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_COST_KPIS.map((kpi, idx) => (
          <div
            key={idx}
            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">{kpi.title}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  kpi.status === 'normal'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                }`}
              >
                {kpi.status}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {kpi.currentPercent}%
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Target: {kpi.targetPercent}%
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>MTD:</span>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300" dir="ltr">
                {formatCurrency(kpi.monthlyAmount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Theoretical vs Actual Consumption Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('cost.theoreticalVsActual')}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'مقارنة استهلاك المبيعات النظري (الوصفات) بالصرف الفعلي من المستودع وتشخيص أسباب الانحراف.'
                : 'Comparing theoretical POS sales recipe consumption with actual warehouse stock issues.'}
            </p>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {costCenters.map((cc) => (
              <button
                key={cc.code}
                onClick={() => setSelectedCostCenter(cc.code)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCostCenter === cc.code
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
              >
                {cc.name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t('menu.ingredient')}</th>
                <th className="py-3 px-3 text-start">{t('common.unit')}</th>
                <th className="py-3 px-3 text-end">{t('cost.theoretical')}</th>
                <th className="py-3 px-3 text-end">{t('cost.actual')}</th>
                <th className="py-3 px-3 text-end">{t('cost.varianceQty')}</th>
                <th className="py-3 px-3 text-end">{t('cost.varianceValue')}</th>
                <th className="py-3 px-3 text-end">{t('cost.waste')}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'التشخيص والتوصية' : 'Diagnosis'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {consumptionVariances.map((v) => {
                const isSelected = selectedVariance?.ingredientId === v.ingredientId;
                return (
                  <tr
                    key={v.ingredientId}
                    onClick={() => setSelectedVariance(v)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-50/70 dark:bg-cyan-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200 text-start">
                      {isAr ? v.ingredientNameAr : v.ingredientNameEn}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-start">
                      {v.unit}
                    </td>
                    <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                      {v.theoreticalConsumption}
                    </td>
                    <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                      {v.actualConsumption}
                    </td>
                    <td className="py-3 px-3 text-end font-mono font-bold text-amber-500" dir="ltr">
                      +{v.varianceQuantity.toFixed(1)}
                    </td>
                    <td className="py-3 px-3 text-end font-mono font-bold text-rose-500" dir="ltr">
                      {formatCurrency(v.varianceCostValue)}
                    </td>
                    <td className="py-3 px-3 text-end font-mono text-slate-500" dir="ltr">
                      {v.recordedWasteQuantity} {v.unit}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30">
                        {v.potentialCauses[0]?.cause.replace('_', ' ') || 'Variance'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Variance Root Cause Deep Dive Card */}
        {selectedVariance && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-slate-900 dark:text-white">
                  {isAr ? 'تحليل الأسباب المحتملة للانحراف:' : 'Variance Potential Root Causes:'}{' '}
                  {isAr ? selectedVariance.ingredientNameAr : selectedVariance.ingredientNameEn}
                </span>
              </div>
              <span className="font-mono text-rose-500 font-bold" dir="ltr">
                Impact: {formatCurrency(selectedVariance.varianceCostValue)} (+{selectedVariance.variancePercentage.toFixed(1)}%)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedVariance.potentialCauses.map((pc, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800/80 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase font-mono text-[10px]">
                      {pc.cause.replace('_', ' ')}
                    </span>
                    <span className="font-mono font-bold text-cyan-500 text-[11px]" dir="ltr">
                      {pc.probabilityScore}% Probability
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {isAr ? pc.evidenceNotesAr : pc.evidenceNotesEn}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl border border-cyan-200 dark:border-cyan-500/30 text-slate-700 dark:text-cyan-300 text-[11px] flex items-center justify-between">
              <span>
                <strong>{isAr ? 'الإجراء الرقابي الموصى به:' : 'Recommended Action:'}</strong>{' '}
                {isAr ? selectedVariance.recommendedAuditActionAr : selectedVariance.recommendedAuditActionEn}
              </span>
              <button
                onClick={() => {
                  setIsAssistantOpen(true);
                  sendAssistantQuery(
                    isAr
                      ? `ما هو سبب انحراف استهلاك ${selectedVariance.ingredientNameAr}؟`
                      : `Why is there variance in ${selectedVariance.ingredientNameEn}?`
                  );
                }}
                className="px-2.5 py-1 rounded-md bg-cyan-600 text-white font-bold text-[10px] cursor-pointer hover:bg-cyan-500 shrink-0 ms-2"
              >
                {isAr ? 'اسأل TYGOS' : 'Ask TYGOS'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
