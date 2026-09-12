import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetLoggerService } from '../../src/services/set-logger.service.js';
import type { SetLogRepository, SetLogRecord } from '../../src/repositories/set-log.repository.js';
import type { SessionRepository, SessionRecord } from '../../src/repositories/session.repository.js';
import { BadRequestError, NotFoundError } from '../../src/errors/app-error.js';
import type { CreateSetLogRequest, UpdateSetLogRequest } from '../../src/schemas/generated/schemas.js';

describe('TASK-38: SetLoggerService', () => {
  let service: SetLoggerService;
  let mockSetLogRepo: Partial<SetLogRepository>;
  let mockSessionRepo: Partial<SessionRepository>;

  const sampleAthleteId = 'a1111111-1111-1111-1111-111111111111';
  const sampleSessionId = 's1111111-1111-1111-1111-111111111111';
  const sampleSetId = 'set-11111111-1111-1111-1111-111111111111';
  const sampleExerciseId = 'barbell_bench_press';

  const sampleActiveSession: SessionRecord = {
    id: sampleSessionId,
    athlete_id: sampleAthleteId,
    session_plan_id: 'sp-1',
    status: 'in_progress',
    started_at: '2026-09-11T10:00:00.000Z',
    client_timestamp: '2026-09-11T10:00:00.000Z',
    created_at: '2026-09-11T10:00:00.000Z',
    updated_at: '2026-09-11T10:00:00.000Z'
  };

  const sampleCompletedSession: SessionRecord = {
    ...sampleActiveSession,
    status: 'completed',
    completed_at: '2026-09-11T11:00:00.000Z'
  };

  const sampleSetLogRecord: SetLogRecord = {
    id: sampleSetId,
    session_id: sampleSessionId,
    exercise_id: sampleExerciseId,
    exercise_assignment_id: 'ea-1',
    set_number: 1,
    reps_completed: 10,
    weight_kg: 80,
    rir: 2,
    client_timestamp: '2026-09-11T10:05:00.000Z',
    created_at: '2026-09-11T10:05:00.000Z',
    updated_at: '2026-09-11T10:05:00.000Z'
  };

  beforeEach(() => {
    mockSetLogRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySessionId: vi.fn(),
      findBySessionAndExercise: vi.fn(),
      findByAthleteAndExercise: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };

    mockSessionRepo = {
      findById: vi.fn(),
      findByAthleteId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn()
    };

    service = new SetLoggerService(
      mockSetLogRepo as SetLogRepository,
      mockSessionRepo as SessionRepository
    );
  });

  describe('logSet', () => {
    const validPayload: CreateSetLogRequest = {
      exercise_id: sampleExerciseId,
      set_number: 1,
      reps_completed: 10,
      weight_kg: 80,
      rir: 2,
      client_timestamp: '2026-09-11T10:05:00.000Z'
    };

    it('should successfully log a valid set in an active session (RF-05, CA-05.1, CA-05.2)', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      vi.mocked(mockSetLogRepo.create!).mockResolvedValueOnce(sampleSetLogRecord);

      const result = await service.logSet(sampleSessionId, validPayload, sampleAthleteId);

      expect(result).toBeDefined();
      expect(result.id).toBe(sampleSetId);
      expect(result.reps_completed).toBe(10);
      expect(result.weight_kg).toBe(80);
      expect(result.rir).toBe(2);
      expect(mockSetLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: sampleSessionId,
          exercise_id: sampleExerciseId,
          set_number: 1,
          reps_completed: 10,
          weight_kg: 80,
          rir: 2
        })
      );
    });

    it('should accept weight_kg = 0 for bodyweight exercises (RF-05, CA-05.5, CL-05)', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      const bodyweightSetRecord: SetLogRecord = {
        ...sampleSetLogRecord,
        exercise_id: 'pull_up',
        weight_kg: 0
      };
      vi.mocked(mockSetLogRepo.create!).mockResolvedValueOnce(bodyweightSetRecord);

      const result = await service.logSet(
        sampleSessionId,
        { ...validPayload, exercise_id: 'pull_up', weight_kg: 0 },
        sampleAthleteId
      );

      expect(result.weight_kg).toBe(0);
      expect(mockSetLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          weight_kg: 0
        })
      );
    });

    it('should reject RIR > 5 with BadRequestError (CL-05)', async () => {
      const invalidPayload = { ...validPayload, rir: 6 };

      await expect(
        service.logSet(sampleSessionId, invalidPayload as unknown as CreateSetLogRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.create).not.toHaveBeenCalled();
    });

    it('should reject negative RIR (< 0) with BadRequestError (CL-05)', async () => {
      const invalidPayload = { ...validPayload, rir: -1 };

      await expect(
        service.logSet(sampleSessionId, invalidPayload as unknown as CreateSetLogRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.create).not.toHaveBeenCalled();
    });

    it('should reject negative weight (< 0 kg) with BadRequestError (CL-05)', async () => {
      const invalidPayload = { ...validPayload, weight_kg: -2.5 };

      await expect(
        service.logSet(sampleSessionId, invalidPayload as unknown as CreateSetLogRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.create).not.toHaveBeenCalled();
    });

    it('should reject negative reps_completed (< 0) with BadRequestError', async () => {
      const invalidPayload = { ...validPayload, reps_completed: -1 };

      await expect(
        service.logSet(sampleSessionId, invalidPayload as unknown as CreateSetLogRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.create).not.toHaveBeenCalled();
    });

    it('should reject set_number < 1 with BadRequestError', async () => {
      const invalidPayload = { ...validPayload, set_number: 0 };

      await expect(
        service.logSet(sampleSessionId, invalidPayload as unknown as CreateSetLogRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if session does not exist', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(null);

      await expect(
        service.logSet('non-existent-session', validPayload, sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
      expect(mockSetLogRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if session belongs to another athlete', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);

      await expect(
        service.logSet(sampleSessionId, validPayload, 'different-athlete-id')
      ).rejects.toThrow(NotFoundError);
      expect(mockSetLogRepo.create).not.toHaveBeenCalled();
    });

    it('should reject logging in a completed or cancelled session with BadRequestError', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleCompletedSession);

      await expect(
        service.logSet(sampleSessionId, validPayload, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSet', () => {
    const updatePayload: UpdateSetLogRequest = {
      reps_completed: 12,
      weight_kg: 82.5,
      rir: 1
    };

    it('should successfully update a set in an active session (RF-05, CA-05.4)', async () => {
      vi.mocked(mockSetLogRepo.findById!).mockResolvedValueOnce(sampleSetLogRecord);
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      const updatedRecord: SetLogRecord = {
        ...sampleSetLogRecord,
        reps_completed: 12,
        weight_kg: 82.5,
        rir: 1,
        updated_at: '2026-09-11T10:10:00.000Z'
      };
      vi.mocked(mockSetLogRepo.update!).mockResolvedValueOnce(updatedRecord);

      const result = await service.updateSet(sampleSetId, updatePayload, sampleAthleteId);

      expect(result).toBeDefined();
      expect(result.reps_completed).toBe(12);
      expect(result.weight_kg).toBe(82.5);
      expect(result.rir).toBe(1);
      expect(mockSetLogRepo.update).toHaveBeenCalledWith(sampleSetId, updatePayload);
    });

    it('should reject update if RIR > 5 or weight < 0 (CL-05)', async () => {
      const invalidUpdate = { rir: 7 };

      await expect(
        service.updateSet(sampleSetId, invalidUpdate as unknown as UpdateSetLogRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if set does not exist', async () => {
      vi.mocked(mockSetLogRepo.findById!).mockResolvedValueOnce(null);

      await expect(
        service.updateSet('non-existent-set', updatePayload, sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if session belongs to another athlete', async () => {
      vi.mocked(mockSetLogRepo.findById!).mockResolvedValueOnce(sampleSetLogRecord);
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);

      await expect(
        service.updateSet(sampleSetId, updatePayload, 'different-athlete-id')
      ).rejects.toThrow(NotFoundError);
      expect(mockSetLogRepo.update).not.toHaveBeenCalled();
    });

    it('should block modifications when session is completed (CA-05.4)', async () => {
      vi.mocked(mockSetLogRepo.findById!).mockResolvedValueOnce(sampleSetLogRecord);
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleCompletedSession);

      await expect(
        service.updateSet(sampleSetId, updatePayload, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteSet', () => {
    it('should successfully delete a set in an active session (RF-05, CA-05.4)', async () => {
      vi.mocked(mockSetLogRepo.findById!).mockResolvedValueOnce(sampleSetLogRecord);
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      vi.mocked(mockSetLogRepo.delete!).mockResolvedValueOnce(true);

      const result = await service.deleteSet(sampleSetId, sampleAthleteId);

      expect(result).toBe(true);
      expect(mockSetLogRepo.delete).toHaveBeenCalledWith(sampleSetId);
    });

    it('should throw NotFoundError if set does not exist', async () => {
      vi.mocked(mockSetLogRepo.findById!).mockResolvedValueOnce(null);

      await expect(
        service.deleteSet('non-existent-set', sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
      expect(mockSetLogRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if session belongs to another athlete', async () => {
      vi.mocked(mockSetLogRepo.findById!).mockResolvedValueOnce(sampleSetLogRecord);
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);

      await expect(
        service.deleteSet(sampleSetId, 'different-athlete-id')
      ).rejects.toThrow(NotFoundError);
      expect(mockSetLogRepo.delete).not.toHaveBeenCalled();
    });

    it('should block deletion when session is completed (CA-05.4)', async () => {
      vi.mocked(mockSetLogRepo.findById!).mockResolvedValueOnce(sampleSetLogRecord);
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleCompletedSession);

      await expect(
        service.deleteSet(sampleSetId, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockSetLogRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('getSetsBySession', () => {
    it('should return all set logs for a session', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      vi.mocked(mockSetLogRepo.findBySessionId!).mockResolvedValueOnce([sampleSetLogRecord]);

      const results = await service.getSetsBySession(sampleSessionId, sampleAthleteId);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(sampleSetId);
      expect(mockSetLogRepo.findBySessionId).toHaveBeenCalledWith(sampleSessionId);
    });

    it('should throw NotFoundError if session is not found', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(null);

      await expect(
        service.getSetsBySession('unknown-session', sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
