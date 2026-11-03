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
        label: isAr ? `أكمل وصفة [${p.nameAr}]` : `Complete BOM for [${p.nameEn}]`,
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
      const contentAr = `فتحت لك معالج بناء الصنف والوصفة (BOM) بثلاث خطوات لحساب التكلفة الحقيقية تلقائياً.`;
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

    if (norm.includes('اكسيل') || norm.includes('استيراد') || norm.includes('excel') || norm.includes('import')) {
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

    // 3. Explanation of Calculation Formulas ("ليه تكلفة كذا؟" / "إزاي بتحسبوا الهالك؟")
    if (norm.includes('ليه تكلفه') || norm.includes('حساب التكلفه') || norm.includes('ازاي بتحسب') || norm.includes('how to calculate cost')) {
      const contentAr = `معادلة التكلفة الحقيقية في تايجوس لا تقتصر على سعر الشراء فقط، بل تجمع:\n\n1. تكلفة المكونات الصافية.\n2. هالك التشفية والتقشير الممتص (Yield Waste Buffer).\n3. وقت التحضير الفعلي مضروباً بأجر دقيقة العمالة.\n4. حصة الطبق من استهلاك الغاز والكهرباء والمياه.\n5. مستهلكات التقديم والتغليف.\n\nبهذه الطريقة، تسعّر أطباقك على أساس ربح صافٍ حقيقي لا يتآكل نهاية الشهر.`;
      const contentEn = `True Cost in Tygos calculates beyond raw purchase cost:\n\n1. Net Raw Materials.\n2. Yield Waste Loss Buffer.\n3. Direct prep labor minutes × hourly wage.\n4. Allocated utilities (gas, power, water).\n5. Packaging and consumables.\n\nThis ensures healthy gross margins without end-of-month surprises.`;

      return {
        id: `msg-${Date.now()}`,
        sender: 'tygos_ai',
        content: isAr ? contentAr : contentEn,
        contentAr,
        contentEn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedActions: [
          { label: isAr ? 'فتح هندسة الوصفات' : 'Open Recipe BOM', action: 'NAV:menu' },
          { label: isAr ? 'تحليل الانحراف والهدر' : 'Variance Analytics', action: 'NAV:cost_control' },
        ],
        detailedExplanation: {
          titleAr: 'المعادلة الرياضية المعتمدة',
          titleEn: 'Approved Mathematical Formula',
          bodyAr: 'التكلفة الشاملة = الخامات + الهالك + العمالة المباشرة + المنافع + المستهلكات.\nالسعر المقترح = التكلفة ÷ (1 - الهامش المستهدف).',
          bodyEn: 'True Cost = Raw + Yield Waste + Direct Labor + Utilities + Packaging.\nTarget Price = True Cost / (1 - Target Margin %).',
        },
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
    const contentAr = `أنا معك في كل خطوة بتشغيل المنشأة.\n\nيمكنك أن تسألني عن كيفية إضافة خامة، تركيب وصفة (BOM)، إغلاق وردية الكاشير (Z-Report)، أو مقارنة الاستهلاك النظري بالفعلي لكشف الهدر.`;
    const contentEn = `I am here to guide your operations.\n\nAsk me how to add ingredients, engineer recipe BOMs, close cashier shifts with Z-Reports, or audit theoretical vs actual food cost variance.`;

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
