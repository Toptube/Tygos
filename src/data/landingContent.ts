/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TYGOS MARKETING & LANDING PAGE CONTENT REPOSITORY
 * Structured, easily updated, polite human Egyptian/Modern Standard Arabic and professional English marketing copy.
 */

import { getAllScreens, ScreenDefinition } from '../services/screenRegistry.ts';

export interface WhatsNewItem {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  date: string;
  badge?: string;
  actionCode?: string;
}

export const staticWhatsNewItems: WhatsNewItem[] = [
  {
    id: 'qr_menu_phase5',
    titleAr: 'المنيو الإلكتروني بالـ QR وتوزيع الطلبات',
    titleEn: 'Digital QR Menu & Instant Kitchen Routing',
    descAr: 'زبونك يمسح الكود ويطلب من موبايله في ثواني، والطلب يتقسم فوراً على شاشات المطبخ والبار والمشاوي بدون أي لخبطة.',
    descEn: 'Guests scan and order from their phones in seconds; items split automatically to kitchen, bar, and grill stations.',
    date: 'نوفمبر 2026',
    badge: 'جديد',
    actionCode: 'NAV:qr_manager',
  },
  {
    id: 'effortless_entry',
    titleAr: 'إضافة الخامات في دقيقة وبناء الوصفات الذكي',
    titleEn: '1-Minute Ingredients & Smart Recipe Builder',
    descAr: 'سجّل خامتك مع نسبة الهالك بضغطة زر، وركّب وصفتك وشوف تكلفة الطبق الصافية وهامش ربحك قبل ما تبدأ بيع.',
    descEn: 'Log raw materials with trim waste in a tap, construct recipes, and see net portion costs and margins before selling.',
    date: 'أكتوبر 2026',
    actionCode: 'ACTION:open_add_ingredient',
  },
  {
    id: 'voice_navigator',
    titleAr: 'التنقل بالأوامر الصوتية الذكية',
    titleEn: 'Hands-Free Voice Navigation',
    descAr: 'قول بصوتك "افتح الكاشير" أو "أضف خامة"، والمنظومة هتوصلك للشاشة في نفس اللحظة بدون ما تدوّر.',
    descEn: 'Simply say "Open POS" or "Add ingredient" to navigate directly without searching through menus.',
    date: 'أكتوبر 2026',
  },
];

/**
 * Returns merged What's New items:
 * Curated announcements + automatically pulled items from registered screens.
 */
export function getMergedWhatsNew(): WhatsNewItem[] {
  const merged = [...staticWhatsNewItems];
  const allScreens = getAllScreens();

  // Find recent notable screens not yet explicitly listed
  const notableScreens = allScreens.filter(
    (s: ScreenDefinition) => s.id === 'kds' || s.id === 'menu_management'
  );

  for (const s of notableScreens) {
    if (!merged.some((m) => m.id === s.id)) {
      merged.push({
        id: s.id,
        titleAr: s.nameAr,
        titleEn: s.nameEn,
        descAr: s.descriptionAr,
        descEn: s.descriptionEn,
        date: 'نوفمبر 2026',
        actionCode: `NAV:${s.viewId}`,
      });
    }
  }

  return merged;
}

export const qrMenuMarketingSection = {
  headlineAr: 'خلّي زبونك يطلب بموبايله، والطلب يوصل المطبخ في ثانية',
  headlineEn: 'Let Guests Order From Their Phones, Orders Reach the Kitchen Instantly',
  subheadAr: 'منيو إلكتروني فخم وسريع برمز QR لكل طاولة، بدون ما العميل ينزل أي تطبيق وبدون انتظار الويتر في أوقات الذروة.',
  subheadEn: 'Fast, elegant QR menu for each table. No app download required, eliminating guest wait times during peak rush hours.',
  features: [
    {
      titleAr: 'ملصق QR مخصص لكل طاولة',
      titleEn: 'Dedicated QR for Every Table',
      descAr: 'اطبع ملصقات بشعار مطعمك ورقم الطاولة الجاهز، العميل يمسح الكود يلاقي رقم طاولته مكتوب تلقائياً.',
      descEn: 'Print branded table tents with pre-filled table numbers for effortless, mistake-free ordering.',
    },
    {
      titleAr: 'توزيع فوري على محطات التحضير (KDS)',
      titleEn: 'Instant Station Ticket Splitting',
      descAr: 'الكاشير يوافق بنقرة واحدة، والمشروبات تروح شاشة البار، والمشاوي تروح للمطبخ الساخن، مع إشعار صوتي واضح.',
      descEn: 'Cashier approves with one tap; drinks route to the bar and steaks route to the grill screen with audio alerts.',
    },
    {
      titleAr: 'دعم الصالة والتيك أواي والدليفري',
      titleEn: 'Dine-in, Takeaway & Delivery',
      descAr: 'المنيو شغال معاك سواء زبون قاعد على الطاولة، أو بيتصل يطلب دليفري على البيت، أو مستني يستلم طلبه بنفسه.',
      descEn: 'Universal menu works for seated dine-in guests, home delivery orders, and takeaway pickups alike.',
    },
    {
      titleAr: 'أمان وخصوصية كاملة للتكاليف',
      titleEn: 'Total Cost Privacy',
      descAr: 'المنيو العام بيعرض للزبون الصور والأسعار والمكونات الشهية بس، ومستحيل يتسرب أي رقم عن تكلفة خاماتك أو هامش أرباحك.',
      descEn: 'Public menu displays only appetizing photos, descriptions, and prices. Zero recipe costs or margins are ever exposed.',
    },
  ],
};
