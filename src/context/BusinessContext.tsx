/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AiAssistantMessage,
  AuditEvent,
  BusinessRecommendation,
  CostSimulationResult,
  CostSimulationScenario,
  DetailedRecipe,
  HelpArticle,
  HrIncidentBridge,
  PrivilegedAccessRequest,
  ProfitDecompositionAnalysis,
  SecurityNotification,
  TheoreticalVsActualVariance,
  TraceableStockMovement,
} from '../domain/types.ts';
import {
  calculateRecipeTrueCost,
  createRecipeVersionSnapshot,
} from '../services/recipeEngine.ts';
import { evaluateTheoreticalVsActual } from '../services/inventoryCostFlowEngine.ts';
import {
  analyzeProfitVarianceDrivers,
  generateSmartRecommendations,
} from '../services/profitabilityEngine.ts';
import {
  DEFAULT_SIMULATION_SCENARIO,
  runCostSimulation,
} from '../services/simulationEngine.ts';
import {
  INITIAL_AUDIT_EVENTS,
  INITIAL_HR_INCIDENTS,
  INITIAL_PRIVILEGED_REQUESTS,
  INITIAL_SECURITY_NOTIFICATIONS,
  generateTemporaryPrivilegeSession,
} from '../services/auditService.ts';
import { HELP_ARTICLES, processAssistantQuery } from '../services/aiKnowledgeEngine.ts';
import { localAssistantEngine } from '../services/localAssistantEngine.ts';
import { buildAppContextSnapshot } from '../services/appContextSnapshot.ts';
import { dataService, RawMaterialItem, MenuItemProduct } from '../services/dataService.ts';
import { useAuth } from './AuthContext.tsx';
import { useI18n } from '../i18n/I18nContext.tsx';

