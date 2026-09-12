import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';
import { checkinRepository } from '../../src/repositories/checkin.repository.js';
import {
  TrainingSessionSchema,
  CheckInResponseSchema
} from '../../src/schemas/generated/schemas.js';
import jwt from 'jsonwebtoken';

describe('TASK-36: Session & Check-in Endpoints (POST /api/sessions, POST /api/sessions/:id/checkin)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const otherAthleteId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';
  const sessionId = '8ba7b810-9dad-11d1-80b4-00c04fd430ca';
  const sessionPlanId = '9ba7b810-9dad-11d1-80b4-00c04fd430cb';
  const checkinId = 'aba7b810-9dad-11d1-80b4-00c04fd430cc';

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
    session_plan_id: sessionPlanId,
    status: 'in_progress' as const,
    started_at: new Date().toISOString(),
    completed_at: undefined,
    client_timestamp: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleCheckin = {
    id: checkinId,
    session_id: sessionId,
    fatigue_level: 3,
    joint_pains: [
      { joint: 'hombro' as const, side: 'derecha' as const, intensity: 'leve' as const },
      { joint: 'rodilla' as const, side: 'izquierda' as const, intensity: 'moderada' as const }
    ],
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    vi.restoreAllMocks();

    vi.spyOn(sessionRepository, 'create').mockImplementation(async (data) => ({
      id: sessionId,
      athlete_id: data.athlete_id,
      session_plan_id: data.session_plan_id,
      status: 'in_progress',
      started_at: data.started_at || new Date().toISOString(),
      completed_at: undefined,
      client_timestamp: data.client_timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    vi.spyOn(sessionRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === sessionId) return sampleSession;
      return null;
    });

    vi.spyOn(checkinRepository, 'findBySessionId').mockImplementation(async (_sId: string) => null);

    vi.spyOn(checkinRepository, 'create').mockImplementation(async (data) => ({
      id: checkinId,
      session_id: data.session_id,
      fatigue_level: data.fatigue_level,
      joint_pains: data.joint_pains,
      created_at: new Date().toISOString()
    }));

    app = createApp();
  });

  describe('POST /api/sessions', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .send({ session_plan_id: sessionPlanId });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 400 when session_plan_id is missing or not a uuid', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ session_plan_id: 'not-a-valid-uuid' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 201 with created TrainingSession conforming to OpenAPI schema (RF-04, Constitución §3, §4)', async () => {
      const res = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ session_plan_id: sessionPlanId });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(sessionId);
      expect(res.body.athlete_id).toBe(athleteId);
      expect(res.body.session_plan_id).toBe(sessionPlanId);
      expect(res.body.status).toBe('in_progress');

      const parsed = TrainingSessionSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(sessionRepository.create).toHaveBeenCalledWith({
        athlete_id: athleteId,
        session_plan_id: sessionPlanId
      });
    });
  });

  describe('POST /api/sessions/:id/checkin', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/checkin`)
        .send({
          fatigue_level: 3,
          joint_pains: []
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 400 when fatigue_level is outside 1-5 range', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/checkin`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          fatigue_level: 6,
          joint_pains: []
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when joint_pains item is invalid', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/checkin`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          fatigue_level: 3,
          joint_pains: [{ joint: 'invalid_joint', side: 'derecha', intensity: 'leve' }]
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 404 when session is not found', async () => {
      const res = await request(app)
        .post('/api/sessions/00000000-0000-0000-0000-000000000000/checkin')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          fatigue_level: 3,
          joint_pains: []
        });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 404 when session belongs to another athlete', async () => {
      const otherToken = jwt.sign(
        {
          id: otherAthleteId,
          email: 'other@smartforge.test',
          google_id: 'google-sub-456'
        },
        jwtSecret
      );

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/checkin`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          fatigue_level: 3,
          joint_pains: []
        });

      expect(res.status).toBe(404);
    });

    it('should return 409 when check-in has already been submitted for this session', async () => {
      vi.spyOn(checkinRepository, 'findBySessionId').mockResolvedValueOnce({
        id: 'existing-checkin',
        session_id: sessionId,
        fatigue_level: 2,
        joint_pains: [],
        created_at: new Date().toISOString()
      });

      const res = await request(app)
        .post(`/api/sessions/${sessionId}/checkin`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          fatigue_level: 3,
          joint_pains: []
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('code', 'CONFLICT');
    });

    it('should return 201 with created CheckInResponse conforming to OpenAPI schema (RF-04, CA-04.1, CA-04.2, CA-04.3, CA-04.4)', async () => {
      const res = await request(app)
        .post(`/api/sessions/${sessionId}/checkin`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          fatigue_level: 3,
          joint_pains: sampleCheckin.joint_pains
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(checkinId);
      expect(res.body.session_id).toBe(sessionId);
      expect(res.body.fatigue_level).toBe(3);
      expect(res.body.joint_pains).toHaveLength(2);

      const parsed = CheckInResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);

      expect(checkinRepository.create).toHaveBeenCalledWith({
        session_id: sessionId,
        fatigue_level: 3,
        joint_pains: sampleCheckin.joint_pains,
        client_timestamp: undefined
      });
    });
  });
});
