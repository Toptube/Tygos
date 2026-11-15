/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * IN-APP UI & MOBILE GEOMETRY INSPECTOR (Package 6 - Section 3)
 * Hidden Owner / General Manager diagnostic tool ("فاحص الواجهة والموبايل").
 * Inspects rendered DOM geometry, overflow, missing modal close controls, mixed
 * English words inside Arabic text, forbidden '$' currency signs, Eastern
 * digits mismatches, small touch targets (<44x44px), and captured runtime errors.
 *
 * Explicitly states that it inspects DOM geometry & runtime errors only,
 * NOT human aesthetic visual quality.
 */

import React, { useState } from 'react';
import {
  ScanSearch,
  Play,
  Copy,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  AlertOctagon,
} from 'lucide-react';
import { Button } from '../common/Button.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { SCREEN_REGISTRY } from '../../services/screenRegistry.ts';
import { errorLogService } from '../../services/errorLogService.ts';

export type InspectorIssueType =
  | 'فيض أفقي للصفحة'
  | 'عنصر خارج الشاشة'
  | 'احتمال قص نص'
  | 'نافذة بلا زر إغلاق'
  | 'إنجليزي في نص عربي'
  | 'رمز دولار غير معتمد'
  | 'أرقام مشرقية ظاهرة'
  | 'زر لمس أصغر من 44px'
  | 'خطأ تشغيل بالواجهة';

export interface InspectorFinding {
  id: string;
  viewId: string;
  screenNameAr: string;
  issueType: InspectorIssueType;
  elementDesc: string;
  suggestionAr: string;
}

const ALLOWED_LATIN_WORDS = new Set([
  'TYGOS',
  'QR',
  'VIP',
  'PIN',
  'WAC',
  'FIFO',
  'KDS',
  'POS',
  'CRM',
  'PDF',
  'CSV',
  'JSON',
  'TXT',
  'EGP',
  'VAT',
  'LAN',
  'GPS',
  'HTTP',
  'HTTPS',
  'URL',
  'RTL',
  'LTR',
  'API',
  'USB',
  'ESC',
]);

/**
 * Pure inspectable DOM scanner that works in both real browsers (phone/desktop)
 * and JSDOM test environments.
 */
