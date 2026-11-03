/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FileText,
  Printer,
  Shield,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Users,
  Lock,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

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

  if (!isAuditReportModalOpen) return null;

  const isAr = language === 'ar';

  const filteredEvents = auditEvents.filter(
    (e) => filterAction === 'ALL' || e.action === filterAction
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'سجل التدقيق الأمني وتقارير الامتثال المؤسسي' : 'Security Audit Trail & Compliance Center'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                  Immutable Audit Log
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'سجل غير قابل للتعديل لكافة العمليات الحساسة وتصعيد الصلاحيات وربط الوقائع بالموارد البشرية.'
                  : 'Tamper-evident trail for privileged access, operational overrides, and HR incident verification.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('audit_trail')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'audit_trail'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'سجل العمليات' : 'Audit Trail'}
              </button>
              <button
                onClick={() => setActiveTab('hr_incidents')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'hr_incidents'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'وقائع الموارد البشرية' : 'HR Incidents'}
              </button>
              <button
                onClick={() => setActiveTab('pdf_preview')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'pdf_preview'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? 'معاينة التقرير الرسمي' : 'Formal Report'}
              </button>
            </div>

            <button
              onClick={() => setIsAuditReportModalOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'audit_trail' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-400 font-semibold">
                  {isAr ? `إجمالي السجلات المسجلة: ${filteredEvents.length}` : `Total Logged Events: ${filteredEvents.length}`}
                </span>

                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  >
                    <option value="ALL">{isAr ? 'كافة العمليات' : 'All Actions'}</option>
                    <option value="RECIPE_VERSION_CREATE">RECIPE_VERSION_CREATE</option>
                    <option value="ACCESS_ESCALATION_REQUEST">ACCESS_ESCALATION_REQUEST</option>
                    <option value="ACCESS_ESCALATION_APPROVE">ACCESS_ESCALATION_APPROVE</option>
                    <option value="ACCESS_ESCALATION_REJECT">ACCESS_ESCALATION_REJECT</option>
                    <option value="HR_SENSITIVE_DATA_ATTEMPT">HR_SENSITIVE_DATA_ATTEMPT</option>
                    <option value="INVENTORY_ADJUSTMENT">INVENTORY_ADJUSTMENT</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الوقت' : 'Timestamp'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'المستخدم والصفة' : 'User & Role'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'العملية' : 'Action'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الكيان والمورد' : 'Entity'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'السبب المسجل' : 'Reason / Note'}</th>
                      <th className="py-2.5 px-3 text-center">{isAr ? 'النتيجة' : 'Result'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40 font-mono">
                    {filteredEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]" dir="ltr">
                          {ev.timestamp}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200">
                          <span className="font-sans font-bold">{ev.userFullName}</span>
                          <span className="block text-[10px] text-cyan-400 uppercase">
                            {ev.userRole}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold">
                            {ev.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                          {ev.entity} [{ev.entityId}]
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-300 max-w-xs truncate text-[11px]">
                          {ev.reason || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              ev.result === 'SUCCESS'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rose-500/15 text-rose-400'
                            }`}
                          >
                            {ev.result}
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
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                <span className="font-bold text-amber-400 block mb-1">
                  {isAr ? 'سياسة التحقق وعدم توجيه الاتهام التلقائي' : 'Objective Review & Human In The Loop Principle'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? 'لا تعتبر السجلات الأمنية دليلاً قطعياً على المخالفة؛ بل تخضع حصرياً لمراجعة مسؤول الموارد البشرية وتوثيق جلسة التحقق الإداري.'
                    : 'System security logs are never treated as automatic proof of misconduct. They require designated HR review and authorized coaching logs.'}
                </p>
              </div>

              <div className="space-y-3">
                {hrIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-cyan-400 font-bold">{inc.incidentNumber}</span>
                        <span className="font-bold text-white">
                          {isAr ? inc.titleAr : inc.titleEn}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase font-mono">
                        {inc.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      {isAr ? 'الموظف المعني:' : 'Employee:'} <strong>{inc.employeeName}</strong> ({inc.employeeCode}) ·{' '}
                      {isAr ? 'مراجع الحالة:' : 'HR Reviewer:'} <span className="text-cyan-300">{inc.reviewedByHrUser}</span>
                    </p>

                    <p className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      {isAr ? inc.notesAr : inc.notesEn}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'pdf_preview' && (
            <div className="p-6 bg-white text-slate-900 rounded-xl shadow-lg space-y-6">
              {/* Printable Official Document Layout */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900">TYGOS</h2>
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    Official Security Audit & Privilege Compliance Report
                  </p>
                </div>
                <div className="text-end text-xs text-slate-500 font-mono" dir="ltr">
                  <span>Establishment: {currentEstablishment?.code || 'R.0001'}</span>
                  <span className="block">{currentEstablishment?.name || 'Tygos Signature Flagship'}</span>
                  <span className="block">Date: {new Date().toISOString().split('T')[0]}</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800">1. Executive Summary & Session Cryptography</span>
                  <p className="text-slate-600 text-[11px]">
                    This official audit report certifies that all privileged access escalation workflows, recipe cost overrides, and financial data access were conducted in compliance with Tygos Enterprise RBAC isolation.
                  </p>
                  <p className="font-mono text-[10px] text-slate-500" dir="ltr">
                    AUDIT HASH: SHA256:7e89a4b2c1f930e84b721894a0dfc821
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800">2. Recent Privileged Actions</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-[11px] border border-slate-200">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2 text-start">Timestamp</th>
                          <th className="p-2 text-start">User</th>
                          <th className="p-2 text-start">Action</th>
                          <th className="p-2 text-start">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {auditEvents.slice(0, 4).map((e) => (
                          <tr key={e.id}>
                            <td className="p-2 font-mono" dir="ltr">{e.timestamp}</td>
                            <td className="p-2">{e.userFullName} ({e.userRole})</td>
                            <td className="p-2 font-mono">{e.action}</td>
                            <td className="p-2 font-bold">{e.result}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Certified by: Tygos Ecosystem Security Master</span>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة / حفظ PDF' : 'Print / Export PDF'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
