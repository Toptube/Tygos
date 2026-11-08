/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CATEGORIES MANAGEMENT MODULE (شاشة الأقسام) (Package 1 - Section 2)
 * Full interactive tree management for:
 * 1. Product Categories (أقسام المنتجات)
 * 2. Raw Material Categories (أقسام الخامات)
 * Levels: قسم رئيسي ← قسم فرعي ← تصنيف
 * Features: Inline '+' additions, rename (ar/en), safe delete with transfer, reordering, and active/hide toggle.
 */

import React, { useState, useMemo } from 'react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Search,
  CheckCircle,
  AlertTriangle,
  Boxes,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useBusiness } from '../../context/BusinessContext.tsx';
import { categoryService, CategoryNode, CategoryTreeItem } from '../../services/categoryService.ts';

export const CategoriesManagementModule: React.FC = () => {
  const { currentEstablishment } = useAuth();
  const estId = currentEstablishment?.id || 'default';
  const { refreshCategories, menuProducts, rawMaterials } = useBusiness();

  const [activeType, setActiveType] = useState<'product' | 'material'>('product');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Quick Add/Edit Modal
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [targetParentName, setTargetParentName] = useState<string>('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Category Confirmation Modal with Transfer
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Get raw categories and tree
  const allCategories = useMemo(() => {
    return categoryService.getCategories(estId, activeType);
  }, [estId, activeType, toastMessage]);

  const tree = useMemo(() => {
    return categoryService.getCategoryTree(estId, activeType);
  }, [estId, activeType, toastMessage]);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = (parentId: string | null = null, parentName = '') => {
    setModalMode('add');
    setTargetParentId(parentId);
    setTargetParentName(parentName);
    setEditingCategory(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormError(null);
  };

  const handleOpenEdit = (cat: CategoryNode) => {
    setModalMode('edit');
    setEditingCategory(cat);
    setFormNameAr(cat.nameAr);
    setFormNameEn(cat.nameEn || '');
    setFormError(null);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim()) {
      setFormError('يرجى إدخال اسم القسم بالعربية');
      return;
    }

    try {
      if (modalMode === 'add') {
        categoryService.addCategory(estId, {
          nameAr: formNameAr.trim(),
          nameEn: formNameEn.trim() || formNameAr.trim(),
          type: activeType,
          parentId: targetParentId,
        });
        showToast('تمت إضافة القسم بنجاح ✓');
      } else if (modalMode === 'edit' && editingCategory) {
        categoryService.updateCategory(estId, activeType, editingCategory.id, {
          nameAr: formNameAr.trim(),
          nameEn: formNameEn.trim() || formNameAr.trim(),
        });
        showToast('تم تعديل اسم القسم بنجاح ✓');
      }
      setModalMode(null);
      refreshCategories();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  const handleToggleActive = (cat: CategoryNode) => {
    categoryService.updateCategory(estId, activeType, cat.id, { active: !cat.active });
    showToast(cat.active ? 'تم إخفاء القسم' : 'تم تفعيل القسم ✓');
    refreshCategories();
  };

  const handleMoveOrder = (cat: CategoryNode, direction: 'up' | 'down') => {
    const siblings = allCategories
      .filter((c) => (c.parentId || null) === (cat.parentId || null))
      .sort((a, b) => a.order - b.order);

    const idx = siblings.findIndex((s) => s.id === cat.id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;

    const newOrder = [...siblings];
    const [moved] = newOrder.splice(idx, 1);
    newOrder.splice(targetIdx, 0, moved);

    const orderedIds = newOrder.map((s) => s.id);
    categoryService.reorderCategories(estId, activeType, orderedIds);
    showToast('تم تحديث الترتيب ✓');
    refreshCategories();
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    categoryService.deleteCategory(estId, activeType, deleteTarget.id, transferTargetId || null);
    showToast(`تم حذف قسم [${deleteTarget.nameAr}] بنجاح ✓`);
    setDeleteTarget(null);
    setTransferTargetId('');
    refreshCategories();
  };

  // Count items under category
  const getItemCount = (catName: string) => {
    if (activeType === 'product') {
      return menuProducts.filter((p) => p.category === catName).length;
    } else {
      return rawMaterials.filter((m) => m.category === catName).length;
    }
  };

  return (
    <div className="space-y-6" data-testid="categories-management-module">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 start-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-[#0b101e] border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              شجرة الأقسام والتصنيفات
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تنظيم متسلسل ومرن لأقسام المنتجات وقوائم الخامات (رئيسي ← فرعي ← تصنيف) مع إمكانية التعديل والإضافة في كل مستوى
          </p>
        </div>

        {/* Tree Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveType('product')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeType === 'product'
                ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>أقسام المنتجات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('material')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeType === 'material'
                ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>أقسام الخامات</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search & + Add Main Category */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={activeType === 'product' ? 'ابحث في أقسام المنتجات...' : 'ابحث في أقسام الخامات...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => handleOpenAdd(null, '')}
          data-testid="add-main-category-button"
          className="gap-1 font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>+ إضافة قسم رئيسي جديد</span>
        </Button>
      </div>

      {/* Categories Tree View */}
      <div className="space-y-3">
        {tree.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            لا توجد أقسام مسجلة حالياً.
          </div>
        ) : (
          tree.map((mainNode, mainIdx) => {
            const isMainExpanded = expandedNodes[mainNode.id] !== false; // expanded by default
            const hasChildren = mainNode.children && mainNode.children.length > 0;
            const count = getItemCount(mainNode.nameAr);

            return (
              <div
                key={mainNode.id}
                data-testid={`category-main-${mainNode.id}`}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs"
              >
                {/* Level 1: Main Category Header */}
                <div className="p-4 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(mainNode.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                      {isMainExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-cyan-500 shrink-0" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {mainNode.nameAr}
                      </h3>
                      {count > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                          {count} {activeType === 'product' ? 'صنف' : 'خامة'}
                        </span>
                      )}
                      {!mainNode.active && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          مخفي
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions for Main Category */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => handleOpenAdd(mainNode.id, mainNode.nameAr)}
                      data-testid={`add-sub-to-${mainNode.id}`}
                      className="gap-1 font-bold text-xs"
                      title="إضافة قسم فرعي تابع لهذا القسم"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>فرعي</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleMoveOrder(mainNode, 'up')}
                      disabled={mainIdx === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                      title="تحريك لأعلى"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveOrder(mainNode, 'down')}
                      disabled={mainIdx === tree.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                      title="تحريك لأسفل"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(mainNode)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={mainNode.active ? 'إخفاء' : 'إظهار'}
                    >
                      {mainNode.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(mainNode)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="تعديل الاسم"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(mainNode)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Level 2: Subcategories List */}
                {isMainExpanded && hasChildren && (
                  <div className="p-3 ps-8 space-y-2.5 bg-slate-50/30 dark:bg-slate-950/20">
                    {mainNode.children!.map((subNode, subIdx) => {
                      const isSubExpanded = expandedNodes[subNode.id] !== false;
                      const hasSubChildren = subNode.children && subNode.children.length > 0;
                      const subCount = getItemCount(subNode.nameAr);

                      return (
                        <div
                          key={subNode.id}
                          data-testid={`category-sub-${subNode.id}`}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {hasSubChildren ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(subNode.id)}
                                  className="p-0.5 text-slate-400"
                                >
                                  {isSubExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                                  )}
                                </button>
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                              )}

                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {subNode.nameAr}
                              </span>
                              {subCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                  {subCount}
                                </span>
                              )}
                            </div>

                            {/* Actions for Subcategory */}
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => handleOpenAdd(subNode.id, subNode.nameAr)}
                                className="gap-1 font-bold text-[11px] py-0.5 px-2"
                                title="إضافة تصنيف فرعي داخل هذا القسم"
                              >
                                <Plus className="w-3 h-3" />
                                <span>تصنيف</span>
                              </Button>

                              <button
                                type="button"
                                onClick={() => handleMoveOrder(subNode, 'up')}
                                disabled={subIdx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleMoveOrder(subNode, 'down')}
                                disabled={subIdx === mainNode.children!.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(subNode)}
                                className="p-1 text-slate-400 hover:text-slate-700"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(subNode)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Level 3: Classifications (Tags) */}
                          {isSubExpanded && hasSubChildren && (
                            <div className="ps-6 pt-1 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800/60">
                              {subNode.children!.map((classNode) => (
                                <div
                                  key={classNode.id}
                                  data-testid={`category-class-${classNode.id}`}
                                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[11px]"
                                >
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {classNode.nameAr}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(classNode)}
                                    className="text-slate-400 hover:text-slate-700"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(classNode)}
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
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

      {/* Modal: Add / Edit Category */}
      {modalMode && (
        <ModalShell
          isOpen={true}
          onClose={() => setModalMode(null)}
          title={
            modalMode === 'add'
              ? targetParentName
                ? `إضافة قسم فرعي داخل [${targetParentName}]`
                : activeType === 'product'
                ? 'إضافة قسم رئيسي للمنتجات'
                : 'إضافة قسم رئيسي للخامات'
              : `تعديل قسم [${editingCategory?.nameAr}]`
          }
          subtitle="سجل الاسم بالعربية وبالإنجليزية لتوحيد شجرة الأصناف"
          size="md"
        >
          <form onSubmit={handleSaveForm} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                اسم القسم بالعربية <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={formNameAr}
                onChange={(e) => setFormNameAr(e.target.value)}
                placeholder="مثال: مشويات، بيتزا، دقيق فاخر..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                الاسم بالإنجليزية (اختياري)
              </label>
              <input
                type="text"
                value={formNameEn}
                onChange={(e) => setFormNameEn(e.target.value)}
                placeholder="e.g. Grills, Pizza, Flour..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalMode(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" size="sm" className="font-bold">
                حفظ القسم
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Modal: Delete Confirmation with Child Transfer */}
      {deleteTarget && (
        <ModalShell
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          title={`متأكد من حذف قسم «${deleteTarget.nameAr}»؟`}
          subtitle="يمكنك نقل الأصناف أو الأقسام الفرعية إلى قسم آخر قبل الحذف"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
              <span>
                سيتم إزالة هذا القسم. إذا كانت هناك أصناف مسجلة عليه، يفضل نقلها إلى قسم بديل.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                نقل العناصر التابعة إلى: (اختياري)
              </label>
              <select
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-bold"
              >
                <option value="">بدون نقل (إزالة الرابط)</option>
                {allCategories
                  .filter((c) => c.id !== deleteTarget.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                تراجع
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={handleConfirmDelete} className="font-bold">
                تأكيد الحذف
              </Button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
};
