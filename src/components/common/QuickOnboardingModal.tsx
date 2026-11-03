/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * 4-STEP QUICK ONBOARDING WIZARD (معالج البداية السريعة)
 * Step 1: Venue Activity Type (Restaurant / Cafe / Tourist Venue)
 * Step 2: Currency & Tax Setup
 * Step 3: Load Starter Template or Start Fresh
 * Step 4: First Product / Launch Dashboard
 */

import React, { useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  DollarSign,
  Package,
  CheckCircle2,
  UtensilsCrossed,
  Coffee,
  Hotel,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { dataService } from '../../services/dataService.ts';

interface QuickOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentId: string;
  onCompleted?: () => void;
}

export const QuickOnboardingModal: React.FC<QuickOnboardingModalProps> = ({
  isOpen,
  onClose,
  establishmentId,
  onCompleted,
}) => {
  const { language } = useI18n();
  const isAr = language === 'ar';

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [activityType, setActivityType] = useState<'restaurant' | 'cafe' | 'tourist_venue'>('restaurant');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('14');
  const [loadTemplateChoice, setLoadTemplateChoice] = useState<'template' | 'blank'>('template');
  const [isLoading, setIsLoading] = useState(false);

  const handleFinish = async () => {
    setIsLoading(true);
    if (loadTemplateChoice === 'template') {
      await dataService.loadTemplate(establishmentId, activityType);
    }
    setIsLoading(false);
    if (onCompleted) onCompleted();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'معالج البداية السريعة لمنشأتك' : 'Quick Start Onboarding Wizard'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? `الخطوة ${step} من ٤: تجهيز بيئة العمل في أقل من دقيقة` : `Step ${step} of 4: Setup workspace in 1 minute`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress tracker dots */}
        <div className="flex items-center justify-center gap-2 py-3 bg-slate-100/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-8 bg-cyan-500' : s < step ? 'w-2 bg-emerald-500' : 'w-2 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* STEP 1: Activity Type */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'ما هو نوع نشاط منشأتك الأساسي؟' : 'What is your primary hospitality venue type?'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActivityType('restaurant')}
                  className={`p-4 rounded-xl border text-start transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    activityType === 'restaurant'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-400'
                  }`}
                >
                  <UtensilsCrossed className="w-6 h-6 text-cyan-500" />
                  <span className="text-xs">{isAr ? 'مطعم ومأكولات' : 'Restaurant & Dining'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivityType('cafe')}
                  className={`p-4 rounded-xl border text-start transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    activityType === 'cafe'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-400'
                  }`}
                >
                  <Coffee className="w-6 h-6 text-amber-500" />
                  <span className="text-xs">{isAr ? 'كافيه ومشروبات' : 'Specialty Cafe'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivityType('tourist_venue')}
                  className={`p-4 rounded-xl border text-start transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 ${
                    activityType === 'tourist_venue'
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:border-slate-400'
                  }`}
                >
                  <Hotel className="w-6 h-6 text-purple-500" />
                  <span className="text-xs">{isAr ? 'فندق ومنشأة سياحية' : 'Resort & Hotel'}</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Currency & Tax */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'العملة الأساسية والضرائب' : 'Operating Currency & Tax Settings'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'عملة الحسابات' : 'Base Currency'}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="EGP">EGP (ج.م)</option>
                    <option value="SAR">SAR (ر.س)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'نسبة الضريبة القياسية (%)' : 'Standard VAT Rate (%)'}
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Load Starter Template or Blank */}
          {step === 3 && (
            <div className="space-y-3 animate-fade-in">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'هل تفضل تحميل قالب نموذجي لتجربة الحسابات؟' : 'Load ready starter data or start completely blank?'}
              </h4>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setLoadTemplateChoice('template')}
                  className={`w-full p-4 rounded-xl border text-start flex items-center justify-between transition-all cursor-pointer ${
                    loadTemplateChoice === 'template'
                      ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:text-slate-100 font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-cyan-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">
                        {isAr ? 'تحميل القالب النموذجي الجاهز (موصى به)' : 'Load Starter Industry Template (Recommended)'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {isAr
                          ? 'يحتوي على خامات حقيقية، وصفات نموذجية، وأسعار تجريبية للاستكشاف السريع.'
                          : 'Includes raw ingredients, sample BOM recipes, and test numbers for rapid explore.'}
                      </div>
                    </div>
                  </div>
                  {loadTemplateChoice === 'template' && <CheckCircle2 className="w-5 h-5 text-cyan-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLoadTemplateChoice('blank')}
                  className={`w-full p-4 rounded-xl border text-start flex items-center justify-between transition-all cursor-pointer ${
                    loadTemplateChoice === 'blank'
                      ? 'border-cyan-500 bg-cyan-500/10 text-slate-900 dark:text-slate-100 font-bold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-slate-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">{isAr ? 'البدء ببيانات فارغة تماماً' : 'Start with Blank Partition'}</div>
                      <div className="text-[11px] text-slate-500 font-normal">
                        {isAr ? 'سأقوم بإدخال خاماتي ووصفاتي الخاصة بنفسي من الصفر.' : 'I will enter all raw materials and menu recipes from scratch.'}
                      </div>
                    </div>
                  </div>
                  {loadTemplateChoice === 'blank' && <CheckCircle2 className="w-5 h-5 text-cyan-500" />}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Ready to Launch */}
          {step === 4 && (
            <div className="space-y-4 text-center py-4 animate-fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? 'منشأتك جاهزة للانطلاق الآن!' : 'Your Workspace is Ready to Launch!'}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {isAr
                    ? 'تم إعداد بيئة العمل بنجاح. يمكنك استعراض لوحة التحكم، نقطة البيع، وبناء الوصفات.'
                    : 'Your environment is configured. You can now explore dashboard, POS, and BOM recipes.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as 1 | 2 | 3)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
              <span>{isAr ? 'السابق' : 'Back'}</span>
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as 2 | 3 | 4)}
              className="px-5 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{isAr ? 'التالي' : 'Next'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleFinish}
              className="px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-900/40"
            >
              <span>{isLoading ? (isAr ? 'جارٍ الإعداد...' : 'Setting up...') : (isAr ? 'الدخول لمساحة العمل' : 'Enter Workspace')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
