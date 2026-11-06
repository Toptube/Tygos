/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Button } from '../common/Button.tsx';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Package,
  AlertTriangle,
  ChefHat,
  ArrowUpRight,
  Sparkles,
  Sliders,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { MOCK_TABLES } from '../../data/mockData.ts';
import { ORDER_JOURNEY_STEPS, getScreenTitle, getScreenSubtitle } from '../../i18n/glossary.ts';
import { QrOperationsReport } from '../reports/QrOperationsReport.tsx';

export const TenantDashboard: React.FC = () => {
  const { currentUser, currentEstablishment, setActiveView } = useAuth();
  const { formatCurrency, formatNumber, language } = useI18n();
  const role = currentUser?.role || 'tenant_admin';
  const {
    recommendations,
    setIsAssistantOpen,
    setIsSimulationModalOpen,
    setIsAuditReportModalOpen,
    setIsHelpOpen,
  } = useBusiness();

  const isAr = language === 'ar';

  const openTablesCount = MOCK_TABLES.filter((t) => t.status === 'occupied').length;
  const waitingPaymentCount = MOCK_TABLES.filter((t) => t.status === 'waiting_payment').length;

  return (
    <div className="space-y-6 min-w-0 max-w-full" data-testid="tenant-dashboard">
      {/* 1. Title «نظرة على اليوم» + 1 short line */}
      <section className="space-y-1" data-testid="dashboard-section-header">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isAr ? 'نظرة على اليوم' : 'Today’s Overview'}
          </h2>
          <span
            className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            dir="ltr"
          >
            {currentEstablishment?.code || 'R.0001'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {isAr
            ? 'ملخص سريع لحركة مطعمك النهاردة'
            : 'Quick summary of your restaurant’s activity today'}
        </p>
      </section>

      {/* 2. «ماذا أفعل الآن؟» */}
      <section
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"
        data-testid="dashboard-section-actions"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{isAr ? 'ماذا أفعل الآن؟' : 'What Should I Do Now?'}</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? 'اختصارات سريعة لشغلك اليومي' : 'Quick shortcuts for daily work'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(role === 'cashier' ||
            role === 'waiter' ||
            role === 'tenant_admin' ||
            role === 'general_manager') && (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => setActiveView('pos')}
              className="justify-start text-start"
            >
              {getScreenTitle('pos', isAr)}
            </Button>
          )}
          {(role === 'cashier' ||
            role === 'waiter' ||
            role === 'tenant_admin' ||
            role === 'general_manager') && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActiveView('tables_management')}
              className="justify-start text-start"
            >
              {getScreenTitle('tables_management', isAr)}
            </Button>
          )}
          {(role === 'kitchen_manager' ||
            role === 'bar_manager' ||
            role === 'tenant_admin' ||
            role === 'general_manager' ||
            role === 'cashier') && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActiveView('kds')}
              className="justify-start text-start"
            >
              {getScreenTitle('kds', isAr)}
            </Button>
          )}
          {(role === 'tenant_admin' ||
            role === 'general_manager' ||
            role === 'financial_manager' ||
            role === 'cashier') && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActiveView('treasury')}
              className="justify-start text-start"
            >
              {getScreenTitle('treasury', isAr)}
            </Button>
          )}
          {(role === 'tenant_admin' ||
            role === 'general_manager' ||
            role === 'financial_manager') && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActiveView('order_trace')}
              className="justify-start text-start"
            >
              {getScreenTitle('order_trace', isAr)}
            </Button>
          )}
          {(role === 'cost_accountant' ||
            role === 'tenant_admin' ||
            role === 'general_manager') && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setActiveView('cost_control')}
              className="justify-start text-start"
            >
              {getScreenTitle('cost_control', isAr)}
            </Button>
          )}
        </div>
      </section>

      {/* 3. «رحلة الطلب من البيع للربح» (8 short Arabic steps, horizontal scroll on mobile, no truncation) */}
      <section
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
        data-testid="dashboard-section-journey"
      >
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {isAr ? 'رحلة الطلب من البيع للربح' : 'Order Journey from Sale to Profit'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAr
              ? 'اتبع الطلب خطوة بخطوة لحد ما يظهر في الأرباح'
              : 'Follow an order step by step until it appears in profit'}
          </p>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x">
          {ORDER_JOURNEY_STEPS.map((step) => (
            <div
              key={step.stepNumber}
              className="min-w-[124px] flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2.5 snap-start shrink-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-black flex items-center justify-center shrink-0">
                  {step.stepNumber}
                </span>
                <span className="text-xs font-black text-slate-900 dark:text-white whitespace-nowrap">
                  {isAr ? step.titleAr : step.titleEn}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  if (step.targetView === 'assistant') {
                    setIsAssistantOpen(true);
                  } else {
                    setActiveView(step.targetView);
                  }
                }}
                className="w-full justify-center"
              >
                {isAr ? 'افتح' : 'Open'}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. «أرقام اليوم» (KPI Cards) */}
      <section className="space-y-3" data-testid="dashboard-section-kpis">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {isAr ? 'أرقام اليوم' : 'Today’s Numbers'}
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? 'بيانات توضيحية' : 'Illustrative data'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'مبيعات اليوم' : 'Today’s Sales'}</span>
              <DollarSign className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="text-lg sm:text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
              {formatCurrency(4680.5)}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {isAr ? '+14.2% مقارنة بأمس' : '+14.2% vs yesterday'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'عدد الطلبات' : 'Orders'}</span>
              <ShoppingBag className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-lg sm:text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
              {formatNumber(128)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {isAr
                ? `${formatNumber(openTablesCount)} طاولات مشغولة · ${formatNumber(waitingPaymentCount)} بانتظار الدفع`
                : `${formatNumber(openTablesCount)} occupied · ${formatNumber(waitingPaymentCount)} waiting payment`}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'متوسط الفاتورة' : 'Avg Ticket'}</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
              {formatCurrency(36.56)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {isAr ? `الضيوف: ${formatNumber(194)} ضيف` : `Guests: ${formatNumber(194)}`}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'الخزينة والبنك' : 'Cash & Bank'}</span>
              <Wallet className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-lg sm:text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
              {formatCurrency(24850.0)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {isAr ? 'خزائن مطابقة' : 'Reconciled Registers'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'قيمة المخزون' : 'Inventory Value'}</span>
              <Package className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
              {formatCurrency(41230.0)}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {isAr ? `في ${formatNumber(3)} مخازن` : `Across ${formatNumber(3)} Warehouses`}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'التكلفة الأساسية' : 'Prime Cost'}</span>
              <ChefHat className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-black mt-2 font-mono text-rose-600 dark:text-rose-400" dir="ltr">
              58.4%
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {isAr ? 'خامات 31.4% + عمالة 27.0%' : 'Food 31.4% + Labor 27.0%'}
            </span>
          </div>
        </div>
      </section>

      {/* 5. التنبيهات (Alerts) */}
      <section
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3"
        data-testid="dashboard-section-alerts"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>{isAr ? 'التنبيهات' : 'Alerts'}</span>
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {formatNumber(recommendations.length)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-2.5"
            >
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  {isAr ? rec.titleAr : rec.titleEn}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isAr ? rec.issueDescriptionAr : rec.issueDescriptionEn}
                </p>
              </div>
              {rec.actionRoute && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setActiveView(rec.actionRoute!)}
                  className="self-start text-cyan-600 dark:text-cyan-400 font-bold"
                >
                  {isAr ? 'افتح' : 'Open'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Channel & Station Operations Report */}
      <QrOperationsReport />

      {/* 6. Small text links for «حاسبة التجربة» و«سجل العمليات» و«مساعدة» */}
      <section
        className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs"
        data-testid="dashboard-section-links"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsSimulationModalOpen(true)}
          className="text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 underline-offset-4 hover:underline"
          title={getScreenSubtitle('what_if', isAr)}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{getScreenTitle('what_if', isAr)}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsAuditReportModalOpen(true)}
          className="text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 underline-offset-4 hover:underline"
          title={getScreenSubtitle('audit_log', isAr)}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{getScreenTitle('audit_log', isAr)}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsHelpOpen(true)}
          className="text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 underline-offset-4 hover:underline"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{isAr ? 'مساعدة' : 'Help'}</span>
        </Button>
      </section>
    </div>
  );
};
