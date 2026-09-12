import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RoutineEditorService,
  NO_ALTERNATIVES_MESSAGE
} from '../../src/services/routine-editor.service.js';
import type { ExerciseRepository } from '../../src/repositories/exercise.repository.js';
import type { AthleteRepository } from '../../src/repositories/athlete.repository.js';
import type { ExerciseSwapRepository } from '../../src/repositories/exercise-swap.repository.js';
import type { AthleteProfile, Exercise, ExerciseAlternative } from '../../src/schemas/generated/schemas.js';
import { NotFoundError } from '../../src/errors/app-error.js';

describe('TASK-31: Routine Editor - Compatible Alternatives Filtered by Equipment (RF-03, CA-03.1, CA-03.2)', () => {
  let mockExerciseRepo: Partial<ExerciseRepository>;
  let mockAthleteRepo: Partial<AthleteRepository>;
  let mockSwapRepo: Partial<ExerciseSwapRepository>;
  let routineEditorService: RoutineEditorService;

  const athleteId = 'athlete-uuid-1234';
  const exerciseId = 'press_banca';

  const sampleAthlete: AthleteProfile = {
    id: athleteId,
    google_id: 'google-sub-123',
    email: 'athlete@smartforge.test',
    name: 'Atleta Test',
    age: 26,
    weight_kg: 78,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra', category: 'barras' },
      { id: 'bodyweight', name: 'Peso corporal', category: 'peso_corporal' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleExercise: Exercise = {
    id: exerciseId,
    name: 'Press de banca con barra',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.65,
    video_url: 'https://youtube.com/watch?v=1',
    video_fallback_url: 'https://assets.smartforge.app/1.webp',
    instructions: 'Empuja la barra sobre el pecho.',
    is_active: true
  };

  const barbellAlternative: ExerciseAlternative = {
    original_exercise_id: exerciseId,
    similarity_score: 0.95,
    alternative_exercise: {
      id: 'press_banca_inclinado',
      name: 'Press de banca inclinado con barra',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.55,
      video_url: 'https://youtube.com/watch?v=2',
      video_fallback_url: 'https://assets.smartforge.app/2.webp',
      instructions: 'Empuje inclinado.',
      is_active: true
    }
  };

  const dumbbellAlternative: ExerciseAlternative = {
    original_exercise_id: exerciseId,
    similarity_score: 0.9,
    alternative_exercise: {
      id: 'press_mancuernas',
      name: 'Press con mancuernas',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps'],
      equipment_id: 'dumbbell',
      is_compound: true,
      initial_load_ratio: 0.5,
      video_url: 'https://youtube.com/watch?v=3',
      video_fallback_url: 'https://assets.smartforge.app/3.webp',
      instructions: 'Empuja mancuernas.',
      is_active: true
    }
  };

  const pushupAlternative: ExerciseAlternative = {
    original_exercise_id: exerciseId,
    similarity_score: 0.8,
    alternative_exercise: {
      id: 'flexiones_suelo',
      name: 'Flexiones de brazos',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'core'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=4',
      video_fallback_url: 'https://assets.smartforge.app/4.webp',
      instructions: 'Flexiones.',
      is_active: true
    }
  };

  beforeEach(() => {
    mockAthleteRepo = {
      findById: vi.fn().mockImplementation(async (id: string) => {
        if (id === athleteId) return sampleAthlete;
        return null;
      })
    };

    mockExerciseRepo = {
      findById: vi.fn().mockImplementation(async (id: string) => {
        if (id === exerciseId) return sampleExercise;
        return null;
      }),
      findAlternatives: vi.fn().mockImplementation(async (_id: string, equipmentIds?: string[]) => {
        const allAlts = [barbellAlternative, dumbbellAlternative, pushupAlternative];
        if (!equipmentIds || equipmentIds.length === 0) {
          return allAlts;
        }
        const set = new Set([...equipmentIds, 'bodyweight']);
        return allAlts.filter((alt) => set.has(alt.alternative_exercise.equipment_id));
      })
    };

    mockSwapRepo = {
      create: vi.fn(),
      findByAthleteId: vi.fn().mockResolvedValue([])
    };

    routineEditorService = new RoutineEditorService(
      mockExerciseRepo as ExerciseRepository,
      mockAthleteRepo as AthleteRepository,
      mockSwapRepo as ExerciseSwapRepository
    );
  });

  describe('Constant NO_ALTERNATIVES_MESSAGE', () => {
    it('should define the exact Spanish message required by CA-03.2 and CL-04', () => {
      expect(NO_ALTERNATIVES_MESSAGE).toBe('No se encontró alternativa con tu equipamiento');
    });
  });

  describe('getAlternativesForAthlete (CA-03.1)', () => {
    it('should return alternatives compatible with the athlete equipment sorted by similarity_score', async () => {
      const result = await routineEditorService.getAlternativesForAthlete(athleteId, exerciseId);

      expect(result.exercise_id).toBe(exerciseId);
      expect(result.alternatives).toHaveLength(2); // barbell + bodyweight
      expect(result.alternatives[0].alternative_exercise.id).toBe('press_banca_inclinado');
      expect(result.alternatives[1].alternative_exercise.id).toBe('flexiones_suelo');
      expect(result.message).toBeUndefined();

      expect(mockExerciseRepo.findAlternatives).toHaveBeenCalledWith(
        exerciseId,
        ['barbell', 'bodyweight']
      );
    });

    it('should show all available alternatives even if fewer than 2 match (e.g. 1 match)', async () => {
      // Athlete with only bodyweight (only flexiones matches)
      const bodyweightOnlyAthlete: AthleteProfile = {
        ...sampleAthlete,
        equipment: [{ id: 'bodyweight', name: 'Peso corporal', category: 'peso_corporal' }]
      };
      vi.mocked(mockAthleteRepo.findById!).mockResolvedValueOnce(bodyweightOnlyAthlete);

      const result = await routineEditorService.getAlternativesForAthlete(athleteId, exerciseId);

      expect(result.alternatives).toHaveLength(1);
      expect(result.alternatives[0].alternative_exercise.id).toBe('flexiones_suelo');
      expect(result.message).toBeUndefined();
    });

    it('should return empty list and NO_ALTERNATIVES_MESSAGE when no compatible alternative exists (CA-03.2)', async () => {
      // Mock findAlternatives returning empty array
      vi.mocked(mockExerciseRepo.findAlternatives!).mockResolvedValueOnce([]);

      const result = await routineEditorService.getAlternativesForAthlete(athleteId, exerciseId);

      expect(result.alternatives).toEqual([]);
      expect(result.message).toBe(NO_ALTERNATIVES_MESSAGE);
    });

    it('should throw NotFoundError if athlete does not exist', async () => {
      await expect(
        routineEditorService.getAlternativesForAthlete('non-existent-athlete', exerciseId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if exercise does not exist', async () => {
      await expect(
        routineEditorService.getAlternativesForAthlete(athleteId, 'non-existent-exercise')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAlternativesByEquipment', () => {
    it('should return alternatives filtered directly by a given list of equipment IDs', async () => {
      const result = await routineEditorService.getAlternativesByEquipment(exerciseId, ['dumbbell']);

      expect(result.alternatives).toHaveLength(2); // dumbbell + bodyweight (always included)
      expect(result.alternatives.some((a) => a.alternative_exercise.equipment_id === 'dumbbell')).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should return NO_ALTERNATIVES_MESSAGE when no alternatives match given equipment', async () => {
      vi.mocked(mockExerciseRepo.findAlternatives!).mockResolvedValueOnce([]);

      const result = await routineEditorService.getAlternativesByEquipment(exerciseId, ['kettlebell']);

      expect(result.alternatives).toHaveLength(0);
      expect(result.message).toBe(NO_ALTERNATIVES_MESSAGE);
    });
  });
});
