import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { signToken } from '../../src/middleware/auth.middleware.js';
import { RoutineTimeBlockConfigResponseSchema } from '../../src/schemas/generated/schemas.js';

describe('TASK-22: Routine Config Endpoints (GET /routines/config/time-blocks) (RF-03, RF-04)', () => {
  let app: Express;
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  const validToken = signToken({
    id: athleteId,
    email: 'athlete@smartforge.test',
    google_id: 'google-sub-123',
    name: 'Atleta Test'
  });

  beforeEach(() => {
    app = createApp();
  });

  it('should return 401 when token is missing', async () => {
    const res = await request(app).get('/routines/config/time-blocks');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('should return 200 with time blocks matrix when authenticated', async () => {
    const res = await request(app)
      .get('/routines/config/time-blocks')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available_blocks).toBeDefined();
    expect(Array.isArray(res.body.available_blocks)).toBe(true);
    expect(res.body.available_blocks).toHaveLength(6);

    // Validate against OpenAPI generated Zod schema
    const parsed = RoutineTimeBlockConfigResponseSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);

    const blocks = res.body.available_blocks;
    // 30 min: 2-3 exercises, recommended 2
    const block30 = blocks.find((b: any) => b.duration_minutes === 30);
    expect(block30).toEqual({
      duration_minutes: 30,
      min_exercises: 2,
      max_exercises: 3,
      recommended_exercises: 2
    });

    // 60 min: 2-5 exercises, recommended 4
    const block60 = blocks.find((b: any) => b.duration_minutes === 60);
    expect(block60).toEqual({
      duration_minutes: 60,
      min_exercises: 2,
      max_exercises: 5,
      recommended_exercises: 4
    });

    // 120 min: 4-7 exercises, recommended 7
    const block120 = blocks.find((b: any) => b.duration_minutes === 120);
    expect(block120).toEqual({
      duration_minutes: 120,
      min_exercises: 4,
      max_exercises: 7,
      recommended_exercises: 7
    });
  });

  it('should support /api prefix (/api/routines/config/time-blocks)', async () => {
    const res = await request(app)
      .get('/api/routines/config/time-blocks')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.available_blocks).toHaveLength(6);
  });
});
