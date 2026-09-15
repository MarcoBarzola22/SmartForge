import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { mesocycleLifecycleService } from '../../src/services/mesocycle-lifecycle.service.js';
import { mesocycleHistoryService } from '../../src/services/mesocycle-history.service.js';
import { baselineSnapshotService } from '../../src/services/baseline-snapshot.service.js';
import { mesocycleRotationService } from '../../src/services/mesocycle-rotation.service.js';
import { NotFoundError } from '../../src/errors/app-error.js';
import type { MesocycleDetail, MesocycleHistoryItem } from '../../src/schemas/generated/schemas.js';

describe('TASK-23: Mesocycle V2 Endpoints, Cancellation, History and Availability Warning (RF-03, RF-05, RF-06, RF-07, RF-08, RF-09)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '77777777-7777-7777-7777-777777777777';
  const mesocycleId = '88888888-8888-8888-8888-888888888888';

  const validToken = jwt.sign(
    { id: athleteId, email: 'athlete.v2@smartforge.test', google_id: 'google-v2' },
    jwtSecret
  );

  const mockExercise = {
    id: 'bench_press',
    name: 'Press de banca',
    movement_pattern: 'empuje' as const,
    primary_muscle: 'pecho' as const,
    secondary_muscles: ['triceps' as const],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.8,
    instructions: 'Instrucciones',
    video_url: 'https://video.test/bench',
    video_fallback_url: 'https://fallback.test/bench',
    is_active: true
  };

  const mockMesocycleDetail: MesocycleDetail = {
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
        id: 'w1',
        mesocycle_id: mesocycleId,
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            id: 's1',
            week_plan_id: 'w1',
            day_number: 1,
            name: 'Torso A',
            exercise_assignments: [
              {
                id: 'ea1',
                session_plan_id: 's1',
                exercise_id: 'bench_press',
                exercise: mockExercise,
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

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;
    app = createApp();
  });

  describe('POST /api/mesocycles (Generación V2 y validación pedagógica)', () => {
    it('should return 401 when token is missing', async () => {
      const res = await request(app).post('/api/mesocycles').send({});
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should reject with 400 and pedagogical advice when manual exercises exceed time budget (RF-04 CA-04.2)', async () => {
      const res = await request(app)
        .post('/api/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          sessionDurationMinutes: 30,
          exercisesPerSessionPreference: {
            mode: 'manual',
            customCount: 6 // Max for 30m is 3
          }
        });

      expect(res.status).toBe(400);
      const errorMsg = res.body.error || res.body.message;
      expect(errorMsg).toMatch(/excede el presupuesto/i);
      expect(errorMsg).toMatch(/recomendamos un máximo/i);
    });

    it('should generate mesocycle V2 and capture baseline snapshots (RF-03, RF-05)', async () => {
      vi.spyOn(mesocycleRotationService, 'rotateAndPersistForAthlete').mockResolvedValue(mockMesocycleDetail);
      const snapshotSpy = vi.spyOn(baselineSnapshotService, 'captureBaselinesForMesocycle').mockResolvedValue([]);

      const res = await request(app)
        .post('/api/mesocycles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          sessionDurationMinutes: 60,
          exercisesPerSessionPreference: {
            mode: 'recommended'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(mesocycleId);
      expect(snapshotSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          mesocycleId,
          athleteId,
          exerciseIds: expect.arrayContaining(['bench_press'])
        })
      );
    });
  });

  describe('POST /api/mesocycles/active/cancel (Cancelación controlada RF-07, RF-08)', () => {
    it('should return 401 when token is missing', async () => {
      const res = await request(app).post('/api/mesocycles/active/cancel').send({});
      expect(res.status).toBe(401);
    });

    it('should cancel active mesocycle and return 200 with status cancelled', async () => {
      vi.spyOn(mesocycleLifecycleService, 'cancelActiveMesocycle').mockResolvedValue({
        mesocycleId,
        previousStatus: 'active',
        status: 'cancelled',
        completionReason: 'cancelled_user',
        activeSessionFinalized: false,
        cancelledSessionsCount: 10,
        completedSessionsCount: 5,
        discardedFromHistory: false,
        wasAlreadyCompleted: false
      });

      const res = await request(app)
        .post('/api/mesocycles/active/cancel')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ reason: 'cancelled_user' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
      expect(res.body.message).toContain('cancelado exitosamente');
      expect(res.body.cancelled_at).toBeDefined();
    });

    it('should return completed status when mesocycle was already completed (deterministic sync CA-07.5)', async () => {
      vi.spyOn(mesocycleLifecycleService, 'cancelActiveMesocycle').mockResolvedValue({
        mesocycleId,
        previousStatus: 'completed',
        status: 'completed',
        completionReason: 'normal',
        activeSessionFinalized: false,
        cancelledSessionsCount: 0,
        completedSessionsCount: 24,
        discardedFromHistory: false,
        wasAlreadyCompleted: true
      });

      const res = await request(app)
        .post('/api/mesocycles/active/cancel')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.message).toContain('completado');
    });

    it('should return 404 when no active mesocycle exists to cancel', async () => {
      vi.spyOn(mesocycleLifecycleService, 'cancelActiveMesocycle').mockRejectedValue(
        new NotFoundError('No se encontró ningún mesociclo activo para cancelar.')
      );

      const res = await request(app)
        .post('/api/mesocycles/active/cancel')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/mesocycles/history (Historial de tarjetas RF-06)', () => {
    it('should return 401 when token is missing', async () => {
      const res = await request(app).get('/api/mesocycles/history');
      expect(res.status).toBe(401);
    });

    it('should return 200 with list of mesocycles in history', async () => {
      const sampleHistoryItem: MesocycleHistoryItem = {
        id: mesocycleId,
        name: 'Mesociclo 1',
        goal: 'hipertrofia',
        startDate: '2026-08-01',
        endDate: '2026-09-10',
        status: 'completed',
        adherencePercent: 95,
        adherenceDetails: '23 de 24 sesiones',
        exerciseProgressions: [
          {
            exerciseId: 'bench_press',
            exerciseName: 'Press banca',
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

      vi.spyOn(mesocycleHistoryService, 'getAthleteHistory').mockResolvedValue({
        mesocycles: [sampleHistoryItem]
      });

      const res = await request(app)
        .get('/api/mesocycles/history')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(mesocycleId);
      expect(res.body[0].exerciseProgressions[0].progress.deltaKg).toBe(6.21);
    });
  });

  describe('RF-09: Aviso pedagógico ante cambio de disponibilidad a mitad de ciclo', () => {
    it('should return pedagogical warning via GET /api/mesocycles/active/availability-warning when active cycle exists', async () => {
      vi.spyOn(mesocycleRepository, 'findActiveByAthleteId').mockResolvedValue(mockMesocycleDetail);

      const res = await request(app)
        .get('/api/mesocycles/active/availability-warning')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.hasActiveMesocycle).toBe(true);
      expect(res.body.warning).toMatch(/no admite modificaciones estructurales globales/i);
      expect(res.body.recommendation).toBe('cancel_and_recreate');
    });

    it('should reject PUT /api/mesocycles/active/availability with 400 when trying to modify availability with active cycle (CA-09.1)', async () => {
      vi.spyOn(mesocycleRepository, 'findActiveByAthleteId').mockResolvedValue(mockMesocycleDetail);

      const res = await request(app)
        .put('/api/mesocycles/active/availability')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ availableDays: 5, sessionDurationMinutes: 45 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ACTIVE_MESOCYCLE_IMMUTABLE');
      expect(res.body.message).toMatch(/no admite modificaciones estructurales globales/i);
      expect(res.body.recommendation).toBe('cancel_and_recreate');
    });
  });
});
