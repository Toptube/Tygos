/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WAREHOUSES & SUPPLY MODULE (شاشة المخازن وحركات الأصناف) (Package 2)
 *
 * 4 Tabs:
 * 1. «المخازن والفروع» (locations): إدارة الفروع والمخازن مع زر GPS لتحديد الموقع ورابط الخريطة.
 * 2. «كارت الصنف» (item_card): شجرة أقسام الخامات وكروت الأصناف مع الأرصدة في كل مكان وجدول الحركات.
 * 3. «طلبيات الأقسام» (requisitions): دورة الطلبية بين الأقسام والمخازن مع توقيع الكاتب والصرف والاستلام الجزئي.
 * 4. «سلسلة الوحدات» (units_setup): ضبط وحدات التعبئة الكبرى والصغرى وأحجام العبوات مع أمثلة حية.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../common/Button.tsx';
import { ModalShell } from '../common/ModalShell.tsx';
import { NumericInput } from '../common/NumericInput.tsx';
import {
  Warehouse,
  Building,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  ArrowUpDown,
  Navigation,
  FileText,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  Scale,
  PackageCheck,
  Eye,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  warehouseService,
  Branch,
  WarehouseLocation,
  RequisitionOrder,
  WarehouseType,
} from '../../services/warehouseService.ts';
import { RawMaterialItem, dataService } from '../../services/dataService.ts';
import { multiUnitService } from '../../services/multiUnitService.ts';
import { categoryService, CategoryNode } from '../../services/categoryService.ts';
import { ItemCardModal } from './ItemCardModal.tsx';
import { RequisitionDetailModal } from './RequisitionDetailModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const WarehousesModule: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { formatNumber, formatCurrency } = useI18n();
  const estId = currentUser?.establishmentId || 'default';

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'locations' | 'item_card' | 'requisitions' | 'units_setup'>('locations');

  // Core Data
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLocation[]>([]);
  const [materials, setMaterials] = useState<RawMaterialItem[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionOrder[]>([]);

  // Selection states
  const [selectedMaterialForItemCard, setSelectedMaterialForItemCard] = useState<RawMaterialItem | null>(null);
  const [selectedRequisitionForDetail, setSelectedRequisitionForDetail] = useState<RequisitionOrder | null>(null);

  // Modals
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
  const [isNewRequisitionOpen, setIsNewRequisitionOpen] = useState(false);
  const [isUnitSetupOpen, setIsUnitSetupOpen] = useState(false);
  const [editingMaterialForUnits, setEditingMaterialForUnits] = useState<RawMaterialItem | null>(null);

  // Branch Form
  const [branchNameAr, setBranchNameAr] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [isBranchLocating, setIsBranchLocating] = useState(false);

  // Warehouse Form
  const [whNameAr, setWhNameAr] = useState('');
  const [whType, setWhType] = useState<WarehouseType>('section');
  const [whSectionType, setWhSectionType] = useState('kitchen');
  const [whBranchId, setWhBranchId] = useState('branch-main');
  const [whManagerName, setWhManagerName] = useState('');

  // Unit Setup Form
  const [majorUnit, setMajorUnit] = useState('كرتونة');
  const [majorUnitCapacity, setMajorUnitCapacity] = useState(12);
  const [subUnit, setSubUnit] = useState('علبة');
  const [subUnitCapacity, setSubUnitCapacity] = useState(700);

  // New Requisition Form
  const [reqSourceWhId, setReqSourceWhId] = useState('wh-main');
  const [reqTargetWhId, setReqTargetWhId] = useState('wh-kitchen');
  const [reqLines, setReqLines] = useState<
    Array<{ materialId: string; quantity: number; unit: 'major' | 'sub' | 'base'; notes?: string }>
  >([]);

  // Category Tree for Materials in Item Card tab
  const [selectedMainCat, setSelectedMainCat] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const refreshAllData = () => {
    setBranches(warehouseService.getBranches(estId));
    setWarehouses(warehouseService.getWarehouses(estId));
    setMaterials(warehouseService.getMaterials(estId));
    setRequisitions(warehouseService.getRequisitions(estId));
  };

  useEffect(() => {
    refreshAllData();
  }, [estId]);

  // Role permissions
  const role = currentUser?.role || 'tenant_admin';
  const isCostOrWarehouseManager =
    role === 'warehouse_manager' ||
    role === 'store_manager' ||
    role === 'cost_accountant' ||
    role === 'tenant_admin' ||
    role === 'general_manager' ||
    role === 'super_admin';

  // Visible warehouses for current user
  const visibleWarehouses = useMemo(() => {
    return warehouseService.getWarehousesForUser(estId, currentUser);
  }, [estId, currentUser, warehouses]);

  // Handle GPS Location for Branch via navigator.geolocation
  const handleDetectGpsForBranch = (branchId?: string) => {
    if (!navigator.geolocation) {
      showToast({ title: 'خاصية تحديد الموقع الجغرافي غير مدعومة في متصفحك', type: 'error' });
      return;
    }

    setIsBranchLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsBranchLocating(false);
        const { latitude, longitude } = pos.coords;
        if (branchId) {
          warehouseService.updateBranchGps(estId, branchId, latitude, longitude);
          refreshAllData();
          showToast({ title: `تم حفظ موقع الفرع بنجاح: (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) ✓`, type: 'success' });
        } else {
          showToast({ title: `تم التقاط الإحداثيات بنجاح: (${latitude.toFixed(4)}, ${longitude.toFixed(4)}) ✓`, type: 'success' });
        }
      },
      (err) => {
        setIsBranchLocating(false);
        showToast({ title: 'تعذر الوصول لموقعك الجغرافي: ' + err.message, type: 'error' });
      },
      { timeout: 10000 }
    );
  };

  // Add Branch Submit
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchNameAr.trim()) return;

    warehouseService.addBranch(estId, {
      nameAr: branchNameAr.trim(),
      address: branchAddress.trim() || 'العنوان الرئيسي',
      phone: branchPhone.trim(),
    });

    refreshAllData();
    setIsAddBranchOpen(false);
    setBranchNameAr('');
    setBranchAddress('');
    setBranchPhone('');
    showToast({ title: 'تمت إضافة الفرع الجديد بنجاح ✓', type: 'success' });
  };

  // Add Warehouse Submit
  const handleSaveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whNameAr.trim()) return;

    warehouseService.addWarehouse(estId, {
      nameAr: whNameAr.trim(),
      type: whType,
      sectionType: whType === 'section' ? whSectionType : undefined,
      branchId: whBranchId,
      managerName: whManagerName.trim(),
    });

    refreshAllData();
    setIsAddWarehouseOpen(false);
    setWhNameAr('');
    setWhManagerName('');
    showToast({ title: 'تمت إضافة المخزن الجديد بنجاح ✓', type: 'success' });
  };

  // Open Unit Setup for Material
  const handleOpenUnitSetup = (mat: RawMaterialItem) => {
    setEditingMaterialForUnits(mat);
    setMajorUnit(mat.majorUnit || 'كرتونة');
    setMajorUnitCapacity(mat.majorUnitCapacity || 12);
    setSubUnit(mat.subUnit || 'علبة');
    setSubUnitCapacity(mat.subUnitCapacity || (mat.consumptionUnit === 'مل' ? 700 : 500));
    setIsUnitSetupOpen(true);
  };

  // Save Unit Setup
  const handleSaveUnitSetup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterialForUnits) return;

    const updatedMaterials = materials.map((m) => {
      if (m.id === editingMaterialForUnits.id) {
        return {
          ...m,
          majorUnit,
          majorUnitCapacity,
          subUnit,
          subUnitCapacity,
          baseUnit: m.consumptionUnit,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    warehouseService.saveMaterials(estId, updatedMaterials);
    setMaterials(updatedMaterials);
    setIsUnitSetupOpen(false);
    showToast({ title: `تم حفظ سلسلة الوحدات للخامة [${editingMaterialForUnits.nameAr}] بنجاح ✓`, type: 'success' });
  };

  // Add Line to Requisition
  const handleAddLineToReq = (matId: string) => {
    const exists = reqLines.find((l) => l.materialId === matId);
    if (!exists) {
      setReqLines([...reqLines, { materialId: matId, quantity: 1, unit: 'sub', notes: '' }]);
    }
  };

  // Save Requisition
  const handleSaveRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    if (reqLines.length === 0) {
      showToast({ title: 'يرجى إضافة خامة واحدة على الأقل في الطلبية', type: 'warning' });
      return;
    }

    try {
      const newReq = warehouseService.createRequisition(
        estId,
        {
          sourceWarehouseId: reqSourceWhId,
          targetWarehouseId: reqTargetWhId,
          lines: reqLines.map((l) => ({
            materialId: l.materialId,
            requestedQuantity: l.quantity,
            requestedUnit: l.unit,
            notes: l.notes,
          })),
        },
        currentUser
      );

      refreshAllData();
      setIsNewRequisitionOpen(false);
      setReqLines([]);
      showToast({ title: `تم إرسال الطلبية #${newReq.requisitionNumber} بتوقيعك (${currentUser?.fullName || 'الشيف'}) ✓`, type: 'success' });
    } catch (err: any) {
      showToast({ title: err.message || 'حدث خطأ في إنشاء الطلبية', type: 'error' });
    }
  };

  // Filtered materials for item card tab
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        m.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedMainCat === 'all' || m.category === selectedMainCat;
      return matchSearch && matchCat;
    });
  }, [materials, searchTerm, selectedMainCat]);

  return (
    <div className="space-y-6 pb-12" data-testid="warehouses-module">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Warehouse className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              المخازن وحركات الأصناف
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة الفروع والمخازن، كارت الصنف مع الأرصدة في كل مكان، ودورة طلبيات الأقسام بالصرف والاستلام
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'locations' && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddBranchOpen(true)}
                className="gap-1.5 font-bold"
              >
                <Plus className="w-4 h-4 text-cyan-500" />
                <span>+ فرع جديد</span>
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsAddWarehouseOpen(true)}
                className="gap-1.5 font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>+ مخزن جديد</span>
              </Button>
            </>
          )}

          {activeTab === 'requisitions' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsNewRequisitionOpen(true)}
              className="gap-1.5 font-bold"
              data-testid="create-new-requisition-btn"
            >
              <Plus className="w-4 h-4" />
              <span>+ طلبية جديدة</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'locations'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>المخازن والفروع ({warehouses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('item_card')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'item_card'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
          data-testid="tab-item-card"
        >
          <FileText className="w-4 h-4" />
          <span>كارت الصنف (رحلة الخامة)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requisitions')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'requisitions'
              ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
          data-testid="tab-requisitions"
        >
          <Truck className="w-4 h-4" />
          <span>طلبيات الأقسام ({requisitions.length})</span>
        </button>

        {isCostOrWarehouseManager && (
          <button
            type="button"
            onClick={() => setActiveTab('units_setup')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'units_setup'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>سلسلة الوحدات والتعبئة</span>
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: LOCATIONS (المخازن والفروع) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'locations' && (
        <div className="space-y-6">
          {/* Branches Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-cyan-500" />
                <span>فروع المنشأة ({branches.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400">
                          {b.code}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{b.nameAr}</h4>
                        {b.isMain && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold">
                            الفرع الرئيسي
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span>{b.address}</span>
                      </p>
                    </div>
                  </div>

                  {/* GPS Coordinates & Map Link */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <Navigation className="w-3.5 h-3.5 text-cyan-500" />
                      {b.gpsLocation ? (
                        <span>
                          {b.gpsLocation.lat.toFixed(4)}, {b.gpsLocation.lng.toFixed(4)}
                        </span>
                      ) : (
                        <span>لم يُحدد الموقع بعد</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDetectGpsForBranch(b.id)}
                        disabled={isBranchLocating}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-bold text-[11px]"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>حدد موقعي GPS</span>
                      </button>

                      {b.gpsLocation?.mapUrl && (
                        <a
                          href={b.gpsLocation.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-cyan-500 flex items-center gap-1 text-[11px]"
                          title="عرض في الخريطة"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>الخريطة</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warehouses Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-cyan-500" />
                <span>المخازن ومواقع الأقسام المصرح بها ({visibleWarehouses.length})</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleWarehouses.map((wh) => (
                <div
                  key={wh.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold text-slate-600 dark:text-slate-400">
                          {wh.code}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{wh.nameAr}</h4>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        المدير المسؤول: <strong className="text-slate-700 dark:text-slate-300">{wh.managerName || 'غير محدد'}</strong>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        wh.type === 'main'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : wh.type === 'central_kitchen'
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                          : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                      }`}
                    >
                      {wh.type === 'main'
                        ? 'مخزن رئيسي'
                        : wh.type === 'central_kitchen'
                        ? 'مطبخ مركزي'
                        : 'مخزن قسم'}
                    </span>
                  </div>

                  {wh.sectionType && (
                    <div className="text-xs text-slate-500">
                      مرتبط بمحطة التحضير: <strong className="text-cyan-600 dark:text-cyan-400">[{wh.sectionType}]</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ITEM CARD (كارت الصنف) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'item_card' && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
              <input
                type="text"
                placeholder="ابحث عن أي خامة أو تصنيف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
              />
            </div>

            <div className="text-xs text-slate-500">
              إجمالي الخامات: <strong className="font-mono text-slate-900 dark:text-white">{filteredMaterials.length}</strong>
            </div>
          </div>

          {/* Raw Materials Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMaterials.map((mat) => {
              const mixedStock = multiUnitService.formatMixed(mat.currentStock, mat);
              return (
                <div
                  key={mat.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 hover:border-cyan-500/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{mat.nameAr}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">{mat.category}</span>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                      {formatNumber(mat.purchasePrice)} ج.م / {mat.purchaseUnit}
                    </span>
                  </div>

                  {/* Stock Display in Mixed Compound Units */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60">
                    <span className="text-[11px] text-slate-500">الرصيد الكلي بالوحدات المركبة:</span>
                    <div className="text-sm font-black text-cyan-700 dark:text-cyan-300 mt-0.5">
                      {mixedStock}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMaterialForItemCard(mat)}
                    className="w-full gap-1.5 font-bold"
                  >
                    <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>عرض كارت الصنف والحركات</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: REQUISITIONS (طلبيات الأقسام) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'requisitions' && (
        <div className="space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">طلبيات مرسلة</span>
              <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {requisitions.filter((r) => r.status === 'submitted').length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">في الطريق للقسم</span>
              <div className="text-lg font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {requisitions.filter((r) => r.status === 'dispatched').length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">مكتملة بالكامل</span>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {requisitions.filter((r) => r.status === 'received').length}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-500">استلام جزئي / مرتجع</span>
              <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {requisitions.filter((r) => r.status === 'partially_received').length}
              </div>
            </div>
          </div>

          {/* Requisitions List */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-start">رقم الطلبية</th>
                    <th className="py-3 px-3 text-start">التاريخ والوقت</th>
                    <th className="py-3 px-3 text-start">المسار (من ← إلى)</th>
                    <th className="py-3 px-3 text-start">الكاتب (توقيع تلقائي)</th>
                    <th className="py-3 px-3 text-center">عدد البنود</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-3 text-end">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {requisitions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        لا توجد طلبيات داخلية بعد. اضغط على «+ طلبية جديدة» للبدء.
                      </td>
                    </tr>
                  ) : (
                    requisitions.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {req.requisitionNumber}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap" dir="ltr">
                          {new Date(req.createdAt).toLocaleDateString('ar-EG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{req.sourceWarehouseNameAr}</div>
                          <div className="text-[10px] text-slate-400">← {req.targetWarehouseNameAr}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">{req.createdByUserName}</div>
                          <div className="text-[10px] text-slate-500">{req.createdByUserRole}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {req.lines.length}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              req.status === 'submitted'
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                : req.status === 'dispatched'
                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-400'
                                : req.status === 'received'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {req.statusNameAr}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequisitionForDetail(req)}
                            className="gap-1 font-bold text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>عرض ومتابعة</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: UNITS SETUP (سلسلة الوحدات والتعبئة) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'units_setup' && isCostOrWarehouseManager && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40 text-xs text-cyan-900 dark:text-cyan-200">
            <span className="font-bold">سلسلة الوحدات الثلاثية لكل خامة:</span>
            <p className="mt-1">
              وحدة التخزين الكبرى (كرتونة/شوال) ← وحدة فرعية (علبة/كيس) ← وحدة القياس الأساسية (جرام/مل/قطعة).
              النظام يحسب التحويلات تلقائياً مع الصرف اللحظي.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-start">الخامة</th>
                    <th className="py-3 px-3 text-start">الوحدة الكبرى</th>
                    <th className="py-3 px-3 text-start">سعة الكبرى بوحدات فرعية</th>
                    <th className="py-3 px-3 text-start">الوحدة الفرعية</th>
                    <th className="py-3 px-3 text-start">سعة الفرعية بوحدة الأساس</th>
                    <th className="py-3 px-3 text-start">وحدة الأساس</th>
                    <th className="py-3 px-3 text-end">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {materials.map((mat) => (
                    <tr key={mat.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {mat.nameAr}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {mat.majorUnit || 'كرتونة'}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {mat.majorUnitCapacity || 12}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                        {mat.subUnit || 'علبة'}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {mat.subUnitCapacity || (mat.consumptionUnit === 'مل' ? 700 : 500)} {mat.consumptionUnit}
                      </td>
                      <td className="py-3 px-3 font-bold text-cyan-600 dark:text-cyan-400">
                        {mat.consumptionUnit}
                      </td>
                      <td className="py-3 px-3 text-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenUnitSetup(mat)}
                          className="gap-1 font-bold text-xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل السلسلة</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ADD BRANCH */}
      {/* ------------------------------------------------------------- */}
      <ModalShell
        isOpen={isAddBranchOpen}
        onClose={() => setIsAddBranchOpen(false)}
        title="إضافة فرع جديد"
        subtitle="تسجيل فرع وموقعه الجغرافي"
        size="md"
      >
        <form onSubmit={handleSaveBranch} className="space-y-4 p-4 sm:p-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم الفرع *</label>
            <input
              type="text"
              required
              placeholder="مثال: فرع المهندسين"
              value={branchNameAr}
              onChange={(e) => setBranchNameAr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">العنوان بالتفصيل *</label>
            <input
              type="text"
              required
              placeholder="مثال: شارع جامعة الدول العربية"
              value={branchAddress}
              onChange={(e) => setBranchAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">رقم الهاتف</label>
            <input
              type="text"
              placeholder="مثال: 01012345678"
              value={branchPhone}
              onChange={(e) => setBranchPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddBranchOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              حفظ الفرع
            </Button>
          </div>
        </form>
      </ModalShell>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: ADD WAREHOUSE */}
      {/* ------------------------------------------------------------- */}
      <ModalShell
        isOpen={isAddWarehouseOpen}
        onClose={() => setIsAddWarehouseOpen(false)}
        title="إضافة مخزن جديد"
        subtitle="تحديد نوع المخزن والقسم التابع له"
        size="md"
      >
        <form onSubmit={handleSaveWarehouse} className="space-y-4 p-4 sm:p-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">اسم المخزن *</label>
            <input
              type="text"
              required
              placeholder="مثال: مخزن المخبز والحلواني"
              value={whNameAr}
              onChange={(e) => setWhNameAr(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">نوع المخزن</label>
              <select
                value={whType}
                onChange={(e) => setWhType(e.target.value as WarehouseType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
              >
                <option value="section">مخزن قسم (مطبخ / بار / مخبز)</option>
                <option value="main">مخزن رئيسي</option>
                <option value="central_kitchen">مطبخ مركزي</option>
                <option value="sub">مخزن فرعي</option>
              </select>
            </div>

            {whType === 'section' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">القسم المرتبط</label>
                <select
                  value={whSectionType}
                  onChange={(e) => setWhSectionType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
                >
                  <option value="kitchen">المطبخ الساخن</option>
                  <option value="bar">البار والمشروبات</option>
                  <option value="bakery">المخبز والحلواني</option>
                  <option value="grill">المشويات</option>
                  <option value="packaging">التعبئة والتغليف</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">الفرع التابع له</label>
            <select
              value={whBranchId}
              onChange={(e) => setWhBranchId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAr}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">المدير المسؤول</label>
            <input
              type="text"
              placeholder="مثال: الشيف محمد"
              value={whManagerName}
              onChange={(e) => setWhManagerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddWarehouseOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              حفظ المخزن
            </Button>
          </div>
        </form>
      </ModalShell>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: NEW REQUISITION ORDER */}
      {/* ------------------------------------------------------------- */}
      <ModalShell
        isOpen={isNewRequisitionOpen}
        onClose={() => setIsNewRequisitionOpen(false)}
        title="إنشاء طلبية داخلية جديدة"
        subtitle="طلب خامات من المخزن للقسم مع توقيع الكاتب التلقائي"
        size="2xl"
      >
        <form onSubmit={handleSaveRequisition} className="space-y-4 p-4 sm:p-6">
          {/* Author Signature Snapshot */}
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">كاتب الطلبية:</span>
              <strong className="text-cyan-700 dark:text-cyan-300">{currentUser?.fullName || 'الشيف'}</strong>
              <span className="text-[11px] text-slate-500">({currentUser?.role || 'شيف'})</span>
            </div>
            <span className="font-mono text-slate-500">{new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Warehouses Path */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">المخزن المطلوب منه *</label>
              <select
                value={reqSourceWhId}
                onChange={(e) => setReqSourceWhId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">القسم الطالب *</label>
              <select
                value={reqTargetWhId}
                onChange={(e) => setReqTargetWhId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.nameAr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Materials Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">اختر الخامات المطلوبة:</label>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {materials.map((m) => {
                const isSelected = reqLines.some((l) => l.materialId === m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleAddLineToReq(m.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{m.nameAr}</span>
                    <span className="text-[10px] opacity-70">({m.category})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lines Table */}
          {reqLines.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2 text-start">الخامة</th>
                    <th className="p-2 text-end">رصيدك الحالي</th>
                    <th className="p-2 text-center">الكمية</th>
                    <th className="p-2 text-center">الوحدة</th>
                    <th className="p-2 text-center">إلغاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reqLines.map((line, idx) => {
                    const mat = materials.find((m) => m.id === line.materialId);
                    if (!mat) return null;
                    const sectionStock = mat.warehouseStockMap?.[reqTargetWhId] || 0;

                    return (
                      <tr key={line.materialId}>
                        <td className="p-2 font-bold">{mat.nameAr}</td>
                        <td className="p-2 text-end font-mono text-slate-500">
                          {formatNumber(sectionStock)} {mat.consumptionUnit}
                        </td>
                        <td className="p-2 w-28">
                          <NumericInput
                            value={line.quantity}
                            onChange={(val) => {
                              const next = [...reqLines];
                              next[idx].quantity = val;
                              setReqLines(next);
                            }}
                            min={0.1}
                            placeholder="الكمية"
                          />
                        </td>
                        <td className="p-2 w-32">
                          <select
                            value={line.unit}
                            onChange={(e) => {
                              const next = [...reqLines];
                              next[idx].unit = e.target.value as any;
                              setReqLines(next);
                            }}
                            className="w-full px-2 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
                          >
                            <option value="major">{mat.majorUnit || 'كرتونة'}</option>
                            <option value="sub">{mat.subUnit || 'علبة'}</option>
                            <option value="base">{mat.baseUnit || mat.consumptionUnit}</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setReqLines(reqLines.filter((l) => l.materialId !== line.materialId))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsNewRequisitionOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              إرسال الطلبية للمخزن
            </Button>
          </div>
        </form>
      </ModalShell>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: UNIT SETUP WITH LIVE CONVERSION EXAMPLES */}
      {/* ------------------------------------------------------------- */}
      {editingMaterialForUnits && (
        <ModalShell
          isOpen={isUnitSetupOpen}
          onClose={() => setIsUnitSetupOpen(false)}
          title={`ضبط سلسلة الوحدات: ${editingMaterialForUnits.nameAr}`}
          subtitle="تحديد أحجام العبوات ومعاملات التحويل التلقائية"
          size="lg"
        >
          <form onSubmit={handleSaveUnitSetup} className="space-y-4 p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">العبوة الكبرى</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-slate-500">اسم الوحدة الكبرى:</label>
                    <input
                      type="text"
                      value={majorUnit}
                      onChange={(e) => setMajorUnit(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">تحتوي على كم وحدة فرعية:</label>
                    <NumericInput
                      value={majorUnitCapacity}
                      onChange={setMajorUnitCapacity}
                      min={1}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">العبوة الفرعية</span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-slate-500">اسم الوحدة الفرعية:</label>
                    <input
                      type="text"
                      value={subUnit}
                      onChange={(e) => setSubUnit(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500">
                      سعتها بوحدة الأساس ({editingMaterialForUnits.consumptionUnit}):
                    </label>
                    <NumericInput
                      value={subUnitCapacity}
                      onChange={setSubUnitCapacity}
                      min={1}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Conversion Examples */}
            <div className="space-y-2 p-3.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40">
              <span className="text-xs font-bold text-cyan-900 dark:text-cyan-300">
                أمثلة حية على التحويل اللحظي:
              </span>
              <div className="space-y-1 text-xs text-cyan-800 dark:text-cyan-200">
                <div>• كل 1 {majorUnit} = {majorUnitCapacity} {subUnit} = {formatNumber(majorUnitCapacity * subUnitCapacity)} {editingMaterialForUnits.consumptionUnit}</div>
                <div>• كل 1 {subUnit} = {formatNumber(subUnitCapacity)} {editingMaterialForUnits.consumptionUnit}</div>
                <div>• إدخال «2 {subUnit}» في أي طلبية يحولها النظام تلقائياً إلى ({formatNumber(2 * subUnitCapacity)} {editingMaterialForUnits.consumptionUnit})</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsUnitSetupOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary" className="font-bold">
                حفظ سلسلة الوحدات
              </Button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 5: ITEM CARD DETAILS MODAL */}
      {/* ------------------------------------------------------------- */}
      <ItemCardModal
        isOpen={Boolean(selectedMaterialForItemCard)}
        onClose={() => setSelectedMaterialForItemCard(null)}
        material={selectedMaterialForItemCard}
        establishmentId={estId}
      />

      {/* ------------------------------------------------------------- */}
      {/* MODAL 6: REQUISITION DETAILS & DISPATCH/RECEIPT */}
      {/* ------------------------------------------------------------- */}
      <RequisitionDetailModal
        isOpen={Boolean(selectedRequisitionForDetail)}
        onClose={() => setSelectedRequisitionForDetail(null)}
        requisition={selectedRequisitionForDetail}
        onRequisitionUpdated={(updated) => {
          setSelectedRequisitionForDetail(updated);
          refreshAllData();
        }}
        establishmentId={estId}
      />
    </div>
  );
};
