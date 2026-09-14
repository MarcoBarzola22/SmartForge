import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  routineConfigStore,
  useRoutineConfigStore,
  DEFAULT_ROUTINE_TIME_BLOCKS,
  type SessionDurationMinutes
} from './routineConfig.store';
import type { RoutineTimeBlockItem } from '../api/generated/types';

describe('TASK-30: routineConfig.store.ts — Reactive Recommended Exercises & Cache (RF-03, RF-04)', () => {
  beforeEach(() => {
    localStorage.clear();
    routineConfigStore.reset();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initial State and Default Time Blocks', () => {
    it('should initialize with standard 6 time blocks and 60 min default', () => {
      const state = routineConfigStore.getState();

      expect(state.timeBlocks).toHaveLength(6);
      expect(state.selectedDuration).toBe(60);
      expect(state.recommendedExercises).toBe(4);
      expect(state.currentBlock.duration_minutes).toBe(60);
      expect(state.currentBlock.min_exercises).toBe(2);
      expect(state.currentBlock.max_exercises).toBe(5);
      expect(state.selectedPreference).toEqual({ mode: 'recommended' });
      expect(state.viability.viable).toBe(true);
    });

    it('should match the exact specifications for all 6 default duration blocks', () => {
      const blocks = routineConfigStore.getState().timeBlocks;
      const expected = [
        { duration_minutes: 30, min: 2, max: 3, rec: 2 },
        { duration_minutes: 45, min: 2, max: 4, rec: 3 },
        { duration_minutes: 60, min: 2, max: 5, rec: 4 },
        { duration_minutes: 75, min: 2, max: 6, rec: 5 },
        { duration_minutes: 90, min: 3, max: 7, rec: 6 },
        { duration_minutes: 120, min: 4, max: 7, rec: 7 }
      ];

      expected.forEach((exp) => {
        const found = blocks.find((b) => b.duration_minutes === exp.duration_minutes);
        expect(found).toBeDefined();
        expect(found?.min_exercises).toBe(exp.min);
        expect(found?.max_exercises).toBe(exp.max);
        expect(found?.recommended_exercises).toBe(exp.rec);
      });
    });
  });

  describe('Reactive Recalculation of N upon Duration Change (RF-03 CA-03.4)', () => {
    const testCases: Array<{ duration: SessionDurationMinutes; expectedN: number; max: number }> = [
      { duration: 30, expectedN: 2, max: 3 },
      { duration: 45, expectedN: 3, max: 4 },
      { duration: 60, expectedN: 4, max: 5 },
      { duration: 75, expectedN: 5, max: 6 },
      { duration: 90, expectedN: 6, max: 7 },
      { duration: 120, expectedN: 7, max: 7 }
    ];

    testCases.forEach(({ duration, expectedN, max }) => {
      it(`should reactively recalculate N = ${expectedN} when selecting ${duration} min`, () => {
        routineConfigStore.selectDuration(duration);

        const state = routineConfigStore.getState();
        expect(state.selectedDuration).toBe(duration);
        expect(state.recommendedExercises).toBe(expectedN);
        expect(state.currentBlock.recommended_exercises).toBe(expectedN);
        expect(state.currentBlock.max_exercises).toBe(max);
        expect(state.viability.viable).toBe(true);
      });
    });

    it('should synchronously notify subscribers whenever duration changes', () => {
      const listener = vi.fn();
      const unsubscribe = routineConfigStore.subscribe(listener);

      routineConfigStore.selectDuration(90);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedDuration: 90,
          recommendedExercises: 6
        })
      );

      routineConfigStore.selectDuration(30);
      expect(listener).toHaveBeenCalledTimes(2);
      expect(listener).toHaveBeenLastCalledWith(
        expect.objectContaining({
          selectedDuration: 30,
          recommendedExercises: 2
        })
      );

      unsubscribe();
      routineConfigStore.selectDuration(60);
      expect(listener).toHaveBeenCalledTimes(2); // no more calls after unsubscribe
    });
  });

  describe('Viability Calculation and Inviability Blocking (RF-04 CA-04.2, CA-04.3)', () => {
    it('recommended mode is mathematically guaranteed to be viable across all duration blocks', () => {
      const durations: SessionDurationMinutes[] = [30, 45, 60, 75, 90, 120];

      durations.forEach((dur) => {
        routineConfigStore.selectDuration(dur);
        routineConfigStore.selectPreference({ mode: 'recommended' });
        const state = routineConfigStore.getState();

        expect(state.viability.viable).toBe(true);
        expect(state.viability.reason).toBeUndefined();
      });
    });

    it('should validate manual exercise count within range [min, max] as viable', () => {
      routineConfigStore.selectDuration(60); // min: 2, max: 5
      routineConfigStore.selectPreference({ mode: 'manual', customCount: 4 });

      const state = routineConfigStore.getState();
      expect(state.viability.viable).toBe(true);
    });

    it('should block manual exercise count exceeding duration budget (RF-04 CA-04.2)', () => {
      routineConfigStore.selectDuration(30); // min: 2, max: 3
      routineConfigStore.selectPreference({ mode: 'manual', customCount: 5 });

      const state = routineConfigStore.getState();
      expect(state.viability.viable).toBe(false);
      expect(state.viability.maxAllowed).toBe(3);
      expect(state.viability.reason).toMatch(/excede el presupuesto/i);
      expect(state.viability.reason).toContain('30');
      expect(state.viability.reason).toContain('3');
    });

    it('should block manual exercise count below minimum effective exercises', () => {
      routineConfigStore.selectDuration(90); // min: 3, max: 7
      routineConfigStore.selectPreference({ mode: 'manual', customCount: 1 });

      const state = routineConfigStore.getState();
      expect(state.viability.viable).toBe(false);
      expect(state.viability.minAllowed).toBe(3);
      expect(state.viability.reason).toMatch(/inferior al mínimo/i);
    });

    it('should reactively transition from viable to inviable when duration shrinks while keeping manual count', () => {
      // 1. In 60 min with customCount = 5: viable (max is 5)
      routineConfigStore.selectDuration(60);
      routineConfigStore.selectPreference({ mode: 'manual', customCount: 5 });
      expect(routineConfigStore.getState().viability.viable).toBe(true);

      // 2. User changes duration to 30 min: max is 3, so customCount = 5 immediately becomes inviable!
      routineConfigStore.selectDuration(30);
      const state30 = routineConfigStore.getState();
      expect(state30.viability.viable).toBe(false);
      expect(state30.viability.maxAllowed).toBe(3);
      expect(state30.recommendedExercises).toBe(2);

      // 3. User increases duration to 90 min: max is 7, so customCount = 5 immediately becomes viable again!
      routineConfigStore.selectDuration(90);
      const state90 = routineConfigStore.getState();
      expect(state90.viability.viable).toBe(true);
      expect(state90.recommendedExercises).toBe(6);
    });

    it('isCountViable helper tests arbitrary counts without mutating current selection', () => {
      routineConfigStore.selectDuration(60);

      const res4 = routineConfigStore.isCountViable(4);
      expect(res4.viable).toBe(true);

      const res6 = routineConfigStore.isCountViable(6);
      expect(res6.viable).toBe(false);
      expect(res6.maxAllowed).toBe(5);

      // Test with explicit duration override
      const res30With4 = routineConfigStore.isCountViable(4, 30);
      expect(res30With4.viable).toBe(false);
      expect(res30With4.maxAllowed).toBe(3);
    });
  });

  describe('Caching, Persistence and loadConfig()', () => {
    const mockApiBlocks: RoutineTimeBlockItem[] = [
      { duration_minutes: 30, min_exercises: 2, max_exercises: 3, recommended_exercises: 3 },
      { duration_minutes: 45, min_exercises: 3, max_exercises: 5, recommended_exercises: 4 },
      { duration_minutes: 60, min_exercises: 3, max_exercises: 6, recommended_exercises: 5 },
      { duration_minutes: 75, min_exercises: 4, max_exercises: 7, recommended_exercises: 6 },
      { duration_minutes: 90, min_exercises: 5, max_exercises: 8, recommended_exercises: 7 },
      { duration_minutes: 120, min_exercises: 6, max_exercises: 9, recommended_exercises: 8 }
    ];

    it('should save and load custom blocks via setTimeBlocks() and persist to localStorage', () => {
      routineConfigStore.setTimeBlocks(mockApiBlocks);

      const state = routineConfigStore.getState();
      expect(state.timeBlocks).toEqual(mockApiBlocks);
      expect(state.isCached).toBe(true);

      // Check localStorage item
      const stored = localStorage.getItem('smartforge_routine_config_blocks');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(mockApiBlocks);
    });

    it('should fetch from API on loadConfig() and update store state', async () => {
      const mockFetch = vi.fn().mockResolvedValue(mockApiBlocks);

      const result = await routineConfigStore.loadConfig(mockFetch);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockApiBlocks);
      expect(routineConfigStore.getState().timeBlocks).toEqual(mockApiBlocks);
      expect(routineConfigStore.getState().isCached).toBe(true);
      expect(routineConfigStore.getState().lastFetchedAt).toBeDefined();
    });

    it('should fallback gracefully to cached blocks if loadConfig fetch fails', async () => {
      routineConfigStore.setTimeBlocks(mockApiBlocks);

      const failingFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await routineConfigStore.loadConfig(failingFetch);

      expect(result).toEqual(mockApiBlocks);
      expect(routineConfigStore.getState().timeBlocks).toEqual(mockApiBlocks);
      expect(routineConfigStore.getState().error).toBe('Network error');
    });

    it('should restore from localStorage during initialization if available', () => {
      localStorage.setItem('smartforge_routine_config_blocks', JSON.stringify(mockApiBlocks));

      // Re-init store
      routineConfigStore.initFromStorage();

      expect(routineConfigStore.getState().timeBlocks).toEqual(mockApiBlocks);
      expect(routineConfigStore.getState().isCached).toBe(true);
    });

    it('should handle corrupted localStorage safely without crashing', () => {
      localStorage.setItem('smartforge_routine_config_blocks', 'invalid-json{{{');

      expect(() => routineConfigStore.initFromStorage()).not.toThrow();
      expect(routineConfigStore.getState().timeBlocks).toEqual(DEFAULT_ROUTINE_TIME_BLOCKS);
    });
  });

  describe('React Hook Integration: useRoutineConfigStore()', () => {
    it('should provide reactive state and methods to React components', () => {
      const { result } = renderHook(() => useRoutineConfigStore());

      expect(result.current.selectedDuration).toBe(60);
      expect(result.current.recommendedExercises).toBe(4);
      expect(result.current.viability.viable).toBe(true);

      // Mutate duration
      act(() => {
        result.current.selectDuration(90);
      });

      expect(result.current.selectedDuration).toBe(90);
      expect(result.current.recommendedExercises).toBe(6);
      expect(result.current.currentBlock.duration_minutes).toBe(90);

      // Mutate preference to manual inviable count
      act(() => {
        result.current.selectPreference({ mode: 'manual', customCount: 9 });
      });

      expect(result.current.viability.viable).toBe(false);
      expect(result.current.viability.maxAllowed).toBe(7);

      // Mutate back to recommended
      act(() => {
        result.current.selectPreference({ mode: 'recommended' });
      });

      expect(result.current.viability.viable).toBe(true);
    });
  });
});
