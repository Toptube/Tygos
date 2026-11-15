# نموذج البيانات وتخطيط قاعدة البيانات — منظومة TYGOS (`DATA_MODEL.md`)

> **مرجع الكود المصدري:** مستمد مباشرةً من تعريفات TypeScript الفعلية في `src/types/index.ts`, `src/services/dataService.ts`, `src/services/warehouseService.ts`, `src/services/semiFinishedService.ts`, `src/services/overheadService.ts`, `src/services/inventoryAuditService.ts`, `src/services/dailyNotesService.ts`, `src/services/customerService.ts`, `src/services/migrationService.ts`, `src/domain/qrMenuTypes.ts`, `src/sync/syncTypes.ts`, و`src/repositories/repositories.ts`.

---

## 1. ثوابت العزل والإصدار (`Multi-Tenancy & Schema Versioning`)

- **إصدار المخطط الحالي (`CURRENT_SCHEMA_VERSION`):** `6` (مُعرّف في `src/services/migrationService.ts`).
- **مفتاح إصدار المنشأة:** `tygos_${estId}_schema_version`.
- **حجر البيانات التالفة:** `tygos_${estId}_quarantine` (`QuarantineRecord[]` حتى 100 سجل).
- **مفتاح الختم الموحد للمزامنة (`SyncEntityMetadata`):**
  ```ts
  export interface SyncEntityMetadata {
    id: string;        // Client-generated UUID v4 (generateUuid)
    tenantId: string;  // معرّف المنشأة establishmentId
    deviceId: string;  // معرّف الجهاز dev-xxxxxxxx (tygos_device_id)
    version: number;   // يبدأ 1 عند الإنشاء ويزيد +1 عند كل تحديث
    createdAt: string; // ISO-8601
    updatedAt: string; // ISO-8601
    deletedAt?: string | null; // Soft Delete للمزامنة دون فقد السجل
  }
  ```

### خريطة مفاتيح التخزين المحلي الفعلية للمنشأة (`Storage Keys Map`)

| النطاق | مفتاح التخزين الفعلي | الخدمة / المستودع المسؤول |
| :--- | :--- | :--- |
| المنشآت والمستخدمون | `tygos_establishments`, `tygos_registered_establishments`, `tygos_auth_session` | `SettingsRepository` |
| طاقم العمل والصلاحيات | `tygos_${tenantId}_staff_users` | `UserRepository` (`TenantRepository<'staff_users'>`) |
| الفروع والمخازن | `tygos_branches_${estId}`, `tygos_warehouses_${estId}` | `warehouseService` |
| حركات المخزون والطلبيات | `tygos_stock_movements_${estId}`, `tygos_requisitions_${estId}` | `warehouseService` |
| إشعارات التطبيق | `tygos_${estId}_notifications` | `warehouseService` |
| الخامات الأولية | `tygos_${estId}_raw_materials` / `tygos_${tenantId}_ingredients` | `dataService` / `RawMaterialRepository` |
| شجرة الأقسام | `tygos_${estId}_categories_product`, `tygos_${estId}_categories_material` | `categoryService` |
| التجهيزات والدفعات | `tygos_${estId}_semi_finished_items` | `semiFinishedService` |
| المنتجات والوصفات | `tygos_${tenantId}_products` | `ProductRepository` / `dataService` |
| تعديلات المنيو العام | `tygos_${tenantId}_menu_overrides`, `tygos_${tenantId}_public_menu_cache` | `MenuOverridesRepository`, `LocalPublicMenuProvider` |
| الجرد الفعلي والرفوف | `tygos_${estId}_audit_periods`, `tygos_${estId}_wh_${whId}_rack_order` | `inventoryAuditService` |
| الملاحظات اليومية | `tygos_${estId}_daily_notes` | `dailyNotesService` |
| التكاليف والمصاريف | `tygos_${estId}_cost_centers`, `tygos_${estId}_overhead_expenses`, `tygos_${estId}_overhead_settings`, `tygos_${estId}_overhead_locks` | `overheadService` |
| الطلبات والطاولات | `tygos_${tenantId}_orders`, `tygos_${estId}_order_seq`, `tygos_${tenantId}_tables`, `tygos_${tenantId}_table_zones` | `OrderRepository`, `tableService`, `syncTypes` |
| الورديات والخزينة | `tygos_${tenantId}_active_shift`, `tygos_${tenantId}_last_closed_shift`, `tygos_${tenantId}_shifts_v2`, `tygos_${tenantId}_treasury_movements` | `SettingsRepository`, `shiftTreasuryService` |
| العملاء والولاء والكوبونات | `tygos_${tenantId}_customers`, `tygos_${tenantId}_coupons`, `tygos_${tenantId}_loyalty_config` | `CustomerRepository`, `customerService` |
| الإعدادات والأجهزة والمزامنة | `tygos_${tenantId}_venue_settings`, `tygos_${tenantId}_outbox`, `tygos_${tenantId}_audit_logs`, `tygos_${estId}_error_logs`, `tygos_${tenantId}_prelaunch_checklist` | `SettingsRepository`, `OutboxService`, `AuditRepository`, `errorLogService`, `UiPreferencesRepository` |

