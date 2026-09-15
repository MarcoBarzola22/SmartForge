import { describe, it, expect } from 'vitest';
import {
  FatigueAdjusterService,
  fatigueAdjusterService,
  type ModeratePainAdjustmentParams
} from '../../src/services/fatigue-adjuster.service.js';
import type { Joint, PainIntensity } from '../../src/schemas/generated/schemas.js';

describe('FatigueAdjusterService - Moderate Joint Pain Reduction Rules (TASK-47, RF-08, CA-08.2)', () => {
  const service = new FatigueAdjusterService();

  describe('Single Session with Moderate Pain (-30% volume, 0% load reduction)', () => {
    it('should reduce volume by 30% and keep load unchanged when 1 session of moderate pain is reported', () => {
      const params: ModeratePainAdjustmentParams = {
        target_sets: 4,
        target_load_kg: 100,
        sessions_with_moderate_pain: 1,
        joint: 'hombro',
        exercise_name: 'Press de banca plano con barra'
      };

      const result = service.applyModeratePainAdjustment(params);

      expect(result.has_adjustment).toBe(true);
      expect(result.volume_reduction_percentage).toBe(30);
      expect(result.load_reduction_percentage).toBe(0);
      // 4 * 0.70 = 2.8 -> floor = 2 sets
      expect(result.adjusted_sets).toBe(2);
      expect(result.adjusted_load_kg).toBe(100);
      expect(result.reason).toContain('30%');
      expect(result.reason).toContain('hombro');
    });

    it('should safely round down sets and enforce minimum 1 set across different set counts for 30% reduction', () => {
      // 5 sets * 0.70 = 3.5 -> 3
      expect(service.calculateReducedSets(5, 30)).toBe(3);
      // 4 sets * 0.70 = 2.8 -> 2
      expect(service.calculateReducedSets(4, 30)).toBe(2);
      // 3 sets * 0.70 = 2.1 -> 2
      expect(service.calculateReducedSets(3, 30)).toBe(2);
      // 2 sets * 0.70 = 1.4 -> 1
      expect(service.calculateReducedSets(2, 30)).toBe(1);
      // 1 set * 0.70 = 0.7 -> minimum 1
      expect(service.calculateReducedSets(1, 30)).toBe(1);
    });
  });

  describe('2+ Sessions with Moderate Pain (-50% volume, -10% load reduction)', () => {
    it('should reduce volume by 50% and load by 10% when 2 sessions with moderate pain are reported', () => {
      const params: ModeratePainAdjustmentParams = {
        target_sets: 4,
        target_load_kg: 80,
        sessions_with_moderate_pain: 2,
        joint: 'rodilla',
        exercise_name: 'Sentadilla trasera con barra'
      };

      const result = service.applyModeratePainAdjustment(params);

      expect(result.has_adjustment).toBe(true);
      expect(result.volume_reduction_percentage).toBe(50);
      expect(result.load_reduction_percentage).toBe(10);
      // 4 * 0.50 = 2 sets
      expect(result.adjusted_sets).toBe(2);
      // 80 * 0.90 = 72 kg
      expect(result.adjusted_load_kg).toBe(72);
      expect(result.reason).toContain('50%');
      expect(result.reason).toContain('10%');
      expect(result.reason).toContain('rodilla');
    });

    it('should reduce volume by 50% and load by 10% when 3 sessions with moderate pain are reported', () => {
      const params: ModeratePainAdjustmentParams = {
        target_sets: 5,
        target_load_kg: 65,
        sessions_with_moderate_pain: 3,
        joint: 'codo',
        exercise_name: 'Curl de bíceps con barra'
      };

      const result = service.applyModeratePainAdjustment(params);

      expect(result.has_adjustment).toBe(true);
      expect(result.volume_reduction_percentage).toBe(50);
      expect(result.load_reduction_percentage).toBe(10);
      // 5 * 0.50 = 2.5 -> floor = 2 sets
      expect(result.adjusted_sets).toBe(2);
      // 65 * 0.90 = 58.5 kg
      expect(result.adjusted_load_kg).toBe(58.5);
    });

    it('should safely round down sets and enforce minimum 1 set across different set counts for 50% reduction', () => {
      // 5 sets * 0.50 = 2.5 -> 2
      expect(service.calculateReducedSets(5, 50)).toBe(2);
      // 4 sets * 0.50 = 2
      expect(service.calculateReducedSets(4, 50)).toBe(2);
      // 3 sets * 0.50 = 1.5 -> 1
      expect(service.calculateReducedSets(3, 50)).toBe(1);
      // 2 sets * 0.50 = 1
      expect(service.calculateReducedSets(2, 50)).toBe(1);
      // 1 set * 0.50 = 0.5 -> minimum 1
      expect(service.calculateReducedSets(1, 50)).toBe(1);
    });

    it('should calculate reduced load with 1 decimal precision', () => {
      expect(service.calculateReducedLoad(100, 10)).toBe(90);
      expect(service.calculateReducedLoad(72.5, 10)).toBe(65.3); // 72.5 * 0.9 = 65.25 -> 65.3
      expect(service.calculateReducedLoad(50, 0)).toBe(50);
    });
  });

  describe('No Moderate Pain (0 sessions with moderate pain)', () => {
    it('should return no adjustment when sessions_with_moderate_pain is 0', () => {
      const params: ModeratePainAdjustmentParams = {
        target_sets: 4,
        target_load_kg: 100,
        sessions_with_moderate_pain: 0,
        joint: 'hombro'
      };

      const result = service.applyModeratePainAdjustment(params);

      expect(result.has_adjustment).toBe(false);
      expect(result.volume_reduction_percentage).toBe(0);
      expect(result.load_reduction_percentage).toBe(0);
      expect(result.adjusted_sets).toBe(4);
      expect(result.adjusted_load_kg).toBe(100);
      expect(result.reason).toBe('');
    });
  });

  describe('countSessionsWithPain Helper', () => {
    it('should correctly count distinct sessions with specific joint pain and intensity in a window', () => {
      const painHistory = [
        { session_id: 'sess-1', joint: 'rodilla' as Joint, intensity: 'moderada' as PainIntensity },
        { session_id: 'sess-1', joint: 'rodilla' as Joint, intensity: 'moderada' as PainIntensity }, // duplicate in same session
        { session_id: 'sess-2', joint: 'rodilla' as Joint, intensity: 'moderada' as PainIntensity },
        { session_id: 'sess-3', joint: 'hombro' as Joint, intensity: 'moderada' as PainIntensity },
        { session_id: 'sess-3', joint: 'rodilla' as Joint, intensity: 'leve' as PainIntensity }
      ];

      const moderateKneeSessions = service.countSessionsWithPain(painHistory, 'rodilla', 'moderada');
      expect(moderateKneeSessions).toBe(2);

      const moderateShoulderSessions = service.countSessionsWithPain(painHistory, 'hombro', 'moderada');
      expect(moderateShoulderSessions).toBe(1);

      const anyKneeSessions = service.countSessionsWithPain(painHistory, 'rodilla');
      expect(anyKneeSessions).toBe(3);
    });
  });

  describe('Singleton Instance', () => {
    it('should allow invoking applyModeratePainAdjustment via singleton instance', () => {
      const result = fatigueAdjusterService.applyModeratePainAdjustment({
        target_sets: 4,
        target_load_kg: 50,
        sessions_with_moderate_pain: 1,
        joint: 'cadera'
      });

      expect(result.has_adjustment).toBe(true);
      expect(result.adjusted_sets).toBe(2);
      expect(result.adjusted_load_kg).toBe(50);
    });
  });
});
