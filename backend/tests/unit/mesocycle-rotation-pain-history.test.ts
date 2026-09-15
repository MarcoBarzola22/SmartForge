import { describe, it, expect } from 'vitest';
import {
  MesocycleRotationService
} from '../../src/services/mesocycle-rotation.service.js';
import type {
  AthleteProfile,
  Exercise,
  MesocycleDetail,
  WeekPlan,
  SessionPlan,
  ExerciseAssignment,
  EquipmentItem,
  Joint
} from '../../src/schemas/generated/schemas.js';
import type { PainReportRecord } from '../../src/repositories/pain-report.repository.js';

describe('MesocycleRotationService - Joint Pain History Verification during Rotation (TASK-53, RF-10, CA-10.3)', () => {
  const service = new MesocycleRotationService();

  const mockEquipment: EquipmentItem[] = [
    { id: 'barbell', name: 'Barra Olímpica', category: 'barras' },
    { id: 'dumbbells', name: 'Mancuernas', category: 'peso_libre' },
    { id: 'cable', name: 'Polea / Cable', category: 'maquinas' }
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

  const accessoryLegExtension: Exercise = {
    id: 'leg_extension_id',
    name: 'Extensión de Cuádriceps en Máquina',
    movement_pattern: 'rodilla_dominante',
    primary_muscle: 'cuadriceps',
    secondary_muscles: [],
    equipment_id: 'cable',
    is_compound: false,
    initial_load_ratio: 0.4,
    video_url: 'https://youtube.com/watch?v=legext',
    video_fallback_url: 'https://smartforge.app/legext.webp',
    instructions: 'Extensión de rodilla en máquina',
    is_active: true
  };

  const accessoryHamstringCurl: Exercise = {
    id: 'hamstring_curl_id',
    name: 'Curl Femoral en Máquina',
    movement_pattern: 'cadera_dominante',
    primary_muscle: 'isquiosurales',
    secondary_muscles: [],
    equipment_id: 'cable',
    is_compound: false,
    initial_load_ratio: 0.35,
    video_url: 'https://youtube.com/watch?v=hamcurl',
    video_fallback_url: 'https://smartforge.app/hamcurl.webp',
    instructions: 'Curl de isquiosurales',
    is_active: true
  };

  const accessoryCalfRaise: Exercise = {
    id: 'calf_raise_id',
    name: 'Elevación de Talones con Mancuernas',
    movement_pattern: 'rodilla_dominante',
    primary_muscle: 'pantorrillas',
    secondary_muscles: [],
    equipment_id: 'dumbbells',
    is_compound: false,
    initial_load_ratio: 0.3,
    video_url: 'https://youtube.com/watch?v=calf',
    video_fallback_url: 'https://smartforge.app/calf.webp',
    instructions: 'Elevación de pantorrillas',
    is_active: true
  };

  const accessoryLateralRaise: Exercise = {
    id: 'lateral_raise_id',
    name: 'Elevaciones Laterales con Mancuernas',
    movement_pattern: 'empuje',
    primary_muscle: 'hombros',
    secondary_muscles: [],
    equipment_id: 'dumbbells',
    is_compound: false,
    initial_load_ratio: 0.15,
    video_url: 'https://youtube.com/watch?v=latraise',
    video_fallback_url: 'https://smartforge.app/latraise.webp',
    instructions: 'Elevación lateral de hombro',
    is_active: true
  };

  const accessoryTricepsPushdown: Exercise = {
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
    instructions: 'Extensión de tríceps en polea',
    is_active: true
  };

  const catalog: Exercise[] = [
    compoundSquat,
    accessoryLegExtension,
    accessoryHamstringCurl,
    accessoryCalfRaise,
    accessoryLateralRaise,
    accessoryTricepsPushdown
  ];

  const createMockPreviousMesocycle = (): MesocycleDetail => {
    const assignments: ExerciseAssignment[] = [
      {
        id: 'asg-1',
        session_plan_id: 'sess-1',
        exercise_id: compoundSquat.id,
        exercise: compoundSquat,
        order_in_session: 1,
        target_sets: 4,
        target_reps: 8,
        target_rir: 2,
        target_load_kg: 100,
        is_swapped: false
      },
      {
        id: 'asg-2',
        session_plan_id: 'sess-1',
        exercise_id: accessoryLegExtension.id,
        exercise: accessoryLegExtension,
        order_in_session: 2,
        target_sets: 3,
        target_reps: 12,
        target_rir: 2,
        target_load_kg: 40,
        is_swapped: false
      }
    ];

    const session: SessionPlan = {
      id: 'sess-1',
      week_plan_id: 'week-1',
      day_number: 1,
      name: 'Día 1 - Pierna',
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
          week_plan_id: `week-${i + 1}`
        }
      ]
    }));

    return {
      id: 'meso-prev-1',
      athlete_id: mockAthlete.id,
      name: 'Mesociclo Anterior PIERNA',
      experience_level: 'intermedio',
      training_goal: 'hipertrofia',
      periodization_type: 'ondulante',
      duration_weeks: 6,
      status: 'active',
      start_date: '2026-08-01',
      weeks
    };
  };

  describe('getPainCompromisedJoints', () => {
    it('should extract joints with moderate or severe pain reports', () => {
      const painReports: Partial<PainReportRecord>[] = [
        {
          joint: 'rodilla',
          intensity: 'severa'
        },
        {
          joint: 'hombro',
          intensity: 'moderada'
        },
        {
          joint: 'muneca',
          intensity: 'leve'
        }
      ];

      const compromised = service.getPainCompromisedJoints(painReports as PainReportRecord[]);
      expect(compromised.has('rodilla')).toBe(true);
      expect(compromised.has('hombro')).toBe(true);
      expect(compromised.has('muneca')).toBe(false); // 'leve' no compromete rotación
    });

    it('should allow filtering exclusively by severe pain when requested', () => {
      const painReports: Partial<PainReportRecord>[] = [
        {
          joint: 'rodilla',
          intensity: 'severa'
        },
        {
          joint: 'hombro',
          intensity: 'moderada'
        }
      ];

      const compromisedSevere = service.getPainCompromisedJoints(
        painReports as PainReportRecord[],
        'severa'
      );
      expect(compromisedSevere.has('rodilla')).toBe(true);
      expect(compromisedSevere.has('hombro')).toBe(false);
    });
  });

  describe('getPainCompromisedExerciseIds', () => {
    it('should extract exercise IDs reported with severe pain', () => {
      const painReports: Partial<PainReportRecord>[] = [
        {
          exercise_id: 'leg_extension_id',
          joint: 'rodilla',
          intensity: 'severa'
        },
        {
          exercise_id: 'lateral_raise_id',
          joint: 'hombro',
          intensity: 'leve'
        }
      ];

      const excludedExercises = service.getPainCompromisedExerciseIds(
        painReports as PainReportRecord[]
      );
      expect(excludedExercises.has('leg_extension_id')).toBe(true);
      expect(excludedExercises.has('lateral_raise_id')).toBe(false);
    });
  });

  describe('isExerciseCompromisedByPain', () => {
    it('should return true if the exercise ID is explicitly in the pain-compromised set', () => {
      const compromisedJoints = new Set<Joint>();
      const compromisedExerciseIds = new Set<string>(['leg_extension_id']);

      expect(
        service.isExerciseCompromisedByPain(
          accessoryLegExtension,
          compromisedJoints,
          compromisedExerciseIds
        )
      ).toBe(true);
    });

    it('should return true if the exercise primary joint is compromised by pain', () => {
      const compromisedJoints = new Set<Joint>(['rodilla']);
      const compromisedExerciseIds = new Set<string>();

      expect(
        service.isExerciseCompromisedByPain(
          accessoryLegExtension,
          compromisedJoints,
          compromisedExerciseIds
        )
      ).toBe(true);
    });

    it('should return false if neither the exercise ID nor its primary joint is compromised', () => {
      const compromisedJoints = new Set<Joint>(['hombro']);
      const compromisedExerciseIds = new Set<string>();

      expect(
        service.isExerciseCompromisedByPain(
          accessoryLegExtension,
          compromisedJoints,
          compromisedExerciseIds
        )
      ).toBe(false);
    });
  });

  describe('selectRotatedAccessory with Joint Pain Filtering (CA-10.3)', () => {
    it('should discard candidate exercises that stress a compromised joint or have severe pain', () => {
      const athleteEquipmentIds = ['barbell', 'dumbbells', 'cable'];
      const excludedSwaps = new Set<string>();
      const compromisedJoints = new Set<Joint>(['hombro']);
      const compromisedExerciseIds = new Set<string>(['lateral_raise_id']);

      // Rotamos un accesorio de empuje
      const rotated = service.selectRotatedAccessory(
        accessoryLateralRaise,
        catalog,
        athleteEquipmentIds,
        excludedSwaps,
        compromisedJoints,
        compromisedExerciseIds
      );

      // No debe seleccionar lateral_raise_id (hombro comprometido), debe elegir triceps_pushdown_id (codo libre)
      expect(rotated.id).not.toBe('lateral_raise_id');
      expect(rotated.id).toBe('triceps_pushdown_id');
    });
  });

  describe('generateRotatedMesocyclePlan with Pain History Verification (CA-10.3)', () => {
    it('should discard exercises reported with severe pain in the previous mesocycle from new selection', async () => {
      const prevMeso = createMockPreviousMesocycle();
      const painReports: Partial<PainReportRecord>[] = [
        {
          id: 'pr-1',
          session_id: 'sess-prev',
          exercise_id: 'leg_extension_id',
          joint: 'rodilla',
          side: 'bilateral',
          intensity: 'severa',
          client_timestamp: '2026-08-20T10:00:00Z'
        }
      ];

      const newPlan = await service.generateRotatedMesocyclePlan(
        mockAthlete,
        prevMeso,
        catalog,
        [], // no swaps
        undefined, // default duration
        painReports as PainReportRecord[]
      );

      // Verify that the accessory slot in Week 1 is NOT leg_extension_id
      const session1 = newPlan.weeks[0].sessions[0];
      const accessoryAssignment = session1.exercise_assignments[1];

      expect(accessoryAssignment.exercise_id).not.toBe('leg_extension_id');
      expect(accessoryAssignment.exercise_id).toBe('calf_raise_id');
    });
  });
});
