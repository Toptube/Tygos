/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PotentialVarianceCause,
  TheoreticalVsActualVariance,
  TraceableStockMovement,
} from '../domain/types.ts';

export interface ConsumptionInputItem {
  ingredientId: string;
  ingredientNameAr: string;
  ingredientNameEn: string;
  unit: string;
  unitCost: number;
  theoreticalConsumption: number;
  actualConsumption: number;
  recordedWasteQuantity: number;
}

/**
 * Evaluates Theoretical vs Actual Consumption and computes objective cause probabilities
 */
export function evaluateTheoreticalVsActual(
  items: ConsumptionInputItem[]
): TheoreticalVsActualVariance[] {
  return items.map((item) => {
    const varianceQuantity = item.actualConsumption - item.theoreticalConsumption;
    const varianceCostValue = varianceQuantity * item.unitCost;
    const variancePercentage =
      item.theoreticalConsumption > 0
        ? (varianceQuantity / item.theoreticalConsumption) * 100
        : 0;
    const unexplainedVariance = Math.max(0, varianceQuantity - item.recordedWasteQuantity);

    const potentialCauses: {
      cause: PotentialVarianceCause;
      probabilityScore: number;
      evidenceNotesAr: string;
      evidenceNotesEn: string;
    }[] = [];

    if (varianceQuantity > 0) {
      // 1. Recorded Waste analysis
      if (item.recordedWasteQuantity > 0) {
        const wasteRatio = (item.recordedWasteQuantity / varianceQuantity) * 100;
        potentialCauses.push({
          cause: 'waste_loss',
          probabilityScore: Math.min(95, Math.round(wasteRatio)),
          evidenceNotesAr: `تم تسجيل هالك رسمي بقيمة ${item.recordedWasteQuantity} ${item.unit} في سجلات التشغيل.`,
          evidenceNotesEn: `Official waste log registered ${item.recordedWasteQuantity} ${item.unit} during prep shifts.`,
        });
      }

      // 2. Over-portioning diagnosis
      if (variancePercentage > 5 && variancePercentage <= 15) {
        potentialCauses.push({
          cause: 'over_portioning',
          probabilityScore: 68,
          evidenceNotesAr: 'انحراف طفيف مستمر يشير لاحتمال زيادة حجم الحصص على خط الخدمة دون استخدام الموازين المعيارية.',
          evidenceNotesEn: 'Consistent moderate variance points to potential portioning drift without precision scales on service line.',
        });
      }

      // 3. Recipe trim / yield loss
      if (variancePercentage > 12) {
        potentialCauses.push({
          cause: 'production_trim_loss',
          probabilityScore: 54,
          evidenceNotesAr: 'اختلاف في نسبة العائد أو استخلاص الذبائح والتنظيف مقارنة بالمواصفة القياسية.',
          evidenceNotesEn: 'Yield extraction and butchery trim variance differing from standard yield specifications.',
        });
      }

      // 4. Stock count or measurement mismatch
      potentialCauses.push({
        cause: 'stock_count_error',
        probabilityScore: 35,
        evidenceNotesAr: 'احتمال خطأ في تسجيل الجرد الفعلي للمستودع أو إدخال وحدات قياس مختلفة.',
        evidenceNotesEn: 'Potential physical count discrepancy or packaging unit entry mismatch during stocktake.',
      });
    }

    // Sort causes by probability score descending
    potentialCauses.sort((a, b) => b.probabilityScore - a.probabilityScore);

    return {
      ingredientId: item.ingredientId,
      ingredientNameAr: item.ingredientNameAr,
      ingredientNameEn: item.ingredientNameEn,
      unit: item.unit,
      unitCost: item.unitCost,
      theoreticalConsumption: item.theoreticalConsumption,
      actualConsumption: item.actualConsumption,
      varianceQuantity,
      varianceCostValue,
      variancePercentage,
      recordedWasteQuantity: item.recordedWasteQuantity,
      unexplainedVariance,
      potentialCauses,
      recommendedAuditActionAr:
        variancePercentage > 10
          ? 'يوصى بمطابقة موازين التحضير في المطبخ ومراجعة سجلات استلام الموردين للأسبوع الجاري.'
          : 'متابعة دورية مع الشيف المسؤول للتأكد من الالتزام بحصص الوصفة المعيارية.',
      recommendedAuditActionEn:
        variancePercentage > 10
          ? 'Recommend calibration check of kitchen portion scales and review of supplier receiving weights.'
          : 'Routine follow-up with executive chef to maintain adherence to standard portion SOPs.',
    };
  });
}
