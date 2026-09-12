import { useState, useEffect, useCallback } from 'react';
import { offlineStore, SyncQueueItem } from '../stores/offlineStore';
import { apiClient } from '../api/client';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncResult {
  success: boolean;
  processed: number;
  conflicts: number;
  errors: string[];
}

export interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<SyncResult>;
  refreshPendingCount: () => Promise<number>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    return typeof navigator !== 'undefined' && navigator.onLine ? 'synced' : 'offline';
  });
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const refreshPendingCount = useCallback(async (): Promise<number> => {
    try {
      const queue = await offlineStore.getPendingSyncQueue();
      setPendingCount(queue.length);
      return queue.length;
    } catch {
      return 0;
    }
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    const currentOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!currentOnline) {
      setSyncStatus('offline');
      return {
        success: false,
        processed: 0,
        conflicts: 0,
        errors: ['Sin conexión a internet']
      };
    }

    setIsSyncing(true);
    setSyncStatus('syncing');

    try {
      const queue = await offlineStore.getPendingSyncQueue();
      if (queue.length === 0) {
        setIsSyncing(false);
        setSyncStatus('synced');
        return {
          success: true,
          processed: 0,
          conflicts: 0,
          errors: []
        };
      }

      // Group queue items into batch request payload
      const checkins: unknown[] = [];
      const sets: unknown[] = [];
      const pain_reports: unknown[] = [];

      for (const item of queue) {
        if (item.entityType === 'checkin') {
          checkins.push(item.payload);
        } else if (item.entityType === 'set_log') {
          sets.push(item.payload);
        } else if (item.entityType === 'pain_report') {
          pain_reports.push(item.payload);
        }
      }

      const response = await apiClient.post<{
        synced_at?: string;
        processed_items?: number;
        conflicts_resolved?: number;
        errors?: string[];
      }>('/api/sync', {
        checkins,
        sets,
        pain_reports
      });

      // Clear processed items from local sync queue
      await Promise.all(queue.map((item: SyncQueueItem) => offlineStore.markSyncItemProcessed(item.id)));
      await refreshPendingCount();

      setLastSyncedAt(new Date());
      setSyncStatus('synced');
      setIsSyncing(false);

      return {
        success: true,
        processed: response?.processed_items ?? queue.length,
        conflicts: response?.conflicts_resolved ?? 0,
        errors: response?.errors ?? []
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setSyncStatus('error');
      setIsSyncing(false);
      await refreshPendingCount();

      return {
        success: false,
        processed: 0,
        conflicts: 0,
        errors: [errorMsg]
      };
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Automatically attempt background sync when returning online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPendingCount, syncNow]);

  return {
    isOnline,
    isSyncing,
    syncStatus,
    pendingCount,
    lastSyncedAt,
    syncNow,
    refreshPendingCount
  };
}
