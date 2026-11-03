/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from '../types/index.ts';

// -------------------------------------------------------------
// 1. UNITS & CONVERSIONS
// -------------------------------------------------------------
export type UnitCategory = 'weight' | 'volume' | 'count' | 'packaging';

export interface MeasurementUnit {
  id: string;
  code: string; // e.g. "kg", "g", "l", "ml", "pcs", "box"
  nameAr: string;
  nameEn: string;
  category: UnitCategory;
  baseRatio: number; // ratio to base unit (e.g. g -> kg = 0.001)
  isBase: boolean;
}

export interface UnitConversion {
  id: string;
  fromUnit: string;
  toUnit: string;
  factor: number; // e.g. 1 box = 12 pcs -> factor 12
  ingredientId?: string; // specific ingredient density or packaging
}

// -------------------------------------------------------------
// 2. RECIPE ENGINE & VERSIONING
// -------------------------------------------------------------
export type RecipeStatus = 'active' | 'draft' | 'archived' | 'pending_approval';

export interface RecipeIngredientItem {
  ingredientId: string;
  ingredientCode: string;
  ingredientNameAr: string;
  ingredientNameEn: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  extendedCost: number;
  wastePercentage: number; // trim/shrinkage during prep
  effectiveCost: number; // extendedCost / (1 - wastePercentage)
  isSubRecipe?: boolean;
  subRecipeId?: string;
  notes?: string;
}

export interface RecipePackagingItem {
  id: string;
  nameAr: string;
  nameEn: string;
  costPerUnit: number;
  quantity: number;
}

export interface RecipeCostBreakdown {
  rawIngredientsCost: number;
  packagingCost: number;
  directLaborCost: number;
  indirectLaborAllocation: number;
  utilitiesAllocation: {
    water: number;
    electricity: number;
    gas: number;
  };
  consumablesCost: number;
  wasteLossBuffer: number;
  totalTrueProductCost: number;
  costPerPortion: number;
  suggestedSellingPrice: number;
  currentSellingPrice: number;
  grossMarginAmount: number;
  grossMarginPercentage: number;
  foodCostPercentage: number;
  targetFoodCostPercentage: number;
  variancePercentage: number;
}

export interface RecipeVersion {
  versionNumber: number; // e.g. 1, 2, 3
  versionLabel: string; // "V1.0", "V2.1"
  effectiveFrom: string;
  effectiveTo?: string;
  status: RecipeStatus;
  yieldQuantity: number;
  yieldUnit: string;
  portionSize: number;
  portionUnit: string;
  ingredients: RecipeIngredientItem[];
  packaging: RecipePackagingItem[];
  directLaborMinutes: number;
  laborRatePerHour: number;
  costBreakdown: RecipeCostBreakdown;
  sopInstructionsAr: string;
  sopInstructionsEn: string;
  changeLogReason: string;
  authorUsername: string;
  approvedByUsername?: string;
}

