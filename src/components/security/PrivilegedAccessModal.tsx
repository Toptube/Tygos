/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  UserCheck,
} from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const PrivilegedAccessModal: React.FC = () => {
  const {
    isAccessModalOpen,
    setIsAccessModalOpen,
    privilegedRequests,
    submitPrivilegedAccessRequest,
    approvePrivilegedAccessRequest,
    rejectPrivilegedAccessRequest,
    targetAccessResource,
  } = useBusiness();
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'tenant_admin';
  const { language } = useI18n();

  const isAr = language === 'ar';
  const isSupervisor = ['tenant_admin', 'general_manager', 'super_admin'].includes(role);

  const [resource, setResource] = useState(targetAccessResource?.key || 'HR_PAYROLL_MASTER');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState(15);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  if (!isAccessModalOpen) return null;

  const resourceOptions = [
    {
      key: 'HR_PAYROLL_MASTER',
      labelAr: 'مسير الرواتب المعتمد وكشف الأجور',
      labelEn: 'Approved Establishment Payroll Register',
    },
    {
      key: 'FINANCIAL_PROFIT_LEDGER',
      labelAr: 'دفتر الأرباح ودفتر الأستاذ العام',
      labelEn: 'Financial P&L & General Ledger Master',
    },
    {
      key: 'RECIPE_COST_OVERRIDE',
      labelAr: 'صلاحية تعديل التكاليف المعيارية للوصفات',
      labelEn: 'Standard Recipe Cost Override Access',
    },
    {
      key: 'AUDIT_MASTER_TRAIL',
      labelAr: 'سجل التدقيق الأمني ومراقبة الجلسات',
      labelEn: 'System Audit Trail & Session Compliance',
    },
  ];

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    const selected = resourceOptions.find((r) => r.key === resource) || resourceOptions[0];
    submitPrivilegedAccessRequest(
      selected.key,
      selected.labelAr,
      selected.labelEn,
      reason.trim(),
      duration
    );
    setReason('');
  };

  const handleConfirmReject = (requestId: string) => {
    if (!rejectionReason.trim()) return;
    rejectPrivilegedAccessRequest(requestId, rejectionReason.trim());
    setRejectId(null);
    setRejectionReason('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'مركز طلبات التصريح الأمني المؤقت' : 'Privileged Access Escalation Center'}
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  Zero Password Sharing
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'بروتوكول أمني مشفر يتيح الحصول على تصريح مؤقت دون مشاركة كلمات مرور المشرفين.'
                  : 'Zero-trust escalation workflow granting timed audit-tracked access without sharing supervisor passwords.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAccessModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto max-h-[75vh] space-y-6 text-xs">
          {/* Active / Pending Requests List */}
          {privilegedRequests.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                {isAr ? 'الطلبات المسجلة وجلسات التصريح المؤقت' : 'Logged Requests & Timed Sessions'}
              </h4>

              <div className="space-y-2">
                {privilegedRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {isAr ? req.targetResourceLabelAr : req.targetResourceLabelEn}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : req.status === 'rejected'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-1">
                        {isAr ? 'مقدم الطلب:' : 'Requester:'} <strong className="text-slate-200">{req.requesterName}</strong> ·{' '}
                        {isAr ? 'المدة:' : 'Duration:'} {req.requestedDurationMinutes} {isAr ? 'دقيقة' : 'mins'}
                      </p>
                      <p className="text-[11px] text-cyan-300 mt-0.5">
                        {isAr ? 'السبب المعلن:' : 'Reason:'} "{req.justificationReason}"
                      </p>

                      {req.temporarySessionId && (
                        <div className="mt-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-500/20" dir="ltr">
                          SESSION TOKEN: {req.temporarySessionId} (Expires: {req.expiresAt})
                        </div>
                      )}

                      {req.rejectionReason && (
                        <p className="text-[11px] text-rose-400 mt-1">
                          {isAr ? 'سبب الرفض المسجل في التدقيق:' : 'Audit Rejection Reason:'} "{req.rejectionReason}"
                        </p>
                      )}
                    </div>

                    {/* Supervisor Approval Actions */}
                    {isSupervisor && req.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        {rejectId === req.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder={isAr ? 'سبب الرفض (إلزامي للتدقيق)...' : 'Rejection reason...'}
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              className="px-2 py-1 bg-slate-900 border border-rose-500/40 rounded text-xs text-white"
                            />
                            <button
                              onClick={() => handleConfirmReject(req.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold"
                            >
                              {isAr ? 'تأكيد' : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setRejectId(null)}
                              className="px-2 py-1 bg-slate-800 text-slate-400 rounded"
                            >
                              {isAr ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => approvePrivilegedAccessRequest(req.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{isAr ? 'قبول ومنح جلسة' : 'Approve & Issue'}</span>
                            </button>
                            <button
                              onClick={() => setRejectId(req.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>{isAr ? 'رفض' : 'Reject'}</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Request Form */}
          <form
            onSubmit={handleSubmitRequest}
            className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-4"
          >
            <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isAr ? 'تقديم طلب تصريح مؤقت جديد' : 'Submit New Privileged Access Request'}</span>
            </h4>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-semibold">
                {isAr ? 'المورد أو البيان المحمي المطلوب الوصول إليه:' : 'Protected Resource Requested:'}
              </label>
              <select
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {resourceOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {isAr ? opt.labelAr : opt.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-semibold">
                {isAr ? 'سبب ومبرر الطلب (يسجل في سجل التدقيق الأمني):' : 'Business Justification (Audit Logged):'}
              </label>
              <textarea
                rows={2}
                placeholder={
                  isAr
                    ? 'اكتب سبب طلب الوصول بدقة (مثال: تدقيق انحراف استهلاك الوصفة لشهر نوفمبر...)'
                    : 'Provide operational justification for audit trail...'
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 font-semibold">
                {isAr ? 'المدة المطلوبة للجلسة المؤقتة:' : 'Requested Duration:'}
              </label>
              <div className="flex gap-2">
                {[15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDuration(mins)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      duration === mins
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {mins} {isAr ? 'دقيقة' : 'mins'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!reason.trim()}
              className={`w-full py-2.5 rounded-xl font-bold transition-colors cursor-pointer ${
                reason.trim()
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isAr ? 'إرسال طلب التصريح الأمني للمشرف' : 'Submit Timed Request to Supervisor'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
