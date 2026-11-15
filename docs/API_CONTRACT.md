# عقد واجهات البرمجة للربط الخادمي — منظومة TYGOS (`API_CONTRACT.md`)

> **ملاحظة:** تعمل المنظومة حالياً بوضع `Offline-First` محلي بالكامل بدون أي خادم خارجي. يوثق هذا العقد كل مسار REST مستقبلي يقابل العمليات الفعلية في `repositories.ts` و`services/*.ts` ليُنفّذ مباشرةً خلف `RemoteApiAdapter` أو `LocalServerAdapter`.

---

## 1. القواعد المشتركة لجميع المسارات (`Base Conventions`)

- **البادئة الموحدة:** `/api/v1/tenants/:tenantId/...` (باستثناء مسارات الهوية والمنيو العام).
- **الترويسات الإلزامية (`Headers`):**
  - `Authorization: Bearer <JWT>` (إلزامي لكل المسارات الداخلية).
  - `X-Device-Id: <deviceId>` (مثل `dev-4f8a91c2`).
  - `Idempotency-Key: <idempotencyKey>` (إلزامي لكل طلبات `POST`/`PUT`/`PATCH` لضمان عدم التكرار عند إعادة إرسال `OutboxService.flush`).
- **نموذج الرد الموحد:**
  ```json
  {
    "ok": true,
    "data": {},
    "serverTimestamp": "2026-11-15T18:30:00.000Z"
  }
  ```

---

## 2. المصادقة والطاقم والصلاحيات (`SettingsRepository`, `UserRepository`)

| الطريقة | المسار | الخدمة الحالية المقابلة | الوصف |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | `AuthContext` | تسجيل الدخول برقم المنشأة واسم المستخدم وكلمة المرور وإرجاع JWT |
| `POST` | `/api/v1/auth/change-password` | `AuthContext` + `MandatoryPasswordChangeModal` | تغيير كلمة المرور الإلزامي عند أول دخول (`mustChangePasswordOnLogin`) |
| `GET` | `/api/v1/tenants/:tenantId/users` | `userRepository.getUsersSync(tenantId)` | جلب حسابات طاقم المنشأة |
| `PUT` | `/api/v1/tenants/:tenantId/users/:userId` | `userRepository.upsertSync` | تعديل الدور أو الشاشات المسموحة `permittedViews` |
| `POST` | `/api/v1/tenants/:tenantId/users/:userId/reset-pin` | `UserRolesManagementModule` | توليد/تعيين PIN عشوائي من 6 خانات (يُعاد مشفراً بالخادم ويُسجل في التدقيق) |
| `DELETE` | `/api/v1/tenants/:tenantId/users/:userId` | `userRepository.softDeleteSync` | حذف منطقي للمستخدم مع منع حذف الحساب النشط ذاتياً |

---

## 3. الخامات والأقسام والتجهيزات والمنتجات

| الطريقة | المسار | الخدمة / المستودع المقابل | الحمولة الأساسية (`Payload`) |
| :--- | :--- | :--- | :--- |
| `GET/PUT` | `/api/v1/tenants/:tenantId/categories/:type` | `categoryService` (`product \| material`) | شجرة `CategoryNode[]` حتى 3 مستويات |
| `GET/POST/PUT` | `/api/v1/tenants/:tenantId/raw-materials` | `rawMaterialRepository` + `dataService` | `RawMaterialItem` مع `majorUnit`, `subUnit`, `baseUnit`, `isStockTracked`, `lowStockThreshold` |
| `POST` | `/api/v1/tenants/:tenantId/raw-materials/purchase-receipt` | `warehouseService.receivePurchaseInvoice` | استلام فاتورة شراء للمخزن الرئيسي وتحديث WAC |
| `GET/POST/PUT` | `/api/v1/tenants/:tenantId/semi-finished` | `semiFinishedService` | `SemiFinishedItem` (`compound \| processing \| portion`, `enableBatchTracking`) |
| `POST` | `/api/v1/tenants/:tenantId/semi-finished/:id/batches` | `semiFinishedService.recordBatchProduction` | تسجيل دفعة إنتاج اختيارية وخصم خاماتها من مخزن القسم |
| `GET/POST/PUT` | `/api/v1/tenants/:tenantId/products` | `productRepository` + `dataService` | `MenuItemProduct` + `recipeIngredients[]` + `lowStockThresholdPortions` |
| `GET/PUT` | `/api/v1/tenants/:tenantId/menu-overrides` | `menuOverridesRepository` | `MenuItemOverride` للصور والوصف والمحطة والإتاحة |

---

## 4. الفروع والمخازن والطلبيات والجرد الفعلي

