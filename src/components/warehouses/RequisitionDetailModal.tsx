/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * REQUISITION DETAIL & LIFECYCLE MODAL (تفاصيل الطلبية والدورة المخزنية) (Package 2 - Section 4)
 *
 * Lifecycle:
 * 1. Draft / Submitted (كاتب الطلبية مع التوقيع التلقائي)
 * 2. Approved (موافقة أمين المخزن وتعديل الكميات)
 * 3. Dispatched («تم الصرف» -> تخرج من المخزن وتصبح «في الطريق»)
 * 4. Received / Partially Received (استلام الشيف مع تحديد أسباب عدم الاستلام للبند المرفوض)
 * 5. Official printable requisition with 3 signatures (الكاتب، الصارف، المستلم).
 */

import React, { useState } from 'react';
import { ModalShell } from '../common/ModalShell.tsx';
import { Button } from '../common/Button.tsx';
import { NumericInput } from '../common/NumericInput.tsx';
import {
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  XCircle,
  UserCheck,
  Building,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import {
  warehouseService,
  RequisitionOrder,
  RequisitionStatus,
} from '../../services/warehouseService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface RequisitionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: RequisitionOrder | null;
  onRequisitionUpdated: (updated: RequisitionOrder) => void;
  establishmentId?: string;
}

