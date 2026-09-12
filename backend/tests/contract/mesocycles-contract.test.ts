import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { exerciseRepository } from '../../src/repositories/exercise.repository.js';
import { exerciseSwapRepository } from '../../src/repositories/exercise-swap.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';
import {
  MesocycleDetailSchema,
  ErrorResponseSchema,
  ValidationErrorResponseSchema
} from '../../src/schemas/generated/schemas.js';

describe('Contract Tests: Mesocycle Endpoints (RF-02, RF-10, Constitución §1, §4)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const mesocycleId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'meso.athlete@smartforge.test',
      google_id: 'google-sub-meso'
    },
    jwtSecret
  );

  const sampleExercises = [
    {
      id: 'press_banca',
      name: 'Press de banca plano con barra',
      movement_pattern: 'empuje' as const,
      primary_muscle: 'pecho' as const,
      secondary_muscles: ['triceps' as const, 'hombros' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.75,
      video_url: 'https://smartforge.app/videos/bench-press.mp4',
      video_fallback_url: 'https://smartforge.app/videos/bench-press-fallback.mp4',
      instructions: 'Acuéstate sobre el banco plano...',
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
      initial_load_ratio: 0.65,
      video_url: 'https://smartforge.app/videos/row.mp4',
      video_fallback_url: 'https://smartforge.app/videos/row-fallback.mp4',
      instructions: 'Tira la barra al abdomen.',
      is_active: true
    },
    {
      id: 'sentadilla_barra',
      name: 'Sentadilla con barra',
      movement_pattern: 'rodilla_dominante' as const,
      primary_muscle: 'cuadriceps' as const,
      secondary_muscles: ['gluteos' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.8,
      video_url: 'https://smartforge.app/videos/squat.mp4',
      video_fallback_url: 'https://smartforge.app/videos/squat-fallback.mp4',
      instructions: 'Sentadilla profunda.',
      is_active: true
    },
    {
      id: 'peso_muerto_barra',
      name: 'Peso muerto con barra',
      movement_pattern: 'cadera_dominante' as const,
      primary_muscle: 'isquiosurales' as const,
      secondary_muscles: ['gluteos' as const],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.9,
      video_url: 'https://smartforge.app/videos/deadlift.mp4',
      video_fallback_url: 'https://smartforge.app/videos/deadlift-fallback.mp4',
      instructions: 'Bisagra de cadera.',
      is_active: true
    },
    {
      id: 'plancha_abdominal',
      name: 'Plancha abdominal',
      movement_pattern: 'core' as const,
      primary_muscle: 'core' as const,
      secondary_muscles: [],
      equipment_id: 'bodyweight',
      is_compound: false,
      initial_load_ratio: 0.0,
      video_url: 'https://smartforge.app/videos/plank.mp4',
      video_fallback_url: 'https://smartforge.app/videos/plank-fallback.mp4',
      instructions: 'Mantén el core firme.',
      is_active: true
    }
  ];

  const sampleMesocycleDetail = {
    id: mesocycleId,
    athlete_id: athleteId,
    name: 'Mesociclo 1 - Hipertrofia',
    experience_level: 'intermedio' as const,
    training_goal: 'hipertrofia' as const,
    periodization_type: 'ondulante' as const,
    duration_weeks: 6,
    status: 'active' as const,
    start_date: '2026-09-12T10:00:00.000Z',
    weeks: [
      {
        id: '8ba7b810-9dad-11d1-80b4-00c04fd430ca',
        mesocycle_id: mesocycleId,
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
            week_plan_id: '8ba7b810-9dad-11d1-80b4-00c04fd430ca',
            day_number: 1,
            name: 'Día 1 - Tren Superior',
            exercise_assignments: [
              {
                id: 'aba7b810-9dad-11d1-80b4-00c04fd430cc',
                session_plan_id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
                exercise_id: 'press_banca',
                exercise: sampleExercises[0],
                order_in_session: 1,
                target_sets: 4,
                target_reps: 10,
                target_rir: 2,
                target_load_kg: 60,
                is_swapped: false
              }
            ]
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;

    vi.spyOn(athleteRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === athleteId) {
        return {
          id: athleteId,
          google_id: 'google-sub-meso',
          email: 'meso.athlete@smartforge.test',
          name: 'Atleta Meso',
          age: 25,
          weight_kg: 80,
          experience_level: 'intermedio',
          training_goal: 'hipertrofia',
          available_days_per_week: 4,
          equipment: [{ id: 'barbell', name: 'Barra', category: 'barras' }]
        } as any;
      }
      return null;
    });

    vi.spyOn(exerciseRepository, 'findAll').mockResolvedValue(sampleExercises as any);
    vi.spyOn(exerciseSwapRepository, 'findByAthleteId').mockResolvedValue([]);
    vi.spyOn(painReportRepository, 'findBySessionId').mockResolvedValue([]);
    vi.spyOn(mesocycleRepository, 'archiveActiveByAthleteId').mockResolvedValue(1);

    vi.spyOn(mesocycleRepository, 'create').mockResolvedValue(sampleMesocycleDetail as any);
    vi.spyOn(mesocycleRepository, 'updateStatus').mockResolvedValue(undefined as any);

    vi.spyOn(mesocycleRepository, 'findActiveByAthleteId').mockImplementation(async (id: string) => {
      if (id === athleteId) return sampleMesocycleDetail as any;
      return null;
    });

    vi.spyOn(mesocycleRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === mesocycleId) return sampleMesocycleDetail as any;
      return null;
    });

    app = createApp();
  });

  describe('POST /api/mesocycles', () => {
    it('201 Created: response conforms to MesocycleDetailSchema', async () => {
      const res = await request(app)
        .post('/api/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ target_goal: 'hipertrofia', custom_duration_weeks: 6 });

      expect(res.status).toBe(201);
      const parsed = MesocycleDetailSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.id).toBe(mesocycleId);
    });

    it('400 Bad Request: response conforms to ValidationErrorResponseSchema on invalid goal', async () => {
      const res = await request(app)
        .post('/api/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ target_goal: 'invalid_goal' });

      expect(res.status).toBe(400);
      const parsed = ValidationErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });

  describe('GET /api/mesocycles/current', () => {
    it('200 OK: response conforms to MesocycleDetailSchema', async () => {
      const res = await request(app)
        .get('/api/mesocycles/current')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const parsed = MesocycleDetailSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });

    it('404 Not Found: response conforms to ErrorResponseSchema when no active mesocycle', async () => {
      vi.spyOn(mesocycleRepository, 'findActiveByAthleteId').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/mesocycles/current')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });

  describe('GET /api/mesocycles/:id', () => {
    it('200 OK: response conforms to MesocycleDetailSchema', async () => {
      const res = await request(app)
        .get(`/api/mesocycles/${mesocycleId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const parsed = MesocycleDetailSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });

    it('404 Not Found: response conforms to ErrorResponseSchema when id does not exist', async () => {
      const res = await request(app)
        .get(`/api/mesocycles/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(404);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
    });
  });
});
