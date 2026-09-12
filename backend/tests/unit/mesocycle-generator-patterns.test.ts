import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MesocycleGeneratorService,
  ALL_MOVEMENT_PATTERNS
} from '../../src/services/mesocycle-generator.service.js';
import type { ExerciseRepository } from '../../src/repositories/exercise.repository.js';
import type { MesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import type { AthleteProfile, Exercise, MovementPattern } from '../../src/schemas/generated/schemas.js';

describe('TASK-25: Mesocycle Movement Pattern Balance (CA-02.1)', () => {
  let mockExerciseRepo: Partial<ExerciseRepository>;
  let mockMesocycleRepo: Partial<MesocycleRepository>;
  let generatorService: MesocycleGeneratorService;

  const mockExercises: Exercise[] = [
    {
      id: 'press_banca',
      name: 'Press de banca',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.65,
      video_url: 'https://youtube.com/watch?v=1',
      video_fallback_url: 'https://assets.smartforge.app/1.webp',
      instructions: 'Empuja la barra.',
      is_active: true
    },
    {
      id: 'press_militar',
      name: 'Press militar',
      movement_pattern: 'empuje',
      primary_muscle: 'hombros',
      secondary_muscles: ['triceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.45,
      video_url: 'https://youtube.com/watch?v=2',
      video_fallback_url: 'https://assets.smartforge.app/2.webp',
      instructions: 'Empuja vertical.',
      is_active: true
    },
    {
      id: 'dominadas',
      name: 'Dominadas',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'pullup_bar',
      is_compound: true,
      initial_load_ratio: 1.0,
      video_url: 'https://youtube.com/watch?v=3',
      video_fallback_url: 'https://assets.smartforge.app/3.webp',
      instructions: 'Tracciona hacia la barra.',
      is_active: true
    },
    {
      id: 'remo_barra',
      name: 'Remo con barra',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.55,
      video_url: 'https://youtube.com/watch?v=4',
      video_fallback_url: 'https://assets.smartforge.app/4.webp',
      instructions: 'Tracciona al abdomen.',
      is_active: true
    },
    {
      id: 'sentadilla_trasera',
      name: 'Sentadilla trasera',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.75,
      video_url: 'https://youtube.com/watch?v=5',
      video_fallback_url: 'https://assets.smartforge.app/5.webp',
      instructions: 'Flexiona rodillas y cadera.',
      is_active: true
    },
    {
      id: 'peso_muerto_rumano',
      name: 'Peso muerto rumano',
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'isquiosurales',
      secondary_muscles: ['gluteos', 'espalda'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.7,
      video_url: 'https://youtube.com/watch?v=6',
      video_fallback_url: 'https://assets.smartforge.app/6.webp',
      instructions: 'Bisagra de cadera.',
      is_active: true
    },
    {
      id: 'plancha_abdominal',
      name: 'Plancha abdominal',
      movement_pattern: 'core',
      primary_muscle: 'core',
      secondary_muscles: [],
      equipment_id: 'bodyweight',
      is_compound: false,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=7',
      video_fallback_url: 'https://assets.smartforge.app/7.webp',
      instructions: 'Mantén el cuerpo recto.',
      is_active: true
    }
  ];

  const createSampleAthlete = (days: number): AthleteProfile => ({
    id: 'athlete-1234',
    google_id: 'google-uid-123',
    email: 'athlete@example.com',
    name: 'Atleta Test',
    age: 26,
    weight_kg: 75,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: days,
    equipment: [
      { id: 'barbell', name: 'Barra', category: 'barras' },
      { id: 'pullup_bar', name: 'Barra dominadas', category: 'soportes' },
      { id: 'bodyweight', name: 'Peso corporal', category: 'peso_corporal' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  beforeEach(() => {
    mockExerciseRepo = {
      findAll: vi.fn().mockResolvedValue(mockExercises),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return mockExercises.find((e) => e.id === id) || null;
      })
    };
    mockMesocycleRepo = {
      create: vi.fn().mockImplementation(async (data) => data),
      archiveActiveByAthleteId: vi.fn().mockResolvedValue(1)
    };
    generatorService = new MesocycleGeneratorService(
      mockExerciseRepo as ExerciseRepository,
      mockMesocycleRepo as MesocycleRepository
    );
  });

  it('should define the 5 essential movement patterns in ALL_MOVEMENT_PATTERNS', () => {
    expect(ALL_MOVEMENT_PATTERNS).toEqual([
      'empuje',
      'tiron',
      'rodilla_dominante',
      'cadera_dominante',
      'core'
    ]);
  });

  describe('Split generation & 5-pattern balance for different available days (CA-02.1)', () => {
    const daysToTest = [1, 2, 3, 4, 5, 6, 7];

    daysToTest.forEach((days) => {
      it(`should cover all 5 movement patterns in each weekly plan for ${days} day(s)/week`, async () => {
        const athlete = createSampleAthlete(days);
        const plan = await generatorService.generatePlanStructure(athlete, mockExercises, 4);

        expect(plan.weeks).toHaveLength(4);

        for (const week of plan.weeks) {
          const distribution = generatorService.getMovementPatternDistribution(week, mockExercises);

          // Verify every movement pattern has at least 1 exercise assignment in the week
          ALL_MOVEMENT_PATTERNS.forEach((pattern: MovementPattern) => {
            expect(
              distribution[pattern],
              `Pattern "${pattern}" must be present in week ${week.week_number} for ${days} days/week split`
            ).toBeGreaterThan(0);
          });

          // Verify balance check returns true
          expect(generatorService.hasBalancedMovementPatterns(week, mockExercises)).toBe(true);
        }
      });
    });
  });

  describe('Exercise Selection matching patterns', () => {
    it('should assign only exercises that match the requested movement pattern', () => {
      const pushExercises = generatorService.filterCandidateExercises(
        mockExercises,
        'empuje',
        ['barbell', 'bodyweight']
      );

      expect(pushExercises.every((e) => e.movement_pattern === 'empuje')).toBe(true);
      expect(pushExercises.length).toBeGreaterThan(0);

      const pullExercises = generatorService.filterCandidateExercises(
        mockExercises,
        'tiron',
        ['pullup_bar', 'barbell']
      );

      expect(pullExercises.every((e) => e.movement_pattern === 'tiron')).toBe(true);
      expect(pullExercises.length).toBeGreaterThan(0);
    });

    it('should throw an error when balance validation fails due to missing patterns', () => {
      const incompleteWeek = {
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            day_number: 1,
            name: 'Solo empuje',
            exercise_assignments: [
              {
                exercise_id: 'press_banca',
                order_in_session: 1,
                target_sets: 3,
                target_reps: 10,
                target_rir: 2,
                target_load_kg: 60
              }
            ]
          }
        ]
      };

      expect(generatorService.hasBalancedMovementPatterns(incompleteWeek, mockExercises)).toBe(
        false
      );
    });
  });
});
