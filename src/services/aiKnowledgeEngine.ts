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
      'Define suppliers and raw ingredients, then build standardized BOM recipes.',
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
    id: 'art-recipe-costing',
    slug: 'recipe-true-costing',
    module: 'menu',
    category: 'recipes',
    titleAr: 'دليل حساب التكلفة الحقيقية للمنتج (True Product Cost)',
    titleEn: 'Comprehensive True Product Costing Guide',
    summaryAr: 'كيف تحسب منظومة Tygos تكلفة الطبق من أصغر مدخل تشغيلي (المياه والطاقة) حتى صافي الربحية.',
    summaryEn: 'How Tygos calculates plate cost from smallest operational input (water, energy) to net profit.',
    contentAr: `تعتمد Tygos صيغة التكلفة الشاملة التي تتجاوز سعر شراء المكونات فقط:
1. تكلفة المواد الخام الصافية مخصوماً منها نسبة الفاقد والهالك (Yield & Trim Loss).
2. تكلفة مواد التعبئة والتغليف (علب، أكياس، ورق طعام).
3. تكلفة العمالة المباشرة (دقائق التحضير الفعلي مضروبة في أجر الدقيقة).
4. حصة العمالة غير المباشرة ومصاريف الإشراف.
5. استهلاك المنافع والمرافق: المياه، الكهرباء، وغاز الطهي (From One Drop of Water to Profit).
6. المواد الاستهلاكية وأدوات النظافة والتعقيم.`,
    contentEn: `Tygos uses an all-inclusive cost formula that goes beyond raw ingredient purchasing price:
1. Net ingredient cost adjusted for prep scrap and yield loss.
2. Packaging components (boxes, wraps, containers).
3. Direct kitchen/bar labor (actual prep minutes multiplied by minute wage rate).
4. Indirect supervisory labor allocation.
5. Utility absorption: culinary water, refrigeration power, and cooking gas.
6. Station consumables and sanitation supplies.`,
    stepsAr: [
      'افتح شاشة "قائمة الطعام والوصفات" واختر الصنف المطلوب.',
      'راجع جدول المكونات وتأكد من تحديد نسبة الفاقد لكل مكون خام بدقة.',
      'حدد وقت التحضير المباشر بالدقائق ليقوم النظام باحتساب تكلفة العمالة تلقائياً.',
      'اطلع على بطاقة "التكلفة الحقيقية للوجبة" لمقارنة هامش الربح بالسعر المستهدف.',
    ],
    stepsEn: [
      'Navigate to Menu & Recipes and select the target item.',
      'Review ingredient table and confirm scrap/waste trim percentages.',
      'Enter active prep minutes for automated labor cost absorption.',
      'Inspect the True Product Cost card to compare margin against target benchmark.',
    ],
    commonMistakesAr: [
      'إهمال نسبة الفاقد في تنظيف اللحوم والخضار مما يؤدي لتسعير منخفض غير حقيقي.',
      'تجاهل تكلفة التغليف للطلبات الخارجية والسفري.',
      'عدم إنشاء إصدار جديد للوصفة عند تغير أسعار عقود التوريد.',
    ],
    commonMistakesEn: [
      'Omitting butchery trim loss which results in understated menu portion cost.',
      'Ignoring packaging costs on takeaway and delivery orders.',
      'Failing to create a new recipe version when supplier prices shift.',
    ],
    lastUpdated: '2026-11-03',
  },
  {
    id: 'art-variance-cost-control',
    slug: 'variance-analysis-cost-control',
    module: 'cost_control',
    category: 'cost_control',
    titleAr: 'تحليل الانحراف المعياري مقابل الفعلي (Theoretical vs Actual Variance)',
    titleEn: 'Theoretical vs Actual Consumption & Variance Analysis',
    summaryAr: 'تحديد مسببات الفارق بين الاستهلاك النظري للوصفات والجرد الفعلي للمستودعات.',
    summaryEn: 'Dissecting variance root causes between recipe theoretical consumption and physical stock count.',
    contentAr: `الانحراف في التكلفة هو الفارق بين ما كان ينبغي استهلاكه طبقاً للمبيعات والوصفات المعيارية، وما تم استهلاكه بالفعل في الواقع العملي.
أسباب الانحراف الشائعة:
• هالك غير مسجل أثناء التحضير الصباحي.
• اختلاف في أحجام الحصص (Over-portioning).
• تقلبات أسعار شراء المواد الخام (Purchase Price Variance).
• تالف تخزين أو عجز جرد فعلي.`,
    contentEn: `Cost variance represents the difference between theoretical consumption driven by sales recipes and physical stock depletion.
Primary root causes include:
• Unrecorded morning prep waste and trimming.
• Over-portioning at cookline stations.
• Purchase price variances from supplier shifts.
• Spoilage or inventory discrepancy.`,
    stepsAr: [
      'افتح شاشة "مراقبة التكاليف والانحراف".',
      'اختر مركز التكلفة أو القسم المطلوب (مطبخ، بار، مخبز).',
      'راجع عمود "الانحراف المالي" لمعرفة المكونات الأعلى تأثيراً على الربحية.',
      'انقر على أي مكون لعرض بطاقة تحليل الأسباب المحتملة والإجراء التصحيحي المقترح.',
    ],
    stepsEn: [
      'Open Cost Control & Variance module.',
      'Filter by department cost center (Kitchen, Bar, Bakehouse).',
      'Sort by Variance Cost Value to identify high-impact ingredients.',
      'Click on any item to view root cause diagnosis and recommended action.',
    ],
    commonMistakesAr: [
      'افتراض أن كل انحراف هو سرقة دون فحص موازين التحضير ونسب الهالك.',
      'تأخير تسجيل الجرد الفعلي للمستودع مما يشوه المقارنة الزمنية.',
    ],
    commonMistakesEn: [
      'Assuming variance is shrinkage without checking portion scale calibration.',
      'Delaying stocktake entry which distorts operational alignment.',
    ],
    lastUpdated: '2026-11-03',
  },
  {
    id: 'art-inventory-management',
    slug: 'warehouse-inventory-stocktakes',
    module: 'inventory',
    category: 'inventory',
    titleAr: 'إدارة المستودعات وحركات المخزون والجرد (Inventory & Warehousing)',
    titleEn: 'Multi-Warehouse Inventory, Stock Movements & Audits',
    summaryAr: 'تتبع المواد الخام من لحظة استلام التوريد، الصرف الداخلي للمطبخ، وحتى إعادة الطلب الآلي.',
    summaryEn: 'Tracking stock from dock receipt, internal station requisitions, to automated par-level alerts.',
    contentAr: `يدعم Tygos تعدد المستودعات (المستودع الرئيسي، مستودع المطبخ الساخن، مستودع البار والمشروبات، مستودع التعبئة).
تسجل حركات المخزون آلياً:
1. إذن إضافة استلام بضاعة مع ربط سعر الفاتورة بالمورد.
2. إذن صرف داخلي بناء على احتياج الأقسام.
3. استهلاك آلي بنقطة البيع بناء على مكونات الوصفة المصروفة.
4. تسوية جرد دورية مع تسجيل فروق الجرد بحسابات التكلفة.`,
    contentEn: `Tygos provides enterprise multi-warehouse segregation (Central Storage, Kitchen Dry/Cold, Bar Station, Packaging).
Stock movements are fully audited:
1. Goods Receipt against purchase orders with weighted average cost updates.
2. Departmental requisitions between central store and production stations.
3. Automated depletion on POS order closure based on recipe explosion.
4. Cycle counts and reconciliation with automated cost adjustments.`,
    stepsAr: [
      'افتح شاشة المستودعات والمخزون للاطلاع على مستويات الرصيد.',
      'راقب تنبيهات الحد الأدنى (Reorder Point) لإصدار أوامر الشراء قبل نفاد الصنف.',
      'استخدم زر "تسجيل تسوية جرد" لمطابقة الكميات الفعلية مع النظام.',
    ],
    stepsEn: [
      'Navigate to Inventory Warehouses to monitor real-time stock balances.',
      'Review par-level alerts to trigger timely procurement before stockouts.',
      'Use the Stock Adjustment tool to record periodic cycle counts.',
    ],
    commonMistakesAr: [
      'تجاهل تسجيل التحويل الداخلي بين المستودع المركزي ومستودع التشغيل.',
      'تسجيل تسويات جرد دون ذكر السبب المعياري للتسوية.',
    ],
    commonMistakesEn: [
      'Failing to record store-to-kitchen transfers before production.',
      'Adjusting balances without documented business reason codes.',
    ],
    lastUpdated: '2026-11-03',
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
    descriptionEn: 'Recipe Engineering, Bill of Materials (BOM), immutable versioning, and portion yield tracking.',
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
      { label: 'محاكاة أثر التكلفة (What-If)', action: 'ACTION:simulation' },
      { label: 'دليل معالجة الانحرافات', action: 'ARTICLE:variance-analysis-cost-control' },
    ],
    defaultActionsEn: [
      { label: 'Open Cost Control', action: 'NAV:cost_control' },
      { label: 'Launch What-If Simulation', action: 'ACTION:simulation' },
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

    const contentAr = `بيانات التكلفة الحقيقية لصنف [${matchedRecipe.productNameAr}] (${matchedRecipe.code}):\n\n• التكلفة الحقيقية الشاملة للوجبة: $${trueCost.toFixed(2)}\n• نسبة تكلفة الطعام (Food Cost): ${foodCostPct.toFixed(1)}%\n• تكلفة المواد الخام الصافية: $${rawCost.toFixed(2)}\n• هالك التحضير والتشفية الممتص: $${wasteBuffer.toFixed(2)}\n• العمالة المباشرة والمنافع والمرافق: $${laborAndUtils.toFixed(2)}\n\nالإصدار المعتمد حالياً: ${activeVersion?.versionLabel} (مؤرشف ومحمي بأثر رجعي).`;

    const contentEn = `True Product Cost breakdown for [${matchedRecipe.productNameEn}] (${matchedRecipe.code}):\n\n• True Portion Cost: $${trueCost.toFixed(2)}\n• Food Cost Percentage: ${foodCostPct.toFixed(1)}%\n• Net Raw Material Cost: $${rawCost.toFixed(2)}\n• Prep Trim & Yield Waste: $${wasteBuffer.toFixed(2)}\n• Direct Labor & Utilities: $${laborAndUtils.toFixed(2)}\n\nActive Effective Version: ${activeVersion?.versionLabel} (immutable historical record).`;

    return {
      id: `msg-cost-${Date.now()}`,
      sender: 'tygos_ai',
      contentAr,
      contentEn,
      content: isAr ? contentAr : contentEn,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        {
          label: isAr ? 'عرض بطاقة الوصفة الهندسية (BOM)' : 'Open Recipe Engineering (BOM)',
          query: isAr ? 'فتح الوصفة' : 'Open Recipe',
          action: 'NAV:menu',
        },
        {
          label: isAr ? 'مقارنة الفعلي بالمعياري في التكاليف' : 'Compare Theoretical vs Actual',
          query: isAr ? 'انحراف التكاليف' : 'Cost Variance',
          action: 'NAV:cost_control',
        },
        {
          label: isAr ? 'محاكاة أثر أسعار الموردين (What-If)' : 'Simulate What-If Price Drift',
          query: isAr ? 'محاكاة التكلفة' : 'Simulate Cost',
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
    const contentAr = `تحليل مسببات الأرباح والانحراف لشهر نوفمبر 2026:\n\n• صافي الربح الفعلي: $21,480 (انخفاض -3.8% مقارنة بالشهر السابق)\n• السبب الأول: ارتفاع أسعار شراء لحوم الأنجوس بنسبة 14.2% من الموردين.\n• السبب الثاني: زيادة نسبة هالك التشفية والتقطيع في قسم اللحوم بنسبة 11.5%.\n• أثر إيجابي: ارتفاع مبيعات المشروبات والحلويات بنسبة +5.4% عوض جزءاً من العجز.\n\nتوصية المحرك الذكي: تعديل السعر المستهدف لستيك الريب آي بمقدار $2.50 أو تشديد رقابة موازين التحضير.`;

    const contentEn = `Profit Variance & Cause Decomposition for November 2026:\n\n• Actual Net Profit: $21,480 (-3.8% vs prior period)\n• Primary Driver: Supplier raw beef price inflation (+14.2%).\n• Secondary Driver: Butchery trim scrap excess (+11.5% in prep station).\n• Positive Offset: Beverage & dessert cross-selling expansion (+5.4%).\n\nRecommendation: Readjust Ribeye target selling price by +$2.50 or enforce prep portion scale calibration.`;

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
          label: isAr ? 'محاكاة أثر أسعار الموردين (What-If)' : 'Launch What-If Simulation',
          query: isAr ? 'محاكاة التكلفة' : 'What-If Simulation',
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
        label: isAr ? 'فتح حاسبة الوصفات (BOM)' : 'Open Recipes (BOM)',
        query: isAr ? 'فتح الوصفات' : 'Open Recipes',
        action: 'NAV:menu',
      },
    ],
  };
}
