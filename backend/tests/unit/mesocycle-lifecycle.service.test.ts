import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MesocycleLifecycleService,
  evaluateAccessoryRotationRule,
  evaluateEarlyDeloadRule,
  applyPostCancellationRules,
  type CancelMesocycleExecutionResult,
  type PostCancellationContext
} from '../../src/services/mesocycle-lifecycle.service.js';
import type { CreateMesocycleData } from '../../src/repositories/mesocycle.repository.js';
import type { MesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import type { SessionRepository } from '../../src/repositories/session.repository.js';
import type { PoolLike, PoolClientLike } from '../../src/repositories/baseline-snapshot.repository.js';
import { NotFoundError, ConflictError } from '../../src/errors/app-error.js';

describe('TASK-27: MesocycleLifecycleService Unit Tests (RF-07, RF-08, Constitución Art. 4)', () => {
  let service: MesocycleLifecycleService;
  let mockPool: PoolLike;
  let mockClient: PoolClientLike;
  let mockMesocycleRepo: MesocycleRepository;
  let mockSessionRepo: SessionRepository;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn().mockImplementation((sql, params) => mockClient.query(sql, params)),
    };

    mockMesocycleRepo = {} as unknown as MesocycleRepository;
    mockSessionRepo = {} as unknown as SessionRepository;

    service = new MesocycleLifecycleService(
      mockMesocycleRepo,
      mockSessionRepo,
      mockPool
    );
  });

  describe('Unicidad y Reconciliación Determinista (RF-07 CA-07.1, CA-07.5, CA-07.10)', () => {
    it('should throw NotFoundError if no active and no completed mesocycle exists', async () => {
      const athleteId = 'athlete-123';

      (mockClient.query as any).mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes("status = 'active'")) {
          return { rows: [] };
        }
        if (sql.includes("status = 'completed'")) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      await expect(service.cancelActiveMesocycle(athleteId)).rejects.toThrow(NotFoundError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should resolve deterministically (NOOP) if mesocycle is already completed in server (CA-07.5)', async () => {
      const athleteId = 'athlete-123';

      (mockClient.query as any).mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes("status = 'active'")) {
          return { rows: [] };
        }
        if (sql.includes("status = 'completed'")) {
          return {
            rows: [
              {
                id: 'meso-completed-1',
                athlete_id: athleteId,
                status: 'completed',
                completion_reason: 'normal',
                duration_weeks: 6,
              },
            ],
          };
        }
        return { rows: [] };
      });

      const result: CancelMesocycleExecutionResult = await service.cancelActiveMesocycle(athleteId);

      expect(result.wasAlreadyCompleted).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.mesocycleId).toBe('meso-completed-1');
      expect(result.activeSessionFinalized).toBe(false);
      expect(result.cancelledSessionsCount).toBe(0);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw ConflictError if target mesocycle was already cancelled (CA-07.10)', async () => {
      const athleteId = 'athlete-123';
      const mesocycleId = 'meso-already-cancelled';

      (mockClient.query as any).mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes('FROM mesocycle') && sql.includes('id = $1')) {
          return {
            rows: [
              {
                id: mesocycleId,
                athlete_id: athleteId,
                status: 'cancelled',
                completion_reason: 'cancelled_user',
              },
            ],
          };
        }
        return { rows: [] };
      });

      await expect(service.cancelMesocycleById(mesocycleId, athleteId)).rejects.toThrow(ConflictError);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Finalización de sesión en curso y preservación de datos (RF-07 CA-07.6, CA-07.7)', () => {
    it('should automatically finalize in_progress session, cancel remaining sessions without physical DELETE (CA-07.6, CA-07.7)', async () => {
      const athleteId = 'athlete-123';
      const mesocycleId = 'meso-active-1';
      let executedDelete = false;

      (mockClient.query as any).mockImplementation(async (sql: string) => {
        if (sql.toUpperCase().includes('DELETE FROM')) {
          executedDelete = true;
        }
        if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes("status = 'active'")) {
          return {
            rows: [
              {
                id: mesocycleId,
                athlete_id: athleteId,
                status: 'active',
                duration_weeks: 6,
                start_date: '2026-03-01',
              },
            ],
          };
        }
        if (sql.includes("status = 'in_progress'")) {
          return {
            rows: [{ id: 'session-in-progress-1', session_plan_id: 'plan-1' }],
          };
        }
        if (sql.includes('UPDATE session') && sql.includes("status = 'completed'")) {
          return { rows: [], rowCount: 1 };
        }
        if (sql.includes('/* regular_and_deload_counts */')) {
          return {
            rows: [
              {
                regular_planned_sessions: 20,
                regular_completed_sessions: 8,
                deload_planned_sessions: 4,
              },
            ],
          };
        }
        if (sql.includes('UPDATE session') && sql.includes("status = 'cancelled'")) {
          return { rows: [], rowCount: 15 };
        }
        if (sql.includes('UPDATE mesocycle SET status = $2')) {
          return {
            rows: [
              {
                id: mesocycleId,
                status: 'cancelled',
                completion_reason: 'cancelled_user',
                cancelled_at: '2026-03-10T12:00:00.000Z',
              },
            ],
          };
        }
        if (sql.includes('/* total_completed_sessions */')) {
          return { rows: [{ total_completed: 8 }] };
        }
        return { rows: [] };
      });

      const result = await service.cancelActiveMesocycle(athleteId, {
        reason: 'cancelled_user',
      });

      expect(result.status).toBe('cancelled');
      expect(result.completionReason).toBe('cancelled_user');
      expect(result.activeSessionFinalized).toBe(true);
      expect(result.cancelledSessionsCount).toBe(15);
      expect(result.completedSessionsCount).toBe(8);
      expect(result.discardedFromHistory).toBe(false);
      expect(executedDelete).toBe(false); // Integrity: NO physical DELETE
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('Descarte de ciclos cancelados con 0 sesiones (RF-07 CA-07.8)', () => {
    it('should set discardedFromHistory = true when cancelled with 0 completed sessions', async () => {
      const athleteId = 'athlete-123';
      const mesocycleId = 'meso-aborted-immediately';

      (mockClient.query as any).mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes("status = 'active'")) {
          return {
            rows: [
              {
                id: mesocycleId,
                athlete_id: athleteId,
                status: 'active',
                duration_weeks: 4,
              },
            ],
          };
        }
        if (sql.includes("status = 'in_progress'")) {
          return { rows: [] }; // No session in progress
        }
        if (sql.includes('/* regular_and_deload_counts */')) {
          return {
            rows: [
              {
                regular_planned_sessions: 16,
                regular_completed_sessions: 0,
                deload_planned_sessions: 4,
              },
            ],
          };
        }
        if (sql.includes('UPDATE session') && sql.includes("status = 'cancelled'")) {
          return { rows: [], rowCount: 16 };
        }
        if (sql.includes('UPDATE mesocycle SET status = $2')) {
          return {
            rows: [
              {
                id: mesocycleId,
                status: 'cancelled',
                completion_reason: 'cancelled_user',
                cancelled_at: '2026-03-02T00:00:00.000Z',
              },
            ],
          };
        }
        if (sql.includes('/* total_completed_sessions */')) {
          return { rows: [{ total_completed: 0 }] };
        }
        return { rows: [] };
      });

      const result = await service.cancelActiveMesocycle(athleteId);

      expect(result.status).toBe('cancelled');
      expect(result.completedSessionsCount).toBe(0);
      expect(result.discardedFromHistory).toBe(true);
    });
  });

  describe('Clasificación como "Completado (Descarga omitida)" (RF-07 CA-07.11)', () => {
    it('should classify as completed with deload_skipped when cancelled during deload week with 100% regular overload completed', async () => {
      const athleteId = 'athlete-123';
      const mesocycleId = 'meso-deload-skip';

      (mockClient.query as any).mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes("status = 'active'")) {
          return {
            rows: [
              {
                id: mesocycleId,
                athlete_id: athleteId,
                status: 'active',
                duration_weeks: 5,
              },
            ],
          };
        }
        if (sql.includes("status = 'in_progress'")) {
          return { rows: [] };
        }
        if (sql.includes('/* regular_and_deload_counts */')) {
          // 4 weeks of regular overload (16 sessions), 100% completed
          // 1 week of deload (4 sessions)
          return {
            rows: [
              {
                regular_planned_sessions: 16,
                regular_completed_sessions: 16,
                deload_planned_sessions: 4,
              },
            ],
          };
        }
        if (sql.includes('UPDATE session') && sql.includes("status = 'cancelled'")) {
          return { rows: [], rowCount: 4 }; // remaining deload sessions cancelled
        }
        if (sql.includes('UPDATE mesocycle SET status = $2')) {
          return {
            rows: [
              {
                id: mesocycleId,
                status: 'completed',
                completion_reason: 'deload_skipped',
                cancelled_at: '2026-04-01T00:00:00.000Z',
              },
            ],
          };
        }
        if (sql.includes('/* total_completed_sessions */')) {
          return { rows: [{ total_completed: 16 }] };
        }
        return { rows: [] };
      });

      const result = await service.cancelActiveMesocycle(athleteId);

      expect(result.status).toBe('completed');
      expect(result.completionReason).toBe('deload_skipped');
      expect(result.discardedFromHistory).toBe(false);
      expect(result.completedSessionsCount).toBe(16);
    });

    it('should classify as cancelled if regular overload was not 100% completed', async () => {
      const athleteId = 'athlete-123';
      const mesocycleId = 'meso-incomplete-overload';

      (mockClient.query as any).mockImplementation(async (sql: string) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes("status = 'active'")) {
          return {
            rows: [
              {
                id: mesocycleId,
                athlete_id: athleteId,
                status: 'active',
                duration_weeks: 5,
              },
            ],
          };
        }
        if (sql.includes("status = 'in_progress'")) {
          return { rows: [] };
        }
        if (sql.includes('/* regular_and_deload_counts */')) {
          // Only 14 of 16 regular sessions completed
          return {
            rows: [
              {
                regular_planned_sessions: 16,
                regular_completed_sessions: 14,
                deload_planned_sessions: 4,
              },
            ],
          };
        }
        if (sql.includes('UPDATE session') && sql.includes("status = 'cancelled'")) {
          return { rows: [], rowCount: 6 };
        }
        if (sql.includes('UPDATE mesocycle SET status = $2')) {
          return {
            rows: [
              {
                id: mesocycleId,
                status: 'cancelled',
                completion_reason: 'cancelled_user',
                cancelled_at: '2026-04-01T00:00:00.000Z',
              },
            ],
          };
        }
        if (sql.includes('/* total_completed_sessions */')) {
          return { rows: [{ total_completed: 14 }] };
        }
        return { rows: [] };
      });

      const result = await service.cancelActiveMesocycle(athleteId);

      expect(result.status).toBe('cancelled');
      expect(result.completionReason).toBe('cancelled_user');
    });
  });

  describe('TASK-20: Reglas post-cancelación de cargas básicas, rotación y descarga temprana (RF-08)', () => {
    describe('Regla de rotación del 50% de semanas completadas (CA-08.2, CA-08.3)', () => {
      it('should NOT rotate accessories if cancelled with < 50% of programmed weeks completed', () => {
        // 6-week cycle, 2 weeks completed = 33.3% < 50%
        const result1 = evaluateAccessoryRotationRule(2, 6);
        expect(result1.shouldRotateAccessories).toBe(false);
        expect(result1.completionRatio).toBeCloseTo(0.333, 2);

        // 4-week cycle, 1 week completed = 25% < 50%
        const result2 = evaluateAccessoryRotationRule(1, 4);
        expect(result2.shouldRotateAccessories).toBe(false);
        expect(result2.completionRatio).toBe(0.25);
      });

      it('should rotate accessories if cancelled with >= 50% of programmed weeks completed', () => {
        // 6-week cycle, 3 weeks completed = 50%
        const result1 = evaluateAccessoryRotationRule(3, 6);
        expect(result1.shouldRotateAccessories).toBe(true);
        expect(result1.completionRatio).toBe(0.5);

        // 6-week cycle, 4 weeks completed = 66.7%
        const result2 = evaluateAccessoryRotationRule(4, 6);
        expect(result2.shouldRotateAccessories).toBe(true);

        // 4-week cycle, 2 weeks completed = 50%
        const result3 = evaluateAccessoryRotationRule(2, 4);
        expect(result3.shouldRotateAccessories).toBe(true);
      });
    });

    describe('Regla de descarga temprana tras fatiga acumulada (CA-08.5)', () => {
      it('should NOT require early deload if consecutive overload weeks < 4', () => {
        const res0 = evaluateEarlyDeloadRule(0);
        expect(res0.requiresEarlyDeload).toBe(false);
        expect(res0.earlyDeloadWeek).toBeUndefined();

        const res3 = evaluateEarlyDeloadRule(3);
        expect(res3.requiresEarlyDeload).toBe(false);
        expect(res3.earlyDeloadWeek).toBeUndefined();
      });

      it('should require early deload at week 3 if consecutive overload weeks >= 4', () => {
        // 4 consecutive weeks
        const res4 = evaluateEarlyDeloadRule(4);
        expect(res4.requiresEarlyDeload).toBe(true);
        expect(res4.earlyDeloadWeek).toBe(3);

        // 5 consecutive weeks
        const res5 = evaluateEarlyDeloadRule(5);
        expect(res5.requiresEarlyDeload).toBe(true);
        expect(res5.earlyDeloadWeek).toBe(3);
      });
    });

    describe('getPostCancellationContext integration (RF-08)', () => {
      it('should return null if athlete has no cancelled mesocycle', async () => {
        (mockClient.query as any).mockImplementation(async (sql: string) => {
          if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
          if (sql.includes("status = 'cancelled'")) {
            return { rows: [] };
          }
          return { rows: [] };
        });

        const ctx = await service.getPostCancellationContext('athlete-no-cancelled');
        expect(ctx).toBeNull();
      });

      it('should compute context with preserved compound loads, accessory rotation flag, and early deload', async () => {
        const athleteId = 'athlete-with-cancelled';
        const cancelledMesoId = 'meso-cancelled-long';

        (mockClient.query as any).mockImplementation(async (sql: string) => {
          if (sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT') return { rows: [] };
          if (sql.includes("SELECT id, duration_weeks") && sql.includes("status = 'cancelled'")) {
            return {
              rows: [
                {
                  id: cancelledMesoId,
                  duration_weeks: 6,
                  start_date: '2026-02-01',
                  cancelled_at: '2026-03-05',
                },
              ],
            };
          }
          if (sql.includes('/* week_completion_summary */')) {
            // 4 consecutive overload weeks fully completed (weeks 1 to 4 completed, week 5 partially/cancelled)
            return {
              rows: [
                { week_number: 1, is_deload: false, planned_sessions: 4, completed_sessions: 4 },
                { week_number: 2, is_deload: false, planned_sessions: 4, completed_sessions: 4 },
                { week_number: 3, is_deload: false, planned_sessions: 4, completed_sessions: 4 },
                { week_number: 4, is_deload: false, planned_sessions: 4, completed_sessions: 4 },
                { week_number: 5, is_deload: false, planned_sessions: 4, completed_sessions: 1 },
                { week_number: 6, is_deload: true, planned_sessions: 4, completed_sessions: 0 },
              ],
            };
          }
          if (sql.includes('/* preserved_compound_loads */')) {
            return {
              rows: [
                { exercise_id: 'barbell-bench-press', max_load_kg: 100.0 },
                { exercise_id: 'barbell-back-squat', max_load_kg: 140.0 },
                { exercise_id: 'barbell-deadlift', max_load_kg: 160.0 },
              ],
            };
          }
          return { rows: [] };
        });

        const ctx = await service.getPostCancellationContext(athleteId);

        expect(ctx).not.toBeNull();
        expect(ctx?.cancelledMesocycleId).toBe(cancelledMesoId);
        expect(ctx?.durationWeeks).toBe(6);
        expect(ctx?.completedWeeksCount).toBe(4);
        expect(ctx?.completionPercentage).toBe(67); // 4/6 = 66.67% -> 67%
        expect(ctx?.shouldRotateAccessories).toBe(true); // >= 50%
        expect(ctx?.requiresEarlyDeload).toBe(true); // >= 4 consecutive overload weeks
        expect(ctx?.earlyDeloadWeek).toBe(3);
        expect(ctx?.preservedCompoundLoads['barbell-bench-press']).toBe(100.0);
        expect(ctx?.preservedCompoundLoads['barbell-back-squat']).toBe(140.0);
        expect(ctx?.preservedCompoundLoads['barbell-deadlift']).toBe(160.0);
      });
    });

    describe('applyPostCancellationRules (RF-08 CA-08.4, CA-08.5)', () => {
      it('should preserve main compound loads and schedule early deload at week 3', () => {
        const dummyNewMeso: CreateMesocycleData = {
          athlete_id: 'athlete-1',
          name: 'Post-Cancellation Meso',
          experience_level: 'intermedio',
          training_goal: 'fuerza',
          periodization_type: 'ondulante',
          duration_weeks: 6,
          weeks: [
            {
              week_number: 1,
              is_deload: false,
              sessions: [
                {
                  day_number: 1,
                  name: 'Dia 1',
                  exercise_assignments: [
                    {
                      exercise_id: 'barbell-bench-press',
                      order_in_session: 1,
                      target_sets: 4,
                      target_reps: 6,
                      target_rir: 2,
                      target_load_kg: 85.0, // newly calculated starting load is lower than preserved 100 kg
                    },
                    {
                      exercise_id: 'dumbbell-curl',
                      order_in_session: 2,
                      target_sets: 3,
                      target_reps: 10,
                      target_rir: 2,
                      target_load_kg: 14.0,
                    },
                  ],
                },
              ],
            },
            {
              week_number: 2,
              is_deload: false,
              sessions: [],
            },
            {
              week_number: 3,
              is_deload: false, // Originally not deload
              sessions: [],
            },
            {
              week_number: 4,
              is_deload: false,
              sessions: [],
            },
            {
              week_number: 5,
              is_deload: false,
              sessions: [],
            },
            {
              week_number: 6,
              is_deload: true, // Originally deload at end
              sessions: [],
            },
          ],
        };

        const context: PostCancellationContext = {
          cancelledMesocycleId: 'meso-prev',
          durationWeeks: 6,
          completedWeeksCount: 4,
          completionPercentage: 67,
          shouldRotateAccessories: true,
          requiresEarlyDeload: true,
          earlyDeloadWeek: 3,
          preservedCompoundLoads: {
            'barbell-bench-press': 100.0,
          },
        };

        const updated = applyPostCancellationRules(dummyNewMeso, context);

        // CA-08.4: Bench press target_load_kg updated to 100.0
        const benchAssignment = updated.weeks[0].sessions[0].exercise_assignments[0];
        expect(benchAssignment.target_load_kg).toBe(100.0);

        // Accessory target load untouched
        const curlAssignment = updated.weeks[0].sessions[0].exercise_assignments[1];
        expect(curlAssignment.target_load_kg).toBe(14.0);

        // CA-08.5: Week 3 scheduled as early deload
        const week3 = updated.weeks.find((w) => w.week_number === 3);
        expect(week3?.is_deload).toBe(true);
      });
    });
  });
});

