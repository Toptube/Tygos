/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DUPLICATES RESOLVER TOOL («المكرر») (Package 1 - Section 1-أ)
 * Identifies duplicate products sharing the same normalized Arabic name in the same category,
 * and allows the manager to merge them into a single master record or delete extra duplicates.
 */

import React, { useMemo, useState } from 'react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import { Copy, Trash2, GitMerge, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { MenuItemProduct } from '../../services/dataService.ts';
import { normalizeArabicText } from '../../services/categoryService.ts';

interface DuplicatesResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: MenuItemProduct[];
  onMerge: (masterProduct: MenuItemProduct, duplicateIdsToDelete: string[]) => Promise<void>;
  onDeleteDuplicate: (duplicateId: string) => Promise<void>;
}

export const DuplicatesResolverModal: React.FC<DuplicatesResolverModalProps> = ({
  isOpen,
  onClose,
  products,
  onMerge,
  onDeleteDuplicate,
}) => {
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Group products by normalized name AND category
  const duplicateGroups = useMemo(() => {
    const map = new Map<string, MenuItemProduct[]>();

    products.forEach((p) => {
      const normName = normalizeArabicText(p.nameAr);
      const cat = p.category || 'عام';
      const key = `${cat}___${normName}`;
      const existing = map.get(key) || [];
      existing.push(p);
      map.set(key, existing);
    });

    const groups: Array<{ key: string; category: string; normName: string; items: MenuItemProduct[] }> = [];
    map.forEach((items, key) => {
      if (items.length > 1) {
        const [category, normName] = key.split('___');
        groups.push({ key, category, normName, items });
      }
    });

    return groups;
  }, [products]);

  const handleMergeGroup = async (master: MenuItemProduct, allInGroup: MenuItemProduct[]) => {
    setResolvingId(master.id);
    try {
      const duplicatesToDelete = allInGroup.filter((p) => p.id !== master.id).map((p) => p.id);
      await onMerge(master, duplicatesToDelete);
      setSuccessMessage(`تم دمج الأصناف المكررة في [${master.nameAr}] بنجاح ✓`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setResolvingId(null);
    }
  };

  const handleDeleteItem = async (p: MenuItemProduct) => {
    setResolvingId(p.id);
    try {
      await onDeleteDuplicate(p.id);
      setSuccessMessage(`تم حذف الصنف المكرر [${p.nameAr}] ✓`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setResolvingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="أداة فحص وتصفية المنتجات المكررة"
      subtitle="اكتشاف الأصناف المكررة بالاسم في نفس القسم ودمجها أو حذفها"
      size="xl"
    >
      <div className="space-y-4">
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {duplicateGroups.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              لا توجد منتجات مكررة
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              جميع المنتجات في المنظومة مسجلة بأسماء فريدة داخل أقسامها دون أي تعارض أو تكرار.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  تم العثور على <strong>{duplicateGroups.length}</strong> مجموعة أصناف متكررة بنفس الاسم في نفس القسم.
                </span>
              </div>
            </div>

            {duplicateGroups.map((group) => (
              <div
                key={group.key}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 text-xs font-bold">
                      قسم: {group.category}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      «{group.items[0].nameAr}» ({group.items.length} نسخ)
                    </h5>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    disabled={resolvingId !== null}
                    onClick={() => handleMergeGroup(group.items[0], group.items)}
                    className="gap-1 font-bold"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>دمج في النسخة الأولى</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {group.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {item.nameAr}
                          </span>
                          {idx === 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              الأساسي
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 space-x-2 rtl:space-x-reverse">
                          <span>سعر: {item.sellingPrice} ج.م</span>
                          <span>·</span>
                          <span>مكونات: {item.recipeIngredients?.length || 0}</span>
                          <span>·</span>
                          <span>الحالة: {item.isActive ? 'متاح' : 'معطل'}</span>
                        </div>
                      </div>

                      {idx > 0 && (
                        <button
                          type="button"
                          disabled={resolvingId === item.id}
                          onClick={() => handleDeleteItem(item)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                          title="حذف هذا المكرر الزائد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};
