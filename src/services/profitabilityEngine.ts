/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BusinessRecommendation,
  ProfitDecompositionAnalysis,
  ProfitVarianceFactor,
  ProfitabilityBreakdown,
} from '../domain/types.ts';

/**
 * "Why did profit increase or decrease?"
 * Decomposes bottom-line variance into measurable business drivers
 */
export function analyzeProfitVarianceDrivers(
  baselineProfit: number,
  currentProfit: number,
  salesVolumeDeltaPercent: number,
  ingredientPriceDeltaPercent: number,
  wasteDeltaPercent: number,
  laborCostDeltaPercent: number,
  avgSellingPriceDeltaPercent: number
): ProfitDecompositionAnalysis {
  const netProfitChangeAmount = currentProfit - baselineProfit;
  const netProfitChangePercent =
    baselineProfit > 0 ? (netProfitChangeAmount / baselineProfit) * 100 : 0;

  const drivers: ProfitVarianceFactor[] = [
    {
      factorId: 'f-ingredient-prices',
      nameAr: 'تغير أسعار شراء المواد الخام من الموردين',
      nameEn: 'Ingredient Purchasing Price Fluctuation',
      impactAmount: -1 * Math.abs(baselineProfit * (ingredientPriceDeltaPercent / 100) * 0.45),
      percentageContribution: Math.round(ingredientPriceDeltaPercent * 4.2),
      direction: ingredientPriceDeltaPercent > 0 ? 'negative' : 'positive',
      descriptionAr: `ارتفاع تكلفة التوريد لبعض المواد الخام بنسبة ${ingredientPriceDeltaPercent}% أثر على هامش الربح الإجمالي.`,
      descriptionEn: `Supplier price increases of ${ingredientPriceDeltaPercent}% directly compressed the gross operational margin.`,
    },
    {
      factorId: 'f-kitchen-waste',
      nameAr: 'نسبة الهالك والفاقد المسجل في المطابخ',
      nameEn: 'Operational Waste & Scrap Variance',
      impactAmount: -1 * Math.abs(baselineProfit * (wasteDeltaPercent / 100) * 0.25),
      percentageContribution: Math.round(wasteDeltaPercent * 3.1),
      direction: wasteDeltaPercent > 0 ? 'negative' : 'positive',
      descriptionAr: `زيادة نسبة الهالك التشغيلي بنسبة ${wasteDeltaPercent}% ساهمت في ارتفاع تكلفة المبيعات.`,
      descriptionEn: `An increase of ${wasteDeltaPercent}% in kitchen prep waste contributed to higher COGS absorption.`,
    },
    {
      factorId: 'f-labor-shifts',
      nameAr: 'تكاليف العمالة والورديات الإضافية',
      nameEn: 'Labor & Overtime Shift Allocation',
      impactAmount: -1 * Math.abs(baselineProfit * (laborCostDeltaPercent / 100) * 0.3),
      percentageContribution: Math.round(laborCostDeltaPercent * 2.8),
      direction: laborCostDeltaPercent > 0 ? 'negative' : 'positive',
      descriptionAr: `تعديل ساعات العمل الإضافية بنسبة ${laborCostDeltaPercent}% خلال عطل نهاية الأسبوع.`,
      descriptionEn: `Overtime labor adjustments of ${laborCostDeltaPercent}% absorbed additional departmental payroll.`,
    },
    {
      factorId: 'f-sales-volume',
      nameAr: 'نمو حجم المبيعات والطلبات الكلية',
      nameEn: 'Sales Volume & Covers Expansion',
      impactAmount: Math.abs(baselineProfit * (salesVolumeDeltaPercent / 100) * 0.5),
      percentageContribution: Math.round(salesVolumeDeltaPercent * 5.0),
      direction: salesVolumeDeltaPercent > 0 ? 'positive' : 'negative',
      descriptionAr: `نمو حجم المبيعات الإجمالي بنسبة ${salesVolumeDeltaPercent}% حقق وفورات حجم وعوائد إضافية.`,
      descriptionEn: `Expansion of overall sales ticket volume by ${salesVolumeDeltaPercent}% generated positive scale revenue.`,
    },
  ];

  return {
    period: 'November 2026',
    comparedToPeriod: 'October 2026',
    revenueChangePercent: salesVolumeDeltaPercent + avgSellingPriceDeltaPercent,
    netProfitChangePercent,
    netProfitChangeAmount,
    primaryDrivers: drivers,
    managementConclusionAr:
      netProfitChangeAmount >= 0
        ? 'تحسن في صافي الربح مدفوعاً بزيادة حجم المبيعات وكفاءة التحضير بالرغم من الضغوط التضخمية لأسعار بعض الموردين.'
        : 'انخفاض في صافي الربح ناجم أساساً عن ارتفاع أسعار شراء المواد الخام والهالك في قسم اللحوم، مما يستدعي تدقيق الموردين وتفعيل الموازين المعيارية.',
    managementConclusionEn:
      netProfitChangeAmount >= 0
        ? 'Net profit improvement driven by volume growth and prep efficiency, overcoming moderate supplier price pressure.'
        : 'Net profit compression primarily caused by ingredient purchase price inflation and prep waste in the butchery station, calling for supplier price renegotiation.',
  };
}

/**
 * Recommendation Generation Engine
 */
