/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HIDDEN OWNER/MANAGER PRE-LAUNCH VERIFICATION CHECKLIST (Phase 6 Audit)
 * Accessible only to tenant_admin, general_manager, and super_admin.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  CheckSquare,
  Square,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Lock,
  Smartphone,
  Printer,
  ShoppingBag,
  Users,
  EyeOff,
  SunMoon,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { uiPreferencesRepository } from '../../repositories/repositories.ts';

interface ChecklistStep {
  id: string;
  categoryAr: string;
  categoryEn: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: React.ReactNode;
}

const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    id: 'order_dine_in',
    categoryAr: 'سيناريو طلب 1',
    categoryEn: 'Order Scenario 1',
    titleAr: 'طلب صالة عبر المنيو الإلكتروني (Dine-In QR)',
    titleEn: 'Dine-In QR Menu Order & Station Routing',
    descAr: 'امسح رمز طاولة، أرسل طلباً، اعتمده من شاشة الكاشير، وتحقق من توزيعه على محطات التحضير (مطبخ/شواية/بار) حتى الجاهزية.',
    descEn: 'Scan table QR, submit order, approve in POS, verify split across prep stations until ready.',
    icon: <ShoppingBag className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
  {
    id: 'order_delivery',
    categoryAr: 'سيناريو طلب 2',
    categoryEn: 'Order Scenario 2',
    titleAr: 'طلب توصيل + كوبون خصم + تعيين سائق وتسوية نقدية',
    titleEn: 'Delivery Order + Coupon + Driver Assignment & Cash Settlement',
    descAr: 'أنشئ طلب توصيل بعنوان وهاتف، طبّق كوبون خصم أو نقاط ولاء، عيّن سائقاً، حوّل الحالة إلى «خرج للتوصيل»، ثم نفّذ التسوية النقدية للسائق.',
    descEn: 'Create delivery order with address/phone, apply coupon/loyalty, assign driver, mark out for delivery, and settle cash.',
    icon: <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  },
  {
    id: 'order_takeaway_offline',
    categoryAr: 'سيناريو طلب 3',
    categoryEn: 'Order Scenario 3',
    titleAr: 'طلب استلام (Takeaway) + اختبار انقطاع الاتصال والمزامنة',
    titleEn: 'Takeaway Order + Offline Outbox & Reconnect Sync',
    descAr: 'فعّل وضع عدم الاتصال من مؤشر الشبكة، سجّل طلباً جديداً، تأكد من ظهور بادئة الجهاز في الرقم التسلسلي، ثم أعد الاتصال وتأكد من مزامنة صندوق الصادر دون تكرار.',
    descEn: 'Toggle offline mode, submit order, verify device-prefixed serial, reconnect and verify Outbox flushes without duplicates.',
    icon: <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  },
  {
    id: 'thermal_printing',
    categoryAr: 'الطباعة',
    categoryEn: 'Printing',
    titleAr: 'اختبار طباعة تذاكر المحطات وفاتورة الكاشير (80mm / A5)',
    titleEn: 'Test Station Ticket & Cashier Receipt Printing (80mm / A5)',
    descAr: 'اطبع تذكرة تحضير وفاتورة عميل، وتأكد من وضوح الخط وعدم ظهور أي تكاليف داخلية أو هوامش ربح في المطبوعات.',
    descEn: 'Print prep ticket and customer receipt; verify layout and confirm zero internal costs appear.',
    icon: <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
  },
  {
    id: 'mobile_320px',
    categoryAr: 'الموبايل',
    categoryEn: 'Mobile 320px',
    titleAr: 'فحص التجاوب على شاشات 320px و360px (فحص يدوي)',
    titleEn: 'Verify 320px & 360px Mobile Responsiveness (Manual Check)',
    descAr: 'افتح المنيو العام وشاشة الكاشير وشاشة المطبخ على عرض 320px وتأكد من عدم وجود تمرير أفقي أو تداخل في الأزرار.',
    descEn: 'Inspect Public Menu, POS, and KDS at 320px width; confirm zero horizontal overflow or overlapping controls.',
    icon: <Smartphone className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
  },
  {
    id: 'theme_and_rtl',
    categoryAr: 'المظهر والاتجاه',
    categoryEn: 'Theme & RTL',
    titleAr: 'فحص الوضع الفاتح/الداكن واتجاه RTL/LTR (فحص يدوي)',
    titleEn: 'Verify Light/Dark Theme & RTL/LTR Layout (Manual Check)',
    descAr: 'بدّل بين الوضع الفاتح والداكن وبين العربية والإنجليزية، وتأكد من تباين الألوان وسلامة محاذاة الجداول والبطاقات.',
    descEn: 'Switch between Light/Dark themes and Arabic/English; verify contrast and alignment.',
    icon: <SunMoon className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'rbac_roles',
    categoryAr: 'الأدوار',
    categoryEn: 'RBAC Roles',
    titleAr: 'اختبار صلاحيات الأدوار (كاشير، مدير مطبخ، مدير عام)',
    titleEn: 'Verify Role Permissions (Cashier, Kitchen Manager, General Manager)',
    descAr: 'جرّب التبديل بين الأدوار وتأكد من حجب تقارير الأرباح والتكاليف وإعدادات النظام عن الكاشير ومدير المطبخ.',
    descEn: 'Switch roles and confirm profit reports, true costs, and system settings are restricted from Cashier & Kitchen Manager.',
    icon: <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
  },
  {
    id: 'user_roles_management',
    categoryAr: 'أدوار المستخدمين والصلاحيات',
    categoryEn: 'User Roles & Permissions',
    titleAr: 'فحص شاشة إدارة المستخدمين وتخصيص الشاشات وتعيين PIN السريع',
    titleEn: 'Verify User Roles Management, Screen Permissions & Fast PIN',
    descAr: 'ادخل على شاشة «أدوار المستخدمين»، تأكد من ظهور الموظفين وتخصيص شاشاتهم، تجربة توليد PIN عشوائي من 6 خانات (يظهر مرة واحدة)، وتأكد من قصر الشاشة على القيادة وحجبها عن الكاشير.',
    descEn: 'Open User Roles screen, verify staff listing, customize screen permissions, test random 6-digit one-time PIN generation, and ensure cashier cannot access.',
    icon: <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
  {
    id: 'recipe_journey',
    categoryAr: 'رحلة الخامة للمنتج',
    categoryEn: 'Raw Material to Product Journey',
    titleAr: 'فحص رحلة الخامة من الشراء للوصفة للبيع للأرباح',
    titleEn: 'Verify Journey: Material to Recipe to Sale to Profit',
    descAr: 'أضف خامة بسعر شراء، اربطها بوصفة طبق بنسبة هالك، اعرض الطبق للبيع، ونفّذ بيعاً من الكاشير وتأكد من خصم المخزون وظهور هامش الربح الحقيقي.',
    descEn: 'Add raw material, link to recipe with waste %, mark dish ready for sale, sell via POS, and verify stock depletion and true margin calculation.',
    icon: <ShoppingBag className="w-5 h-5 text-emerald-500" />,
  },
  {
    id: 'privacy_anonymize',
    categoryAr: 'الخصوصية',
    categoryEn: 'Privacy',
    titleAr: 'اختبار عزل بيانات العملاء وإخفاء الهوية (Anonymize)',
    titleEn: 'Verify Customer PII Isolation & Anonymization',
    descAr: 'تأكد من عدم ظهور هاتف وعنوان العميل في تذاكر المطبخ والبار، وجرّب إخفاء هوية عميل مع بقاء إجمالي مبيعاته في التقارير.',
    descEn: 'Confirm customer phone/address are hidden on KDS tickets, and test anonymizing a customer while preserving sales totals.',
    icon: <EyeOff className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
  },
];

