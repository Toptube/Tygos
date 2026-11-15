/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Package 6 Section 6 Test:
 * 30 Real Egyptian Colloquial Operational Questions to LocalAssistantEngine
 * + Screen Registry action validation + RBAC confidentiality verification.
 */

import assert from 'node:assert/strict';
import { localAssistantEngine } from '../services/localAssistantEngine.ts';
import { buildAppContextSnapshot } from '../services/appContextSnapshot.ts';
import { SCREEN_REGISTRY } from '../services/screenRegistry.ts';

async function runTests() {
  const adminContext = buildAppContextSnapshot(
    'dashboard',
    { role: 'tenant_admin', fullName: 'أحمد المالك' },
    [],
    [],
    []
  );
  const cashierContext = buildAppContextSnapshot(
    'pos',
    { role: 'cashier', fullName: 'سارة الكاشير' },
    [],
    [],
    []
  );

  const validNavTargets = new Set(SCREEN_REGISTRY.map((s) => `NAV:${s.viewId}`));

  const egyptianQuestions: Array<{ q: string; expectSubstrings: string[]; expectActionPrefix?: string }> = [
    { q: 'الميه والملح مش عايز اجردهم بس تكلفتهم تتحسب في الاكل', expectSubstrings: ['غير المتتبعة', 'بلا رصيد'], expectActionPrefix: 'NAV:inventory' },
    { q: 'عايز اعمل شجره اقسام ٣ مستويات واحط شيش طاووق في قسمين مختلفين', expectSubstrings: ['٣ مستويات', 'قسمين'], expectActionPrefix: 'NAV:categories' },
    { q: 'انا بشتري بالشيكاره والكرتونه وبستهلك بالجرام اعمل الوحدات دي ازاي', expectSubstrings: ['٣ مستويات', 'مركبة'], expectActionPrefix: 'NAV:inventory' },
    { q: 'لما الكاشير يبيع طلب بيتخصم من مخزن المطبخ ولا المخزن الرئيسي', expectSubstrings: ['مخزن القسم', 'المخزن الرئيسي'], expectActionPrefix: 'NAV:warehouses' },
    { q: 'الشيف رفض نص الطلبيه اللي طلعت من المخزن مصيرها ايه', expectSubstrings: ['في الطريق', 'سبب الرفض'], expectActionPrefix: 'NAV:warehouses' },
    { q: 'ازاي احول بضاعه من المطبخ المركزي لفرع المعادي', expectSubstrings: ['طلبيات', 'كارت الصنف'], expectActionPrefix: 'NAV:warehouses' },
    { q: 'عايز اشوف كل الحركات اللي حصلت على الدقيق من كارت الصنف', expectSubstrings: ['كارت الصنف', 'استلام'], expectActionPrefix: 'NAV:warehouses' },
    { q: 'ينفع اعمل جرد اختباري الاول قبل ما اقفل الشهر فعلي', expectSubstrings: ['جرد اختباري', 'إغلاق فعلي'], expectActionPrefix: 'NAV:inventory_audit' },
    { q: 'الرصيد التقديري في الجرد اتحسب ازاي وليه في الطريق مش جواه', expectSubstrings: ['في الطريق', 'تفاصيل اليوم'], expectActionPrefix: 'NAV:inventory_audit' },
    { q: 'ليه زرار البيتزا لونه اصفر عند الكاشير واغير حد التنبيه منين', expectSubstrings: ['أصفر', 'حد التنبيه'], expectActionPrefix: 'NAV:pos' },
    { q: 'اسجل ملاحظه يوميه لمشكله خامه واطبعها للشيف ازاي', expectSubstrings: ['الملاحظات اليومية', 'كارت الصنف'], expectActionPrefix: 'NAV:daily_notes' },
    { q: 'عجينة البيتزا والصوص لازم اجردهم كل يوم ولا يتخصموا على الصيغه', expectSubstrings: ['على الصيغة', 'يفكك'], expectActionPrefix: 'NAV:semi_finished' },
    { q: 'الرز بيزيد لما يتسلق النص للضعف احسب معامل الطبخ ده ازاي', expectSubstrings: ['معالجة', 'معامل التحويل'], expectActionPrefix: 'NAV:semi_finished' },
    { q: 'اعمل حصة كورة بيتزا ١٧٠ جم وحصة ٢٥٠ جم من نفس العجين ازاي', expectSubstrings: ['حصص مسماة', 'وصفة'], expectActionPrefix: 'NAV:semi_finished' },
    { q: 'عايز اسجل دفعه تحضير صوص ولو لغيت الدفعات الرصيد يروح فين', expectSubstrings: ['سجّل دفعات', 'خاماتها الأولية'], expectActionPrefix: 'NAV:semi_finished' },
    { q: 'ليه التجهيزات مش بتظهر في طلبيات الشراء والمشتريات', expectSubstrings: ['تُحضّر داخل المنشأة', 'المشتريات'], expectActionPrefix: 'NAV:purchasing' },
    { q: 'اتبقى ٥ كيلو صوص اخر اليوم وقت الجرد ادخلهم فين', expectSubstrings: ['التجهيزات المتبقية', 'extraSemiFinishedBase'], expectActionPrefix: 'NAV:inventory_audit' },
    { q: 'لو الدقيق غلي اعرف كل الاطباق اللي تكلفتها اتغيرت قبل ما احفظ', expectSubstrings: ['شوف الأثر', 'المستقبلية'], expectActionPrefix: 'NAV:inventory' },
    { q: 'الايجار والكهربا ومصاريف الاداره بيتوزعوا على البيتزا على مرحلتين ازاي', expectSubstrings: ['مرحلتين', 'مراكز التكلفة'], expectActionPrefix: 'NAV:overhead_allocation' },
    { q: 'لو دوست استيراد الرواتب من الاتش ار مرتين هيحسب المرتبات مرتين', expectSubstrings: ['externalRefId', 'التكرار'], expectActionPrefix: 'NAV:overhead_allocation' },
    { q: 'بعد ما اقفل الشهر رسمي في الجرد ينفع اعدل مصروف في نفس الشهر', expectSubstrings: ['يُقفل الشهر', 'فروق التحميل'], expectActionPrefix: 'NAV:overhead_allocation' },
    { q: 'لو غيرت قاعدة توزيع الغاز من المساحه لزمن التحضير اعرف الاثر ازاي', expectSubstrings: ['حاسبة التجربة', 'قاعدة التوزيع'], expectActionPrefix: 'ACTION:simulation' },
    { q: 'اعرف ازاي ان في طبق بيكسب على الخامات لكنه خاسر بعد التحميل', expectSubstrings: ['خاسر بعد التحميل', 'ربحية الأقسام'], expectActionPrefix: 'NAV:overhead_allocation' },
    { q: 'الزبون لما يمسح كيو ار الطاوله بيشوف تكلفة الطبق في المنيو', expectSubstrings: ['معزول', 'مستحيل'], expectActionPrefix: 'NAV:qr_tables' },
    { q: 'المكرونة خلصت في المطبخ الشيف يقدر يوقف اتاحتها من شاشه المطبخ', expectSubstrings: ['إتاحة الأصناف', 'الكاشير'], expectActionPrefix: 'NAV:kds' },
    { q: 'ينفع ادي الكاشير كود 1234 وهل يشوف رصيد الخزينه العامه', expectSubstrings: ['1234', 'ورديته النشطة'], expectActionPrefix: 'NAV:users_roles' },
    { q: 'عايز افحص تداخل الشاشات على الموبايل واشوف سجل الاعطال', expectSubstrings: ['فاحص الواجهة', 'سجل الأخطاء'], expectActionPrefix: 'NAV:ui_inspector' },
    { q: 'اخد نسخه احتياطيه كامله وافحص البيانات التالفه ازاي', expectSubstrings: ['JSON', 'فحص وإصلاح'], expectActionPrefix: 'NAV:settings' },
    { q: 'عندي صنفين مكررين بنفس الاسم ادمجهم من غير ما الداتا تضيع', expectSubstrings: ['فحص المكرر', 'المنتجات'], expectActionPrefix: 'NAV:products' },
    { q: 'لوحة المفاتيح بتكتب ارقام عربي ١٢.٥ والعمله ايه في السيستم', expectSubstrings: ['ج.م', 'المشرقية'], expectActionPrefix: 'NAV:settings' },
  ];

  assert.equal(egyptianQuestions.length, 30, 'Must test exactly 30 Egyptian colloquial questions');

  const fallbackText = 'أنا معك في كل خطوة بتشغيل المنشأة';
  let passed = 0;

  for (let i = 0; i < egyptianQuestions.length; i++) {
    const item = egyptianQuestions[i];
    const res = await localAssistantEngine.ask(adminContext, item.q, 'ar');

    assert.ok(
      !res.contentAr.startsWith(fallbackText),
      `Q${i + 1} hit generic fallback unexpectedly: "${item.q}" -> ${res.contentAr}`
    );

    for (const sub of item.expectSubstrings) {
      assert.ok(
        res.contentAr.includes(sub),
        `Q${i + 1} response missing expected keyword "${sub}": ${res.contentAr}`
      );
    }

    assert.ok(res.suggestedActions && res.suggestedActions.length > 0, `Q${i + 1} has suggested actions`);
    for (const act of res.suggestedActions) {
      if (act.action.startsWith('NAV:')) {
        assert.ok(
          validNavTargets.has(act.action),
          `Q${i + 1} suggested invalid NAV action not in SCREEN_REGISTRY: ${act.action}`
        );
      }
    }

    if (item.expectActionPrefix) {
      assert.ok(
        res.suggestedActions.some((a) => a.action === item.expectActionPrefix),
        `Q${i + 1} missing action ${item.expectActionPrefix}`
      );
    }

    passed++;
  }

  // Also verify cashier stays blocked from profit secrets
  const cashierProfitReply = await localAssistantEngine.ask(cashierContext, 'ارباح المطعم كام النهارده؟', 'ar');
  assert.ok(
    cashierProfitReply.suggestedActions?.some((a) => a.action === 'ACTION:request_privileged_token'),
    'Cashier cannot see profits'
  );

  console.log(`\n🎉 Package 6 Section 6 (30 Egyptian Colloquial Questions + RBAC) Passed: ${passed}/30 + RBAC!`);
}

runTests();
