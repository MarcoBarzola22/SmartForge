import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionRepository, type PoolLike } from '../../src/repositories/session.repository.js';
import type { SessionStatus } from '../../src/schemas/generated/schemas.js';

describe('TASK-34: SessionRepository', () => {
  let repo: SessionRepository;
  let mockPool: PoolLike;

  const sampleSessionRow = {
    id: 's1111111-1111-1111-1111-111111111111',
    athlete_id: 'a1111111-1111-1111-1111-111111111111',
    session_plan_id: 'p1111111-1111-1111-1111-111111111111',
    status: 'in_progress' as SessionStatus,
    started_at: new Date('2026-09-11T10:00:00Z'),
    completed_at: null,
    client_timestamp: new Date('2026-09-11T10:00:00Z'),
    created_at: new Date('2026-09-11T10:00:00Z'),
    updated_at: new Date('2026-09-11T10:00:00Z'),
    deleted_at: null
  };

  beforeEach(() => {
    mockPool = {
      connect: vi.fn(),
      query: vi.fn()
    };
    repo = new SessionRepository(mockPool);
  });

  describe('create', () => {
    it('should insert and return a new session in in_progress status by default', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSessionRow]
      });

      const result = await repo.create({
        athlete_id: 'a1111111-1111-1111-1111-111111111111',
        session_plan_id: 'p1111111-1111-1111-1111-111111111111'
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(sampleSessionRow.id);
      expect(result.athlete_id).toBe(sampleSessionRow.athlete_id);
      expect(result.status).toBe('in_progress');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO session'),
        expect.arrayContaining(['a1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111'])
      );
    });
  });

  describe('findById', () => {
    it('should return session when found by ID', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSessionRow]
      });

      const result = await repo.findById(sampleSessionRow.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleSessionRow.id);
      expect(result?.athlete_id).toBe(sampleSessionRow.athlete_id);
    });

    it('should return null when session is not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findActiveByAthleteId', () => {
    it('should return the active in_progress session for an athlete', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleSessionRow]
      });

      const result = await repo.findActiveByAthleteId(sampleSessionRow.athlete_id);
      expect(result).not.toBeNull();
      expect(result?.status).toBe('in_progress');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'in_progress'"),
        [sampleSessionRow.athlete_id]
      );
    });

    it('should return null if no active session exists', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findActiveByAthleteId(sampleSessionRow.athlete_id);
      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update session status and completed_at timestamp', async () => {
      const completedRow = {
        ...sampleSessionRow,
        status: 'completed' as SessionStatus,
        completed_at: new Date('2026-09-11T11:00:00Z')
      };

      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [completedRow]
      });

      const result = await repo.updateStatus(
        sampleSessionRow.id,
        'completed',
        '2026-09-11T11:00:00.000Z'
      );

      expect(result).not.toBeNull();
      expect(result?.status).toBe('completed');
      expect(result?.completed_at).toBeDefined();
    });
  });

  describe('softDelete', () => {
    it('should mark deleted_at for session', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const success = await repo.softDelete(sampleSessionRow.id);
      expect(success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = NOW()'),
        [sampleSessionRow.id]
      );
    });
  });
});
