/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ACTIVITY LOG & COMPLIANCE MODAL (Phase 8 - Sections 1 & 4)
 * Mobile-first full-screen modal with scrollable tabs, full-width cards,
 * and plain Arabic terminology ("سجل العمليات").
 */

import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import { FileText, Printer, Filter } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { SCREEN_GLOSSARY, translateTechnicalStatus } from '../../i18n/glossary.ts';

export const AuditReportModal: React.FC = () => {
  const {
    isAuditReportModalOpen,
    setIsAuditReportModalOpen,
    auditEvents,
    hrIncidents,
  } = useBusiness();
  const { currentEstablishment } = useAuth();
  const { language } = useI18n();
  const [activeTab, setActiveTab] = useState<'audit_trail' | 'hr_incidents' | 'pdf_preview'>('audit_trail');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const isAr = language === 'ar';
  const glossary = SCREEN_GLOSSARY.audit_log;

  const filteredEvents = auditEvents.filter(
    (e) => filterAction === 'ALL' || e.action === filterAction
  );

  const handlePrint = () => {
    window.print();
  };

  const tabsBar = (
    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
      <Button
        type="button"
        size="sm"
        variant={activeTab === 'audit_trail' ? 'primary' : 'outline'}
        selected={activeTab === 'audit_trail'}
        onClick={() => setActiveTab('audit_trail')}
        className="whitespace-nowrap shrink-0"
      >
        {isAr ? 'سجل العمليات' : 'Activity Log'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={activeTab === 'hr_incidents' ? 'primary' : 'outline'}
        selected={activeTab === 'hr_incidents'}
        onClick={() => setActiveTab('hr_incidents')}
        className="whitespace-nowrap shrink-0"
      >
        {isAr ? 'وقائع الموظفين' : 'Staff Incidents'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={activeTab === 'pdf_preview' ? 'primary' : 'outline'}
        selected={activeTab === 'pdf_preview'}
        onClick={() => setActiveTab('pdf_preview')}
        className="whitespace-nowrap shrink-0"
      >
        {isAr ? 'معاينة التقرير' : 'Report Preview'}
      </Button>
    </div>
  );

  return (
    <ModalShell
      isOpen={isAuditReportModalOpen}
      onClose={() => setIsAuditReportModalOpen(false)}
      title={isAr ? glossary.titleAr : glossary.titleEn}
      subtitle={isAr ? glossary.subtitleAr : glossary.subtitleEn}
      icon={<FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
      maxWidthClass="sm:max-w-5xl"
      headerExtra={tabsBar}
    >
      <div className="space-y-4 text-xs min-w-0">
        {activeTab === 'audit_trail' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                {isAr
                  ? `إجمالي العمليات المسجلة: ${filteredEvents.length}`
                  : `Total Logged Events: ${filteredEvents.length}`}
              </span>

              <div className="flex items-center gap-2 max-w-full">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold max-w-full"
                >
                  <option value="ALL">{isAr ? 'كافة العمليات' : 'All Actions'}</option>
                  <option value="RECIPE_VERSION_CREATE">
                    {translateTechnicalStatus('RECIPE_VERSION_CREATE', isAr)}
                  </option>
                  <option value="ACCESS_ESCALATION_REQUEST">
                    {translateTechnicalStatus('ACCESS_ESCALATION_REQUEST', isAr)}
                  </option>
                  <option value="ACCESS_ESCALATION_APPROVE">
                    {translateTechnicalStatus('ACCESS_ESCALATION_APPROVE', isAr)}
                  </option>
                  <option value="ACCESS_ESCALATION_REJECT">
                    {translateTechnicalStatus('ACCESS_ESCALATION_REJECT', isAr)}
                  </option>
                  <option value="HR_SENSITIVE_DATA_ATTEMPT">
                    {translateTechnicalStatus('HR_SENSITIVE_DATA_ATTEMPT', isAr)}
                  </option>
                  <option value="INVENTORY_ADJUSTMENT">
                    {translateTechnicalStatus('INVENTORY_ADJUSTMENT', isAr)}
                  </option>
                </select>
              </div>
            </div>

            {/* Mobile-friendly cards + Desktop table */}
            <div className="space-y-2.5 sm:hidden">
              {filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {ev.userFullName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ev.result === 'SUCCESS'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {ev.result === 'SUCCESS' ? (isAr ? 'تم بنجاح' : 'Success') : (isAr ? 'مرفوض' : 'Denied')}
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                    {translateTechnicalStatus(ev.action, isAr)}
                  </div>
                  {ev.reason && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">{ev.reason}</p>
                  )}
                  <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                    {ev.timestamp}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden sm:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'الوقت' : 'Time'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'المستخدم' : 'User'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'العملية' : 'Action'}</th>
                    <th className="py-2.5 px-3 text-start">{isAr ? 'السبب' : 'Note'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'النتيجة' : 'Result'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]" dir="ltr">
                        {ev.timestamp}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {ev.userFullName}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-cyan-700 dark:text-cyan-400">
                        {translateTechnicalStatus(ev.action, isAr)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate text-[11px]">
                        {ev.reason || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ev.result === 'SUCCESS'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {ev.result === 'SUCCESS' ? (isAr ? 'تم بنجاح' : 'Success') : (isAr ? 'مرفوض' : 'Denied')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'hr_incidents' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1">
                {isAr
                  ? 'سياسة المراجعة الإدارية قبل أي إجراء'
                  : 'Administrative Review Policy'}
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                {isAr
                  ? 'لا تُعتبر تنبيهات النظام إدانة تلقائية؛ بل تخضع لمراجعة مسؤول الموارد البشرية وتوثيق جلسة التحقق.'
                  : 'System alerts are never automatic proof of misconduct and require HR review.'}
              </p>
            </div>

            <div className="space-y-3">
              {hrIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">
                        {translateTechnicalStatus(inc.incidentNumber, isAr)}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {isAr ? inc.titleAr : inc.titleEn}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      {translateTechnicalStatus(inc.status, isAr)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {isAr ? 'الموظف:' : 'Employee:'} <strong>{inc.employeeName}</strong> ·{' '}
                    {isAr ? 'مراجع الحالة:' : 'Reviewer:'}{' '}
                    <span className="font-semibold">{inc.reviewedByHrUser}</span>
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    {isAr ? inc.notesAr : inc.notesEn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pdf_preview' && (
          <div className="p-4 sm:p-6 bg-white text-slate-900 rounded-xl border border-slate-200 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-black text-slate-900">TYGOS</h2>
                <p className="text-xs text-slate-500 font-bold">
                  {isAr ? 'تقرير سجل العمليات والمراجعة' : 'Official Activity & Review Report'}
                </p>
              </div>
              <div className="text-end text-xs text-slate-600">
                <div className="font-bold">{currentEstablishment?.name || 'السراب الملكي'}</div>
                <div className="font-mono text-[11px]">
                  {currentEstablishment?.code || 'R.0001'} · {new Date().toISOString().split('T')[0]}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-[11px] border border-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-700">
                  <tr>
                    <th className="p-2 text-start">{isAr ? 'الوقت' : 'Time'}</th>
                    <th className="p-2 text-start">{isAr ? 'المستخدم' : 'User'}</th>
                    <th className="p-2 text-start">{isAr ? 'العملية' : 'Action'}</th>
                    <th className="p-2 text-start">{isAr ? 'النتيجة' : 'Result'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditEvents.slice(0, 5).map((e) => (
                    <tr key={e.id}>
                      <td className="p-2 font-mono" dir="ltr">{e.timestamp}</td>
                      <td className="p-2 font-semibold">{e.userFullName}</td>
                      <td className="p-2">{translateTechnicalStatus(e.action, isAr)}</td>
                      <td className="p-2 font-bold">
                        {e.result === 'SUCCESS' ? (isAr ? 'تم بنجاح' : 'Success') : (isAr ? 'مرفوض' : 'Denied')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
              <Button type="button" variant="primary" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة التقرير' : 'Print Report'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