// -------------------------------------------------------------
// INITIAL SEED DATA FOR PHASE 3
// -------------------------------------------------------------
const INITIAL_DETAILED_RECIPES: DetailedRecipe[] = [
  {
    id: 'rec-001',
    code: 'REC-RIBEYE-01',
    productId: 'item-ribeye-01',
    productNameAr: 'ستيك ترافل أنجوس ريب آي 300 غرام',
    productNameEn: 'Angus Truffle Ribeye Steak (300g)',
    department: 'Kitchen',
    activeVersionNumber: 2,
    createdAt: '2026-08-15',
    updatedAt: '2026-11-03',
    versions: [
      {
        versionNumber: 1,
        versionLabel: 'V1.0 (Historical Standard)',
        effectiveFrom: '2026-08-15',
        effectiveTo: '2026-10-31',
        status: 'archived',
        yieldQuantity: 1,
        yieldUnit: 'portion',
        portionSize: 1,
        portionUnit: 'serving',
        ingredients: [
          {
            ingredientId: 'ing-ribeye',
            ingredientCode: 'ING-BEEF-01',
            ingredientNameAr: 'لحم أنجوس ريب آي أسود معتق',
            ingredientNameEn: 'Aged Black Angus Ribeye',
            quantity: 0.32,
            unit: 'kg',
            costPerUnit: 24.5,
            extendedCost: 7.84,
            wastePercentage: 0.06,
            effectiveCost: 8.34,
          },
          {
            ingredientId: 'ing-truffle-butter',
            ingredientCode: 'ING-DAIRY-05',
            ingredientNameAr: 'زبدة الكمأة الإيطالية السوداء',
            ingredientNameEn: 'Italian Black Truffle Butter',
            quantity: 0.03,
            unit: 'kg',
            costPerUnit: 28.0,
            extendedCost: 0.84,
            wastePercentage: 0.02,
            effectiveCost: 0.86,
          },
        ],
        packaging: [],
        directLaborMinutes: 14,
        laborRatePerHour: 14.0,
        costBreakdown: {
          rawIngredientsCost: 9.2,
          packagingCost: 0,
          directLaborCost: 3.27,
          indirectLaborAllocation: 0.49,
          utilitiesAllocation: { water: 0.12, electricity: 0.35, gas: 0.28 },
          consumablesCost: 0.18,
          wasteLossBuffer: 0.18,
          totalTrueProductCost: 14.07,
          costPerPortion: 14.07,
          suggestedSellingPrice: 42.5,
          currentSellingPrice: 42.0,
          grossMarginAmount: 27.93,
          grossMarginPercentage: 66.5,
          foodCostPercentage: 33.5,
          targetFoodCostPercentage: 30.0,
          variancePercentage: 3.5,
        },
        sopInstructionsAr: 'طهي على شواية الفحم لدرجة حرارة داخلية 54°C (Medium-Rare).',
        sopInstructionsEn: 'Sear over open charcoal grill to internal core temp 54°C (Medium-Rare).',
        changeLogReason: 'Initial approved launch recipe specifications.',
        authorUsername: 'chef_marco',
      },
      {
        versionNumber: 2,
        versionLabel: 'V2.0 (Active Live Version)',
        effectiveFrom: '2026-11-01',
        status: 'active',
        yieldQuantity: 1,
        yieldUnit: 'portion',
        portionSize: 1,
        portionUnit: 'serving',
        ingredients: [
          {
            ingredientId: 'ing-ribeye',
            ingredientCode: 'ING-BEEF-01',
            ingredientNameAr: 'لحم أنجوس ريب آي أسود معتق',
            ingredientNameEn: 'Aged Black Angus Ribeye',
            quantity: 0.32,
            unit: 'kg',
            costPerUnit: 28.5, // Increased supplier cost
            extendedCost: 9.12,
            wastePercentage: 0.07,
            effectiveCost: 9.81,
          },
          {
            ingredientId: 'ing-truffle-butter',
            ingredientCode: 'ING-DAIRY-05',
            ingredientNameAr: 'زبدة الكمأة الإيطالية السوداء',
            ingredientNameEn: 'Italian Black Truffle Butter',
            quantity: 0.035,
            unit: 'kg',
            costPerUnit: 30.0,
            extendedCost: 1.05,
            wastePercentage: 0.02,
            effectiveCost: 1.07,
          },
        ],
        packaging: [
          {
            id: 'pkg-luxury-box',
            nameAr: 'علبة تقديم فاخرة مطبوعة',
            nameEn: 'Luxury Embossed Food Box',
            costPerUnit: 0.65,
            quantity: 1,
          },
        ],
        directLaborMinutes: 15,
        laborRatePerHour: 15.0,
        costBreakdown: {
          rawIngredientsCost: 10.88,
          packagingCost: 0.65,
          directLaborCost: 3.75,
          indirectLaborAllocation: 0.56,
          utilitiesAllocation: { water: 0.14, electricity: 0.38, gas: 0.32 },
          consumablesCost: 0.2,
          wasteLossBuffer: 0.22,
          totalTrueProductCost: 17.1,
          costPerPortion: 17.1,
          suggestedSellingPrice: 48.0,
          currentSellingPrice: 44.5,
          grossMarginAmount: 27.4,
          grossMarginPercentage: 61.6,
          foodCostPercentage: 38.4,
          targetFoodCostPercentage: 30.0,
          variancePercentage: 8.4,
        },
        sopInstructionsAr: 'يتم استخدام ميزان الحصة بدقة 300 غرام مع إضافة زبدة الكمأة في الدقيقة الأخيرة من الراحة.',
        sopInstructionsEn: 'Standard portion weight strictly 300g with truffle butter applied during final 2-minute resting phase.',
        changeLogReason: 'Supplier price inflation update on beef & dairy items and packaging integration.',
        authorUsername: 'chef_marco',
      },
    ],
  },
];

