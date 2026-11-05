/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * PUBLIC ELECTRONIC QR MENU (Phase 5)
 * Independent public customer experience with ZERO authentication required.
 * Strict data privacy: Only public fields reach this page (zero BOM, zero costs, zero margins).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  ShoppingBag,
  Clock,
  Flame,
  Leaf,
  Sparkles,
  AlertCircle,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  Globe2,
  ChevronUp,
} from 'lucide-react';
import {
  PublicMenuItem,
  CustomerOrder,
  CustomerOrderItem,
  ServiceType,
  toPublicMenuItem,
  sanitizeUserInput,
} from '../../domain/qrMenuTypes.ts';
import { dataService, VenueSettings } from '../../services/dataService.ts';
import { orderTransport } from '../../services/orderTransport.ts';
import { Establishment } from '../../types/index.ts';
import { TYGOS_LOGO_SRC } from '../brand/TygosLogo.tsx';

interface PublicMenuPageProps {
  establishmentCode?: string;
  tableNumber?: string;
  onBackToApp?: () => void;
}

export const PublicMenuPage: React.FC<PublicMenuPageProps> = ({
  establishmentCode = 'R.0001',
  tableNumber: initialTableNumber,
  onBackToApp,
}) => {
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('en')) {
      return 'en';
    }
    return 'ar';
  });
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [venueSettings, setVenueSettings] = useState<VenueSettings | null>(null);
  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Item details bottom sheet
  const [detailItem, setDetailItem] = useState<PublicMenuItem | null>(null);

  // Cart State
  const [cart, setCart] = useState<CustomerOrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Checkout Form State
  const [serviceType, setServiceType] = useState<ServiceType>(initialTableNumber ? 'dine_in' : 'dine_in');
  const [tableNumber, setTableNumber] = useState<string>(initialTableNumber || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Submitted active order tracking
  const [activeOrder, setActiveOrder] = useState<CustomerOrder | null>(null);

  // 1. Load Venue & Public Menu Items
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const est = await dataService.getEstablishmentByCode(establishmentCode);
      if (!mounted) return;
      setEstablishment(est);

      const estId = est?.id || 'default';
      const [settings, products, overrides] = await Promise.all([
        dataService.getVenueSettings(estId),
        dataService.getProducts(estId),
        dataService.getMenuItemOverrides(estId),
      ]);

      if (!mounted) return;
      setVenueSettings(settings);

      // Project internal products into strict PublicMenuItems
      const overrideMap = new Map(overrides.map((o) => [o.productId, o]));
      const publicList = products.map((prod) => toPublicMenuItem(prod, overrideMap.get(prod.id)));

      // If venue configured to hide unavailables, filter them out
      const filtered = settings.hideUnavailableMenuItems
        ? publicList.filter((it) => it.isAvailable)
        : publicList;

      setMenuItems(filtered);
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [establishmentCode]);

  // 2. Real-time Order Tracking Subscription
  useEffect(() => {
    if (!activeOrder) return;
    const unsubscribe = orderTransport.subscribe((event) => {
      if (event.order && event.order.id === activeOrder.id) {
        setActiveOrder(event.order);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [activeOrder?.id]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    menuItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['all', ...Array.from(set)];
  }, [menuItems]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.nameAr.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.descriptionAr.toLowerCase().includes(q) ||
        item.descriptionEn.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (item: PublicMenuItem) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: item.productId,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          price: item.price,
          quantity: 1,
          station: item.station,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.productId === productId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CustomerOrderItem[];
    });
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, notes: sanitizeUserInput(notes) } : i))
    );
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const taxRate = venueSettings?.taxStandard || 14.0;
  const taxAmount = (cartSubtotal * taxRate) / 100;
  const serviceFee = serviceType === 'dine_in' ? (cartSubtotal * (venueSettings?.serviceCharge || 12.0)) / 100 : 0;
  const deliveryFee = serviceType === 'delivery' ? venueSettings?.deliveryFee || 5.0 : 0;
  const totalAmount = cartSubtotal + taxAmount + serviceFee + deliveryFee;
  const cartCount = cart.reduce((sum, it) => sum + it.quantity, 0);

  // Submit Order
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);

    // Rate limiting check
    const rateCheck = orderTransport.checkRateLimit();
    if (!rateCheck.allowed) {
      setOrderError(
        isAr
          ? `يرجى الانتظار ${rateCheck.waitSeconds} ثانية قبل إرسال طلب جديد لحماية النظام.`
          : `Please wait ${rateCheck.waitSeconds}s before submitting another order.`
      );
      return;
    }

    if (cart.length === 0) {
      setOrderError(isAr ? 'سلة الطلبات فارغة!' : 'Your cart is empty!');
      return;
    }

    // Validation
    if (serviceType === 'dine_in' && !tableNumber.trim()) {
      setOrderError(isAr ? 'يرجى إدخال رقم الطاولة للمتابعة.' : 'Please enter your table number.');
      return;
    }
    if (serviceType === 'delivery') {
      if (!customerPhone.trim()) {
        setOrderError(isAr ? 'يرجى إدخال رقم هاتف صالح للتوصيل.' : 'Please enter a valid phone number.');
        return;
      }
      if (!deliveryAddress.trim()) {
        setOrderError(isAr ? 'يرجى كتابة عنوان التوصيل بالتفصيل.' : 'Please enter full delivery address.');
        return;
      }
    }
    if (serviceType === 'takeaway' && !customerPhone.trim()) {
      setOrderError(isAr ? 'يرجى إدخال رقم الهاتف للتواصل.' : 'Please enter your phone number.');
      return;
    }

    setOrderSubmitting(true);
    try {
      const orderId = `ord_qr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newOrder: CustomerOrder = {
        id: orderId,
        serialNumber: '...', // Will be assigned #000X on cashier approval
        establishmentId: establishment?.id || 'default',
        serviceType,
        tableNumber: serviceType === 'dine_in' ? sanitizeUserInput(tableNumber) : undefined,
        customerName: sanitizeUserInput(customerName) || (isAr ? 'ضيف المنشأة' : 'Guest'),
        customerPhone: sanitizeUserInput(customerPhone) || undefined,
        deliveryAddress: serviceType === 'delivery' ? sanitizeUserInput(deliveryAddress) : undefined,
        landmark: serviceType === 'delivery' ? sanitizeUserInput(landmark) : undefined,
        deliveryNotes: sanitizeUserInput(deliveryNotes) || undefined,
        pickupTime: serviceType === 'takeaway' ? sanitizeUserInput(pickupTime) : undefined,
        items: [...cart],
        subtotal: Number(cartSubtotal.toFixed(2)),
        taxAmount: Number(taxAmount.toFixed(2)),
        serviceFee: Number(serviceFee.toFixed(2)),
        deliveryFee: Number(deliveryFee.toFixed(2)),
        totalAmount: Number(totalAmount.toFixed(2)),
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
        stationStatuses: {},
        source: 'qr_menu',
      };

      await orderTransport.submitOrder(newOrder);

      // Clear cart and show active order screen
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
      setActiveOrder(newOrder);
    } catch (err: any) {
      setOrderError(err.message || 'حدث خطأ أثناء إرسال الطلب');
    } finally {
      setOrderSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // RENDER: ACTIVE ORDER STATUS TRACKER
  // -------------------------------------------------------------------------
  if (activeOrder) {
    const isApproved = activeOrder.status === 'approved' || activeOrder.status === 'preparing' || activeOrder.status === 'ready' || activeOrder.status === 'completed';
    const isPreparing = activeOrder.status === 'preparing' || activeOrder.status === 'ready' || activeOrder.status === 'completed';
    const isReady = activeOrder.status === 'ready' || activeOrder.status === 'completed';
    const isRejected = activeOrder.status === 'rejected';

    return (
      <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        <div className="max-w-md mx-auto w-full space-y-6 pt-6">
          {/* Top Brand Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-950/60 border border-cyan-500/40 p-2 flex items-center justify-center">
              <img src={TYGOS_LOGO_SRC} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xl font-black text-white">{establishment?.name || 'TYGOS'}</h1>
            <p className="text-xs text-slate-400">
              {isAr ? 'متابعة حالة طلبك لحظة بلحظة' : 'Live Order Tracking'}
            </p>
          </div>

          {/* Status Box */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-center space-y-5">
            {/* Serial Number Display */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                {isAr ? 'رقم طلبك' : 'Order Number'}
              </span>
              <span className="text-3xl font-black font-mono text-cyan-400 mt-1 block">
                {activeOrder.serialNumber !== '...' ? activeOrder.serialNumber : (isAr ? 'قيد الاعتماد' : 'Pending')}
              </span>
              {activeOrder.tableNumber && (
                <span className="text-xs text-slate-300 font-semibold mt-1 inline-block">
                  {isAr ? `طاولة رقم: #${activeOrder.tableNumber}` : `Table #${activeOrder.tableNumber}`}
                </span>
              )}
            </div>

            {/* Stepper Status */}
            {isRejected ? (
              <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
                <h3 className="font-bold text-sm">{isAr ? 'عذراً، تعذر قبول الطلب' : 'Order Declined'}</h3>
                {activeOrder.rejectionReason && (
                  <p className="text-xs text-slate-300">
                    {isAr ? 'السبب:' : 'Reason:'} {activeOrder.rejectionReason}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {/* Step 1: Pending */}
                <div className="flex items-center gap-3 text-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isApproved ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950 animate-pulse'}`}>
                    {isApproved ? '✓' : '1'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {isAr ? 'بانتظار موافقة الكاشير' : 'Awaiting Cashier Approval'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isApproved ? (isAr ? 'تم قبول طلبك واعتماده' : 'Approved') : (isAr ? 'طلبك وصل وسيتم قبوله فوراً' : 'Order received, pending review')}
                    </p>
                  </div>
                </div>

                <div className={`ms-4 h-6 w-0.5 border-s-2 ${isApproved ? 'border-emerald-500' : 'border-slate-800'}`} />

                {/* Step 2: Preparing */}
                <div className="flex items-center gap-3 text-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isReady ? 'bg-emerald-500 text-slate-950' : isPreparing ? 'bg-cyan-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                    {isReady ? '✓' : '2'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {isAr ? 'جاري التحضير بالمحطات' : 'Preparing at Stations'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isReady ? (isAr ? 'اكتمل التحضير بنجاح' : 'Prepared') : isPreparing ? (isAr ? 'الشيف والبار يحضرون أصنافك' : 'Kitchen is preparing your items') : (isAr ? 'في الانتظار' : 'Queued')}
                    </p>
                  </div>
                </div>

                <div className={`ms-4 h-6 w-0.5 border-s-2 ${isReady ? 'border-emerald-500' : 'border-slate-800'}`} />

                {/* Step 3: Ready */}
                <div className="flex items-center gap-3 text-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isReady ? 'bg-emerald-500 text-slate-950 animate-bounce' : 'bg-slate-800 text-slate-500'}`}>
                    {isReady ? '★' : '3'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      {isAr ? 'طلبك جاهز!' : 'Order Ready!'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {isReady ? (isAr ? 'بالهنا والشفا، جاري التقديم أو الاستلام' : 'Enjoy your meal!') : (isAr ? 'في انتظار اكتمال التجهيز' : 'In prep')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items Summary */}
            <div className="pt-3 border-t border-slate-800 text-start space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'تفاصيل الطلب:' : 'Order Summary:'}</span>
              {activeOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs text-slate-300">
                  <span>{isAr ? it.nameAr : it.nameEn} x {it.quantity}</span>
                  <span className="font-mono text-cyan-400 font-bold">${(it.price * it.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-800/80 flex justify-between font-bold text-sm text-white">
                <span>{isAr ? 'الإجمالي:' : 'Total:'}</span>
                <span className="font-mono text-emerald-400">${activeOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="max-w-md mx-auto w-full pt-6">
          <button
            type="button"
            onClick={() => setActiveOrder(null)}
            className="w-full py-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {isAr ? 'العودة للمنيو لطلب أصناف إضافية' : 'Return to Menu to Order More'}
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // MAIN VIEW: MENU BROWSER
  // -------------------------------------------------------------------------
  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* 1. STICKY TOP BRAND & CONTEXT HEADER */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/40 p-1 flex items-center justify-center shrink-0 shadow-xs">
            <img src={TYGOS_LOGO_SRC} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-white truncate">{establishment?.name || 'TYGOS'}</h1>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              {tableNumber ? (
                <span className="font-bold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/40">
                  {isAr ? `طاولة #${tableNumber}` : `Table #${tableNumber}`}
                </span>
              ) : (
                <span>{isAr ? 'المنيو الإلكتروني' : 'Digital Menu'}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>

          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isAr ? 'العودة للنظام الداخلي' : 'Back to Internal App'}
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          )}
        </div>
      </header>

      {/* 2. SEARCH & CATEGORY SELECTOR */}
      <div className="px-4 pt-3 pb-2 bg-slate-950/90 border-b border-slate-800/60 space-y-2.5 sticky top-[57px] z-30 backdrop-blur-md">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث عن طبق، مشروب، أو حلوى...' : 'Search for dishes, drinks, desserts...'}
            className="w-full ps-9 pe-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat === 'all' ? (isAr ? 'الكل' : 'All') : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MENU ITEMS GRID */}
      <main className="flex-1 p-4 max-w-4xl mx-auto w-full pb-28">
        {loading ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">{isAr ? 'جاري تحميل قائمة الطعام...' : 'Loading menu...'}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 space-y-3 bg-slate-900/60 rounded-3xl border border-slate-800/80 p-8">
            <UtensilsCrossed className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">
              {isAr ? 'لا توجد أطباق مطابقة لبحثك' : 'No matching items found'}
            </h3>
            <p className="text-xs text-slate-500">
              {isAr ? 'جرّب البحث باسم آخر أو اختر تصنيفاً مختلفاً' : 'Try searching with a different term or select another category'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {filteredItems.map((item) => {
              const inCartItem = cart.find((c) => c.productId === item.productId);
              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 hover:border-slate-700 shadow-md flex gap-3 transition-all ${
                    !item.isAvailable ? 'opacity-50 grayscale' : ''
                  }`}
                >
                  {/* Dish Thumbnail */}
                  <div className="w-22 h-22 sm:w-26 sm:h-26 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shrink-0 relative">
                    {item.primaryImage ? (
                      <img
                        src={item.primaryImage}
                        alt={item.nameAr}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-600 text-[10px] text-center">
                        <UtensilsCrossed className="w-6 h-6 mb-1 opacity-40" />
                        <span>{isAr ? item.category : item.category}</span>
                      </div>
                    )}
                    {item.prepTimeMinutes && (
                      <span className="absolute bottom-1 end-1 bg-slate-950/80 backdrop-blur-xs text-[9px] font-mono font-bold text-slate-300 px-1 py-0.5 rounded">
                        {item.prepTimeMinutes}m
                      </span>
                    )}
                  </div>

                  {/* Dish Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {/* Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {item.badges.map((b) => (
                          <span
                            key={b}
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                          >
                            {b === 'spicy' ? '🌶️ ' + (isAr ? 'حار' : 'Spicy') : b === 'vegan' ? '🌱 ' + (isAr ? 'نباتي' : 'Vegan') : b === 'new' ? '★ ' + (isAr ? 'جديد' : 'New') : '🔥 ' + (isAr ? 'الأكثر طلباً' : 'Bestseller')}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-sm font-bold text-white truncate">
                        {isAr ? (item.nameAr || item.nameEn) : (item.nameEn || item.nameAr)}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {isAr ? (item.descriptionAr || item.descriptionEn) : (item.descriptionEn || item.descriptionAr)}
                      </p>
                    </div>

                    {/* Bottom Action Strip: Price + Details Button + Add Control */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs text-slate-400">$</span>
                        <span className="text-base font-black font-mono text-cyan-400">
                          {item.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="text-[11px] font-medium text-slate-400 hover:text-cyan-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {isAr ? 'التفاصيل' : 'Details'}
                        </button>

                        {item.isAvailable ? (
                          inCartItem ? (
                            <div className="flex items-center gap-1 bg-cyan-500/20 border border-cyan-500/40 rounded-xl p-0.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, -1)}
                                className="w-6 h-6 rounded-lg bg-slate-900 text-cyan-300 flex items-center justify-center hover:bg-slate-800"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-mono font-bold text-white px-1.5">
                                {inCartItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.productId, 1)}
                                className="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{isAr ? 'إضافة' : 'Add'}</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-800/80 px-2 py-1 rounded-lg">
                            {isAr ? 'غير متاح الآن' : 'Sold Out'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. DETAILS BOTTOM SHEET MODAL */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{detailItem.category}</span>
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Preview */}
            {detailItem.primaryImage && (
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  src={detailItem.primaryImage}
                  alt={detailItem.nameAr}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div>
              {detailItem.badges.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {detailItem.badges.map((b) => (
                    <span
                      key={b}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                    >
                      {b === 'spicy' ? '🌶️ ' + (isAr ? 'حار' : 'Spicy') : b === 'vegan' ? '🌱 ' + (isAr ? 'نباتي' : 'Vegan') : b === 'new' ? '★ ' + (isAr ? 'جديد' : 'New') : '🔥 ' + (isAr ? 'الأكثر طلباً' : 'Bestseller')}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-black text-white">
                  {isAr ? (detailItem.nameAr || detailItem.nameEn) : (detailItem.nameEn || detailItem.nameAr)}
                </h2>
                <div className="text-lg font-mono font-black text-cyan-400">${detailItem.price.toFixed(2)}</div>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {isAr ? (detailItem.descriptionAr || detailItem.descriptionEn) : (detailItem.descriptionEn || detailItem.descriptionAr)}
              </p>
            </div>

            {/* Display Ingredients */}
            {(detailItem.displayIngredientsAr.length > 0 || detailItem.displayIngredientsEn.length > 0) && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 block">{isAr ? 'المكونات الأساسية المعروضة:' : 'Featured Ingredients:'}</span>
                <div className="flex flex-wrap gap-1.5">
                  {(isAr
                    ? (detailItem.displayIngredientsAr.length > 0 ? detailItem.displayIngredientsAr : detailItem.displayIngredientsEn)
                    : (detailItem.displayIngredientsEn.length > 0 ? detailItem.displayIngredientsEn : detailItem.displayIngredientsAr)
                  ).map((ing, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preparation Method & Prep Time */}
            {(detailItem.prepMethodAr || detailItem.prepMethodEn) && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs text-slate-300">
                <span className="font-bold text-slate-400 block text-[11px]">{isAr ? 'طريقة التحضير الشهية:' : 'Chef Preparation:'}</span>
                <p className="leading-relaxed">
                  {isAr ? (detailItem.prepMethodAr || detailItem.prepMethodEn) : (detailItem.prepMethodEn || detailItem.prepMethodAr)}
                </p>
              </div>
            )}

            {/* Allergens warning */}
            {detailItem.allergens.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {isAr ? 'تحذير مسببات الحساسية: يحتوي على ' : 'Allergen notice: Contains '}
                  {detailItem.allergens.join(', ')}
                </span>
              </div>
            )}

            {/* Sheet Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  addToCart(detailItem);
                  setDetailItem(null);
                }}
                disabled={!detailItem.isAvailable}
                className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'إضافة إلى طلباتي' : 'Add to My Order'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FLOATING CART DOCK BAR */}
      {cartCount > 0 && (
        <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:end-6 sm:w-96 z-40 animate-slide-up">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 text-slate-950 font-bold shadow-2xl flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-950 text-cyan-300 font-mono text-xs flex items-center justify-center font-black">
                {cartCount}
              </div>
              <span className="text-xs">{isAr ? 'عرض سلة الطلبات' : 'View Order Basket'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black">${cartSubtotal.toFixed(2)}</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* 6. CART DRAWER MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">{isAr ? 'سلة الطلبات' : 'Your Basket'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">{isAr ? item.nameAr : item.nameEn}</h4>
                      <div className="text-[11px] font-mono text-cyan-400 mt-0.5">${(item.price * item.quantity).toFixed(2)}</div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold text-white px-2">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Notes input */}
                  <input
                    type="text"
                    value={item.notes || ''}
                    onChange={(e) => updateItemNotes(item.productId, e.target.value)}
                    placeholder={isAr ? 'ملاحظة خاصة (مثال: بدون بصل، صوص إضافي)...' : 'Special notes (e.g. no onions)...'}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500/40"
                  />
                </div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-mono text-slate-200">${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? `الضريبة (${taxRate}%):` : `Tax (${taxRate}%):`}</span>
                <span className="font-mono text-slate-200">${taxAmount.toFixed(2)}</span>
              </div>
              {serviceType === 'dine_in' && (
                <div className="flex justify-between">
                  <span>{isAr ? 'خدمة الصالة:' : 'Service Charge:'}</span>
                  <span className="font-mono text-slate-200">${serviceFee.toFixed(2)}</span>
                </div>
              )}
              {serviceType === 'delivery' && (
                <div className="flex justify-between">
                  <span>{isAr ? 'رسوم التوصيل:' : 'Delivery Fee:'}</span>
                  <span className="font-mono text-slate-200">${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                <span>{isAr ? 'الإجمالي التقديري:' : 'Estimated Total:'}</span>
                <span className="font-mono text-emerald-400 text-base">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isAr ? 'المتابعة واختيار طريقة الاستلام' : 'Continue to Checkout'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* 7. CHECKOUT SERVICE TYPE & CONFIRMATION MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">{isAr ? 'تأكيد وإرسال الطلب' : 'Complete Your Order'}</h3>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Service Type Tabs */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">{isAr ? 'نوع الخدمة:' : 'Service Type:'}</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setServiceType('dine_in')}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      serviceType === 'dine_in' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAr ? 'صالة' : 'Dine-in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('takeaway')}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      serviceType === 'takeaway' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAr ? 'تيك أواي' : 'Takeaway'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceType('delivery')}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      serviceType === 'delivery' ? 'bg-cyan-500 text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAr ? 'دليفري' : 'Delivery'}
                  </button>
                </div>
              </div>

              {/* Dine-in inputs */}
              {serviceType === 'dine_in' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      {isAr ? 'رقم الطاولة *' : 'Table Number *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder={isAr ? 'مثال: 5' : 'e.g. 5'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">
                      {isAr ? 'اسمك الكريم (اختياري)' : 'Your Name (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={isAr ? 'اسمك لتسهيل المناداة' : 'Your name'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Delivery inputs */}
              {serviceType === 'delivery' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">{isAr ? 'الاسم الكريم *' : 'Full Name *'}</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={isAr ? 'الاسم' : 'Name'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">{isAr ? 'رقم الهاتف للتواصل *' : 'Phone Number *'}</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+20 1..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">{isAr ? 'العنوان التفصيلي *' : 'Delivery Address *'}</label>
                    <input
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder={isAr ? 'الشارع، رقم العمارة، الطابق، الشقة' : 'Street, building, floor, apt'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">{isAr ? 'علامة مميزة أو ملاحظات' : 'Landmark / Notes'}</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder={isAr ? 'بجوار صيدلية...' : 'Near landmark...'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Takeaway inputs */}
              {serviceType === 'takeaway' && (
                <div className="space-y-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">{isAr ? 'الاسم الكريم *' : 'Full Name *'}</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={isAr ? 'الاسم' : 'Name'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">{isAr ? 'رقم الهاتف *' : 'Phone Number *'}</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+20 1..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white font-mono focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">{isAr ? 'وقت الاستلام المفضل' : 'Preferred Pickup Time'}</label>
                    <input
                      type="text"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      placeholder={isAr ? 'خلال 20 دقيقة' : 'In 20 mins'}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Total Summary */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/30">
                <span className="text-xs font-bold text-slate-300">{isAr ? 'المطلوب سداده:' : 'Total Payable:'}</span>
                <span className="text-lg font-black font-mono text-emerald-400">${totalAmount.toFixed(2)}</span>
              </div>

              <button
                type="submit"
                disabled={orderSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {orderSubmitting ? (
                  <span>{isAr ? 'جاري إرسال الطلب للمطبخ...' : 'Submitting Order...'}</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد وإرسال الطلب الآن' : 'Confirm & Place Order Now'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
