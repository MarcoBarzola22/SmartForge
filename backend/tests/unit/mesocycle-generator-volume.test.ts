import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MesocycleGeneratorService,
  SCHOENFELD_VOLUME_RANGES,
  ALL_MOVEMENT_PATTERNS
} from '../../src/services/mesocycle-generator.service.js';
import type { ExerciseRepository } from '../../src/repositories/exercise.repository.js';
import type { MesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import type {
  AthleteProfile,
  Exercise,
  ExperienceLevel
} from '../../src/schemas/generated/schemas.js';

describe('TASK-27: Weekly Volume Calculation by Experience Level (CA-02.3, Schoenfeld et al.)', () => {
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
      id: 'remo_barra',
      name: 'Remo con barra',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.55,
      video_url: 'https://youtube.com/watch?v=3',
      video_fallback_url: 'https://assets.smartforge.app/3.webp',
      instructions: 'Tracciona hacia el torso.',
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
      video_url: 'https://youtube.com/watch?v=4',
      video_fallback_url: 'https://assets.smartforge.app/4.webp',
      instructions: 'Tracciona cuerpo completo.',
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
      secondary_muscles: ['gluteos'],
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
      instructions: 'Mantén tensión en core.',
      is_active: true
    }
  ];

  const createAthlete = (
    experienceLevel: ExperienceLevel,
    daysPerWeek = 4
  ): AthleteProfile => ({
    id: 'athlete-volume-test',
    google_id: 'google-volume-test',
    email: 'volume@smartforge.test',
    name: 'Atleta Volumen',
    age: 25,
    weight_kg: 80,
    experience_level: experienceLevel,
    training_goal: 'hipertrofia',
    available_days_per_week: daysPerWeek,
    equipment: [
      { id: 'barbell', name: 'Barra', category: 'barras' },
      { id: 'pullup_bar', name: 'Barra de dominadas', category: 'soportes' },
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

  describe('Schoenfeld Volume Ranges definition', () => {
    it('should define exact Schoenfeld volume ranges for all experience levels', () => {
      expect(SCHOENFELD_VOLUME_RANGES.principiante).toEqual({
        min: 10,
        max: 14,
        target: 12
      });

      expect(SCHOENFELD_VOLUME_RANGES.intermedio).toEqual({
        min: 14,
        max: 20,
        target: 16
      });

      expect(SCHOENFELD_VOLUME_RANGES.avanzado).toEqual({
        min: 18,
        max: 24,
        target: 20
      });
    });

    it('should expose getSchoenfeldVolumeRange method matching experience level', () => {
      expect(generatorService.getSchoenfeldVolumeRange('principiante')).toEqual({
        min: 10,
        max: 14,
        target: 12
      });
      expect(generatorService.getSchoenfeldVolumeRange('intermedio')).toEqual({
        min: 14,
        max: 20,
        target: 16
      });
      expect(generatorService.getSchoenfeldVolumeRange('avanzado')).toEqual({
        min: 18,
        max: 24,
        target: 20
      });
    });
  });

  describe('Principiante: 10–14 sets per pattern/muscle weekly', () => {
    const daysToTest = [2, 3, 4, 5, 6];

    daysToTest.forEach((days) => {
      it(`should generate 10–14 weekly sets per movement pattern for principiante with ${days} days/week`, async () => {
        const athlete = createAthlete('principiante', days);
        const plan = await generatorService.generatePlanStructure(athlete, mockExercises, 4);

        // Check regular weeks (weeks 1 to 3)
        const regularWeeks = plan.weeks.filter((w) => !w.is_deload);

        for (const week of regularWeeks) {
          const patternVolume = generatorService.getWeeklyVolumeByPattern(week, mockExercises);

          for (const pattern of ALL_MOVEMENT_PATTERNS) {
            const sets = patternVolume[pattern];
            expect(
              sets,
              `Principiante ${days}d/wk week ${week.week_number} pattern "${pattern}" sets=${sets} must be in [10, 14]`
            ).toBeGreaterThanOrEqual(10);
            expect(
              sets,
              `Principiante ${days}d/wk week ${week.week_number} pattern "${pattern}" sets=${sets} must be in [10, 14]`
            ).toBeLessThanOrEqual(14);
          }
        }
      });
    });
  });

  describe('Intermedio: 14–20 sets per pattern/muscle weekly', () => {
    const daysToTest = [2, 3, 4, 5, 6];

    daysToTest.forEach((days) => {
      it(`should generate 14–20 weekly sets per movement pattern for intermedio with ${days} days/week`, async () => {
        const athlete = createAthlete('intermedio', days);
        const plan = await generatorService.generatePlanStructure(athlete, mockExercises, 4);

        const regularWeeks = plan.weeks.filter((w) => !w.is_deload);

        for (const week of regularWeeks) {
          const patternVolume = generatorService.getWeeklyVolumeByPattern(week, mockExercises);

          for (const pattern of ALL_MOVEMENT_PATTERNS) {
            const sets = patternVolume[pattern];
            expect(
              sets,
              `Intermedio ${days}d/wk week ${week.week_number} pattern "${pattern}" sets=${sets} must be in [14, 20]`
            ).toBeGreaterThanOrEqual(14);
            expect(
              sets,
              `Intermedio ${days}d/wk week ${week.week_number} pattern "${pattern}" sets=${sets} must be in [14, 20]`
            ).toBeLessThanOrEqual(20);
          }
        }
      });
    });
  });

  describe('Avanzado: 18–24 sets per pattern/muscle weekly', () => {
    const daysToTest = [2, 3, 4, 5, 6];

    daysToTest.forEach((days) => {
      it(`should generate 18–24 weekly sets per movement pattern for avanzado with ${days} days/week`, async () => {
        const athlete = createAthlete('avanzado', days);
        const plan = await generatorService.generatePlanStructure(athlete, mockExercises, 4);

        const regularWeeks = plan.weeks.filter((w) => !w.is_deload);

        for (const week of regularWeeks) {
          const patternVolume = generatorService.getWeeklyVolumeByPattern(week, mockExercises);

          for (const pattern of ALL_MOVEMENT_PATTERNS) {
            const sets = patternVolume[pattern];
            expect(
              sets,
              `Avanzado ${days}d/wk week ${week.week_number} pattern "${pattern}" sets=${sets} must be in [18, 24]`
            ).toBeGreaterThanOrEqual(18);
            expect(
              sets,
              `Avanzado ${days}d/wk week ${week.week_number} pattern "${pattern}" sets=${sets} must be in [18, 24]`
            ).toBeLessThanOrEqual(24);
          }
        }
      });
    });
  });

  describe('Deload Week Volume Reduction (CA-10.2 / plan.md)', () => {
    it('should reduce volume in deload week compared to regular weeks', async () => {
      const athlete = createAthlete('intermedio', 4);
      const plan = await generatorService.generatePlanStructure(athlete, mockExercises, 4);

      const regularWeek = plan.weeks.find((w) => !w.is_deload)!;
      const deloadWeek = plan.weeks.find((w) => w.is_deload)!;

      const regularVol = generatorService.getWeeklyVolumeByPattern(regularWeek, mockExercises);
      const deloadVol = generatorService.getWeeklyVolumeByPattern(deloadWeek, mockExercises);

      for (const pattern of ALL_MOVEMENT_PATTERNS) {
        expect(deloadVol[pattern]).toBeLessThan(regularVol[pattern]);
        // Deload should be roughly 60% of regular volume (>=40% reduction)
        expect(deloadVol[pattern]).toBeLessThanOrEqual(Math.round(regularVol[pattern] * 0.75));
      }
    });
  });

  describe('Volume inspection by muscle group', () => {
    it('should calculate weekly volume aggregated by primary_muscle accurately', async () => {
      const athlete = createAthlete('principiante', 4);
      const plan = await generatorService.generatePlanStructure(athlete, mockExercises, 4);

      const week1 = plan.weeks[0];
      const muscleVolume = generatorService.getWeeklyVolumeByMuscleGroup(week1, mockExercises);

      expect(muscleVolume.pecho).toBeGreaterThan(0);
      expect(muscleVolume.espalda).toBeGreaterThan(0);
      expect(muscleVolume.cuadriceps).toBeGreaterThan(0);
      expect(muscleVolume.isquiosurales).toBeGreaterThan(0);
      expect(muscleVolume.core).toBeGreaterThan(0);
    });
  });

  describe('Schoenfeld Compliance Validator', () => {
    it('should return compliant: true for generated regular weeks across all levels', async () => {
      for (const level of ['principiante', 'intermedio', 'avanzado'] as ExperienceLevel[]) {
        const athlete = createAthlete(level, 4);
        const plan = await generatorService.generatePlanStructure(athlete, mockExercises, 4);

        for (const week of plan.weeks.filter((w) => !w.is_deload)) {
          const validation = generatorService.validateSchoenfeldCompliance(
            week,
            mockExercises,
            level,
            false
          );
          expect(validation.compliant).toBe(true);
        }
      }
    });
  });
});
