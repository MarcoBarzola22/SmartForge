import { describe, it, expect } from 'vitest';
import {
  FatigueAdjusterService,
  fatigueAdjusterService,
  type JointPainReportItem,
  type SeverePainExclusionParams,
  type SessionPlanAdjustmentParams
} from '../../src/services/fatigue-adjuster.service.js';
import type { Joint, MovementPattern, PainIntensity, Exercise } from '../../src/schemas/generated/schemas.js';

describe('FatigueAdjusterService - Severe Pain Exclusion and Safe Substitution (TASK-48, RF-08, CA-08.1, CA-08.3, CA-08.5, D-20)', () => {
  const service = new FatigueAdjusterService();

  const mockExercise = (overrides: Partial<Exercise>): Exercise => ({
    id: 'test_exercise',
    name: 'Ejercicio de prueba',
    movement_pattern: 'rodilla_dominante',
    primary_muscle: 'cuadriceps',
    secondary_muscles: ['gluteos'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.8,
    video_url: 'https://youtube.com/watch?v=test',
    video_fallback_url: 'https://smartforge.app/test.webp',
    instructions: 'Test instructions',
    is_active: true,
    ...overrides
  });

  describe('D-20: Maximum Severity Precedence', () => {
    it('should determine that severa > moderada > leve', () => {
      expect(service.comparePainIntensity('severa', 'moderada')).toBeGreaterThan(0);
      expect(service.comparePainIntensity('moderada', 'leve')).toBeGreaterThan(0);
      expect(service.comparePainIntensity('leve', 'severa')).toBeLessThan(0);
      expect(service.comparePainIntensity('moderada', 'moderada')).toBe(0);
    });

    it('should select the maximum intensity from an array of reports for the same joint (D-20)', () => {
      const reports: JointPainReportItem[] = [
        { joint: 'rodilla', intensity: 'leve' },
        { joint: 'rodilla', intensity: 'severa' },
        { joint: 'rodilla', intensity: 'moderada' }
      ];

      const severities = service.resolveJointSeverities(reports);
      expect(severities.get('rodilla')).toBe('severa');
    });

    it('should correctly map distinct maximum intensities for multiple joints', () => {
      const reports: JointPainReportItem[] = [
        { joint: 'rodilla', intensity: 'moderada' },
        { joint: 'rodilla', intensity: 'leve' },
        { joint: 'hombro', intensity: 'severa' },
        { joint: 'codo', intensity: 'leve' }
      ];

      const severities = service.resolveJointSeverities(reports);
      expect(severities.get('rodilla')).toBe('moderada');
      expect(severities.get('hombro')).toBe('severa');
      expect(severities.get('codo')).toBe('leve');
    });
  });

  describe('Severe Pain Exclusion & Safe Substitution (CA-08.1)', () => {
    it('should substitute an exercise with a safe alternative that does not stress the painful joint', () => {
      const originalSquat = mockExercise({
        id: 'sentadilla_trasera_barra',
        name: 'Sentadilla trasera con barra',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps'
      });

      const safeAlternative = mockExercise({
        id: 'hip_thrust_barra_banco',
        name: 'Hip thrust con barra',
        movement_pattern: 'cadera_dominante',
        primary_muscle: 'gluteos'
      });

      const params: SeverePainExclusionParams = {
        exercise: originalSquat,
        target_sets: 4,
        target_load_kg: 100,
        severe_joints: ['rodilla'],
        available_alternatives: [safeAlternative]
      };

      const result = service.handleSeverePain(params);

      expect(result.action).toBe('substituted');
      expect(result.is_substituted).toBe(true);
      expect(result.is_excluded).toBe(false);
      expect(result.substituted_exercise?.id).toBe('hip_thrust_barra_banco');
      expect(result.notices[0]).toContain('Se reemplazó Sentadilla trasera con barra por Hip thrust con barra: dolor severo en rodilla');
    });

    it('should omit/exclude the exercise when no safe alternative is available', () => {
      const originalBench = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      // Alternative that still stresses the shoulder
      const badAlternative = mockExercise({
        id: 'press_inclinado_mancuernas',
        name: 'Press inclinado con mancuernas',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      const params: SeverePainExclusionParams = {
        exercise: originalBench,
        target_sets: 3,
        target_load_kg: 80,
        severe_joints: ['hombro'],
        available_alternatives: [badAlternative] // No safe alternatives
      };

      const result = service.handleSeverePain(params);

      expect(result.action).toBe('excluded');
      expect(result.is_excluded).toBe(true);
      expect(result.is_substituted).toBe(false);
      expect(result.substituted_exercise).toBeUndefined();
      expect(result.notices[0]).toContain('Se omitió Press de banca plano con barra: dolor severo en hombro');
    });
  });

  describe('Light Pain Tracking (CA-08.3)', () => {
    it('should keep exercises unmodified when only light pain is reported and add tracking notice', () => {
      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      const params: SessionPlanAdjustmentParams = {
        exercises: [
          { exercise: benchPress, target_sets: 4, target_load_kg: 80 }
        ],
        pain_reports: [{ joint: 'hombro', intensity: 'leve' }]
      };

      const adjusted = service.adjustSessionForPain(params);

      expect(adjusted.exercises[0].is_omitted).toBe(false);
      expect(adjusted.exercises[0].is_substituted).toBe(false);
      expect(adjusted.exercises[0].target_sets).toBe(4);
      expect(adjusted.exercises[0].target_load_kg).toBe(80);
      expect(adjusted.notices.some((n) => n.includes('Dolor leve en hombro'))).toBe(true);
    });
  });

  describe('Complete Pattern Exclusion Warning (CA-08.5)', () => {
    it('should detect when all exercises of a movement pattern are excluded and emit pattern warning', () => {
      const squat = mockExercise({
        id: 'sentadilla_trasera_barra',
        name: 'Sentadilla trasera con barra',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps'
      });

      const legPress = mockExercise({
        id: 'prensa_piernas_inclinada',
        name: 'Prensa de piernas',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps'
      });

      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      const params: SessionPlanAdjustmentParams = {
        exercises: [
          { exercise: squat, target_sets: 4, target_load_kg: 100 },
          { exercise: legPress, target_sets: 3, target_load_kg: 150 },
          { exercise: benchPress, target_sets: 4, target_load_kg: 80 }
        ],
        pain_reports: [{ joint: 'rodilla', intensity: 'severa' }],
        available_equipment_ids: ['barbell']
      };

      const result = service.adjustSessionForPain(params);

      // Both knee-dominant exercises are omitted
      expect(result.exercises[0].is_omitted).toBe(true);
      expect(result.exercises[1].is_omitted).toBe(true);
      // Bench press is unaffected
      expect(result.exercises[2].is_omitted).toBe(false);

      // Pattern warning emitted
      expect(result.excluded_patterns).toContain('rodilla_dominante');
      expect(result.notices.some((n) => n.includes('Sesión reducida: se excluyó rodilla_dominante'))).toBe(true);
      expect(result.total_rest_recommended).toBe(false);
    });

    it('should recommend total rest when all exercises in the entire session are excluded', () => {
      const squat = mockExercise({
        id: 'sentadilla_trasera_barra',
        name: 'Sentadilla trasera con barra',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps'
      });

      const legExtension = mockExercise({
        id: 'extension_cuadriceps',
        name: 'Extensión de cuádriceps',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps'
      });

      const params: SessionPlanAdjustmentParams = {
        exercises: [
          { exercise: squat, target_sets: 4, target_load_kg: 100 },
          { exercise: legExtension, target_sets: 3, target_load_kg: 40 }
        ],
        pain_reports: [{ joint: 'rodilla', intensity: 'severa' }]
      };

      const result = service.adjustSessionForPain(params);

      expect(result.exercises.every((e) => e.is_omitted)).toBe(true);
      expect(result.total_rest_recommended).toBe(true);
      expect(result.notices.some((n) => n.includes('descanso total'))).toBe(true);
    });
  });

  describe('Integrated Multi-Joint Session Adjustment with Moderate + Severe Pain', () => {
    it('should apply moderate volume reduction for one joint and severe substitution for another in the same session', () => {
      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      const squat = mockExercise({
        id: 'sentadilla_trasera_barra',
        name: 'Sentadilla trasera con barra',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps'
      });

      const hipThrustAlternative = mockExercise({
        id: 'hip_thrust_barra_banco',
        name: 'Hip thrust con barra',
        movement_pattern: 'cadera_dominante',
        primary_muscle: 'gluteos'
      });

      const catalogAlternatives = new Map<string, Exercise[]>([
        ['sentadilla_trasera_barra', [hipThrustAlternative]]
      ]);

      const params: SessionPlanAdjustmentParams = {
        exercises: [
          { exercise: benchPress, target_sets: 4, target_load_kg: 100 }, // moderate shoulder pain -> 30% reduction (2 sets)
          { exercise: squat, target_sets: 4, target_load_kg: 120 } // severe knee pain -> substituted with hip thrust
        ],
        pain_reports: [
          { joint: 'hombro', intensity: 'moderada', session_id: 's1' },
          { joint: 'rodilla', intensity: 'severa', session_id: 's1' }
        ],
        catalog_alternatives: catalogAlternatives
      };

      const result = service.adjustSessionForPain(params);

      // Bench press: moderate shoulder pain adjustment
      expect(result.exercises[0].target_sets).toBe(2);
      expect(result.exercises[0].is_substituted).toBe(false);
      expect(result.exercises[0].is_omitted).toBe(false);

      // Squat: severe knee pain substitution
      expect(result.exercises[1].is_substituted).toBe(true);
      expect(result.exercises[1].exercise.id).toBe('hip_thrust_barra_banco');
    });
  });

  describe('Singleton Export', () => {
    it('should expose adjustSessionForPain and handleSeverePain on fatigueAdjusterService', () => {
      expect(typeof fatigueAdjusterService.adjustSessionForPain).toBe('function');
      expect(typeof fatigueAdjusterService.handleSeverePain).toBe('function');
    });
  });
});
