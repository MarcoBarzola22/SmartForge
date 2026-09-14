import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BaselineSnapshotRepository,
  type PoolLike,
  type PoolClientLike,
  type CreateBaselineSnapshotData,
} from '../../src/repositories/baseline-snapshot.repository.js';
import { ConflictError } from '../../src/errors/app-error.js';

describe('TASK-12: BaselineSnapshotRepository Unit Tests', () => {
  let repo: BaselineSnapshotRepository;
  let mockPool: PoolLike;
  let mockClient: PoolClientLike;

  const sampleMesoId = 'meso-11111111-1111-1111-1111-111111111111';
  const sampleSnapshotId = 'snap-11111111-1111-1111-1111-111111111111';

  const sampleSnapshotRow = {
    id: sampleSnapshotId,
    mesocycle_id: sampleMesoId,
    exercise_id: 'barbell_bench_press',
    baseline_load_kg: '60.00',
    baseline_reps: 10,
    baseline_e1rm_kg: '80.00',
    athlete_bodyweight_kg: '74.50',
    source_type: 'history_rir_le_3',
    created_at: new Date('2026-09-14T10:00:00Z'),
  };

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    mockPool = {
      connect: vi.fn(async () => mockClient),
      query: vi.fn(),
    };

    repo = new BaselineSnapshotRepository(mockPool);
  });

  describe('create', () => {
    const singleData: CreateBaselineSnapshotData = {
      mesocycle_id: sampleMesoId,
      exercise_id: 'barbell_bench_press',
      baseline_load_kg: 60.0,
      baseline_reps: 10,
      baseline_e1rm_kg: 80.0,
      athlete_bodyweight_kg: 74.5,
      source_type: 'history_rir_le_3',
    };

    it('should insert and return a single baseline snapshot', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSnapshotRow],
        rowCount: 1,
      });

      const result = await repo.create(singleData);

      expect(result).toEqual({
        id: sampleSnapshotId,
        mesocycle_id: sampleMesoId,
        exercise_id: 'barbell_bench_press',
        baseline_load_kg: 60.0,
        baseline_reps: 10,
        baseline_e1rm_kg: 80.0,
        athlete_bodyweight_kg: 74.5,
        source_type: 'history_rir_le_3',
        created_at: '2026-09-14T10:00:00.000Z',
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO mesocycle_baseline_snapshot'),
        [
          singleData.mesocycle_id,
          singleData.exercise_id,
          singleData.baseline_load_kg,
          singleData.baseline_reps,
          singleData.baseline_e1rm_kg,
          singleData.athlete_bodyweight_kg,
          singleData.source_type,
        ]
      );
    });

    it('should throw ConflictError (409) if unique constraint (mesocycle_id, exercise_id) is violated', async () => {
      const error: any = new Error('duplicate key value');
      error.code = '23505';

      vi.mocked(mockPool.query).mockRejectedValueOnce(error);

      await expect(repo.create(singleData)).rejects.toThrow(ConflictError);
    });
  });

  describe('createBatch', () => {
    const batchData: CreateBaselineSnapshotData[] = [
      {
        mesocycle_id: sampleMesoId,
        exercise_id: 'barbell_bench_press',
        baseline_load_kg: 60.0,
        baseline_reps: 10,
        baseline_e1rm_kg: 80.0,
        athlete_bodyweight_kg: 74.5,
        source_type: 'history_rir_le_3',
      },
      {
        mesocycle_id: sampleMesoId,
        exercise_id: 'pull_up',
        baseline_load_kg: 0.0,
        baseline_reps: 8,
        baseline_e1rm_kg: 92.5,
        athlete_bodyweight_kg: 74.5,
        source_type: 'experience_ratio_default',
      },
    ];

    it('should insert a batch of baseline snapshots in a single query/transaction', async () => {
      const secondRow = {
        ...sampleSnapshotRow,
        id: 'snap-222',
        exercise_id: 'pull_up',
        baseline_load_kg: '0.00',
        baseline_reps: 8,
        baseline_e1rm_kg: '92.50',
        source_type: 'experience_ratio_default',
      };

      vi.mocked(mockClient.query).mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('BEGIN')) return { rows: [] };
        if (normalized.startsWith('INSERT INTO mesocycle_baseline_snapshot')) {
          return { rows: [sampleSnapshotRow, secondRow], rowCount: 2 };
        }
        if (normalized.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const results = await repo.createBatch(batchData);

      expect(results).toHaveLength(2);
      expect(results[0].exercise_id).toBe('barbell_bench_press');
      expect(results[1].exercise_id).toBe('pull_up');
      expect(results[1].source_type).toBe('experience_ratio_default');
      expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('COMMIT'));
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return empty array if batchData is empty', async () => {
      const results = await repo.createBatch([]);
      expect(results).toEqual([]);
      expect(mockPool.connect).not.toHaveBeenCalled();
    });

    it('should use provided client when transactional client is passed', async () => {
      const customClient: PoolClientLike = {
        query: vi.fn().mockResolvedValueOnce({ rows: [sampleSnapshotRow], rowCount: 1 }),
        release: vi.fn(),
      };

      const results = await repo.createBatch([batchData[0]], customClient);

      expect(results).toHaveLength(1);
      expect(customClient.query).toHaveBeenCalled();
      // Should not manage transaction or release customClient externally
      expect(customClient.release).not.toHaveBeenCalled();
      expect(mockPool.connect).not.toHaveBeenCalled();
    });
  });

  describe('findByMesocycleId', () => {
    it('should return all snapshots for given mesocycle ordered by created_at', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSnapshotRow],
        rowCount: 1,
      });

      const snapshots = await repo.findByMesocycleId(sampleMesoId);

      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].exercise_id).toBe('barbell_bench_press');
      expect(snapshots[0].baseline_load_kg).toBe(60.0);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mesocycle_id = $1'),
        [sampleMesoId]
      );
    });

    it('should return empty array if no snapshots found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const snapshots = await repo.findByMesocycleId('empty-meso');
      expect(snapshots).toEqual([]);
    });
  });

  describe('findByMesocycleAndExercise', () => {
    it('should return snapshot for specific mesocycle and exercise', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSnapshotRow],
        rowCount: 1,
      });

      const snapshot = await repo.findByMesocycleAndExercise(sampleMesoId, 'barbell_bench_press');

      expect(snapshot).not.toBeNull();
      expect(snapshot?.exercise_id).toBe('barbell_bench_press');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mesocycle_id = $1 AND exercise_id = $2'),
        [sampleMesoId, 'barbell_bench_press']
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const snapshot = await repo.findByMesocycleAndExercise(sampleMesoId, 'non_existent');
      expect(snapshot).toBeNull();
    });
  });
});
