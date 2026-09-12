import { describe, it, expect } from 'vitest';
import { ProgressionService, type SessionPerformance } from '../../src/services/progression.service.js';

describe('TASK-41: ProgressionService - calculateStreak (RF-07, CA-07.1, CA-07.4)', () => {
  const service = new ProgressionService();

  describe('isSessionSuccessful', () => {
    it('should return true when all sets meet or exceed target reps with RIR >= target RIR (default 2)', () => {
      const sets = [
        { reps_completed: 10, rir: 2 },
        { reps_completed: 10, rir: 2 },
        { reps_completed: 11, rir: 3 }
      ];

      expect(service.isSessionSuccessful(sets, 10, 2)).toBe(true);
    });

    it('should return false if any set has reps_completed < target reps', () => {
      const sets = [
        { reps_completed: 10, rir: 2 },
        { reps_completed: 9, rir: 2 }, // Failed reps
        { reps_completed: 10, rir: 2 }
      ];

      expect(service.isSessionSuccessful(sets, 10, 2)).toBe(false);
    });

    it('should return false if any set has RIR < target RIR (e.g. went to failure RIR 0 or 1)', () => {
      const sets = [
        { reps_completed: 10, rir: 2 },
        { reps_completed: 10, rir: 1 } // Failed RIR requirement
      ];

      expect(service.isSessionSuccessful(sets, 10, 2)).toBe(false);
    });

    it('should return false if sets array is empty', () => {
      expect(service.isSessionSuccessful([], 10, 2)).toBe(false);
    });
  });

  describe('calculateStreak', () => {
    it('should return 0 when session history is empty', () => {
      expect(service.calculateStreak([], 10, 2)).toBe(0);
    });

    it('should return 1 when only the most recent session was successful', () => {
      const sessions: SessionPerformance[] = [
        { sets: [{ reps_completed: 10, rir: 2 }, { reps_completed: 10, rir: 2 }] }, // Recent: Success
        { sets: [{ reps_completed: 8, rir: 2 }, { reps_completed: 8, rir: 1 }] }   // Older: Failed
      ];

      expect(service.calculateStreak(sessions, 10, 2)).toBe(1);
    });

    it('should return 2 when the last 2 consecutive sessions were successful', () => {
      const sessions: SessionPerformance[] = [
        { sets: [{ reps_completed: 10, rir: 2 }, { reps_completed: 10, rir: 3 }] }, // Recent (Session 2): Success
        { sets: [{ reps_completed: 10, rir: 2 }, { reps_completed: 10, rir: 2 }] }, // Session 1: Success
        { sets: [{ reps_completed: 7, rir: 1 }] }                                   // Session 0: Failed
      ];

      expect(service.calculateStreak(sessions, 10, 2)).toBe(2);
    });

    it('should return 3 when all 3 sessions in window were successful', () => {
      const sessions: SessionPerformance[] = [
        { sets: [{ reps_completed: 10, rir: 2 }] },
        { sets: [{ reps_completed: 10, rir: 2 }] },
        { sets: [{ reps_completed: 10, rir: 2 }] }
      ];

      expect(service.calculateStreak(sessions, 10, 2)).toBe(3);
    });

    it('should return 0 when the most recent session failed even if prior sessions were successful', () => {
      const sessions: SessionPerformance[] = [
        { sets: [{ reps_completed: 9, rir: 2 }] },  // Most recent: Failed
        { sets: [{ reps_completed: 10, rir: 2 }] }, // Prior: Success
        { sets: [{ reps_completed: 10, rir: 2 }] }  // Prior: Success
      ];

      expect(service.calculateStreak(sessions, 10, 2)).toBe(0);
    });

    it('should respect custom window size and custom target parameters', () => {
      const sessions: SessionPerformance[] = [
        { sets: [{ reps_completed: 6, rir: 3 }] },
        { sets: [{ reps_completed: 6, rir: 3 }] },
        { sets: [{ reps_completed: 6, rir: 3 }] },
        { sets: [{ reps_completed: 6, rir: 3 }] }
      ];

      expect(service.calculateStreak(sessions, 6, 3, 4)).toBe(4);
      expect(service.calculateStreak(sessions, 6, 3, 2)).toBe(2);
    });
  });

  describe('analyzePerformanceWindow', () => {
    it('should correctly count consecutive failures and total failures in analysis window', () => {
      const sessions: SessionPerformance[] = [
        { sets: [{ reps_completed: 8, rir: 1 }] },  // Failed (recent)
        { sets: [{ reps_completed: 9, rir: 0 }] },  // Failed
        { sets: [{ reps_completed: 10, rir: 2 }] }  // Success
      ];

      const analysis = service.analyzePerformanceWindow(sessions, 10, 2, 3);
      expect(analysis.successfulStreak).toBe(0);
      expect(analysis.consecutiveFailures).toBe(2);
      expect(analysis.totalFailuresInWindow).toBe(2);
      expect(analysis.evaluatedSessions).toBe(3);
    });

    it('should detect 3 consecutive failures for deload triggers (CA-07.2)', () => {
      const sessions: SessionPerformance[] = [
        { sets: [{ reps_completed: 8, rir: 1 }] },
        { sets: [{ reps_completed: 8, rir: 1 }] },
        { sets: [{ reps_completed: 7, rir: 0 }] }
      ];

      const analysis = service.analyzePerformanceWindow(sessions, 10, 2, 3);
      expect(analysis.consecutiveFailures).toBe(3);
      expect(analysis.totalFailuresInWindow).toBe(3);
    });
  });
});