---

## 2. كيانات TypeScript الفعلية وحقولها

### 2.1 المنشأة والمستخدمون (`src/types/index.ts`)
- **`Establishment`**: `id`, `code` (مثل `R.0001`), `prefix`, `number`, `name`, `ownerName`, `businessType`, `nationalId`, `crNumber?`, `taxNumber?`, `address`, `city`, `state`, `country`, `phone`, `secondaryPhone?`, `email`, `language`, `currency` (`EGP`), `timezone`, `branchesCount`, `usersCount`, `status` (`active | trial | suspended | pending`), `createdAt`, `lastActivity`.
- **`User`**: `id`, `username`, `fullName`, `email`, `phone`, `role` (`UserRole` — 19 دوراً)، `establishmentId`, `establishmentCode`, `establishmentName`, `branchName?`, `permittedViews?: string[]`, `customPermissions?: string[]`, `assignedWarehouseIds?: string[]`, `assignedSection?: string`, `passwordHash?`, `passwordSalt?`, `mustChangePasswordOnLogin?`, `status?: 'active' | 'suspended'`, `createdAt?`, `updatedAt?`.

### 2.2 شجرة الأقسام والخامات والتعبئة المتعددة (`categoryService.ts`, `dataService.ts`)
- **`CategoryNode`**: `id`, `establishmentId`, `parentId?: string | null` (يدعم 3 مستويات: رئيسي ← فرعي ← تصنيف)، `nameAr`, `nameEn`, `type` (`'product' | 'material'`), `order`, `active`.
- **`RawMaterialItem`**:
  - المعرف والوصف: `id`, `establishmentId`, `nameAr`, `nameEn`, `category`, `categoryNodeId?`.
  - التكلفة والهدر: `purchaseUnit`, `purchasePrice`, `purchasedQuantity`, `consumptionUnit`, `conversionFactor`, `wastePercentage`, `effectiveUnitCost`, `costPerUnit?` (WAC).
  - سلسلة الوحدات (حزمة 2): `majorUnit?`, `majorUnitCapacity?`, `subUnit?`, `subUnitCapacity?`, `baseUnit?`.
  - توزيع المخازن وتتبع المخزون: `currentStock`, `warehouseStockMap?: Record<string, number>`, `inTransitStockMap?: Record<string, number>`, `assignedWarehouseId?`, `reorderPoint`, `lowStockThreshold?` (حزمة 6: حد التنبيه الأصفر القابل للتعديل)، `isStockTracked?: boolean` (حزمة 6: `false` للماء والملح — تكلفة دون خصم مخزني).

### 2.3 الفروع والمخازن والطلبيات والحركات (`warehouseService.ts`)
- **`Branch`**: `id`, `establishmentId`, `code`, `nameAr`, `nameEn`, `address`, `phone?`, `gpsLocation?: { lat, lng, mapUrl, updatedAt }`, `isMain?`, `active`.
- **`WarehouseLocation`**: `id`, `establishmentId`, `branchId`, `code`, `nameAr`, `nameEn`, `type` (`main | sub | central_kitchen | section`), `sectionType?` (`kitchen | bar | bakery | pastry | grill | packaging`), `managerId?`, `managerName?`, `keeperIds: string[]`, `order`, `active`.
- **`StockMovementRecord`**: `id`, `establishmentId`, `materialId`, `materialNameAr`, `date`, `type` (`purchase_receipt | section_issue | sales | waste | transfer | inventory_audit | reconciliation | prep_batch_consume | prep_revert_to_raw`), `typeNameAr`, `fromLocationId`, `fromLocationNameAr`, `toLocationId`, `toLocationNameAr`, `quantityBase`, `balanceAfterBase`, `referenceDoc`, `actorName`, `notes?`.
- **`RequisitionOrder`**: `id`, `establishmentId`, `requisitionNumber` (`REQ-YYYY-NNN`), `sourceWarehouseId`, `targetWarehouseId`, `targetSectionType?`, `createdByUserId`, `createdByUserName`, `createdByUserRole`, `status` (`draft | submitted | approved | dispatched | received | partially_received | rejected | cancelled`), `dispatchedAt?`, `dispatchedByUserName?`, `receivedAt?`, `receivedByUserName?`, `lines: RequisitionLine[]`.
  - **`RequisitionLine`**: `id`, `materialId`, `currentStockAtSectionBase`, `requestedQuantity`, `requestedUnit` (`major | sub | base`), `requestedQuantityBase`, `approvedQuantityBase?`, `dispatchedQuantityBase?`, `receivedQuantityBase?`, `rejectedQuantityBase?`, `lineStatus` (`pending | dispatched | received | rejected`), `rejectionReason?`.

