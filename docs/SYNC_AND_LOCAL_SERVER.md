# المزامنة والعمل دون اتصال والسيرفر المحلي الطارئ — منظومة TYGOS (`SYNC_AND_LOCAL_SERVER.md`)

> **مرجع الكود المصدري:** `src/sync/outboxService.ts`, `src/sync/syncTypes.ts`, `src/repositories/repositories.ts`, `src/repositories/storageAdapter.ts`, و`src/services/orderTransport.ts`.

---

## 1. أنماط التشغيل الأربعة (`DeploymentMode`)

يُدار الوضع النشط عبر `DeviceRepository` في `src/repositories/repositories.ts`:

| الوضع (`DeploymentMode`) | التخزين النشط (`StorageAdapter`) | الناقل اللحظي (`orderTransport`) | الاستخدام الميداني |
| :--- | :--- | :--- | :--- |
| **`standalone`** *(الحالي)* | `LocalStorageAdapter` (أو `MemoryStorageAdapter` في اختبارات Node) | `BroadcastChannel('tygos_order_transport')` + حدث `storage` | جهاز واحد أو عدة تبويبات في نفس المتصفح بلا خادم |
| **`cloud`** *(مستقبلي)* | `RemoteApiAdapter(baseUrl)` مع تخزين محلي مؤقت | WebSocket / SSE عبر السحابة | ربط الفروع والسحابة المركزية وتحديث المنيو والطلبات |
| **`local`** *(مستقبلي)* | `LocalServerAdapter(lanUrl)` (مثل `http://192.168.1.50:4000`) | WebSocket / SSE على الشبكة الداخلية LAN | تشغيل الكاشير والمطبخ والبار داخل الفرع عند انقطاع الإنترنت |
| **`hybrid`** *(مستقبلي)* | `LocalServerAdapter` أثناء العمل + مزامنة دورية مع `RemoteApiAdapter` | LAN محلي + رفع دوري للسحابة | التشغيل المتواصل في الشبكة المحلية مع نسخ سحابي مستمر |

---

## 2. آلية صندوق الصادر والمفاتيح غير القابلة للتكرار (`OutboxService`)

كل عملية كتابة في `TenantRepository` (`upsertSync`, `softDeleteSync`, `saveAllSync(..., true)`, `recordStockMovementSync`, `saveVenueSettings`) تمر عبر `outboxService.enqueue(...)` المحفوظ في المفتاح:
`tygos_${tenantId || 'default'}_outbox`

### 2.1 بنية الحدث (`OutboxEvent<T>`)
```ts
export interface OutboxEvent<T = unknown> {
  id: string;             // UUID v4 مُولّد في العميل
  idempotencyKey: string; // مفتاح منع التكرار
  tenantId: string;
  deviceId: string;
  entityType:
    | 'product' | 'raw_material' | 'order' | 'customer'
    | 'settings' | 'stock_movement' | 'shift' | 'coupon'
    | 'user' | 'menu_override';
  entityId: string;
  operation: 'create' | 'update' | 'delete' | 'append';
  payload: T;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  retryCount: number;
  nextRetryAt: number;    // Epoch ms
  createdAt: string;
  lastError?: string;
}
```

### 2.2 ضمان عدم التكرار (`Idempotency Deduplication`)
- صيغة المفتاح الافتراضية في `OutboxService.enqueue`:
  `${tenantId}:${entityType}:${entityId}:${operation}` (أو مفتاح مخصص تمرره الخدمة مثل رقم الطلب/الحركة).
- إذا وُجد حدث في الصندوق بنفس `idempotencyKey` وحالته `pending` أو `sent`، تعيده الدالة دون إضافة سجل جديد.
- على الخادم: يحتفظ الخادم بجدول `processed_idempotency_keys`؛ عند استلام حدث سبقت معالجته يرجع `200 OK` بنفس النتيجة دون إعادة خصم المخزون أو تكرار القيد.

