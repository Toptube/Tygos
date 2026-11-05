# جاهزية معمارية TYGOS للأونلاين والسيرفر المحلي (Architecture Readiness)

## 1. نظرة عامة على الطبقات (Layered Architecture)

صُممت منظومة **TYGOS** لفصل واجهات المستخدم (React Views) بالكامل عن آليات التخزين والنقل والطباعة، بحيث يمكن الانتقال من وضع التشغيل المستقل (`standalone`) إلى السحابة (`cloud`) أو السيرفر المحلي الطارئ (`local` / `hybrid`) دون تعديل شاشات الكاشير أو المطبخ أو التقارير.

```text
+-------------------------------------------------------------------------+
|                        1. واجهات المستخدم (React UI)                    |
|   POS  |  KDS المحطات  |  المنيو العام (QR)  |  العملاء CRM  |  التقارير  |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                     2. سياقات التطبيق (React Contexts)                  |
|    AuthContext  |  BusinessContext  |  SyncContext  |  ToastContext     |
+-------------------------------------------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|               3. طبقة المستودعات الموحدة (Repositories)                 |
|  OrderRepository | ProductRepository | CustomerRepository | PublicMenu   |
|  - توليد UUID في العميل (client-generated)                              |
|  - ختم حقول: createdAt, updatedAt, version, deviceId, tenantId          |
|  - حذف منطقي (soft delete via deletedAt)                                |
+-------------------------------------------------------------------------+
           |                                                 |
           v                                                 v
+-------------------------------+       +---------------------------------+
|   4أ. محوّل التخزين (Adapter) |       |   4ب. صندوق الصادر (Outbox)     |
| - LocalStorageAdapter (حالي)  |       | - طابور أحداث دائم محلياً       |
| - RemoteApiAdapter (مستقبلي)  |       | - مفتاح عدم التكرار             |
| - LocalServerAdapter (مستقبلي)|       |   (idempotencyKey)              |
+-------------------------------+       | - إعادة محاولة تدريجية          |
                                        +---------------------------------+
                                                         |
                                                         v
+-------------------------------------------------------------------------+
|             5. طبقة النقل والطباعة (Transport & Printing)               |
|  OrderTransport: BroadcastChannel (حالي) | WebSocket/SSE | LocalLAN     |
|  PrinterService: BrowserPrint (حالي)     | LocalPrintAgent (ESC/POS)    |
+-------------------------------------------------------------------------+
```

---

## 2. نقاط الاستبدال (Integration Points)

| المكون | التنفيذ الحالي (Offline-First) | نقطة الاستبدال المستقبلية (`INTEGRATION POINT`) |
| :--- | :--- | :--- |
| **التخزين (`StorageAdapter`)** | `LocalStorageAdapter` | `RemoteApiAdapter` (Cloud REST/GraphQL) أو `LocalServerAdapter` (LAN REST) |
| **نقل الطلبات (`orderTransport`)** | `BroadcastChannel` + `storage` event | `CloudWebSocketTransport` (SSE/WS) أو `LocalLanTransport` |
| **تسلسل أرقام الطلبات** | `generateNextOrderSerial` (محلي + بادئة الجهاز عند الانقطاع) | تسلسل مركزي من الخادم (`Server Sequence`) |
| **الطباعة (`PrinterAdapter`)** | `BrowserPrintAdapter` | `LocalPrintAgentAdapter` (طباعة صامتة لطابعات المطبخ 80mm عبر ESC/POS) |
| **المنيو العام (`PublicMenuProvider`)** | `LocalPublicMenuProvider` مع تخزين مؤقت محلي | `RemotePublicMenuProvider` عبر CDN / خادم المنشأة |

---

## 3. سيناريو التشغيل الأونلاين (`deploymentMode = 'cloud'`)

1. **الكتابة الفورية والمزامنة:** عند إنشاء طلب أو تعديل عميل أو صنف، يُحفظ السجل محلياً أولاً (لضمان سرعة الاستجابة الفورية `0ms`) ويُضاف الحدث إلى `OutboxService` مع `idempotencyKey` فريد.
2. **الإرسال للخادم السحابي:** يقوم `SyncContext` بإرسال الأحداث المعلقة عبر `RemoteApiAdapter` إلى الخادم السحابي.
3. **البث اللحظي:** يستقبل الخادم الطلب ويرسله عبر WebSocket/SSE إلى شاشات الكاشير ومحطات التحضير (KDS) المتصلة بنفس `tenantId`.

---

## 4. سيناريو السيرفر المحلي الطارئ (`deploymentMode = 'local'` أو `'hybrid'`) والرجوع للمزامنة

1. **انقطاع الإنترنت:** ينتقل النظام تلقائياً أو يدوياً إلى وضع `local` (خادم محلي داخل شبكة المنشأة LAN على `serverBaseUrl` مثل `http://192.168.1.50:4000`) أو وضع `offline` المستقل.
2. **استمرار العمل دون توقف:**
   - تستمر نقاط البيع وشاشات المطبخ في العمل عبر الشبكة المحلية أو التخزين المحلي.
   - تُولَّد أرقام الطلبات ببادئة الجهاز (مثل `#01A-0001`) لمنع أي تعارض مع أجهزة أخرى.
   - تُسجَّل جميع العمليات في `OutboxService` بحالة `pending`.
3. **عودة الاتصال والمزامنة (Reconciliation):**
   - عند عودة الإنترنت، يقوم `OutboxService.flush()` بإرسال الأحداث المتراكمة بالترتيب الزمني (FIFO) مع إعادة المحاولة التدريجية (Exponential Backoff).
   - يمنع الخادم تكرار أي عملية باستخدام `idempotencyKey`.

---

## 5. سياسة حل التعارض (Conflict Resolution Policy)

- **الطلبات والمدفوعات وحركات المخزون (`append_only`):** لا يُحذف أو يُستبدل أي سجل؛ تُدمج جميع السجلات بالإضافات فقط عبر المعرّف الفريد `id` و`idempotencyKey`.
- **المنتجات والأسعار وبيانات العملاء (`last_write_wins_audited`):** يفوز التعديل ذو رقم الإصدار الأعلى (`version`) أو الطابع الزمني الأحدث (`updatedAt`) مع تسجيل التعارض في سجل التدقيق.
- **أرصدة المخزون (`movement_ledger`):** لا يُكتب الرصيد مباشرة كرقم ثابت، بل يُحسب دائماً من مجموع حركات الإضافة والصرف والتسوية.

---

## 6. قائمة ما سيُبنى في مرحلة الربط الخلفي (Backend Phase Checklist)

- [ ] بناء خادم API مركزي (Node.js / PostgreSQL أو Firestore) يدعم `tenantId` و`idempotencyKey`.
- [ ] تفعيل خادم WebSocket / SSE لبث أحداث الطلبات بين الأجهزة والشبكات المختلفة.
- [ ] بناء خدمة وكيل الطباعة المحلي (`LocalPrintAgent`) للطباعة الحرارية المباشرة دون نافذة المتصفح.
- [ ] ربط المصادقة بتوكنات JWT وتحقق الصلاحيات `can(role, action)` على مستوى الخادم.