### 2.4 التجهيزات والتحضيرات الأساسية والمنتجات (`semiFinishedService.ts`, `dataService.ts`)
- **`SemiFinishedItem`**: `id`, `establishmentId`, `code`, `nameAr`, `nameEn`, `category`, `categoryNodeId?`, `producingDepartment`, `type` (`compound | processing | portion`), `enableBatchTracking` (افتراضي `false` «على الصيغة»)، `currentBatchStock`, `batchStockMap?: Record<string, number>`, `wacUnitCost`, `ingredients: PreparationIngredient[]`, `totalYield`, `yieldUnit`, `prepTimeMinutes?`, `processingRawQty?`, `processingCookedQty?`, `processingMaterialId?`, `portions: PreparationPortion[]`, `batches: PreparationBatchRecord[]`, `auditHistory`.
- **`MenuItemProduct`**: `id`, `establishmentId`, `code`, `nameAr`, `nameEn`, `category`, `sellingPrice`, `targetMarginPercentage`, `suggestedPrice`, `trueCost`, `foodCostPercentage`, `grossMarginPercentage`, `isActive`, `recipeIngredients: ProductRecipeItem[]` (كل سطر يدعم `type?: 'raw_material' | 'semi_finished'` و`portionId?` و`portionNameAr?`), `directLaborMinutes`, `prepTimeMinutes?`, `laborHourlyRate`, `wasteLossBuffer`, `utilitiesCost`, `consumablesCost`, `prepStation?`, `isAvailable?`, `batchStockCount?`, `enableBatchStock?`, `lowStockThresholdPortions?` (افتراضي 5 في ترحيل v4), `packagingItems?`, `variants?`, `auditHistory?`.

### 2.5 الجرد الفعلي والملاحظات اليومية والتكاليف غير المباشرة
- **`AuditPeriod` (`inventoryAuditService.ts`)**: `id`, `establishmentId`, `branchId`, `warehouseId`, `startDate`, `endDate`, `type` (`draft | closed`), `closedAt?`, `closedBy?`, `isOfficialClose?`, `items: AuditItemRecord[]` (`openingStockBase`, `totalInBase`, `totalOutBase`, `inTransitBase`, `estimatedStockBase`, `physicalStockBase`, `extraSemiFinishedBase?`, `totalActualStockBase`, `varianceBase`, `varianceCostEgp`, `variancePercent`, `status: 'surplus' | 'deficit' | 'balanced'`, `dailyRecords: AuditDailyRecord[]`), `overheadVarianceSummary?`.
- **`DailyNote` (`dailyNotesService.ts`)**: `id`, `establishmentId`, `branchId`, `warehouseId?`, `materialId`, `materialNameAr`, `date`, `text`, `authorName`, `authorRole`, `status` (`unresolved | resolved`), `resolutionText?`, `resolvedAt?`, `resolvedBy?`, `targetSection?`.
- **`CostCenter` / `OverheadExpense` / `OverheadSettings` / `MonthLockRecord` (`overheadService.ts`)**:
  - `CostCenter`: `id`, `establishmentId`, `code`, `nameAr`, `departmentKey`, `isShared`, `areaSqm`, `headcount`, `manualSharePercent`, `active`.
  - `OverheadExpense`: `id`, `establishmentId`, `month` (`YYYY-MM`), `nameAr`, `category`, `costType` (`direct | indirect`), `monthlyAmount`, `costCenterId`, `stage1Rule` (`area | headcount | manual_percent | equal`), `stage2Rule` (`equal_per_sold_unit | sales_qty | sales_revenue | raw_material_cost | prep_time_minutes | manual_percent`), `manualProductPercents?`, `sourceModule?: 'manual' | 'hr' | 'finance'`, `externalRefId?`.
  - `OverheadSettings`: `mode` (`raw_only | raw_plus_fixed_pct | rules_based`), `fixedOverheadPercent`, `defaultExpectedMonthlyUnitsPerProduct`.
  - `MonthLockRecord`: `month`, `lockedAt`, `lockedBy`, `auditPeriodId?`.

