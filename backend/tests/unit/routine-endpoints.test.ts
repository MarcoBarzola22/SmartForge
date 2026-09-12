import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { exerciseRepository } from '../../src/repositories/exercise.repository.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { exerciseSwapRepository } from '../../src/repositories/exercise-swap.repository.js';
import {
  ExerciseAssignmentSchema,
  ExerciseAlternativeSchema
} from '../../src/schemas/generated/schemas.js';
import jwt from 'jsonwebtoken';

describe('TASK-33: Routine Controller & Endpoints (GET /api/exercises/:id/alternatives, POST /api/assignments/:id/swap)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const otherAthleteId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';
  const assignmentId = '8ba7b810-9dad-11d1-80b4-00c04fd430ca';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'athlete@smartforge.test',
      google_id: 'google-sub-123'
    },
    jwtSecret
  );

  const sampleAthlete = {
    id: athleteId,
    google_id: 'google-sub-123',
    email: 'athlete@smartforge.test',
    name: 'Atleta Test',
    age: 25,
    weight_kg: 80,
    experience_level: 'intermedio' as const,
    training_goal: 'hipertrofia' as const,
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra', category: 'barras' },
      { id: 'dumbbells', name: 'Mancuernas', category: 'mancuernas' },
      { id: 'bodyweight', name: 'Peso corporal', category: 'peso_corporal' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleOriginalExercise = {
    id: 'barbell_bench_press',
    name: 'Press de banca con barra',
    movement_pattern: 'empuje' as const,
    primary_muscle: 'pecho' as const,
    secondary_muscles: ['triceps' as const],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.75,
    video_url: 'https://youtube.com/watch?v=1',
    video_fallback_url: 'https://assets.smartforge.app/1.webp',
    instructions: 'Empuja la barra.',
    is_active: true
  };

  const sampleAlternativeExercise = {
    id: 'dumbbell_bench_press',
    name: 'Press de banca con mancuernas',
    movement_pattern: 'empuje' as const,
    primary_muscle: 'pecho' as const,
    secondary_muscles: ['triceps' as const],
    equipment_id: 'dumbbells',
    is_compound: true,
    initial_load_ratio: 0.6,
    video_url: 'https://youtube.com/watch?v=2',
    video_fallback_url: 'https://assets.smartforge.app/2.webp',
    instructions: 'Empuja mancuernas.',
    is_active: true
  };

  const sampleAssignment = {
    id: assignmentId,
    session_plan_id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
    exercise_id: 'barbell_bench_press',
    exercise: sampleOriginalExercise,
    order_in_session: 1,
    target_sets: 4,
    target_reps: 8,
    target_rir: 2,
    target_load_kg: 60.0,
    notes: 'Control',
    is_swapped: false,
    athlete_id: athleteId,
    mesocycle_id: 'aba7b810-9dad-11d1-80b4-00c04fd430cc',
    week_number: 1,
    day_number: 1
  };

  beforeEach(() => {
    process.env.JWT_SECRET = jwtSecret;
    vi.restoreAllMocks();

    vi.spyOn(athleteRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === athleteId) return sampleAthlete;
      return null;
    });

    vi.spyOn(exerciseRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === 'barbell_bench_press') return sampleOriginalExercise;
      if (id === 'dumbbell_bench_press') return sampleAlternativeExercise;
      return null;
    });

    vi.spyOn(exerciseRepository, 'findAlternatives').mockImplementation(
      async (id: string) => {
        if (id === 'barbell_bench_press') {
          return [
            {
              original_exercise_id: 'barbell_bench_press',
              alternative_exercise: sampleAlternativeExercise,
              similarity_score: 0.9
            }
          ];
        }
        return [];
      }
    );

    vi.spyOn(mesocycleRepository, 'findAssignmentById').mockImplementation(
      async (id: string) => {
        if (id === assignmentId) return sampleAssignment;
        return null;
      }
    );

    vi.spyOn(mesocycleRepository, 'updateAssignment').mockImplementation(
      async (id: string, data) => {
        if (id === assignmentId) {
          return {
            id: assignmentId,
            session_plan_id: sampleAssignment.session_plan_id,
            exercise_id: data.exercise_id,
            exercise: sampleAlternativeExercise,
            order_in_session: sampleAssignment.order_in_session,
            target_sets: sampleAssignment.target_sets,
            target_reps: sampleAssignment.target_reps,
            target_rir: sampleAssignment.target_rir,
            target_load_kg: data.target_load_kg ?? 48.0,
            notes: data.notes ?? sampleAssignment.notes,
            is_swapped: true
          };
        }
        return null;
      }
    );

    vi.spyOn(mesocycleRepository, 'cascadeAssignmentSwap').mockResolvedValue(3);

    vi.spyOn(exerciseSwapRepository, 'create').mockImplementation(async (data) => ({
      id: 'swap-1234',
      assignment_id: data.assignment_id,
      original_exercise_id: data.original_exercise_id,
      new_exercise_id: data.new_exercise_id,
      reason: data.reason,
      notes: data.notes,
      created_at: new Date().toISOString()
    }));

    app = createApp();
  });

  describe('GET /api/exercises/:id/alternatives', () => {
    it('should return 401 when Authorization header has invalid token', async () => {
      const res = await request(app)
        .get('/api/exercises/barbell_bench_press/alternatives')
        .set('Authorization', 'Bearer invalid.jwt.token');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('code', 'UNAUTHORIZED');
    });

    it('should return 200 with alternatives matching schema for authenticated athlete (RF-03, CA-03.1)', async () => {
      const res = await request(app)
        .get('/api/exercises/barbell_bench_press/alternatives')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);

      const parsed = ExerciseAlternativeSchema.safeParse(res.body[0]);
      expect(parsed.success).toBe(true);
      expect(res.body[0].alternative_exercise.id).toBe('dumbbell_bench_press');
    });

    it('should filter alternatives by equipment_id query parameter when provided', async () => {
      const res = await request(app)
        .get('/api/exercises/barbell_bench_press/alternatives?equipment_id=dumbbells')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(exerciseRepository.findAlternatives).toHaveBeenCalledWith(
        'barbell_bench_press',
        ['dumbbells']
      );
    });

    it('should return 404 when exercise does not exist', async () => {
      const res = await request(app)
        .get('/api/exercises/non_existent_exercise/alternatives')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('POST /api/assignments/:id/swap', () => {
    it('should return 401 when Authorization header is missing', async () => {
      const res = await request(app)
        .post(`/api/assignments/${assignmentId}/swap`)
        .send({
          new_exercise_id: 'dumbbell_bench_press',
          reason: 'molestia_articular'
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 when reason is missing or invalid', async () => {
      const res = await request(app)
        .post(`/api/assignments/${assignmentId}/swap`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          new_exercise_id: 'dumbbell_bench_press',
          reason: 'motivo_invalido'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 400 when new_exercise_id is missing', async () => {
      const res = await request(app)
        .post(`/api/assignments/${assignmentId}/swap`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          reason: 'preferencia_personal'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should return 404 when assignment is not found', async () => {
      const res = await request(app)
        .post('/api/assignments/00000000-0000-0000-0000-000000000000/swap')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          new_exercise_id: 'dumbbell_bench_press',
          reason: 'preferencia_personal'
        });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 404 when assignment belongs to another athlete', async () => {
      const otherToken = jwt.sign(
        {
          id: otherAthleteId,
          email: 'other@smartforge.test',
          google_id: 'google-sub-456'
        },
        jwtSecret
      );

      const res = await request(app)
        .post(`/api/assignments/${assignmentId}/swap`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          new_exercise_id: 'dumbbell_bench_press',
          reason: 'preferencia_personal'
        });

      expect(res.status).toBe(404);
    });

    it('should return 200 with updated ExerciseAssignment conforming to OpenAPI schema (RF-03, CA-03.3, CA-03.4)', async () => {
      const res = await request(app)
        .post(`/api/assignments/${assignmentId}/swap`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          new_exercise_id: 'dumbbell_bench_press',
          reason: 'molestia_articular',
          notes: 'Molestia en hombro'
        });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(assignmentId);
      expect(res.body.exercise_id).toBe('dumbbell_bench_press');
      expect(res.body.is_swapped).toBe(true);

      const parseResult = ExerciseAssignmentSchema.safeParse(res.body);
      expect(parseResult.success).toBe(true);

      expect(exerciseSwapRepository.create).toHaveBeenCalledWith({
        assignment_id: assignmentId,
        original_exercise_id: 'barbell_bench_press',
        new_exercise_id: 'dumbbell_bench_press',
        reason: 'molestia_articular',
        notes: 'Molestia en hombro'
      });

      expect(mesocycleRepository.cascadeAssignmentSwap).toHaveBeenCalled();
    });
  });
});
