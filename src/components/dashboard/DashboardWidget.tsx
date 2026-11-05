/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Percent,
  Receipt,
  Award,
  BedDouble,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { orderTransport } from '../../services/orderTransport.ts';
import { CustomerOrder } from '../../domain/qrMenuTypes.ts';

export const DashboardWidget: React.FC = () => {
  const { currentEstablishment, setActiveView } = useAuth();
  const { menuProducts } = useBusiness();
  const { language, formatMoney, formatNumber } = useI18n();
  const isAr = language === 'ar';

  const estId = currentEstablishment?.id || 'est-1';
  const [liveOrders, setLiveOrders] = useState<CustomerOrder[]>(() =>
    orderTransport.getOrders(estId)
  );

  useEffect(() => {
    setLiveOrders(orderTransport.getOrders(estId));
    const unsubscribe = orderTransport.subscribe((event) => {
      if (event.order.establishmentId === estId) {
        setLiveOrders(orderTransport.getOrders(estId));
      }
    });
    return unsubscribe;
  }, [estId]);

  const validOrders = liveOrders.filter((o) => o.status !== 'rejected');
  const hasLiveOrders = validOrders.length > 0;

  // 1. Today's Revenue (from live orders if available, else illustrative baseline)
  const todayRevenue = hasLiveOrders
    ? validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    : 4680.5;

  // 2. Average Check
  const averageCheck = hasLiveOrders
    ? todayRevenue / validOrders.length
    : 36.56;

  // 3. Food Cost % (computed from active menuProducts in context)
  const activeProducts = menuProducts.filter((p) => p.isActive);
  const avgFoodCostPct =
    activeProducts.length > 0
      ? activeProducts.reduce((sum, p) => sum + (p.foodCostPercentage || 0), 0) /
        activeProducts.length
      : 31.4;

  // 4. Top Selling Items (ranked by live order quantity if present, else by margin/price from context)
  const itemCounts: Record<string, number> = {};
  validOrders.forEach((o) => {
    o.items.forEach((it) => {
      itemCounts[it.productId] = (itemCounts[it.productId] || 0) + it.quantity;
    });
  });

  const topItems = [...activeProducts]
    .sort((a, b) => {
      const countDiff = (itemCounts[b.id] || 0) - (itemCounts[a.id] || 0);
      if (countDiff !== 0) return countDiff;
      return b.sellingPrice - a.sellingPrice;
    })
    .slice(0, 4);

  // 5. Hotel Occupancy % — ONLY shown for hotels, resorts, and tourist villages
  const isHospitalityLodging =
    currentEstablishment?.businessType === 'hotel' ||
    currentEstablishment?.businessType === 'resort' ||
    currentEstablishment?.businessType === 'tourist_village';

  const hotelOccupancyPct = 78.5;

  return (
    <section
      aria-label={isAr ? 'مؤشرات الأداء السريعة' : 'Executive KPI Widget'}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isAr ? 'ملخص الأداء التشغيلي المباشر' : 'Live Operational Performance Summary'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAr
              ? 'مؤشرات الإيراد، تكلفة الطعام، ومتوسط الفاتورة محدثة من سياق المنشأة'
              : 'Revenue, food cost, and average check metrics synced from establishment context'}
          </p>
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {hasLiveOrders
            ? isAr
              ? `بيانات حية (${formatNumber(validOrders.length)} طلب)`
              : `Live Data (${formatNumber(validOrders.length)} orders)`
            : isAr
              ? 'بيانات توضيحية'
              : 'Illustrative Data'}
        </span>
      </div>

      {/* KPI Metrics Grid */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 ${
          isHospitalityLodging ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        } gap-4`}
      >
        {/* Today's Revenue */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'إيراد اليوم' : "Today's Revenue"}</span>
            <DollarSign className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div
            className="text-2xl font-bold mt-2 font-mono tabular-nums text-slate-900 dark:text-white"
            dir="ltr"
          >
            {formatMoney(todayRevenue)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {hasLiveOrders
              ? isAr
                ? 'من الطلبات المعتمدة اليوم'
                : 'From today’s active orders'
              : isAr
                ? 'بيانات توضيحية قابلة للتغيير'
                : 'Illustrative sample figure'}
          </div>
        </div>

        {/* Food Cost % */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'نسبة تكلفة الطعام' : 'Food Cost %'}</span>
            <Percent className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div
            className="text-2xl font-bold mt-2 font-mono tabular-nums text-slate-900 dark:text-white"
            dir="ltr"
          >
            {avgFoodCostPct.toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? `متوسط ${formatNumber(activeProducts.length)} صنف نشط`
              : `Across ${formatNumber(activeProducts.length)} active items`}
          </div>
        </div>

        {/* Average Check */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'متوسط الفاتورة' : 'Average Check'}</span>
            <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div
            className="text-2xl font-bold mt-2 font-mono tabular-nums text-slate-900 dark:text-white"
            dir="ltr"
          >
            {formatMoney(averageCheck)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr ? 'متوسط قيمة الطلب الواحد' : 'Average revenue per order'}
          </div>
        </div>

        {/* Hotel Occupancy % — Strictly for Hotels / Resorts / Tourist Villages */}
        {isHospitalityLodging && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'نسبة الإشغال الفندقي' : 'Hotel Occupancy %'}</span>
              <BedDouble className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div
              className="text-2xl font-bold mt-2 font-mono tabular-nums text-slate-900 dark:text-white"
              dir="ltr"
            >
              {hotelOccupancyPct.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {isAr ? 'إشغال الغرف والأجنحة · بيانات توضيحية' : 'Room occupancy · Illustrative'}
            </div>
          </div>
        )}
      </div>

      {/* Top Items List */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Award className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>{isAr ? 'أعلى الأصناف أداءً' : 'Top Performing Items'}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('menu')}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            {isAr ? 'إدارة القائمة' : 'Manage Menu'}
          </button>
        </div>

        {topItems.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            {isAr ? 'لا توجد أصناف نشطة مسجلة حالياً.' : 'No active menu items registered yet.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {topItems.map((item, idx) => {
              const soldQty = itemCounts[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono tabular-nums text-slate-400 w-5 shrink-0">
                      0{idx + 1}.
                    </span>
                    <div className="truncate">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {isAr ? item.nameAr : item.nameEn}
                      </span>
                      <span className="text-slate-400 mx-2">·</span>
                      <span className="text-slate-500 dark:text-slate-400">{item.category}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono tabular-nums">
                    {soldQty > 0 && (
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatNumber(soldQty)} {isAr ? 'طلب' : 'sold'}
                      </span>
                    )}
                    <span className="font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatMoney(item.sellingPrice)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
