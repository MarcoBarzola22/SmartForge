import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  offlineStore,
  LocalSession,
  LocalCheckIn,
  LocalSetLog,
  LocalPainReport,
  DailyRoutinePlan
} from './offlineStore';

describe('TASK-75: Offline Store with IndexedDB (RNF-03, DT-04)', () => {
  beforeEach(async () => {
    await offlineStore.clearAllOfflineData();
  });

  afterEach(async () => {
    await offlineStore.clearAllOfflineData();
  });

  describe('Routine Storage', () => {
    it('should save and retrieve daily routine plan offline', async () => {
      const routine: DailyRoutinePlan = {
        id: 'sp_100',
        dayOfWeek: 1,
        weekNumber: 2,
        isDeload: false,
        exercises: [
          {
            assignmentId: 'ea_1',
            exerciseId: 'ex_1',
            name: 'Sentadilla con barra',
            setsTarget: 4,
            repsTargetMin: 8,
            repsTargetMax: 12,
            loadKg: 70
          }
        ]
      };

      await offlineStore.saveRoutine(routine);
      const retrieved = await offlineStore.getRoutine();

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('sp_100');
      expect(retrieved?.exercises).toHaveLength(1);
      expect(retrieved?.exercises[0]?.name).toBe('Sentadilla con barra');
    });

    it('should return null when no routine is stored', async () => {
      const retrieved = await offlineStore.getRoutine();
      expect(retrieved).toBeNull();
    });
  });

  describe('Session Storage', () => {
    it('should save and retrieve active session in airplane mode', async () => {
      const session: LocalSession = {
        id: 'sess_offline_001',
        sessionPlanId: 'sp_100',
        athleteId: 'ath_123',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        clientTimestamp: new Date().toISOString(),
        synced: false
      };

      await offlineStore.saveSession(session);
      const retrieved = await offlineStore.getSession('sess_offline_001');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('sess_offline_001');
      expect(retrieved?.status).toBe('in_progress');
      expect(retrieved?.synced).toBe(false);
    });

    it('should update session status when completed offline', async () => {
      const session: LocalSession = {
        id: 'sess_offline_002',
        sessionPlanId: 'sp_100',
        athleteId: 'ath_123',
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        clientTimestamp: new Date().toISOString(),
        synced: false
      };

      await offlineStore.saveSession(session);
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      await offlineStore.saveSession(session);

      const retrieved = await offlineStore.getSession('sess_offline_002');
      expect(retrieved?.status).toBe('completed');
      expect(retrieved?.completedAt).toBeDefined();
    });
  });

  describe('Check-In Storage', () => {
    it('should store and retrieve pre-workout check-in with joint pain details', async () => {
      const checkin: LocalCheckIn = {
        id: 'chk_offline_01',
        sessionId: 'sess_offline_001',
        fatigueLevel: 4,
        pains: [
          { joint: 'hombro', side: 'derecha', intensity: 'moderada' }
        ],
        createdAt: new Date().toISOString(),
        synced: false
      };

      await offlineStore.saveCheckIn(checkin);
      const retrieved = await offlineStore.getCheckIn('sess_offline_001');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.fatigueLevel).toBe(4);
      expect(retrieved?.pains).toHaveLength(1);
      expect(retrieved?.pains[0]?.joint).toBe('hombro');
    });
  });

  describe('Set Logs Storage', () => {
    it('should save, query, edit and delete set logs for a session', async () => {
      const setLog1: LocalSetLog = {
        id: 'set_001',
        sessionId: 'sess_offline_001',
        exerciseAssignmentId: 'ea_1',
        setNumber: 1,
        weightKg: 80,
        repsCompleted: 10,
        rir: 2,
        clientTimestamp: '2026-09-12T10:00:00.000Z',
        createdAt: '2026-09-12T10:00:00.000Z',
        synced: false
      };

      const setLog2: LocalSetLog = {
        id: 'set_002',
        sessionId: 'sess_offline_001',
        exerciseAssignmentId: 'ea_1',
        setNumber: 2,
        weightKg: 80,
        repsCompleted: 9,
        rir: 1,
        clientTimestamp: '2026-09-12T10:03:00.000Z',
        createdAt: '2026-09-12T10:03:00.000Z',
        synced: false
      };

      await offlineStore.saveSetLog(setLog1);
      await offlineStore.saveSetLog(setLog2);

      let sets = await offlineStore.getSetLogs('sess_offline_001');
      expect(sets).toHaveLength(2);
      expect(sets[0]?.setNumber).toBe(1);
      expect(sets[1]?.setNumber).toBe(2);

      // Edit set 2
      setLog2.repsCompleted = 10;
      await offlineStore.saveSetLog(setLog2);

      sets = await offlineStore.getSetLogs('sess_offline_001');
      const updated = sets.find((s) => s.id === 'set_002');
      expect(updated?.repsCompleted).toBe(10);

      // Delete set 1
      await offlineStore.deleteSetLog('set_001');
      sets = await offlineStore.getSetLogs('sess_offline_001');
      expect(sets).toHaveLength(1);
      expect(sets[0]?.id).toBe('set_002');
    });
  });

  describe('Pain Reports Storage', () => {
    it('should save and retrieve post-exercise pain reports', async () => {
      const painReport: LocalPainReport = {
        id: 'pr_001',
        sessionId: 'sess_offline_001',
        exerciseAssignmentId: 'ea_1',
        joint: 'rodilla',
        side: 'izquierda',
        intensity: 'leve',
        createdAt: new Date().toISOString(),
        synced: false
      };

      await offlineStore.savePainReport(painReport);
      const reports = await offlineStore.getPainReports('sess_offline_001');

      expect(reports).toHaveLength(1);
      expect(reports[0]?.joint).toBe('rodilla');
      expect(reports[0]?.intensity).toBe('leve');
    });
  });

  describe('Sync Queue Management (DT-04, DT-10)', () => {
    it('should enqueue offline mutations and retrieve pending items in FIFO order', async () => {
      const id1 = await offlineStore.enqueueSync({
        entityType: 'set_log',
        action: 'create',
        payload: { id: 'set_001', reps: 10 },
        clientTimestamp: '2026-09-12T10:00:00.000Z'
      });

      const id2 = await offlineStore.enqueueSync({
        entityType: 'checkin',
        action: 'create',
        payload: { fatigue: 3 },
        clientTimestamp: '2026-09-12T10:01:00.000Z'
      });

      const pending = await offlineStore.getPendingSyncQueue();
      expect(pending).toHaveLength(2);
      expect(pending[0]?.id).toBe(id1);
      expect(pending[0]?.entityType).toBe('set_log');
      expect(pending[1]?.id).toBe(id2);
      expect(pending[1]?.entityType).toBe('checkin');

      // Process first item
      await offlineStore.markSyncItemProcessed(id1);
      const remaining = await offlineStore.getPendingSyncQueue();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(id2);
    });
  });
});
