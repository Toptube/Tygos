/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Building2,
  UserCheck,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { BusinessType, Establishment } from '../../types/index.ts';
import { TygosLogo } from '../brand/TygosLogo.tsx';
import { LanguageSelector } from '../common/LanguageSelector.tsx';

export const RegisterWizard: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
  const { registerEstablishment, registeredSuccessEst, setRegisteredSuccessEst, setActiveView } =
    useAuth();
  const { t, dir, language } = useI18n();

  const [step, setStep] = useState<number>(1);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    ownerName: language === 'ar' ? 'ألكسندر فانك' : 'Alexander Vance',
    businessName: language === 'ar' ? 'مطعم وكافيه الأفق الأزرق' : 'The Azure Horizon Grand Bistro',
    businessType: 'restaurant_cafe' as BusinessType,
    nationalId: 'EG-298010412039',
    crNumber: 'CR-9041284',
    taxNumber: 'TX-502-918-223',
    address: language === 'ar' ? 'شارع كورنيش النيل، برج الأفق' : 'Nile Corniche Avenue, Suite 10',
    city: language === 'ar' ? 'القاهرة' : 'Cairo',
    state: language === 'ar' ? 'محافظة القاهرة' : 'Cairo Governorate',
    country: language === 'ar' ? 'مصر' : 'Egypt',
    phone: '+20 100 482 9182',
    secondaryPhone: '',
    email: 'alexander@azurebistro.com',
    username: 'alex_azure',
    password: 'Password@2026',
    confirmPassword: 'Password@2026',
    language: 'ar' as const,
    currency: 'USD',
    timezone: 'UTC+2 (Cairo)',
    notes: language === 'ar' ? 'الفرع الرئيسي بسعة ١٢٠ ضيفاً.' : 'Primary flagship branch with 120 covers.',
    termsAccepted: true,
    privacyAccepted: true,
  });

  const [error, setError] = useState<string>('');

  const businessTypes: { value: BusinessType; key: string; prefix: string }[] = [
    { value: 'restaurant', key: 'businessType.restaurant', prefix: 'R' },
    { value: 'cafe', key: 'businessType.cafe', prefix: 'C' },
    { value: 'restaurant_cafe', key: 'businessType.restaurant_cafe', prefix: 'RC' },
    { value: 'take_away', key: 'businessType.take_away', prefix: 'T' },
    { value: 'fast_food', key: 'businessType.fast_food', prefix: 'T' },
    { value: 'bakery', key: 'businessType.bakery', prefix: 'BK' },
    { value: 'pastry', key: 'businessType.pastry', prefix: 'PS' },
    { value: 'hotel', key: 'businessType.hotel', prefix: 'H' },
    { value: 'resort', key: 'businessType.resort', prefix: 'V' },
    { value: 'tourist_village', key: 'businessType.tourist_village', prefix: 'V' },
    { value: 'food_beverage_outlet', key: 'businessType.food_beverage_outlet', prefix: 'FB' },
    { value: 'other', key: 'businessType.other', prefix: 'O' },
  ];

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.ownerName || !formData.businessName || !formData.nationalId) {
        setError(t('validation.required', 'Please fill in all mandatory fields.'));
        return;
      }
    }
    if (step === 2) {
      if (!formData.address || !formData.city || !formData.country || !formData.phone || !formData.email) {
        setError(t('validation.required', 'Please complete the mandatory address and contact numbers.'));
        return;
      }
    }
    setStep(step + 1);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('validation.passwordMismatch', 'Passwords do not match.'));
      return;
    }
    if (!formData.termsAccepted) {
      setError(t('validation.termsRequired', 'You must accept the Terms & Conditions.'));
      return;
    }
    if (!formData.privacyAccepted) {
      setError(t('validation.privacyRequired', 'You must accept the Privacy Policy.'));
      return;
    }

    registerEstablishment(formData);
  };

  const handleFinishAndEnter = () => {
    setRegisteredSuccessEst(null);
    setActiveView('dashboard');
  };

  // If registered successfully, show Establishment Code Flow
  if (registeredSuccessEst) {
    return (
      <div
        dir={dir}
        className="min-h-screen flex items-center justify-center p-4 bg-[#070b14] text-slate-100"
      >
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-center">
          <div className="absolute top-0 start-0 end-0 h-1.5 bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500" />

          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white mb-2">
            {t('registration.successTitle', 'Establishment Registered Successfully')}
          </h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            {t(
              'registration.successSubtitle',
              'Your multi-tenant hospitality partition has been provisioned. Save your establishment code below.'
            )}
          </p>

          {/* Generated Code Badge */}
          <div className="p-6 bg-slate-950/80 border border-slate-800 rounded-xl mb-6 text-center">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold block mb-1">
              {t('registration.codeGenerated', 'Official Establishment Code')}
            </span>
            <div
              className="text-4xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400"
              dir="ltr"
            >
              {registeredSuccessEst.code}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              <span>{language === 'ar' ? 'البادئة:' : 'Prefix:'} </span>
              <strong className="text-slate-300 font-mono" dir="ltr">{registeredSuccessEst.prefix}</strong>
              <span> · {language === 'ar' ? 'الرقم التسلسلي:' : 'Serial:'} </span>
              <strong className="text-slate-300 font-mono" dir="ltr">{registeredSuccessEst.number}</strong>
            </p>
          </div>

          {/* Registration Details Summary */}
          <div className="grid grid-cols-2 gap-3 text-start p-4 bg-slate-800/40 rounded-xl border border-slate-800/60 text-xs mb-8">
            <div>
              <span className="text-slate-500 block">{t('registration.businessName', 'Business Name')}</span>
              <span className="font-semibold text-slate-200">{registeredSuccessEst.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{t('registration.ownerName', 'Owner')}</span>
              <span className="font-semibold text-slate-200">{registeredSuccessEst.ownerName}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{t('registration.rootUsername', 'Username')}</span>
              <span className="font-mono text-cyan-300 font-medium" dir="ltr">{formData.username}</span>
            </div>
            <div>
              <span className="text-slate-500 block">{t('registration.primaryPhone', 'Phone')}</span>
              <span className="text-slate-200 font-mono" dir="ltr">{registeredSuccessEst.phone}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">{t('registration.email', 'Email')}</span>
              <span className="text-slate-200 font-mono" dir="ltr">{registeredSuccessEst.email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinishAndEnter}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 transition-all shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t('registration.continueToDashboard', 'Continue to Setup & Dashboard')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={dir}
      className="min-h-screen py-10 px-4 bg-[#070b14] text-slate-100 flex flex-col items-center justify-center"
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <TygosLogo variant="compact" />
          <div className="flex items-center gap-3">
            <LanguageSelector variant="header" />
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {t('common.back', 'Back')} {language === 'ar' ? 'إلى تسجيل الدخول' : 'to Login'}
            </button>
          </div>
        </div>

        {/* Wizard Steps Tracker */}
        <div className="py-6 flex items-center justify-between gap-2 border-b border-slate-800/80 mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 1 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              1
            </div>
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              {t('registration.step1', 'Establishment')}
            </span>
          </div>
          <div className="h-0.5 flex-1 bg-slate-800" />
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 2 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              2
            </div>
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              {t('registration.step2', 'Location & Contact')}
            </span>
          </div>
          <div className="h-0.5 flex-1 bg-slate-800" />
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= 3 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              3
            </div>
            <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
              {t('registration.step3', 'Account & Security')}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          {/* Step 1: Business Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <span>{t('registration.step1', 'Establishment & Ownership Details')}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.ownerName', 'Owner Full Name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.businessName', 'Business Name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {t('registration.businessType', 'Business Type')} *
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) =>
                    setFormData({ ...formData, businessType: e.target.value as BusinessType })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  {businessTypes.map((tItem) => (
                    <option key={tItem.value} value={tItem.value}>
                      {t(tItem.key, tItem.value)} ({language === 'ar' ? 'البادئة:' : 'Code Prefix:'} {tItem.prefix}.0000)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.nationalId', 'National ID')} *
                  </label>
                  <input
                    type="text"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    required
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.crNumber', 'Commercial Reg. (CR)')}
                  </label>
                  <input
                    type="text"
                    value={formData.crNumber}
                    onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                    placeholder={t('registration.optional', 'Optional')}
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.taxNumber', 'Tax Card Number')}
                  </label>
                  <input
                    type="text"
                    value={formData.taxNumber}
                    onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
                    placeholder={t('registration.optional', 'Optional')}
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Location & Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>{t('registration.step2', 'Geographic Location & Contact Details')}</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {t('registration.address', 'Full Street Address')} *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.city', 'City')} *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.state', 'State / Governorate')} *
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.country', 'Country')} *
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.primaryPhone', 'Primary Phone')} *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.secondaryPhone', 'Secondary Phone')}
                  </label>
                  <input
                    type="text"
                    value={formData.secondaryPhone}
                    onChange={(e) => setFormData({ ...formData, secondaryPhone: e.target.value })}
                    placeholder={t('registration.optional', 'Optional')}
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.email', 'Email')} *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    dir="ltr"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Account Credentials & Preferences */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <span>{t('registration.step3', 'Security Credentials & System Settings')}</span>
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  {t('registration.rootUsername', 'Root Administrator Username')} *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  dir="ltr"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('auth.password', 'Password')} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      dir="ltr"
                      className="w-full px-3 py-2 pe-10 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle Password Visibility"
                      className="absolute end-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('auth.confirmPassword', 'Confirm Password')} *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                      dir="ltr"
                      className="w-full px-3 py-2 pe-10 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label="Toggle Confirm Password Visibility"
                      className="absolute end-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.preferredLanguage', 'Preferred Language')}
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ar">العربية (Arabic - RTL الافتراضية)</option>
                    <option value="en">English (US/UK)</option>
                    <option value="fr">Français (French)</option>
                    <option value="nl">Nederlands (Dutch)</option>
                    <option value="tr">Türkçe (Turkish)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.baseCurrency', 'Base Currency')}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="EGP">EGP (ج.م)</option>
                    <option value="SAR">SAR (ر.س)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="TRY">TRY (₺)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {t('registration.timeZone', 'Time Zone')}
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                  />
                  <span>{t('registration.terms', 'I agree to the Terms of Service')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.privacyAccepted}
                    onChange={(e) => setFormData({ ...formData, privacyAccepted: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0"
                  />
                  <span>{t('registration.privacy', 'I acknowledge the Data Privacy Policy')}</span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span>{t('common.back', 'Back')}</span>
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{t('common.continue', 'Continue')}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-900/40"
              >
                <Shield className="w-4 h-4" />
                <span>{t('registration.complete', 'Complete Registration')}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
