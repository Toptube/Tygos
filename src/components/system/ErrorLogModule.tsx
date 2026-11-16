/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ERROR LOG VIEWER (Package 6 - Section 3)
 * Hidden screen accessible only to Owner / General Manager.
 * Displays runtime & boundary crashes logged locally by errorLogService.
 */

import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  ArrowRight,
  Copy,
  Trash2,
  ShieldCheck,
  Lock,
  ScanSearch,
  Check,
} from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { errorLogService, ClientErrorRecord } from '../../services/errorLogService.ts';

export const ErrorLogModule: React.FC = () => {
  const { currentUser, currentEstablishment, setActiveView } = useAuth();
  const { showToast } = useToast();
  const estId = currentEstablishment?.id || 'default';

  const isAuthorized =
    currentUser?.role === 'tenant_admin' ||
    currentUser?.role === 'general_manager' ||
    currentUser?.role === 'super_admin';

  const [errors, setErrors] = useState<ClientErrorRecord[]>(() => errorLogService.getErrors(estId));
  const [confirmClear, setConfirmClear] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setErrors(errorLogService.getErrors(estId));
    setConfirmClear(false);
  }, [estId]);

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4" dir="rtl">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          شاشة مقصورة على المالك والمدير العام
        </h2>
        <Button type="button" variant="primary" size="sm" onClick={() => setActiveView('dashboard')}>
          رجوع للرئيسية
        </Button>
      </div>
    );
  }

  const handleCopyAll = () => {
    const text = errorLogService.formatErrorsReport(estId);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast({ title: 'تم نسخ سجل الأخطاء بالكامل ✓', type: 'success' });
  };

  const handleCopyOne = (err: ClientErrorRecord) => {
    const text = `[${err.timestamp}] شاشة: ${err.viewId}\nالرسالة: ${err.message}\nالجهاز: ${err.deviceInfo}\n${err.stack || ''}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedId(err.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    errorLogService.clearErrors(estId);
    setErrors([]);
    setConfirmClear(false);
    showToast({ title: 'تم مسح سجل الأخطاء ✓', type: 'info' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12" dir="rtl" data-testid="error-log-module">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
            <AlertOctagon className="w-4 h-4" />
            <span>متابعة أعطال الشاشات</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            سجل أخطاء الواجهة والتشغيل
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            يحفظ هذا السجل أي خطأ غير متوقع تلتقطه الشاشات محلياً لمراجعته أو نسخه للدعم الفني.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveView('ui_inspector')}
            className="gap-1.5 font-bold"
          >
            <ScanSearch className="w-4 h-4 text-cyan-600" />
            <span>فاحص الواجهة والموبايل</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyAll}
            disabled={errors.length === 0}
            className="gap-1.5 font-bold"
          >
            <Copy className="w-4 h-4" />
            <span>نسخ الكل</span>
          </Button>

          {!confirmClear ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmClear(true)}
              disabled={errors.length === 0}
              className="gap-1.5 font-bold text-rose-600 border-rose-200 dark:border-rose-800"
            >
              <Trash2 className="w-4 h-4" />
              <span>مسح السجل</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleClear}
              className="gap-1.5 font-bold"
            >
              <span>تأكيد المسح النهائي</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveView('settings')}
            className="gap-1.5 font-bold"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الإعدادات</span>
          </Button>
        </div>
      </div>

      {/* Records List */}
      {errors.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            لا توجد أي أخطاء مسجلة
          </h2>
          <p className="text-xs text-slate-500">
            كل الشاشات تعمل حالياً دون تسجيل أعطال في غلاف الأخطاء.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((err) => (
            <div
              key={err.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold">
                    {err.viewId}
                  </span>
                  <span className="font-mono text-slate-500">{err.timestamp}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyOne(err)}
                  className="gap-1 text-xs"
                >
                  {copiedId === err.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === err.id ? 'تم النسخ' : 'نسخ'}</span>
                </Button>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white font-mono break-words">
                {err.message}
              </p>
              <p className="text-[11px] text-slate-500 font-mono break-words">
                الجهاز: {err.deviceInfo}
              </p>
              {err.stack && (
                <pre className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-[10px] font-mono text-slate-600 dark:text-slate-400 overflow-x-auto max-h-32">
                  {err.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