### 2.6 الطلبات والمنيو العام والورديات والعملاء
- **`CustomerOrder` (`qrMenuTypes.ts`)**: `id`, `serialNumber`, `establishmentId`, `serviceType` (`dine_in | takeaway | delivery`), `tableNumber?`, `customerId?`, `customerName`, `customerPhone?`, `deliveryAddress?`, `items: CustomerOrderItem[]`, `subtotal`, `taxAmount`, `serviceFee`, `deliveryFee`, `discountAmount?`, `couponCode?`, `loyaltyPointsRedeemed?`, `loyaltyPointsEarned?`, `totalAmount`, `status` (`draft | pending_approval | approved | sent | preparing | ready | served | out_for_delivery | paid | closed | completed | rejected | cancelled | refunded`), `stationStatuses`, `source` (`qr_menu | pos`), `shiftId?`, `paymentMethod?`, `journalEntryId?`.
- **`ShiftRecord` / `TreasuryMovement` (`shiftTreasuryService.ts`)**: تتبع الوردية (`zReportNumber`, `openingFloat`, `cashSales`, `cardSales`, `walletSales`, `creditSales`, `expectedDrawerCash`, `actualCountedCash?`, `discrepancy?`, `status: 'open' | 'closed'`, `movements: DrawerMovement[]`) وحركات الخزينة العامة (`TreasuryMovement`).
- **`CustomerProfile` / `Coupon` (`customerService.ts`)**: `id`, `name`, `phone` (المطبّع عبر `normalizePhone`)، `addresses: CustomerAddress[]`, `tags`, `isBlacklisted`, `loyaltyPoints`, `visitsCount`, `totalSpent`, `isAnonymized?`.

---

## 3. مخطط PostgreSQL المقترح للربط الخادمي (`PostgreSQL DDL`)

جميع الجداول تحتوي على `tenant_id UUID NOT NULL REFERENCES establishments(id)` مع دعم `version INT`, `device_id TEXT`, `deleted_at TIMESTAMPTZ` للمزامنة:

