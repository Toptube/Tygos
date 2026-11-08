/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRODUCTS LIST MODULE (شاشة المنتجات) (Package 1 - Section 4)
 * Comprehensive products catalog grouped by category tree with expandable groups,
 * search, status filters (ready / missing recipe / unavailable), quick "Available for Sale" toggle,
 * edit in-place (updating same record, never duplicating), delete with 8s undo toast, and duplicates resolver.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  GitMerge,
  Undo2,
  ChefHat,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { MenuItemProduct } from '../../services/dataService.ts';
import { categoryService, normalizeArabicText } from '../../services/categoryService.ts';
import { DuplicatesResolverModal } from './DuplicatesResolverModal.tsx';

interface ProductsListModuleProps {
  onOpenDishDrawer?: (dish: MenuItemProduct) => void;
  onAddNewDish?: () => void;
}

export const ProductsListModule: React.FC<ProductsListModuleProps> = ({
  onOpenDishDrawer,
  onAddNewDish,
}) => {
  const { currentEstablishment, currentUser, setActiveView } = useAuth();
  const estId = currentEstablishment?.id || 'default';
  const role = currentUser?.role || 'tenant_admin';
  const { isRtl, formatCurrency } = useI18n();

  const isChef = role === 'kitchen_manager' || role === 'bar_manager';
  const isCashier = role === 'cashier' || role === 'waiter';
  const canViewFinancials = !isChef && !isCashier;

  const {
    menuProducts,
    updateProduct,
    deleteProduct,
    restoreDeletedProduct,
    archiveProduct,
    setIsAddProductModalOpen,
  } = useBusiness();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'missing' | 'inactive'>('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Duplicates Tool Modal
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);

  // Delete Confirmation Modal
  const [productToDelete, setProductToDelete] = useState<MenuItemProduct | null>(null);

  // 8-Second Undo Toast State
  const [undoToast, setUndoToast] = useState<{ product: MenuItemProduct; timerId: any } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return menuProducts.filter((p) => {
      // Search
      const q = normalizeArabicText(searchQuery);
      const matchesSearch =
        !q ||
        normalizeArabicText(p.nameAr).includes(q) ||
        p.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        normalizeArabicText(p.category).includes(q);

      // Status
      let matchesStatus = true;
      const hasRecipe = p.recipeIngredients && p.recipeIngredients.length > 0;
      if (statusFilter === 'ready') {
        matchesStatus = p.isActive && hasRecipe;
      } else if (statusFilter === 'missing') {
        matchesStatus = !hasRecipe;
      } else if (statusFilter === 'inactive') {
        matchesStatus = !p.isActive;
      }

      return matchesSearch && matchesStatus;
    });
  }, [menuProducts, searchQuery, statusFilter]);

  // Group by Category
  const groupedProducts = useMemo(() => {
    const map = new Map<string, MenuItemProduct[]>();
    filteredProducts.forEach((p) => {
      const cat = p.category || 'عام';
      const items = map.get(cat) || [];
      items.push(p);
      map.set(cat, items);
    });

    const groups: Array<{ category: string; items: MenuItemProduct[] }> = [];
    map.forEach((items, category) => {
      groups.push({ category, items });
    });
    return groups;
  }, [filteredProducts]);

  // Toggle "Available for Sale" (isActive)
  const handleToggleActive = async (p: MenuItemProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: MenuItemProduct = {
      ...p,
      isActive: !p.isActive,
      updatedAt: new Date().toISOString(),
    };
    await updateProduct(updated);
    showNotification(updated.isActive ? `تم إتاحة [${p.nameAr}] للبيع ✓` : `تم تعطيل [${p.nameAr}] من البيع`);
  };

  // Request Delete Product
  const handleRequestDelete = (p: MenuItemProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductToDelete(p);
  };

  // Confirm Delete with 8s Undo Toast
  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    const target = productToDelete;
    setProductToDelete(null);

    // If product has prior sales (simulated or real flag), archive instead of delete
    const hasPriorSales = Boolean((target as any).hasSales || (target.auditHistory || []).some(a => a.details.includes('بيع')));
    if (hasPriorSales) {
      await archiveProduct(target.id);
      showNotification(`تم أرشفة [${target.nameAr}] للحفاظ على سجل المبيعات والتقارير المالية.`);
      return;
    }

    // Actual deletion
    await deleteProduct(target.id);

    // Setup 8s Undo Toast
    if (undoToast?.timerId) {
      clearTimeout(undoToast.timerId);
    }

    const timer = setTimeout(() => {
      setUndoToast(null);
    }, 8000);

    setUndoToast({
      product: target,
      timerId: timer,
    });
  };

  // Handle Undo Delete
  const handleUndoDelete = async () => {
    if (!undoToast) return;
    clearTimeout(undoToast.timerId);
    await restoreDeletedProduct(undoToast.product);
    showNotification(`تم استرجاع [${undoToast.product.nameAr}] بنجاح ✓`);
    setUndoToast(null);
  };

  // Open Product for editing
  const handleEditProduct = (p: MenuItemProduct) => {
    if (onOpenDishDrawer) {
      onOpenDishDrawer(p);
    } else {
      try {
        localStorage.setItem('tygos_edit_dish_id', p.id);
      } catch {}
      setActiveView('menu');
    }
  };

  const handleAddNew = () => {
    if (onAddNewDish) {
      onAddNewDish();
    } else {
      setIsAddProductModalOpen(true);
    }
  };

  return (
    <div className="space-y-6" data-testid="products-list-module">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 start-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 8-Second Undo Banner */}
      {undoToast && (
        <div
          data-testid="undo-delete-toast"
          className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-slate-950 text-white border border-rose-500/50 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>تم حذف <strong>«{undoToast.product.nameAr}»</strong> (متاح التراجع لمدة 8 ثوان)</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={handleUndoDelete}
            data-testid="undo-delete-button"
            className="gap-1 font-bold bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>تراجع الآن</span>
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              قائمة المنتجات
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            استعراض شامل لكل المنتجات والأطباق مرتبة حسب شجرة الأقسام، مع فلترة الجاهزية والتحكم في إتاحة البيع
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tool «المكرر» */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDuplicatesModalOpen(true)}
            data-testid="open-duplicates-modal-button"
            className="gap-1.5 font-bold"
            title="فحص المنتجات المكررة بالاسم في نفس القسم"
          >
            <GitMerge className="w-4 h-4 text-cyan-500" />
            <span>فحص المكرر</span>
          </Button>

          {/* + Add New Product */}
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAddNew}
            data-testid="add-new-product-button"
            className="gap-1.5 font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>+ صنف جديد</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            data-testid="products-search-input"
            placeholder="ابحث بالاسم أو القسم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            الكل ({menuProducts.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ready')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'ready'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            جاهز للبيع
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('missing')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'missing'
                ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ينقصه وصفة
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              statusFilter === 'inactive'
                ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            غير متاح
          </button>
        </div>
      </div>

      {/* Grouped Products Accordion */}
      <div className="space-y-4">
        {groupedProducts.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              لا توجد منتجات مطابقة للبحث أو الفلتر
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              جرّب تغيير كلمات البحث أو اختر "الكل" لعرض كافة المنتجات المسجلة.
            </p>
          </div>
        ) : (
          groupedProducts.map((grp) => {
            const isCollapsed = collapsedGroups[grp.category];

            return (
              <div
                key={grp.category}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
              >
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(grp.category)}
                  className="w-full p-4 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 text-start cursor-pointer transition-colors hover:bg-slate-100/50"
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      قسم: {grp.category}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                      {grp.items.length} صنف
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {isCollapsed ? 'توسيع' : 'طي'}
                  </span>
                </button>

                {/* Products Grid in Category */}
                {!isCollapsed && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {grp.items.map((prod) => {
                      const hasRecipe = prod.recipeIngredients && prod.recipeIngredients.length > 0;
                      const profitAmt = Math.max(0, prod.sellingPrice - (prod.trueCost || 0));

                      return (
                        <div
                          key={prod.id}
                          data-testid={`product-card-${prod.id}`}
                          onClick={() => handleEditProduct(prod)}
                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 hover:border-cyan-500/50 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-2xs"
                        >
                          <div className="space-y-2">
                            {/* Card Top: Name & Sale Switch */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {prod.nameAr}
                                </h4>
                                {prod.nameEn && prod.nameEn !== prod.nameAr && (
                                  <p className="text-[10px] text-slate-400 font-mono truncate">
                                    {prod.nameEn}
                                  </p>
                                )}
                              </div>

                              {/* Direct "Available for Sale" Switch */}
                              <button
                                type="button"
                                data-testid={`toggle-sale-${prod.id}`}
                                onClick={(e) => handleToggleActive(prod, e)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors shrink-0 ${
                                  prod.isActive
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                                }`}
                                title={prod.isActive ? 'متاح للبيع (اضغط للتعطيل)' : 'غير متاح للبيع (اضغط للإتاحة)'}
                              >
                                {prod.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                <span>{prod.isActive ? 'متاح للبيع' : 'معطل'}</span>
                              </button>
                            </div>

                            {/* Status and Recipe Indicators */}
                            <div className="flex items-center gap-2 text-[10px]">
                              {hasRecipe ? (
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>بوصفة ({prod.recipeIngredients.length} خامة)</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>ينقصه وصفة</span>
                                </span>
                              )}

                              {prod.servingsYield && prod.servingsYield > 1 && (
                                <span className="text-slate-400">
                                  · {prod.servingsYield} حصص
                                </span>
                              )}
                            </div>

                            {/* Financial Details */}
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs font-mono">
                              <div>
                                <span className="text-[10px] text-slate-400 font-sans block">سعر البيع</span>
                                <strong className="text-slate-900 dark:text-white font-bold">
                                  {prod.sellingPrice} ج.م
                                </strong>
                              </div>

                              {canViewFinancials && (
                                <>
                                  <div className="text-center">
                                    <span className="text-[10px] text-slate-400 font-sans block">التكلفة</span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {(prod.trueCost || 0).toFixed(1)} ج.م
                                    </span>
                                  </div>

                                  <div className="text-end">
                                    <span className="text-[10px] text-slate-400 font-sans block">هامش الربح</span>
                                    <span className={`font-bold ${
                                      (prod.grossMarginPercentage || 0) >= 60
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                      {Math.round(prod.grossMarginPercentage || 0)}%
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Card Footer: Quick Actions */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-400 font-sans">
                              {prod.prepStation || 'المطبخ'}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditProduct(prod);
                                }}
                                className="p-1 text-slate-400 hover:text-cyan-600 transition-colors"
                                title="تعديل الصنف"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                data-testid={`delete-product-${prod.id}`}
                                onClick={(e) => handleRequestDelete(prod, e)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="حذف الصنف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Delete */}
      {productToDelete && (
        <ModalShell
          isOpen={true}
          onClose={() => setProductToDelete(null)}
          title={`متأكد من حذف «${productToDelete.nameAr}»؟`}
          subtitle="سيتم حذف الصنف من القائمة مع إمكانية التراجع لمدة 8 ثوان"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              هل تريد بالفعل حذف الصنف <strong>«{productToDelete.nameAr}»</strong> من قسم [<strong>{productToDelete.category}</strong>]؟
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProductToDelete(null)}
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                data-testid="confirm-delete-product-btn"
                onClick={handleConfirmDelete}
                className="font-bold"
              >
                تأكيد الحذف
              </Button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Duplicates Resolver Modal */}
      <DuplicatesResolverModal
        isOpen={isDuplicatesModalOpen}
        onClose={() => setIsDuplicatesModalOpen(false)}
        products={menuProducts}
        onMerge={async (master, duplicatesToDelete) => {
          for (const dupId of duplicatesToDelete) {
            await deleteProduct(dupId);
          }
        }}
        onDeleteDuplicate={async (dupId) => {
          await deleteProduct(dupId);
        }}
      />
    </div>
  );
};
