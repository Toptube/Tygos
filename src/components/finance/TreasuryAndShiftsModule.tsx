/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TREASURY & SHIFT Z-REPORTS MODULE (Phase 7 - Section 4)
 * - Running Treasury Balance & Movements Ledger
 * - Pending Shift Cash Handover / Deposit to Treasury
 * - Z-Report History with Cashier, Date, and Discrepancy Filters
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  Vault,
  FileSpreadsheet,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import {
  shiftTreasuryService,
  ShiftRecord,
  TreasuryMovement,
} from '../../services/shiftTreasuryService.ts';
import { formatMoney } from '../../utils/formatters.ts';
import { domainEvents } from '../../events/domainEvents.ts';

export const TreasuryAndShiftsModule: React.FC = () => {
  const { currentEstablishment, currentUser } = useAuth();
  const { language } = useI18n();
  const isAr = language === 'ar';
  const estId = currentEstablishment?.id || 'default';
  const currency = currentEstablishment?.currency || 'EGP';

  const [tab, setTab] = useState<'treasury' | 'shifts'>('treasury');
  const [balance, setBalance] = useState(0);
  const [movements, setMovements] = useState<TreasuryMovement[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Filters for Z-Reports
  const [cashierFilter, setCashierFilter] = useState('');
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);

  // Manual Treasury Transaction Modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [txType, setTxType] = useState<'general_expense' | 'bank_deposit' | 'capital_in'>(
    'general_expense'
  );
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txReceiver, setTxReceiver] = useState('');

  // Deposit Shift Modal
  const [depositShift, setDepositShift] = useState<ShiftRecord | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [retainedFloat, setRetainedFloat] = useState('500');
  const [receiverName, setReceiverName] = useState('أمين الخزينة');

  const loadData = () => {
    setBalance(shiftTreasuryService.getTreasuryBalance(estId));
    setMovements(shiftTreasuryService.getTreasuryMovements(estId));
    setShifts(shiftTreasuryService.getAllShifts(estId));
  };

  useEffect(() => {
    loadData();
    const unsub1 = domainEvents.subscribe('cash.deposited', loadData);
    const unsub2 = domainEvents.subscribe('shift.closed', loadData);
    return () => {
      unsub1();
      unsub2();
    };
  }, [estId]);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleManualTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(txAmount);
    if (!amt || amt <= 0 || !txDesc.trim()) return;
    shiftTreasuryService.recordTreasuryTransaction(estId, {
      type: txType,
      amount: amt,
      description: txDesc.trim(),
      receiverName: txReceiver.trim() || (isAr ? 'الإدارة المالية' : 'Finance'),
      actorName: currentUser?.fullName || currentUser?.username || 'Manager',
    });
    setShowTxModal(false);
    setTxAmount('');
    setTxDesc('');
    setTxReceiver('');
    loadData();
    showNotice(isAr ? 'تم تسجيل حركة الخزينة بنجاح' : 'Treasury transaction recorded');
  };

  const openDepositModal = (s: ShiftRecord) => {
    const counted = s.actualCountedCash ?? s.expectedDrawerCash;
    const defaultRetain = Math.min(500, counted);
    setDepositShift(s);
    setRetainedFloat(String(defaultRetain));
    setDepositAmount(String(Math.max(0, Number((counted - defaultRetain).toFixed(2)))));
  };

  const handleConfirmDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositShift) return;
    shiftTreasuryService.depositShiftToTreasury(estId, {
      shiftId: depositShift.id,
      depositAmount: Number(depositAmount) || 0,
      retainedFloatForNextShift: Number(retainedFloat) || 0,
      receiverName: receiverName.trim() || 'أمين الخزينة',
      actorName: currentUser?.fullName || currentUser?.username || 'Manager',
    });
    setDepositShift(null);
    loadData();
    showNotice(isAr ? 'تم توريد نقدية الوردية إلى الخزينة' : 'Shift cash deposited to treasury');
  };

  const closedShifts = shifts.filter((s) => s.status === 'closed');
  const undepositedShifts = closedShifts.filter((s) => !s.depositedToTreasury);
  const filteredShifts = closedShifts.filter((s) => {
    if (
      cashierFilter.trim() &&
      !s.cashierName.toLowerCase().includes(cashierFilter.toLowerCase()) &&
      !s.zReportNumber.toLowerCase().includes(cashierFilter.toLowerCase())
    ) {
      return false;
    }
    if (discrepancyOnly && Math.abs(s.discrepancy || 0) < 0.01) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed bottom-5 end-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Vault className="w-5 h-5 text-emerald-500" />
            <span>{isAr ? 'الخزينة وتقارير الورديات (Z-Reports)' : 'Treasury & Shift Z-Reports'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'رصيد الخزينة الفعلي، استلام عهدة الورديات، وسجل تقارير الإغلاق والعجز/الزيادة'
              : 'Live treasury balance, shift cash handovers, and Z-Report audit history'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowTxModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            {isAr ? 'حركة خزينة' : 'Treasury Entry'}
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {isAr ? 'رصيد الخزينة الحالي' : 'Current Treasury Balance'}
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {formatMoney(balance, currency, language)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {isAr ? 'ورديات بانتظار التوريد' : 'Pending Shift Deposits'}
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {undepositedShifts.length}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {isAr ? 'إجمالي تقارير Z المغلقة' : 'Total Closed Z-Reports'}
          </div>
          <div className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-1">
            {closedShifts.length}
          </div>
        </div>
      </div>

      {/* Pending Undeposited Shifts Alert */}
      {undepositedShifts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4" />
            <span>
              {isAr
                ? 'ورديات مغلقة لم يتم توريد نقديتها للخزينة بعد:'
                : 'Closed shifts awaiting cash deposit to treasury:'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {undepositedShifts.map((s) => (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-mono text-xs font-black text-slate-900 dark:text-white">
                    {s.zReportNumber} — {s.cashierName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {isAr ? 'النقدية المعدودة:' : 'Counted Cash:'}{' '}
                    <strong className="font-mono text-emerald-600">
                      {formatMoney(s.actualCountedCash ?? s.expectedDrawerCash, currency, language)}
                    </strong>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => openDepositModal(s)}
                >
                  {isAr ? 'توريد للخزينة' : 'Deposit'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={tab === 'treasury' ? 'primary' : 'outline'}
          selected={tab === 'treasury'}
          onClick={() => setTab('treasury')}
          icon={<Vault className="w-4 h-4" />}
        >
          {isAr ? 'سجل حركات الخزينة' : 'Treasury Ledger'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === 'shifts' ? 'primary' : 'outline'}
          selected={tab === 'shifts'}
          onClick={() => setTab('shifts')}
          icon={<FileSpreadsheet className="w-4 h-4" />}
        >
          {isAr ? 'تقارير الورديات (Z-Reports)' : 'Shift Z-Reports'}
        </Button>
      </div>

      {/* Tab 1: Treasury Movements */}
      {tab === 'treasury' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {movements.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              {isAr ? 'لا توجد حركات خزينة مسجلة بعد' : 'No treasury movements recorded yet'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 text-start">{isAr ? 'رقم الإيصال' : 'Receipt #'}</th>
                    <th className="p-3 text-start">{isAr ? 'البيان' : 'Description'}</th>
                    <th className="p-3 text-start">{isAr ? 'المستلم / الجهة' : 'Receiver'}</th>
                    <th className="p-3 text-start">{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className="p-3 text-start">{isAr ? 'الرصيد بعد' : 'Balance After'}</th>
                    <th className="p-3 text-start">{isAr ? 'القيد' : 'Journal'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {m.receiptNumber}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {m.description}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{m.receiverName}</td>
                      <td className="p-3 font-mono font-black">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            m.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {m.amount >= 0 ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                          {formatMoney(Math.abs(m.amount), currency, language)}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {formatMoney(m.balanceAfter, currency, language)}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {m.journalEntryRef || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Shift Z-Reports */}
      {tab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
              placeholder={isAr ? 'بحث باسم الكاشير أو رقم تقرير Z...' : 'Filter by cashier or Z-#...'}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold min-w-[220px]"
            />
            <Button
              type="button"
              size="sm"
              variant={discrepancyOnly ? 'primary' : 'outline'}
              selected={discrepancyOnly}
              onClick={() => setDiscrepancyOnly(!discrepancyOnly)}
            >
              {isAr ? 'الورديات ذات العجز/الزيادة فقط' : 'Discrepancies Only'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredShifts.map((s) => {
              const disc = s.discrepancy || 0;
              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <span className="font-mono text-sm font-black text-cyan-600 dark:text-cyan-400">
                        {s.zReportNumber}
                      </span>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {s.cashierName}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        Math.abs(disc) < 0.01
                          ? 'bg-emerald-500/15 text-emerald-600'
                          : disc < 0
                          ? 'bg-rose-500/15 text-rose-600'
                          : 'bg-amber-500/15 text-amber-600'
                      }`}
                    >
                      {Math.abs(disc) < 0.01
                        ? isAr ? 'مطابق 100%' : 'Exact Match'
                        : disc < 0
                        ? `${isAr ? 'عجز' : 'Short'}: ${formatMoney(Math.abs(disc), currency, language)}`
                        : `${isAr ? 'زيادة' : 'Over'}: ${formatMoney(disc, currency, language)}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <span className="text-slate-400 block text-[10px]">
                        {isAr ? 'مبيعات الكاش' : 'Cash Sales'}
                      </span>
                      <strong className="font-mono">
                        {formatMoney(s.cashSales, currency, language)}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <span className="text-slate-400 block text-[10px]">
                        {isAr ? 'شبكة / محفظة' : 'Card / Wallet'}
                      </span>
                      <strong className="font-mono">
                        {formatMoney(s.cardSales + s.walletSales, currency, language)}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <span className="text-slate-400 block text-[10px]">
                        {isAr ? 'المتوقع بالدرج' : 'Expected Drawer'}
                      </span>
                      <strong className="font-mono">
                        {formatMoney(s.expectedDrawerCash, currency, language)}
                      </strong>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950">
                      <span className="text-slate-400 block text-[10px]">
                        {isAr ? 'المعدود الفعلي' : 'Actual Counted'}
                      </span>
                      <strong className="font-mono">
                        {formatMoney(s.actualCountedCash ?? s.expectedDrawerCash, currency, language)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    {s.depositedToTreasury ? (
                      <span className="text-emerald-600 font-bold">
                        ✓ {isAr ? 'تم التوريد للخزينة:' : 'Deposited:'}{' '}
                        <span className="font-mono">{s.treasuryReceiptNumber}</span>
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => openDepositModal(s)}
                      >
                        {isAr ? 'توريد للخزينة' : 'Deposit to Treasury'}
                      </Button>
                    )}
                    <span className="text-slate-400 font-mono">
                      {s.ordersCount} {isAr ? 'طلبات' : 'orders'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Treasury Transaction Modal */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleManualTx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? 'تسجيل حركة خزينة' : 'Record Treasury Movement'}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowTxModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{isAr ? 'نوع الحركة' : 'Type'}</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              >
                <option value="general_expense">{isAr ? 'مصروف عام من الخزينة' : 'General Expense'}</option>
                <option value="bank_deposit">{isAr ? 'إيداع بنكي' : 'Bank Deposit'}</option>
                <option value="capital_in">{isAr ? 'تغذية خزينة / رأس مال' : 'Capital / Cash In'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{isAr ? 'المبلغ' : 'Amount'}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{isAr ? 'البيان / السبب' : 'Description'}</label>
              <input
                type="text"
                value={txDesc}
                onChange={(e) => setTxDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{isAr ? 'المستلم / الجهة' : 'Receiver'}</label>
              <input
                type="text"
                value={txReceiver}
                onChange={(e) => setTxReceiver(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowTxModal(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary">
                {isAr ? 'حفظ الحركة' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Deposit Shift Modal */}
      {depositShift && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDeposit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isAr
                  ? `توريد وردية ${depositShift.zReportNumber} للخزينة`
                  : `Deposit Shift ${depositShift.zReportNumber}`}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setDepositShift(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'المبلغ المورّد للخزينة' : 'Deposit Amount'}
              </label>
              <input
                type="number"
                step="0.01"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'فكة متبقية بالدرج للوردية القادمة' : 'Retained Float for Next Shift'}
              </label>
              <input
                type="number"
                step="0.01"
                value={retainedFloat}
                onChange={(e) => setRetainedFloat(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'اسم مستلم الخزينة' : 'Treasury Receiver Name'}
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDepositShift(null)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary">
                {isAr ? 'تأكيد التوريد وإصدار إيصال' : 'Confirm Deposit'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
