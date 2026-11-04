/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, UserPlus, Sparkles, Building2, HelpCircle, X, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { TygosLogo } from '../brand/TygosLogo.tsx';
import { PermanentAppBrandBadge } from '../brand/PermanentAppBrandBadge.tsx';
import { LanguageSelector } from '../common/LanguageSelector.tsx';
import { UserRole } from '../../types/index.ts';

export const LoginView: React.FC<{
  onOpenRegister: () => void;
  onBackToLanding?: () => void;
}> = ({ onOpenRegister, onBackToLanding }) => {
  const { login, switchRole, establishments } = useAuth();
  const { t, dir, language } = useI18n();
  const isAr = language === 'ar';

  const [typeCode, setTypeCode] = useState('R');
  const [number, setNumber] = useState('0001');
  const [identifier, setIdentifier] = useState('alex_owner');
  const [password, setPassword] = useState('••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Business types with name and abbreviation only - absolutely NO "prefix/بادئة" word
  const facilityTypes = [
    { code: 'R', label: isAr ? 'مطعم (R:)' : 'Restaurant (R:)' },
    { code: 'C', label: isAr ? 'كافيه (C:)' : 'Cafe (C:)' },
    { code: 'H', label: isAr ? 'فندق (H:)' : 'Hotel (H:)' },
    { code: 'T', label: isAr ? 'منشأة سياحية (T:)' : 'Tourist Venue (T:)' },
    { code: 'SYS', label: isAr ? 'إدارة النظام (SYS:)' : 'System Admin (SYS:)' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const success = login(typeCode, number, identifier, password);
    if (!success) {
      setErrorMessage(
        isAr
          ? 'تأكد من رقم المنشأة واسم المستخدم وكلمة المرور للمتابعة'
          : 'Please check your establishment number, username, and password to proceed'
      );
    }
  };

  const quickRoles: { role: UserRole; title: string; hint: string }[] = [
    {
      role: 'super_admin',
      title: isAr ? 'المدير العام' : 'Super Admin',
      hint: isAr ? 'مالك المنظومة السحابية' : 'Platform Owner',
    },
    {
      role: 'tenant_admin',
      title: isAr ? 'مالك / مدير المنشأة' : 'Tenant Admin',
      hint: isAr ? 'ألكسندر (المالك والمشرف)' : 'Alexander (Owner)',
    },
    {
      role: 'general_manager',
      title: isAr ? 'المدير العام' : 'General Manager',
      hint: isAr ? 'صوفيا (إدارة العمليات)' : 'Sophia (Operations)',
    },
    {
      role: 'cashier',
      title: isAr ? 'كاشير نقطة البيع' : 'POS Cashier',
      hint: isAr ? 'مايا (نقطة البيع السريعة)' : 'Maya (Fast Register)',
    },
    {
      role: 'kitchen_manager',
      title: isAr ? 'رئيس المطبخ' : 'Kitchen Head',
      hint: isAr ? 'الشيف غابرييل (الوصفات)' : 'Chef Gabriel (Recipes)',
    },
    {
      role: 'cost_accountant',
      title: isAr ? 'محاسب التكاليف' : 'Cost Controller',
      hint: isAr ? 'نادية (مراقبة الهالك والانحراف)' : 'Nadia (Variance & Food Cost)',
    },
    {
      role: 'financial_manager',
      title: isAr ? 'المدير المالي' : 'CFO / Finance',
      hint: isAr ? 'جوليان (الأستاذ والضرائب)' : 'Julian (Ledger & Tax)',
    },
    {
      role: 'waiter',
      title: isAr ? 'مقدم الخدمة' : 'Floor Waiter',
      hint: isAr ? 'زياد (طلبات الصالة)' : 'Ziad (Table Orders)',
    },
  ];

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden"
    >
      {/* Background glow effects */}
      <div className="absolute top-1/4 start-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 end-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Back to Landing, Permanent App URL Badge, & Language Switcher */}
      <div className="w-full max-w-md flex items-center justify-between gap-2 mb-3 z-20">
        {onBackToLanding ? (
          <button
            type="button"
            onClick={onBackToLanding}
            className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 ltr:rotate-180" />
            <span className="hidden sm:inline">{isAr ? 'الرئيسية التعريفية' : 'Platform'}</span>
          </button>
        ) : (
          <div />
        )}
        <PermanentAppBrandBadge variant="header-pill" />
        <LanguageSelector variant="login" />
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="mb-6">
          <TygosLogo variant="login" />
        </div>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Facility Type and Number */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                {t('auth.establishmentCode', 'Establishment Number')}
              </label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>{t('auth.forgotEstablishment', 'Forgot my establishment number?')}</span>
              </button>
            </div>

            {/* Quick establishment chips saved on device */}
            {establishments && establishments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {establishments.slice(0, 4).map((est) => {
                  const [p, n] = est.code.split('.');
                  const isSelected = typeCode === (p || est.prefix) && number === (n || est.number);
                  return (
                    <button
                      key={est.id}
                      type="button"
                      onClick={() => {
                        setTypeCode(p || est.prefix);
                        setNumber(n || est.number);
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="font-mono text-cyan-400" dir="ltr">{est.code}</span>
                      <span className="ms-1.5 opacity-80">{est.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="relative w-44 shrink-0">
                <select
                  value={typeCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTypeCode(val);
                    if (val === 'SYS') {
                      setNumber('0000');
                      setIdentifier('tygos_super');
                    }
                  }}
                  className="w-full appearance-none px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-cyan-400 focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  {facilityTypes.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={6}
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0001"
                  dir="ltr"
                  aria-label={t('auth.establishmentNumber', 'Establishment Number')}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono tracking-widest text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>
                {t('auth.activePartition', 'Active Establishment Number')}:{' '}
                <span className="font-mono text-cyan-400 font-bold" dir="ltr">
                  {typeCode}.{number}
                </span>
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

          {/* Password with Eye toggle */}
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
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember check */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="remember" className="ms-2 text-xs text-slate-400 cursor-pointer">
              {t('auth.remember', 'Remember establishment number on this device')}
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
          >
            {t('auth.enterWorkspace', 'Log In to Workspace')}
          </button>
        </form>

        {/* Register New Facility prompt */}
        <div className="mt-5 pt-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-400 mb-2.5">
            {t('auth.newEstablishmentPrompt', 'New hospitality establishment?')}
          </p>
          <button
            type="button"
            onClick={onOpenRegister}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('auth.register', 'Register New Establishment')}</span>
          </button>
        </div>

        {/* Interactive Role Switcher for Phase 2 & 4 preview */}
        <div className="mt-5 pt-4 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 mb-2.5 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {t('auth.quickRoles', 'Interactive Role Simulator')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {quickRoles.map((qr) => (
              <button
                key={qr.role}
                type="button"
                onClick={() => switchRole(qr.role)}
                className="text-start p-2 rounded-lg bg-slate-950/60 hover:bg-cyan-950/40 border border-slate-800/80 hover:border-cyan-500/40 transition-colors cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300">
                  {qr.title}
                </div>
                <div className="text-[10px] text-slate-500 truncate">{qr.hint}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Permanent Verified Production Link Card */}
      <PermanentAppBrandBadge variant="card" className="w-full max-w-md mt-4 relative z-10" />

      {/* Forgot Facility Number Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {t('auth.savedOnDevice', 'Registered establishments on this device')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 my-3">
              {isAr
                ? 'اختر منشأتك من القائمة المسجلة محلياً لتعبئة رقم المنشأة تلقائياً والمتابعة:'
                : 'Select your establishment from the saved list to auto-fill its number and proceed:'}
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {establishments && establishments.length > 0 ? (
                establishments.map((est) => {
                  const [p, n] = est.code.split('.');
                  return (
                    <button
                      key={est.id}
                      type="button"
                      onClick={() => {
                        setTypeCode(p || est.prefix);
                        setNumber(n || est.number);
                        setIsForgotModalOpen(false);
                      }}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-start flex items-center justify-between group transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                          {est.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {isAr ? 'المالك:' : 'Owner:'} {est.ownerName || 'Admin'} · {est.city}
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded-lg border border-cyan-800/40" dir="ltr">
                          {est.code}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  {isAr ? 'لا توجد منشآت مسجلة على هذا الجهاز بعد.' : 'No saved establishments found on this device.'}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 cursor-pointer"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
