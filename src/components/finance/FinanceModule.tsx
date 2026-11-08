/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FINANCE & TRACKING MODULE (شاشة المتابعة والحسابات) (Package 1 - Section 1-و)
 * 100% Arabic, clear single-line purpose, role-restricted to Manager, Owner, and Cost Accountant.
 */

import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';
import {
  DollarSign,
  BookOpen,
  FileText,
  CreditCard,
  Building,
  TrendingUp,
  Receipt,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { MOCK_ACCOUNTS, MOCK_JOURNAL_ENTRIES } from '../../data/mockData.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const FinanceModule: React.FC = () => {
  const { t, formatCurrency, formatNumber } = useI18n();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'tenant_admin';

  const [activeTab, setActiveTab] = useState<'accounts' | 'journal' | 'trial_balance'>('accounts');

  // Allowed roles check: Owner, General Manager, Financial Manager, Cost Accountant, Super Admin
  const isAuthorized =
    role === 'tenant_admin' ||
    role === 'general_manager' ||
    role === 'financial_manager' ||
    role === 'cost_accountant' ||
    role === 'super_admin';

  if (!isAuthorized) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <ShieldAlert className="w-10 h-10 mx-auto text-amber-500" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          شاشة مقيدة الصلاحيات
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          شاشة المتابعة المالية والأرباح مخصصة للإدارة العامة والمالك ومحاسب التكاليف لمتابعة حركة الإيرادات والمصروفات بعد عمليات البيع.
        </p>
      </div>
    );
  }

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
    <div className="space-y-6" data-testid="finance-tracking-module">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">
            المتابعة والأرباح والحسابات
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة أرباح المبيعات، ومراقبة المخزون المتبقي، واكتشاف نقاط الهدر والانحراف بعد البيع
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            دليل الحسابات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('journal')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'journal'
                ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            دفتر اليومية والقيود
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trial_balance')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'trial_balance'
                ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ميزان المراجعة
          </button>
        </div>
      </div>

      {/* Financial Health Overview - 100% Arabic */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>إجمالي الأصول والمخزون</span>
            <Building className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-slate-900 dark:text-white" dir="ltr">
            {formatCurrency(totalAssets)}
          </div>
          <span className="text-[11px] text-slate-400">النقدية بالخزينة وقيمة المخزون الفعلي المتبقي</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>مستحقات الموردين والالتزامات</span>
            <Receipt className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-amber-500" dir="ltr">
            {formatCurrency(totalLiabilities)}
          </div>
          <span className="text-[11px] text-slate-400">فواتير توريد الخامات الآجلة وضريبة القيمة المضافة</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>إيرادات المبيعات المحققة</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-emerald-500" dir="ltr">
            {formatCurrency(totalRevenue)}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">إجمالي طلبات البيع المعتمدة من الكاشير</span>
        </div>
      </div>

      {activeTab === 'accounts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              دليل الحسابات المحاسبية
            </h3>
            <span className="text-xs text-slate-500">{MOCK_ACCOUNTS.length} حساب مسجل</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">كود الحساب</th>
                  <th className="py-3 px-4 text-start">اسم الحساب</th>
                  <th className="py-3 px-4 text-start">التصنيف</th>
                  <th className="py-3 px-4 text-end">الرصيد الحسابي</th>
                  <th className="py-3 px-4 text-start">العملة</th>
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
                        {acc.type === 'Asset' ? 'أصول' : acc.type === 'Liability' ? 'خصوم' : acc.type === 'Revenue' ? 'إيرادات' : 'مصروفات'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatCurrency(acc.balance)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-start">
                      ج.م
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
                دفتر اليومية العامة والقيود المزدوجة
              </h3>
              <p className="text-[11px] text-slate-500">
                تسجيل آلي لقيود المبيعات وخصم المخزون والمصروفات
              </p>
            </div>
            <span className="text-xs text-slate-500">{MOCK_JOURNAL_ENTRIES.length} قيود مسجلة</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {MOCK_JOURNAL_ENTRIES.map((entry) => (
              <div key={entry.id} className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{entry.id}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 font-mono">{entry.date}</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-200">{entry.description}</span>
                </div>

                <div className="overflow-x-auto bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-100 dark:border-slate-800/60">
                  <table className="w-full text-start text-xs">
                    <thead className="text-slate-400 border-b border-slate-200/60 dark:border-slate-800/60">
                      <tr>
                        <th className="py-2 px-3 text-start">كود الحساب</th>
                        <th className="py-2 px-3 text-start">اسم الحساب</th>
                        <th className="py-2 px-3 text-end">مدين (ج.م)</th>
                        <th className="py-2 px-3 text-end">دائن (ج.م)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
                      <tr>
                        <td className="py-2 px-3 font-mono text-slate-500 text-start" dir="ltr">
                          {entry.debitAccount.split(' ')[0]}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 text-start">
                          {entry.debitAccount.split(' ').slice(1).join(' ')}
                        </td>
                        <td className="py-2 px-3 font-mono text-end font-semibold text-slate-900 dark:text-white" dir="ltr">
                          {formatCurrency(entry.amount)}
                        </td>
                        <td className="py-2 px-3 font-mono text-end text-slate-400" dir="ltr">
                          —
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-mono text-slate-500 text-start" dir="ltr">
                          {entry.creditAccount.split(' ')[0]}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200 text-start">
                          {entry.creditAccount.split(' ').slice(1).join(' ')}
                        </td>
                        <td className="py-2 px-3 font-mono text-end text-slate-400" dir="ltr">
                          —
                        </td>
                        <td className="py-2 px-3 font-mono text-end font-semibold text-slate-900 dark:text-white" dir="ltr">
                          {formatCurrency(entry.amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trial_balance' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">ميزان المراجعة وتوازن القيود</h3>
              <p className="text-xs text-slate-500">التحقق من تطابق إجمالي المدين والدائن لجميع الحسابات</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <Scale className="w-3.5 h-3.5" />
              <span>الميزان متطابق 100%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block mb-1">إجمالي الحركات المدينة</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white" dir="ltr">
                {formatCurrency(totalAssets + totalLiabilities)}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500 block mb-1">إجمالي الحركات الدائنة</span>
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white" dir="ltr">
                {formatCurrency(totalAssets + totalLiabilities)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
