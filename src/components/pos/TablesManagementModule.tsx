/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TABLES & ZONES MANAGEMENT MODULE (Phase 7 - Section 5)
 * Custom table naming (e.g. VIP 1), zones, batch creation (1-20),
 * reservations, status tracking, and per-table QR link preview.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../common/Button.tsx';
import {
  LayoutGrid,
  Plus,
  Users,
  Clock,
  CalendarClock,
  QrCode,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import {
  tableService,
  RestaurantTable,
  TableZone,
} from '../../services/tableService.ts';
import { settingsRepository } from '../../repositories/repositories.ts';
import { formatMoney } from '../../utils/formatters.ts';
import { domainEvents } from '../../events/domainEvents.ts';

export const TablesManagementModule: React.FC<{
  onNavigate?: (view: string) => void;
}> = ({ onNavigate }) => {
  const { currentEstablishment } = useAuth();
  const { language } = useI18n();
  const isAr = language === 'ar';
  const estId = currentEstablishment?.id || 'default';
  const currency = currentEstablishment?.currency || 'EGP';

  const [zones, setZones] = useState<TableZone[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

  // Single Table Form
  const [newNameAr, setNewNameAr] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCapacity, setNewCapacity] = useState('4');
  const [newZoneId, setNewZoneId] = useState('zone-hall');

  // Batch Creation Form (1-20)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchCount, setBatchCount] = useState('6');
  const [batchZoneId, setBatchZoneId] = useState('zone-hall');
  const [batchCapacity, setBatchCapacity] = useState('4');

  // Add Zone Form
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneNameAr, setZoneNameAr] = useState('');
  const [zoneNameEn, setZoneNameEn] = useState('');

  // Reservation Modal
  const [reserveTarget, setReserveTarget] = useState<RestaurantTable | null>(null);
  const [resCustomerName, setResCustomerName] = useState('');
  const [resCustomerPhone, setResCustomerPhone] = useState('');
  const [resTime, setResTime] = useState('20:00');
  const [resGuests, setResGuests] = useState('4');

  // QR Preview Modal
  const [qrTable, setQrTable] = useState<RestaurantTable | null>(null);

  const loadData = () => {
    const z = tableService.getZones(estId);
    setZones(z);
    setTables(tableService.getTables(estId));
    if (z.length > 0 && !z.some((item) => item.id === newZoneId)) {
      setNewZoneId(z[0].id);
      setBatchZoneId(z[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = domainEvents.subscribe('table.updated', () => {
      loadData();
    });
    return () => unsub();
  }, [estId]);

  const showNotice = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddSingleTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameAr.trim()) return;
    tableService.addTable(estId, {
      nameAr: newNameAr.trim(),
      nameEn: newNameEn.trim() || newNameAr.trim(),
      zoneId: newZoneId,
      capacity: Math.max(1, Number(newCapacity) || 4),
    });
    setNewNameAr('');
    setNewNameEn('');
    loadData();
    showNotice(isAr ? 'تمت إضافة الطاولة بنجاح' : 'Table added');
  };

  const handleBatchCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.max(1, Math.min(20, Number(batchCount) || 1));
    tableService.addBatchTables(
      estId,
      count,
      batchZoneId,
      Math.max(1, Number(batchCapacity) || 4),
      isAr ? 'طاولة' : 'Table',
      'Table'
    );
    setShowBatchModal(false);
    loadData();
    showNotice(isAr ? `تم إنشاء ${count} طاولات دفعة واحدة` : `Created ${count} tables`);
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneNameAr.trim()) return;
    const created = tableService.addZone(estId, zoneNameAr.trim(), zoneNameEn.trim());
    setZoneNameAr('');
    setZoneNameEn('');
    setShowZoneModal(false);
    setNewZoneId(created.id);
    loadData();
    showNotice(isAr ? 'تمت إضافة المنطقة بنجاح' : 'Zone added');
  };

  const handleReserveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reserveTarget || !resCustomerName.trim()) return;
    tableService.reserveTable(estId, reserveTarget.id, {
      customerName: resCustomerName.trim(),
      customerPhone: resCustomerPhone.trim() || undefined,
      reservedForTime: resTime,
      guestCount: Math.max(1, Number(resGuests) || 2),
    });
    setReserveTarget(null);
    setResCustomerName('');
    setResCustomerPhone('');
    loadData();
    showNotice(isAr ? 'تم تسجيل حجز الطاولة' : 'Table reserved');
  };

  const handleRelease = (tbl: RestaurantTable) => {
    tableService.releaseTable(estId, tbl.id);
    loadData();
    showNotice(isAr ? `تم إخلاء ${tbl.nameAr}` : `Released ${tbl.nameEn}`);
  };

  const handleDelete = (tbl: RestaurantTable) => {
    if (tbl.status === 'occupied') {
      showNotice(isAr ? 'لا يمكن حذف طاولة مشغولة بطلب مفتوح' : 'Cannot delete occupied table');
      return;
    }
    tableService.deleteTable(estId, tbl.id);
    loadData();
    showNotice(isAr ? 'تم حذف الطاولة' : 'Table deleted');
  };

  const filteredTables =
    selectedZone === 'all'
      ? tables
      : tables.filter((t) => t.zoneId === selectedZone);

  const baseUrl =
    settingsRepository.getPublicAppUrl() ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const getElapsedMinutes = (iso?: string) => {
    if (!iso) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed bottom-5 end-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-cyan-500" />
            <span>{isAr ? 'إدارة الطاولات والمناطق والحجوزات' : 'Tables, Zones & Reservations'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? 'تسمية مخصصة للطاولات، إضافة دفعة واحدة (1-20)، حجوزات، وروابط QR لكل طاولة'
              : 'Custom table naming, batch creation (1-20), reservations, and per-table QR links'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowZoneModal(true)}
            icon={<Layers className="w-4 h-4" />}
          >
            {isAr ? 'منطقة جديدة' : 'New Zone'}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowBatchModal(true)}
            icon={<Sparkles className="w-4 h-4" />}
          >
            {isAr ? 'إضافة دفعة (1-20)' : 'Batch Add (1-20)'}
          </Button>
          {onNavigate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onNavigate('pos')}
            >
              {isAr ? 'فتح الكاشير' : 'Open POS'}
            </Button>
          )}
        </div>
      </div>

      {/* Quick Add Single Table Form */}
      <form
        onSubmit={handleAddSingleTable}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
      >
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            {isAr ? 'اسم الطاولة (مثل: VIP 1 أو طاولة 9)' : 'Table Name (e.g. VIP 1)'}
          </label>
          <input
            type="text"
            value={newNameAr}
            onChange={(e) => setNewNameAr(e.target.value)}
            placeholder={isAr ? 'VIP 1' : 'VIP 1'}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            {isAr ? 'الاسم بالإنجليزية (اختياري)' : 'English Name (Optional)'}
          </label>
          <input
            type="text"
            value={newNameEn}
            onChange={(e) => setNewNameEn(e.target.value)}
            placeholder="VIP 1"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            {isAr ? 'المنطقة' : 'Zone'}
          </label>
          <select
            value={newZoneId}
            onChange={(e) => setNewZoneId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {isAr ? z.nameAr : z.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
            {isAr ? 'عدد المقاعد' : 'Seats'}
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-900 dark:text-white"
          />
        </div>
        <Button type="submit" variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
          {isAr ? 'إضافة طاولة' : 'Add Table'}
        </Button>
      </form>

      {/* Zones Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          type="button"
          size="sm"
          variant={selectedZone === 'all' ? 'primary' : 'outline'}
          selected={selectedZone === 'all'}
          onClick={() => setSelectedZone('all')}
        >
          {isAr ? `الكل (${tables.length})` : `All (${tables.length})`}
        </Button>
        {zones.map((z) => {
          const count = tables.filter((t) => t.zoneId === z.id).length;
          return (
            <Button
              key={z.id}
              type="button"
              size="sm"
              variant={selectedZone === z.id ? 'primary' : 'outline'}
              selected={selectedZone === z.id}
              onClick={() => setSelectedZone(z.id)}
            >
              {isAr ? `${z.nameAr} (${count})` : `${z.nameEn} (${count})`}
            </Button>
          );
        })}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((tbl) => {
          const zone = zones.find((z) => z.id === tbl.zoneId);
          const isOccupied = tbl.status === 'occupied' || tbl.status === 'awaiting_bill';
          const isReserved = tbl.status === 'reserved';

          return (
            <div
              key={tbl.id}
              className={`rounded-2xl border-2 p-4 flex flex-col justify-between space-y-3 transition-all ${
                isOccupied
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-500/60'
                  : isReserved
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-500/60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {isAr ? tbl.nameAr : tbl.nameEn}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {zone ? (isAr ? zone.nameAr : zone.nameEn) : ''}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                      isOccupied
                        ? 'bg-amber-500 text-slate-950'
                        : isReserved
                        ? 'bg-indigo-500 text-white'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    }`}
                  >
                    {tbl.status === 'occupied'
                      ? isAr ? 'مشغولة' : 'Occupied'
                      : tbl.status === 'awaiting_bill'
                      ? isAr ? 'بانتظار الحساب' : 'Awaiting Bill'
                      : tbl.status === 'reserved'
                      ? isAr ? 'محجوزة' : 'Reserved'
                      : isAr ? 'متاحة' : 'Available'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-bold">
                    <Users className="w-3.5 h-3.5" />
                    {tbl.capacity} {isAr ? 'مقاعد' : 'seats'}
                  </span>
                  {isOccupied && tbl.occupiedAt && (
                    <span className="flex items-center gap-1 font-mono text-amber-600 dark:text-amber-400 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      {getElapsedMinutes(tbl.occupiedAt)}m
                    </span>
                  )}
                </div>

                {isOccupied && tbl.activeOrderSerial && (
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-950 border border-amber-300 dark:border-amber-800 flex items-center justify-between text-xs">
                    <span className="font-mono font-black text-cyan-600 dark:text-cyan-400">
                      {tbl.activeOrderSerial}
                    </span>
                    <span className="font-mono font-black text-slate-900 dark:text-white">
                      {formatMoney(tbl.activeOrderTotal || 0, currency, language)}
                    </span>
                  </div>
                )}

                {isReserved && tbl.reservation && (
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-950 border border-indigo-300 dark:border-indigo-800 text-xs space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {tbl.reservation.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {tbl.reservation.reservedForTime} • {tbl.reservation.guestCount}{' '}
                      {isAr ? 'ضيوف' : 'guests'}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1.5">
                {tbl.status === 'available' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setReserveTarget(tbl)}
                    icon={<CalendarClock className="w-3.5 h-3.5" />}
                  >
                    {isAr ? 'حجز' : 'Reserve'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRelease(tbl)}
                  >
                    {isAr ? 'إخلاء' : 'Release'}
                  </Button>
                )}

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setQrTable(tbl)}
                    title={isAr ? 'رابط QR للطاولة' : 'Table QR Link'}
                  >
                    <QrCode className="w-4 h-4 text-cyan-500" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(tbl)}
                    title={isAr ? 'حذف الطاولة' : 'Delete Table'}
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Add Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleBatchCreate}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? 'إضافة طاولات دفعة واحدة (1-20)' : 'Batch Create Tables (1-20)'}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowBatchModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'عدد الطاولات (1 إلى 20)' : 'Number of Tables (1-20)'}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{isAr ? 'المنطقة' : 'Zone'}</label>
              <select
                value={batchZoneId}
                onChange={(e) => setBatchZoneId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {isAr ? z.nameAr : z.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'سعة كل طاولة (مقاعد)' : 'Seats per Table'}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={batchCapacity}
                onChange={(e) => setBatchCapacity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowBatchModal(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary">
                {isAr ? 'إنشاء الطاولات' : 'Create Tables'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Add Zone Modal */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleAddZone}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? 'إضافة منطقة صالة جديدة' : 'Add New Dining Zone'}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowZoneModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'اسم المنطقة بالعربية' : 'Zone Name (Arabic)'}
              </label>
              <input
                type="text"
                value={zoneNameAr}
                onChange={(e) => setZoneNameAr(e.target.value)}
                placeholder={isAr ? 'الحديقة الخارجية' : 'Garden'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">
                {isAr ? 'اسم المنطقة بالإنجليزية' : 'Zone Name (English)'}
              </label>
              <input
                type="text"
                value={zoneNameEn}
                onChange={(e) => setZoneNameEn(e.target.value)}
                placeholder="Garden Patio"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowZoneModal(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary">
                {isAr ? 'حفظ المنطقة' : 'Save Zone'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reserve Table Modal */}
      {reserveTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleReserveSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? `حجز ${reserveTarget.nameAr}` : `Reserve ${reserveTarget.nameEn}`}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setReserveTarget(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{isAr ? 'اسم العميل' : 'Guest Name'}</label>
              <input
                type="text"
                value={resCustomerName}
                onChange={(e) => setResCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1">{isAr ? 'رقم الهاتف' : 'Phone'}</label>
                <input
                  type="tel"
                  value={resCustomerPhone}
                  onChange={(e) => setResCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">{isAr ? 'الوقت' : 'Time'}</label>
                <input
                  type="time"
                  value={resTime}
                  onChange={(e) => setResTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{isAr ? 'عدد الضيوف' : 'Guests'}</label>
              <input
                type="number"
                min={1}
                max={30}
                value={resGuests}
                onChange={(e) => setResGuests(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReserveTarget(null)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary">
                {isAr ? 'تأكيد الحجز' : 'Confirm Reservation'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* QR Link Modal */}
      {qrTable && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 text-center">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? `رابط المنيو لطاولة ${qrTable.nameAr}` : `QR Menu Link - ${qrTable.nameEn}`}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setQrTable(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 font-mono text-xs break-all text-cyan-600 dark:text-cyan-400">
              {`${baseUrl}/?menu=1&tenant=${estId}&table=${qrTable.number}`}
            </div>
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `${baseUrl}/?menu=1&tenant=${estId}&table=${qrTable.number}`
                  );
                  showNotice(isAr ? 'تم نسخ رابط الطاولة' : 'Table link copied');
                  setQrTable(null);
                }}
              >
                {isAr ? 'نسخ الرابط' : 'Copy Link'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setQrTable(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
