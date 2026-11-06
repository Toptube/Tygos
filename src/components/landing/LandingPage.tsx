/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TYGOS OFFICIAL MARKETING LANDING PAGE (المرحلة الرابعة)
 * Written with warm, confident Egyptian/Modern Standard Arabic copy and professional English marketing translation.
 * Follows the 9-section master conversion structure.
 */

import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Shield,
  UtensilsCrossed,
  ChefHat,
  Scale,
  Package,
  ShoppingBag,
  DollarSign,
  Receipt,
  Users,
  Wrench,
  Bot,
  Zap,
  Globe2,
  Lock,
  ChevronDown,
  Building2,
  Compass,
  Smile,
  AlertOctagon,
  TrendingUp,
  FileCheck,
  Check,
  QrCode,
  Flame,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { LanguageSelector } from '../common/LanguageSelector.tsx';
import { ThemeSwitcher } from '../common/ThemeSwitcher.tsx';
import { TygosLogo, TYGOS_LOGO_SRC, TYGOS_COVER_SRC, PermanentAppBrandBadge } from '../brand/TygosLogo.tsx';
import { UserRole } from '../../types/index.ts';
import { getMergedWhatsNew, qrMenuMarketingSection } from '../../data/landingContent.ts';

interface LandingPageProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onExploreDemo?: (role?: UserRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenRegister,
  onOpenLogin,
  onExploreDemo,
}) => {
  const { language, dir } = useI18n();
  const isAr = language === 'ar';
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // 1. Pain Points (الوجع)
  const painCards = [
    {
      id: 'pricing',
      icon: AlertOctagon,
      titleAr: 'بتسعّر أطباقك ومشروباتك بالتخمين',
      titleEn: 'Pricing Dishes by Guesswork',
      descAr: 'بتشوف السوق بيبيع بكام وتقلده، وممكن تكتشف متأخر إن تكلفة خامك مع العمالة والغاز واكلة كل هامش ربحك.',
      descEn: 'You copy competitors without knowing your raw ingredients, gas, and labor costs are quietly eating your margins.',
    },
    {
      id: 'waste',
      icon: Scale,
      titleAr: 'المخزون بيخلص أو بيبوظ فجأة',
      titleEn: 'Stock Depletes or Spoils Unexpectedly',
      descAr: 'خامات غالية بتنتهي صلاحيتها في الثلاجة، أو ييجي وقت ذروة الشغل وتكتشف إن صنف أساسي خلصان ومش معمول حسابه.',
      descEn: 'Expensive ingredients spoil in cold storage, or crucial items run out right at peak service hours without warning.',
    },
    {
      id: 'accounts',
      icon: Receipt,
      titleAr: 'الحسابات آخر الشهر مابتطابقش الفعلي',
      titleEn: 'End-of-Month Ledger Never Matches Reality',
      descAr: 'المبيعات في الدرج عالية جداً، بس الفلوس في البنك قليلة.. وفارق الهدر أو هالك التشفية مش باين في أي دفتر.',
      descEn: 'Register sales look strong, but actual bank balances fall short because prep trim waste and variance are invisible.',
    },
  ];

  // 2. The 3-Step Solution (الحل في ٣ خطوات)
  const solutionSteps = [
    {
      stepNum: '1',
      titleAr: 'سجّل خاماتك في دقيقة',
      titleEn: 'Record Raw Materials in 1 Min',
      descAr: 'اكتب اسم الخامة، سعر الشراء، والكمية. النظام بيحسبلك تلقائياً تكلفة الجرام الصافي بعد خصم هالك التقشير والتشفية.',
      descEn: 'Enter item name, purchase cost, and quantity. The system automatically computes net usable cost after trim waste.',
    },
    {
      stepNum: '2',
      titleAr: 'ركّب وصفاتك واعرف تكلفتها',
      titleEn: 'Build Recipes & Know True Cost',
      descAr: 'حدّد مكونات كل طبق أو مشروب. هتشوف تكلفة طبقك للقرش مع حساب وقت الشيف واستهلاك الغاز والتغليف.',
      descEn: 'Define ingredients for each dish or drink. See exact true cost down to the penny including prep time, utilities, and packaging.',
    },
    {
      stepNum: '3',
      titleAr: 'بيع في الصالة وتابع أرباحك',
      titleEn: 'Sell at POS & Watch Profits Grow',
      descAr: 'مع كل طلب بيطلع من الكاشير، بيتم خصم مكونات الطبق من المخزن آلياً، وبيظهرلك فوراً أي انحراف أو هدر غير مبرر.',
      descEn: 'Every POS sale auto-depletes inventory ingredients and instantly flags any unexplained portioning variance or shrinkage.',
    },
  ];

  // 3. The 8 Operational Modules (الوحدات الثمانية) - صيغة "هتقدر تعمل إيه"
  const modulesList = [
    {
      id: 'pos',
      icon: UtensilsCrossed,
      titleAr: 'نقاط البيع والصالة',
      titleEn: 'Point of Sale & Dine-In',
      actionAr: 'بيع بسرعة وطلّع فاتورتك الضريبية بضغطة واحدة، حتى لو النت فصل في عز زحمة الوردية.',
      actionEn: 'Issue compliant tax receipts in seconds with full offline resilience during peak rush hours.',
    },
    {
      id: 'cost_engine',
      icon: ChefHat,
      titleAr: 'محرك التكلفة الحقيقية (BOM)',
      titleEn: 'True Cost Engineering (BOM)',
      actionAr: 'اعرف تكلفة طبقك للقرش: من أول اللحم والخضار لهالك التشفية، وقت الشيف، والغاز والكهربا.',
      actionEn: 'Discover your exact portion cost down to raw yield scraps, direct prep labor, and allocated gas/power.',
    },
    {
      id: 'variance',
      icon: Scale,
      titleAr: 'كشف الهدر والانحرافات',
      titleEn: 'Waste & Variance Detection',
      actionAr: 'قارن اللي المفروض يخرج من المخزن باللي خرج فعلاً، وامسك أي تسريب أو زيادة في التوزيع قبل ما يخسرك.',
      actionEn: 'Compare theoretical BOM consumption against physical inventory to catch waste and portion creep early.',
    },
    {
      id: 'inventory',
      icon: Package,
      titleAr: 'المخازن والمستودعات',
      titleEn: 'Warehouse & Inventory',
      actionAr: 'تابع رصيد خاماتك بالجرام والمل، واستقبل تنبيهات فورية قبل ما أي صنف يخلص عشان تطلبه في وقته.',
      actionEn: 'Track ingredient stock by grams and ml, with automated low-stock reorder point notifications.',
    },
    {
      id: 'finance_tax',
      icon: DollarSign,
      titleAr: 'المالية والضرائب',
      titleEn: 'Finance & Compliant Taxes',
      actionAr: 'قيود يومية وميزانيات بتتولد آلياً مع كل حركة بيع وشراء، وإقرارك الضريبي جاهز بضغطة زر.',
      actionEn: 'Automated journal entries with every shift and purchase, with instant compliant tax return summaries.',
    },
    {
      id: 'hr_payroll',
      icon: Users,
      titleAr: 'الموارد البشرية والورديات',
      titleEn: 'HR, Staff & Shifts',
      actionAr: 'وزّع شفتات فريقك، احسب رواتبهم وساعات إضافيهم، واربط أجر وقت الطبخ بتكلفة الصنف المباشرة.',
      actionEn: 'Schedule crew shifts, manage wages, and factor cook preparation time directly into menu portioning.',
    },
    {
      id: 'maintenance',
      icon: Wrench,
      titleAr: 'صيانة الأصول والمعدات',
      titleEn: 'Asset & Equipment Maintenance',
      actionAr: 'حافظ على أفرانك، ماكينات الإسبريسو، وغرف التبريد بمواعيد صيانة دورية تفاديك الأعطال المفاجئة.',
      actionEn: 'Safeguard espresso machines, ovens, and chillers with recurring preventive maintenance schedules.',
    },
    {
      id: 'ai_assistant',
      icon: Bot,
      titleAr: 'مساعد TYGOS الذكي',
      titleEn: 'TYGOS Smart Assistant',
      actionAr: 'اسأله عن أي رقم، أو قوله "وديني للكاشير" أو "أضف خامة"، وهيتحرك وينفذ معاك في نفس اللحظة.',
      actionEn: 'Ask questions about costs or give instant navigation commands hands-free with intelligent local guidance.',
    },
  ];

  // 4. Before & After (قبل وبعد)
  const beforeAfterStats = [
    {
      labelAr: 'نسبة الهدر غير المحسوب في الخامات',
      labelEn: 'Unaccounted Prep Scraps & Trim Waste',
      before: '18% - 24%',
      after: '4% - 6%',
      gainAr: 'توفير مباشر في فاتورة المشتريات',
      gainEn: 'Direct savings on purchase bills',
    },
    {
      labelAr: 'دقة حساب تكلفة الطبق الواحد',
      labelEn: 'Portion Cost Calculation Accuracy',
      before: 'تخمين تقريبي',
      after: '99.5% بالقرش',
      gainAr: 'تسعير عادل يضمن ربحك الصافي',
      gainEn: 'Defensible pricing protecting gross margins',
    },
    {
      labelAr: 'الوقت المستغرق في إقفال الحسابات والجرد',
      labelEn: 'Time Required for Stocktake & Shift Closing',
      before: '3 إلى 5 أيام شهرياً',
      after: 'فوري مع كل وردية',
      gainAr: 'تقرير Z ومطابقة مالية يومية',
      gainEn: 'Daily automated Z-reports and ledger updates',
    },
  ];

  // 5. Three Real-World Scenarios (ثلاث حكايات)
  const caseStories = [
    {
      typeAr: 'مطعم مشويات وباستا (القاهرة)',
      typeEn: 'Grill & Pasta Bistro (Cairo)',
      problemAr: 'كان الشيف يشتري لحوم بكميات ضخمة ومبيعات الستيك عالية، لكن صافي الربح مكنش متطابق مع حجم المبيعات.',
      problemEn: 'High-volume steak sales were hiding severe profit leaks due to unmeasured butchery fat and bone loss.',
      transformationAr: 'مع TYGOS، تم احتساب هالك التشفية بنسبة 16% وإضافته لتكلفة الطبق الحقيقية، واكتشفوا إن سعر البيع كان منخفضاً.',
      transformationEn: 'Using TYGOS, 16% yield waste was incorporated into the BOM, uncovering that selling prices were undercutting cost.',
      resultAr: 'النتيجة: ارتفع هامش ربح قسم اللحوم بنسبة 22% خلال شهرين فقط دون أي تراجع في رضا الزبائن.',
      resultEn: 'Result: Meat section gross margin increased by 22% in two months while keeping customer satisfaction high.',
    },
    {
      typeAr: 'كافيه قهوة مختصة ومخبوزات (الرياض)',
      typeEn: 'Specialty Coffee & Bakery (Riyadh)',
      problemAr: 'استهلاك الحليب والبن كان بيتسرب بكميات مش مفهومة، والكرواسون كان بيخلص وقت الزحمة والزبائن تمشي.',
      problemEn: 'Steaming milk and espresso beans were disappearing without tracking, while croissants ran out during morning rushes.',
      transformationAr: 'فعلوا حدود إعادة الطلب الذكية، وتم ربط كل فلات وايت وسيروب بالخصم التلقائي من المخزن اللحظي.',
      transformationEn: 'They configured automatic reorder alerts and linked each flat white shot directly to instant stock depletion.',
      resultAr: 'النتيجة: انعدم نفاد البضاعة وقت الذروة، وقل هدر الحليب بنسبة 65%.',
      resultEn: 'Result: Zero stockouts during peak hours, and dairy waste was slashed by 65%.',
    },
    {
      typeAr: 'منشأة سياحية وبوفيه فندقي (الغردقة)',
      typeEn: 'Resort & Beach Club (Hurghada)',
      problemAr: 'صعوبة تتبع تكلفة بوفيه الإفطار المفتوح، وتكلفة الغاز ومنافع التبريد مكنتش بتتحسب في ميزانية المطبخ.',
      problemEn: 'Difficulties tracking open breakfast buffet margins, while power and chiller gas overhead were neglected.',
      transformationAr: 'وزعوا مصاريف المنافع والمستهلكات على عدد التذاكر اليومية بدقة، وراقبوا حركة الأسماك والمأكولات الطازجة.',
      transformationEn: 'Allocated utilities and packaging across daily covers and monitored high-value fresh seafood movement.',
      resultAr: 'النتيجة: ضبط ميزانية التشغيل الشهري وتوفير أكثر من 14% من المصاريف غير المرئية.',
      resultEn: 'Result: Budget variance normalized with a 14% drop in previously invisible operational leakage.',
    },
  ];

  // 6. Role Portals for Demo (جرّب بنفسك)
  const rolePortals: { role: UserRole; titleAr: string; titleEn: string; descAr: string; descEn: string }[] = [
    {
      role: 'tenant_admin',
      titleAr: 'مالك المنشأة',
      titleEn: 'Establishment Owner',
      descAr: 'استعرض الأرباح، تقارير التكلفة، وإعدادات المنظومة.',
      descEn: 'Inspect overall margins, P&L, and system settings.',
    },
    {
      role: 'general_manager',
      titleAr: 'المدير العام',
      titleEn: 'General Manager',
      descAr: 'تابع سير الورديات، حركة الصالة، وأداء الأقسام.',
      descEn: 'Monitor shifts, dining operations, and departments.',
    },
    {
      role: 'cost_accountant',
      titleAr: 'محاسب التكاليف',
      titleEn: 'Cost Controller',
      descAr: 'افحص نسب الانحراف، هالك التحضير، وتكلفة الـ Food Cost.',
      descEn: 'Analyze variance, prep trim yield, and portion costs.',
    },
    {
      role: 'cashier',
      titleAr: 'كاشير نقطة البيع',
      titleEn: 'POS Cashier',
      descAr: 'جرّب تسجيل الطلبات السريعة وإصدار الفاتورة الضريبية.',
      descEn: 'Test high-speed ordering, receipt issuance, and Z-report.',
    },
    {
      role: 'kitchen_manager',
      titleAr: 'شيف المطبخ',
      titleEn: 'Executive Chef',
      descAr: 'عدّل مكونات الوصفات واضبط معايير التحضير (SOP).',
      descEn: 'Fine-tune BOM ingredient portions and prep SOP steps.',
    },
  ];

  // 7. Frequently Asked Questions (8 أسئلة شائعة)
  const faqList = [
    {
      qAr: 'هل أحتاج لخبرة محاسبية أو تدريب تقني معقد لاستخدام TYGOS؟',
      qEn: 'Do I need accounting expertise or technical training to use TYGOS?',
      aAr: 'أبداً. صممنا المنظومة لتكون أبسط من أي برنامج محاسبي تقليدي؛ أي شيف أو كاشير يقدر يسجل خامة أو يبيع في أقل من دقيقة، والنظام بيعمل كل الحسابات المعقدة في الخلفية.',
      aEn: 'Not at all. Designed for operational simplicity; any cook or cashier can add ingredients or sell in under a minute while backend formulas handle accounting automatically.',
    },
    {
      qAr: 'هل يعمل النظام على الهواتف والأجهزة اللوحية (التابلت)؟',
      qEn: 'Does the platform work seamlessly on smartphones and tablets?',
      aAr: 'نعم بنسبة 100%. تم بناء الواجهة بتقنية Mobile-First لتتكيف مع أصغر شاشة موبايل (320px) وحتى الشاشات الكبيرة بدون أي تمرير أفقي مزعج.',
      aEn: '100% yes. Built Mobile-First to adapt smoothly from small 320px mobile screens up to multi-monitor setups without horizontal scrolling.',
    },
    {
      qAr: 'ماذا يحدث إذا انقطع الإنترنت في منتصف العمل؟',
      qEn: 'What happens if the internet disconnects during a busy rush?',
      aAr: 'نقطة البيع ومسودة الطلبات تعمل دون اتصال، ويتم حفظ جميع الفواتير محلياً على جهازك، وتتزامن البيانات تلقائياً بمجرد عودة الاتصال.',
      aEn: 'POS and draft orders operate offline. Invoices are stored locally on your device and sync seamlessly once connectivity returns.',
    },
    {
      qAr: 'هل بيانات منشأتي وأسعار خاماتي في أمان وخصوصية تامة؟',
      qEn: 'Is my venue data and private pricing completely secure?',
      aAr: 'نعم. كل منشأة لها قسم بيانات معزول ومحمي (Sovereign Partition)، ولا يمكن لأي منشأة أخرى أو كاشير غير مصرح له الاطلاع على أرباحك وتكاليفك.',
      aEn: 'Yes. Every venue runs in an isolated sovereign partition. Unprivileged staff cannot view profits or true costs without a manager token.',
    },
    {
      qAr: 'هل يناسب المنظومة كافيه صغير أو عربة طعام متنقلة؟',
      qEn: 'Is TYGOS suitable for a small cafe or food truck?',
      aAr: 'بالتأكيد. يمكنك البدء بخامات بسيطة ووصفات معدودة، وتكبر معك المنظومة لتغطي فروعاً متعددة ومستودعاً مركزياً كلما توسع نشاطك.',
      aEn: 'Absolutely. Start with simple coffee beans and a few items; the system scales with you to multiple branches and central commissaries.',
    },
    {
      qAr: 'كيف يختلف TYGOS عن برامج الكاشير ونقاط البيع التقليدية؟',
      qEn: 'How does TYGOS differ from traditional point of sale systems?',
      aAr: 'برامج الكاشير التقليدية بتسجل الفلوس فقط؛ TYGOS بيوريك تكلفة كل جرام لحم، هالك التقشير، ودقائق العمالة، ويكشفلك فين بتروح أرباحك الحقيقية.',
      aEn: 'Traditional POS registers just count revenue; TYGOS reveals portion cost, prep yield scraps, and labor minutes to stop profit leakage.',
    },
    {
      qAr: 'هل يمكنني استيراد خاماتي وقائمتي الحالية من ملف Excel؟',
      qEn: 'Can I import my existing raw ingredients and menu from Excel?',
      aAr: 'نعم، نوفر مساحة استيراد بصرية تمكنك من نسخ ولصق الخلايا من Excel أو رفع ملف CSV ومعاينته وتعديله قبل الحفظ بنقرة واحدة.',
      aEn: 'Yes. A visual import workspace lets you paste directly from Excel or upload CSV with instant preview and inline editing.',
    },
    {
      qAr: 'هل يمكنني تحميل نسخة احتياطية من بياناتي في أي وقت؟',
      qEn: 'Can I export a local backup of my entire business data anytime?',
      aAr: 'بكل تأكيد. يمكنك من صفحة الإعدادات تنزيل ملف JSON مشفر يحتوي على كافة خاماتك ومنتجاتك وسجلاتك بنقرة زر ودون الحاجة لأي خوادم خارجية.',
      aEn: 'Certainly. Export a local JSON backup anytime from Settings to keep offline copies of all ingredients, recipes, and logs.',
    },
  ];

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-cyan-300 relative overflow-x-hidden font-sans"
    >
      {/* 0. PERMANENT OFFICIAL BRAND BANNER WITH APP URL */}
      <PermanentAppBrandBadge variant="banner" />

      {/* 1. TOP MARKETING NAVIGATION */}
      <nav className="h-18 sticky top-0 z-50 border-b border-slate-800/80 bg-[#070b14]/85 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TygosLogo variant="responsive-header" showSubtitle={false} />
          <PermanentAppBrandBadge variant="header-pill" className="hidden sm:inline-flex" />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSelector variant="header" />
          <ThemeSwitcher />

          <Button
            type="button"
            onClick={onOpenLogin}
            className="text-xs font-bold text-slate-300 hover:text-cyan-400 px-3 py-2 rounded-xl transition-colors cursor-pointer"
          >
            {isAr ? 'تسجيل الدخول' : 'Sign In'}
          </Button>

          <Button
            type="button"
            onClick={onOpenRegister}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-md shadow-cyan-950/40 transition-all cursor-pointer"
          >
            {isAr ? 'ابدأ مجاناً' : 'Get Started'}
          </Button>
        </div>
      </nav>

      {/* 2. SECTION 1: HERO SECTION */}
      <section className="relative min-h-[82vh] flex items-center justify-center py-16 px-4 sm:px-6 overflow-hidden">
        {/* Crisp Cover Wallpaper visual */}
        <div className="absolute inset-0 z-0">
          <img
            src={TYGOS_COVER_SRC}
            alt="TYGOS Platform Background"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-30 select-none scale-105"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070b14]/85 via-[#070b14]/75 to-[#070b14]" />
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-1/3 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* Subtle Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-bold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isAr ? 'منظومة إدارة تكاليف وتشغيل المطاعم والكافيهات' : 'Hospitality ERP & Food Cost Intelligence'}</span>
          </div>

          {/* Hook Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            {isAr ? 'فين بتروح أرباحك آخر الشهر؟' : 'Where Do Your Restaurant Profits Disappear?'}
          </h1>

          {/* Warm Egyptian Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            {isAr
              ? 'TYGOS بيوريك تكلفة كل طبق وكل كوباية على حقيقتها، وبيكشف الهدر قبل ما يأكل مكسبك. من أول بيعة لآخر جنيه.'
              : 'TYGOS exposes the true cost of every dish and beverage, catching hidden trim waste and portion creep before profits slip away.'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 shadow-xl shadow-cyan-950/60 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isAr ? 'جرّب مجاناً الآن' : 'Try Free Now'}</span>
              <ArrowIcon className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              onClick={() => {
                const el = document.getElementById('how-it-works');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-sm bg-slate-900/90 border border-slate-700 hover:border-cyan-500 text-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'شوف إزاي بيشتغل' : 'See How It Works'}</span>
            </Button>
          </div>

          {/* Micro Trust Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'يعمل على أي موبايل أو تابلت' : 'Works on any smartphone'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'عربي وإنجليزي بنقرة واحدة' : 'Bilingual Arabic & English'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'بدون تعقيد محاسبي' : 'Zero accounting jargon'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2.5. SECTION: WHAT'S NEW IN TYGOS (جديد في TYGOS) */}
      <section className="py-12 px-4 sm:px-8 border-t border-slate-800/80 bg-gradient-to-b from-[#0a1122] to-[#070b14]">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/70 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {isAr ? 'جديد في منظومة TYGOS' : "What's New in TYGOS"}
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {isAr ? 'تحديثات وميزات أضيفت حديثاً لتسهيل تشغيلك' : 'Latest tools added to streamline your operations'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {getMergedWhatsNew().slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                    {item.badge || (isAr ? 'تحديث' : 'Update')}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.date}</span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  {isAr ? item.titleAr : item.titleEn}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr ? item.descAr : item.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2.6. SECTION: QR ELECTRONIC MENU & STATION ROUTING (بوابة المنيو الإلكتروني) */}
      <section id="qr-menu" className="py-20 px-4 sm:px-8 border-t border-slate-800/80 bg-gradient-to-br from-slate-950 via-[#071324] to-[#070b14] relative overflow-hidden">
        <div className="max-w-6xl mx-auto space-y-12 relative z-10">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">
              <QrCode className="w-3.5 h-3.5" />
              <span>{isAr ? 'المرحلة الخامسة: المنيو الإلكتروني السريع' : 'Phase 5: Digital QR Menu'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-snug">
              {isAr ? qrMenuMarketingSection.headlineAr : qrMenuMarketingSection.headlineEn}
            </h2>
            <p className="text-xs sm:text-base text-slate-300 leading-relaxed">
              {isAr ? qrMenuMarketingSection.subheadAr : qrMenuMarketingSection.subheadEn}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {qrMenuMarketingSection.features.map((feat, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all space-y-3 shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  {idx === 0 && <Smartphone className="w-5 h-5" />}
                  {idx === 1 && <Flame className="w-5 h-5" />}
                  {idx === 2 && <UtensilsCrossed className="w-5 h-5" />}
                  {idx === 3 && <Shield className="w-5 h-5" />}
                </div>
                <h3 className="text-sm font-bold text-white">
                  {isAr ? feat.titleAr : feat.titleEn}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr ? feat.descAr : feat.descEn}
                </p>
              </div>
            ))}
          </div>

          {/* Interactive Live Demo Bar for Customer QR Menu */}
          <div className="p-6 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-start">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {isAr ? 'عايز تشوف المنيو كأنك زبون في المطعم؟' : 'Experience it as a restaurant guest'}
                </h4>
                <p className="text-xs text-slate-400">
                  {isAr ? 'ادخل على المنيو الإلكتروني التجريبي فوراً وبدون أي تسجيل دخول.' : 'Open the live customer demo menu with zero login required.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end w-full sm:w-auto">
              <Button
                onClick={() => {
                  window.location.hash = '#/m/R.0001?t=12';
                }}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md"
              >
                <span>{isAr ? 'معاينة منيو طاولة #12' : 'Preview Table #12 Menu'}</span>
                <ArrowIcon className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => {
                  if (onExploreDemo) onExploreDemo('marketing_officer');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span>{isAr ? 'لوحة تحكم التسويق' : 'Marketing Dashboard'}</span>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION 2: THE PAIN (الوجع) */}
      <section className="py-16 px-4 sm:px-8 border-t border-slate-800/60 bg-slate-950/50">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              {isAr ? 'تحديات التشغيل اليومية' : 'The Real Struggle'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? 'لو ده بيحصل معاك، إنت مش لوحدك' : 'If this happens to you, you are not alone'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              {isAr
                ? 'أغلب أصحاب المطاعم بيخسروا مش بسبب قلة الزبائن، لكن بسبب تسريب الهدر غير المحسوب.'
                : 'Most restaurants lose money not from a lack of guests, but from unmeasured operational leakage.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {painCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 hover:border-rose-500/40 transition-colors space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {isAr ? card.titleAr : card.titleEn}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {isAr ? card.descAr : card.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. SECTION 3: THE 3-STEP SOLUTION (الحل في ٣ خطوات) */}
      <section id="how-it-works" className="py-16 px-4 sm:px-8 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              {isAr ? 'البساطة هي الأساس' : 'Simple by Design'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? 'الحل في ٣ خطوات سهلة ومباشرة' : 'The Solution in 3 Clear Steps'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
              {isAr
                ? 'مش محتاج شهور تدريب؛ تبدأ وتشوف أرقامك في نفس اليوم.'
                : 'No months of onboarding required; see your real numbers today.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {solutionSteps.map((step) => (
              <div
                key={step.stepNum}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3 relative"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg">
                  {step.stepNum}
                </div>
                <h3 className="text-sm font-bold text-white">
                  {isAr ? step.titleAr : step.titleEn}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isAr ? step.descAr : step.descEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SECTION 4: THE 8 OPERATIONAL MODULES (الوحدات الثمانية) */}
      <section className="py-16 px-4 sm:px-8 border-t border-slate-800/60 bg-slate-950/40">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              {isAr ? 'منظومة شاملة لكل ركن في نشاطك' : 'Comprehensive Sovereign Modules'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? 'هتقدر تعمل إيه مع وحدات TYGOS؟' : 'What You Can Accomplish with TYGOS'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              {isAr
                ? 'كل وحدة مصممة لتوفر عليك مجهود وتمنع تسريب الجنيه في مكانها المحدد.'
                : 'Each module is purposefully engineered to save time and stop specific leakage.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modulesList.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-100">
                      {isAr ? mod.titleAr : mod.titleEn}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {isAr ? mod.actionAr : mod.actionEn}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. SECTION 5: BEFORE & AFTER (قبل وبعد) */}
      <section className="py-16 px-4 sm:px-8 border-t border-slate-800/60">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              {isAr ? 'فارق التأثير الملموس' : 'Tangible Transformation'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? 'الفرق بين الإدارة بالتخمين وبين TYGOS' : 'Guesswork Management vs TYGOS'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? '* أرقام توضيحية للتبسيط، وتختلف نسب التوفير حسب نشاطك وسوقك.'
                : '* Illustrative metrics for simplification; actual figures vary by market conditions.'}
            </p>
          </div>

          <div className="space-y-3">
            {beforeAfterStats.map((stat, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-200">
                    {isAr ? stat.labelAr : stat.labelEn}
                  </h3>
                  <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5">
                    {isAr ? stat.gainAr : stat.gainEn}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs">
                    <span className="opacity-75 block text-[9px]">{isAr ? 'قبل:' : 'Before:'}</span>
                    <span className="font-bold">{stat.before}</span>
                  </div>

                  <ArrowIcon className="w-4 h-4 text-slate-500" />

                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                    <span className="opacity-75 block text-[9px]">{isAr ? 'مع تايجوس:' : 'With Tygos:'}</span>
                    <span className="font-black">{stat.after}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. SECTION 6: THREE REAL SCENARIOS (ثلاث حكايات) */}
      <section className="py-16 px-4 sm:px-8 border-t border-slate-800/60 bg-slate-950/40">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              {isAr ? 'تجارب من واقع السوق' : 'Realistic Scenarios'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? '٣ حكايات واقعية لكيف تحولت أرباحهم' : '3 Realistic Operational Turnarounds'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? '* سيناريوهات توضيحية مبنية على حالات واقعية في قطاع الضيافة.'
                : '* Illustrative case scenarios derived from hospitality field workflows.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {caseStories.map((story, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-xs font-black text-cyan-400 block pb-1 border-b border-slate-800">
                    {isAr ? story.typeAr : story.typeEn}
                  </span>
                  <div>
                    <span className="text-[10px] text-rose-400 font-bold block">{isAr ? 'المشكلة:' : 'Problem:'}</span>
                    <p className="text-xs text-slate-300">{isAr ? story.problemAr : story.problemEn}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-cyan-400 font-bold block">{isAr ? 'التحول:' : 'Shift:'}</span>
                    <p className="text-xs text-slate-300">{isAr ? story.transformationAr : story.transformationEn}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  {isAr ? story.resultAr : story.resultEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. SECTION 7: TRY IT YOURSELF (جرّب بنفسك) */}
      <section className="py-16 px-4 sm:px-8 border-t border-slate-800/60">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              {isAr ? 'استكشف التجربة بدون أي التزام' : 'Instant Role Demos'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? 'جرّب بنفسك: ادخل الآن بأي دور وظيفي' : 'Test Drive Any Operational Role'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              {isAr
                ? 'انقر على أي دور للدخول المباشر إلى المنظومة واستكشاف الشاشات.'
                : 'Click any role below to launch the live platform and inspect workflows.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {rolePortals.map((portal) => (
              <Button
                key={portal.role}
                type="button"
                onClick={() => onExploreDemo && onExploreDemo(portal.role)}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/60 text-start group transition-all cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-400">
                    {isAr ? portal.titleAr : portal.titleEn}
                  </span>
                  <ArrowIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400" />
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr ? portal.descAr : portal.descEn}
                </p>
              </Button>
            ))}

            {/* Quick Register Portal */}
            <Button
              type="button"
              onClick={onOpenRegister}
              className="p-4 rounded-xl bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-500/40 text-start hover:border-cyan-400 transition-all cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">
                  {isAr ? 'تسجيل منشأة جديدة بالكامل' : 'Provision New Venue'}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'ابدأ معالج تسجيل منشأتك ببياناتك الخاصة.' : 'Launch wizard with your own brand details.'}
              </p>
            </Button>
          </div>
        </div>
      </section>

      {/* 9. SECTION 8: FAQ (أسئلة شائعة) */}
      <section className="py-16 px-4 sm:px-8 border-t border-slate-800/60 bg-slate-950/40">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isAr ? 'إجابات مبسطة' : 'Clear Answers'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h2>
          </div>

          <div className="space-y-2.5">
            {faqList.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden transition-colors"
                >
                  <Button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    className="w-full p-4 text-start text-xs sm:text-sm font-bold text-slate-200 hover:text-white flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span>{isAr ? faq.qAr : faq.qEn}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
                  </Button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {isAr ? faq.aAr : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. SECTION 9: FINAL CALL TO ACTION (دعوة أخيرة) */}
      <section className="py-20 px-4 sm:px-8 border-t border-slate-800/80 bg-gradient-to-b from-slate-950 to-[#070b14] relative text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {isAr ? 'جاهز تقفل كل أبواب الهدر وتشوف أرباحك الحقيقية؟' : 'Ready to Stop Waste and Realize True Profits?'}
          </h2>
          <p className="text-sm text-slate-300">
            {isAr
              ? 'انضم لعشرات المطاعم والكافيهات التي تثق في TYGOS لتشغيل منشآتها بالقرش.'
              : 'Join hospitality managers who rely on TYGOS for surgical portion and food cost control.'}
          </p>
          <div className="pt-2">
            <Button
              type="button"
              onClick={onOpenRegister}
              className="px-8 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 shadow-xl shadow-cyan-950/60 cursor-pointer transition-all"
            >
              {isAr ? 'ابدأ تجربة المنظومة مجاناً' : 'Start Your Free Trial'}
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER WITH APPROVED EMBLEM & PRODUCTION APP LINK */}
      <footer className="py-8 px-4 sm:px-8 border-t border-slate-800 text-center text-xs text-slate-500 bg-[#060911]">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
            <PermanentAppBrandBadge variant="card" className="w-full md:w-auto" />
            <PermanentAppBrandBadge variant="footer" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">TYGOS</span>
              <span>· {isAr ? 'منظومة إدارة الضيافة الشاملة والذكاء التشغيلي (المرحلة الرابعة)' : 'Hospitality ERP & Food Cost Intelligence (Phase 4 Final)'}</span>
            </div>
            <div>
              <span>© 2026 TYGOS Systems. {isAr ? 'جميع الحقوق محفوظة' : 'All rights reserved.'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
