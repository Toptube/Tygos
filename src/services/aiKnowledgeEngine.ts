/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AiAssistantMessage, DetailedRecipe, HelpArticle } from '../domain/types.ts';
import { Establishment, User, UserRole } from '../types/index.ts';

// -------------------------------------------------------------
// EXTENDED COMPREHENSIVE BILINGUAL HELP ARTICLES (SOP Manual)
// -------------------------------------------------------------
export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'art-getting-started',
    slug: 'getting-started-overview',
    module: 'dashboard',
    category: 'architecture',
    titleAr: 'دليل البدء السريع وهيكلية المنظومة (Getting Started & Multi-Tenancy)',
    titleEn: 'Getting Started & Multi-Tenant Sovereign Architecture',
    summaryAr: 'نظرة شاملة حول مفهوم المنشأة السحابية المستقلة، كود الهوية، والأدوار التشغيلية.',
    summaryEn: 'Executive overview of multi-tenant partitioning, establishment codes, and RBAC roles.',
    contentAr: `منظومة Tygos هي منصة ERP وتشغيل ضيافة متطورة تعمل بنظام العزل متعدد المنشآت (Multi-Tenant Isolation).
تعتمد المنظومة رقم منشأة فريداً لكل منشأة يتكون من اختصار نوع النشاط (مثل R للمطعم وC للمقهى) ورقم تسلسلي مكون من 4 أرقام.
تترابط كافة العمليات من لحظة استلام المواد الخام في المستودع حتى صدور الفاتورة وقيد اليومية المحاسبي.`,
    contentEn: `Tygos is a sovereign hospitality ERP built on multi-tenant partition isolation.
Every establishment possesses an identity number comprising a business type abbreviation (e.g., R for Restaurant, C for Café) and a 4-digit serial.
All workflows flow seamlessly from warehouse goods receipt to POS invoice issuance and double-entry general ledger postings.`,
    stepsAr: [
      'سجل منشأتك الجديدة من معالج التسجيل أو ادخل بحساب المالك المعين.',
      'اختر نوع المنشأة وحدد العملة والتوقيت التشغيلي.',
      'ابدأ بتعريف الموردين والمكونات الخام ثم كوّن الوصفات المعيارية.',
      'افتح الوردية في نقطة البيع واستقبل طلبات الصالة والسفري.',
    ],
    stepsEn: [
      'Register your establishment through the onboarding wizard or login with owner credentials.',
      'Confirm business typology, operational currency, and time zone.',
      'Define suppliers and raw ingredients, then build standardized recipes.',
      'Open a register shift in POS to begin processing table and takeaway orders.',
    ],
    commonMistakesAr: [
      'عدم تحديد العملة الأساسية بدقة قبل تسجيل أول فاتورة شراء.',
      'تجاهل حفظ كود المنشأة لاستخدامه عند تسجيل الدخول من أجهزة الفروع.',
    ],
    commonMistakesEn: [
      'Failing to verify primary operating currency prior to initial purchase order posting.',
      'Not recording the establishment identity code for branch device authentication.',
    ],
    lastUpdated: '2026-11-03',
  },
  {
    id: 'art-semi-finished-preps',
    slug: 'semi-finished-preparations',
    module: 'semi_finished',
    category: 'semi_finished',
    titleAr: 'التجهيزات والتحضيرات الأساسية (عجين، صوصات، معالجة، وحصص)',
    titleEn: 'Semi-Finished Preparations, Cooking Factors & Named Portions',
    summaryAr: 'بناء وصفات التجهيزات الأساسية بنمط «على الصيغة» والتفكيك التلقائي للخامات وقت البيع أو تتبع الدفعات اختيارياً.',
    summaryEn: 'Configure base sauces, doughs, cooking yields, and portions with automatic raw material decomposition on sale.',
    contentAr: `تربط التجهيزات بين الخامات الأولية والمنتجات النهائية:
1. تجهيز مركب أو معالجة بعامل طبخ (مثل 50 جم أرز نيء ← 100 جم أرز مطهو).
2. تقسيم التجهيز إلى حصص مسماة (كرة بيتزا وسط 170 جم، مغرفة صوص 80 جم).
3. العمل افتراضياً «على الصيغة» دون رصيد مخزني، أو تفعيل تتبع الدفعات الاختياري مع ترحيل المتبقي وقت الجرد الفعلي.`,
    contentEn: `Preparations bridge raw ingredients and final dishes using compound formulas, cooking factors (50g raw -> 100g cooked), named portions, and formula or optional batch tracking.`,
    stepsAr: [
      'افتح شاشة «التجهيزات» وحدد نوع التجهيز ومكوناته من الخامات.',
      'أنشئ الحصص المسماة لتظهر جاهزة داخل وصفات المنتجات.',
      'استخدم «إدخال التجهيزات المتبقية» في شاشة الجرد عند وجود كميات محضرة آخر اليوم.',
    ],
    stepsEn: [
      'Open Preparations and define compound or cooking-factor ingredients.',
      'Add named portions for one-click reuse in dish recipes.',
      'Record unconsumed leftovers in Physical Audit under Remaining Preparations.',
    ],
    commonMistakesAr: [
      'البحث عن تجهيز داخل فاتورة شراء — التجهيزات محجوبة عن المشتريات وتُحضّر داخلياً فقط.',
    ],
    commonMistakesEn: [
      'Trying to purchase semi-finished preps directly from suppliers.',
    ],
    lastUpdated: '2026-11-15',
  },
  {
    id: 'art-recipe-costing',
    slug: 'recipe-true-costing',
    module: 'menu',
    category: 'recipes',
    titleAr: 'دليل حساب التكلفة الحقيقية للمنتج',
    titleEn: 'Comprehensive True Product Costing Guide',
    summaryAr: 'كيف تحسب منظومة TYGOS تكلفة الطبق من أصغر مدخل تشغيلي (بما في ذلك الخامات بدون رصيد مثل الماء والملح) حتى صافي الربحية بالجنيه.',
    summaryEn: 'How TYGOS calculates plate cost from smallest operational input including cost-only utilities to net profit in EGP.',
    contentAr: `تعتمد TYGOS صيغة التكلفة الشاملة التي تتجاوز سعر شراء المكونات فقط:
1. تكلفة المواد الخام الصافية مخصوماً منها نسبة الفاقد والهالك والتجهيزات المفككة.
2. تكلفة مواد التعبئة والتغليف (علب، أكياس، ورق طعام).
3. تكلفة العمالة المباشرة (دقائق التحضير الفعلي مضروبة في أجر الدقيقة).
4. حصة المصاريف المباشرة وغير المباشرة الموزعة على مرحلتين.
5. المواد الاستهلاكية وأدوات النظافة والتعقيم.`,
    contentEn: `TYGOS uses an all-inclusive cost formula combining net raw/prep costs after trim waste, packaging consumables, direct prep labor, and two-stage indirect overhead allocation.`,
    stepsAr: [
      'افتح شاشة "الوصفات (رسبي)" واختر الصنف المطلوب.',
      'راجع جدول المكونات وتأكد من تحديد نسبة الفاقد لكل مكون خام بدقة.',
      'حدد وقت التحضير المباشر بالدقائق ليقوم النظام باحتساب تكلفة العمالة تلقائياً.',
      'اطلع على تبويب "السعر والربح" لمقارنة هامش الربح بالسعر المستهدف بالجنيه.',
    ],
    stepsEn: [
      'Navigate to Recipes and select the target item.',
      'Review ingredient table and confirm scrap/waste trim percentages.',
      'Enter active prep minutes for automated labor cost absorption.',
      'Inspect the Price & Profit tab to compare margin against target benchmark in EGP.',
    ],
    commonMistakesAr: [
      'إهمال نسبة الفاقد في تنظيف اللحوم والخضار مما يؤدي لتسعير منخفض غير حقيقي.',
      'تجاهل تكلفة التغليف للطلبات الخارجية والسفري.',
    ],
    commonMistakesEn: [
      'Omitting butchery trim loss which results in understated menu portion cost.',
      'Ignoring packaging costs on takeaway and delivery orders.',
    ],
    lastUpdated: '2026-11-15',
  },
  {
    id: 'art-warehouses-requisitions',
    slug: 'warehouses-item-card-requisitions',
    module: 'warehouses',
    category: 'warehouses',
    titleAr: 'المخازن وكارت الصنف ودورة الطلبيات والتحويلات',
    titleEn: 'Warehouses, Item Card Ledger & Requisition Lifecycle',
    summaryAr: 'متابعة أرصدة الفروع ومخازن الأقسام بالوحدات المركبة، ودورة الطلبيات بمرحلة «في الطريق» والرفض المسبب.',
    summaryEn: 'Multi-branch section stores, compound multi-unit stock, item movement ledgers, and 4-stage requisitions.',
    contentAr: `تدير شاشة «المخازن» فروع المنشأة والمخزن الرئيسي والمطبخ المركزي ومخازن الأقسام (مطبخ، بار، مخبز).
تتم التغذية الداخلية بدورة محكمة: طلب الشيف ← صرف أمين المخزن لذمة «في الطريق» ← استلام الشيف أو الرفض المسبب وعودة المرفوض للرئيسي تلقائياً.`,
    contentEn: `Warehouses segregates Main, Central Kitchen, and Section Stores using a 4-stage audited requisition cycle with In-Transit accountability and automatic rejection return.`,
    stepsAr: [
      'أنشئ طلبية من مخزن القسم أو المطبخ المركزي وحدد الكميات المطلوبة.',
      'يصرف أمين المخزن الكمية المعتمدة فتتحول لحالة «في الطريق».',
      'يراجع الشيف المستلم ويسجل سبب أي بند مرفوض ثم يطبع الإذن بالتوقيعات الثلاثية.',
    ],
    stepsEn: [
      'Create requisition from section store or central kitchen.',
      'Storekeeper dispatches approved quantity into In-Transit status.',
      'Chef confirms receipt or enters mandatory rejection reason before 3-signature voucher print.',
    ],
    commonMistakesAr: [
      'عدم تسجيل سبب الرفض عند نقص الوزن أو تلف البضاعة المستلمة.',
    ],
    commonMistakesEn: [
      'Accepting damaged dispatch without recording line-item rejection reasons.',
    ],
    lastUpdated: '2026-11-15',
  },
  {
    id: 'art-variance-cost-control',
    slug: 'variance-analysis-cost-control',
    module: 'inventory_audit',
    category: 'inventory_audit',
    titleAr: 'الجرد الفعلي والملاحظات اليومية وكشف الانحراف',
    titleEn: 'Physical Stocktake, Daily Notes & Variance Analysis',
    summaryAr: 'إجراء الجرد الاختباري والإغلاق الفعلي مع استبعاد «في الطريق»، وتفصيل حركات اليوم، وفتح كارت الصنف من الملاحظات اليومية.',
    summaryEn: 'Draft and final audits excluding In-Transit stock, daily movement drilldown, deficit costing in EGP, and linked field notes.',
    contentAr: `تحسب شاشة «الجرد الفعلي» الرصيد التقديري بدقة وتستبعد بضاعة «في الطريق» مع إتاحة ترتيب الرفوف وإدخال التجهيزات المتبقية.
وكل ملاحظة في «الملاحظات اليومية» ترتبط بالفرع والمخزن والخامة مع فتح فوري لكارت الصنف وتنويه الطباعة الإلزامي للمشكلات غير المحلولة.`,
    contentEn: `Physical Audit reconciles theoretical vs physical counts excluding In-Transit stock, supports shelf reordering and leftover preps, and connects directly with Daily Notes.`,
    stepsAr: [
      'افتح شاشة «الجرد الفعلي» واختر الفرع والمخزن وابدأ بجرد اختباري للمعاينة.',
      'اضغط على أي خامة لاستعراض نافذة «تفاصيل اليوم» ومراجعة الانحراف بالجنيه.',
      'عند التأكد، نفّذ «إغلاق فعلي للفترة» لتوليد تسويات الجرد وقفل مصاريف الشهر.',
    ],
    stepsEn: [
      'Select branch & warehouse inside Physical Audit and run a Draft preview.',
      'Click any material to inspect its Daily Breakdown modal.',
      'Run Official Period Close to post adjustments and lock monthly overhead.',
    ],
    commonMistakesAr: [
      'إجراء إغلاق فعلي قبل التأكد من استلام أو رفض الطلبيات التي «في الطريق».',
    ],
    commonMistakesEn: [
      'Closing an audit period without reviewing open In-Transit requisitions.',
    ],
    lastUpdated: '2026-11-15',
  },
  {
    id: 'art-inventory-management',
    slug: 'warehouse-inventory-stocktakes',
    module: 'inventory',
    category: 'inventory',
    titleAr: 'إدارة الخامات والوحدات المتعددة وتنبيه تعديل الأسعار',
    titleEn: 'Raw Materials, Multi-Units & Price Change Impact',
    summaryAr: 'تسجيل الخامات بالوحدات المركبة أو كخامة بلا رصيد مخزني مثل الماء والملح، ومعاينة أثر تغير الأسعار على الأطباق.',
    summaryEn: 'Manage raw materials, 3-tier unit conversions, non-stock cost-only utilities, and pre-save recipe impact checks.',
    contentAr: `تتيح شاشة «الخامات والمخزون» إضافة خامات في دقيقة مع سلاسل التعبئة ثلاثية المستويات ومعاينة تأثير تعديل أي سعر شراء على كافة التجهيزات والأطباق المرتبطة قبل الحفظ.`,
    contentEn: `Raw Materials manages packaging tiers, weighted average costing, untracked cost-only utilities, and real-time recipe cost propagation alerts.`,
    stepsAr: [
      'أضف الخامة وحدد سلسلة التعبئة والهالك أو فعّل «خامة بلا رصيد مخزني» للماء والملح.',
      'عند تعديل سعر الشراء، اضغط على «شوف الأثر» لمراجعة الأطباق المتأثرة.',
    ],
    stepsEn: [
      'Add raw material packaging tiers and waste % or mark cost-only untracked.',
      'Click Impact Preview whenever updating purchase price.',
    ],
    commonMistakesAr: [
      'تجاهل نسبة الهالك أو نسيان تفعيل «خامة بلا رصيد مخزني» للمياه والملح السائب.',
    ],
    commonMistakesEn: [
      'Tracking tap water as physical weight causing spurious stockout warnings.',
    ],
    lastUpdated: '2026-11-15',
  },
  {
    id: 'art-pos-operations',
    slug: 'pos-table-management',
    module: 'pos',
    category: 'pos',
    titleAr: 'تشغيل نقطة البيع وإدارة الطاولات (Point of Sale & Orders)',
    titleEn: 'Point of Sale (POS), Fast Register & Floor Management',
    summaryAr: 'إدارة طلبات الصالة، التيك أواي، تقسيم الحسابات، وإغلاق الوردية المالية.',
    summaryEn: 'High-speed touch order entry, table billing, split payments, and shift reconciliation.',
    contentAr: `صُممت نقطة بيع Tygos للعمل بسرعة فائقة ولدعم وضعي الأونلاين والأوفلاين التام.
تشمل الإمكانيات:
• خريطة طاولات حية بحالات الإشغال والانتظار والفوترة.
• تصنيف ديناميكي للمنتجات مع إمكانية تعديل الإضافات والملاحظات للمطبخ (KDS).
• دعم طرق الدفع المتعددة: نقداً، بطاقة بنكية، محافظ إلكترونية، أو آجل لعملاء الشركات.
• الخصم التلقائي للمخزون فور اعتماد الطلب أو إغلاق الفاتورة.`,
    contentEn: `Tygos POS is engineered for ultra-responsive touch workflows with full offline-first durability.
Core capabilities:
• Visual table plan reflecting real-time occupancy, order stage, and payment status.
• Fast product matrix with kitchen modifier notes.
• Split and multi-tender settlement: Cash, Card, Mobile Wallet, Corporate Account.
• Immediate recipe ingredient depletion and accounting accruals upon invoice settlement.`,
    stepsAr: [
      'اختر الطاولة من خريطة الصالة أو اختر وضع الطلب الخارجي/السفري.',
      'أضف الأصناف المطلوبة وحدد التعديلات الخاصة بالزبون.',
      'أرسل الطلب للتحضير (KDS) أو توجه للدفع مباشرة.',
      'اختر وسيلة الدفع واطبع إيصال الفاتورة المعتمدة ضريبياً.',
    ],
    stepsEn: [
      'Select table from floor plan or switch to Takeaway / Delivery mode.',
      'Tap menu items and apply customer modifications.',
      'Fire order to kitchen display/printers or proceed to immediate checkout.',
      'Select payment method and issue compliant e-receipt.',
    ],
    commonMistakesAr: [
      'إغلاق الوردية دون مطابقة النقدية الفعلية مع تقرير Z-Report.',
      'إلغاء أطباق بعد تحضيرها دون تسجيلها في تقرير الهالك الإداري.',
    ],
    commonMistakesEn: [
      'Closing shift register without physical cash drawer reconciliation.',
      'Voiding prepared plates without logging administrative waste reasons.',
    ],
    lastUpdated: '2026-11-03',
  },
  {
    id: 'art-finance-accounting',
    slug: 'finance-double-entry-tax',
    module: 'finance',
    category: 'finance',
    titleAr: 'المالية والحسابات العامة والضرائب (Finance, General Ledger & Tax)',
    titleEn: 'Finance, Automated Double-Entry Ledger & Tax Compliance',
    summaryAr: 'شجرة الحسابات، قيود اليومية التلقائية، وربط الفواتير بأنظمة الزكاة والضرائب.',
    summaryEn: 'Chart of accounts, real-time double-entry journal vouchers, and VAT/ZATCA compliance.',
    contentAr: `تعتمد Tygos معيار القيد المزدوج التلقائي الكامل:
كل عملية بيع تولد قيداً آلياً:
- مدين: النقدية أو البنك أو العملاء.
- دائن: إيرادات المبيعات.
- دائن: ضريبة القيمة المضافة المستحقة.
- مدين: تكلفة البضاعة المباعة (COGS).
- دائن: مخزون المواد الخام المستهلكة.
يتيح هذا استخراج قائمة الدخل (P&L) وميزان المراجعة لحظياً دون الحاجة لإدخال يدوي.`,
    contentEn: `Tygos runs an automated double-entry general ledger engine.
Every sale instantaneously posts balanced journals:
- Debit: Cash / Bank / Accounts Receivable
- Credit: Sales Revenue
- Credit: Output VAT Payable
- Debit: Cost of Goods Sold (COGS)
- Credit: Raw Material Inventory Asset
Enables real-time P&L generation and trial balances with zero manual bookkeeping.`,
    stepsAr: [
      'افتح شاشة "المالية والحسابات" لاستعراض قائمة الدخل والسيولة النقدية.',
      'راجع قيود اليومية الآلية المولدة عن المبيعات والمشتريات.',
      'انتقل إلى قسم "الضرائب والفواتير" لتدقيق الإقرار الضريبي وحالة الربط الإلكتروني.',
    ],
    stepsEn: [
      'Open Finance & Accounting to inspect live P&L and cash liquidity.',
      'Audit automated journal vouchers tied back to operational sources.',
      'Check Tax & E-Invoicing module for VAT returns and electronic clearance.',
    ],
    commonMistakesAr: [
      'تسجيل مصاريف عامة دون تحديد مركز التكلفة المناسب.',
      'تعديل فواتير ضريبية مغلقة دون إصدار إشعار دائن/مدين معتمد.',
    ],
    commonMistakesEn: [
      'Posting general overhead without tagging correct cost centers.',
      'Altering settled tax invoices without issuing formal credit/debit notes.',
    ],
    lastUpdated: '2026-11-03',
  },
  {
    id: 'art-overhead-allocation',
    slug: 'overhead-allocation-full-cost',
    module: 'finance',
    category: 'cost_control',
    titleAr: 'المصاريف وتوزيعها وحساب التكلفة الكاملة للمنتج',
    titleEn: 'Two-Stage Overhead Allocation & Full Product Costing',
    summaryAr: 'كيفية تحميل المصاريف المباشرة وغير المباشرة على مرحلتين وحساب معدل التحميل وفروق التحميل وصافي ربح كل طبق.',
    summaryEn: 'How direct & indirect expenses flow through Stage 1 (Shared) and Stage 2 (Products) to reveal full product profit.',
    contentAr: `تحسب منظومة Tygos التكلفة الكاملة للمنتج عبر مرحلتين محكمتين:
• المرحلة ١ (مشترك ← مراكز التكلفة): توزيع مصاريف الإدارة والصالة (مثل الإيجار) على المطبخ والبار والمخبز والحلواني حسب المساحة أو عدد العاملين أو النسبة اليدوية أو بالتساوي.
• المرحلة ٢ (مركز التكلفة ← المنتجات): توزيع مصاريف كل قسم على منتجاته بالتساوي لكل حصة مباعة، أو كمية المبيعات، أو قيمة المبيعات، أو تكلفة الخامات، أو زمن التحضير بالدقائق، أو نسبة يدوية.
• معادلة التكلفة الكاملة = خامات + تجهيزات + عمالة مباشرة + مصاريف غير مباشرة + مستهلكات.`,
    contentEn: `Tygos calculates Full Product Cost across two stages: Stage 1 splits shared expenses across operating cost centers, and Stage 2 allocates each center's pool across its products using unit, sales, raw cost, prep minutes, or manual percents.`,
    stepsAr: [
      'افتح شاشة «المصاريف وتوزيعها» من قائمة المالية والرواتب.',
      'استورد الرواتب من الموارد البشرية والمصاريف من المالية دون تكرار أو انسخ الشهر السابق.',
      'اختر وضع التحميل المناسب للمنشأة (خامات فقط / خامات + نسبة ثابتة / التوزيع بالقواعد).',
      'راجع تبويب ربحية الأقسام والمنتجات لاكتشاف أي صنف «خاسر بعد التحميل» وفروق التحميل نهاية الفترة.',
    ],
    stepsEn: [
      'Open Overhead Allocation under Finance & HR.',
      'Import HR payroll & Finance expenses without double-counting, or copy previous month.',
      'Select establishment overhead mode.',
      'Inspect department burden rates, absorption variances, and loss-making items after overhead.',
    ],
    commonMistakesAr: [
      'استيراد تكلفة الخامات المشتراة كمصروف تشغيلي مما يسبب احتسابها مرتين.',
      'ترك الشهر مفتوحاً بعد الإغلاق الرسمي للجرد — المنظومة تقفله تلقائياً.',
    ],
    commonMistakesEn: [
      'Importing raw COGS purchases as overhead expenses causing double-counting.',
      'Editing closed period expenses after official inventory close.',
    ],
    lastUpdated: '2026-11-14',
  },
  {
    id: 'art-privileged-security',
    slug: 'privileged-access-security',
    module: 'security',
    category: 'security',
    titleAr: 'الأمان والتصاريح المؤقتة (Zero Password Sharing Protocol)',
    titleEn: 'Security Policy & Temporary Privileged Access (No Password Sharing)',
    summaryAr: 'البروتوكول الأمني المعتمد لطلب تصريح مؤقت ومحدد المدة للوصول للسجلات المحمية.',
    summaryEn: 'Authorized protocol for requesting timed, audited privilege escalation without sharing passwords.',
    contentAr: `تمنع منظومة Tygos مشاركة كلمات المرور أو طلب كلمة مرور مدير آخر نهائياً.
بدلاً من ذلك:
1. يقدم الموظف طلب تصريح أمني عبر النظام مبيناً السبب والمدة المطلوبة بالدقائق.
2. يتلقى المدير المسؤول أو المشرف إشعاراً فورياً للقبول أو الرفض مع سبب معلل.
3. عند الموافقة، يولد النظام جلسة مؤقتة محددة بوقت وجهاز ومسجلة في سجل التدقيق المشفر.`,
    contentEn: `Tygos strictly forbids credential sharing or requesting manager passwords.
Instead:
1. The user generates a timed privilege request with explicit business justification.
2. The designated administrator receives real-time notification to approve or reject with reason.
3. Upon approval, a temporary cryptographic session token is issued and logged in the immutable audit trail.`,
    stepsAr: [
      'عند محاولة الوصول لشاشة أو بيان محمي، انقر على زر "طلب تصريح وصول مؤقت".',
      'حدد المورد المطلوب واكتب سبب الطلب والمدة بالدقائق (مثلاً 15 دقيقة).',
      'يقوم المدير المعتمد بمراجعة الطلب والموافقة عليه من مركز التحكم.',
    ],
    stepsEn: [
      'Upon accessing a protected resource, click "Request Privileged Access".',
      'Select resource, enter clear justification and duration in minutes.',
      'Authorized administrator approves via real-time security cockpit.',
    ],
    commonMistakesAr: [
      'مشاركة بيانات تسجيل الدخول بين الموظفين يعرض المنشأة لمخاطر أمنية ويلغي الضمان.',
      'طلب صلاحيات دائمة لأعمال مؤقتة.',
    ],
    commonMistakesEn: [
      'Sharing login credentials creates severe compliance breaches and audit failures.',
      'Requesting permanent role changes for short one-time tasks.',
    ],
    lastUpdated: '2026-11-03',
  },
  {
    id: 'art-qr-menu-setup',
    slug: 'qr-menu-setup',
    module: 'menu_management',
    category: 'qr_menu',
    titleAr: 'إعداد المنيو الإلكتروني، الأوصاف التسويقية، والوسوم',
    titleEn: 'Digital QR Menu Setup, Marketing Copy & Item Badges',
    summaryAr: 'كيفية تجهيز المنيو العام للعملاء باللغتين العربية والإنجليزية مع الصور والوسوم ومسببات الحساسية.',
    summaryEn: 'How to configure the public customer QR menu in Arabic & English with photos, badges, and allergens.',
    contentAr: `تتيح شاشة إدارة المنيو الإلكتروني تخصيص تجربة العرض للعملاء دون المساس ببيانات التكلفة الداخلية:
1. إدخال الوصف التسويقي والمكونات المعروضة وطريقة التحضير باللغتين العربية والإنجليزية (مع عرض النص الأصلي تلقائياً عند غياب الترجمة).
2. تفعيل وسوم الصنف (حار، نباتي، جديد، الأكثر طلباً) ومسببات الحساسية.
3. تعيين محطة التحضير المسؤولة عن كل صنف (مطبخ، مشويات، بار، حلويات).`,
    contentEn: `The Digital Menu Management screen customizes customer presentation while keeping internal costs isolated:
1. Enter bilingual (Arabic/English) marketing descriptions, displayed ingredients, and prep methods (automatically falling back to original text if a translation is missing).
2. Enable item badges (Spicy, Vegan, New, Bestseller) and allergen tags.
3. Assign the target prep station for each item (Kitchen, Grill, Bar, Pastry).`,
    stepsAr: [
      'افتح شاشة "إدارة المنيو الإلكتروني" من القائمة الجانبية.',
      'اختر الصنف وأضف الصور والوصف التسويقي والمكونات وطريقة التحضير بالعربية والإنجليزية.',
      'حدد الوسوم المناسبة (حار، نباتي، جديد، الأكثر طلباً) ومحطة التحضير.',
      'احفظ التعديلات وعاين المنيو العام مباشرة.',
    ],
    stepsEn: [
      'Open "Digital Menu Management" from the sidebar.',
      'Select an item and add photos, marketing description, ingredients, and prep method in Arabic & English.',
      'Select item badges (Spicy, Vegan, New, Bestseller) and prep station.',
      'Save changes and preview the public menu.',
    ],
    commonMistakesAr: [
      'ترك حقل محطة التحضير غير محدد مما يؤخر توجيه التذكرة.',
      'إهمال تحديد مسببات الحساسية للأصناف التي تحتوي على مكسرات أو ألبان.',
    ],
    commonMistakesEn: [
      'Leaving prep station unassigned.',
      'Omitting allergen tags on dishes containing nuts or dairy.',
    ],
    lastUpdated: '2026-11-05',
  },
  {
    id: 'art-qr-table-printing',
    slug: 'qr-table-printing',
    module: 'qr_tables',
    category: 'qr_menu',
    titleAr: 'إعداد عدد الطاولات وطباعة ملصقات QR دفعة واحدة',
    titleEn: 'Configuring Table Count & Batch Printing Table QR Stickers',
    summaryAr: 'ضبط عدد طاولات الصالة وتوليد وطباعة ملصقات QR تحمل رقم كل طاولة دفعة واحدة.',
    summaryEn: 'Configure dining room table count and batch-print QR stickers with each table number.',
    contentAr: `تمكّنك شاشة طاولات وملصقات QR من توليد رموز استجابة سريعة (QR) مخصصة لكل طاولة:
• تحديد إجمالي عدد الطاولات في المنشأة وحفظه في الإعدادات.
• طباعة جميع ملصقات الطاولات دفعة واحدة بتنسيق A4 أو حراري مع إظهار رقم الطاولة بوضوح على كل ملصق.
• اختبار رابط الطلب الخارجي والتوصيل والاستلام.`,
    contentEn: `The QR Tables & Stickers screen generates table-specific QR codes:
• Configure and save total table count in establishment settings.
• Batch-print all table stickers at once (A4 or thermal) with the table number clearly printed on each sticker.
• Test takeaway and delivery public menu links.`,
    stepsAr: [
      'افتح شاشة "طاولات وملصقات QR".',
      'أدخل عدد الطاولات الفعلي في الصالة واضغط حفظ.',
      'اضغط على "طباعة جميع ملصقات الطاولات" لطباعتها دفعة واحدة.',
    ],
    stepsEn: [
      'Open "QR Tables & Stickers".',
      'Enter the establishment table count and save.',
      'Click "Print All Table Stickers" to batch-print.',
    ],
    commonMistakesAr: [
      'وضع ملصق طاولة في غير مكانه مما يؤدي لوصول الطلب لطاولة خاطئة.',
    ],
    commonMistakesEn: [
      'Placing a printed table sticker on the wrong physical table.',
    ],
    lastUpdated: '2026-11-05',
  },
  {
    id: 'art-receiving-qr-orders',
    slug: 'receiving-qr-orders',
    module: 'pos',
    category: 'pos',
    titleAr: 'استقبال طلبات المنيو الإلكتروني ومتابعة تأخر المحطات',
    titleEn: 'Receiving QR Orders in Cashier & Station Lag Alerts',
    summaryAr: 'كيفية اعتماد طلبات QR الواردة للكاشير، متابعة حالة كل محطة، والتعامل مع تنبيهات تأخر المحطات.',
    summaryEn: 'How to approve incoming QR orders in POS, monitor per-station progress, and handle station lag alerts.',
    contentAr: `عند إرسال العميل لطلب من المنيو الإلكتروني:
1. يظهر إشعار فوري مع تنبيه صوتي في شاشة الكاشير.
2. يراجع الكاشير تفاصيل الطلب (صالة، تيك أواي، توصيل) ويضغط "اعتماد وإرسال للمحطات".
3. تعرض تذكرة الكاشير حالة كل محطة (قيد التحضير / جاهز) وتصدر تنبيهاً فورياً عند جاهزية محطة وتأخر محطة أخرى.`,
    contentEn: `When a customer submits a QR Menu order:
1. An instant toast notification with sound chime alerts the cashier.
2. The cashier reviews order details (Dine-in, Takeaway, Delivery) and clicks "Approve & Send to Stations".
3. The cashier ticket displays each station's live status (Preparing / Ready) and alerts when one station lags behind another.`,
    stepsAr: [
      'اضغط على زر "طلبات QR الواردة" في شاشة نقطة البيع.',
      'راجع الأصناف والملاحظات ثم اعتمد الطلب لتوزيعه على المحطات.',
      'تابع تبويب "متابعة المحطات الحية" لرصد أي محطة متأخرة.',
    ],
    stepsEn: [
      'Click "Incoming QR Orders" in the POS screen.',
      'Review items and notes, then approve to route tickets to stations.',
      'Monitor the "Live Station Status" tab to spot any lagging station.',
    ],
    commonMistakesAr: [
      'تأخير اعتماد الطلبات الواردة في أوقات الذروة.',
    ],
    commonMistakesEn: [
      'Delaying approval of incoming QR orders during peak hours.',
    ],
    lastUpdated: '2026-11-05',
  },
  {
    id: 'art-kitchen-stations-kds',
    slug: 'kitchen-stations-kds',
    module: 'kds',
    category: 'kds',
    titleAr: 'إدارة محطات التحضير وشاشات المطبخ (KDS)',
    titleEn: 'Managing Kitchen Display Stations (KDS) & Ticket Workflow',
    summaryAr: 'تشغيل شاشات المحطات (المطبخ، المشويات، البار، الحلويات) وتحديث حالة التذاكر لحظياً.',
    summaryEn: 'Operating station displays (Kitchen, Grill, Bar, Pastry) and updating ticket statuses in real time.',
    contentAr: `تقوم منظومة Tygos بتقسيم كل طلب معتمد إلى تذاكر مستقلة لكل محطة تحضير:
• ترى كل محطة الأصناف الخاصة بها فقط مع الكميات وملاحظات العميل ورقم الطاولة.
• يتم حجب بيانات العميل الحساسة (الهاتف والعنوان) عن تذاكر التحضير.
• عند إتمام جميع المحطات لتذاكرها، تتحول حالة الطلب تلقائياً إلى "جاهز" لدى الكاشير والعميل.`,
    contentEn: `Tygos splits every approved order into dedicated tickets per prep station:
• Each station sees only its assigned items, quantities, prep notes, and table number.
• Sensitive customer PII (phone and delivery address) is stripped from prep tickets.
• Once all stations mark their tickets ready, the order automatically becomes "Ready" for both cashier and customer.`,
    stepsAr: [
      'افتح شاشة "محطات التحضير (KDS)" واختر المحطة المطلوبة.',
      'اضغط "بدء التحضير" عند استلام التذكرة.',
      'اضغط "جاهز للتقديم" فور الانتهاء من تجهيز الأصناف.',
    ],
    stepsEn: [
      'Open "Kitchen Stations (KDS)" and select your station.',
      'Click "Start Preparing" when beginning the ticket.',
      'Click "Mark Ready" once items are plated.',
    ],
    commonMistakesAr: [
      'نسيان تحديث حالة التذكرة إلى "جاهز" مما يبقي الطلب قيد التحضير لدى الكاشير.',
    ],
    commonMistakesEn: [
      'Forgetting to mark a ticket Ready, keeping the order in Preparing state.',
    ],
    lastUpdated: '2026-11-05',
  },
];

