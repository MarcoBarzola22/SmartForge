import { describe, it, expect, vi } from 'vitest';
import {
  MesocycleRotationService,
  mesocycleRotationService
} from '../../src/services/mesocycle-rotation.service.js';
import type {
  AthleteProfile,
  Exercise,
  MesocycleDetail,
  WeekPlan,
  SessionPlan,
  ExerciseAssignment,
  EquipmentItem
} from '../../src/schemas/generated/schemas.js';
import type { ExerciseSwap } from '../../src/repositories/exercise-swap.repository.js';

describe('MesocycleRotationService - Mesocycle Rotation Algorithm (TASK-52, RF-10, CA-10.1, CA-10.4)', () => {
  const service = new MesocycleRotationService();

  const mockEquipment: EquipmentItem[] = [
    { id: 'barbell', name: 'Barra Olímpica', category: 'barras' },
    { id: 'dumbbells', name: 'Mancuernas', category: 'peso_libre' },
    { id: 'cable', name: 'Polea / Cable', category: 'maquinas' },
    { id: 'bench', name: 'Banco Plano', category: 'bancos' }
  ];

  const mockAthlete: AthleteProfile = {
    id: 'a0000000-0000-0000-0000-000000000001',
    google_id: 'google_123',
    email: 'athlete@example.com',
    name: 'Carlos Atleta',
    age: 25,
    weight_kg: 80,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 3,
    equipment: mockEquipment,
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-01T00:00:00.000Z'
  };

  const compoundBench: Exercise = {
    id: 'bench_press_id',
    name: 'Press de Banca con Barra',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.75,
    video_url: 'https://youtube.com/watch?v=bench',
    video_fallback_url: 'https://smartforge.app/bench.webp',
    instructions: 'Press de banca plano con barra',
    is_active: true
  };

  const compoundSquat: Exercise = {
    id: 'squat_id',
    name: 'Sentadilla Trasera con Barra',
    movement_pattern: 'rodilla_dominante',
    primary_muscle: 'cuadriceps',
    secondary_muscles: ['gluteos'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.8,
    video_url: 'https://youtube.com/watch?v=squat',
    video_fallback_url: 'https://smartforge.app/squat.webp',
    instructions: 'Sentadilla trasera',
    is_active: true
  };

  const accessoryTricepsCable: Exercise = {
    id: 'triceps_pushdown_id',
    name: 'Extensiones de Tríceps en Polea',
    movement_pattern: 'empuje',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment_id: 'cable',
    is_compound: false,
    initial_load_ratio: 0.25,
    video_url: 'https://youtube.com/watch?v=pushdown',
    video_fallback_url: 'https://smartforge.app/pushdown.webp',
    instructions: 'Extensiones de tríceps en polea alta',
    is_active: true
  };

  const accessoryTricepsSkullcrusher: Exercise = {
    id: 'skullcrusher_id',
    name: 'Press Francés / Skullcrusher con Barra',
    movement_pattern: 'empuje',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment_id: 'barbell',
    is_compound: false,
    initial_load_ratio: 0.3,
    video_url: 'https://youtube.com/watch?v=skull',
    video_fallback_url: 'https://smartforge.app/skull.webp',
    instructions: 'Press francés en banco plano',
    is_active: true
  };

  const accessoryTricepsDumbbell: Exercise = {
    id: 'triceps_overhead_db_id',
    name: 'Extensión de Tríceps sobre la Cabeza con Mancuerna',
    movement_pattern: 'empuje',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment_id: 'dumbbells',
    is_compound: false,
    initial_load_ratio: 0.2,
    video_url: 'https://youtube.com/watch?v=overhead',
    video_fallback_url: 'https://smartforge.app/overhead.webp',
    instructions: 'Extensión de tríceps unilateral o bilateral con mancuerna',
    is_active: true
  };

  const accessoryFlyDumbbell: Exercise = {
    id: 'dumbbell_fly_id',
    name: 'Aperturas con Mancuernas',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: [],
    equipment_id: 'dumbbells',
    is_compound: false,
    initial_load_ratio: 0.2,
    video_url: 'https://youtube.com/watch?v=fly',
    video_fallback_url: 'https://smartforge.app/fly.webp',
    instructions: 'Aperturas en banco plano con mancuernas',
    is_active: true
  };

  const catalog: Exercise[] = [
    compoundBench,
    compoundSquat,
    accessoryTricepsCable,
    accessoryTricepsSkullcrusher,
    accessoryTricepsDumbbell,
    accessoryFlyDumbbell
  ];

  const createMockPreviousMesocycle = (): MesocycleDetail => {
    const assignments: ExerciseAssignment[] = [
      {
        id: 'asg-1',
        session_plan_id: 'sess-1',
        exercise_id: compoundBench.id,
        exercise: compoundBench,
        order_in_session: 1,
        target_sets: 4,
        target_reps: 8,
        target_rir: 2,
        target_load_kg: 85, // progresó a 85 kg
        is_swapped: false
      },
      {
        id: 'asg-2',
        session_plan_id: 'sess-1',
        exercise_id: accessoryTricepsCable.id,
        exercise: accessoryTricepsCable,
        order_in_session: 2,
        target_sets: 3,
        target_reps: 12,
        target_rir: 2,
        target_load_kg: 25,
        is_swapped: false
      }
    ];

    const session: SessionPlan = {
      id: 'sess-1',
      week_plan_id: 'week-1',
      day_number: 1,
      name: 'Día 1 - Torso',
      exercise_assignments: assignments
    };

    const weeks: WeekPlan[] = Array.from({ length: 6 }, (_, i) => ({
      id: `week-${i + 1}`,
      mesocycle_id: 'meso-prev-1',
      week_number: i + 1,
      is_deload: i === 5,
      sessions: [
        {
          ...session,
          id: `sess-${i + 1}`,
          week_plan_id: `week-${i + 1}`,
          exercise_assignments: assignments.map((a) => ({
            ...a,
            id: `asg-${i + 1}-${a.order_in_session}`,
            session_plan_id: `sess-${i + 1}`,
            target_load_kg: a.exercise_id === compoundBench.id ? 80 + i * 2.5 : a.target_load_kg
          }))
        }
      ]
    }));

    return {
      id: 'meso-prev-1',
      athlete_id: mockAthlete.id,
      name: 'Mesociclo Anterior HIPERTROFIA',
      experience_level: 'intermedio',
      training_goal: 'hipertrofia',
      periodization_type: 'ondulante',
      duration_weeks: 6,
      status: 'active',
      start_date: '2026-08-01',
      weeks
    };
  };

  describe('Exercise Classification: isMainCompound & isAccessory', () => {
    it('should correctly classify compound exercises as main compounds', () => {
      expect(service.isMainCompound(compoundBench)).toBe(true);
      expect(service.isMainCompound(compoundSquat)).toBe(true);
      expect(service.isAccessory(compoundBench)).toBe(false);
    });

    it('should correctly classify monoarticular exercises as accessories', () => {
      expect(service.isMainCompound(accessoryTricepsCable)).toBe(false);
      expect(service.isAccessory(accessoryTricepsCable)).toBe(true);
      expect(service.isAccessory(accessoryTricepsSkullcrusher)).toBe(true);
      expect(service.isAccessory(accessoryFlyDumbbell)).toBe(true);
    });
  });

  describe('getExcludedExerciseIdsFromSwaps (Personal Preference Swaps)', () => {
    it('should extract original_exercise_id only for swaps with reason preferencia_personal', () => {
      const swaps: ExerciseSwap[] = [
        {
          id: 'sw-1',
          assignment_id: 'asg-1',
          original_exercise_id: 'triceps_overhead_db_id',
          new_exercise_id: 'triceps_pushdown_id',
          reason: 'preferencia_personal',
          created_at: '2026-08-10T10:00:00Z'
        },
        {
          id: 'sw-2',
          assignment_id: 'asg-2',
          original_exercise_id: 'skullcrusher_id',
          new_exercise_id: 'triceps_pushdown_id',
          reason: 'falta_equipamiento',
          created_at: '2026-08-11T10:00:00Z'
        }
      ];

      const excluded = service.getExcludedExerciseIdsFromSwaps(swaps);
      expect(excluded.has('triceps_overhead_db_id')).toBe(true);
      expect(excluded.has('skullcrusher_id')).toBe(false); // No fue preferencia personal
      expect(excluded.size).toBe(1);
    });

    it('should return an empty set when no swaps are provided', () => {
      expect(service.getExcludedExerciseIdsFromSwaps([]).size).toBe(0);
    });
  });

  describe('selectRotatedAccessory', () => {
    it('should select an alternative accessory matching pattern and muscle, distinct from current exercise', () => {
      const athleteEquipmentIds = ['barbell', 'dumbbells', 'cable'];
      const excluded = new Set<string>();

      const rotated = service.selectRotatedAccessory(
        accessoryTricepsCable,
        catalog,
        athleteEquipmentIds,
        excluded
      );

      expect(rotated.id).not.toBe(accessoryTricepsCable.id);
      expect(rotated.movement_pattern).toBe(accessoryTricepsCable.movement_pattern);
      expect(rotated.primary_muscle).toBe(accessoryTricepsCable.primary_muscle);
      expect(['skullcrusher_id', 'triceps_overhead_db_id']).toContain(rotated.id);
    });

    it('should avoid selecting an exercise present in the excluded set (swapped for personal preference)', () => {
      const athleteEquipmentIds = ['barbell', 'dumbbells', 'cable'];
      const excluded = new Set<string>(['skullcrusher_id']);

      const rotated = service.selectRotatedAccessory(
        accessoryTricepsCable,
        catalog,
        athleteEquipmentIds,
        excluded
      );

      expect(rotated.id).toBe('triceps_overhead_db_id');
    });

    it('should fallback to current exercise if no other alternative matches equipment or preferences', () => {
      const limitedCatalog = [compoundBench, accessoryTricepsCable];
      const rotated = service.selectRotatedAccessory(
        accessoryTricepsCable,
        limitedCatalog,
        ['cable'],
        new Set<string>()
      );

      expect(rotated.id).toBe(accessoryTricepsCable.id);
    });
  });

  describe('generateRotatedMesocyclePlan (RF-10, CA-10.1, CA-10.4)', () => {
    it('should preserve main compound exercises and rotate accessory exercises', async () => {
      const prevMeso = createMockPreviousMesocycle();
      const swaps: ExerciseSwap[] = [
        {
          id: 'sw-1',
          assignment_id: 'asg-prev',
          original_exercise_id: 'triceps_overhead_db_id',
          new_exercise_id: 'triceps_pushdown_id',
          reason: 'preferencia_personal',
          created_at: '2026-08-10T10:00:00Z'
        }
      ];

      const newPlan = await service.generateRotatedMesocyclePlan(
        mockAthlete,
        prevMeso,
        catalog,
        swaps
      );

      // Verify Mesocycle structure
      expect(newPlan.athlete_id).toBe(mockAthlete.id);
      expect(newPlan.duration_weeks).toBe(6); // Intermedio = 6 semanas (CA-10.1)
      expect(newPlan.weeks).toHaveLength(6);

      // Check first session of Week 1
      const week1 = newPlan.weeks[0];
      expect(week1.is_deload).toBe(false);
      const session1 = week1.sessions[0];
      expect(session1.exercise_assignments).toHaveLength(2);

      // 1. Compound exercise (Bench Press) MUST BE PRESERVED
      const compoundAssignment = session1.exercise_assignments[0];
      expect(compoundAssignment.exercise_id).toBe(compoundBench.id);
      // Preserves historical load from previous working weeks (at least 80+ kg)
      expect(compoundAssignment.target_load_kg).toBeGreaterThanOrEqual(80);

      // 2. Accessory exercise MUST BE ROTATED and NOT be the preference-excluded one
      const accessoryAssignment = session1.exercise_assignments[1];
      expect(accessoryAssignment.exercise_id).not.toBe(accessoryTricepsCable.id);
      expect(accessoryAssignment.exercise_id).not.toBe('triceps_overhead_db_id');
      expect(accessoryAssignment.exercise_id).toBe('skullcrusher_id');

      // Check Week 6 is Deload week (CA-10.2)
      const week6 = newPlan.weeks[5];
      expect(week6.is_deload).toBe(true);
      expect(week6.sessions[0].exercise_assignments[0].target_rir).toBe(3); // RIR +1
    });

    it('should adjust duration according to athlete experience level when not customized', async () => {
      const beginnerAthlete: AthleteProfile = {
        ...mockAthlete,
        experience_level: 'principiante'
      };
      const prevMeso = createMockPreviousMesocycle();

      const newPlan = await service.generateRotatedMesocyclePlan(
        beginnerAthlete,
        prevMeso,
        catalog
      );

      expect(newPlan.duration_weeks).toBe(4); // Principiante = 4 semanas (CA-10.1)
      expect(newPlan.weeks).toHaveLength(4);
      expect(newPlan.weeks[3].is_deload).toBe(true);
    });

    it('should respect custom duration weeks if specified', async () => {
      const prevMeso = createMockPreviousMesocycle();

      const newPlan = await service.generateRotatedMesocyclePlan(
        mockAthlete,
        prevMeso,
        catalog,
        [],
        8
      );

      expect(newPlan.duration_weeks).toBe(8);
      expect(newPlan.weeks).toHaveLength(8);
      expect(newPlan.weeks[7].is_deload).toBe(true);
    });
  });
});
