/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Database,
  Radio,
} from 'lucide-react';
import { useSync } from '../../sync/SyncContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { SyncStatus } from '../../types/index.ts';

export const ConnectivityStatus: React.FC = () => {
  const {
    status,
    isOnline,
    pendingCount,
    pendingQueue,
    toggleOnlineStatus,
    triggerManualSync,
  } = useSync();
  const { t } = useI18n();

  const [isOpen, setIsOpen] = useState(false);
  const [simulatedError, setSimulatedError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const effectiveStatus: SyncStatus = simulatedError ? 'sync_error' : status;

  const getStatusConfig = () => {
    switch (effectiveStatus) {
      case 'synchronizing':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />,
          label: t('sync.syncing', 'Synchronizing'),
          color: 'text-cyan-600 dark:text-cyan-400 border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20',
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-amber-500" />,
          label: t('sync.offline', 'Offline Mode'),
          color: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50 dark:bg-amber-950/20',
        };
      case 'sync_error':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
          label: t('sync.syncError', 'Sync Error'),
          color: 'text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-50 dark:bg-rose-950/20',
        };
      case 'pending_changes':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
          label: `${pendingCount} ${t('sync.pendingChanges', 'Pending')}`,
          color: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50 dark:bg-amber-950/20',
        };
      case 'synced':
      case 'online':
      default:
        return {
          icon: <Wifi className="w-3.5 h-3.5 text-emerald-500" />,
          label: t('sync.synced', 'Synced'),
          color: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20',
        };
    }
  };

  const badge = getStatusConfig();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Connectivity and Synchronization Status"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${badge.color}`}
        title={t('sync.engineTitle', 'Tygos Sync Engine')}
      >
        {badge.icon}
        <span className="hidden sm:inline font-bold">{badge.label}</span>
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in text-slate-800 dark:text-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-500" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t('sync.engineTitle', 'Tygos Sync Engine (Phase 2)')}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle Online/Offline State */}
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {isOnline ? t('sync.online', 'Online') : t('sync.offline', 'Offline')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isOnline ? 'Active Cloud Gateway' : 'Local In-Memory Cache'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSimulatedError(false);
                toggleOnlineStatus();
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                isOnline
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              {isOnline
                ? t('sync.simulateOffline', 'Simulate Offline')
                : t('sync.goOnline', 'Go Online')}
            </button>
          </div>

          {/* Simulation Error Toggle Button */}
          <div className="mt-2 flex items-center justify-between px-1 text-xs">
            <span className="text-slate-500 text-[11px]">Testing & QA Simulation:</span>
            <button
              type="button"
              onClick={() => setSimulatedError(!simulatedError)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                simulatedError
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {simulatedError ? 'Clear Sync Error' : 'Simulate Sync Error'}
            </button>
          </div>

          {/* Pending Sync Items Queue */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                {t('sync.pendingQueue', 'Pending Local Queue')} ({pendingCount})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSimulatedError(false);
                  triggerManualSync();
                }}
                className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{t('sync.forceSync', 'Force Sync Now')}</span>
              </button>
            </div>

            {pendingQueue.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>{t('sync.allSynced', 'All local records are synchronized.')}</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {pendingQueue.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.description}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono" dir="ltr">
                        {item.type} · {item.timestamp}
                      </p>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono shrink-0">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            {t(
              'sync.posGuarantee',
              'Offline-first POS guarantees uninterrupted terminal operations during ISP outages.'
            )}
          </div>
        </div>
      )}
    </div>
  );
};
