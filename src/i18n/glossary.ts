/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UNIFIED GLOSSARY & SIMPLIFIED TERMINOLOGY (Phase 8 - Section 4)
 * Single source of truth for screen names (2-3 simple words),
 * polite Egyptian Arabic 1-line descriptions, English equivalents,
 * and plain-Arabic translations for technical statuses.
 */

export interface GlossaryEntry {
  id: string;
  titleAr: string;
  subtitleAr: string;
  titleEn: string;
  subtitleEn: string;
}

export const SCREEN_GLOSSARY: Record<string, GlossaryEntry> = {
  dashboard: {
    id: 'dashboard',
    titleAr: 'الرئيسية',
    subtitleAr: 'ملخص سريع لحركة مطعمك النهاردة',
    titleEn: 'Home',
    subtitleEn: 'Quick overview of today’s operations',
  },
  pos: {
    id: 'pos',
    titleAr: 'نقطة البيع',
    subtitleAr: 'تسجيل الطلبات وفتح الوردية والتحصيل السريع',
    titleEn: 'Point of Sale',
    subtitleEn: 'Take orders, manage shifts, and collect payments',
  },
  kds: {
    id: 'kds',
    titleAr: 'شاشات المطبخ',
    subtitleAr: 'متابعة تجهيز الطلبات في المطبخ والبار أول بأول',
    titleEn: 'Kitchen Display',
    subtitleEn: 'Live order preparation across kitchen and bar stations',
  },
  tables_management: {
    id: 'tables_management',
    titleAr: 'إدارة الطاولات',
    subtitleAr: 'ترتيب الصالات وحجز الطاولات وروابط الطلب',
    titleEn: 'Tables & Zones',
    subtitleEn: 'Manage dining zones, reservations, and table links',
  },
  order_trace: {
    id: 'order_trace',
    titleAr: 'تتبّع الطلبات',
    subtitleAr: 'شوف رحلة أي طلب من الكاشير للمطبخ للخزينة',
    titleEn: 'Order Trace',
    subtitleEn: 'Follow any order from cashier to kitchen and treasury',
  },
  menu_management: {
    id: 'menu_management',
    titleAr: 'إدارة المنيو',
    subtitleAr: 'تعديل الأصناف والأسعار والصور في المنيو الإلكتروني',
    titleEn: 'Menu Management',
    subtitleEn: 'Edit items, prices, and photos for the digital menu',
  },
  qr_tables: {
    id: 'qr_tables',
    titleAr: 'ملصقات الطاولات',
    subtitleAr: 'طباعة رموز المسح السريع لكل طاولة بضغطة واحدة',
    titleEn: 'Table QR Stickers',
    subtitleEn: 'Print scannable QR stickers for every table',
  },
  menu: {
    id: 'menu',
    titleAr: 'الوصفات (رسبي)',
    subtitleAr: 'بوابة كل منتجات المنشأة وحساب التكلفة الحقيقية للوصفة',
    titleEn: 'Recipes (BOM)',
    subtitleEn: 'Recipe gateway for all dishes, drinks, and true cost calculations',
  },
  products: {
    id: 'products',
    titleAr: 'المنتجات',
    subtitleAr: 'استعراض كل المنتجات مرتبة حسب شجرة الأقسام وحالة البيع',
    titleEn: 'Products',
    subtitleEn: 'Catalog of all products grouped by category and sales status',
  },
  categories: {
    id: 'categories',
    titleAr: 'الأقسام',
    subtitleAr: 'إدارة شجرة أقسام المنتجات والخامات والمستويات الفرعية',
    titleEn: 'Categories',
    subtitleEn: 'Manage product and material category trees and sub-levels',
  },
  cost_control: {
    id: 'cost_control',
    titleAr: 'مراقبة التكاليف',
    subtitleAr: 'متابعة هوامش الربح والفرق بين الصرف الفعلي والمفروض',
    titleEn: 'Cost Control',
    subtitleEn: 'Track profit margins and actual vs expected ingredient usage',
  },
  inventory: {
    id: 'inventory',
    titleAr: 'الخامات والمخزون',
    subtitleAr: 'متابعة أرصدة الخامات وتنبيهات قرب النفاد والجرد',
    titleEn: 'Raw Materials & Stock',
    subtitleEn: 'Track raw material stock, low-stock alerts, and counts',
  },
  purchasing: {
    id: 'purchasing',
    titleAr: 'النواقص والتوريد',
    subtitleAr: 'تسجيل فواتير الشراء وطلب النواقص من الموردين',
    titleEn: 'Suppliers & Purchasing',
    subtitleEn: 'Record purchase invoices and restock orders from suppliers',
  },
  treasury: {
    id: 'treasury',
    titleAr: 'الخزينة والورديات',
    subtitleAr: 'متابعة رصيد الخزينة وتوريد النقدية وتقارير الإغلاق',
    titleEn: 'Treasury & Shifts',
    subtitleEn: 'Track treasury balance, shift deposits, and Z-Reports',
  },
  finance: {
    id: 'finance',
    titleAr: 'الحسابات والأرباح',
    subtitleAr: 'ملخص الإيرادات والمصروفات وصافي الربح والقيود',
    titleEn: 'Finance & Profit',
    subtitleEn: 'Summary of revenue, expenses, net profit, and ledger',
  },
  tax: {
    id: 'tax',
    titleAr: 'الضرائب والفواتير',
    subtitleAr: 'حساب ضريبة القيمة المضافة وتجهيز الفواتير الضريبية',
    titleEn: 'Taxes & Invoices',
    subtitleEn: 'Calculate VAT and prepare tax-compliant invoices',
  },
  hr: {
    id: 'hr',
    titleAr: 'الموظفون والرواتب',
    subtitleAr: 'إدارة فريق العمل والحضور وتكلفة العمالة',
    titleEn: 'Staff & Payroll',
    subtitleEn: 'Manage staff, attendance, and labor cost',
  },
  crm: {
    id: 'crm',
    titleAr: 'العملاء والولاء',
    subtitleAr: 'بيانات عملائك وسجل طلباتهم ونقاط المكافآت',
    titleEn: 'Customers & Loyalty',
    subtitleEn: 'Customer profiles, order history, and loyalty points',
  },
  chat: {
    id: 'chat',
    titleAr: 'محادثة الفريق',
    subtitleAr: 'تواصل سريع بين الكاشير والمطبخ والإدارة',
    titleEn: 'Team Chat',
    subtitleEn: 'Quick messaging between cashier, kitchen, and management',
  },
  health: {
    id: 'health',
    titleAr: 'حالة النظام',
    subtitleAr: 'التأكد من سلامة الحفظ المحلي وسرعة الأداء',
    titleEn: 'System Status',
    subtitleEn: 'Check local storage health and app performance',
  },
  settings: {
    id: 'settings',
    titleAr: 'الإعدادات',
    subtitleAr: 'ضبط العملة والضريبة وبيانات منشأتك',
    titleEn: 'Settings',
    subtitleEn: 'Configure currency, tax rates, and venue details',
  },
  audit_log: {
    id: 'audit_log',
    titleAr: 'سجل العمليات',
    subtitleAr: 'مين عمل إيه ومتى، ولا يمكن تعديله',
    titleEn: 'Activity Log',
    subtitleEn: 'Who did what and when, tamper-evident',
  },
  what_if: {
    id: 'what_if',
    titleAr: 'حاسبة التجربة',
    subtitleAr: 'شوف أثر تغيير السعر أو الكمية على ربحك قبل ما تغيّر فعلاً',
    titleEn: 'What-If Calculator',
    subtitleEn: 'Preview price or quantity changes on your profit first',
  },
  privileged_access: {
    id: 'privileged_access',
    titleAr: 'طلب صلاحية مؤقتة',
    subtitleAr: 'موافقة المدير لفتح شاشة أو إجراء حساس',
    titleEn: 'Temporary Access',
    subtitleEn: 'Manager approval for sensitive actions',
  },
  users_roles: {
    id: 'users_roles',
    titleAr: 'أدوار المستخدمين',
    subtitleAr: 'تحديد أدوار الموظفين والشاشات المسموح بها',
    titleEn: 'User Roles',
    subtitleEn: 'Manage staff roles and permitted screens',
  },
  super_admin: {
    id: 'super_admin',
    titleAr: 'إدارة المنشآت',
    subtitleAr: 'متابعة جميع الفروع والمنشآت المسجلة',
    titleEn: 'Venues Admin',
    subtitleEn: 'Manage all registered venues and branches',
  },
};

