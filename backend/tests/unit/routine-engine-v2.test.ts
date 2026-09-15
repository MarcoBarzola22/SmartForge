import { describe, it, expect } from 'vitest';
import {
  RoutineEngineV2Service,
  isUnilateralExercise,
  type ExercisePlannedInput
} from '../../src/services/routine-engine-v2.service.js';

describe('TASK-15: RoutineEngineV2Service - Temporal Feasibility Algorithm (RF-03, RF-04)', () => {
  const service = new RoutineEngineV2Service();

  describe('Unilateral Exercise Detection', () => {
    it('should detect unilateral exercises by property or naming conventions', () => {
      expect(isUnilateralExercise({ id: 'remo_con_mancuerna_unilateral', name: 'Remo a una mano' })).toBe(true);
      expect(isUnilateralExercise({ id: 'sentadilla_pistola', name: 'Pistol squat unilateral' })).toBe(true);
      expect(isUnilateralExercise({ id: 'peso_muerto_rumano', name: 'Peso muerto a una pierna' })).toBe(true);
      expect(isUnilateralExercise({ is_unilateral: true })).toBe(true);
      expect(isUnilateralExercise({ isUnilateral: true })).toBe(true);

      expect(isUnilateralExercise({ id: 'press_banca_barra', name: 'Press de banca con barra' })).toBe(false);
      expect(isUnilateralExercise({ is_unilateral: false })).toBe(false);
    });
  });

  describe('Time Block Matrix (RF-03 CA-03.2, CA-03.4)', () => {
    it('should provide the standard 6 predefined time blocks with valid ranges and recommended N', () => {
      const blocks = service.getTimeBlockConfig();
      expect(blocks).toHaveLength(6);

      const durations = blocks.map((b) => b.duration_minutes);
      expect(durations).toEqual([30, 45, 60, 75, 90, 120]);

      for (const block of blocks) {
        expect(block.min_exercises).toBeGreaterThanOrEqual(2);
        expect(block.max_exercises).toBeLessThanOrEqual(7);
        expect(block.recommended_exercises).toBeGreaterThanOrEqual(block.min_exercises);
        expect(block.recommended_exercises).toBeLessThanOrEqual(block.max_exercises);
      }

      // Check specific recommended defaults
      expect(service.getTimeBlockByDuration(30)?.recommended_exercises).toBe(2);
      expect(service.getTimeBlockByDuration(60)?.recommended_exercises).toBe(4);
      expect(service.getTimeBlockByDuration(90)?.recommended_exercises).toBe(6);
    });
  });

  describe('Session Duration & Feasibility Calculation (RF-04 CA-04.1)', () => {
    const bilateralCompound: ExercisePlannedInput = {
      id: 'press_banca',
      name: 'Press banca',
      is_compound: true,
      is_unilateral: false,
      baseSets: 3,
      peakSets: 4
    };

    const bilateralIsolation: ExercisePlannedInput = {
      id: 'aperturas_mancuernas',
      name: 'Aperturas',
      is_compound: false,
      is_unilateral: false,
      baseSets: 3,
      peakSets: 3
    };

    const unilateralCompound: ExercisePlannedInput = {
      id: 'remo_unilateral',
      name: 'Remo a una mano',
      is_compound: true,
      is_unilateral: true, // factor 1.8x (80s vs 45s)
      baseSets: 3,
      peakSets: 4
    };

    it('should calculate duration correctly considering warmup, sets, 1.8x unilateral factor, and physiological rest', () => {
      // 1 bilateral compound:
      // warmup: 8 min = 480 s
      // sets: 3
      // exec: 45s * 3 = 135s
      // rest (compound >= 120s, standard 150s): 150s * 2 = 300s
      // transition: 90s
      // total exercise = 135 + 300 + 90 = 525s -> ceil(525 / 60) = 9 min
      // total = 9 + 8 = 17 min
      const duration = service.estimateSessionDurationMinutes([bilateralCompound], false);
      expect(duration).toBe(17);

      // In peak week (4 sets):
      // exec: 45s * 4 = 180s
      // rest: 150s * 3 = 450s
      // transition: 90s
      // total exercise = 180 + 450 + 90 = 720s = 12 min
      // total = 12 + 8 = 20 min
      const peakDuration = service.estimateSessionDurationMinutes([bilateralCompound], true);
      expect(peakDuration).toBe(20);
    });

    it('should apply 1.8x time multiplier (80s) for unilateral exercises', () => {
      // Unilateral compound in peak week (4 sets):
      // exec: 80s * 4 = 320s
      // rest: 150s * 3 = 450s
      // transition: 90s
      // total exercise = 320 + 450 + 90 = 860s -> ceil(860/60) = 15 min
      // total = 15 + 8 = 23 min
      const duration = service.estimateSessionDurationMinutes([unilateralCompound], true);
      expect(duration).toBe(23);
    });

    it('should use >=60s rest (75s standard) for isolation exercises', () => {
      // 1 isolation in base week (3 sets):
      // exec: 45s * 3 = 135s
      // rest: 75s * 2 = 150s
      // transition: 90s
      // total exercise = 135 + 150 + 90 = 375s -> ceil(375/60) = 7 min
      // total = 7 + 8 = 15 min
      const duration = service.estimateSessionDurationMinutes([bilateralIsolation], false);
      expect(duration).toBe(15);
    });
  });

  describe('Validation & Pedagogical Blocking (RF-04 CA-04.2, CA-04.3)', () => {
    it('should accept a feasible session within time budget', () => {
      const exercises: ExercisePlannedInput[] = [
        { id: 'ex1', name: 'Sentadilla', is_compound: true, is_unilateral: false, peakSets: 3 },
        { id: 'ex2', name: 'Extension cuadriceps', is_compound: false, is_unilateral: false, peakSets: 3 }
      ];

      const result = service.validateSessionFeasibility(45, exercises, true);
      expect(result.isFeasible).toBe(true);
      expect(result.deficitMinutes).toBe(0);
      expect(result.estimatedMinutes).toBeLessThanOrEqual(45);
    });

    it('should block an infeasible session with pedagogical reason and max recommended exercises (CA-04.2, CA-04.3)', () => {
      // 4 heavy compound exercises in a 30 min session (impossible!)
      const exercises: ExercisePlannedInput[] = [
        { id: 'ex1', name: 'Press banca', is_compound: true, peakSets: 4 },
        { id: 'ex2', name: 'Sentadilla', is_compound: true, peakSets: 4 },
        { id: 'ex3', name: 'Peso muerto', is_compound: true, peakSets: 4 },
        { id: 'ex4', name: 'Press militar', is_compound: true, peakSets: 4 }
      ];

      const result = service.validateSessionFeasibility(30, exercises, true);

      expect(result.isFeasible).toBe(false);
      expect(result.deficitMinutes).toBeGreaterThan(0);
      expect(result.reason).toContain('superando tus 30 min asignados');
      expect(result.suggestion).toContain('Para 30 minutos recomendamos un máximo de 2 a 3 ejercicios');
      expect(result.maxFeasibleExercises).toBeLessThanOrEqual(3);
    });

    it('validateSelectionFeasibility should block manual exercise counts exceeding block maximum', () => {
      // 30 min block has max 3 exercises -> 5 is blocked
      const blocked = service.validateSelectionFeasibility(30, 5);
      expect(blocked.isFeasible).toBe(false);
      expect(blocked.reason).toContain('excede el presupuesto');
      expect(blocked.suggestion).toContain('recomendamos un máximo de 2 a 3 ejercicios');

      // 30 min block with 2 exercises is valid
      const valid = service.validateSelectionFeasibility(30, 2);
      expect(valid.isFeasible).toBe(true);
    });
  });

  describe('Exercise Replacement Validation (RF-04 CA-04.5)', () => {
    it('should allow replacement if session remains feasible without reducing sets', () => {
      const currentExercises: ExercisePlannedInput[] = [
        { id: 'ex1', name: 'Press banca', is_compound: true, is_unilateral: false, peakSets: 3 }
      ];

      const candidate: ExercisePlannedInput = {
        id: 'ex_cand',
        name: 'Press banca mancuernas',
        is_compound: true,
        is_unilateral: false,
        peakSets: 3
      };

      const result = service.validateExerciseSwapFeasibility({
        durationMinutes: 45,
        currentExercises,
        replacingExerciseId: 'ex1',
        candidateExercise: candidate,
        isPeakWeek: true
      });

      expect(result.canSwap).toBe(true);
      expect(result.setsReduced).toBe(false);
    });

    it('should allow replacement with set reduction down to floor of 2 sets when near budget', () => {
      // In 45 min, 2 compound exercises with 4 sets might be around ~32 min
      // If replaced with a high demand unilateral exercise (4 sets), it might exceed 45 min
      const currentExercises: ExercisePlannedInput[] = [
        { id: 'ex1', name: 'Press banca', is_compound: true, is_unilateral: false, peakSets: 4 },
        { id: 'ex2', name: 'Remo barra', is_compound: true, is_unilateral: false, peakSets: 4 }
      ];

      const heavyCandidate: ExercisePlannedInput = {
        id: 'ex_heavy_uni',
        name: 'Remo unilateral polea',
        is_compound: true,
        is_unilateral: true,
        peakSets: 4
      };

      const result = service.validateExerciseSwapFeasibility({
        durationMinutes: 45,
        currentExercises,
        replacingExerciseId: 'ex2',
        candidateExercise: heavyCandidate,
        isPeakWeek: true
      });

      expect(result.canSwap).toBe(true);
      // Adjusted sets should be at least 2 (floor of 2 sets)
      if (result.adjustedCandidateSets !== undefined) {
        expect(result.adjustedCandidateSets).toBeGreaterThanOrEqual(2);
      }
    });

    it('should block replacement and suggest bilateral alternative or time expansion if even 2 sets exceed budget', () => {
      // Tight 30 min budget with 3 exercises already at limit
      const currentExercises: ExercisePlannedInput[] = [
        { id: 'ex1', name: 'Press banca', is_compound: true, is_unilateral: false, peakSets: 4 },
        { id: 'ex2', name: 'Sentadilla', is_compound: true, is_unilateral: false, peakSets: 4 },
        { id: 'ex3', name: 'Peso muerto', is_compound: true, is_unilateral: false, peakSets: 4 }
      ];

      const extremeCandidate: ExercisePlannedInput = {
        id: 'ex_extreme',
        name: 'Pistol squat unilateral compleja',
        is_compound: true,
        is_unilateral: true,
        peakSets: 4
      };

      const result = service.validateExerciseSwapFeasibility({
        durationMinutes: 30,
        currentExercises,
        replacingExerciseId: 'ex3',
        candidateExercise: extremeCandidate,
        isPeakWeek: true
      });

      expect(result.canSwap).toBe(false);
      expect(result.message).toContain('La variante seleccionada excede el tiempo disponible');
      expect(result.message).toContain('Te sugerimos mantener una alternativa bilateral');
    });
  });
});
