/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * CENTRAL SCREEN & CAPABILITY REGISTRY
 * Single source of truth for all modules, screens, and workflows in TYGOS.
 * Directly consumed by:
 * 1. TYGOS AI Assistant (zero-code automatic discovery of any new screen)
 * 2. Voice Command Navigator (SpeechRecognition)
 * 3. Global Search & Command Palette (⌘K)
 * 4. Guided Tour and SOP Documentation Help Center
 */

import { UserRole } from '../types/index.ts';
import { SCREEN_GLOSSARY } from '../i18n/glossary.ts';

export interface ScreenQuickAction {
  id: string;
  labelAr: string;
  labelEn: string;
  actionCode: string; // e.g. "NAV:pos", "ACTION:open_add_ingredient", "ACTION:open_add_product"
}

export interface ScreenDefinition {
  id: string;
  viewId: string;
  category: 'operations' | 'cost_engineering' | 'inventory_supply' | 'finance_tax' | 'human_resources' | 'system';
  nameAr: string;
  nameEn: string;
  shortLabelAr: string;
  shortLabelEn: string;
  descriptionAr: string;
  descriptionEn: string;
  iconName: string;
  allowedRoles: UserRole[];
  keywordsAr: string[];
  keywordsEn: string[];
  commonStepsAr: string[];
  commonStepsEn: string[];
  quickActions: ScreenQuickAction[];
}

