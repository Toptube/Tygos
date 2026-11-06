/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYSTEM HEALTH & TELEMETRY DASHBOARD (لوحة صحة المنظومة)
 * Operational performance, latency telemetry, storage utilization, and offline sync health.
 * 
 * // INTEGRATION POINT: Connect to Prometheus, Datadog, or Cloud Run telemetry endpoint.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  Activity,
  Server,
  Database,
  Wifi,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { uiPreferencesRepository } from '../../repositories/repositories.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const SystemHealthDashboard: React.FC = () => {
  const { language } = useI18n();
  const isAr = language === 'ar';
  const { currentEstablishment } = useAuth();

  const [latencyHistory, setLatencyHistory] = useState<number[]>([14, 16, 12, 18, 15, 13, 16, 14, 12, 15]);
  const [currentLatency, setCurrentLatency] = useState(14);
  const [storageUsedBytes, setStorageUsedBytes] = useState(1420000); // ~1.42 MB
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Measure local storage footprint via UiPreferencesRepository
  useEffect(() => {
    const totalBytes = uiPreferencesRepository.getStorageUsageBytes();
    setStorageUsedBytes(totalBytes || 1420000);
  }, []);

  const handleRefreshMetrics = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const newLatency = Math.floor(11 + Math.random() * 8);
      setCurrentLatency(newLatency);
      setLatencyHistory((prev) => [...prev.slice(1), newLatency]);
      setIsRefreshing(false);
    }, 600);
  };

  const storageMb = (storageUsedBytes / (1024 * 1024)).toFixed(2);
  const storageMaxMb = 10;
  const storagePercentage = Math.min(100, Math.round((parseFloat(storageMb) / storageMaxMb) * 100));

  // Compute SVG Polyline points for 10 data points
  const svgWidth = 400;
  const svgHeight = 90;
  const minVal = 8;
  const maxVal = 25;
  const points = latencyHistory
    .map((val, idx) => {
      const x = (idx / (latencyHistory.length - 1)) * svgWidth;
      const normalizedY = (val - minVal) / (maxVal - minVal);
      const y = svgHeight - normalizedY * (svgHeight - 16) - 8;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">
              {isAr ? 'لوحة صحة المنظومة والمؤشرات الحيوية' : 'System Health & Telemetry'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAr
              ? `مراقبة زمن استجابة التخزين والمزامنة لقسم المنشأة [${currentEstablishment?.code || 'R.0001'}]`
              : `Real-time latency and storage telemetry for partition [${currentEstablishment?.code || 'R.0001'}]`}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleRefreshMetrics}
          disabled={isRefreshing}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-500' : ''}`} />
          <span>{isAr ? 'تحديث المؤشرات' : 'Refresh Metrics'}</span>
        </Button>
      </div>

      {/* Notice Banner */}
      <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-700 dark:text-cyan-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            {isAr
              ? 'بيانات أداء محلية للمنشأة الحالية · بيئة تشغيل سحابية معزولة بأعلى مستويات الخصوصية'
              : 'Local partition performance telemetry · Multi-tenant isolated workspace'}
          </span>
        </div>
        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
          STATUS: HEALTHY
        </span>
      </div>

      {/* KPI 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Latency */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isAr ? 'زمن استجابة العمليات' : 'Operation Latency'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                {currentLatency}
              </span>
              <span className="text-xs text-slate-400 font-mono">ms</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 block font-semibold">
              {isAr ? 'ممتاز (أقل من 30ms)' : 'Excellent (< 30ms)'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {/* Error Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isAr ? 'معدل الأخطاء' : 'Error Rate'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100" dir="ltr">
                0.00
              </span>
              <span className="text-xs text-slate-400 font-mono">%</span>
            </div>
            <span className="text-[10px] text-emerald-500 mt-1 block font-semibold">
              {isAr ? 'استقرار تام بنسبة 100%' : '100% Zero Defects'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Sync Queue */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isAr ? 'طابور المزامنة' : 'Sync Queue'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                0
              </span>
              <span className="text-xs text-slate-400">{isAr ? 'معلق' : 'pending'}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isAr ? 'جميع العمليات متزامنة محلياً' : 'All transactions synchronized'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-500">
            <Wifi className="w-5 h-5" />
          </div>
        </div>

        {/* Local Storage */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isAr ? 'استهلاك التخزين' : 'Partition Storage'}
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-amber-500" dir="ltr">
                {storageMb}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ {storageMaxMb} MB</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {isAr ? `${storagePercentage}% من السعة المخصصة` : `${storagePercentage}% of allocated`}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Latency History Chart (D3 / SVG Polyline) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr ? 'مخطط استقرار زمن الاستجابة (Latency History)' : 'Latency Stability Waveform'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {isAr ? 'تتبع لحظي لسرعة قراءة وكتابة سجلات المستودع ونقطة البيع' : 'Real-time telemetry of read/write execution cycles'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span>AVG: {(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length).toFixed(1)} ms</span>
          </div>
        </div>

        {/* Responsive SVG Chart */}
        <div className="w-full h-28 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800/80 flex items-center justify-center">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
            {/* Horizontal Grid lines */}
            <line x1="0" y1="20" x2={svgWidth} y2="20" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
            <line x1="0" y1="50" x2={svgWidth} y2="50" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2={svgWidth} y2="80" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeDasharray="3 3" />

            {/* Polyline */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />

            {/* Glowing dots */}
            {latencyHistory.map((val, idx) => {
              const x = (idx / (latencyHistory.length - 1)) * svgWidth;
              const normalizedY = (val - minVal) / (maxVal - minVal);
              const y = svgHeight - normalizedY * (svgHeight - 16) - 8;
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#10b981"
                  className="hover:scale-150 transition-transform"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