```sql
-- 1. المنشآت والفروع والمخازن
CREATE TABLE establishments (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'active',
  schema_version INT NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  address TEXT,
  gps_lat NUMERIC(10,6),
  gps_lng NUMERIC(10,6),
  is_main BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  UNIQUE (tenant_id, code)
);

CREATE TABLE warehouses (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('main','sub','central_kitchen','section')),
  section_type TEXT,
  keeper_ids UUID[] DEFAULT '{}',
  active BOOLEAN DEFAULT true
);
CREATE INDEX idx_warehouses_tenant_branch ON warehouses(tenant_id, branch_id);

-- 2. المستخدمون والأدوار
CREATE TABLE staff_users (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  username TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  permitted_views TEXT[] DEFAULT '{}',
  assigned_warehouse_ids UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, username)
);

-- 3. الخامات والأرصدة المخزنية وحركات كارت الصنف
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  category_node_id UUID,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  purchase_unit TEXT NOT NULL,
  purchase_price NUMERIC(14,4) NOT NULL DEFAULT 0,
  consumption_unit TEXT NOT NULL,
  conversion_factor NUMERIC(14,4) NOT NULL DEFAULT 1,
  waste_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  effective_unit_cost NUMERIC(14,6) NOT NULL DEFAULT 0,
  major_unit TEXT,
  major_unit_capacity NUMERIC(14,4),
  sub_unit TEXT,
  sub_unit_capacity NUMERIC(14,4),
  base_unit TEXT,
  reorder_point NUMERIC(14,4) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(14,4),
  is_stock_tracked BOOLEAN NOT NULL DEFAULT true,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_raw_materials_tenant ON raw_materials(tenant_id) WHERE deleted_at IS NULL;

CREATE TABLE warehouse_stock_balances (
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  material_id UUID NOT NULL REFERENCES raw_materials(id),
  on_hand_base NUMERIC(16,4) NOT NULL DEFAULT 0,
  in_transit_base NUMERIC(16,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, warehouse_id, material_id)
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  material_id UUID NOT NULL REFERENCES raw_materials(id),
  movement_type TEXT NOT NULL,
  from_location_id TEXT NOT NULL,
  to_location_id TEXT NOT NULL,
  quantity_base NUMERIC(16,4) NOT NULL,
  balance_after_base NUMERIC(16,4) NOT NULL,
  reference_doc TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_movements_ledger ON stock_movements(tenant_id, material_id, created_at DESC);

-- 4. التجهيزات والمنتجات والوصفات
CREATE TABLE semi_finished_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  producing_department TEXT NOT NULL,
  prep_type TEXT NOT NULL CHECK (prep_type IN ('compound','processing','portion')),
  enable_batch_tracking BOOLEAN NOT NULL DEFAULT false,
  wac_unit_cost NUMERIC(14,6) NOT NULL DEFAULT 0,
  total_yield NUMERIC(14,4) NOT NULL,
  yield_unit TEXT NOT NULL,
  prep_time_minutes NUMERIC(8,2),
  ingredients_json JSONB NOT NULL DEFAULT '[]',
  portions_json JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL,
  selling_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  true_cost NUMERIC(14,4) NOT NULL DEFAULT 0,
  prep_station TEXT DEFAULT 'kitchen',
  prep_time_minutes NUMERIC(8,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_available BOOLEAN NOT NULL DEFAULT true,
  enable_batch_stock BOOLEAN DEFAULT false,
  batch_stock_count INT DEFAULT 0,
  low_stock_threshold_portions INT DEFAULT 5,
  recipe_ingredients_json JSONB NOT NULL DEFAULT '[]',
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, code)
);

-- 5. الطلبيات والجرد والملاحظات
CREATE TABLE requisitions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  requisition_number TEXT NOT NULL,
  source_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  target_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  status TEXT NOT NULL,
  created_by_user_id UUID NOT NULL,
  dispatched_by_user_id UUID,
  received_by_user_id UUID,
  lines_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, requisition_number)
);

CREATE TABLE audit_periods (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('draft','closed')),
  is_official_close BOOLEAN NOT NULL DEFAULT false,
  items_json JSONB NOT NULL,
  overhead_variance_json JSONB,
  closed_at TIMESTAMPTZ,
  closed_by TEXT
);

-- 6. مراكز التكلفة والمصاريف الشهرية وقفل الشهر
CREATE TABLE cost_centers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  department_key TEXT NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  area_sqm NUMERIC(10,2) NOT NULL DEFAULT 0,
  headcount INT NOT NULL DEFAULT 1,
  manual_share_percent NUMERIC(6,2) NOT NULL DEFAULT 0
);

CREATE TABLE overhead_expenses (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  month TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('direct','indirect')),
  monthly_amount NUMERIC(14,2) NOT NULL,
  cost_center_id UUID NOT NULL REFERENCES cost_centers(id),
  stage1_rule TEXT NOT NULL,
  stage2_rule TEXT NOT NULL,
  source_module TEXT DEFAULT 'manual',
  external_ref_id TEXT,
  UNIQUE (tenant_id, month, external_ref_id)
);

CREATE TABLE overhead_month_locks (
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  month TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by TEXT NOT NULL,
  audit_period_id UUID REFERENCES audit_periods(id),
  PRIMARY KEY (tenant_id, month)
);

-- 7. الطلبات والورديات والخزينة والعملاء وصندوق الصادر
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  serial_number TEXT NOT NULL,
  service_type TEXT NOT NULL,
  table_number TEXT,
  customer_id UUID,
  items_json JSONB NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL,
  discount_amount NUMERIC(14,2) DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  shift_id UUID,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_tenant_created ON orders(tenant_id, created_at DESC);

CREATE TABLE cashier_shifts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  z_report_number TEXT NOT NULL,
  cashier_username TEXT NOT NULL,
  opening_float NUMERIC(14,2) NOT NULL,
  cash_sales NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_drawer_cash NUMERIC(14,2) NOT NULL DEFAULT 0,
  actual_counted_cash NUMERIC(14,2),
  status TEXT NOT NULL CHECK (status IN ('open','closed')),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ
);

CREATE TABLE treasury_movements (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  movement_type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  receipt_number TEXT NOT NULL,
  shift_id UUID REFERENCES cashier_shifts(id),
  actor_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES establishments(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  addresses_json JSONB NOT NULL DEFAULT '[]',
  loyalty_points INT NOT NULL DEFAULT 0,
  total_spent NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_blacklisted BOOLEAN NOT NULL DEFAULT false,
  is_anonymized BOOLEAN NOT NULL DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (tenant_id, phone)
);

CREATE TABLE processed_idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
