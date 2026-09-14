import { describe, it, expect } from 'vitest';
import {
  RoutineEngineV2Service,
  routineEngineV2Service,
  MAX_SAFE_SETS,
  DME_MIN_SETS,
  DME_MAX_SETS,
  DME_NOTE,
  PRUNING_NOTE,
  PRIMARY_COMPOUND_MIN_SETS,
  ISOLATION_MIN_SETS,
  SECONDARY_COMPOUND_MIN_SETS,
  type PlannedSession,
  type PlannedExerciseWithSets
} from '../../src/services/routine-engine-v2.service.js';

describe('TASK-16: RoutineEngineV2Service - DME and Hierarchical Pruning (RF-04)', () => {
  const service = new RoutineEngineV2Service();

  describe('Hierarchical Pruning Algorithm (RF-04 CA-04.6)', () => {
    it('should NOT prune when weekly volume for a muscle group is within safe limit (<= 24 sets)', () => {
      const plan: PlannedSession[] = [
        {
          name: 'Sesión A',
          exercises: [
            {
              id: 'bench_press',
              name: 'Press de banca plano con barra',
              muscle: 'pecho',
              is_compound: true,
              is_primary_compound: true,
              targetSets: 4
            },
            {
              id: 'incline_db_press',
              name: 'Press inclinado con mancuernas',
              muscle: 'pecho',
              is_compound: true,
              is_secondary_compound: true,
              targetSets: 4
            },
            {
              id: 'cable_crossover',
              name: 'Cruces en polea',
              muscle: 'pecho',
              is_compound: false,
              targetSets: 4
            }
          ]
        },
        {
          name: 'Sesión B',
          exercises: [
            {
              id: 'dips',
              name: 'Fondos en paralelas',
              muscle: 'pecho',
              is_compound: true,
              is_secondary_compound: true,
              targetSets: 4
            }
          ]
        }
      ];

      // Total chest sets = 4 + 4 + 4 + 4 = 16 sets <= 24 sets
      const result = service.applyHierarchicalPruning(plan, 'pecho');

      expect(result.wasPruned).toBe(false);
      expect(result.originalSets).toBe(16);
      expect(result.finalSets).toBe(16);
      expect(result.note).toBeUndefined();
    });

    it('should prune isolation exercises FIRST down to floor of 2 sets when volume > 24 sets', () => {
      // 7 sessions with chest exercises totaling 28 sets (excess of 4 sets)
      const plan: PlannedSession[] = [
        {
          name: 'S1',
          exercises: [
            {
              id: 'bench',
              name: 'Press de banca',
              muscle: 'pecho',
              is_compound: true,
              is_primary_compound: true,
              targetSets: 4
            }
          ]
        },
        {
          name: 'S2',
          exercises: [
            {
              id: 'incline_db',
              name: 'Press inclinado',
              muscle: 'pecho',
              is_compound: true,
              is_secondary_compound: true,
              targetSets: 4
            }
          ]
        },
        {
          name: 'S3',
          exercises: [
            {
              id: 'bench_2',
              name: 'Press de banca',
              muscle: 'pecho',
              is_compound: true,
              is_primary_compound: true,
              targetSets: 4
            }
          ]
        },
        {
          name: 'S4',
          exercises: [
            {
              id: 'dips',
              name: 'Fondos',
              muscle: 'pecho',
              is_compound: true,
              is_secondary_compound: true,
              targetSets: 4
            }
          ]
        },
        {
          name: 'S5',
          exercises: [
            {
              id: 'flyes_1',
              name: 'Aperturas mancuernas',
              muscle: 'pecho',
              is_compound: false, // isolation
              targetSets: 4
            }
          ]
        },
        {
          name: 'S6',
          exercises: [
            {
              id: 'crossover',
              name: 'Cruces polea',
              muscle: 'pecho',
              is_compound: false, // isolation
              targetSets: 4
            }
          ]
        },
        {
          name: 'S7',
          exercises: [
            {
              id: 'pec_deck',
              name: 'Pec deck',
              muscle: 'pecho',
              is_compound: false, // isolation
              targetSets: 4
            }
          ]
        }
      ];

      // Total = 4 * 7 = 28 sets
      const result = service.applyHierarchicalPruning(plan, 'pecho');

      expect(result.wasPruned).toBe(true);
      expect(result.originalSets).toBe(28);
      expect(result.finalSets).toBe(24);
      expect(result.note).toBe(PRUNING_NOTE);

      // Verify that primary compounds remained intact at 4 sets
      const s1Bench = result.weeklyPlan[0].exercises[0];
      const s3Bench = result.weeklyPlan[2].exercises[0];
      expect(s1Bench.targetSets).toBe(4);
      expect(s3Bench.targetSets).toBe(4);

      // Verify that secondary compounds remained intact because isolation pruning was sufficient
      const s2Incline = result.weeklyPlan[1].exercises[0];
      const s4Dips = result.weeklyPlan[3].exercises[0];
      expect(s2Incline.targetSets).toBe(4);
      expect(s4Dips.targetSets).toBe(4);

      // Verify that isolation exercises took the 4 pruned sets
      const s5Flyes = result.weeklyPlan[4].exercises[0];
      const s6Cross = result.weeklyPlan[5].exercises[0];
      const s7Deck = result.weeklyPlan[6].exercises[0];
      const isolationTotal = s5Flyes.targetSets + s6Cross.targetSets + s7Deck.targetSets;
      expect(isolationTotal).toBe(8); // 12 - 4 = 8 sets
      // Each isolation exercise should not drop below floor of 2 sets
      expect(s5Flyes.targetSets).toBeGreaterThanOrEqual(ISOLATION_MIN_SETS);
      expect(s6Cross.targetSets).toBeGreaterThanOrEqual(ISOLATION_MIN_SETS);
      expect(s7Deck.targetSets).toBeGreaterThanOrEqual(ISOLATION_MIN_SETS);
    });

    it('should prune secondary compounds SECOND when excess remains after isolation exercises hit floor of 2', () => {
      // 8 exercises totaling 32 sets for back:
      // 2 primary compounds (4 sets each = 8)
      // 3 secondary compounds (4 sets each = 12)
      // 3 isolation exercises (4 sets each = 12)
      // Total = 32 sets. Excess = 8 sets.
      // Isolations can give at most 3 * 2 = 6 sets (hitting floor of 2).
      // Remaining excess = 2 sets -> must come from secondary compounds!
      const plan: PlannedSession[] = [
        {
          name: 'S1',
          exercises: [
            { id: 'deadlift', name: 'Peso muerto', muscle: 'espalda', is_compound: true, is_primary_compound: true, targetSets: 4 },
            { id: 'barbell_row', name: 'Remo con barra', muscle: 'espalda', is_compound: true, is_secondary_compound: true, targetSets: 4 }
          ]
        },
        {
          name: 'S2',
          exercises: [
            { id: 'pull_up', name: 'Dominadas', muscle: 'espalda', is_compound: true, is_primary_compound: true, targetSets: 4 },
            { id: 'db_row', name: 'Remo mancuerna', muscle: 'espalda', is_compound: true, is_secondary_compound: true, targetSets: 4 }
          ]
        },
        {
          name: 'S3',
          exercises: [
            { id: 'cable_row', name: 'Remo polea', muscle: 'espalda', is_compound: true, is_secondary_compound: true, targetSets: 4 },
            { id: 'pullover', name: 'Pullover polea', muscle: 'espalda', is_compound: false, targetSets: 4 }
          ]
        },
        {
          name: 'S4',
          exercises: [
            { id: 'face_pull', name: 'Face pull', muscle: 'espalda', is_compound: false, targetSets: 4 },
            { id: 'shrugs', name: 'Encogimientos', muscle: 'espalda', is_compound: false, targetSets: 4 }
          ]
        }
      ];

      const result = service.applyHierarchicalPruning(plan, 'espalda');

      expect(result.wasPruned).toBe(true);
      expect(result.originalSets).toBe(32);
      expect(result.finalSets).toBe(24);

      // Primary compounds should NOT be pruned below 3 (they stayed at 4)
      const deadlift = result.weeklyPlan[0].exercises[0];
      const pullUp = result.weeklyPlan[1].exercises[0];
      expect(deadlift.targetSets).toBe(4);
      expect(pullUp.targetSets).toBe(4);

      // Isolations should be pruned to floor of 2
      const pullover = result.weeklyPlan[2].exercises[1];
      const facePull = result.weeklyPlan[3].exercises[0];
      const shrugs = result.weeklyPlan[3].exercises[1];
      expect(pullover.targetSets).toBe(2);
      expect(facePull.targetSets).toBe(2);
      expect(shrugs.targetSets).toBe(2);

      // Secondary compounds should have been pruned by 2 sets total (from 12 to 10)
      const bbRow = result.weeklyPlan[0].exercises[1];
      const dbRow = result.weeklyPlan[1].exercises[1];
      const cableRow = result.weeklyPlan[2].exercises[0];
      const secTotal = bbRow.targetSets + dbRow.targetSets + cableRow.targetSets;
      expect(secTotal).toBe(10);
      expect(bbRow.targetSets).toBeGreaterThanOrEqual(SECONDARY_COMPOUND_MIN_SETS);
      expect(dbRow.targetSets).toBeGreaterThanOrEqual(SECONDARY_COMPOUND_MIN_SETS);
      expect(cableRow.targetSets).toBeGreaterThanOrEqual(SECONDARY_COMPOUND_MIN_SETS);
    });

    it('should NEVER reduce primary compound exercises below 3 sets', () => {
      const plan: PlannedSession[] = [
        {
          name: 'S1',
          exercises: [
            { id: 'squat', name: 'Sentadilla', muscle: 'cuadriceps', is_compound: true, is_primary_compound: true, targetSets: 4 },
            { id: 'front_squat', name: 'Sentadilla frontal', muscle: 'cuadriceps', is_compound: true, is_primary_compound: true, targetSets: 4 }
          ]
        },
        {
          name: 'S2',
          exercises: [
            { id: 'leg_press', name: 'Prensa', muscle: 'cuadriceps', is_compound: true, is_secondary_compound: true, targetSets: 4 },
            { id: 'hack_squat', name: 'Hack squat', muscle: 'cuadriceps', is_compound: true, is_secondary_compound: true, targetSets: 4 }
          ]
        },
        {
          name: 'S3',
          exercises: [
            { id: 'leg_extension_1', name: 'Extension 1', muscle: 'cuadriceps', is_compound: false, targetSets: 4 },
            { id: 'leg_extension_2', name: 'Extension 2', muscle: 'cuadriceps', is_compound: false, targetSets: 4 },
            { id: 'sissy_squat', name: 'Sissy squat', muscle: 'cuadriceps', is_compound: false, targetSets: 4 }
          ]
        }
      ];

      // Total quad sets = 4 * 7 = 28 sets
      const result = service.applyHierarchicalPruning(plan, 'cuadriceps');

      expect(result.finalSets).toBe(24);
      const squat = result.weeklyPlan[0].exercises[0];
      const frontSquat = result.weeklyPlan[0].exercises[1];
      expect(squat.targetSets).toBeGreaterThanOrEqual(PRIMARY_COMPOUND_MIN_SETS);
      expect(frontSquat.targetSets).toBeGreaterThanOrEqual(PRIMARY_COMPOUND_MIN_SETS);
    });

    it('should prune all muscle groups exceeding 24 sets with applyHierarchicalPruningAllMuscles', () => {
      const plan: PlannedSession[] = [
        {
          name: 'S1',
          exercises: [
            { id: 'bench', name: 'Banca', muscle: 'pecho', is_compound: true, is_primary_compound: true, targetSets: 4 },
            { id: 'squat', name: 'Sentadilla', muscle: 'cuadriceps', is_compound: true, is_primary_compound: true, targetSets: 4 }
          ]
        },
        {
          name: 'S2',
          exercises: [
            { id: 'flyes_1', name: 'Aperturas 1', muscle: 'pecho', is_compound: false, targetSets: 4 },
            { id: 'flyes_2', name: 'Aperturas 2', muscle: 'pecho', is_compound: false, targetSets: 4 },
            { id: 'flyes_3', name: 'Aperturas 3', muscle: 'pecho', is_compound: false, targetSets: 4 },
            { id: 'flyes_4', name: 'Aperturas 4', muscle: 'pecho', is_compound: false, targetSets: 4 },
            { id: 'flyes_5', name: 'Aperturas 5', muscle: 'pecho', is_compound: false, targetSets: 4 },
            { id: 'flyes_6', name: 'Aperturas 6', muscle: 'pecho', is_compound: false, targetSets: 4 }
          ]
        }
      ];

      // Chest has 4 + 24 = 28 sets (> 24)
      // Quads has 4 sets (<= 24)
      const result = service.applyHierarchicalPruningAllMuscles(plan);

      expect(result.wasPruned).toBe(true);
      expect(result.prunedMuscles).toContain('pecho');
      expect(result.prunedMuscles).not.toContain('cuadriceps');
      expect(service.calculateWeeklySetsForMuscle(result.weeklyPlan, 'pecho')).toBe(24);
      expect(service.calculateWeeklySetsForMuscle(result.weeklyPlan, 'cuadriceps')).toBe(4);
    });
  });

  describe('Dosis Mínima Efectiva (DME) (RF-04 CA-04.4)', () => {
    it('should detect when reduced time regime requires DME activation', () => {
      // 30 min duration with 2 or 3 days
      expect(service.isReducedTimeRegime(30, 2)).toBe(true);
      expect(service.isReducedTimeRegime(30, 3)).toBe(true);
      expect(service.isReducedTimeRegime(45, 2)).toBe(true);

      // Standard training schedules should not force DME
      expect(service.isReducedTimeRegime(60, 4)).toBe(false);
      expect(service.isReducedTimeRegime(90, 4)).toBe(false);
      expect(service.isReducedTimeRegime(120, 5)).toBe(false);
    });

    it('should adjust weekly plan sets to DME range (6–8 series) and set target RIR 1–2 when DME applies', () => {
      const plan: PlannedSession[] = [
        {
          name: 'Sesión 1',
          exercises: [
            { id: 'bench', name: 'Press banca', muscle: 'pecho', is_compound: true, targetSets: 4, targetRir: 3 },
            { id: 'row', name: 'Remo', muscle: 'espalda', is_compound: true, targetSets: 4, targetRir: 3 }
          ]
        },
        {
          name: 'Sesión 2',
          exercises: [
            { id: 'squat', name: 'Sentadilla', muscle: 'cuadriceps', is_compound: true, targetSets: 4, targetRir: 3 }
          ]
        }
      ];

      // Currently chest has 4 sets (< 6 sets, below DME)
      const result = service.applyDME(plan, { durationMinutes: 30, availableDays: 2 });

      expect(result.isDmeActive).toBe(true);
      expect(result.note).toBe(DME_NOTE);
      expect(result.targetRirRange).toEqual([1, 2]);

      // Sets for chest should be boosted to DME minimum (6 sets)
      const chestSets = service.calculateWeeklySetsForMuscle(result.weeklyPlan, 'pecho');
      expect(chestSets).toBeGreaterThanOrEqual(DME_MIN_SETS);
      expect(chestSets).toBeLessThanOrEqual(DME_MAX_SETS);

      // Target RIR should be tightened to 1 or 2
      for (const session of result.weeklyPlan) {
        for (const ex of session.exercises) {
          expect(ex.targetRir).toBeGreaterThanOrEqual(1);
          expect(ex.targetRir).toBeLessThanOrEqual(2);
        }
      }
    });

    it('should cap high volume at DME max (8 sets) under tight time constraints (e.g. 30 min)', () => {
      const plan: PlannedSession[] = [
        {
          name: 'Sesión 1',
          exercises: [
            { id: 'bench', name: 'Press banca', muscle: 'pecho', is_compound: true, targetSets: 6, targetRir: 3 }
          ]
        },
        {
          name: 'Sesión 2',
          exercises: [
            { id: 'flyes', name: 'Aperturas', muscle: 'pecho', is_compound: false, targetSets: 6, targetRir: 3 }
          ]
        }
      ];

      // Currently chest has 12 sets, but athlete is restricted to 30 min 2 days
      const result = service.applyDME(plan, { durationMinutes: 30, availableDays: 2 });

      expect(result.isDmeActive).toBe(true);
      const chestSets = service.calculateWeeklySetsForMuscle(result.weeklyPlan, 'pecho');
      expect(chestSets).toBeLessThanOrEqual(DME_MAX_SETS);
      expect(chestSets).toBeGreaterThanOrEqual(DME_MIN_SETS);
    });
  });
});
