/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * KITCHEN DISPLAY SYSTEM (KDS) & STATION ROUTING (Phase 5)
 * Live touch workstation for Kitchen, Bar, Grill, Pastry, and Bakery chefs.
 * Auto-slices orders into station tickets, color-codes prep latency, updates status in real-time,
 * and prints 80mm thermal kitchen tickets.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  Flame,
  Clock,
  Printer,
  CheckCircle2,
  RefreshCw,
  Bell,
  BellOff,
  Filter,
  Check,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import {
  CustomerOrder,
  StationTicket,
  PrepStation,
  PREP_STATIONS,
  splitOrderIntoStationTickets,
} from '../../domain/qrMenuTypes.ts';
import { orderTransport } from '../../services/orderTransport.ts';
import { orderService } from '../../services/orderService.ts';
import { printerService } from '../../services/printerService.ts';
import { SyncStatusIndicator } from '../sync/SyncStatusIndicator.tsx';

export const KitchenDisplaySystem: React.FC = () => {
  const { currentEstablishment } = useAuth();
  const { language } = useI18n();
  const isAr = language === 'ar';
  const estId = currentEstablishment?.id || 'default';

  const [selectedStation, setSelectedStation] = useState<PrepStation | 'all'>('all');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 1. Load initial orders and subscribe to real-time events
  useEffect(() => {
    const list = orderTransport.getOrders(estId);
    setOrders(list);

    const unsubscribe = orderTransport.subscribe((event) => {
      setOrders(orderTransport.getOrders(estId));

      // Play chime if new order received
      if (event.type === 'ORDER_SUBMITTED' && audioEnabled) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        } catch {
          // audio context not allowed without interaction
        }
      }
    });

    const timer = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [estId, audioEnabled]);

  // Slices sent / approved / in-prep orders into station tickets
  const activeTickets = React.useMemo(() => {
    const approvedOrders = orders.filter(
      (o) =>
        o.status === 'sent' ||
        o.status === 'approved' ||
        o.status === 'preparing' ||
        o.status === 'ready'
    );
    const allTickets: StationTicket[] = [];

    for (const ord of approvedOrders) {
      const tickets = splitOrderIntoStationTickets(ord);
      allTickets.push(...tickets);
    }

    return allTickets.filter((t) => {
      if (selectedStation === 'all') return t.station !== 'cashier'; // Default KDS shows production
      return t.station === selectedStation;
    });
  }, [orders, selectedStation]);

  // Update Station Ticket Status
  const handleUpdateStationStatus = async (
    orderId: string,
    station: PrepStation,
    status: 'pending' | 'preparing' | 'ready'
  ) => {
    await orderService.updateStationTicketStatus(estId, orderId, station, status);
    setOrders(orderTransport.getOrders(estId));
  };

  const handlePrint = (ticket: StationTicket) => {
    printerService.printTicket(ticket, currentEstablishment?.name || 'TYGOS RESTAURANT');
  };

  // Helper for elapsed minutes and color
  const getElapsedMinutes = (dateStr: string) => {
    const diffMs = currentTime - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* 1. KDS Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span>{isAr ? 'شاشات محطات المطبخ والتحضير (KDS)' : 'Kitchen Display System (KDS)'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'متابعة حية للطلبات وتوزيعها التلقائي على المطبخ، البار، والمشاوي مع مؤقت زمني وإشعارات'
              : 'Live station ticket flow with elapsed time coloring and real-time status syncing'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SyncStatusIndicator />
          {/* Audio Chime Toggle */}
          <Button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              audioEnabled
                ? 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-400 text-cyan-600 dark:text-cyan-300'
                : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-400'
            }`}
            title={isAr ? 'تفعيل أو كتم جرس التنبيه الصوتي' : 'Toggle audio chime'}
          >
            {audioEnabled ? <Bell className="w-4 h-4 text-cyan-500" /> : <BellOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{audioEnabled ? (isAr ? 'الجرس نشط' : 'Chime On') : (isAr ? 'صامت' : 'Muted')}</span>
          </Button>
        </div>
      </div>

      {/* 2. Station Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <Button
          type="button"
          onClick={() => setSelectedStation('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
            selectedStation === 'all'
              ? 'bg-orange-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          {isAr ? 'كافة محطات الإنتاج' : 'All Production Stations'}
        </Button>

        {PREP_STATIONS.filter((s) => s.id !== 'cashier').map((st) => (
          <Button
            key={st.id}
            type="button"
            onClick={() => setSelectedStation(st.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
              selectedStation === st.id
                ? 'bg-orange-500 text-slate-950 shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            {isAr ? st.labelAr : st.labelEn}
          </Button>
        ))}
      </div>

      {/* 3. Live Station Tickets Grid */}
      {activeTickets.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <UtensilsCrossed className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'لا توجد طلبات جارية في هذه المحطة حالياً' : 'No active tickets in this station'}
          </h3>
          <p className="text-xs text-slate-400">
            {isAr
              ? 'بمجرد موافقة الكاشير على أي طلب قادم من المنيو بالـ QR، ستظهر تذكرته هنا فوراً'
              : 'Approved customer QR orders will slice and appear here automatically'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeTickets.map((ticket) => {
            const elapsed = getElapsedMinutes(ticket.createdAt);
            const isLate = elapsed >= 20;
            const isMedium = elapsed >= 10 && elapsed < 20;
            const isDone = ticket.status === 'ready';

            return (
              <div
                key={ticket.id}
                className={`rounded-2xl border-2 transition-all p-4 flex flex-col justify-between space-y-3 shadow-md ${
                  isDone
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/40 text-slate-800 dark:text-slate-200'
                    : isLate
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-500 shadow-rose-900/20 animate-pulse'
                    : isMedium
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Ticket Header: Serial #, Station Tag & Elapsed Clock */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-lg font-black text-cyan-600 dark:text-cyan-400">
                        {ticket.serialNumber}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {ticket.station}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 text-xs font-mono font-bold ${isLate ? 'text-rose-600 dark:text-rose-400' : isMedium ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsed}m</span>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handlePrint(ticket)}
                        className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                        title={isAr ? 'طباعة التذكرة الحرارية' : 'Print ticket'}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Context Info (Table or Customer) */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 py-1.5 flex items-center justify-between">
                    <span>
                      {ticket.serviceType === 'dine_in'
                        ? (isAr ? `طاولة #${ticket.tableNumber || '-'}` : `Table #${ticket.tableNumber || '-'}`)
                        : ticket.serviceType === 'delivery'
                        ? (isAr ? 'دليفري' : 'Delivery')
                        : (isAr ? 'تيك أواي' : 'Takeaway')}
                    </span>
                    {ticket.customerName && (
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                        {ticket.customerName}
                      </span>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 py-2">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                        <div className="flex justify-between items-baseline font-bold text-xs text-slate-900 dark:text-white">
                          <span>{isAr ? it.nameAr : it.nameEn}</span>
                          <span className="font-mono text-sm text-cyan-600 dark:text-cyan-400 font-black">x {it.quantity}</span>
                        </div>
                        {it.notes && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            ★ {it.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket Actions: Start Prep & Ready */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => handleUpdateStationStatus(ticket.orderId, ticket.station, 'preparing')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      ticket.status === 'preparing'
                        ? 'bg-cyan-500 text-slate-950 font-black'
                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {isAr ? 'بدأ التحضير' : 'In Prep'}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleUpdateStationStatus(ticket.orderId, ticket.station, 'ready')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isDone ? (isAr ? 'جاهز ✓' : 'Ready ✓') : (isAr ? 'اكتمل' : 'Mark Ready')}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