| الطريقة | المسار | الخدمة المقابلة | الوصف والملاحظات |
| :--- | :--- | :--- | :--- |
| `GET/POST` | `/api/v1/tenants/:tenantId/branches` | `warehouseService.getBranches / saveBranch` | إدارة الفروع وإحداثيات GPS |
| `GET/POST` | `/api/v1/tenants/:tenantId/warehouses` | `warehouseService.getWarehouses / saveWarehouse` | المخازن الرئيسية والفرعية والمطابخ المركزية ومخازن الأقسام |
| `GET` | `/api/v1/tenants/:tenantId/stock-movements` | `warehouseService.getStockMovements` + `rawMaterialRepository.recordStockMovementSync` | كارت الصنف وحركات الإضافة والصرف والمبيعات والتسوية |
| `POST` | `/api/v1/tenants/:tenantId/requisitions` | `warehouseService.createRequisition` | إنشاء طلبية أو تحويل بتوقيع الكاتب التلقائي |
| `POST` | `/api/v1/tenants/:tenantId/requisitions/:id/dispatch` | `warehouseService.dispatchRequisition` | صرف أمين المخزن ونقل الكمية إلى `inTransitStockMap` |
| `POST` | `/api/v1/tenants/:tenantId/requisitions/:id/receive` | `warehouseService.receiveRequisition` | استلام الشيف (كلي أو جزئي مع إلزامية `rejectionReason` للمرفوض) |
| `POST` | `/api/v1/tenants/:tenantId/audit-periods/close` | `inventoryAuditService.closePeriod` | إغلاق رسمي للفترة + قيود التسوية + استدعاء قفل الشهر في المصاريف |
| `GET/POST` | `/api/v1/tenants/:tenantId/daily-notes` | `dailyNotesService` | الملاحظات اليومية وحالتها (`unresolved \| resolved`) |

### مثال JSON: إنشاء وصرف طلبية (`POST /requisitions`)
```json
{
  "id": "8e11c3a0-91a2-4c9d-9a4e-5567b3c91f10",
  "sourceWarehouseId": "wh-main",
  "targetWarehouseId": "wh-kitchen",
  "lines": [
    {
      "materialId": "demo-mat-1",
      "requestedQuantity": 2,
      "requestedUnit": "major",
      "requestedQuantityBase": 10000
    }
  ]
}
```

---

## 5. الطلبات والمبيعات والمنيو العام QR والورديات والخزينة

| الطريقة | المسار | الخدمة / المستودع المقابل | الوصف |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/public/menu/:estCode` | `publicMenuProvider.getCachedMenu` | **عام بدون تسجيل دخول:** يُرجع `PublicMenuItem[]` فقط (خالي تماماً من التكلفة والوصفة والهامش وحالة النواقص الداخلية) |
| `POST` | `/api/v1/public/orders` | `orderTransport` | إرسال طلب من منيو QR بوضع `pending_approval` |
| `POST` | `/api/v1/tenants/:tenantId/orders` | `orderRepository` + `orderService.saveAndSend` | اعتماد/حفظ طلب الكاشير وإصدار الرقم التسلسلي (`serialNumber`) |
| `POST` | `/api/v1/tenants/:tenantId/orders/:id/pay` | `orderService.processPaymentTransaction` | الدفع (نقدي/بطاقة/مقسم) + تفكيك التجهيزات + خصم مخزن القسم |
| `PATCH` | `/api/v1/tenants/:tenantId/orders/:id/station-status` | `orderService` / `KitchenDisplaySystem` | تحديث حالة محطة (`pending -> preparing -> ready`) |
| `POST` | `/api/v1/tenants/:tenantId/shifts/open` | `shiftTreasuryService.openShift` | فتح وردية كاشير جديدة مع رصيد البداية |
| `POST` | `/api/v1/tenants/:tenantId/shifts/:id/close` | `shiftTreasuryService.closeShift` | إغلاق تقرير Z (الوردية المغلقة غير قابلة للتعديل نهائياً) |
| `POST` | `/api/v1/tenants/:tenantId/treasury/movements` | `shiftTreasuryService` | توريد نقدية الوردية للخزينة العامة أو تسجيل مصروف خزينة |

---

## 6. المصاريف والتكاليف غير المباشرة والعملاء والنسخ الاحتياطي والمزامنة

| الطريقة | المسار | الخدمة المقابلة | الوصف |
| :--- | :--- | :--- | :--- |
| `GET/POST/DELETE` | `/api/v1/tenants/:tenantId/cost-centers` | `overheadService` | مراكز التكلفة + مركز «مشترك» `cc-shared` |
| `GET/POST/DELETE` | `/api/v1/tenants/:tenantId/overhead-expenses` | `overheadService` | المصاريف الشهرية (يرفض الخادم `423 Locked` إذا كان الشهر مقفلاً) |
| `POST` | `/api/v1/tenants/:tenantId/overhead-expenses/import` | `overheadService.importFromHrAndFinance` | استيراد رواتب HR ومصاريف المالية مع منع التكرار عبر `externalRefId` |
| `GET/POST/PUT` | `/api/v1/tenants/:tenantId/customers` | `customerRepository` + `customerService` | ملفات العملاء بالهاتف المطبّع، النقاط، القائمة السوداء، وإخفاء الهوية (`anonymize`) |
| `GET` | `/api/v1/tenants/:tenantId/backup/export` | `migrationService.exportEstablishmentBackup` | تصدير لقطة JSON بإصدار المخطط الحالي (`v6`) وبصمة التحقق `fnv1a` |
| `POST` | `/api/v1/tenants/:tenantId/backup/import` | `migrationService.importEstablishmentBackup` | استعادة ذرية مع معاينة وترقية تلقائية للنسخ القديمة وتراجع آلي عند الخطأ |
| `POST` | `/api/v1/tenants/:tenantId/sync/outbox` | `OutboxService.flush` | استقبال دفعة أحداث `OutboxEvent` بالترتيب الزمني مع إزالة التكرار عبر `idempotencyKey` |
