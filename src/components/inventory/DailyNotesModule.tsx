/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DAILY NOTES MODULE (الملاحظات اليومية - Package 3)
 *
 * Features:
 * - Aggregates cost accountant observations on materials & discrepancies.
 * - Direct trigger to open Item Card («فتح كارت الصنف»).
 * - Status toggle: «لم يتم الحل» (Default) vs «تم الحل» (with problem & resolution details).
 * - Date range & Branch & Status filters.
 * - Print output with mandatory notice for unresolved notes:
 *   «لم يتم الحل، برجاء النظر في المشكلة وحلها جذرياً».
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Printer,
  Plus,
  Search,
  Filter,
  Check,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { warehouseService, Branch } from '../../services/warehouseService.ts';
import { dailyNotesService, DailyNote, DailyNoteStatus } from '../../services/dailyNotesService.ts';
import { ItemCardModal } from '../warehouses/ItemCardModal.tsx';

export const DailyNotesModule: React.FC = () => {
  const { user, establishmentId = 'default' } = useAuth();
  const { showToast } = useToast();

  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<DailyNoteStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Modals
  const [selectedMaterialIdForCard, setSelectedMaterialIdForCard] = useState<string | null>(null);
  const [resolvingNote, setResolvingNote] = useState<DailyNote | null>(null);
  const [resolutionText, setResolutionText] = useState<string>('');

  const [isNewNoteOpen, setIsNewNoteOpen] = useState<boolean>(false);
  const [newNoteMaterialId, setNewNoteMaterialId] = useState<string>('');
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [newNoteBranchId, setNewNoteBranchId] = useState<string>('branch-main');
  const [newNoteSection, setNewNoteSection] = useState<string>('المطبخ');

  // Load Data
  const refreshNotes = () => {
    const brs = warehouseService.getBranches(establishmentId);
    setBranches(brs);

    const list = dailyNotesService.getNotes(establishmentId, {
      startDate,
      endDate,
      status: statusFilter,
      branchId: selectedBranchId,
    });
    setNotes(list);
  };

  useEffect(() => {
    refreshNotes();
  }, [establishmentId, startDate, endDate, statusFilter, selectedBranchId]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const q = searchQuery.toLowerCase();
      return (
        n.materialNameAr.toLowerCase().includes(q) ||
        n.text.toLowerCase().includes(q) ||
        (n.resolutionText && n.resolutionText.toLowerCase().includes(q)) ||
        (n.targetSection && n.targetSection.toLowerCase().includes(q))
      );
    });
  }, [notes, searchQuery]);

  // Handle Resolve Note Submit
  const handleConfirmResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingNote || !resolutionText.trim()) return;

    try {
      dailyNotesService.resolveNote(
        establishmentId,
        resolvingNote.id,
        resolutionText.trim(),
        user?.fullName || 'محاسب التكاليف'
      );
      setResolvingNote(null);
      setResolutionText('');
      refreshNotes();
      showToast({ title: 'تم توثيق حل المشكلة بنجاح ✓', type: 'success' });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في حل الملاحظة', type: 'error' });
    }
  };

  // Handle Reopen Note
  const handleReopenNote = (noteId: string) => {
    try {
      dailyNotesService.reopenNote(establishmentId, noteId);
      refreshNotes();
      showToast({ title: 'تمت إعادة فتح الملاحظة ✓', type: 'info' });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في إعادة فتح الملاحظة', type: 'error' });
    }
  };

  // Handle Add New Note
  const handleSaveNewNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteMaterialId || !newNoteText.trim()) return;

    const materials = warehouseService.getMaterials(establishmentId);
    const mat = materials.find((m) => m.id === newNoteMaterialId);
    if (!mat) return;

    try {
      dailyNotesService.addNote(establishmentId, {
        branchId: newNoteBranchId,
        materialId: mat.id,
        materialNameAr: mat.nameAr,
        text: newNoteText.trim(),
        authorName: user?.fullName || 'محاسب التكاليف',
        authorRole: user?.role || 'cost_accountant',
        targetSection: newNoteSection,
      });

      setIsNewNoteOpen(false);
      setNewNoteText('');
      setNewNoteMaterialId('');
      refreshNotes();
      showToast({ title: 'تمت إضافة الملاحظة بنجاح ✓', type: 'success' });
    } catch (err: any) {
      showToast({ title: err.message || 'خطأ في إضافة الملاحظة', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" dir="rtl">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              الملاحظات اليومية ومتابعة الهالك والتوريد
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              سجل ملاحظات محاسب التكاليف على الأصناف، متابعة المشاكل وحلولها، والربط المباشر مع كارت الصنف.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setIsNewNoteOpen(true)}
            className="gap-1.5 font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ ملاحظة جديدة</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة الملاحظات</span>
          </Button>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            الفرع:
          </label>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="all">كل الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            الحالة:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
          >
            <option value="all">جميع الحالات</option>
            <option value="unresolved">لم يتم الحل (معلقة)</option>
            <option value="resolved">تم الحل ✓</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            من تاريخ:
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            إلى تاريخ:
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* 3. Search & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بنص الملاحظة أو اسم الخامة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full ps-9 pe-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            إجمالي الملاحظات: <b className="text-slate-900 dark:text-white">{filteredNotes.length}</b>
          </span>
          <span className="text-rose-600 font-bold">
            لم تُحل: {filteredNotes.filter((n) => n.status === 'unresolved').length}
          </span>
          <span className="text-emerald-600 font-bold">
            تم حلها: {filteredNotes.filter((n) => n.status === 'resolved').length}
          </span>
        </div>
      </div>

      {/* 4. Notes Cards / Table */}
      <div className="space-y-3">
        {filteredNotes.map((note) => {
          const isResolved = note.status === 'resolved';

          return (
            <div
              key={note.id}
              className={`p-4 rounded-xl border transition-all ${
                isResolved
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  : 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/40 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-sm text-slate-900 dark:text-white">
                      {note.materialNameAr}
                    </span>

                    {/* Status badge */}
                    {isResolved ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        تم الحل ✓
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        لم يتم الحل
                      </span>
                    )}

                    {note.targetSection && (
                      <span className="text-xs text-slate-500">
                        القسم: {note.targetSection}
                      </span>
                    )}
                  </div>

                  {/* Note Content */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {note.text}
                  </p>

                  {/* Mandatory Print Statement if Unresolved */}
                  {!isResolved && (
                    <div className="p-2.5 rounded-lg bg-rose-100/60 dark:bg-rose-900/30 text-rose-900 dark:text-rose-200 text-xs font-bold border border-rose-200 dark:border-rose-800/50 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>«لم يتم الحل، برجاء النظر في المشكلة وحلها جذرياً»</span>
                    </div>
                  )}

                  {/* Resolution Text if resolved */}
                  {isResolved && note.resolutionText && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs border border-emerald-200 dark:border-emerald-800/40">
                      <span className="font-bold">تفاصيل الحل المعتمد:</span> {note.resolutionText}
                      {note.resolvedBy && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                          تم بواسطة: {note.resolvedBy} في{' '}
                          {note.resolvedAt ? new Date(note.resolvedAt).toLocaleDateString('ar-EG') : ''}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                    <span>الكاتب: {note.authorName}</span>
                    <span>·</span>
                    <span>التاريخ: {new Date(note.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMaterialIdForCard(note.materialId)}
                    className="gap-1 text-xs font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-600" />
                    <span>فتح كارت الصنف</span>
                  </Button>

                  {!isResolved ? (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setResolvingNote(note);
                        setResolutionText('');
                      }}
                      className="gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>توثيق الحل</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReopenNote(note.id)}
                      className="gap-1 text-xs text-slate-500 hover:text-rose-600"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة فتح</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="py-12 text-center text-slate-400 p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            لا توجد ملاحظات مسجلة مطابقة للفلاتر
          </div>
        )}
      </div>

      {/* 5. Resolve Note Modal */}
      {resolvingNote && (
        <ModalShell
          isOpen={!!resolvingNote}
          onClose={() => setResolvingNote(null)}
          title={`توثيق حل الملاحظة: ${resolvingNote.materialNameAr}`}
          subtitle="سجل المشكلة والحل الجذري المتبع لإغلاق الملاحظة في السجلات"
          size="md"
        >
          <form onSubmit={handleConfirmResolution} className="p-4 sm:p-6 space-y-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs">
              <span className="text-slate-400 block mb-0.5">الملاحظة الأصلية:</span>
              <p className="text-slate-800 dark:text-slate-200 font-medium">{resolvingNote.text}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                صيغة الحل المعتمد:
              </label>
              <textarea
                rows={3}
                required
                placeholder="كانت المشكلة كذا وتم حلها بكذا..."
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResolvingNote(null)}>
                إلغاء
              </Button>
              <Button type="submit" variant="default" className="bg-emerald-600 text-white font-bold">
                اعتماد حل المشكلة ✓
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* 6. Add New Note Modal */}
      {isNewNoteOpen && (
        <ModalShell
          isOpen={isNewNoteOpen}
          onClose={() => setIsNewNoteOpen(false)}
          title="إضافة ملاحظة جديدة"
          subtitle="تسجيل ملاحظة لمحاسب التكاليف على صنف معين أو قسم تشغيل"
          size="md"
        >
          <form onSubmit={handleSaveNewNote} className="p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الخامة المعنية:
              </label>
              <select
                value={newNoteMaterialId}
                onChange={(e) => setNewNoteMaterialId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              >
                <option value="">-- اختر الخامة --</option>
                {warehouseService.getMaterials(establishmentId).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameAr} ({m.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الفرع:
                </label>
                <select
                  value={newNoteBranchId}
                  onChange={(e) => setNewNoteBranchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  القسم المستهدف:
                </label>
                <input
                  type="text"
                  value={newNoteSection}
                  onChange={(e) => setNewNoteSection(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نص الملاحظة:
              </label>
              <textarea
                rows={3}
                required
                placeholder="سجل تفاصيل الملاحظة أو سبب الانحراف أو توصية المورد..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsNewNoteOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="default" className="bg-amber-600 text-white font-bold">
                حفظ الملاحظة
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* 7. Item Card Modal */}
      {selectedMaterialIdForCard && (
        <ItemCardModal
          isOpen={!!selectedMaterialIdForCard}
          onClose={() => setSelectedMaterialIdForCard(null)}
          establishmentId={establishmentId}
          materialId={selectedMaterialIdForCard}
        />
      )}
    </div>
  );
};

export default DailyNotesModule;
