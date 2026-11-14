/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PREPARATION CARD MODAL (كارت التجهيز الشامل - Package 4)
 *
 * Displays:
 * - Current formula & ingredients with live raw material costs.
 * - Yield, unit cost, named portions, and cost per portion.
 * - Affected menu products with their true costs and margins.
 * - Cumulative consumption through POS sales with raw material equivalents.
 * - Audit history of formula modifications.
 * - Batches history if batch tracking is active.
 * - Printable view.
 */

import React, { useState } from 'react';
import {
  Layers,
  Printer,
  Calendar,
  ChefHat,
  TrendingUp,
  Package,
  History,
  AlertTriangle,
  Scale,
  UtensilsCrossed,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ModalShell } from '../common/ModalShell.tsx';
import { Button } from '../common/Button.tsx';
import {
  semiFinishedService,
  SemiFinishedItem,
  PREP_UNIT_CONVERSIONS,
} from '../../services/semiFinishedService.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { warehouseService } from '../../services/warehouseService.ts';

interface PreparationCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  preparationId: string | null;
  onOpenBatchModal?: (prep: SemiFinishedItem) => void;
}

export const PreparationCardModal: React.FC<PreparationCardModalProps> = ({
  isOpen,
  onClose,
  preparationId,
  onOpenBatchModal,
}) => {
  const { currentEstablishment, currentUser } = useAuth();
  const establishmentId = currentEstablishment?.id || 'default';
  const isChef =
    currentUser?.role === 'head_chef' ||
    currentUser?.role === 'kitchen_manager' ||
    currentUser?.role === 'section_manager' ||
    currentUser?.role === 'bar_manager';

  const [activeTab, setActiveTab] = useState<'formula' | 'portions' | 'products' | 'consumption' | 'batches' | 'history'>('formula');

  if (!isOpen || !preparationId) return null;

  const prep = semiFinishedService.getPreparationById(establishmentId, preparationId);
  if (!prep) return null;

  const affectedProducts = semiFinishedService.getAffectedProducts(establishmentId, prep.id);
  const cumulative = semiFinishedService.getCumulativeConsumption(establishmentId, prep.id);
  const costInfo = semiFinishedService.calculatePreparationUnitCost(establishmentId, prep);

  const fmtCurrency = (num: number) => {
    return `${Number(num.toFixed(2)).toLocaleString('ar-EG')} ج.م`;
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={`كارت التجهيز: ${prep.nameAr} (${prep.code})`}
      size="xl"
    >
      <div className="space-y-5" dir="rtl">
        {/* Top Summary Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {prep.code}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                  {prep.category}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {prep.type === 'compound' ? 'مركّب (صيغة)' : prep.type === 'processing' ? 'معالجة بطهي' : 'حصص'}
                </span>
                {prep.enableBatchTracking ? (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    دفعات مسجلة (رصيد: {prep.currentBatchStock} {prep.yieldUnit})
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    على الصيغة (افتراضي - لا رصيد)
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {prep.nameAr}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isChef && (
              <div className="text-start p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="block text-[11px] font-bold text-slate-500">
                  تكلفة الوحدة المحسوبة:
                </span>
                <span className="text-sm font-mono font-extrabold text-cyan-700 dark:text-cyan-400">
                  {fmtCurrency(costInfo.unitCost)} / {prep.yieldUnit}
                </span>
              </div>
            )}
            <div className="text-start p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="block text-[11px] font-bold text-slate-500">
                الناتج المعياري للصيغة:
              </span>
              <span className="text-sm font-mono font-extrabold text-slate-800 dark:text-slate-100">
                {prep.totalYield} {prep.yieldUnit}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('formula')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'formula'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            الصيغة والمكونات ({prep.ingredients.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portions')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'portions'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            الحصص المعيارية ({prep.portions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'products'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            المنتجات المتأثرة ({affectedProducts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('consumption')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'consumption'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            الاستهلاك التراكمي
          </button>

          {prep.enableBatchTracking && (
            <button
              type="button"
              onClick={() => setActiveTab('batches')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'batches'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              سجل الدفعات ({prep.batches?.length || 0})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            سجل التعديلات ({prep.auditHistory.length})
          </button>
        </div>

        {/* Tab 1: Formula & Ingredients */}
        {activeTab === 'formula' && (
          <div className="space-y-4">
            {prep.type === 'processing' ? (
              <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-xs text-cyan-900 dark:text-cyan-200">
                <p className="font-bold mb-1">معالجة خامة واحدة بطهي أو تنظيف:</p>
                <p>
                  الخامة الأولية:{' '}
                  <strong>{prep.processingMaterialNameAr || 'خامة معالجة'}</strong>.
                  كل <strong>{prep.processingRawQty} جم نيء</strong> تصبح{' '}
                  <strong>{prep.processingCookedQty} جم مطهو</strong> (معامل ناتج: {((prep.processingCookedQty || 100) / (prep.processingRawQty || 50)).toFixed(1)}).
                  التكلفة والخصم من المخزن يُحسبان دائماً بالكمية النيئة.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">#</th>
                      <th className="p-3 text-start">النوع</th>
                      <th className="p-3 text-start">المكوّن</th>
                      <th className="p-3 text-start">الكمية بالصيغة</th>
                      <th className="p-3 text-start">الوحدة</th>
                      <th className="p-3 text-start">هالك إعداد</th>
                      {!isChef && <th className="p-3 text-start">سعر الوحدة</th>}
                      {!isChef && <th className="p-3 text-start">إجمالي التكلفة</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {prep.ingredients.map((ing, idx) => (
                      <tr key={ing.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ing.type === 'raw_material'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                            }`}
                          >
                            {ing.type === 'raw_material' ? 'خامة' : 'تجهيز متداخل'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {ing.itemNameAr}
                        </td>
                        <td className="p-3 font-mono font-bold">{ing.quantity}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{ing.unit}</td>
                        <td className="p-3 font-mono text-slate-500">
                          {ing.wastePercent ? `%${ing.wastePercent}` : '0%'}
                        </td>
                        {!isChef && (
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                            {fmtCurrency(ing.unitCostSnapshot || 0)}
                          </td>
                        )}
                        {!isChef && (
                          <td className="p-3 font-mono font-bold text-cyan-700 dark:text-cyan-400">
                            {fmtCurrency(ing.totalCostSnapshot || 0)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Named Portions */}
        {activeTab === 'portions' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              الحصص المعيارية المسمّاة التي يستخدمها الشيف أو الكاشير في الأطباق (تُحوّل تلقائياً لوحدة الناتج ثم للخام النيء):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prep.portions.map((portion) => (
                <div
                  key={portion.id}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-cyan-600" />
                      {portion.nameAr}
                    </span>
                    {!isChef && (
                      <span className="text-xs font-mono font-black text-cyan-700 dark:text-cyan-400">
                        {fmtCurrency(portion.calculatedCost)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>وزن / حجم الحصة:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {portion.sizeInYieldUnits} {prep.yieldUnit}
                    </span>
                  </div>
                  {portion.descriptionAr && (
                    <p className="text-[11px] text-slate-500">{portion.descriptionAr}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Affected Products */}
        {activeTab === 'products' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              الأطباق والمنتجات في قائمة الطعام التي تعتمد على هذا التجهيز (تتأثر تكاليفها وهوامش ربحها فورياً بأي تغيير في سعر الخامات):
            </p>
            {affectedProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl">
                لا توجد منتجات تستخدم هذا التجهيز حالياً.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">الطبق</th>
                      <th className="p-3 text-start">القسم</th>
                      <th className="p-3 text-start">سعر البيع</th>
                      <th className="p-3 text-start">التكلفة الإجمالية</th>
                      <th className="p-3 text-start">نسبة تكلفة الطعام</th>
                      <th className="p-3 text-start">هامش الربح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {affectedProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {p.nameAr}
                        </td>
                        <td className="p-3 text-slate-500">{p.category}</td>
                        <td className="p-3 font-mono font-bold text-cyan-700 dark:text-cyan-400">
                          {fmtCurrency(p.sellingPrice)}
                        </td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                          {fmtCurrency(p.trueCost)}
                        </td>
                        <td className="p-3 font-mono text-amber-600 font-bold">
                          {p.foodCostPercentage}%
                        </td>
                        <td className="p-3 font-mono text-emerald-600 font-bold">
                          {p.grossMarginPercentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Cumulative Consumption */}
        {activeTab === 'consumption' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="block text-xs font-bold text-slate-500">
                  إجمالي الوحدات المستهلكة عبر المبيعات:
                </span>
                <span className="text-xl font-mono font-black text-cyan-700 dark:text-cyan-400 mt-1 block">
                  {cumulative.totalUnitsConsumed} {prep.yieldUnit}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="block text-xs font-bold text-slate-500">
                  إجمالي قيمة الخامات المصروفة:
                </span>
                <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {fmtCurrency(cumulative.totalCostEgp)}
                </span>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              الخامات الأولية المسحوبة من المخزن عبر هذا التجهيز:
            </h4>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-900/60 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 text-start">الخامة الأولية</th>
                    <th className="p-3 text-start">الكمية المسحوبة</th>
                    <th className="p-3 text-start">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(cumulative.equivalentRawConsumed).map(([matId, data]) => (
                    <tr key={matId}>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {data.materialNameAr}
                      </td>
                      <td className="p-3 font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        {data.quantity}
                      </td>
                      <td className="p-3 text-slate-500">{data.unit}</td>
                    </tr>
                  ))}
                  {Object.keys(cumulative.equivalentRawConsumed).length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-400">
                        لم تُسجل مبيعات على هذا التجهيز حتى الآن.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Batches Ledger */}
        {activeTab === 'batches' && prep.enableBatchTracking && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                سجل تشغيل الدفعات المحضرة للشيف والمطبخ المركزي:
              </p>
              {onOpenBatchModal && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenBatchModal(prep)}
                  className="gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>تجهيز دفعة جديدة</span>
                </Button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-900/60 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 text-start">التاريخ</th>
                    <th className="p-3 text-start">المنفّذ</th>
                    <th className="p-3 text-start">عدد الدفعات</th>
                    <th className="p-3 text-start">الناتج الفعلي</th>
                    <th className="p-3 text-start">الانحراف عن القياسي</th>
                    <th className="p-3 text-start">تكلفة الدفعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(prep.batches || []).map((batch) => (
                    <tr key={batch.id}>
                      <td className="p-3 font-mono text-slate-600">
                        {batch.date.split('T')[0]}
                      </td>
                      <td className="p-3 font-bold">{batch.actorName}</td>
                      <td className="p-3 font-mono">{batch.batchCount}</td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {batch.actualYieldBase} {prep.yieldUnit}
                      </td>
                      <td className="p-3 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            batch.yieldVariancePercent === 0
                              ? 'bg-slate-100 text-slate-700'
                              : batch.yieldVariancePercent > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {batch.yieldVariancePercent > 0 ? '+' : ''}
                          {batch.yieldVariancePercent}%
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        {fmtCurrency(batch.batchCostEgp)}
                      </td>
                    </tr>
                  ))}
                  {(!prep.batches || prep.batches.length === 0) && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        لم يتم تسجيل أي دفعات لهذا التجهيز بعد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Audit History */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              سجل التعديلات والقرارات على صيغة التجهيز (لا يؤثر بأثر رجعي على المبيعات السابقة):
            </p>
            <div className="space-y-2">
              {prep.auditHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.action}
                      </span>
                      <span className="text-slate-400">بواسطة [{item.user}]</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mt-1">{item.details}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {new Date(item.timestamp).toLocaleString('ar-EG')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </ModalShell>
  );
};
