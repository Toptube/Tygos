/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED CASHIER & POS WORKSPACE (Phase 7 - Sections 1, 2, 3, 4, 5 & 6)
 * - Shift Gate: Requires an open shift before selling (with handover float suggestion)
 * - Responsive: Mobile bottom tabs (Tables | Order | Orders | Drawer) & Desktop 3-column layout
 * - Touch-friendly (>=48px) buttons with +1 flash & row highlight
 * - Save & Send (new items only + additions), Hold, Checkout, Table Transfer/Merge, Print, Cancel
 * - Atomic Payment Modal (Cash, Card, Wallet, Credit, Split + Quick Cash + Change + Tip)
 * - Live Cash Drawer & Z-Report Close + Treasury Handover
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  ShoppingBag,
  Truck,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Wallet,
  Building2,
  Split,
  User,
  Clock,
  CheckCircle2,
  Printer,
  Search,
  X,
  Bell,
  PauseCircle,
  Send,
  ArrowLeftRight,
  GitMerge,
  Ban,
  Vault,
  Lock,
  Unlock,
  AlertTriangle,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useSync } from '../../sync/SyncContext.tsx';
import { SyncStatusIndicator } from '../sync/SyncStatusIndicator.tsx';
import { dataService, MenuItemProduct } from '../../services/dataService.ts';
import {
  CustomerOrder,
  CustomerOrderItem,
  PrepStation,
  ServiceType,
} from '../../domain/qrMenuTypes.ts';
import { tableService, RestaurantTable } from '../../services/tableService.ts';
import {
  shiftTreasuryService,
  ShiftRecord,
  DrawerMovementType,
} from '../../services/shiftTreasuryService.ts';
import {
  orderService,
  PaymentMethodType,
  SplitPaymentPart,
} from '../../services/orderService.ts';
import { orderTransport } from '../../services/orderTransport.ts';
import { customerService, CustomerProfile } from '../../services/customerService.ts';
import { uiPreferencesRepository, orderRepository } from '../../repositories/repositories.ts';
import { can } from '../../services/permissions.ts';
import { domainEvents } from '../../events/domainEvents.ts';
import { IncomingOrdersDrawer } from './IncomingOrdersDrawer.tsx';
import { printerService } from '../../services/printerService.ts';
import { productAvailabilityService } from '../../services/productAvailabilityService.ts';

type MobilePosTab = 'tables' | 'order' | 'orders' | 'drawer';

