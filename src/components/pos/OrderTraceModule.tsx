/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MANAGER ORDER LIFECYCLE TRACE MODULE (Phase 7 - Section 7)
 * Links Order -> KDS Station Tickets -> Payment -> Shift -> Treasury Deposit -> Journal Entry
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  GitBranch,
  Search,
  Receipt,
  Flame,
  CreditCard,
  Vault,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { orderRepository } from '../../repositories/repositories.ts';
import { CustomerOrder } from '../../domain/qrMenuTypes.ts';
import { shiftTreasuryService, ShiftRecord } from '../../services/shiftTreasuryService.ts';
import { domainEvents, DomainEvent } from '../../events/domainEvents.ts';
import { formatMoney } from '../../utils/formatters.ts';

export const OrderTraceModule: React.FC<{
  onNavigate?: (view: string) => void;
}> = ({ onNavigate }) => {
  const { currentEstablishment } = useAuth();
  const { language } = useI18n();
  const isAr = language === 'ar';
  const estId = currentEstablishment?.id || 'default';
  const currency = currentEstablishment?.currency || 'EGP';

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [events, setEvents] = useState<DomainEvent[]>([]);
  const [query, setQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const loadData = () => {
    const allOrders = orderRepository.getAllSync(estId, false);
    const sorted = [...allOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setOrders(sorted);
    setShifts(shiftTreasuryService.getAllShifts(estId));
    setEvents(domainEvents.getRecentEvents(estId));
    if (!selectedOrderId && sorted.length > 0) {
      setSelectedOrderId(sorted[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = domainEvents.subscribe('*', loadData);
    return () => unsub();
  }, [estId]);

  const filteredOrders = orders.filter((o) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      o.serialNumber.toLowerCase().includes(q) ||
      (o.customerPhone && o.customerPhone.toLowerCase().includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q)) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(q))
    );
  });

  const selectedOrder =
    filteredOrders.find((o) => o.id === selectedOrderId) || filteredOrders[0] || null;

  const linkedShift = selectedOrder?.shiftId
    ? shifts.find((s) => s.id === selectedOrder.shiftId) || null
    : null;

  const orderEvents = selectedOrder
    ? events.filter((e) => e.entityId === selectedOrder.id || e.payload?.orderId === selectedOrder.id)
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-cyan-500" />
            <span>{isAr ? 'تتبّع دورة الطلب الكاملة' : 'Order Lifecycle Trace'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'ربط الفاتورة بتذاكر المطبخ، التحصيل، الوردية، توريد الخزينة، والقيد المحاسبي'
              : 'Trace Order -> KDS Tickets -> Payment -> Shift -> Treasury -> Journal Entry'}
          </p>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isAr ? 'بحث برقم الفاتورة، الهاتف، الطاولة...' : 'Search serial, phone, table...'}
            className="w-full ps-9 pe-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
          />
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-400">
          {isAr ? 'لا توجد طلبات مطابقة للبحث' : 'No matching orders found'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Orders List */}
          <div className="lg:col-span-4 space-y-2 max-h-[600px] overflow-y-auto pe-1">
            {filteredOrders.map((ord) => {
              const isSelected = selectedOrder?.id === ord.id;
              return (
                <Button
                  key={ord.id}
                  type="button"
                  variant={isSelected ? 'primary' : 'outline'}
                  selected={isSelected}
                  onClick={() => setSelectedOrderId(ord.id)}
                  className="w-full justify-between text-start p-3 rounded-2xl"
                >
                  <div>
                    <div className="font-mono text-sm font-black">{ord.serialNumber}</div>
                    <div className="text-[11px] opacity-80">
                      {ord.serviceType === 'dine_in'
                        ? `${isAr ? 'طاولة' : 'Table'} #${ord.tableNumber || '-'}`
                        : ord.serviceType}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="font-mono text-xs font-black">
                      {formatMoney(ord.totalAmount, currency, language)}
                    </div>
                    <div className="text-[10px] uppercase font-bold opacity-75">{ord.status}</div>
                  </div>
                </Button>
              );
            })}
          </div>

          {/* Lifecycle Trace Details */}
          {selectedOrder && (
            <div className="lg:col-span-8 space-y-4">
              {/* Step 1: Order & Payment */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-white">
                    <Receipt className="w-4 h-4 text-cyan-500" />
                    <span>
                      {isAr
                        ? `1. الطلب والفاتورة (${selectedOrder.serialNumber})`
                        : `1. Order & Invoice (${selectedOrder.serialNumber})`}
                    </span>
                  </h3>
                  {onNavigate && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onNavigate('pos')}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'الكاشير' : 'POS'}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الحالة' : 'Status'}</span>
                    <strong className="uppercase">{selectedOrder.status}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'المصدر' : 'Source'}</span>
                    <strong>{selectedOrder.source}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'الإجمالي' : 'Total'}</span>
                    <strong className="font-mono">
                      {formatMoney(selectedOrder.totalAmount, currency, language)}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'طريقة الدفع' : 'Payment'}</span>
                    <strong className="uppercase">{selectedOrder.paymentMethod || '-'}</strong>
                  </div>
                </div>
              </div>

              {/* Step 2: KDS Stations */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-white">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>{isAr ? '2. محطات التحضير (KDS)' : '2. Prep Stations (KDS)'}</span>
                  </h3>
                  {onNavigate && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onNavigate('kds')}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'شاشة المطبخ' : 'KDS'}
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedOrder.stationStatuses &&
                  Object.keys(selectedOrder.stationStatuses).length > 0 ? (
                    Object.entries(selectedOrder.stationStatuses).map(([st, status]) => (
                      <div
                        key={st}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-2"
                      >
                        <span className="uppercase">{st}</span>
                        <span className="text-cyan-600 dark:text-cyan-400">({status})</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      {isAr ? 'لم يُرسل للمحطات بعد' : 'Not sent to stations yet'}
                    </span>
                  )}
                </div>
              </div>

              {/* Step 3: Shift & Treasury */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-white">
                    <Vault className="w-4 h-4 text-emerald-500" />
                    <span>{isAr ? '3. الوردية وتوريد الخزينة' : '3. Shift & Treasury Handover'}</span>
                  </h3>
                  {onNavigate && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onNavigate('treasury')}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'الخزينة' : 'Treasury'}
                    </Button>
                  )}
                </div>

                {linkedShift ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <span className="text-[10px] text-slate-400 block">
                        {isAr ? 'رقم تقرير Z' : 'Z-Report #'}
                      </span>
                      <strong className="font-mono text-cyan-600">{linkedShift.zReportNumber}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'الكاشير' : 'Cashier'}</span>
                      <strong>{linkedShift.cashierName}</strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <span className="text-[10px] text-slate-400 block">
                        {isAr ? 'إيصال الخزينة' : 'Treasury Receipt'}
                      </span>
                      <strong className="font-mono text-emerald-600">
                        {linkedShift.treasuryReceiptNumber ||
                          (isAr ? 'لم يُورّد بعد' : 'Pending Deposit')}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    {isAr ? 'غير مرتبط بوردية' : 'No linked shift'}
                  </div>
                )}
              </div>

              {/* Step 4: Accounting Journal & Events */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black flex items-center gap-2 text-slate-900 dark:text-white">
                    <BookOpen className="w-4 h-4 text-indigo-500" />
                    <span>{isAr ? '4. القيد المحاسبي وسجل الأحداث' : '4. Journal Entry & Event Log'}</span>
                  </h3>
                  {onNavigate && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onNavigate('accounting')}
                      icon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'المحاسبة' : 'Accounting'}
                    </Button>
                  )}
                </div>

                <div className="text-xs">
                  <span className="text-slate-400">{isAr ? 'مرجع القيد:' : 'Journal Ref:'} </span>
                  <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                    {selectedOrder.journalEntryId || '-'}
                  </strong>
                </div>

                {orderEvents.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {orderEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg"
                      >
                        <span className="font-mono font-bold text-cyan-600">{ev.type}</span>
                        <span className="text-slate-400 font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
