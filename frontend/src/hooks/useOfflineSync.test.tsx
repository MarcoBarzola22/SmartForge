import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { useOfflineSync } from './useOfflineSync';
import { offlineStore } from '../stores/offlineStore';
import { apiClient } from '../api/client';

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn()
  }
}));

describe('TASK-76: useOfflineSync Hook (RNF-03, DT-10)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await offlineStore.clearAllOfflineData();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  afterEach(async () => {
    await offlineStore.clearAllOfflineData();
  });

  it('should initialize with online status and synced state when queue is empty', async () => {
    const { result } = renderHook(() => useOfflineSync());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.syncStatus).toBe('synced');
    expect(result.current.pendingCount).toBe(0);
  });

  it('should detect offline transition and update status to offline', async () => {
    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.isOnline).toBe(false);
    expect(result.current.syncStatus).toBe('offline');
  });

  it('should reflect pending items count from offlineStore', async () => {
    await offlineStore.enqueueSync({
      entityType: 'set_log',
      action: 'create',
      payload: {
        session_id: 's_001',
        exercise_id: 'ex_1',
        set_number: 1,
        weight_kg: 80,
        reps_completed: 10,
        rir: 2,
        client_timestamp: new Date().toISOString()
      },
      clientTimestamp: new Date().toISOString()
    });

    const { result } = renderHook(() => useOfflineSync());

    await waitFor(() => {
      expect(result.current.pendingCount).toBe(1);
    });
  });

  it('should automatically trigger sync when returning online with pending items', async () => {
    const mockPost = vi.mocked(apiClient.post).mockResolvedValue({
      synced_at: new Date().toISOString(),
      processed_items: 1,
      conflicts_resolved: 0,
      errors: []
    });

    await offlineStore.enqueueSync({
      entityType: 'set_log',
      action: 'create',
      payload: {
        session_id: 's_001',
        exercise_id: 'ex_1',
        set_number: 1,
        weight_kg: 80,
        reps_completed: 10,
        rir: 2,
        client_timestamp: '2026-09-12T10:00:00.000Z'
      },
      clientTimestamp: '2026-09-12T10:00:00.000Z'
    });

    // Start offline
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    const { result } = renderHook(() => useOfflineSync());

    // Switch to online
    await act(async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/sync', expect.objectContaining({
        sets: expect.arrayContaining([
          expect.objectContaining({ exercise_id: 'ex_1', weight_kg: 80 })
        ])
      }));
      expect(result.current.syncStatus).toBe('synced');
      expect(result.current.pendingCount).toBe(0);
    });
  });

  it('should handle API sync errors gracefully and set error status', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Network request failed'));

    await offlineStore.enqueueSync({
      entityType: 'checkin',
      action: 'create',
      payload: {
        session_id: 's_001',
        fatigue_level: 3,
        joint_pains: []
      },
      clientTimestamp: new Date().toISOString()
    });

    const { result } = renderHook(() => useOfflineSync());

    await act(async () => {
      await result.current.syncNow();
    });

    expect(result.current.syncStatus).toBe('error');
    expect(result.current.pendingCount).toBe(1);
  });
});
