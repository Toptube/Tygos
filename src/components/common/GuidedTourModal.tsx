/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Button } from './Button.tsx';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Scale,
  Package,
  ShoppingBag,
  DollarSign,
  Users,
  Shield,
  HelpCircle,
  QrCode,
  Monitor,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { getScreenTitle, getScreenSubtitle } from '../../i18n/glossary.ts';

interface GuidedTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuidedTourModal: React.FC<GuidedTourModalProps> = ({ isOpen, onClose }) => {
  const { language, dir } = useI18n();
  const { setActiveView } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const isAr = language === 'ar';
  const NextArrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const PrevArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const tourSteps = [
    {
      id: 'step-inventory-units',
      icon: Package,
      module: 'inventory',
      color: 'from-cyan-500 to-teal-600',
      titleAr: '1. الخامات ووحدات التعبئة والتجزئة',
      titleEn: '1. Raw Materials & Multi-Unit Packs',
      descAr: 'سجّل خاماتك في دقيقة مع سلسلة التعبئة (كرتونة ← علبة ← جم) ونسبة الهالك، أو فعّل «خامة بلا رصيد مخزني» للماء والملح.',
      descEn: 'Add raw materials with 3-tier packaging conversions, trim waste %, or mark utilities like water as cost-only untracked.',
      featureAr: 'تنبيه فوري قبل الحفظ يعرض أثر تعديل سعر أي خامة على الأطباق والتجهيزات.',
      featureEn: 'Instant pre-save price impact preview across all affected preparations and dishes.',
    },
    {
      id: 'step-semi-finished',
      icon: Sparkles,
      module: 'semi_finished',
      color: 'from-amber-500 to-orange-600',
      titleAr: '2. التجهيزات والتحضيرات الأساسية (عجين وصوصات)',
      titleEn: '2. Semi-Finished Preparations & Yields',
      descAr: 'أنشئ الصوصات والعجين والتتبيلات وعمليات المعالجة بعامل الطبخ (مثل 50 جم أرز ← 100 جم مطهو) والحصص المسماة لتعمل «على الصيغة» أو بالدفعات.',
      descEn: 'Build sauces, doughs, cooking-yield conversions (50g raw -> 100g cooked rice), and named portions in formula or optional batch mode.',
      featureAr: 'تفكيك تلقائي للخامات الأولية عند البيع دون الحاجة لجرد مسبق، وحجب التجهيزات عن المشتريات.',
      featureEn: 'Automatic raw ingredient decomposition on POS sale and automatic blocking from vendor purchase orders.',
    },
    {
      id: 'step-recipes',
      icon: ChefHat,
      module: 'menu',
      color: 'from-blue-500 to-indigo-600',
      titleAr: '3. الأقسام والمنتجات والوصفات (رسبي)',
      titleEn: '3. Category Tree, Products & Recipes',
      descAr: 'رتّب منتجاتك في شجرة أقسام من 3 مستويات، واربط مكونات الوصفة من خامات وتجهيزات وتغليف لمعرفة التكلفة والربح الصافي بالجنيه.',
      descEn: 'Organize dishes across 3-level category trees and link raw items, portions, and packaging to compute net cost and profit in EGP.',
      featureAr: 'حفظ سلس دون تكرار مع أداة فحص ودمج المكرر وحقول أرقام عربية وإنجليزية مريحة للموبايل.',
      featureEn: 'Duplicate-safe saving, duplicates resolver tool, and mobile-friendly bilingual numeric inputs.',
    },
    {
      id: 'step-warehouses',
      icon: ShoppingBag,
      module: 'warehouses',
      color: 'from-purple-500 to-indigo-600',
      titleAr: '4. المخازن وكارت الصنف ودورة الطلبيات',
      titleEn: '4. Warehouses, Item Card & Requisitions',
      descAr: 'مخازن متعددة (رئيسي، مطبخ مركزي، مطبخ، بار، مخبز)، كارت صنف موحد بكل الحركات، وطلبيات بدورة «في الطريق» والرفض المسبب.',
      descEn: 'Multi-branch warehouses, unified item movement ledger, and 4-stage requisitions with In-Transit tracking and reasoned rejections.',
      featureAr: 'استلام فواتير المشتريات يحدّث متوسط التكلفة المرجح آلياً ويوزع البضاعة للخزائن المعتمدة.',
      featureEn: 'Vendor receipts update Weighted Average Cost automatically and record auditable vouchers.',
    },
    {
      id: 'step-pos-qr-kds',
      icon: UtensilsCrossed,
      module: 'pos',
      color: 'from-emerald-500 to-cyan-600',
      titleAr: '5. البيع (الكاشير) وشاشات المطبخ ومنيو QR',
      titleEn: '5. Point of Sale, Kitchen Screens & QR Menu',
      descAr: 'بيع سريع أوفلاين من الكاشير مع خصم فوري من مخزن القسم، وإشارات الأصفر (قارب على النفاد) والرمادي المعطل، ومنيو QR للطاولات.',
      descEn: 'Offline-first checkout depleting section stores, yellow/gray availability alerts, KDS routing, and offline QR table menus.',
      featureAr: 'تبديل فوري لإتاحة الصنف من شاشة المطبخ، وحجب تام للتكاليف والأرباح عن الزبائن والكاشير.',
      featureEn: 'One-tap chef availability override on KDS with strict cost & margin isolation from guests and cashiers.',
    },
    {
      id: 'step-audit-notes',
      icon: Scale,
      module: 'inventory_audit',
      color: 'from-cyan-500 to-emerald-600',
      titleAr: '6. الجرد الفعلي والملاحظات اليومية وكشف الانحراف',
      titleEn: '6. Physical Stocktake, Daily Notes & Variance',
      descAr: 'أجرِ جرداً اختبارياً أو إغلاقاً فعلياً بترتيب الرفوف، مع استبعاد بضاعة «في الطريق»، وإدخال التجهيزات المتبقية، وفتح كارت الصنف من الملاحظات.',
      descEn: 'Draft or official stocktake with shelf sorting, In-Transit exclusion, remaining prep entry, daily movement drilldown, and field notes.',
      featureAr: 'تفصيل حركات اليوم وحساب تكلفة العجز بالجنيه مع تنويه الطباعة للمشكلات غير المحلولة.',
      featureEn: 'Daily movement breakdown modal, EGP deficit costing, and mandatory print notice for unresolved issues.',
    },
    {
      id: 'step-overhead-cost',
      icon: DollarSign,
      module: 'overhead_allocation',
      color: 'from-emerald-600 to-teal-600',
      titleAr: '7. المصاريف وتوزيعها والتكلفة الكاملة للمنتج',
      titleEn: '7. Two-Stage Overhead & Full Product Cost',
      descAr: 'تحميل المصاريف المباشرة وغير المباشرة على مرحلتين (مشترك ← مراكز ← منتجات) مع كشف الأصناف الخاسرة بعد التحميل وحاسبة التجربة.',
      descEn: 'Two-stage overhead routing with department profitability, burden rates, absorption variances, and live allocation rule simulator.',
      featureAr: 'استيراد رواتب ومصاريف الشهر دون تكرار وقفل الشهر تلقائياً عند الإغلاق الرسمي.',
      featureEn: 'Deduplicated HR/Finance monthly import and automatic month lock upon official period close.',
    },
    {
      id: 'step-health-security',
      icon: Shield,
      module: 'ui_inspector',
      color: 'from-slate-600 to-cyan-700',
      titleAr: '8. الأمان وفاحص الواجهة والنسخ الاحتياطي',
      titleEn: '8. Security, Mobile UI Inspector & JSON Backup',
      descAr: 'صلاحيات محكمة بـ PIN عشوائي، وعزل خزينة الكاشير، مع فاحص تداخل الموبايل، سجل الأخطاء، وترحيل البيانات والنسخ الاحتياطي مع المعاينة.',
      descEn: 'Random 6-digit PINs, cashier shift vault isolation, mobile UI inspector, error log, schema migrations, and rollback-safe JSON backup.',
      featureAr: 'متاح للمالك والمدير العام لفحص كل الشاشات وتصدير البيانات أو إصلاحها محلياً في أي وقت.',
      featureEn: 'Dedicated owner/GM tools for full screen diagnostics and one-click local backup or data repair.',
    },
  ];

