import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckinService } from '../../src/services/checkin.service.js';
import { CheckinRepository } from '../../src/repositories/checkin.repository.js';
import { SessionRepository } from '../../src/repositories/session.repository.js';
import { NotFoundError, BadRequestError, ConflictError } from '../../src/errors/app-error.js';
import type { CheckInRequest, JointPainItem } from '../../src/schemas/generated/schemas.js';

describe('TASK-35: CheckinService', () => {
  let service: CheckinService;
  let mockCheckinRepo: CheckinRepository;
  let mockSessionRepo: SessionRepository;

  const sampleAthleteId = 'a1111111-1111-1111-1111-111111111111';
  const sampleSessionId = 's1111111-1111-1111-1111-111111111111';
  const sampleCheckinId = 'c1111111-1111-1111-1111-111111111111';

  const sampleSession = {
    id: sampleSessionId,
    athlete_id: sampleAthleteId,
    session_plan_id: 'p1111111-1111-1111-1111-111111111111',
    status: 'in_progress' as const,
    started_at: '2026-09-11T10:00:00.000Z',
    client_timestamp: '2026-09-11T10:00:00.000Z',
    created_at: '2026-09-11T10:00:00.000Z',
    updated_at: '2026-09-11T10:00:00.000Z'
  };

  const sampleJointPains: JointPainItem[] = [
    { joint: 'hombro', side: 'derecha', intensity: 'leve' },
    { joint: 'rodilla', side: 'izquierda', intensity: 'moderada' },
    { joint: 'columna_lumbar', side: 'bilateral', intensity: 'severa' }
  ];

  beforeEach(() => {
    mockSessionRepo = {
      findById: vi.fn(async (id: string) => {
        if (id === sampleSessionId) return { ...sampleSession };
        return null;
      }),
      create: vi.fn(),
      findActiveByAthleteId: vi.fn(),
      findByAthleteId: vi.fn(),
      updateStatus: vi.fn(),
      softDelete: vi.fn()
    } as unknown as SessionRepository;

    mockCheckinRepo = {
      findBySessionId: vi.fn(async (_sessionId: string) => null),
      findById: vi.fn(async (id: string) => {
        if (id === sampleCheckinId) {
          return {
            id: sampleCheckinId,
            session_id: sampleSessionId,
            fatigue_level: 3,
            joint_pains: sampleJointPains,
            client_timestamp: '2026-09-11T10:00:00.000Z',
            created_at: '2026-09-11T10:00:00.000Z'
          };
        }
        return null;
      }),
      create: vi.fn(async (data) => ({
        id: sampleCheckinId,
        session_id: data.session_id,
        fatigue_level: data.fatigue_level,
        joint_pains: data.joint_pains,
        client_timestamp: data.client_timestamp || new Date().toISOString(),
        created_at: new Date().toISOString()
      }))
    } as unknown as CheckinRepository;

    service = new CheckinService(mockCheckinRepo, mockSessionRepo);
  });

  describe('recordCheckin', () => {
    it('should successfully record checkin with fatigue level and bilateral joint pains (RF-04, CA-04.1, CA-04.2, CA-04.3, CA-04.4)', async () => {
      const req: CheckInRequest = {
        fatigue_level: 3,
        joint_pains: sampleJointPains
      };

      const result = await service.recordCheckin(sampleSessionId, req, sampleAthleteId);

      expect(result).toBeDefined();
      expect(result.id).toBe(sampleCheckinId);
      expect(result.session_id).toBe(sampleSessionId);
      expect(result.fatigue_level).toBe(3);
      expect(result.joint_pains).toHaveLength(3);
      expect(mockCheckinRepo.create).toHaveBeenCalledWith({
        session_id: sampleSessionId,
        fatigue_level: 3,
        joint_pains: sampleJointPains,
        client_timestamp: undefined
      });
    });

    it('should accept checkin with no joint pains when athlete has no discomfort', async () => {
      const req: CheckInRequest = {
        fatigue_level: 1,
        joint_pains: []
      };

      const result = await service.recordCheckin(sampleSessionId, req, sampleAthleteId);
      expect(result).toBeDefined();
      expect(result.fatigue_level).toBe(1);
      expect(result.joint_pains).toHaveLength(0);
    });

    it('should reject fatigue level less than 1', async () => {
      const req = {
        fatigue_level: 0,
        joint_pains: []
      };

      await expect(
        service.recordCheckin(sampleSessionId, req as CheckInRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject fatigue level greater than 5', async () => {
      const req = {
        fatigue_level: 6,
        joint_pains: []
      };

      await expect(
        service.recordCheckin(sampleSessionId, req as CheckInRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject non-integer fatigue level', async () => {
      const req = {
        fatigue_level: 3.5,
        joint_pains: []
      };

      await expect(
        service.recordCheckin(sampleSessionId, req as unknown as CheckInRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject invalid joint name', async () => {
      const req = {
        fatigue_level: 3,
        joint_pains: [{ joint: 'cuello' as unknown as JointPainItem['joint'], side: 'derecha' as const, intensity: 'leve' as const }]
      };

      await expect(
        service.recordCheckin(sampleSessionId, req as CheckInRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject invalid body side', async () => {
      const req = {
        fatigue_level: 3,
        joint_pains: [{ joint: 'hombro' as const, side: 'centro' as unknown as JointPainItem['side'], intensity: 'leve' as const }]
      };

      await expect(
        service.recordCheckin(sampleSessionId, req as CheckInRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
    });

    it('should reject invalid pain intensity', async () => {
      const req = {
        fatigue_level: 3,
        joint_pains: [{ joint: 'hombro' as const, side: 'derecha' as const, intensity: 'insoportable' as unknown as JointPainItem['intensity'] }]
      };

      await expect(
        service.recordCheckin(sampleSessionId, req as CheckInRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError if session does not exist', async () => {
      const req: CheckInRequest = {
        fatigue_level: 3,
        joint_pains: []
      };

      await expect(
        service.recordCheckin('non-existent-session', req, sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if session belongs to another athlete', async () => {
      const req: CheckInRequest = {
        fatigue_level: 3,
        joint_pains: []
      };

      await expect(
        service.recordCheckin(sampleSessionId, req, 'other-athlete-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if session is already completed', async () => {
      vi.mocked(mockSessionRepo.findById).mockResolvedValueOnce({
        ...sampleSession,
        status: 'completed'
      });

      const req: CheckInRequest = {
        fatigue_level: 3,
        joint_pains: []
      };

      await expect(
        service.recordCheckin(sampleSessionId, req, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ConflictError (409) if checkin already exists for session', async () => {
      vi.mocked(mockCheckinRepo.findBySessionId).mockResolvedValueOnce({
        id: 'existing-checkin',
        session_id: sampleSessionId,
        fatigue_level: 2,
        joint_pains: [],
        created_at: new Date().toISOString()
      });

      const req: CheckInRequest = {
        fatigue_level: 3,
        joint_pains: []
      };

      await expect(
        service.recordCheckin(sampleSessionId, req, sampleAthleteId)
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('getCheckinBySessionId', () => {
    it('should return checkin when found for session', async () => {
      vi.mocked(mockCheckinRepo.findBySessionId).mockResolvedValueOnce({
        id: sampleCheckinId,
        session_id: sampleSessionId,
        fatigue_level: 4,
        joint_pains: sampleJointPains,
        created_at: '2026-09-11T10:00:00.000Z'
      });

      const result = await service.getCheckinBySessionId(sampleSessionId, sampleAthleteId);
      expect(result).toBeDefined();
      expect(result.id).toBe(sampleCheckinId);
      expect(result.fatigue_level).toBe(4);
    });

    it('should throw NotFoundError if checkin not found for session', async () => {
      vi.mocked(mockCheckinRepo.findBySessionId).mockResolvedValueOnce(null);

      await expect(
        service.getCheckinBySessionId(sampleSessionId, sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCheckinById', () => {
    it('should return checkin when found by ID', async () => {
      const result = await service.getCheckinById(sampleCheckinId, sampleAthleteId);
      expect(result).toBeDefined();
      expect(result.id).toBe(sampleCheckinId);
    });

    it('should throw NotFoundError when checkin ID not found', async () => {
      vi.mocked(mockCheckinRepo.findById).mockResolvedValueOnce(null);

      await expect(
        service.getCheckinById('non-existent-checkin', sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