const INITIAL_CONSUMPTION_ITEMS = [
  {
    ingredientId: 'ing-ribeye',
    ingredientNameAr: 'لحم أنجوس ريب آي',
    ingredientNameEn: 'Aged Angus Ribeye',
    unit: 'kg',
    unitCost: 28.5,
    theoreticalConsumption: 142.5,
    actualConsumption: 161.8,
    recordedWasteQuantity: 12.4,
  },
  {
    ingredientId: 'ing-truffle-butter',
    ingredientNameAr: 'زبدة الكمأة السوداء',
    ingredientNameEn: 'Black Truffle Butter',
    unit: 'kg',
    unitCost: 30.0,
    theoreticalConsumption: 18.2,
    actualConsumption: 21.0,
    recordedWasteQuantity: 0.8,
  },
  {
    ingredientId: 'ing-matcha',
    ingredientNameAr: 'شراب الماتشا العضوي',
    ingredientNameEn: 'Organic Matcha Syrup',
    unit: 'L',
    unitCost: 18.0,
    theoreticalConsumption: 42.0,
    actualConsumption: 48.9,
    recordedWasteQuantity: 1.5,
  },
];

const INITIAL_STOCK_MOVEMENTS: TraceableStockMovement[] = [
  {
    id: 'mov-001',
    transactionNumber: 'TX-REC-8901',
    timestamp: '2026-11-03 08:30:00',
    type: 'PURCHASE_RECEIPT',
    ingredientId: 'ing-ribeye',
    ingredientName: 'Aged Black Angus Ribeye',
    warehouseId: 'wh-main',
    warehouseName: 'Central Cold Storage WH-01',
    quantityChange: 120,
    unit: 'kg',
    unitCost: 28.5,
    totalValuation: 3420.0,
    referenceSource: 'PO-2026-081',
    operatorUsername: 'tariq_store',
  },
  {
    id: 'mov-002',
    transactionNumber: 'TX-POS-8902',
    timestamp: '2026-11-03 12:45:10',
    type: 'SALES_CONSUMPTION',
    ingredientId: 'ing-ribeye',
    ingredientName: 'Aged Black Angus Ribeye',
    warehouseId: 'wh-kitchen',
    warehouseName: 'Kitchen Production Line WH-02',
    quantityChange: -18.6,
    unit: 'kg',
    unitCost: 28.5,
    totalValuation: -530.1,
    referenceSource: 'POS-ORDERS-LUNCH-BATCH-1',
    operatorUsername: 'kds_auto_sync',
  },
  {
    id: 'mov-003',
    transactionNumber: 'TX-WST-8903',
    timestamp: '2026-11-03 14:10:00',
    type: 'WASTE_DISPOSAL',
    ingredientId: 'ing-ribeye',
    ingredientName: 'Aged Black Angus Ribeye',
    warehouseId: 'wh-kitchen',
    warehouseName: 'Kitchen Production Line WH-02',
    quantityChange: -1.8,
    unit: 'kg',
    unitCost: 28.5,
    totalValuation: -51.3,
    referenceSource: 'WASTE-LOG-#401',
    operatorUsername: 'chef_marco',
    reason: 'Butchery sinew and excessive fat trimming beyond SOP standard',
  },
];

interface BusinessContextType {
  // Recipes & BOM
  recipes: DetailedRecipe[];
  activeRecipe: DetailedRecipe;
  setActiveRecipeId: (id: string) => void;
  createRecipeVersion: (
    recipeId: string,
    changeReason: string,
    sellingPrice: number
  ) => void;

  // Inventory Cost Flow & Theoretical vs Actual
  stockMovements: TraceableStockMovement[];
  consumptionVariances: TheoreticalVsActualVariance[];

  // Profitability & Factors
  profitAnalysis: ProfitDecompositionAnalysis;
  recommendations: BusinessRecommendation[];
  dismissRecommendation: (id: string) => void;

  // Simulation & What-If
  simulationScenario: CostSimulationScenario;
  simulationResult: CostSimulationResult;
  updateSimulationParam: (
    field: keyof CostSimulationScenario,
    value: number
  ) => void;
  resetSimulation: () => void;

