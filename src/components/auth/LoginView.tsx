/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, ArrowRight, UserPlus, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { TygosLogo } from '../brand/TygosLogo.tsx';
import { LanguageSelector } from '../common/LanguageSelector.tsx';
import { UserRole } from '../../types/index.ts';

export const LoginView: React.FC<{
  onOpenRegister: () => void;
  onBackToLanding?: () => void;
}> = ({ onOpenRegister, onBackToLanding }) => {
  const { login, switchRole, establishments } = useAuth();
  const { t, dir, language } = useI18n();

  const [prefix, setPrefix] = useState('R');
  const [number, setNumber] = useState('0001');
  const [identifier, setIdentifier] = useState('alex_owner');
  const [password, setPassword] = useState('••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(prefix, number, identifier, password);
  };

  const prefixes = [
    { code: 'R', label: language === 'ar' ? 'R (مطعم)' : 'R (Restaurant)' },
    { code: 'C', label: language === 'ar' ? 'C (مقهى)' : 'C (Café)' },
    { code: 'RC', label: language === 'ar' ? 'RC (مطعم ومقهى)' : 'RC (Restaurant & Café)' },
    { code: 'T', label: language === 'ar' ? 'T (وجبات سريعة)' : 'T (Take Away & Fast Food)' },
    { code: 'H', label: language === 'ar' ? 'H (فندق)' : 'H (Hotel)' },
    { code: 'V', label: language === 'ar' ? 'V (منتجع وقرية سياحية)' : 'V (Resort & Village)' },
    { code: 'FB', label: language === 'ar' ? 'FB (منفذ مأكولات ومشروبات)' : 'FB (F&B Outlet)' },
    { code: 'BK', label: language === 'ar' ? 'BK (مخبز)' : 'BK (Bakery)' },
    { code: 'PS', label: language === 'ar' ? 'PS (حلويات)' : 'PS (Pastry)' },
    { code: 'SYS', label: language === 'ar' ? 'SYS (مدير عام المنظومة)' : 'SYS (Tygos Super Admin)' },
  ];

  const quickRoles: { role: UserRole; title: string; hint: string }[] = [
    {
      role: 'super_admin',
      title: language === 'ar' ? 'المدير العام' : 'Super Admin',
      hint: language === 'ar' ? 'مالك المنظومة السحابية' : 'Platform Owner',
    },
    {
      role: 'tenant_admin',
      title: language === 'ar' ? 'مدير المنشأة' : 'Tenant Admin',
      hint: language === 'ar' ? 'ألكسندر (المالك والمشرف)' : 'Alexander (Owner)',
    },
    {
      role: 'general_manager',
      title: language === 'ar' ? 'المدير العام' : 'General Manager',
      hint: language === 'ar' ? 'صوفيا (إدارة العمليات)' : 'Sophia (Operations)',
    },
    {
      role: 'cashier',
      title: language === 'ar' ? 'كاشير نقطة البيع' : 'POS Cashier',
      hint: language === 'ar' ? 'مايا (نقطة البيع السريعة)' : 'Maya (Fast Register)',
    },
    {
      role: 'kitchen_manager',
      title: language === 'ar' ? 'رئيس المطبخ' : 'Kitchen Head',
      hint: language === 'ar' ? 'الشيف غابرييل (الوصفات)' : 'Chef Gabriel (Recipes)',
    },
    {
      role: 'cost_accountant',
      title: language === 'ar' ? 'محاسب التكاليف' : 'Cost Controller',
      hint: language === 'ar' ? 'نادية (مراقبة الهالك والانحراف)' : 'Nadia (Variance & Food Cost)',
    },
    {
      role: 'financial_manager',
      title: language === 'ar' ? 'المدير المالي' : 'CFO / Finance',
      hint: language === 'ar' ? 'جوليان (الأستاذ والضرائب)' : 'Julian (Ledger & Tax)',
    },
    {
      role: 'waiter',
      title: language === 'ar' ? 'مضيف الطاولات' : 'Floor Waiter',
      hint: language === 'ar' ? 'زياد (طلبات الصالة)' : 'Ziad (Table Orders)',
    },
  ];

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Subtle brand glow effects */}
      <div className="absolute top-1/4 start-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 end-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Back to Landing & Language Switcher */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 z-20">
        {onBackToLanding ? (
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" />
            <span>{language === 'ar' ? 'الرئيسية التعريفية' : 'Platform Overview'}</span>
          </button>
        ) : (
          <div />
        )}
        <LanguageSelector variant="login" />
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="mb-6">
          <TygosLogo variant="login" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Establishment Selection helper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('auth.establishmentCode', 'Establishment Identity Code')}
              </label>
            </div>

            {/* Quick establishment chips */}
            {establishments && establishments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {establishments.slice(0, 4).map((est) => (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => {
                      setPrefix(est.prefix);
                      setNumber(est.number);
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      prefix === est.prefix && number === est.number
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-mono text-cyan-400" dir="ltr">{est.code}</span>
                    <span className="ms-1.5 opacity-80">{est.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative w-36 shrink-0">
                <select
                  value={prefix}
                  onChange={(e) => {
                    setPrefix(e.target.value);
                    if (e.target.value === 'SYS') {
                      setNumber('0000');
                      setIdentifier('tygos_super');
                    }
                  }}
                  className="w-full appearance-none px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-cyan-400 focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  {prefixes.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.code} ▼
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={6}
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="0001"
                  dir="ltr"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono tracking-widest text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {t('auth.activePartition', 'Active partition')}:{' '}
              <span className="font-mono text-cyan-400" dir="ltr">
                {prefix}.{number}
              </span>
            </p>
          </div>

          {/* Username / Email / Phone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {t('auth.username', 'Username / Email / Phone')}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Password with Eye */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('auth.password', 'Password')}
              </label>
              <span className="text-[11px] text-cyan-400 hover:underline cursor-pointer">
                {t('auth.forgotPassword', 'Forgot Password?')}
              </span>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                className="w-full px-3.5 py-2.5 pe-11 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('auth.hidePassword', 'Hide Password') : t('auth.showPassword', 'Show Password')}
                className="absolute end-3 top-2.5 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
              />
              <span>{t('auth.remember', 'Remember establishment')}</span>
            </label>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('auth.tlsSecured', 'TLS Secured')}</span>
            </div>
          </div>

          {/* Login Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{t('auth.enterWorkspace', 'Log In to Workspace')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>

        {/* Register CTA */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-xs text-slate-400 mb-2">
            {t('auth.newEstablishmentPrompt', 'New hospitality establishment?')}
          </p>
          <button
            type="button"
            onClick={onOpenRegister}
            className="w-full py-2.5 px-3 rounded-xl border border-slate-700 hover:border-cyan-500/50 bg-slate-800/50 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-cyan-400" />
            <span>{t('auth.register', 'Register New Establishment')}</span>
          </button>
        </div>

        {/* Quick Test Switcher for Testing All Mock Roles */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('auth.quickRoles', 'Interactive Role Simulator')}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {quickRoles.map((qr) => (
              <button
                key={qr.role}
                type="button"
                onClick={() => switchRole(qr.role)}
                className="p-2 text-start bg-slate-950/60 hover:bg-slate-800 border border-slate-800/70 hover:border-slate-700 rounded-lg text-[11px] transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-200">{qr.title}</div>
                <div className="text-[10px] text-slate-500 truncate">{qr.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
