/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ThemeProvider } from './theme/ThemeContext.tsx';
import { I18nProvider } from './i18n/I18nContext.tsx';
import { SyncProvider } from './sync/SyncContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { BusinessProvider, useBusiness } from './context/BusinessContext.tsx';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { LandingPage } from './components/landing/LandingPage.tsx';
import { LoginView } from './components/auth/LoginView.tsx';
import { RegisterWizard } from './components/auth/RegisterWizard.tsx';
import { SuperAdminDashboard } from './components/superadmin/SuperAdminDashboard.tsx';
import { TenantDashboard } from './components/dashboard/TenantDashboard.tsx';
import { PosModule } from './components/pos/PosModule.tsx';
import { MenuRecipeModule } from './components/menu/MenuRecipeModule.tsx';
import { CostControlModule } from './components/costcontrol/CostControlModule.tsx';
import { InventoryModule } from './components/inventory/InventoryModule.tsx';
import { PurchasingModule } from './components/purchasing/PurchasingModule.tsx';
import { FinanceModule } from './components/finance/FinanceModule.tsx';
import { TaxModule } from './components/tax/TaxModule.tsx';
import { HrModule } from './components/hr/HrModule.tsx';
import { CrmModule } from './components/crm/CrmModule.tsx';
import { InternalChatModule } from './components/chat/InternalChatModule.tsx';
import { SystemHealthDashboard } from './components/system/SystemHealthDashboard.tsx';
import { SettingsModule } from './components/settings/SettingsModule.tsx';
import { GlobalSearchModal } from './components/search/GlobalSearchModal.tsx';
import { TygosAssistantModal } from './components/ai/TygosAssistantModal.tsx';
import { CostSimulationWorkspace } from './components/costcontrol/CostSimulationWorkspace.tsx';
import { PrivilegedAccessModal } from './components/security/PrivilegedAccessModal.tsx';
import { AuditReportModal } from './components/security/AuditReportModal.tsx';
import { HelpCenterModal } from './components/help/HelpCenterModal.tsx';
import { AddIngredientQuickModal } from './components/inventory/AddIngredientQuickModal.tsx';
import { AddProductWizardModal } from './components/menu/AddProductWizardModal.tsx';
import { BulkDataImportModal } from './components/common/BulkDataImportModal.tsx';
import { QuickOnboardingModal } from './components/common/QuickOnboardingModal.tsx';
import { PublicMenuPage } from './components/menu/PublicMenuPage.tsx';
import { MenuManagementModule } from './components/menu/MenuManagementModule.tsx';
import { KitchenDisplaySystem } from './components/pos/KitchenDisplaySystem.tsx';
import { QrTableManagerView } from './components/menu/QrTableManagerView.tsx';
import { parseAppRoute } from './utils/urlRouter.ts';

const AppContent: React.FC = () => {
  const { currentUser, currentEstablishment, activeView, setActiveView, switchRole } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [route, setRoute] = useState(() => parseAppRoute());

  React.useEffect(() => {
    const handleUrlChange = () => {
      setRoute(parseAppRoute());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const {
    isAddIngredientModalOpen,
    setIsAddIngredientModalOpen,
    isAddProductModalOpen,
    setIsAddProductModalOpen,
    isImportDataModalOpen,
    setIsImportDataModalOpen,
    isOnboardingModalOpen,
    setIsOnboardingModalOpen,
    rawMaterials,
    refreshMaterialsAndProducts,
  } = useBusiness();

  const estId = currentEstablishment?.id || 'default';

  // 0. Public Electronic Menu Route (ZERO authentication required)
  if (route.isPublicMenu) {
    return (
      <PublicMenuPage
        establishmentCode={route.establishmentCode}
        tableNumber={route.tableNumber}
        onBackToApp={() => {
          window.location.hash = '';
          if (window.location.pathname.startsWith('/m/')) {
            window.history.pushState(null, '', '/');
          }
          setRoute(parseAppRoute());
          setActiveView('landing');
        }}
      />
    );
  }

  // 1. If actively viewing public landing page (or unauthenticated default)
  if (activeView === 'landing') {
    return (
      <LandingPage
        onOpenRegister={() => {
          setIsRegistering(true);
          setActiveView('login');
        }}
        onOpenLogin={() => {
          setIsRegistering(false);
          setActiveView('login');
        }}
        onExploreDemo={(role) => {
          switchRole(role || 'tenant_admin');
          setActiveView('dashboard');
        }}
      />
    );
  }

  // 2. If unauthenticated or user explicitly switched to login view
  if (!currentUser || activeView === 'login') {
    if (isRegistering) {
      return (
        <RegisterWizard
          onCancel={() => {
            setIsRegistering(false);
            setActiveView('login');
          }}
        />
      );
    }
    return (
      <LoginView
        onOpenRegister={() => setIsRegistering(true)}
        onBackToLanding={() => setActiveView('landing')}
      />
    );
  }

  // 3. Render authenticated active workspace view inside AppLayout
  const renderActiveView = () => {
    switch (activeView) {
      case 'super_admin':
        return <SuperAdminDashboard />;
      case 'pos':
        return <PosModule />;
      case 'kds':
        return <KitchenDisplaySystem />;
      case 'menu_management':
        return <MenuManagementModule />;
      case 'qr_tables':
        return <QrTableManagerView />;
      case 'menu':
        return <MenuRecipeModule />;
      case 'cost_control':
        return <CostControlModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'purchasing':
        return <PurchasingModule />;
      case 'finance':
        return <FinanceModule />;
      case 'tax':
        return <TaxModule />;
      case 'hr':
        return <HrModule />;
      case 'crm':
        return <CrmModule />;
      case 'chat':
        return <InternalChatModule />;
      case 'health':
        return <SystemHealthDashboard />;
      case 'settings':
        return <SettingsModule />;
      case 'dashboard':
      default:
        return <TenantDashboard />;
    }
  };

  return (
    <AppLayout>
      <GlobalSearchModal />
      <TygosAssistantModal />
      <CostSimulationWorkspace />
      <PrivilegedAccessModal />
      <AuditReportModal />
      <HelpCenterModal />

      {/* Effortless Rapid Data Entry & Onboarding Modals */}
      <AddIngredientQuickModal
        isOpen={isAddIngredientModalOpen}
        onClose={() => setIsAddIngredientModalOpen(false)}
        establishmentId={estId}
        existingIngredients={rawMaterials}
        onIngredientAdded={() => refreshMaterialsAndProducts()}
      />

      <AddProductWizardModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        establishmentId={estId}
        availableMaterials={rawMaterials}
        onRefreshMaterials={() => refreshMaterialsAndProducts()}
        onProductCreated={() => refreshMaterialsAndProducts()}
      />

      <BulkDataImportModal
        isOpen={isImportDataModalOpen}
        onClose={() => setIsImportDataModalOpen(false)}
        establishmentId={estId}
        onImportComplete={() => refreshMaterialsAndProducts()}
      />

      <QuickOnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        establishmentId={estId}
        onCompleted={() => refreshMaterialsAndProducts()}
      />

      {renderActiveView()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <SyncProvider>
          <AuthProvider>
            <BusinessProvider>
              <AppContent />
            </BusinessProvider>
          </AuthProvider>
        </SyncProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
