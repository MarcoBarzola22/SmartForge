import { describe, it, expect } from 'vitest';
import {
  FatigueAdjusterService,
  fatigueAdjusterService,
  ANATOMICAL_JOINT_MATRIX
} from '../../src/services/fatigue-adjuster.service.js';
import type { Joint, Exercise } from '../../src/schemas/generated/schemas.js';

describe('FatigueAdjusterService - Anatomical Joint Mapping Matrix (TASK-46, RF-08, CA-08.1)', () => {
  const service = new FatigueAdjusterService();

  const mockExercise = (overrides: Partial<Exercise>): Exercise => ({
    id: 'test_exercise',
    name: 'Ejercicio de prueba',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps', 'hombros'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.65,
    video_url: 'https://youtube.com/watch?v=test',
    video_fallback_url: 'https://smartforge.app/test.webp',
    instructions: 'Test instructions',
    is_active: true,
    ...overrides
  });

  describe('Anatomical Matrix Definition', () => {
    it('should define mappings for all 7 standard joints in taxonomy', () => {
      const allJoints: Joint[] = [
        'hombro',
        'codo',
        'muneca',
        'columna_lumbar',
        'cadera',
        'rodilla',
        'tobillo'
      ];

      for (const joint of allJoints) {
        expect(ANATOMICAL_JOINT_MATRIX[joint]).toBeDefined();
        expect(ANATOMICAL_JOINT_MATRIX[joint].name).toBe(joint);
        expect(ANATOMICAL_JOINT_MATRIX[joint].description).toBeTypeOf('string');
      }
    });
  });

  describe('Joint: hombro (Shoulder)', () => {
    it('should identify hombro as stressed for upper body push compound exercises (e.g., bench press)', () => {
      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        is_compound: true
      });

      expect(service.stressesJoint(benchPress, 'hombro')).toBe(true);
      expect(service.getInvolvedJoints(benchPress)).toContain('hombro');
    });

    it('should identify hombro as primary joint for shoulder isolation and pressing exercises', () => {
      const militaryPress = mockExercise({
        id: 'press_militar_barra_pie',
        name: 'Press militar estricto con barra de pie',
        movement_pattern: 'empuje',
        primary_muscle: 'hombros',
        is_compound: true
      });

      const lateralRaises = mockExercise({
        id: 'elevaciones_laterales_mancuernas',
        name: 'Elevaciones laterales con mancuernas',
        movement_pattern: 'empuje',
        primary_muscle: 'hombros',
        is_compound: false
      });

      expect(service.stressesJoint(militaryPress, 'hombro')).toBe(true);
      expect(service.getPrimaryJoint(militaryPress)).toBe('hombro');

      expect(service.stressesJoint(lateralRaises, 'hombro')).toBe(true);
      expect(service.getPrimaryJoint(lateralRaises)).toBe('hombro');
    });

    it('should identify hombro as stressed in vertical and horizontal pulling (e.g., dominadas, remos)', () => {
      const pullUp = mockExercise({
        id: 'dominadas_pronadas',
        name: 'Dominadas pronadas',
        movement_pattern: 'tiron',
        primary_muscle: 'espalda',
        is_compound: true
      });

      expect(service.stressesJoint(pullUp, 'hombro')).toBe(true);
    });

    it('should not identify hombro as stressed for leg or calf exercises', () => {
      const legExtension = mockExercise({
        id: 'extension_cuadriceps_maquina',
        name: 'Extensión de cuádriceps',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps',
        is_compound: false
      });

      expect(service.stressesJoint(legExtension, 'hombro')).toBe(false);
    });
  });

  describe('Joint: codo (Elbow)', () => {
    it('should identify codo as primary joint for biceps curls', () => {
      const bicepCurl = mockExercise({
        id: 'curl_biceps_barra_recta',
        name: 'Curl de bíceps con barra recta',
        movement_pattern: 'tiron',
        primary_muscle: 'biceps',
        is_compound: false
      });

      expect(service.stressesJoint(bicepCurl, 'codo')).toBe(true);
      expect(service.getPrimaryJoint(bicepCurl)).toBe('codo');
    });

    it('should identify codo as primary joint for triceps extensions', () => {
      const tricepPushdown = mockExercise({
        id: 'extension_triceps_polea_alta_cuerda',
        name: 'Extensión de tríceps en polea alta con cuerda',
        movement_pattern: 'empuje',
        primary_muscle: 'triceps',
        is_compound: false
      });

      expect(service.stressesJoint(tricepPushdown, 'codo')).toBe(true);
      expect(service.getPrimaryJoint(tricepPushdown)).toBe('codo');
    });

    it('should identify codo as involved in compound pushing and pulling', () => {
      const dips = mockExercise({
        id: 'fondos_paralelas_pecho',
        name: 'Fondos en paralelas',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        is_compound: true
      });

      expect(service.stressesJoint(dips, 'codo')).toBe(true);
    });

    it('should not identify codo as stressed for hip thrust or squats', () => {
      const hipThrust = mockExercise({
        id: 'hip_thrust_barra_banco',
        name: 'Hip thrust con barra apoyado en banco',
        movement_pattern: 'cadera_dominante',
        primary_muscle: 'gluteos',
        is_compound: true
      });

      expect(service.stressesJoint(hipThrust, 'codo')).toBe(false);
    });
  });

  describe('Joint: muneca (Wrist)', () => {
    it('should identify muneca as stressed for heavy barbell pressing and straight bar curls', () => {
      const straightBarCurl = mockExercise({
        id: 'curl_biceps_barra_recta',
        name: 'Curl de bíceps con barra recta de pie',
        movement_pattern: 'tiron',
        primary_muscle: 'biceps',
        equipment_id: 'barbell',
        is_compound: false
      });

      const pushups = mockExercise({
        id: 'flexiones_pecho_suelo',
        name: 'Flexiones de pecho clásicas',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        equipment_id: 'bodyweight',
        is_compound: true
      });

      expect(service.stressesJoint(straightBarCurl, 'muneca')).toBe(true);
      expect(service.stressesJoint(pushups, 'muneca')).toBe(true);
    });

    it('should not stress muneca in leg presses or calf raises', () => {
      const calfRaise = mockExercise({
        id: 'elevacion_talones_en_prensa_piernas',
        name: 'Elevación de talones en prensa',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'pantorrillas',
        is_compound: false
      });

      expect(service.stressesJoint(calfRaise, 'muneca')).toBe(false);
    });
  });

  describe('Joint: columna_lumbar (Lumbar Spine)', () => {
    it('should identify columna_lumbar as stressed in compound deadlifts, good mornings, and back squats', () => {
      const conventionalDeadlift = mockExercise({
        id: 'peso_muerto_convencional_barra',
        name: 'Peso muerto convencional con barra',
        movement_pattern: 'cadera_dominante',
        primary_muscle: 'gluteos',
        is_compound: true
      });

      const romanianDeadlift = mockExercise({
        id: 'peso_muerto_rumano_barra',
        name: 'Peso muerto rumano con barra olímpica',
        movement_pattern: 'cadera_dominante',
        primary_muscle: 'isquiosurales',
        is_compound: true
      });

      const backSquat = mockExercise({
        id: 'sentadilla_trasera_barra',
        name: 'Sentadilla trasera con barra olímpica',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps',
        is_compound: true
      });

      const bentOverRow = mockExercise({
        id: 'remo_con_barra_inclinado',
        name: 'Remo con barra inclinado',
        movement_pattern: 'tiron',
        primary_muscle: 'espalda',
        is_compound: true
      });

      expect(service.stressesJoint(conventionalDeadlift, 'columna_lumbar')).toBe(true);
      expect(service.stressesJoint(romanianDeadlift, 'columna_lumbar')).toBe(true);
      expect(service.stressesJoint(backSquat, 'columna_lumbar')).toBe(true);
      expect(service.stressesJoint(bentOverRow, 'columna_lumbar')).toBe(true);
    });

    it('should not stress columna_lumbar in seated leg extensions or chest flyes', () => {
      const dumbbellFlyes = mockExercise({
        id: 'aperturas_mancuernas_banco_plano',
        name: 'Aperturas con mancuernas en banco plano',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        is_compound: false
      });

      expect(service.stressesJoint(dumbbellFlyes, 'columna_lumbar')).toBe(false);
    });
  });

  describe('Joint: cadera (Hip)', () => {
    it('should identify cadera as primary joint for hip hinge movements and glute exercises', () => {
      const hipThrust = mockExercise({
        id: 'hip_thrust_barra_banco',
        name: 'Hip thrust con barra apoyado en banco',
        movement_pattern: 'cadera_dominante',
        primary_muscle: 'gluteos',
        is_compound: true
      });

      const rdl = mockExercise({
        id: 'peso_muerto_rumano_barra',
        name: 'Peso muerto rumano con barra olímpica',
        movement_pattern: 'cadera_dominante',
        primary_muscle: 'isquiosurales',
        is_compound: true
      });

      expect(service.stressesJoint(hipThrust, 'cadera')).toBe(true);
      expect(service.getPrimaryJoint(hipThrust)).toBe('cadera');

      expect(service.stressesJoint(rdl, 'cadera')).toBe(true);
      expect(service.getPrimaryJoint(rdl)).toBe('cadera');
    });

    it('should identify cadera as involved in compound knee-dominant movements (e.g., sentadillas, prensa)', () => {
      const legPress = mockExercise({
        id: 'prensa_piernas_inclinada',
        name: 'Prensa de piernas a 45 grados',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps',
        is_compound: true
      });

      expect(service.stressesJoint(legPress, 'cadera')).toBe(true);
    });

    it('should not stress cadera in bench press or bicep curls', () => {
      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho',
        is_compound: true
      });

      expect(service.stressesJoint(benchPress, 'cadera')).toBe(false);
    });
  });

  describe('Joint: rodilla (Knee)', () => {
    it('should identify rodilla as primary joint for knee-dominant exercises', () => {
      const squat = mockExercise({
        id: 'sentadilla_trasera_barra',
        name: 'Sentadilla trasera con barra olímpica',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps',
        is_compound: true
      });

      const bulgarianSquat = mockExercise({
        id: 'sentadilla_bulgara_mancuernas',
        name: 'Sentadilla búlgara con mancuernas',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps',
        is_compound: true
      });

      expect(service.stressesJoint(squat, 'rodilla')).toBe(true);
      expect(service.getPrimaryJoint(squat)).toBe('rodilla');

      expect(service.stressesJoint(bulgarianSquat, 'rodilla')).toBe(true);
      expect(service.getPrimaryJoint(bulgarianSquat)).toBe('rodilla');
    });

    it('should identify rodilla as involved in hamstring knee flexion (e.g., curl femoral)', () => {
      const hamstringCurl = mockExercise({
        id: 'curl_femoral_con_trx',
        name: 'Curl femoral en suspensión TRX',
        movement_pattern: 'cadera_dominante',
        primary_muscle: 'isquiosurales',
        is_compound: false
      });

      expect(service.stressesJoint(hamstringCurl, 'rodilla')).toBe(true);
    });

    it('should not stress rodilla in upper body rows or overhead presses', () => {
      const militaryPress = mockExercise({
        id: 'press_militar_barra_pie',
        name: 'Press militar estricto con barra de pie',
        movement_pattern: 'empuje',
        primary_muscle: 'hombros',
        is_compound: true
      });

      expect(service.stressesJoint(militaryPress, 'rodilla')).toBe(false);
    });
  });

  describe('Joint: tobillo (Ankle)', () => {
    it('should identify tobillo as primary joint for calf exercises', () => {
      const standingCalfRaise = mockExercise({
        id: 'elevacion_talones_de_pie_mancuerna',
        name: 'Elevación de talones de pie con mancuernas',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'pantorrillas',
        is_compound: false
      });

      expect(service.stressesJoint(standingCalfRaise, 'tobillo')).toBe(true);
      expect(service.getPrimaryJoint(standingCalfRaise)).toBe('tobillo');
    });

    it('should identify tobillo as involved in reactive jumps and deep lunges/squats', () => {
      const pogoJumps = mockExercise({
        id: 'saltos_talones_cuerda_peso_corporal',
        name: 'Pogo jumps (rebotes reactivos de tobillo)',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'pantorrillas',
        is_compound: false
      });

      const lunges = mockExercise({
        id: 'zancadas_caminando_mancuernas',
        name: 'Zancadas caminando con mancuernas',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps',
        is_compound: true
      });

      expect(service.stressesJoint(pogoJumps, 'tobillo')).toBe(true);
      expect(service.stressesJoint(lunges, 'tobillo')).toBe(true);
    });

    it('should not stress tobillo in bench press or pullups', () => {
      const pullUp = mockExercise({
        id: 'dominadas_pronadas',
        name: 'Dominadas pronadas',
        movement_pattern: 'tiron',
        primary_muscle: 'espalda',
        is_compound: true
      });

      expect(service.stressesJoint(pullUp, 'tobillo')).toBe(false);
    });
  });

  describe('Filtering and Safety Helpers', () => {
    it('should filter exercises stressing a specific joint with getExercisesForJoint', () => {
      const exercises = [
        mockExercise({ id: 'ex1', movement_pattern: 'rodilla_dominante', primary_muscle: 'cuadriceps' }),
        mockExercise({ id: 'ex2', movement_pattern: 'empuje', primary_muscle: 'pecho' }),
        mockExercise({ id: 'ex3', movement_pattern: 'rodilla_dominante', primary_muscle: 'cuadriceps' }),
        mockExercise({ id: 'ex4', movement_pattern: 'tiron', primary_muscle: 'biceps' })
      ];

      const kneeExercises = service.getExercisesForJoint(exercises, 'rodilla');
      expect(kneeExercises.map((e) => e.id)).toEqual(['ex1', 'ex3']);
    });

    it('should return safe exercises not stressing a specific joint with getSafeExercisesForJoint', () => {
      const exercises = [
        mockExercise({ id: 'ex1', movement_pattern: 'rodilla_dominante', primary_muscle: 'cuadriceps' }),
        mockExercise({ id: 'ex2', movement_pattern: 'empuje', primary_muscle: 'pecho' }),
        mockExercise({ id: 'ex3', movement_pattern: 'rodilla_dominante', primary_muscle: 'cuadriceps' }),
        mockExercise({ id: 'ex4', movement_pattern: 'tiron', primary_muscle: 'biceps' })
      ];

      const safeForKnee = service.getSafeExercisesForJoint(exercises, 'rodilla');
      expect(safeForKnee.map((e) => e.id)).toEqual(['ex2', 'ex4']);
    });

    it('should verify isJointSafeForExercise is the inverse of stressesJoint', () => {
      const exercise = mockExercise({ movement_pattern: 'rodilla_dominante', primary_muscle: 'cuadriceps' });
      expect(service.isJointSafeForExercise(exercise, 'rodilla')).toBe(false);
      expect(service.isJointSafeForExercise(exercise, 'hombro')).toBe(true);
    });

    it('should work with default exported singleton instance fatigueAdjusterService', () => {
      expect(fatigueAdjusterService).toBeInstanceOf(FatigueAdjusterService);
      expect(fatigueAdjusterService.stressesJoint({ movement_pattern: 'empuje', primary_muscle: 'pecho' }, 'hombro')).toBe(true);
    });
  });
});
