import { describe, it, expect } from 'vitest';
import {
  MesocycleGeneratorService
} from '../../src/services/mesocycle-generator.service.js';
import {
  RoutineEngineV2Service,
  MAX_SETS_PER_EXERCISE
} from '../../src/services/routine-engine-v2.service.js';
import type { AthleteProfile, Exercise } from '../../src/schemas/generated/schemas.js';

describe('TASK-45: Dynamic Target Exercises Per Session and Maximum 4 Sets Per Exercise (RF-05, RF-06)', () => {
  const routineEngineV2 = new RoutineEngineV2Service();

  const mockCatalog: Exercise[] = [
    {
      id: 'bench_press_barbell',
      name: 'Press de banca con barra',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.75,
      video_url: 'https://youtube.com/watch?v=1',
      video_fallback_url: 'https://assets.smartforge.app/1.webp',
      instructions: 'Empuje plano.',
      is_active: true
    },
    {
      id: 'overhead_press_barbell',
      name: 'Press militar con barra',
      movement_pattern: 'empuje',
      primary_muscle: 'hombros',
      secondary_muscles: ['triceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.5,
      video_url: 'https://youtube.com/watch?v=2',
      video_fallback_url: 'https://assets.smartforge.app/2.webp',
      instructions: 'Empuje vertical.',
      is_active: true
    },
    {
      id: 'incline_dumbbell_press',
      name: 'Press inclinado con mancuernas',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['hombros', 'triceps'],
      equipment_id: 'dumbbells',
      is_compound: true,
      initial_load_ratio: 0.6,
      video_url: 'https://youtube.com/watch?v=3',
      video_fallback_url: 'https://assets.smartforge.app/3.webp',
      instructions: 'Empuje inclinado.',
      is_active: true
    },
    {
      id: 'dips_chest',
      name: 'Fondos en paralelas',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=4',
      video_fallback_url: 'https://assets.smartforge.app/4.webp',
      instructions: 'Flexión de brazos en paralelas.',
      is_active: true
    },
    {
      id: 'pushups_floor',
      name: 'Flexiones de suelo',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=5',
      video_fallback_url: 'https://assets.smartforge.app/5.webp',
      instructions: 'Flexiones.',
      is_active: true
    },
    {
      id: 'plank_core',
      name: 'Plancha isométrica',
      movement_pattern: 'core',
      primary_muscle: 'core',
      secondary_muscles: [],
      equipment_id: 'bodyweight',
      is_compound: false,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=6',
      video_fallback_url: 'https://assets.smartforge.app/6.webp',
      instructions: 'Mantén tensión en el core.',
      is_active: true
    },
    {
      id: 'barbell_row',
      name: 'Remo con barra',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.6,
      video_url: 'https://youtube.com/watch?v=7',
      video_fallback_url: 'https://assets.smartforge.app/7.webp',
      instructions: 'Remo con barra.',
      is_active: true
    },
    {
      id: 'pullups',
      name: 'Dominadas pronas',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'bodyweight',
      is_compound: true,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=8',
      video_fallback_url: 'https://assets.smartforge.app/8.webp',
      instructions: 'Dominadas pronas.',
      is_active: true
    },
    {
      id: 'dumbbell_row_unilateral',
      name: 'Remo con mancuerna a una mano',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'dumbbells',
      is_compound: true,
      initial_load_ratio: 0.35,
      video_url: 'https://youtube.com/watch?v=9',
      video_fallback_url: 'https://assets.smartforge.app/9.webp',
      instructions: 'Remo unilateral.',
      is_active: true
    },
    {
      id: 'bicep_curl_barbell',
      name: 'Curl de bíceps con barra',
      movement_pattern: 'tiron',
      primary_muscle: 'biceps',
      secondary_muscles: [],
      equipment_id: 'barbell',
      is_compound: false,
      initial_load_ratio: 0.25,
      video_url: 'https://youtube.com/watch?v=10',
      video_fallback_url: 'https://assets.smartforge.app/10.webp',
      instructions: 'Flexión de codos.',
      is_active: true
    },
    {
      id: 'squat_barbell',
      name: 'Sentadilla con barra',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.8,
      video_url: 'https://youtube.com/watch?v=11',
      video_fallback_url: 'https://assets.smartforge.app/11.webp',
      instructions: 'Sentadilla trasera.',
      is_active: true
    },
    {
      id: 'lunge_dumbbells',
      name: 'Zancadas con mancuernas',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'dumbbells',
      is_compound: true,
      initial_load_ratio: 0.4,
      video_url: 'https://youtube.com/watch?v=12',
      video_fallback_url: 'https://assets.smartforge.app/12.webp',
      instructions: 'Zancadas.',
      is_active: true
    },
    {
      id: 'romanian_deadlift_barbell',
      name: 'Peso muerto rumano con barra',
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'isquiosurales',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.75,
      video_url: 'https://youtube.com/watch?v=13',
      video_fallback_url: 'https://assets.smartforge.app/13.webp',
      instructions: 'Bisagra de cadera.',
      is_active: true
    },
    {
      id: 'hip_thrust_barbell',
      name: 'Hip thrust con barra',
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'gluteos',
      secondary_muscles: ['isquiosurales'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.9,
      video_url: 'https://youtube.com/watch?v=14',
      video_fallback_url: 'https://assets.smartforge.app/14.webp',
      instructions: 'Extensión de cadera en banco.',
      is_active: true
    }
  ];

  const athlete: AthleteProfile = {
    id: '11111111-2222-3333-4444-555555555555',
    google_id: 'goog-athlete-5',
    email: 'athlete5@smartforge.test',
    name: 'Atleta Cinco Ejercicios',
    age: 26,
    weight_kg: 80,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 3,
    equipment: [
      { id: 'barbell', name: 'Barra olímpica', category: 'free_weights' },
      { id: 'dumbbells', name: 'Mancuernas', category: 'free_weights' },
      { id: 'bodyweight', name: 'Peso corporal', category: 'bodyweight' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const generatorService = new MesocycleGeneratorService();

  it('al solicitar 5 ejercicios por sesión, el array resultante tiene longitud 5 (eliminando límite de 3)', async () => {
    const plan = await generatorService.generatePlanStructure(athlete, mockCatalog, {
      target_exercises_per_session: 5
    });

    expect(plan.target_exercises_per_session).toBe(5);

    // Verificar cada sesión de la semana 1
    const week1 = plan.weeks[0];
    expect(week1.sessions).toHaveLength(3);

    for (const session of week1.sessions) {
      // REGLA ESTRICTA: El array de ejercicios del día DEBE tener exactamente longitud 5
      expect(session.exercise_assignments).toHaveLength(5);

      // Deben ser 5 ejercicios distintos (sin duplicados dentro de la sesión)
      const exerciseIds = session.exercise_assignments.map((a) => a.exercise_id);
      const uniqueIds = new Set(exerciseIds);
      expect(uniqueIds.size).toBe(5);

      // Cada ejercicio debe tener máximo 4 series
      for (const assignment of session.exercise_assignments) {
        expect(assignment.target_sets).toBeLessThanOrEqual(MAX_SETS_PER_EXERCISE);
        expect(assignment.target_sets).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('funciona también mediante exercisesPerSessionPreference manual customCount = 5', async () => {
    const plan = await generatorService.generatePlanStructure(athlete, mockCatalog, {
      exercisesPerSessionPreference: {
        mode: 'manual',
        customCount: 5
      }
    });

    expect(plan.target_exercises_per_session).toBe(5);
    const week1 = plan.weeks[0];
    for (const session of week1.sessions) {
      expect(session.exercise_assignments).toHaveLength(5);
      const uniqueIds = new Set(session.exercise_assignments.map((a) => a.exercise_id));
      expect(uniqueIds.size).toBe(5);
    }
  });

  it('RoutineEngineV2Service.distributeSessionVolume aplica un límite de máximo 4 series por ejercicio y distribuye el excedente', () => {
    // Si se piden 5 ejercicios y 18 series totales
    // 18 / 5 = 3 base, 3 resto -> [4, 4, 4, 3, 3] -> todos <= 4 series
    const dist1 = routineEngineV2.distributeSessionVolume({
      targetExercisesCount: 5,
      totalSessionSets: 18
    });
    expect(dist1).toHaveLength(5);
    expect(dist1.reduce((sum, s) => sum + s, 0)).toBe(18);
    for (const sets of dist1) {
      expect(sets).toBeLessThanOrEqual(4);
    }

    // Si una sesión tuviese alta demanda (ej. 20 series en 5 ejercicios):
    // 20 / 5 = 4 series exactas cada uno
    const dist2 = routineEngineV2.distributeSessionVolume({
      targetExercisesCount: 5,
      totalSessionSets: 20
    });
    expect(dist2).toEqual([4, 4, 4, 4, 4]);

    // Si una sesión tuviese más de 20 series (ej. 22 series), los ejercicios se topan en 4
    const dist3 = routineEngineV2.distributeSessionVolume({
      targetExercisesCount: 5,
      totalSessionSets: 22
    });
    expect(dist3).toHaveLength(5);
    for (const sets of dist3) {
      expect(sets).toBeLessThanOrEqual(4);
    }
  });
});
