import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { SyncService, syncService } from '../../src/services/sync.service.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';
import { checkinRepository } from '../../src/repositories/checkin.repository.js';
import { setLogRepository } from '../../src/repositories/set-log.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';
import type {
  AthleteProfile,
  SetLog,
  SyncRequest,
  SyncResponse
} from '../../src/schemas/generated/schemas.js';

describe('TASK-56: Last-Write-Wins Conflict Resolution (RNF-03, DT-10)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const sessionId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';
  const existingSetId = 'aba7b810-9dad-11d1-80b4-00c04fd430cc';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'athlete@smartforge.test',
      google_id: 'google-sub-123'
    },
    jwtSecret
  );

  const sampleAthlete: AthleteProfile = {
    id: athleteId,
    google_id: 'google-sub-123',
    email: 'athlete@smartforge.test',
    name: 'Atleta LWW',
    age: 26,
    weight_kg: 75,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [{ id: 'barbell', name: 'Barra', category: 'barras' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleActiveSession = {
    id: sessionId,
    athlete_id: athleteId,
    session_plan_id: '8ba7b810-9dad-11d1-80b4-00c04fd430ca',
    status: 'in_progress' as const,
    started_at: '2026-09-12T10:00:00.000Z',
    client_timestamp: '2026-09-12T10:00:00.000Z',
    created_at: '2026-09-12T10:00:00.000Z',
    updated_at: '2026-09-12T10:00:00.000Z'
  };

  const existingDbSet: SetLog = {
    id: existingSetId,
    session_id: sessionId,
    exercise_id: 'press_banca',
    set_number: 1,
    reps_completed: 8,
    weight_kg: 60,
    rir: 2,
    client_timestamp: '2026-09-12T10:05:00.000Z',
    created_at: '2026-09-12T10:05:01.000Z',
    updated_at: '2026-09-12T10:05:01.000Z'
  };

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', jwtSecret);

    vi.spyOn(athleteRepository, 'findById').mockResolvedValue(sampleAthlete);
    vi.spyOn(sessionRepository, 'findActiveByAthleteId').mockResolvedValue(sampleActiveSession);
    vi.spyOn(sessionRepository, 'findById').mockResolvedValue(sampleActiveSession);
    vi.spyOn(checkinRepository, 'findBySessionId').mockResolvedValue(null);

    app = createApp();
  });

  describe('resolveConflictLWW unit helper logic', () => {
    it('should declare incoming as winner when incoming timestamp is newer', () => {
      const result = syncService.resolveConflictLWW(
        '2026-09-12T10:10:00.000Z',
        '2026-09-12T10:05:00.000Z'
      );
      expect(result.winner).toBe('incoming');
      expect(result.incomingTime).toBeGreaterThan(result.existingTime);
    });

    it('should declare existing as winner when existing timestamp is newer (stale incoming)', () => {
      const result = syncService.resolveConflictLWW(
        '2026-09-12T10:02:00.000Z',
        '2026-09-12T10:05:00.000Z'
      );
      expect(result.winner).toBe('existing');
      expect(result.existingTime).toBeGreaterThan(result.incomingTime);
    });

    it('should declare incoming as winner when timestamps are identical (tie-breaker)', () => {
      const result = syncService.resolveConflictLWW(
        '2026-09-12T10:05:00.000Z',
        '2026-09-12T10:05:00.000Z'
      );
      expect(result.winner).toBe('incoming');
      expect(result.incomingTime).toBe(result.existingTime);
    });

    it('should handle missing or invalid timestamps gracefully', () => {
      const result1 = syncService.resolveConflictLWW(
        'invalid-date',
        '2026-09-12T10:05:00.000Z'
      );
      expect(result1).toBeDefined();

      const result2 = syncService.resolveConflictLWW(
        undefined,
        undefined
      );
      expect(result2).toBeDefined();
    });
  });

  describe('SyncService.syncBatch LWW integration', () => {
    it('should overwrite existing DB set when incoming client_timestamp is newer (RNF-03, DT-10)', async () => {
      vi.spyOn(setLogRepository, 'findBySessionAndExercise').mockResolvedValue([existingDbSet]);
      const updateSpy = vi.spyOn(setLogRepository, 'update').mockResolvedValue({
        ...existingDbSet,
        reps_completed: 10,
        weight_kg: 65,
        rir: 1,
        client_timestamp: '2026-09-12T10:10:00.000Z',
        updated_at: '2026-09-12T10:10:01.000Z'
      });

      const payload: SyncRequest = {
        sets: [
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 10,
            weight_kg: 65,
            rir: 1,
            client_timestamp: '2026-09-12T10:10:00.000Z' // Newer than 10:05:00
          }
        ]
      };

      const result = await syncService.syncBatch(athleteId, payload);

      expect(result.status).toBe(207); // Conflict occurred and resolved
      expect(result.body.conflicts_count).toBe(1);
      expect(result.body.processed_count).toBe(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateSpy).toHaveBeenCalledWith(existingSetId, {
        reps_completed: 10,
        weight_kg: 65,
        rir: 1,
        client_timestamp: '2026-09-12T10:10:00.000Z'
      });
    });

    it('should discard incoming set and keep DB set when incoming client_timestamp is older (stale write)', async () => {
      vi.spyOn(setLogRepository, 'findBySessionAndExercise').mockResolvedValue([existingDbSet]);
      const updateSpy = vi.spyOn(setLogRepository, 'update');

      const payload: SyncRequest = {
        sets: [
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 6,
            weight_kg: 50,
            rir: 3,
            client_timestamp: '2026-09-12T10:01:00.000Z' // Older than existing 10:05:00
          }
        ]
      };

      const result = await syncService.syncBatch(athleteId, payload);

      expect(result.status).toBe(207); // Conflict detected
      expect(result.body.conflicts_count).toBe(1);
      expect(result.body.processed_count).toBe(0); // Discarded
      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('should resolve multiple writes for the same set in a single batch preserving the latest timestamp', async () => {
      // Start with empty DB
      const currentSets: SetLog[] = [];
      vi.spyOn(setLogRepository, 'findBySessionAndExercise').mockImplementation(async () => currentSets);
      vi.spyOn(setLogRepository, 'create').mockImplementation(async (data) => {
        const newSet: SetLog = {
          id: 'set-new-1',
          session_id: data.session_id,
          exercise_id: data.exercise_id,
          set_number: data.set_number,
          reps_completed: data.reps_completed,
          weight_kg: data.weight_kg,
          rir: data.rir,
          client_timestamp: data.client_timestamp || new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        currentSets.push(newSet);
        return newSet;
      });
      vi.spyOn(setLogRepository, 'update').mockImplementation(async (id, data) => {
        const found = currentSets.find((s) => s.id === id);
        if (found) {
          Object.assign(found, data);
          return found;
        }
        return null;
      });

      // Lote con 2 versiones del mismo set en orden inverso (primero llega la más nueva, luego la más vieja)
      const payload: SyncRequest = {
        sets: [
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 12,
            weight_kg: 70,
            rir: 0,
            client_timestamp: '2026-09-12T10:15:00.000Z' // Más reciente
          },
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 8,
            weight_kg: 60,
            rir: 2,
            client_timestamp: '2026-09-12T10:05:00.000Z' // Más antigua
          }
        ]
      };

      const result = await syncService.syncBatch(athleteId, payload);

      expect(result.body.conflicts_count).toBe(1);
      // El set final en currentSets debe tener reps=12, weight=70 (la más reciente)
      expect(currentSets[0].reps_completed).toBe(12);
      expect(currentSets[0].weight_kg).toBe(70);
      expect(currentSets[0].client_timestamp).toBe('2026-09-12T10:15:00.000Z');
    });
  });

  describe('HTTP POST /api/sync endpoint conflict resolution', () => {
    it('should return HTTP 207 with conflicts_count: 1 when sending conflicting set log', async () => {
      vi.spyOn(setLogRepository, 'findBySessionAndExercise').mockResolvedValue([existingDbSet]);
      vi.spyOn(setLogRepository, 'update').mockResolvedValue({
        ...existingDbSet,
        reps_completed: 10,
        weight_kg: 65,
        client_timestamp: '2026-09-12T10:12:00.000Z'
      });

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          sets: [
            {
              exercise_id: 'press_banca',
              set_number: 1,
              reps_completed: 10,
              weight_kg: 65,
              rir: 1,
              client_timestamp: '2026-09-12T10:12:00.000Z'
            }
          ]
        });

      expect(res.status).toBe(207);
      const body: SyncResponse = res.body;
      expect(body.conflicts_count).toBe(1);
      expect(body.processed_count).toBe(1);
      expect(setLogRepository.update).toHaveBeenCalled();
    });
  });
});
