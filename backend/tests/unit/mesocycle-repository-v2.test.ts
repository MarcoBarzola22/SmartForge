import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MesocycleRepository,
  type CreateMesocycleData,
  type PoolLike,
} from '../../src/repositories/mesocycle.repository.js';

describe('TASK-11: MesocycleRepository V2 and Cancellation Unit Tests', () => {
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
  let mockPool: PoolLike;
  let repo: MesocycleRepository;

  const sampleAthleteId = '123e4567-e89b-12d3-a456-426614174000';
  const sampleMesoId = 'meso-uuid-222';

  const sampleCreateV2Data: CreateMesocycleData = {
    athlete_id: sampleAthleteId,
    name: 'Mesociclo V2 - Hipertrofia',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    periodization_type: 'ondulante',
    duration_weeks: 6,
    session_duration_minutes: 60,
    target_exercises_per_session: 4,
    weeks: [
      {
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            day_number: 1,
            name: 'Sesión 1 - Torso',
            exercise_assignments: [
              {
                exercise_id: 'pull_up',
                order_in_session: 1,
                target_sets: 3,
                target_reps: 8,
                target_rir: 2,
                target_load_kg: 0.0,
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };
    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn(),
    };
    repo = new MesocycleRepository(mockPool);
  });

  describe('create with V2 parameters (RF-03)', () => {
    it('should persist session_duration_minutes and target_exercises_per_session in transaction', async () => {
      mockClient.query.mockImplementation(async (sql: string, params?: unknown[]) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.startsWith('BEGIN')) return { rows: [] };
        if (normalized.startsWith('INSERT INTO mesocycle')) {
          expect(params).toContain(60);
          expect(params).toContain(4);
          return {
            rows: [
              {
                id: sampleMesoId,
                athlete_id: sampleAthleteId,
                name: sampleCreateV2Data.name,
                experience_level: sampleCreateV2Data.experience_level,
                training_goal: sampleCreateV2Data.training_goal,
                periodization_type: sampleCreateV2Data.periodization_type,
                duration_weeks: sampleCreateV2Data.duration_weeks,
                session_duration_minutes: 60,
                target_exercises_per_session: 4,
                status: 'active',
                start_date: '2026-09-14',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          };
        }
        if (normalized.startsWith('SELECT id, name')) {
          return {
            rows: [
              {
                id: 'pull_up',
                name: 'Dominadas',
                movement_pattern: 'tiron',
                primary_muscle: 'espalda',
                secondary_muscles: ['biceps'],
                equipment_id: 'bodyweight',
                is_compound: true,
                initial_load_ratio: 1.0,
                video_url: 'https://smartforge.app/video',
                video_fallback_url: 'https://smartforge.app/fallback',
                instructions: '',
                is_active: true,
              },
            ],
          };
        }
        if (normalized.startsWith('INSERT INTO week_plan')) {
          return { rows: [{ id: 'week-1', mesocycle_id: sampleMesoId, week_number: 1, is_deload: false }] };
        }
        if (normalized.startsWith('INSERT INTO session_plan')) {
          return { rows: [{ id: 'sp-1', week_plan_id: 'week-1', day_number: 1, name: 'Sesión 1' }] };
        }
        if (normalized.startsWith('INSERT INTO exercise_assignment')) {
          return {
            rows: [
              {
                id: 'ea-1',
                session_plan_id: 'sp-1',
                exercise_id: 'pull_up',
                order_in_session: 1,
                target_sets: 3,
                target_reps: 8,
                target_rir: 2,
                target_load_kg: 0.0,
                is_swapped: false,
              },
            ],
          };
        }
        if (normalized.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const result = await repo.create(sampleCreateV2Data);

      expect(result.id).toBe(sampleMesoId);
      expect(result.status).toBe('active');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('COMMIT'));
    });
  });

  describe('cancelActiveByAthleteId (RF-07 CA-07.5, CA-07.7)', () => {
    it('should cancel active mesocycle and batch-cancel uncompleted sessions', async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.startsWith('BEGIN')) return { rows: [] };

        // Check active mesocycle query
        if (normalized.includes('FROM mesocycle') && normalized.includes('status = \'active\'')) {
          return {
            rows: [
              {
                id: sampleMesoId,
                athlete_id: sampleAthleteId,
                status: 'active',
              },
            ],
            rowCount: 1,
          };
        }

        // Update mesocycle status to cancelled
        if (normalized.startsWith('UPDATE mesocycle SET status = \'cancelled\'')) {
          return {
            rows: [
              {
                id: sampleMesoId,
                status: 'cancelled',
                completion_reason: 'cancelled_user',
                cancelled_at: new Date('2026-09-14T12:00:00Z'),
              },
            ],
            rowCount: 1,
          };
        }

        // Batch cancel sessions
        if (normalized.startsWith('UPDATE session') && normalized.includes('status = \'cancelled\'')) {
          return { rows: [], rowCount: 4 };
        }

        if (normalized.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const cancelResult = await repo.cancelActiveByAthleteId(sampleAthleteId, 'cancelled_user');

      expect(cancelResult).not.toBeNull();
      expect(cancelResult?.mesocycleId).toBe(sampleMesoId);
      expect(cancelResult?.previousStatus).toBe('active');
      expect(cancelResult?.currentStatus).toBe('cancelled');
      expect(cancelResult?.wasCompleted).toBe(false);
      expect(cancelResult?.cancelledSessionsCount).toBe(4);
      expect(cancelResult?.cancelledAt).toBeDefined();
    });

    it('should NOT overwrite completed status when mesocycle is already completed (CA-07.5 deterministic resolution)', async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.startsWith('BEGIN')) return { rows: [] };

        // No active mesocycle, but completed exists
        if (normalized.includes('FROM mesocycle') && normalized.includes('status = \'active\'')) {
          return { rows: [], rowCount: 0 };
        }
        if (normalized.includes('FROM mesocycle') && normalized.includes('status = \'completed\'')) {
          return {
            rows: [
              {
                id: sampleMesoId,
                athlete_id: sampleAthleteId,
                status: 'completed',
              },
            ],
            rowCount: 1,
          };
        }

        if (normalized.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const cancelResult = await repo.cancelActiveByAthleteId(sampleAthleteId, 'cancelled_user');

      expect(cancelResult).not.toBeNull();
      expect(cancelResult?.wasCompleted).toBe(true);
      expect(cancelResult?.currentStatus).toBe('completed');
      expect(cancelResult?.cancelledSessionsCount).toBe(0);
    });

    it('should return null when no active or completed mesocycle exists for athlete', async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('BEGIN')) return { rows: [] };
        if (normalized.includes('FROM mesocycle')) return { rows: [], rowCount: 0 };
        if (normalized.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const cancelResult = await repo.cancelActiveByAthleteId(sampleAthleteId, 'cancelled_user');
      expect(cancelResult).toBeNull();
    });
  });

  describe('cancelById', () => {
    it('should cancel specific mesocycle by ID for athlete', async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('BEGIN')) return { rows: [] };

        if (normalized.startsWith('SELECT id, athlete_id, status FROM mesocycle WHERE id = $1')) {
          return {
            rows: [{ id: sampleMesoId, athlete_id: sampleAthleteId, status: 'active' }],
            rowCount: 1,
          };
        }

        if (normalized.startsWith('UPDATE mesocycle SET status = \'cancelled\'')) {
          return {
            rows: [
              {
                id: sampleMesoId,
                status: 'cancelled',
                completion_reason: 'cancelled_injury',
                cancelled_at: new Date('2026-09-14T15:00:00Z'),
              },
            ],
            rowCount: 1,
          };
        }

        if (normalized.startsWith('UPDATE session') && normalized.includes('status = \'cancelled\'')) {
          return { rows: [], rowCount: 2 };
        }

        if (normalized.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const res = await repo.cancelById(sampleMesoId, sampleAthleteId, 'cancelled_injury');
      expect(res).not.toBeNull();
      expect(res?.mesocycleId).toBe(sampleMesoId);
      expect(res?.currentStatus).toBe('cancelled');
      expect(res?.cancelledSessionsCount).toBe(2);
    });
  });
});
