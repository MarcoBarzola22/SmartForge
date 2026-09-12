import { describe, it, expect } from 'vitest';
import {
  ProgressionService,
  type SessionPerformance,
  type CalculateProgressionParams
} from '../../src/services/progression.service.js';

describe('TASK-42: ProgressionService - Level-based Load Increment Rules (RF-07, CA-07.1)', () => {
  const service = new ProgressionService();

  describe('getLoadIncrement & getRequiredSessionsForProgression', () => {
    it('should return exact load increments and required sessions for Principiante (RF-07 table)', () => {
      expect(service.getRequiredSessionsForProgression('principiante')).toBe(1);
      expect(service.getLoadIncrement('principiante', true)).toBe(5.0);   // +5 kg compound
      expect(service.getLoadIncrement('principiante', false)).toBe(2.5);  // +2.5 kg isolation
    });

    it('should return exact load increments and required sessions for Intermedio (RF-07 table)', () => {
      expect(service.getRequiredSessionsForProgression('intermedio')).toBe(2);
      expect(service.getLoadIncrement('intermedio', true)).toBe(2.5);    // +2.5 kg compound
      expect(service.getLoadIncrement('intermedio', false)).toBe(1.25);  // +1.25 kg isolation
    });

    it('should return exact load increments and required sessions for Avanzado (RF-07 table)', () => {
      expect(service.getRequiredSessionsForProgression('avanzado')).toBe(3);
      expect(service.getLoadIncrement('avanzado', true)).toBe(2.5);     // +2.5 kg compound
      expect(service.getLoadIncrement('avanzado', false)).toBe(1.25);   // +1.25 kg isolation
    });
  });

  describe('evaluateProgression - Load Increment Rules', () => {
    const successfulSession10Reps: SessionPerformance = {
      sets: [
        { reps_completed: 10, rir: 2, weight_kg: 80 },
        { reps_completed: 10, rir: 2, weight_kg: 80 },
        { reps_completed: 10, rir: 3, weight_kg: 80 }
      ]
    };

    it('should suggest +5 kg on compound exercise for Principiante after 1 successful session', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'principiante',
        isCompound: true,
        currentLoadKg: 80,
        currentRepsTarget: 10,
        sessionHistory: [successfulSession10Reps]
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('increase_load');
      expect(result.next_load_kg).toBe(85.0);
      expect(result.streak_count).toBe(1);
      expect(result.reason).toContain('principiante');
    });

    it('should suggest +2.5 kg on isolation exercise for Principiante after 1 successful session', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'principiante',
        isCompound: false,
        currentLoadKg: 15,
        currentRepsTarget: 12,
        sessionHistory: [{ sets: [{ reps_completed: 12, rir: 2 }] }],
        targetReps: 12
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('increase_load');
      expect(result.next_load_kg).toBe(17.5);
      expect(result.streak_count).toBe(1);
    });

    it('should maintain load for Intermedio after only 1 successful session (requires 2)', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: true,
        currentLoadKg: 100,
        currentRepsTarget: 10,
        sessionHistory: [successfulSession10Reps]
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('maintain');
      expect(result.next_load_kg).toBe(100);
      expect(result.streak_count).toBe(1);
    });

    it('should suggest +2.5 kg on compound exercise for Intermedio after 2 consecutive successful sessions', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: true,
        currentLoadKg: 100,
        currentRepsTarget: 10,
        sessionHistory: [successfulSession10Reps, successfulSession10Reps]
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('increase_load');
      expect(result.next_load_kg).toBe(102.5);
      expect(result.streak_count).toBe(2);
    });

    it('should suggest +1.25 kg on isolation exercise for Intermedio after 2 consecutive successful sessions', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'intermedio',
        isCompound: false,
        currentLoadKg: 10,
        currentRepsTarget: 15,
        sessionHistory: [
          { sets: [{ reps_completed: 15, rir: 2 }] },
          { sets: [{ reps_completed: 15, rir: 3 }] }
        ],
        targetReps: 15
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('increase_load');
      expect(result.next_load_kg).toBe(11.25);
      expect(result.streak_count).toBe(2);
    });

    it('should maintain load for Avanzado after 2 successful sessions (requires 3)', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'avanzado',
        isCompound: true,
        currentLoadKg: 140,
        currentRepsTarget: 8,
        sessionHistory: [
          { sets: [{ reps_completed: 8, rir: 2 }] },
          { sets: [{ reps_completed: 8, rir: 2 }] }
        ],
        targetReps: 8
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('maintain');
      expect(result.next_load_kg).toBe(140);
      expect(result.streak_count).toBe(2);
    });

    it('should suggest +2.5 kg on compound exercise for Avanzado after 3 consecutive successful sessions', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'avanzado',
        isCompound: true,
        currentLoadKg: 140,
        currentRepsTarget: 8,
        sessionHistory: [
          { sets: [{ reps_completed: 8, rir: 2 }] },
          { sets: [{ reps_completed: 8, rir: 2 }] },
          { sets: [{ reps_completed: 8, rir: 3 }] }
        ],
        targetReps: 8
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('increase_load');
      expect(result.next_load_kg).toBe(142.5);
      expect(result.streak_count).toBe(3);
    });

    it('should suggest +1.25 kg on isolation exercise for Avanzado after 3 consecutive successful sessions', () => {
      const params: CalculateProgressionParams = {
        experienceLevel: 'avanzado',
        isCompound: false,
        currentLoadKg: 20,
        currentRepsTarget: 12,
        sessionHistory: [
          { sets: [{ reps_completed: 12, rir: 2 }] },
          { sets: [{ reps_completed: 12, rir: 2 }] },
          { sets: [{ reps_completed: 12, rir: 2 }] }
        ],
        targetReps: 12
      };

      const result = service.evaluateProgression(params);

      expect(result.action).toBe('increase_load');
      expect(result.next_load_kg).toBe(21.25);
      expect(result.streak_count).toBe(3);
    });
  });
});