### 2.3 التفريغ التتابعي والتراجع الأسّي (`FIFO Flush & Exponential Backoff`)
في `outboxService.flush(tenantId, dispatcher, nowMs)`:
1. تُعالج الأحداث بالترتيب الزمني للأقدمية (**FIFO** عبر عكس المصفوفة `[...events].reverse()`).
2. تُتجاهل الأحداث التي حالتها `sent` أو التي حالتها `failed` ولم يحن موعد `nextRetryAt > nowMs`.
3. عند نجاح `dispatcher(ev)` تُضبط الحالة إلى `sent` وتُمسح رسالة الخطأ.
4. عند الفشل أو استثناء الشبكة:
   - تزيد `retryCount` بمقدار `1`.
   - يُحسب التأخير الأسّي بالدقة التالية من الكود:
     ```ts
     const backoffMs = Math.min(30000, 1000 * Math.pow(2, ev.retryCount));
     ```
     *(أي 2 ث، 4 ث، 8 ث، 16 ث، ثم بحد أقصى 30 ثانية بين المحاولات).*
5. واجهات الإدارة المتاحة في الخدمة: `getPendingCount(tenantId)`, `retryAllFailed(tenantId)`, `clearSent(tenantId)`, و`subscribe(listener)`.

---

## 3. توليد المعرّفات وأرقام الطلبات عند الانقطاع (`Offline Serials`)

- **معرّف الجهاز الثابت (`getOrCreateDeviceId`):** يُحفظ في `tygos_device_id` بصيغة `dev-${uuid.slice(0, 8)}` ويدخل ضمن بيانات كل سجل عبر `stampSyncMetadata`.
- **توليد أرقام الطلبات (`generateNextOrderSerial`):**
  - في الوضع المتصل: `#0001`, `#0002`, ... (نقطة استبدال مستقبلية بـ Sequence مركزي من الخادم).
  - عند العمل دون اتصال (`isOffline = true`): يضيف بادئة الجهاز من 3 أحرف: `#<DEV>-0001` (مثلاً `#4F8-0001`) لضمان عدم تصادم أرقام الفواتير بين أجهزة كاشير متعددة تعمل في وضع الطوارئ حتى تعود المزامنة.

---

## 4. سياسات حل التعارض المحددة في الكود (`resolveEntityConflict`)

تُنفذ الدالة الحتمية `resolveEntityConflict<T>(local, remote, policy)` في `src/sync/syncTypes.ts` ثلاث سياسات:

1. **`append_only`** *(الطلبات `orders`، المدفوعات، وسجلات التدقيق)*:
   - لا يُستبدل أو يُحذف أي سجل؛ يُقبل الطرفان استناداً إلى `id` الفريد و`idempotencyKey`.
2. **`movement_ledger`** *(حركات المخزون `stock_movements`)*:
   - لا يُتزامن الرصيد كرقم ثابت، بل يُعاد احتساب الرصيد الفعلي من جمع الحركات المستندية المستقلة (`purchase_receipt`, `section_issue`, `sales`, `waste`, `transfer`, `reconciliation`).
3. **`last_write_wins_audited`** *(المنتجات، الخامات، العملاء، الإعدادات، المنيو)*:
   - الفائز هو السجل ذو `version` الأعلى؛ وعند تساوي رقم الإصدار يفوز السجل ذو الطابع الزمني الأحدث `updatedAt`، مع رصد `conflictDetected = true` وتوثيق سبب الحسم في سجل التدقيق.

---

## 5. مسار التحول من السحابة إلى السيرفر المحلي الطارئ والرجوع (Failover Playbook)

```text
[وضع السحابة cloud] ──(انقطاع الإنترنت)──▶ [التحول إلى local LAN أو standalone]
                                                  │
                                      تراكم العمليات في Outbox
                                      وأرقام طلبات ببادئة الجهاز
                                                  │
[استئناف السحابة] ◀──(OutboxService.flush FIFO)◀── [عودة الاتصال بالإنترنت]
```

1. **الانقطاع المفاجئ:** يبدّل مدير النظام أو آلية الفحص وضع التشغيل في `deviceRepository.setDeploymentMode('local')` مع عنوان السيرفر المحلي `http://192.168.x.x:4000` (أو يواصل في `standalone`).
2. **استمرار التشغيل بالصالة والمطبخ:** يستمر الكاشير في إنشاء الطلبات وتوزيعها على محطات KDS عبر الشبكة المحلية مع حفظ كل حركة مخزون وطلب في `OutboxService` بحالة `pending`.
3. **عودة الاتصال والمصالحة:** عند عودة الاتصال، تُرسل قائمة `Outbox` تدريجياً بترتيب FIFO، يتحقق الخادم من `idempotencyKey` لمنع التكرار، وتُدمج حركات المخزون والطلبات، ثم تعود المنشأة لوضع `cloud` أو `hybrid` دون فقد أي فاتورة أو حركة مخزنية.
