/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TYGOS LOCAL SOVEREIGN ASSISTANT ENGINE (بدون API خارجي)
 * Powered by Screen Registry & Live AppContext Snapshot.
 * 
 * // INTEGRATION POINT: Connect to server-side Gemini 2.5 Flash / Interactions API when external AI is enabled.
 */

import { SCREEN_REGISTRY, findMatchingScreens, ScreenDefinition } from './screenRegistry.ts';
import { AppContextSnapshot } from './appContextSnapshot.ts';

export interface AssistantSuggestedAction {
  label: string;
  query?: string;
  action: string; // e.g. "NAV:pos", "ACTION:open_add_ingredient", "ACTION:open_add_product"
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'tygos_ai';
  content: string;
  contentAr: string;
  contentEn: string;
  timestamp: string;
  suggestedActions?: AssistantSuggestedAction[];
  detailedExplanation?: {
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
  };
}

// Arabic text normalizer for dialect & typo tolerance
export function normalizeAssistantQuery(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // strip diacritics (تنوين، شدة، فتحة)
    .replace(/[؟?!.,;:]/g, '')
    .trim();
}

export class LocalAssistantEngine {
  /**
   * Generates proactive greeting suggestions based on current system state
   */
  getProactiveSuggestions(context: AppContextSnapshot, isAr: boolean): AssistantSuggestedAction[] {
    const suggestions: AssistantSuggestedAction[] = [];

    // 1. Missing raw materials
    if (context.totalRawMaterials === 0) {
      suggestions.push({
        label: isAr ? 'أضف أول خامة لمستودعك' : 'Add your first raw material',
        action: 'ACTION:open_add_ingredient',
      });
    }

    // 2. Products without recipe
    if (context.productsWithoutRecipe.length > 0) {
      const p = context.productsWithoutRecipe[0];
      suggestions.push({
        label: isAr ? `أكمل وصفة [${p.nameAr}]` : `Complete recipe for [${p.nameEn}]`,
        action: 'NAV:menu',
      });
    }

    // 3. Low stock warning
    if (context.lowStockIngredients.length > 0) {
      const ing = context.lowStockIngredients[0];
      suggestions.push({
        label: isAr ? `نقص مخزون [${ing.nameAr}] · اطلب الآن` : `Low Stock: [${ing.nameEn}] · Order Now`,
        action: 'NAV:purchasing',
      });
    }

    // 4. Default quick shortcuts from registry
    suggestions.push({
      label: isAr ? 'كيف أسجل وردية الكاشير؟' : 'How to close cashier shift?',
      action: 'NAV:pos',
    });
    suggestions.push({
      label: isAr ? 'استيراد خامات من إكسيل' : 'Import Ingredients from Excel',
      action: 'ACTION:open_import_data',
    });

    return suggestions.slice(0, 4);
  }

