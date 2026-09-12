import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CheckinRepository,
  type PoolLike,
  type PoolClientLike
} from '../../src/repositories/checkin.repository.js';
import { ConflictError } from '../../src/errors/app-error.js';
import type { JointPainItem } from '../../src/schemas/generated/schemas.js';

describe('TASK-34: CheckinRepository', () => {
  let repo: CheckinRepository;
  let mockPool: PoolLike;
  let mockClient: PoolClientLike;

  const sampleSessionId = 's1111111-1111-1111-1111-111111111111';
  const sampleCheckinId = 'c1111111-1111-1111-1111-111111111111';

  const sampleJointPains: JointPainItem[] = [
    { joint: 'hombro', side: 'derecha', intensity: 'leve' },
    { joint: 'rodilla', side: 'izquierda', intensity: 'moderada' }
  ];

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };

    mockPool = {
      connect: vi.fn(async () => mockClient),
      query: vi.fn()
    };

    repo = new CheckinRepository(mockPool);
  });

  describe('create', () => {
    it('should create checkin and child checkin_pain records in a transaction (RF-04, CA-04.4)', async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('BEGIN')) return { rows: [] };
        if (normalized.startsWith('INSERT INTO checkin (')) {
          return {
            rows: [
              {
                id: sampleCheckinId,
                session_id: sampleSessionId,
                fatigue_level: 3,
                client_timestamp: new Date('2026-09-11T10:00:00Z'),
                created_at: new Date('2026-09-11T10:00:00Z')
              }
            ]
          };
        }
        if (normalized.startsWith('INSERT INTO checkin_pain (')) {
          return {
            rows: [
              {
                id: 'cp-1',
                checkin_id: sampleCheckinId,
                joint: 'hombro',
                side: 'derecha',
                intensity: 'leve',
                client_timestamp: new Date('2026-09-11T10:00:00Z'),
                created_at: new Date('2026-09-11T10:00:00Z')
              }
            ]
          };
        }
        if (normalized.startsWith('COMMIT')) return { rows: [] };
        return { rows: [] };
      });

      const result = await repo.create({
        session_id: sampleSessionId,
        fatigue_level: 3,
        joint_pains: sampleJointPains
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(sampleCheckinId);
      expect(result.session_id).toBe(sampleSessionId);
      expect(result.fatigue_level).toBe(3);
      expect(result.joint_pains).toHaveLength(2);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw ConflictError (409) when checkin already exists for session', async () => {
      mockClient.query.mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('BEGIN')) return { rows: [] };
        if (normalized.startsWith('INSERT INTO checkin (')) {
          const err = new Error('duplicate key value violates unique constraint "checkin_session_id_key"') as Error & { code: string };
          err.code = '23505';
          throw err;
        }
        return { rows: [] };
      });

      await expect(
        repo.create({
          session_id: sampleSessionId,
          fatigue_level: 2,
          joint_pains: []
        })
      ).rejects.toThrow(ConflictError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findBySessionId', () => {
    it('should return checkin with joint pains by session ID', async () => {
      vi.mocked(mockPool.query).mockImplementation(async (sql: string) => {
        const normalized = sql.replace(/\s+/g, ' ').trim();
        if (normalized.startsWith('SELECT id, session_id, fatigue_level, client_timestamp, created_at FROM checkin')) {
          return {
            rows: [
              {
                id: sampleCheckinId,
                session_id: sampleSessionId,
                fatigue_level: 4,
                client_timestamp: new Date('2026-09-11T10:00:00Z'),
                created_at: new Date('2026-09-11T10:00:00Z')
              }
            ]
          };
        }
        if (normalized.startsWith('SELECT id, checkin_id, joint, side, intensity, client_timestamp, created_at FROM checkin_pain')) {
          return {
            rows: [
              {
                id: 'cp-1',
                checkin_id: sampleCheckinId,
                joint: 'codo',
                side: 'izquierda',
                intensity: 'moderada',
                client_timestamp: new Date('2026-09-11T10:00:00Z'),
                created_at: new Date('2026-09-11T10:00:00Z')
              }
            ]
          };
        }
        return { rows: [] };
      });

      const result = await repo.findBySessionId(sampleSessionId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleCheckinId);
      expect(result?.fatigue_level).toBe(4);
      expect(result?.joint_pains).toHaveLength(1);
      expect(result?.joint_pains[0].joint).toBe('codo');
    });

    it('should return null when checkin not found for session', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findBySessionId('non-existent-session');
      expect(result).toBeNull();
    });
  });
});
