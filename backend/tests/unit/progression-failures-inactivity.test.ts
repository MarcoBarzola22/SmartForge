import { describe, it, expect } from 'vitest';
import {
  ProgressionService,
  type SessionPerformance,
  type CalculateProgressionParams
} from '../../src/services/progression.service.js';

describe('TASK-44: ProgressionService - Accumulated Failures & Inactivity Penalties (RF-07, CA-07.3, CA-07.5, CL-08)', () => {
  const service = new ProgressionService();

  const failedSession: SessionPerformance = {
    sets: [
      { reps_completed: 7, rir: 1, weight_kg: 100 }, // Failed reps (< 10) & RIR (< 2)
      { reps_completed: 6, rir: 0, weight_kg: 100 }
    ]
  };

  const successfulSession: SessionPerformance = {
    sets: [
      { reps_completed: 10, rir: 2, weight_kg: 100 },
      { reps_completed: 10, rir: 2, weight_kg: 100 }
    ]
  };

  describe('Accumulated Failures Handling (CA-07.2, CA-07.3)', () => {
    it('should propose deload (-10% load) when 3 consecutive sessions fail (CA-07.2)', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: true,
        currentLoadKg: 100,
        currentRepsTarget: 10,
        sessionHistory: [failedSession, failedSession, failedSession],
        targetReps: 10
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('deload');
      expect(result.next_load_kg).toBe(90.0); // 100 * 0.90 = 90 kg (-10%)
      expect(result.reason).toContain('3');
      expect(result.reason.toLowerCase()).toContain('deload');
    });

    it('should reduce load by 5% when there are 2 failures in the 3-session window (CA-07.2)', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: true,
        currentLoadKg: 100,
        currentRepsTarget: 10,
        sessionHistory: [failedSession, successfulSession, failedSession], // 2 failures in window of 3
        targetReps: 10
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('reduce');
      expect(result.next_load_kg).toBe(95.0); // 100 * 0.95 = 95 kg (-5%)
      expect(result.reason).toContain('2 fallos');
    });

    it('should maintain load on isolated single failure (1 failure in window)', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: true,
        currentLoadKg: 100,
        currentRepsTarget: 10,
        sessionHistory: [failedSession, successfulSession, successfulSession], // 1 failure
        targetReps: 10
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('maintain');
      expect(result.next_load_kg).toBe(100);
      expect(result.reason.toLowerCase()).toContain('fallo aislado');
    });
  });

  describe('Inactivity Penalties (CA-07.5, CL-08)', () => {
    it('should reduce load by 10% when athlete was inactive for >= 2 weeks (>= 14 days) (CL-08)', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: true,
        currentLoadKg: 100,
        currentRepsTarget: 10,
        sessionHistory: [successfulSession],
        daysSinceLastSession: 15
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('reduce');
      expect(result.next_load_kg).toBe(90.0); // 100 * 0.90 = 90 kg
      expect(result.reason).toContain('Inactividad');
      expect(result.reason).toContain('10%');
    });

    it('should apply inactivity deload when inactive for >= 4 weeks (>= 28 days)', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'avanzado',
        isCompound: true,
        currentLoadKg: 120,
        currentRepsTarget: 8,
        sessionHistory: [successfulSession],
        daysSinceLastSession: 30
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('reduce');
      expect(result.next_load_kg).toBe(108.0); // 120 * 0.90 = 108 kg
      expect(result.reason).toContain('Inactividad');
    });

    it('should not apply inactivity penalty when active within 14 days (e.g. 3 days)', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'principiante',
        isCompound: true,
        currentLoadKg: 80,
        currentRepsTarget: 10,
        sessionHistory: [successfulSession],
        daysSinceLastSession: 3
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('increase_load'); // Progresses normally
      expect(result.next_load_kg).toBe(85.0);
    });
  });
});
