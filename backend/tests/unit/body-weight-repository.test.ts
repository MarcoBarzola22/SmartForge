import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BodyWeightRepository,
  type PoolLike,
  type PoolClientLike,
  type CreateBodyWeightLogData,
  type UpdateBodyWeightLogData,
} from '../../src/repositories/body-weight.repository.js';
import { ConflictError } from '../../src/errors/app-error.js';

describe('TASK-10: BodyWeightRepository Unit Tests', () => {
  let repo: BodyWeightRepository;
  let mockPool: PoolLike;
  let mockClient: PoolClientLike;

  const sampleAthleteId = '11111111-1111-1111-1111-111111111111';
  const sampleLogId = '22222222-2222-2222-2222-222222222222';

  const sampleDbRow = {
    id: sampleLogId,
    athlete_id: sampleAthleteId,
    weight_kg: '74.50',
    calendar_week_start: '2026-09-14',
    logged_date: '2026-09-14',
    logged_at_utc: new Date('2026-09-14T10:00:00Z'),
    updated_at_utc: new Date('2026-09-14T10:00:00Z'),
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

    repo = new BodyWeightRepository(mockPool);
  });

  describe('create', () => {
    const createData: CreateBodyWeightLogData = {
      athlete_id: sampleAthleteId,
      weight_kg: 74.5,
      calendar_week_start: '2026-09-14',
      logged_date: '2026-09-14',
    };

    it('should insert and return a body weight log record', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleDbRow],
        rowCount: 1,
      });

      const result = await repo.create(createData);

      expect(result).toEqual({
        id: sampleLogId,
        athlete_id: sampleAthleteId,
        weight_kg: 74.5,
        calendar_week_start: '2026-09-14',
        logged_date: '2026-09-14',
        logged_at_utc: '2026-09-14T10:00:00.000Z',
        updated_at_utc: '2026-09-14T10:00:00.000Z',
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO body_weight_log'),
        [createData.athlete_id, createData.weight_kg, createData.calendar_week_start, createData.logged_date]
      );
    });

    it('should throw ConflictError (409) if unique constraint for calendar week is violated', async () => {
      const error: any = new Error('duplicate key value violates unique constraint "uq_athlete_calendar_week"');
      error.code = '23505';

      vi.mocked(mockPool.query).mockRejectedValueOnce(error);

      await expect(repo.create(createData)).rejects.toThrow(
        new ConflictError('Ya existe un registro de peso para esta semana calendario.')
      );
    });
  });

  describe('update', () => {
    const updateData: UpdateBodyWeightLogData = {
      weight_kg: 75.0,
      logged_date: '2026-09-16',
      calendar_week_start: '2026-09-14',
    };

    it('should update and return the updated record', async () => {
      const updatedRow = {
        ...sampleDbRow,
        weight_kg: '75.00',
        logged_date: '2026-09-16',
        updated_at_utc: new Date('2026-09-16T12:00:00Z'),
      };

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [updatedRow],
        rowCount: 1,
      });

      const result = await repo.update(sampleLogId, sampleAthleteId, updateData);

      expect(result).not.toBeNull();
      expect(result?.weight_kg).toBe(75.0);
      expect(result?.logged_date).toBe('2026-09-16');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE body_weight_log'),
        expect.arrayContaining([sampleLogId, sampleAthleteId])
      );
    });

    it('should return null if the record does not exist or belongs to another athlete', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repo.update('non-existent-id', sampleAthleteId, updateData);
      expect(result).toBeNull();
    });

    it('should throw ConflictError if date update collides with another week record', async () => {
      const error: any = new Error('duplicate key value');
      error.code = '23505';

      vi.mocked(mockPool.query).mockRejectedValueOnce(error);

      await expect(repo.update(sampleLogId, sampleAthleteId, updateData)).rejects.toThrow(ConflictError);
    });
  });

  describe('findById', () => {
    it('should return the record by id', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleDbRow],
        rowCount: 1,
      });

      const result = await repo.findById(sampleLogId, sampleAthleteId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleLogId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND athlete_id = $2'),
        [sampleLogId, sampleAthleteId]
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repo.findById('not-found-id', sampleAthleteId);
      expect(result).toBeNull();
    });
  });

  describe('findByWeek', () => {
    it('should return the record for the given athlete and calendar week', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleDbRow],
        rowCount: 1,
      });

      const result = await repo.findByWeek(sampleAthleteId, '2026-09-14');
      expect(result).not.toBeNull();
      expect(result?.calendar_week_start).toBe('2026-09-14');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE athlete_id = $1 AND calendar_week_start = $2'),
        [sampleAthleteId, '2026-09-14']
      );
    });

    it('should return null when no record exists for that week', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repo.findByWeek(sampleAthleteId, '2026-09-21');
      expect(result).toBeNull();
    });
  });

  describe('findHistoryByAthleteId', () => {
    it('should return chronological list of logs ordered descending (RF-02 CA-02.1)', async () => {
      const olderRow = {
        ...sampleDbRow,
        id: '33333333-3333-3333-3333-333333333333',
        weight_kg: '75.30',
        calendar_week_start: '2026-09-07',
        logged_date: '2026-09-07',
      };

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleDbRow, olderRow],
        rowCount: 2,
      });

      const history = await repo.findHistoryByAthleteId(sampleAthleteId);

      expect(history).toHaveLength(2);
      expect(history[0].weight_kg).toBe(74.5);
      expect(history[1].weight_kg).toBe(75.3);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY logged_date DESC'),
        [sampleAthleteId]
      );
    });
  });

  describe('findLatestBeforeDate (Carry-Forward weight resolution)', () => {
    it('should return the latest weight log before or on the given session date (RF-06 CA-06.3)', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleDbRow],
        rowCount: 1,
      });

      const result = await repo.findLatestBeforeDate(sampleAthleteId, '2026-09-16');

      expect(result).not.toBeNull();
      expect(result?.weight_kg).toBe(74.5);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE athlete_id = $1 AND logged_date <= $2'),
        [sampleAthleteId, '2026-09-16']
      );
    });

    it('should return null if no log exists before the given date', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await repo.findLatestBeforeDate(sampleAthleteId, '2026-09-01');
      expect(result).toBeNull();
    });
  });

  describe('findAdjacentLogs', () => {
    it('should return previous and next logs around target date for 120h guard check', async () => {
      const prevRow = {
        ...sampleDbRow,
        id: 'prev-id',
        logged_date: '2026-09-07',
      };
      const nextRow = {
        ...sampleDbRow,
        id: 'next-id',
        logged_date: '2026-09-21',
      };

      // Query for previous log
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [prevRow],
        rowCount: 1,
      });
      // Query for next log
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [nextRow],
        rowCount: 1,
      });

      const adjacent = await repo.findAdjacentLogs(sampleAthleteId, '2026-09-14', 'sample-id');

      expect(adjacent.previous?.id).toBe('prev-id');
      expect(adjacent.next?.id).toBe('next-id');
    });
  });

  describe('delete', () => {
    it('should delete a record and return true', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      });

      const success = await repo.delete(sampleLogId, sampleAthleteId);
      expect(success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM body_weight_log'),
        [sampleLogId, sampleAthleteId]
      );
    });

    it('should return false if row not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const success = await repo.delete('non-existent', sampleAthleteId);
      expect(success).toBe(false);
    });
  });
});
