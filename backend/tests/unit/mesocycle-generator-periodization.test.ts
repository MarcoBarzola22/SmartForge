import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MesocycleGeneratorService
} from '../../src/services/mesocycle-generator.service.js';
import type { ExerciseRepository } from '../../src/repositories/exercise.repository.js';
import type { MesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import type {
  AthleteProfile,
  Exercise,
  ExperienceLevel,
  TrainingGoal
} from '../../src/schemas/generated/schemas.js';

describe('TASK-28: Periodization & Initial Load Estimation (CA-02.4, CA-02.5, RF-02)', () => {
  let mockExerciseRepo: Partial<ExerciseRepository>;
  let mockMesocycleRepo: Partial<MesocycleRepository>;
  let generatorService: MesocycleGeneratorService;

  const sampleExercises: Exercise[] = [
    {
      id: 'bench_press_custom_ratio',
      name: 'Press de banca (ratio explícito)',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.65,
      video_url: 'https://youtube.com/watch?v=1',
      video_fallback_url: 'https://assets.smartforge.app/1.webp',
      instructions: 'Empuje plano.',
      is_active: true
    },
    {
      id: 'push_compound_default',
      name: 'Press militar compuesto',
      movement_pattern: 'empuje',
      primary_muscle: 'hombros',
      secondary_muscles: ['triceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=2',
      video_fallback_url: 'https://assets.smartforge.app/2.webp',
      instructions: 'Empuje vertical.',
      is_active: true
    },
    {
      id: 'pull_compound_default',
      name: 'Remo con barra',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=3',
      video_fallback_url: 'https://assets.smartforge.app/3.webp',
      instructions: 'Tracción horizontal.',
      is_active: true
    },
    {
      id: 'squat_compound_default',
      name: 'Sentadilla trasera',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=4',
      video_fallback_url: 'https://assets.smartforge.app/4.webp',
      instructions: 'Flexión de rodilla.',
      is_active: true
    },
    {
      id: 'deadlift_compound_default',
      name: 'Peso muerto',
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'isquiosurales',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=5',
      video_fallback_url: 'https://assets.smartforge.app/5.webp',
      instructions: 'Bisagra de cadera.',
      is_active: true
    },
    {
      id: 'core_mono_default',
      name: 'Crunch con polea',
      movement_pattern: 'core',
      primary_muscle: 'core',
      secondary_muscles: [],
      equipment_id: 'cable',
      is_compound: false,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=6',
      video_fallback_url: 'https://assets.smartforge.app/6.webp',
      instructions: 'Aislamiento abdominal.',
      is_active: true
    },
    {
      id: 'bodyweight_pushup',
      name: 'Flexiones de brazos',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=7',
      video_fallback_url: 'https://assets.smartforge.app/7.webp',
      instructions: 'Peso corporal.',
      is_active: true
    }
  ];

  const createAthlete = (
    goal: TrainingGoal = 'fuerza',
    level: ExperienceLevel = 'intermedio',
    weightKg = 80,
    days = 4
  ): AthleteProfile => ({
    id: 'athlete-periodization-test',
    google_id: 'google-periodization-123',
    email: 'periodization@smartforge.test',
    name: 'Atleta Periodización',
    age: 26,
    weight_kg: weightKg,
    experience_level: level,
    training_goal: goal,
    available_days_per_week: days,
    equipment: [
      { id: 'barbell', name: 'Barra', category: 'barras' },
      { id: 'cable', name: 'Polea', category: 'maquinas' },
      { id: 'bodyweight', name: 'Peso corporal', category: 'peso_corporal' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  beforeEach(() => {
    mockExerciseRepo = {
      findAll: vi.fn().mockResolvedValue(sampleExercises),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return sampleExercises.find((e) => e.id === id) || null;
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

  describe('Initial Load Estimation (CA-02.5 & CL-11)', () => {
    it('should assign 0 kg for bodyweight exercises regardless of athlete weight or level', () => {
      const bwExercise = sampleExercises.find((e) => e.id === 'bodyweight_pushup')!;
      const athlete = createAthlete('fuerza', 'avanzado', 90);

      const load = generatorService.calculateInitialLoad(athlete, bwExercise);
      expect(load).toBe(0.0);
    });

    it('should use explicit initial_load_ratio when defined in exercise and round to 0.5 kg step', () => {
      const exercise = sampleExercises.find((e) => e.id === 'bench_press_custom_ratio')!; // ratio 0.65
      const athlete = createAthlete('fuerza', 'intermedio', 75); // 75 * 0.65 = 48.75 -> 49.0 kg

      const load = generatorService.calculateInitialLoad(athlete, exercise);
      expect(load).toBe(49.0);
    });

    it('should apply default initial load ratios table when exercise ratio is 0 or undefined', () => {
      const athlete80kg = createAthlete('fuerza', 'principiante', 80);

      // Empuje compuesto principiante: 0.50x -> 40.0 kg
      const pushEx = sampleExercises.find((e) => e.id === 'push_compound_default')!;
      expect(generatorService.calculateInitialLoad(athlete80kg, pushEx)).toBe(40.0);

      // Tirón compuesto principiante: 0.40x -> 32.0 kg
      const pullEx = sampleExercises.find((e) => e.id === 'pull_compound_default')!;
      expect(generatorService.calculateInitialLoad(athlete80kg, pullEx)).toBe(32.0);

      // Rodilla compuesto principiante: 0.50x -> 40.0 kg
      const squatEx = sampleExercises.find((e) => e.id === 'squat_compound_default')!;
      expect(generatorService.calculateInitialLoad(athlete80kg, squatEx)).toBe(40.0);

      // Cadera compuesto principiante: 0.60x -> 48.0 kg
      const deadliftEx = sampleExercises.find((e) => e.id === 'deadlift_compound_default')!;
      expect(generatorService.calculateInitialLoad(athlete80kg, deadliftEx)).toBe(48.0);

      // Core / monoarticular principiante: 0.10x -> 8.0 kg
      const coreEx = sampleExercises.find((e) => e.id === 'core_mono_default')!;
      expect(generatorService.calculateInitialLoad(athlete80kg, coreEx)).toBe(8.0);
    });

    it('should scale default ratios according to intermediate and advanced experience levels', () => {
      const intermediateAthlete = createAthlete('fuerza', 'intermedio', 80);
      const advancedAthlete = createAthlete('fuerza', 'avanzado', 80);

      const squatEx = sampleExercises.find((e) => e.id === 'squat_compound_default')!;
      // Intermedio rodilla compuesto: 0.80x -> 64.0 kg
      expect(generatorService.calculateInitialLoad(intermediateAthlete, squatEx)).toBe(64.0);
      // Avanzado rodilla compuesto: 1.20x -> 96.0 kg
      expect(generatorService.calculateInitialLoad(advancedAthlete, squatEx)).toBe(96.0);

      const deadliftEx = sampleExercises.find((e) => e.id === 'deadlift_compound_default')!;
      // Intermedio cadera compuesto: 0.90x -> 72.0 kg
      expect(generatorService.calculateInitialLoad(intermediateAthlete, deadliftEx)).toBe(72.0);
      // Avanzado cadera compuesto: 1.30x -> 104.0 kg
      expect(generatorService.calculateInitialLoad(advancedAthlete, deadliftEx)).toBe(104.0);
    });
  });

  describe('Linear Periodization for Fuerza (CA-02.4)', () => {
    it('should assign lineal periodization type and progress load week-over-week for fuerza goal', async () => {
      const athlete = createAthlete('fuerza', 'principiante', 80, 4);
      const plan = await generatorService.generatePlanStructure(athlete, sampleExercises, 4);

      expect(plan.periodization_type).toBe('lineal');
      expect(plan.weeks).toHaveLength(4);

      const week1 = plan.weeks[0];
      const week2 = plan.weeks[1];
      const week3 = plan.weeks[2];
      const deloadWeek = plan.weeks[3];

      // Verify working weeks have progressive increase in load
      const w1Load = week1.sessions[0].exercise_assignments[0].target_load_kg;
      const w2Load = week2.sessions[0].exercise_assignments[0].target_load_kg;
      const w3Load = week3.sessions[0].exercise_assignments[0].target_load_kg;

      expect(w2Load).toBeGreaterThanOrEqual(w1Load);
      expect(w3Load).toBeGreaterThanOrEqual(w2Load);

      // Working weeks should have strength rep target (5 reps) and RIR 2
      expect(week1.sessions[0].exercise_assignments[0].target_reps).toBe(5);
      expect(week1.sessions[0].exercise_assignments[0].target_rir).toBe(2);

      // Deload week (CA-10.2) should reduce load (-10% from base) and target RIR 3
      const deloadLoad = deloadWeek.sessions[0].exercise_assignments[0].target_load_kg;
      expect(deloadLoad).toBeLessThan(w1Load);
      expect(deloadWeek.sessions[0].exercise_assignments[0].target_rir).toBe(3);
    });
  });

  describe('Undulating Periodization for Hipertrofia and Mixto (CA-02.4)', () => {
    it('should assign ondulante periodization type and undulate volume/intensity for hipertrofia goal', async () => {
      const athlete = createAthlete('hipertrofia', 'intermedio', 80, 4);
      const plan = await generatorService.generatePlanStructure(athlete, sampleExercises, 6);

      expect(plan.periodization_type).toBe('ondulante');
      expect(plan.weeks).toHaveLength(6);

      const week1 = plan.weeks[0];
      const week2 = plan.weeks[1];
      const week3 = plan.weeks[2];

      const repsW1 = week1.sessions[0].exercise_assignments[0].target_reps;
      const repsW2 = week2.sessions[0].exercise_assignments[0].target_reps;
      const repsW3 = week3.sessions[0].exercise_assignments[0].target_reps;

      // Undulating scheme varies target reps across weeks (e.g. 12 -> 10 -> 8)
      expect(repsW1).not.toBe(repsW2);
      expect(repsW2).not.toBe(repsW3);
      expect(repsW1).not.toBe(repsW3);

      // Deload week should have RIR 3 and reduced volume
      const deloadWeek = plan.weeks[5];
      expect(deloadWeek.is_deload).toBe(true);
      expect(deloadWeek.sessions[0].exercise_assignments[0].target_rir).toBe(3);
    });

    it('should assign ondulante periodization type for mixto goal', async () => {
      const athlete = createAthlete('mixto', 'intermedio', 80, 4);
      const plan = await generatorService.generatePlanStructure(athlete, sampleExercises, 4);

      expect(plan.periodization_type).toBe('ondulante');
    });
  });

  describe('Default Duration Rules by Experience Level (CA-10.1)', () => {
    it('should default to 4 weeks for principiante, 6 weeks for intermedio, 8 weeks for avanzado', async () => {
      expect(generatorService.getDefaultMesocycleDuration('principiante')).toBe(4);
      expect(generatorService.getDefaultMesocycleDuration('intermedio')).toBe(6);
      expect(generatorService.getDefaultMesocycleDuration('avanzado')).toBe(8);

      const begAthlete = createAthlete('fuerza', 'principiante');
      const begPlan = await generatorService.generatePlanStructure(begAthlete, sampleExercises);
      expect(begPlan.duration_weeks).toBe(4);
      expect(begPlan.weeks).toHaveLength(4);

      const intAthlete = createAthlete('hipertrofia', 'intermedio');
      const intPlan = await generatorService.generatePlanStructure(intAthlete, sampleExercises);
      expect(intPlan.duration_weeks).toBe(6);
      expect(intPlan.weeks).toHaveLength(6);

      const advAthlete = createAthlete('fuerza', 'avanzado');
      const advPlan = await generatorService.generatePlanStructure(advAthlete, sampleExercises);
      expect(advPlan.duration_weeks).toBe(8);
      expect(advPlan.weeks).toHaveLength(8);
    });
  });
});
