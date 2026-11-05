/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Users,
  Award,
  Star,
  Search,
  Phone,
  MapPin,
  Plus,
  ShieldAlert,
  Download,
  UserX,
  GitMerge,
  RotateCcw,
  Tag,
  Ticket,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { can } from '../../services/permissions.ts';
import {
  customerService,
  CustomerProfile,
  Coupon,
} from '../../services/customerService.ts';
import { orderTransport } from '../../services/orderTransport.ts';
import { CustomerOrder } from '../../domain/qrMenuTypes.ts';
import { generateUuid } from '../../sync/syncTypes.ts';

type CrmTab = 'directory' | 'coupons' | 'reports';

export const CrmModule: React.FC = () => {
  const { currentUser, currentEstablishment, setActiveView } = useAuth();
  const { language, formatMoney, formatNumber } = useI18n();
  const { showToast } = useToast();
  const isAr = language === 'ar';

  const estId = currentEstablishment?.id || 'est-1';
  const canViewPii = can(currentUser?.role, 'customer_pii:view');
  const canEditCrm = can(currentUser?.role, 'crm:edit');
  const canAnonymize = can(currentUser?.role, 'crm:anonymize');
  const canExport = can(currentUser?.role, 'crm:export');
  const canMerge = can(currentUser?.role, 'crm:merge');

  const [activeTab, setActiveTab] = useState<CrmTab>('directory');
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<CustomerOrder[]>(() =>
    orderTransport.getOrders(estId)
  );
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // New Customer Modal / Form state
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Merge state
  const [mergeTargetId, setMergeTargetId] = useState('');

  // Blacklist reason state
  const [blacklistReasonInput, setBlacklistReasonInput] = useState('');

  // New Coupon form state
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState('15');
  const [couponExpiry, setCouponExpiry] = useState('2027-12-31');
  const [couponMaxUses, setCouponMaxUses] = useState('100');

  const loadAll = async () => {
    const [custList, couponList] = await Promise.all([
      customerService.getCustomers(estId),
      customerService.getCoupons(estId),
    ]);
    setCustomers(custList);
    setCoupons(couponList);
    if (!selectedId && custList.length > 0) {
      setSelectedId(custList[0].id);
    }
  };

  useEffect(() => {
    void loadAll();
    setOrders(orderTransport.getOrders(estId));
    const unsub = orderTransport.subscribe((ev) => {
      if (ev.order.establishmentId === estId) {
        setOrders(orderTransport.getOrders(estId));
      }
    });
    return unsub;
  }, [estId]);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const selectedCustomer =
    customers.find((c) => c.id === selectedId) || filteredCustomers[0] || null;

  const analytics = selectedCustomer
    ? customerService.getCustomerAnalytics(selectedCustomer, orders)
    : null;

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    const created = await customerService.findOrCreateByPhone(estId, {
      name: newName.trim(),
      phone: newPhone.trim(),
      addressDescription: newAddress.trim() || undefined,
    });
    if (newNotes.trim()) {
      await customerService.saveCustomer(estId, { ...created, notes: newNotes.trim() });
    }
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewNotes('');
    setIsAddingCustomer(false);
    await loadAll();
    setSelectedId(created.id);
    showToast({
      type: 'success',
      title: isAr ? 'تم الحفظ' : 'Saved',
      message: isAr ? 'تم حفظ ملف العميل بنجاح' : 'Customer profile saved',
    });
  };

  const handleToggleBlacklist = async (cust: CustomerProfile) => {
    if (!canEditCrm) return;
    const nextState = !cust.isBlacklisted;
    await customerService.saveCustomer(estId, {
      ...cust,
      isBlacklisted: nextState,
      blacklistReason: nextState
        ? blacklistReasonInput.trim() || (isAr ? 'مخالفة سياسة الطلب' : 'Policy violation')
        : undefined,
    });
    setBlacklistReasonInput('');
    await loadAll();
    showToast({
      type: nextState ? 'warning' : 'info',
      title: isAr ? 'تحديث القائمة' : 'Watchlist Updated',
      message: nextState
        ? isAr
          ? 'تم إدراج العميل في قائمة التنبيه (الحظر الاختياري)'
          : 'Customer flagged on optional watchlist'
        : isAr
          ? 'تمت إزالة التنبيه عن العميل'
          : 'Customer watchlist flag removed',
    });
  };

  const handleMergeDuplicate = async () => {
    if (!selectedCustomer || !mergeTargetId || !canMerge) return;
    await customerService.mergeCustomers(estId, selectedCustomer.id, mergeTargetId);
    setMergeTargetId('');
    await loadAll();
    showToast({
      type: 'success',
      title: isAr ? 'تم الدمج' : 'Merged',
      message: isAr ? 'تم دمج الملفين المكررين بنجاح' : 'Duplicate profiles merged',
    });
  };

  const handleAnonymize = async (cust: CustomerProfile) => {
    if (!canAnonymize) return;
    await customerService.anonymizeCustomer(estId, cust.id);
    await loadAll();
    showToast({
      type: 'info',
      title: isAr ? 'إخفاء الهوية' : 'Anonymized',
      message: isAr
        ? 'تم إخفاء هوية العميل مع الاحتفاظ بالأرقام المحاسبية'
        : 'Customer PII anonymized while preserving accounting totals',
    });
  };

  const handleExportCustomer = (cust: CustomerProfile) => {
    if (!canExport) return;
    const data = {
      profile: cust,
      analytics: customerService.getCustomerAnalytics(cust, orders),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-${cust.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast({
      type: 'success',
      title: isAr ? 'تم التصدير' : 'Exported',
      message: isAr ? 'تم تصدير بيانات العميل' : 'Customer data exported',
    });
  };

  const handleReorderToPos = (cust: CustomerProfile, order?: CustomerOrder | null) => {
    // Store quick-fill payload for POS
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(
        'tygos_pos_prefill_customer',
        JSON.stringify({
          customerId: cust.id,
          customerName: cust.name,
          customerPhone: cust.phone,
          deliveryAddress: cust.addresses[0]?.description || '',
          items: order?.items || [],
        })
      );
    }
    setActiveView('pos');
    showToast({
      type: 'info',
      title: isAr ? 'تجهيز الطلب' : 'Loaded to POS',
      message: isAr
        ? `تم تجهيز بيانات ${cust.name} في شاشة الكاشير`
        : `Loaded ${cust.name} into POS`,
    });
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    await customerService.saveCoupon(estId, {
      id: generateUuid(),
      code: couponCode.trim().toUpperCase(),
      discountType: couponType,
      value: Math.max(1, Number(couponValue) || 10),
      expiresAt: couponExpiry,
      maxUses: Math.max(1, Number(couponMaxUses) || 100),
      usedCount: 0,
      isActive: true,
    });
    setCouponCode('');
    await loadAll();
    showToast({
      type: 'success',
      title: isAr ? 'تم إنشاء الكوبون' : 'Coupon Created',
      message: isAr ? 'تم إنشاء كوبون الخصم بنجاح' : 'Coupon created',
    });
  };

  // Customer Reports Calculations
  const topSpenders = [...customers]
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);
  const newCustomersCount = customers.filter((c) => c.visitsCount <= 1).length;
  const returningCustomersCount = customers.filter((c) => c.visitsCount > 1).length;
  const inactiveCustomers = customers.filter((c) => {
    if (!c.lastOrderAt) return true;
    const days = (Date.now() - Date.parse(c.lastOrderAt)) / (1000 * 60 * 60 * 24);
    return days > 30;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isAr ? 'إدارة العملاء الموحدة، الولاء والكوبونات (CRM)' : 'Unified Customer CRM, Loyalty & Coupons'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'ملف عميل موحد بالهاتف، عناوين متعددة، سجل الطلبات، نقاط الولاء، كوبونات الخصم، وحماية الخصوصية'
              : 'Phone-normalized profiles, multi-address book, order history, loyalty points, coupons & privacy controls'}
          </p>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'directory'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isAr ? 'ملفات العملاء' : 'Customers'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'coupons'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{isAr ? 'الولاء والكوبونات' : 'Loyalty & Coupons'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'reports'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isAr ? 'تقارير العملاء' : 'CRM Reports'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: CUSTOMER DIRECTORY & UNIFIED PROFILE */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Search & Directory */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'بحث بالاسم أو الهاتف أو الوسم...' : 'Search by name, phone, or tag...'}
                  className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              {canEditCrm && (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomer(!isAddingCustomer)}
                  className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? 'عميل' : 'Add'}</span>
                </button>
              )}
            </div>

            {isAddingCustomer && (
              <form
                onSubmit={handleCreateCustomer}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5"
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {isAr ? 'إضافة ملف عميل جديد' : 'New Customer Profile'}
                </div>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={isAr ? 'اسم العميل' : 'Customer Name'}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder={isAr ? 'رقم الهاتف (المعرّف الأساسي)' : 'Phone Number (Primary ID)'}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder={isAr ? 'عنوان التوصيل (اختياري)' : 'Delivery Address (optional)'}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder={isAr ? 'ملاحظات التفضيل أو الحساسية' : 'Preferences / Notes'}
                  className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomer(false)}
                    className="px-3 py-1 text-xs text-slate-500 cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-cyan-600 text-white text-xs font-bold cursor-pointer"
                  >
                    {isAr ? 'حفظ' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[540px] overflow-y-auto">
              {filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <button
                    key={cust.id}
                    type="button"
                    onClick={() => setSelectedId(cust.id)}
                    className={`w-full text-start p-3 transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/40'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cust.name}
                        </span>
                        {cust.isBlacklisted && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                        {canViewPii ? cust.phone : '••••••••••'} · {cust.tags.join(' · ')}
                      </div>
                    </div>
                    <div className="text-end font-mono tabular-nums shrink-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white" dir="ltr">
                        {formatMoney(cust.totalSpent)}
                      </div>
                      <div className="text-[11px] text-cyan-600 dark:text-cyan-400">
                        {formatNumber(cust.loyaltyPoints)} {isAr ? 'نقطة' : 'pts'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Unified Customer Profile & History */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
            {!selectedCustomer || !analytics ? (
              <div className="py-12 text-center text-xs text-slate-500">
                {isAr ? 'اختر عميلاً لعرض ملفه الموحد' : 'Select a customer to view unified profile'}
              </div>
            ) : (
              <>
                {/* Watchlist Alert Banner (Alerts cashier without blocking) */}
                {selectedCustomer.isBlacklisted && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                    <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">
                        {isAr ? 'تنبيه قائمة المراقبة (حظر اختياري)' : 'Optional Watchlist Alert'}
                      </div>
                      <div className="mt-0.5">
                        {selectedCustomer.blacklistReason ||
                          (isAr ? 'يرجى مراجعة الطلب مع المشرف' : 'Please verify order with supervisor')}
                      </div>
                    </div>
                  </div>
                )}

                {/* Header & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                        {selectedCustomer.name}
                      </h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {selectedCustomer.tags.join(' · ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {canViewPii ? selectedCustomer.phone : 'محجوب حسب الصلاحية'}
                      </span>
                      <span>·</span>
                      <span>
                        {isAr ? 'تاريخ التسجيل:' : 'Joined:'}{' '}
                        {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReorderToPos(selectedCustomer, analytics.lastOrder)}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إعادة طلب / تعبئة بالكاشير' : 'Re-order / Fill POS'}</span>
                    </button>

                    {canExport && (
                      <button
                        type="button"
                        onClick={() => handleExportCustomer(selectedCustomer)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title={isAr ? 'تصدير بيانات العميل' : 'Export Customer Data'}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isAr ? 'تصدير' : 'Export'}</span>
                      </button>
                    )}

                    {canAnonymize && !selectedCustomer.isAnonymized && (
                      <button
                        type="button"
                        onClick={() => handleAnonymize(selectedCustomer)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title={isAr ? 'إخفاء هوية العميل' : 'Anonymize PII'}
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إخفاء الهوية' : 'Anonymize'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* KPI Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-sans text-slate-500">
                      {isAr ? 'إجمالي الإنفاق' : 'Lifetime Spend'}
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1" dir="ltr">
                      {formatMoney(analytics.totalSpent)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-sans text-slate-500">
                      {isAr ? 'عدد الزيارات' : 'Visits'}
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {formatNumber(analytics.visitsCount)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-sans text-slate-500">
                      {isAr ? 'متوسط الفاتورة' : 'Avg Check'}
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1" dir="ltr">
                      {formatMoney(analytics.avgCheck)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-sans text-slate-500">
                      {isAr ? 'نقاط الولاء' : 'Loyalty Points'}
                    </div>
                    <div className="text-base font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                      {formatNumber(selectedCustomer.loyaltyPoints)}
                    </div>
                  </div>
                </div>

                {/* Addresses & Notes (Permission-gated PII) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                      <span>{isAr ? 'عناوين التوصيل المسجلة' : 'Saved Delivery Addresses'}</span>
                    </div>
                    {!canViewPii ? (
                      <p className="text-xs text-slate-500">
                        {isAr ? 'محجوب حسب صلاحيات الدور الوظيفي' : 'Restricted by role permissions'}
                      </p>
                    ) : selectedCustomer.addresses.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        {isAr ? 'لا توجد عناوين مسجلة' : 'No saved addresses'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedCustomer.addresses.map((addr) => (
                          <div key={addr.id} className="text-xs">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {addr.label}: {addr.description}
                            </div>
                            {addr.deliveryNotes && (
                              <div className="text-[11px] text-slate-500">{addr.deliveryNotes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isAr ? 'الأصناف المفضلة والملاحظات' : 'Favorite Items & Notes'}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {selectedCustomer.notes || (isAr ? 'لا توجد ملاحظات خاصة' : 'No special notes')}
                    </p>
                    {analytics.favoriteItems.length > 0 && (
                      <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                        {isAr ? 'الأكثر طلباً:' : 'Favorites:'}{' '}
                        {analytics.favoriteItems
                          .map((f) => `${isAr ? f.nameAr : f.nameEn} (${f.count})`)
                          .join(' · ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Order History Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                    {isAr
                      ? `سجل الطلبات (${formatNumber(analytics.orders.length)}) · المرتجعات/المرفوضة: ${formatNumber(analytics.rejectedCount)}`
                      : `Order History (${formatNumber(analytics.orders.length)}) · Rejected: ${formatNumber(analytics.rejectedCount)}`}
                  </h3>
                  {analytics.orders.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">
                      {isAr ? 'لا توجد طلبات مسجلة لهذا العميل بعد' : 'No recorded orders yet'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                            <th className="py-2 text-start">{isAr ? 'الطلب' : 'Order'}</th>
                            <th className="py-2 text-start">{isAr ? 'القناة والخدمة' : 'Channel'}</th>
                            <th className="py-2 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                            <th className="py-2 text-end">{isAr ? 'الإجمالي' : 'Total'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                          {analytics.orders.slice(0, 6).map((ord) => (
                            <tr key={ord.id}>
                              <td className="py-2 font-bold text-slate-900 dark:text-white">
                                {ord.serialNumber}
                              </td>
                              <td className="py-2 font-sans text-slate-600 dark:text-slate-300">
                                {ord.source} · {ord.serviceType}
                              </td>
                              <td className="py-2 font-sans text-slate-600 dark:text-slate-300">
                                {ord.status}
                              </td>
                              <td className="py-2 text-end font-bold text-slate-900 dark:text-white" dir="ltr">
                                {formatMoney(ord.totalAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Merge Duplicate & Optional Blacklist Controls */}
                {canEditCrm && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {canMerge && customers.length > 1 && (
                      <div className="flex items-center gap-2">
                        <select
                          value={mergeTargetId}
                          onChange={(e) => setMergeTargetId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                        >
                          <option value="">
                            {isAr ? 'اختر ملفاً مكرراً لدمجه هنا...' : 'Select duplicate to merge...'}
                          </option>
                          {customers
                            .filter((c) => c.id !== selectedCustomer.id)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.phone})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          disabled={!mergeTargetId}
                          onClick={handleMergeDuplicate}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          <span>{isAr ? 'دمج' : 'Merge'}</span>
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {!selectedCustomer.isBlacklisted && (
                        <input
                          type="text"
                          value={blacklistReasonInput}
                          onChange={(e) => setBlacklistReasonInput(e.target.value)}
                          placeholder={isAr ? 'سبب التنبيه (اختياري)...' : 'Watchlist reason...'}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleBlacklist(selectedCustomer)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold cursor-pointer"
                      >
                        {selectedCustomer.isBlacklisted
                          ? isAr
                            ? 'إلغاء التنبيه'
                            : 'Clear Watchlist'
                          : isAr
                            ? 'إضافة لقائمة التنبيه'
                            : 'Flag Watchlist'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LOYALTY & COUPONS */}
      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isAr ? 'إنشاء كوبون خصم جديد' : 'Create Discount Coupon'}
            </h2>
            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  {isAr ? 'كود الكوبون' : 'Coupon Code'}
                </label>
                <input
                  type="text"
                  required
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="TYGOS20"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {isAr ? 'نوع الخصم' : 'Discount Type'}
                  </label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as 'percentage' | 'fixed')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <option value="percentage">{isAr ? 'نسبة مئوية (%)' : 'Percentage (%)'}</option>
                    <option value="fixed">{isAr ? 'مبلغ ثابت' : 'Fixed Amount'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {isAr ? 'القيمة' : 'Value'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={couponValue}
                    onChange={(e) => setCouponValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {isAr ? 'تاريخ الانتهاء' : 'Expiry Date'}
                  </label>
                  <input
                    type="date"
                    value={couponExpiry}
                    onChange={(e) => setCouponExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">
                    {isAr ? 'الحد الأقصى للاستخدام' : 'Max Uses'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={couponMaxUses}
                    onChange={(e) => setCouponMaxUses(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold cursor-pointer"
              >
                {isAr ? 'حفظ وتفعيل الكوبون' : 'Save & Activate Coupon'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isAr ? 'الكوبونات النشطة' : 'Active Coupons'}
            </h2>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {coupons.map((cpn) => (
                <div key={cpn.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                      {cpn.code}
                    </span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {cpn.discountType === 'percentage'
                        ? `${cpn.value}%`
                        : formatMoney(cpn.value)}
                    </span>
                  </div>
                  <div className="font-mono tabular-nums text-slate-500">
                    {cpn.usedCount}/{cpn.maxUses} · {isAr ? 'ينتهي:' : 'Exp:'} {cpn.expiresAt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CRM REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                {isAr ? 'العملاء الجدد مقابل العائدين' : 'New vs Returning Customers'}
              </div>
              <div className="text-xl font-bold mt-2 font-mono tabular-nums text-slate-900 dark:text-white">
                {formatNumber(newCustomersCount)} {isAr ? 'جديد' : 'New'} ·{' '}
                {formatNumber(returningCustomersCount)} {isAr ? 'عائد' : 'Returning'}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                {isAr ? 'العملاء غير النشطين (> 30 يوم)' : 'Inactive Customers (> 30d)'}
              </div>
              <div className="text-xl font-bold mt-2 font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {formatNumber(inactiveCustomers.length)}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                {isAr ? 'إجمالي نقاط الولاء المتاحة' : 'Total Active Loyalty Points'}
              </div>
              <div className="text-xl font-bold mt-2 font-mono tabular-nums text-cyan-600 dark:text-cyan-400">
                {formatNumber(customers.reduce((s, c) => s + c.loyaltyPoints, 0))}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              {isAr ? 'العملاء الأكثر إنفاقاً' : 'Top Spending Customers'}
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums text-xs">
              {topSpenders.map((c, idx) => (
                <div key={c.id} className="py-2.5 flex items-center justify-between">
                  <div className="font-sans font-semibold text-slate-900 dark:text-white">
                    0{idx + 1}. {c.name}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500">
                      {formatNumber(c.visitsCount)} {isAr ? 'زيارة' : 'visits'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatMoney(c.totalSpent)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
