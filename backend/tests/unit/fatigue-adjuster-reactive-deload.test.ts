import { describe, it, expect } from 'vitest';
import {
  FatigueAdjusterService,
  fatigueAdjusterService,
  type ReactiveDeloadParams,
  type SessionPlanAdjustmentParams
} from '../../src/services/fatigue-adjuster.service.js';
import type { Exercise } from '../../src/schemas/generated/schemas.js';

describe('FatigueAdjusterService - Pre-session Sustained High Fatigue & Reactive Deload (TASK-49, RF-08, CA-08.4)', () => {
  const service = new FatigueAdjusterService();

  const mockExercise = (overrides: Partial<Exercise>): Exercise => ({
    id: 'test_exercise',
    name: 'Ejercicio de prueba',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.65,
    video_url: 'https://youtube.com/watch?v=test',
    video_fallback_url: 'https://smartforge.app/test.webp',
    instructions: 'Test instructions',
    is_active: true,
    ...overrides
  });

  describe('countConsecutiveHighFatigue', () => {
    it('should return 0 when fatigue history is empty', () => {
      expect(service.countConsecutiveHighFatigue([])).toBe(0);
    });

    it('should return 0 when the most recent session has fatigue < 4', () => {
      // most recent first
      expect(service.countConsecutiveHighFatigue([3, 5, 4])).toBe(0);
      expect(service.countConsecutiveHighFatigue([{ fatigue_level: 2 }, { fatigue_level: 5 }])).toBe(0);
    });

    it('should return 1 when only the most recent session has fatigue >= 4', () => {
      expect(service.countConsecutiveHighFatigue([4, 3, 5])).toBe(1);
      expect(service.countConsecutiveHighFatigue([5, 2, 4])).toBe(1);
    });

    it('should return 2 when the 2 most recent consecutive sessions have fatigue >= 4', () => {
      expect(service.countConsecutiveHighFatigue([4, 5, 2])).toBe(2);
      expect(service.countConsecutiveHighFatigue([5, 4, 1])).toBe(2);
      expect(
        service.countConsecutiveHighFatigue([
          { fatigue_level: 4, session_id: 's2' },
          { fatigue_level: 4, session_id: 's1' }
        ])
      ).toBe(2);
    });

    it('should return 3 when 3 consecutive sessions have high fatigue >= 4', () => {
      expect(service.countConsecutiveHighFatigue([4, 5, 4])).toBe(3);
    });
  });

  describe('isReactiveDeloadTriggered', () => {
    it('should return true when 2 or more consecutive sessions have fatigue >= 4 (CA-08.4)', () => {
      expect(service.isReactiveDeloadTriggered([4, 4])).toBe(true);
      expect(service.isReactiveDeloadTriggered([5, 4, 2])).toBe(true);
      expect(service.isReactiveDeloadTriggered([5, 5, 4])).toBe(true);
    });

    it('should return false when fewer than 2 consecutive sessions have fatigue >= 4', () => {
      expect(service.isReactiveDeloadTriggered([4, 3])).toBe(false);
      expect(service.isReactiveDeloadTriggered([3, 5])).toBe(false);
      expect(service.isReactiveDeloadTriggered([2, 1])).toBe(false);
      expect(service.isReactiveDeloadTriggered([4])).toBe(false);
      expect(service.isReactiveDeloadTriggered([])).toBe(false);
    });
  });

  describe('applyReactiveDeload', () => {
    it('should reduce volume by 40% (-40% sets) and add notice when reactive deload is triggered', () => {
      const benchPress = mockExercise({ id: 'bench', name: 'Press de banca plano' });
      const squat = mockExercise({ id: 'squat', name: 'Sentadilla' });

      const params: ReactiveDeloadParams = {
        exercises: [
          { exercise: benchPress, target_sets: 5, target_load_kg: 100, target_rir: 2 },
          { exercise: squat, target_sets: 4, target_load_kg: 120, target_rir: 2 }
        ],
        fatigue_history: [4, 5]
      };

      const result = service.applyReactiveDeload(params);

      expect(result.is_reactive_deload).toBe(true);
      expect(result.consecutive_high_fatigue_count).toBe(2);
      expect(result.volume_reduction_percentage).toBe(40);
      // 5 * 0.60 = 3 sets
      expect(result.exercises[0].adjusted_sets).toBe(3);
      // 4 * 0.60 = 2.4 -> floor = 2 sets
      expect(result.exercises[1].adjusted_sets).toBe(2);
      expect(result.notices.some((n) => n.includes('descarga reactiva') || n.includes('40%'))).toBe(true);
    });

    it('should not alter sets when reactive deload is not triggered', () => {
      const benchPress = mockExercise({ id: 'bench' });

      const params: ReactiveDeloadParams = {
        exercises: [
          { exercise: benchPress, target_sets: 4, target_load_kg: 100, target_rir: 2 }
        ],
        fatigue_history: [4, 2] // only 1 session with high fatigue
      };

      const result = service.applyReactiveDeload(params);

      expect(result.is_reactive_deload).toBe(false);
      expect(result.volume_reduction_percentage).toBe(0);
      expect(result.exercises[0].adjusted_sets).toBe(4);
      expect(result.notices).toHaveLength(0);
    });
  });

  describe('Integrated Session Plan Adjustment with Reactive Deload', () => {
    it('should trigger reactive deload in adjustSessionForPain when fatigue >= 4 for 2+ consecutive sessions', () => {
      const benchPress = mockExercise({ id: 'bench', name: 'Press de banca' });

      const params: SessionPlanAdjustmentParams = {
        exercises: [
          { exercise: benchPress, target_sets: 5, target_load_kg: 80 }
        ],
        pain_reports: [],
        fatigue_history: [5, 4]
      };

      const result = service.adjustSessionForPain(params);

      expect(result.reactive_deload_recommended).toBe(true);
      // 5 * 0.60 = 3 sets
      expect(result.exercises[0].target_sets).toBe(3);
      expect(result.notices.some((n) => n.includes('Fatiga alta sostenida') || n.includes('descarga reactiva'))).toBe(true);
    });
  });

  describe('Singleton Instance Export', () => {
    it('should export countConsecutiveHighFatigue and isReactiveDeloadTriggered on fatigueAdjusterService', () => {
      expect(fatigueAdjusterService.countConsecutiveHighFatigue([4, 4])).toBe(2);
      expect(fatigueAdjusterService.isReactiveDeloadTriggered([5, 5])).toBe(true);
    });
  });
});