// -------------------------------------------------------------
// CENTRAL APPLICATION INTENT & KNOWLEDGE REGISTRY
// -------------------------------------------------------------
export interface AppIntentDefinition {
  id: string;
  category: 'navigation' | 'entity_lookup' | 'cost_calculation' | 'variance_analysis' | 'action';
  keywordsAr: string[];
  keywordsEn: string[];
  misspellings: string[];
  targetView?: string;
  requiredRoles: UserRole[];
  descriptionAr: string;
  descriptionEn: string;
  defaultActionsAr: { label: string; action: string }[];
  defaultActionsEn: { label: string; action: string }[];
}

export const APP_INTENTS: AppIntentDefinition[] = [
  {
    id: 'intent-inventory',
    category: 'navigation',
    keywordsAr: ['مخزون', 'مستودع', 'مستودعات', 'انفنتوري', 'بضاعة', 'جرد', 'رصيد مخزون', 'استلام بضاعة', 'صرف خامات'],
    keywordsEn: ['inventory', 'warehouse', 'warehouses', 'stock', 'stocktake', 'par levels', 'ingredients stock', 'goods receipt'],
    misspellings: ['مخزن', 'مخازن', 'انفتوري', 'انفنتري', 'invntory', 'warehous', 'stok'],
    targetView: 'inventory',
    requiredRoles: ['tenant_admin', 'general_manager', 'store_manager', 'cost_accountant', 'kitchen_manager', 'super_admin'],
    descriptionAr: 'شاشة المستودعات المركزية لمتابعة أرصدة المواد الخام وحركات الاستلام والصرف وجرد المخازن.',
    descriptionEn: 'Central inventory control for tracking stock balances, Goods Receipts, requisitions, and cycle counts.',
    defaultActionsAr: [
      { label: 'فتح إدارة المستودعات', action: 'NAV:inventory' },
      { label: 'تسجيل حركة مخزون', action: 'NAV:inventory' },
      { label: 'دليل تشغيل المخازن', action: 'ARTICLE:warehouse-inventory-stocktakes' },
    ],
    defaultActionsEn: [
      { label: 'Open Warehouses', action: 'NAV:inventory' },
      { label: 'Record Stock Transfer', action: 'NAV:inventory' },
      { label: 'Warehousing SOP Guide', action: 'ARTICLE:warehouse-inventory-stocktakes' },
    ],
  },
  {
    id: 'intent-pos',
    category: 'navigation',
    keywordsAr: ['كاشير', 'نقطة بيع', 'بوز', 'طاولات', 'طلب', 'طلبات', 'فاتورة صالة', 'تيك اواي', 'حساب طاولة', 'سفري'],
    keywordsEn: ['pos', 'point of sale', 'cashier', 'table', 'tables', 'orders', 'register', 'takeaway', 'billing'],
    misspellings: ['بوس', 'كشير', 'طاولة', 'طاولت', 'poos', 'cashiere', 'tabel'],
    targetView: 'pos',
    requiredRoles: ['cashier', 'waiter', 'general_manager', 'tenant_admin', 'super_admin'],
    descriptionAr: 'نقطة البيع السريعة وإدارة خريطة طاولات الصالة وطلبات التيك أواي مع دعم العمل دون إنترنت.',
    descriptionEn: 'High-speed touch POS terminal and live floor management with offline durability.',
    defaultActionsAr: [
      { label: 'فتح شاشة نقطة البيع (POS)', action: 'NAV:pos' },
      { label: 'عرض خريطة الطاولات', action: 'NAV:pos' },
      { label: 'دليل تشغيل الكاشير', action: 'ARTICLE:pos-table-management' },
    ],
    defaultActionsEn: [
      { label: 'Launch POS Terminal', action: 'NAV:pos' },
      { label: 'View Floor Plan', action: 'NAV:pos' },
      { label: 'POS Operations Guide', action: 'ARTICLE:pos-table-management' },
    ],
  },
  {
    id: 'intent-recipes',
    category: 'navigation',
    keywordsAr: ['وصفة', 'وصفات', 'منيو', 'قائمة طعام', 'اطباق', 'مكونات', 'ريسبي', 'بوم', 'جدول مكونات', 'تحضير'],
    keywordsEn: ['recipe', 'recipes', 'menu', 'bom', 'bill of materials', 'ingredients', 'portion', 'sub-recipe', 'dishes'],
    misspellings: ['رسبي', 'ريسيبي', 'قائمه', 'recpie', 'menue'],
    targetView: 'menu',
    requiredRoles: ['tenant_admin', 'general_manager', 'kitchen_manager', 'bar_manager', 'cost_accountant', 'super_admin'],
    descriptionAr: 'محرك هندسة الوصفات وقائمة الطعام مع إدارة إصدارات الوصفات غير القابلة للتعديل وتفكيك التكلفة الحقيقية.',
    descriptionEn: 'Recipe Engineering, ingredient breakdown, immutable versioning, and portion yield tracking.',
    defaultActionsAr: [
      { label: 'فتح قائمة الطعام والوصفات', action: 'NAV:menu' },
      { label: 'عرض بطاقة التكلفة الحقيقية', action: 'NAV:menu' },
      { label: 'دليل حساب تكلفة الوصفات', action: 'ARTICLE:recipe-true-costing' },
    ],
    defaultActionsEn: [
      { label: 'Open Recipe Engineering', action: 'NAV:menu' },
      { label: 'View True Cost Breakdown', action: 'NAV:menu' },
      { label: 'Recipe Costing Guide', action: 'ARTICLE:recipe-true-costing' },
    ],
  },
  {
    id: 'intent-cost-control',
    category: 'variance_analysis',
    keywordsAr: ['تكلفة', 'تكاليف', 'هالك', 'انحراف', 'فود كوست', 'كوست', 'نسبة التكلفة', 'الفود كوست', 'انحراف الاستهلاك', 'تكلفة الطعام'],
    keywordsEn: ['cost', 'costs', 'food cost', 'cogs', 'variance', 'waste', 'shrinkage', 'theoretical vs actual', 'cost control'],
    misspellings: ['فودكوست', 'كوست كنترول', 'انحرافات', 'foodcost', 'varience'],
    targetView: 'cost_control',
    requiredRoles: ['tenant_admin', 'general_manager', 'cost_accountant', 'financial_manager', 'super_admin'],
    descriptionAr: 'مركز مراقبة التكاليف والانحراف وتتبع الفاقد الفعلي مقارنة بالمعياري لتعظيم هوامش الربحية.',
    descriptionEn: 'Cost Control & Variance cockpit comparing theoretical vs actual usage and waste drivers.',
    defaultActionsAr: [
      { label: 'فتح مراقبة التكاليف والانحراف', action: 'NAV:cost_control' },
      { label: 'حاسبة التجربة', action: 'ACTION:simulation' },
      { label: 'دليل معالجة الانحرافات', action: 'ARTICLE:variance-analysis-cost-control' },
    ],
    defaultActionsEn: [
      { label: 'Open Cost Control', action: 'NAV:cost_control' },
      { label: 'Launch Experiment Calculator', action: 'ACTION:simulation' },
      { label: 'Variance Management Guide', action: 'ARTICLE:variance-analysis-cost-control' },
    ],
  },
  {
    id: 'intent-purchasing',
    category: 'navigation',
    keywordsAr: ['مشتريات', 'مورد', 'موردين', 'شراء', 'امر شراء', 'فواتير الموردين', 'عروض اسعار', 'توريد'],
    keywordsEn: ['purchasing', 'suppliers', 'vendor', 'purchase order', 'po', 'procurement', 'vendor prices'],
    misspellings: ['مشتروات', 'موردون', 'بورشيز', 'purshase', 'suplier'],
    targetView: 'purchasing',
    requiredRoles: ['tenant_admin', 'general_manager', 'store_manager', 'financial_manager', 'financial_accountant', 'super_admin'],
    descriptionAr: 'إدارة دورة المشتريات وأوامر الشراء وتقييم أداء الموردين ومراقبة تقلبات أسعار المواد الخام.',
    descriptionEn: 'Procurement lifecycle, Purchase Orders, vendor pricing drift, and receiving logs.',
    defaultActionsAr: [
      { label: 'فتح المشتريات والموردين', action: 'NAV:purchasing' },
      { label: 'سجل أوامر الشراء', action: 'NAV:purchasing' },
    ],
    defaultActionsEn: [
      { label: 'Open Procurement', action: 'NAV:purchasing' },
      { label: 'View Purchase Orders', action: 'NAV:purchasing' },
    ],
  },
  {
    id: 'intent-finance',
    category: 'navigation',
    keywordsAr: ['مالية', 'حسابات', 'ارباح', 'خسائر', 'قيود', 'دفتر استاذ', 'ميزانية', 'سيولة', 'قائمة دخل', 'p&l', 'صافي الربح'],
    keywordsEn: ['finance', 'accounting', 'p&l', 'ledger', 'balance sheet', 'profit', 'net profit', 'journal entries'],
    misspellings: ['ماليه', 'اربحات', 'فاينانس', 'acounting', 'proffit'],
    targetView: 'finance',
    requiredRoles: ['tenant_admin', 'general_manager', 'financial_manager', 'financial_accountant', 'super_admin'],
    descriptionAr: 'الإدارة المالية ودفتر الأستاذ العام التلقائي وقائمة الدخل ومتابعة السيولة والخزائن.',
    descriptionEn: 'Financial management, automated double-entry ledger, P&L statements, and cash liquidity.',
    defaultActionsAr: [
      { label: 'فتح المالية وقائمة الدخل', action: 'NAV:finance' },
      { label: 'دفتر الأستاذ والقيود الآلية', action: 'NAV:finance' },
      { label: 'دليل الحسابات المزدوجة', action: 'ARTICLE:finance-double-entry-tax' },
    ],
    defaultActionsEn: [
      { label: 'Open Financial Cockpit', action: 'NAV:finance' },
      { label: 'View General Ledger', action: 'NAV:finance' },
      { label: 'Accounting SOP Manual', action: 'ARTICLE:finance-double-entry-tax' },
    ],
  },
  {
    id: 'intent-tax',
    category: 'navigation',
    keywordsAr: ['ضرائب', 'ضريبة', 'فاتورة الكترونية', 'زكاة', 'قيمة مضافة', 'فاتورة ضريبية', 'zatca', 'vat'],
    keywordsEn: ['tax', 'vat', 'e-invoice', 'zatca', 'sales tax', 'tax return', 'invoicing'],
    misspellings: ['ضريبه', 'زكاه', 'تاكس', 'txa', 'invoce'],
    targetView: 'tax',
    requiredRoles: ['tenant_admin', 'financial_manager', 'tax_accountant', 'super_admin'],
    descriptionAr: 'إدارة فواتير ضريبة القيمة المضافة والفوترة الإلكترونية المتوافقة مع هيئة الزكاة والضريبة.',
    descriptionEn: 'VAT tax ledger, e-invoicing audit trail, and regulatory tax compliance.',
    defaultActionsAr: [
      { label: 'فتح شاشة الضرائب والفوترة الإلكترونية', action: 'NAV:tax' },
      { label: 'سجل الفواتير الضريبية', action: 'NAV:tax' },
    ],
    defaultActionsEn: [
      { label: 'Open Tax & E-Invoicing', action: 'NAV:tax' },
      { label: 'Audit Tax Invoices', action: 'NAV:tax' },
    ],
  },
  {
    id: 'intent-hr',
    category: 'navigation',
    keywordsAr: ['موارد بشرية', 'رواتب', 'موظفين', 'حضور', 'انصراف', 'شيفت', 'طاقم عمل', 'عمالة'],
    keywordsEn: ['hr', 'payroll', 'employees', 'attendance', 'shifts', 'labor cost', 'staff'],
    misspellings: ['موارد بشريه', 'اجور', 'رواتبهم', 'payrol', 'employe'],
    targetView: 'hr',
    requiredRoles: ['tenant_admin', 'general_manager', 'hr_manager', 'super_admin'],
    descriptionAr: 'شؤون الموظفين، سجلات الحضور، مسير الرواتب المعتمد، وتوزيع تكلفة العمالة على الأقسام.',
    descriptionEn: 'Human Resources, attendance check-ins, payroll master, and labor cost absorption.',
    defaultActionsAr: [
      { label: 'فتح الموارد البشرية والرواتب', action: 'NAV:hr' },
      { label: 'سجل الحضور والانصراف', action: 'NAV:hr' },
    ],
    defaultActionsEn: [
      { label: 'Open HR & Labor', action: 'NAV:hr' },
      { label: 'Attendance Roster', action: 'NAV:hr' },
    ],
  },
  {
    id: 'intent-crm',
    category: 'navigation',
    keywordsAr: ['عملاء', 'زبائن', 'ولاء', 'نقاط', 'vip', 'علاقات عملاء', 'تفضيلات الضيوف'],
    keywordsEn: ['crm', 'customers', 'guests', 'loyalty', 'vip', 'guest relations', 'preferences'],
    misspellings: ['زبون', 'عملا', 'ولاء عملاء', 'custmer', 'loyalti'],
    targetView: 'crm',
    requiredRoles: ['tenant_admin', 'general_manager', 'public_relations', 'cashier', 'super_admin'],
    descriptionAr: 'قاعدة بيانات الضيوف والعملاء المميزين (VIP)، برامج الولاء، وتاريخ الطلبات السابقة.',
    descriptionEn: 'Guest relationship cockpit, VIP dining preferences, loyalty points, and purchase history.',
    defaultActionsAr: [
      { label: 'فتح إدارة علاقات العملاء (CRM)', action: 'NAV:crm' },
      { label: 'سجل كبار الضيوف (VIP)', action: 'NAV:crm' },
    ],
    defaultActionsEn: [
      { label: 'Open CRM & Loyalty', action: 'NAV:crm' },
      { label: 'View VIP Guest Registry', action: 'NAV:crm' },
    ],
  },
  {
    id: 'intent-superadmin',
    category: 'navigation',
    keywordsAr: ['سوبر ادمن', 'مدير عام المنظومة', 'لوحة المنظومة', 'المنشآت', 'جميع المنشآت', 'إدارة السحابة'],
    keywordsEn: ['super admin', 'cloud operations', 'all establishments', 'master platform', 'system tenants'],
    misspellings: ['سوبرادمن', 'ادمن المنظومة', 'supr admin', 'superadmin'],
    targetView: 'super_admin',
    requiredRoles: ['super_admin'],
    descriptionAr: 'مركز قيادة المنظومة السحابية لإدارة المنشآت والاشتراكات وجلسات الصيانة المشفرة.',
    descriptionEn: 'Ecosystem control center for managing multi-tenant partitions and governed support sessions.',
    defaultActionsAr: [
      { label: 'فتح مركز تحكم المدير العام للمنظومة', action: 'NAV:super_admin' },
    ],
    defaultActionsEn: [
      { label: 'Open Super Admin Cockpit', action: 'NAV:super_admin' },
    ],
  },
  {
    id: 'intent-qr-menu-management',
    category: 'navigation',
    keywordsAr: ['منيو الكتروني', 'ادارة المنيو', 'صور المنيو', 'وسوم', 'باركود', 'qr'],
    keywordsEn: ['digital menu', 'qr menu', 'menu management', 'badges', 'qr'],
    misspellings: ['منيو qr', 'كيو ار'],
    targetView: 'menu_management',
    requiredRoles: ['tenant_admin', 'general_manager', 'kitchen_manager', 'marketing_officer', 'super_admin'],
    descriptionAr: 'إدارة المنيو الإلكتروني للعملاء، الأوصاف التسويقية باللغتين، الصور، ووسوم الأصناف.',
    descriptionEn: 'Manage customer-facing QR menu, bilingual marketing descriptions, photos, and badges.',
    defaultActionsAr: [
      { label: 'فتح إدارة المنيو الإلكتروني', action: 'NAV:menu_management' },
      { label: 'دليل إعداد المنيو الإلكتروني', action: 'ARTICLE:qr-menu-setup' },
    ],
    defaultActionsEn: [
      { label: 'Open Digital Menu Management', action: 'NAV:menu_management' },
      { label: 'QR Menu Setup Guide', action: 'ARTICLE:qr-menu-setup' },
    ],
  },
  {
    id: 'intent-qr-tables',
    category: 'navigation',
    keywordsAr: ['طاولات qr', 'ملصقات qr', 'طباعة باركود', 'عدد الطاولات'],
    keywordsEn: ['qr tables', 'qr stickers', 'print qr', 'table count'],
    misspellings: ['ملصقات', 'باركود الطاولات'],
    targetView: 'qr_tables',
    requiredRoles: ['tenant_admin', 'general_manager', 'cashier', 'waiter', 'super_admin'],
    descriptionAr: 'ضبط عدد الطاولات وطباعة ملصقات QR لجميع الطاولات دفعة واحدة.',
    descriptionEn: 'Configure table count and batch-print QR stickers for all tables.',
    defaultActionsAr: [
      { label: 'فتح طاولات وملصقات QR', action: 'NAV:qr_tables' },
      { label: 'دليل طباعة ملصقات QR', action: 'ARTICLE:qr-table-printing' },
    ],
    defaultActionsEn: [
      { label: 'Open QR Tables & Stickers', action: 'NAV:qr_tables' },
      { label: 'QR Printing Guide', action: 'ARTICLE:qr-table-printing' },
    ],
  },
  {
    id: 'intent-kds',
    category: 'navigation',
    keywordsAr: ['محطات', 'شاشة المطبخ', 'kds', 'تذاكر التحضير', 'المشويات', 'البار'],
    keywordsEn: ['kds', 'kitchen display', 'stations', 'prep tickets', 'grill', 'bar'],
    misspellings: ['محطة', 'شاشات المطبخ'],
    targetView: 'kds',
    requiredRoles: ['tenant_admin', 'general_manager', 'kitchen_manager', 'bar_manager', 'cashier', 'super_admin'],
    descriptionAr: 'شاشات محطات التحضير (KDS) لمتابعة وتحديث حالة تذاكر المطبخ والمشويات والبار والحلويات.',
    descriptionEn: 'Kitchen Display Stations (KDS) for tracking and updating prep tickets across stations.',
    defaultActionsAr: [
      { label: 'فتح محطات التحضير (KDS)', action: 'NAV:kds' },
      { label: 'دليل تشغيل المحطات', action: 'ARTICLE:kitchen-stations-kds' },
    ],
    defaultActionsEn: [
      { label: 'Open Kitchen Stations (KDS)', action: 'NAV:kds' },
      { label: 'Kitchen Stations SOP', action: 'ARTICLE:kitchen-stations-kds' },
    ],
  },
];

