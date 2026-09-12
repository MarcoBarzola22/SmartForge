import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { setLogRepository } from '../../src/repositories/set-log.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';
import {
  ProgressionSuggestionSchema,
  ErrorResponseSchema
} from '../../src/schemas/generated/schemas.js';

describe('Contract Tests: Progression Suggestion Endpoint (RF-07, RF-08, Constitución §1, §4)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const assignmentId = 'aba7b810-9dad-11d1-80b4-00c04fd430cc';
  const exerciseId = 'bench_press_barbell';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'progression.athlete@smartforge.test',
      google_id: 'google-sub-progression'
    },
    jwtSecret
  );

  const sampleAthlete = {
    id: athleteId,
    google_id: 'google-sub-progression',
    email: 'progression.athlete@smartforge.test',
    name: 'Carlos Test',
    age: 25,
    body_weight_kg: 75,
    experience_level: 'principiante' as const,
    goal: 'hipertrofia' as const,
    available_days_per_week: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleAssignment = {
    id: assignmentId,
    session_plan_id: 'spa-1',
    exercise_id: exerciseId,
    exercise: {
      id: exerciseId,
      name: 'Press de banca con barra',
      movement_pattern: 'empuje' as const,
      primary_muscle: 'pecho' as const,
      secondary_muscles: ['triceps' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.75,
      video_url: 'https://smartforge.app/videos/bench.mp4',
      video_fallback_url: 'https://smartforge.app/videos/bench.webp',
      instructions: 'Baja controlado y empuja con potencia',
      is_active: true
    },
    order_in_session: 1,
    target_sets: 3,
    target_reps: 10,
    target_rir: 2,
    target_load_kg: 60,
    is_swapped: false,
    athlete_id: athleteId,
    mesocycle_id: 'meso-1',
    day_number: 1,
    session_name: 'Torso A',
    week_number: 1
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;

    vi.spyOn(mesocycleRepository, 'findAssignmentById').mockImplementation(async (id: string) => {
      if (id === assignmentId) return sampleAssignment as any;
      return null;
    });

    vi.spyOn(athleteRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === athleteId) return sampleAthlete as any;
      return null;
    });

    vi.spyOn(setLogRepository, 'findByAthleteAndExercise').mockResolvedValue([]);
    vi.spyOn(painReportRepository, 'findByAthleteAndJoint').mockResolvedValue([]);

    app = createApp();
  });

  describe('GET /api/assignments/:id/progression', () => {
    it('200 OK: response conforms to ProgressionSuggestionSchema', async () => {
      const res = await request(app)
        .get(`/api/assignments/${assignmentId}/progression`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const parsed = ProgressionSuggestionSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.assignment_id).toBe(assignmentId);
      expect(res.body.suggestion).toBeDefined();
    });

    it('404 Not Found: response conforms to ErrorResponseSchema when assignment is missing', async () => {
      const res = await request(app)
        .get(`/api/assignments/00000000-0000-0000-0000-000000000000/progression`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });
});
