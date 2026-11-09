/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * USER ROLES & PERMISSIONS MANAGEMENT MODULE
 * Allows Super Admin, Tenant Admin, General Manager, and Financial Manager to:
 * 1. View all users, their full names, usernames, and roles.
 * 2. Click any user to inspect and edit their details and custom screen permissions.
 * 3. Change/reset user password directly without knowing the old password.
 * 4. Add new users with role-tailored defaults (e.g. Cashier).
 * 5. Remove/delete user accounts safely.
 * 6. Dynamically restrict visible screens upon user login based on permittedViews.
 */

import React, { useState } from 'react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import {
  Users,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  X,
  Phone,
  Mail,
  Sparkles,
  Filter,
  AlertCircle,
  UtensilsCrossed,
  Flame,
  LayoutGrid,
  GitBranch,
  QrCode,
  Smartphone,
  ChefHat,
  Scale,
  Package,
  ShoppingBag,
  Vault,
  DollarSign,
  Receipt,
  HeartHandshake,
  MessageSquare,
  Activity,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { User, UserRole } from '../../types/index.ts';
import { SCREEN_GLOSSARY, getDefaultViewsForRole, getScreenTitle } from '../../i18n/glossary.ts';
import { generateRandomPin6 } from '../../services/authCrypto.ts';

interface ScreenOption {
  id: string;
  category: 'operations' | 'menu_cost' | 'finance_hr' | 'admin';
  icon: React.ComponentType<{ className?: string }>;
}

const AVAILABLE_SCREENS: ScreenOption[] = [
  // Operations & POS
  { id: 'pos', category: 'operations', icon: UtensilsCrossed },
  { id: 'tables_management', category: 'operations', icon: LayoutGrid },
  { id: 'kds', category: 'operations', icon: Flame },
  { id: 'order_trace', category: 'operations', icon: GitBranch },
  { id: 'dashboard', category: 'operations', icon: Activity },

  // Menu, Recipes & Inventory
  { id: 'menu_management', category: 'menu_cost', icon: QrCode },
  { id: 'qr_tables', category: 'menu_cost', icon: Smartphone },
  { id: 'menu', category: 'menu_cost', icon: ChefHat },
  { id: 'cost_control', category: 'menu_cost', icon: Scale },
  { id: 'inventory', category: 'menu_cost', icon: Package },
  { id: 'purchasing', category: 'menu_cost', icon: ShoppingBag },

  // Treasury, Finance & CRM
  { id: 'treasury', category: 'finance_hr', icon: Vault },
  { id: 'finance', category: 'finance_hr', icon: DollarSign },
  { id: 'tax', category: 'finance_hr', icon: Receipt },
  { id: 'hr', category: 'finance_hr', icon: Users },
  { id: 'crm', category: 'finance_hr', icon: HeartHandshake },

  // Administration & System
  { id: 'chat', category: 'admin', icon: MessageSquare },
  { id: 'health', category: 'admin', icon: Activity },
  { id: 'settings', category: 'admin', icon: Settings },
  { id: 'users_roles', category: 'admin', icon: ShieldCheck },
];

