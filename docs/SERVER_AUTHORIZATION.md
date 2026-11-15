# مصفوفة الصلاحيات وإلزامية الحماية على الخادم — منظومة TYGOS (`SERVER_AUTHORIZATION.md`)

> **قاعدة الحماية الصريحة (من `DECISIONS.md` و`ARCHITECTURE_READINESS.md`):**
> **«كل فحوص الصلاحيات الحالية في الواجهة فقط (`can(role, action)` و`permittedViews` وحجب الأزرار) وستُعاد وتُفرض بصورة قطعية على السيرفر وقاعدة البيانات عند الربط الخلفي.»**

---

## 1. مصدر الحقيقة الفعلي في الكود (`src/services/permissions.ts`)

تعرّف الدالة `can(role, action)` سلوك التحقق الحالي من خلال:
1. إذا كان `action === 'shift:edit_closed'` ← **يُرجع `false` دائماً لجميع الأدوار بلا استثناء** (الورديات المغلقة سجلات مالية غير قابلة للتعديل).
2. إذا كان الدور ضمن `ADMIN_ROLES = ['super_admin', 'tenant_admin', 'general_manager']` ← **يُسمح بجميع الأفعال ما عدا `shift:edit_closed`**.
3. لبقية الأدوار الـ 16، يُراجع مصفوفة `ROLE_PERMISSIONS[role]`.

---

## 2. مصفوفة الصلاحيات الكاملة (`19 دوراً × 41 فعلاً`) من `src/services/permissions.ts`

### أ) القيادة والمالية والتكاليف والضرائب

