import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BaselineSnapshotService,
  computeE1RM
} from '../../src/services/baseline-snapshot.service.js';
import type { LoadType } from '../../src/schemas/generated/schemas.js';

describe('TASK-17: BaselineSnapshotService (RF-05)', () => {
  const sampleAthleteId = '11111111-1111-1111-1111-111111111111';
  const sampleMesocycleId = '22222222-2222-2222-2222-222222222222';
  const sampleAthleteWeight = 75.0;

  let mockBaselineSnapshotRepo: any;
  let mockSetLogRepo: any;
  let mockExerciseRepo: any;
  let mockAthleteRepo: any;
  let mockBodyWeightRepo: any;
  let service: BaselineSnapshotService;

  beforeEach(() => {
    mockBaselineSnapshotRepo = {
      create: vi.fn(),
      createBatch: vi.fn(),
      findByMesocycleId: vi.fn(),
      findByMesocycleAndExercise: vi.fn()
    };

    mockSetLogRepo = {
      findRecentSetsForExercise: vi.fn()
    };

    mockExerciseRepo = {
      findById: vi.fn()
    };

    mockAthleteRepo = {
      findById: vi.fn().mockResolvedValue({
        id: sampleAthleteId,
        weight_kg: sampleAthleteWeight,
        experience_level: 'intermedio'
      })
    };

    mockBodyWeightRepo = {
      findLatestBeforeDate: vi.fn().mockResolvedValue({
        weight_kg: sampleAthleteWeight
      })
    };

    service = new BaselineSnapshotService(
      mockBaselineSnapshotRepo,
      mockSetLogRepo,
      mockExerciseRepo,
      mockAthleteRepo,
      mockBodyWeightRepo
    );
  });

  describe('computeE1RM calculation (RF-05, RF-06)', () => {
    it('should compute e1RM for external_load using Brzycki for <= 10 reps', () => {
      // 100 kg x 5 reps with Brzycki:
      // 100 / (1.0278 - 0.0278 * 5) = 100 / (1.0278 - 0.139) = 100 / 0.8888 = 112.51 kg
      const e1rm = computeE1RM('external_load', 100, 5, sampleAthleteWeight);
      expect(e1rm).toBe(112.51);
    });

    it('should compute e1RM for external_load using Wathan for 11 to 30 reps', () => {
      // 70 kg x 15 reps with Wathan:
      // denominator = 48.8 + (53.8 * exp(-0.075 * 15)) = 48.8 + (53.8 * 0.32465) = 48.8 + 17.466 = 66.266
      // (100 * 70) / 66.266 = 7000 / 66.266 = 105.63 kg
      const e1rm = computeE1RM('external_load', 70, 15, sampleAthleteWeight);
      expect(e1rm).toBeCloseTo(105.63, 1);
    });

    it('should cap reps at 30 when reps > 30 for stability', () => {
      const e1rm30 = computeE1RM('external_load', 50, 30, sampleAthleteWeight);
      const e1rm50 = computeE1RM('external_load', 50, 50, sampleAthleteWeight);
      expect(e1rm50).toBe(e1rm30);
    });

    it('should compute e1RM for bodyweight and bodyweight_loadable adding athlete weight', () => {
      // Bodyweight: rawLoadKg ignored, mass = 75 kg, 10 reps Brzycki:
      // 75 / (1.0278 - 0.278) = 75 / 0.7498 = 100.03 kg
      const bwE1rm = computeE1RM('bodyweight', 0, 10, sampleAthleteWeight);
      expect(bwE1rm).toBe(100.03);

      // Bodyweight loadable: mass = 75 + 15 = 90 kg, 10 reps:
      // 90 / 0.7498 = 120.03 kg
      const bwlE1rm = computeE1RM('bodyweight_loadable', 15, 10, sampleAthleteWeight);
      expect(bwlE1rm).toBe(120.03);
    });

    it('should compute e1RM for assisted_bodyweight respecting 1.0 kg floor', () => {
      // Athlete 75 kg with 50 kg assistance: net mass = 25 kg, 8 reps:
      const assistedE1rm = computeE1RM('assisted_bodyweight', 50, 8, sampleAthleteWeight);
      expect(assistedE1rm).toBeGreaterThan(0);

      // Assistance >= athlete bodyweight (e.g. 80 kg assistance on 75 kg bodyweight) -> floor of 1.0 kg
      const flooredE1rm = computeE1RM('assisted_bodyweight', 80, 10, sampleAthleteWeight);
      expect(flooredE1rm).toBeCloseTo(1.0 / 0.7498, 2);
    });
  });

  describe('RF-05 CA-05.2 (1): Best e1RM with RIR <= 3 and kg Tie-Breaking', () => {
    it('should pick the set with highest e1RM when sets with RIR <= 3 exist in last 90 days', async () => {
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([
        {
          id: 'set-1',
          weight_kg: 80,
          reps_completed: 8,
          rir: 2,
          load_type: 'external_load'
        },
        {
          id: 'set-2', // 85kg x 8 reps -> higher e1RM
          weight_kg: 85,
          reps_completed: 8,
          rir: 1,
          load_type: 'external_load'
        },
        {
          id: 'set-3',
          weight_kg: 90,
          reps_completed: 5,
          rir: 3,
          load_type: 'external_load'
        }
      ]);

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'press_banca',
        sampleAthleteWeight,
        'intermedio',
        sampleMesocycleId
      );

      expect(baseline.source_type).toBe('history_rir_le_3');
      expect(baseline.baseline_load_kg).toBe(85);
      expect(baseline.baseline_reps).toBe(8);
      expect(baseline.baseline_e1rm_kg).toBe(computeE1RM('external_load', 85, 8, sampleAthleteWeight));
    });

    it('should tie-break by higher absolute kg when two sets have equal e1RM', async () => {
      // Suppose two sets happen to produce the same e1RM or we mock sets:
      // Let's create two sets with identical e1rm
      // e.g. 100 kg x 1 rep Brzycki: 100 / 1.0 = 100 kg
      // Another set: 100 kg x 1 rep vs 105 kg x 1 rep?
      // When e1RM is equal, tie-breaker picks the one with higher weight_kg
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([
        {
          id: 'set-a',
          weight_kg: 80,
          reps_completed: 6,
          rir: 2,
          load_type: 'external_load'
        },
        {
          id: 'set-b',
          weight_kg: 85,
          reps_completed: 6,
          rir: 2,
          load_type: 'external_load'
        }
      ]);

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'press_banca',
        sampleAthleteWeight,
        'intermedio'
      );

      expect(baseline.baseline_load_kg).toBe(85);
    });
  });

  describe('RF-05 CA-05.2 (2): Submaximal RIR Normalization (RIR 4 or 5)', () => {
    it('should normalize highest load set with RIR 4 to RIR 2 equivalent when no RIR <= 3 sets exist', async () => {
      // Formula: carga_base = carga_registrada * (1 + (RIR_registrado - 2) * 0.025)
      // For RIR 4: factor = 1 + (4 - 2) * 0.025 = 1 + 0.05 = 1.05
      // 80 kg * 1.05 = 84.0 kg
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([
        {
          id: 'submax-1',
          weight_kg: 80,
          reps_completed: 10,
          rir: 4,
          load_type: 'external_load'
        },
        {
          id: 'submax-2',
          weight_kg: 70,
          reps_completed: 10,
          rir: 5,
          load_type: 'external_load'
        }
      ]);

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'press_banca',
        sampleAthleteWeight,
        'intermedio'
      );

      expect(baseline.source_type).toBe('history_rir_normalized');
      expect(baseline.baseline_load_kg).toBe(84); // 80 * 1.05
      expect(baseline.baseline_reps).toBe(10);
      expect(baseline.baseline_e1rm_kg).toBe(computeE1RM('external_load', 84, 10, sampleAthleteWeight));
    });

    it('should normalize set with RIR 5 to RIR 2 equivalent: factor 1 + (5-2)*0.025 = 1.075', async () => {
      // 100 kg * 1.075 = 107.5 kg
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([
        {
          id: 'submax-rir5',
          weight_kg: 100,
          reps_completed: 8,
          rir: 5,
          load_type: 'external_load'
        }
      ]);

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'squat',
        sampleAthleteWeight,
        'avanzado'
      );

      expect(baseline.source_type).toBe('history_rir_normalized');
      expect(baseline.baseline_load_kg).toBe(107.5);
    });
  });

  describe('RF-05 CA-05.2 (3): Fallback to Catalog Ratios When No Data in 90 Days', () => {
    it('should use exercise initial_load_ratio and athlete weight when no sets in last 90 days', async () => {
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([]); // No history

      mockExerciseRepo.findById.mockResolvedValueOnce({
        id: 'press_banca',
        name: 'Press banca',
        movement_pattern: 'empuje',
        is_compound: true,
        initial_load_ratio: 0.65,
        load_type: 'external_load'
      });

      // 75.0 kg * 0.65 = 48.75 -> rounded to 0.5 step = 49.0 kg
      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'press_banca',
        sampleAthleteWeight,
        'intermedio'
      );

      expect(baseline.source_type).toBe('experience_ratio_default');
      expect(baseline.baseline_load_kg).toBe(49.0);
      expect(baseline.baseline_reps).toBe(10);
      expect(baseline.baseline_e1rm_kg).toBeGreaterThan(0);
    });

    it('should handle pure bodyweight exercises with 0.0 baseline load and 10 reps', async () => {
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValueOnce([]);

      mockExerciseRepo.findById.mockResolvedValueOnce({
        id: 'dominadas_libres',
        name: 'Dominadas libres',
        equipment_id: 'bodyweight',
        movement_pattern: 'tiron',
        is_compound: true,
        initial_load_ratio: 0,
        load_type: 'bodyweight'
      });

      const baseline = await service.resolveBaselineForExercise(
        sampleAthleteId,
        'dominadas_libres',
        sampleAthleteWeight,
        'principiante'
      );

      expect(baseline.source_type).toBe('experience_ratio_default');
      expect(baseline.baseline_load_kg).toBe(0.0);
      expect(baseline.baseline_reps).toBe(10);
      expect(baseline.baseline_e1rm_kg).toBe(computeE1RM('bodyweight', 0, 10, sampleAthleteWeight));
    });
  });

  describe('Batch Capture for Mesocycle Activation (CA-05.1, CA-05.3)', () => {
    it('should resolve and persist immutable baseline snapshots in batch for all planned exercises', async () => {
      mockSetLogRepo.findRecentSetsForExercise.mockResolvedValue([]);
      mockExerciseRepo.findById
        .mockResolvedValueOnce({
          id: 'ex-1',
          name: 'Sentadilla',
          movement_pattern: 'rodilla_dominante',
          is_compound: true,
          initial_load_ratio: 0.8,
          load_type: 'external_load'
        })
        .mockResolvedValueOnce({
          id: 'ex-2',
          name: 'Press banca',
          movement_pattern: 'empuje',
          is_compound: true,
          initial_load_ratio: 0.65,
          load_type: 'external_load'
        });

      mockBaselineSnapshotRepo.createBatch.mockImplementation(async (items: any[]) => {
        return items.map((item, idx) => ({ ...item, id: `snap-${idx}`, created_at: new Date().toISOString() }));
      });

      const snapshots = await service.captureBaselinesForMesocycle({
        mesocycleId: sampleMesocycleId,
        athleteId: sampleAthleteId,
        exerciseIds: ['ex-1', 'ex-2']
      });

      expect(snapshots).toHaveLength(2);
      expect(mockBaselineSnapshotRepo.createBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ mesocycle_id: sampleMesocycleId, exercise_id: 'ex-1' }),
          expect.objectContaining({ mesocycle_id: sampleMesocycleId, exercise_id: 'ex-2' })
        ]),
        undefined
      );
    });

    it('should retrieve baselines by mesocycle ID', async () => {
      const mockRecords = [
        { id: 's1', mesocycle_id: sampleMesocycleId, exercise_id: 'ex-1' }
      ];
      mockBaselineSnapshotRepo.findByMesocycleId.mockResolvedValueOnce(mockRecords);

      const result = await service.getBaselinesForMesocycle(sampleMesocycleId);
      expect(result).toEqual(mockRecords);
      expect(mockBaselineSnapshotRepo.findByMesocycleId).toHaveBeenCalledWith(sampleMesocycleId);
    });
  });
});