export interface DetailedRecipe {
  id: string;
  code: string; // e.g. "REC-001"
  productId: string;
  productNameAr: string;
  productNameEn: string;
  department: 'Kitchen' | 'Bar' | 'Bakery' | 'Pastry' | 'Preparation';
  activeVersionNumber: number;
  versions: RecipeVersion[];
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// 3. OVERHEAD & UTILITY COST CENTERS
// -------------------------------------------------------------
export type AllocationMethod =
  | 'production_volume'
  | 'revenue_share'
  | 'direct_labor_hours'
  | 'square_meters'
  | 'machine_hours'
  | 'fixed_percentage';

export interface CostCenter {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  department: string;
  monthlyBudget: number;
  monthlyActual: number;
  allocationMethod: AllocationMethod;
  utilityWeights: {
    waterPercent: number;
    electricityPercent: number;
    gasPercent: number;
  };
}

// -------------------------------------------------------------
// 4. PURCHASE PRICE INTELLIGENCE
// -------------------------------------------------------------
export interface SupplierPricePoint {
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string;
  date: string;
  unitPrice: number;
  unit: string;
  deliveryLeadDays: number;
  qualityRating: number; // 1 to 5
}

export interface PurchasePriceIntelligence {
  ingredientId: string;
  ingredientNameAr: string;
  ingredientNameEn: string;
  currentStandardCost: number;
  lastPurchasePrice: number;
  averagePurchasePrice: number;
  weightedAverageCost: number;
  priceTrend: 'rising' | 'falling' | 'stable';
  variancePercentage: number; // difference between standard and latest
  priceHistory: SupplierPricePoint[];
}

// -------------------------------------------------------------
// 5. INVENTORY COST FLOW & THEORETICAL VS ACTUAL
// -------------------------------------------------------------
export type StockMovementType =
  | 'PURCHASE_RECEIPT'
  | 'SALES_CONSUMPTION'
  | 'PRODUCTION_ISSUE'
  | 'INTER_WAREHOUSE_TRANSFER'
  | 'WASTE_DISPOSAL'
  | 'YIELD_LOSS'
  | 'INVENTORY_ADJUSTMENT'
  | 'SUPPLIER_RETURN';

export interface TraceableStockMovement {
  id: string;
  transactionNumber: string;
  timestamp: string;
  type: StockMovementType;
  ingredientId: string;
  ingredientName: string;
  warehouseId: string;
  warehouseName: string;
  quantityChange: number; // positive for receipt, negative for issue
  unit: string;
  unitCost: number;
  totalValuation: number;
  referenceSource: string; // e.g. "PO-2026-081", "CHECK-#8904", "WASTE-401"
  operatorUsername: string;
  reason?: string;
}

export type PotentialVarianceCause =
  | 'waste_loss'
  | 'over_portioning'
  | 'recipe_inaccuracy'
  | 'stock_count_error'
  | 'theft_shrinkage'
  | 'unit_conversion_mismatch'
  | 'production_trim_loss'
  | 'expired_material'
  | 'supplier_shortage';

export interface TheoreticalVsActualVariance {
  ingredientId: string;
  ingredientNameAr: string;
  ingredientNameEn: string;
  unit: string;
  unitCost: number;
  theoreticalConsumption: number; // calculated from sales × recipe
  actualConsumption: number; // from inventory stock movements
  varianceQuantity: number; // actual - theoretical
  varianceCostValue: number;
  variancePercentage: number;
  recordedWasteQuantity: number;
  unexplainedVariance: number;
  potentialCauses: {
    cause: PotentialVarianceCause;
    probabilityScore: number; // 0 to 100
    evidenceNotesAr: string;
    evidenceNotesEn: string;
  }[];
  recommendedAuditActionAr: string;
  recommendedAuditActionEn: string;
}

// -------------------------------------------------------------
// 6. PROFITABILITY & FACTOR DECOMPOSITION ("WHY DID PROFIT CHANGE?")
// -------------------------------------------------------------
export interface ProfitabilityBreakdown {
  period: string; // "November 2026"
  dimension: 'establishment' | 'branch' | 'department' | 'category' | 'product';
  dimensionId: string;
  dimensionName: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercentage: number;
  directLaborCost: number;
  indirectLaborCost: number;
  overheadCost: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPercentage: number;
  budgetedNetProfit: number;
  forecastedNetProfit: number;
  varianceToBudget: number;
}

export interface ProfitVarianceFactor {
  factorId: string;
  nameAr: string;
  nameEn: string;
  impactAmount: number; // monetary change
  percentageContribution: number; // e.g. +35% of total decline
  direction: 'positive' | 'negative';
  descriptionAr: string;
  descriptionEn: string;
}

export interface ProfitDecompositionAnalysis {
  period: string;
  comparedToPeriod: string;
  revenueChangePercent: number;
  netProfitChangePercent: number;
  netProfitChangeAmount: number;
  primaryDrivers: ProfitVarianceFactor[];
  managementConclusionAr: string;
  managementConclusionEn: string;
}

// -------------------------------------------------------------
// 7. RECOMMENDATION ENGINE
// -------------------------------------------------------------
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface BusinessRecommendation {
  id: string;
  titleAr: string;
  titleEn: string;
  module: 'cost_control' | 'purchasing' | 'menu' | 'inventory' | 'hr';
  priority: RecommendationPriority;
  confidenceScore: number; // 0 to 100
  issueDescriptionAr: string;
  issueDescriptionEn: string;
  measurableEvidenceAr: string;
  measurableEvidenceEn: string;
  possibleRootCauseAr: string;
  possibleRootCauseEn: string;
  recommendedActionAr: string;
  recommendedActionEn: string;
  expectedFinancialImpactAr: string;
  expectedFinancialImpactEn: string;
  actionRoute?: string;
  isDismissed?: boolean;
}

// -------------------------------------------------------------
// 8. WHAT-IF & COST SIMULATION WORKSPACE
// -------------------------------------------------------------
export interface CostSimulationScenario {
  id: string;
  nameAr: string;
  nameEn: string;
  targetProductId?: string; // empty means global basket
  ingredientPriceDeltaPercent: number; // e.g. +10%
  sellingPriceDeltaPercent: number; // e.g. +5%
  laborRateDeltaPercent: number; // e.g. +8%
  wasteReductionPercent: number; // e.g. -3%
  yieldImprovementPercent: number; // e.g. +2%
  utilityTariffDeltaPercent: number; // e.g. +15%
}

export interface CostSimulationResult {
  scenario: CostSimulationScenario;
  baseline: {
    unitCost: number;
    sellingPrice: number;
    grossMarginPercent: number;
    foodCostPercent: number;
    monthlyNetProfit: number;
  };
  simulated: {
    unitCost: number;
    sellingPrice: number;
    grossMarginPercent: number;
    foodCostPercent: number;
    monthlyNetProfit: number;
  };
  delta: {
    unitCostDelta: number;
    grossMarginDeltaPercent: number;
    foodCostDeltaPercent: number;
    monthlyProfitDelta: number;
    annualizedImpact: number;
  };
}

// -------------------------------------------------------------
// 9. SECURITY, PRIVILEGED ACCESS & AUDIT LOGS
// -------------------------------------------------------------
export interface AuditEvent {
  id: string;
  timestamp: string;
  userUsername: string;
  userFullName: string;
  userRole: UserRole;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'RECIPE_EDIT'
    | 'RECIPE_VERSION_CREATE'
    | 'PURCHASE_PRICE_OVERRIDE'
    | 'INVENTORY_ADJUSTMENT'
    | 'WASTE_LOG_CREATE'
    | 'ACCESS_ESCALATION_REQUEST'
    | 'ACCESS_ESCALATION_APPROVE'
    | 'ACCESS_ESCALATION_REJECT'
    | 'FINANCIAL_REPORT_VIEW'
    | 'HR_SENSITIVE_DATA_ATTEMPT';
  entity: string;
  entityId: string;
  beforeSnapshot?: string;
  afterSnapshot?: string;
  deviceFingerprint: string;
  ipAddress: string;
  sessionId: string;
  reason?: string;
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  isSuspicious?: boolean;
}

export interface PrivilegedAccessRequest {
  id: string;
  requesterUsername: string;
  requesterName: string;
  requesterRole: UserRole;
  targetResource: string; // e.g. "HR_PAYROLL_MASTER", "FINANCIAL_PROFIT_LEDGER"
  targetResourceLabelAr: string;
  targetResourceLabelEn: string;
  justificationReason: string;
  requestedDurationMinutes: number;
  requestTimestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  approverUsername?: string;
  approverName?: string;
  rejectionReason?: string;
  temporarySessionId?: string;
  expiresAt?: string;
  auditEventId: string;
}

export interface SecurityNotification {
  id: string;
  timestamp: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  relatedRequestId?: string;
}

export interface HrIncidentBridge {
  id: string;
  incidentNumber: string;
  employeeCode: string;
  employeeName: string;
  securityAuditId: string;
  incidentType: 'unauthorized_access_attempt' | 'policy_breach' | 'unexplained_variance';
  titleAr: string;
  titleEn: string;
  notesAr: string;
  notesEn: string;
  reviewedByHrUser: string;
  createdAt: string;
  status: 'under_review' | 'closed_no_action' | 'action_taken';
}

// -------------------------------------------------------------
// 10. AI KNOWLEDGE BASE & BILINGUAL DOCUMENTATION
// -------------------------------------------------------------
export interface HelpArticle {
  id: string;
  slug: string;
  module: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  category:
    | 'getting_started'
    | 'workflows'
    | 'cost_control'
    | 'recipes'
    | 'security'
    | 'faq'
    | 'inventory'
    | 'pos'
    | 'finance'
    | 'architecture'
    | string;
  contentAr: string;
  contentEn: string;
  stepsAr: string[];
  stepsEn: string[];
  commonMistakesAr: string[];
  commonMistakesEn: string[];
  requiredRole?: UserRole[];
  lastUpdated: string;
}

export interface AiKnowledgeItem {
  id: string;
  entityType: 'module' | 'feature' | 'recipe' | 'cost_concept' | 'rule' | 'help_article';
  keywordAr: string;
  keywordEn: string;
  synonymsAr: string[];
  synonymsEn: string[];
  misspellings: string[];
  descriptionAr: string;
  descriptionEn: string;
  targetView?: string;
  requiredRoles: UserRole[];
  helpArticleSlug?: string;
  contextActionsAr?: { label: string; action: string }[];
  contextActionsEn?: { label: string; action: string }[];
}

export interface AiAssistantMessage {
  id: string;
  sender: 'user' | 'tygos_ai';
  contentAr?: string;
  contentEn?: string;
  content: string; // rendered content according to current language
  timestamp: string;
  isPermissionDenied?: boolean;
  permissionDeniedResource?: string;
  suggestedActions?: { label: string; query: string; action?: string }[];
  referencedEntities?: { name: string; type: string; id: string }[];
  calculationTrace?: string;
}
