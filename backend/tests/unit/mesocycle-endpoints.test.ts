import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { exerciseRepository } from '../../src/repositories/exercise.repository.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { MesocycleDetailSchema } from '../../src/schemas/generated/schemas.js';
import jwt from 'jsonwebtoken';

describe('TASK-29: Mesocycle Controller & Endpoints (POST /api/mesocycles, GET /api/mesocycles/current, GET /api/mesocycles/:id)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const otherAthleteId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';
  const mesocycleId = '8ba7b810-9dad-11d1-80b4-00c04fd430ca';

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
    training_goal: 'fuerza' as const,
    available_days_per_week: 4,
    equipment: [
      { id: 'barbell', name: 'Barra', category: 'barras' },
      { id: 'bodyweight', name: 'Peso corporal', category: 'peso_corporal' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleExercises = [
    {
      id: 'press_banca',
      name: 'Press de banca',
      movement_pattern: 'empuje' as const,
      primary_muscle: 'pecho' as const,
      secondary_muscles: ['triceps' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.65,
      video_url: 'https://youtube.com/watch?v=1',
      video_fallback_url: 'https://assets.smartforge.app/1.webp',
      instructions: 'Empuja.',
      is_active: true
    },
    {
      id: 'remo_barra',
      name: 'Remo con barra',
      movement_pattern: 'tiron' as const,
      primary_muscle: 'espalda' as const,
      secondary_muscles: ['biceps' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.55,
      video_url: 'https://youtube.com/watch?v=2',
      video_fallback_url: 'https://assets.smartforge.app/2.webp',
      instructions: 'Tira.',
      is_active: true
    },
    {
      id: 'sentadilla',
      name: 'Sentadilla',
      movement_pattern: 'rodilla_dominante' as const,
      primary_muscle: 'cuadriceps' as const,
      secondary_muscles: ['gluteos' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.8,
      video_url: 'https://youtube.com/watch?v=3',
      video_fallback_url: 'https://assets.smartforge.app/3.webp',
      instructions: 'Sentadilla profunda.',
      is_active: true
    },
    {
      id: 'peso_muerto',
      name: 'Peso muerto',
      movement_pattern: 'cadera_dominante' as const,
      primary_muscle: 'isquiosurales' as const,
      secondary_muscles: ['gluteos' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.9,
      video_url: 'https://youtube.com/watch?v=4',
      video_fallback_url: 'https://assets.smartforge.app/4.webp',
      instructions: 'Bisagra.',
      is_active: true
    },
    {
      id: 'plancha',
      name: 'Plancha',
      movement_pattern: 'core' as const,
      primary_muscle: 'core' as const,
      secondary_muscles: [],
      equipment_id: 'bodyweight',
      is_compound: false,
      initial_load_ratio: 0.0,
      video_url: 'https://youtube.com/watch?v=5',
      video_fallback_url: 'https://assets.smartforge.app/5.webp',
      instructions: 'Core.',
      is_active: true
    }
  ];

  const sampleMesocycleDetail = {
    id: mesocycleId,
    athlete_id: athleteId,
    name: 'Mesociclo FUERZA - intermedio',
    experience_level: 'intermedio' as const,
    training_goal: 'fuerza' as const,
    periodization_type: 'lineal' as const,
    duration_weeks: 6,
    status: 'active' as const,
    start_date: '2026-09-11',
    weeks: [
      {
        id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
        mesocycle_id: mesocycleId,
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            id: 'aba7b810-9dad-11d1-80b4-00c04fd430cc',
            week_plan_id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
            day_number: 1,
            name: 'Día 1 - Torso A',
            exercise_assignments: [
              {
                id: 'bba7b810-9dad-11d1-80b4-00c04fd430cd',
                session_plan_id: 'aba7b810-9dad-11d1-80b4-00c04fd430cc',
                exercise_id: 'press_banca',
                exercise: sampleExercises[0],
                order_in_session: 1,
                target_sets: 4,
                target_reps: 5,
                target_rir: 2,
                target_load_kg: 52.0,
                is_swapped: false
              }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', jwtSecret);

    vi.spyOn(athleteRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === athleteId) return sampleAthlete;
      return null;
    });

    vi.spyOn(exerciseRepository, 'findAll').mockResolvedValue(sampleExercises);

    vi.spyOn(mesocycleRepository, 'create').mockImplementation(async (data) => ({
      id: mesocycleId,
      athlete_id: data.athlete_id,
      name: data.name,
      experience_level: data.experience_level,
      training_goal: data.training_goal,
      periodization_type: data.periodization_type,
      duration_weeks: data.duration_weeks,
      status: 'active' as const,
      start_date: '2026-09-11',
      weeks: data.weeks.map((w, wIdx) => ({
        id: `9ba7b810-9dad-11d1-80b4-00c04fd430c${wIdx}`,
        mesocycle_id: mesocycleId,
        week_number: w.week_number,
        is_deload: w.is_deload,
        sessions: w.sessions.map((s, sIdx) => ({
          id: `aba7b810-9dad-11d1-80b4-00c04fd430c${sIdx}`,
          week_plan_id: `9ba7b810-9dad-11d1-80b4-00c04fd430c${wIdx}`,
          day_number: s.day_number,
          name: s.name,
          exercise_assignments: s.exercise_assignments.map((a, aIdx) => ({
            id: `bba7b810-9dad-11d1-80b4-00c04fd430c${aIdx}`,
            session_plan_id: `aba7b810-9dad-11d1-80b4-00c04fd430c${sIdx}`,
            exercise_id: a.exercise_id,
            exercise: sampleExercises.find((e) => e.id === a.exercise_id) || sampleExercises[0],
            order_in_session: a.order_in_session,
            target_sets: a.target_sets,
            target_reps: a.target_reps,
            target_rir: a.target_rir,
            target_load_kg: a.target_load_kg,
            notes: a.notes,
            is_swapped: false
          }))
        }))
      }))
    }));

    vi.spyOn(mesocycleRepository, 'archiveActiveByAthleteId').mockResolvedValue(1);

    vi.spyOn(mesocycleRepository, 'findActiveByAthleteId').mockImplementation(
      async (id: string) => {
        if (id === athleteId) return sampleMesocycleDetail;
        return null;
      }
    );

    vi.spyOn(mesocycleRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === mesocycleId) return sampleMesocycleDetail;
      return null;
    });

    app = createApp();
  });

  describe('POST /api/mesocycles', () => {
    it('should return 401 when request is unauthenticated', async () => {
      const response = await request(app).post('/api/mesocycles').send({});
      expect(response.status).toBe(401);
    });

    it('should return 400 when invalid duration is requested (e.g. custom_duration_weeks < 4)', async () => {
      const response = await request(app)
        .post('/api/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ custom_duration_weeks: 2 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('details');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should generate and return 201 with MesocycleDetail conforming to OpenAPI schema', async () => {
      const response = await request(app)
        .post('/api/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.athlete_id).toBe(athleteId);
      expect(response.body.duration_weeks).toBe(6); // Default for intermediate

      const parsed = MesocycleDetailSchema.safeParse(response.body);
      expect(parsed.success).toBe(true);
    });

    it('should respect custom target_goal and custom_duration_weeks in POST request', async () => {
      const response = await request(app)
        .post('/api/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          target_goal: 'hipertrofia',
          custom_duration_weeks: 5
        });

      expect(response.status).toBe(201);
      expect(response.body.training_goal).toBe('hipertrofia');
      expect(response.body.periodization_type).toBe('ondulante');
      expect(response.body.duration_weeks).toBe(5);
    });

    it('should return 404 when athlete profile is not found', async () => {
      const nonExistentToken = jwt.sign(
        {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'unknown@smartforge.test',
          google_id: 'unknown-sub'
        },
        jwtSecret
      );

      const response = await request(app)
        .post('/api/mesocycles')
        .set('Authorization', `Bearer ${nonExistentToken}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/mesocycles/current', () => {
    it('should return 401 when request is unauthenticated', async () => {
      const response = await request(app).get('/api/mesocycles/current');
      expect(response.status).toBe(401);
    });

    it('should return 200 with current active MesocycleDetail', async () => {
      const response = await request(app)
        .get('/api/mesocycles/current')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mesocycleId);
      expect(response.body.status).toBe('active');

      const parsed = MesocycleDetailSchema.safeParse(response.body);
      expect(parsed.success).toBe(true);
    });

    it('should return 404 when athlete has no active mesocycle', async () => {
      const noMesocycleToken = jwt.sign(
        {
          id: otherAthleteId,
          email: 'no-meso@smartforge.test',
          google_id: 'no-meso-sub'
        },
        jwtSecret
      );

      const response = await request(app)
        .get('/api/mesocycles/current')
        .set('Authorization', `Bearer ${noMesocycleToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/mesocycles/:id', () => {
    it('should return 401 when request is unauthenticated', async () => {
      const response = await request(app).get(`/api/mesocycles/${mesocycleId}`);
      expect(response.status).toBe(401);
    });

    it('should return 200 with MesocycleDetail when mesocycle exists and belongs to athlete', async () => {
      const response = await request(app)
        .get(`/api/mesocycles/${mesocycleId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(mesocycleId);

      const parsed = MesocycleDetailSchema.safeParse(response.body);
      expect(parsed.success).toBe(true);
    });

    it('should return 404 when mesocycle belongs to a different athlete (RNF-06)', async () => {
      const differentAthleteToken = jwt.sign(
        {
          id: otherAthleteId,
          email: 'different@smartforge.test',
          google_id: 'different-sub'
        },
        jwtSecret
      );

      const response = await request(app)
        .get(`/api/mesocycles/${mesocycleId}`)
        .set('Authorization', `Bearer ${differentAthleteToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when mesocycle is not found', async () => {
      const response = await request(app)
        .get('/api/mesocycles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
    });
  });
});
