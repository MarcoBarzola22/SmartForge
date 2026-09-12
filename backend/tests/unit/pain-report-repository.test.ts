import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PainReportRepository,
  type PoolLike
} from '../../src/repositories/pain-report.repository.js';
import type { Joint, BodySide, PainIntensity } from '../../src/schemas/generated/schemas.js';

describe('TASK-37: PainReportRepository', () => {
  let repo: PainReportRepository;
  let mockPool: PoolLike;

  const sampleSessionId = 's1111111-1111-1111-1111-111111111111';
  const sampleReportId = 'r1111111-1111-1111-1111-111111111111';
  const sampleExerciseId = 'barbell_bench_press';

  const sampleRow = {
    id: sampleReportId,
    session_id: sampleSessionId,
    exercise_id: sampleExerciseId,
    exercise_assignment_id: 'ea-111',
    joint: 'hombro' as Joint,
    side: 'derecha' as BodySide,
    intensity: 'moderada' as PainIntensity,
    notes: 'Pinchazo al bajar la barra',
    client_timestamp: new Date('2026-09-11T10:00:00Z'),
    created_at: new Date('2026-09-11T10:00:00Z')
  };

  beforeEach(() => {
    mockPool = {
      connect: vi.fn(),
      query: vi.fn()
    };
    repo = new PainReportRepository(mockPool);
  });

  describe('create', () => {
    it('should insert and return a new exercise pain report record (RF-06)', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const result = await repo.create({
        session_id: sampleSessionId,
        exercise_id: sampleExerciseId,
        exercise_assignment_id: 'ea-111',
        joint: 'hombro',
        side: 'derecha',
        intensity: 'moderada',
        notes: 'Pinchazo al bajar la barra'
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(sampleReportId);
      expect(result.joint).toBe('hombro');
      expect(result.side).toBe('derecha');
      expect(result.intensity).toBe('moderada');
      expect(result.notes).toBe('Pinchazo al bajar la barra');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO exercise_pain_report'),
        expect.arrayContaining([sampleSessionId, sampleExerciseId, 'hombro', 'derecha', 'moderada'])
      );
    });
  });

  describe('findById', () => {
    it('should return pain report record when found by ID', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const result = await repo.findById(sampleReportId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(sampleReportId);
      expect(result?.joint).toBe('hombro');
    });

    it('should return null when pain report is not found', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [] });
      const result = await repo.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySessionId', () => {
    it('should return all pain reports for a session ordered by created_at', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const results = await repo.findBySessionId(sampleSessionId);
      expect(results).toHaveLength(1);
      expect(results[0].joint).toBe('hombro');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at ASC'),
        [sampleSessionId]
      );
    });
  });

  describe('findBySessionAndExercise', () => {
    it('should return pain reports for a specific exercise within a session', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const results = await repo.findBySessionAndExercise(sampleSessionId, sampleExerciseId);
      expect(results).toHaveLength(1);
      expect(results[0].exercise_id).toBe(sampleExerciseId);
    });
  });

  describe('findByAthleteAndJoint', () => {
    it('should return historical pain reports by joint for fatigue and rotation adjustments', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({
        rows: [sampleRow]
      });

      const results = await repo.findByAthleteAndJoint('athlete-123', 'hombro', 5);
      expect(results).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN session s ON epr.session_id = s.id'),
        ['athlete-123', 'hombro', 5]
      );
    });
  });

  describe('delete', () => {
    it('should delete a pain report and return true if removed', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], rowCount: 1 });

      const success = await repo.delete(sampleReportId);
      expect(success).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM exercise_pain_report'),
        [sampleReportId]
      );
    });

    it('should return false if pain report did not exist', async () => {
      vi.mocked(mockPool.query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const success = await repo.delete('non-existent-id');
      expect(success).toBe(false);
    });
  });
});
