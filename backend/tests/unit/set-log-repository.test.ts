import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SetLogRepository,
  type PoolLike
} from '../../src/repositories/set-log.repository.js';

describe('TASK-37: SetLogRepository', () => {
  let repo: SetLogRepository;
  let mockPool: PoolLike;

  const sampleSessionId = 's1111111-1111-1111-1111-111111111111';
  const sampleSetLogId = 'l1111111-1111-1111-1111-111111111111';
  const sampleExerciseId = 'barbell_bench_press';

  const sampleRow = {
    id: sampleSetLogId,
    session_id: sampleSessionId,
    exercise_id: sampleExerciseId,
    exercise_assignment_id: 'ea-111',
    set_number: 1,
    reps_completed: 8,
    weight_kg: 80.5,
    rir: 2,
    client_timestamp: new Date('2026-09-11T10:00:00Z'),
    created_at: new Date('2026-09-11T10:00:00Z'),
    updated_at: new Date('2026-09-11T10:00:00Z')
  };

  beforeEach(() => {
    mockPool = {
      connect: vi.fn(),
      query: vi.fn()
    };
    repo = new SetLogRepository(mockPool);
  });

  describe('create', () => {
    it('should insert and return a new set log record (RF-05)', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const result = await repo.create({
        session_id: sampleSessionId,
        exercise_id: sampleExerciseId,
        exercise_assignment_id: 'ea-111',
        set_number: 1,
        reps_completed: 8,
        weight_kg: 80.5,
        rir: 2
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(sampleSetLogId);
      expect(result.set_number).toBe(1);
      expect(result.reps_completed).toBe(8);
      expect(result.weight_kg).toBe(80.5);
      expect(result.rir).toBe(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO set_log'),
        expect.arrayContaining([sampleSessionId, sampleExerciseId, 1, 8, 80.5, 2])
      );
    });
  });

  describe('findById', () => {
    it('should return set log record when found by ID', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const result = await repo.findById(sampleSetLogId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleSetLogId);
      expect(result?.exercise_id).toBe(sampleExerciseId);
    });

    it('should return null when set log is not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySessionId', () => {
    it('should return all set logs for a session ordered by set_number', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [
          sampleRow,
          { ...sampleRow, id: 'l2222222', set_number: 2, reps_completed: 7 }
        ]
      });

      const results = await repo.findBySessionId(sampleSessionId);
      expect(results).toHaveLength(2);
      expect(results[0].set_number).toBe(1);
      expect(results[1].set_number).toBe(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        [sampleSessionId]
      );
    });
  });

  describe('findBySessionAndExercise', () => {
    it('should return all set logs for an exercise in a session', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const results = await repo.findBySessionAndExercise(sampleSessionId, sampleExerciseId);
      expect(results).toHaveLength(1);
      expect(results[0].exercise_id).toBe(sampleExerciseId);
    });
  });

  describe('findByAthleteAndExercise', () => {
    it('should return historical set logs across sessions for progression calculations', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const results = await repo.findByAthleteAndExercise('a1111111', sampleExerciseId, 10);
      expect(results).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN session s ON sl.session_id = s.id'),
        ['a1111111', sampleExerciseId, 10]
      );
    });
  });

  describe('update', () => {
    it('should update reps, weight and rir of a set log', async () => {
      const updatedRow = {
        ...sampleRow,
        reps_completed: 10,
        weight_kg: 85.0,
        rir: 1
      };

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [updatedRow]
      });

      const result = await repo.update(sampleSetLogId, {
        reps_completed: 10,
        weight_kg: 85.0,
        rir: 1
      });

      expect(result).not.toBeNull();
      expect(result?.reps_completed).toBe(10);
      expect(result?.weight_kg).toBe(85.0);
      expect(result?.rir).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE set_log'),
        expect.arrayContaining([sampleSetLogId, 10, 85.0, 1])
      );
    });

    it('should return null when updating non-existent set log', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] });
      const result = await repo.update('non-existent-id', { reps_completed: 10 });
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a set log and return true if removed', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const success = await repo.delete(sampleSetLogId);
      expect(success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM set_log'),
        [sampleSetLogId]
      );
    });

    it('should return false if set log did not exist', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const success = await repo.delete('non-existent-id');
      expect(success).toBe(false);
    });
  });
});
