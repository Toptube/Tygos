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
    id: 'semi_finished_and_overhead',
    titleAr: 'التجهيزات والتحضيرات + التكلفة الكاملة على مرحلتين',
    titleEn: 'Semi-Finished Preparations & Two-Stage Overhead Costing',
    descAr: 'احسب عجينة البيتزا والصوصات والأرز المسلوق بعامل الطبخ، ووزّع الإيجار والكهرباء والرواتب على الأطباق لتعرف كل طبق كسبان ولا خاسر بالجنيه.',
    descEn: 'Track doughs, sauces, and cooking conversions, and allocate overhead from shared & operating centers to expose true product profit in EGP.',
    date: 'نوفمبر 2026',
    badge: 'جديد',
    actionCode: 'NAV:semi_finished',
  },
  {
    id: 'qr_menu_phase5',
    titleAr: 'المنيو الإلكتروني بالـ QR وتوزيع الطلبات على المحطات',
    titleEn: 'Digital QR Menu & Instant Station Routing',
    descAr: 'زبونك يمسح الكود ويطلب من موبايله في ثواني، مع شاشات مطبخ (KDS) وإخفاء الأصناف النافدة تلقائياً دون تسريب أي أرقام تكلفة.',
    descEn: 'Guests scan and order from their phones in seconds with KDS routing, auto out-of-stock hiding, and strict recipe/cost privacy.',
    date: 'نوفمبر 2026',
    badge: 'جديد',
    actionCode: 'NAV:qr_tables',
  },
  {
    id: 'warehouses_audit_cycle',
    titleAr: 'مخازن الأقسام وكارت الصنف والجرد الفعلي',
    titleEn: 'Section Warehouses, Item Card & Physical Stocktake',
    descAr: 'سلاسل تعبئة مرنة، طلبيات بدورة «في الطريق» والرفض المسبب، وجرد اختباري وإغلاق فعلي يكشف العجز والانحراف لحظياً.',
    descEn: 'Flexible unit packs, in-transit requisitions with reasoned rejections, and draft vs closed audits exposing real variance instantly.',
    date: 'نوفمبر 2026',
    actionCode: 'NAV:inventory_audit',
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