// -------------------------------------------------------------
// TEXT NORMALIZATION & SMART MATCHING
// -------------------------------------------------------------
export function normalizeQuery(query: string): string {
  let q = query.toLowerCase().trim();
  // Strip common Arabic prefixes (الـ، و، بـ، لـ، كـ)
  q = q.replace(/^(ال|ب|ل|ك|و)/, '');
  // Normalize Arabic vowels & letters
  q = q.replace(/[إأآا]/g, 'ا');
  q = q.replace(/ة/g, 'ه');
  q = q.replace(/ى/g, 'ي');
  // Strip common punctuation
  q = q.replace(/[؟?.,!]/g, '');
  return q;
}

/**
 * Checks if query matches target with semantic/substring tolerance
 */
export function termMatches(word: string, target: string): boolean {
  const nw = normalizeQuery(word);
  const nt = normalizeQuery(target);
  if (!nw || !nt) return false;
  if (nw === nt) return true;
  if (nw.length >= 3 && nt.includes(nw)) return true;
  if (nt.length >= 3 && nw.includes(nt)) return true;
  return false;
}

export interface AssistantSystemContext {
  recipes?: DetailedRecipe[];
  currentEstablishment?: Establishment | null;
  currentUser?: User | null;
}

// -------------------------------------------------------------
// MAIN ASSISTANT REASONING & DECISION ENGINE
// -------------------------------------------------------------
export function processAssistantQuery(
  rawQuery: string,
  userRole: UserRole,
  userLanguage: 'ar' | 'en' | 'fr' | 'nl' | 'tr',
  systemContext?: AssistantSystemContext
): AiAssistantMessage {
  const isAr = userLanguage === 'ar';
  const normQuery = normalizeQuery(rawQuery);
  const words = rawQuery.toLowerCase().split(/\s+/).filter(Boolean);

  // 1. CHECK FOR RECIPE & DISH TRUE COST INTENT (e.g. "تكلفة البرجر", "cost of ribeye", "عايز cost بتاع burger")
  const isCostQuery =
    normQuery.includes('تكلف') ||
    normQuery.includes('كوست') ||
    normQuery.includes('cost') ||
    normQuery.includes('سعر') ||
    normQuery.includes('price');

  const recipeMatches = systemContext?.recipes?.filter((r) => {
    const nameAr = normalizeQuery(r.productNameAr);
    const nameEn = r.productNameEn.toLowerCase();
    const code = r.code.toLowerCase();
    return (
      words.some((w) => termMatches(w, nameAr) || termMatches(w, nameEn) || termMatches(w, code)) ||
      normQuery.includes(nameAr) ||
      normQuery.includes(nameEn)
    );
  });

  if (recipeMatches && recipeMatches.length > 0) {
    const matchedRecipe = recipeMatches[0];
    const activeVersion =
      matchedRecipe.versions.find((v) => v.versionNumber === matchedRecipe.activeVersionNumber) ||
      matchedRecipe.versions[0];
    const trueCost = activeVersion?.costBreakdown?.totalTrueProductCost || 17.1;
    const foodCostPct = activeVersion?.costBreakdown?.foodCostPercentage || 31.4;
    const rawCost = activeVersion?.costBreakdown?.rawIngredientsCost ?? 10.88;
    const wasteBuffer = activeVersion?.costBreakdown?.wasteLossBuffer ?? 1.63;
    const laborAndUtils =
      (activeVersion?.costBreakdown?.directLaborCost || 0) +
      (activeVersion?.costBreakdown?.utilitiesAllocation?.water || 0) +
      (activeVersion?.costBreakdown?.utilitiesAllocation?.electricity || 0) +
      (activeVersion?.costBreakdown?.utilitiesAllocation?.gas || 0) +
      (activeVersion?.costBreakdown?.consumablesCost || 0);

    const contentAr = `بيانات التكلفة الحقيقية لصنف [${matchedRecipe.productNameAr}] (${matchedRecipe.code}):\n\n• التكلفة الحقيقية الشاملة للوجبة: ${trueCost.toFixed(2)} ج.م\n• نسبة تكلفة الطعام: ${foodCostPct.toFixed(1)}%\n• تكلفة المواد الخام الصافية: ${rawCost.toFixed(2)} ج.م\n• هالك التحضير والتشفية الممتص: ${wasteBuffer.toFixed(2)} ج.م\n• العمالة المباشرة والمنافع والمرافق: ${laborAndUtils.toFixed(2)} ج.م\n\nالإصدار المعتمد حالياً: ${activeVersion?.versionLabel} (مؤرشف ومحمي بأثر رجعي).`;

    const contentEn = `True Product Cost breakdown for [${matchedRecipe.productNameEn}] (${matchedRecipe.code}):\n\n• True Portion Cost: ${trueCost.toFixed(2)} EGP\n• Food Cost Percentage: ${foodCostPct.toFixed(1)}%\n• Net Raw Material Cost: ${rawCost.toFixed(2)} EGP\n• Prep Trim & Yield Waste: ${wasteBuffer.toFixed(2)} EGP\n• Direct Labor & Utilities: ${laborAndUtils.toFixed(2)} EGP\n\nActive Effective Version: ${activeVersion?.versionLabel} (immutable historical record).`;

    return {
      id: `msg-cost-${Date.now()}`,
      sender: 'tygos_ai',
      contentAr,
      contentEn,
      content: isAr ? contentAr : contentEn,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        {
          label: isAr ? 'عرض الوصفة (رسبي)' : 'Open Recipe Card',
          query: isAr ? 'فتح الوصفة' : 'Open Recipe',
          action: 'NAV:menu',
        },
        {
          label: isAr ? 'مقارنة الفعلي بالمعياري في التكاليف' : 'Compare Theoretical vs Actual',
          query: isAr ? 'انحراف التكاليف' : 'Cost Variance',
          action: 'NAV:cost_control',
        },
        {
          label: isAr ? 'تجربة أثر الأسعار في حاسبة التجربة' : 'Open Experiment Calculator',
          query: isAr ? 'حاسبة التجربة' : 'Simulate Cost',
          action: 'ACTION:simulation',
        },
      ],
      referencedEntities: [{ name: matchedRecipe.productNameEn, type: 'recipe', id: matchedRecipe.id }],
    };
  }

  // 2. CHECK FOR INTENT MATCHES ACROSS MODULES
  let bestIntent: AppIntentDefinition | null = null;
  let highestScore = 0;

  for (const intent of APP_INTENTS) {
    let score = 0;
    const allTargets = [
      ...intent.keywordsAr,
      ...intent.keywordsEn,
      ...intent.misspellings,
    ];

    for (const word of words) {
      if (word.length < 2) continue;
      for (const target of allTargets) {
        if (termMatches(word, target)) {
          score += 3;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestIntent = intent;
    }
  }

  // 3. EVALUATE MATCHED INTENT & RBAC PERMISSIONS
  if (bestIntent && highestScore >= 3) {
    const isAuthorized = bestIntent.requiredRoles.includes(userRole);

    if (!isAuthorized) {
      const resourceName = isAr ? bestIntent.descriptionAr.split(' ')[0] : bestIntent.id;
      const contentAr = `صلاحياتك الحالية (${userRole}) لا تسمح بالوصول إلى بيانات أو إجراءات [${bestIntent.keywordsAr[0]}].\n\nتمنع منظومة Tygos مشاركة كلمات المرور نهائياً حفاظاً على أمان العمليات والامتثال المالي. يمكنك تقديم طلب تصريح أمني مؤقت ومحدد المدة للمشرف المسؤول.`;
      const contentEn = `Access Restricted. Your current authorization (${userRole}) does not permit accessing [${bestIntent.keywordsEn[0]}] data.\n\nTygos strictly prohibits password sharing. You may submit an audited, timed privileged access request to your authorized administrator.`;

      return {
        id: `msg-denied-${Date.now()}`,
        sender: 'tygos_ai',
        contentAr,
        contentEn,
        content: isAr ? contentAr : contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isPermissionDenied: true,
        permissionDeniedResource: bestIntent.id,
        suggestedActions: [
          {
            label: isAr ? 'تقديم طلب تصريح مؤقت' : 'Request Timed Privileged Access',
            query: isAr ? 'طلب تصريح أمني' : 'Request Security Escalation',
            action: 'ACTION:request_access',
          },
          {
            label: isAr ? 'قراءة سياسة الأمان والتصاريح' : 'Read Security & Access Policy',
            query: isAr ? 'سياسة الأمان' : 'Security Policy',
            action: 'ARTICLE:privileged-access-security',
          },
        ],
      };
    }

    // Authorized Intent
    const actions = isAr ? bestIntent.defaultActionsAr : bestIntent.defaultActionsEn;
    const contentAr = `${bestIntent.descriptionAr}\n\nيمكنك الانتقال فوراً أو تنفيذ الإجراء المطلوب عبر الخيارات التفاعلية أدناه:`;
    const contentEn = `${bestIntent.descriptionEn}\n\nYou can navigate immediately or execute actions using the contextual buttons below:`;

    return {
      id: `msg-intent-${Date.now()}`,
      sender: 'tygos_ai',
      contentAr,
      contentEn,
      content: isAr ? contentAr : contentEn,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: actions.map((a) => ({ label: a.label, query: a.label, action: a.action })),
      referencedEntities: bestIntent.targetView
        ? [{ name: bestIntent.keywordsEn[0], type: 'module', id: bestIntent.targetView }]
        : [],
    };
  }

  // 4. CHECK FOR "WHY DID PROFIT CHANGE" OR BUSINESS REASONING
  if (
    normQuery.includes('ربح') ||
    normQuery.includes('ارباح') ||
    normQuery.includes('profit') ||
    normQuery.includes('انخفاض') ||
    normQuery.includes('زياده') ||
    normQuery.includes('variance')
  ) {
    const contentAr = `تحليل مسببات الأرباح والانحراف لشهر نوفمبر 2026:\n\n• صافي الربح الفعلي: 214,800 ج.م (انخفاض -3.8% مقارنة بالشهر السابق)\n• السبب الأول: ارتفاع أسعار شراء لحوم الأنجوس بنسبة 14.2% من الموردين.\n• السبب الثاني: زيادة نسبة هالك التشفية والتقطيع في قسم اللحوم بنسبة 11.5%.\n• أثر إيجابي: ارتفاع مبيعات المشروبات والحلويات بنسبة +5.4% عوض جزءاً من العجز.\n\nتوصية المحرك الذكي: تعديل السعر المستهدف لستيك الريب آي بمقدار 25.00 ج.م أو تشديد رقابة موازين التحضير.`;

    const contentEn = `Profit Variance & Cause Decomposition for November 2026:\n\n• Actual Net Profit: 214,800 EGP (-3.8% vs prior period)\n• Primary Driver: Supplier raw beef price inflation (+14.2%).\n• Secondary Driver: Butchery trim scrap excess (+11.5% in prep station).\n• Positive Offset: Beverage & dessert cross-selling expansion (+5.4%).\n\nRecommendation: Readjust Ribeye target selling price by +25.00 EGP or enforce prep portion scale calibration.`;

    return {
      id: `msg-profit-${Date.now()}`,
      sender: 'tygos_ai',
      contentAr,
      contentEn,
      content: isAr ? contentAr : contentEn,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        {
          label: isAr ? 'عرض تفكيك أسباب الأرباح' : 'View Profit Decomposition',
          query: isAr ? 'أسباب تغير الأرباح' : 'Analyze Profit Drivers',
          action: 'NAV:dashboard',
        },
        {
          label: isAr ? 'حاسبة التجربة' : 'Launch Experiment Calculator',
          query: isAr ? 'حاسبة التجربة' : 'Simulate Cost',
          action: 'ACTION:simulation',
        },
        {
          label: isAr ? 'فحص انحرافات المستودعات' : 'Check Inventory Variances',
          query: isAr ? 'انحرافات المستودعات' : 'Warehouse Variances',
          action: 'NAV:cost_control',
        },
      ],
    };
  }

  // 5. GENERAL SOP & HELP QUESTION (e.g. "ازاي اعمل وصفة", "how to calculate food cost")
  const matchedArticle = HELP_ARTICLES.find((art) => {
    const titleAr = normalizeQuery(art.titleAr);
    const titleEn = art.titleEn.toLowerCase();
    const summaryAr = normalizeQuery(art.summaryAr);
    return words.some((w) => termMatches(w, titleAr) || termMatches(w, titleEn) || termMatches(w, summaryAr));
  });

  if (matchedArticle) {
    const contentAr = `وجدت دليلاً تشغيلياً معتمداً لـ [${matchedArticle.titleAr}]:\n\n${matchedArticle.summaryAr}\n\nالخطوات الأساسية:\n${matchedArticle.stepsAr?.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    const contentEn = `Found approved SOP manual article for [${matchedArticle.titleEn}]:\n\n${matchedArticle.summaryEn}\n\nCore Procedure:\n${matchedArticle.stepsEn?.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    return {
      id: `msg-help-${Date.now()}`,
      sender: 'tygos_ai',
      contentAr,
      contentEn,
      content: isAr ? contentAr : contentEn,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        {
          label: isAr ? 'قراءة الدليل الكامل في مركز المعرفة' : 'Read Full Guide in Help Center',
          query: isAr ? 'فتح الدليل' : 'Open Article',
          action: `ARTICLE:${matchedArticle.slug}`,
        },
        {
          label: isAr ? 'فتح الشاشة المرتبطة' : 'Open Related Module',
          query: isAr ? 'فتح الشاشة' : 'Open Module',
          action: `NAV:${matchedArticle.module}`,
        },
      ],
    };
  }

  // 6. DEFAULT INTELLIGENT GREETING / ASSISTANCE OVERVIEW
  const defaultAr = `مرحباً بك في مساعد Tygos الذكي للإدارة والتشغيل والربحية.\n\nيمكنني مساعدتك في كافة عمليات المنظومة:\n1. التنقل السريع: اطلب مني فتح أي شاشة (مثال: "افتح المخزون"، "افتح الكاشير"، "افتح الوصفات").\n2. استعلام التكاليف: اسألني عن تكلفة أي صنف (مثال: "تكلفة البرجر"، "سعر الريب آي").\n3. تحليل الأرباح: اسألني "ليه الربح قل؟" أو "ليه الـ Food Cost زاد؟".\n4. المعرفة والتشغيل: اسأل عن سياسات التشغيل وحسابات الهالك المعياري.\n\nكيف يمكنني مساعدتك الآن؟`;

  const defaultEn = `Welcome to the Tygos Operational, Management & Profitability Assistant.\n\nI am grounded in live system data and ready to assist you:\n1. Direct Navigation: Ask me to open any screen (e.g., "Open inventory", "Open POS", "Open recipes").\n2. Cost Inquiries: Ask for any dish cost (e.g., "Burger cost", "Ribeye true cost").\n3. Profit Decomposition: Ask "Why did profit decrease?" or "Why did Food Cost increase?".\n4. Standard Operating Procedures: Ask about yield shrinkage or warehouse reconciliation.\n\nHow can I help you right now?`;

  return {
    id: `msg-default-${Date.now()}`,
    sender: 'tygos_ai',
    contentAr: defaultAr,
    contentEn: defaultEn,
    content: isAr ? defaultAr : defaultEn,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestedActions: [
      {
        label: isAr ? 'افتح المخزون' : 'Open Inventory',
        query: isAr ? 'افتح المخزون' : 'Open Inventory',
        action: 'NAV:inventory',
      },
      {
        label: isAr ? 'هات تكلفة البرجر' : 'Burger Cost Breakdown',
        query: isAr ? 'تكلفة البرجر' : 'Burger cost',
      },
      {
        label: isAr ? 'أسباب تغير الأرباح' : 'Analyze Profit Drivers',
        query: isAr ? 'أسباب تغير الأرباح' : 'Analyze Profit Drivers',
      },
      {
        label: isAr ? 'فتح حاسبة الوصفات (رسبي)' : 'Open Recipes',
        query: isAr ? 'فتح الوصفات' : 'Open Recipes',
        action: 'NAV:menu',
      },
    ],
  };
}
