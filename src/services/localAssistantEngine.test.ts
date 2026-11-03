/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Standalone Unit Verification for TYGOS Local Assistant Engine
 */

import { localAssistantEngine } from './localAssistantEngine.ts';
import { buildAppContextSnapshot } from './appContextSnapshot.ts';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runTests() {
  console.log('🧪 Running Local Assistant Engine Tests...\n');

  const adminContext = buildAppContextSnapshot('dashboard', { role: 'tenant_admin', fullName: 'Alexander' }, [], [], []);
  const cashierContext = buildAppContextSnapshot('pos', { role: 'cashier', fullName: 'Maya' }, [], [], []);

  // 1. Screen Registry Dynamic Match: "كاشير"
  const res1 = await localAssistantEngine.ask(adminContext, 'عايز افتح شاشة الكاشير', 'ar');
  assert(
    Boolean(res1.suggestedActions?.some((a) => a.action === 'NAV:pos')),
    'Assistant maps "كاشير" to NAV:pos via central Screen Registry'
  );

  // 2. Direct Action: "اضف خامه"
  const res2 = await localAssistantEngine.ask(adminContext, 'اضف خامه جديده', 'ar');
  assert(
    Boolean(res2.suggestedActions?.some((a) => a.action === 'ACTION:open_add_ingredient')),
    'Assistant recognizes intent to add raw material'
  );

  // 3. Calculation Explanation: "ازاي بتحسبوا التكلفه"
  const res3 = await localAssistantEngine.ask(adminContext, 'ازاي بتحسبوا تكلفة الاطباق', 'ar');
  assert(
    res3.contentAr.includes('المكونات الصافية') && res3.contentAr.includes('هالك التشفية'),
    'Assistant explains True Product Cost formula breakdown'
  );

  // 4. RBAC Protection: Cashier asking for profits
  const res4 = await localAssistantEngine.ask(cashierContext, 'كم أرباح المنشأة هذا الشهر؟', 'ar');
  assert(
    Boolean(res4.suggestedActions?.some((a) => a.action === 'ACTION:request_privileged_token')),
    'Assistant protects profit data from cashier and prompts for temporary token delegation'
  );

  // 5. Typo tolerance: "وصفه الـ bom"
  const res5 = await localAssistantEngine.ask(adminContext, 'فين وصفات الـ bom', 'ar');
  assert(
    Boolean(res5.suggestedActions?.some((a) => a.action === 'NAV:menu')),
    'Assistant handles English/Arabic mix and maps "BOM" to NAV:menu'
  );

  console.log('\n🎉 ALL LOCAL ASSISTANT TESTS PASSED SUCCESSFULLY!\n');
}

runTests();