const RAW_SCREEN_REGISTRY: ScreenDefinition[] = [
  {
    id: 'dashboard',
    viewId: 'dashboard',
    category: 'operations',
    nameAr: 'لوحة التحكم والمؤشرات التنفيذية',
    nameEn: 'Executive Dashboard & Intelligence',
    shortLabelAr: 'لوحة التحكم',
    shortLabelEn: 'Dashboard',
    descriptionAr: 'نظرة شاملة ومباشرة على المبيعات، نسب تكلفة الطعام، تنبيهات النواقص، ومؤشرات الأداء.',
    descriptionEn: 'High-level real-time overview of sales, food cost %, inventory alerts, and performance metrics.',
    iconName: 'LayoutDashboard',
    allowedRoles: [
      'tenant_admin',
      'general_manager',
      'financial_manager',
      'financial_accountant',
      'cost_accountant',
      'store_manager',
      'super_admin',
    ],
    keywordsAr: ['لوحة', 'تحكم', 'داشبورد', 'ملخص', 'مبيعات', 'أداء', 'عام', 'الرئيسية'],
    keywordsEn: ['dashboard', 'executive', 'overview', 'summary', 'home', 'kpi', 'metrics'],
    commonStepsAr: [
      'تابع إجمالي مبيعات اليوم وهامش الربح الإجمالي لحظة بلحظة.',
      'افحص مؤشر تكلفة الطعام (Food Cost %) وقارنه بالهدف.',
      'انقر على أي بطاقة للانتقال المباشر للتقرير التفصيلي.',
    ],
    commonStepsEn: [
      'Review today\'s sales and gross margin in real-time.',
      'Monitor Food Cost % against target benchmark.',
      'Click any card to jump to its in-depth report.',
    ],
    quickActions: [
      { id: 'view_today_sales', labelAr: 'مبيعات اليوم', labelEn: 'Today Sales', actionCode: 'NAV:dashboard' },
      { id: 'view_cost_alerts', labelAr: 'تنبيهات التكاليف', labelEn: 'Cost Alerts', actionCode: 'NAV:cost_control' },
    ],
  },
  {
    id: 'pos',
    viewId: 'pos',
    category: 'operations',
    nameAr: 'نقطة البيع السريعة وطلبات الصالة',
    nameEn: 'Point of Sale & Dine-In Orders',
    shortLabelAr: 'نقطة البيع',
    shortLabelEn: 'POS',
    descriptionAr: 'واجهة سريعة وخفيفة لإصدار فواتير الطلبات، تقسيم الحساب، وإغلاق وردية الكاشير مع الخصم التلقائي للمخزون.',
    descriptionEn: 'Lightning-fast order register, bill splitting, payment processing, and shift closing with auto-depletion.',
    iconName: 'UtensilsCrossed',
    allowedRoles: ['cashier', 'waiter', 'general_manager', 'tenant_admin', 'super_admin'],
    keywordsAr: ['كاشير', 'نقطة بيع', 'pos', 'فاتورة', 'طلب', 'بيع', 'طاولات', 'دفع', 'وردية', 'شفت', 'زد ريبورت'],
    keywordsEn: ['pos', 'cashier', 'register', 'order', 'bill', 'table', 'receipt', 'payment', 'shift', 'z-report'],
    commonStepsAr: [
      'ابدأ بفتح وردية الكاشير وتسجيل عهدة الدرج النقدية.',
      'اختر الأصناف بالنقر المباشر أو ابحث بالاسم.',
      'حدد طريقة الدفع (نقدي/بطاقة) واطبع الفاتورة الضريبية.',
      'في نهاية اليوم، أغلق الوردية لإصدار تقرير Z المحاسبي.',
    ],
    commonStepsEn: [
      'Open cashier shift with starting drawer cash float.',
      'Add items by tapping or quick search.',
      'Select payment method and issue tax invoice.',
      'Close shift at end of day to generate verified Z-Report.',
    ],
    quickActions: [
      { id: 'nav_pos', labelAr: 'فتح نقطة البيع', labelEn: 'Open Register', actionCode: 'NAV:pos' },
    ],
  },
  {
    id: 'products',
    viewId: 'products',
    category: 'cost_engineering',
    nameAr: 'قائمة المنتجات',
    nameEn: 'Products Catalog',
    shortLabelAr: 'المنتجات',
    shortLabelEn: 'Products',
    descriptionAr: 'استعراض كل المنتجات مرتبة حسب شجرة الأقسام، مع فلترة الجاهزية والتحكم في إتاحة البيع.',
    descriptionEn: 'Browse all products grouped by category tree, with sales status filters and availability toggles.',
    iconName: 'UtensilsCrossed',
    allowedRoles: ['tenant_admin', 'general_manager', 'kitchen_manager', 'bar_manager', 'cost_accountant', 'cashier', 'waiter', 'super_admin'],
    keywordsAr: ['منتجات', 'أصناف', 'أطباق', 'مشروبات', 'قائمة', 'أقسام', 'بيع', 'جاهز للبيع'],
    keywordsEn: ['products', 'items', 'catalog', 'dishes', 'beverages', 'categories', 'for sale'],
    commonStepsAr: [
      'استعرض الأصناف مقسمة حسب شجرة الأقسام الرئيسية والفرعية.',
      'فلتر المنتجات حسب الجاهزية للبيع أو نقص الوصفة.',
      'اضغط على أي صنف لتعديل بياناته أو إتاحته للبيع مباشرة.',
    ],
    commonStepsEn: [
      'Browse items grouped by main and sub category trees.',
      'Filter products by sales readiness or missing recipes.',
      'Click any product to edit details or toggle sales availability.',
    ],
    quickActions: [
      { id: 'nav_products', labelAr: 'المنتجات', labelEn: 'Products', actionCode: 'NAV:products' },
    ],
  },
  {
    id: 'categories',
    viewId: 'categories',
    category: 'cost_engineering',
    nameAr: 'شجرة الأقسام والتصنيفات',
    nameEn: 'Categories Management',
    shortLabelAr: 'الأقسام',
    shortLabelEn: 'Categories',
    descriptionAr: 'تنظيم متسلسل ومرن لأقسام المنتجات وقوائم الخامات (رئيسي ← فرعي ← تصنيف) مع إضافة وتعديل الأقسام.',
    descriptionEn: 'Flexible hierarchical management of product and material categories (main, sub, and tags).',
    iconName: 'FolderTree',
    allowedRoles: ['tenant_admin', 'general_manager', 'financial_manager', 'cost_accountant', 'store_manager', 'super_admin'],
    keywordsAr: ['أقسام', 'تصنيفات', 'شجرة', 'رئيسي', 'فرعي', 'خامات', 'منتجات', 'ترتيب'],
    keywordsEn: ['categories', 'tree', 'hierarchy', 'subcategories', 'tags', 'materials', 'reorder'],
    commonStepsAr: [
      'تنقل بين شجرة أقسام المنتجات وشجرة أقسام الخامات.',
      'أضف أقساماً رئيسية وفرعية وتصنيفات بضغطة زر.',
      'رتب الأقسام بالأسهم أو عدل أسماءها ونقل العناصر التابعة لها.',
    ],
    commonStepsEn: [
      'Switch between product category tree and material category tree.',
      'Add main, sub, and classification categories with one click.',
      'Reorder categories or update names and reassign child elements.',
    ],
    quickActions: [
      { id: 'nav_categories', labelAr: 'الأقسام', labelEn: 'Categories', actionCode: 'NAV:categories' },
    ],
  },
  {
    id: 'menu',
    viewId: 'menu',
    category: 'cost_engineering',
    nameAr: 'الوصفات (رسبي)',
    nameEn: 'Recipes (BOM)',
    shortLabelAr: 'الوصفات (رسبي)',
    shortLabelEn: 'Recipes (BOM)',
    descriptionAr: 'بوابة كل منتجات المنشأة (أطباق ومخبوزات ومشروبات وحلويات): ربط المكونات وحساب التكلفة الحقيقية للوصفة.',
    descriptionEn: 'The recipe gateway for all items (dishes, bakery, bar, desserts): link ingredients and compute true recipe costs.',
    iconName: 'ChefHat',
    allowedRoles: ['tenant_admin', 'general_manager', 'kitchen_manager', 'bar_manager', 'cost_accountant', 'super_admin'],
    keywordsAr: ['منيو', 'وصفة', 'وصفات', 'رسبي', 'طبق', 'مكونات', 'طبخ', 'شيف', 'مطعم', 'مشروب', 'أطباق', 'وجبة', 'تكلفة'],
    keywordsEn: ['menu', 'recipe', 'recipes', 'bom', 'dish', 'ingredients', 'prep', 'chef', 'food', 'drink', 'cost', 'profit'],
    commonStepsAr: [
      'اختر القسم الرئيسي والفرعي لعرض أطباقه.',
      'أضف صنفاً جديداً وحدد مكوناته والكميات الدقيقة للحصة.',
      'اضبط نسبة الهالك ومصاريف التغليف لحساب التكلفة الحقيقية والربح فوراً.',
    ],
    commonStepsEn: [
      'Select main and sub category to view dishes.',
      'Add a new dish and configure ingredients and exact portion quantities.',
      'Set waste % and packaging consumables to calculate true cost and profit immediately.',
    ],
    quickActions: [
      { id: 'nav_menu', labelAr: 'الوصفات (رسبي)', labelEn: 'Recipes (BOM)', actionCode: 'NAV:menu' },
      { id: 'add_product_wizard', labelAr: 'إضافة صنف جديد', labelEn: 'Add New Dish', actionCode: 'ACTION:open_add_product' },
    ],
  },
  {
    id: 'cost_control',
    viewId: 'cost_control',
    category: 'cost_engineering',
    nameAr: 'مراقبة التكاليف وكشف الانحراف والهدر',
    nameEn: 'Cost Control & Variance Analytics',
    shortLabelAr: 'مراقبة التكاليف',
    shortLabelEn: 'Cost Control',
    descriptionAr: 'مقارنة دقيقة بين الاستهلاك النظري والاستهلاك الفعلي في المستودعات لاكتشاف الهدر، السرقة، أو زيادة التوزيع.',
    descriptionEn: 'Theoretical vs actual consumption audit to identify waste, portioning errors, or shrinkage before profits drop.',
    iconName: 'Scale',
    allowedRoles: ['tenant_admin', 'general_manager', 'cost_accountant', 'financial_manager', 'super_admin'],
    keywordsAr: ['تكاليف', 'تكلفة', 'هدر', 'انحراف', 'فارق', 'نظري', 'فعلي', 'سرقة', 'خسارة', 'تالف', 'فود كوست'],
    keywordsEn: ['cost', 'variance', 'waste', 'shrinkage', 'theoretical', 'actual', 'food cost', 'audit', 'loss'],
    commonStepsAr: [
      'شغّل مقارنة الاستهلاك النظري (المبيعات × الوصفة) بالاستهلاك الفعلي.',
      'افحص الخامات التي تجاوزت نسبة الانحراف المسموحة (5%).',
      'اتخذ إجراء التصحيح بتعديل الوصفة أو التدقيق على خط التحضير.',
    ],
    commonStepsEn: [
      'Compare theoretical consumption against physical stock depletion.',
      'Inspect raw ingredients exceeding variance threshold (5%).',
      'Execute corrective audit or recalibrate recipe portions.',
    ],
    quickActions: [
      { id: 'nav_cost_control', labelAr: 'شاشة الانحرافات', labelEn: 'Variance Report', actionCode: 'NAV:cost_control' },
    ],
  },
  {
    id: 'inventory',
    viewId: 'inventory',
    category: 'inventory_supply',
    nameAr: 'المستودعات وحركات المخزون والجرد',
    nameEn: 'Inventory & Stock Management',
    shortLabelAr: 'المخزون',
    shortLabelEn: 'Inventory',
    descriptionAr: 'إدارة الخامات والمخازن المتعددة، متابعة حدود إعادة الطلب، تقييم المخزون (FIFO والمتوسط المرجح)، وتسجيل الجرد الفعلي.',
    descriptionEn: 'Multi-warehouse stock control, reorder alerts, FIFO / weighted average valuation, and physical stocktakes.',
    iconName: 'Package',
    allowedRoles: ['tenant_admin', 'general_manager', 'store_manager', 'cost_accountant', 'super_admin'],
    keywordsAr: ['مخزن', 'مخازن', 'مستودع', 'مخزون', 'خامات', 'جرد', 'نواقص', 'رصيد', 'خامة', 'طماطم', 'لحوم', 'استلام'],
    keywordsEn: ['inventory', 'stock', 'warehouse', 'ingredients', 'stocktake', 'reorder', 'supplies', 'count'],
    commonStepsAr: [
      'أضف خامة جديدة في أقل من دقيقة بسعر الشراء ووحدة الاستهلاك.',
      'تابع تنبيهات الخامات التي قاربت على النفاد لطلبها فوراً.',
      'سجل نتائج الجرد الفعلي للمطابقة مع الرصيد الدفتري.',
    ],
    commonStepsEn: [
      'Add new raw material in under 1 minute with cost and consumption unit.',
      'Monitor reorder point alerts to issue purchase orders.',
      'Record physical stocktake counts to reconcile with system balance.',
    ],
    quickActions: [
      { id: 'nav_inventory', labelAr: 'فتح المستودعات', labelEn: 'Open Inventory', actionCode: 'NAV:inventory' },
      { id: 'add_ingredient_quick', labelAr: 'إضافة خامة جديدة', labelEn: 'Add Raw Material', actionCode: 'ACTION:open_add_ingredient' },
      { id: 'bulk_import_data', labelAr: 'استيراد خامات من إكسيل', labelEn: 'Import Excel / CSV', actionCode: 'ACTION:open_import_data' },
    ],
  },
  {
    id: 'inventory_audit',
    viewId: 'inventory_audit',
    category: 'inventory_supply',
    nameAr: 'الجرد الفعلي ومطابقة الانحراف',
    nameEn: 'Physical Inventory & Variance Audit',
    shortLabelAr: 'الجرد والانحراف',
    shortLabelEn: 'Stocktake & Variance',
    descriptionAr: 'شاشة محاسب التكاليف لإدخال الجرد الفعلي ومقارنته بالرصيد التقديري، حساب الفروق، وإجراء إغلاق الفترة المحاسبية.',
    descriptionEn: 'Cost accountant physical stock count entry, theoretical variance comparison, and period closing ledger reconciliations.',
    iconName: 'ClipboardCheck',
    allowedRoles: ['cost_accountant', 'store_manager', 'warehouse_manager', 'tenant_admin', 'general_manager', 'financial_manager', 'super_admin'],
    keywordsAr: ['جرد', 'انحراف', 'عجز', 'زيادة', 'مطابقة', 'إغلاق', 'محاسب تكاليف', 'فترة'],
    keywordsEn: ['audit', 'stocktake', 'variance', 'surplus', 'deficit', 'closing', 'cost accountant'],
    commonStepsAr: [
      'اختر الفرع والمخزن أو القسم المطلوب جرده.',
      'أدخل الكميات الفعلية بالوحدات المختلطة.',
      'افحص الانحرافات واعتمد إغلاق الفترة لتسوية الأرصدة.',
    ],
    commonStepsEn: [
      'Select target branch and warehouse or section.',
      'Enter physical counts using mixed units.',
      'Review variances and confirm period close to reconcile ledger.',
    ],
    quickActions: [
      { id: 'nav_inventory_audit', labelAr: 'فتح الجرد', labelEn: 'Open Audit', actionCode: 'NAV:inventory_audit' },
    ],
  },
  {
    id: 'daily_notes',
    viewId: 'daily_notes',
    category: 'inventory_supply',
    nameAr: 'الملاحظات اليومية وتتبع المشكلات',
    nameEn: 'Daily Audit Notes & Issues Tracker',
    shortLabelAr: 'الملاحظات اليومية',
    shortLabelEn: 'Daily Notes',
    descriptionAr: 'سجل ملاحظات الجرد الميدانية للمتابعة بين محاسب التكاليف والشيف ومدير المنشأة، مع إمكانية فتح كارت الصنف والطباعة.',
    descriptionEn: 'Operational audit notes tracker between cost accountant, chef, and management with direct item card access and printable view.',
    iconName: 'MessageSquare',
    allowedRoles: ['cost_accountant', 'store_manager', 'warehouse_manager', 'head_chef', 'tenant_admin', 'general_manager', 'super_admin'],
    keywordsAr: ['ملاحظات', 'مشكلات', 'حل', 'كارت صنف', 'شيف', 'تكاليف', 'يومي'],
    keywordsEn: ['notes', 'daily notes', 'issues', 'resolution', 'item card', 'chef'],
    commonStepsAr: [
      'استعرض الملاحظات اليومية الناتجة عن الجرد.',
      'انقر على فتح كارت الصنف لمعاينة حركات أي مادة.',
      'غيّر حالة الملاحظة إلى تم الحل واطبع التقرير الميداني.',
    ],
    commonStepsEn: [
      'Review daily notes generated during stocktake.',
      'Click to view item card movements for any ingredient.',
      'Mark note as resolved and print summary field sheet.',
    ],
    quickActions: [
      { id: 'nav_daily_notes', labelAr: 'الملاحظات اليومية', labelEn: 'Daily Notes', actionCode: 'NAV:daily_notes' },
    ],
  },
  {
    id: 'warehouses',
    viewId: 'warehouses',
    nameAr: 'المخازن وحركات الأصناف',
    nameEn: 'Warehouses & Supply',
    category: 'inventory_supply',
    shortLabelAr: 'المخازن',
    shortLabelEn: 'Warehouses',
    descriptionAr: 'إدارة الفروع والمخازن المتعددة، متابعة كارت الصنف وحركات الاستلام والصرف والمبيعات، ودورة طلبيات الأقسام.',
    descriptionEn: 'Multi-branch and warehouse management, item card movement ledger, and internal section requisition cycle.',
    iconName: 'Warehouse',
    allowedRoles: ['tenant_admin', 'general_manager', 'warehouse_manager', 'store_manager', 'storekeeper', 'head_chef', 'section_manager', 'cost_accountant', 'financial_manager', 'super_admin'],
    keywordsAr: ['مخزن', 'مخازن', 'فرع', 'فروع', 'كارت صنف', 'طلبية', 'صرف', 'استلام', 'في الطريق', 'مطبخ مركزي', 'تحويل'],
    keywordsEn: ['warehouses', 'warehouse', 'branches', 'item card', 'requisition', 'supply', 'in transit'],
    commonStepsAr: [
      'أضف مخزن جديد وحدد فرعه ونوعه (رئيسي، فرعي، مطبخ مركزي، مخزن قسم).',
      'افتح كارت الصنف لمتابعة الرصيد في كل مكان وسجل الحركات بالتاريخ والوقت.',
      'أنشئ طلبية داخلية للقسم مع توقيع كاتبها ومتابعة الصرف والاستلام.',
    ],
    commonStepsEn: [
      'Add a new warehouse and select its branch and type.',
      'Open the item card to track balances across all locations and movement history.',
      'Create an internal requisition with author signature, dispatching, and receipt.',
    ],
    quickActions: [
      { id: 'nav_warehouses', labelAr: 'فتح المخازن', labelEn: 'Open Warehouses', actionCode: 'NAV:warehouses' },
      { id: 'nav_item_card', labelAr: 'فتح كارت الصنف', labelEn: 'Open Item Card', actionCode: 'ACTION:open_item_card' },
      { id: 'nav_requisitions', labelAr: 'طلبية جديدة', labelEn: 'New Requisition', actionCode: 'ACTION:new_requisition' },
    ],
  },
  {
    id: 'purchasing',
    viewId: 'purchasing',
    category: 'inventory_supply',
    nameAr: 'المشتريات والموردون وأوامر التوريد',
    nameEn: 'Purchasing & Supplier Management',
    shortLabelAr: 'المشتريات',
    shortLabelEn: 'Purchasing',
    descriptionAr: 'إصدار أوامر الشراء، استلام الشحنات وتحديث متوسط تكلفة الخامة تلقائياً في المخازن، مع متابعة فواتير الموردين.',
    descriptionEn: 'Purchase orders, delivery receipts, automatic unit cost recalculation upon receipt, and supplier payables.',
    iconName: 'ShoppingBag',
    allowedRoles: ['tenant_admin', 'general_manager', 'store_manager', 'financial_accountant', 'super_admin'],
    keywordsAr: ['شراء', 'مشتريات', 'مورد', 'موردين', 'أمر شراء', 'فاتورة شراء', 'توريد', 'استلام', 'بضاعة'],
    keywordsEn: ['purchasing', 'purchase', 'supplier', 'vendor', 'po', 'order', 'receiving', 'invoice'],
    commonStepsAr: [
      'أنشئ أمر شراء للمورد وحدد الكميات المطلوبة.',
      'عند وصول البضاعة، اعتمد محضر الاستلام لتحديث المخزون ومتوسط التكلفة.',
      'يتم إنشاء قيد استحقاق للمورد تلقائياً في دفتر الأستاذ.',
    ],
    commonStepsEn: [
      'Create purchase order for approved supplier.',
      'Approve receiving voucher upon arrival to update stock and unit costs.',
      'Accounts payable entry automatically posted to general ledger.',
    ],
    quickActions: [
      { id: 'nav_purchasing', labelAr: 'أوامر الشراء', labelEn: 'Purchase Orders', actionCode: 'NAV:purchasing' },
    ],
  },
  {
    id: 'finance',
    viewId: 'finance',
    category: 'finance_tax',
    nameAr: 'المالية والحسابات العامة ودفتر الأستاذ',
    nameEn: 'Financial Accounting & General Ledger',
    shortLabelAr: 'المالية',
    shortLabelEn: 'Finance',
    descriptionAr: 'شجرة حسابات مبسطة، قيود يومية تلقائية لكل حركة بيع أو شراء، قائمة الدخل، والأرباح والخسائر.',
    descriptionEn: 'Double-entry accounting, automated journal entries for POS and inventory, and P&L financial statements.',
    iconName: 'DollarSign',
    allowedRoles: ['tenant_admin', 'financial_manager', 'financial_accountant', 'super_admin'],
    keywordsAr: ['مالية', 'حسابات', 'أرباح', 'خسائر', 'دفتر أستاذ', 'شجرة حسابات', 'قيود', 'ميزانية', 'دخل'],
    keywordsEn: ['finance', 'accounting', 'ledger', 'p&l', 'journal', 'profit', 'loss', 'balance', 'cfo'],
    commonStepsAr: [
      'راجع قيود اليومية التي يتم توليدها آلياً مع كل إغلاق وردية أو شراء.',
      'افحص قائمة الدخل لمعرفة صافي الربح بعد خصم تكلفة المبيعات والمصاريف.',
    ],
    commonStepsEn: [
      'Review automated journal entries from shifts and purchases.',
      'Inspect income statement to monitor net profit after COGS and overhead.',
    ],
    quickActions: [
      { id: 'nav_finance', labelAr: 'دفتر الأستاذ', labelEn: 'General Ledger', actionCode: 'NAV:finance' },
    ],
  },
  {
    id: 'tax',
    viewId: 'tax',
    category: 'finance_tax',
    nameAr: 'الضرائب والفاتورة الإلكترونية المعتمدة',
    nameEn: 'Tax & Electronic Invoicing Compliance',
    shortLabelAr: 'الضرائب',
    shortLabelEn: 'Tax',
    descriptionAr: 'حساب ضريبة القيمة المضافة (المخرجات والمدخلات)، تجهيز الإقرارات الدورية، والفواتير المشفرة بـ QR Code.',
    descriptionEn: 'VAT calculation (output and input tax), periodic tax returns, and compliant QR electronic invoicing.',
    iconName: 'Receipt',
    allowedRoles: ['tenant_admin', 'financial_manager', 'tax_accountant', 'super_admin'],
    keywordsAr: ['ضريبة', 'ضرائب', 'قيمة مضافة', 'vat', 'فاتورة إلكترونية', 'qr', 'إقرار', 'مصلحة الضرائب'],
    keywordsEn: ['tax', 'vat', 'e-invoice', 'compliance', 'qr', 'tax return', 'revenue authority'],
    commonStepsAr: [
      'اضبط نسبة الضريبة الأساسية والإضافية من الإعدادات.',
      'تابع ملخص الضريبة المستحقة (المحصلة من المبيعات مخصوماً منها ضريبة المشتريات).',
    ],
    commonStepsEn: [
      'Configure tax percentages in establishment settings.',
      'Monitor net payable VAT (output tax minus input deductible tax).',
    ],
    quickActions: [
      { id: 'nav_tax', labelAr: 'الإقرار الضريبي', labelEn: 'Tax Summary', actionCode: 'NAV:tax' },
    ],
  },
  {
    id: 'hr',
    viewId: 'hr',
    category: 'human_resources',
    nameAr: 'الموارد البشرية والرواتب والورديات',
    nameEn: 'Human Resources & Payroll',
    shortLabelAr: 'الموارد البشرية',
    shortLabelEn: 'HR & Payroll',
    descriptionAr: 'بيانات فريق العمل، توزيع الورديات، مسير الرواتب الشهري، وربط أجور العمالة المباشرة بتكلفة الأطباق.',
    descriptionEn: 'Employee profiles, shift scheduling, payroll processing, and direct labor allocation to menu recipes.',
    iconName: 'Users',
    allowedRoles: ['tenant_admin', 'general_manager', 'hr_manager', 'super_admin'],
    keywordsAr: ['موظفين', 'رواتب', 'أجور', 'عمالة', 'ورديات', 'حضور', 'شفتات', 'ساعات عمل', 'hr'],
    keywordsEn: ['hr', 'employees', 'payroll', 'salaries', 'shifts', 'staff', 'labor', 'attendance'],
    commonStepsAr: [
      'سجل الموظف وحدد دوره الوظيفي ومعدل الأجر بالساعة أو الشهر.',
      'اربط ساعات عمل المطبخ والبار ببطاقات الوصفات لحساب تكلفة العمالة الحقيقية.',
    ],
    commonStepsEn: [
      'Add staff profile with operational role and wage rate.',
      'Link kitchen and bar labor hours into recipe cost allocations.',
    ],
    quickActions: [
      { id: 'nav_hr', labelAr: 'فريق العمل والرواتب', labelEn: 'Staff & Payroll', actionCode: 'NAV:hr' },
    ],
  },
  {
    id: 'crm',
    viewId: 'crm',
    category: 'operations',
    nameAr: 'علاقات العملاء وبرامج الولاء والضيوف',
    nameEn: 'Customer Relationship & Guest Loyalty',
    shortLabelAr: 'علاقات العملاء',
    shortLabelEn: 'CRM',
    descriptionAr: 'سجل تفضيلات الضيوف، كبار الشخصيات (VIP)، برامج النقاط والمكافآت، وملاحظات الحساسية الغذائية.',
    descriptionEn: 'Guest preferences, VIP profiles, loyalty rewards points, and culinary allergy tracking.',
    iconName: 'HeartHandshake',
    allowedRoles: ['tenant_admin', 'general_manager', 'public_relations', 'cashier', 'waiter', 'super_admin'],
    keywordsAr: ['عملاء', 'زبائن', 'ولاء', 'نقاط', 'ضيوف', 'vip', 'حساسية', 'علاقات عملاء', 'crm'],
    keywordsEn: ['crm', 'customers', 'guests', 'loyalty', 'vip', 'points', 'preferences', 'relations'],
    commonStepsAr: [
      'سجل بيانات العميل ورقم هاتفه في نقطة البيع أو شاشة الـ CRM.',
      'دوّن تفضيلات طاولة الضيف وأي حساسية غذائية.',
    ],
    commonStepsEn: [
      'Record customer contact at register or CRM directory.',
      'Note favorite seating preferences and allergy dietary requirements.',
    ],
    quickActions: [
      { id: 'nav_crm', labelAr: 'دليل العملاء', labelEn: 'Guest Directory', actionCode: 'NAV:crm' },
    ],
  },
  {
    id: 'health',
    viewId: 'health',
    category: 'system',
    nameAr: 'صحة المنظومة والمؤشرات الحيوية',
    nameEn: 'System Health & Telemetry Metrics',
    shortLabelAr: 'صحة المنظومة',
    shortLabelEn: 'System Health',
    descriptionAr: 'مراقبة أداء التخزين المحلي، سرعة الاستجابة، حالة المزامنة، ومعدل الاستقرار للمنشأة الحالية.',
    descriptionEn: 'Real-time telemetry, response latency, sync queue health, and storage utilization for current partition.',
    iconName: 'Activity',
    allowedRoles: ['tenant_admin', 'general_manager', 'super_admin'],
    keywordsAr: ['صحة', 'نظام', 'أداء', 'سيرفر', 'استجابة', 'سرعة', 'أخطاء', 'مزامنة', 'تخزين'],
    keywordsEn: ['health', 'system', 'latency', 'telemetry', 'performance', 'sync', 'errors', 'uptime'],
    commonStepsAr: [
      'افحص زمن استجابة العمليات المحلية واستقرارها.',
      'تأكد من عدم وجود أخطاء أو عمليات معلقة في قائمة المزامنة.',
    ],
    commonStepsEn: [
      'Inspect local operations latency and uptime metrics.',
      'Ensure zero error rate and verify offline sync queue status.',
    ],
    quickActions: [
      { id: 'nav_health', labelAr: 'مؤشرات الأداء', labelEn: 'System Metrics', actionCode: 'NAV:health' },
    ],
  },
  {
    id: 'settings',
    viewId: 'settings',
    category: 'system',
    nameAr: 'إعدادات المنشأة وتخصيص المنظومة',
    nameEn: 'Establishment Configuration & Settings',
    shortLabelAr: 'الإعدادات',
    shortLabelEn: 'Settings',
    descriptionAr: 'تحديد العملة، نسب الضرائب، طريقة تقييم المخزون (FIFO أو WAC)، هوامش الربح المستهدفة، والنسخ الاحتياطي.',
    descriptionEn: 'Currency, tax rates, inventory valuation method, target food cost margins, and local JSON backup/restore.',
    iconName: 'Settings',
    allowedRoles: ['tenant_admin', 'super_admin'],
    keywordsAr: ['إعدادات', 'ضبط', 'عملة', 'ضريبة', 'نسخ احتياطي', 'تخصيص', 'مظهر', 'استرجاع'],
    keywordsEn: ['settings', 'config', 'currency', 'tax rate', 'backup', 'restore', 'fifo', 'margin'],
    commonStepsAr: [
      'اختر العملة الأساسية للحسابات ونسب الضريبة المطبقة.',
      'حدد طريقة تقييم المخزون وهامش الربح المستهدف للتسعير التلقائي.',
      'احفظ نسخة احتياطية محلية (JSON) من بيانات منشأتك بضغطة واحدة.',
    ],
    commonStepsEn: [
      'Select operating base currency and applicable tax rates.',
      'Configure inventory valuation method and target pricing margins.',
      'Export secure local JSON backup of your partition anytime.',
    ],
    quickActions: [
      { id: 'nav_settings', labelAr: 'فتح الإعدادات', labelEn: 'Open Settings', actionCode: 'NAV:settings' },
    ],
  },
  {
    id: 'kds',
    viewId: 'kds',
    category: 'operations',
    nameAr: 'شاشات محطات المطبخ والبار (KDS)',
    nameEn: 'Kitchen Display System & Station Routing',
    shortLabelAr: 'شاشات المطبخ',
    shortLabelEn: 'KDS',
    descriptionAr: 'توزيع فوري لطلبات العملاء والكاشير على المحطات (المطبخ الساخن، البار، المشاوي)، مع مؤقتات لونية وتنبيه صوتي وطباعة فواتير حرارية 80 مم.',
    descriptionEn: 'Instant order routing to preparation stations (hot kitchen, bar, grill) with color-coded timers, audio chime, and 80mm thermal printing.',
    iconName: 'Flame',
    allowedRoles: ['kitchen_manager', 'bar_manager', 'tenant_admin', 'general_manager', 'cashier', 'super_admin'],
    keywordsAr: ['مطبخ', 'شاشة مطبخ', 'kds', 'محطة', 'بار', 'مشاوي', 'تحضير', 'تذكرة', 'شيف', 'طهاة', 'طباعة حرارية'],
    keywordsEn: ['kds', 'kitchen', 'station', 'prep', 'cook', 'bar', 'grill', 'tickets', 'thermal print', 'timer'],
    commonStepsAr: [
      'اختر المحطة المناسبة (الكل / المطبخ الساخن / البار / المشاوي).',
      'راقب زمن انتظار التذكرة (أخضر أقل من 10 دقائق، كهرماني، أحمر أكثر من 20 دقيقة).',
      'انقر "بدء التحضير" ثم "جاهز للتسليم" لتحديث حالة الطلب فوراً عند الكاشير والعميل.',
      'اطبع تذكرة المطبخ الحرارية (80 مم) عند الحاجة.',
    ],
    commonStepsEn: [
      'Filter by your station (All / Hot Kitchen / Bar / Grill).',
      'Monitor ticket elapsed timers with color alerts (<10m green, amber, >20m red).',
      'Click "Start Prep" then "Mark Ready" to notify cashier and customer instantly.',
      'Print 80mm thermal ticket as needed.',
    ],
    quickActions: [
      { id: 'view_kds_all', labelAr: 'عرض شاشة المطبخ', labelEn: 'Open KDS', actionCode: 'NAV:kds' },
    ],
  },
  {
    id: 'menu_management',
    viewId: 'menu_management',
    category: 'cost_engineering',
    nameAr: 'إدارة المنيو والتسويق والصور',
    nameEn: 'Menu Marketing & Visuals Management',
    shortLabelAr: 'إدارة المنيو',
    shortLabelEn: 'Menu & Visuals',
    descriptionAr: 'مساحة متكاملة لمدير المنشأة ومسؤول التسويق لرفع وضغط الصور محلياً، وكتابة الوصف التسويقي، وتحديد المكونات الظاهرة للجمهور، وتعيين محطة التحضير مع معاينة مباشرة للموبايل.',
    descriptionEn: 'Dedicated workspace for manager and marketing officer to upload and compress photos locally, write copy, set public ingredients, and assign stations with live mobile preview.',
    iconName: 'QrCode',
    allowedRoles: ['tenant_admin', 'general_manager', 'marketing_officer', 'super_admin'],
    keywordsAr: ['منيو', 'صور', 'تسويق', 'وصف', 'محطة تحضير', 'صورة طبق', 'معاينة موبايل', 'حساسية'],
    keywordsEn: ['menu marketing', 'dish photo', 'visuals', 'allergens', 'ingredients', 'mobile preview', 'station assignment'],
    commonStepsAr: [
      'اختر الصنف من القائمة لإدارته وتعديل بياناته العامة.',
      'ارفع صوراً جذابة واستخدم ضاغط الصور المدمج في المتصفح للحفاظ على سرعة التحميل.',
      'اختر قالباً تسويقياً جاهزاً أو اكتب وصفاً بشرياً دافئاً باللغتين.',
      'حدد محطة التحضير (مطبخ ساخن، بار، مشاوي) والمكونات الظاهرة ومسببات الحساسية.',
      'شاهد التغييرات فوراً في المعاينة التفاعلية للموبايل على يمين الشاشة.',
    ],
    commonStepsEn: [
      'Select item from list to manage public appearance.',
      'Upload photos and compress them locally in-browser for snappy load times.',
      'Select marketing copy template or write bilingual descriptions.',
      'Assign prep station and toggle public ingredients and allergens.',
      'Check real-time mobile preview on the right panel.',
    ],
    quickActions: [
      { id: 'open_menu_mgmt', labelAr: 'إدارة المنيو والصور', labelEn: 'Manage Menu Visuals', actionCode: 'NAV:menu_management' },
    ],
  },
  {
    id: 'qr_tables',
    viewId: 'qr_tables',
    category: 'operations',
    nameAr: 'إدارة ملصقات QR للطاولات',
    nameEn: 'Table QR Code Generator & Tent Stickers',
    shortLabelAr: 'ملصقات QR',
    shortLabelEn: 'Table QRs',
    descriptionAr: 'توليد وتنزيل وطباعة رموز QR مخصصة للمنشأة ولكل طاولة في الصالة، تعمل دون إنترنت أو خدمات خارجية مع ملصقات أنيقة جاهزة للطباعة.',
    descriptionEn: 'Generate, download, and print custom venue and table QR codes fully offline with elegant, printable table tent stickers.',
    iconName: 'Smartphone',
    allowedRoles: ['tenant_admin', 'general_manager', 'marketing_officer', 'cashier', 'super_admin'],
    keywordsAr: ['qr', 'طاولات', 'ملصقات', 'رمز كيو ار', 'كود طاولة', 'طباعة ستيكر', 'رابط المنيو'],
    keywordsEn: ['qr code', 'table sticker', 'table tent', 'qr generator', 'menu link', 'print qr'],
    commonStepsAr: [
      'استعرض رابط المنيو العام للمنشأة أو شاركه مباشرة.',
      'اختر أي طاولة لتوليد رمز QR الخاص بها الذي يملأ رقم الطاولة تلقائياً للعميل.',
      'نزّل الرمز بصيغة PNG أو اطبع ملصقات الطاولات الأنيقة المعتمدة.',
    ],
    commonStepsEn: [
      'View public venue menu link or copy it.',
      'Select any table to generate its pre-filled QR code.',
      'Download PNG or print standardized table tent stickers directly.',
    ],
    quickActions: [
      { id: 'open_qr_tables', labelAr: 'ملصقات الطاولات', labelEn: 'Table QRs', actionCode: 'NAV:qr_tables' },
    ],
  },
  {
    id: 'users_roles',
    viewId: 'users_roles',
    category: 'system',
    nameAr: 'أدوار المستخدمين',
    nameEn: 'User Roles',
    shortLabelAr: 'أدوار المستخدمين',
    shortLabelEn: 'User Roles',
    descriptionAr: 'تحديد أدوار الموظفين والشاشات المسموح بها',
    descriptionEn: 'Manage staff roles and permitted screens',
    iconName: 'Users',
    allowedRoles: ['super_admin', 'tenant_admin', 'general_manager', 'financial_manager'],
    keywordsAr: ['مستخدمين', 'مستخدم', 'صلاحيات', 'أدوار', 'كاشير', 'باسورد', 'كلمة سر', 'موظف'],
    keywordsEn: ['users', 'roles', 'permissions', 'cashier', 'password', 'staff', 'access'],
    commonStepsAr: [
      'اختر المستخدم لعرض صلاحياته وشاشاته الحالية.',
      'عدل الشاشات المسموح بها للمستخدم واحفظ التعديل.',
      'غيّر كلمة المرور للمستخدم مباشرة دون الحاجة لكلمة مروره القديمة.',
    ],
    commonStepsEn: [
      'Select a user to review their current permissions and screens.',
      'Toggle allowed screens and save updates.',
      'Reset user password directly without knowing their previous password.',
    ],
    quickActions: [
      { id: 'open_users_roles', labelAr: 'أدوار المستخدمين', labelEn: 'User Roles', actionCode: 'NAV:users_roles' },
    ],
  },
];

