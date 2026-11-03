/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Utensils,
  ShoppingBag,
  Truck,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Split,
  Building,
  User,
  Clock,
  CheckCircle,
  Receipt,
  Search,
  X,
} from 'lucide-react';
import { MOCK_MENU_ITEMS, MOCK_TABLES } from '../../data/mockData.ts';
import { MenuItem, OrderItem, PosOrderMode, PosTable, TableStatus } from '../../types/index.ts';
import { useSync } from '../../sync/SyncContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const PosModule: React.FC = () => {
  const { addMockChange, isOnline } = useSync();
  const { t, formatCurrency, formatNumber, isRtl } = useI18n();

  const [mode, setMode] = useState<PosOrderMode>('dine_in');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedTable, setSelectedTable] = useState<PosTable | null>(MOCK_TABLES[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [itemSearch, setItemSearch] = useState('');

  // Cart State
  const [cart, setCart] = useState<OrderItem[]>([
    {
      productId: 'prd-1',
      name: 'Tygos Prime Truffle Ribeye',
      quantity: 2,
      unitPrice: 48.0,
      totalPrice: 96.0,
      department: 'Grill',
      selectedModifiers: ['Medium Rare', 'Extra Truffle Butter +$4'],
    },
    {
      productId: 'prd-5',
      name: 'Electric Cyan Botanical Mocktail',
      quantity: 2,
      unitPrice: 12.0,
      totalPrice: 24.0,
      department: 'Bar',
      selectedModifiers: ['Light Sweet'],
    },
  ]);

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'split' | 'room'>('card');
  const [orderSuccessModal, setOrderSuccessModal] = useState(false);

  // Categories
  const categories = ['All', 'Steaks & Grill', 'Seafood', 'Bakery & Oven', 'Pastry & Dessert', 'Mixology & Beverages', 'Coffee & Roastery'];
  const sections = ['All', 'Main Dining', 'Terrace & Lagoon', 'VIP Lounge', 'Mixology Bar'];

  // Filtered menu
  const filteredProducts = MOCK_MENU_ITEMS.filter((p) => {
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(itemSearch.toLowerCase());
    return matchesCat && matchesSearch && p.isAvailable;
  });

  // Filtered tables
  const filteredTables = MOCK_TABLES.filter((t) => {
    return selectedSection === 'All' || t.section === selectedSection;
  });

  const addToCart = (product: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
          totalPrice: product.sellingPrice,
          department: product.department,
          selectedModifiers: product.modifiers.slice(0, 1),
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId === productId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0
              ? { ...i, quantity: nextQty, totalPrice: nextQty * i.unitPrice }
              : null;
          }
          return i;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.14; // 14% VAT
  const total = subtotal + tax;

  const handleCompleteOrder = () => {
    addMockChange(
      'POS_ORDER',
      `Order on ${selectedTable?.tableNumber || 'Take Away'} - Total $${total.toFixed(2)} (${paymentMethod.toUpperCase()})`
    );
    setPaymentModalOpen(false);
    setOrderSuccessModal(true);
    setCart([]);
  };

  return (
    <div className="space-y-4">
      {/* Top POS Toolbar: Mode Selector & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
          <button
            onClick={() => setMode('dine_in')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'dine_in'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>{t('pos.dineIn')}</span>
          </button>
          <button
            onClick={() => setMode('take_away')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'take_away'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('pos.takeAway')}</span>
          </button>
          <button
            onClick={() => setMode('delivery')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'delivery'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>{t('pos.delivery')}</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {mode === 'dine_in' && selectedTable && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-500/30 rounded-lg text-cyan-700 dark:text-cyan-300">
              <span className="font-bold">{t('pos.activeTable')}</span>
              <span className="font-mono font-bold text-sm" dir="ltr">{selectedTable.tableNumber}</span>
              <span className="text-slate-500">· {selectedTable.section}</span>
            </div>
          )}
          {!isOnline && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30 rounded-lg">
              {t('common.offlineBanner')}
            </span>
          )}
        </div>
      </div>

      {/* Main POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Visual Table Management (Dine In) OR Category & Product Grid */}
        <div className="lg:col-span-8 space-y-4">
          {/* Table Management View */}
          {mode === 'dine_in' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('pos.floorPlan')}
                  </h3>
                  <span className="text-[10px] text-slate-400">({MOCK_TABLES.length} tables total)</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  {sections.map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setSelectedSection(sec)}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        selectedSection === sec
                          ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec === 'All' ? t('common.all') : sec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table Map Visual Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {filteredTables.map((tbl) => {
                  const isSelected = selectedTable?.id === tbl.id;
                  const statusColors: Record<TableStatus, { bg: string; text: string; border: string }> = {
                    available: {
                      bg: 'bg-slate-50 dark:bg-slate-950/60',
                      text: 'text-slate-600 dark:text-slate-400',
                      border: 'border-slate-200 dark:border-slate-800',
                    },
                    occupied: {
                      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                      text: 'text-emerald-700 dark:text-emerald-400',
                      border: 'border-emerald-500/40',
                    },
                    reserved: {
                      bg: 'bg-blue-50 dark:bg-blue-950/30',
                      text: 'text-blue-700 dark:text-blue-400',
                      border: 'border-blue-500/40',
                    },
                    waiting_payment: {
                      bg: 'bg-amber-50 dark:bg-amber-950/30',
                      text: 'text-amber-700 dark:text-amber-400',
                      border: 'border-amber-500/40',
                    },
                    closed: {
                      bg: 'bg-slate-100 dark:bg-slate-900/40',
                      text: 'text-slate-400',
                      border: 'border-slate-300 dark:border-slate-800',
                    },
                  };

                  const color = statusColors[tbl.status];

                  return (
                    <div
                      key={tbl.id}
                      onClick={() => setSelectedTable(tbl)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${color.bg} ${color.border} ${
                        isSelected ? 'ring-2 ring-cyan-400 shadow-md scale-[1.02]' : 'hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-black font-mono text-slate-900 dark:text-white" dir="ltr">
                          {tbl.tableNumber}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/60 dark:bg-black/30 font-mono" dir="ltr">
                          {tbl.capacity}p
                        </span>
                      </div>

                      <div className="mt-2 text-start">
                        <div className="text-[11px] font-semibold truncate text-slate-800 dark:text-slate-200">
                          {tbl.customerName || (tbl.status === 'available' ? t('dashboard.available') : 'Reserved')}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                          <span>{tbl.waiter || (tbl.status === 'occupied' ? t('dashboard.occupied') : tbl.status === 'waiting_payment' ? t('dashboard.waitingPayment') : t('dashboard.available'))}</span>
                          {tbl.orderTotal && (
                            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400" dir="ltr">
                              {formatCurrency(tbl.orderTotal)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Categories & Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat === 'All' ? t('common.all') : cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
                <input
                  type="text"
                  placeholder={t('pos.fastSearch')}
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:border-cyan-500/50 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-cyan-500 transition-colors">
                        {prod.name}
                      </h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                        {prod.department}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {prod.notes || prod.category}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/60">
                    <span className="text-sm font-extrabold font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                      {formatCurrency(prod.sellingPrice)}
                    </span>
                    <button className="w-7 h-7 rounded-lg bg-cyan-600/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-colors cursor-pointer">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Order Ticket & Checkout */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col justify-between">
          <div>
            {/* Ticket Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('pos.currentOrder')}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {t('pos.ticketNumber')} #{selectedTable?.currentOrderId || 'ORD-942'} · {mode.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => setCart([])}
                className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium cursor-pointer"
              >
                {t('pos.clear')}
              </button>
            </div>

            {/* Cart Items List */}
            <div className="my-3 space-y-2.5 max-h-80 overflow-y-auto pe-1">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <Utensils className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p>{t('pos.emptyOrder')}</p>
                  <p className="text-[11px] text-slate-500">{t('pos.selectItems')}</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.name}
                        </span>
                        {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                          <p className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                            {item.selectedModifiers.join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-200 ms-2" dir="ltr">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                      <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                        {formatCurrency(item.unitPrice)} ea
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-300 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing Summary & Checkout Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>{t('common.subtotal')}</span>
              <span className="font-mono text-slate-900 dark:text-white font-medium" dir="ltr">
                {formatCurrency(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{t('common.tax')} (14%)</span>
              <span className="font-mono text-slate-900 dark:text-white font-medium" dir="ltr">
                {formatCurrency(tax)}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>{t('pos.totalDue')}</span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                {formatCurrency(total)}
              </span>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={() => setPaymentModalOpen(true)}
              className={`w-full py-3 rounded-xl font-bold text-sm text-slate-950 transition-all flex items-center justify-center gap-2 mt-2 ${
                cart.length > 0
                  ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 cursor-pointer shadow-md shadow-cyan-950/40'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>{t('pos.chargeAndSettle')} ({formatCurrency(total)})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Settle Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('pos.settlePayment')}
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="my-4 text-center">
              <span className="text-xs text-slate-500 uppercase tracking-widest block">
                {t('pos.totalDue')}
              </span>
              <span className="text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                {formatCurrency(total)}
              </span>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>{t('pos.card')}</span>
              </button>

              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>{t('pos.cash')}</span>
              </button>

              <button
                onClick={() => setPaymentMethod('split')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'split'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Split className="w-5 h-5" />
                <span>{t('pos.split')}</span>
              </button>

              <button
                onClick={() => setPaymentMethod('room')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                  paymentMethod === 'room'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Building className="w-5 h-5" />
                <span>{t('pos.room')}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="w-1/3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCompleteOrder}
                className="w-2/3 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-xl shadow-md cursor-pointer"
              >
                {t('pos.confirmAndPrint')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Settled Receipt Modal */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('pos.settleSuccess')}
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Tygos POS · {t('common.phase2Badge')}
            </p>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-start text-xs space-y-1 font-mono mb-4">
              <div className="flex justify-between text-slate-400">
                <span>{t('common.total')}:</span>
                <span className="text-emerald-500 dark:text-emerald-400" dir="ltr">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t('pos.settlePayment')}:</span>
                <span className="text-slate-700 dark:text-slate-200">{paymentMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>E-Invoice:</span>
                <span className="text-cyan-500 dark:text-cyan-400" dir="ltr">#TYG-INV-9921</span>
              </div>
            </div>
            <button
              onClick={() => setOrderSuccessModal(false)}
              className="w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-750 cursor-pointer"
            >
              {t('pos.readyNext')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
