/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  QrCode,
  Monitor,
  Clock,
  XCircle,
  TrendingDown,
  Utensils,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { orderTransport } from '../../services/orderTransport.ts';
import { CustomerOrder, PrepStation } from '../../domain/qrMenuTypes.ts';

const STATION_LABELS: Record<PrepStation, { ar: string; en: string }> = {
  kitchen: { ar: 'المطبخ الرئيسي', en: 'Main Kitchen' },
  grill: { ar: 'قسم المشويات', en: 'Grill Station' },
  bar: { ar: 'البار والمشروبات', en: 'Bar & Beverages' },
  pastry: { ar: 'الحلويات والمخبز', en: 'Pastry & Bakery' },
  bakery: { ar: 'المخبز والأفران', en: 'Bakery & Ovens' },
  cashier: { ar: 'الكاشير', en: 'Cashier' },
};

export const QrOperationsReport: React.FC = () => {
  const { currentEstablishment } = useAuth();
  const { language, formatMoney, formatNumber } = useI18n();
  const isAr = language === 'ar';

  const estId = currentEstablishment?.id || 'est-1';
  const [orders, setOrders] = useState<CustomerOrder[]>(() =>
    orderTransport.getOrders(estId)
  );

  useEffect(() => {
    setOrders(orderTransport.getOrders(estId));
    const unsubscribe = orderTransport.subscribe((event) => {
      if (event.order.establishmentId === estId) {
        setOrders(orderTransport.getOrders(estId));
      }
    });
    return unsubscribe;
  }, [estId]);

  const hasLiveOrders = orders.length > 0;

  // 1. Sales by Source (POS vs QR Menu)
  const qrOrders = orders.filter((o) => o.source === 'qr_menu' && o.status !== 'rejected');
  const posOrders = orders.filter((o) => (o.source as string) === 'pos' && o.status !== 'rejected');

  const qrSales = hasLiveOrders
    ? qrOrders.reduce((s, o) => s + o.totalAmount, 0)
    : 1845.0;
  const qrCount = hasLiveOrders ? qrOrders.length : 48;

  const posSales = hasLiveOrders
    ? posOrders.reduce((s, o) => s + o.totalAmount, 0)
    : 2835.5;
  const posCount = hasLiveOrders ? posOrders.length : 80;

  const totalSourceSales = qrSales + posSales || 1;

  // 2. Sales by Service Type (dine_in, takeaway, delivery)
  const activeOrders = orders.filter((o) => o.status !== 'rejected');
  const serviceBreakdown = (['dine_in', 'takeaway', 'delivery'] as const).map((type) => {
    const matched = activeOrders.filter((o) => o.serviceType === type);
    const fallback =
      type === 'dine_in'
        ? { count: 74, revenue: 2960.0 }
        : type === 'takeaway'
          ? { count: 32, revenue: 912.5 }
          : { count: 22, revenue: 808.0 };

    const count = hasLiveOrders ? matched.length : fallback.count;
    const revenue = hasLiveOrders
      ? matched.reduce((s, o) => s + o.totalAmount, 0)
      : fallback.revenue;

    return {
      type,
      labelAr:
        type === 'dine_in' ? 'صالة (طاولات)' : type === 'takeaway' ? 'تيك أواي (استلام)' : 'توصيل',
      labelEn:
        type === 'dine_in' ? 'Dine-In (Tables)' : type === 'takeaway' ? 'Takeaway' : 'Delivery',
      icon: type === 'dine_in' ? Utensils : type === 'takeaway' ? ShoppingBag : Truck,
      count,
      revenue,
      avgCheck: count > 0 ? revenue / count : 0,
    };
  });

  // 3. Rejection Rate
  const rejectedCount = hasLiveOrders
    ? orders.filter((o) => o.status === 'rejected').length
    : 3;
  const totalOrdersCount = hasLiveOrders ? orders.length : 131;
  const rejectionRate =
    totalOrdersCount > 0 ? (rejectedCount / totalOrdersCount) * 100 : 0;

  // 4. Average Approval & Prep Time per Station
  const stationMetrics: Array<{
    station: PrepStation;
    avgApprovalMin: number;
    avgPrepMin: number;
    ticketsCount: number;
  }> = [
    { station: 'kitchen', avgApprovalMin: 1.4, avgPrepMin: 14.2, ticketsCount: 64 },
    { station: 'grill', avgApprovalMin: 1.5, avgPrepMin: 18.6, ticketsCount: 41 },
    { station: 'bar', avgApprovalMin: 0.9, avgPrepMin: 4.5, ticketsCount: 89 },
    { station: 'pastry', avgApprovalMin: 1.1, avgPrepMin: 6.8, ticketsCount: 29 },
  ];

  // 5. Top Ordered Items
  const topOrderedMap: Record<
    string,
    { nameAr: string; nameEn: string; qty: number; revenue: number }
  > = {};
  activeOrders.forEach((o) => {
    o.items.forEach((it) => {
      if (!topOrderedMap[it.productId]) {
        topOrderedMap[it.productId] = {
          nameAr: it.nameAr,
          nameEn: it.nameEn,
          qty: 0,
          revenue: 0,
        };
      }
      topOrderedMap[it.productId].qty += it.quantity;
      topOrderedMap[it.productId].revenue += it.price * it.quantity;
    });
  });

  const topOrderedList =
    Object.values(topOrderedMap).length > 0
      ? Object.values(topOrderedMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5)
      : [
          { nameAr: 'ستيك ريب آي فاخر', nameEn: 'Prime Ribeye Steak', qty: 38, revenue: 1691.0 },
          { nameAr: 'بيتزا مارغريتا نابوليتان', nameEn: 'Pizza Margherita', qty: 52, revenue: 754.0 },
          { nameAr: 'إسبانش لاتيه مثلج', nameEn: 'Iced Spanish Latte', qty: 84, revenue: 571.2 },
          { nameAr: 'تيراميسو كلاسيك', nameEn: 'Classic Tiramisu', qty: 31, revenue: 465.0 },
        ];

  // 6. Section 12 Paradox Report: "Sales Up, Profit Down" (قيم نقدية مقطوعة)
  const paradoxRows = [
    {
      labelAr: 'إجمالي المبيعات (الإيرادات)',
      labelEn: 'Total Gross Sales',
      prevLump: 142000,
      currLump: 168500,
      isProfitImpactPositive: true,
    },
    {
      labelAr: 'تكلفة الخامات والمشتريات (COGS)',
      labelEn: 'Raw Materials & COGS',
      prevLump: 44020,
      currLump: 61500,
      isProfitImpactPositive: false,
    },
    {
      labelAr: 'أجور العمالة المباشرة والإضافية',
      labelEn: 'Direct & Overtime Labor',
      prevLump: 34080,
      currLump: 44200,
      isProfitImpactPositive: false,
    },
    {
      labelAr: 'عمولات التوصيل ومواد التغليف',
      labelEn: 'Delivery Commissions & Packaging',
      prevLump: 6400,
      currLump: 12900,
      isProfitImpactPositive: false,
    },
    {
      labelAr: 'المصاريف التشغيلية والمنافع',
      labelEn: 'Utilities & Operating Overhead',
      prevLump: 28500,
      currLump: 29400,
      isProfitImpactPositive: false,
    },
  ];

  const prevNetProfit = 29000;
  const currNetProfit = 20500;
  const netProfitDiff = currNetProfit - prevNetProfit; // -8,500 lump sum

  return (
    <div className="space-y-6">
      {/* Section D: QR & POS Channel & Station Analytics */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isAr
                ? 'تقارير المبيعات حسب المصدر والخدمة وأداء المحطات'
                : 'Sales by Source, Service Type & Station Performance'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr
                ? 'مقارنة قنوات الكاشير ومنيو QR، أزمنة الاعتماد والتحضير، ونسبة الرفض'
                : 'POS vs QR Menu comparison, approval & prep times, and rejection rate'}
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {hasLiveOrders
              ? isAr
                ? `بيانات حية (${formatNumber(orders.length)} طلب)`
                : `Live Orders (${formatNumber(orders.length)})`
              : isAr
                ? 'بيانات توضيحية'
                : 'Illustrative Data'}
          </span>
        </div>

        {/* Source Comparison (POS vs QR) & Rejection Rate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'مبيعات منيو QR الإلكتروني' : 'QR Menu Sales'}</span>
              <QrCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div
              className="text-xl font-bold mt-2 font-mono tabular-nums text-slate-900 dark:text-white"
              dir="ltr"
            >
              {formatMoney(qrSales)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {formatNumber(qrCount)} {isAr ? 'طلب' : 'orders'} ·{' '}
              {((qrSales / totalSourceSales) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'مبيعات نقطة البيع (الكاشير)' : 'POS Cashier Sales'}</span>
              <Monitor className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div
              className="text-xl font-bold mt-2 font-mono tabular-nums text-slate-900 dark:text-white"
              dir="ltr"
            >
              {formatMoney(posSales)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {formatNumber(posCount)} {isAr ? 'طلب' : 'orders'} ·{' '}
              {((posSales / totalSourceSales) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{isAr ? 'نسبة رفض الطلبات' : 'Order Rejection Rate'}</span>
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div
              className="text-xl font-bold mt-2 font-mono tabular-nums text-rose-600 dark:text-rose-400"
              dir="ltr"
            >
              {rejectionRate.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
              {formatNumber(rejectedCount)} {isAr ? 'مرفوض من أصل' : 'rejected of'}{' '}
              {formatNumber(totalOrdersCount)}
            </div>
          </div>
        </div>

        {/* Service Type Breakdown */}
        <div>
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
            {isAr ? 'المبيعات حسب نوع الخدمة' : 'Sales by Service Type'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {serviceBreakdown.map((srv) => {
              const Icon = srv.icon;
              return (
                <div
                  key={srv.type}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Icon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      <span>{isAr ? srv.labelAr : srv.labelEn}</span>
                    </div>
                    <div
                      className="text-lg font-bold mt-1.5 font-mono tabular-nums text-slate-900 dark:text-white"
                      dir="ltr"
                    >
                      {formatMoney(srv.revenue)}
                    </div>
                  </div>
                  <div className="text-end text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    <div>
                      {formatNumber(srv.count)} {isAr ? 'طلب' : 'orders'}
                    </div>
                    <div className="mt-1" dir="ltr">
                      {isAr ? 'متوسط:' : 'Avg:'} {formatMoney(srv.avgCheck)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Station Performance Table + Top Ordered Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-slate-200 dark:border-slate-800">
          {/* Station Approval & Prep Time */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>
                  {isAr
                    ? 'متوسط زمن الاعتماد والتحضير لكل محطة'
                    : 'Avg Approval & Prep Time per Station'}
                </span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'بيانات توضيحية' : 'Illustrative'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 text-start font-medium">
                      {isAr ? 'المحطة' : 'Station'}
                    </th>
                    <th className="py-2 text-end font-medium">
                      {isAr ? 'زمن الاعتماد' : 'Approval'}
                    </th>
                    <th className="py-2 text-end font-medium">
                      {isAr ? 'زمن التحضير' : 'Prep Time'}
                    </th>
                    <th className="py-2 text-end font-medium">
                      {isAr ? 'التذاكر' : 'Tickets'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                  {stationMetrics.map((st) => (
                    <tr key={st.station} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        {isAr ? STATION_LABELS[st.station].ar : STATION_LABELS[st.station].en}
                      </td>
                      <td className="py-2.5 text-end text-slate-600 dark:text-slate-300">
                        {st.avgApprovalMin.toFixed(1)} {isAr ? 'د' : 'm'}
                      </td>
                      <td className="py-2.5 text-end font-bold text-cyan-600 dark:text-cyan-400">
                        {st.avgPrepMin.toFixed(1)} {isAr ? 'د' : 'm'}
                      </td>
                      <td className="py-2.5 text-end text-slate-500 dark:text-slate-400">
                        {formatNumber(st.ticketsCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Ordered Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'أكثر الأصناف طلباً' : 'Top Ordered Items'}
              </h3>
              <span className="text-[11px] text-slate-400">
                {hasLiveOrders
                  ? isAr
                    ? 'حسب الطلبات الحية'
                    : 'From live orders'
                  : isAr
                    ? 'بيانات توضيحية'
                    : 'Illustrative'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2 text-start font-medium">
                      {isAr ? 'الصنف' : 'Item'}
                    </th>
                    <th className="py-2 text-end font-medium">
                      {isAr ? 'الكمية' : 'Qty'}
                    </th>
                    <th className="py-2 text-end font-medium">
                      {isAr ? 'الإيراد' : 'Revenue'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                  {topOrderedList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        {isAr ? item.nameAr : item.nameEn}
                      </td>
                      <td className="py-2.5 text-end text-slate-600 dark:text-slate-300">
                        {formatNumber(item.qty)}
                      </td>
                      <td
                        className="py-2.5 text-end font-bold text-slate-900 dark:text-white"
                        dir="ltr"
                      >
                        {formatMoney(item.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Section T (ط): Paradox Report — "Sales Up, Profit Down" with Lump-Sum Monetary Values */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-2.5">
            <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isAr
                  ? 'تقرير تحليل مفارقة: ارتفعت المبيعات وانخفض الربح'
                  : 'Paradox Analysis Report: Sales Up, Profit Down'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr
                  ? 'تحليل بالقيم النقدية المقطوعة يوضح أين تآكل هامش الربح رغم نمو المبيعات'
                  : 'Lump-sum monetary breakdown pinpointing where profit eroded despite higher sales'}
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {isAr ? 'بيانات توضيحية · قيم نقدية مقطوعة' : 'Illustrative Data · Lump-Sum Values'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 text-start font-medium">
                  {isAr ? 'البند المالي (قيمة مقطوعة)' : 'Financial Line Item (Lump Sum)'}
                </th>
                <th className="py-2.5 text-end font-medium">
                  {isAr ? 'الفترة السابقة' : 'Prior Period'}
                </th>
                <th className="py-2.5 text-end font-medium">
                  {isAr ? 'الفترة الحالية' : 'Current Period'}
                </th>
                <th className="py-2.5 text-end font-medium">
                  {isAr ? 'التغير النقدي المقطوع' : 'Lump-Sum Variance'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
              {paradoxRows.map((row, idx) => {
                const diff = row.currLump - row.prevLump;
                const isFavorable = row.isProfitImpactPositive ? diff >= 0 : diff <= 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 font-sans font-semibold text-slate-900 dark:text-white">
                      {isAr ? row.labelAr : row.labelEn}
                    </td>
                    <td className="py-3 text-end text-slate-600 dark:text-slate-300" dir="ltr">
                      {formatMoney(row.prevLump)}
                    </td>
                    <td className="py-3 text-end text-slate-900 dark:text-white font-semibold" dir="ltr">
                      {formatMoney(row.currLump)}
                    </td>
                    <td
                      className={`py-3 text-end font-bold ${
                        isFavorable
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                      dir="ltr"
                    >
                      {diff >= 0 ? `+${formatMoney(diff)}` : formatMoney(diff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 font-mono tabular-nums">
                <td className="py-3.5 px-2 font-sans font-bold text-slate-900 dark:text-white">
                  {isAr ? 'صافي الربح التشغيلي المقطوع' : 'Net Operating Profit (Lump Sum)'}
                </td>
                <td className="py-3.5 text-end font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                  {formatMoney(prevNetProfit)}
                </td>
                <td className="py-3.5 text-end font-bold text-slate-900 dark:text-white" dir="ltr">
                  {formatMoney(currNetProfit)}
                </td>
                <td
                  className="py-3.5 px-2 text-end font-bold text-rose-600 dark:text-rose-400"
                  dir="ltr"
                >
                  {formatMoney(netProfitDiff)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAr
            ? `الخلاصة المالية: ارتفعت المبيعات بمقدار مقطوع قدره ${formatMoney(26500)}، إلا أن ارتفاع تكلفة الخامات بمقدار ${formatMoney(17480)}، والأجور الإضافية بمقدار ${formatMoney(10120)}، وعمولات التوصيل بمقدار ${formatMoney(6500)} أدى إلى انخفاض صافي الربح بمقدار مقطوع قدره ${formatMoney(8500)}.`
            : `Financial Summary: Gross sales grew by a lump sum of ${formatMoney(26500)}, but raw material cost increases of ${formatMoney(17480)}, overtime labor of ${formatMoney(10120)}, and delivery commissions of ${formatMoney(6500)} reduced net profit by ${formatMoney(8500)}.`}
        </p>
      </section>
    </div>
  );
};