  // Audit & Security
  auditEvents: AuditEvent[];
  privilegedRequests: PrivilegedAccessRequest[];
  securityNotifications: SecurityNotification[];
  hrIncidents: HrIncidentBridge[];
  submitPrivilegedAccessRequest: (
    resource: string,
    resourceLabelAr: string,
    resourceLabelEn: string,
    reason: string,
    durationMinutes: number
  ) => void;
  approvePrivilegedAccessRequest: (requestId: string) => void;
  rejectPrivilegedAccessRequest: (requestId: string, reason: string) => void;

  // Tygos AI Assistant
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  assistantMessages: AiAssistantMessage[];
  sendAssistantQuery: (query: string) => void;
  clearAssistantHistory: () => void;

  // Bilingual Help & Documentation Center
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  helpArticles: HelpArticle[];
  selectedHelpArticle: HelpArticle | null;
  setSelectedHelpArticle: (art: HelpArticle | null) => void;

  // Modals & Triggers
  isSimulationModalOpen: boolean;
  setIsSimulationModalOpen: (open: boolean) => void;
  isAccessModalOpen: boolean;
  setIsAccessModalOpen: (open: boolean) => void;
  isAuditReportModalOpen: boolean;
  setIsAuditReportModalOpen: (open: boolean) => void;
  isAddIngredientModalOpen: boolean;
  setIsAddIngredientModalOpen: (open: boolean) => void;
  isAddProductModalOpen: boolean;
  setIsAddProductModalOpen: (open: boolean) => void;
  isImportDataModalOpen: boolean;
  setIsImportDataModalOpen: (open: boolean) => void;
  isOnboardingModalOpen: boolean;
  setIsOnboardingModalOpen: (open: boolean) => void;
  targetAccessResource: { key: string; labelAr: string; labelEn: string } | null;
  setTargetAccessResource: (res: { key: string; labelAr: string; labelEn: string } | null) => void;
  rawMaterials: RawMaterialItem[];
  menuProducts: MenuItemProduct[];
  refreshMaterialsAndProducts: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentUser, currentEstablishment, activeView } = useAuth();
  const role = currentUser?.role || 'tenant_admin';
  const { language } = useI18n();

  // Materials & Products repository state
  const estId = currentEstablishment?.id || 'default';
  const [rawMaterials, setRawMaterials] = useState<RawMaterialItem[]>([]);
  const [menuProducts, setMenuProducts] = useState<MenuItemProduct[]>([]);

  const refreshMaterialsAndProducts = async () => {
    try {
      const mats = await dataService.getRawMaterials(estId);
      const prods = await dataService.getProducts(estId);
      setRawMaterials(mats);
      setMenuProducts(prods);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    refreshMaterialsAndProducts();
  }, [estId]);

  // 1. Recipes & BOM state
  const [recipes, setRecipes] = useState<DetailedRecipe[]>(INITIAL_DETAILED_RECIPES);
  const [activeRecipeId, setActiveRecipeId] = useState<string>('rec-001');

  const activeRecipe =
    recipes.find((r) => r.id === activeRecipeId) || recipes[0];

  const createRecipeVersion = (
    recipeId: string,
    changeReason: string,
    sellingPrice: number
  ) => {
    setRecipes((prev) =>
      prev.map((rec) => {
        if (rec.id !== recipeId) return rec;
        const currentActive =
          rec.versions.find((v) => v.versionNumber === rec.activeVersionNumber) ||
          rec.versions[rec.versions.length - 1];

        const newVersion = createRecipeVersionSnapshot(
          rec,
          currentActive.ingredients,
          currentActive.packaging,
          currentActive.directLaborMinutes,
          currentActive.laborRatePerHour,
          sellingPrice,
          currentActive.yieldQuantity,
          changeReason,
          currentUser?.username || 'admin'
        );

        // Add audit event
        const newAudit: AuditEvent = {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          userUsername: currentUser?.username || 'admin',
          userFullName: currentUser?.fullName || 'User',
          userRole: role,
          action: 'RECIPE_VERSION_CREATE',
          entity: 'Recipe',
          entityId: rec.code,
          beforeSnapshot: `Version ${currentActive.versionLabel} (Portion: $${currentActive.costBreakdown.costPerPortion.toFixed(2)})`,
          afterSnapshot: `Version ${newVersion.versionLabel} (Portion: $${newVersion.costBreakdown.costPerPortion.toFixed(2)})`,
          deviceFingerprint: 'Web-Client-Session',
          ipAddress: '192.168.10.1',
          sessionId: `sess-${Date.now()}`,
          reason: changeReason,
          result: 'SUCCESS',
        };
        setAuditEvents((prevAud) => [newAudit, ...prevAud]);

        return {
          ...rec,
          activeVersionNumber: newVersion.versionNumber,
          versions: [...rec.versions, newVersion],
          updatedAt: new Date().toISOString().split('T')[0],
        };
      })
    );
  };

  // 2. Inventory & Variances
  const [stockMovements, setStockMovements] = useState<TraceableStockMovement[]>(INITIAL_STOCK_MOVEMENTS);
  const [consumptionVariances] = useState<TheoreticalVsActualVariance[]>(() =>
    evaluateTheoreticalVsActual(INITIAL_CONSUMPTION_ITEMS)
  );

  // 3. Profitability & Recommendations
  const [profitAnalysis] = useState<ProfitDecompositionAnalysis>(() =>
    analyzeProfitVarianceDrivers(22320, 21480, 3.7, 6.2, 11.5, 4.8, -2.1)
  );
  const [recommendations, setRecommendations] = useState<BusinessRecommendation[]>(() =>
    generateSmartRecommendations()
  );

  const dismissRecommendation = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  };

  // 4. Simulation & What-If
  const [simulationScenario, setSimulationScenario] = useState<CostSimulationScenario>(
    DEFAULT_SIMULATION_SCENARIO
  );
  const [simulationResult, setSimulationResult] = useState<CostSimulationResult>(() =>
    runCostSimulation(DEFAULT_SIMULATION_SCENARIO)
  );

  const updateSimulationParam = (
    field: keyof CostSimulationScenario,
    value: number
  ) => {
    setSimulationScenario((prev) => {
      const updated = { ...prev, [field]: value };
      setSimulationResult(runCostSimulation(updated));
      return updated;
    });
  };

  const resetSimulation = () => {
    setSimulationScenario(DEFAULT_SIMULATION_SCENARIO);
    setSimulationResult(runCostSimulation(DEFAULT_SIMULATION_SCENARIO));
  };

  // 5. Audit & Security
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [privilegedRequests, setPrivilegedRequests] = useState<PrivilegedAccessRequest[]>(
    INITIAL_PRIVILEGED_REQUESTS
  );
  const [securityNotifications, setSecurityNotifications] = useState<SecurityNotification[]>(
    INITIAL_SECURITY_NOTIFICATIONS
  );
  const [hrIncidents] = useState<HrIncidentBridge[]>(INITIAL_HR_INCIDENTS);

  const submitPrivilegedAccessRequest = (
    resource: string,
    resourceLabelAr: string,
    resourceLabelEn: string,
    reason: string,
    durationMinutes: number
  ) => {
    const requestId = `req-${Date.now()}`;
    const auditId = `aud-${Date.now()}`;

    const newReq: PrivilegedAccessRequest = {
      id: requestId,
      requesterUsername: currentUser?.username || 'user',
      requesterName: currentUser?.fullName || 'Current User',
      requesterRole: role,
      targetResource: resource,
      targetResourceLabelAr: resourceLabelAr,
      targetResourceLabelEn: resourceLabelEn,
      justificationReason: reason,
      requestedDurationMinutes: durationMinutes,
      requestTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'pending',
      auditEventId: auditId,
    };

    const newAudit: AuditEvent = {
      id: auditId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userUsername: currentUser?.username || 'user',
      userFullName: currentUser?.fullName || 'Current User',
      userRole: role,
      action: 'ACCESS_ESCALATION_REQUEST',
      entity: 'SecurityPrivilege',
      entityId: resource,
      deviceFingerprint: 'Web-Client-Browser',
      ipAddress: '192.168.10.88',
      sessionId: `sess-${Date.now()}`,
      reason: reason,
      result: 'SUCCESS',
    };

    const newNotif: SecurityNotification = {
      id: `notif-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      titleAr: 'طلب تصعيد صلاحيات أمنية جديد',
      titleEn: 'New Privileged Access Request',
      messageAr: `طلب ${currentUser?.fullName} (${role}) الوصول إلى ${resourceLabelAr}.`,
      messageEn: `${currentUser?.fullName} (${role}) requested access to ${resourceLabelEn}.`,
      severity: 'warning',
      isRead: false,
      relatedRequestId: requestId,
    };

    setPrivilegedRequests((prev) => [newReq, ...prev]);
    setAuditEvents((prev) => [newAudit, ...prev]);
    setSecurityNotifications((prev) => [newNotif, ...prev]);
    setIsAccessModalOpen(false);
  };

  const approvePrivilegedAccessRequest = (requestId: string) => {
    setPrivilegedRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;
        const { sessionId, expiresAt } = generateTemporaryPrivilegeSession(
          req.requesterUsername,
          req.targetResource,
          req.requestedDurationMinutes
        );

        const approvalAudit: AuditEvent = {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          userUsername: currentUser?.username || 'admin',
          userFullName: currentUser?.fullName || 'Administrator',
          userRole: role,
          action: 'ACCESS_ESCALATION_APPROVE',
          entity: 'SecurityPrivilege',
          entityId: req.targetResource,
          deviceFingerprint: 'Admin-Supervisory-Terminal',
          ipAddress: '192.168.10.1',
          sessionId,
          reason: `Approved timed session for ${req.requestedDurationMinutes} mins. Session token issued.`,
          result: 'SUCCESS',
        };
        setAuditEvents((prevAud) => [approvalAudit, ...prevAud]);

        return {
          ...req,
          status: 'approved',
          approverUsername: currentUser?.username || 'admin',
          approverName: currentUser?.fullName || 'Administrator',
          temporarySessionId: sessionId,
          expiresAt,
        };
      })
    );
  };

  const rejectPrivilegedAccessRequest = (requestId: string, reason: string) => {
    setPrivilegedRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId) return req;

        const rejectionAudit: AuditEvent = {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          userUsername: currentUser?.username || 'admin',
          userFullName: currentUser?.fullName || 'Administrator',
          userRole: role,
          action: 'ACCESS_ESCALATION_REJECT',
          entity: 'SecurityPrivilege',
          entityId: req.targetResource,
          deviceFingerprint: 'Admin-Supervisory-Terminal',
          ipAddress: '192.168.10.1',
          sessionId: `sess-rej-${Date.now()}`,
          reason: `Rejected: ${reason}`,
          result: 'DENIED',
          isSuspicious: true,
        };
        setAuditEvents((prevAud) => [rejectionAudit, ...prevAud]);

        return {
          ...req,
          status: 'rejected',
          approverUsername: currentUser?.username || 'admin',
          approverName: currentUser?.fullName || 'Administrator',
          rejectionReason: reason,
        };
      })
    );
  };

  // 6. Tygos AI Assistant
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState<AiAssistantMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'tygos_ai',
      content:
        language === 'ar'
          ? 'مرحباً بك في مساعد Tygos الذكي. أنا متصل بالبيانات التشغيلية، الوصفات، وتحليلات التكلفة الحقيقية. كيف يمكنني مساعدتك اليوم؟'
          : 'Welcome to the Tygos Operational Assistant. I am grounded in live business data, recipe BOMs, and true cost intelligence. How can I assist you?',
      timestamp: '09:00',
      suggestedActions: [
        {
          label: language === 'ar' ? 'أسباب تغير الأرباح' : 'Analyze Profit Drivers',
          query: language === 'ar' ? 'أسباب تغير الأرباح' : 'Analyze Profit Drivers',
        },
        {
          label: language === 'ar' ? 'ليه الـ Food Cost زاد؟' : 'Why did Food Cost increase?',
          query: language === 'ar' ? 'ليه الـ Food Cost زاد؟' : 'Why did Food Cost increase?',
        },
        {
          label: language === 'ar' ? 'فحص انحرافات المخزون' : 'Check Inventory Variances',
          query: language === 'ar' ? 'انحرافات المخزون' : 'Inventory Variances',
        },
      ],
    },
  ]);

  const sendAssistantQuery = async (query: string) => {
    if (!query.trim()) return;

    const userMsg: AiAssistantMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      content: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAssistantMessages((prev) => [...prev, userMsg]);

    const contextSnapshot = buildAppContextSnapshot(
      activeView || 'dashboard',
      currentUser,
      rawMaterials,
      menuProducts,
      recipes,
      privilegedRequests.filter((r) => r.status === 'pending').length
    );

    const aiRes = await localAssistantEngine.ask(
      contextSnapshot,
      query,
      language === 'ar' ? 'ar' : 'en'
    );

    const aiResponse: AiAssistantMessage = {
      id: aiRes.id,
      sender: 'tygos_ai',
      content: aiRes.content,
      contentAr: aiRes.contentAr,
      contentEn: aiRes.contentEn,
      timestamp: aiRes.timestamp,
      suggestedActions: aiRes.suggestedActions?.map((a) => ({
        label: a.label,
        action: a.action,
        query: a.label,
      })),
    };

    setAssistantMessages((prev) => [...prev, aiResponse]);
  };

  const clearAssistantHistory = () => {
    setAssistantMessages([]);
  };

  // 7. Bilingual Help & Documentation Center
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [helpArticles] = useState<HelpArticle[]>(HELP_ARTICLES);
  const [selectedHelpArticle, setSelectedHelpArticle] = useState<HelpArticle | null>(
    HELP_ARTICLES[0]
  );

  // 8. Modals
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [isAuditReportModalOpen, setIsAuditReportModalOpen] = useState(false);
  const [isAddIngredientModalOpen, setIsAddIngredientModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isImportDataModalOpen, setIsImportDataModalOpen] = useState(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [targetAccessResource, setTargetAccessResource] = useState<{
    key: string;
    labelAr: string;
    labelEn: string;
  } | null>(null);

  return (
    <BusinessContext.Provider
      value={{
        recipes,
        activeRecipe,
        setActiveRecipeId,
        createRecipeVersion,
        stockMovements,
        consumptionVariances,
        profitAnalysis,
        recommendations,
        dismissRecommendation,
        simulationScenario,
        simulationResult,
        updateSimulationParam,
        resetSimulation,
        auditEvents,
        privilegedRequests,
        securityNotifications,
        hrIncidents,
        submitPrivilegedAccessRequest,
        approvePrivilegedAccessRequest,
        rejectPrivilegedAccessRequest,
        isAssistantOpen,
        setIsAssistantOpen,
        assistantMessages,
        sendAssistantQuery,
        clearAssistantHistory,
        isHelpOpen,
        setIsHelpOpen,
        helpArticles,
        selectedHelpArticle,
        setSelectedHelpArticle,
        isSimulationModalOpen,
        setIsSimulationModalOpen,
        isAccessModalOpen,
        setIsAccessModalOpen,
        isAuditReportModalOpen,
        setIsAuditReportModalOpen,
        isAddIngredientModalOpen,
        setIsAddIngredientModalOpen,
        isAddProductModalOpen,
        setIsAddProductModalOpen,
        isImportDataModalOpen,
        setIsImportDataModalOpen,
        isOnboardingModalOpen,
        setIsOnboardingModalOpen,
        targetAccessResource,
        setTargetAccessResource,
        rawMaterials,
        menuProducts,
        refreshMaterialsAndProducts,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