export const SCREEN_REGISTRY: ScreenDefinition[] = RAW_SCREEN_REGISTRY.map((screen) => {
  const g = SCREEN_GLOSSARY[screen.viewId];
  if (!g) return screen;
  return {
    ...screen,
    nameAr: g.titleAr,
    nameEn: g.titleEn,
    shortLabelAr: g.titleAr,
    shortLabelEn: g.titleEn,
    descriptionAr: g.subtitleAr,
    descriptionEn: g.subtitleEn,
  };
});

/**
 * Searches the registry for matching screens based on user query.
 * Normalizes Arabic letters (أ/إ/ا, ى/ي, ة/ه) and handles English terms.
 */
export function findMatchingScreens(query: string, userRole?: UserRole): ScreenDefinition[] {
  if (!query || query.trim() === '') return [];

  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .trim();

  const normQuery = normalize(query);
  const words = normQuery.split(/\s+/).filter(Boolean);

  return SCREEN_REGISTRY.filter((screen) => {
    // If role provided and not allowed, skip
    if (userRole && !screen.allowedRoles.includes(userRole)) {
      return false;
    }

    const normNameAr = normalize(screen.nameAr);
    const normDescAr = normalize(screen.descriptionAr);
    const normKeywordsAr = screen.keywordsAr.map(normalize);

    const normNameEn = screen.nameEn.toLowerCase();
    const normDescEn = screen.descriptionEn.toLowerCase();
    const normKeywordsEn = screen.keywordsEn.map((k) => k.toLowerCase());

    return words.some(
      (w) =>
        normNameAr.includes(w) ||
        normDescAr.includes(w) ||
        normKeywordsAr.some((k) => k.includes(w) || w.includes(k)) ||
        normNameEn.includes(w) ||
        normDescEn.includes(w) ||
        normKeywordsEn.some((k) => k.includes(w) || w.includes(k))
    );
  });
}

export function getAllScreens(): ScreenDefinition[] {
  return SCREEN_REGISTRY;
}
