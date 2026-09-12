import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import {
  AthleteProfileSchema,
  ErrorResponseSchema,
  ValidationErrorResponseSchema
} from '../../src/schemas/generated/schemas.js';
import type { AthleteProfile } from '../../src/schemas/generated/schemas.js';

describe('Contract Tests: Auth & Profile Endpoints (RF-01, Constitución §1, §4)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'contract.athlete@smartforge.test',
      google_id: 'google-sub-contract'
    },
    jwtSecret
  );

  const onboardingToken = jwt.sign(
    {
      email: 'newbie@smartforge.test',
      google_id: 'google-sub-newbie',
      name: 'Nuevo Atleta'
    },
    jwtSecret
  );

  const sampleAthlete: AthleteProfile = {
    id: athleteId,
    google_id: 'google-sub-contract',
    email: 'contract.athlete@smartforge.test',
    name: 'Atleta Contrato',
    age: 25,
    weight_kg: 75.5,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [{ id: 'barbell', name: 'Barra', category: 'barras' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;

    vi.spyOn(athleteRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === athleteId) return sampleAthlete as any;
      return null;
    });

    vi.spyOn(athleteRepository, 'findByGoogleId').mockResolvedValue(null);
    vi.spyOn(athleteRepository, 'findByEmail').mockResolvedValue(null);

    app = createApp();
  });

  describe('GET /api/auth/me', () => {
    it('200 OK: response conforms to AthleteProfileSchema', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const parsed = AthleteProfileSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.id).toBe(athleteId);
    });

    it('401 Unauthorized: response conforms to ErrorResponseSchema when missing token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });

  describe('POST /api/profile', () => {
    const validBody = {
      name: 'Nuevo Atleta',
      age: 26,
      weight_kg: 80,
      experience_level: 'principiante',
      training_goal: 'fuerza',
      available_days_per_week: 3,
      equipment_ids: ['barbell', 'dumbbell']
    };

    it('201 Created: response conforms to AthleteProfileSchema', async () => {
      vi.spyOn(athleteRepository, 'create').mockResolvedValue(sampleAthlete as any);

      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${onboardingToken}`)
        .send(validBody);

      expect(res.status).toBe(201);
      const parsed = AthleteProfileSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });

    it('400 Bad Request: response conforms to ValidationErrorResponseSchema on invalid payload', async () => {
      const invalidBody = {
        name: '',
        age: 14, // below min 16
        weight_kg: -5,
        experience_level: 'invalid_level',
        training_goal: 'invalid_goal',
        available_days_per_week: 10,
        equipment_ids: []
      };

      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidBody);

      expect(res.status).toBe(400);
      const parsed = ValidationErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/profile', () => {
    it('200 OK: response conforms to AthleteProfileSchema on valid update', async () => {
      vi.spyOn(athleteRepository, 'update').mockResolvedValue({
        ...sampleAthlete,
        weight_kg: 78
      } as any);

      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 78 });

      expect(res.status).toBe(200);
      const parsed = AthleteProfileSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.weight_kg).toBe(78);
    });

    it('400 Bad Request: response conforms to ValidationErrorResponseSchema on invalid update', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: -10 });

      expect(res.status).toBe(400);
      const parsed = ValidationErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });

  describe('DELETE /api/profile', () => {
    it('200 OK: soft-deletes profile successfully', async () => {
      vi.spyOn(athleteRepository, 'softDelete').mockResolvedValue(true);

      const res = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
