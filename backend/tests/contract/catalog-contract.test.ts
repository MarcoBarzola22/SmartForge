import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { exerciseRepository } from '../../src/repositories/exercise.repository.js';
import {
  ExerciseSchema,
  ErrorResponseSchema
} from '../../src/schemas/generated/schemas.js';

describe('Contract Tests: Exercise Catalog Endpoints (RF-09, Constitución §1, §4)', () => {
  let app: Express;

  const sampleExercise = {
    id: 'squat_barbell',
    name: 'Sentadilla con barra',
    movement_pattern: 'rodilla_dominante' as const,
    primary_muscle: 'cuadriceps' as const,
    secondary_muscles: ['gluteos' as const],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.8,
    video_url: 'https://smartforge.app/videos/squat.mp4',
    video_fallback_url: 'https://smartforge.app/videos/squat-fallback.mp4',
    instructions: 'Coloca la barra sobre trapecios...',
    is_active: true
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    app = createApp();
  });

  describe('GET /api/exercises', () => {
    it('200 OK: response conforms to Array<ExerciseSchema>', async () => {
      vi.spyOn(exerciseRepository, 'findAll').mockResolvedValue([sampleExercise as any]);

      const res = await request(app)
        .get('/api/exercises')
        .query({ movement_pattern: 'rodilla_dominante', primary_muscle: 'cuadriceps' });

      expect(res.status).toBe(200);
      const parsed = z.array(ExerciseSchema).safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('GET /api/exercises/:id', () => {
    it('200 OK: response conforms to ExerciseSchema', async () => {
      vi.spyOn(exerciseRepository, 'findById').mockResolvedValue(sampleExercise as any);

      const res = await request(app).get('/api/exercises/squat_barbell');

      expect(res.status).toBe(200);
      const parsed = ExerciseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.id).toBe('squat_barbell');
    });

    it('404 Not Found: response conforms to ErrorResponseSchema when exercise does not exist', async () => {
      vi.spyOn(exerciseRepository, 'findById').mockResolvedValue(null);

      const res = await request(app).get('/api/exercises/non_existing_exercise');

      expect(res.status).toBe(404);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });
});