export interface JourneyStepGlossary {
  stepNumber: number;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  targetView: string;
}

export const ORDER_JOURNEY_STEPS: JourneyStepGlossary[] = [
  { stepNumber: 1, titleAr: 'الخامات', titleEn: 'Raw Materials', descAr: 'سجّل ما تشتريه (اسم، وحدة، سعر)', descEn: 'Record what you purchase (name, unit, price)', targetView: 'inventory' },
  { stepNumber: 2, titleAr: 'المنتجات', titleEn: 'Products', descAr: 'قائمة كل الأصناف حسب شجرة الأقسام', descEn: 'Browse all products by category tree', targetView: 'products' },
  { stepNumber: 3, titleAr: 'الوصفة', titleEn: 'Recipe', descAr: 'حدد مكونات الطبق وكمياتها من الخامات', descEn: 'Set recipe ingredient quantities from stock', targetView: 'menu' },
  { stepNumber: 4, titleAr: 'السعر والربح', titleEn: 'Price & Profit', descAr: 'يظهر التكلفة والربح وسعر البيع المقترح', descEn: 'View true cost, profit, and suggested price', targetView: 'menu' },
  { stepNumber: 5, titleAr: 'عرضه للبيع', titleEn: 'Ready for Sale', descAr: 'يظهر في الكاشير والمنيو بعد التأكيد', descEn: 'Available in POS and Menu after confirmation', targetView: 'products' },
  { stepNumber: 6, titleAr: 'البيع', titleEn: 'POS Sale', descAr: 'يخصم من الخامات ويسجل الإيراد', descEn: 'Depletes stock and records revenue', targetView: 'pos' },
  { stepNumber: 7, titleAr: 'المتابعة', titleEn: 'Track & Profits', descAr: 'تقارير الأرباح والمخزون المتبقي', descEn: 'Profit reports and remaining stock overview', targetView: 'finance' },
];

