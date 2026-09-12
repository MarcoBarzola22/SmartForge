import { describe, it, expect } from 'vitest';
import {
  ProgressionService,
  progressionService,
  type CalculateProgressionParams,
  type SessionPerformance
} from '../../src/services/progression.service.js';
import { FatigueAdjusterService } from '../../src/services/fatigue-adjuster.service.js';
import type { Exercise, Joint, PainIntensity } from '../../src/schemas/generated/schemas.js';

describe('ProgressionService - Integration with FatigueAdjuster & Rule Precedence (TASK-50, RF-07, RF-08, D-20)', () => {
  const fatigueAdjuster = new FatigueAdjusterService();
  const service = new ProgressionService();

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

  // Successful 3-session history (10 reps @ RIR 2 in all sets)
  const successfulHistory: SessionPerformance[] = [
    { sessionId: 's3', sets: [{ reps_completed: 10, rir: 2 }, { reps_completed: 10, rir: 2 }] },
    { sessionId: 's2', sets: [{ reps_completed: 10, rir: 2 }, { reps_completed: 10, rir: 2 }] },
    { sessionId: 's1', sets: [{ reps_completed: 10, rir: 2 }, { reps_completed: 10, rir: 2 }] }
  ];

  describe('Severe Pain Precedence over Progression (RF-08, CA-08.1, D-20)', () => {
    it('should block load increase and trigger deload/reduction when severe pain is reported on an involved joint', () => {
      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      const params: CalculateProgressionParams = {
        experienceLevel: 'principiante',
        isCompound: true,
        currentLoadKg: 80,
        currentRepsTarget: 10,
        sessionHistory: successfulHistory,
        exercise: benchPress,
        painReports: [
          { joint: 'hombro', intensity: 'severa' }
        ]
      };

      const result = service.evaluateProgression(params);

      // Severe pain MUST override the standard progression increase
      expect(result.action).not.toBe('increase_load');
      expect(result.action).toBe('deload');
      expect(result.next_load_kg).toBeLessThan(80);
      expect(result.reason).toContain('dolor severo en hombro');
    });

    it('should apply severe pain override when multiple intensities are reported for the same joint (D-20)', () => {
      const squat = mockExercise({
        id: 'sentadilla_trasera_barra',
        name: 'Sentadilla trasera con barra',
        movement_pattern: 'rodilla_dominante',
        primary_muscle: 'cuadriceps'
      });

      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: true,
        currentLoadKg: 100,
        currentRepsTarget: 10,
        sessionHistory: successfulHistory,
        exercise: squat,
        painReports: [
          { joint: 'rodilla', intensity: 'leve' },
          { joint: 'rodilla', intensity: 'severa' }, // D-20: severa prevails
          { joint: 'rodilla', intensity: 'moderada' }
        ]
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('deload');
      expect(result.next_load_kg).toBeLessThan(100);
      expect(result.reason).toContain('dolor severo en rodilla');
    });
  });

  describe('Moderate Pain Precedence over Progression (RF-08, CA-08.2)', () => {
    it('should pause progression and maintain load (cancelling load increase) when 1 session of moderate pain is reported', () => {
      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      const params: CalculateProgressionParams = {
        experienceLevel: 'principiante',
        isCompound: true,
        currentLoadKg: 80,
        currentRepsTarget: 10,
        sessionHistory: successfulHistory, // Racha de 3 exitosas -> normalmente subiría a 85kg
        exercise: benchPress,
        painReports: [
          { joint: 'hombro', intensity: 'moderada', session_id: 's3' }
        ]
      };

      const result = service.evaluateProgression(params);

      // Progression paused, load maintained at 80 kg instead of increased to 85 kg
      expect(result.action).toBe('maintain');
      expect(result.next_load_kg).toBe(80);
      expect(result.reason).toContain('dolor moderado en hombro');
    });

    it('should reduce load by 10% when moderate pain is sustained across 2+ sessions, overriding successful streak', () => {
      const bicepCurl = mockExercise({
        id: 'curl_biceps_barra_recta',
        name: 'Curl de bíceps con barra',
        movement_pattern: 'tiron',
        primary_muscle: 'biceps',
        is_compound: false
      });

      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: false,
        currentLoadKg: 40,
        currentRepsTarget: 10,
        sessionHistory: successfulHistory,
        exercise: bicepCurl,
        painReports: [
          { joint: 'codo', intensity: 'moderada', session_id: 's3' },
          { joint: 'codo', intensity: 'moderada', session_id: 's2' }
        ]
      };

      const result = service.evaluateProgression(params);

      // 40 kg * 0.90 = 36 kg
      expect(result.action).toBe('reduce');
      expect(result.next_load_kg).toBe(36);
      expect(result.reason).toContain('dolor moderado persistente en codo');
    });
  });

  describe('Light Pain Non-Interference (RF-08, CA-08.3)', () => {
    it('should allow normal progression increase when only light pain is reported', () => {
      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      const params: CalculateProgressionParams = {
        experienceLevel: 'principiante',
        isCompound: true,
        currentLoadKg: 60,
        currentRepsTarget: 10,
        sessionHistory: successfulHistory,
        exercise: benchPress,
        painReports: [
          { joint: 'hombro', intensity: 'leve' }
        ]
      };

      const result = service.evaluateProgression(params);

      // Principiante + compuesto -> +5 kg -> 65 kg
      expect(result.action).toBe('increase_load');
      expect(result.next_load_kg).toBe(65);
    });
  });

  describe('Unrelated Joint Pain Non-Interference', () => {
    it('should not block progression for upper body exercise when pain is only in knee', () => {
      const benchPress = mockExercise({
        id: 'press_banca_plano_barra',
        name: 'Press de banca plano con barra',
        movement_pattern: 'empuje',
        primary_muscle: 'pecho'
      });

      const params: CalculateProgressionParams = {
        experienceLevel: 'principiante',
        isCompound: true,
        currentLoadKg: 70,
        currentRepsTarget: 10,
        sessionHistory: successfulHistory,
        exercise: benchPress,
        painReports: [
          { joint: 'rodilla', intensity: 'severa' } // Knee pain does NOT stress bench press
        ]
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('increase_load');
      expect(result.next_load_kg).toBe(75);
    });
  });

  describe('End-to-End Suggestion with Mock Repositories', () => {
    it('should fetch pain reports and apply precedence in getProgressionSuggestion', async () => {
      const mockMesocycleRepo = {
        findAssignmentById: async () => ({
          id: 'assign-1',
          athlete_id: 'ath-1',
          exercise_id: 'press_banca_plano_barra',
          target_sets: 4,
          target_reps: 10,
          target_rir: 2,
          target_load_kg: 80,
          exercise: mockExercise({
            id: 'press_banca_plano_barra',
            name: 'Press de banca plano con barra',
            movement_pattern: 'empuje',
            primary_muscle: 'pecho',
            is_compound: true
          })
        })
      };

      const mockAthleteRepo = {
        findById: async () => ({
          id: 'ath-1',
          experience_level: 'principiante',
          weight_kg: 75
        })
      };

      const mockSetLogRepo = {
        findByAthleteAndExercise: async () => [
          { session_id: 's3', set_number: 1, reps_completed: 10, weight_kg: 80, rir: 2, client_timestamp: new Date().toISOString() },
          { session_id: 's3', set_number: 2, reps_completed: 10, weight_kg: 80, rir: 2, client_timestamp: new Date().toISOString() }
        ]
      };

      const mockPainReportRepo = {
        findByAthleteAndJoint: async (_athId: string, joint: Joint) => {
          if (joint === 'hombro') {
            return [
              { id: 'p1', session_id: 's3', exercise_id: 'press_banca_plano_barra', joint: 'hombro' as Joint, side: 'derecha' as const, intensity: 'moderada' as PainIntensity, client_timestamp: new Date().toISOString(), created_at: new Date().toISOString() }
            ];
          }
          return [];
        }
      };

      const integratedService = new ProgressionService(
        mockMesocycleRepo as any,
        mockAthleteRepo as any,
        mockSetLogRepo as any,
        mockPainReportRepo as any,
        fatigueAdjuster
      );

      const suggestion = await integratedService.getProgressionSuggestion('assign-1', 'ath-1');

      // Moderate shoulder pain in 1 session -> Maintain load instead of increase
      expect(suggestion.suggestion.action).toBe('maintain');
      expect(suggestion.suggestion.next_load_kg).toBe(80);
      expect(suggestion.suggestion.reason).toContain('dolor moderado en hombro');
    });
  });
});
