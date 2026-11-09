/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WAREHOUSE, BRANCH & INTERNAL SUPPLY REQUISITION SERVICE (Package 2)
 *
 * Architecture:
 * Establishment (منشأة)
 *  └── Branches (فروع مع إحداثيات GPS)
 *       └── Warehouses / Locations (مخازن رئيسية، فرعية، مطبخ مركزي، مخازن أقسام)
 *
 * Features:
 * - Multi-warehouse stock segregation (Sales deduct from Section Warehouse, NOT Main Warehouse).
 * - Full Item Card Movement Ledger (كارت الصنف: استلام، صرف، مبيعات، هالك، تحويل، جرد).
 * - Multi-Step Requisition Order Cycle (كاتب الطلبية مع التوقيع التلقائي ← مراجعة وصرف أمين المخزن مع «في الطريق» ← استلام الشيف الجزئي مع أسباب الرفض وطباعة).
 * - Role-based permissions (Storekeeper sees only their warehouse, Section manager sees their section, Warehouse manager & Cost accountant see all).
 */

import { getStorageAdapter } from '../repositories/storageAdapter.ts';
import { rawMaterialRepository } from '../repositories/repositories.ts';
import { RawMaterialItem } from './dataService.ts';
import { multiUnitService } from './multiUnitService.ts';
import { User } from '../types/index.ts';

// -------------------------------------------------------------
// TYPES & INTERFACES
// -------------------------------------------------------------

