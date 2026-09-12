import { describe, it, expect } from 'vitest';
import {
  ProgressionService,
  type SessionPerformance,
  type CalculateProgressionParams
} from '../../src/services/progression.service.js';

describe('TASK-43: ProgressionService - Double Progression Rule (RF-07, CA-07.2)', () => {
  const service = new ProgressionService();

  const successfulSession: SessionPerformance = {
    sets: [
      { reps_completed: 10, rir: 2, weight_kg: 50 },
      { reps_completed: 10, rir: 2, weight_kg: 50 },
      { reps_completed: 10, rir: 2, weight_kg: 50 }
    ]
  };

  it('should suggest increase_reps (+1 rep) maintaining weight when load increment is not viable (RF-07, CA-07.2)', () => {
    const params: CalculateProgressionParams = {
      experienceLevel: 'principiante',
      isCompound: true,
      currentLoadKg: 50,
      currentRepsTarget: 10,
      repsTargetMin: 8,
      repsTargetMax: 12,
      isIncrementViable: false, // E.g. No microplates or smaller dumbbells available
      sessionHistory: [successfulSession]
    };

    const result = service.evaluateProgression(params);

    expect(result.action).toBe('increase_reps');
    expect(result.next_load_kg).toBe(50); // Maintains current load
    expect(result.next_reps_target).toBe(11); // +1 rep
    expect(result.reason).toContain('Doble progresión');
  });

  it('should increment reps until reaching repsTargetMax when incrementing load is not viable', () => {
    const params: CalculateProgressionParams = {
      experienceLevel: 'intermedio',
      isCompound: false,
      currentLoadKg: 12,
      currentRepsTarget: 11,
      repsTargetMin: 8,
      repsTargetMax: 12,
      isIncrementViable: false,
      sessionHistory: [successfulSession, successfulSession],
      targetReps: 10
    };

    const result = service.evaluateProgression(params);

    expect(result.action).toBe('increase_reps');
    expect(result.next_load_kg).toBe(12);
    expect(result.next_reps_target).toBe(12);
  });

  it('should maintain when rep ceiling (repsTargetMax) is reached and load increment is not viable', () => {
    const params: CalculateProgressionParams = {
      experienceLevel: 'principiante',
      isCompound: true,
      currentLoadKg: 50,
      currentRepsTarget: 12,
      repsTargetMin: 8,
      repsTargetMax: 12,
      isIncrementViable: false,
      sessionHistory: [{ sets: [{ reps_completed: 12, rir: 2 }] }],
      targetReps: 12
    };

    const result = service.evaluateProgression(params);

    expect(result.action).toBe('maintain');
    expect(result.next_load_kg).toBe(50);
    expect(result.next_reps_target).toBe(12);
    expect(result.reason).toContain('Techo de repeticiones');
  });

  it('should reset reps to repsTargetMin when load increment IS viable and load is increased', () => {
    const params: CalculateProgressionParams = {
      experienceLevel: 'principiante',
      isCompound: true,
      currentLoadKg: 50,
      currentRepsTarget: 12,
      repsTargetMin: 8,
      repsTargetMax: 12,
      isIncrementViable: true,
      sessionHistory: [{ sets: [{ reps_completed: 12, rir: 2 }] }],
      targetReps: 12
    };

    const result = service.evaluateProgression(params);

    expect(result.action).toBe('increase_load');
    expect(result.next_load_kg).toBe(55);
    expect(result.next_reps_target).toBe(8); // Reset to min range
  });
});
