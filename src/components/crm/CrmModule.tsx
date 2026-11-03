/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Users,
  Award,
  Heart,
  Star,
  Search,
  DollarSign,
  Utensils,
  Phone,
  Mail,
} from 'lucide-react';
import { MOCK_CUSTOMERS } from '../../data/mockData.ts';
import { Customer } from '../../types/index.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { formatCurrency, formatNumber } from '../../i18n/formatters.ts';

export const CrmModule: React.FC = () => {
  const { t, language } = useI18n();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>(MOCK_CUSTOMERS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCustomers = MOCK_CUSTOMERS.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('crm.title', 'Guest CRM, VIP Profiles & Loyalty')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('crm.subtitle', 'Guest visit histories, lifetime spend records, loyalty reward tiers, dietary preferences, and satisfaction ratings.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold">
            <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
            <span dir="ltr">4.9 / 5.0</span>
            <span>{t('crm.guestIndex', 'Average Guest Index')}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Guest Directory on Left, Detailed Guest Profile & History on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer Directory */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              placeholder={t('crm.searchPlaceholder', 'Search guest by name, VIP code, or phone...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full ps-9 pe-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pe-1">
            {filteredCustomers.map((cust) => {
              const isSelected = selectedCustomer.id === cust.id;
              return (
                <div
                  key={cust.id}
                  onClick={() => setSelectedCustomer(cust)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-slate-900 dark:text-white shadow-xs'
                      : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {cust.name}
                        </span>
                        <span className="font-mono text-[10px] text-cyan-500" dir="ltr">
                          [{cust.code}]
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5" dir="ltr">{cust.phone}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        cust.loyaltyTier === 'Platinum'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}
                    >
                      {cust.loyaltyTier}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-400">
                    <span>
                      {formatNumber(cust.totalVisits, language)} {t('crm.totalVisits', 'Visits')}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                      {formatCurrency(cust.totalSpent, language)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guest Profile & Visit History */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedCustomer.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-bold font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {selectedCustomer.loyaltyTier} {t('crm.member', 'Member')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {t('crm.lastVisit', 'Last Dining Visit:')}{' '}
                <span className="font-semibold text-cyan-400 font-mono" dir="ltr">
                  {selectedCustomer.lastVisit}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                ⭐ {selectedCustomer.satisfactionRating} {t('crm.rating', 'Rating')}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 block">
                {t('crm.lifetimeSpend', 'Total Lifetime Spend')}
              </span>
              <span className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                {formatCurrency(selectedCustomer.totalSpent, language)}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 block">
                {t('crm.rewardPoints', 'Reward Points')}
              </span>
              <span className="text-lg font-black font-mono text-amber-500" dir="ltr">
                {formatNumber(selectedCustomer.loyaltyPoints, language)} {t('crm.points', 'pts')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-500 block">
                {t('crm.totalVisits', 'Total Covers / Visits')}
              </span>
              <span className="text-lg font-black font-mono text-emerald-500" dir="ltr">
                {formatNumber(selectedCustomer.totalVisits, language)}
              </span>
            </div>
          </div>

          {/* Contact & Dietary Preferences */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[10px] tracking-wider text-slate-400">
              {t('crm.preferencesTitle', 'Hospitality Concierge Preferences')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500 block">{t('crm.directPhone', 'Direct Phone')}</span>
                <span className="font-mono text-slate-700 dark:text-slate-200" dir="ltr">
                  {selectedCustomer.phone}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{t('crm.emailDispatch', 'Email Dispatch')}</span>
                <span className="text-slate-700 dark:text-slate-200 font-mono" dir="ltr">
                  {selectedCustomer.email}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{t('crm.favoriteDish', 'Signature Favorite Item')}</span>
                <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                  {selectedCustomer.favoriteDish}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{t('crm.seatingPreference', 'Seating Preference')}</span>
                <span className="text-slate-700 dark:text-slate-200">
                  {t('crm.seatingDesc', 'Main Dining Quiet Corner or VIP Lounge')}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Visit & Order Log */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              {t('crm.recentHistory', 'Recent Dining History & Check Trace')}
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    Dinner Service · Table T01
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Tygos Prime Truffle Ribeye x2, Cyan Mocktail x2
                  </p>
                </div>
                <div className="text-end">
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400" dir="ltr">
                    {formatCurrency(184.5, language)}
                  </span>
                  <span className="block text-[10px] text-emerald-500 font-mono" dir="ltr">
                    +{formatNumber(185, language)} {t('crm.points', 'pts')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
