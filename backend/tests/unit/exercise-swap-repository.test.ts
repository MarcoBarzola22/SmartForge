import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ExerciseSwapRepository,
  type CreateExerciseSwapData,
  type PoolLike
} from '../../src/repositories/exercise-swap.repository.js';
import type { SwapReason } from '../../src/schemas/generated/schemas.js';

describe('TASK-30: Exercise Swap Repository (RF-03, CA-03.4, Constitución §3)', () => {
  let mockPool: PoolLike;
  let swapRepo: ExerciseSwapRepository;

  const sampleSwapRow = {
    id: '1ba7b810-9dad-11d1-80b4-00c04fd430e1',
    assignment_id: '2ba7b810-9dad-11d1-80b4-00c04fd430e2',
    original_exercise_id: 'press_banca',
    new_exercise_id: 'press_mancuernas',
    reason: 'falta_equipamiento' as SwapReason,
    notes: 'No había barra disponible en el gimnasio',
    created_at: new Date('2026-09-11T19:00:00Z')
  };

  beforeEach(() => {
    mockPool = {
      connect: vi.fn(),
      query: vi.fn()
    };
    swapRepo = new ExerciseSwapRepository(mockPool);
  });

  describe('create', () => {
    it('should insert a new exercise swap record and return full entity', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSwapRow],
        rowCount: 1
      });

      const input: CreateExerciseSwapData = {
        assignment_id: sampleSwapRow.assignment_id,
        original_exercise_id: sampleSwapRow.original_exercise_id,
        new_exercise_id: sampleSwapRow.new_exercise_id,
        reason: 'falta_equipamiento',
        notes: 'No había barra disponible en el gimnasio'
      };

      const result = await swapRepo.create(input);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO exercise_swap'),
        [
          input.assignment_id,
          input.original_exercise_id,
          input.new_exercise_id,
          input.reason,
          input.notes
        ]
      );

      expect(result).toEqual({
        id: sampleSwapRow.id,
        assignment_id: sampleSwapRow.assignment_id,
        original_exercise_id: sampleSwapRow.original_exercise_id,
        new_exercise_id: sampleSwapRow.new_exercise_id,
        reason: 'falta_equipamiento',
        notes: 'No había barra disponible en el gimnasio',
        created_at: '2026-09-11T19:00:00.000Z'
      });
    });

    it('should support creating swap record without optional notes', async () => {
      const rowWithoutNotes = {
        ...sampleSwapRow,
        notes: null
      };

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [rowWithoutNotes],
        rowCount: 1
      });

      const input: CreateExerciseSwapData = {
        assignment_id: sampleSwapRow.assignment_id,
        original_exercise_id: sampleSwapRow.original_exercise_id,
        new_exercise_id: sampleSwapRow.new_exercise_id,
        reason: 'preferencia_personal'
      };

      const result = await swapRepo.create(input);

      expect(result.notes).toBeUndefined();
      expect(result.reason).toBe('falta_equipamiento');
    });
  });

  describe('findById', () => {
    it('should return swap record by ID when found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSwapRow],
        rowCount: 1
      });

      const result = await swapRepo.findById(sampleSwapRow.id);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, assignment_id'),
        [sampleSwapRow.id]
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleSwapRow.id);
      expect(result?.reason).toBe('falta_equipamiento');
    });

    it('should return null when swap record is not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await swapRepo.findById('00000000-0000-0000-0000-000000000000');
      expect(result).toBeNull();
    });
  });

  describe('findByAssignmentId', () => {
    it('should return all swaps for a given assignment ordered by created_at DESC', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSwapRow],
        rowCount: 1
      });

      const results = await swapRepo.findByAssignmentId(sampleSwapRow.assignment_id);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE assignment_id = $1'),
        [sampleSwapRow.assignment_id]
      );

      expect(results).toHaveLength(1);
      expect(results[0].assignment_id).toBe(sampleSwapRow.assignment_id);
    });
  });

  describe('findByAthleteId', () => {
    it('should query swaps belonging to an athlete across mesocycles', async () => {
      const athleteId = '3ba7b810-9dad-11d1-80b4-00c04fd430e3';

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSwapRow],
        rowCount: 1
      });

      const results = await swapRepo.findByAthleteId(athleteId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN mesocycle m ON wp.mesocycle_id = m.id'),
        [athleteId]
      );

      expect(results).toHaveLength(1);
    });
  });

  describe('findReasonsByOriginalExercise', () => {
    it('should return list of reasons an athlete has previously given for swapping a specific exercise', async () => {
      const athleteId = '3ba7b810-9dad-11d1-80b4-00c04fd430e3';
      const exerciseId = 'press_banca';

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [{ reason: 'preferencia_personal' }, { reason: 'molestia_articular' }],
        rowCount: 2
      });

      const reasons = await swapRepo.findReasonsByOriginalExercise(athleteId, exerciseId);

      expect(reasons).toEqual(['preferencia_personal', 'molestia_articular']);
    });
  });
});
