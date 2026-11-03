/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Package,
  Layers,
  ArrowRightLeft,
  ArrowDownLeft,
  RotateCcw,
  ClipboardCheck,
  Search,
  Building,
  Plus,
  AlertTriangle,
  X,
} from 'lucide-react';
import { MOCK_STOCK_BALANCES, MOCK_WAREHOUSES } from '../../data/mockData.ts';
import { StockBalanceItem, Warehouse } from '../../types/index.ts';
import { useSync } from '../../sync/SyncContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const InventoryModule: React.FC = () => {
  const { addMockChange } = useSync();
  const { t, formatCurrency, formatNumber } = useI18n();

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'balance' | 'warehouses' | 'transfer' | 'adjust'>('balance');

  // Transfer Modal Simulation State
  const [transferModal, setTransferModal] = useState(false);
  const [transferSource, setTransferSource] = useState('wh-1');
  const [transferDest, setTransferDest] = useState('wh-2');
  const [transferItem, setTransferItem] = useState('ING-001 (Black Angus Ribeye)');
  const [transferQty, setTransferQty] = useState('10');
  const [toastMessage, setToastMessage] = useState('');

  const filteredItems = MOCK_STOCK_BALANCES.filter((item) => {
    const matchesWh = selectedWarehouseId === 'all' || item.warehouseId === selectedWarehouseId;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWh && matchesSearch;
  });

  const totalInventoryValuation = MOCK_STOCK_BALANCES.reduce(
    (sum, item) => sum + item.totalValuation,
    0
  );

  const handleExecuteTransfer = () => {
    addMockChange(
      'STOCK_MOVEMENT',
      `Inter-warehouse transfer: ${transferQty}kg ${transferItem} from Central to Kitchen`
    );
    setTransferModal(false);
    setToastMessage(`Transfer request #TR-${Date.now().toString().slice(-4)} processed.`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('inventory.title')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('inventory.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTransferModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{t('inventory.transfer')}</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center justify-between animate-fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Warehouse Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_WAREHOUSES.map((wh) => (
          <div
            key={wh.id}
            onClick={() => setSelectedWarehouseId(wh.id === selectedWarehouseId ? 'all' : wh.id)}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              selectedWarehouseId === wh.id
                ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" dir="ltr">
                {wh.code}
              </span>
              <Building className="w-4 h-4 text-cyan-500" />
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
              {wh.name}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">{wh.location}</p>

            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
              <span className="text-slate-400">{wh.totalItems} Items</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-200" dir="ltr">
                {formatCurrency(wh.totalValue)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Stock Balances Table with Theoretical vs Book vs Physical Distinction */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
              <input
                type="text"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedWarehouseId('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                selectedWarehouseId === 'all'
                  ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {t('common.all')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t('finance.accountCode')}</th>
                <th className="py-3 px-4 text-start">{t('menu.ingredient')}</th>
                <th className="py-3 px-3 text-start">{t('inventory.title')}</th>
                <th className="py-3 px-3 text-end">{t('menu.portionCost')}</th>
                <th className="py-3 px-3 text-end">{t('inventory.theoreticalStock')}</th>
                <th className="py-3 px-3 text-end">{t('inventory.bookStock')}</th>
                <th className="py-3 px-3 text-end">{t('inventory.physicalStock')}</th>
                <th className="py-3 px-3 text-end">{t('inventory.variance')}</th>
                <th className="py-3 px-3 text-end">{t('inventory.valuation')}</th>
                <th className="py-3 px-4 text-center">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400 text-start" dir="ltr">
                    {item.code}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 text-start">
                    {item.name}
                  </td>
                  <td className="py-3 px-3 text-slate-500 text-start">
                    {item.warehouseName.split(' ')[0]}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                    {formatCurrency(item.costPerUnit)} / {item.unit}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                    {item.theoreticalStock} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-end font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                    {item.bookStock} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                    {item.physicalStock} {item.unit}
                  </td>
                  <td
                    className={`py-3 px-3 text-end font-mono font-bold ${
                      item.variance < 0 ? 'text-rose-500' : 'text-emerald-500'
                    }`}
                    dir="ltr"
                  >
                    {item.variance === 0 ? '0.00' : `${item.variance} ${item.unit}`}
                  </td>
                  <td className="py-3 px-3 text-end font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                    {formatCurrency(item.totalValuation)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'in_stock'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : item.status === 'low_stock'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>{t('inventory.subtitle')}</span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
            {t('inventory.valuation')}: {formatCurrency(totalInventoryValuation)}
          </span>
        </div>
      </div>

      {/* Inter-Warehouse Transfer Modal */}
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                <span>{t('inventory.transfer')}</span>
              </h3>
              <button onClick={() => setTransferModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">{t('inventory.sourceWh')}</label>
                <select
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="wh-1">Central Refrigerated & Dry Hub</option>
                  <option value="wh-2">Kitchen Hot Line & Walk-in Chiller</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{t('inventory.destWh')}</label>
                <select
                  value={transferDest}
                  onChange={(e) => setTransferDest(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="wh-2">Kitchen Hot Line & Walk-in Chiller</option>
                  <option value="wh-3">Main Lounge Cellar & Bar Store</option>
                  <option value="wh-4">Bakehouse & Pastry Cold Vault</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{t('menu.ingredient')}</label>
                <input
                  type="text"
                  value={transferItem}
                  onChange={(e) => setTransferItem(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">{t('common.quantity')}</label>
                <input
                  type="number"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setTransferModal(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-500 hover:text-white cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleExecuteTransfer}
                className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg cursor-pointer"
              >
                {t('inventory.dispatchTransfer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
