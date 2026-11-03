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
      issueDescriptionAr: 'قام المورد المعتمد برفع سعر الكيلو إلى $31.50 دون موافقة مسبقة على قائمة الأسعار.',
      issueDescriptionEn: 'Approved meat purveyor raised kg price to $31.50 outside agreed seasonal contract brackets.',
      measurableEvidenceAr: 'تم تسجيل فاتورة الشراء PO-2026-081 بسعر أعلى من متوسط التكلفة المرجحة ($27.50).',
      measurableEvidenceEn: 'Invoice PO-2026-081 billed at $31.50 vs standard weighted average cost of $27.50.',
      possibleRootCauseAr: 'تقلبات سلاسل التوريد العالمية أو انتهاء مدة اتفاقية الشراء السنوية.',
      possibleRootCauseEn: 'Global livestock transport volatility or expiry of seasonal fixed-rate price lock.',
      recommendedActionAr: 'تفعيل المقارنة مع عروض الموردين البدلاء المعتمدين (Global Gourmet Foods) أو تثبيت كميات ربع سنوية.',
      recommendedActionEn: 'Initiate 3-way RFQ comparison with secondary approved vendor or execute 90-day volume forward purchase.',
      expectedFinancialImpactAr: 'توفير شهري متوقع يقدر بـ $1,420 في تكلفة المبيعات المباشرة.',
      expectedFinancialImpactEn: 'Estimated monthly COGS savings of $1,420 across prime steak offerings.',
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
      measurableEvidenceAr: 'سعر البيع الحالي $14.50 مقابل تكلفة حصة $5.58، مما يعطي نسبة تكلفة طعام 38.5%.',
      measurableEvidenceEn: 'Current selling price $14.50 vs portion cost of $5.58 yields 38.5% food cost ratio.',
      possibleRootCauseAr: 'عدم احتساب ارتفاع سعر الجبن المستورد في سعر البيع المعتمد منذ 6 أشهر.',
      possibleRootCauseEn: 'Import tariff drift on dairy items not adjusted in menu base price over past 6 months.',
      recommendedActionAr: 'إجراء محاكاة سعرية عبر أداة What-If لرفع السعر إلى $16.50 أو ضبط وزن الجبن إلى 125 غرام معيارية.',
      recommendedActionEn: 'Simulate menu adjustment to $16.50 or calibrate standardized cheese portioning to 125g.',
      expectedFinancialImpactAr: 'خفض نسبة تكلفة الطعام إلى 29.8% وزيادة العائد بمقدار $890 شهرياً.',
      expectedFinancialImpactEn: 'Restores food cost to 29.8% and captures $890 additional monthly gross margin.',
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
      measurableEvidenceAr: 'الاستهلاك النظري بحسب مبيعات POS: 42 لتر؛ الاستهلاك الفعلي للجرد: 48.9 لتر.',
      measurableEvidenceEn: 'Theoretical POS recipe consumption: 42.0L; actual warehouse stock decrease: 48.9L.',
      possibleRootCauseAr: 'سكب حر دون استخدام المكيال المعياري (Jigger) أو عدم تسجيل هالك التحضير الصباحي.',
      possibleRootCauseEn: 'Free-pouring without standard jiggers or unrecorded daily prep batch disposal.',
      recommendedActionAr: 'تدريب فريق الباريستا على المكاييل المعيارية وتفعيل ميزة تسجيل الهالك اللحظي من نقطة البيع.',
      recommendedActionEn: 'Mandate calibrated jigger usage for mixologists and enable real-time POS waste registration.',
      expectedFinancialImpactAr: 'استرداد $450 شهرياً ومنع الهدر التراكمي في قسم المشروبات.',
      expectedFinancialImpactEn: 'Recovers $450/month and prevents compounding beverage cost leakages.',
      actionRoute: 'cost_control',
    },
  ];
}
