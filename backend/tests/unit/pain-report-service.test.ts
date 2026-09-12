import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PainReportService } from '../../src/services/pain-report.service.js';
import type { PainReportRepository, PainReportRecord } from '../../src/repositories/pain-report.repository.js';
import type { SessionRepository, SessionRecord } from '../../src/repositories/session.repository.js';
import { BadRequestError, NotFoundError } from '../../src/errors/app-error.js';
import type { CreatePainReportRequest } from '../../src/schemas/generated/schemas.js';

describe('TASK-39: PainReportService', () => {
  let service: PainReportService;
  let mockPainReportRepo: Partial<PainReportRepository>;
  let mockSessionRepo: Partial<SessionRepository>;

  const sampleAthleteId = 'a1111111-1111-1111-1111-111111111111';
  const sampleSessionId = 's1111111-1111-1111-1111-111111111111';
  const sampleReportId = 'r1111111-1111-1111-1111-111111111111';
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

  const samplePainReportRecord: PainReportRecord = {
    id: sampleReportId,
    session_id: sampleSessionId,
    exercise_id: sampleExerciseId,
    exercise_assignment_id: 'ea-1',
    joint: 'hombro',
    side: 'derecha',
    intensity: 'moderada',
    notes: 'Molestia en la porción anterior al descender la barra',
    client_timestamp: '2026-09-11T10:20:00.000Z',
    created_at: '2026-09-11T10:20:00.000Z'
  };

  beforeEach(() => {
    mockPainReportRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySessionId: vi.fn(),
      findBySessionAndExercise: vi.fn(),
      findByAthleteAndJoint: vi.fn(),
      delete: vi.fn()
    };

    mockSessionRepo = {
      findById: vi.fn(),
      findByAthleteId: vi.fn(),
      create: vi.fn(),
      updateStatus: vi.fn()
    };

    service = new PainReportService(
      mockPainReportRepo as PainReportRepository,
      mockSessionRepo as SessionRepository
    );
  });

  describe('recordPainReport', () => {
    const validPayload: CreatePainReportRequest = {
      exercise_id: sampleExerciseId,
      joint: 'hombro',
      side: 'derecha',
      intensity: 'moderada',
      notes: 'Molestia en la porción anterior al descender la barra'
    };

    it('should successfully record an exercise pain report during an active session (RF-06, CA-06.1, CA-06.2, CA-06.3)', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      vi.mocked(mockPainReportRepo.create!).mockResolvedValueOnce(samplePainReportRecord);

      const result = await service.recordPainReport(sampleSessionId, validPayload, sampleAthleteId);

      expect(result).toBeDefined();
      expect(result.id).toBe(sampleReportId);
      expect(result.session_id).toBe(sampleSessionId);
      expect(result.exercise_id).toBe(sampleExerciseId);
      expect(result.joint).toBe('hombro');
      expect(result.side).toBe('derecha');
      expect(result.intensity).toBe('moderada');
      expect(result.notes).toBe('Molestia en la porción anterior al descender la barra');
      expect(mockPainReportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: sampleSessionId,
          exercise_id: sampleExerciseId,
          joint: 'hombro',
          side: 'derecha',
          intensity: 'moderada',
          notes: 'Molestia en la porción anterior al descender la barra'
        })
      );
    });

    it('should accept pain reports without optional notes', async () => {
      const payloadWithoutNotes: CreatePainReportRequest = {
        exercise_id: sampleExerciseId,
        joint: 'rodilla',
        side: 'izquierda',
        intensity: 'leve'
      };
      const recordWithoutNotes: PainReportRecord = {
        ...samplePainReportRecord,
        joint: 'rodilla',
        side: 'izquierda',
        intensity: 'leve',
        notes: undefined
      };

      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      vi.mocked(mockPainReportRepo.create!).mockResolvedValueOnce(recordWithoutNotes);

      const result = await service.recordPainReport(sampleSessionId, payloadWithoutNotes, sampleAthleteId);

      expect(result.joint).toBe('rodilla');
      expect(result.notes).toBeUndefined();
    });

    it('should reject invalid joint with BadRequestError', async () => {
      const invalidPayload = {
        ...validPayload,
        joint: 'espalda_alta' // Not in JointSchema
      };

      await expect(
        service.recordPainReport(sampleSessionId, invalidPayload as unknown as CreatePainReportRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockPainReportRepo.create).not.toHaveBeenCalled();
    });

    it('should reject invalid side with BadRequestError', async () => {
      const invalidPayload = {
        ...validPayload,
        side: 'centro' // Not in BodySideSchema
      };

      await expect(
        service.recordPainReport(sampleSessionId, invalidPayload as unknown as CreatePainReportRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockPainReportRepo.create).not.toHaveBeenCalled();
    });

    it('should reject invalid intensity with BadRequestError', async () => {
      const invalidPayload = {
        ...validPayload,
        intensity: 'insoportable' // Not in PainIntensitySchema
      };

      await expect(
        service.recordPainReport(sampleSessionId, invalidPayload as unknown as CreatePainReportRequest, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockPainReportRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if session does not exist', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(null);

      await expect(
        service.recordPainReport('unknown-session', validPayload, sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
      expect(mockPainReportRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if session belongs to another athlete', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);

      await expect(
        service.recordPainReport(sampleSessionId, validPayload, 'other-athlete-id')
      ).rejects.toThrow(NotFoundError);
      expect(mockPainReportRepo.create).not.toHaveBeenCalled();
    });

    it('should reject pain reporting in a completed session with BadRequestError', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleCompletedSession);

      await expect(
        service.recordPainReport(sampleSessionId, validPayload, sampleAthleteId)
      ).rejects.toThrow(BadRequestError);
      expect(mockPainReportRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getPainReportsBySession', () => {
    it('should return all pain reports for a session', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      vi.mocked(mockPainReportRepo.findBySessionId!).mockResolvedValueOnce([samplePainReportRecord]);

      const results = await service.getPainReportsBySession(sampleSessionId, sampleAthleteId);

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(sampleReportId);
      expect(mockPainReportRepo.findBySessionId).toHaveBeenCalledWith(sampleSessionId);
    });

    it('should throw NotFoundError if session is not found', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(null);

      await expect(
        service.getPainReportsBySession('unknown-session', sampleAthleteId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPainReportsByExercise', () => {
    it('should return pain reports for a specific exercise within a session', async () => {
      vi.mocked(mockSessionRepo.findById!).mockResolvedValueOnce(sampleActiveSession);
      vi.mocked(mockPainReportRepo.findBySessionAndExercise!).mockResolvedValueOnce([samplePainReportRecord]);

      const results = await service.getPainReportsByExercise(sampleSessionId, sampleExerciseId, sampleAthleteId);

      expect(results).toHaveLength(1);
      expect(results[0].exercise_id).toBe(sampleExerciseId);
      expect(mockPainReportRepo.findBySessionAndExercise).toHaveBeenCalledWith(sampleSessionId, sampleExerciseId);
    });
  });

  describe('getAthleteJointPainHistory', () => {
    it('should return historical pain reports by joint for fatigue adjustments (RF-08)', async () => {
      vi.mocked(mockPainReportRepo.findByAthleteAndJoint!).mockResolvedValueOnce([samplePainReportRecord]);

      const results = await service.getAthleteJointPainHistory(sampleAthleteId, 'hombro', 5);

      expect(results).toHaveLength(1);
      expect(results[0].joint).toBe('hombro');
      expect(mockPainReportRepo.findByAthleteAndJoint).toHaveBeenCalledWith(sampleAthleteId, 'hombro', 5);
    });
  });
});
