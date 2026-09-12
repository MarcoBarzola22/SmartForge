import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';
import { setLogRepository } from '../../src/repositories/set-log.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';
import { checkinRepository } from '../../src/repositories/checkin.repository.js';
import {
  SetLogSchema,
  PainReportSchema,
  TrainingSessionSchema
} from '../../src/schemas/generated/schemas.js';
import jwt from 'jsonwebtoken';

describe('TASK-40: Sets, Pain Reports and Session Completion Endpoints', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const otherAthleteId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';
  const sessionId = '8ba7b810-9dad-11d1-80b4-00c04fd430ca';
  const setId = 'cba7b810-9dad-11d1-80b4-00c04fd430ce';
  const painReportId = 'dba7b810-9dad-11d1-80b4-00c04fd430cf';
  const exerciseId = 'barbell_bench_press';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'athlete@smartforge.test',
      google_id: 'google-sub-123'
    },
    jwtSecret
  );

  const sampleSession = {
    id: sessionId,
    athlete_id: athleteId,
    session_plan_id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
    status: 'in_progress' as const,
    started_at: new Date().toISOString(),
    completed_at: undefined,
    client_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleSet = {
    id: setId,
    session_id: sessionId,
    exercise_id: exerciseId,
    exercise_assignment_id: undefined,
    set_number: 1,
    reps_completed: 10,
    weight_kg: 80,
    rir: 2,
    client_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const samplePainReport = {
    id: painReportId,
    session_id: sessionId,
    exercise_id: exerciseId,
    exercise_assignment_id: undefined,
    joint: 'hombro' as const,
    side: 'derecha' as const,
    intensity: 'moderada' as const,
    notes: 'Pinchazo en fase excéntrica',
    client_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    vi.restoreAllMocks();

    vi.spyOn(sessionRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === sessionId) return sampleSession;
      return null;
    });

    vi.spyOn(setLogRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === setId) return sampleSet;
      return null;
    });

    vi.spyOn(setLogRepository, 'findBySessionId').mockResolvedValue([sampleSet]);
    vi.spyOn(painReportRepository, 'findBySessionId').mockResolvedValue([samplePainReport]);
    vi.spyOn(checkinRepository, 'findBySessionId').mockResolvedValue(null);

    app = createApp();
  });

  describe('POST /api/sessions/:id/sets', () => {
    const validSetPayload = {
      exercise_id: exerciseId,
      set_number: 1,
      reps_completed: 10,
      weight_kg: 80,
      rir: 2,
      client_timestamp: new Date().toISOString()
    };

    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/sets`)
        .send(validSetPayload);

      expect(res.status).toBe(401);
    });

    it('should return 400 when RIR > 5 (CL-05)', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/sets`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...validSetPayload, rir: 6 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when weight is negative (CL-05)', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/sets`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...validSetPayload, weight_kg: -5 });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 201 with SetLog on valid set logging (RF-05, Constitución §3, §4)', async () => {
      vi.spyOn(setLogRepository, 'create').mockResolvedValueOnce(sampleSet);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/sets`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(validSetPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(setId);
      expect(res.body.reps_completed).toBe(10);
      expect(res.body.weight_kg).toBe(80);
      expect(res.body.rir).toBe(2);

      const parsed = SetLogSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });

  describe('PUT /api/sets/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .put(`/api/sets/${setId}`)
        .send({ reps_completed: 12 });

      expect(res.status).toBe(401);
    });

    it('should return 200 with updated SetLog (RF-05, CA-05.4)', async () => {
      const updatedSet = { ...sampleSet, reps_completed: 12, weight_kg: 82.5, rir: 1 };
      vi.spyOn(setLogRepository, 'update').mockResolvedValueOnce(updatedSet);

      const res = await request(app)
        .put(`/api/sets/${setId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ reps_completed: 12, weight_kg: 82.5, rir: 1 });

      expect(res.status).toBe(200);
      expect(res.body.reps_completed).toBe(12);
      expect(res.body.weight_kg).toBe(82.5);
      expect(res.body.rir).toBe(1);

      const parsed = SetLogSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });

  describe('DELETE /api/sets/:id', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).delete(`/api/sets/${setId}`);
      expect(res.status).toBe(401);
    });

    it('should return 204 No Content on successful set deletion (RF-05, CA-05.4)', async () => {
      vi.spyOn(setLogRepository, 'delete').mockResolvedValueOnce(true);

      const res = await request(app)
        .delete(`/api/sets/${setId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(204);
      expect(res.text).toBe('');
    });
  });

  describe('POST /api/sessions/:id/pain-reports', () => {
    const validPainPayload = {
      exercise_id: exerciseId,
      joint: 'hombro',
      side: 'derecha',
      intensity: 'moderada',
      notes: 'Pinchazo en fase excéntrica'
    };

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/pain-reports`)
        .send(validPainPayload);

      expect(res.status).toBe(401);
    });

    it('should return 400 with invalid joint or intensity', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/pain-reports`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ ...validPainPayload, joint: 'cuello' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 201 with PainReport on valid pain submission (RF-06, Constitución §3, §4)', async () => {
      vi.spyOn(painReportRepository, 'create').mockResolvedValueOnce(samplePainReport);

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/pain-reports`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPainPayload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(painReportId);
      expect(res.body.joint).toBe('hombro');
      expect(res.body.side).toBe('derecha');
      expect(res.body.intensity).toBe('moderada');

      const parsed = PainReportSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });

  describe('PATCH /api/sessions/:id/complete', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).patch(`/api/sessions/${sessionId}/complete`);
      expect(res.status).toBe(401);
    });

    it('should return 404 if session does not exist', async () => {
      const res = await request(app)
        .patch('/api/sessions/00000000-0000-0000-0000-000000000000/complete')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 if session belongs to another athlete', async () => {
      const otherToken = jwt.sign(
        {
          id: otherAthleteId,
          email: 'other@smartforge.test',
          google_id: 'google-sub-456'
        },
        jwtSecret
      );

      const res = await request(app)
        .patch(`/api/sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 200 with completed TrainingSession conforming to OpenAPI schema', async () => {
      const completedSession = {
        ...sampleSession,
        status: 'completed' as const,
        completed_at: new Date().toISOString()
      };
      vi.spyOn(sessionRepository, 'updateStatus').mockResolvedValueOnce(completedSession);

      const res = await request(app)
        .patch(`/api/sessions/${sessionId}/complete`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(sessionId);
      expect(res.body.status).toBe('completed');
      expect(res.body.completed_at).toBeDefined();
      expect(res.body.set_logs).toHaveLength(1);
      expect(res.body.pain_reports).toHaveLength(1);

      const parsed = TrainingSessionSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });
});
