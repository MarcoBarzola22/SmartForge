import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoutineEditorService } from '../../src/services/routine-editor.service.js';
import { ExerciseRepository } from '../../src/repositories/exercise.repository.js';
import { AthleteRepository } from '../../src/repositories/athlete.repository.js';
import { ExerciseSwapRepository } from '../../src/repositories/exercise-swap.repository.js';
import { MesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { NotFoundError, BadRequestError } from '../../src/errors/app-error.js';
import type {
  Exercise,
  AthleteProfile,
  SwapExerciseRequest
} from '../../src/schemas/generated/schemas.js';

describe('TASK-32: RoutineEditorService.swapExercise', () => {
  let routineEditorService: RoutineEditorService;
  let mockExerciseRepo: ExerciseRepository;
  let mockAthleteRepo: AthleteRepository;
  let mockSwapRepo: ExerciseSwapRepository;
  let mockMesocycleRepo: MesocycleRepository;

  const mockOriginalExercise: Exercise = {
    id: 'barbell_bench_press',
    name: 'Press de Banca con Barra',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.75,
    video_url: 'https://youtube.com/watch?v=bench',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/bench.webp',
    instructions: 'Acuéstate en el banco plano...',
    is_active: true
  };

  const mockNewExercise: Exercise = {
    id: 'dumbbell_bench_press',
    name: 'Press con Mancuernas en Banco Plano',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'dumbbells',
    is_compound: true,
    initial_load_ratio: 0.6,
    video_url: 'https://youtube.com/watch?v=db_bench',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/db_bench.webp',
    instructions: 'Usa mancuernas...',
    is_active: true
  };

  const mockIncompatibleExercise: Exercise = {
    id: 'barbell_squat',
    name: 'Sentadilla Trasera con Barra',
    movement_pattern: 'rodilla_dominante',
    primary_muscle: 'cuadriceps',
    secondary_muscles: ['gluteos'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 1.0,
    video_url: 'https://youtube.com/watch?v=squat',
    video_fallback_url: 'https://assets.smartforge.app/fallbacks/squat.webp',
    instructions: 'Baja en sentadilla...',
    is_active: true
  };

  const mockAthlete: AthleteProfile = {
    id: 'c1111111-1111-1111-1111-111111111111',
    google_id: 'google_123',
    email: 'athlete@example.com',
    name: 'Carlos Ruiz',
    age: 28,
    weight_kg: 80,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra Olímpica', category: 'barbell' },
      { id: 'dumbbells', name: 'Mancuernas', category: 'dumbbells' },
      { id: 'flat_bench', name: 'Banco Plano', category: 'bench' }
    ],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z'
  };

  const mockAssignment = {
    id: 'a1111111-1111-1111-1111-111111111111',
    session_plan_id: 's1111111-1111-1111-1111-111111111111',
    exercise_id: 'barbell_bench_press',
    exercise: mockOriginalExercise,
    order_in_session: 1,
    target_sets: 4,
    target_reps: 8,
    target_rir: 2,
    target_load_kg: 60.0,
    notes: 'Controlar bajada',
    is_swapped: false,
    athlete_id: 'c1111111-1111-1111-1111-111111111111',
    mesocycle_id: 'm1111111-1111-1111-1111-111111111111',
    week_number: 1,
    day_number: 1
  };

  beforeEach(() => {
    mockExerciseRepo = {
      findById: vi.fn(async (id: string) => {
        if (id === 'barbell_bench_press') return mockOriginalExercise;
        if (id === 'dumbbell_bench_press') return mockNewExercise;
        if (id === 'barbell_squat') return mockIncompatibleExercise;
        return null;
      }),
      findAlternatives: vi.fn(async (id: string) => {
        if (id === 'barbell_bench_press') {
          return [
            {
              original_exercise_id: 'barbell_bench_press',
              alternative_exercise: mockNewExercise,
              similarity_score: 0.9
            }
          ];
        }
        return [];
      })
    } as unknown as ExerciseRepository;

    mockAthleteRepo = {
      findById: vi.fn(async (id: string) => {
        if (id === mockAthlete.id) return mockAthlete;
        return null;
      })
    } as unknown as AthleteRepository;

    mockSwapRepo = {
      create: vi.fn(async (data) => ({
        id: 'swap-1111-1111',
        assignment_id: data.assignment_id,
        original_exercise_id: data.original_exercise_id,
        new_exercise_id: data.new_exercise_id,
        reason: data.reason,
        notes: data.notes,
        created_at: new Date().toISOString()
      }))
    } as unknown as ExerciseSwapRepository;

    mockMesocycleRepo = {
      findAssignmentById: vi.fn(async (id: string) => {
        if (id === mockAssignment.id) return { ...mockAssignment };
        return null;
      }),
      updateAssignment: vi.fn(async (id: string, data) => ({
        id,
        session_plan_id: mockAssignment.session_plan_id,
        exercise_id: data.exercise_id,
        exercise: mockNewExercise,
        order_in_session: mockAssignment.order_in_session,
        target_sets: mockAssignment.target_sets,
        target_reps: mockAssignment.target_reps,
        target_rir: mockAssignment.target_rir,
        target_load_kg: data.target_load_kg ?? mockAssignment.target_load_kg,
        notes: data.notes ?? mockAssignment.notes,
        is_swapped: true
      })),
      cascadeAssignmentSwap: vi.fn(async () => 3)
    } as unknown as MesocycleRepository;

    routineEditorService = new RoutineEditorService(
      mockExerciseRepo,
      mockAthleteRepo,
      mockSwapRepo,
      mockMesocycleRepo
    );
  });

  it('should successfully swap an exercise in an assignment and record swap history (RF-03, CA-03.3, CA-03.4)', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'molestia_articular',
      notes: 'Dolor leve en hombro con barra'
    };

    const result = await routineEditorService.swapExercise(
      mockAssignment.id,
      swapReq,
      mockAthlete.id
    );

    expect(result).toBeDefined();
    expect(result.id).toBe(mockAssignment.id);
    expect(result.exercise_id).toBe('dumbbell_bench_press');
    expect(result.is_swapped).toBe(true);

    // Verify swap history was persisted with reason
    expect(mockSwapRepo.create).toHaveBeenCalledWith({
      assignment_id: mockAssignment.id,
      original_exercise_id: 'barbell_bench_press',
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'molestia_articular',
      notes: 'Dolor leve en hombro con barra'
    });

    // Verify mesocycle assignment was updated
    expect(mockMesocycleRepo.updateAssignment).toHaveBeenCalled();
  });

  it('should cascade the swap to subsequent weeks in the mesocycle by default', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'preferencia_personal'
    };

    await routineEditorService.swapExercise(
      mockAssignment.id,
      swapReq,
      mockAthlete.id
    );

    expect(mockMesocycleRepo.cascadeAssignmentSwap).toHaveBeenCalledWith(
      mockAssignment.mesocycle_id,
      mockAssignment.week_number,
      mockAssignment.day_number,
      mockAssignment.order_in_session,
      'barbell_bench_press',
      'dumbbell_bench_press',
      expect.any(Number)
    );
  });

  it('should not cascade when cascade is explicitly false', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'falta_equipamiento'
    };

    await routineEditorService.swapExercise(
      mockAssignment.id,
      swapReq,
      mockAthlete.id,
      false
    );

    expect(mockMesocycleRepo.cascadeAssignmentSwap).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError if assignment does not exist', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'preferencia_personal'
    };

    await expect(
      routineEditorService.swapExercise(
        'non-existent-assignment-id',
        swapReq,
        mockAthlete.id
      )
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError if assignment belongs to another athlete', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'preferencia_personal'
    };

    await expect(
      routineEditorService.swapExercise(
        mockAssignment.id,
        swapReq,
        'other-athlete-id'
      )
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError if new exercise does not exist in catalog', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'non_existent_exercise',
      reason: 'preferencia_personal'
    };

    await expect(
      routineEditorService.swapExercise(
        mockAssignment.id,
        swapReq,
        mockAthlete.id
      )
    ).rejects.toThrow(NotFoundError);
  });

  it('should throw BadRequestError if new exercise is identical to current exercise', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'barbell_bench_press',
      reason: 'preferencia_personal'
    };

    await expect(
      routineEditorService.swapExercise(
        mockAssignment.id,
        swapReq,
        mockAthlete.id
      )
    ).rejects.toThrow(BadRequestError);
  });

  it('should throw BadRequestError if athlete lacks equipment for new exercise', async () => {
    const athleteWithoutDumbbells: AthleteProfile = {
      ...mockAthlete,
      equipment: [{ id: 'barbell', name: 'Barra Olímpica', category: 'barbell' }]
    };
    vi.mocked(mockAthleteRepo.findById).mockResolvedValueOnce(athleteWithoutDumbbells);

    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'preferencia_personal'
    };

    await expect(
      routineEditorService.swapExercise(
        mockAssignment.id,
        swapReq,
        mockAthlete.id
      )
    ).rejects.toThrow(BadRequestError);
  });

  it('should throw BadRequestError if new exercise is biomechanically incompatible', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'barbell_squat',
      reason: 'preferencia_personal'
    };

    await expect(
      routineEditorService.swapExercise(
        mockAssignment.id,
        swapReq,
        mockAthlete.id
      )
    ).rejects.toThrow(BadRequestError);
  });

  it('should throw BadRequestError if reason is invalid', async () => {
    const swapReq = {
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'invalid_reason_value' as unknown as SwapExerciseRequest['reason']
    };

    await expect(
      routineEditorService.swapExercise(
        mockAssignment.id,
        swapReq,
        mockAthlete.id
      )
    ).rejects.toThrow(BadRequestError);
  });

  it('should recalculate target load based on athlete weight and new exercise initial_load_ratio', async () => {
    const swapReq: SwapExerciseRequest = {
      new_exercise_id: 'dumbbell_bench_press',
      reason: 'preferencia_personal'
    };

    // athlete weight: 80kg, dumbbell_bench_press ratio: 0.6 -> 48kg (or rounded to 0.5kg)
    await routineEditorService.swapExercise(
      mockAssignment.id,
      swapReq,
      mockAthlete.id
    );

    expect(mockMesocycleRepo.updateAssignment).toHaveBeenCalledWith(
      mockAssignment.id,
      expect.objectContaining({
        exercise_id: 'dumbbell_bench_press',
        target_load_kg: 48,
        is_swapped: true
      })
    );
  });
});