| الفعل (`PermissionAction`) | `super_admin` / `tenant_admin` / `general_manager` | `financial_manager` | `financial_accountant` | `cost_accountant` | `tax_accountant` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `crm:view` | ✓ | ✓ | — | — | — |
| `crm:edit` / `anonymize` / `blacklist` / `merge` | ✓ | — | — | — | — |
| `crm:export` | ✓ | ✓ | — | — | — |
| `customer_pii:view` | ✓ | ✓ | — | — | — |
| `menu:view` | ✓ | ✓ | ✓ | ✓ | — |
| `menu:edit` | ✓ | — | — | — | — |
| `menu:pricing` | ✓ | ✓ | — | ✓ | — |
| `kds:view` / `kds:update_ticket` | ✓ | — | — | — | — |
| `pos:view` | ✓ | ✓ | — | — | — |
| `pos:approve_order` | ✓ | — | — | — | — |
| `pos:refund` / `pos:close_shift` / `pos:refund_paid_order` / `pos:cancel_sent_item` | ✓ | ✓ | — | — | — |
| `order:trace` | ✓ | ✓ | — | — | — |
| `shift:open` / `shift:close` / `shift:view_all` | ✓ | ✓ | — | — | — |
| `shift:edit_closed` | **✗ ممنوع** | **✗ ممنوع** | **✗ ممنوع** | **✗ ممنوع** | **✗ ممنوع** |
| `treasury:view` / `treasury:deposit` | ✓ | ✓ | — | — | — |
| `treasury:view_vault` | ✓ | — *(قصر على الإدارة في `permissions.ts`)* | — | — | — |
| `inventory:view` | ✓ | ✓ | ✓ | ✓ | — |
| `inventory:adjust` | ✓ | — | — | — | — |
| `finance:view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `finance:edit` | ✓ | ✓ | ✓ | — | — |
| `overhead:view` / `overhead:manage` | ✓ | ✓ | — | ✓ | — |
| `settings:view` | ✓ | ✓ | — | — | — |
| `settings:edit` / `tables:manage` | ✓ | — | — | — | — |
| `users:view` / `users:manage` / `users:reset_password` / `users:delete` | ✓ | ✓ | — | — | — |
| `system:inspect_ui` / `system:error_log` | ✓ | — | — | — | — |

### ب) المخازن والمطبخ والصالة والموارد البشرية والتسويق

| الفعل (`PermissionAction`) | `store_manager` / `warehouse_manager` / `storekeeper` | `head_chef` / `kitchen_manager` | `bar_manager` / `section_manager` | `cashier` | `waiter` | `hr_manager` | `public_relations` | `marketing_officer` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `crm:view` | — | — | — | ✓ | ✓ | — | ✓ | ✓ |
| `crm:edit` | — | — | — | ✓ | — | — | ✓ | — |
| `crm:export` | — | — | — | — | — | — | ✓ | — |
| `customer_pii:view` | — | **✗ محجوب** | **✗ محجوب** | ✓ | ✓ | — | ✓ | — |
| `menu:view` | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| `menu:edit` | — | ✓ | — | — | — | — | — | ✓ |
| `menu:pricing` | — | — | — | — | — | — | — | — |
| `kds:view` / `kds:update_ticket` | — | ✓ | ✓ | — | — | — | — | — |
| `pos:view` | — | — | — | ✓ | ✓ | — | — | — |
| `pos:approve_order` / `pos:close_shift` | — | — | — | ✓ | — | — | — | — |
| `shift:open` / `shift:close` | — | — | — | ✓ | — | — | — | — |
| `shift:view_all` / `treasury:view_vault` | — | — | — | **✗ معزول** | — | — | — | — |
| `inventory:view` | ✓ | ✓ | ✓ | — | — | — | — | — |
| `inventory:adjust` | ✓ | — | — | — | — | — | — | — |
| `overhead:view` / `overhead:manage` | **✗ محجوب** | **✗ محجوب** | **✗ محجوب** | **✗ محجوب** | **✗** | **✗** | **✗** | **✗** |
| `settings:view` | — | — | — | — | — | ✓ | — | ✓ |

> **ضوابط نطاق البيانات الإضافية (Data-Scope Guards) في الخدمات:**
> - **أمين المخزن (`storekeeper`) ومدير القسم (`section_manager`):** يرون فقط المخازن المعيّنة لهم في `user.assignedWarehouseIds` أو قسمهم `user.assignedSection` عبر `warehouseService`.
> - **الكاشير (`cashier`):** في `TreasuryModule` و`shiftTreasuryService` يرى ورديته النشطة فقط وحركات درجها؛ يُحجب عنه رصيد الخزينة العامة (`treasury:view_vault`) وسجل حركات الخزينة وورديات الكاشيرين الآخرين.
> - **الشيف وموظفو المحطات (`kitchen_manager`, `bar_manager`):** يُحجب عنهم `customer_pii:view` فلا تظهر أرقام هواتف العملاء أو عناوينهم في تذاكر KDS (`StationTicket` يحمل البيانات الشخصية للكاشير فقط).
> - **أدوات الفحص والصيانة (`ui_inspector`, `error_log`, `prelaunch_checklist`):** محصورة في `ADMIN_ROLES` (`super_admin`, `tenant_admin`, `general_manager`).

---

## 3. بنية توكن JWT وعزل قاعدة البيانات (RLS) عند الربط الخادمي

### 3.1 حقول توكن الجلسة الموقع (`JWT Claims`)
```json
{
  "sub": "usr-8821",
  "tenantId": "est-1",
  "role": "cashier",
  "assignedWarehouseIds": [],
  "assignedSection": null,
  "deviceId": "dev-4f8a91c2",
  "mustChangePassword": false,
  "iat": 1794760000,
  "exp": 1794788800
}
```
- **القاعدة الإلزامية:** يستخرج الخادم `tenantId` و`role` من التوكن الموقع فقط ولا يثق مطلقاً في أي `role` أو `tenantId` مُرسل داخل جسم الطلب (`req.body`).
- **تجزئة كلمات المرور والـ PIN:** استبدال تجزئة العميل الحالية بـ `Argon2id` أو `bcrypt` على الخادم مع `mustChangePasswordOnLogin = true` بعد كل تعيين PIN عشوائي.

### 3.2 سياسة عزل الصفوف في PostgreSQL (`Row-Level Security`)
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```
*(يُطبّق نفس نمط الـ Policy على جميع جداول المنشأة: `raw_materials`, `products`, `semi_finished_items`, `requisitions`, `audit_periods`, `overhead_expenses`, `cashier_shifts`, `treasury_movements`, `customers`, `staff_users`).*

### 3.3 قائمة فحوص Middleware الخادم الإلزامية قبل الإنتاج
1. **`requireAuth`**: التحقق من توقيع JWT وصلاحيته وضبط `app.current_tenant_id` في معاملات قاعدة البيانات.
2. **`requirePermission(action)`**: تنفيذ نسخة خادمية مطابقة لدالة `can(req.user.role, action)` وإرجاع `403 Forbidden` عند الرفض.
3. **`enforceShiftImmutability`**: رفض أي `PUT/PATCH/DELETE` على وردية حالتها `closed` برمز `409 Conflict`.
4. **`enforceLockedOverheadMonth`**: رفض تعديل/حذف/استيراد مصاريف لشهر مسجل في `overhead_month_locks` برمز `423 Locked`.
5. **`stripPublicMenuCosts`**: التأكد في مسار `/api/v1/public/menu/:estCode` من تمرير `PublicMenuItem` فقط وحذف أي حقول تكلفة أو رصيد قبل إرسال الرد.