export const PreLaunchChecklistView: React.FC = () => {
  const { currentUser, currentEstablishment, setActiveView } = useAuth();
  const { isRtl } = useI18n();
  const isAr = isRtl;
  const estId = currentEstablishment?.id || 'default';

  const isAuthorized =
    currentUser?.role === 'tenant_admin' ||
    currentUser?.role === 'general_manager' ||
    currentUser?.role === 'super_admin';

  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() =>
    uiPreferencesRepository.getPrelaunchChecklist(estId)
  );

  useEffect(() => {
    setCheckedMap(uiPreferencesRepository.getPrelaunchChecklist(estId));
  }, [estId]);

  const toggleStep = (id: string) => {
    const next = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(next);
    uiPreferencesRepository.savePrelaunchChecklist(estId, next);
  };

  const resetAll = () => {
    setCheckedMap({});
    uiPreferencesRepository.savePrelaunchChecklist(estId, {});
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isAr ? 'شاشة مقصورة على المالك والمدير العام' : 'Owner & General Manager Access Only'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isAr
            ? 'لا تملك صلاحية الوصول إلى قائمة الفحص قبل التشغيل.'
            : 'You do not have permission to access the Pre-Launch Verification Checklist.'}
        </p>
        <Button
          onClick={() => setActiveView('dashboard')}
          className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700"
        >
          {isAr ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
        </Button>
      </div>
    );
  }

  const completedCount = CHECKLIST_STEPS.filter((s) => checkedMap[s.id]).length;
  const progressPct = Math.round((completedCount / CHECKLIST_STEPS.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              {isAr ? 'شاشة المالك والمدير السرية' : 'Owner & Manager Verification'}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {isAr ? 'قائمة الفحص قبل التشغيل' : 'Pre-Launch Verification Checklist'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isAr
                ? 'تحقق يدوياً من جميع السيناريوهات التشغيلية والأمنية قبل اعتماد المنشأة للتشغيل الفعلي.'
                : 'Manually verify all operational, UI, and security scenarios before going live.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isAr ? 'إعادة ضبط' : 'Reset'}
            </Button>
            <Button
              onClick={() => setActiveView('settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800"
            >
              {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              {isAr ? 'الإعدادات' : 'Settings'}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-700 dark:text-slate-300">
              {isAr
                ? `تم إنجاز ${completedCount} من ${CHECKLIST_STEPS.length} خطوات`
                : `${completedCount} of ${CHECKLIST_STEPS.length} steps verified`}
            </span>
            <span className="text-cyan-600 dark:text-cyan-400">{progressPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {CHECKLIST_STEPS.map((step) => {
          const isChecked = !!checkedMap[step.id];
          return (
            <Button
              key={step.id}
              type="button"
              onClick={() => toggleStep(step.id)}
              className={`w-full text-start p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                isChecked
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-700'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isChecked ? (
                  <CheckSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {step.icon}
                    {isAr ? step.categoryAr : step.categoryEn}
                  </span>
                </div>
                <h3
                  className={`text-base font-bold ${
                    isChecked
                      ? 'line-through text-slate-500 dark:text-slate-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {isAr ? step.titleAr : step.titleEn}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {isAr ? step.descAr : step.descEn}
                </p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
