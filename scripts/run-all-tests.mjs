/**
 * TYGOS Unified Test Suite Runner (`npm run test:all`)
 * Discovers and runs every *.test.ts and *.test.tsx file across src/
 * using Node's native test runner with tsx loader and prints an honest pass/fail summary.
 */

import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const SRC_DIR = join(ROOT_DIR, 'src');

function collectTestFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...collectTestFiles(full));
    } else if (/\.test\.(ts|tsx|mjs|js)$/.test(entry)) {
      results.push(relative(ROOT_DIR, full).replace(/\\/g, '/'));
    }
  }
  return results.sort();
}

const files = collectTestFiles(SRC_DIR);
console.log(`\n🧪 تشغيل جميع الاختبارات الآلية (${files.length} ملف)...\n`);

const rows = [];
let totalFailed = 0;

for (const file of files) {
  const started = Date.now();
  const proc = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--test', file],
    {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      env: { ...process.env, NODE_NO_WARNINGS: '1' },
    }
  );
  const durationMs = Date.now() - started;
  const output = `${proc.stdout || ''}\n${proc.stderr || ''}`;
  const passLines = (output.match(/# ✅/g) || []).length;
  const okCount = (output.match(/^ok \d+/gm) || []).length;
  const checks = Math.max(passLines, okCount, proc.status === 0 ? 1 : 0);

  const ok = proc.status === 0;
  if (!ok) totalFailed += 1;

  rows.push({
    file,
    ok,
    checks,
    durationMs,
    errorSnippet: ok ? '' : output.split('\n').filter((l) => l.includes('ERR_') || l.includes('Error') || l.includes('❌')).slice(0, 4).join(' | '),
  });

  console.log(`${ok ? '✅ PASS' : '❌ FAIL'}  ${file.padEnd(46)} (${checks} تحقق · ${durationMs}ms)`);
  if (!ok && rows[rows.length - 1].errorSnippet) {
    console.log(`   ↳ ${rows[rows.length - 1].errorSnippet}`);
  }
}

console.log('\n==============================================================');
console.log(`📊 ملخص الاختبارات: ناجح ${rows.length - totalFailed}/${rows.length} ملف | فاشل ${totalFailed}`);
console.log('==============================================================\n');

process.exit(totalFailed > 0 ? 1 : 0);
