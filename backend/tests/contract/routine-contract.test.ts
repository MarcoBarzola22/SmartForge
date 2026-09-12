import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { exerciseRepository } from '../../src/repositories/exercise.repository.js';
import { exerciseSwapRepository } from '../../src/repositories/exercise-swap.repository.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import {
  ExerciseAlternativeSchema,
  ExerciseAssignmentSchema,
  ValidationErrorResponseSchema
} from '../../src/schemas/generated/schemas.js';

describe('Contract Tests: Routine & Exercise Swap Endpoints (RF-03, Constitución §1, §4)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const assignmentId = 'aba7b810-9dad-11d1-80b4-00c04fd430cc';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'routine.athlete@smartforge.test',
      google_id: 'google-sub-routine'
    },
    jwtSecret
  );

  const sampleAthlete = {
    id: athleteId,
    google_id: 'google-sub-routine',
    email: 'routine.athlete@smartforge.test',
    name: 'Atleta Test',
    age: 25,
    weight_kg: 80,
    experience_level: 'intermedio' as const,
    training_goal: 'hipertrofia' as const,
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra', category: 'barras' },
      { id: 'dumbbell', name: 'Mancuernas', category: 'mancuernas' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleOriginalExercise = {
    id: 'bench_press_barbell',
    name: 'Press de banca con barra',
    movement_pattern: 'empuje' as const,
    primary_muscle: 'pecho' as const,
    secondary_muscles: ['triceps' as const],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.75,
    video_url: 'https://smartforge.app/videos/bench-press.mp4',
    video_fallback_url: 'https://smartforge.app/videos/bench-press-fallback.mp4',
    instructions: 'Empuja la barra.',
    is_active: true
  };

  const sampleAlternativeExercise = {
    id: 'bench_press_dumbbell',
    name: 'Press de banca con mancuernas',
    movement_pattern: 'empuje' as const,
    primary_muscle: 'pecho' as const,
    secondary_muscles: ['triceps' as const],
    equipment_id: 'dumbbell',
    is_compound: true,
    initial_load_ratio: 0.6,
    video_url: 'https://smartforge.app/videos/bench-press-db.mp4',
    video_fallback_url: 'https://smartforge.app/videos/bench-press-db-fallback.mp4',
    instructions: 'Empuja mancuernas.',
    is_active: true
  };

  const sampleAlternative = {
    original_exercise_id: 'bench_press_barbell',
    alternative_exercise: sampleAlternativeExercise,
    similarity_score: 0.95
  };

  const sampleAssignment = {
    id: assignmentId,
    session_plan_id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
    exercise_id: 'bench_press_barbell',
    exercise: sampleOriginalExercise,
    order_in_session: 1,
    target_sets: 4,
    target_reps: 10,
    target_rir: 2,
    target_load_kg: 60,
    is_swapped: false,
    athlete_id: athleteId,
    mesocycle_id: 'meso_1',
    week_number: 1,
    day_number: 1
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;

    vi.spyOn(athleteRepository, 'findById').mockResolvedValue(sampleAthlete as any);
    app = createApp();
  });

  describe('GET /api/exercises/:id/alternatives', () => {
    it('200 OK: response conforms to Array<ExerciseAlternativeSchema>', async () => {
      vi.spyOn(exerciseRepository, 'findById').mockResolvedValue(sampleOriginalExercise as any);
      vi.spyOn(exerciseRepository, 'findAlternatives').mockResolvedValue([sampleAlternative as any]);

      const res = await request(app)
        .get('/api/exercises/bench_press_barbell/alternatives')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const parsed = z.array(ExerciseAlternativeSchema).safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body).toHaveLength(1);
    });
  });

  describe('POST /api/assignments/:id/swap', () => {
    it('200 OK: response conforms to ExerciseAssignmentSchema on valid swap', async () => {
      vi.spyOn(mesocycleRepository, 'findAssignmentById').mockResolvedValue(sampleAssignment as any);
      vi.spyOn(exerciseRepository, 'findById').mockImplementation(async (id: string) => {
        if (id === 'bench_press_barbell') return sampleOriginalExercise as any;
        if (id === 'bench_press_dumbbell') return sampleAlternativeExercise as any;
        return null;
      });
      vi.spyOn(exerciseSwapRepository, 'create').mockResolvedValue(undefined as any);
      vi.spyOn(mesocycleRepository, 'cascadeAssignmentSwap').mockResolvedValue(1);
      vi.spyOn(mesocycleRepository, 'updateAssignment').mockResolvedValue({
        ...sampleAssignment,
        exercise_id: 'bench_press_dumbbell',
        exercise: sampleAlternativeExercise,
        is_swapped: true
      } as any);

      const res = await request(app)
        .post(`/api/assignments/${assignmentId}/swap`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          new_exercise_id: 'bench_press_dumbbell',
          reason: 'falta_equipamiento',
          notes: 'Máquinas ocupadas en el gym'
        });

      expect(res.status).toBe(200);
      const parsed = ExerciseAssignmentSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.is_swapped).toBe(true);
    });

    it('400 Bad Request: response conforms to ValidationErrorResponseSchema on invalid reason', async () => {
      const res = await request(app)
        .post(`/api/assignments/${assignmentId}/swap`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          new_exercise_id: 'bench_press_dumbbell',
          reason: 'invalid_reason_string'
        });

      expect(res.status).toBe(400);
      const parsed = ValidationErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });
});
