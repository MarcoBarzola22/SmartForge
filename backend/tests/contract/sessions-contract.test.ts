import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';
import { checkinRepository } from '../../src/repositories/checkin.repository.js';
import { setLogRepository } from '../../src/repositories/set-log.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';
import {
  TrainingSessionSchema,
  CheckInResponseSchema,
  SetLogSchema,
  PainReportSchema,
  ValidationErrorResponseSchema
} from '../../src/schemas/generated/schemas.js';

describe('Contract Tests: Sessions, Check-ins, Sets & Pain Reports Endpoints (RF-04, RF-05, RF-06, Constitución §1, §4)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const sessionId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';
  const sessionPlanId = '8ba7b810-9dad-11d1-80b4-00c04fd430ca';
  const setId = '9ba7b810-9dad-11d1-80b4-00c04fd430cb';
  const checkinId = 'aba7b810-9dad-11d1-80b4-00c04fd430cc';
  const painId = 'bba7b810-9dad-11d1-80b4-00c04fd430cd';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'session.contract@smartforge.test',
      google_id: 'google-sub-session'
    },
    jwtSecret
  );

  const sampleSession = {
    id: sessionId,
    athlete_id: athleteId,
    session_plan_id: sessionPlanId,
    status: 'in_progress' as const,
    started_at: '2026-09-12T10:00:00.000Z'
  };

  const sampleCheckin = {
    id: checkinId,
    session_id: sessionId,
    fatigue_level: 3,
    joint_pains: [{ joint: 'hombro' as const, side: 'derecha' as const, intensity: 'moderada' as const }],
    created_at: '2026-09-12T10:01:00.000Z'
  };

  const sampleSetLog = {
    id: setId,
    session_id: sessionId,
    exercise_id: 'bench_press_barbell',
    set_number: 1,
    reps_completed: 10,
    weight_kg: 80,
    rir: 2,
    client_timestamp: '2026-09-12T10:05:00.000Z',
    created_at: '2026-09-12T10:05:00.000Z'
  };

  const samplePainReport = {
    id: painId,
    session_id: sessionId,
    exercise_id: 'bench_press_barbell',
    joint: 'codo' as const,
    side: 'izquierda' as const,
    intensity: 'leve' as const,
    notes: 'Ligera molestia en bloqueo',
    created_at: '2026-09-12T10:15:00.000Z'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;

    vi.spyOn(sessionRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === sessionId) return sampleSession as any;
      return null;
    });

    vi.spyOn(checkinRepository, 'findBySessionId').mockResolvedValue(null);
    vi.spyOn(setLogRepository, 'findBySessionId').mockResolvedValue([]);
    vi.spyOn(painReportRepository, 'findBySessionId').mockResolvedValue([]);

    app = createApp();
  });

  describe('POST /api/sessions', () => {
    it('201 Created: response conforms to TrainingSessionSchema', async () => {
      vi.spyOn(sessionRepository, 'create').mockResolvedValue(sampleSession as any);

      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ session_plan_id: sessionPlanId });

      expect(res.status).toBe(201);
      const parsed = TrainingSessionSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.id).toBe(sessionId);
    });

    it('400 Bad Request: response conforms to ValidationErrorResponseSchema on invalid plan uuid', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ session_plan_id: 'invalid-uuid' });

      expect(res.status).toBe(400);
      const parsed = ValidationErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });

  describe('POST /api/sessions/:id/checkin', () => {
    it('201 Created: response conforms to CheckInResponseSchema', async () => {
      vi.spyOn(checkinRepository, 'create').mockResolvedValue(sampleCheckin as any);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/checkin`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          fatigue_level: 3,
          joint_pains: [{ joint: 'hombro', side: 'derecha', intensity: 'moderada' }]
        });

      expect(res.status).toBe(201);
      const parsed = CheckInResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.fatigue_level).toBe(3);
    });
  });

  describe('POST /api/sessions/:id/sets', () => {
    it('201 Created: response conforms to SetLogSchema', async () => {
      vi.spyOn(setLogRepository, 'create').mockResolvedValue(sampleSetLog as any);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/sets`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          exercise_id: 'bench_press_barbell',
          set_number: 1,
          reps_completed: 10,
          weight_kg: 80,
          rir: 2,
          client_timestamp: '2026-09-12T10:05:00.000Z'
        });

      expect(res.status).toBe(201);
      const parsed = SetLogSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.weight_kg).toBe(80);
    });
  });

  describe('PUT /api/sets/:id', () => {
    it('200 OK: response conforms to SetLogSchema on update', async () => {
      vi.spyOn(setLogRepository, 'findById').mockResolvedValue(sampleSetLog as any);
      vi.spyOn(setLogRepository, 'update').mockResolvedValue({
        ...sampleSetLog,
        reps_completed: 12
      } as any);

      const res = await request(app)
        .put(`/api/sets/${setId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ reps_completed: 12 });

      expect(res.status).toBe(200);
      const parsed = SetLogSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.reps_completed).toBe(12);
    });
  });

  describe('DELETE /api/sets/:id', () => {
    it('204 No Content: successfully deletes set log', async () => {
      vi.spyOn(setLogRepository, 'findById').mockResolvedValue(sampleSetLog as any);
      vi.spyOn(setLogRepository, 'delete').mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/sets/${setId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });
  });

  describe('POST /api/sessions/:id/pain-reports', () => {
    it('201 Created: response conforms to PainReportSchema', async () => {
      vi.spyOn(painReportRepository, 'create').mockResolvedValue(samplePainReport as any);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/pain-reports`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          exercise_id: 'bench_press_barbell',
          joint: 'codo',
          side: 'izquierda',
          intensity: 'leve',
          notes: 'Ligera molestia en bloqueo'
        });

      expect(res.status).toBe(201);
      const parsed = PainReportSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.joint).toBe('codo');
    });
  });

  describe('PATCH /api/sessions/:id/complete', () => {
    it('200 OK: response conforms to TrainingSessionSchema when completed', async () => {
      const completedSession = {
        ...sampleSession,
        status: 'completed' as const,
        completed_at: '2026-09-12T11:15:00.000Z'
      };

      vi.spyOn(sessionRepository, 'updateStatus').mockResolvedValue(completedSession as any);

      const res = await request(app)
        .patch(`/api/sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const parsed = TrainingSessionSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.status).toBe('completed');
    });
  });
});
