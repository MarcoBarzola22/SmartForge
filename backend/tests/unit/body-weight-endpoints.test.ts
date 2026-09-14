import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { bodyWeightService } from '../../src/services/body-weight.service.js';
import { ConflictError, BadRequestError, NotFoundError } from '../../src/errors/app-error.js';
import { signToken } from '../../src/middleware/auth.middleware.js';

describe('TASK-21: Body Weight Endpoints and Controller (RF-01, RF-02)', () => {
  let app: Express;
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const logId = '9ba7b810-9dad-11d1-80b4-00c04fd430cc';

  const validToken = signToken({
    id: athleteId,
    email: 'athlete@smartforge.test',
    google_id: 'google-sub-123',
    name: 'Atleta Test'
  });

  const sampleWeightLogItem = {
    id: logId,
    athlete_id: athleteId,
    weight_kg: 75.5,
    calendar_week_start: '2026-03-09',
    logged_date: '2026-03-11',
    delta_kg: -0.5,
    created_at: '2026-03-11T10:00:00.000Z',
    updated_at: '2026-03-11T10:00:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /athletes/me/weight-logs (RF-02)', () => {
    it('should return 401 when token is missing', async () => {
      const res = await request(app).get('/athletes/me/weight-logs');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should return 200 with weight log history when authenticated', async () => {
      vi.spyOn(bodyWeightService, 'getHistory').mockResolvedValue([sampleWeightLogItem]);

      const res = await request(app)
        .get('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
      expect(res.body.logs[0].id).toBe(logId);
      expect(res.body.logs[0].weight_kg).toBe(75.5);
    });

    it('should support /api prefix (/api/athletes/me/weight-logs)', async () => {
      vi.spyOn(bodyWeightService, 'getHistory').mockResolvedValue([sampleWeightLogItem]);

      const res = await request(app)
        .get('/api/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(1);
    });
  });

  describe('POST /athletes/me/weight-logs (RF-01)', () => {
    it('should return 401 when token is missing', async () => {
      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .send({ weight_kg: 75.5, logged_date: '2026-03-11' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when validation fails (e.g. weightKg < 30)', async () => {
      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 25.0, logged_date: '2026-03-11' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when validation fails (e.g. weightKg > 300)', async () => {
      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 350.0, logged_date: '2026-03-11' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 201 with created log on valid input', async () => {
      vi.spyOn(bodyWeightService, 'createLog').mockResolvedValue(sampleWeightLogItem);

      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 75.5, logged_date: '2026-03-11' });

      expect(res.status).toBe(201);
      expect(res.body.log).toBeDefined();
      expect(res.body.log.id).toBe(logId);
      expect(res.body.log.weight_kg).toBe(75.5);
    });

    it('should support camelCase weightKg and loggedDate payload', async () => {
      vi.spyOn(bodyWeightService, 'createLog').mockResolvedValue(sampleWeightLogItem);

      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weightKg: 75.5, loggedDate: '2026-03-11' });

      expect(res.status).toBe(201);
      expect(res.body.log).toBeDefined();
    });

    it('should return 409 when service throws ConflictError (calendar week duplicate)', async () => {
      vi.spyOn(bodyWeightService, 'createLog').mockRejectedValue(
        new ConflictError('Ya existe un pesaje registrado para la semana del 2026-03-09.')
      );

      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 75.5, logged_date: '2026-03-11' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });

    it('should return 400 when service throws BadRequestError (120h guard violated)', async () => {
      vi.spyOn(bodyWeightService, 'createLog').mockRejectedValue(
        new BadRequestError('Para garantizar la consistencia de tu tendencia, debe existir un intervalo de al menos 5 días entre pesajes.')
      );

      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 75.5, logged_date: '2026-03-11' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
    });
  });

  describe('PUT /athletes/me/weight-logs/:id (RF-02)', () => {
    it('should return 401 when token is missing', async () => {
      const res = await request(app)
        .put(`/athletes/me/weight-logs/${logId}`)
        .send({ weight_kg: 76.0 });

      expect(res.status).toBe(401);
    });

    it('should return 400 when id is not a valid UUID', async () => {
      const res = await request(app)
        .put('/athletes/me/weight-logs/invalid-uuid')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 76.0 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 200 with updated log on valid input', async () => {
      const updatedLog = { ...sampleWeightLogItem, weight_kg: 76.0 };
      vi.spyOn(bodyWeightService, 'updateLog').mockResolvedValue(updatedLog);

      const res = await request(app)
        .put(`/athletes/me/weight-logs/${logId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 76.0 });

      expect(res.status).toBe(200);
      expect(res.body.log.weight_kg).toBe(76.0);
    });

    it('should return 404 when log is not found', async () => {
      vi.spyOn(bodyWeightService, 'updateLog').mockRejectedValue(
        new NotFoundError('Registro de pesaje no encontrado.')
      );

      const res = await request(app)
        .put(`/athletes/me/weight-logs/${logId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 76.0 });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /athletes/me/weight-logs/:id (RF-02)', () => {
    it('should return 200 on successful deletion', async () => {
      vi.spyOn(bodyWeightService, 'deleteLog').mockResolvedValue({
        success: true,
        message: 'Registro de pesaje eliminado exitosamente.'
      });

      const res = await request(app)
        .delete(`/athletes/me/weight-logs/${logId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
