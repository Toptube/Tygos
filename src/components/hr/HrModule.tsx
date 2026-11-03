/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Briefcase,
  Clock,
  DollarSign,
  Search,
  CheckCircle,
  Plus,
  Shield,
  Layers,
} from 'lucide-react';
import { MOCK_EMPLOYEES } from '../../data/mockData.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { formatCurrency, formatPercent } from '../../i18n/formatters.ts';

export const HrModule: React.FC = () => {
  const { t, language } = useI18n();
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'shifts'>('employees');
  const [laborFilter, setLaborFilter] = useState<'all' | 'direct' | 'indirect'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmployees = MOCK_EMPLOYEES.filter((emp) => {
    const matchesLabor = laborFilter === 'all' || emp.laborType === laborFilter;
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLabor && matchesSearch;
  });

  const totalDirectPayroll = MOCK_EMPLOYEES.filter((e) => e.laborType === 'direct').reduce(
    (sum, e) => sum + e.baseSalary,
    0
  );

  const totalIndirectPayroll = MOCK_EMPLOYEES.filter((e) => e.laborType === 'indirect').reduce(
    (sum, e) => sum + e.baseSalary,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('hr.title', 'Human Resources & Labor Cost Accounting')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('hr.subtitle', 'Staff roster, shifts, attendance, and strict distinction between Direct and Indirect labor.')}
          </p>
        </div>

        <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'employees'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('hr.staffDirectory', 'Staff Directory')}
          </button>
          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'payroll'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('hr.payrollRun', 'Monthly Payroll Run')}
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'shifts'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-white'
            }`}
          >
            {t('hr.shifts', 'Floor Shifts & Attendance')}
          </button>
        </div>
      </div>

      {/* Labor Allocation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t('hr.directLabor', 'Direct Labor (COGS)')}</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
            {formatCurrency(totalDirectPayroll, language)} / mo
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {t('hr.directCogsDesc', 'Chefs, Waiters, Bartenders & Cashiers')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t('hr.indirectLabor', 'Indirect Labor (Overhead SG&A)')}</span>
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-purple-500" dir="ltr">
            {formatCurrency(totalIndirectPayroll, language)} / mo
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {t('hr.indirectSgaDesc', 'GM, Financial Controllers & HR Management')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{t('hr.attendanceRate', 'Attendance Rate')}</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black mt-2 font-mono text-emerald-500" dir="ltr">
            {formatPercent(98.4, language)}
          </div>
          <span className="text-[11px] text-emerald-500 mt-1 block">
            {t('hr.biometricSync', 'Biometric clock-in sync')}
          </span>
        </div>
      </div>

      {activeTab === 'employees' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute start-3 top-2.5" />
              <input
                type="text"
                placeholder={t('hr.searchPlaceholder', 'Search staff name or role...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLaborFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                  laborFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('hr.allStaff', 'All Staff')}
              </button>
              <button
                onClick={() => setLaborFilter('direct')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                  laborFilter === 'direct'
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('hr.directStaff', 'Direct Labor')}
              </button>
              <button
                onClick={() => setLaborFilter('indirect')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer ${
                  laborFilter === 'indirect'
                    ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('hr.indirectStaff', 'Indirect Labor')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">{t('admin.tableCode', 'Code')}</th>
                  <th className="py-3 px-4 text-start">{t('hr.employeeName', 'Employee Name')}</th>
                  <th className="py-3 px-4 text-start">{t('hr.department', 'Department')}</th>
                  <th className="py-3 px-4 text-start">{t('hr.position', 'Position')}</th>
                  <th className="py-3 px-3 text-start">{t('hr.laborType', 'Labor Type')}</th>
                  <th className="py-3 px-3 text-end">{t('hr.baseSalary', 'Base Salary')}</th>
                  <th className="py-3 px-3 text-end">{t('hr.attendanceRate', 'Attendance')}</th>
                  <th className="py-3 px-4 text-center">{t('common.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400" dir="ltr">
                      {emp.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {emp.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {emp.department}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {emp.position}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          emp.laborType === 'direct'
                            ? 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {emp.laborType === 'direct'
                          ? t('hr.directStaff', 'Direct')
                          : t('hr.indirectStaff', 'Indirect')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatCurrency(emp.baseSalary, language)}
                    </td>
                    <td className="py-3 px-3 text-end font-mono font-bold text-emerald-500" dir="ltr">
                      {formatPercent(emp.attendanceRate, language)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 uppercase">
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs text-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('hr.scheduledPayroll', 'Scheduled Payroll Calculation Run')}
          </h3>
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>{t('hr.grossBase', 'Gross Base Salaries:')}</span>
              <span className="text-slate-200 font-bold" dir="ltr">
                {formatCurrency(16250, language)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{t('hr.advancesLoans', 'Less: Approved Staff Advances & Loans:')}</span>
              <span className="text-amber-500 font-bold" dir="ltr">
                -{formatCurrency(850, language)}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{t('hr.serviceCharge', 'Add: Service Charge Pool Distribution (12%):')}</span>
              <span className="text-emerald-500 font-bold" dir="ltr">
                +{formatCurrency(2480, language)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>{t('hr.netDisbursement', 'Net Bank Disbursement Due:')}</span>
              <span className="text-cyan-400 font-black" dir="ltr">
                {formatCurrency(17880, language)}
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'shifts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs text-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('hr.activeStaffing', 'Floor Shifts & Active Station Staffing')}
          </h3>
          <div className="space-y-2">
            {MOCK_EMPLOYEES.map((e) => (
              <div
                key={e.id}
                className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{e.name}</span>
                  <p className="text-[11px] text-slate-400">{e.position} · {e.department}</p>
                </div>
                <div className="text-end">
                  <span className="font-mono text-cyan-400 font-medium" dir="ltr">{e.currentShift}</span>
                  <span className="block text-[10px] text-emerald-400 mt-0.5">
                    {t('hr.clockInVerified', 'Biometric Clock-In Verified')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
