/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * HIDDEN OWNER/MANAGER PRE-LAUNCH VERIFICATION CHECKLIST (Phase 6 Audit)
 * Accessible only to tenant_admin, general_manager, and super_admin.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  CheckSquare,
  Square,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Lock,
  Smartphone,
  Printer,
  ShoppingBag,
  Users,
  EyeOff,
  SunMoon,
  WifiOff,
  FolderTree,
  Warehouse,
  ClipboardCheck,
  ChefHat,
  DatabaseBackup,
  Coins,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { uiPreferencesRepository } from '../../repositories/repositories.ts';

interface ChecklistStep {
  id: string;
  categoryAr: string;
  categoryEn: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon: React.ReactNode;
}

const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    id: 'order_dine_in',
    categoryAr: 'سيناريو طلب 1',
    categoryEn: 'Order Scenario 1',
    titleAr: 'طلب صالة عبر المنيو الإلكتروني (طاولة QR)',
    titleEn: 'Dine-In QR Menu Order & Station Routing',
    descAr: 'امسح رمز طاولة، أرسل طلباً، اعتمده من شاشة الكاشير، وتحقق من توزيعه على محطات التحضير (مطبخ/شواية/بار) حتى الجاهزية.',
    descEn: 'Scan table QR, submit order, approve in POS, verify split across prep stations until ready.',
    icon: <ShoppingBag className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
  {
    id: 'order_delivery',
    categoryAr: 'سيناريو طلب 2',
    categoryEn: 'Order Scenario 2',
    titleAr: 'طلب توصيل + كوبون خصم + تعيين سائق وتسوية نقدية',
    titleEn: 'Delivery Order + Coupon + Driver Assignment & Cash Settlement',
    descAr: 'أنشئ طلب توصيل بعنوان وهاتف، طبّق كوبون خصم أو نقاط ولاء، عيّن سائقاً، حوّل الحالة إلى «خرج للتوصيل»، ثم نفّذ التسوية النقدية للسائق.',
    descEn: 'Create delivery order with address/phone, apply coupon/loyalty, assign driver, mark out for delivery, and settle cash.',
    icon: <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  },
  {
    id: 'order_takeaway_offline',
    categoryAr: 'سيناريو طلب 3',
    categoryEn: 'Order Scenario 3',
    titleAr: 'طلب استلام من الفرع + اختبار انقطاع الاتصال والمزامنة',
    titleEn: 'Takeaway Order + Offline Outbox & Reconnect Sync',
    descAr: 'فعّل وضع عدم الاتصال من مؤشر الشبكة، سجّل طلباً جديداً، تأكد من ظهور بادئة الجهاز في الرقم التسلسلي، ثم أعد الاتصال وتأكد من مزامنة صندوق الصادر دون تكرار.',
    descEn: 'Toggle offline mode, submit order, verify device-prefixed serial, reconnect and verify Outbox flushes without duplicates.',
    icon: <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  },
  {
    id: 'thermal_printing',
    categoryAr: 'الطباعة',
    categoryEn: 'Printing',
    titleAr: 'اختبار طباعة تذاكر المحطات وفاتورة الكاشير (80mm / A5)',
    titleEn: 'Test Station Ticket & Cashier Receipt Printing (80mm / A5)',
    descAr: 'اطبع تذكرة تحضير وفاتورة عميل، وتأكد من وضوح الخط وعدم ظهور أي تكاليف داخلية أو هوامش ربح في المطبوعات.',
    descEn: 'Print prep ticket and customer receipt; verify layout and confirm zero internal costs appear.',
    icon: <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
  },
  {
    id: 'mobile_320px',
    categoryAr: 'الموبايل',
    categoryEn: 'Mobile 320px',
    titleAr: 'فحص التجاوب على شاشات 320px و360px (فحص يدوي)',
    titleEn: 'Verify 320px & 360px Mobile Responsiveness (Manual Check)',
    descAr: 'افتح المنيو العام وشاشة الكاشير وشاشة المطبخ على عرض 320px وتأكد من عدم وجود تمرير أفقي أو تداخل في الأزرار.',
    descEn: 'Inspect Public Menu, POS, and KDS at 320px width; confirm zero horizontal overflow or overlapping controls.',
    icon: <Smartphone className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
  },
  {
    id: 'theme_and_rtl',
    categoryAr: 'المظهر والاتجاه',
    categoryEn: 'Theme & RTL',
    titleAr: 'فحص الوضع الفاتح/الداكن واتجاه RTL/LTR (فحص يدوي)',
    titleEn: 'Verify Light/Dark Theme & RTL/LTR Layout (Manual Check)',
    descAr: 'بدّل بين الوضع الفاتح والداكن وبين العربية والإنجليزية، وتأكد من تباين الألوان وسلامة محاذاة الجداول والبطاقات.',
    descEn: 'Switch between Light/Dark themes and Arabic/English; verify contrast and alignment.',
    icon: <SunMoon className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'rbac_roles',
    categoryAr: 'الأدوار',
    categoryEn: 'RBAC Roles',
    titleAr: 'اختبار صلاحيات الأدوار (كاشير، مدير مطبخ، مدير عام)',
    titleEn: 'Verify Role Permissions (Cashier, Kitchen Manager, General Manager)',
    descAr: 'جرّب التبديل بين الأدوار وتأكد من حجب تقارير الأرباح والتكاليف وإعدادات النظام عن الكاشير ومدير المطبخ.',
    descEn: 'Switch roles and confirm profit reports, true costs, and system settings are restricted from Cashier & Kitchen Manager.',
    icon: <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
  },
  {
    id: 'user_roles_management',
    categoryAr: 'أدوار المستخدمين والصلاحيات',
    categoryEn: 'User Roles & Permissions',
    titleAr: 'فحص شاشة إدارة المستخدمين وتخصيص الشاشات وتعيين PIN السريع',
    titleEn: 'Verify User Roles Management, Screen Permissions & Fast PIN',
    descAr: 'ادخل على شاشة «أدوار المستخدمين»، تأكد من ظهور الموظفين وتخصيص شاشاتهم، تجربة توليد PIN عشوائي من 6 خانات (يظهر مرة واحدة)، وتأكد من قصر الشاشة على القيادة وحجبها عن الكاشير.',
    descEn: 'Open User Roles screen, verify staff listing, customize screen permissions, test random 6-digit one-time PIN generation, and ensure cashier cannot access.',
    icon: <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
  {
    id: 'recipe_journey',
    categoryAr: 'رحلة الخامة للمنتج',
    categoryEn: 'Raw Material to Product Journey',
    titleAr: 'فحص رحلة الخامة من الشراء للوصفة للبيع للأرباح',
    titleEn: 'Verify Journey: Material to Recipe to Sale to Profit',
    descAr: 'أضف خامة بسعر شراء، اربطها بوصفة طبق بنسبة هالك، اعرض الطبق للبيع، ونفّذ بيعاً من الكاشير وتأكد من خصم المخزون وظهور هامش الربح الحقيقي.',
    descEn: 'Add raw material, link to recipe with waste %, mark dish ready for sale, sell via POS, and verify stock depletion and true margin calculation.',
    icon: <ShoppingBag className="w-5 h-5 text-emerald-500" />,
  },
  {
    id: 'recipes_and_categories_tree',
    categoryAr: 'الوصفات والأقسام',
    categoryEn: 'Recipes & Categories Tree',
    titleAr: 'فحص شجرة الأقسام ومنع تكرار المنتجات والوصفات (رسبي)',
    titleEn: 'Verify Categories Tree, Duplicate Prevention & Recipes',
    descAr: 'تأكد من عمل شجرة الأقسام (رئيسي/فرعي/تصنيف) للمنتجات والخامات، ومنع حفظ صنفين بنفس الاسم في نفس القسم مع قبوله في قسم مختلف، وكتابة الأرقام بالإنجليزية والأرقام العربية المشرقية، وتأكيد الحذف مع التراجع 8 ثوان.',
    descEn: 'Confirm 3-level category tree for products and materials, duplicate name prevention within same category, keyboard numeric inputs, and delete confirmation with 8s undo.',
    icon: <FolderTree className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
  {
    id: 'warehouses_and_requisition_cycle',
    categoryAr: 'المخازن والتوريد',
    categoryEn: 'Warehouses & Supply',
    titleAr: 'فحص المخازن وسلسلة الوحدات وكارت الصنف ودورة الطلبية',
    titleEn: 'Verify Multi-Warehouse Stock, Units Chain & Requisitions',
    descAr: 'تأكد من خصم مبيعات الكاشير من مخزن القسم المرتبط بمحطة التحضير لا المخزن الرئيسي، وتحويل الوحدات المركبة (2 علبة = 1400 مل)، ودورة الطلبية بالتوقيع والصرف والاستلام الجزئي وكارت الصنف.',
    descEn: 'Confirm POS sales deduct from section warehouse not main, verify multi-level packaging conversion (2 cans = 1400ml), and complete requisition order cycle with signatures, dispatching, partial receipt, and item card ledger.',
    icon: <Warehouse className="w-5 h-5 text-amber-500" />,
  },
  {
    id: 'inventory_audit_and_availability',
    categoryAr: 'الجرد وإتاحة الأصناف',
    categoryEn: 'Audit & Product Availability',
    titleAr: 'فحص الجرد الفعلي والانحراف وإغلاق الفترة وإتاحة الأصناف النواقص',
    titleEn: 'Verify Physical Inventory Audit, Period Close & Item Availability',
    descAr: 'تأكد من شاشة الجرد والانحراف بالوحدات المختلطة، استبعاد بضاعة في الطريق، تمييز الفروق (أخضر للزيادة وأحمر للعجز)، الإغلاق الفعلي وترحيل قيود التسوية، الملاحظات اليومية وفتح كارت الصنف، وتحول زر الكاشير للأصفر ثم الرمادي عند نفاد الخامة أو حصص الخبز، مع حجب تفاصيل النواقص عن منيو العميل.',
    descEn: 'Confirm physical audit with mixed units, in-transit segregation, surplus/deficit visual cues, official period close ledger reconciliations, daily notes linking to item card, and cashier yellow/gray out-of-stock states while keeping raw inventory hidden from customer menu.',
    icon: <ClipboardCheck className="w-5 h-5 text-emerald-500" />,
  },
  {
    id: 'semi_finished_preparations',
    categoryAr: 'التجهيزات والتحضيرات',
    categoryEn: 'Semi-Finished Preparations',
    titleAr: 'فحص التجهيزات كمرشّح تحويل وتفكيكها للخامات في البيع والجرد ودفعات الإنتاج',
    titleEn: 'Verify Semi-Finished Preparations, Standard Decomposition & Batches',
    descAr: 'تأكد من تعريف التجهيزات بالصيغة (عجين بيتزا، صوصات، أرز مسلوق) وتفكيكها للخامات عند البيع وخصمها من مخزن القسم، مع إمكانية تفعيل تسجيل الدفعات، وديناميكية انتشار التكلفة، وجرد التجهيزات المتبقية واحتساب خاماتها المكافئة، ومنع الدوران التكراري، وحجب التجهيزات عن طلبيات الشراء.',
    descEn: 'Confirm on-formula semi-finished preparations (dough, sauces, steamed rice), dynamic decomposition to raw materials on POS sales and physical audit, optional batch tracking, cost propagation, remaining prep audit, circular dependency prevention, and omission from purchase orders.',
    icon: <ChefHat className="w-5 h-5 text-indigo-500" />,
  },
  {
    id: 'overhead_and_full_costing',
    categoryAr: 'التكلفة الكاملة والمصاريف',
    categoryEn: 'Overhead & Full Costing',
    titleAr: 'فحص تحميل المصاريف المباشرة وغير المباشرة وفروق التحميل',
    titleEn: 'Verify Two-Stage Overhead Allocation & Absorption Variance',
    descAr: 'تأكد من مراكز التكلفة، توزيع «مشترك» على الأقسام ثم المنتجات، أوضاع التحميل (خامات فقط / نسبة ثابتة / قواعد)، استيراد الرواتب والمالية دون تكرار، قفل الشهر عند الإغلاق الرسمي، وحجب الشاشة عن الكاشير والشيفات.',
    descEn: 'Confirm cost centers, two-stage allocation, overhead modes, deduplicated HR/Finance import, month locking at official close, and strict RBAC blocking cashiers and chefs.',
    icon: <ClipboardCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
  {
    id: 'privacy_anonymize',
    categoryAr: 'الخصوصية',
    categoryEn: 'Privacy',
    titleAr: 'اختبار عزل بيانات العملاء وإخفاء الهوية',
    titleEn: 'Verify Customer PII Isolation & Anonymization',
    descAr: 'تأكد من عدم ظهور هاتف وعنوان العميل في تذاكر المطبخ والبار، وجرّب إخفاء هوية عميل مع بقاء إجمالي مبيعاته في التقارير.',
    descEn: 'Confirm customer phone/address are hidden on KDS tickets, and test anonymizing a customer while preserving sales totals.',
    icon: <EyeOff className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
  },
  // الحزمة 6 — سيناريوهات الإطلاق التسعة الشاملة (أ – ط)
  {
    id: 'pkg6_scenario_a',
    categoryAr: 'سيناريو الإطلاق أ',
    categoryEn: 'Launch Scenario A',
    titleAr: 'سيناريو أ: العملة ج.م والأرقام باللوحة وتحويل المشرقية ٠-٩ ونقاء العربية',
    titleEn: 'Scenario A: EGP Currency, Keyboard Numerals & Arabic Purity',
    descAr: 'تأكد من عرض كل الأسعار والتقارير بالجنيه المصري (ج.م) دون رمز دولار، وتقبل خانات الأرقام الإدخال بلوحة المفاتيح مع تحويل ٠-٩ تلقائياً، وخلو الواجهة من المصطلحات التقنية الإنجليزية.',
    descEn: 'Verify EGP currency formatting across all views, smooth keyboard numeric input with Eastern Arabic digit conversion, and clean Arabic glossary labels.',
    icon: <Coins className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  },
  {
    id: 'pkg6_scenario_b',
    categoryAr: 'سيناريو الإطلاق ب',
    categoryEn: 'Launch Scenario B',
    titleAr: 'سيناريو ب: شجرة الأقسام ثلاثية المستويات ومنع التكرار والتراجع 8 ثوانٍ',
    titleEn: 'Scenario B: 3-Level Category Tree, Duplicate Guard & 8s Undo',
    descAr: 'تأكد من عمل شجرتي المنتجات والخامات (رئيسي ← فرعي ← تصنيف)، ومنع تكرار اسم الصنف في القسم نفسه، وإتاحة التراجع 8 ثوانٍ بعد الحذف دون نوافذ متصفح.',
    descEn: 'Verify product/material 3-level trees, same-category duplicate blocking, and 8-second undo after in-app delete confirmation.',
    icon: <FolderTree className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
  {
    id: 'pkg6_scenario_c',
    categoryAr: 'سيناريو الإطلاق ج',
    categoryEn: 'Launch Scenario C',
    titleAr: 'سيناريو ج: الفروع والمخازن والوحدات ودورة الطلبية والرفض الجزئي',
    titleEn: 'Scenario C: Warehouses, 3-Tier Units & Requisition Partial Rejection',
    descAr: 'تأكد من تحويل الكرتونة/العلبة/الجرام لحظياً، وصرف الطلبية إلى ذمة «في الطريق»، ثم الاستلام الجزئي مع سبب رفض إلزامي وعودة المرفوض للمخزن الرئيسي.',
    descEn: 'Verify major/sub/base unit conversion, dispatch to in-transit custody, partial receipt with mandatory rejection reason, and return to main stock.',
    icon: <Warehouse className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  },
  {
    id: 'pkg6_scenario_d',
    categoryAr: 'سيناريو الإطلاق د',
    categoryEn: 'Launch Scenario D',
    titleAr: 'سيناريو د: الجرد الفعلي والتجريبي والملاحظات اليومية ونافذة تفاصيل اليوم',
    titleEn: 'Scenario D: Physical/Draft Audit, Daily Notes & Day Details Modal',
    descAr: 'تأكد من معادلة التقديري باستبعاد «في الطريق»، ومعاينة الفروق في الجرد التجريبي قبل الإغلاق الرسمي، وفتح نافذة تفاصيل اليوم والملاحظات وطباعة عبارة المشكلات غير المحلولة.',
    descEn: 'Verify estimated formula excluding in-transit stock, draft vs official close, day details modal in audit, and mandatory unresolved notes print warning.',
    icon: <ClipboardCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
  },
  {
    id: 'pkg6_scenario_e',
    categoryAr: 'سيناريو الإطلاق هـ',
    categoryEn: 'Launch Scenario E',
    titleAr: 'سيناريو هـ: التجهيزات على الصيغة والدفعات الاختيارية وتفكيك البيع والجرد',
    titleEn: 'Scenario E: On-Formula Preps, Optional Batches & Depletion',
    descAr: 'تأكد من عمل التجهيزات «على الصيغة»، ومعامل الطبخ والحصص، والخصم من مخزن القسم عند البيع، وتشغيل الدفعات ثم إرجاع المتبقي لخامات عند إيقافه، وإدراج المتبقي في الجرد.',
    descEn: 'Verify on-formula preparations, cooking factors, portions, POS depletion from section warehouse, batch toggle rollback, and audit remaining prep count.',
    icon: <ChefHat className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  },
  {
    id: 'pkg6_scenario_f',
    categoryAr: 'سيناريو الإطلاق و',
    categoryEn: 'Launch Scenario F',
    titleAr: 'سيناريو و: تحميل المصاريف على مرحلتين وقفل الشهر وحاسبة التجربة',
    titleEn: 'Scenario F: Two-Stage Overhead Allocation, Month Lock & Cost Simulator',
    descAr: 'تأكد من توزيع «مشترك» على مراكز التكلفة ثم المنتجات، واستيراد HR والمالية دون تكرار، وقفل الشهر تلقائياً عند الإغلاق الرسمي، وتجربة تغيير القاعدة داخل حاسبة التجربة.',
    descEn: 'Verify two-stage overhead split, deduplicated HR/Finance import, auto month lock on close, and rule override inside the cost simulator.',
    icon: <Coins className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
  {
    id: 'pkg6_scenario_g',
    categoryAr: 'سيناريو الإطلاق ز',
    categoryEn: 'Launch Scenario G',
    titleAr: 'سيناريو ز: إتاحة الأصناف وحالات الكاشير وحد الأمان المخصص وعزل QR',
    titleEn: 'Scenario G: Item Availability, Custom Yellow Threshold & QR Isolation',
    descAr: 'تأكد من تعديل حد التنبيه الأصفر للصنف، وتحول الزر للأصفر ثم الرمادي في الكاشير عند النفاد، وتجاهل الخامات غير المتتبعة مثل الماء، مع إخفاء تفاصيل المخزون والتكلفة عن منيو QR.',
    descEn: 'Verify custom low-stock threshold, yellow/gray POS buttons, untracked materials like water, and complete stock/cost hiding in QR menu.',
    icon: <ShoppingBag className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  },
  {
    id: 'pkg6_scenario_h',
    categoryAr: 'سيناريو الإطلاق ح',
    categoryEn: 'Launch Scenario H',
    titleAr: 'سيناريو ح: الأمان وتعيين رمز PIN من 6 خانات وعزل خزينة الكاشير',
    titleEn: 'Scenario H: Security, 6-Digit One-Time PIN & Cashier Vault Isolation',
    descAr: 'تأكد من حصر إدارة الأدوار والرموز في القيادة، وتوليد PIN عشوائي لمرة واحدة مع إجبار تغييره عند أول دخول، وعزل الكاشير في ورديته عن رصيد الخزينة العامة والورديات المغلقة.',
    descEn: 'Verify leadership-only role controls, one-time 6-digit PIN reset with forced change, and strict cashier isolation from general vault and closed shifts.',
    icon: <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
  },
  {
    id: 'pkg6_scenario_i',
    categoryAr: 'سيناريو الإطلاق ط',
    categoryEn: 'Launch Scenario I',
    titleAr: 'سيناريو ط: فاحص الواجهة وغلاف الأخطاء والنسخ الاحتياطي والبيانات التجريبية',
    titleEn: 'Scenario I: UI Inspector, Error Boundary, Backup & Demo Scenario',
    descAr: 'تأكد من تجربة عرض الموبايل في فاحص الواجهة (`320/360/412px`) وسجل الأخطاء، واختبار تصدير النسخة الاحتياطية واستعادتها مع التراجع عند الخطأ، وتشغيل البيانات التجريبية الموحدة.',
    descEn: 'Verify UI Inspector mobile preview (`320/360/412px`), error log capture, checksummed JSON backup/restore rollback, and unified demo scenario seeding.',
    icon: <DatabaseBackup className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
  },
];

export const PreLaunchChecklistView: React.FC = () => {
  const { currentUser, currentEstablishment, setActiveView } = useAuth();
  const { isRtl } = useI18n();
  const isAr = isRtl;
  const estId = currentEstablishment?.id || 'default';

  const isAuthorized =
    currentUser?.role === 'tenant_admin' ||
    currentUser?.role === 'general_manager' ||
    currentUser?.role === 'super_admin';

  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() =>
    uiPreferencesRepository.getPrelaunchChecklist(estId)
  );

  useEffect(() => {
    setCheckedMap(uiPreferencesRepository.getPrelaunchChecklist(estId));
  }, [estId]);

  const toggleStep = (id: string) => {
    const next = { ...checkedMap, [id]: !checkedMap[id] };
    setCheckedMap(next);
    uiPreferencesRepository.savePrelaunchChecklist(estId, next);
  };

  const resetAll = () => {
    setCheckedMap({});
    uiPreferencesRepository.savePrelaunchChecklist(estId, {});
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isAr ? 'شاشة مقصورة على المالك والمدير العام' : 'Owner & General Manager Access Only'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {isAr
            ? 'لا تملك صلاحية الوصول إلى قائمة الفحص قبل التشغيل.'
            : 'You do not have permission to access the Pre-Launch Verification Checklist.'}
        </p>
        <Button
          onClick={() => setActiveView('dashboard')}
          className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-sm font-semibold hover:bg-cyan-700"
        >
          {isAr ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
        </Button>
      </div>
    );
  }

  const completedCount = CHECKLIST_STEPS.filter((s) => checkedMap[s.id]).length;
  const progressPct = Math.round((completedCount / CHECKLIST_STEPS.length) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              {isAr ? 'شاشة المالك والمدير السرية' : 'Owner & Manager Verification'}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
              {isAr ? 'قائمة الفحص قبل التشغيل' : 'Pre-Launch Verification Checklist'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isAr
                ? 'تحقق يدوياً من جميع السيناريوهات التشغيلية والأمنية قبل اعتماد المنشأة للتشغيل الفعلي.'
                : 'Manually verify all operational, UI, and security scenarios before going live.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <Button
              type="button"
              onClick={() => setActiveView('ui_inspector')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-300 dark:border-cyan-800 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
            >
              <Smartphone className="w-3.5 h-3.5" />
              {isAr ? 'فاحص الواجهة' : 'UI Inspector'}
            </Button>
            <Button
              type="button"
              onClick={() => setActiveView('error_log')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            >
              <Lock className="w-3.5 h-3.5" />
              {isAr ? 'سجل الأخطاء' : 'Error Log'}
            </Button>
            <Button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {isAr ? 'إعادة ضبط' : 'Reset'}
            </Button>
            <Button
              type="button"
              onClick={() => setActiveView('settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold hover:bg-slate-800"
            >
              {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              {isAr ? 'الإعدادات' : 'Settings'}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-slate-700 dark:text-slate-300">
              {isAr
                ? `تم إنجاز ${completedCount} من ${CHECKLIST_STEPS.length} خطوات`
                : `${completedCount} of ${CHECKLIST_STEPS.length} steps verified`}
            </span>
            <span className="text-cyan-600 dark:text-cyan-400">{progressPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {CHECKLIST_STEPS.map((step) => {
          const isChecked = !!checkedMap[step.id];
          return (
            <Button
              key={step.id}
              type="button"
              onClick={() => toggleStep(step.id)}
              className={`w-full text-start p-4 sm:p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                isChecked
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-700'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isChecked ? (
                  <CheckSquare className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Square className="w-6 h-6 text-slate-400 dark:text-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {step.icon}
                    {isAr ? step.categoryAr : step.categoryEn}
                  </span>
                </div>
                <h3
                  className={`text-base font-bold ${
                    isChecked
                      ? 'line-through text-slate-500 dark:text-slate-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {isAr ? step.titleAr : step.titleEn}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {isAr ? step.descAr : step.descEn}
                </p>
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
