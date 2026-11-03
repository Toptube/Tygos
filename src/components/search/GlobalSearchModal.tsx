/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, X, Utensils, Users, Building, Package, DollarSign, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { formatCurrency } from '../../i18n/formatters.ts';
import {
  MOCK_MENU_ITEMS,
  MOCK_CUSTOMERS,
  MOCK_SUPPLIERS,
  MOCK_EMPLOYEES,
  MOCK_ESTABLISHMENTS,
} from '../../data/mockData.ts';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, setActiveView } = useAuth();
  const { t, language, dir } = useI18n();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  if (!isSearchOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedProducts = MOCK_MENU_ITEMS.filter((item) =>
    item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
  );
  const matchedCustomers = MOCK_CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  );
  const matchedSuppliers = MOCK_SUPPLIERS.filter((s) =>
    s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
  );
  const matchedEmployees = MOCK_EMPLOYEES.filter((e) =>
    e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
  );
  const matchedEsts = MOCK_ESTABLISHMENTS.filter((est) =>
    est.name.toLowerCase().includes(q) || est.code.toLowerCase().includes(q)
  );

  const navigateTo = (view: string) => {
    setActiveView(view);
    setIsSearchOpen(false);
    setQuery('');
  };

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            type="text"
            placeholder={t('search.placeholder', 'Search across Products, Recipes, Guests, Suppliers, Invoices, Accounts...')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded font-mono" dir="ltr">
            {t('search.pressEsc', 'ESC')}
          </span>
        </div>

        {/* Results Area */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 divide-y divide-slate-800/60">
          {/* Quick Categories Bar */}
          {!query && (
            <div className="py-2">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 block">
                {t('search.shortcuts', 'Quick Navigation Shortcuts')}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => navigateTo('pos')}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-start transition-colors cursor-pointer"
                >
                  <Utensils className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{t('navigation.pos', 'Point of Sale')}</span>
                </button>
                <button
                  onClick={() => navigateTo('cost_control')}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-start transition-colors cursor-pointer"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t('navigation.costControl', 'Cost Control')}</span>
                </button>
                <button
                  onClick={() => navigateTo('inventory')}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-start transition-colors cursor-pointer"
                >
                  <Package className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{t('navigation.inventory', 'Inventory Warehouses')}</span>
                </button>
                <button
                  onClick={() => navigateTo('crm')}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-start transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{t('crm.guestDirectory', 'Guest Directory')}</span>
                </button>
                <button
                  onClick={() => navigateTo('super_admin')}
                  className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-xs text-start transition-colors cursor-pointer"
                >
                  <Building className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{t('admin.controlCenter', 'Super Admin Center')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Products & Recipes */}
          {matchedProducts.length > 0 && (
            <div className="pt-3">
              <span className="text-xs uppercase tracking-wider text-cyan-400 font-semibold mb-2 block">
                {t('search.menuRecipes', 'Menu & Recipes')} ({matchedProducts.length})
              </span>
              <div className="space-y-1">
                {matchedProducts.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigateTo('menu')}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-800 cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{item.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.category} · {item.department}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-300" dir="ltr">
                        {formatCurrency(item.sellingPrice, language)}
                      </span>
                      <ArrowIcon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guests & CRM */}
          {matchedCustomers.length > 0 && (
            <div className="pt-3">
              <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold mb-2 block">
                {t('search.guestsCrm', 'Guests & CRM')} ({matchedCustomers.length})
              </span>
              <div className="space-y-1">
                {matchedCustomers.slice(0, 3).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigateTo('crm')}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-800 cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">
                        {c.name} <span className="font-mono text-cyan-400" dir="ltr">({c.code})</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {c.loyaltyTier} · {formatCurrency(c.totalSpent, language)}
                      </p>
                    </div>
                    <ArrowIcon className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Establishments (for Super Admin) */}
          {matchedEsts.length > 0 && (
            <div className="pt-3">
              <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold mb-2 block">
                {t('search.establishments', 'Establishments')} ({matchedEsts.length})
              </span>
              <div className="space-y-1">
                {matchedEsts.slice(0, 3).map((est) => (
                  <div
                    key={est.id}
                    onClick={() => navigateTo('super_admin')}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-slate-800 cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-medium text-slate-200">
                        {est.name} <span className="font-mono text-cyan-300" dir="ltr">[{est.code}]</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {est.city}, {est.country} · {est.businessType}
                      </p>
                    </div>
                    <ArrowIcon className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>{t('search.footerTip', 'Tip: Press ⌘K anywhere to launch search')}</span>
          <span className="text-cyan-400 font-medium">{t('search.engineName', 'Tygos Unified Intelligence')}</span>
        </div>
      </div>
    </div>
  );
};
