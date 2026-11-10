/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ChefHat,
  Scale,
  Package,
  ShoppingBag,
  DollarSign,
  Receipt,
  Users,
  HeartHandshake,
  MessageSquare,
  ShieldAlert,
  ChevronDown,
  LogOut,
  Search,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Shield,
  HelpCircle,
  Globe2,
  Compass,
  Activity,
  Settings,
  QrCode,
  Flame,
  Smartphone,
  Vault,
  LayoutGrid,
  GitBranch,
  ArrowRight,
  ArrowLeft,
  Bell,
  MoreHorizontal,
  FolderTree,
  Warehouse,
  ClipboardCheck,
  CheckCircle2,
} from 'lucide-react';
import { warehouseService, InAppNotification } from '../../services/warehouseService.ts';
import { getScreenTitle } from '../../i18n/glossary.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { orderTransport } from '../../services/orderTransport.ts';
import { TygosLogo, TYGOS_LOGO_SRC } from '../brand/TygosLogo.tsx';
import { PermanentAppBrandBadge } from '../brand/PermanentAppBrandBadge.tsx';
import { LanguageSelector } from '../common/LanguageSelector.tsx';
import { ThemeSwitcher } from '../common/ThemeSwitcher.tsx';
import { ConnectivityStatus } from '../common/ConnectivityStatus.tsx';
import { DraggableAssistantLauncher } from '../ai/DraggableAssistantLauncher.tsx';
import { GuidedTourModal } from '../common/GuidedTourModal.tsx';
import { MandatoryPasswordChangeModal } from '../common/MandatoryPasswordChangeModal.tsx';
import { VoiceNavigatorButton } from '../common/VoiceNavigatorButton.tsx';
import { UserRole } from '../../types/index.ts';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    currentUser,
    currentEstablishment,
    activeView,
    setActiveView,
    logout,
    switchRole,
    activeSupportSession,
    endSupportSession,
    setIsSearchOpen,
  } = useAuth();
  const role: UserRole = currentUser?.role || 'tenant_admin';
  const { t, language, dir } = useI18n();
  const isAr = language === 'ar';
  const {
    isAssistantOpen,
    setIsAssistantOpen,
    setIsAuditReportModalOpen,
    setIsHelpOpen,
    privilegedRequests,
  } = useBusiness();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();

  const estId = currentEstablishment?.id || 'default';
  const [notifications, setNotifications] = useState<InAppNotification[]>(() =>
    warehouseService.getNotifications(estId)
  );

  React.useEffect(() => {
    const refresh = () => setNotifications(warehouseService.getNotifications(estId));
    const timer = setInterval(refresh, 4000);
    refresh();
    return () => clearInterval(timer);
  }, [estId]);

  const unreadNotifs = notifications.filter(
    (n) => !n.isRead && (n.targetRoles.length === 0 || n.targetRoles.includes(role))
  );

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  React.useEffect(() => {
    const estId = currentEstablishment?.id || 'default';
    const unsub = orderTransport.subscribe((event) => {
      if (event.type === 'ORDER_SUBMITTED' && event.order.establishmentId === estId) {
        showToast({
          type: 'warning',
          title: isAr ? 'طلب جديد من منيو QR' : 'New QR Menu Order',
          message: isAr
            ? `طلب جديد من ${event.order.customerName} (${event.order.items.length} أصناف)`
            : `New order from ${event.order.customerName} (${event.order.items.length} items)`,
          sound: true,
          groupKey: 'incoming_qr_order',
          action: {
            label: isAr ? 'عرض الطلبات' : 'View Orders',
            onClick: () => setActiveView('pos'),
          },
        });
      }
    });
    return unsub;
  }, [currentEstablishment?.id, isAr, setActiveView, showToast]);

  const pendingRequestsCount = privilegedRequests.filter((r) => r.status === 'pending').length;

  const roleLabels: Record<UserRole, { ar: string; en: string }> = {
    super_admin: { ar: 'المدير العام للمنظومة', en: 'Super Admin' },
    tenant_admin: { ar: 'مالك / مدير المنشأة', en: 'Establishment Owner' },
    general_manager: { ar: 'المدير العام (GM)', en: 'General Manager' },
    financial_manager: { ar: 'المدير المالي (CFO)', en: 'Financial Director' },
    financial_accountant: { ar: 'المحاسب المالي', en: 'Financial Accountant' },
    cost_accountant: { ar: 'محاسب التكاليف والانحراف', en: 'Cost Controller' },
    tax_accountant: { ar: 'محاسب الضرائب والفواتير', en: 'Tax Accountant' },
    store_manager: { ar: 'أمين المستودع المركزي', en: 'Warehouse Manager' },
    warehouse_manager: { ar: 'مدير المخازن العام', en: 'Warehouse Manager' },
    storekeeper: { ar: 'أمين المخزن', en: 'Storekeeper' },
    head_chef: { ar: 'الشيف العمومي', en: 'Head Chef' },
    section_manager: { ar: 'مدير القسم (بار/مخبز/حلواني)', en: 'Section Manager' },
    cashier: { ar: 'أمين الصندوق (كاشير)', en: 'Cashier' },
    hr_manager: { ar: 'مدير الموارد البشرية', en: 'HR Manager' },
    public_relations: { ar: 'علاقات الضيوف وكبار الشخصيات', en: 'Guest Relations' },
    kitchen_manager: { ar: 'رئيس الطهاة (شيف المطبخ)', en: 'Executive Chef' },
    bar_manager: { ar: 'مدير قسم المشروبات والبار', en: 'Bar & Beverage Manager' },
    marketing_officer: { ar: 'مسؤول التسويق والمنيو', en: 'Marketing & Menu Officer' },
    waiter: { ar: 'مقدم خدمة (نادل)', en: 'Service Waiter' },
  };

  const navItems: Array<{
    id: string;
    label: string;
    icon: React.FC<any>;
    group: 'operations' | 'menu_cost' | 'finance_hr' | 'admin';
    roles: UserRole[];
  }> = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard', 'Executive Dashboard'),
      icon: LayoutDashboard,
      group: 'operations',
      roles: [
        'tenant_admin',
        'general_manager',
        'financial_manager',
        'financial_accountant',
        'cost_accountant',
        'store_manager',
        'marketing_officer',
        'super_admin',
      ],
    },
    {
      id: 'pos',
      label: t('navigation.pos', 'Point of Sale (POS)'),
      icon: UtensilsCrossed,
      group: 'operations',
      roles: ['cashier', 'waiter', 'general_manager', 'tenant_admin', 'super_admin'],
    },
    {
      id: 'kds',
      label: isAr ? 'شاشات المطبخ (KDS)' : 'Kitchen Stations (KDS)',
      icon: Flame,
      group: 'operations',
      roles: ['kitchen_manager', 'bar_manager', 'tenant_admin', 'general_manager', 'cashier', 'super_admin'],
    },
    {
      id: 'tables_management',
      label: isAr ? 'الطاولات والمناطق والحجوزات' : 'Tables & Reservations',
      icon: LayoutGrid,
      group: 'operations',
      roles: ['tenant_admin', 'general_manager', 'cashier', 'waiter', 'super_admin'],
    },
    {
      id: 'order_trace',
      label: isAr ? 'تتبّع دورة الطلب' : 'Order Lifecycle Trace',
      icon: GitBranch,
      group: 'operations',
      roles: ['tenant_admin', 'general_manager', 'financial_manager', 'super_admin'],
    },
    {
      id: 'menu_management',
      label: isAr ? 'إدارة المنيو والصور' : 'Menu & Visuals',
      icon: QrCode,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'marketing_officer', 'super_admin'],
    },
    {
      id: 'qr_tables',
      label: isAr ? 'ملصقات QR للطاولات' : 'Table QR Stickers',
      icon: Smartphone,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'marketing_officer', 'cashier', 'super_admin'],
    },
    {
      id: 'products',
      label: isAr ? 'المنتجات' : 'Products',
      icon: UtensilsCrossed,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'kitchen_manager', 'bar_manager', 'cost_accountant', 'cashier', 'waiter', 'super_admin'],
    },
    {
      id: 'categories',
      label: isAr ? 'الأقسام' : 'Categories',
      icon: FolderTree,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'financial_manager', 'cost_accountant', 'store_manager', 'super_admin'],
    },
    {
      id: 'menu',
      label: isAr ? 'الوصفات (رسبي)' : 'Recipes (BOM)',
      icon: ChefHat,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'kitchen_manager', 'bar_manager', 'cost_accountant', 'super_admin'],
    },
    {
      id: 'cost_control',
      label: t('navigation.costControl', 'Cost Control & Variance'),
      icon: Scale,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'cost_accountant', 'financial_manager', 'super_admin'],
    },
    {
      id: 'inventory',
      label: t('navigation.inventory', 'Inventory Warehouses'),
      icon: Package,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'store_manager', 'cost_accountant', 'kitchen_manager', 'super_admin'],
    },
    {
      id: 'warehouses',
      label: isAr ? 'المخازن وحركات الأصناف' : 'Warehouses & Supply',
      icon: Warehouse,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'warehouse_manager', 'store_manager', 'storekeeper', 'head_chef', 'section_manager', 'cost_accountant', 'financial_manager', 'super_admin'],
    },
    {
      id: 'inventory_audit',
      label: isAr ? 'الجرد الفعلي والانحراف' : 'Inventory Audit',
      icon: ClipboardCheck,
      group: 'menu_cost',
      roles: ['cost_accountant', 'store_manager', 'warehouse_manager', 'tenant_admin', 'general_manager', 'financial_manager', 'super_admin'],
    },
    {
      id: 'daily_notes',
      label: isAr ? 'الملاحظات اليومية' : 'Daily Notes',
      icon: MessageSquare,
      group: 'menu_cost',
      roles: ['cost_accountant', 'store_manager', 'warehouse_manager', 'head_chef', 'tenant_admin', 'general_manager', 'super_admin'],
    },
    {
      id: 'purchasing',
      label: t('navigation.purchasing', 'Purchasing & Suppliers'),
      icon: ShoppingBag,
      group: 'menu_cost',
      roles: ['tenant_admin', 'general_manager', 'store_manager', 'financial_manager', 'financial_accountant', 'super_admin'],
    },
    {
      id: 'treasury',
      label: isAr ? 'الخزينة وتقارير الورديات' : 'Treasury & Z-Reports',
      icon: Vault,
      group: 'finance_hr',
      roles: ['tenant_admin', 'general_manager', 'financial_manager', 'financial_accountant', 'cashier', 'super_admin'],
    },
    {
      id: 'finance',
      label: t('navigation.finance', 'Finance & Accounting'),
      icon: DollarSign,
      group: 'finance_hr',
      roles: ['tenant_admin', 'general_manager', 'financial_manager', 'financial_accountant', 'super_admin'],
    },
    {
      id: 'tax',
      label: t('navigation.tax', 'Tax & E-Invoicing'),
      icon: Receipt,
      group: 'finance_hr',
      roles: ['tenant_admin', 'financial_manager', 'tax_accountant', 'super_admin'],
    },
    {
      id: 'hr',
      label: t('navigation.hr', 'HR & Labor Accounting'),
      icon: Users,
      group: 'finance_hr',
      roles: ['tenant_admin', 'general_manager', 'hr_manager', 'super_admin'],
    },
    {
      id: 'crm',
      label: t('navigation.crm', 'CRM & Guest Loyalty'),
      icon: HeartHandshake,
      group: 'finance_hr',
      roles: ['tenant_admin', 'general_manager', 'public_relations', 'cashier', 'super_admin'],
    },
    {
      id: 'chat',
      label: t('navigation.chat', 'Staff Internal Chat'),
      icon: MessageSquare,
      group: 'admin',
      roles: [
        'tenant_admin',
        'general_manager',
        'kitchen_manager',
        'bar_manager',
        'cashier',
        'waiter',
        'store_manager',
        'hr_manager',
        'financial_accountant',
        'super_admin',
      ],
    },
    {
      id: 'health',
      label: isAr ? 'صحة المنظومة' : 'System Health',
      icon: Activity,
      group: 'admin',
      roles: ['tenant_admin', 'general_manager', 'super_admin'],
    },
    {
      id: 'settings',
      label: isAr ? 'إعدادات المنشأة' : 'Settings',
      icon: Settings,
      group: 'admin',
      roles: ['tenant_admin', 'super_admin'],
    },
    {
      id: 'users_roles',
      label: isAr ? 'أدوار المستخدمين' : 'User Roles & Permissions',
      icon: Users,
      group: 'admin',
      roles: ['super_admin', 'tenant_admin', 'general_manager', 'financial_manager'],
    },
  ];

  if (role === 'super_admin') {
    navItems.unshift({
      id: 'super_admin',
      label: t('admin.controlCenter', 'Super Admin Center'),
      icon: ShieldAlert,
      group: 'admin',
      roles: ['super_admin'],
    });
  }

  const groupLabels: Record<string, { ar: string; en: string }> = {
    operations: { ar: 'التشغيل اليومي والمبيعات', en: 'Daily Operations & POS' },
    menu_cost: { ar: 'المنيو والتكاليف والمخزون', en: 'Menu, Recipes & Inventory' },
    finance_hr: { ar: 'الخزينة والمالية والعملاء', en: 'Treasury, Finance & CRM' },
    admin: { ar: 'الإدارة والإعدادات', en: 'Administration & Settings' },
  };

  const allowedNav = navItems
    .filter((item) => {
      if (
        currentUser?.permittedViews &&
        Array.isArray(currentUser.permittedViews) &&
        currentUser.permittedViews.length > 0
      ) {
        return currentUser.permittedViews.includes(item.id);
      }
      return item.roles.includes(role);
    })
    .map((item) => ({
      ...item,
      label: getScreenTitle(item.id, isAr),
    }));

  const allowedNavIds = allowedNav.map((item) => item.id).join(',');
  React.useEffect(() => {
    if (allowedNav.length > 0 && !allowedNav.some((item) => item.id === activeView)) {
      setActiveView(allowedNav[0].id);
    }
  }, [allowedNavIds, activeView, setActiveView]);

  const currentRoleLabel = roleLabels[role]?.[language === 'ar' ? 'ar' : 'en'] || role;
  const currentScreenTitle = getScreenTitle(activeView, isAr);
  const currentActiveNav = allowedNav.find((item) => item.id === activeView);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors overflow-x-hidden" dir={dir}>
      {/* 1. Maintenance / Audit Banner */}
      {activeSupportSession && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
            <span>
              {isAr
                ? `جلسة دعم فني نشطة للمنشأة [${activeSupportSession.targetEstablishmentCode}] · المشرف: ${activeSupportSession.adminUsername}`
                : `Active Support Session for [${activeSupportSession.targetEstablishmentCode}] · Admin: ${activeSupportSession.adminUsername}`}
            </span>
          </div>
          <Button
            onClick={endSupportSession}
            className="px-3 py-1 rounded bg-slate-950 text-amber-300 hover:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            {isAr ? 'إنهاء جلسة الدعم' : 'Exit Support Session'}
          </Button>
        </div>
      )}

      {/* 2. Calm, Simple Top Header Bar (56px, Single-Line, <= 2 Action Icons + More Menu) */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101e] sticky top-0 z-40 px-3 sm:px-5 flex items-center justify-between gap-2 shrink-0">
        {/* Start Zone: Menu Trigger (Mobile) + Single Neutral Logo + Current Screen Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-w-[40px] min-h-[40px] p-2 rounded-xl"
            aria-label={isAr ? 'القائمة' : 'Menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Single Clickable Logo Mark on Neutral Surface -> Returns to Home */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveView(role === 'super_admin' ? 'super_admin' : 'dashboard')}
            className="p-0.5 rounded-xl shrink-0"
            title={isAr ? 'العودة للرئيسية' : 'Return to Home'}
          >
            <TygosLogo variant="symbol" />
          </Button>

          {/* Current Screen Title (1 short title) */}
          <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
            {currentScreenTitle}
          </h1>
        </div>

        {/* End Zone: ONLY 2 Icons (Notifications + More Menu ⋯) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 1. Notifications / Alerts */}
          <div className="relative">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setMoreMenuOpen(false);
              }}
              className="relative min-w-[40px] min-h-[40px] p-2 rounded-xl"
              aria-label={isAr ? 'التنبيهات وسجل العمليات' : 'Notifications & Activity Log'}
              title={isAr ? 'التنبيهات وسجل العمليات' : 'Notifications & Activity Log'}
              data-testid="header-notifications-button"
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              {(unreadNotifs.length > 0 || pendingRequestsCount > 0) && (
                <span className="absolute -top-1 -end-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifs.length + pendingRequestsCount}
                </span>
              )}
            </Button>

            {notificationsOpen && (
              <div
                className="fixed inset-x-3 top-16 sm:inset-x-auto sm:end-14 sm:w-88 bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 z-50 text-xs space-y-3 max-h-[80vh] overflow-y-auto animate-fade-in"
                data-testid="header-notifications-menu"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-cyan-500" />
                    <span className="font-black text-slate-900 dark:text-white">
                      {isAr ? 'الإشعارات والطلبيات' : 'Notifications & Orders'}
                    </span>
                    {unreadNotifs.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400">
                        {unreadNotifs.length}
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotificationsOpen(false)}
                    aria-label={isAr ? 'إغلاق' : 'Close'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Notifications List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {unreadNotifs.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      {isAr ? 'لا توجد إشعارات جديدة غير مقروءة' : 'No new unread notifications'}
                    </div>
                  ) : (
                    unreadNotifs.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          warehouseService.markNotificationAsRead(estId, notif.id);
                          setNotifications(warehouseService.getNotifications(estId));
                          if (notif.linkView) {
                            setActiveView(notif.linkView);
                          }
                          setNotificationsOpen(false);
                        }}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-cyan-500/50 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(notif.createdAt).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {unreadNotifs.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        unreadNotifs.forEach((n) => warehouseService.markNotificationAsRead(estId, n.id));
                        setNotifications(warehouseService.getNotifications(estId));
                      }}
                      className="text-cyan-600 dark:text-cyan-400"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setNotificationsOpen(false);
                      setIsAuditReportModalOpen(true);
                    }}
                    className="ms-auto"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isAr ? 'سجل العمليات' : 'Audit Log'}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 2. More Menu (⋯) */}
          <div className="relative">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl"
              aria-label={isAr ? 'المزيد' : 'More'}
              title={isAr ? 'المزيد' : 'More'}
              data-testid="header-more-button"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </Button>

            {moreMenuOpen && (
              <div
                className="fixed inset-x-3 top-16 sm:inset-x-auto sm:end-4 sm:w-80 bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 z-50 text-xs space-y-3 max-h-[80vh] overflow-y-auto animate-fade-in"
                data-testid="header-more-menu"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-black text-slate-900 dark:text-white">
                    {isAr ? 'خيارات سريعة' : 'Quick Options'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMoreMenuOpen(false)}
                    aria-label={isAr ? 'إغلاق' : 'Close'}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Theme, Language & Voice */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900">
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {isAr ? 'المظهر واللغة' : 'Theme & Language'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <VoiceNavigatorButton />
                    <LanguageSelector variant="header" />
                    <ThemeSwitcher />
                  </div>
                </div>

                {/* Quick Actions: Search, Help & Tour, Activity Log */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsSearchOpen(true);
                      setMoreMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{isAr ? 'بحث سريع' : 'Search'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAuditReportModalOpen(true);
                      setMoreMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>{isAr ? 'سجل العمليات' : 'Activity Log'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsHelpOpen(true);
                      setMoreMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{isAr ? 'المساعدة' : 'Help'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsTourOpen(true);
                      setMoreMenuOpen(false);
                    }}
                    className="justify-start"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>{isAr ? 'جولة سريعة' : 'Quick Tour'}</span>
                  </Button>
                </div>

                {/* Role Switcher */}
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                    className="w-full justify-between"
                  >
                    <span>
                      {isAr ? 'الدور الحالي:' : 'Role:'} {currentRoleLabel}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                  {roleDropdownOpen && (
                    <div className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-44 overflow-y-auto space-y-1">
                      {Object.entries(roleLabels).map(([rKey, rObj]) => (
                        <Button
                          key={rKey}
                          type="button"
                          size="xs"
                          variant={role === rKey ? 'primary' : 'ghost'}
                          selected={role === rKey}
                          onClick={() => {
                            switchRole(rKey as UserRole);
                            setRoleDropdownOpen(false);
                            setMoreMenuOpen(false);
                          }}
                          className="w-full justify-between"
                        >
                          <span>{isAr ? rObj.ar : rObj.en}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* App Link */}
                <PermanentAppBrandBadge variant="card" />

                {/* Sign Out */}
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    logout();
                  }}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 rtl:rotate-180" />
                  <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer Backdrop & Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0b101e] border-e border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between h-full p-4 overflow-y-auto z-10">
            <div className="space-y-4">
              {/* Drawer Brand Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <TygosLogo variant="compact" showSubtitle />
                <Button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Permanent Approved Logo & Verified App URL Card */}
              <PermanentAppBrandBadge variant="card" />

              {/* Establishment Code Lockup */}
              {currentEstablishment && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase font-mono">{isAr ? 'كود المنشأة:' : 'Partition Code:'}</div>
                  <div className="text-sm font-black font-mono text-cyan-600 dark:text-cyan-400" dir="ltr">
                    {currentEstablishment.code}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 truncate mt-0.5 font-semibold">
                    {currentEstablishment.name}
                  </div>
                </div>
              )}

              {/* Quick Actions (Guided Tour + Help + Landing) */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    setIsTourOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'الجولة الإرشادية' : 'Guided Tour'}</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setIsHelpOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'دليل التشغيل' : 'Docs & Help'}</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => {
                    setActiveView('landing');
                    setMobileMenuOpen(false);
                  }}
                  className="col-span-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-blue-400" />
                    <span>{isAr ? 'صفحة المنظومة التسويقية' : 'Public Landing Page'}</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </Button>
              </div>

              {/* Navigation Items List */}
              <div className="space-y-1 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 block">
                  {isAr ? 'الوحدات التشغيلية والمالية' : 'Operations & Management'}
                </span>
                {allowedNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <Button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer Controls */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{isAr ? 'اللغة والسمة:' : 'Language & Theme:'}</span>
                <div className="flex items-center gap-2">
                  <LanguageSelector variant="header" />
                  <ThemeSwitcher />
                </div>
              </div>

              <Button
                type="button"
                onClick={logout}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 rtl:rotate-180" />
                <span>{t('auth.logout', 'Sign Out')}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden min-w-0 max-w-full">
        {/* Desktop Navigation Sidebar (100% Solid Opacity in Light and Dark Mode) */}
        <aside
          className="hidden lg:flex w-64 border-e border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0b101e] flex-col justify-between shrink-0 p-4 transition-all z-30 shadow-xs"
        >
          {/* Menu Items List (Grouped & Collapsible) */}
          <div className="space-y-3">
            {(['operations', 'menu_cost', 'finance_hr', 'admin'] as const).map((groupKey) => {
              const items = allowedNav.filter((item) => item.group === groupKey);
              if (items.length === 0) return null;
              const isCollapsed = Boolean(collapsedGroups[groupKey]);
              return (
                <div key={groupKey} className="space-y-1">
                  <Button
                    type="button"
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-3 py-1 cursor-pointer"
                  >
                    <span>{isAr ? groupLabels[groupKey].ar : groupLabels[groupKey].en}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '-rotate-90 rtl:rotate-90' : ''}`}
                    />
                  </Button>
                  {!isCollapsed &&
                    items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                        <Button
                          key={item.id}
                          onClick={() => setActiveView(item.id)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 shadow-xs font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-500' : 'text-slate-400'}`} />
                          <span className="truncate">{item.label}</span>
                        </Button>
                      );
                    })}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer: Permanent Brand Link & Quick Guided Tour */}
          <div className="space-y-2 mt-4">
            <PermanentAppBrandBadge variant="card" />

            <Button
              onClick={() => setIsTourOpen(true)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'بدء الجولة الإرشادية' : 'Start Guided Tour'}</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </Button>

            <Button
              onClick={() => setActiveView('landing')}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-blue-500" />
                <span>{isAr ? 'صفحة المنظومة التسويقية' : 'Public Landing Page'}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </Button>
          </div>
        </aside>

        {/* Main Content Area (Zero Horizontal Overflow, Mobile-First) */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden max-w-[1600px] w-full mx-auto relative min-w-0">
          {activeView !== 'dashboard' && currentActiveNav && (
            <div className="mb-4 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveView(role === 'super_admin' ? 'super_admin' : 'dashboard')}
                  className="px-2 py-1 text-cyan-600 dark:text-cyan-400 font-bold"
                >
                  {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  <span>{isAr ? 'الرئيسية' : 'Home'}</span>
                </Button>
                <span>/</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {currentActiveNav.label}
                </span>
              </div>
              <span className="text-[11px] font-semibold hidden sm:inline">
                {currentRoleLabel}
              </span>
            </div>
          )}
          {children}

          {/* Movable Draggable TYGOS AI Assistant Launcher (snaps to edge, never blocks UI) */}
          <DraggableAssistantLauncher
            onClick={() => setIsAssistantOpen(true)}
            isOpen={isAssistantOpen}
            activeView={activeView}
          />
        </main>
      </div>

      {/* 4. Guided Tour Modal & Mandatory Password Change */}
      <MandatoryPasswordChangeModal />
      <GuidedTourModal isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

      {/* 5. Minimal Footer with Approved Logo & Live App URL */}
      <footer className="py-2.5 px-4 bg-white dark:bg-[#0b101e] border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <PermanentAppBrandBadge variant="footer" />
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>{isAr ? 'العربية (الافتراضية)' : 'Arabic (Primary)'}</span>
          <span>·</span>
          <span>{dir.toUpperCase()}</span>
          <span>·</span>
          <span className="text-cyan-500 font-bold">
            {isAr ? 'المرحلة الرابعة · النسخة الشاملة النهائية المعتمدة' : 'Phase 4 · Complete Final Edition'}
          </span>
        </div>
      </footer>
    </div>
  );
};
