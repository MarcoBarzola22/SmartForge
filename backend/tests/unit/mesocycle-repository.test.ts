import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MesocycleRepository,
  type CreateMesocycleData,
  type PoolLike
} from '../../src/repositories/mesocycle.repository.js';

describe('TASK-24: MesocycleRepository', () => {
  let mockClient: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
  let mockPool: PoolLike;
  let repo: MesocycleRepository;

  const sampleCreateData: CreateMesocycleData = {
    athlete_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Mesociclo 1 - Hipertrofia Intermedio',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    periodization_type: 'ondulante',
    duration_weeks: 4,
    weeks: [
      {
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            day_number: 1,
            name: 'Día 1 - Torso',
            exercise_assignments: [
              {
                exercise_id: 'press_banca_plano_barra',
                order_in_session: 1,
                target_sets: 4,
                target_reps: 10,
                target_rir: 2,
                target_load_kg: 70.0,
                notes: 'Controlar bajada'
              }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };
    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn()
    };
    repo = new MesocycleRepository(mockPool);
  });

  describe('create', () => {
    it('should create a full mesocycle structure within a single database transaction', async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.startsWith('BEGIN')) return { rows: [] };
        if (normalized.startsWith('INSERT INTO mesocycle')) {
          return {
            rows: [
              {
                id: 'meso-uuid-111',
                athlete_id: sampleCreateData.athlete_id,
                name: sampleCreateData.name,
                experience_level: sampleCreateData.experience_level,
                training_goal: sampleCreateData.training_goal,
                periodization_type: sampleCreateData.periodization_type,
                duration_weeks: sampleCreateData.duration_weeks,
                status: 'active',
                start_date: '2026-09-11',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]
          };
        }
        if (normalized.startsWith('INSERT INTO week_plan')) {
          return {
            rows: [
              {
                id: 'week-uuid-111',
                mesocycle_id: 'meso-uuid-111',
                week_number: 1,
                is_deload: false
              }
            ]
          };
        }
        if (normalized.startsWith('INSERT INTO session_plan')) {
          return {
            rows: [
              {
                id: 'session-uuid-111',
                week_plan_id: 'week-uuid-111',
                day_number: 1,
                name: 'Día 1 - Torso'
              }
            ]
          };
        }
        if (normalized.startsWith('INSERT INTO exercise_assignment')) {
          return {
            rows: [
              {
                id: 'assignment-uuid-111',
                session_plan_id: 'session-uuid-111',
                exercise_id: 'press_banca_plano_barra',
                order_in_session: 1,
                target_sets: 4,
                target_reps: 10,
                target_rir: 2,
                target_load_kg: 70.0,
                notes: 'Controlar bajada',
                is_swapped: false
              }
            ]
          };
        }
        if (normalized.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const result = await repo.create(sampleCreateData);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();

      expect(result.id).toBe('meso-uuid-111');
      expect(result.name).toBe(sampleCreateData.name);
      expect(result.weeks).toHaveLength(1);
      expect(result.weeks[0].week_number).toBe(1);
      expect(result.weeks[0].sessions).toHaveLength(1);
      expect(result.weeks[0].sessions[0].name).toBe('Día 1 - Torso');
      expect(result.weeks[0].sessions[0].exercise_assignments).toHaveLength(1);
      expect(result.weeks[0].sessions[0].exercise_assignments[0].exercise_id).toBe(
        'press_banca_plano_barra'
      );
    });

    it('should rollback transaction and release client when an insertion query fails', async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('BEGIN')) return { rows: [] };
        if (normalized.startsWith('INSERT INTO mesocycle')) {
          throw new Error('Database constraint violation');
        }
        return { rows: [] };
      });

      await expect(repo.create(sampleCreateData)).rejects.toThrow(
        'Database constraint violation'
      );

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should retrieve full mesocycle hierarchy by ID', async () => {
      vi.mocked(mockPool.query).mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.startsWith('SELECT id, athlete_id, name') && normalized.includes('FROM mesocycle WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'meso-uuid-111',
                athlete_id: 'athlete-123',
                name: 'Mesociclo 1',
                experience_level: 'intermedio',
                training_goal: 'hipertrofia',
                periodization_type: 'ondulante',
                duration_weeks: 4,
                status: 'active',
                start_date: '2026-09-11'
              }
            ]
          };
        }
        if (normalized.startsWith('SELECT id, mesocycle_id, week_number, is_deload FROM week_plan')) {
          return {
            rows: [
              {
                id: 'week-uuid-111',
                mesocycle_id: 'meso-uuid-111',
                week_number: 1,
                is_deload: false
              }
            ]
          };
        }
        if (normalized.startsWith('SELECT id, week_plan_id, day_number, name FROM session_plan')) {
          return {
            rows: [
              {
                id: 'session-uuid-111',
                week_plan_id: 'week-uuid-111',
                day_number: 1,
                name: 'Día 1 - Torso'
              }
            ]
          };
        }
        if (normalized.startsWith('SELECT ea.id, ea.session_plan_id, ea.exercise_id, ea.order_in_session')) {
          return {
            rows: [
              {
                id: 'assignment-uuid-111',
                session_plan_id: 'session-uuid-111',
                exercise_id: 'press_banca_plano_barra',
                order_in_session: 1,
                target_sets: 4,
                target_reps: 10,
                target_rir: 2,
                target_load_kg: 70.0,
                notes: 'Controlar',
                is_swapped: false,
                e_id: 'press_banca_plano_barra',
                e_name: 'Press de banca plano con barra',
                e_movement_pattern: 'empuje',
                e_primary_muscle: 'pecho',
                e_secondary_muscles: ['triceps'],
                e_equipment_id: 'barbell',
                e_is_compound: true,
                e_video_url: 'https://youtube.com/watch?v=123',
                e_is_active: true
              }
            ]
          };
        }
        return { rows: [] };
      });

      const result = await repo.findById('meso-uuid-111');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('meso-uuid-111');
      expect(result?.weeks).toHaveLength(1);
      expect(result?.weeks[0].sessions).toHaveLength(1);
      expect(result?.weeks[0].sessions[0].exercise_assignments).toHaveLength(1);
    });

    it('should return null when mesocycle is not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValue({ rows: [] });

      const result = await repo.findById('non-existent-meso');
      expect(result).toBeNull();
    });
  });

  describe('findActiveByAthleteId', () => {
    it('should find active mesocycle for athlete', async () => {
      vi.mocked(mockPool.query).mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();

        if (normalized.includes("status = 'active'")) {
          return {
            rows: [
              {
                id: 'meso-uuid-active'
              }
            ]
          };
        }
        if (normalized.startsWith('SELECT id, athlete_id, name') && normalized.includes('FROM mesocycle WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'meso-uuid-active',
                athlete_id: 'athlete-123',
                name: 'Mesociclo Activo',
                experience_level: 'intermedio',
                training_goal: 'hipertrofia',
                periodization_type: 'ondulante',
                duration_weeks: 4,
                status: 'active',
                start_date: '2026-09-11'
              }
            ]
          };
        }
        if (normalized.startsWith('SELECT id, mesocycle_id, week_number, is_deload FROM week_plan')) {
          return { rows: [] };
        }
        return { rows: [] };
      });

      const result = await repo.findActiveByAthleteId('athlete-123');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('meso-uuid-active');
      expect(result?.status).toBe('active');
    });
  });

  describe('archiveActiveByAthleteId', () => {
    it('should update active mesocycles to archived status for athlete', async () => {
      vi.mocked(mockPool.query).mockResolvedValue({ rows: [], rowCount: 1 });

      const count = await repo.archiveActiveByAthleteId('athlete-123');
      expect(count).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'archived'"),
        ['athlete-123']
      );
    });
  });

  describe('findAssignmentById', () => {
    it('should retrieve assignment with context by ID', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          {
            id: 'ea-111',
            session_plan_id: 'sp-111',
            exercise_id: 'barbell_bench_press',
            order_in_session: 1,
            target_sets: 4,
            target_reps: 8,
            target_rir: 2,
            target_load_kg: 60.0,
            notes: 'Test',
            is_swapped: false,
            day_number: 1,
            session_name: 'Torso A',
            week_number: 1,
            mesocycle_id: 'meso-111',
            athlete_id: 'athlete-111',
            e_id: 'barbell_bench_press',
            e_name: 'Press de Banca',
            e_movement_pattern: 'empuje',
            e_primary_muscle: 'pecho',
            e_secondary_muscles: ['triceps'],
            e_equipment_id: 'barbell',
            e_is_compound: true,
            e_initial_load_ratio: 0.75,
            e_video_url: 'https://youtube.com',
            e_video_fallback_url: 'https://smartforge.app',
            e_instructions: 'Press',
            e_is_active: true
          }
        ]
      });

      const result = await repo.findAssignmentById('ea-111');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('ea-111');
      expect(result?.athlete_id).toBe('athlete-111');
      expect(result?.mesocycle_id).toBe('meso-111');
      expect(result?.exercise.name).toBe('Press de Banca');
    });

    it('should return null when assignment is not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findAssignmentById('ea-missing');
      expect(result).toBeNull();
    });
  });

  describe('updateAssignment', () => {
    it('should update exercise assignment and return refreshed details', async () => {
      vi.mocked(mockPool.query).mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('UPDATE exercise_assignment')) {
          return {
            rows: [
              {
                id: 'ea-111',
                session_plan_id: 'sp-111',
                exercise_id: 'dumbbell_bench_press',
                order_in_session: 1,
                target_sets: 4,
                target_reps: 8,
                target_rir: 2,
                target_load_kg: 50.0,
                notes: 'Swapped',
                is_swapped: true
              }
            ]
          };
        }
        if (normalized.startsWith('SELECT ea.id, ea.session_plan_id')) {
          return {
            rows: [
              {
                id: 'ea-111',
                session_plan_id: 'sp-111',
                exercise_id: 'dumbbell_bench_press',
                order_in_session: 1,
                target_sets: 4,
                target_reps: 8,
                target_rir: 2,
                target_load_kg: 50.0,
                notes: 'Swapped',
                is_swapped: true,
                day_number: 1,
                session_name: 'Torso A',
                week_number: 1,
                mesocycle_id: 'meso-111',
                athlete_id: 'athlete-111',
                e_id: 'dumbbell_bench_press',
                e_name: 'Press con Mancuernas',
                e_movement_pattern: 'empuje',
                e_primary_muscle: 'pecho',
                e_secondary_muscles: ['triceps'],
                e_equipment_id: 'dumbbells',
                e_is_compound: true,
                e_initial_load_ratio: 0.6,
                e_video_url: 'https://youtube.com',
                e_video_fallback_url: 'https://smartforge.app',
                e_instructions: 'Press',
                e_is_active: true
              }
            ]
          };
        }
        return { rows: [] };
      });

      const result = await repo.updateAssignment('ea-111', {
        exercise_id: 'dumbbell_bench_press',
        target_load_kg: 50.0,
        is_swapped: true
      });

      expect(result).not.toBeNull();
      expect(result?.exercise_id).toBe('dumbbell_bench_press');
      expect(result?.is_swapped).toBe(true);
      expect(result?.target_load_kg).toBe(50.0);
    });
  });

  describe('cascadeAssignmentSwap', () => {
    it('should update matching subsequent assignments in mesocycle', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], rowCount: 3 });

      const count = await repo.cascadeAssignmentSwap(
        'meso-111',
        1,
        1,
        1,
        'barbell_bench_press',
        'dumbbell_bench_press',
        50.0
      );

      expect(count).toBe(3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE exercise_assignment ea'),
        ['meso-111', 1, 1, 1, 'dumbbell_bench_press', 50.0, 'barbell_bench_press']
      );
    });
  });
});