const ROLE_INFO: Record<UserRole, { ar: string; en: string; color: string }> = {
  super_admin: { ar: 'مدير المنظومة العام', en: 'Super Admin', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  tenant_admin: { ar: 'صاحب المنشأة / المدير التنفيذي', en: 'Owner / Admin', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  general_manager: { ar: 'المدير العام للمطعم', en: 'General Manager', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  financial_manager: { ar: 'المدير المالي', en: 'Financial Manager', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  cashier: { ar: 'كاشير نقطة البيع', en: 'Cashier', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  waiter: { ar: 'كابتن صالة / ويتر', en: 'Waiter', color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
  kitchen_manager: { ar: 'شيف المطبخ الرئيسي', en: 'Kitchen Head Chef', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  bar_manager: { ar: 'مشرف البار والمشروبات', en: 'Bar Supervisor', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' },
  store_manager: { ar: 'أمين المخازن والمستودع', en: 'Store Manager', color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
  warehouse_manager: { ar: 'مدير المخازن العام', en: 'Warehouse Manager', color: 'bg-amber-600/15 text-amber-700 dark:text-amber-300 border-amber-600/30' },
  storekeeper: { ar: 'أمين المخزن', en: 'Storekeeper', color: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
  head_chef: { ar: 'الشيف العمومي', en: 'Head Chef', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  section_manager: { ar: 'مدير القسم (بار/مخبز/حلواني)', en: 'Section Manager', color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' },
  cost_accountant: { ar: 'محاسب تكاليف وأغذية', en: 'Cost Accountant', color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
  financial_accountant: { ar: 'محاسب عام', en: 'Accountant', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  tax_accountant: { ar: 'محاسب ضرائب', en: 'Tax Accountant', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30' },
  hr_manager: { ar: 'مسؤول الموارد البشرية', en: 'HR Manager', color: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30' },
  marketing_officer: { ar: 'مسؤول المنيو والتسويق', en: 'Marketing & Menu', color: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30' },
  public_relations: { ar: 'علاقات عامة وضيوف', en: 'Guest Relations', color: 'bg-lime-500/15 text-lime-600 dark:text-lime-400 border-lime-500/30' },
};

const CATEGORY_NAMES: Record<string, { ar: string; en: string }> = {
  operations: { ar: 'العمليات ونقطة البيع والصالة', en: 'Operations, POS & Dining' },
  menu_cost: { ar: 'المنيو والوصفات والمخزون والتكاليف', en: 'Menu, Recipes & Inventory' },
  finance_hr: { ar: 'الخزينة والمالية والضرائب والعملاء', en: 'Treasury, Finance & CRM' },
  admin: { ar: 'الإدارة والنظام والمحادثة', en: 'Administration & System' },
};

export const UserRolesManagementModule: React.FC = () => {
  const { currentUser, users, addUser, updateUser, deleteUser, resetUserPassword, switchRole } = useAuth();
  const { language } = useI18n();
  const { showToast } = useToast();

  const isAr = language === 'ar';
  const role = currentUser?.role || 'tenant_admin';

  // Authorization Guard: Only super_admin, tenant_admin, general_manager, financial_manager can manage users
  const isAuthorized =
    role === 'super_admin' ||
    role === 'tenant_admin' ||
    role === 'general_manager' ||
    role === 'financial_manager';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Edit User Drawer State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('cashier');
  const [editPermittedViews, setEditPermittedViews] = useState<string[]>([]);
  const [newDirectPassword, setNewDirectPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oneTimePin, setOneTimePin] = useState<string | null>(null);
  const [forceChangeOnLogin, setForceChangeOnLogin] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'permissions' | 'password'>('permissions');

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('cashier');
  const [newPermittedViews, setNewPermittedViews] = useState<string[]>(getDefaultViewsForRole('cashier'));

  // Delete Confirmation State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  if (!isAuthorized) {
    return (
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-900 dark:text-white">
          {isAr ? 'عذراً، غير مسموح بالوصول' : 'Access Restricted'}
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          {isAr
            ? 'تعديل أدوار المستخدمين وصلاحيات الشاشات مقتصر على مدير المنظومة، صاحب المنشأة، المدير العام، والمدير المالي فقط.'
            : 'User roles and screen permissions management is reserved for Super Admin, Owner, GM, and CFO.'}
        </p>
      </div>
    );
  }

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  // Open Edit User
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName || '');
    setEditUsername(user.username || '');
    setEditPhone(user.phone || '');
    setEditEmail(user.email || '');
    setEditRole(user.role);
    setEditPermittedViews(user.permittedViews || getDefaultViewsForRole(user.role));
    setNewDirectPassword('');
    setShowPassword(false);
    setOneTimePin(null);
    setForceChangeOnLogin(true);
    setActiveTab('permissions');
  };

  // Toggle Screen in Permission Editor
  const toggleEditScreen = (screenId: string) => {
    setEditPermittedViews((prev) =>
      prev.includes(screenId) ? prev.filter((s) => s !== screenId) : [...prev, screenId]
    );
  };

  // Save User Details & Permissions
  const handleSaveUser = () => {
    if (!editingUser) return;
    if (!editFullName.trim() || !editUsername.trim()) {
      showToast({
        title: isAr ? 'يرجى إدخال الاسم واسم المستخدم' : 'Name and username are required',
        type: 'error',
      });
      return;
    }

    // Ensure at least one view is permitted
    const finalViews = editPermittedViews.length > 0 ? editPermittedViews : getDefaultViewsForRole(editRole);

    updateUser(editingUser.id, {
      fullName: editFullName.trim(),
      username: editUsername.trim().toLowerCase(),
      phone: editPhone.trim(),
      email: editEmail.trim(),
      role: editRole,
      permittedViews: finalViews,
    });

    if (newDirectPassword.trim() || oneTimePin) {
      const passToSet = oneTimePin || newDirectPassword.trim();
      resetUserPassword(editingUser.id, passToSet, forceChangeOnLogin);
    }

    showToast({
      title: isAr ? 'تم تحديث بيانات وصلاحيات المستخدم بنجاح' : 'User permissions updated successfully',
      type: 'success',
    });
    setEditingUser(null);
  };

  // Direct Password Reset
  const handleDirectPasswordReset = () => {
    if (!editingUser) return;
    const passToSet = oneTimePin || newDirectPassword.trim();
    if (!passToSet || passToSet.length < 4) {
      showToast({
        title: isAr ? 'كلمة المرور يجب أن تكون 4 خانات على الأقل' : 'Password must be at least 4 characters',
        type: 'error',
      });
      return;
    }

    resetUserPassword(editingUser.id, passToSet, forceChangeOnLogin);
    showToast({
      title: isAr ? 'تم تعيين كلمة المرور بنجاح وتسجيل العملية في سجل الرقابة' : 'Password reset recorded in audit log successfully',
      type: 'success',
    });
    setNewDirectPassword('');
  };

  // Open Add User
  const handleOpenAddUser = () => {
    setNewFullName('');
    setNewUsername('');
    setNewPassword('');
    setNewPhone('');
    setNewEmail('');
    setNewRole('cashier');
    setNewPermittedViews(getDefaultViewsForRole('cashier'));
    setIsAddUserOpen(true);
  };

  // Create New User
  const handleCreateUser = () => {
    if (!newFullName.trim() || !newUsername.trim()) {
      showToast({
        title: isAr ? 'يرجى ملء الاسم الكامل واسم المستخدم' : 'Please provide full name and username',
        type: 'error',
      });
      return;
    }

    const views = newPermittedViews.length > 0 ? newPermittedViews : getDefaultViewsForRole(newRole);

    addUser({
      fullName: newFullName.trim(),
      username: newUsername.trim().toLowerCase(),
      password: newPassword.trim() || '123456',
      phone: newPhone.trim(),
      email: newEmail.trim(),
      role: newRole,
      establishmentId: currentUser?.establishmentId || 'est-1',
      establishmentCode: currentUser?.establishmentCode || 'R.0001',
      establishmentName: currentUser?.establishmentName || 'السراب الملكي',
      permittedViews: views,
      status: 'active',
    });

    showToast({
      title: isAr ? `تمت إضافة المستخدم [${newFullName}] بنجاح` : `User [${newFullName}] created successfully`,
      type: 'success',
    });
    setIsAddUserOpen(false);
  };

  // Delete User
  const confirmDeleteUser = () => {
    if (!userToDelete) return;
    if (userToDelete.id === currentUser?.id) {
      showToast({
        title: isAr ? 'لا يمكنك حذف حسابك المسجل به حالياً' : 'You cannot delete your own active account',
        type: 'error',
      });
      setUserToDelete(null);
      return;
    }

    const success = deleteUser(userToDelete.id);
    if (success) {
      showToast({
        title: isAr ? `تم حذف المستخدم [${userToDelete.fullName}]` : `User [${userToDelete.fullName}] deleted`,
        type: 'success',
      });
    }
    setUserToDelete(null);
    if (editingUser?.id === userToDelete.id) {
      setEditingUser(null);
    }
  };

  return (
    <div className="space-y-6 min-w-0 max-w-full animate-fade-in" data-testid="user-roles-module">
      {/* 1. Header Bar with Title, Subtitle, and Add User Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {isAr ? 'أدوار المستخدمين والصلاحيات' : 'User Roles & Permissions'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'إدارة حسابات الموظفين وتخصيص شاشات العمل لكل مستخدم مع تغيير الباسورد مباشرة'
              : 'Manage staff accounts, assign granular screen access, and direct password resets'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleOpenAddUser}
            className="w-full sm:w-auto"
            data-testid="add-user-button"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة مستخدم جديد' : 'Add New User'}</span>
          </Button>
        </div>
      </div>

      {/* 2. Quick KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block">{isAr ? 'إجمالي الموظفين' : 'Total Staff'}</span>
          <span className="text-xl font-mono font-black text-slate-900 dark:text-white mt-1 block">
            {users.length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block">{isAr ? 'الكاشير والصالة' : 'Cashiers & Floor'}</span>
          <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {users.filter((u) => u.role === 'cashier' || u.role === 'waiter').length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block">{isAr ? 'مدراء النظام' : 'Managers'}</span>
          <span className="text-xl font-mono font-black text-blue-600 dark:text-blue-400 mt-1 block">
            {users.filter((u) => u.role === 'tenant_admin' || u.role === 'general_manager' || u.role === 'financial_manager').length}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 block">{isAr ? 'حسابك الحالي' : 'Active Account'}</span>
          <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-1.5 block truncate">
            {currentUser?.fullName}
          </span>
        </div>
      </div>

      {/* 3. Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، اسم المستخدم، أو الهاتف...' : 'Search by name, username, or phone...'}
            className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            data-testid="users-search-input"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="py-2 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">{isAr ? 'جميع الأدوار الوظيفية' : 'All Roles'}</option>
            {Object.entries(ROLE_INFO).map(([key, info]) => (
              <option key={key} value={key}>
                {isAr ? info.ar : info.en}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Users Cards / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5" data-testid="users-grid">
        {filteredUsers.map((u) => {
          const roleBadge = ROLE_INFO[u.role] || {
            ar: u.role,
            en: u.role,
            color: 'bg-slate-100 text-slate-700 border-slate-300',
          };
          const allowedViews = u.permittedViews || getDefaultViewsForRole(u.role);
          const isCurrent = u.id === currentUser?.id;

          return (
            <div
              key={u.id}
              onClick={() => handleOpenEdit(u)}
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer shadow-xs space-y-3 group"
              data-testid={`user-card-${u.username}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-black font-mono text-sm shrink-0">
                    {u.fullName?.charAt(0) || u.username?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {u.fullName}
                      </h3>
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500 text-slate-950">
                          {isAr ? 'حسابك' : 'You'}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400 block truncate" dir="ltr">
                      @{u.username}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${roleBadge.color} shrink-0`}>
                  {isAr ? roleBadge.ar : roleBadge.en}
                </span>
              </div>

              {/* Contact info snippet */}
              <div className="space-y-1 text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                {u.phone && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span dir="ltr">{u.phone}</span>
                  </div>
                )}
                {u.email && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span dir="ltr">{u.email}</span>
                  </div>
                )}
              </div>

              {/* Permitted Views Pills */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] mb-1.5 text-slate-500">
                  <span>{isAr ? 'الشاشات المصرح بها:' : 'Permitted Screens:'}</span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                    {allowedViews.length} {isAr ? 'شاشات' : 'screens'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {allowedViews.slice(0, 3).map((vId) => (
                    <span
                      key={vId}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-semibold"
                    >
                      {getScreenTitle(vId, isAr)}
                    </span>
                  ))}
                  {allowedViews.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-mono">
                      +{allowedViews.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="pt-2 flex items-center justify-between gap-2 text-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(u);
                  }}
                  className="text-cyan-600 dark:text-cyan-400 font-bold"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تعديل الصلاحيات' : 'Edit Access'}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    switchRole(u.role);
                  }}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  title={isAr ? 'تجربة المنظومة بهذا الدور فوراً' : 'Switch to this role now'}
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{isAr ? 'تجربة الحساب' : 'Switch'}</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Users className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'لم يتم العثور على مستخدمين مطابقة' : 'No matching users found'}
          </h3>
          <p className="text-xs text-slate-400">
            {isAr ? 'جرب تغيير كلمة البحث أو الدور المختار' : 'Try adjusting your search query or role filter'}
          </p>
        </div>
      )}

      {/* 5. User Details & Permission Editor Modal */}
      {editingUser && (
        <ModalShell
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title={isAr ? `تعديل صلاحيات: ${editingUser.fullName}` : `User Access: ${editingUser.fullName}`}
          subtitle={isAr ? `اسم المستخدم: @${editingUser.username}` : `Username: @${editingUser.username}`}
          icon={<ShieldCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
        >
          <div className="space-y-5 p-4 sm:p-6" data-testid="edit-user-modal">
            {/* Tabs for Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'permissions' ? 'primary' : 'ghost'}
                selected={activeTab === 'permissions'}
                onClick={() => setActiveTab('permissions')}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isAr ? 'الشاشات والصلاحيات' : 'Screens & Permissions'}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'info' ? 'primary' : 'ghost'}
                selected={activeTab === 'info'}
                onClick={() => setActiveTab('info')}
              >
                <Users className="w-4 h-4" />
                <span>{isAr ? 'بيانات الحساب والدور' : 'Account & Role'}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={activeTab === 'password' ? 'primary' : 'ghost'}
                selected={activeTab === 'password'}
                onClick={() => setActiveTab('password')}
              >
                <KeyRound className="w-4 h-4" />
                <span>{isAr ? 'تغيير كلمة المرور' : 'Reset Password'}</span>
              </Button>
            </div>

            {/* Tab 1: Permissions & Screens Checklist */}
            {activeTab === 'permissions' && (
              <div className="space-y-4">
                {/* Presets and Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {isAr ? 'الشاشات المسموح للمستخدم برؤيتها والدخول عليها:' : 'Allowed Screens:'}
                    </span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 ms-1">
                      ({editPermittedViews.length} {isAr ? 'محددة' : 'selected'})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => setEditPermittedViews(getDefaultViewsForRole(editRole))}
                      title={isAr ? 'استعادة الشاشات الافتراضية المناسبة لهذا الدور' : 'Reset to role defaults'}
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isAr ? 'افتراضيات الدور' : 'Role Defaults'}</span>
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setEditPermittedViews(AVAILABLE_SCREENS.map((s) => s.id))}
                    >
                      <span>{isAr ? 'تحديد الكل' : 'Select All'}</span>
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setEditPermittedViews([])}
                    >
                      <span>{isAr ? 'إلغاء الكل' : 'Clear All'}</span>
                    </Button>
                  </div>
                </div>

                {/* Grouped Screens Grid */}
                <div className="space-y-4">
                  {(['operations', 'menu_cost', 'finance_hr', 'admin'] as const).map((groupKey) => {
                    const groupScreens = AVAILABLE_SCREENS.filter((s) => s.category === groupKey);
                    return (
                      <div key={groupKey} className="space-y-2">
                        <h4 className="text-xs font-black uppercase text-slate-400 px-1 tracking-wider">
                          {isAr ? CATEGORY_NAMES[groupKey].ar : CATEGORY_NAMES[groupKey].en}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {groupScreens.map((screen) => {
                            const Icon = screen.icon;
                            const isChecked = editPermittedViews.includes(screen.id);
                            const title = getScreenTitle(screen.id, isAr);
                            const subtitle = SCREEN_GLOSSARY[screen.id]?.[isAr ? 'subtitleAr' : 'subtitleEn'] || '';

                            return (
                              <div
                                key={screen.id}
                                onClick={() => toggleEditScreen(screen.id)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                                  isChecked
                                    ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-500/60 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                                    isChecked
                                      ? 'bg-cyan-500 border-cyan-500 text-slate-950 font-bold'
                                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <Icon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {title}
                                    </span>
                                  </div>
                                  {subtitle && (
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                      {subtitle}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab 2: User Account & Role */}
            {activeTab === 'info' && (
              <div className="space-y-4 max-w-xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {isAr ? 'الاسم الكامل للموظف:' : 'Full Name:'}
                    </label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {isAr ? 'اسم المستخدم (لتسجيل الدخول):' : 'Username:'}
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      dir="ltr"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {isAr ? 'رقم الهاتف:' : 'Phone:'}
                    </label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      dir="ltr"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {isAr ? 'البريد الإلكتروني:' : 'Email:'}
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      dir="ltr"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'الدور الوظيفي الأساسي:' : 'Primary Role:'}
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => {
                      const newR = e.target.value as UserRole;
                      setEditRole(newR);
                      setEditPermittedViews(getDefaultViewsForRole(newR));
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    {Object.entries(ROLE_INFO).map(([key, info]) => (
                      <option key={key} value={key}>
                        {isAr ? info.ar : info.en}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">
                    {isAr
                      ? 'ملاحظة: تغيير الدور يملأ الشاشات الافتراضية تلقائياً ويمكنك تخصيصها بحرية من تبويب الشاشات.'
                      : 'Note: Changing the role will populate default screens, which you can customize further.'}
                  </p>
                </div>

                {/* Account Removal Danger Zone */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                    <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400">
                      {isAr ? 'حذف هذا المستخدم' : 'Delete Account'}
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      {isAr
                        ? 'إزالة حساب المستخدم تمنعه فوراً من تسجيل الدخول إلى المنظومة.'
                        : 'Deleting this account will immediately revoke all access.'}
                    </p>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setUserToDelete(editingUser)}
                      disabled={editingUser.id === currentUser?.id}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حذف حساب المستخدم' : 'Delete User'}</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Direct Password Reset without Old Password */}
            {activeTab === 'password' && (
              <div className="space-y-4 max-w-md">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <span className="font-bold block">
                    {isAr ? 'صلاحية تغيير كلمة المرور المباشرة:' : 'Direct Admin Override:'}
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    {isAr
                      ? 'يمكنك تعيين كلمة مرور جديدة للموظف مباشرة دون الحاجة لمعرفة كلمة مروره القديمة.'
                      : 'You can set a new password directly without requiring the user’s previous password.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'كلمة المرور الجديدة للموظف:' : 'New Password:'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newDirectPassword}
                      onChange={(e) => setNewDirectPassword(e.target.value)}
                      placeholder={isAr ? 'أدخل كلمة المرور الجديدة...' : 'Enter new password...'}
                      dir="ltr"
                      className="w-full ps-3 pe-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Quick Presets */}
                {/* One-Time PIN Banner */}
                {oneTimePin && (
                  <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-2.5 animate-fade-in" data-testid="one-time-pin-banner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isAr ? 'رمز PIN السريع (يظهر مرة واحدة فقط):' : 'One-Time Fast PIN:'}</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                        {isAr ? 'إلزام بالتغيير' : 'Must Change'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-500/20">
                      <span
                        className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400 tracking-widest"
                        dir="ltr"
                        data-testid="one-time-pin-value"
                      >
                        {oneTimePin}
                      </span>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          try {
                            navigator.clipboard?.writeText(oneTimePin);
                            showToast({
                              title: isAr ? 'تم نسخ الرمز للحافظة' : 'PIN copied to clipboard',
                              type: 'success',
                            });
                          } catch {}
                        }}
                      >
                        <span>{isAr ? 'نسخ الرمز' : 'Copy'}</span>
                      </Button>
                    </div>

                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                      {isAr
                        ? 'تنبيه أمان: هذا الرمز لن يُعرض مجدداً بعد إغلاق هذه النافذة. الموظف مُجبر على تغييره فور تسجيل دخوله.'
                        : 'Security notice: This PIN will not be displayed again. The user must change it upon login.'}
                    </p>
                  </div>
                )}

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const pin = generateRandomPin6();
                      setOneTimePin(pin);
                      setNewDirectPassword(pin);
                      setForceChangeOnLogin(true);
                    }}
                    data-testid="generate-fast-pin-button"
                    className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAr ? 'تعيين PIN سريع (6 خانات عشوائي)' : 'Fast 6-Digit Random PIN'}</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const rand = `Pass#${Math.floor(100000 + Math.random() * 900000)}`;
                      setOneTimePin(null);
                      setNewDirectPassword(rand);
                    }}
                  >
                    <span>{isAr ? 'توليد كلمة سر عشوائية' : 'Generate Random Password'}</span>
                  </Button>
                </div>

                {/* Force Change on Login Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer pt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={forceChangeOnLogin}
                    onChange={(e) => setForceChangeOnLogin(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>
                    {isAr
                      ? 'إجبار الموظف على تغيير كلمة المرور عند أول تسجيل دخول'
                      : 'Force user to change password on first login'}
                  </span>
                </label>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleDirectPasswordReset}
                  disabled={!newDirectPassword.trim() && !oneTimePin}
                  className="w-full mt-2"
                  data-testid="save-new-password-button"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isAr ? 'حفظ كلمة المرور الجديدة فوراً' : 'Save New Password Now'}</span>
                </Button>
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setEditingUser(null)}
              >
                <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSaveUser}
                data-testid="save-user-changes-button"
              >
                <Check className="w-4 h-4" />
                <span>{isAr ? 'حفظ التعديلات والصلاحيات' : 'Save Changes'}</span>
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 6. Add New User Modal */}
      {isAddUserOpen && (
        <ModalShell
          isOpen={true}
          onClose={() => setIsAddUserOpen(false)}
          title={isAr ? 'إضافة مستخدم وموظف جديد' : 'Add New Staff Member'}
          subtitle={isAr ? 'تحديد الدور الوظيفي والشاشات المصرح بها' : 'Configure role and permitted screen views'}
          icon={<Plus className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
        >
          <div className="space-y-4 p-4 sm:p-6" data-testid="add-user-modal">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'الاسم الكامل:' : 'Full Name:'}
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder={isAr ? 'مثال: محمود سليم' : 'e.g. Mahmoud Selim'}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'اسم المستخدم (لتسجيل الدخول):' : 'Username:'}
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={isAr ? 'مثال: cashier_mahmoud' : 'e.g. cashier_mahmoud'}
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'الدور الوظيفي:' : 'Role:'}
                </label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    setNewRole(r);
                    setNewPermittedViews(getDefaultViewsForRole(r));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {Object.entries(ROLE_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {isAr ? info.ar : info.en}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'كلمة المرور الابتدائية أو PIN:' : 'Initial Password or PIN:'}
                  </label>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setNewPassword(generateRandomPin6())}
                    className="text-cyan-600 dark:text-cyan-400 font-bold p-0 text-[10px]"
                  >
                    <span>{isAr ? 'توليد PIN عشوائي (6 خانات)' : 'Generate 6-Digit PIN'}</span>
                  </Button>
                </div>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={isAr ? 'أدخل كلمة مرور قوية أو ولّد PIN عشوائي' : 'Enter password or generate random PIN'}
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'رقم الهاتف:' : 'Phone:'}
                </label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+20 100 ..."
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {isAr ? 'البريد الإلكتروني:' : 'Email:'}
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@venue.com"
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Permissions Preview & Customization */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'الشاشات المصرح للمستخدم بالوصول إليها:' : 'Permitted Screens:'}
                </span>
                <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  {newPermittedViews.length} {isAr ? 'شاشات' : 'screens'}
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_SCREENS.map((s) => {
                  const isChecked = newPermittedViews.includes(s.id);
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.id}
                      onClick={() =>
                        setNewPermittedViews((prev) =>
                          prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                        )
                      }
                      className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-all ${
                        isChecked
                          ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-slate-900 dark:text-white font-bold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 opacity-70'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{getScreenTitle(s.id, isAr)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setIsAddUserOpen(false)}
              >
                <span>{isAr ? 'إلغاء' : 'Cancel'}</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleCreateUser}
                data-testid="create-user-confirm-button"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'إنشاء حساب المستخدم' : 'Create User'}</span>
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* 7. Delete User Confirmation Dialog */}
      {userToDelete && (
        <ModalShell
          isOpen={true}
          onClose={() => setUserToDelete(null)}
          title={isAr ? 'تأكيد حذف حساب المستخدم' : 'Confirm User Deletion'}
          icon={<Trash2 className="w-5 h-5 text-rose-500" />}
        >
          <div className="p-6 space-y-4 max-w-md mx-auto text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {isAr
                ? `هل أنت متأكد من حذف حساب [${userToDelete.fullName}]؟`
                : `Are you sure you want to delete [${userToDelete.fullName}]?`}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {isAr
                ? 'سيتم إلغاء صلاحيات هذا المستخدم وتجريده من الشاشات فوراً ولا يمكن استرجاع كلمة المرور.'
                : 'This action will immediately revoke all screen permissions and access.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setUserToDelete(null)}
              >
                <span>{isAr ? 'تراجع' : 'Cancel'}</span>
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={confirmDeleteUser}
                data-testid="confirm-delete-user-button"
              >
                <span>{isAr ? 'نعم، حذف الحساب' : 'Yes, Delete'}</span>
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
