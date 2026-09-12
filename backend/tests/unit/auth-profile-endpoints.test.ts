import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { signToken } from '../../src/middleware/auth.middleware.js';
import type { AthleteProfile } from '../../src/schemas/generated/schemas.js';

describe('TASK-23: Auth and Profile Endpoints and Controllers', () => {
  const sampleAthlete: AthleteProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    google_id: 'google-uid-12345',
    email: 'athlete@example.com',
    name: 'Carlos Ruiz',
    age: 25,
    weight_kg: 78.5,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra Olímpica', category: 'barras_y_discos' },
      { id: 'rack', name: 'Rack de Sentadillas', category: 'soportes' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const validToken = signToken({
    id: sampleAthlete.id,
    email: sampleAthlete.email,
    google_id: sampleAthlete.google_id,
    name: sampleAthlete.name
  });

  const onboardingToken = signToken({
    email: 'newbie@example.com',
    google_id: 'google-uid-999',
    name: 'New Athlete'
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const app = createApp();
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is invalid', async () => {
      const app = createApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-garbage-token');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 200 with athlete profile for valid token', async () => {
      vi.spyOn(athleteRepository, 'findById').mockResolvedValue(sampleAthlete);

      const app = createApp();
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(sampleAthlete.id);
      expect(res.body.email).toBe(sampleAthlete.email);
      expect(res.body.equipment).toHaveLength(2);
    });
  });

  describe('GET /api/auth/google', () => {
    it('should redirect (302) to Google OAuth URL', async () => {
      const app = createApp();
      const res = await request(app).get('/api/auth/google').redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('accounts.google.com');
    });
  });

  describe('POST /api/profile (Onboarding)', () => {
    it('should return 401 when unauthenticated', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/profile')
        .send({
          name: 'Carlos Ruiz',
          age: 25,
          weight_kg: 78.5,
          experience_level: 'intermedio',
          training_goal: 'hipertrofia',
          available_days_per_week: 4,
          equipment_ids: ['barbell']
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 when validation fails (e.g., age < 16)', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${onboardingToken}`)
        .send({
          name: 'Young Athlete',
          age: 14,
          weight_kg: 60,
          experience_level: 'principiante',
          training_goal: 'fuerza',
          available_days_per_week: 3,
          equipment_ids: ['barbell']
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
    });

    it('should return 409 when email or Google ID is already registered (CA-01.3)', async () => {
      vi.spyOn(athleteRepository, 'findByGoogleId').mockResolvedValue(sampleAthlete);

      const app = createApp();
      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          name: 'Carlos Ruiz',
          age: 25,
          weight_kg: 78.5,
          experience_level: 'intermedio',
          training_goal: 'hipertrofia',
          available_days_per_week: 4,
          equipment_ids: ['barbell']
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });

    it('should return 201 with created profile when payload is valid', async () => {
      vi.spyOn(athleteRepository, 'findByGoogleId').mockResolvedValue(null);
      vi.spyOn(athleteRepository, 'findByEmail').mockResolvedValue(null);
      vi.spyOn(athleteRepository, 'create').mockResolvedValue(sampleAthlete);

      const app = createApp();
      const res = await request(app)
        .post('/api/profile')
        .set('Authorization', `Bearer ${onboardingToken}`)
        .send({
          name: 'Carlos Ruiz',
          age: 25,
          weight_kg: 78.5,
          experience_level: 'intermedio',
          training_goal: 'hipertrofia',
          available_days_per_week: 4,
          equipment_ids: ['barbell', 'rack']
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(sampleAthlete.id);
      expect(res.body.name).toBe('Carlos Ruiz');
    });
  });

  describe('PUT /api/profile', () => {
    it('should return 401 when unauthenticated', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/profile')
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when invalid payload format', async () => {
      const app = createApp();
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 10 }); // min is 20 in schema

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 200 with updated profile when valid', async () => {
      const updatedAthlete = { ...sampleAthlete, weight_kg: 82.0 };
      vi.spyOn(athleteRepository, 'findById').mockResolvedValue(sampleAthlete);
      vi.spyOn(athleteRepository, 'update').mockResolvedValue(updatedAthlete);

      const app = createApp();
      const res = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 82.0 });

      expect(res.status).toBe(200);
      expect(res.body.weight_kg).toBe(82.0);
    });
  });

  describe('DELETE /api/profile', () => {
    it('should return 401 when unauthenticated', async () => {
      const app = createApp();
      const res = await request(app).delete('/api/profile');

      expect(res.status).toBe(401);
    });

    it('should return 200 and soft-delete profile successfully', async () => {
      vi.spyOn(athleteRepository, 'findById').mockResolvedValue(sampleAthlete);
      vi.spyOn(athleteRepository, 'softDelete').mockResolvedValue(true);

      const app = createApp();
      const res = await request(app)
        .delete('/api/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('eliminada');
    });
  });
});
