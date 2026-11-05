/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CASHIER INCOMING CUSTOMER ORDERS PANEL (Phase 5)
 * Real-time reception of QR menu orders with audible chime, approval & serial assignment,
 * item adjustments, rejection reasons, and instant KDS station dispatch.
 */

import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  MapPin,
  UtensilsCrossed,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { CustomerOrder, CustomerOrderItem, PREP_STATIONS } from '../../domain/qrMenuTypes.ts';
import { orderTransport } from '../../services/orderTransport.ts';
import { dataService } from '../../services/dataService.ts';
import { printerService } from '../../services/printerService.ts';
import { customerService } from '../../services/customerService.ts';

interface IncomingOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderApprovedToPos?: (order: CustomerOrder) => void;
}

export const IncomingOrdersDrawer: React.FC<IncomingOrdersDrawerProps> = ({
  isOpen,
  onClose,
  onOrderApprovedToPos,
}) => {
  const { currentEstablishment, currentUser } = useAuth();
  const { language } = useI18n();
  const isAr = language === 'ar';
  const estId = currentEstablishment?.id || 'default';

  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'stations'>('pending');
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [driverInputs, setDriverInputs] = useState<Record<string, { name: string; phone: string }>>({});

  // Load and subscribe
  useEffect(() => {
    const load = () => {
      const list = orderTransport.getOrders(estId);
      setOrders(list);
    };
    load();

    const unsubscribe = orderTransport.subscribe((event) => {
      load();
      if (event.type === 'ORDER_SUBMITTED' && audioEnabled) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
          osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        } catch {
          // audio context
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [estId, audioEnabled]);

  const pendingOrders = orders.filter((o) => o.status === 'pending_approval');
  const activeStationOrders = orders.filter(
    (o) =>
      o.status === 'approved' ||
      o.status === 'preparing' ||
      o.status === 'ready' ||
      o.status === 'out_for_delivery'
  );

  // Approve Order: Generates Serial #, links CRM customer, updates status, dispatches to KDS & POS
  const handleApprove = async (order: CustomerOrder) => {
    const serialNumber = await dataService.getNextOrderSerialNumber(estId);

    let linkedCustomerId = order.customerId;
    if (order.customerPhone && order.customerPhone.trim()) {
      const linked = await customerService.findOrCreateByPhone(estId, {
        name: order.customerName || 'عميل منيو QR',
        phone: order.customerPhone,
        addressDescription: order.deliveryAddress,
        deliveryNotes: order.deliveryNotes,
        orderTotal: order.totalAmount,
        pointsEarned: Math.floor(order.subtotal),
      });
      linkedCustomerId = linked.id;
    }

    const stationStatuses: any = {};
    order.items.forEach((it) => {
      stationStatuses[it.station] = 'pending';
    });

    const updated = await orderTransport.updateOrderStatus(estId, order.id, 'approved', {
      serialNumber,
      customerId: linkedCustomerId,
      stationStatuses,
      approvedAt: new Date().toISOString(),
    });

    if (updated) {
      await dataService.logAudit(
        estId,
        'ORDER_APPROVED',
        `اعتماد طلب العميل ${serialNumber} بقيمة $${order.totalAmount}`,
        'CUSTOMER_QR_ORDER',
        currentUser?.fullName || currentUser?.username || 'Cashier',
        currentUser?.role || 'cashier'
      );

      if (onOrderApprovedToPos) {
        onOrderApprovedToPos(updated);
      }
    }
  };

  const handleDispatchDelivery = async (order: CustomerOrder) => {
    const drv = driverInputs[order.id] || {
      name: order.driverName || 'سائق التوصيل',
      phone: order.driverPhone || '',
    };
    await orderTransport.updateOrderStatus(estId, order.id, 'out_for_delivery', {
      driverName: drv.name.trim() || 'سائق التوصيل',
      driverPhone: drv.phone.trim(),
    });
  };

  const handleSettleDriverCash = async (order: CustomerOrder) => {
    await orderTransport.updateOrderStatus(estId, order.id, 'completed', {
      driverCashSettled: true,
    });
  };

  // Reject Order
  const handleReject = async (orderId: string) => {
    if (!rejectReason.trim()) return;

    await orderTransport.updateOrderStatus(estId, orderId, 'rejected', {
      rejectionReason: rejectReason.trim(),
    });

    await dataService.logAudit(
      estId,
      'ORDER_REJECTED',
      `رفض طلب العميل بسبب: ${rejectReason}`,
      'CUSTOMER_QR_ORDER',
      currentUser?.fullName || currentUser?.username || 'Cashier',
      currentUser?.role || 'cashier'
    );

    setRejectingOrderId(null);
    setRejectReason('');
  };

  // Adjust item quantity
  const handleAdjustQuantity = async (order: CustomerOrder, productId: string, delta: number) => {
    const updatedItems = order.items
      .map((it) => {
        if (it.productId === productId) {
          const newQty = it.quantity + delta;
          return newQty > 0 ? { ...it, quantity: newQty } : null;
        }
        return it;
      })
      .filter(Boolean) as CustomerOrderItem[];

    const subtotal = updatedItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const taxAmount = (subtotal * 14) / 100;
    const totalAmount = subtotal + taxAmount;

    await orderTransport.updateOrderStatus(estId, order.id, order.status, {
      items: updatedItems,
      subtotal,
      taxAmount,
      totalAmount,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/70 backdrop-blur-xs animate-fade-in font-sans">
      <div className="w-full sm:w-[480px] h-full bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-500 animate-bounce" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {isAr ? 'طلبات العملاء الواردة من منيو الـ QR' : 'Incoming Customer QR Orders'}
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950">
              {pendingOrders.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              title={isAr ? 'كتم/تشغيل التنبيه' : 'Toggle audio'}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs: Pending Approval vs Live Station Tracking */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-slate-50 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>{isAr ? 'بانتظار الاعتماد' : 'Pending Approval'}</span>
            <span className="font-mono px-1.5 py-0.2 rounded-full bg-slate-950/20 text-[10px]">
              {pendingOrders.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stations')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'stations'
                ? 'bg-cyan-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <span>{isAr ? 'متابعة المحطات الحية' : 'Station Status'}</span>
            <span className="font-mono px-1.5 py-0.2 rounded-full bg-slate-950/20 text-[10px]">
              {activeStationOrders.length}
            </span>
          </button>
        </div>

        {/* Orders Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {activeTab === 'stations' ? (
            activeStationOrders.length === 0 ? (
              <div className="text-center py-24 space-y-3">
                <Clock className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'لا توجد طلبات قيد التحضير في المحطات حالياً' : 'No active orders in kitchen stations'}
                </h3>
              </div>
            ) : (
              activeStationOrders.map((order) => {
                const stationEntries = Object.entries(order.stationStatuses || {});
                const readyStations = stationEntries
                  .filter(([, st]) => st === 'ready')
                  .map(([k]) => PREP_STATIONS.find((p) => p.id === k)?.[isAr ? 'labelAr' : 'labelEn'] || k);
                const laggingStations = stationEntries
                  .filter(([, st]) => st !== 'ready')
                  .map(([k]) => PREP_STATIONS.find((p) => p.id === k)?.[isAr ? 'labelAr' : 'labelEn'] || k);
                const hasLaggingStation = readyStations.length > 0 && laggingStations.length > 0;

                return (
                  <div
                    key={order.id}
                    className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 space-y-3 ${
                      hasLaggingStation
                        ? 'border-amber-500 shadow-lg shadow-amber-500/10'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-cyan-600 dark:text-cyan-400" dir="ltr">
                          {order.serialNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {order.customerName}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {order.tableNumber ? (isAr ? `طاولة #${order.tableNumber}` : `Table #${order.tableNumber}`) : order.serviceType}
                      </span>
                    </div>

                    {/* Lagging Station Alert Banner */}
                    {hasLaggingStation && (
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                        <span>
                          {isAr
                            ? `تنبيه تأخر محطة: (${readyStations.join('، ')}) جاهز بينما (${laggingStations.join('، ')}) لا يزال قيد التحضير!`
                            : `Station Lag Alert: (${readyStations.join(', ')}) ready while (${laggingStations.join(', ')}) is still preparing!`}
                        </span>
                      </div>
                    )}

                    {/* Per-Station Status Pills */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 block">
                        {isAr ? 'حالة محطات التحضير:' : 'Preparation Stations:'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stationEntries.map(([stKey, stVal]) => {
                          const stMeta = PREP_STATIONS.find((p) => p.id === stKey);
                          const label = stMeta ? (isAr ? stMeta.labelAr : stMeta.labelEn) : stKey;
                          return (
                            <div
                              key={stKey}
                              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                            >
                              <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{label}</span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                  stVal === 'ready'
                                    ? 'bg-emerald-500/20 text-emerald-500'
                                    : stVal === 'preparing'
                                    ? 'bg-amber-500/20 text-amber-500'
                                    : 'bg-slate-500/20 text-slate-400'
                                }`}
                              >
                                {stVal === 'ready'
                                  ? (isAr ? 'جاهز ✓' : 'Ready ✓')
                                  : stVal === 'preparing'
                                  ? (isAr ? 'قيد التحضير' : 'Preparing')
                                  : (isAr ? 'قيد الانتظار' : 'Pending')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery Driver Assignment & Cash Settlement */}
                    {order.serviceType === 'delivery' && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold text-slate-500">
                          {isAr ? 'إدارة سائق التوصيل والتحصيل:' : 'Delivery Driver & Cash Settlement:'}
                        </div>
                        {order.status === 'out_for_delivery' ? (
                          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs">
                            <div>
                              <div className="font-bold text-cyan-700 dark:text-cyan-300">
                                {isAr ? 'خرج للتوصيل مع:' : 'Out for delivery with:'}{' '}
                                {order.driverName || 'سائق التوصيل'}
                              </div>
                              {order.driverPhone && (
                                <div className="text-[11px] font-mono text-slate-500">
                                  {order.driverPhone}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSettleDriverCash(order)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shrink-0"
                            >
                              {isAr ? 'تسوية نقدية للسائق ✓' : 'Settle Driver Cash ✓'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              value={driverInputs[order.id]?.name || ''}
                              onChange={(e) =>
                                setDriverInputs((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    name: e.target.value,
                                    phone: prev[order.id]?.phone || '',
                                  },
                                }))
                              }
                              placeholder={isAr ? 'اسم السائق...' : 'Driver name...'}
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                            />
                            <input
                              type="text"
                              value={driverInputs[order.id]?.phone || ''}
                              onChange={(e) =>
                                setDriverInputs((prev) => ({
                                  ...prev,
                                  [order.id]: {
                                    name: prev[order.id]?.name || '',
                                    phone: e.target.value,
                                  },
                                }))
                              }
                              placeholder={isAr ? 'هاتف السائق...' : 'Driver phone...'}
                              className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => handleDispatchDelivery(order)}
                              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer shrink-0"
                            >
                              {isAr ? 'خرج للتوصيل' : 'Out for Delivery'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <UtensilsCrossed className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {isAr ? 'لا توجد طلبات معلقة بانتظار الاعتماد' : 'No pending orders'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'سيصلك إشعار صوتي فوري بمجرد إرسال العميل لطلبه من المنيو' : 'Incoming orders will ring and appear here in real-time'}
              </p>
            </div>
          ) : (
            pendingOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-cyan-500/50 shadow-lg space-y-3 animate-scale-in"
              >
                {/* Order Top Bar: Service Type & Time */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase px-2 py-0.5 rounded-md bg-cyan-500 text-slate-950">
                      {order.serviceType === 'dine_in'
                        ? (isAr ? `صالة · طاولة #${order.tableNumber || '-'}` : `Dine-in #${order.tableNumber}`)
                        : order.serviceType === 'delivery'
                        ? (isAr ? 'دليفري توصيل' : 'Delivery')
                        : (isAr ? 'تيك أواي استلام' : 'Takeaway')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{order.customerName}</span>
                    {order.customerPhone && (
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1 font-mono hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{order.customerPhone}</span>
                      </a>
                    )}
                  </div>
                  {order.deliveryAddress && (
                    <div className="flex items-start gap-1 text-[11px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{order.deliveryAddress}</span>
                    </div>
                  )}
                  {order.deliveryNotes && (
                    <div className="text-[10px] text-amber-500 italic">
                      ★ {order.deliveryNotes}
                    </div>
                  )}
                </div>

                {/* Order Items Breakdown */}
                <div className="space-y-1.5 py-2 border-y border-slate-200 dark:border-slate-800">
                  {order.items.map((it) => (
                    <div key={it.productId} className="flex items-center justify-between text-xs">
                      <div className="min-w-0 pe-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{isAr ? it.nameAr : it.nameEn}</span>
                        {it.notes && (
                          <span className="block text-[10px] text-amber-500">★ {it.notes}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                          x {it.quantity} (${(it.price * it.quantity).toFixed(2)})
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                    <span>{isAr ? 'الإجمالي المطلوب:' : 'Total Payable:'}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Rejection Input Box if open */}
                {rejectingOrderId === order.id ? (
                  <div className="space-y-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 animate-fade-in">
                    <label className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">
                      {isAr ? 'سبب الرفض (يظهر للعميل فوراً):' : 'Rejection Reason (Visible to Customer):'}
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={isAr ? 'مثال: الصنف نفد، أو المطبخ مشغول...' : 'e.g. Item sold out...'}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-xs text-slate-900 dark:text-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRejectingOrderId(null)}
                        className="px-2.5 py-1 text-xs text-slate-500"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(order.id)}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                      >
                        {isAr ? 'تأكيد الرفض' : 'Confirm Decline'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons: Approve vs Decline */
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setRejectingOrderId(order.id)}
                      className="py-2.5 px-3 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isAr ? 'رفض الطلب' : 'Decline'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(order)}
                      className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isAr ? 'موافقة وتوزيع للمطبخ' : 'Approve & Route'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info notice */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 text-center bg-slate-50 dark:bg-slate-950">
          <span>{isAr ? 'التجربة الحالية تعمل داخل نفس المتصفح وتزامن لحظياً بين التبويبات' : 'Real-time cross-tab synchronization active'}</span>
        </div>
      </div>
    </div>
  );
};
