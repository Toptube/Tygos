/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState } from 'react';
import { PendingSyncItem, SyncStatus } from '../types/index.ts';

interface SyncContextType {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
  pendingQueue: PendingSyncItem[];
  toggleOnlineStatus: () => void;
  triggerManualSync: () => void;
  addMockChange: (type: PendingSyncItem['type'], description: string) => void;
}

const initialPending: PendingSyncItem[] = [
  {
    id: 'sync-1',
    type: 'POS_ORDER',
    description: 'Table 14 - Truffle Ribeye & Cyan Sparkler ($118.50)',
    timestamp: '2 mins ago',
    status: 'queued',
  },
  {
    id: 'sync-2',
    type: 'STOCK_MOVEMENT',
    description: 'Kitchen store issue #ST-8092 (12kg Wagyu Striploin)',
    timestamp: '5 mins ago',
    status: 'queued',
  },
  {
    id: 'sync-3',
    type: 'ATTENDANCE_CHECK',
    description: 'Shift check-in: Head Chef Marcus Vance (08:02 AM)',
    timestamp: '14 mins ago',
    status: 'queued',
  },
];

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [pendingQueue, setPendingQueue] = useState<PendingSyncItem[]>(initialPending);

  const toggleOnlineStatus = () => {
    if (isOnline) {
      setIsOnline(false);
      setStatus('offline');
    } else {
      setIsOnline(true);
      setStatus('synchronizing');
      setTimeout(() => {
        setStatus('synced');
      }, 1400);
    }
  };

  const triggerManualSync = () => {
    if (!isOnline) {
      setIsOnline(true);
    }
    setStatus('synchronizing');
    setTimeout(() => {
      setStatus('synced');
      setPendingQueue([]);
    }, 1600);
  };

  const addMockChange = (type: PendingSyncItem['type'], description: string) => {
    const item: PendingSyncItem = {
      id: `sync-${Date.now()}`,
      type,
      description,
      timestamp: 'Just now',
      status: 'queued',
    };
    setPendingQueue((prev) => [item, ...prev]);
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