  const current = tourSteps[currentStep];
  const Icon = current.icon;

  const handleNavigateAndClose = () => {
    setActiveView(current.module);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in" dir={dir}>
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 relative">
        {/* Top Progress bar */}
        <div className="h-1.5 w-full bg-slate-800 flex">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${current.color} text-slate-950 shadow-md`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400 block">
                {isAr ? `خطوة ${currentStep + 1} من ${tourSteps.length}` : `Step ${currentStep + 1} of ${tourSteps.length}`}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isAr ? current.titleAr : current.titleEn}
              </h3>
            </div>
          </div>

          <Button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close Tour"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            {isAr ? current.descAr : current.descEn}
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-400 me-1">
                {isAr ? 'الميزة التشغيلية:' : 'Key Operational Value:'}
              </span>
              <span className="text-slate-300">
                {isAr ? current.featureAr : current.featureEn}
              </span>
            </div>
          </div>

          {/* Quick jump to screen */}
          <div className="pt-2">
            <Button
              onClick={handleNavigateAndClose}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{isAr ? 'انتقل مباشرة لهذه الشاشة وجربها الآن' : 'Jump to this module and explore now'}</span>
              <NextArrow className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3">
          <Button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer px-2 py-1"
          >
            {isAr ? 'تخطي الجولة' : 'Skip Tour'}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3.5 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PrevArrow className="w-3.5 h-3.5" />
                <span>{isAr ? 'السابق' : 'Previous'}</span>
              </Button>
            )}

            {currentStep < tourSteps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-colors cursor-pointer"
              >
                <span>{isAr ? 'التالي' : 'Next'}</span>
                <NextArrow className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-colors cursor-pointer"
              >
                <span>{isAr ? 'إنهاء واستكشاف المنظومة' : 'Finish & Explore Tygos'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
