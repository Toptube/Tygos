/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Truck,
  FileText,
  CheckCircle,
  Clock,
  Plus,
  DollarSign,
  Search,
  Building,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { MOCK_PURCHASE_ORDERS, MOCK_SUPPLIERS } from '../../data/mockData.ts';
import { PurchaseOrder, Supplier } from '../../types/index.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const PurchasingModule: React.FC = () => {
  const { t, formatCurrency, formatNumber } = useI18n();
  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder>(MOCK_PURCHASE_ORDERS[0]);

  const filteredPOs = MOCK_PURCHASE_ORDERS.filter((po) =>
    po.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = MOCK_SUPPLIERS.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('purchasing.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('purchasing.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-1 bg-slate-100 dark:bg-slate-950 rounded-lg">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              {t('purchasing.poPipeline')}
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              {t('purchasing.approvedSuppliers')}
            </button>
          </div>
        </div>
      </div>

      {/* Procurement Lifecycle Steps Diagram */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
          {t('purchasing.matchVerified')}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs text-center">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-cyan-500 font-bold block">1</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Requisition</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-cyan-500 font-bold block">2</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">PO Approval</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-cyan-500 font-bold block">3</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Supplier Issue</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-cyan-500 font-bold block">4</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Receiving</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-cyan-500 font-bold block">5</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">3-Way Match</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-emerald-500 font-bold block">6</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">AP Payment</span>
          </div>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Purchase Orders Table */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('purchasing.poPipeline')}
              </h3>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder={t('common.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-8 pe-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{t('purchasing.orderNumber')}</th>
                    <th className="py-3 px-4 text-start">{t('purchasing.vendor')}</th>
                    <th className="py-3 px-3 text-start">{t('purchasing.deliveryDate')}</th>
                    <th className="py-3 px-3 text-end">{t('common.quantity')}</th>
                    <th className="py-3 px-3 text-end">{t('common.total')}</th>
                    <th className="py-3 px-4 text-center">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredPOs.map((po) => {
                    const isSelected = selectedPO.id === po.id;
                    return (
                      <tr
                        key={po.id}
                        onClick={() => setSelectedPO(po)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-cyan-50 dark:bg-cyan-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 text-start" dir="ltr">
                          {po.orderNumber}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 text-start">
                          {po.supplierName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-start" dir="ltr">
                          {po.deliveryDate}
                        </td>
                        <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300">
                          {po.itemsCount} lines
                        </td>
                        <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                          {formatCurrency(po.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              po.status === 'paid'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : po.status === 'approved'
                                ? 'bg-cyan-500/10 text-cyan-500'
                                : po.status === 'received'
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected PO Details Card */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white" dir="ltr">
                  {selectedPO.orderNumber}
                </h3>
                <p className="text-[11px] text-slate-500" dir="ltr">
                  {selectedPO.issueDate}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                {selectedPO.status}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">{t('purchasing.vendor')}</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedPO.supplierName}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Net 30 · {t('purchasing.deliveryDate')}: <span dir="ltr">{selectedPO.deliveryDate}</span></p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">{t('common.total')}</span>
                <span className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                  {formatCurrency(selectedPO.totalAmount)}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                {t('purchasing.matchVerified')}
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
                  <span>1. Purchase Order</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
                  <span>2. Receiving Slip</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
                  <span>3. Supplier Tax Invoice</span>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Approved Suppliers Table */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('purchasing.approvedSuppliers')}
            </h3>
            <span className="text-xs text-slate-500">{filteredSuppliers.length} vendors</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-start">{t('admin.tableCode')}</th>
                  <th className="py-3 px-4 text-start">{t('purchasing.vendor')}</th>
                  <th className="py-3 px-4 text-start">{t('admin.tableType')}</th>
                  <th className="py-3 px-4 text-start">{t('registration.primaryPhone')}</th>
                  <th className="py-3 px-3 text-start">Rating</th>
                  <th className="py-3 px-3 text-start">Terms</th>
                  <th className="py-3 px-4 text-end">{t('purchasing.balanceDue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 text-start" dir="ltr">
                      {s.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 text-start">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-start">
                      {s.category}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-start" dir="ltr">
                      {s.contactPerson} ({s.phone})
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-500 text-start">
                      ★ {s.rating}
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-start">
                      {s.paymentTerms}
                    </td>
                    <td className="py-3 px-4 text-end font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                      {formatCurrency(s.balanceDue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
