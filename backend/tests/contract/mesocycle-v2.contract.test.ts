import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { createApp } from '../../src/app.js';
import { mesocycleRotationService } from '../../src/services/mesocycle-rotation.service.js';
import { mesocycleLifecycleService } from '../../src/services/mesocycle-lifecycle.service.js';
import { mesocycleHistoryService } from '../../src/services/mesocycle-history.service.js';
import { baselineSnapshotService } from '../../src/services/baseline-snapshot.service.js';
import {
  MesocycleDetailSchema,
  RoutineTimeBlockConfigResponseSchema,
  RoutineTimeBlockItemSchema,
  MesocycleHistoryItemSchema,
  ErrorResponseSchema,
  type MesocycleDetail,
  type MesocycleHistoryItem
} from '../../src/schemas/generated/schemas.js';
import { NotFoundError } from '../../src/errors/app-error.js';

describe('Contract Tests: Mesocycle V2, Routine Time-Blocks, Cancellation & History (RF-03, RF-04, RF-05, RF-06, RF-07, RF-08, Constitución §1, §4)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '77777777-7777-7777-7777-777777777777';
  const mesocycleId = '88888888-8888-8888-8888-888888888888';

  const validToken = jwt.sign(
    { id: athleteId, email: 'meso.v2.athlete@smartforge.test', google_id: 'google-sub-v2' },
    jwtSecret
  );

  const sampleExercise = {
    id: 'press_banca',
    name: 'Press de banca plano con barra',
    movement_pattern: 'empuje' as const,
    primary_muscle: 'pecho' as const,
    secondary_muscles: ['triceps' as const],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.75,
    video_url: 'https://smartforge.app/videos/bench-press.mp4',
    video_fallback_url: 'https://smartforge.app/videos/bench-press-fallback.mp4',
    instructions: 'Acuéstate sobre el banco plano...',
    is_active: true
  };

  const sampleMesocycleDetail: MesocycleDetail = {
    id: mesocycleId,
    athlete_id: athleteId,
    name: 'Mesociclo V2 Hipertrofia',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    periodization_type: 'ondulante',
    duration_weeks: 6,
    status: 'active',
    start_date: '2026-09-14',
    end_date: '2026-10-26',
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
            name: 'Torso A',
            exercise_assignments: [
              {
                id: 'aba7b810-9dad-11d1-80b4-00c04fd430cc',
                session_plan_id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
                exercise_id: 'press_banca',
                exercise: sampleExercise,
                order_in_session: 1,
                target_sets: 3,
                target_reps: 8,
                target_rir: 2,
                target_load_kg: 70,
                is_swapped: false
              }
            ]
          }
        ]
      }
    ]
  };

  const sampleHistoryItem: MesocycleHistoryItem = {
    id: mesocycleId,
    name: 'Mesociclo V2 Finalizado',
    goal: 'hipertrofia',
    startDate: '2026-07-01',
    endDate: '2026-08-12',
    status: 'completed',
    adherencePercent: 96,
    adherenceDetails: '23 de 24 sesiones completadas',
    exerciseProgressions: [
      {
        exerciseId: 'bench_press',
        exerciseName: 'Press de banca plano con barra',
        loadType: 'external_load',
        baseline: {
          loadText: '70.0 kg × 8 reps',
          e1rmKg: 86.87
        },
        final: {
          loadText: '75.0 kg × 8 reps',
          e1rmKg: 93.08,
          executed: true
        },
        progress: {
          deltaKg: 6.21,
          deltaPercent: 7.1
        }
      }
    ]
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;
    app = createApp();
  });

  describe('POST /mesocycles (Generación V2 con duración fija y homogeneidad)', () => {
    it('201 Created: response conforms to MesocycleDetailSchema with V2 input', async () => {
      vi.spyOn(mesocycleRotationService, 'rotateAndPersistForAthlete').mockResolvedValue(sampleMesocycleDetail);
      vi.spyOn(baselineSnapshotService, 'captureBaselinesForMesocycle').mockResolvedValue([]);

      const res = await request(app)
        .post('/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          target_goal: 'hipertrofia',
          availableDays: 4,
          sessionDurationMinutes: 60,
          exercisesPerSessionPreference: {
            mode: 'recommended'
          }
        });

      expect(res.status).toBe(201);
      const parsed = MesocycleDetailSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.id).toBe(mesocycleId);
    });

    it('400 Bad Request: response conforms to ErrorResponseSchema when manual selection exceeds duration budget', async () => {
      const res = await request(app)
        .post('/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          sessionDurationMinutes: 30,
          exercisesPerSessionPreference: {
            mode: 'manual',
            customCount: 6 // Inválido: máximo para 30 min es 3
          }
        });

      expect(res.status).toBe(400);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.error).toMatch(/excede el presupuesto/i);
    });
  });

  describe('GET /routines/config/time-blocks (Matriz de viabilidad de bloques temporales)', () => {
    it('200 OK: response conforms to RoutineTimeBlockConfigResponseSchema with 6 uniform blocks', async () => {
      const res = await request(app)
        .get('/routines/config/time-blocks')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const parsed = RoutineTimeBlockConfigResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.available_blocks).toHaveLength(6);

      // Validar cada bloque individualmente contra RoutineTimeBlockItemSchema
      for (const block of res.body.available_blocks) {
        const itemParsed = RoutineTimeBlockItemSchema.safeParse(block);
        expect(itemParsed.success).toBe(true);
      }
    });

    it('401 Unauthorized: response conforms to ErrorResponseSchema when unauthenticated', async () => {
      const res = await request(app).get('/routines/config/time-blocks');

      expect(res.status).toBe(401);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /mesocycles/active/cancel (Cancelación controlada y estado sin mesociclo activo)', () => {
    it('200 OK: response conforms to cancellation schema when successfully cancelled', async () => {
      vi.spyOn(mesocycleLifecycleService, 'cancelActiveMesocycle').mockResolvedValue({
        mesocycleId,
        previousStatus: 'active',
        status: 'cancelled',
        completionReason: 'cancelled_user',
        activeSessionFinalized: false,
        cancelledSessionsCount: 12,
        completedSessionsCount: 6,
        discardedFromHistory: false,
        wasAlreadyCompleted: false
      });

      const res = await request(app)
        .post('/mesocycles/active/cancel')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ reason: 'cancelled_user' });

      expect(res.status).toBe(200);

      const CancelResponseSchema = z.object({
        status: z.enum(['cancelled', 'completed', 'deload_skipped']),
        message: z.string(),
        cancelled_at: z.string().nullable().optional()
      });

      const parsed = CancelResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.status).toBe('cancelled');
    });

    it('404 Not Found: response conforms to ErrorResponseSchema when no active mesocycle exists to cancel', async () => {
      vi.spyOn(mesocycleLifecycleService, 'cancelActiveMesocycle').mockRejectedValue(
        new NotFoundError('No se encontró ningún mesociclo activo para cancelar.')
      );

      const res = await request(app)
        .post('/mesocycles/active/cancel')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(404);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /mesocycles/history (Historial de tarjetas con comparativas de progreso y 1RM)', () => {
    it('200 OK: response conforms to array of MesocycleHistoryItemSchema', async () => {
      vi.spyOn(mesocycleHistoryService, 'getAthleteHistory').mockResolvedValue({
        mesocycles: [sampleHistoryItem]
      });

      const res = await request(app)
        .get('/mesocycles/history')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      const HistoryListSchema = z.array(MesocycleHistoryItemSchema);
      const parsed = HistoryListSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].exerciseProgressions).toHaveLength(1);
      expect(res.body[0].exerciseProgressions[0].baseline.e1rmKg).toBe(86.87);
      expect(res.body[0].exerciseProgressions[0].final.e1rmKg).toBe(93.08);
      expect(res.body[0].exerciseProgressions[0].progress.deltaKg).toBe(6.21);
    });

    it('401 Unauthorized: response conforms to ErrorResponseSchema when token is missing', async () => {
      const res = await request(app).get('/mesocycles/history');

      expect(res.status).toBe(401);
      const parsed = ErrorResponseSchema.safeParse(res.body);
      expect(parsed.success).toBe(true);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });
});
