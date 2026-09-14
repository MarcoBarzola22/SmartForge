import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import {
  offlineSyncStore,
  offlineStore,
  type LocalSession,
  type MesocycleCancellationPayload
} from './offlineSync.store';
import type { MesocycleDetail } from '../api/generated/types';

describe('TASK-31: offlineSync.store.ts — Offline Mesocycle Cancellation & Deterministic Reconciliation (RF-07, RNF-05)', () => {
  const sampleMesocycle: MesocycleDetail = {
    id: 'meso-active-001',
    athlete_id: 'ath-123',
    name: 'Mesociclo Fuerza V2',
    experience_level: 'intermedio',
    training_goal: 'fuerza',
    periodization_type: 'ondulante',
    duration_weeks: 6,
    status: 'active',
    start_date: '2026-09-01',
    end_date: '2026-10-13',
    weeks: [
      {
        id: 'week-1',
        mesocycle_id: 'meso-active-001',
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            id: 'sess-plan-1',
            week_plan_id: 'week-1',
            day_number: 1,
            name: 'Torso A',
            exercise_assignments: []
          },
          {
            id: 'sess-plan-2',
            week_plan_id: 'week-1',
            day_number: 2,
            name: 'Pierna A',
            exercise_assignments: []
          }
        ]
      }
    ]
  };

  beforeEach(async () => {
    localStorage.clear();
    await offlineSyncStore.clearAllOfflineData();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    localStorage.clear();
    await offlineSyncStore.clearAllOfflineData();
  });

  describe('Module and Store Export Equivalence', () => {
    it('should export offlineSyncStore as an alias/instance of offlineStore', () => {
      expect(offlineSyncStore).toBeDefined();
      expect(offlineSyncStore).toBe(offlineStore);
    });
  });

  describe('Local Mesocycle Cancellation in IndexedDB (RF-07 CA-07.4)', () => {
    it('should cancel active mesocycle locally and transition status to cancelled', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);

      const result = await offlineSyncStore.cancelActiveMesocycleLocally('cambio_disponibilidad');

      expect(result.status).toBe('cancelled');
      expect(result.cancelledLocally).toBe(true);
      expect(result.message).toContain('Cancelado localmente');

      const updatedMeso = await offlineSyncStore.getActiveMesocycle();
      expect(updatedMeso?.status).toBe('cancelled');
    });

    it('should enqueue a mesocycle_cancellation item into IndexedDB sync_queue', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);

      await offlineSyncStore.cancelActiveMesocycleLocally('lesion_hombro');

      const queue = await offlineSyncStore.getPendingSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0]?.entityType).toBe('mesocycle_cancellation');
      expect(queue[0]?.action).toBe('cancel');

      const payload = queue[0]?.payload as MesocycleCancellationPayload;
      expect(payload.mesocycleId).toBe('meso-active-001');
      expect(payload.reason).toBe('lesion_hombro');
      expect(payload.cancelledAt).toBeDefined();
    });

    it('edge case (CA-07.6): should immediately finalize an in-progress session if one exists', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);

      // Store an in-progress session
      const inProgressSession: LocalSession = {
        id: 'sess-live-01',
        sessionPlanId: 'sess-plan-1',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        clientTimestamp: new Date().toISOString(),
        synced: false
      };
      await offlineSyncStore.saveSession(inProgressSession);

      // Also simulate active session in memory/localStorage
      await offlineSyncStore.saveActiveSession({
        id: 'sess-live-01',
        athlete_id: 'ath-123',
        session_plan_id: 'sess-plan-1',
        status: 'in_progress',
        started_at: inProgressSession.startedAt!
      });

      await offlineSyncStore.cancelActiveMesocycleLocally('viaje');

      // The in-progress session should now be completed/finalized
      const sessionAfter = await offlineSyncStore.getSession('sess-live-01');
      expect(sessionAfter?.status).toBe('completed');

      // And getActiveSession should be cleared
      const activeSession = await offlineSyncStore.getActiveSession();
      expect(activeSession).toBeNull();
    });

    it('edge case (CA-07.7): should mark future pending sessions as cancelled in local store', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);

      const futureSession: LocalSession = {
        id: 'sess-future-02',
        sessionPlanId: 'sess-plan-2',
        status: 'pending',
        clientTimestamp: new Date().toISOString(),
        synced: false
      };
      await offlineSyncStore.saveSession(futureSession);

      await offlineSyncStore.cancelActiveMesocycleLocally();

      const sessionAfter = await offlineSyncStore.getSession('sess-future-02');
      expect(sessionAfter?.status).toBe('cancelled');
    });
  });

  describe('Deterministic Reconciliation upon Reconnection (RF-07 CA-07.5, RNF-05)', () => {
    it('rule CA-07.5: completed status on server PREVAILS over local offline cancellation', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);
      await offlineSyncStore.cancelActiveMesocycleLocally('cambio');

      // Server returns that mesocycle was already completed on another device
      const reconciliation = await offlineSyncStore.reconcileMesocycleCancellation({
        status: 'completed',
        message: 'El mesociclo ya se encontraba completado; se preserva su estado.',
        cancelled_at: null
      });

      expect(reconciliation.finalStatus).toBe('completed');
      expect(reconciliation.reconciled).toBe(true);

      const meso = await offlineSyncStore.getActiveMesocycle();
      expect(meso?.status).toBe('completed');
    });

    it('should reconcile with cancelled status when server approves normal cancellation', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);
      await offlineSyncStore.cancelActiveMesocycleLocally('cambio');

      const reconciliation = await offlineSyncStore.reconcileMesocycleCancellation({
        status: 'cancelled',
        message: 'Mesociclo cancelado exitosamente.',
        cancelled_at: '2026-09-14T12:00:00.000Z'
      });

      expect(reconciliation.finalStatus).toBe('cancelled');
      expect(reconciliation.reconciled).toBe(true);

      const meso = await offlineSyncStore.getActiveMesocycle();
      expect(meso?.status).toBe('cancelled');
    });

    it('should reconcile with deload_skipped when cancelled during final deload week', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);
      await offlineSyncStore.cancelActiveMesocycleLocally('descarga_completa');

      const reconciliation = await offlineSyncStore.reconcileMesocycleCancellation({
        status: 'deload_skipped',
        message: 'Mesociclo finalizado durante la descarga. Guardado como completado (descarga omitida).',
        cancelled_at: '2026-09-14T12:00:00.000Z'
      });

      expect(reconciliation.finalStatus).toBe('deload_skipped');
      expect(reconciliation.reconciled).toBe(true);

      const meso = await offlineSyncStore.getActiveMesocycle();
      expect(meso?.status).toBe('deload_skipped');
    });
  });

  describe('Idempotent Sync Execution: syncPendingCancellations()', () => {
    it('should process pending cancellation and clear sync_queue upon successful sync', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);
      await offlineSyncStore.cancelActiveMesocycleLocally('motivo_1');

      const mockApiCancel = vi.fn().mockResolvedValue({
        status: 'cancelled',
        message: 'Cancelado en backend',
        cancelled_at: '2026-09-14T12:00:00Z'
      });

      const syncResult = await offlineSyncStore.syncPendingCancellations(mockApiCancel);

      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.errors).toHaveLength(0);
      expect(mockApiCancel).toHaveBeenCalledWith('motivo_1');

      // Queue item should be marked processed and removed
      const remainingQueue = await offlineSyncStore.getPendingSyncQueue();
      expect(remainingQueue).toHaveLength(0);
    });

    it('idempotency: should treat 404 (already deleted or no active meso) as successful NOOP and clear queue', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);
      await offlineSyncStore.cancelActiveMesocycleLocally('motivo_repetido');

      const notFoundError = new Error('No se encontró ningún mesociclo activo para cancelar.');
      (notFoundError as any).status = 404;

      const mockApiCancel = vi.fn().mockRejectedValue(notFoundError);

      const syncResult = await offlineSyncStore.syncPendingCancellations(mockApiCancel);

      expect(syncResult.syncedCount).toBe(1);
      expect(syncResult.errors).toHaveLength(0);

      // Item should be safely removed to prevent endless retry loops
      const remainingQueue = await offlineSyncStore.getPendingSyncQueue();
      expect(remainingQueue).toHaveLength(0);
    });

    it('should retain queue item on transient network errors for future retry', async () => {
      await offlineSyncStore.saveActiveMesocycle(sampleMesocycle);
      await offlineSyncStore.cancelActiveMesocycleLocally('motivo_red');

      const networkError = new Error('Network error: Failed to fetch');
      const mockApiCancel = vi.fn().mockRejectedValue(networkError);

      const syncResult = await offlineSyncStore.syncPendingCancellations(mockApiCancel);

      expect(syncResult.syncedCount).toBe(0);
      expect(syncResult.errors).toContain('Network error: Failed to fetch');

      // Queue item should still be pending
      const remainingQueue = await offlineSyncStore.getPendingSyncQueue();
      expect(remainingQueue).toHaveLength(1);
      expect(remainingQueue[0]?.attempts).toBe(1);
    });
  });
});