/**
 * Translates technical status codes into clear Arabic/English labels.
 */
export function translateTechnicalStatus(code: string, isAr: boolean): string {
  const map: Record<string, { ar: string; en: string }> = {
    CLOSED_NO_ACTION: { ar: 'أُغلق دون إجراء', en: 'Closed Without Action' },
    OPEN_INVESTIGATION: { ar: 'قيد المراجعة', en: 'Under Review' },
    RESOLVED_WARNING: { ar: 'تم التنبيه', en: 'Warning Issued' },
    RECIPE_VERSION_CREATE: { ar: 'تحديث وصفة', en: 'Recipe Updated' },
    ACCESS_ESCALATION_REQUEST: { ar: 'طلب صلاحية مؤقتة', en: 'Access Request' },
    ACCESS_ESCALATION_APPROVE: { ar: 'موافقة على صلاحية', en: 'Access Approved' },
    ACCESS_ESCALATION_REJECT: { ar: 'رفض طلب صلاحية', en: 'Access Rejected' },
    HR_SENSITIVE_DATA_ATTEMPT: { ar: 'محاولة عرض بيانات حساسة', en: 'Sensitive Data Access' },
    INVENTORY_ADJUSTMENT: { ar: 'تسوية مخزون', en: 'Stock Adjustment' },
  };

  const normalized = code.toUpperCase();
  if (map[normalized]) {
    return isAr ? map[normalized].ar : map[normalized].en;
  }
  if (normalized.startsWith('HR-SEC-')) {
    const num = normalized.split('-').pop()?.replace(/^0+/, '') || '1';
    return isAr ? `بلاغ رقم ${num}` : `Report #${num}`;
  }
  return code;
}

export function getScreenTitle(viewId: string, isAr: boolean): string {
  const entry = SCREEN_GLOSSARY[viewId];
  if (!entry) return viewId;
  return isAr ? entry.titleAr : entry.titleEn;
}

export function getScreenSubtitle(viewId: string, isAr: boolean): string {
  const entry = SCREEN_GLOSSARY[viewId];
  if (!entry) return '';
  return isAr ? entry.subtitleAr : entry.subtitleEn;
}

export function getDefaultViewsForRole(role: string): string[] {
  switch (role) {
    case 'super_admin':
      return [
        'super_admin', 'dashboard', 'pos', 'kds', 'tables_management', 'order_trace',
        'menu_management', 'qr_tables', 'products', 'categories', 'menu', 'cost_control', 'inventory', 'purchasing',
        'treasury', 'finance', 'tax', 'hr', 'crm', 'chat', 'health', 'settings', 'users_roles'
      ];
    case 'tenant_admin':
      return [
        'dashboard', 'pos', 'kds', 'tables_management', 'order_trace',
        'menu_management', 'qr_tables', 'products', 'categories', 'menu', 'cost_control', 'inventory', 'purchasing',
        'treasury', 'finance', 'tax', 'hr', 'crm', 'chat', 'health', 'settings', 'users_roles'
      ];
    case 'general_manager':
      return [
        'dashboard', 'pos', 'kds', 'tables_management', 'order_trace',
        'menu_management', 'qr_tables', 'products', 'categories', 'menu', 'cost_control', 'inventory', 'purchasing',
        'treasury', 'finance', 'hr', 'crm', 'chat', 'health', 'users_roles'
      ];
    case 'financial_manager':
      return [
        'dashboard', 'order_trace', 'categories', 'cost_control', 'purchasing',
        'treasury', 'finance', 'tax', 'crm', 'chat', 'health', 'users_roles'
      ];
    case 'cashier':
      return ['pos', 'tables_management', 'kds', 'order_trace', 'qr_tables', 'products', 'treasury', 'crm', 'chat'];
    case 'waiter':
      return ['pos', 'tables_management', 'products', 'crm', 'chat'];
    case 'kitchen_manager':
      return ['kds', 'products', 'menu', 'inventory', 'chat'];
    case 'bar_manager':
      return ['kds', 'products', 'menu', 'inventory', 'chat'];
    case 'store_manager':
      return ['inventory', 'categories', 'purchasing', 'dashboard', 'chat'];
    case 'cost_accountant':
      return ['dashboard', 'products', 'categories', 'menu', 'cost_control', 'inventory', 'finance', 'chat'];
    case 'financial_accountant':
      return ['dashboard', 'purchasing', 'treasury', 'finance', 'tax', 'chat'];
    case 'tax_accountant':
      return ['tax', 'finance', 'chat'];
    case 'hr_manager':
      return ['hr', 'chat'];
    case 'marketing_officer':
      return ['menu_management', 'qr_tables', 'crm', 'chat'];
    case 'public_relations':
      return ['crm', 'tables_management', 'chat'];
    default:
      return ['pos', 'chat'];
  }
}
