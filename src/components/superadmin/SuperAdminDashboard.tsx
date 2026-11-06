/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';
import {
  Building2,
  Users,
  ShieldAlert,
  Activity,
  Plus,
  Search,
  Filter,
  Wrench,
  AlertTriangle,
  Clock,
  Trash2,
  CheckCircle,
  Ban,
  FileSpreadsheet,
  X,
  ExternalLink,
} from 'lucide-react';
import { MOCK_ESTABLISHMENTS, MOCK_MAINTENANCE_SESSIONS } from '../../data/mockData.ts';
import { Establishment, EstablishmentStatus } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const SuperAdminDashboard: React.FC = () => {
  const {
    startSupportSession,
    setActiveView,
    establishments,
    updateEstablishmentStatus,
    deleteEstablishment,
  } = useAuth();
  const { t, isRtl, formatNumber } = useI18n();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Support Session Modal
  const [supportModalEst, setSupportModalEst] = useState<Establishment | null>(null);
  const [supportDuration, setSupportDuration] = useState<number>(30);
  const [supportReason, setSupportReason] = useState<string>(
    'Assisting tenant with recipe cost center allocation & POS tax mapping.'
  );

  // Delete Confirmation Modal
  const [deleteModalEst, setDeleteModalEst] = useState<Establishment | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');

  // Logs Modal
  const [logsModalEst, setLogsModalEst] = useState<Establishment | null>(null);

  // Filter establishments
  const filteredEsts = establishments.filter((est) => {
    const matchesSearch =
      est.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      est.country.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || est.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: string, newStatus: EstablishmentStatus) => {
    updateEstablishmentStatus(id, newStatus);
  };

  const handleConfirmDelete = () => {
    if (!deleteModalEst) return;
    if (deleteConfirmationInput === deleteModalEst.code) {
      deleteEstablishment(deleteModalEst.id);
      setDeleteModalEst(null);
      setDeleteConfirmationInput('');
    }
  };

  const handleLaunchSupport = () => {
    if (!supportModalEst) return;
    startSupportSession(supportModalEst, supportDuration, supportReason);
    setSupportModalEst(null);
  };

  return (
    <div className="space-y-6">
      {/* Platform Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('admin.controlCenter')}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              {t('admin.ecosystemMaster')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('admin.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setActiveView('dashboard')}
            className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 rtl:rotate-180" />
            <span>{t('navigation.dashboard')}</span>
          </Button>
        </div>
      </div>

      {/* Global Platform KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('admin.totalEst')}</span>
            <Building2 className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-slate-900 dark:text-white font-mono">
            42
          </div>
          <span className="text-[11px] text-emerald-500 font-medium">+3 {t('common.active')}</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('admin.activeEst')}</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400 font-mono">
            38
          </div>
          <span className="text-[11px] text-slate-400">90.5%</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('admin.trialSuspended')}</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-amber-500 font-mono">
            4
          </div>
          <span className="text-[11px] text-slate-400">2 / 2</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('admin.totalBranches')}</span>
            <Building2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-slate-900 dark:text-white font-mono">
            98
          </div>
          <span className="text-[11px] text-slate-400">6 {t('admin.tableCountry')}</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('admin.activeSessions')}</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-purple-600 dark:text-purple-400 font-mono">
            312
          </div>
          <span className="text-[11px] text-slate-400">{t('common.active')}</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">{t('admin.systemHealth')}</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black mt-2 text-emerald-500 font-mono">
            99.98%
          </div>
          <span className="text-[11px] text-emerald-500 font-medium">{t('sync.synced')}</span>
        </div>
      </div>

      {/* Establishments Table Management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('admin.searchPlaceholder')}
                className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">{t('common.all')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        {/* High Density Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t('admin.tableCode')}</th>
                <th className="py-3 px-4 text-start">{t('admin.tableName')}</th>
                <th className="py-3 px-4 text-start">{t('admin.tableOwner')}</th>
                <th className="py-3 px-4 text-start">{t('admin.tableType')}</th>
                <th className="py-3 px-4 text-start">{t('admin.tableCountry')}</th>
                <th className="py-3 px-3 text-end">{t('admin.tableBranches')}</th>
                <th className="py-3 px-3 text-end">{t('admin.tableUsers')}</th>
                <th className="py-3 px-4 text-start">{t('admin.tableStatus')}</th>
                <th className="py-3 px-4 text-start">{t('admin.tableLastActivity')}</th>
                <th className="py-3 px-4 text-end">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredEsts.map((est) => (
                <tr
                  key={est.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400" dir="ltr">
                    {est.code}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                    {est.name}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {est.ownerName}
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-500">
                    {t(`businessType.${est.businessType}`) || est.businessType.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                    {est.country}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300">
                    {est.branchesCount}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300">
                    {est.usersCount}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        est.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : est.status === 'trial'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                          : est.status === 'suspended'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {est.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]" dir="ltr">
                    {est.lastActivity}
                  </td>
                  <td className="py-3 px-4 text-end">
                    <div className="flex items-center justify-end gap-1">
                      {/* Temporary Support Session Action */}
                      <Button
                        onClick={() => setSupportModalEst(est)}
                        title={t('admin.supportSession')}
                        className="p-1.5 rounded text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </Button>

                      {/* View Logs Action */}
                      <Button
                        onClick={() => setLogsModalEst(est)}
                        title={t('admin.logs')}
                        className="p-1.5 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </Button>

                      {/* Status Toggle Actions */}
                      {est.status === 'active' ? (
                        <Button
                          onClick={() => handleStatusChange(est.id, 'suspended')}
                          title="Suspend"
                          className="p-1.5 rounded text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleStatusChange(est.id, 'active')}
                          title="Activate"
                          className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {/* Delete with Strong Confirmation */}
                      <Button
                        onClick={() => {
                          setDeleteModalEst(est);
                          setDeleteConfirmationInput('');
                        }}
                        title={t('common.delete')}
                        className="p-1.5 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>{filteredEsts.length} {t('admin.totalEst')}</span>
          <span>{t('common.phase2Badge')}</span>
        </div>
      </div>

      {/* Temporary Support Session Modal */}
      {supportModalEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('admin.supportSession')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Tygos Enterprise Support Tunnel
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setSupportModalEst(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 my-4 text-xs">
              <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                <p className="text-slate-700 dark:text-slate-300">
                  {t('admin.tableName')}:{' '}
                  <span className="font-bold text-slate-900 dark:text-white">
                    {supportModalEst.name}
                  </span>{' '}
                  (<span className="font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">{supportModalEst.code}</span>)
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t('admin.auditWarning')}
                </p>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  {t('admin.sessionDuration')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 60, 120].map((mins) => (
                    <Button
                      key={mins}
                      type="button"
                      onClick={() => setSupportDuration(mins)}
                      className={`py-2 text-center rounded-lg border font-medium transition-colors cursor-pointer ${
                        supportDuration === mins
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {mins} {t('admin.minutes')}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  {t('admin.supportReason')} *
                </label>
                <textarea
                  rows={2}
                  value={supportReason}
                  onChange={(e) => setSupportReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[11px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {t('admin.auditWarning')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => setSupportModalEst(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleLaunchSupport}
                className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{t('admin.launchSupport')} ({supportDuration} {t('admin.minutes')})</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold">{t('admin.deleteTitle')}</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              {t('admin.deleteWarning')}{' '}
              <span className="font-bold text-slate-900 dark:text-white">
                {deleteModalEst.name}
              </span>
            </p>

            <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-lg text-xs mb-4">
              <p className="text-slate-500 dark:text-slate-400 mb-1">
                {t('admin.typeToConfirm')}
              </p>
              <p className="font-mono font-bold text-rose-500 dark:text-rose-400 text-sm" dir="ltr">
                {deleteModalEst.code}
              </p>
              <input
                type="text"
                placeholder={deleteModalEst.code}
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                dir="ltr"
                className="w-full mt-2 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={() => setDeleteModalEst(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {t('common.cancel')}
              </Button>
              <Button
                disabled={deleteConfirmationInput !== deleteModalEst.code}
                onClick={handleConfirmDelete}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  deleteConfirmationInput === deleteModalEst.code
                    ? 'bg-rose-600 text-white hover:bg-rose-500 cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                {t('admin.confirmDelete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModalEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('admin.logs')} · {logsModalEst.name} (<span dir="ltr">{logsModalEst.code}</span>)
              </h3>
              <Button
                onClick={() => setLogsModalEst(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="py-4 space-y-2 text-xs max-h-60 overflow-y-auto">
              {MOCK_MAINTENANCE_SESSIONS.map((s) => (
                <div
                  key={s.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200 dark:border-slate-800/80"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                      Support Session #{s.id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                      {s.startedAt}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-1">
                    {s.reason}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Operator: {s.adminUsername} · Status: {s.status}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <Button
                onClick={() => setLogsModalEst(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-200 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
