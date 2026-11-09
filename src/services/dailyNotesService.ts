/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DAILY NOTES SERVICE (الملاحظات اليومية - Package 3)
 *
 * Features:
 * - Aggregates all cost accountant notes written next to items or audit discrepancies.
 * - Links directly to Item Card («فتح كارت الصنف»).
 * - Status tracking: «لم يتم الحل» (Default) vs «تم الحل» (with problem & solution summary).
 * - Date range & status filtering.
 * - Print output highlighting unresolved items with the mandatory statement:
 *   «لم يتم الحل، برجاء النظر في المشكلة وحلها جذرياً».
 * - Sharing with specific sections / departments.
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';

export type DailyNoteStatus = 'unresolved' | 'resolved';

export interface DailyNote {
  id: string;
  establishmentId: string;
  branchId: string;
  warehouseId?: string;
  materialId: string;
  materialNameAr: string;
  date: string; // ISO / YYYY-MM-DD
  text: string;
  authorName: string;
  authorRole: string;
  status: DailyNoteStatus;
  statusNameAr: string;
  resolutionText?: string; // كانت المشكلة كذا وتم حلها بكذا
  resolvedAt?: string;
  resolvedBy?: string;
  targetSection?: string;
  createdAt: string;
  updatedAt: string;
}

class DailyNotesService {
  private storage = getStorageAdapter();

  private getNotesKey(estId: string): string {
    return `tygos_${estId}_daily_notes`;
  }

  public getNotes(
    establishmentId: string = 'default',
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: DailyNoteStatus | 'all';
      branchId?: string;
      materialId?: string;
      section?: string;
    }
  ): DailyNote[] {
    const raw = this.storage.getItemSync(this.getNotesKey(establishmentId));
    let list: DailyNote[] = [];
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }

    // Seed sample notes if empty for seamless testing
    if (list.length === 0) {
      list = [
        {
          id: 'note-seed-1',
          establishmentId,
          branchId: 'branch-main',
          warehouseId: 'wh-kitchen',
          materialId: 'ing-1',
          materialNameAr: 'لحم بقري ريب آي صافي',
          date: new Date().toISOString().split('T')[0],
          text: 'سعر التوريد ارتفع 15% فجأة عن متوسط الشهر الماضي، لازم نراجع المورد البديل',
          authorName: 'محاسب التكاليف',
          authorRole: 'cost_accountant',
          status: 'unresolved',
          statusNameAr: 'لم يتم الحل',
          targetSection: 'مخزن المطبخ الساخن والمشويات',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        },
        {
          id: 'note-seed-2',
          establishmentId,
          branchId: 'branch-main',
          warehouseId: 'wh-bar',
          materialId: 'ing-2',
          materialNameAr: 'حليب كامل الدسم مبستر',
          date: new Date().toISOString().split('T')[0],
          text: 'عجز طفيف 3 لترات بسبب تلف عبوة أثناء النقل وتم إثباتها في محضر الهالك',
          authorName: 'محاسب التكاليف',
          authorRole: 'cost_accountant',
          status: 'resolved',
          statusNameAr: 'تم الحل',
          resolutionText: 'كانت المشكلة تلف عبوة أثناء النقل، وتم التواصل مع شركة الألبان وتعويضها في التوريدة الجديدة.',
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'مدير المنشأة',
          targetSection: 'مخزن البار والمشروبات',
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      this.saveNotes(establishmentId, list);
    }

    if (filters?.branchId && filters.branchId !== 'all') {
      list = list.filter((n) => n.branchId === filters.branchId);
    }

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((n) => n.status === filters.status);
    }

    if (filters?.materialId && filters.materialId !== 'all') {
      list = list.filter((n) => n.materialId === filters.materialId);
    }

    if (filters?.startDate) {
      list = list.filter((n) => n.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      list = list.filter((n) => n.date <= filters.endDate!);
    }

    if (filters?.section && filters.section !== 'all') {
      list = list.filter((n) => !n.targetSection || n.targetSection.includes(filters.section!));
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public saveNotes(establishmentId: string, list: DailyNote[]): void {
    this.storage.setItemSync(this.getNotesKey(establishmentId), JSON.stringify(list));
  }

  public addNote(
    establishmentId: string,
    params: {
      branchId: string;
      warehouseId?: string;
      materialId: string;
      materialNameAr: string;
      text: string;
      authorName: string;
      authorRole?: string;
      targetSection?: string;
    }
  ): DailyNote {
    const list = this.getNotes(establishmentId);
    const newNote: DailyNote = {
      id: `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId,
      branchId: params.branchId,
      warehouseId: params.warehouseId,
      materialId: params.materialId,
      materialNameAr: params.materialNameAr,
      date: new Date().toISOString().split('T')[0],
      text: params.text,
      authorName: params.authorName,
      authorRole: params.authorRole || 'cost_accountant',
      status: 'unresolved',
      statusNameAr: 'لم يتم الحل',
      targetSection: params.targetSection,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    list.unshift(newNote);
    this.saveNotes(establishmentId, list);
    return newNote;
  }

  public resolveNote(
    establishmentId: string,
    noteId: string,
    resolutionText: string,
    resolvedBy: string
  ): DailyNote {
    const list = this.getNotes(establishmentId);
    const index = list.findIndex((n) => n.id === noteId);
    if (index === -1) throw new Error('الملاحظة غير موجودة');

    const note = list[index];
    note.status = 'resolved';
    note.statusNameAr = 'تم الحل';
    note.resolutionText = resolutionText;
    note.resolvedAt = new Date().toISOString();
    note.resolvedBy = resolvedBy;
    note.updatedAt = new Date().toISOString();

    list[index] = note;
    this.saveNotes(establishmentId, list);
    return note;
  }

  public reopenNote(establishmentId: string, noteId: string): DailyNote {
    const list = this.getNotes(establishmentId);
    const index = list.findIndex((n) => n.id === noteId);
    if (index === -1) throw new Error('الملاحظة غير موجودة');

    const note = list[index];
    note.status = 'unresolved';
    note.statusNameAr = 'لم يتم الحل';
    note.resolutionText = undefined;
    note.resolvedAt = undefined;
    note.resolvedBy = undefined;
    note.updatedAt = new Date().toISOString();

    list[index] = note;
    this.saveNotes(establishmentId, list);
    return note;
  }

  public deleteNote(establishmentId: string, noteId: string): boolean {
    let list = this.getNotes(establishmentId);
    const prevLen = list.length;
    list = list.filter((n) => n.id !== noteId);
    this.saveNotes(establishmentId, list);
    return list.length < prevLen;
  }
}

export const dailyNotesService = new DailyNotesService();