export const PosModule: React.FC = () => {
  const { currentUser, currentEstablishment, setActiveView } = useAuth();
  const { language, formatCurrency, formatNumber } = useI18n();
  const isAr = language === 'ar';
  const { showToast } = useToast();
  const { isOnline } = useSync();

  const estId = currentEstablishment?.id || 'est-1';
  const actorName = currentUser?.fullName || currentUser?.username || (isAr ? 'كاشير' : 'Cashier');
  const actorRole = currentUser?.role || 'cashier';

  // Shift State
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(() =>
    shiftTreasuryService.getActiveShift(estId)
  );
  const suggestedFloat = shiftTreasuryService.getLastHandoverFloat(estId);
  const [openingFloatInput, setOpeningFloatInput] = useState<string>(String(suggestedFloat));
  const [openingNote, setOpeningNote] = useState<string>('');

  // Products & Categories
  const [products, setProducts] = useState<MenuItemProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [flashedProductId, setFlashedProductId] = useState<string | null>(null);
  const [lastAddedIndex, setLastAddedIndex] = useState<number | null>(null);

  // Tables & Orders
  const [tables, setTables] = useState<RestaurantTable[]>(() => tableService.getTables(estId));
  const [orders, setOrders] = useState<CustomerOrder[]>(() => orderRepository.getAllSync(estId));
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | undefined>(undefined);

  // Current Cart / Order State
  const [serviceType, setServiceType] = useState<ServiceType>('dine_in');
  const [cartItems, setCartItems] = useState<CustomerOrderItem[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [pickupTime, setPickupTime] = useState<string>('15 دقيقة');
  const [manualDiscount, setManualDiscount] = useState<number>(0);
  const [couponCodeInput, setCouponCodeInput] = useState<string>('');
  const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);

  // Mobile Tab & Right Panel Tab
  const [mobileTab, setMobileTab] = useState<MobilePosTab>('order');
  const [rightPanelTab, setRightPanelTab] = useState<'tables' | 'orders' | 'drawer'>('tables');
  const [isIncomingDrawerOpen, setIsIncomingDrawerOpen] = useState(false);

  // Modals: Payment, Drawer Movement, Close Shift + Treasury, Table Transfer/Merge
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('');
  const [tipInput, setTipInput] = useState<string>('0');
  const [splitParts, setSplitParts] = useState<SplitPaymentPart[]>([
    { method: 'cash', amount: 0 },
    { method: 'card', amount: 0 },
  ]);

  const [isDrawerModalOpen, setIsDrawerModalOpen] = useState(false);
  const [drawerMoveType, setDrawerMoveType] = useState<DrawerMovementType>('expense');
  const [drawerMoveAmount, setDrawerMoveAmount] = useState<string>('');
  const [drawerMoveReason, setDrawerMoveReason] = useState<string>('');

  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [managerOverrideNote, setManagerOverrideNote] = useState<string>('');
  const [closedShiftForTreasury, setClosedShiftForTreasury] = useState<ShiftRecord | null>(null);
  const [treasuryDepositInput, setTreasuryDepositInput] = useState<string>('');
  const [retainedFloatInput, setRetainedFloatInput] = useState<string>('500');
  const [treasuryReceiverName, setTreasuryReceiverName] = useState<string>(
    isAr ? 'أمين الخزينة' : 'Treasury Officer'
  );

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferMode, setTransferMode] = useState<'transfer' | 'merge'>('transfer');

  const refreshAll = useCallback(async () => {
    const prods = await dataService.getProducts(estId);
    setProducts(prods.filter((p) => p.isActive));
    setTables(tableService.getTables(estId));
    setOrders(orderRepository.getAllSync(estId));
    setActiveShift(shiftTreasuryService.getActiveShift(estId));
  }, [estId]);

  useEffect(() => {
    void refreshAll();
    // Check CRM prefill
    const prefill = uiPreferencesRepository.getPosPrefillCustomer<{
      customerName?: string;
      customerPhone?: string;
      deliveryAddress?: string;
      items?: CustomerOrderItem[];
    }>();
    if (prefill) {
      if (prefill.customerName) setCustomerName(prefill.customerName);
      if (prefill.customerPhone) setCustomerPhone(prefill.customerPhone);
      if (prefill.deliveryAddress) {
        setDeliveryAddress(prefill.deliveryAddress);
        setServiceType('delivery');
      }
      if (Array.isArray(prefill.items) && prefill.items.length > 0) {
        setCartItems(prefill.items.map((i) => ({ ...i, lineStatus: 'new' })));
      }
      uiPreferencesRepository.clearPosPrefillCustomer();
    }

    const unsubEvents = domainEvents.subscribe('*', () => {
      setTables(tableService.getTables(estId));
      setOrders(orderRepository.getAllSync(estId));
      setActiveShift(shiftTreasuryService.getActiveShift(estId));
    });
    const unsubTransport = orderTransport.subscribe((ev) => {
      if (ev.type === 'ORDER_SUBMITTED' && ev.order.source === 'qr_menu' && ev.order.tableNumber) {
        tableService.flagPendingQrOrder(estId, ev.order.tableNumber);
      }
      setTables(tableService.getTables(estId));
      setOrders(orderRepository.getAllSync(estId));
    });

    return () => {
      unsubEvents();
      unsubTransport();
    };
  }, [estId, refreshAll]);

  // Totals calculation
  const totals = orderService.calculateTotals({
    items: cartItems,
    manualDiscountAmount: manualDiscount,
    taxRatePct: 14,
    serviceChargePct: serviceType === 'dine_in' ? 12 : 0,
    deliveryFee: serviceType === 'delivery' ? deliveryFee : 0,
  });

  // Open Shift Handler
  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Math.max(0, Number(openingFloatInput) || 0);
    const opened = shiftTreasuryService.openShift(estId, {
      cashierUsername: currentUser?.username || 'cashier',
      cashierName: actorName,
      openingFloat: amount,
      note: openingNote,
    });
    setActiveShift(opened);
    showToast({
      type: 'success',
      title: isAr ? 'تم فتح الوردية' : 'Shift Opened',
      message: isAr
        ? `تم فتح الوردية ${opened.zReportNumber} بعهدة ${formatCurrency(opened.openingFloat)}`
        : `Shift ${opened.zReportNumber} opened with ${formatCurrency(opened.openingFloat)}`,
    });
  };

  // Add item to cart with +1 flash & row highlight
  const handleAddProduct = (prod: MenuItemProduct) => {
    setFlashedProductId(prod.id);
    setTimeout(() => setFlashedProductId((prev) => (prev === prod.id ? null : prev)), 350);

    const station: PrepStation =
      prod.category.toLowerCase().includes('drink') || prod.category.includes('مشروب')
        ? 'bar'
        : prod.category.toLowerCase().includes('grill') || prod.category.includes('مشاوي')
          ? 'grill'
          : prod.category.toLowerCase().includes('dessert') || prod.category.includes('حلو')
            ? 'pastry'
            : 'kitchen';

    setCartItems((prev) => {
      const existingNewIdx = prev.findIndex(
        (i) => i.productId === prod.id && (!i.lineStatus || i.lineStatus === 'new')
      );
      if (existingNewIdx !== -1) {
        const next = [...prev];
        next[existingNewIdx] = {
          ...next[existingNewIdx],
          quantity: next[existingNewIdx].quantity + 1,
        };
        setLastAddedIndex(existingNewIdx);
        return next;
      }
      const next = [
        ...prev,
        {
          productId: prod.id,
          nameAr: prod.nameAr,
          nameEn: prod.nameEn,
          price: prod.sellingPrice,
          quantity: 1,
          station,
          lineStatus: 'new' as const,
        },
      ];
      setLastAddedIndex(next.length - 1);
      return next;
    });

    setTimeout(() => setLastAddedIndex(null), 600);
  };

  const handleUpdateQty = (idx: number, delta: number) => {
    const item = cartItems[idx];
    if (!item) return;

    // Lock sent items unless manager cancels
    if (item.lineStatus && item.lineStatus !== 'new' && delta < 0) {
      if (!can(actorRole, 'pos:cancel_sent_item')) {
        showToast({
          type: 'warning',
          title: isAr ? 'صلاحية مطلوبة' : 'Permission Required',
          message: isAr
            ? 'الصنف مُرسل للمطبخ بالفعل، يتطلب إلغاؤه صلاحية مدير'
            : 'Sent items require manager permission to cancel',
        });
        return;
      }
      if (activeOrderId) {
        void orderService
          .cancelSentItem(estId, activeOrderId, idx, isAr ? 'إلغاء من الكاشير' : 'Cashier void', actorName)
          .then((updated) => {
            if (updated) setCartItems(updated.items);
          });
        return;
      }
    }

    setCartItems((prev) => {
      const next = [...prev];
      const newQty = next[idx].quantity + delta;
      if (newQty <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...next[idx], quantity: newQty };
      }
      return next;
    });
  };

  const resetCart = () => {
    setCartItems([]);
    setActiveOrderId(undefined);
    setSelectedTable(null);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setManualDiscount(0);
    setCouponCodeInput('');
  };

  // Load table's active order into cart
  const handleSelectTable = (tbl: RestaurantTable) => {
    setSelectedTable(tbl);
    setServiceType('dine_in');

    if (tbl.activeOrderId) {
      const ord = orderRepository.getByIdSync(estId, tbl.activeOrderId);
      if (ord) {
        setActiveOrderId(ord.id);
        setCartItems(ord.items);
        setCustomerName(ord.customerName || '');
        setCustomerPhone(ord.customerPhone || '');
        setMobileTab('order');
        return;
      }
    }

    setActiveOrderId(undefined);
    setCartItems([]);
    setMobileTab('order');
  };

  // Save & Send to Stations
  const handleSaveAndSend = async () => {
    if (cartItems.length === 0) {
      showToast({
        type: 'warning',
        title: isAr ? 'السلة فارغة' : 'Empty Cart',
        message: isAr ? 'أضف صنفاً واحداً على الأقل قبل الإرسال' : 'Add at least one item first',
      });
      return;
    }
    if (serviceType === 'dine_in' && !selectedTable) {
      showToast({
        type: 'warning',
        title: isAr ? 'اختر طاولة' : 'Select Table',
        message: isAr ? 'يرجى اختيار طاولة لطلب الصالة' : 'Please select a table for dine-in',
      });
      return;
    }

    const saved = await orderService.saveAndSend(
      estId,
      {
        id: activeOrderId,
        establishmentId: estId,
        serviceType,
        tableNumber: selectedTable ? String(selectedTable.number) : undefined,
        customerName:
          customerName.trim() ||
          (selectedTable ? selectedTable.nameAr : isAr ? 'عميل كاشير' : 'Walk-in'),
        customerPhone: customerPhone.trim() || undefined,
        deliveryAddress: serviceType === 'delivery' ? deliveryAddress.trim() : undefined,
        pickupTime: serviceType === 'takeaway' ? pickupTime : undefined,
        items: cartItems,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        serviceFee: totals.serviceChargeAmount,
        deliveryFee: totals.deliveryFee,
        discountAmount: totals.totalDiscount,
        totalAmount: totals.totalAmount,
        stationStatuses: {},
        source: 'pos',
      },
      actorName
    );

    setActiveOrderId(saved.id);
    setCartItems(saved.items);
    await refreshAll();

    showToast({
      type: 'success',
      title: saved.isAddition
        ? isAr
          ? 'تم إرسال الإضافة للمحطات'
          : 'Addition Sent to Stations'
        : isAr
          ? 'تم الحفظ والإرسال للمحطات'
          : 'Saved & Sent to Stations',
      message: isAr
        ? `طلب ${saved.serialNumber} — تم توجيه الأصناف الجديدة لشاشات التحضير`
        : `Order ${saved.serialNumber} routed to prep stations`,
    });
  };

  // Hold Order
  const handleHoldOrder = async () => {
    if (cartItems.length === 0) return;
    const held = orderService.holdOrder(estId, {
      id: activeOrderId,
      establishmentId: estId,
      serviceType,
      tableNumber: selectedTable ? String(selectedTable.number) : undefined,
      customerName: customerName.trim() || (isAr ? 'طلب معلق' : 'Held Order'),
      customerPhone: customerPhone.trim() || undefined,
      items: cartItems,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      serviceFee: totals.serviceChargeAmount,
      deliveryFee: totals.deliveryFee,
      totalAmount: totals.totalAmount,
      stationStatuses: {},
      source: 'pos',
    });
    setActiveOrderId(held.id);
    await refreshAll();
    showToast({
      type: 'info',
      title: isAr ? 'تم تعليق الطلب' : 'Order Held',
      message: isAr ? `تم حفظ الطلب ${held.serialNumber} كمسودة` : `Saved ${held.serialNumber} as draft`,
    });
  };

  // Open Payment Modal
  const handleOpenCheckout = async () => {
    if (cartItems.length === 0) return;
    let orderIdToPay = activeOrderId;
    if (!orderIdToPay) {
      const held = orderService.holdOrder(estId, {
        establishmentId: estId,
        serviceType,
        tableNumber: selectedTable ? String(selectedTable.number) : undefined,
        customerName: customerName.trim() || (isAr ? 'عميل كاشير' : 'Walk-in'),
        customerPhone: customerPhone.trim() || undefined,
        items: cartItems,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        serviceFee: totals.serviceChargeAmount,
        deliveryFee: totals.deliveryFee,
        totalAmount: totals.totalAmount,
        stationStatuses: {},
        source: 'pos',
      });
      orderIdToPay = held.id;
      setActiveOrderId(held.id);
    }
    setCashReceivedInput(String(totals.totalAmount));
    setTipInput('0');
    setSplitParts([
      { method: 'cash', amount: Number((totals.totalAmount / 2).toFixed(2)) },
      { method: 'card', amount: Number((totals.totalAmount / 2).toFixed(2)) },
    ]);
    setIsPaymentOpen(true);
  };

  // Confirm Atomic Payment
  const handleConfirmPayment = async () => {
    if (!activeOrderId) return;
    const tip = Math.max(0, Number(tipInput) || 0);
    const cashRec = Math.max(0, Number(cashReceivedInput) || 0);

    const res = await orderService.processPaymentTransaction(estId, {
      orderId: activeOrderId,
      method: paymentMethod,
      cashReceived: cashRec,
      tipAmount: tip,
      splitParts: paymentMethod === 'split' ? splitParts : undefined,
      actorName,
      actorRole,
    });

    setIsPaymentOpen(false);
    resetCart();
    await refreshAll();

    showToast({
      type: 'success',
      title: isAr ? 'تم التحصيل وإغلاق الفاتورة' : 'Payment Completed',
      message: isAr
        ? `فاتورة ${res.order.serialNumber} — للدرج: ${formatCurrency(res.netCashToDrawer)}${
            res.changeDue > 0 ? ` · الباقي للعميل: ${formatCurrency(res.changeDue)}` : ''
          }`
        : `Order ${res.order.serialNumber} paid · Drawer: ${formatCurrency(res.netCashToDrawer)}`,
    });
  };

  // Lookup customer by phone
  const handleLookupCustomer = async () => {
    if (!customerPhone.trim()) return;
    const list = await customerService.getCustomers(estId);
    const norm = customerPhone.replace(/[\s\-()]/g, '');
    const found = list.find((c: CustomerProfile) => c.phone.includes(norm.slice(-8)));
    if (found) {
      setCustomerName(found.name);
      if (found.addresses[0]) setDeliveryAddress(found.addresses[0].description);
      showToast({
        type: 'success',
        title: isAr ? 'تم العثور على العميل' : 'Customer Found',
        message: `${found.name} (${found.loyaltyPoints} ${isAr ? 'نقطة' : 'pts'})`,
      });
    } else {
      showToast({
        type: 'info',
        title: isAr ? 'عميل جديد' : 'New Customer',
        message: isAr ? 'سيتم إنشاء ملف عميل تلقائياً عند إتمام الطلب' : 'Profile will be created on order',
      });
    }
  };

  // Drawer Movement Handler
  const handleSaveDrawerMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(drawerMoveAmount) || 0;
    if (amt <= 0 || !drawerMoveReason.trim()) return;
    const updated = shiftTreasuryService.recordDrawerMovement(estId, {
      type: drawerMoveType,
      amount: amt,
      reason: drawerMoveReason,
      actorName,
    });
    setActiveShift(updated);
    setDrawerMoveAmount('');
    setDrawerMoveReason('');
    setIsDrawerModalOpen(false);
    showToast({
      type: 'success',
      title: isAr ? 'تم تسجيل حركة الدرج' : 'Drawer Movement Recorded',
      message: isAr
        ? `رصيد الدرج الحالي: ${formatCurrency(updated.expectedDrawerCash)}`
        : `Current drawer: ${formatCurrency(updated.expectedDrawerCash)}`,
    });
  };

  // Close Shift Handler
  const handleCloseShift = () => {
    if (!activeShift) return;
    try {
      const closed = shiftTreasuryService.closeShift(estId, {
        actualCountedCash: Number(countedCashInput) || 0,
        managerOverrideNote: managerOverrideNote.trim() || undefined,
        actorName,
        actorRole,
      });
      setActiveShift(null);
      setClosedShiftForTreasury(closed);
      setTreasuryDepositInput(String(Math.max(0, (closed.actualCountedCash || 0) - 500)));
      setRetainedFloatInput('500');
      showToast({
        type: 'success',
        title: isAr ? 'تم إغلاق الوردية' : 'Shift Closed',
        message: isAr
          ? `تقرير ${closed.zReportNumber} — الفرق: ${formatCurrency(closed.discrepancy || 0)}`
          : `Z-Report ${closed.zReportNumber} closed`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'OPEN_TABLES_EXIST') {
        showToast({
          type: 'warning',
          title: isAr ? 'توجد طاولات مفتوحة' : 'Open Tables Exist',
          message: isAr
            ? 'يرجى إغلاق الطاولات المفتوحة أولاً أو إدخال مبرر مدير معتمد'
            : 'Close open tables first or enter a manager override note',
        });
      }
    }
  };

  // Treasury Deposit Handler
  const handleDepositToTreasury = () => {
    if (!closedShiftForTreasury) return;
    const res = shiftTreasuryService.depositShiftToTreasury(estId, {
      shiftId: closedShiftForTreasury.id,
      depositAmount: Number(treasuryDepositInput) || 0,
      retainedFloatForNextShift: Number(retainedFloatInput) || 0,
      receiverName: treasuryReceiverName,
      actorName,
    });
    setIsCloseShiftOpen(false);
    setClosedShiftForTreasury(null);
    showToast({
      type: 'success',
      title: isAr ? 'تم التوريد للخزينة بنجاح' : 'Deposited to Treasury',
      message: isAr
        ? `إيصال ${res.treasuryMovement.receiptNumber} — رصيد الخزينة: ${formatCurrency(
            res.treasuryMovement.balanceAfter
          )}`
        : `Receipt ${res.treasuryMovement.receiptNumber} recorded`,
    });
  };

  const pendingQrOrders = orders.filter((o) => o.status === 'pending_approval');
  const openPosOrders = orders.filter(
    (o) => o.status === 'draft' || o.status === 'sent' || o.status === 'preparing' || o.status === 'ready'
  );

  // =========================================================================
  // SHIFT GATE: CANNOT SELL WITHOUT AN OPEN SHIFT (Section 4)
  // =========================================================================
  if (!activeShift && !closedShiftForTreasury) {
    return (
      <div className="max-w-lg mx-auto my-8 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Unlock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white">
                {isAr ? 'فتح وردية كاشير جديدة' : 'Open Cashier Shift'}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'أهلاً بك! لا يمكن بدء البيع قبل فتح الوردية وتأكيد عهدة الدرج الافتتاحية.'
                  : 'An open shift with verified opening float is required before selling.'}
              </p>
            </div>
          </div>
          <SyncStatusIndicator />
        </div>

        <form onSubmit={handleOpenShift} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-semibold">
              {isAr ? 'العهدة المقترحة من الوردية السابقة:' : 'Suggested Handover Float:'}
            </span>
            <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
              {formatCurrency(suggestedFloat)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? 'العهدة الافتتاحية الفعلية في الدرج' : 'Actual Opening Drawer Float'}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={openingFloatInput}
              onChange={(e) => setOpeningFloatInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-lg font-mono font-bold text-slate-900 dark:text-white"
            />
          </div>

          {Number(openingFloatInput) !== suggestedFloat && (
            <div>
              <label className="block text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">
                {isAr
                  ? 'يوجد فرق عن العهدة المقترحة — يرجى كتابة السبب:'
                  : 'Variance from suggested float — please enter reason:'}
              </label>
              <input
                type="text"
                value={openingNote}
                onChange={(e) => setOpeningNote(e.target.value)}
                placeholder={isAr ? 'مثال: تم سحب فكة أو زيادة عهدة من الخزينة' : 'Reason for float difference'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-amber-400 text-sm"
              />
            </div>
          )}

          <Button type="submit" variant="primary" size="touch" className="w-full">
            <Unlock className="w-4 h-4" />
            <span>{isAr ? 'تأكيد وفتح الوردية الآن' : 'Confirm & Open Shift'}</span>
          </Button>
        </form>
      </div>
    );
  }

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q || p.nameAr.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const grandPayable = Number((totals.totalAmount + (Number(tipInput) || 0)).toFixed(2));
  const liveChangeDue =
    paymentMethod === 'cash'
      ? Math.max(0, Number(((Number(cashReceivedInput) || 0) - grandPayable).toFixed(2)))
      : 0;

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-5.5rem)] gap-3 pb-20 lg:pb-4">
      {/* Top POS Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {isAr ? 'نقطة البيع والكاشير' : 'Cashier POS'}
          </h1>
          {activeShift && (
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {activeShift.zReportNumber} · {isAr ? 'الدرج:' : 'Drawer:'}{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activeShift.expectedDrawerCash)}
              </strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SyncStatusIndicator />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsIncomingDrawerOpen(true)}
            className="relative"
          >
            <Bell className="w-4 h-4 text-amber-500" />
            <span>{isAr ? 'طلبات المنيو' : 'QR Orders'}</span>
            {pendingQrOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[11px] font-bold">
                {formatNumber(pendingQrOrders.length)}
              </span>
            )}
          </Button>
          {can(actorRole, 'order:trace') && (
            <Button variant="ghost" size="sm" onClick={() => setActiveView('order_trace')}>
              <span>{isAr ? 'تتبّع الطلب' : 'Trace'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main 3-Column Desktop Grid / Mobile Tabbed Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* COLUMN 1: PRODUCTS CATALOG (5 cols on lg) */}
        <div
          className={`lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 gap-3 ${
            mobileTab === 'order' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث عن صنف بالاسم أو الكود...' : 'Search item by name or code...'}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'primary' : 'outline'}
                size="sm"
                selected={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className="shrink-0"
              >
                {cat === 'ALL' ? (isAr ? 'الكل' : 'All') : cat}
              </Button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto flex-1 content-start">
            {filteredProducts.map((prod) => {
              const isFlashing = flashedProductId === prod.id;
              const avail = productAvailabilityService.getProductAvailability(prod.id, estId);
              const isOutOfStock = avail.status === 'out_of_stock';
              const isLowStock = avail.status === 'low_stock';

              return (
                <Button
                  key={prod.id}
                  variant="tile"
                  size="touch"
                  disabled={isOutOfStock}
                  onClick={() => {
                    if (isOutOfStock) {
                      showToast({
                        type: 'warning',
                        title: isAr ? 'غير متوفر الآن مؤقتاً' : 'Temporarily Out of Stock',
                        message: isAr
                          ? `الصنف [${prod.nameAr}] غير متاح حالياً لنفاد المخزون`
                          : 'Item is currently unavailable',
                      });
                      return;
                    }
                    handleAddProduct(prod);
                  }}
                  className={`flex-col items-start justify-between text-start h-24 p-3 relative overflow-hidden transition-all ${
                    isFlashing ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : ''
                  } ${
                    isOutOfStock
                      ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 opacity-60 cursor-not-allowed text-slate-400'
                      : isLowStock
                      ? 'bg-amber-100/90 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-100 shadow-xs'
                      : ''
                  }`}
                >
                  <div className="w-full flex items-start justify-between gap-1">
                    <span className="text-xs sm:text-sm font-bold line-clamp-2 text-slate-900 dark:text-white">
                      {isAr ? prod.nameAr : prod.nameEn}
                    </span>
                    {isLowStock && (
                      <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded-full shrink-0">
                        متبقي {avail.portionsAvailable}
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="text-[10px] font-bold bg-slate-400 text-white px-1.5 py-0.5 rounded shrink-0">
                        نافد
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full mt-auto">
                    <span className="text-xs font-mono font-extrabold text-cyan-700 dark:text-cyan-400">
                      {formatCurrency(prod.sellingPrice)}
                    </span>
                    {isFlashing && (
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 animate-bounce">
                        +1
                      </span>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: ORDER CART & FIXED ACTION BAR (4 cols on lg) */}
        <div
          className={`lg:col-span-4 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 gap-3 ${
            mobileTab === 'order' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Service Type Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant="outline"
              size="sm"
              selected={serviceType === 'dine_in'}
              onClick={() => setServiceType('dine_in')}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>{isAr ? 'صالة' : 'Dine-In'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              selected={serviceType === 'takeaway'}
              onClick={() => {
                setServiceType('takeaway');
                setSelectedTable(null);
              }}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isAr ? 'تيك أواي' : 'Takeaway'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              selected={serviceType === 'delivery'}
              onClick={() => {
                setServiceType('delivery');
                setSelectedTable(null);
              }}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{isAr ? 'دليفري' : 'Delivery'}</span>
            </Button>
          </div>

          {/* Context Header (Selected Table or Customer Info) */}
          {serviceType === 'dine_in' ? (
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs">
                <span className="text-slate-500">{isAr ? 'الطاولة:' : 'Table:'} </span>
                <strong className="text-slate-900 dark:text-white">
                  {selectedTable
                    ? isAr
                      ? selectedTable.nameAr
                      : selectedTable.nameEn
                    : isAr
                      ? 'لم يتم اختيار طاولة'
                      : 'No table selected'}
                </strong>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setRightPanelTab('tables');
                  setMobileTab('tables');
                }}
              >
                {isAr ? 'تغيير' : 'Select'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <div className="flex gap-1.5">
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={isAr ? 'رقم هاتف العميل' : 'Customer phone'}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
                <Button variant="outline" size="xs" onClick={handleLookupCustomer}>
                  <Search className="w-3.5 h-3.5" />
                </Button>
              </div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={isAr ? 'اسم العميل' : 'Customer name'}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
              />
              {serviceType === 'delivery' && (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={isAr ? 'عنوان التوصيل بالتفصيل' : 'Delivery address'}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                    placeholder={isAr ? 'رسوم' : 'Fee'}
                    className="w-16 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                </div>
              )}
              {serviceType === 'takeaway' && (
                <input
                  type="text"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder={isAr ? 'وقت الاستلام' : 'Pickup time'}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                />
              )}
            </div>
          )}

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[160px]">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-8">
                <ShoppingBag className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-semibold">
                  {isAr ? 'اضغط على أي صنف لإضافته للفاتورة' : 'Tap any item to add to order'}
                </p>
              </div>
            ) : (
              cartItems.map((item, idx) => {
                const isSent = item.lineStatus && item.lineStatus !== 'new';
                const isHighlighted = lastAddedIndex === idx;
                return (
                  <div
                    key={`${item.productId}-${idx}`}
                    className={`p-2.5 rounded-xl border transition-colors ${
                      isHighlighted
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-400'
                        : 'bg-slate-50/70 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {isAr ? item.nameAr : item.nameEn}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {formatCurrency(item.price)} × {formatNumber(item.quantity)} ={' '}
                          <strong className="text-slate-800 dark:text-slate-200">
                            {formatCurrency(item.price * item.quantity)}
                          </strong>
                          {' · '}
                          <span
                            className={
                              item.lineStatus === 'ready'
                                ? 'text-emerald-600 font-bold'
                                : isSent
                                  ? 'text-cyan-600 font-bold'
                                  : 'text-amber-600'
                            }
                          >
                            {item.lineStatus === 'ready'
                              ? isAr
                                ? 'جاهز'
                                : 'Ready'
                              : isSent
                                ? isAr
                                  ? 'مُرسل'
                                  : 'Sent'
                                : isAr
                                  ? 'جديد'
                                  : 'New'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleUpdateQty(idx, -1)}
                          aria-label={isAr ? 'إنقاص الكمية' : 'Decrease quantity'}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className="w-6 text-center text-xs font-mono font-bold">
                          {formatNumber(item.quantity)}
                        </span>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleUpdateQty(idx, 1)}
                          aria-label={isAr ? 'زيادة الكمية' : 'Increase quantity'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setEditingNoteIdx(editingNoteIdx === idx ? null : idx)}
                          aria-label={isAr ? 'ملاحظة' : 'Note'}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {(editingNoteIdx === idx || item.notes) && (
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCartItems((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], notes: val };
                            return next;
                          });
                        }}
                        placeholder={isAr ? 'ملاحظة للمطبخ (بدون بصل، وسط...)' : 'Kitchen note...'}
                        className="mt-2 w-full px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Totals Summary */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>{isAr ? 'الإجمالي الفرعي' : 'Subtotal'}</span>
              <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.serviceChargeAmount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>{isAr ? 'الخدمة (12%)' : 'Service (12%)'}</span>
                <span className="font-mono">{formatCurrency(totals.serviceChargeAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>{isAr ? 'الضريبة (14%)' : 'VAT (14%)'}</span>
              <span className="font-mono">{formatCurrency(totals.taxAmount)}</span>
            </div>
            {totals.deliveryFee > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>{isAr ? 'رسوم التوصيل' : 'Delivery Fee'}</span>
                <span className="font-mono">{formatCurrency(totals.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>{isAr ? 'الإجمالي النهائي' : 'Grand Total'}</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">
                {formatCurrency(totals.totalAmount)}
              </span>
            </div>
          </div>

          {/* Fixed Action Buttons */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                size="touch"
                disabled={cartItems.length === 0}
                onClick={handleSaveAndSend}
              >
                <Send className="w-4 h-4" />
                <span>{isAr ? 'حفظ وإرسال' : 'Save & Send'}</span>
              </Button>
              <Button
                variant="success"
                size="touch"
                disabled={cartItems.length === 0}
                onClick={handleOpenCheckout}
              >
                <Banknote className="w-4 h-4" />
                <span>{isAr ? 'محاسبة' : 'Checkout'}</span>
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <Button variant="outline" size="sm" disabled={cartItems.length === 0} onClick={handleHoldOrder}>
                <PauseCircle className="w-3.5 h-3.5" />
                <span>{isAr ? 'تعليق' : 'Hold'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!activeOrderId || serviceType !== 'dine_in'}
                onClick={() => {
                  setTransferMode('transfer');
                  setIsTransferModalOpen(true);
                }}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{isAr ? 'نقل' : 'Transfer'}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={cartItems.length === 0}
                onClick={() => {
                  printerService.printTicket(
                    {
                      id: activeOrderId || 'preview',
                      orderId: activeOrderId || 'preview',
                      serialNumber: '#PREVIEW',
                      station: 'cashier',
                      serviceType,
                      tableNumber: selectedTable ? String(selectedTable.number) : undefined,
                      customerName: customerName || (isAr ? 'عميل' : 'Guest'),
                      items: cartItems.map((it) => ({
                        productId: it.productId,
                        nameAr: it.nameAr,
                        nameEn: it.nameEn,
                        quantity: it.quantity,
                        notes: it.notes,
                      })),
                      status: 'pending',
                      createdAt: new Date().toISOString(),
                    },
                    currentEstablishment?.name || 'TYGOS'
                  );
                  showToast({
                    type: 'info',
                    title: isAr ? 'جاري الطباعة' : 'Printing',
                    message: isAr ? 'تم إرسال الفاتورة المبدئية للطابعة' : 'Sent receipt to printer',
                  });
                }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? 'طباعة' : 'Print'}</span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={cartItems.length === 0}
                onClick={async () => {
                  if (activeOrderId) {
                    await orderService.transitionStatus(estId, activeOrderId, 'cancelled', {
                      rejectionReason: isAr ? 'إلغاء من الكاشير' : 'Cancelled at POS',
                    });
                  }
                  resetCart();
                  await refreshAll();
                  showToast({
                    type: 'info',
                    title: isAr ? 'تم إلغاء الطلب' : 'Order Cancelled',
                    message: isAr ? 'تم مسح السلة وتحرير الطاولة' : 'Cart cleared',
                  });
                }}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* COLUMN 3: TABLES / OPEN ORDERS / CASH DRAWER (3 cols on lg) */}
        <div
          className={`lg:col-span-3 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 gap-3 ${
            mobileTab !== 'order' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Desktop Sub-Tabs */}
          <div className="hidden lg:grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
            <Button
              variant={rightPanelTab === 'tables' ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setRightPanelTab('tables')}
            >
              {isAr ? 'الطاولات' : 'Tables'}
            </Button>
            <Button
              variant={rightPanelTab === 'orders' ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setRightPanelTab('orders')}
            >
              {isAr ? 'الطلبات' : 'Orders'} ({formatNumber(openPosOrders.length)})
            </Button>
            <Button
              variant={rightPanelTab === 'drawer' ? 'primary' : 'ghost'}
              size="xs"
              onClick={() => setRightPanelTab('drawer')}
            >
              {isAr ? 'الدرج' : 'Drawer'}
            </Button>
          </div>

          {/* 1. TABLES GRID */}
          {(rightPanelTab === 'tables' || mobileTab === 'tables') && (
            <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 content-start">
              {tables.map((tbl) => {
                const isSelected = selectedTable?.id === tbl.id;
                const statusColor =
                  tbl.status === 'occupied'
                    ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30'
                    : tbl.status === 'awaiting_bill'
                      ? 'border-rose-400 bg-rose-50/70 dark:bg-rose-950/30'
                      : tbl.status === 'reserved'
                        ? 'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30'
                        : 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20';

                return (
                  <Button
                    key={tbl.id}
                    variant="tile"
                    size="touch"
                    selected={isSelected}
                    onClick={() => handleSelectTable(tbl)}
                    className={`flex-col items-start justify-between p-3 h-24 text-start ${statusColor}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        {isAr ? tbl.nameAr : tbl.nameEn}
                      </span>
                      {tbl.hasPendingQrOrder && (
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      {tbl.status === 'occupied'
                        ? isAr
                          ? 'مشغولة'
                          : 'Occupied'
                        : tbl.status === 'awaiting_bill'
                          ? isAr
                            ? 'تنتظر الحساب'
                            : 'Awaiting Bill'
                          : tbl.status === 'reserved'
                            ? isAr
                              ? 'محجوزة'
                              : 'Reserved'
                            : isAr
                              ? 'فارغة'
                              : 'Available'}
                    </div>
                    {tbl.activeOrderTotal !== undefined && (
                      <div className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        {formatCurrency(tbl.activeOrderTotal)}
                      </div>
                    )}
                  </Button>
                );
              })}
            </div>
          )}

          {/* 2. OPEN ORDERS LIST */}
          {(rightPanelTab === 'orders' || mobileTab === 'orders') && (
            <div className="space-y-2 overflow-y-auto flex-1">
              {openPosOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  {isAr ? 'لا توجد طلبات مفتوحة حالياً' : 'No open orders'}
                </p>
              ) : (
                openPosOrders.map((ord) => (
                  <Button
                    key={ord.id}
                    variant="tile"
                    size="md"
                    onClick={() => {
                      setActiveOrderId(ord.id);
                      setCartItems(ord.items);
                      setServiceType(ord.serviceType);
                      setCustomerName(ord.customerName);
                      setCustomerPhone(ord.customerPhone || '');
                      if (ord.tableNumber) {
                        const tbl = tableService.getTableByNumber(estId, ord.tableNumber);
                        setSelectedTable(tbl);
                      }
                      setMobileTab('order');
                    }}
                    className="w-full justify-between p-3 text-start"
                  >
                    <div>
                      <div className="text-xs font-mono font-black text-slate-900 dark:text-white">
                        {ord.serialNumber}{' '}
                        {ord.tableNumber ? `· ${isAr ? 'طاولة' : 'T'}${ord.tableNumber}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {ord.customerName} · {ord.status}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-600">
                      {formatCurrency(ord.totalAmount)}
                    </span>
                  </Button>
                ))
              )}
            </div>
          )}

          {/* 3. LIVE CASH DRAWER & SHIFT CLOSE */}
          {(rightPanelTab === 'drawer' || mobileTab === 'drawer') && activeShift && (
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-xs text-slate-500">{isAr ? 'الرصيد الحالي بالدرج' : 'Current Drawer Balance'}</div>
                <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(activeShift.expectedDrawerCash)}
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>{isAr ? 'عهدة:' : 'Float:'} {formatCurrency(activeShift.openingFloat)}</span>
                  <span>{isAr ? 'نقدي:' : 'Cash:'} {formatCurrency(activeShift.cashSales)}</span>
                  <span>{isAr ? 'بطاقة:' : 'Card:'} {formatCurrency(activeShift.cardSales)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDrawerMoveType('cash_in');
                    setIsDrawerModalOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isAr ? 'إيداع بالدرج' : 'Cash In'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDrawerMoveType('expense');
                    setIsDrawerModalOpen(true);
                  }}
                >
                  <Minus className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isAr ? 'مصروف / سحب' : 'Expense / Out'}</span>
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5">
                <div className="text-xs font-bold text-slate-500">
                  {isAr ? 'حركات الدرج بالوردية:' : 'Shift Drawer Movements:'}
                </div>
                {activeShift.movements.map((m) => (
                  <div
                    key={m.id}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <span className="truncate max-w-[140px]">{m.reason}</span>
                    <span
                      className={`font-mono font-bold ${
                        m.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.amount >= 0 ? '+' : ''}
                      {formatCurrency(m.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant="warning"
                size="touch"
                onClick={() => {
                  setCountedCashInput(String(activeShift.expectedDrawerCash));
                  setIsCloseShiftOpen(true);
                }}
              >
                <Lock className="w-4 h-4" />
                <span>{isAr ? 'إغلاق الوردية وتقرير Z' : 'Close Shift & Z-Report'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-1 p-1.5">
        <Button
          variant={mobileTab === 'tables' ? 'primary' : 'ghost'}
          size="touch"
          onClick={() => setMobileTab('tables')}
          className="flex-col gap-0.5 text-[11px]"
        >
          <Utensils className="w-4 h-4" />
          <span>{isAr ? 'الطاولات' : 'Tables'}</span>
        </Button>
        <Button
          variant={mobileTab === 'order' ? 'primary' : 'ghost'}
          size="touch"
          onClick={() => setMobileTab('order')}
          className="flex-col gap-0.5 text-[11px]"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>{isAr ? 'الطلب' : 'Order'} ({formatNumber(cartItems.length)})</span>
        </Button>
        <Button
          variant={mobileTab === 'orders' ? 'primary' : 'ghost'}
          size="touch"
          onClick={() => setMobileTab('orders')}
          className="flex-col gap-0.5 text-[11px]"
        >
          <Clock className="w-4 h-4" />
          <span>{isAr ? 'الطلبات' : 'Orders'}</span>
        </Button>
        <Button
          variant={mobileTab === 'drawer' ? 'primary' : 'ghost'}
          size="touch"
          onClick={() => setMobileTab('drawer')}
          className="flex-col gap-0.5 text-[11px]"
        >
          <Vault className="w-4 h-4" />
          <span>{isAr ? 'الدرج' : 'Drawer'}</span>
        </Button>
      </div>

      {/* PAYMENT / CHECKOUT MODAL */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {isAr ? 'إتمام الدفع والتحصيل' : 'Checkout & Payment'}
              </h2>
              <Button variant="ghost" size="xs" onClick={() => setIsPaymentOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {isAr ? 'المطلوب سداده:' : 'Total Due:'}
              </span>
              <span className="text-2xl font-mono font-black text-cyan-700 dark:text-cyan-300">
                {formatCurrency(grandPayable)}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'cash', labelAr: 'نقدي', labelEn: 'Cash', icon: <Banknote className="w-4 h-4" /> },
                  { id: 'card', labelAr: 'بطاقة', labelEn: 'Card', icon: <CreditCard className="w-4 h-4" /> },
                  { id: 'wallet', labelAr: 'محفظة', labelEn: 'Wallet', icon: <Wallet className="w-4 h-4" /> },
                  { id: 'credit', labelAr: 'آجل', labelEn: 'Credit', icon: <User className="w-4 h-4" /> },
                  { id: 'split', labelAr: 'مقسّم', labelEn: 'Split', icon: <Split className="w-4 h-4" /> },
                ] as const
              ).map((m) => (
                <Button
                  key={m.id}
                  variant="outline"
                  size="touch"
                  selected={paymentMethod === m.id}
                  onClick={() => setPaymentMethod(m.id)}
                >
                  {m.icon}
                  <span>{isAr ? m.labelAr : m.labelEn}</span>
                </Button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                  {isAr ? 'المبلغ المستلم من العميل:' : 'Cash Received:'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashReceivedInput}
                  onChange={(e) => setCashReceivedInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-lg font-mono font-bold"
                />
                <div className="flex flex-wrap gap-1.5">
                  {[grandPayable, 50, 100, 200, 500].map((amt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="xs"
                      onClick={() => setCashReceivedInput(String(amt))}
                    >
                      {i === 0 ? (isAr ? 'المبلغ بالضبط' : 'Exact') : formatCurrency(amt)}
                    </Button>
                  ))}
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex justify-between text-sm font-bold">
                  <span>{isAr ? 'الباقي للعميل:' : 'Change Due:'}</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(liveChangeDue)}
                  </span>
                </div>
              </div>
            )}

            {paymentMethod === 'split' && (
              <div className="space-y-2">
                {splitParts.map((part, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold w-20">
                      {part.method === 'cash' ? (isAr ? 'نقدي' : 'Cash') : isAr ? 'بطاقة' : 'Card'}
                    </span>
                    <input
                      type="number"
                      value={part.amount}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setSplitParts((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], amount: val };
                          return next;
                        });
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'إكرامية اختيارية (Tip):' : 'Optional Tip:'}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={tipInput}
                onChange={(e) => setTipInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono"
              />
            </div>

            <Button variant="success" size="touch" className="w-full" onClick={handleConfirmPayment}>
              <CheckCircle2 className="w-5 h-5" />
              <span>{isAr ? 'تأكيد التحصيل وإغلاق الفاتورة' : 'Confirm Payment & Close'}</span>
            </Button>
          </div>
        </div>
      )}

      {/* DRAWER MOVEMENT MODAL */}
      {isDrawerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveDrawerMovement}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black">
                {drawerMoveType === 'cash_in'
                  ? isAr
                    ? 'إيداع نقدي بالدرج'
                    : 'Drawer Cash In'
                  : isAr
                    ? 'مصروف / سحب من الدرج'
                    : 'Drawer Expense / Out'}
              </h3>
              <Button variant="ghost" size="xs" onClick={() => setIsDrawerModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={drawerMoveAmount}
              onChange={(e) => setDrawerMoveAmount(e.target.value)}
              placeholder={isAr ? 'المبلغ' : 'Amount'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono font-bold"
            />
            <input
              type="text"
              required
              value={drawerMoveReason}
              onChange={(e) => setDrawerMoveReason(e.target.value)}
              placeholder={isAr ? 'السبب (مثال: شراء ثلج / فكة)' : 'Reason'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm"
            />
            <Button type="submit" variant="primary" size="touch" className="w-full">
              {isAr ? 'حفظ الحركة' : 'Save Movement'}
            </Button>
          </form>
        </div>
      )}

      {/* CLOSE SHIFT & TREASURY HANDOVER MODAL */}
      {isCloseShiftOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">
                {closedShiftForTreasury
                  ? isAr
                    ? 'توريد نقدية الوردية للخزينة'
                    : 'Deposit Shift Cash to Treasury'
                  : isAr
                    ? 'إغلاق وتسليم الوردية (تقرير Z)'
                    : 'Close Shift & Z-Report'}
              </h2>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setIsCloseShiftOpen(false);
                  setClosedShiftForTreasury(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!closedShiftForTreasury && activeShift ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>{isAr ? 'العهدة الافتتاحية:' : 'Opening Float:'}</span>
                    <span className="font-mono">{formatCurrency(activeShift.openingFloat)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'المبيعات النقدية:' : 'Cash Sales:'}</span>
                    <span className="font-mono">{formatCurrency(activeShift.cashSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'مبيعات البطاقة:' : 'Card Sales:'}</span>
                    <span className="font-mono">{formatCurrency(activeShift.cardSales)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>{isAr ? 'النقدي المتوقع بالدرج:' : 'Expected Drawer Cash:'}</span>
                    <span className="font-mono text-cyan-600">
                      {formatCurrency(activeShift.expectedDrawerCash)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    {isAr ? 'النقدي الفعلي المعدود بالدرج:' : 'Actual Counted Cash:'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-lg font-mono font-bold"
                  />
                </div>

                <div className="text-xs font-bold flex justify-between">
                  <span>{isAr ? 'العجز / الزيادة:' : 'Discrepancy:'}</span>
                  <span
                    className={`font-mono ${
                      (Number(countedCashInput) || 0) - activeShift.expectedDrawerCash === 0
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {formatCurrency((Number(countedCashInput) || 0) - activeShift.expectedDrawerCash)}
                  </span>
                </div>

                {tableService.getOpenTables(estId).length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-amber-600 mb-1">
                      {isAr ? 'مبرر مدير لإغلاق الوردية مع وجود طاولات مفتوحة:' : 'Manager Override Note:'}
                    </label>
                    <input
                      type="text"
                      value={managerOverrideNote}
                      onChange={(e) => setManagerOverrideNote(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-400 text-xs"
                    />
                  </div>
                )}

                <Button variant="warning" size="touch" className="w-full" onClick={handleCloseShift}>
                  <Lock className="w-4 h-4" />
                  <span>{isAr ? 'اعتماد إغلاق الوردية وإصدار تقرير Z' : 'Confirm Close & Z-Report'}</span>
                </Button>
              </div>
            ) : (
              closedShiftForTreasury && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      {isAr ? 'المبلغ المورَّد للخزينة:' : 'Amount to Deposit to Treasury:'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={treasuryDepositInput}
                      onChange={(e) => setTreasuryDepositInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      {isAr ? 'العهدة المتبقية بالدرج للوردية التالية:' : 'Retained Float for Next Shift:'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={retainedFloatInput}
                      onChange={(e) => setRetainedFloatInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">
                      {isAr ? 'اسم المستلم (أمين الخزينة):' : 'Receiver Name:'}
                    </label>
                    <input
                      type="text"
                      value={treasuryReceiverName}
                      onChange={(e) => setTreasuryReceiverName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-sm"
                    />
                  </div>
                  <Button variant="success" size="touch" className="w-full" onClick={handleDepositToTreasury}>
                    <Building2 className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد التوريد للخزينة وإصدار إيصال' : 'Confirm Treasury Deposit'}</span>
                  </Button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* TABLE TRANSFER MODAL */}
      {isTransferModalOpen && activeOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black">
                {isAr ? 'نقل الطلب لطاولة أخرى' : 'Transfer Order to Table'}
              </h3>
              <Button variant="ghost" size="xs" onClick={() => setIsTransferModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {tables
                .filter((t) => t.status === 'available' && t.id !== selectedTable?.id)
                .map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    size="touch"
                    onClick={async () => {
                      orderService.transferTable(estId, activeOrderId, t.id);
                      setSelectedTable(t);
                      setIsTransferModalOpen(false);
                      await refreshAll();
                      showToast({
                        type: 'success',
                        title: isAr ? 'تم نقل الطاولة' : 'Table Transferred',
                        message: isAr ? `تم النقل إلى ${t.nameAr}` : `Moved to ${t.nameEn}`,
                      });
                    }}
                  >
                    {isAr ? t.nameAr : t.nameEn}
                  </Button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* INCOMING QR ORDERS DRAWER */}
      <IncomingOrdersDrawer
        isOpen={isIncomingDrawerOpen}
        onClose={() => setIsIncomingDrawerOpen(false)}
      />
    </div>
  );
};
