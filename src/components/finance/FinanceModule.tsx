/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  DollarSign,
  BookOpen,
  FileText,
  CreditCard,
  Building,
  ArrowRight,
  TrendingUp,
  Receipt,
  Scale,
  Plus,
} from 'lucide-react';
import { MOCK_ACCOUNTS, MOCK_JOURNAL_ENTRIES } from '../../data/mockData.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const FinanceModule: React.FC = () => {
  const { t, formatCurrency, formatNumber } = useI18n();
  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'trial_balance'>('accounts');

  const totalAssets = MOCK_ACCOUNTS.filter((a) => a.type === 'Asset').reduce(
    (sum, a) => sum + a.balance,
    0
  );
  const totalLiabilities = MOCK_ACCOUNTS.filter((a) => a.type === 'Liability').reduce(
    (sum, a) => sum + a.balance,
    0
  );
  const totalRevenue = MOCK_ACCOUNTS.filter((a) => a.type === 'Revenue').reduce(
    (sum, a) => sum + a.balance,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('finance.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('finance.subtitle')}
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('finance.chartOfAccounts')}
          </button>
          <button
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('finance.journalEntries')}
          </button>
          <button
            onClick={() => setActiveTab('trial_balance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'trial_balance'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('finance.trialBalance')}
          </button>
        </div>
      </div>

      {/* Financial Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Operating Asset Pool</span>
            <Building className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
            {formatCurrency(totalAssets)}
          </div>
          <span className="text-[11px] text-slate-400">Cash, Banks & Raw Inventory</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Current Payables</span>
            <Receipt className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-amber-500" dir="ltr">
            {formatCurrency(totalLiabilities)}
          </div>
          <span className="text-[11px] text-slate-400">Trade Suppliers & Output VAT</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Recorded Revenue (MTD)</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-emerald-500" dir="ltr">
            {formatCurrency(totalRevenue)}
          </div>
          <span className="text-[11px] text-emerald-500">POS Food & Beverage Sales</span>
        </div>
      </div>

      {activeTab === 'accounts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('finance.chartOfAccounts')}
            </h3>
            <span className="text-xs text-slate-500">{MOCK_ACCOUNTS.length} ledger codes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">{t('finance.accountCode')}</th>
                  <th className="py-3 px-4 text-start">{t('finance.accountTitle')}</th>
                  <th className="py-3 px-4 text-start">{t('finance.classification')}</th>
                  <th className="py-3 px-4 text-end">{t('finance.balance')}</th>
                  <th className="py-3 px-4 text-start">Currency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {MOCK_ACCOUNTS.map((acc) => (
                  <tr key={acc.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 text-start" dir="ltr">
                      {acc.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 text-start">
                      {acc.name}
                    </td>
                    <td className="py-3 px-4 text-start">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatCurrency(acc.balance)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-start">
                      {acc.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('finance.journalEntries')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t('dashboard.traceabilityTitle')}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">Entry #</th>
                  <th className="py-3 px-3 text-start">{t('common.date')}</th>
                  <th className="py-3 px-4 text-start">{t('common.details')}</th>
                  <th className="py-3 px-3 text-start">Source</th>
                  <th className="py-3 px-4 text-start">{t('finance.debit')}</th>
                  <th className="py-3 px-4 text-start">{t('finance.credit')}</th>
                  <th className="py-3 px-4 text-end">{t('common.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {MOCK_JOURNAL_ENTRIES.map((je) => (
                  <tr key={je.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 text-start" dir="ltr">
                      {je.entryNumber}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 text-start" dir="ltr">
                      {je.date}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 text-start">
                      {je.description}
                    </td>
                    <td className="py-3 px-3 text-start">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        {je.sourceModule}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-medium text-start">
                      + {je.debitAccount}
                    </td>
                    <td className="py-3 px-4 text-amber-600 dark:text-amber-400 font-medium text-start">
                      - {je.creditAccount}
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatCurrency(je.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'trial_balance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs text-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('finance.trialBalance')}
          </h3>
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl font-mono text-sm">
            <div>
              <span className="text-slate-500 block text-xs">{t('finance.debit')}</span>
              <span className="font-bold text-emerald-500" dir="ltr">{formatCurrency(326980)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-xs">{t('finance.credit')}</span>
              <span className="font-bold text-emerald-500" dir="ltr">{formatCurrency(326980)}</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg">
            ✓ General Ledger is fully balanced across all POS, Inventory, and Payroll dimensions.
          </div>
        </div>
      )}
    </div>
  );
};
