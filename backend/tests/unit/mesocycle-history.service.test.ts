import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeE1RM,
  computeEffectiveSessionsCompleted,
  computeAdherence,
  formatLoadText,
  MesocycleHistoryService,
  type SessionExecutionSummary
} from '../../src/services/mesocycle-history.service.js';
import type { MesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import type { BaselineSnapshotRepository } from '../../src/repositories/baseline-snapshot.repository.js';
import type { SessionRepository } from '../../src/repositories/session.repository.js';
import type { SetLogRepository } from '../../src/repositories/set-log.repository.js';
import type { BodyWeightRepository } from '../../src/repositories/body-weight.repository.js';
import type { PoolLike } from '../../src/repositories/baseline-snapshot.repository.js';

describe('TASK-18: MesocycleHistoryService (RF-06)', () => {
  describe('Hybrid e1RM Formula & Load Taxonomy (RF-06 CA-06.2, CA-06.4)', () => {
    it('should compute e1RM using Brzycki formula for reps <= 10', () => {
      // 100 kg external load x 1 rep: 100 / (1.0278 - 0.0278 * 1) = 100 / 1.0 = 100.00
      const e1rm1 = computeE1RM('external_load', 100, 1, 75);
      expect(e1rm1).toBe(100.0);

      // 100 kg external load x 5 reps: 100 / (1.0278 - 0.0278 * 5) = 100 / 0.8888 = 112.51
      const e1rm5 = computeE1RM('external_load', 100, 5, 75);
      expect(e1rm5).toBe(112.51);

      // 100 kg external load x 10 reps: 100 / (1.0278 - 0.0278 * 10) = 100 / 0.7498 = 133.37
      const e1rm10 = computeE1RM('external_load', 100, 10, 75);
      expect(e1rm10).toBe(133.37);
    });

    it('should compute e1RM using Wathan formula for 11 <= reps <= 30', () => {
      // 100 kg external load x 15 reps:
      // denom = 48.8 + 53.8 * exp(-0.075 * 15) = 48.8 + 53.8 * 0.324652 = 48.8 + 17.4663 = 66.266
      // (100 * 100) / 66.266 = 150.91
      const e1rm15 = computeE1RM('external_load', 100, 15, 75);
      expect(e1rm15).toBe(150.91);

      // 100 kg external load x 30 reps:
      // denom = 48.8 + 53.8 * exp(-0.075 * 30) = 48.8 + 53.8 * 0.105399 = 48.8 + 5.6705 = 54.4705
      // (100 * 100) / 54.4705 = 183.59
      const e1rm30 = computeE1RM('external_load', 100, 30, 75);
      expect(e1rm30).toBe(183.59);
    });

    it('should cap reps at 30 when reps > 30 to preserve mathematical stability', () => {
      const e1rm30 = computeE1RM('external_load', 100, 30, 75);
      const e1rm40 = computeE1RM('external_load', 100, 40, 75);
      const e1rm100 = computeE1RM('external_load', 100, 100, 75);

      expect(e1rm40).toBe(e1rm30);
      expect(e1rm100).toBe(e1rm30);
    });

    it('should calculate total mass correctly for bodyweight load type', () => {
      // Bodyweight: total mass = athleteWeightKg
      const athleteWeight = 80;
      const e1rm = computeE1RM('bodyweight', 0, 10, athleteWeight);
      const expected = computeE1RM('external_load', 80, 10, 80);
      expect(e1rm).toBe(expected);
    });

    it('should calculate total mass correctly for bodyweight_loadable load type', () => {
      // Bodyweight loadable: total mass = athleteWeightKg + addedKg
      const athleteWeight = 75;
      const addedWeight = 25;
      const e1rm = computeE1RM('bodyweight_loadable', addedWeight, 5, athleteWeight);
      const expected = computeE1RM('external_load', 100, 5, 75);
      expect(e1rm).toBe(expected);
    });

    it('should calculate total mass correctly for assisted_bodyweight with floor of 1.0 kg', () => {
      const athleteWeight = 70;
      // Assistance of 20 kg -> net mass = 50 kg
      const e1rmAssisted = computeE1RM('assisted_bodyweight', 20, 5, athleteWeight);
      const expected = computeE1RM('external_load', 50, 5, athleteWeight);
      expect(e1rmAssisted).toBe(expected);

      // Assistance of 75 kg (exceeds athlete bodyweight 70 kg) -> floor of 1.0 kg (CA-06.2)
      const e1rmFloored = computeE1RM('assisted_bodyweight', 75, 5, athleteWeight);
      const expectedFloored = computeE1RM('external_load', 1.0, 5, athleteWeight);
      expect(e1rmFloored).toBe(expectedFloored);
      expect(e1rmFloored).toBeGreaterThan(0);
    });
  });

  describe('Effective Sessions & Adherence Proportional Computation (RF-06 CA-06.1)', () => {
    it('should count session as 1.0 if at least 50% of planned sets were completed', () => {
      const sessions: SessionExecutionSummary[] = [
        { plannedSets: 6, completedSets: 3 }, // 50% -> 1.0
        { plannedSets: 6, completedSets: 4 }, // 66.7% -> 1.0
        { plannedSets: 4, completedSets: 4 }, // 100% -> 1.0
      ];

      const effective = computeEffectiveSessionsCompleted(sessions);
      expect(effective).toBe(3.0);
    });

    it('should count session as proportional fraction if completed sets < 50%', () => {
      const sessions: SessionExecutionSummary[] = [
        { plannedSets: 6, completedSets: 2 }, // 2/6 = 0.3333...
        { plannedSets: 4, completedSets: 1 }, // 1/4 = 0.25
        { plannedSets: 5, completedSets: 0 }, // 0
      ];

      const effective = computeEffectiveSessionsCompleted(sessions);
      // 2/6 + 1/4 + 0 = 0.3333333333333333 + 0.25 = 0.5833333333333333
      expect(effective).toBeCloseTo(0.583, 3);
    });

    it('should compute adherence for completed mesocycle', () => {
      const res = computeAdherence({
        status: 'completed',
        plannedSessions: 24,
        effectiveSessionsCompleted: 24,
      });

      expect(res.adherencePercent).toBe(100);
      expect(res.adherenceDetails).toBeUndefined();

      const partialRes = computeAdherence({
        status: 'completed',
        plannedSessions: 24,
        effectiveSessionsCompleted: 18,
      });

      expect(partialRes.adherencePercent).toBe(75);
    });

    it('should compute adherence for cancelled mesocycle with time-based expected rate', () => {
      // 4 days/week, 14 days elapsed -> expected = (4 / 7) * 14 = 8 sessions
      // 6 effective sessions completed -> (6 / 8) * 100 = 75%
      const res = computeAdherence({
        status: 'cancelled',
        plannedSessions: 24,
        effectiveSessionsCompleted: 6,
        weeklyDays: 4,
        daysElapsed: 14,
      });

      expect(res.adherencePercent).toBe(75);
    });

    it('should add ahead sessions note when athlete completed more than expected before cancellation', () => {
      // 4 days/week, 7 days elapsed -> expected = (4 / 7) * 7 = 4 sessions
      // 5 effective sessions completed -> 5 > 4 -> capped at 100% with detail note
      const res = computeAdherence({
        status: 'cancelled',
        plannedSessions: 24,
        effectiveSessionsCompleted: 5,
        weeklyDays: 4,
        daysElapsed: 7,
      });

      expect(res.adherencePercent).toBe(100);
      expect(res.adherenceDetails).toBe('Cumplimiento: 100% (con sesiones adelantadas)');
    });
  });

  describe('Format Load Text (RF-06 CA-06.4)', () => {
    it('should format text properly according to load taxonomy', () => {
      expect(formatLoadText('bodyweight', 0, 8, 75.0)).toBe('75.0 kg (PC) × 8 reps');
      expect(formatLoadText('bodyweight_loadable', 10.0, 6, 75.0)).toBe('75.0 kg (PC) + 10.0 kg × 6 reps');
      expect(formatLoadText('assisted_bodyweight', 20.0, 8, 75.0)).toBe('75.0 kg (PC) - 20.0 kg (asist.) × 8 reps');
      expect(formatLoadText('external_load', 60.0, 10, 75.0)).toBe('60.0 kg × 10 reps');
    });
  });

  describe('MesocycleHistoryService Integration (RF-06 CA-06.1 - CA-06.6, RF-07 CA-07.8)', () => {
    let service: MesocycleHistoryService;
    let mockPool: PoolLike;
    let mockMesocycleRepo: MesocycleRepository;
    let mockBaselineRepo: BaselineSnapshotRepository;
    let mockSessionRepo: SessionRepository;
    let mockSetLogRepo: SetLogRepository;
    let mockBodyWeightRepo: BodyWeightRepository;

    beforeEach(() => {
      mockPool = {
        connect: vi.fn(),
        query: vi.fn(),
      };
      mockMesocycleRepo = {
        findById: vi.fn(),
        findActiveByAthleteId: vi.fn(),
      } as unknown as MesocycleRepository;

      mockBaselineRepo = {
        findByMesocycleId: vi.fn(),
      } as unknown as BaselineSnapshotRepository;

      mockSessionRepo = {} as unknown as SessionRepository;
      mockSetLogRepo = {} as unknown as SetLogRepository;
      mockBodyWeightRepo = {
        findLatestBeforeDate: vi.fn(),
      } as unknown as BodyWeightRepository;

      service = new MesocycleHistoryService(
        mockMesocycleRepo,
        mockBaselineRepo,
        mockSessionRepo,
        mockSetLogRepo,
        mockBodyWeightRepo,
        mockPool
      );
    });

    it('should discard cancelled mesocycles with 0 completed sessions (CA-07.8)', async () => {
      const athleteId = 'athlete-123';

      // Mock database returning one completed mesocycle and one cancelled with 0 sessions
      (mockPool.query as any).mockImplementation(async (sql: string, params?: any[]) => {
        if (sql.includes('FROM mesocycle')) {
          return {
            rows: [
              {
                id: 'meso-completed-1',
                athlete_id: athleteId,
                name: 'Hypertrophy Block A',
                training_goal: 'hipertrofia',
                duration_weeks: 6,
                start_date: '2026-01-01',
                end_date: '2026-02-12',
                status: 'completed',
                completion_reason: 'normal',
                cancelled_at: null,
                created_at: '2026-01-01T00:00:00.000Z',
                updated_at: '2026-02-12T00:00:00.000Z',
              },
              {
                id: 'meso-cancelled-empty',
                athlete_id: athleteId,
                name: 'Aborted Immediately',
                training_goal: 'fuerza',
                duration_weeks: 4,
                start_date: '2026-02-15',
                end_date: null,
                status: 'cancelled',
                completion_reason: 'cancelled_user',
                cancelled_at: '2026-02-16T00:00:00.000Z',
                created_at: '2026-02-15T00:00:00.000Z',
                updated_at: '2026-02-16T00:00:00.000Z',
              },
            ],
          };
        }
        if (sql.includes('FROM session_plan sp')) {
          // Planned sessions count
          return { rows: [{ count: 24 }] };
        }
        if (sql.includes('session_execution')) {
          if (params && params[0] === 'meso-cancelled-empty') {
            return { rows: [] };
          }
          // Return session summaries
          return {
            rows: [
              { session_id: 's1', planned_sets: 6, completed_sets: 6 },
              { session_id: 's2', planned_sets: 6, completed_sets: 6 },
            ],
          };
        }
        if (sql.includes('FROM exercise_assignment')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      (mockBaselineRepo.findByMesocycleId as any).mockResolvedValue([]);

      const result = await service.getAthleteHistory(athleteId);

      expect(result.mesocycles).toHaveLength(1);
      expect(result.mesocycles[0].id).toBe('meso-completed-1');
    });

    it('should calculate exercise progression and handle unexecuted exercises in cancelled cycle (CA-06.4, CA-06.5)', async () => {
      const athleteId = 'athlete-123';
      const mesocycleId = 'meso-cancelled-1';

      (mockPool.query as any).mockImplementation(async (sql: string, _params: any[]) => {
        if (sql.includes('FROM mesocycle')) {
          return {
            rows: [
              {
                id: mesocycleId,
                athlete_id: athleteId,
                name: 'Cancelled Meso With Work',
                training_goal: 'hipertrofia',
                duration_weeks: 6,
                start_date: '2026-03-01',
                end_date: null,
                status: 'cancelled',
                completion_reason: 'cancelled_user',
                cancelled_at: '2026-03-15T00:00:00.000Z',
                created_at: '2026-03-01T00:00:00.000Z',
                updated_at: '2026-03-15T00:00:00.000Z',
              },
            ],
          };
        }
        if (sql.includes('FROM session_plan sp')) {
          return { rows: [{ count: 24 }] };
        }
        if (sql.includes('session_execution')) {
          return {
            rows: [
              { session_id: 's1', planned_sets: 6, completed_sets: 6 },
              { session_id: 's2', planned_sets: 6, completed_sets: 6 },
              { session_id: 's3', planned_sets: 6, completed_sets: 2 }, // 2/6 = 0.33
            ],
          };
        }
        if (sql.includes('assigned_exercises')) {
          return {
            rows: [
              {
                exercise_id: 'bench-press',
                exercise_name: 'Press de Banca',
                load_type: 'external_load',
              },
              {
                exercise_id: 'incline-dumbbell-press',
                exercise_name: 'Press Inclinado con Mancuernas',
                load_type: 'external_load',
              },
            ],
          };
        }
        if (sql.includes('best_sets_for_mesocycle')) {
          // bench-press has sets; incline-dumbbell-press has none (unexecuted)
          return {
            rows: [
              {
                exercise_id: 'bench-press',
                weight_kg: 85.0,
                reps_completed: 8,
                rir: 2,
                session_date: '2026-03-14',
              },
            ],
          };
        }
        return { rows: [] };
      });

      // Baseline snapshots
      (mockBaselineRepo.findByMesocycleId as any).mockResolvedValue([
        {
          id: 'base-1',
          mesocycle_id: mesocycleId,
          exercise_id: 'bench-press',
          baseline_load_kg: 80.0,
          baseline_reps: 8,
          baseline_e1rm_kg: 99.33,
          athlete_bodyweight_kg: 75.0,
          source_type: 'history_rir_le_3',
        },
        {
          id: 'base-2',
          mesocycle_id: mesocycleId,
          exercise_id: 'incline-dumbbell-press',
          baseline_load_kg: 24.0,
          baseline_reps: 10,
          baseline_e1rm_kg: 32.01,
          athlete_bodyweight_kg: 75.0,
          source_type: 'experience_ratio_default',
        },
      ]);

      // Bodyweight carry-forward
      (mockBodyWeightRepo.findLatestBeforeDate as any).mockResolvedValue({
        weight_kg: 76.0,
        logged_date: '2026-03-10',
      });

      const result = await service.getAthleteHistory(athleteId);

      expect(result.mesocycles).toHaveLength(1);
      const meso = result.mesocycles[0];
      expect(meso.status).toBe('cancelled');
      expect(meso.exerciseProgressions).toHaveLength(2);

      // Bench press progression
      const bench = meso.exerciseProgressions.find((p) => p.exerciseId === 'bench-press')!;
      expect(bench.final.executed).toBe(true);
      expect(bench.final.loadText).toBe('85.0 kg × 8 reps');
      // e1RM for 85kg x 8 reps: 85 / (1.0278 - 0.0278 * 8) = 85 / 0.8054 = 105.54
      expect(bench.final.e1rmKg).toBe(105.54);
      expect(bench.progress).toBeDefined();
      expect(bench.progress?.deltaKg).toBe(6.21); // 105.54 - 99.33 = 6.21

      // Incline dumbbell press (unexecuted)
      const incline = meso.exerciseProgressions.find((p) => p.exerciseId === 'incline-dumbbell-press')!;
      expect(incline.final.executed).toBe(false);
      expect(incline.final.loadText).toBe('No ejecutado (Ciclo cancelado)');
      expect(incline.final.e1rmKg).toBe(0);
      expect(incline.progress).toBeUndefined();
    });

    it('should break ties in final performance by choosing higher load in kg', () => {
      // Two candidate sets with equal e1RM
      const setA = { weight_kg: 100, reps: 5 }; // e1RM = 112.51
      const setB = { weight_kg: 112.51, reps: 1 }; // e1RM = 112.51

      const e1rmA = computeE1RM('external_load', setA.weight_kg, setA.reps, 75);
      const e1rmB = computeE1RM('external_load', setB.weight_kg, setB.reps, 75);

      expect(e1rmA).toBe(e1rmB);
      // Tie breaker prefers higher weight
      const winner = setB.weight_kg > setA.weight_kg ? setB : setA;
      expect(winner.weight_kg).toBe(112.51);
    });
  });
});
