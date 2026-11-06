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
      id: 'step-dashboard',
      icon: LayoutDashboard,
      module: 'dashboard',
      color: 'from-cyan-500 to-blue-600',
      titleAr: `1. ${getScreenTitle('dashboard', true)} — نظرة على اليوم`,
      titleEn: `1. ${getScreenTitle('dashboard', false)} — Today’s Overview`,
      descAr: `${getScreenSubtitle('dashboard', true)}، مع متابعة رحلة الطلب من البيع للربح خطوة بخطوة.`,
      descEn: `${getScreenSubtitle('dashboard', false)}, with a step-by-step order journey from sale to profit.`,
      featureAr: 'يمكنك فتح المساعد السريع في أي وقت من الزر العائم بأسفل الشاشة.',
      featureEn: 'You can open the quick assistant anytime from the floating button at the bottom of the screen.',
    },
    {
      id: 'step-pos',
      icon: UtensilsCrossed,
      module: 'pos',
      color: 'from-blue-500 to-indigo-600',
      titleAr: '2. نقطة البيع السريعة وإدارة الطاولات (POS)',
      titleEn: '2. High-Speed Cloud POS & Table Operations',
      descAr: 'تسجيل سريع للطلبات باللمس، تقسيم الحسابات، دعم الصالة والتيك أواي والتوصيل، مع استقرار تام أثناء انقطاع الإنترنت ومزامنة آلية.',
      descEn: 'Ultra-fast touch order entry, split checks, floor plan management, and offline-first synchronization.',
      featureAr: 'الخصم اللحظي لمكونات الوجبة من المستودع فور اعتماد الفاتورة.',
      featureEn: 'Instant recipe ingredient depletion upon invoice closure.',
    },
    {
      id: 'step-menu',
      icon: ChefHat,
      module: 'menu',
      color: 'from-amber-500 to-orange-600',
      titleAr: '3. هندسة الوصفات وقائمة الطعام (BOM & Recipes)',
      titleEn: '3. Recipe Engineering & Bill of Materials (BOM)',
      descAr: 'بناء شجرة مكونات كل طبق بدقة، تحديد نسب الهالك والتشفية لكل مادة خام، وحفظ إصدارات الوصفات بشكل تراكمي غير قابل للتعديل بأثر رجعي.',
      descEn: 'Granular recipe explosion, butchery trim waste allocation, and immutable historical recipe version snapshots.',
      featureAr: 'حساب التكلفة الحقيقية متضمنة خامات، عمالة مباشرة، منافع، ومواد تعبئة.',
      featureEn: 'True plate costing factoring net raw items, direct labor, utilities, and packaging.',
    },
    {
      id: 'step-cost',
      icon: Scale,
      module: 'cost_control',
      color: 'from-emerald-500 to-teal-600',
      titleAr: '4. مراقبة التكاليف والانحراف ومحاكاة What-If',
      titleEn: '4. Cost Control, Variance & What-If Simulation',
      descAr: 'مقارنة الاستهلاك المعياري (ما ينبغي صرفه طبقاً للمبيعات) بالاستهلاك الفعلي (الجرد)، لكشف الهالك غير المبرر وعجز التشغيل بدقة بالغة.',
      descEn: 'Reconciling theoretical consumption against actual physical counts to diagnose shrinkage, portion creep, and waste.',
      featureAr: 'مختبر محاكاة What-If لدراسة أثر ارتفاع أسعار التوريد على سعر البيع وهامش الربح.',
      featureEn: 'What-If Simulation workspace testing supplier price drift against target menu margins.',
    },
    {
      id: 'step-inventory',
      icon: Package,
      module: 'inventory',
      color: 'from-cyan-500 to-teal-600',
      titleAr: '5. المستودعات المركزية وحركات المخزون',
      titleEn: '5. Multi-Warehouse Inventory & Requisitions',
      descAr: 'فصل المستودعات التشغيلية (رئيسي، مطبخ، بار، تعبئة)، إصدار أذون الاستلام والصرف الداخلي، وتنبيهات مستويات إعادة الطلب الآلية.',
      descEn: 'Multi-store segregation, goods receipt against POs, kitchen requisitions, and automated par-level triggers.',
      featureAr: 'تسجيل تسويات الجرد الدوري مع ربط الفروقات بحسابات التكلفة مباشرة.',
      featureEn: 'Periodic cycle counts with automated variance adjustment postings.',
    },
    {
      id: 'step-purchasing',
      icon: ShoppingBag,
      module: 'purchasing',
      color: 'from-purple-500 to-indigo-600',
      titleAr: '6. المشتريات وتقييم الموردين وتقلبات الأسعار',
      titleEn: '6. Procurement, Vendor Scoring & Price Drift',
      descAr: 'دورة شراء متكاملة من طلب الشراء إلى أمر التوريد والاستلام، مع مراقبة تقلبات أسعار عقود التوريد مقارنة بالسعر المعياري للوصفات.',
      descEn: 'Full PO lifecycle, vendor fulfillment ratings, and price drift alerts against recipe benchmarks.',
      featureAr: 'تحديث متوسط التكلفة المرجح للمخزون آلياً فور استلام الفاتورة.',
      featureEn: 'Automated weighted-average inventory cost revaluation on receipt.',
    },
    {
      id: 'step-finance',
      icon: DollarSign,
      module: 'finance',
      color: 'from-emerald-600 to-cyan-600',
      titleAr: '7. المحاسبة العامة والقيود التلقائية والضرائب',
      titleEn: '7. Double-Entry General Ledger & Tax Compliance',
      descAr: 'قيود يومية مزدوجة تلقائية بالكامل لكل حركة بيع أو شراء أو استهلاك، شجرة حسابات متخصصة بالضيافة، وفوترة إلكترونية متوافقة نظامياً.',
      descEn: 'Automated double-entry journals for all operations, hospitality-native chart of accounts, and e-invoicing ledger.',
      featureAr: 'قائمة دخل (P&L) وميزان مراجعة لحظي دون أي إدخال محاسبي يدوي متكرر.',
      featureEn: 'Live executive P&L and trial balances tied directly to source operational events.',
    },
    {
      id: 'step-ai',
      icon: Sparkles,
      module: 'dashboard',
      color: 'from-cyan-400 to-blue-500',
      titleAr: '8. مساعد TYGOS الذكي للإدارة والتشغيل',
      titleEn: '8. System-Aware TYGOS Operational Assistant',
      descAr: 'مساعد ذكي يفهم مصطلحات المنظومة، الأصناف، والوصفات، وينفذ التنقل المباشر ("افتح المخزون")، ويشرح أسباب تغير الأرباح مع الالتزام بالصلاحيات.',
      descEn: 'Grounded intelligence executing navigation ("Open inventory"), reporting dish true costs, and diagnosing profit variance under strict RBAC.',
      featureAr: 'زر عائم قابل للسحب في أي مكان على الشاشة لسهولة الوصول.',
      featureEn: 'Movable draggable launcher that snaps safely to screen edges.',
    },
    {
      id: 'step-security',
      icon: Shield,
      module: 'dashboard',
      color: 'from-purple-600 to-pink-600',
      titleAr: '9. بروتوكول الأمان المعتمد والتصاريح المؤقتة',
      titleEn: '9. Zero-Password Security & Timed Privileges',
      descAr: 'حظر تام لمشاركة كلمات المرور بين الموظفين. عند الحاجة لصلاحية إدارية خاصة، يقدم الموظف طلب تصريح مؤقت ومحدد بوقت وجهاز معتمد.',
      descEn: 'Zero password sharing. Staff submit timed, audited privilege escalation requests approved in real-time by supervisors.',
      featureAr: 'سجل تدقيق أمني غير قابل للتعديل يوثق كافة الأنشطة الحساسة بالمنشأة.',
      featureEn: 'Immutable audit trail logging every critical event with cryptographic session tokens.',
    },
    {
      id: 'step-menu-setup',
      icon: Sparkles,
      module: 'menu_management',
      color: 'from-cyan-500 to-teal-500',
      titleAr: '10. إعداد المنيو الإلكتروني والوسوم واللغات',
      titleEn: '10. Digital QR Menu Setup, Badges & Bilingual Descriptions',
      descAr: 'تخصيص الوصف التسويقي والمكونات وطريقة التحضير بالعربية والإنجليزية، وإضافة وسوم الصنف (حار، نباتي، جديد، الأكثر طلباً) مع صور عالية الجودة.',
      descEn: 'Customize bilingual marketing descriptions, ingredients, prep methods, and item badges (Spicy, Vegan, New, Bestseller) with rich photography.',
      featureAr: 'فصل تام لبيانات التسويق والصور عن شاشات الكاشير والمحاسبة والمخزون.',
      featureEn: 'Complete data-level separation between marketing media and POS/Accounting/Inventory.',
    },
    {
      id: 'step-qr-printing',
      icon: QrCode,
      module: 'qr_tables',
      color: 'from-indigo-500 to-cyan-500',
      titleAr: '11. طباعة ملصقات QR للطاولات دفعة واحدة',
      titleEn: '11. Batch Table QR Sticker Printing & Configuration',
      descAr: 'تحديد عدد الطاولات في المنشأة وتوليد رموز QR مخصصة لكل طاولة مع إمكانية الطباعة الجماعية (A4 أو حراري) برقم الطاولة على كل ملصق.',
      descEn: 'Configure establishment table count and batch-print table-specific QR stickers (A4 or thermal) with table numbers.',
      featureAr: 'توجيه تلقائي للعميل إلى طاولته فور مسح الكود دون إدخال يدوي.',
      featureEn: 'Automatic table assignment when guests scan their table QR code.',
    },
    {
      id: 'step-receiving-orders',
      icon: UtensilsCrossed,
      module: 'pos',
      color: 'from-emerald-500 to-cyan-600',
      titleAr: '12. استقبال طلبات المنيو الإلكتروني في الكاشير',
      titleEn: '12. Receiving & Approving QR Orders in Cashier POS',
      descAr: 'استقبال إشعارات فورية مع تنبيه صوتي عند وصول طلب جديد (صالة، تيك أواي، توصيل)، ومراجعة حالة كل محطة والتنبيه عند تأخر أي محطة.',
      descEn: 'Receive instant toast & chime alerts for incoming QR orders, review per-station status, and get alerted if any station lags.',
      featureAr: 'مزامنة لحظية بين شاشة العميل وشاشة الكاشير عبر قناة النقل المباشر.',
      featureEn: 'Real-time synchronization between customer tracking view and cashier drawer.',
    },
    {
      id: 'step-stations-kds',
      icon: Monitor,
      module: 'kds',
      color: 'from-amber-500 to-rose-600',
      titleAr: '13. محطات التحضير وشاشات المطبخ (KDS)',
      titleEn: '13. Kitchen Display Stations (KDS) & Ticket Routing',
      descAr: 'توزيع تلقائي لتذاكر الطلب على المحطات المختصة (المطبخ، المشويات، البار، الحلويات) وتحديث حالة التحضير حتى الجاهزية الكاملة.',
      descEn: 'Automated ticket splitting across specialized prep stations (Kitchen, Grill, Bar, Pastry) with live status progression.',
      featureAr: 'حماية خصوصية بيانات العميل بعدم إظهار رقم الهاتف أو العنوان لتذاكر المطبخ.',
      featureEn: 'Customer PII protection by omitting phone/address from kitchen prep tickets.',
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
