/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { TygosLogo, TYGOS_LOGO_SRC } from '../brand/TygosLogo.tsx';
import { LanguageSelector } from '../common/LanguageSelector.tsx';
import { ThemeSwitcher } from '../common/ThemeSwitcher.tsx';
import { ConnectivityStatus } from '../common/ConnectivityStatus.tsx';
import { DraggableAssistantLauncher } from '../ai/DraggableAssistantLauncher.tsx';
import { GuidedTourModal } from '../common/GuidedTourModal.tsx';
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
  const [isTourOpen, setIsTourOpen] = useState(false);

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
    cashier: { ar: 'أمين الصندوق (كاشير)', en: 'Cashier' },
    hr_manager: { ar: 'مدير الموارد البشرية', en: 'HR Manager' },
    public_relations: { ar: 'علاقات الضيوف وكبار الشخصيات', en: 'Guest Relations' },
    kitchen_manager: { ar: 'رئيس الطهاة (شيف المطبخ)', en: 'Executive Chef' },
    bar_manager: { ar: 'مدير قسم المشروبات والبار', en: 'Bar & Beverage Manager' },
    waiter: { ar: 'مقدم خدمة (نادل)', en: 'Service Waiter' },
  };

  const navItems = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard', 'Executive Dashboard'),
      icon: LayoutDashboard,
      roles: [
        'tenant_admin',
        'general_manager',
        'financial_manager',
        'financial_accountant',
        'cost_accountant',
        'store_manager',
        'super_admin',
      ],
    },
    {
      id: 'pos',
      label: t('navigation.pos', 'Point of Sale (POS)'),
      icon: UtensilsCrossed,
      roles: ['cashier', 'waiter', 'general_manager', 'tenant_admin', 'super_admin'],
    },
    {
      id: 'menu',
      label: t('navigation.menu', 'Menu & Recipes (BOM)'),
      icon: ChefHat,
      roles: ['tenant_admin', 'general_manager', 'kitchen_manager', 'bar_manager', 'cost_accountant', 'super_admin'],
    },
    {
      id: 'cost_control',
      label: t('navigation.costControl', 'Cost Control & Variance'),
      icon: Scale,
      roles: ['tenant_admin', 'general_manager', 'cost_accountant', 'financial_manager', 'super_admin'],
    },
    {
      id: 'inventory',
      label: t('navigation.inventory', 'Inventory Warehouses'),
      icon: Package,
      roles: ['tenant_admin', 'general_manager', 'store_manager', 'cost_accountant', 'kitchen_manager', 'super_admin'],
    },
    {
      id: 'purchasing',
      label: t('navigation.purchasing', 'Purchasing & Suppliers'),
      icon: ShoppingBag,
      roles: ['tenant_admin', 'general_manager', 'store_manager', 'financial_manager', 'financial_accountant', 'super_admin'],
    },
    {
      id: 'finance',
      label: t('navigation.finance', 'Finance & Accounting'),
      icon: DollarSign,
      roles: ['tenant_admin', 'general_manager', 'financial_manager', 'financial_accountant', 'super_admin'],
    },
    {
      id: 'tax',
      label: t('navigation.tax', 'Tax & E-Invoicing'),
      icon: Receipt,
      roles: ['tenant_admin', 'financial_manager', 'tax_accountant', 'super_admin'],
    },
    {
      id: 'hr',
      label: t('navigation.hr', 'HR & Labor Accounting'),
      icon: Users,
      roles: ['tenant_admin', 'general_manager', 'hr_manager', 'super_admin'],
    },
    {
      id: 'crm',
      label: t('navigation.crm', 'CRM & Guest Loyalty'),
      icon: HeartHandshake,
      roles: ['tenant_admin', 'general_manager', 'public_relations', 'cashier', 'super_admin'],
    },
    {
      id: 'chat',
      label: t('navigation.chat', 'Staff Internal Chat'),
      icon: MessageSquare,
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
  ];

  if (role === 'super_admin') {
    navItems.unshift({
      id: 'super_admin',
      label: t('admin.controlCenter', 'Super Admin Center'),
      icon: ShieldAlert,
      roles: ['super_admin'],
    });
  }

  const allowedNav = navItems.filter((item) => item.roles.includes(role));
  const currentRoleLabel = roleLabels[role]?.[language === 'ar' ? 'ar' : 'en'] || role;
  const currentActiveNav = navItems.find((n) => n.id === activeView);

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
          <button
            onClick={endSupportSession}
            className="px-3 py-1 rounded bg-slate-950 text-amber-300 hover:bg-slate-900 text-xs font-semibold cursor-pointer"
          >
            {isAr ? 'إنهاء جلسة الدعم' : 'Exit Support Session'}
          </button>
        </div>
      )}

      {/* 2. Top Header Bar (Responsive Mobile-First Architecture) */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b101e] sticky top-0 z-40 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
        {/* Zone 1: Navigation Trigger & Clickable Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle Navigation Drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Clickable Logo Mark that always returns to Dashboard */}
          <button
            type="button"
            onClick={() => setActiveView(role === 'super_admin' ? 'super_admin' : 'dashboard')}
            className="cursor-pointer flex items-center text-start group"
            title={isAr ? 'العودة للوحة القيادة الرئيسية' : 'Return to Executive Dashboard'}
          >
            <TygosLogo variant="responsive-header" showSubtitle />
          </button>

          {/* Current Page Title on Mobile / Tablet */}
          {currentActiveNav && (
            <span className="lg:hidden text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[110px] sm:max-w-none ps-1 border-s border-slate-200 dark:border-slate-800">
              {currentActiveNav.label}
            </span>
          )}

          {/* Partition Identifier (Desktop) */}
          {currentEstablishment && role !== 'super_admin' && (
            <div className="hidden lg:flex items-center gap-2 ms-2 ps-3 border-s border-slate-200 dark:border-slate-800">
              <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400" dir="ltr">
                {currentEstablishment.code}
              </span>
              <span className="text-xs text-slate-500 truncate max-w-[160px]">
                {currentEstablishment.name}
              </span>
            </div>
          )}
        </div>

        {/* Zone 2: Universal Search Affordance (Medium & Large screens) */}
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 hover:border-cyan-500/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t('common.search', 'Search across system (⌘K)...')}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400" dir="ltr">
              ⌘K
            </span>
          </button>
        </div>

        {/* Zone 3: Essential Actions & Utilities (Clean on Mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Tygos AI Assistant Trigger */}
          <button
            type="button"
            onClick={() => setIsAssistantOpen(true)}
            className="flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xs cursor-pointer transition-transform hover:scale-[1.02]"
            title={isAr ? 'مساعد TYGOS الذكي' : 'TYGOS AI Assistant'}
          >
            <div className="w-4 h-4 rounded-sm p-0.5 flex items-center justify-center">
              <img src={TYGOS_LOGO_SRC} alt="Tygos" className="w-full h-full object-contain" />
            </div>
            <span className="hidden sm:inline">TYGOS</span>
          </button>

          {/* Security & Audit Notification */}
          <button
            type="button"
            onClick={() => setIsAuditReportModalOpen(true)}
            className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
            title={isAr ? 'سجل التدقيق الأمني' : 'Security Audit Trail'}
          >
            <Shield className="w-4 h-4 text-purple-400" />
            {pendingRequestsCount > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-mono font-bold rounded-full flex items-center justify-center">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          {/* Guided Tour Trigger (Hidden on tiny screens, inside drawer) */}
          <button
            type="button"
            onClick={() => setIsTourOpen(true)}
            className="hidden sm:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
            title={isAr ? 'الجولة الإرشادية بالنظام' : 'Guided Tour'}
          >
            <Compass className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Help Center */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            className="hidden sm:flex p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors cursor-pointer"
            title={isAr ? 'دليل التشغيل والمعرفة (SOP)' : 'Help & Knowledge Center'}
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Connectivity Status (Medium screens & up) */}
          <div className="hidden md:block">
            <ConnectivityStatus />
          </div>

          {/* Role Simulator Switcher (Large screens) */}
          <div className="relative hidden xl:block">
            <button
              type="button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 transition-colors cursor-pointer"
              title={isAr ? 'محاكاة الأدوار والصلاحيات' : 'Simulate roles'}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>{currentRoleLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute end-0 mt-2 w-64 bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 z-50 text-xs max-h-96 overflow-y-auto animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 block">
                  {t('auth.quickRoles', 'Simulate Role-Based Dashboards')}
                </span>
                {Object.entries(roleLabels).map(([rKey, rObj]) => {
                  const label = isAr ? rObj.ar : rObj.en;
                  return (
                    <button
                      key={rKey}
                      type="button"
                      onClick={() => {
                        switchRole(rKey as UserRole);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-start px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                        role === rKey
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{label}</span>
                      {role === rKey && <span className="text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Language Selector (Hidden on mobile header, in drawer) */}
          <div className="hidden sm:block">
            <LanguageSelector variant="header" />
          </div>

          {/* Theme Switcher (Hidden on mobile header, in drawer) */}
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>

          {/* Sign Out Action */}
          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
            title={t('auth.logout', 'Sign Out')}
          >
            <LogOut className="w-4 h-4 rtl:rotate-180" />
          </button>
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
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                <button
                  type="button"
                  onClick={() => {
                    setIsTourOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'الجولة الإرشادية' : 'Guided Tour'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsHelpOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'دليل التشغيل' : 'Docs & Help'}</span>
                </button>

                <button
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
                </button>
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
                    <button
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
                    </button>
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

              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 px-3 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 rtl:rotate-180" />
                <span>{t('auth.logout', 'Sign Out')}</span>
              </button>
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
          {/* Menu Items List */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 block">
              {isAr ? 'الوحدات التشغيلية والمالية' : 'Operations & Management'}
            </span>
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
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
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer: Quick Guided Tour & Landing link */}
          <div className="space-y-2 mt-4">
            <button
              onClick={() => setIsTourOpen(true)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'بدء الجولة الإرشادية' : 'Start Guided Tour'}</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            <button
              onClick={() => setActiveView('landing')}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-blue-500" />
                <span>{isAr ? 'صفحة المنظومة التسويقية' : 'Public Landing Page'}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </button>
          </div>
        </aside>

        {/* Main Content Area (Zero Horizontal Overflow, Mobile-First) */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden max-w-[1600px] w-full mx-auto relative min-w-0">
          {children}

          {/* Movable Draggable TYGOS AI Assistant Launcher (snaps to edge, never blocks UI) */}
          <DraggableAssistantLauncher
            onClick={() => setIsAssistantOpen(true)}
            isOpen={isAssistantOpen}
          />
        </main>
      </div>

      {/* 4. Guided Tour Modal Component */}
      <GuidedTourModal isOpen={isTourOpen} onClose={() => setIsTourOpen(false)} />

      {/* 5. Minimal Footer */}
      <footer className="py-2.5 px-4 bg-white dark:bg-[#0b101e] border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800 dark:text-slate-200">Tygos</span>
          <span>· {t('brand.tagline', 'Hospitality ERP & Intelligence Platform')}</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span>{isAr ? 'العربية (الافتراضية)' : 'Arabic (Primary)'}</span>
          <span>·</span>
          <span>{dir.toUpperCase()}</span>
          <span>·</span>
          <span className="text-cyan-500 font-bold">
            {isAr ? 'المرحلة 3 · الذكاء المترابط وتجربة الجوال' : 'Phase 3 · Mobile-First Connected SaaS'}
          </span>
        </div>
      </footer>
    </div>
  );
};
