import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { bodyWeightService } from '../../src/services/body-weight.service.js';
import {
  WeightLogItemSchema,
  WeightLogListResponseSchema,
  WeightLogResponseSchema,
  ErrorResponseSchema,
  ValidationErrorResponseSchema
} from '../../src/schemas/generated/schemas.js';
import { ConflictError, NotFoundError } from '../../src/errors/app-error.js';

describe('Contract Tests: Body Weight Endpoints (RF-01, RF-02, Constitución §1, §4)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const logId = '9ba7b810-9dad-11d1-80b4-00c04fd430cc';

  const validToken = jwt.sign(
    { id: athleteId, email: 'weight.athlete@smartforge.test', google_id: 'google-sub-weight' },
    jwtSecret
  );

  const sampleWeightItem = {
    id: logId,
    athlete_id: athleteId,
    weight_kg: 75.5,
    calendar_week_start: '2026-09-07',
    logged_date: '2026-09-09',
    delta_kg: -0.5,
    created_at: '2026-09-09T10:00:00.000Z',
    updated_at: '2026-09-09T10:00:00.000Z'
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;
    app = createApp();
  });

  describe('GET /athletes/me/weight-logs (RF-02)', () => {
    it('200 OK: response body conforms to WeightLogListResponseSchema', async () => {
      vi.spyOn(bodyWeightService, 'getHistory').mockResolvedValue([sampleWeightItem]);

      const res = await request(app)
        .get('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const parsed = WeightLogListResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.logs).toHaveLength(1);

      const itemParsed = WeightLogItemSchema.safeParse(res.body.logs[0]);
      expect(itemParsed.success).toBe(true);
    });

    it('401 Unauthorized: response conforms to ErrorResponseSchema when token is missing', async () => {
      const res = await request(app).get('/athletes/me/weight-logs');

      expect(res.status).toBe(401);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /athletes/me/weight-logs (RF-01)', () => {
    it('201 Created: response conforms to WeightLogResponseSchema', async () => {
      vi.spyOn(bodyWeightService, 'createLog').mockResolvedValue(sampleWeightItem);

      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          weight_kg: 75.5,
          logged_date: '2026-09-09'
        });

      expect(res.status).toBe(201);
      const parsed = WeightLogResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.log.id).toBe(logId);
    });

    it('400 Bad Request: response conforms to ValidationErrorResponseSchema on invalid weight payload', async () => {
      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          weight_kg: 25.0, // menor que el mínimo de 30.0 kg
          logged_date: '2026-09-09'
        });

      expect(res.status).toBe(400);
      const parsed = ValidationErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('409 Conflict: response conforms to ErrorResponseSchema on week collision', async () => {
      vi.spyOn(bodyWeightService, 'createLog').mockRejectedValue(
        new ConflictError('Ya existe un pesaje registrado para la semana del 2026-09-07.')
      );

      const res = await request(app)
        .post('/athletes/me/weight-logs')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          weight_kg: 75.5,
          logged_date: '2026-09-09'
        });

      expect(res.status).toBe(409);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.code).toBe('CONFLICT');
    });
  });

  describe('PUT /athletes/me/weight-logs/:id (RF-02)', () => {
    it('200 OK: response conforms to WeightLogResponseSchema on valid update', async () => {
      const updatedItem = { ...sampleWeightItem, weight_kg: 75.0, logged_date: '2026-09-10' };
      vi.spyOn(bodyWeightService, 'updateLog').mockResolvedValue(updatedItem);

      const res = await request(app)
        .put(`/athletes/me/weight-logs/${logId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          weight_kg: 75.0,
          logged_date: '2026-09-10'
        });

      expect(res.status).toBe(200);
      const parsed = WeightLogResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.log.weight_kg).toBe(75.0);
    });

    it('404 Not Found: response conforms to ErrorResponseSchema when log does not exist', async () => {
      vi.spyOn(bodyWeightService, 'updateLog').mockRejectedValue(
        new NotFoundError('Registro de pesaje no encontrado.')
      );

      const res = await request(app)
        .put(`/athletes/me/weight-logs/${logId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ weight_kg: 75.0 });

      expect(res.status).toBe(404);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });
});