export function generateSmartRecommendations(): BusinessRecommendation[] {
  return [
    {
      id: 'rec-001',
      titleAr: 'ارتفاع سعر توريد شريحة ترافل أنجوس بنسبة 14.2%',
      titleEn: 'Angus Truffle Ribeye Supplier Price Increase (+14.2%)',
      module: 'purchasing',
      priority: 'high',
      confidenceScore: 92,
      issueDescriptionAr: 'قام المورد المعتمد برفع سعر الكيلو إلى 315.00 ج.م دون موافقة مسبقة على قائمة الأسعار.',
      issueDescriptionEn: 'Approved meat purveyor raised kg price to 315.00 EGP outside agreed seasonal contract brackets.',
      measurableEvidenceAr: 'تم تسجيل فاتورة الشراء PO-2026-081 بسعر أعلى من متوسط التكلفة المرجحة (275.00 ج.م).',
      measurableEvidenceEn: 'Invoice PO-2026-081 billed at 315.00 EGP vs standard weighted average cost of 275.00 EGP.',
      possibleRootCauseAr: 'تقلبات سلاسل التوريد العالمية أو انتهاء مدة اتفاقية الشراء السنوية.',
      possibleRootCauseEn: 'Global livestock transport volatility or expiry of seasonal fixed-rate price lock.',
      recommendedActionAr: 'تفعيل المقارنة مع عروض الموردين البدلاء المعتمدين أو تثبيت كميات ربع سنوية.',
      recommendedActionEn: 'Initiate 3-way RFQ comparison with secondary approved vendor or execute 90-day volume forward purchase.',
      expectedFinancialImpactAr: 'توفير شهري متوقع يقدر بـ 14,200 ج.م في تكلفة المبيعات المباشرة.',
      expectedFinancialImpactEn: 'Estimated monthly COGS savings of 14,200 EGP across prime steak offerings.',
      actionRoute: 'purchasing',
    },
    {
      id: 'rec-002',
      titleAr: 'تجاوز تكلفة الأغذية المستهدفة لصنف بيتزا نابوليتانا (38.5% مقابل 30%)',
      titleEn: 'Food Cost Target Exceeded for Neapolitan Pizza (38.5% vs 30.0%)',
      module: 'menu',
      priority: 'medium',
      confidenceScore: 88,
      issueDescriptionAr: 'تكلفة مكونات جبن الموتزاريلا الطازج وزيت الزيتون البكر ترفع التكلفة الفعلية للحصة.',
      issueDescriptionEn: 'Artisan buffalo mozzarella and EVOO portion costs push effective cost above target ceiling.',
      measurableEvidenceAr: 'سعر البيع الحالي 145.00 ج.م مقابل تكلفة حصة 55.80 ج.م، مما يعطي نسبة تكلفة طعام 38.5%.',
      measurableEvidenceEn: 'Current selling price 145.00 EGP vs portion cost of 55.80 EGP yields 38.5% food cost ratio.',
      possibleRootCauseAr: 'عدم احتساب ارتفاع سعر الجبن المستورد في سعر البيع المعتمد منذ 6 أشهر.',
      possibleRootCauseEn: 'Import tariff drift on dairy items not adjusted in menu base price over past 6 months.',
      recommendedActionAr: 'إجراء تجربة سعرية عبر حاسبة التجربة لرفع السعر إلى 165.00 ج.م أو ضبط وزن الجبن إلى 125 جم.',
      recommendedActionEn: 'Simulate menu adjustment to 165.00 EGP or calibrate standardized cheese portioning to 125g.',
      expectedFinancialImpactAr: 'خفض نسبة تكلفة الطعام إلى 29.8% وزيادة العائد بمقدار 8,900 ج.م شهرياً.',
      expectedFinancialImpactEn: 'Restores food cost to 29.8% and captures 8,900 EGP additional monthly gross margin.',
      actionRoute: 'cost_control',
    },
    {
      id: 'rec-003',
      titleAr: 'انحراف غير مبرر في استهلاك شراب الماتشا العضوي في البار',
      titleEn: 'Unexplained Beverage Consumption Variance at Bar Station',
      module: 'cost_control',
      priority: 'high',
      confidenceScore: 85,
      issueDescriptionAr: 'الاستهلاك الفعلي للماتشا يتجاوز الاستهلاك النظري للوصفات بنسبة 16.4%.',
      issueDescriptionEn: 'Actual matcha syrup consumption exceeds theoretical recipe usage by 16.4%.',
      measurableEvidenceAr: 'الاستهلاك النظري بحسب مبيعات نقطة البيع: 42 لتر؛ الاستهلاك الفعلي للجرد: 48.9 لتر.',
      measurableEvidenceEn: 'Theoretical POS recipe consumption: 42.0L; actual warehouse stock decrease: 48.9L.',
      possibleRootCauseAr: 'سكب حر دون استخدام المكيال المعياري أو عدم تسجيل هالك التحضير الصباحي.',
      possibleRootCauseEn: 'Free-pouring without standard jiggers or unrecorded daily prep batch disposal.',
      recommendedActionAr: 'تدريب فريق الباريستا على المكاييل المعيارية وتفعيل ميزة تسجيل الهالك اللحظي من نقطة البيع.',
      recommendedActionEn: 'Mandate calibrated jigger usage for mixologists and enable real-time POS waste registration.',
      expectedFinancialImpactAr: 'استرداد 4,500 ج.م شهرياً ومنع الهدر التراكمي في قسم المشروبات.',
      expectedFinancialImpactEn: 'Recovers 4,500 EGP/month and prevents compounding beverage cost leakages.',
      actionRoute: 'cost_control',
    },
  ];
}
