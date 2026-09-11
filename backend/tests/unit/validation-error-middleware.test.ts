import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { validateBody, validateQuery, validateParams } from '../../src/middleware/validate.middleware.js';
import { errorHandler } from '../../src/middleware/error-handler.middleware.js';
import { AppError } from '../../src/errors/app-error.js';
import {
  CreateProfileRequestSchema,
  CreateSetLogRequestSchema
} from '../../src/schemas/generated/schemas.js';
import { z } from 'zod';

describe('TASK-10: Validation and Error Handling Middleware', () => {
  const createTestApp = () => {
    const app = express();
    app.use(express.json());

    app.post('/test/profile', validateBody(CreateProfileRequestSchema), (req, res) => {
      res.status(201).json({ success: true, data: req.body });
    });

    app.post('/test/sets', validateBody(CreateSetLogRequestSchema), (req, res) => {
      res.status(201).json({ success: true, data: req.body });
    });

    app.get(
      '/test/query',
      validateQuery(z.object({ limit: z.string().optional(), page: z.string().optional() })),
      (req, res) => {
        res.status(200).json({ success: true, query: req.query });
      }
    );

    app.get(
      '/test/params/:id',
      validateParams(z.object({ id: z.string().uuid() })),
      (req, res) => {
        res.status(200).json({ success: true, params: req.params });
      }
    );

    app.get('/test/custom-error', (_req, _res, next) => {
      next(new AppError(409, 'CONFLICT', 'El atleta ya tiene un perfil activo.'));
    });

    app.get('/test/unhandled-error', (_req, _res, next) => {
      next(new Error('Unexpected database failure'));
    });

    app.use(errorHandler);
    return app;
  };

  it('should allow valid request body and return 201', async () => {
    const app = createTestApp();
    const validProfile = {
      name: 'Carlos Ruiz',
      age: 25,
      weight_kg: 80.5,
      experience_level: 'intermedio',
      training_goal: 'hipertrofia',
      available_days_per_week: 4,
      equipment_ids: ['barbell', 'dumbbells']
    };

    const res = await request(app).post('/test/profile').send(validProfile);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject invalid profile with age < 16 and return 400 with Spanish error details', async () => {
    const app = createTestApp();
    const invalidProfile = {
      name: 'Carlos Ruiz',
      age: 14, // Invalid: min 16
      weight_kg: 80.5,
      experience_level: 'intermedio',
      training_goal: 'hipertrofia',
      available_days_per_week: 4,
      equipment_ids: ['barbell']
    };

    const res = await request(app).post('/test/profile').send(invalidProfile);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toBeInstanceOf(Array);
    expect(res.body.details.length).toBeGreaterThanOrEqual(1);
    expect(res.body.details[0].field).toBe('age');
  });

  it('should reject set log with RIR > 5 and return 400', async () => {
    const app = createTestApp();
    const invalidSet = {
      exercise_id: 'barbell_bench_press',
      set_number: 1,
      reps_completed: 8,
      weight_kg: 60,
      rir: 6, // Invalid: max 5
      client_timestamp: new Date().toISOString()
    };

    const res = await request(app).post('/test/sets').send(invalidSet);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details[0].field).toBe('rir');
  });

  it('should validate route params with UUID validation', async () => {
    const app = createTestApp();
    const invalidRes = await request(app).get('/test/params/not-a-uuid');
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.code).toBe('VALIDATION_ERROR');

    const validRes = await request(app).get('/test/params/123e4567-e89b-12d3-a456-426614174000');
    expect(validRes.status).toBe(200);
  });

  it('should handle custom AppError with proper HTTP status and structured JSON', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/custom-error');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(res.body.error).toBe('El atleta ya tiene un perfil activo.');
  });

  it('should handle unhandled errors with 500 status and generic Spanish message', async () => {
    const app = createTestApp();
    const res = await request(app).get('/test/unhandled-error');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.error).toBe('Error interno del servidor.');
  });
});
