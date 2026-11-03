/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, X, Database } from 'lucide-react';
import { useSync } from '../../sync/SyncContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const SyncStatusIndicator: React.FC = () => {
  const { status, isOnline, pendingCount, pendingQueue, toggleOnlineStatus, triggerManualSync } =
    useSync();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const getStatusBadge = () => {
    switch (status) {
      case 'synchronizing':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />,
          label: t('sync.syncing', 'Synchronizing'),
          color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20',
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-amber-400" />,
          label: t('sync.offline', 'Offline Mode'),
          color: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
        };
      case 'pending_changes':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-amber-400" />,
          label: `${pendingCount} ${t('sync.pendingChanges', 'Pending')}`,
          color: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
        };
      case 'synced':
      default:
        return {
          icon: <Wifi className="w-3.5 h-3.5 text-emerald-400" />,
          label: t('sync.synced', 'Synced'),
          color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${badge.color}`}
        title={t('sync.engineTitle', 'Offline-first sync status')}
      >
        {badge.icon}
        <span className="hidden sm:inline">{badge.label}</span>
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50 text-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-semibold">{t('sync.engineTitle', 'Tygos Sync Engine (Phase 2)')}</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Online/Offline State */}
          <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-200">
                {isOnline ? t('sync.online', 'Online') : t('sync.offline', 'Offline')}
              </p>
              <p className="text-[11px] text-slate-400">
                {isOnline ? t('sync.online', 'Online (Connected)') : t('sync.offline', 'Offline (Local In-Memory Cache)')}
              </p>
            </div>
            <button
              onClick={toggleOnlineStatus}
              className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                isOnline
                  ? 'bg-amber-950/40 text-amber-300 border-amber-500/40 hover:bg-amber-900/50'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
              }`}
            >
              {isOnline ? t('sync.simulateOffline', 'Simulate Offline') : t('sync.goOnline', 'Go Online')}
            </button>
          </div>

          {/* Pending Sync Items Queue */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                {t('sync.pendingQueue', 'Pending Local Queue')} ({pendingCount})
              </span>
              <button
                onClick={triggerManualSync}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                {t('sync.forceSync', 'Force Sync Now')}
              </button>
            </div>

            {pendingQueue.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t('sync.allSynced', 'All local operational records are synchronized.')}</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pe-1">
                {pendingQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-slate-950/50 border border-slate-800/60 rounded-md text-[11px] flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-medium text-slate-300">{item.description}</p>
                      <p className="text-[10px] text-slate-500">{item.type} · {item.timestamp}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 shrink-0 font-mono">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-500">
            {t('sync.posGuarantee', 'Offline-first POS guarantees uninterrupted terminal operations during ISP outages.')}
          </div>
        </div>
      )}
    </div>
  );
};
