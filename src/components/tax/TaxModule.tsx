/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Receipt,
  FileCheck2,
  Sliders,
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { MOCK_TAX_RECORDS } from '../../data/mockData.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const TaxModule: React.FC = () => {
  const { t, formatCurrency, formatNumber } = useI18n();
  const [activeTab, setActiveTab] = useState<'vat' | 'edocs' | 'settings'>('vat');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('tax.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('tax.subtitle')}
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
          <button
            onClick={() => setActiveTab('vat')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'vat'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('tax.title')}
          </button>
          <button
            onClick={() => setActiveTab('edocs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'edocs'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('tax.edocs')}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('tax.settings')}
          </button>
        </div>
      </div>

      {activeTab === 'vat' && (
        <div className="space-y-6">
          {/* Active Period Netting Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                {t('tax.outputVat')}
              </span>
              <div className="text-2xl font-black mt-2 font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                {formatCurrency(2651.6)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">From gross sales MTD</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                {t('tax.inputVat')}
              </span>
              <div className="text-2xl font-black mt-2 font-mono text-emerald-500" dir="ltr">
                {formatCurrency(1148.0)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Verified supplier invoices</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-medium block">
                {t('tax.netPayable')}
              </span>
              <div className="text-2xl font-black mt-2 font-mono text-amber-500" dir="ltr">
                {formatCurrency(1503.6)}
              </div>
              <span className="text-[11px] text-amber-500 font-semibold mt-1 block" dir="ltr">Due Nov 30, 2026</span>
            </div>
          </div>

          {/* Tax Periods Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('tax.title')}
              </h3>
              <span className="text-xs text-slate-500">Tygos Multi-Jurisdiction Engine</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{t('common.date')}</th>
                    <th className="py-3 px-3 text-end">{t('dashboard.todaysSales')}</th>
                    <th className="py-3 px-3 text-end">{t('tax.outputVat')}</th>
                    <th className="py-3 px-3 text-end">{t('navigation.purchasing')}</th>
                    <th className="py-3 px-3 text-end">{t('tax.inputVat')}</th>
                    <th className="py-3 px-3 text-end">{t('tax.netPayable')}</th>
                    <th className="py-3 px-4 text-center">{t('common.status')}</th>
                    <th className="py-3 px-4 text-start">{t('tax.edocs')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {MOCK_TAX_RECORDS.map((rec, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white text-start">
                        {rec.period}
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                        {formatCurrency(rec.totalSales)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-cyan-600 dark:text-cyan-400 font-semibold" dir="ltr">
                        {formatCurrency(rec.outputVat)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                        {formatCurrency(rec.totalPurchases)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono text-emerald-500 font-semibold" dir="ltr">
                        {formatCurrency(rec.inputVat)}
                      </td>
                      <td className="py-3 px-3 text-end font-mono font-black text-amber-500" dir="ltr">
                        {formatCurrency(rec.taxPayable)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rec.status === 'submitted'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : rec.status === 'reconciled'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 text-start" dir="ltr">
                        {rec.eDocReference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'edocs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs text-xs space-y-4">
          <div className="flex items-center gap-2 text-cyan-500 dark:text-cyan-400 font-bold text-sm">
            <FileCode className="w-5 h-5" />
            <span>{t('tax.edocs')}</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            {t('tax.subtitle')}
          </p>
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span>HSM Cryptographic Key Status:</span>
              <span className="text-emerald-500 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready & Active
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
              <span>Signed Invoices Dispatched This Month:</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">1,492 documents</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs text-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Sliders className="w-4 h-4 text-cyan-500" />
            <span>{t('tax.settings')}</span>
          </div>
          <p className="text-slate-500">
            Configurable tax bracket parameters:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Standard Rate</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono" dir="ltr">14.0%</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tourism Fee</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono" dir="ltr">1.0%</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Service Charge</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white font-mono" dir="ltr">12.0%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