export interface Branch {
  id: string;
  establishmentId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  address: string;
  phone?: string;
  gpsLocation?: {
    lat: number;
    lng: number;
    mapUrl: string;
    updatedAt: string;
  };
  isMain?: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WarehouseType = 'main' | 'sub' | 'central_kitchen' | 'section';

export interface WarehouseLocation {
  id: string;
  establishmentId: string;
  branchId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  type: WarehouseType;
  sectionType?: 'kitchen' | 'bar' | 'bakery' | 'pastry' | 'grill' | 'packaging' | string;
  managerId?: string;
  managerName?: string;
  keeperIds: string[];
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MovementType =
  | 'purchase_receipt' // استلام شراء
  | 'section_issue' // صرف لقسم
  | 'sales' // مبيعات الكاشير
  | 'waste' // هالك وتالف
  | 'transfer' // تحويل بين المخازن
  | 'inventory_audit' // جرد فعلي
  | 'reconciliation'; // تسوية انحراف

export interface StockMovementRecord {
  id: string;
  establishmentId: string;
  materialId: string;
  materialNameAr: string;
  date: string; // ISO
  type: MovementType;
  typeNameAr: string;
  fromLocationId: string;
  fromLocationNameAr: string;
  toLocationId: string;
  toLocationNameAr: string;
  quantityBase: number; // positive = added to destination, negative = deducted
  balanceAfterBase: number; // total stock or destination location stock after movement
  referenceDoc: string; // e.g. فاتورة شراء #104, طلبية #REQ-2026-001, فاتورة كاشير #0042
  actorName: string;
  notes?: string;
}

export type RequisitionStatus =
  | 'draft' // مسودة
  | 'submitted' // مُرسلة
  | 'approved' // موافق عليها
  | 'dispatched' // تم الصرف (في الطريق)
  | 'received' // تم الاستلام بالكامل
  | 'partially_received' // استلام جزئي (مع أسطر مرفوضة)
  | 'rejected' // مرفوضة
  | 'cancelled'; // ملغاة

export interface RequisitionLine {
  id: string;
  materialId: string;
  materialNameAr: string;
  categoryAr: string;
  currentStockAtSectionBase: number; // الرصيد الحالي عند كاتب الطلبية في قسمه
  requestedQuantity: number;
  requestedUnit: 'major' | 'sub' | 'base';
  requestedUnitName: string;
  requestedQuantityBase: number; // converted to base unit
  approvedQuantityBase?: number;
  dispatchedQuantityBase?: number;
  receivedQuantityBase?: number;
  rejectedQuantityBase?: number;
  lineStatus: 'pending' | 'dispatched' | 'received' | 'rejected';
  rejectionReason?: string; // سبب عدم الاستلام (تالف، غير مطابق، ناقص)
  storekeeperResponse?: string; // رد أمين المخزن
  notes?: string;
}

export interface RequisitionOrder {
  id: string;
  establishmentId: string;
  requisitionNumber: string; // e.g. REQ-2026-001
  sourceWarehouseId: string; // المخزن المطلوب منه الصرف
  sourceWarehouseNameAr: string;
  targetWarehouseId: string; // مخزن القسم الطالب
  targetWarehouseNameAr: string;
  targetSectionType?: string; // e.g. kitchen, bar, bakery
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  createdByUserName: string; // توقيع كاتب الطلبية التلقائي
  createdByUserRole: string;
  status: RequisitionStatus;
  statusNameAr: string;
  dispatchedAt?: string;
  dispatchedByUserId?: string;
  dispatchedByUserName?: string; // توقيع من قام بالصرف
  receivedAt?: string;
  receivedByUserId?: string;
  receivedByUserName?: string; // توقيع من قام بالاستلام
  storekeeperNotes?: string;
  lines: RequisitionLine[];
}

// -------------------------------------------------------------
// SEED DATA
// -------------------------------------------------------------

const SEED_BRANCHES: Branch[] = [
  {
    id: 'branch-main',
    establishmentId: 'default',
    code: 'BR-01',
    nameAr: 'فرع وسط البلد (الرئيسي)',
    nameEn: 'Downtown Main Branch',
    address: '15 شارع طلعت حرب، وسط البلد، القاهرة',
    phone: '0223912345',
    gpsLocation: {
      lat: 30.0478,
      lng: 31.2389,
      mapUrl: 'https://www.google.com/maps?q=30.0478,31.2389',
      updatedAt: '2026-11-01T10:00:00.000Z',
    },
    isMain: true,
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'branch-tagamoa',
    establishmentId: 'default',
    code: 'BR-02',
    nameAr: 'فرع التجمع الخامس',
    nameEn: 'Fifth Settlement Branch',
    address: 'شارع التسعين الشمالي، التجمع الخامس، القاهرة الجديدة',
    phone: '01099887766',
    gpsLocation: {
      lat: 30.0245,
      lng: 31.4721,
      mapUrl: 'https://www.google.com/maps?q=30.0245,31.4721',
      updatedAt: '2026-11-01T10:00:00.000Z',
    },
    isMain: false,
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
];

const SEED_WAREHOUSES: WarehouseLocation[] = [
  {
    id: 'wh-main',
    establishmentId: 'default',
    branchId: 'branch-main',
    code: 'WH-01',
    nameAr: 'المخزن الرئيسي (مركزي)',
    nameEn: 'Main Central Warehouse',
    type: 'main',
    managerName: 'أحمد البدري (مدير المخازن)',
    keeperIds: ['usr-storekeeper-1'],
    order: 1,
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'wh-central-kitchen',
    establishmentId: 'default',
    branchId: 'branch-main',
    code: 'WH-02',
    nameAr: 'المطبخ المركزي (تجهيز الفروع)',
    nameEn: 'Central Commissary Kitchen',
    type: 'central_kitchen',
    sectionType: 'kitchen',
    managerName: 'الشيف نبيل (الشيف العمومي)',
    keeperIds: ['usr-storekeeper-1'],
    order: 2,
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'wh-kitchen',
    establishmentId: 'default',
    branchId: 'branch-main',
    code: 'WH-03',
    nameAr: 'مخزن المطبخ الساخن والمشويات',
    nameEn: 'Kitchen & Grill Storage',
    type: 'section',
    sectionType: 'kitchen',
    managerName: 'الشيف محمد سلامة',
    keeperIds: ['usr-storekeeper-1'],
    order: 3,
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'wh-bar',
    establishmentId: 'default',
    branchId: 'branch-main',
    code: 'WH-04',
    nameAr: 'مخزن البار والمشروبات',
    nameEn: 'Bar & Beverage Storage',
    type: 'section',
    sectionType: 'bar',
    managerName: 'مدير البار كريم',
    keeperIds: ['usr-storekeeper-1'],
    order: 4,
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'wh-bakery',
    establishmentId: 'default',
    branchId: 'branch-main',
    code: 'WH-05',
    nameAr: 'مخزن المخبز والحلواني',
    nameEn: 'Bakery & Pastry Storage',
    type: 'section',
    sectionType: 'bakery',
    managerName: 'شيف الحلواني ماهر',
    keeperIds: ['usr-storekeeper-1'],
    order: 5,
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'wh-packaging',
    establishmentId: 'default',
    branchId: 'branch-main',
    code: 'WH-06',
    nameAr: 'مخزن التعبئة والتغليف والمستهلكات',
    nameEn: 'Packaging & Consumables Warehouse',
    type: 'sub',
    sectionType: 'packaging',
    managerName: 'أمين المخزن خالد',
    keeperIds: ['usr-storekeeper-1'],
    order: 6,
    active: true,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  },
];

// -------------------------------------------------------------
// SERVICE CLASS
// -------------------------------------------------------------

export class WarehouseService {
  private storage = getStorageAdapter();

  // Storage Keys
  private getBranchesKey(estId: string): string {
    return `tygos_branches_${estId}`;
  }

  private getWarehousesKey(estId: string): string {
    return `tygos_warehouses_${estId}`;
  }

  private getMovementsKey(estId: string): string {
    return `tygos_stock_movements_${estId}`;
  }

  private getRequisitionsKey(estId: string): string {
    return `tygos_requisitions_${estId}`;
  }

  // -----------------------------------------------------------
  // RAW MATERIALS REPOSITORY WRAPPERS
  // -----------------------------------------------------------

  public getMaterials(establishmentId: string = 'default'): RawMaterialItem[] {
    return rawMaterialRepository.getAllSync(establishmentId, false);
  }

  public saveMaterials(establishmentId: string = 'default', materials: RawMaterialItem[]): void {
    rawMaterialRepository.saveAllSync(establishmentId, materials, true);
  }

  // -----------------------------------------------------------
  // BRANCHES MANAGEMENT
  // -----------------------------------------------------------

  public getBranches(establishmentId: string = 'default'): Branch[] {
    const raw = this.storage.getItemSync(this.getBranchesKey(establishmentId));
    if (!raw) {
      this.storage.setItemSync(this.getBranchesKey(establishmentId), JSON.stringify(SEED_BRANCHES));
      return SEED_BRANCHES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_BRANCHES;
    }
  }

  public saveBranches(establishmentId: string, branches: Branch[]): void {
    this.storage.setItemSync(this.getBranchesKey(establishmentId), JSON.stringify(branches));
  }

  public addBranch(
    establishmentId: string,
    data: { nameAr: string; nameEn?: string; address: string; phone?: string; isMain?: boolean }
  ): Branch {
    const list = this.getBranches(establishmentId);
    const code = `BR-0${list.length + 1}`;
    const newBranch: Branch = {
      id: `br-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId,
      code,
      nameAr: data.nameAr.trim(),
      nameEn: (data.nameEn || data.nameAr).trim(),
      address: data.address.trim(),
      phone: data.phone?.trim(),
      isMain: Boolean(data.isMain),
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newBranch);
    this.saveBranches(establishmentId, list);
    return newBranch;
  }

  public updateBranch(
    establishmentId: string,
    id: string,
    data: Partial<Omit<Branch, 'id' | 'establishmentId' | 'code' | 'createdAt'>>
  ): Branch {
    const list = this.getBranches(establishmentId);
    const index = list.findIndex((b) => b.id === id);
    if (index === -1) throw new Error('الفرع غير موجود');
    list[index] = {
      ...list[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveBranches(establishmentId, list);
    return list[index];
  }

  public updateBranchGps(
    establishmentId: string,
    id: string,
    lat: number,
    lng: number
  ): Branch {
    const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    return this.updateBranch(establishmentId, id, {
      gpsLocation: {
        lat,
        lng,
        mapUrl,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  public deleteBranch(establishmentId: string, id: string): boolean {
    let list = this.getBranches(establishmentId);
    if (list.length <= 1) return false; // Prevent deleting the only branch
    list = list.filter((b) => b.id !== id);
    this.saveBranches(establishmentId, list);
    return true;
  }

  // -----------------------------------------------------------
  // WAREHOUSES MANAGEMENT
  // -----------------------------------------------------------

  public getWarehouses(establishmentId: string = 'default'): WarehouseLocation[] {
    const raw = this.storage.getItemSync(this.getWarehousesKey(establishmentId));
    if (!raw) {
      this.storage.setItemSync(this.getWarehousesKey(establishmentId), JSON.stringify(SEED_WAREHOUSES));
      return SEED_WAREHOUSES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return SEED_WAREHOUSES;
    }
  }

  public saveWarehouses(establishmentId: string, warehouses: WarehouseLocation[]): void {
    this.storage.setItemSync(this.getWarehousesKey(establishmentId), JSON.stringify(warehouses));
  }

  /**
   * Filters warehouses visible to a user based on strict Role-Based Access Control:
   * - Storekeeper: ONLY assigned warehouses.
   * - Section Manager: ONLY their section warehouse.
   * - Head Chef: Kitchen & Grill, Central Kitchen.
   * - Warehouse Manager / General Manager / Owner / Cost Accountant: ALL warehouses.
   */
  public getWarehousesForUser(
    establishmentId: string,
    user?: Partial<User> | null
  ): WarehouseLocation[] {
    const all = this.getWarehouses(establishmentId).filter((w) => w.active);
    if (!user) return all;

    const role = user.role;

    // Management & Cost Control sees all
    if (
      role === 'tenant_admin' ||
      role === 'general_manager' ||
      role === 'financial_manager' ||
      role === 'cost_accountant' ||
      role === 'warehouse_manager' ||
      role === 'store_manager' ||
      role === 'super_admin'
    ) {
      return all;
    }

    // Storekeeper: sees only warehouses where they are keeper or explicitly assigned
    if (role === 'storekeeper') {
      const assigned = all.filter(
        (w) =>
          w.keeperIds.includes(user.id || '') ||
          user.assignedWarehouseIds?.includes(w.id)
      );
      return assigned.length > 0 ? assigned : all.slice(0, 1);
    }

    // Head Chef: sees Kitchens
    if (role === 'head_chef' || role === 'kitchen_manager') {
      return all.filter((w) => w.sectionType === 'kitchen' || w.type === 'central_kitchen');
    }

    // Section Manager: sees only their section warehouse
    if (role === 'section_manager' || role === 'bar_manager') {
      const section = user.assignedSection || (role === 'bar_manager' ? 'bar' : 'kitchen');
      return all.filter((w) => w.sectionType === section);
    }

    return all;
  }

  public addWarehouse(
    establishmentId: string,
    data: {
      nameAr: string;
      nameEn?: string;
      type: WarehouseType;
      sectionType?: string;
      branchId?: string;
      managerName?: string;
      keeperIds?: string[];
    }
  ): WarehouseLocation {
    const list = this.getWarehouses(establishmentId);
    const code = `WH-0${list.length + 1}`;
    const newWh: WarehouseLocation = {
      id: `wh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId,
      branchId: data.branchId || 'branch-main',
      code,
      nameAr: data.nameAr.trim(),
      nameEn: (data.nameEn || data.nameAr).trim(),
      type: data.type,
      sectionType: data.sectionType,
      managerName: data.managerName?.trim() || 'غير محدد',
      keeperIds: data.keeperIds || ['usr-storekeeper-1'],
      order: list.length + 1,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.push(newWh);
    this.saveWarehouses(establishmentId, list);
    return newWh;
  }

  public updateWarehouse(
    establishmentId: string,
    id: string,
    data: Partial<Omit<WarehouseLocation, 'id' | 'establishmentId' | 'code' | 'createdAt'>>
  ): WarehouseLocation {
    const list = this.getWarehouses(establishmentId);
    const index = list.findIndex((w) => w.id === id);
    if (index === -1) throw new Error('المخزن غير موجود');
    list[index] = {
      ...list[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.saveWarehouses(establishmentId, list);
    return list[index];
  }

  public deleteWarehouse(
    establishmentId: string,
    id: string,
    transferToId?: string
  ): boolean {
    let list = this.getWarehouses(establishmentId);
    if (list.length <= 1) return false;

    // If transferring stock from this warehouse to another
    if (transferToId) {
      const materials = this.getMaterials(establishmentId);
      materials.forEach((mat) => {
        if (mat.warehouseStockMap && mat.warehouseStockMap[id]) {
          const movingStock = mat.warehouseStockMap[id];
          mat.warehouseStockMap[transferToId] =
            (mat.warehouseStockMap[transferToId] || 0) + movingStock;
          delete mat.warehouseStockMap[id];
        }
      });
      this.saveMaterials(establishmentId, materials);
    }

    list = list.filter((w) => w.id !== id);
    this.saveWarehouses(establishmentId, list);
    return true;
  }

  public reorderWarehouses(establishmentId: string, orderedIds: string[]): void {
    const list = this.getWarehouses(establishmentId);
    const updated = list.map((w) => {
      const idx = orderedIds.indexOf(w.id);
      return idx >= 0 ? { ...w, order: idx + 1 } : w;
    });
    this.saveWarehouses(establishmentId, updated);
  }

  // -----------------------------------------------------------
  // SECTION-BASED STOCK DEDUCTIONS & ALLOCATIONS
  // -----------------------------------------------------------

  /**
   * Resolves which section warehouse to deduct sales from based on prep station.
   * e.g., 'bar' -> wh-bar, 'bakery' -> wh-bakery, 'grill'/'kitchen' -> wh-kitchen.
   */
  public resolveSectionWarehouseForStation(
    establishmentId: string,
    station?: string
  ): WarehouseLocation {
    const warehouses = this.getWarehouses(establishmentId);
    const normalized = (station || '').toLowerCase();

    if (normalized.includes('bar') || normalized.includes('بار') || normalized.includes('مشروب')) {
      const barWh = warehouses.find((w) => w.sectionType === 'bar');
      if (barWh) return barWh;
    }

    if (normalized.includes('baker') || normalized.includes('مخبز') || normalized.includes('حلوان') || normalized.includes('pastry')) {
      const bakeryWh = warehouses.find((w) => w.sectionType === 'bakery');
      if (bakeryWh) return bakeryWh;
    }

    // Default to Kitchen Section Warehouse (type === 'section')
    const kitchenWh = warehouses.find((w) => w.type === 'section' && w.sectionType === 'kitchen');
    if (kitchenWh) return kitchenWh;

    const anyKitchenWh = warehouses.find((w) => w.sectionType === 'kitchen');
    if (anyKitchenWh) return anyKitchenWh;

    // Fallback to first available warehouse
    return warehouses[0];
  }

  /**
   * Deducts sales stock from the SECTION warehouse (not main warehouse).
   */
  public deductSalesStock(
    establishmentId: string,
    materialId: string,
    prepStation: string,
    quantityBase: number,
    orderSerial: string,
    actorName: string
  ): { success: boolean; deductedFromWhId: string; newStock: number } {
    const targetWh = this.resolveSectionWarehouseForStation(establishmentId, prepStation);
    const materials = this.getMaterials(establishmentId);
    const mat = materials.find((m) => m.id === materialId);

    if (!mat) {
      return { success: false, deductedFromWhId: targetWh.id, newStock: 0 };
    }

    if (!mat.warehouseStockMap) {
      mat.warehouseStockMap = {
        'wh-main': Math.round(mat.currentStock * 0.7),
        [targetWh.id]: Math.round(mat.currentStock * 0.3),
      };
    }

    const currentSectionStock = mat.warehouseStockMap[targetWh.id] || 0;
    const newSectionStock = Math.round((currentSectionStock - quantityBase) * 1000) / 1000;
    mat.warehouseStockMap[targetWh.id] = newSectionStock;

    // Overall currentStock
    mat.currentStock = Math.round((mat.currentStock - quantityBase) * 1000) / 1000;
    this.saveMaterials(establishmentId, materials);

    // Record movement in Item Card
    this.recordMovement(establishmentId, {
      materialId: mat.id,
      materialNameAr: mat.nameAr,
      type: 'sales',
      typeNameAr: 'مبيعات كاشير',
      fromLocationId: targetWh.id,
      fromLocationNameAr: targetWh.nameAr,
      toLocationId: 'customer',
      toLocationNameAr: 'العميل',
      quantityBase: -quantityBase,
      balanceAfterBase: newSectionStock,
      referenceDoc: `فاتورة مبيعات #${orderSerial}`,
      actorName,
      notes: `خصم من محطة [${prepStation}] بمخزن [${targetWh.nameAr}]`,
    });

    return {
      success: true,
      deductedFromWhId: targetWh.id,
      newStock: newSectionStock,
    };
  }

  // -----------------------------------------------------------
  // ITEM CARD & MOVEMENTS LEDGER (كارت الصنف)
  // -----------------------------------------------------------

  public getMovements(establishmentId: string = 'default'): StockMovementRecord[] {
    const raw = this.storage.getItemSync(this.getMovementsKey(establishmentId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public recordMovement(
    establishmentId: string,
    params: Omit<StockMovementRecord, 'id' | 'establishmentId' | 'date'>
  ): StockMovementRecord {
    const list = this.getMovements(establishmentId);
    const record: StockMovementRecord = {
      id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId,
      date: new Date().toISOString(),
      ...params,
    };
    list.unshift(record);
    this.storage.setItemSync(this.getMovementsKey(establishmentId), JSON.stringify(list));
    return record;
  }

  /**
   * Retrieves full movement ledger for a raw material with filters and location breakdown.
   */
  public getItemCardData(
    establishmentId: string,
    materialId: string,
    filters?: {
      locationId?: string;
      movementType?: string;
      startDate?: string;
      endDate?: string;
    }
  ): {
    material: RawMaterialItem;
    locationStockBreakdown: Array<{
      warehouse: WarehouseLocation;
      baseStock: number;
      formattedMixed: string;
      inTransitBase: number;
    }>;
    movements: StockMovementRecord[];
    totalBaseStock: number;
    formattedTotalMixed: string;
  } {
    const materials = this.getMaterials(establishmentId);
    const mat = materials.find((m) => m.id === materialId);
    if (!mat) throw new Error('الخامة غير موجودة');

    const warehouses = this.getWarehouses(establishmentId);

    // Initialize warehouseStockMap if missing
    if (!mat.warehouseStockMap) {
      mat.warehouseStockMap = {
        'wh-main': Math.round(mat.currentStock * 0.7),
        'wh-kitchen': Math.round(mat.currentStock * 0.2),
        'wh-bar': Math.round(mat.currentStock * 0.1),
      };
      this.saveMaterials(establishmentId, materials);
    }

    const inTransitMap = mat.inTransitStockMap || {};

    const locationStockBreakdown = warehouses.map((wh) => {
      const baseStock = mat.warehouseStockMap?.[wh.id] || 0;
      const inTransitBase = inTransitMap[wh.id] || 0;
      return {
        warehouse: wh,
        baseStock,
        formattedMixed: multiUnitService.formatMixed(baseStock, mat),
        inTransitBase,
      };
    });

    let allMovements = this.getMovements(establishmentId).filter(
      (m) => m.materialId === materialId
    );

    if (filters?.locationId && filters.locationId !== 'all') {
      allMovements = allMovements.filter(
        (m) => m.fromLocationId === filters.locationId || m.toLocationId === filters.locationId
      );
    }

    if (filters?.movementType && filters.movementType !== 'all') {
      allMovements = allMovements.filter((m) => m.type === filters.movementType);
    }

    if (filters?.startDate) {
      allMovements = allMovements.filter((m) => m.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      allMovements = allMovements.filter((m) => m.date <= filters.endDate!);
    }

    return {
      material: mat,
      locationStockBreakdown,
      movements: allMovements,
      totalBaseStock: mat.currentStock,
      formattedTotalMixed: multiUnitService.formatMixed(mat.currentStock, mat),
    };
  }

  // -----------------------------------------------------------
  // REQUISITIONS WORKFLOW (دورة الطلبية بين الأقسام والمخازن)
  // -----------------------------------------------------------

  public getRequisitions(establishmentId: string = 'default'): RequisitionOrder[] {
    const raw = this.storage.getItemSync(this.getRequisitionsKey(establishmentId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveRequisitions(establishmentId: string, requisitions: RequisitionOrder[]): void {
    this.storage.setItemSync(this.getRequisitionsKey(establishmentId), JSON.stringify(requisitions));
  }

  /**
   * Creates a new internal requisition with automatic author signature and section stock snapshot.
   */
  public createRequisition(
    establishmentId: string,
    data: {
      sourceWarehouseId: string;
      targetWarehouseId: string;
      lines: Array<{
        materialId: string;
        requestedQuantity: number;
        requestedUnit: 'major' | 'sub' | 'base';
        notes?: string;
      }>;
    },
    currentUser?: Partial<User> | null
  ): RequisitionOrder {
    const list = this.getRequisitions(establishmentId);
    const warehouses = this.getWarehouses(establishmentId);
    const materials = this.getMaterials(establishmentId);

    const sourceWh = warehouses.find((w) => w.id === data.sourceWarehouseId) || warehouses[0];
    const targetWh = warehouses.find((w) => w.id === data.targetWarehouseId) || warehouses[1];

    const year = new Date().getFullYear();
    const seq = String(list.length + 1).padStart(3, '0');
    const requisitionNumber = `REQ-${year}-${seq}`;

    const processedLines: RequisitionLine[] = data.lines.map((l, idx) => {
      const mat = materials.find((m) => m.id === l.materialId);
      if (!mat) throw new Error(`الخامة ${l.materialId} غير موجودة`);

      const currentSectionStock = mat.warehouseStockMap?.[targetWh.id] || 0;
      const requestedQuantityBase = multiUnitService.convertToBase(
        l.requestedQuantity,
        l.requestedUnit,
        mat
      );

      const unitName =
        l.requestedUnit === 'major'
          ? mat.majorUnit || 'كرتونة'
          : l.requestedUnit === 'sub'
          ? mat.subUnit || 'علبة'
          : mat.baseUnit || mat.consumptionUnit || 'جم';

      return {
        id: `line-${Date.now()}-${idx}`,
        materialId: mat.id,
        materialNameAr: mat.nameAr,
        categoryAr: mat.category,
        currentStockAtSectionBase: currentSectionStock,
        requestedQuantity: l.requestedQuantity,
        requestedUnit: l.requestedUnit,
        requestedUnitName: unitName,
        requestedQuantityBase,
        approvedQuantityBase: requestedQuantityBase,
        dispatchedQuantityBase: 0,
        receivedQuantityBase: 0,
        rejectedQuantityBase: 0,
        lineStatus: 'pending',
        notes: l.notes,
      };
    });

    const newReq: RequisitionOrder = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId,
      requisitionNumber,
      sourceWarehouseId: sourceWh.id,
      sourceWarehouseNameAr: sourceWh.nameAr,
      targetWarehouseId: targetWh.id,
      targetWarehouseNameAr: targetWh.nameAr,
      targetSectionType: targetWh.sectionType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUserId: currentUser?.id || 'usr-chef',
      createdByUserName: currentUser?.fullName || 'الشيف نبيل (الشيف العمومي)',
      createdByUserRole: currentUser?.role || 'head_chef',
      status: 'submitted',
      statusNameAr: 'مُرسلة (في انتظار موافقة أمين المخزن)',
      lines: processedLines,
    };

    list.unshift(newReq);
    this.saveRequisitions(establishmentId, list);

    // Trigger in-app notification for Storekeeper & Warehouse Manager
    this.addNotification(establishmentId, {
      title: 'طلبية داخلية جديدة واردة',
      message: `طلب بضاعة #${requisitionNumber} من قسم [${targetWh.nameAr}] إلى [${sourceWh.nameAr}]`,
      type: 'requisition_created',
      targetRoles: ['storekeeper', 'warehouse_manager', 'tenant_admin', 'super_admin'],
      referenceId: newReq.id,
      linkView: 'warehouses',
    });

    return newReq;
  }

  /**
   * Storekeeper Approves Requisition lines (can modify approved quantities or units).
   */
  public approveRequisition(
    establishmentId: string,
    reqId: string,
    approvedLines: Array<{ lineId: string; approvedQuantityBase: number; notes?: string }>,
    storekeeperNotes?: string,
    actorName: string = 'أمين المخزن'
  ): RequisitionOrder {
    const list = this.getRequisitions(establishmentId);
    const index = list.findIndex((r) => r.id === reqId);
    if (index === -1) throw new Error('الطلبية غير موجودة');

    const req = list[index];
    req.lines = req.lines.map((l) => {
      const match = approvedLines.find((a) => a.lineId === l.id);
      if (match) {
        return {
          ...l,
          approvedQuantityBase: match.approvedQuantityBase,
          notes: match.notes || l.notes,
        };
      }
      return l;
    });

    req.status = 'approved';
    req.statusNameAr = 'موافق عليها (جاهزة للصرف)';
    req.storekeeperNotes = storekeeperNotes;
    req.updatedAt = new Date().toISOString();

    list[index] = req;
    this.saveRequisitions(establishmentId, list);
    return req;
  }

  /**
   * Storekeeper Dispatches Requisition:
   * - Deducts approved quantities from source warehouse.
   * - Marks quantities as "in_transit" (في الطريق) - NOT yet in section stock!
   * - Status changes to 'dispatched'.
   */
  public dispatchRequisition(
    establishmentId: string,
    reqId: string,
    actorName: string = 'أمين المخزن',
    actorUserId: string = 'usr-storekeeper'
  ): RequisitionOrder {
    const list = this.getRequisitions(establishmentId);
    const index = list.findIndex((r) => r.id === reqId);
    if (index === -1) throw new Error('الطلبية غير موجودة');

    const req = list[index];
    const materials = this.getMaterials(establishmentId);

    req.lines.forEach((line) => {
      const mat = materials.find((m) => m.id === line.materialId);
      const qtyToDispatch = line.approvedQuantityBase || line.requestedQuantityBase;
      line.dispatchedQuantityBase = qtyToDispatch;
      line.lineStatus = 'dispatched';

      if (mat) {
        if (!mat.warehouseStockMap) {
          mat.warehouseStockMap = { [req.sourceWarehouseId]: mat.currentStock };
        }
        // Deduct from source warehouse
        mat.warehouseStockMap[req.sourceWarehouseId] = Math.max(
          0,
          (mat.warehouseStockMap[req.sourceWarehouseId] || 0) - qtyToDispatch
        );

        // Put into In-Transit map
        if (!mat.inTransitStockMap) mat.inTransitStockMap = {};
        mat.inTransitStockMap[req.targetWarehouseId] =
          (mat.inTransitStockMap[req.targetWarehouseId] || 0) + qtyToDispatch;

        // Record movement in Item Card
        this.recordMovement(establishmentId, {
          materialId: mat.id,
          materialNameAr: mat.nameAr,
          type: 'section_issue',
          typeNameAr: 'صرف لقسم (في الطريق)',
          fromLocationId: req.sourceWarehouseId,
          fromLocationNameAr: req.sourceWarehouseNameAr,
          toLocationId: 'in_transit',
          toLocationNameAr: `في الطريق إلى [${req.targetWarehouseNameAr}]`,
          quantityBase: -qtyToDispatch,
          balanceAfterBase: mat.warehouseStockMap[req.sourceWarehouseId] || 0,
          referenceDoc: `طلبية #${req.requisitionNumber}`,
          actorName,
          notes: `خرجت من المخزن وفي الطريق للقسم`,
        });
      }
    });

    this.saveMaterials(establishmentId, materials);

    req.status = 'dispatched';
    req.statusNameAr = 'تم الصرف (في الطريق للقسم)';
    req.dispatchedAt = new Date().toISOString();
    req.dispatchedByUserId = actorUserId;
    req.dispatchedByUserName = actorName;
    req.updatedAt = new Date().toISOString();

    list[index] = req;
    this.saveRequisitions(establishmentId, list);

    // Trigger notification for Head Chef & Section Manager
    this.addNotification(establishmentId, {
      title: 'تم صرف الطلبية (في الطريق للقسم)',
      message: `تم صرف الطلبية #${req.requisitionNumber} من المخزن [${req.sourceWarehouseNameAr}] وفي طريقها للقسم`,
      type: 'requisition_dispatched',
      targetRoles: ['head_chef', 'section_manager', 'tenant_admin', 'super_admin'],
      referenceId: req.id,
      linkView: 'warehouses',
    });

    return req;
  }

  /**
   * Section Chef Confirms Receipt:
   * - Marks received items -> enters target warehouse stock.
   * - Documents rejected items with rejection reason -> triggers return to storekeeper.
   */
  public receiveRequisition(
    establishmentId: string,
    reqId: string,
    receiptLines: Array<{
      lineId: string;
      receivedQuantityBase: number;
      rejectedQuantityBase?: number;
      rejectionReason?: string;
    }>,
    actorName: string = 'الشيف',
    actorUserId: string = 'usr-chef'
  ): RequisitionOrder {
    const list = this.getRequisitions(establishmentId);
    const index = list.findIndex((r) => r.id === reqId);
    if (index === -1) throw new Error('الطلبية غير موجودة');

    const req = list[index];
    const materials = this.getMaterials(establishmentId);
    let hasAnyRejections = false;

    req.lines.forEach((line) => {
      const match = receiptLines.find((r) => r.lineId === line.id);
      const mat = materials.find((m) => m.id === line.materialId);
      const dispatchedQty = line.dispatchedQuantityBase || line.requestedQuantityBase;

      const receivedQty = match ? match.receivedQuantityBase : dispatchedQty;
      const rejectedQty = match ? match.rejectedQuantityBase || 0 : 0;
      const rejectionReason = match?.rejectionReason;

      line.receivedQuantityBase = receivedQty;
      line.rejectedQuantityBase = rejectedQty;
      line.rejectionReason = rejectionReason;

      if (rejectedQty > 0) {
        hasAnyRejections = true;
        line.lineStatus = 'rejected';
      } else {
        line.lineStatus = 'received';
      }

      if (mat) {
        // Clear from in-transit
        if (mat.inTransitStockMap && mat.inTransitStockMap[req.targetWarehouseId]) {
          mat.inTransitStockMap[req.targetWarehouseId] = Math.max(
            0,
            mat.inTransitStockMap[req.targetWarehouseId] - dispatchedQty
          );
        }

        // Add received quantity to target section warehouse
        if (!mat.warehouseStockMap) mat.warehouseStockMap = {};
        mat.warehouseStockMap[req.targetWarehouseId] =
          (mat.warehouseStockMap[req.targetWarehouseId] || 0) + receivedQty;

        // If rejected items exist, immediately restore to source warehouse
        if (rejectedQty > 0) {
          mat.warehouseStockMap[req.sourceWarehouseId] =
            (mat.warehouseStockMap[req.sourceWarehouseId] || 0) + rejectedQty;

          // Record rejection return movement
          this.recordMovement(establishmentId, {
            materialId: mat.id,
            materialNameAr: mat.nameAr,
            type: 'transfer',
            typeNameAr: 'إرجاع مرفوض للمخزن',
            fromLocationId: 'in_transit',
            fromLocationNameAr: 'مرتجع استلام',
            toLocationId: req.sourceWarehouseId,
            toLocationNameAr: req.sourceWarehouseNameAr,
            quantityBase: rejectedQty,
            balanceAfterBase: mat.warehouseStockMap[req.sourceWarehouseId],
            referenceDoc: `طلبية #${req.requisitionNumber} (مرتجع)`,
            actorName,
            notes: `سبب عدم الاستلام: ${rejectionReason || 'غير محدد'} (لم تخرج من المخزن)`,
          });
        }

        // Record receipt movement
        if (receivedQty > 0) {
          this.recordMovement(establishmentId, {
            materialId: mat.id,
            materialNameAr: mat.nameAr,
            type: 'transfer',
            typeNameAr: 'استلام بالقسم',
            fromLocationId: req.sourceWarehouseId,
            fromLocationNameAr: req.sourceWarehouseNameAr,
            toLocationId: req.targetWarehouseId,
            toLocationNameAr: req.targetWarehouseNameAr,
            quantityBase: receivedQty,
            balanceAfterBase: mat.warehouseStockMap[req.targetWarehouseId],
            referenceDoc: `طلبية #${req.requisitionNumber}`,
            actorName,
            notes: `تم الاستلام في قسم [${req.targetWarehouseNameAr}]`,
          });
        }
      }
    });

    this.saveMaterials(establishmentId, materials);

    req.status = hasAnyRejections ? 'partially_received' : 'received';
    req.statusNameAr = hasAnyRejections
      ? 'استلام جزئي (مع بنود لم تُستلم وأعيدت للمخزن)'
      : 'تم الاستلام بالكامل ✓';
    req.receivedAt = new Date().toISOString();
    req.receivedByUserId = actorUserId;
    req.receivedByUserName = actorName;
    req.updatedAt = new Date().toISOString();

    list[index] = req;
    this.saveRequisitions(establishmentId, list);

    // Trigger notification for Storekeeper & Warehouse Manager
    this.addNotification(establishmentId, {
      title: hasAnyRejections ? 'استلام جزئي لطلبية مع مرتجعات' : 'تم استلام الطلبية بالكامل',
      message: `تم توثيق استلام الطلبية #${req.requisitionNumber} بقسم [${req.targetWarehouseNameAr}]`,
      type: 'requisition_received',
      targetRoles: ['storekeeper', 'warehouse_manager', 'tenant_admin'],
      referenceId: req.id,
      linkView: 'warehouses',
    });

    return req;
  }

  // -----------------------------------------------------------
  // PURCHASE RECEIPT (إذن استلام المشتريات وتحديث متوسط التكلفة)
  // -----------------------------------------------------------

  /**
   * Receives incoming purchase order items into Main Warehouse,
   * updates the material's weighted average cost (WAC), and registers
   * an immediate 'purchase_receipt' movement on the Item Card.
   */
  public receivePurchaseOrder(
    establishmentId: string,
    params: {
      materialId: string;
      quantityBase: number;
      unitPriceBase: number; // Cost per base unit in EGP
      invoiceNumber: string;
      supplierName: string;
      targetWarehouseId?: string;
      actorName: string;
      notes?: string;
    }
  ): { success: boolean; newStock: number; newAvgCost: number } {
    const materials = this.getMaterials(establishmentId);
    const mat = materials.find((m) => m.id === params.materialId);
    if (!mat) throw new Error('الخامة غير موجودة');

    const warehouses = this.getWarehouses(establishmentId);
    const targetWhId = params.targetWarehouseId || 'wh-main';
    const targetWh = warehouses.find((w) => w.id === targetWhId) || warehouses[0];

    const prevStock = Math.max(0, mat.currentStock || 0);
    const prevCost = mat.costPerUnit || (mat.purchasePrice / (mat.conversionFactor || 1));
    const incomingQty = Math.max(0, params.quantityBase);
    const incomingCost = Math.max(0, params.unitPriceBase);

    // Weighted Average Cost Calculation (WAC)
    const totalQty = prevStock + incomingQty;
    const totalValue = (prevStock * prevCost) + (incomingQty * incomingCost);
    const newAvgCost = totalQty > 0 ? totalValue / totalQty : incomingCost;

    // Update material properties
    mat.costPerUnit = Math.round(newAvgCost * 1000) / 1000;
    mat.purchasePrice = Math.round(newAvgCost * (mat.conversionFactor || 1) * 100) / 100;
    mat.currentStock = Math.round(totalQty * 1000) / 1000;

    if (!mat.warehouseStockMap) mat.warehouseStockMap = {};
    const prevWhStock = mat.warehouseStockMap[targetWh.id] || 0;
    const newWhStock = Math.round((prevWhStock + incomingQty) * 1000) / 1000;
    mat.warehouseStockMap[targetWh.id] = newWhStock;
    mat.updatedAt = new Date().toISOString();

    this.saveMaterials(establishmentId, materials);

    // Record movement in Item Card
    this.recordMovement(establishmentId, {
      materialId: mat.id,
      materialNameAr: mat.nameAr,
      type: 'purchase_receipt',
      typeNameAr: 'استلام شراء',
      fromLocationId: 'supplier',
      fromLocationNameAr: params.supplierName || 'المورد',
      toLocationId: targetWh.id,
      toLocationNameAr: targetWh.nameAr,
      quantityBase: incomingQty,
      balanceAfterBase: newWhStock,
      referenceDoc: params.invoiceNumber || 'فاتورة شراء مباشرة',
      actorName: params.actorName,
      notes: params.notes || `استلام مشتريات وتحديث متوسط التكلفة إلى ${mat.costPerUnit} ج.م`,
    });

    return {
      success: true,
      newStock: mat.currentStock,
      newAvgCost: mat.costPerUnit,
    };
  }

  // -----------------------------------------------------------
  // IN-APP NOTIFICATIONS (إشعارات الطلبيات والمخازن)
  // -----------------------------------------------------------

  private getNotificationsKey(estId: string): string {
    return `tygos_${estId}_notifications`;
  }

  public getNotifications(establishmentId: string = 'default'): InAppNotification[] {
    const raw = this.storage.getItemSync(this.getNotificationsKey(establishmentId));
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public saveNotifications(establishmentId: string, list: InAppNotification[]): void {
    this.storage.setItemSync(this.getNotificationsKey(establishmentId), JSON.stringify(list));
  }

  public addNotification(
    establishmentId: string,
    params: Omit<InAppNotification, 'id' | 'establishmentId' | 'createdAt' | 'isRead'>
  ): InAppNotification {
    const list = this.getNotifications(establishmentId);
    const newNotification: InAppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId,
      createdAt: new Date().toISOString(),
      isRead: false,
      ...params,
    };
    list.unshift(newNotification);
    this.saveNotifications(establishmentId, list.slice(0, 50)); // Keep last 50
    return newNotification;
  }

  public markNotificationAsRead(establishmentId: string, id: string): void {
    const list = this.getNotifications(establishmentId);
    const item = list.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      this.saveNotifications(establishmentId, list);
    }
  }
}

export interface InAppNotification {
  id: string;
  establishmentId: string;
  title: string;
  message: string;
  type: 'requisition_created' | 'requisition_dispatched' | 'requisition_received' | 'low_stock' | 'system';
  targetRoles: string[];
  referenceId?: string;
  linkView?: string;
  createdAt: string;
  isRead: boolean;
}

export const warehouseService = new WarehouseService();