export function inspectDomForIssues(
  viewId: string,
  screenNameAr: string,
  rootElement: HTMLElement = document.body,
  options: {
    checkTouchTargets?: boolean;
    checkEasternDigits?: boolean;
    viewportWidth?: number;
  } = {}
): InspectorFinding[] {
  const findings: InspectorFinding[] = [];
  const docEl = rootElement.ownerDocument?.documentElement;
  const win = rootElement.ownerDocument?.defaultView || (typeof window !== 'undefined' ? window : null);
  const viewportWidth = options.viewportWidth ?? (win?.innerWidth || docEl?.clientWidth || 390);
  let seq = 0;

  const pushFinding = (
    issueType: InspectorIssueType,
    elementDesc: string,
    suggestionAr: string
  ) => {
    seq += 1;
    findings.push({
      id: `${viewId}-${seq}-${issueType}`,
      viewId,
      screenNameAr,
      issueType,
      elementDesc,
      suggestionAr,
    });
  };

  // 1. Page horizontal overflow
  if (docEl && docEl.scrollWidth > docEl.clientWidth + 2 && docEl.clientWidth > 0) {
    pushFinding(
      'فيض أفقي للصفحة',
      `html (scrollWidth=${docEl.scrollWidth} > clientWidth=${docEl.clientWidth})`,
      'أضف overflow-x-hidden للحاوية الرئيسية أو لف الجداول في حاوية overflow-x-auto.'
    );
  }

  // 2. Open modals without close button
  const dialogs = rootElement.querySelectorAll('[role="dialog"]');
  dialogs.forEach((dialog, index) => {
    const closeControl =
      dialog.querySelector('[data-testid="modal-close-button"]') ||
      dialog.querySelector('[aria-label="إغلاق"]') ||
      Array.from(dialog.querySelectorAll('button')).find((b) =>
        /إغلاق|رجوع|إلغاء|×|close/i.test(b.textContent || b.getAttribute('aria-label') || '')
      );
    if (!closeControl) {
      pushFinding(
        'نافذة بلا زر إغلاق',
        `dialog #${index + 1}`,
        'غلف النافذة بمكوّن ModalShell أو أضف زر إغلاق صريح بمقاس 44×44px.'
      );
    }
  });

  // 3. Elements overflow / clipped / touch target inspection
  const elements = rootElement.querySelectorAll('*');
  elements.forEach((node) => {
    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    if (!tag || tag === 'script' || tag === 'style' || tag === 'svg' || tag === 'path') return;

    const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
    if (rect && rect.width > 0 && rect.height > 0) {
      if (rect.right > viewportWidth + 4 || rect.left < -4) {
        const cls = el.className && typeof el.className === 'string' ? el.className.split(' ').slice(0, 2).join('.') : '';
        pushFinding(
          'عنصر خارج الشاشة',
          `<${tag}${cls ? `.${cls}` : ''}> (يمين=${Math.round(rect.right)}, عرض=${Math.round(viewportWidth)})`,
          'تحقق من العرض الثابت (min-w) واجعله مرناً عبر w-full أو max-w-full.'
        );
      }

      if (
        (tag === 'button' || tag === 'a') &&
        options.checkTouchTargets !== false &&
        (rect.width < 44 || rect.height < 44)
      ) {
        const label = (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24);
        pushFinding(
          'زر لمس أصغر من 44px',
          `<${tag}> "${label || 'أيقونة'}" (${Math.round(rect.width)}×${Math.round(rect.height)}px)`,
          'ارفع min-h-[44px] min-w-[44px] لسهولة اللمس على الهاتف.'
        );
      }
    }

    // Text clipping check
    if (
      (tag === 'button' || tag === 'span' || tag === 'h1' || tag === 'h2' || tag === 'h3') &&
      el.clientWidth > 0 &&
      el.scrollWidth > el.clientWidth + 6 &&
      !String(el.className || '').includes('truncate') &&
      !String(el.className || '').includes('overflow-x')
    ) {
      pushFinding(
        'احتمال قص نص',
        `<${tag}> "${(el.textContent || '').trim().slice(0, 25)}"`,
        'اسمح بالتفاف النص (whitespace-normal) أو وسّع الحاوية.'
      );
    }
  });

  // 4. Language purity, '$' symbol & Eastern digits inside text nodes
  const walker = rootElement.ownerDocument.createTreeWalker(
    rootElement,
    4 /* NodeFilter.SHOW_TEXT */
  );
  let textNode: Node | null;
  const seenTextSamples = new Set<string>();

  while ((textNode = walker.nextNode())) {
    const parentEl = textNode.parentElement;
    if (!parentEl) continue;
    const pTag = parentEl.tagName?.toLowerCase();
    if (pTag === 'script' || pTag === 'style' || parentEl.closest('[data-inspector-ignore="true"]')) {
      continue;
    }

    const txt = (textNode.textContent || '').trim();
    if (!txt) continue;

    // '$' symbol check
    if (txt.includes('$') && !seenTextSamples.has(`$:${txt}`)) {
      seenTextSamples.add(`$:${txt}`);
      pushFinding(
        'رمز دولار غير معتمد',
        `نص: "${txt.slice(0, 40)}"`,
        'استبدل علامة $ بالعملة الرسمية «ج.م».'
      );
    }

    // Mixed English in Arabic UI text (has Arabic chars AND standalone 3+ letter Latin words not in allowlist)
    const hasArabic = /[\u0600-\u06FF]/.test(txt);
    if (hasArabic) {
      const latinTokens = txt.match(/\b[A-Za-z]{3,}\b/g) || [];
      const badTokens = latinTokens.filter((w) => !ALLOWED_LATIN_WORDS.has(w.toUpperCase()));
      if (badTokens.length > 0 && !seenTextSamples.has(`en:${badTokens[0]}:${txt.slice(0, 20)}`)) {
        seenTextSamples.add(`en:${badTokens[0]}:${txt.slice(0, 20)}`);
        pushFinding(
          'إنجليزي في نص عربي',
          `كلمة "${badTokens[0]}" داخل "${txt.slice(0, 36)}"`,
          'عرّب المصطلح ليكون مفهوماً للمستخدم العربي بلا حروف أجنبية.'
        );
      }
    }

    // Eastern digits check
    if (options.checkEasternDigits && /[٠-٩]/.test(txt) && !seenTextSamples.has(`ed:${txt.slice(0, 20)}`)) {
      seenTextSamples.add(`ed:${txt.slice(0, 20)}`);
      pushFinding(
        'أرقام مشرقية ظاهرة',
        `نص: "${txt.slice(0, 36)}"`,
        'تأكد من تنسيق الأرقام بالصيغة المعتمدة في الإعدادات (0-9).'
      );
    }
  }

  return findings;
}