export const RequisitionDetailModal: React.FC<RequisitionDetailModalProps> = ({
  isOpen,
  onClose,
  requisition,
  onRequisitionUpdated,
  establishmentId = 'default',
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { formatNumber } = useI18n();

  const [receiptState, setReceiptState] = useState<
    Record<string, { received: boolean; rejectionReason: string }>
  >({});
  const [lineEdits, setLineEdits] = useState<
    Record<string, { approvedQty: number; notes: string }>
  >({});
  const [storekeeperNotes, setStorekeeperNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !requisition) return null;

  const role = currentUser?.role || 'head_chef';
  const isStorekeeper =
    role === 'storekeeper' ||
    role === 'warehouse_manager' ||
    role === 'store_manager' ||
    role === 'tenant_admin' ||
    role === 'general_manager';

  const isChef =
    role === 'head_chef' ||
    role === 'section_manager' ||
    role === 'kitchen_manager' ||
    role === 'bar_manager' ||
    role === 'tenant_admin' ||
    role === 'general_manager';

  // Handle Dispatch by Storekeeper (Applies any line quantity/notes edits first)
  const handleDispatch = () => {
    setIsSubmitting(true);
    try {
      // 1. If any line quantities or notes were modified by storekeeper, save approval first
      const hasEdits = Object.keys(lineEdits).length > 0;
      if (hasEdits) {
        const approvedLines = requisition.lines.map((l) => ({
          lineId: l.id,
          approvedQuantityBase: lineEdits[l.id]?.approvedQty !== undefined
            ? Number(lineEdits[l.id].approvedQty)
            : l.approvedQuantityBase || l.requestedQuantityBase,
          notes: lineEdits[l.id]?.notes !== undefined ? lineEdits[l.id].notes : l.notes,
        }));
        warehouseService.approveRequisition(
          establishmentId,
          requisition.id,
          approvedLines,
          storekeeperNotes,
          currentUser?.fullName || 'أمين المخزن'
        );
      }

      // 2. Dispatch
      const updated = warehouseService.dispatchRequisition(
        establishmentId,
        requisition.id,
        currentUser?.fullName || 'أمين المخزن',
        currentUser?.id || 'usr-storekeeper'
      );
      onRequisitionUpdated(updated);
      showToast({ title: `تم صرف الطلبية #${requisition.requisitionNumber} بنجاح، وأصبحت «في الطريق» للقسم ✓`, type: 'success' });
    } catch (err: any) {
      showToast({ title: err.message || 'حدث خطأ أثناء الصرف', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Receipt Confirmation by Chef
  const handleConfirmReceipt = () => {
    setIsSubmitting(true);
    try {
      const receiptLines = requisition.lines.map((l) => {
        const state = receiptState[l.id];
        const isReceived = state ? state.received : true;
        const dispatchedQty = l.dispatchedQuantityBase || l.requestedQuantityBase;

        return {
          lineId: l.id,
          receivedQuantityBase: isReceived ? dispatchedQty : 0,
          rejectedQuantityBase: isReceived ? 0 : dispatchedQty,
          rejectionReason: !isReceived ? state?.rejectionReason || 'غير مطابق' : undefined,
        };
      });

      const updated = warehouseService.receiveRequisition(
        establishmentId,
        requisition.id,
        receiptLines,
        currentUser?.fullName || 'الشيف المستلم',
        currentUser?.id || 'usr-chef'
      );
      onRequisitionUpdated(updated);
      showToast({ title: `تم توثيق استلام الطلبية #${requisition.requisitionNumber} ✓`, type: 'success' });
    } catch (err: any) {
      showToast({ title: err.message || 'حدث خطأ أثناء تأكيد الاستلام', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: RequisitionStatus) => {
    switch (status) {
      case 'submitted':
        return { label: 'مُرسلة (في انتظار الصرف)', bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' };
      case 'approved':
        return { label: 'موافق عليها', bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' };
      case 'dispatched':
        return { label: 'تم الصرف (في الطريق)', bg: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' };
      case 'received':
        return { label: 'تم الاستلام بالكامل ✓', bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' };
      case 'partially_received':
        return { label: 'استلام جزئي (يوجد مرتجع)', bg: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' };
      default:
        return { label: requisition.statusNameAr, bg: 'bg-slate-100 text-slate-700' };
    }
  };

  const statusBadge = getStatusBadge(requisition.status);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`طلبية داخلية: ${requisition.requisitionNumber}`}
      subtitle={`من: ${requisition.sourceWarehouseNameAr} ← إلى: ${requisition.targetWarehouseNameAr}`}
      size="4xl"
      headerExtra={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="gap-1.5 font-bold"
        >
          <Printer className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span>طباعة الطلبية</span>
        </Button>
      }
    >
      <div className="space-y-5 p-4 sm:p-6 overflow-y-auto">
        {/* 1. Header Information Bar */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-slate-900 dark:text-white">
                {requisition.requisitionNumber}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge.bg}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              تاريخ الإنشاء: {new Date(requisition.createdAt).toLocaleString('ar-EG')}
            </p>
          </div>

          <div className="text-xs text-end">
            <span className="text-slate-500">مسار التحويل:</span>
            <div className="font-bold text-slate-900 dark:text-white mt-0.5">
              {requisition.sourceWarehouseNameAr} ← {requisition.targetWarehouseNameAr}
            </div>
          </div>
        </div>

        {/* 2. Official Signatures Section (3 Signatures) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Author Signature */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <UserCheck className="w-4 h-4 text-cyan-500" />
              <span>كاتب الطلبية (توقيع تلقائي)</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {requisition.createdByUserName}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {new Date(requisition.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Storekeeper Signature */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Truck className="w-4 h-4 text-amber-500" />
              <span>أمين المخزن (الصارف)</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {requisition.dispatchedByUserName || '— لم تُصرف بعد —'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {requisition.dispatchedAt ? new Date(requisition.dispatchedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'قيد الانتظار'}
            </div>
          </div>

          {/* Recipient Signature */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>المستلم بالقسم (الشيف)</span>
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {requisition.receivedByUserName || '— لم تُستلم بعد —'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              {requisition.receivedAt ? new Date(requisition.receivedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'قيد الانتظار'}
            </div>
          </div>
        </div>

        {/* 3. Items Lines Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 text-start">الخامة والقسم</th>
                  <th className="py-2.5 px-3 text-end">الرصيد عند الطالب</th>
                  <th className="py-2.5 px-3 text-end">الكمية المطلوبة</th>
                  <th className="py-2.5 px-3 text-end">الكمية المصروفة</th>
                  <th className="py-2.5 px-3 text-center">حالة الاستلام</th>
                  <th className="py-2.5 px-3 text-start">ملاحظات وسبب الرفض</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {requisition.lines.map((line) => {
                  const isDispatched = requisition.status === 'dispatched';
                  const currentLineReceipt = receiptState[line.id] || { received: true, rejectionReason: '' };

                  return (
                    <tr key={line.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{line.materialNameAr}</div>
                        <div className="text-[10px] text-slate-400">{line.categoryAr}</div>
                      </td>

                      <td className="py-3 px-3 text-end font-mono text-slate-500">
                        {formatNumber(line.currentStockAtSectionBase)}
                      </td>

                      <td className="py-3 px-3 text-end">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {line.requestedQuantity} {line.requestedUnitName}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ({formatNumber(line.requestedQuantityBase)} أساسي)
                        </div>
                      </td>

                      <td className="py-3 px-3 text-end font-mono">
                        {isSubmitted && isStorekeeper ? (
                          <div className="flex flex-col items-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              defaultValue={line.approvedQuantityBase || line.requestedQuantityBase}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setLineEdits((prev) => ({
                                  ...prev,
                                  [line.id]: {
                                    approvedQty: val,
                                    notes: prev[line.id]?.notes || line.notes || '',
                                  },
                                }));
                              }}
                              className="w-24 px-2 py-1 text-xs text-end font-mono rounded border border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-200"
                            />
                            <span className="text-[10px] text-slate-400">أساسي</span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-cyan-600 dark:text-cyan-400">
                              {line.dispatchedQuantityBase
                                ? formatNumber(line.dispatchedQuantityBase)
                                : line.approvedQuantityBase
                                ? formatNumber(line.approvedQuantityBase)
                                : '—'}
                            </span>
                            {line.approvedQuantityBase &&
                              line.approvedQuantityBase !== line.requestedQuantityBase && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                  (عدّلها أمين المخزن)
                                </div>
                              )}
                          </div>
                        )}
                      </td>

                      {/* Interactive Receipt Checkbox for Chef if in dispatched state */}
                      <td className="py-3 px-3 text-center">
                        {isDispatched && isChef ? (
                          <div className="flex items-center justify-center gap-2">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`receipt-${line.id}`}
                                checked={currentLineReceipt.received}
                                onChange={() =>
                                  setReceiptState((prev) => ({
                                    ...prev,
                                    [line.id]: { received: true, rejectionReason: '' },
                                  }))
                                }
                                className="w-4 h-4 text-emerald-600 rounded"
                              />
                              <span className="text-[11px] font-bold text-emerald-600">استلمت</span>
                            </label>

                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`receipt-${line.id}`}
                                checked={!currentLineReceipt.received}
                                onChange={() =>
                                  setReceiptState((prev) => ({
                                    ...prev,
                                    [line.id]: { received: false, rejectionReason: 'تالف أو غير مطابق' },
                                  }))
                                }
                                className="w-4 h-4 text-rose-600 rounded"
                              />
                              <span className="text-[11px] font-bold text-rose-600">أرفض</span>
                            </label>
                          </div>
                        ) : (
                          <div>
                            {line.lineStatus === 'received' && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                                تم الاستلام بالقسم
                              </span>
                            )}
                            {line.lineStatus === 'rejected' && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-400 font-bold text-[11px]">
                                لم تخرج من المخزن (مرتجع)
                              </span>
                            )}
                            {line.lineStatus === 'dispatched' && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-400 font-bold text-[11px]">
                                في الطريق
                              </span>
                            )}
                            {line.lineStatus === 'pending' && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[11px]">
                                في الانتظار
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isDispatched && !currentLineReceipt.received && isChef ? (
                          <input
                            type="text"
                            placeholder="اكتب سبب عدم الاستلام..."
                            value={currentLineReceipt.rejectionReason}
                            onChange={(e) =>
                              setReceiptState((prev) => ({
                                ...prev,
                                [line.id]: { received: false, rejectionReason: e.target.value },
                              }))
                            }
                            className="w-full px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300"
                          />
                        ) : (
                          <div>
                            {line.rejectionReason && (
                              <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>سبب الرفض: {line.rejectionReason}</span>
                              </div>
                            )}
                            {line.notes && <div className="text-slate-500 text-[11px]">{line.notes}</div>}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Action Bars based on State and Role */}
        {requisition.status === 'submitted' && isStorekeeper && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-amber-800 dark:text-amber-300">
              <span className="font-bold">مراجعة أمين المخزن:</span>
              <p className="mt-0.5">
                بالضغط على «تم الصرف» ستخرج الكميات فوراً من رصيد مخزنك وتصبح بحالة «في الطريق» حتى يؤكد الشيف استلامها.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={handleDispatch}
              disabled={isSubmitting}
              className="gap-1.5 font-bold shrink-0 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Truck className="w-4 h-4" />
              <span>تم الصرف (خروج من المخزن)</span>
            </Button>
          </div>
        )}

        {requisition.status === 'dispatched' && isChef && (
          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-purple-800 dark:text-purple-300">
              <span className="font-bold text-sm">هل قمت بالاستلام؟</span>
              <p className="mt-0.5">
                علّم على البنود التي استلمتها فعلياً، واكتب سبب عدم الاستلام لأي بند ناقص أو تالف ليعود لمخزن أمين المخزن.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmReceipt}
              disabled={isSubmitting}
              className="gap-1.5 font-bold shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تأكيد استلام الطلبية بالقسم</span>
            </Button>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