  /**
   * Main answer generation function
   */
  async ask(context: AppContextSnapshot, userQuery: string, language: 'ar' | 'en' = 'ar'): Promise<AssistantMessage> {
    const isAr = language === 'ar';
    const norm = normalizeAssistantQuery(userQuery);

    // 1. Check for RBAC permission boundaries (Cashier / Waiter asking for P&L or True Cost)
    const isCostOrProfitQuery =
      norm.includes('ارباح') ||
      norm.includes('ربح') ||
      norm.includes('تكلفه حقيقيه') ||
      norm.includes('profit') ||
      norm.includes('cogs') ||
      norm.includes('margin');

    const isRestrictedRole = context.userRole === 'cashier' || context.userRole === 'waiter';

    if (isCostOrProfitQuery && isRestrictedRole) {
      const contentAr = `عفواً، يتطلب الاطلاع على أرقام الأرباح والتكلفة الحقيقية صلاحية إدارية خاصة.\n\nيمكنك طلب تفويض مؤقت من مدير المنشأة برمز مشفر دون الحاجة لكلمة المرور.`;
      const contentEn = `Access to gross profit and true product cost requires administrative authorization.\n\nYou may request a timed security token from your manager without sharing passwords.`;

      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? contentAr : contentEn,
        contentAr,
        contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          {
            label: isAr ? 'طلب رمز تفويض مؤقت' : 'Request Timed Delegation Token',
            action: 'ACTION:request_privileged_token',
          },
        ],
      };
    }

    // 2. Direct action triggers ("أضف خامة", "أضف منتج", "استورد إكسيل")
    if (norm.includes('اضف خامه') || norm.includes('خامه جديده') || norm.includes('add ingredient')) {
      const contentAr = `فتحت لك نافذة الإضافة السريعة للخامات. يمكنك كتابة الاسم والسعر والكمية وحفظها في ثوانٍ.`;
      const contentEn = `Opening Quick Add Raw Material window. You can set the name, cost, and unit in seconds.`;

      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? contentAr : contentEn,
        contentAr,
        contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: isAr ? 'فتح نافذة إضافة خامة' : 'Open Add Raw Material', action: 'ACTION:open_add_ingredient' },
        ],
      };
    }

    if (norm.includes('اضف منتج') || norm.includes('وصفه جديده') || norm.includes('add product')) {
      const contentAr = `فتحت لك معالج بناء الصنف والوصفة بثلاث خطوات لحساب التكلفة الحقيقية تلقائياً.`;
      const contentEn = `Opening 3-Step Product & Recipe Builder to compute true cost automatically.`;

      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? contentAr : contentEn,
        contentAr,
        contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: isAr ? 'فتح معالج المنتج' : 'Open Product Wizard', action: 'ACTION:open_add_product' },
        ],
      };
    }

    if (
      (norm.includes('اكسيل') || norm.includes('استيراد') || norm.includes('excel') || norm.includes('import')) &&
      !norm.includes('رواتب') &&
      !norm.includes('مرتبات') &&
      !norm.includes('مصاريف')
    ) {
      const contentAr = `يمكنك لصق بيانات الخامات مباشرة من جدول إكسيل أو تحميل قوالب نموذجية جاهزة لنشاطك.`;
      const contentEn = `You can paste raw material tables directly from Excel or load ready-made starter templates.`;

      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? contentAr : contentEn,
        contentAr,
        contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: isAr ? 'فتح مساحة الاستيراد' : 'Open Import Workspace', action: 'ACTION:open_import_data' },
        ],
      };
    }

    // 3. Specific Egyptian Colloquial Operational FAQ Intents (30+ Scenarios across Packages 1-6)
    const intentMatches: Array<{
      id: string;
      test: (n: string) => boolean;
      contentAr: string;
      contentEn: string;
      actions: AssistantSuggestedAction[];
    }> = [
      {
        id: 'untracked_water_salt',
        test: (n) =>
          (n.includes('ميه') || n.includes('ماء') || n.includes('ملح')) &&
          (n.includes('جرد') || n.includes('نجرد') || n.includes('رصيد') || n.includes('تتخصم') || n.includes('تتحسب')),
        contentAr:
          'الخامات غير المتتبعة مثل «الماء المفلتر» أو «الملح السائب» تُفعل عبر خيار «خامة بلا رصيد مخزني — نحسب تكلفتها فقط» عند إضافة أو تعديل الخامة:\n\n1. تدخل تكلفتها في الوصفة والتجهيزات بشكل طبيعي.\n2. لا يُخصم لها رصيد سالب عند البيع.\n3. لا تظهر كعجز جرد مزعج في شاشة الجرد الفعلي وتتوفر دائماً في حساب الإتاحة.',
        contentEn:
          'Untracked items like filtered water or bulk salt use the "Cost-only (non-stock-tracked)" flag: cost is counted in recipes without negative stock deduction or audit deficit.',
        actions: [
          { label: isAr ? 'فتح الخامات والمخزون' : 'Open Inventory', action: 'NAV:inventory' },
          { label: isAr ? 'إضافة خامة جديدة' : 'Add Raw Material', action: 'ACTION:open_add_ingredient' },
        ],
      },
      {
        id: 'categories_tree_and_duplicates',
        test: (n) =>
          n.includes('شجره') ||
          (n.includes('قسم') && (n.includes('رئيسي') || n.includes('فرعي') || n.includes('قسمين') || n.includes('تصنيف'))),
        contentAr:
          'شجرة الأقسام مرنة حتى ٣ مستويات (قسم رئيسي ← قسم فرعي ← تصنيف)، ولكل من المنتجات والخامات شجرتها المستقلة.\nكما يُسمح بتكرار نفس اسم الطبق في قسمين مختلفين (مثل شيش طاووق في «المشويات» وفي «الساندوتشات») ويُمنع فقط تكراره داخل نفس القسم.',
        contentEn:
          'Categories support 3 hierarchical levels independently for products and materials, allowing identical dish names across different categories while preventing duplicates within the same category.',
        actions: [
          { label: isAr ? 'شجرة الأقسام' : 'Categories Tree', action: 'NAV:categories' },
          { label: isAr ? 'قائمة المنتجات' : 'Products Catalog', action: 'NAV:products' },
        ],
      },
      {
        id: 'multi_unit_compound_stock',
        test: (n) =>
          n.includes('كرتون') ||
          n.includes('شكاره') ||
          n.includes('شيكاره') ||
          n.includes('وحدات') ||
          n.includes('وحدة') ||
          n.includes('مركب'),
        contentAr:
          'منظومة الوحدات تدعم سلسلة تعبئة من ٣ مستويات (مثلاً: كرتونة ← علبة ← جم أو مل) مع التحويل اللحظي تلقائياً.\nويُعرض الرصيد دائماً بصيغة مركبة واضحة مثل: «1 كرتونة و 10 علب و 500 مل» مع إمكانية إدخال الجرد بأي وحدة منها.',
        contentEn:
          'Multi-unit conversion supports 3 packaging tiers with instant base conversion and human-readable compound balances.',
        actions: [
          { label: isAr ? 'فتح الخامات والوحدات' : 'Open Inventory', action: 'NAV:inventory' },
          { label: isAr ? 'المخازن وكارت الصنف' : 'Warehouses', action: 'NAV:warehouses' },
        ],
      },
      {
        id: 'section_warehouse_pos_deduction',
        test: (n) =>
          (n.includes('بيخصم') || n.includes('خصم') || n.includes('تتخصم') || n.includes('بيتخصم')) &&
          (n.includes('مخزن') || n.includes('قسم') || n.includes('مطبخ') || n.includes('رئيسي') || n.includes('كاشير')),
        contentAr:
          'مبيعات الكاشير تُخصم تلقائياً من «مخزن القسم» المرتبط بمحطة التحضير (مخزن المطبخ لأطباق المطبخ، مخزن البار للمشروبات، مخزن المخبز للمخبوزات) وليس من المخزن الرئيسي.\nالمخزن الرئيسي يغذي الأقسام عبر دورة الطلبيات.',
        contentEn:
          'POS sales deduct automatically from the prep station’s Section Warehouse (Kitchen/Bar/Bakery), while Main Warehouse supplies sections via Requisitions.',
        actions: [
          { label: isAr ? 'المخازن وحركات الأصناف' : 'Warehouses & Stock', action: 'NAV:warehouses' },
          { label: isAr ? 'نقطة البيع' : 'POS', action: 'NAV:pos' },
        ],
      },
      {
        id: 'requisition_partial_rejection_in_transit',
        test: (n) =>
          !n.includes('جرد') &&
          !n.includes('تقديري') &&
          (n.includes('رفض') ||
            n.includes('طلبيه') ||
            n.includes('طلبية') ||
            n.includes('في الطريق') ||
            n.includes('امينا لمخزن') ||
            n.includes('امين المخزن')),
        contentAr:
          'دورة الطلبية محكمة بـ 4 مراحل:\n1. الشيف يطلب الكمية بتوقيعه ورصيد قسمه.\n2. أمين المخزن يعدّل الكمية المعتمدة ويصرفها فتدخل ذمة «في الطريق» ولا تدخل رصيد القسم بعد.\n3. الشيف يستلم الصنف، وإذا رفض كمية يكتب «سبب الرفض» إلزامياً فتعود الكمية المرفوضة تلقائياً للمخزن الرئيسي فوراً.\n4. يُطبع إذن الصرف والاستلام بالتوقيعات الثلاثية.',
        contentEn:
          'Requisitions follow 4 audited stages: Chef request, Storekeeper dispatch into In-Transit, Chef receipt with mandatory rejection reason (auto-returning rejected stock to Main), and 3-signature voucher print.',
        actions: [
          { label: isAr ? 'المخازن والطلبيات' : 'Warehouses & Requisitions', action: 'NAV:warehouses' },
        ],
      },
      {
        id: 'branch_and_central_kitchen_transfers',
        test: (n) =>
          (n.includes('تحويل') || n.includes('احول') || n.includes('انقل')) &&
          (n.includes('فرع') || n.includes('مطبخ مركزي') || n.includes('معادي')),
        contentAr:
          'لتحويل بضاعة من المخزن الرئيسي أو المطبخ المركزي إلى فرع آخر (مثل فرع المعادي)، استخدم تبويب الطلبيات والتحويلات في شاشة «المخازن» بنفس دورة الصرف والاستلام الموثقة، مع تسجيل الحركة في كارت الصنف لكل موقع.',
        contentEn:
          'Transfers between Main Warehouse / Central Kitchen and other branches use the same tracked Requisition & In-Transit workflow inside Warehouses.',
        actions: [
          { label: isAr ? 'المخازن والتحويلات' : 'Warehouses & Transfers', action: 'NAV:warehouses' },
        ],
      },
      {
        id: 'item_card_movement_ledger',
        test: (n) => n.includes('كارت الصنف') || n.includes('حركات الصنف') || n.includes('حركه علي') || n.includes('حركات الدقيق'),
        contentAr:
          'كارت الصنف يعرض تاريخ كل خامة بالتفصيل: الرصيد في كل فرع ومخزن، وسجل كل حركة (استلام مشتريات، صرف لطلبية، مبيعات كاشير، استهلاك عبر تجهيز، تسوية جرد، ومرتجع رفض) مع إمكانية الفلترة والطباعة.',
        contentEn:
          'Item Card shows warehouse balances and complete timestamped movement ledger with location/type filters and print sheet.',
        actions: [
          { label: isAr ? 'فتح المخازن وكارت الصنف' : 'Warehouses & Item Card', action: 'NAV:warehouses' },
          { label: isAr ? 'فتح كارت الصنف مباشرة' : 'Open Item Card', action: 'ACTION:open_item_card' },
        ],
      },
      {
        id: 'draft_vs_final_audit',
        test: (n) =>
          !n.includes('مصروف') &&
          !n.includes('مصاريف') &&
          (n.includes('تجريبي') || n.includes('اختباري') || n.includes('اقفل') || n.includes('اغلاق')) &&
          (n.includes('جرد') || n.includes('فتره') || n.includes('تسويه')),
        contentAr:
          'في شاشة «الجرد الفعلي» نوعان من الجرد:\n• جرد اختباري (تجريبي): يحسب الانحراف وتكلفة العجز بالجنيه للمعاينة دون تعديل الرصيد الفعلي.\n• إغلاق فعلي للفترة: يولّد قيود تسوية جردية في كارت الصنف ويحدّث رصيد المخزن ويقفل مصاريف نفس الشهر تلقائياً.',
        contentEn:
          'Physical Audit supports Draft previews (no ledger impact) and Official Period Close (creates stock adjustment entries and locks monthly overhead).',
        actions: [
          { label: isAr ? 'شاشة الجرد الفعلي' : 'Physical Audit', action: 'NAV:inventory_audit' },
        ],
      },
      {
        id: 'audit_estimated_balance_and_daily_breakdown',
        test: (n) =>
          n.includes('رصيد تقديري') ||
          n.includes('تقديري') ||
          n.includes('تفاصيل اليوم') ||
          n.includes('ترتيب الرفوف'),
        contentAr:
          'الرصيد التقديري في الجرد = (رصيد افتتاحي + المشتريات والمحول المستلم) - (المبيعات والتجهيزات والهالك المعتمد)، مع استبعاد كامل لبضاعة «في الطريق» حتى لا تشوّه الجرد.\nويمكنك الضغط على أي خامة لفتح نافذة «تفاصيل اليوم» ومراجعة حركات كل يوم وترتيب صفوف الرفوف.',
        contentEn:
          'Theoretical count excludes In-Transit stock and opens a Daily Breakdown modal per material alongside sortable shelf order.',
        actions: [
          { label: isAr ? 'فتح الجرد الفعلي' : 'Physical Audit', action: 'NAV:inventory_audit' },
        ],
      },
      {
        id: 'cashier_yellow_and_gray_availability',
        test: (n) =>
          !n.includes('مطبخ') &&
          !n.includes('kds') &&
          !n.includes('يوقف') &&
          (n.includes('اصفر') ||
            n.includes('رمادي') ||
            n.includes('قارب على النفاد') ||
            n.includes('خلص') ||
            n.includes('حد التنبيه')),
        contentAr:
          'في نقطة البيع تظهر الإتاحة بثلاث حالات:\n• طبيعي: متوفر بكميات كافية.\n• أصفر (قارب على النفاد): عندما يقل المتبقي عن حد التنبيه القابل للتخصيص لكل صنف (الافتراضي 5 حصص، ويمكن تغييره من كارت المنتج).\n• رمادي معطل: عند نفاد خامة أساسية أو إيقاف الشيف.\nأما العميل في منيو QR فيرى فقط «متاح» أو «غير متاح» دون أي تفاصيل داخلية.',
        contentEn:
          'POS buttons warn yellow below each item’s customizable low-stock portion threshold and disable gray when depleted; QR Menu shows available/unavailable only.',
        actions: [
          { label: isAr ? 'نقطة البيع' : 'POS', action: 'NAV:pos' },
          { label: isAr ? 'قائمة المنتجات' : 'Products', action: 'NAV:products' },
        ],
      },
      {
        id: 'daily_notes_and_unresolved_print',
        test: (n) => n.includes('ملاحظات') || n.includes('ملاحظه') || (n.includes('مشكله') && n.includes('طباع')),
        contentAr:
          'شاشة «الملاحظات اليومية» تسجل مشكلات التشغيل والجرد وتربط كل ملاحظة بالفرع والمخزن والخامة.\nيمكنك فتح «كارت الصنف» بضغطة من سطر الملاحظة، وعند الطباعة يظهر تنويه إلزامي بارز لـ «المشكلات غير المحلولة».',
        contentEn:
          'Daily Notes links issues to branch/material with 1-click Item Card lookup and prints a prominent banner for unresolved issues.',
        actions: [
          { label: isAr ? 'الملاحظات اليومية' : 'Daily Notes', action: 'NAV:daily_notes' },
        ],
      },
      {
        id: 'semi_finished_on_formula',
        test: (n) =>
          (n.includes('على الصيغه') || n.includes('تجهيز') || n.includes('عجين') || n.includes('صوص') || n.includes('مرينيه') || n.includes('مارينيه')) &&
          !n.includes('متبقي') &&
          !n.includes('اتبقي') &&
          !n.includes('باقي') &&
          !n.includes('دفعه') &&
          !n.includes('دفعات') &&
          !n.includes('حصه') &&
          !n.includes('مشتريات'),
        contentAr:
          'التجهيزات (عجين، صوصات، مارينيهات) تعمل افتراضياً بنمط «على الصيغة» بلا رصيد مخزني منفصل: عند بيع بيتزا أو طبق يستخدم تجهيزاً، يفكك النظام التجهيز آلياً إلى خاماته الأولية (دقيق، زيت، طماطم...) ويخصمها من مخزن القسم ويسجل «استهلاك عبر تجهيز» في كارت الصنف.',
        contentEn:
          'Preparations default to On-Formula mode with zero intermediate stock: selling a product decomposes the preparation into raw ingredients and deducts from section stock.',
        actions: [
          { label: isAr ? 'شاشة التجهيزات' : 'Preparations', action: 'NAV:semi_finished' },
        ],
      },
      {
        id: 'semi_finished_processing_cooking_factor',
        test: (n) =>
          n.includes('معامل الطبخ') ||
          n.includes('عامل الطبخ') ||
          n.includes('معالجه') ||
          n.includes('رز') ||
          n.includes('ارز') ||
          n.includes('نيء') ||
          n.includes('مطبوخ') ||
          n.includes('مسلوق'),
        contentAr:
          'للحالات التي يتضاعف وزنها أو ينكمش بالطهي (مثل 50 جم أرز نيء تنتج 100 جم أرز مسلوق)، اختر نوع التجهيز «معالجة» في شاشة التجهيزات وحدد وزن النيء والناتج المطبوخ، فيحسب النظام تلقائياً معامل التحويل ويخصم 50 جم نيء عند بيع بولة 100 جم.',
        contentEn:
          'Processing preparations track cooking yield factors (e.g., 50g raw rice -> 100g cooked rice) and auto-scale raw deduction accurately.',
        actions: [
          { label: isAr ? 'فتح التجهيزات' : 'Open Preparations', action: 'NAV:semi_finished' },
        ],
      },
      {
        id: 'semi_finished_named_portions',
        test: (n) =>
          (n.includes('حصه') || n.includes('حصص') || n.includes('كره') || n.includes('مغرفه')) &&
          (n.includes('تجهيز') || n.includes('عجين') || n.includes('بيتزا') || n.includes('صوص')),
        contentAr:
          'يمكن تقسيم أي تجهيز إلى «حصص مسماة» (مثلاً كرة بيتزا وسط 170 جم، كرة كبيرة 250 جم، مغرفة صوص 80 جم)، لتختار الحصة مباشرة داخل وصفة المنتج وتظهر تكلفتها بالجنيه تلقائياً.',
        contentEn:
          'Named portions divide a preparation batch into ready-to-pick recipe units (e.g., 170g or 250g dough ball) with auto-computed EGP cost.',
        actions: [
          { label: isAr ? 'شاشة التجهيزات' : 'Preparations', action: 'NAV:semi_finished' },
          { label: isAr ? 'الوصفات (رسبي)' : 'Recipes', action: 'NAV:menu' },
        ],
      },
      {
        id: 'semi_finished_optional_batches',
        test: (n) => n.includes('دفعه') || n.includes('دفعات'),
        contentAr:
          'عند تفعيل خيار «سجّل دفعات هذا التجهيز» يمكنك تسجيل دفعة تحضير مع تنبيه انحراف الناتج إن اختلف الفعلي عن المعياري.\nوإذا ألغيت تفعيل الدفعات لاحقاً، يعيد النظام التوازن المحاسبي للأرصدة المتبقية إلى خاماتها الأولية تلقائياً دون فقدان أي بيانات.',
        contentEn:
          'Optional batch tracking warns on batch yield variance and safely reconciles remaining stock back to raw materials if toggled off.',
        actions: [
          { label: isAr ? 'إدارة التجهيزات والدفعات' : 'Preparations & Batches', action: 'NAV:semi_finished' },
        ],
      },
      {
        id: 'prep_hidden_from_purchasing',
        test: (n) => (n.includes('تجهيز') || n.includes('تجهيزات')) && (n.includes('شراء') || n.includes('مشتريات') || n.includes('طلبيه')),
        contentAr:
          'التجهيزات تُحضّر داخل المنشأة ولا تُشترى من الموردين، لذلك يحجبها النظام تلقائياً عن شاشات المشتريات وأوامر التوريد وتبقى حصرية على الخامات القابلة للشراء فقط.',
        contentEn:
          'Preparations are blocked from purchasing screens and vendor POs so only purchasable raw materials appear.',
        actions: [
          { label: isAr ? 'المشتريات (خامات فقط)' : 'Purchasing', action: 'NAV:purchasing' },
          { label: isAr ? 'التجهيزات' : 'Preparations', action: 'NAV:semi_finished' },
        ],
      },
      {
        id: 'semi_finished_leftover_in_audit',
        test: (n) =>
          (n.includes('متبقي') || n.includes('اتبقي') || n.includes('باقي')) &&
          (n.includes('تجهيز') || n.includes('صوص') || n.includes('عجين') || n.includes('جرد')),
        contentAr:
          'إذا تبقى تجهيز محضر آخر اليوم وقت الجرد (مثل 5 كجم صوص بيتزا)، اضغط في شاشة «الجرد الفعلي» على زر «إدخال التجهيزات المتبقية»، فيعرض لك النظام معاينة فورية بتفكيكها إلى خامات ويضيفها لحساب الرصيد الفعلي (`extraSemiFinishedBase`).',
        contentEn:
          'Unconsumed preparations at stocktake are entered via "Remaining Preparations" inside Physical Audit, auto-decomposed into raw material equivalent (`extraSemiFinishedBase`).',
        actions: [
          { label: isAr ? 'الجرد الفعلي' : 'Physical Audit', action: 'NAV:inventory_audit' },
        ],
      },
      {
        id: 'price_change_impact_propagation',
        test: (n) =>
          (n.includes('غلي') || n.includes('اتغير') || n.includes('شوف الاثر') || n.includes('تعديل سعر')) &&
          (n.includes('خامه') || n.includes('سعر') || n.includes('دقيق') || n.includes('اطباق')),
        contentAr:
          'عند تعديل سعر شراء أي خامة يظهر لك تنبيه فوري «تعديل هذا السعر هيغيّر تكلفة X أطباق وتجهيزات» مع زر «شوف الأثر» لمعاينة الفارق بالجنيه قبل الحفظ.\nوبعد الحفظ تنتشر التكلفة تلقائياً إلى التجهيزات والمنتجات المستقبلية دون تعديل المبيعات التاريخية.',
        contentEn:
          'Editing a raw material price previews all affected preparations and dishes in real time before saving and propagates new costs forward cleanly.',
        actions: [
          { label: isAr ? 'الخامات والمخزون' : 'Inventory', action: 'NAV:inventory' },
          { label: isAr ? 'الوصفات (رسبي)' : 'Recipes', action: 'NAV:menu' },
        ],
      },
      {
        id: 'overhead_two_stage_allocation',
        test: (n) =>
          n.includes('ايجار') ||
          n.includes('كهربا') ||
          n.includes('غاز') ||
          n.includes('مشترك') ||
          n.includes('مرحلتين') ||
          n.includes('مصاريف وتوزيع') ||
          (n.includes('توزيع') && n.includes('مصاريف')),
        contentAr:
          'تحميل المصاريف المباشرة وغير المباشرة يتم على مرحلتين في شاشة «المصاريف وتوزيعها»:\n1. المرحلة ١ (مشترك ← مراكز التكلفة): توزيع مصاريف الإدارة والصالة (إيجار، كهرباء عامة) على المطبخ والبار والمخبز حسب المساحة أو عدد العاملين أو نسبة يدوية.\n2. المرحلة ٢ (مركز التكلفة ← المنتجات): تحميل مصاريف كل قسم على أطباقه حسب زمن التحضير أو المبيعات أو تكلفة الخامات أو بالتساوي.',
        contentEn:
          'Two-stage allocation routes shared expenses into operating centers (Stage 1), then onto individual dishes (Stage 2) by prep time, revenue, qty, raw cost, or manual split.',
        actions: [
          { label: isAr ? 'المصاريف وتوزيعها' : 'Overhead Allocation', action: 'NAV:overhead_allocation' },
        ],
      },
      {
        id: 'overhead_dedup_hr_finance_import',
        test: (n) =>
          (n.includes('رواتب') || n.includes('مرتبات') || n.includes('استيراد')) &&
          (n.includes('مرتين') || n.includes('تكرار') || n.includes('مالية') || n.includes('hr')),
        contentAr:
          'استيراد الرواتب من الموارد البشرية والمصاريف من المالية يربط كل بند بمعرّف فريد (`externalRefId`)؛ لذلك حتى لو ضغطت «استيراد» أكثر من مرة في نفس الشهر، يمنع النظام التكرار نهائياً ويستبعد مشتريات الخامات حتى لا تُحتسب مرتين.',
        contentEn:
          'HR & Finance import stamps each expense with a unique `externalRefId`, preventing duplicates across repeated imports and excluding raw material COGS.',
        actions: [
          { label: isAr ? 'المصاريف وتوزيعها' : 'Overhead Allocation', action: 'NAV:overhead_allocation' },
        ],
      },
      {
        id: 'overhead_month_lock_variance',
        test: (n) =>
          (n.includes('اقفل الشهر') || n.includes('قفل الشهر') || n.includes('شهر مقفل') || n.includes('بعد الاغلاق')) &&
          (n.includes('مصروف') || n.includes('تعديل') || n.includes('تحميل') || n.includes('فروق')),
        contentAr:
          'عند تنفيذ «إغلاق فعلي للفترة» من شاشة الجرد، يُقفل الشهر المحاسبي في المصاريف تلقائياً ويُمنع إضافة أو تعديل أو حذف مصاريفه، مع إظهار «معدل التحميل» الفعلي و«فروق التحميل» (تحميل زائد أو ناقص) مقارنة بالمقدّر.',
        contentEn:
          'Closing a period in Physical Audit automatically locks monthly overhead edits and calculates exact burden rates and absorption variances.',
        actions: [
          { label: isAr ? 'المصاريف وتوزيعها' : 'Overhead Allocation', action: 'NAV:overhead_allocation' },
          { label: isAr ? 'الجرد الفعلي' : 'Physical Audit', action: 'NAV:inventory_audit' },
        ],
      },
      {
        id: 'cost_simulation_what_if',
        test: (n) =>
          n.includes('لو غيرت') ||
          n.includes('محاكاه') ||
          n.includes('تجربه') ||
          n.includes('حاسبه التجربه') ||
          n.includes('غيرنا القاعده'),
        contentAr:
          'في «حاسبة التجربة» داخل شاشة مراقبة التكاليف يمكنك اختبار «لو غيّرت قاعدة التوزيع (مثلاً من المساحة إلى زمن التحضير) إيه اللي هيحصل لتكلفة كل منتج وربحه بالجنيه؟» دون تغيير بياناتك الفعلية المحفوظة.',
        contentEn:
          'Use the Experiment Calculator sandbox to test different allocation rules and supplier prices without modifying live data.',
        actions: [
          { label: isAr ? 'حاسبة التجربة' : 'Experiment Calculator', action: 'ACTION:simulation' },
          { label: isAr ? 'مراقبة التكاليف' : 'Cost Control', action: 'NAV:cost_control' },
        ],
      },
      {
        id: 'loss_making_products_after_overhead',
        test: (n) =>
          n.includes('خاسر') ||
          n.includes('بيخسر') ||
          n.includes('بعد التحميل') ||
          n.includes('ربحيه الاقسام'),
        contentAr:
          'تبويب «ربحية الأقسام والمنتجات» في شاشة المصاريف وتوزيعها يعرض ربح كل طبق قبل التحميل وبعد التحميل الكامل، ويضع شارة حمراء «خاسر بعد التحميل» على أي طبق يغطي خاماته لكنه يخسر بعد نصيبه من الإيجار والرواتب والكهرباء.',
        contentEn:
          'Department & Product Profitability highlights any dish whose margin turns negative once full direct & indirect overhead is absorbed.',
        actions: [
          { label: isAr ? 'ربحية الأقسام والمنتجات' : 'Overhead Profitability', action: 'NAV:overhead_allocation' },
          { label: isAr ? 'الوصفات (رسبي)' : 'Recipes', action: 'NAV:menu' },
        ],
      },
      {
        id: 'qr_menu_cost_privacy',
        test: (n) =>
          (n.includes('qr') || n.includes('كيو ار') || n.includes('منيو')) &&
          (n.includes('تكلفه') || n.includes('زبون') || n.includes('عميل') || n.includes('طاوله') || n.includes('خصوصيه')),
        contentAr:
          'منيو QR للعملاء معزول تماماً في البيانات: يرى الزبون فقط الصور والأسعار والمكونات الظاهرة وحالة الإتاحة (متاح / غير متاح)، ومستحيل وصول أي رقم عن تكلفة الخامات أو الوصفة أو الربح أو التنبيه الأصفر الداخلي.',
        contentEn:
          'The public QR Menu strips all recipe details, costs, margins, and internal yellow warnings—showing guests only items, photos, prices, and availability.',
        actions: [
          { label: isAr ? 'ملصقات QR للطاولات' : 'Table QRs', action: 'NAV:qr_tables' },
          { label: isAr ? 'إدارة المنيو والصور' : 'Menu & Visuals', action: 'NAV:menu_management' },
        ],
      },
      {
        id: 'kds_quick_toggle_availability',
        test: (n) =>
          (n.includes('مطبخ') || n.includes('شيف') || n.includes('kds') || n.includes('شاشه المطبخ')) &&
          (n.includes('يوقف') || n.includes('تبديل') || n.includes('اتاحه') || n.includes('خلصت')),
        contentAr:
          'من شاشة محطات المطبخ (KDS)، يستطيع الشيف أو رئيس المحطة بضغطة واحدة على زر «إتاحة الأصناف» إيقاف أو إعادة تشغيل أي صنف نفذت تحضيراته فينعكس فوراً في الكاشير ومنيو QR.',
        contentEn:
          'Inside Kitchen Display (KDS), chefs can toggle dish availability in one click, updating Cashier POS and QR Menu immediately.',
        actions: [
          { label: isAr ? 'شاشات المطبخ (KDS)' : 'Open KDS', action: 'NAV:kds' },
        ],
      },
      {
        id: 'security_pin_and_cashier_treasury',
        test: (n) =>
          n.includes('1234') ||
          n.includes('pin') ||
          n.includes('كود دخول') ||
          n.includes('خزينه') ||
          (n.includes('كاشير') && (n.includes('ورديه') || n.includes('باسورد') || n.includes('كلمه سر'))),
        contentAr:
          'تمنع المنظومة أي أكواد ثابتة مثل 1234؛ زر «تعيين PIN سريع» في أدوار المستخدمين يولّد رمزاً عشوائياً من 6 أرقام يظهر مرة واحدة ويُلزم الموظف بتغييره عند أول دخول.\nكما يرى الكاشير ورديته النشطة فقط في الخزينة ويُحجب عنه رصيد الخزينة العامة أو تعديل أي وردية مغلقة.',
        contentEn:
          'Static PINs like 1234 are prohibited. Managers issue one-time random 6-digit PINs with mandatory first-login change; cashiers see only their active shift drawer.',
        actions: [
          { label: isAr ? 'أدوار المستخدمين والصلاحيات' : 'User Roles & PINs', action: 'NAV:users_roles' },
          { label: isAr ? 'الخزينة والورديات' : 'Treasury & Shifts', action: 'NAV:treasury' },
        ],
      },
      {
        id: 'ui_inspector_and_error_log',
        test: (n) =>
          n.includes('فاحص') ||
          n.includes('موبايل') ||
          n.includes('فيض') ||
          n.includes('مقصوص') ||
          n.includes('اعطال') ||
          n.includes('سجل الاخطاء'),
        contentAr:
          'يمتلك المالك والمدير العام أدوات فحص مدمجة دون اتصال خارجي:\n• «فاحص الواجهة والموبايل»: يفحص الفيض الأفقي، مقاسات أزرار اللمس، ونقاء العربية في الشاشة الحالية أو كل الشاشات مع تصدير تقرير.\n• «غلاف الأخطاء وسجل الأخطاء»: يحمي أي شاشة من الانهيار الكامل ويحفظ تفاصيل العطل للنسخ والمراجعة.',
        contentEn:
          'Owners & GMs can use UI Inspector to scan screens for mobile overflow, touch sizes, and Arabic purity, alongside Error Boundary & Error Log.',
        actions: [
          { label: isAr ? 'فاحص الواجهة والموبايل' : 'Open UI Inspector', action: 'NAV:ui_inspector' },
          { label: isAr ? 'سجل الأخطاء' : 'Error Log', action: 'NAV:error_log' },
        ],
      },
      {
        id: 'backup_preview_repair_migration',
        test: (n) =>
          n.includes('نسخه احتياطيه') ||
          n.includes('استرجاع') ||
          n.includes('تالف') ||
          n.includes('اصلاح البيانات') ||
          n.includes('ترحيل'),
        contentAr:
          'في الإعدادات يمكنك تصدير نسخة احتياطية JSON كاملة موثقة بالبصمة والإصدار، وعند الاسترجاع يعرض النظام معاينة لأعداد السجلات قبل الاعتماد مع أخذ لقطة أمان تلقائية للتراجع إن حدث خطأ.\nكما يتوفر زر «فحص وإصلاح البيانات» لمعالجة أي نقص أو تلف محلي.',
        contentEn:
          'Settings offers full versioned JSON backup export, pre-restore preview with automatic rollback snapshot, and one-click Data Repair.',
        actions: [
          { label: isAr ? 'الإعدادات والنسخ الاحتياطي' : 'Settings & Backup', action: 'NAV:settings' },
        ],
      },
      {
        id: 'products_screen_and_duplicates_tool',
        test: (n) => n.includes('مكرر') || n.includes('مكرره') || n.includes('مكررين') || n.includes('دمج'),
        contentAr:
          'لمنع تكرار الأصناف استخدم شاشة «المنتجات» واضغط على أداة «فحص المكرر» فتجمع الأصناف المتطابقة وتتيح لك دمجها في سجل واحد نظيف.\nكما يتحول نموذج حفظ الوصفة تلقائياً لوضع التعديل بعد أول حفظ حتى لا يكرر الضغط السريع أي سجل.',
        contentEn:
          'Use the Duplicates Resolver inside Products to merge duplicate items, while Recipe save automatically switches to update mode to stop double-click duplicates.',
        actions: [
          { label: isAr ? 'قائمة المنتجات والمكرر' : 'Products Catalog', action: 'NAV:products' },
          { label: isAr ? 'الوصفات (رسبي)' : 'Recipes', action: 'NAV:menu' },
        ],
      },
      {
        id: 'arabic_numerals_and_egp_currency',
        test: (n) =>
          n.includes('لوحه المفاتيح') ||
          n.includes('مشرقيه') ||
          n.includes('١٢') ||
          n.includes('دولار') ||
          n.includes('جنيه') ||
          n.includes('ج.م'),
        contentAr:
          'العملة الافتراضية للمنشآت هي الجنيه المصري (`ج.م`) بلا أي علامة دولار في الواجهة العربية.\nوكل حقول الأرقام تقبل الكتابة السلسة بأرقام `0-9` أو الأرقام المشرقية `٠-٩` من لوحة مفاتيح الموبايل وتحوّلها تلقائياً دون أصفار عنيدة.',
        contentEn:
          'Currency defaults cleanly to EGP (`ج.م`) and all numeric fields smoothly accept mobile keyboard input including Eastern Arabic numerals.',
        actions: [
          { label: isAr ? 'إعدادات العملة والأرقام' : 'Settings', action: 'NAV:settings' },
        ],
      },
    ];

    // Special check for direct simulation / formula explanation before general intents when explicit
    if (norm.includes('لو غيرت') || norm.includes('محاكاه') || norm.includes('غيرنا القاعده') || norm.includes('حاسبه التجربه')) {
      const sim = intentMatches.find((m) => m.id === 'cost_simulation_what_if')!;
      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? sim.contentAr : sim.contentEn,
        contentAr: sim.contentAr,
        contentEn: sim.contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: sim.actions,
      };
    }

    // Check explicit cost/formula explanation (keeps existing test 3 passing)
    if (
      norm.includes('ليه تكلفه') ||
      norm.includes('حساب التكلفه') ||
      norm.includes('ازاي بتحسب') ||
      norm.includes('how to calculate cost')
    ) {
      const contentAr = `معادلة التكلفة الكاملة في تايجوس تجمع خمسة عناصر أساسية:\n\n1. المكونات الصافية من خامات وتجهيزات (بعد احتساب هالك التشفية).\n2. عمالة مباشرة (موزعة حسب زمن التحضير أو القاعدة المختارة).\n3. مصاريف غير مباشرة (إيجار، كهرباء، غاز، صيانة، إهلاك) موزعة على مرحلتين: مشترك ← مراكز التكلفة ← المنتجات.\n4. مستهلكات التقديم والتغليف.\n\nكما يُحسب «معدل التحميل» للوحدة و«فروق التحميل» (زائد أو ناقص) عند إغلاق الفترة.`;
      const contentEn = `True & Full Cost in Tygos combines Raw + Preparations + Direct Labor + Two-Stage Indirect Overhead + Consumables, plus burden rate and absorption variance at period close.`;

      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? contentAr : contentEn,
        contentAr,
        contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: isAr ? 'المصاريف وتوزيعها' : 'Overhead Allocation', action: 'NAV:overhead_allocation' },
          { label: isAr ? 'الوصفات (رسبي)' : 'Open Recipes', action: 'NAV:menu' },
          { label: isAr ? 'تحليل الانحراف والهدر' : 'Variance Analytics', action: 'NAV:cost_control' },
        ],
        detailedExplanation: {
          titleAr: 'معادلة التكلفة الكاملة المعتمدة',
          titleEn: 'Approved Full Cost Formula',
          bodyAr: 'التكلفة الكاملة = خامات + تجهيزات + عمالة مباشرة + مصاريف غير مباشرة + مستهلكات.\nالسعر المقترح = التكلفة ÷ (1 - الهامش المستهدف).',
          bodyEn: 'Full Cost = Raw + Prep + Direct Labor + Indirect Overhead + Consumables.\nTarget Price = Cost / (1 - Target Margin %).',
        },
      };
    }

    const matchedFaq = intentMatches.find((item) => item.test(norm));
    if (matchedFaq) {
      const validActionIds = new Set(SCREEN_REGISTRY.map((s) => `NAV:${s.viewId}`));
      const safeActions = matchedFaq.actions.filter(
        (a) => a.action.startsWith('ACTION:') || validActionIds.has(a.action)
      );
      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? matchedFaq.contentAr : matchedFaq.contentEn,
        contentAr: matchedFaq.contentAr,
        contentEn: matchedFaq.contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: safeActions,
      };
    }

    // 4. Dynamic Screen Discovery from Central SCREEN_REGISTRY
    const matchedScreens = findMatchingScreens(userQuery, context.userRole);

    if (matchedScreens.length > 0) {
      const screen = matchedScreens[0];

      const stepsListAr = screen.commonStepsAr.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
      const stepsListEn = screen.commonStepsEn.map((s, idx) => `${idx + 1}. ${s}`).join('\n');

      const contentAr = `إليك كيفية الوصول والعمل على [${screen.nameAr}]:\n\n${stepsListAr}`;
      const contentEn = `Here is how to operate [${screen.nameEn}]:\n\n${stepsListEn}`;

      const suggestedActions: AssistantSuggestedAction[] = [
        {
          label: isAr ? `الانتقال إلى ${screen.shortLabelAr}` : `Go to ${screen.shortLabelEn}`,
          action: `NAV:${screen.viewId}`,
        },
        ...screen.quickActions.map((qa) => ({
          label: isAr ? qa.labelAr : qa.labelEn,
          action: qa.actionCode,
        })),
      ];

      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? contentAr : contentEn,
        contentAr,
        contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: suggestedActions.slice(0, 3),
      };
    }

    // 5. Friendly General Fallback
    const contentAr = `أنا معك في كل خطوة بتشغيل المنشأة.\n\nيمكنك أن تسألني عن كيفية إضافة خامة، إعداد وصفة أو تجهيز، إغلاق وردية الكاشير، أو مقارنة الاستهلاك النظري بالفعلي لكشف الهدر.`;
    const contentEn = `I am here to guide your operations.\n\nAsk me how to add ingredients, build recipes, close cashier shifts, or audit theoretical vs actual food cost variance.`;

    return {
      id: `msg-${Date.now()}`,
      sender: 'tygos_ai',
      content: isAr ? contentAr : contentEn,
      contentAr,
      contentEn,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: this.getProactiveSuggestions(context, isAr),
    };
  }
}

export const localAssistantEngine = new LocalAssistantEngine();
