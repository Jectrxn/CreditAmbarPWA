import { useState, useEffect } from 'react';
import { syncManager, type SyncStatus } from '../lib/syncManager';

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(() => syncManager.getStatus());

  useEffect(() => {
    const unsubscribe = syncManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  return status;
}