export const UiInspectorModule: React.FC<{
  onNavigateView?: (viewId: string) => void;
}> = ({ onNavigateView }) => {
  const { currentUser, currentEstablishment, setActiveView } = useAuth();
  const { showToast } = useToast();
  const estId = currentEstablishment?.id || 'default';

  const isAuthorized =
    currentUser?.role === 'tenant_admin' ||
    currentUser?.role === 'general_manager' ||
    currentUser?.role === 'super_admin';

  const [findings, setFindings] = useState<InspectorFinding[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [includeModalsNote, setIncludeModalsNote] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [viewportInfo, setViewportInfo] = useState(() =>
    typeof window !== 'undefined' ? `${window.innerWidth} × ${window.innerHeight}` : 'غير متاح'
  );

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4" dir="rtl">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          شاشة مقصورة على المالك والمدير العام
        </h2>
        <Button type="button" variant="primary" size="sm" onClick={() => setActiveView('dashboard')}>
          رجوع للرئيسية
        </Button>
      </div>
    );
  }

  const runCurrentScreenScan = () => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
    setViewportInfo(`${vw} × ${vh}`);

    const list = inspectDomForIssues('ui_inspector', 'الشاشة الحالية', document.body, {
      viewportWidth: vw,
      checkTouchTargets: true,
      checkEasternDigits: false,
    });

    // Include captured runtime errors from errorLogService
    const runtimeErrors = errorLogService.getErrors(estId);
    runtimeErrors.slice(0, 10).forEach((err, i) => {
      list.push({
        id: `err-item-${i}`,
        viewId: err.viewId,
        screenNameAr: err.viewId,
        issueType: 'خطأ تشغيل بالواجهة',
        elementDesc: err.message.slice(0, 60),
        suggestionAr: 'افتح سجل الأخطاء لمراجعة تفاصيل الاستدعاء وإصلاح العطل.',
      });
    });

    setFindings(list);
    setScannedCount(1);
    setHasRun(true);
    showToast({
      title: `تم فحص DOM الفعلي (${list.length} ملاحظة)`,
      type: list.length === 0 ? 'success' : 'warning',
    });
  };

  const runAllScreensScan = async () => {
    setIsScanning(true);
    const collected: InspectorFinding[] = [];
    const screensToInspect = SCREEN_REGISTRY.filter(
      (s) => s.viewId !== 'ui_inspector' && s.viewId !== 'error_log'
    );

    const navigate = onNavigateView || setActiveView;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const origConsoleError = console.error;
    const capturedConsole: { viewId: string; msg: string }[] = [];

    console.error = (...args: unknown[]) => {
      capturedConsole.push({
        viewId: 'console',
        msg: args.map((a) => String(a)).join(' ').slice(0, 100),
      });
      origConsoleError.apply(console, args);
    };

    try {
      // Inspect current rendered DOM immediately across listed routes if router permits returning cleanly
      if (typeof onNavigateView === 'function') {
        for (const scr of screensToInspect) {
          navigate(scr.viewId);
          await new Promise((r) => setTimeout(r, 80));
          const issues = inspectDomForIssues(scr.viewId, scr.nameAr, document.body, {
            viewportWidth: vw,
            checkTouchTargets: true,
          });
          collected.push(...issues);
        }
        navigate('ui_inspector');
      } else {
        // Fallback inside standard runtime: run inspection on current DOM + runtime logs
        const issues = inspectDomForIssues('all_screens', 'الشاشات المحمّلة', document.body, {
          viewportWidth: vw,
          checkTouchTargets: true,
        });
        collected.push(...issues);
      }

      capturedConsole.forEach((ce, idx) => {
        collected.push({
          id: `console-err-${idx}`,
          viewId: ce.viewId,
          screenNameAr: 'وحدة التحكم',
          issueType: 'خطأ تشغيل بالواجهة',
          elementDesc: ce.msg,
          suggestionAr: 'تتبع التحذير أو الخطأ البرمجي في كود الشاشة.',
        });
      });

      const loggedErrs = errorLogService.getErrors(estId);
      loggedErrs.slice(0, 10).forEach((e, idx) => {
        collected.push({
          id: `logged-err-${idx}`,
          viewId: e.viewId,
          screenNameAr: e.viewId,
          issueType: 'خطأ تشغيل بالواجهة',
          elementDesc: e.message.slice(0, 80),
          suggestionAr: 'راجع سجل الأخطاء لمعرفة السبب وإعادة المحاولة.',
        });
      });

      setFindings(collected);
      setScannedCount(typeof onNavigateView === 'function' ? screensToInspect.length : 1);
      setHasRun(true);
    } finally {
      console.error = origConsoleError;
      setIsScanning(false);
    }
  };

  const buildReportText = () => {
    const header = [
      `تقرير فاحص الواجهة والموبايل - منظومة TYGOS`,
      `التاريخ: ${new Date().toISOString()}`,
      `مقاس الشاشة الفعلي: ${viewportInfo}`,
      `عدد الشاشات المفحوصة: ${scannedCount}`,
      `إجمالي الملاحظات: ${findings.length}`,
      `تنبيه: الفحص يغطي هندسة العناصر الظاهرة وأخطاء التشغيل فقط ولا يُغني عن المراجعة البصرية اليدوية.`,
      `--------------------------------------------------`,
    ].join('\n');

    if (findings.length === 0) return `${header}\nلا توجد ملاحظات مسجلة في هذا الفحص.`;

    const lines = findings.map(
      (f, idx) =>
        `${idx + 1}. الشاشة: ${f.screenNameAr} (${f.viewId}) | النوع: ${f.issueType}\n   العنصر: ${f.elementDesc}\n   الاقتراح: ${f.suggestionAr}`
    );
    return `${header}\n\n${lines.join('\n\n')}`;
  };

  const handleCopyReport = () => {
    const txt = buildReportText();
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).catch(() => {});
    }
    showToast({ title: 'تم نسخ تقرير فحص الواجهة ✓', type: 'success' });
  };

  const handleDownloadReport = () => {
    const txt = buildReportText();
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tygos-ui-inspection-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast({ title: 'تم تنزيل تقرير الفحص ✓', type: 'success' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-12" dir="rtl" data-testid="ui-inspector-module">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 dark:text-cyan-400 mb-1">
            <ScanSearch className="w-4 h-4" />
            <span>أداة فحص داخلية للمالك والمدير العام</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            فاحص الواجهة والموبايل
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            عرض الجهاز الحالي: <strong className="font-mono text-slate-800 dark:text-slate-200">{viewportInfo}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isScanning}
            onClick={runCurrentScreenScan}
            data-testid="inspector-scan-current-btn"
            className="gap-1.5 font-bold"
          >
            <Play className="w-4 h-4" />
            <span>فحص الشاشة الحالية</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isScanning}
            onClick={runAllScreensScan}
            data-testid="inspector-scan-all-btn"
            className="gap-1.5 font-bold"
          >
            <ScanSearch className="w-4 h-4 text-cyan-600" />
            <span>{isScanning ? 'جاري الفحص...' : 'فحص كل الشاشات'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveView('error_log')}
            className="gap-1.5 font-bold"
          >
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            <span>سجل الأخطاء</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveView('settings')}
            className="gap-1.5 font-bold"
          >
            <ArrowRight className="w-4 h-4" />
            <span>الإعدادات</span>
          </Button>
        </div>
      </div>

      {/* Explicit Honesty Notice */}
      <div
        className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200"
        data-inspector-ignore="true"
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <div className="space-y-1">
          <p className="font-bold">نطاق الفحص الصادق:</p>
          <p className="leading-relaxed">
            يفحص هذا الفاحص هندسة العناصر الظاهرة داخل المتصفح الفعلي وأخطاء التشغيل فقط (الفيض الأفقي، تداخل النوافذ، أزرار الإغلاق، مقاسات اللمس أقل من 44 بكسل، خلط الإنجليزية بالعربية، أو ظهور رمز الدولار غير المعتمد)؛ ولا يُغني عن الفحص البصري البشري لتناسق الألوان والأحجام على هاتف حقيقي.
          </p>
        </div>
      </div>

      {/* Modals Option + Export Actions */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={includeModalsNote}
            onChange={(e) => setIncludeModalsNote(e.target.checked)}
            className="w-4 h-4 accent-cyan-600"
          />
          <span>فحص النوافذ المنبثقة المفتوحة أيضاً والتحقق من وجود زر إغلاق</span>
        </label>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyReport}
            disabled={!hasRun}
            data-testid="inspector-copy-report-btn"
            className="gap-1.5 font-bold"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ التقرير</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            disabled={!hasRun}
            data-testid="inspector-download-report-btn"
            className="gap-1.5 font-bold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل التقرير</span>
          </Button>
        </div>
      </div>

      {/* Results Table */}
      {hasRun && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm font-black text-slate-900 dark:text-white">
              نتائج الفحص ({findings.length} ملاحظة)
            </span>
            {findings.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
                <span>لم تُرصد ملاحظات في هذا الفحص</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                <AlertTriangle className="w-4 h-4" />
                <span>يرجى مراجعة البنود المرصودة أدناه</span>
              </span>
            )}
          </div>

          {findings.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3 text-start">الشاشة</th>
                    <th className="py-3 px-3 text-start">نوع المشكلة</th>
                    <th className="py-3 px-3 text-start">العنصر</th>
                    <th className="py-3 px-3 text-start">الاقتراح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {findings.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        {item.screenNameAr}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold">
                          {item.issueType}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {item.elementDesc}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {item.suggestionAr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
