import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { setLogRepository } from '../../src/repositories/set-log.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';
import { ProgressionSuggestionSchema } from '../../src/schemas/generated/schemas.js';
import jwt from 'jsonwebtoken';

describe('TASK-45: Progression Suggestion Endpoint (GET /api/assignments/:id/progression)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const otherAthleteId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';
  const assignmentId = 'aba7b810-9dad-11d1-80b4-00c04fd430ca';
  const exerciseId = 'barbell_bench_press';

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
      movement_pattern: 'empuje_horizontal' as const,
      primary_muscle: 'pectoral' as const,
      secondary_muscles: ['triceps' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.75,
      video_url: 'https://example.com/bench.mp4',
      video_fallback_url: 'https://example.com/bench.webp',
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
    process.env.JWT_SECRET = jwtSecret;
    vi.restoreAllMocks();

    vi.spyOn(mesocycleRepository, 'findAssignmentById').mockImplementation(async (id: string) => {
      if (id === assignmentId) return sampleAssignment;
      return null;
    });

    vi.spyOn(athleteRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === athleteId) return sampleAthlete;
      return null;
    });

    vi.spyOn(setLogRepository, 'findByAthleteAndExercise').mockResolvedValue([]);
    vi.spyOn(painReportRepository, 'findByAthleteAndJoint').mockResolvedValue([]);

    app = createApp();
  });

  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).get(`/api/assignments/${assignmentId}/progression`);
    expect(res.status).toBe(401);
  });

  it('should return 404 when assignment is not found', async () => {
    const res = await request(app)
      .get('/api/assignments/00000000-0000-0000-0000-000000000000/progression')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
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
      .get(`/api/assignments/${assignmentId}/progression`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });

  it('should return initial estimated load when athlete has no prior session history (RF-07)', async () => {
    const res = await request(app)
      .get(`/api/assignments/${assignmentId}/progression`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.assignment_id).toBe(assignmentId);
    expect(res.body.exercise_name).toBe('Press de banca con barra');
    expect(res.body.suggestion.action).toBe('initial');
    expect(res.body.suggestion.next_load_kg).toBeGreaterThan(0);
    expect(res.body.streak_count).toBe(0);

    const parsed = ProgressionSuggestionSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });

  it('should return increase_load suggestion after 1 successful session for Principiante (+5 kg compuesto)', async () => {
    vi.spyOn(setLogRepository, 'findByAthleteAndExercise').mockResolvedValueOnce([
      {
        id: 'set-1',
        session_id: 's-1',
        exercise_id: exerciseId,
        set_number: 1,
        reps_completed: 10,
        weight_kg: 60,
        rir: 2,
        client_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'set-2',
        session_id: 's-1',
        exercise_id: exerciseId,
        set_number: 2,
        reps_completed: 10,
        weight_kg: 60,
        rir: 2,
        client_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]);

    const res = await request(app)
      .get(`/api/assignments/${assignmentId}/progression`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.assignment_id).toBe(assignmentId);
    expect(res.body.suggestion.action).toBe('increase_load');
    expect(res.body.suggestion.next_load_kg).toBe(65); // 60 + 5 = 65 kg
    expect(res.body.streak_count).toBe(1);

    const parsed = ProgressionSuggestionSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
  });
});
