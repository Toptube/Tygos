/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEMO_USERS, MOCK_ESTABLISHMENTS } from '../data/mockData.ts';
import { BusinessType, Establishment, EstablishmentStatus, MaintenanceSession, User, UserRole } from '../types/index.ts';
import { settingsRepository } from '../repositories/repositories.ts';

interface RegistrationData {
  ownerName: string;
  businessName: string;
  businessType: BusinessType;
  nationalId: string;
  crNumber?: string;
  taxNumber?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  secondaryPhone?: string;
  email: string;
  username: string;
  password: string;
  language: 'en' | 'ar' | 'fr' | 'nl' | 'tr';
  currency: string;
  timezone: string;
  notes?: string;
}

interface AuthContextType {
  currentUser: User | null;
  currentEstablishment: Establishment | null;
  establishments: Establishment[];
  activeView: string;
  setActiveView: (view: string) => void;
  activeSupportSession: MaintenanceSession | null;
  login: (prefix: string, number: string, identifier: string, pass: string) => boolean;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  registerEstablishment: (data: RegistrationData) => Establishment;
  updateEstablishmentStatus: (id: string, newStatus: EstablishmentStatus) => void;
  deleteEstablishment: (id: string) => void;
  startSupportSession: (est: Establishment, duration: number, reason: string) => void;
  endSupportSession: () => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  registeredSuccessEst: Establishment | null;
  setRegisteredSuccessEst: (est: Establishment | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load persistent establishments or seed with MOCK_ESTABLISHMENTS
  const [establishments, setEstablishments] = useState<Establishment[]>(() => {
    const stored = settingsRepository.getEstablishments<Establishment>();
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    return MOCK_ESTABLISHMENTS;
  });

  // Load session or default to initial tenant admin
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = settingsRepository.getAuthSession<{ user?: User }>();
    return stored?.user || DEMO_USERS.tenant_admin;
  });

  const [currentEstablishment, setCurrentEstablishment] = useState<Establishment | null>(() => {
    const stored = settingsRepository.getAuthSession<{ establishment?: Establishment }>();
    return stored?.establishment || MOCK_ESTABLISHMENTS[0];
  });

  const [activeView, setActiveView] = useState<string>(() => {
    const stored = settingsRepository.getAuthSession<{ activeView?: string }>();
    return stored?.activeView || 'dashboard';
  });

  const [activeSupportSession, setActiveSupportSession] = useState<MaintenanceSession | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [registeredSuccessEst, setRegisteredSuccessEst] = useState<Establishment | null>(null);

  // Sync establishments via SettingsRepository
  useEffect(() => {
    settingsRepository.saveEstablishments(establishments);
  }, [establishments]);

  // Sync active session via SettingsRepository
  useEffect(() => {
    if (currentUser) {
      settingsRepository.saveAuthSession({
        user: currentUser,
        establishment: currentEstablishment,
        activeView: activeView === 'login' ? 'dashboard' : activeView,
      });
    } else {
      settingsRepository.clearAuthSession();
    }
  }, [currentUser, currentEstablishment, activeView]);

  const login = (prefix: string, number: string, identifier: string, _pass: string): boolean => {
    // Check if logging in as Super Admin
    if (identifier.toLowerCase().includes('super') || prefix === 'SYS') {
      setCurrentUser(DEMO_USERS.super_admin);
      setCurrentEstablishment(null);
      setActiveView('super_admin');
      return true;
    }

    const code = `${prefix}.${number}`.trim().toUpperCase();
    const foundEst =
      establishments.find((e) => e.code.toUpperCase() === code) ||
      MOCK_ESTABLISHMENTS.find((e) => e.code.toUpperCase() === code) ||
      establishments[0] ||
      MOCK_ESTABLISHMENTS[0];

    setCurrentEstablishment(foundEst);

    // Look for matching user in demo users or build a personalized tenant admin session
    const matchedDemoUser = Object.values(DEMO_USERS).find(
      (u) =>
        u.username.toLowerCase() === identifier.toLowerCase() ||
        u.email.toLowerCase() === identifier.toLowerCase()
    );

    if (matchedDemoUser) {
      setCurrentUser({
        ...matchedDemoUser,
        establishmentId: foundEst.id,
        establishmentCode: foundEst.code,
        establishmentName: foundEst.name,
      });
    } else {
      setCurrentUser({
        id: `usr-${Date.now()}`,
        username: identifier || 'tenant_owner',
        fullName: foundEst.ownerName || 'Business Owner',
        role: 'tenant_admin',
        establishmentId: foundEst.id,
        establishmentCode: foundEst.code,
        establishmentName: foundEst.name,
        email: foundEst.email,
        phone: foundEst.phone,
        branchName: `${foundEst.name} - HQ`,
      });
    }

    setActiveView('dashboard');
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentEstablishment(null);
    setActiveView('landing');
    settingsRepository.clearAuthSession();
  };

  const switchRole = (role: UserRole) => {
    const user = DEMO_USERS[role] || {
      ...DEMO_USERS.tenant_admin,
      role,
      fullName: `Simulated ${role.replace('_', ' ').toUpperCase()}`,
      username: `user_${role}`,
      establishmentId: currentEstablishment?.id || 'est-1',
      establishmentCode: currentEstablishment?.code || 'R.0001',
      establishmentName: currentEstablishment?.name || 'The Royal Mirage Fine Dining',
    };

    setCurrentUser(user);

    // Auto-navigate to the primary role workplace
    if (role === 'super_admin') {
      setActiveView('super_admin');
    } else if (role === 'cashier' || role === 'waiter') {
      setActiveView('pos');
    } else if (role === 'kitchen_manager' || role === 'bar_manager') {
      setActiveView('kds');
    } else if (role === 'marketing_officer') {
      setActiveView('menu_management');
    } else if (role === 'cost_accountant') {
      setActiveView('cost_control');
    } else if (role === 'financial_manager' || role === 'financial_accountant') {
      setActiveView('finance');
    } else if (role === 'tax_accountant') {
      setActiveView('tax');
    } else if (role === 'store_manager') {
      setActiveView('inventory');
    } else if (role === 'hr_manager') {
      setActiveView('hr');
    } else if (role === 'public_relations') {
      setActiveView('crm');
    } else {
      setActiveView('dashboard');
    }
  };

  const registerEstablishment = (data: RegistrationData): Establishment => {
    const prefixMap: Record<BusinessType, string> = {
      restaurant: 'R',
      cafe: 'C',
      restaurant_cafe: 'RC',
      take_away: 'T',
      fast_food: 'T',
      hotel: 'H',
      resort: 'V',
      tourist_village: 'V',
      food_beverage_outlet: 'FB',
      bakery: 'BK',
      pastry: 'PS',
      system_admin: 'SYS',
      other: 'O',
    };

    const prefix = prefixMap[data.businessType] || 'R';
    const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
    const code = `${prefix}.${randomNum}`;

    const newEst: Establishment = {
      id: `est-${Date.now()}`,
      code,
      prefix,
      number: randomNum,
      name: data.businessName,
      ownerName: data.ownerName,
      businessType: data.businessType,
      nationalId: data.nationalId,
      crNumber: data.crNumber,
      taxNumber: data.taxNumber,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      phone: data.phone,
      secondaryPhone: data.secondaryPhone,
      email: data.email,
      language: data.language,
      currency: data.currency,
      timezone: data.timezone,
      branchesCount: 1,
      usersCount: 1,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: 'Just registered',
    };

    const newRootUser: User = {
      id: `usr-${Date.now()}`,
      username: data.username,
      fullName: data.ownerName,
      role: 'tenant_admin',
      establishmentId: newEst.id,
      establishmentCode: code,
      establishmentName: data.businessName,
      email: data.email,
      phone: data.phone,
      branchName: `${data.businessName} - Main`,
    };

    setEstablishments((prev) => [newEst, ...prev]);
    setCurrentEstablishment(newEst);
    setCurrentUser(newRootUser);
    setRegisteredSuccessEst(newEst);

    return newEst;
  };

  const updateEstablishmentStatus = (id: string, newStatus: EstablishmentStatus) => {
    setEstablishments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: newStatus } : e))
    );
  };

  const deleteEstablishment = (id: string) => {
    setEstablishments((prev) => prev.filter((e) => e.id !== id));
  };

  const startSupportSession = (est: Establishment, duration: number, reason: string) => {
    const now = new Date();
    const expires = new Date(now.getTime() + duration * 60000);

    const session: MaintenanceSession = {
      id: `mnt-${Date.now()}`,
      targetEstablishmentCode: est.code,
      targetEstablishmentName: est.name,
      adminUsername: currentUser?.username || 'tygos_super',
      durationMinutes: duration,
      reason,
      startedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expiresAt: expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'active',
    };

    setActiveSupportSession(session);
    setCurrentEstablishment(est);
    setActiveView('dashboard');
  };

  const endSupportSession = () => {
    setActiveSupportSession(null);
    setCurrentUser(DEMO_USERS.super_admin);
    setActiveView('super_admin');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentEstablishment,
        establishments,
        activeView,
        setActiveView,
        activeSupportSession,
        login,
        logout,
        switchRole,
        registerEstablishment,
        updateEstablishmentStatus,
        deleteEstablishment,
        startSupportSession,
        endSupportSession,
        isSearchOpen,
        setIsSearchOpen,
        registeredSuccessEst,
        setRegisteredSuccessEst,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
