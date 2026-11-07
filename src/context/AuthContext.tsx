/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { DEMO_USERS, MOCK_ESTABLISHMENTS } from '../data/mockData.ts';
import { BusinessType, Establishment, EstablishmentStatus, MaintenanceSession, User, UserRole } from '../types/index.ts';
import { userRepository, settingsRepository } from '../repositories/repositories.ts';
import { getDefaultViewsForRole } from '../i18n/glossary.ts';
import { generateRandomPin6, generateRandomSalt, hashPassword } from '../services/authCrypto.ts';
import { dataService } from '../services/dataService.ts';

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
  users: User[];
  addUser: (userData: Omit<User, 'id'> & { password?: string }) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => boolean;
  resetUserPassword: (userId: string, newPass: string, mustChangeOnLogin?: boolean) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function migrateDemoEstablishment(est: Establishment): Establishment {
  const isDemo =
    est.id === 'est-1' ||
    est.id === 'est-2' ||
    est.id === 'est-3' ||
    est.id === 'default' ||
    est.name === 'The Royal Mirage Fine Dining';
  if (!isDemo) return est;

  const updated: Establishment = {
    ...est,
    currency: est.currency === 'USD' ? 'EGP' : est.currency,
  };
  if (est.id === 'est-1' && est.name === 'The Royal Mirage Fine Dining') {
    updated.name = 'السراب الملكي · مطعم راقٍ';
    updated.city = 'القاهرة';
    updated.country = 'مصر';
  }
  return updated;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load persistent establishments or seed with MOCK_ESTABLISHMENTS
  const [establishments, setEstablishments] = useState<Establishment[]>(() => {
    const stored = settingsRepository.getEstablishments<Establishment>();
    if (Array.isArray(stored) && stored.length > 0) {
      return stored.map(migrateDemoEstablishment);
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
    const est = stored?.establishment || MOCK_ESTABLISHMENTS[0];
    return est ? migrateDemoEstablishment(est) : null;
  });

  const [activeView, setActiveView] = useState<string>(() => {
    const stored = settingsRepository.getAuthSession<{ activeView?: string }>();
    return stored?.activeView || 'dashboard';
  });

  const [activeSupportSession, setActiveSupportSession] = useState<MaintenanceSession | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [registeredSuccessEst, setRegisteredSuccessEst] = useState<Establishment | null>(null);

  // Load persistent staff users for current venue
  const [users, setUsers] = useState<User[]>(() => {
    const estId = currentEstablishment?.id || 'est-1';
    const stored = userRepository.getUsersSync(estId);
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    return Object.values(DEMO_USERS).map((u) => ({
      ...u,
      establishmentId: estId,
      establishmentCode: currentEstablishment?.code || 'R.0001',
      establishmentName: currentEstablishment?.name || 'السراب الملكي · مطعم راقٍ',
      permittedViews: u.permittedViews || getDefaultViewsForRole(u.role),
      status: u.status || 'active',
    }));
  });

  // Sync users via UserRepository
  useEffect(() => {
    const estId = currentEstablishment?.id || 'est-1';
    userRepository.saveUsersSync(estId, users);
  }, [users, currentEstablishment]);

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

  const addUser = (userData: Omit<User, 'id'> & { password?: string; mustChangePasswordOnLogin?: boolean }): User => {
    const estId = currentEstablishment?.id || 'est-1';
    const rawPass = userData.password || generateRandomPin6();
    const salt = generateRandomSalt();
    const hash = hashPassword(rawPass, salt);

    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      establishmentId: estId,
      establishmentCode: currentEstablishment?.code || 'R.0001',
      establishmentName: currentEstablishment?.name || 'السراب الملكي · مطعم راقٍ',
      permittedViews: userData.permittedViews || getDefaultViewsForRole(userData.role),
      password: undefined, // Never store plaintext!
      passwordHash: hash,
      passwordSalt: salt,
      mustChangePasswordOnLogin: userData.mustChangePasswordOnLogin ?? true,
      status: userData.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUsers((prev) => [newUser, ...prev]);

    dataService.logAudit(
      estId,
      'USER_CREATED',
      `إنشاء حساب موظف جديد: [${newUser.fullName}] (@${newUser.username}) بدور [${newUser.role}]`,
      'users',
      currentUser?.username || 'admin',
      currentUser?.role || 'tenant_admin'
    );

    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const updated = { ...u, ...updates, updatedAt: new Date().toISOString() };
          if (currentUser?.id === id) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );
  };

  const deleteUser = (id: string): boolean => {
    if (currentUser?.id === id) {
      return false; // Can't delete currently active user
    }
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (target) {
      dataService.logAudit(
        currentUser?.establishmentId || currentEstablishment?.id || 'default',
        'USER_DELETED',
        `حذف حساب الموظف [${target.fullName}] (@${target.username})`,
        'users',
        currentUser?.username || 'admin',
        currentUser?.role || 'tenant_admin'
      );
    }
    return true;
  };

  const resetUserPassword = (userId: string, newPass: string, mustChangeOnLogin: boolean = false): boolean => {
    const salt = generateRandomSalt();
    const hash = hashPassword(newPass, salt);
    let targetUser: User | undefined;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          targetUser = u;
          const updated: User = {
            ...u,
            password: undefined, // Never store plaintext!
            passwordHash: hash,
            passwordSalt: salt,
            mustChangePasswordOnLogin: mustChangeOnLogin,
            updatedAt: new Date().toISOString(),
          };
          if (currentUser?.id === userId) {
            setCurrentUser(updated);
          }
          return updated;
        }
        return u;
      })
    );

    dataService.logAudit(
      currentUser?.establishmentId || currentEstablishment?.id || 'default',
      'USER_PASSWORD_RESET',
      `إعادة تعيين كلمة المرور/PIN للمستخدم [${targetUser?.fullName || targetUser?.username || userId}] بواسطة [${currentUser?.fullName || 'Manager'}]${mustChangeOnLogin ? ' (إلزام بالتغيير عند أول دخول)' : ''}`,
      'users',
      currentUser?.username || 'admin',
      currentUser?.role || 'tenant_admin'
    );

    return true;
  };

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

    // Look for matching user in persistent users first, then demo users
    const matchedUser =
      users.find(
        (u) =>
          u.username.toLowerCase() === identifier.toLowerCase() ||
          u.email.toLowerCase() === identifier.toLowerCase()
      ) ||
      Object.values(DEMO_USERS).find(
        (u) =>
          u.username.toLowerCase() === identifier.toLowerCase() ||
          u.email.toLowerCase() === identifier.toLowerCase()
      );

    if (matchedUser) {
      const activeUser: User = {
        ...matchedUser,
        establishmentId: foundEst.id,
        establishmentCode: foundEst.code,
        establishmentName: foundEst.name,
        permittedViews: matchedUser.permittedViews || getDefaultViewsForRole(matchedUser.role),
      };
      setCurrentUser(activeUser);

      // Route user to their primary workplace
      const allowed = activeUser.permittedViews || [];
      if (activeUser.role === 'cashier' || (allowed.includes('pos') && !allowed.includes('dashboard'))) {
        setActiveView('pos');
      } else if (allowed.includes('dashboard')) {
        setActiveView('dashboard');
      } else if (allowed.length > 0) {
        setActiveView(allowed[0]);
      } else {
        setActiveView('dashboard');
      }
    } else {
      const fallbackUser: User = {
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
        permittedViews: getDefaultViewsForRole('tenant_admin'),
      };
      setCurrentUser(fallbackUser);
      setActiveView('dashboard');
    }

    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentEstablishment(null);
    setActiveView('landing');
    settingsRepository.clearAuthSession();
  };

  const switchRole = (role: UserRole) => {
    const foundInList = users.find((u) => u.role === role);
    const user: User = foundInList
      ? { ...foundInList, permittedViews: foundInList.permittedViews || getDefaultViewsForRole(role) }
      : {
          ...(DEMO_USERS[role] || DEMO_USERS.tenant_admin),
          role,
          fullName: DEMO_USERS[role]?.fullName || `Simulated ${role.replace('_', ' ').toUpperCase()}`,
          username: DEMO_USERS[role]?.username || `user_${role}`,
          establishmentId: currentEstablishment?.id || 'est-1',
          establishmentCode: currentEstablishment?.code || 'R.0001',
          establishmentName: currentEstablishment?.name || 'السراب الملكي · مطعم راقٍ',
          permittedViews: DEMO_USERS[role]?.permittedViews || getDefaultViewsForRole(role),
        };

    setCurrentUser(user);

    // Auto-navigate to primary workplace based on permittedViews
    const allowed = user.permittedViews || getDefaultViewsForRole(role);
    if (role === 'super_admin') {
      setActiveView('super_admin');
    } else if (role === 'cashier' && allowed.includes('pos')) {
      setActiveView('pos');
    } else if (allowed.includes('pos') && !allowed.includes('dashboard')) {
      setActiveView('pos');
    } else if (allowed.includes('kds') && !allowed.includes('dashboard')) {
      setActiveView('kds');
    } else if (allowed.includes('dashboard')) {
      setActiveView('dashboard');
    } else if (allowed.length > 0) {
      setActiveView(allowed[0]);
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
        users,
        addUser,
        updateUser,
        deleteUser,
        resetUserPassword,
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
