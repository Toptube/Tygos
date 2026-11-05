/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PendingSyncItem, SyncStatus } from '../types/index.ts';
import {
  DeploymentMode,
  OutboxEvent,
  RegisteredDevice,
  generateUuid,
  getOrCreateDeviceId,
} from './syncTypes.ts';
import { outboxService } from './outboxService.ts';
import { orderTransport } from '../services/orderTransport.ts';

interface SyncContextType {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  pendingQueue: PendingSyncItem[];
  outboxEvents: OutboxEvent[];
  deploymentMode: DeploymentMode;
  serverBaseUrl: string;
  deviceId: string;
  registeredDevices: RegisteredDevice[];
  setDeploymentConfig: (mode: DeploymentMode, serverBaseUrl?: string) => void;
  registerDevice: (device: Omit<RegisteredDevice, 'id' | 'lastSeenAt'>) => void;
  removeDevice: (id: string) => void;
  toggleOnlineStatus: () => void;
  triggerManualSync: () => void;
  addMockChange: (type: PendingSyncItem['type'], description: string) => void;
}

const DEFAULT_DEVICES: RegisteredDevice[] = [
  {
    id: 'dev-cashier-01',
    name: 'كاشير الصالة الرئيسي (POS-1)',
    role: 'cashier',
    assignedStation: 'cashier',
    printerName: 'Thermal_Cashier_80mm',
    lastSeenAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: 'dev-kitchen-01',
    name: 'شاشة المطبخ الساخن (KDS-1)',
    role: 'kitchen',
    assignedStation: 'kitchen',
    printerName: 'Kitchen_Hot_Line_80mm',
    lastSeenAt: new Date().toISOString(),
    isActive: true,
  },
  {
    id: 'dev-bar-01',
    name: 'شاشة البار والمشروبات (BAR-1)',
    role: 'bar',
    assignedStation: 'bar',
    printerName: 'Bar_Dispenser_80mm',
    lastSeenAt: new Date().toISOString(),
    isActive: true,
  },
];

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (window.localStorage.getItem('tygos_deployment_mode') as DeploymentMode) || 'standalone';
    }
    return 'standalone';
  });
  const [serverBaseUrl, setServerBaseUrl] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('tygos_server_base_url') || '';
    }
    return '';
  });
  const [registeredDevices, setRegisteredDevices] = useState<RegisteredDevice[]>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem('tygos_registered_devices');
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    return DEFAULT_DEVICES;
  });

  const tenantId =
    (typeof window !== 'undefined' && window.localStorage.getItem('tygos_active_est_id')) ||
    'est-1';

  const [outboxEvents, setOutboxEvents] = useState<OutboxEvent[]>(() =>
    outboxService.getEvents(tenantId)
  );

  useEffect(() => {
    setOutboxEvents(outboxService.getEvents(tenantId));
    return outboxService.subscribe(() => {
      setOutboxEvents(outboxService.getEvents(tenantId));
    });
  }, [tenantId]);

  const setDeploymentConfig = (mode: DeploymentMode, url = '') => {
    setDeploymentMode(mode);
    setServerBaseUrl(url);
    orderTransport.setDeploymentConfig(mode, url);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('tygos_deployment_mode', mode);
      window.localStorage.setItem('tygos_server_base_url', url);
    }
  };

  const registerDevice = (device: Omit<RegisteredDevice, 'id' | 'lastSeenAt'>) => {
    const newDev: RegisteredDevice = {
      ...device,
      id: `dev-${generateUuid().slice(0, 8)}`,
      lastSeenAt: new Date().toISOString(),
    };
    const next = [...registeredDevices, newDev];
    setRegisteredDevices(next);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('tygos_registered_devices', JSON.stringify(next));
    }
  };

  const removeDevice = (id: string) => {
    const next = registeredDevices.filter((d) => d.id !== id);
    setRegisteredDevices(next);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('tygos_registered_devices', JSON.stringify(next));
    }
  };

  const pendingQueue: PendingSyncItem[] = outboxEvents
    .filter((e) => e.status !== 'sent')
    .map((e) => ({
      id: e.id,
      type:
        e.entityType === 'order'
          ? 'POS_ORDER'
          : e.entityType === 'stock_movement'
            ? 'STOCK_MOVEMENT'
            : 'POS_ORDER',
      description: `${e.entityType.toUpperCase()} · ${e.operation} (${e.entityId.slice(0, 8)})`,
      timestamp: new Date(e.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: e.status === 'failed' ? 'failed' : 'queued',
    }));

  const toggleOnlineStatus = () => {
    if (isOnline) {
      setIsOnline(false);
      setStatus('offline');
    } else {
      setIsOnline(true);
      setStatus('synchronizing');
      void outboxService
        .flush(tenantId, async () => {
          // // INTEGRATION POINT: Dispatch event to RemoteApi or LocalServer
          return { ok: true };
        })
        .then(() => {
          setStatus('synced');
        });
    }
  };

  const triggerManualSync = () => {
    if (!isOnline) {
      setIsOnline(true);
    }
    setStatus('synchronizing');
    outboxService.retryAllFailed(tenantId);
    void outboxService
      .flush(tenantId, async () => {
        // // INTEGRATION POINT: Dispatch event to RemoteApi or LocalServer
        return { ok: true };
      })
      .then(() => {
        setStatus('synced');
      });
  };

  const addMockChange = (type: PendingSyncItem['type'], description: string) => {
    outboxService.enqueue({
      tenantId,
      entityType: type === 'STOCK_MOVEMENT' ? 'stock_movement' : 'order',
      entityId: generateUuid(),
      operation: 'append',
      payload: { description },
      idempotencyKey: `manual:${Date.now()}:${Math.random()}`,
    });
    if (!isOnline) {
      setStatus('pending_changes');
    }
  };

  return (
    <SyncContext.Provider
      value={{
        status,
        isOnline,
        pendingCount: pendingQueue.length,
        pendingQueue,
        outboxEvents,
        deploymentMode,
        serverBaseUrl,
        deviceId: getOrCreateDeviceId(),
        registeredDevices,
        setDeploymentConfig,
        registerDevice,
        removeDevice,
        toggleOnlineStatus,
        triggerManualSync,
        addMockChange,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
