/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Building,
  Package,
  AlertTriangle,
  Users,
  ChefHat,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  Sliders,
  Shield,
  FileText,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { MOCK_COST_KPIS, MOCK_TABLES } from '../../data/mockData.ts';

const TYGOS_MARK_SRC = '/assets/aistudio/1793697201912_bf1cbdeb.png';

export const TenantDashboard: React.FC = () => {
  const { currentEstablishment, setActiveView } = useAuth();
  const { t, formatCurrency, formatNumber, isRtl, language } = useI18n();
  const {
    profitAnalysis,
    recommendations,
    setIsAssistantOpen,
    setIsSimulationModalOpen,
    setIsAuditReportModalOpen,
    setIsHelpOpen,
  } = useBusiness();
  const [selectedTraceStep, setSelectedTraceStep] = useState<number>(0);

  const isAr = language === 'ar';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const openTablesCount = MOCK_TABLES.filter((t) => t.status === 'occupied').length;
  const waitingPaymentCount = MOCK_TABLES.filter((t) => t.status === 'waiting_payment').length;

  // Complete 8-node interconnected business pipeline
  const traceSteps = [
    {
      title: isAr ? '1. نقطة البيع (POS)' : '1. POS Sale',
      detail: 'Tygos Prime Truffle Ribeye ($44.50) · Table T01',
      targetView: 'pos',
      tag: 'Front of House',
    },
    {
      title: isAr ? '2. الوصفة المعيارية (BOM)' : '2. Recipe BOM',
      detail: '0.32kg Angus Ribeye + 0.035kg Truffle Butter + Prep Packaging',
      targetView: 'menu',
      tag: 'Recipe Engine',
    },
    {
      title: isAr ? '3. حركة المخزون' : '3. Stock Depletion',
      detail: '0.32kg automatically deducted from WH-02 Cold Storage',
      targetView: 'inventory',
      tag: 'Warehouse',
    },
    {
      title: isAr ? '4. إعادة الطلب والتوريد' : '4. Purchasing PO',
      detail: 'PO-2026-081 auto-matched against Apex Premium Meats catalog',
      targetView: 'purchasing',
      tag: 'Supply Chain',
    },
    {
      title: isAr ? '5. التكلفة الحقيقية' : '5. True Product Cost',
      detail: 'Ingredients ($10.88) + Labor ($3.75) + Utilities/Water ($0.84) = $17.10',
      targetView: 'cost_control',
      tag: 'Cost Engine',
    },
    {
      title: isAr ? '6. قيود اليومية الآلية' : '6. General Ledger',
      detail: 'Debit COGS $17.10, Credit Inventory $10.88, Credit Utilities $0.84',
      targetView: 'finance',
      tag: 'Accounting',
    },
    {
      title: isAr ? '7. الربحية الصافية' : '7. Net Profitability',
      detail: 'Gross contribution $27.40 (61.6% margin) streams to Executive P&L',
      targetView: 'finance',
      tag: 'Executive P&L',
    },
    {
      title: isAr ? '8. ذكاء TYGOS والتوصيات' : '8. Management AI',
      detail: 'Engine flags +14.2% beef cost drift and suggests menu price realignment',
      targetView: 'cost_control',
      tag: 'Tygos AI',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Establishment Identity & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('dashboard.title')}
            </h1>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20" dir="ltr">
              {currentEstablishment?.code || 'R.0001'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('dashboard.subtitle')} · {currentEstablishment?.name} ({currentEstablishment?.city}, {currentEstablishment?.country})
          </p>
        </div>

        {/* Phase 3 Action Center Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tygos AI Assistant Quick Launch */}
          <button
            onClick={() => setIsAssistantOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-cyan-950/40 cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <div className="w-5 h-5 rounded-md bg-slate-950/40 p-0.5 flex items-center justify-center">
              <img src={TYGOS_MARK_SRC} alt="Tygos Mark" className="w-full h-full object-contain" />
            </div>
            <span>{isAr ? 'مساعد TYGOS الذكي' : 'Ask TYGOS AI'}</span>
          </button>

          {/* What-If Cost Simulation */}
          <button
            onClick={() => setIsSimulationModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Sliders className="w-4 h-4 text-cyan-500" />
            <span>{isAr ? 'محاكاة التكلفة (What-If)' : 'What-If Simulation'}</span>
          </button>

          {/* Security Audit Trail & Report */}
          <button
            onClick={() => setIsAuditReportModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Shield className="w-4 h-4 text-purple-400" />
            <span>{isAr ? 'سجل التدقيق الأمني' : 'Audit Trail'}</span>
          </button>

          {/* Help Center */}
          <button
            onClick={() => setIsHelpOpen(true)}
            title={isAr ? 'دليل التشغيل والمعرفة' : 'SOP Knowledge Center'}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-white border border-slate-300 dark:border-slate-700 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('dashboard.todaysSales')}</span>
            <DollarSign className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
            {formatCurrency(4680.5)}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% vs yesterday
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('dashboard.orders')}</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
            {formatNumber(128)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {openTablesCount} {t('dashboard.occupied')} · {waitingPaymentCount} {t('dashboard.waitingPayment')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('dashboard.avgTicket')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
            {formatCurrency(36.56)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Covers: {formatNumber(194)} Guests
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('dashboard.cashAndBank')}</span>
            <Wallet className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
            {formatCurrency(24850.0)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Reconciled Registers
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('dashboard.inventoryValue')}</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
            {formatCurrency(41230.0)}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Across 3 Warehouses
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('dashboard.primeCost')}</span>
            <ChefHat className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black mt-2 font-mono text-rose-600 dark:text-rose-400" dir="ltr">
            58.4%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Food 31.4% + Labor 27.0%
          </span>
        </div>
      </div>

      {/* "Why Did Profit Increase or Decrease?" Decomposition Cockpit */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isAr ? 'تحليل مسببات الأرباح وتفكيك الانحراف (لماذا تغير صافي الربح؟)' : 'Profit Variance Decomposition (Why Did Profit Change?)'}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono">
                November 2026 vs October 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr ? profitAnalysis.managementConclusionAr : profitAnalysis.managementConclusionEn}
            </p>
          </div>

          <button
            onClick={() => setIsSimulationModalOpen(true)}
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{isAr ? 'اختبار سيناريو التصحيح' : 'Simulate Corrective Scenario'}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4 Factor Contribution Drivers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {profitAnalysis.primaryDrivers.map((driver) => (
            <div
              key={driver.factorId}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {isAr ? driver.nameAr : driver.nameEn}
                </span>
                <span
                  className={`font-mono font-bold text-xs ${
                    driver.direction === 'positive' ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                  dir="ltr"
                >
                  {driver.impactAmount >= 0 ? `+${formatCurrency(driver.impactAmount)}` : formatCurrency(driver.impactAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isAr ? driver.descriptionAr : driver.descriptionEn}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Recommendations Center */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'محرك التوصيات الإدارية الذكية (Evidence-Based Recommendations)' : 'Management Actionable Recommendations'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {recommendations.length} {isAr ? 'توصيات معتمدة' : 'Active Recommendations'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                      rec.priority === 'high'
                        ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    }`}
                  >
                    {rec.priority} Priority · {rec.confidenceScore}% Confidence
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">{rec.module}</span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {isAr ? rec.titleAr : rec.titleEn}
                </h4>

                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {isAr ? rec.issueDescriptionAr : rec.issueDescriptionEn}
                </p>

                <div className="mt-2.5 p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div>
                    <strong>{isAr ? 'الدليل القياسي:' : 'Evidence:'}</strong> {isAr ? rec.measurableEvidenceAr : rec.measurableEvidenceEn}
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                    <strong>{isAr ? 'الأثر المتوقع:' : 'Impact:'}</strong> {isAr ? rec.expectedFinancialImpactAr : rec.expectedFinancialImpactEn}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {isAr ? rec.recommendedActionAr : rec.recommendedActionEn}
                </span>
                {rec.actionRoute && (
                  <button
                    onClick={() => setActiveView(rec.actionRoute!)}
                    className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 cursor-pointer shrink-0"
                    title={isAr ? 'فتح الشاشة' : 'Navigate'}
                  >
                    <ArrowIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Business Relationship Traceability Pipeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('dashboard.traceabilityTitle')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr
                ? 'مسار التدفق المترابط: من أمر البيع ونقطة الكاشير إلى المكون والمخزون والتكلفة ودفتر الأستاذ والربحية.'
                : 'Traceable Lifecycle: Sales -> Recipe -> Inventory -> Purchasing -> True Cost -> Accounting -> Profit -> AI.'}
            </p>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-mono rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            {isAr ? 'نظام بيئي مترابط بالكامل' : '100% Interconnected Ecosystem'}
          </span>
        </div>

        {/* Step Progression Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4">
          {traceSteps.map((step, idx) => {
            const isSelected = selectedTraceStep === idx;
            return (
              <div
                key={idx}
                onClick={() => setSelectedTraceStep(idx)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-500 text-slate-900 dark:text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block mb-0.5">
                  {step.tag}
                </span>
                <span className="text-xs font-bold block truncate">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Selected Step Deep Dive Card */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {traceSteps[selectedTraceStep].title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                Verified Trace
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {traceSteps[selectedTraceStep].detail}
            </p>
          </div>

          <button
            onClick={() => setActiveView(traceSteps[selectedTraceStep].targetView)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <span>{isAr ? 'فتح الشاشة المرتبطة' : 'Inspect Module'}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
