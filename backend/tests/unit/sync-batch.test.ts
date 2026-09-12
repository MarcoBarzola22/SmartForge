import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';
import { checkinRepository } from '../../src/repositories/checkin.repository.js';
import { setLogRepository } from '../../src/repositories/set-log.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';
import { SyncResponseSchema } from '../../src/schemas/generated/schemas.js';
import type {
  AthleteProfile,
  SyncRequest,
  SyncResponse
} from '../../src/schemas/generated/schemas.js';

describe('TASK-55: Batch Offline Sync Endpoint (POST /api/sync) (RNF-03, CL-10, Constitución §3)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const sessionId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'athlete@smartforge.test',
      google_id: 'google-sub-123'
    },
    jwtSecret
  );

  const sampleAthlete: AthleteProfile = {
    id: athleteId,
    google_id: 'google-sub-123',
    email: 'athlete@smartforge.test',
    name: 'Atleta Offline',
    age: 26,
    weight_kg: 75,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 4,
    equipment: [{ id: 'barbell', name: 'Barra', category: 'barras' }],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const sampleActiveSession = {
    id: sessionId,
    athlete_id: athleteId,
    session_plan_id: '8ba7b810-9dad-11d1-80b4-00c04fd430ca',
    status: 'in_progress' as const,
    started_at: '2026-09-12T10:00:00.000Z',
    client_timestamp: '2026-09-12T10:00:00.000Z',
    created_at: '2026-09-12T10:00:00.000Z',
    updated_at: '2026-09-12T10:00:00.000Z'
  };

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', jwtSecret);

    vi.spyOn(athleteRepository, 'findById').mockResolvedValue(sampleAthlete);
    vi.spyOn(sessionRepository, 'findActiveByAthleteId').mockResolvedValue(sampleActiveSession);
    vi.spyOn(sessionRepository, 'findById').mockResolvedValue(sampleActiveSession);

    vi.spyOn(checkinRepository, 'findBySessionId').mockResolvedValue(null);
    vi.spyOn(checkinRepository, 'create').mockImplementation(async (data) => ({
      id: '9ba7b810-9dad-11d1-80b4-00c04fd430cb',
      session_id: data.session_id,
      fatigue_level: data.fatigue_level,
      joint_pains: data.joint_pains,
      created_at: new Date().toISOString()
    }));

    vi.spyOn(setLogRepository, 'findBySessionAndExercise').mockResolvedValue([]);
    vi.spyOn(setLogRepository, 'create').mockImplementation(async (data) => ({
      id: 'aba7b810-9dad-11d1-80b4-00c04fd430cc',
      session_id: data.session_id,
      exercise_id: data.exercise_id,
      set_number: data.set_number,
      reps_completed: data.reps_completed,
      weight_kg: data.weight_kg,
      rir: data.rir,
      client_timestamp: data.client_timestamp || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    vi.spyOn(painReportRepository, 'create').mockImplementation(async (data) => ({
      id: 'bba7b810-9dad-11d1-80b4-00c04fd430cd',
      session_id: data.session_id,
      exercise_id: data.exercise_id,
      joint: data.joint,
      side: data.side,
      intensity: data.intensity,
      notes: data.notes,
      client_timestamp: data.client_timestamp || new Date().toISOString(),
      created_at: new Date().toISOString()
    }));

    app = createApp();
  });

  it('should process a mixed batch (check-in, set logs, pain report) and return 200 with valid schema', async () => {
    const payload: SyncRequest = {
      checkins: [
        {
          fatigue_level: 2,
          joint_pains: [{ joint: 'hombro', side: 'derecha', intensity: 'leve' }]
        }
      ],
      sets: [
        {
          exercise_id: 'press_banca',
          set_number: 1,
          reps_completed: 10,
          weight_kg: 60,
          rir: 2,
          client_timestamp: '2026-09-12T10:05:00.000Z'
        },
        {
          exercise_id: 'press_banca',
          set_number: 2,
          reps_completed: 10,
          weight_kg: 60,
          rir: 2,
          client_timestamp: '2026-09-12T10:08:00.000Z'
        }
      ],
      pain_reports: [
        {
          exercise_id: 'press_banca',
          joint: 'hombro',
          side: 'derecha',
          intensity: 'leve',
          notes: 'Molestia leve en la 2da serie'
        }
      ]
    };

    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    expect(res.status).toBe(200);

    const parseResult = SyncResponseSchema.safeParse(res.body);
    expect(parseResult.success).toBe(true);

    const body: SyncResponse = res.body;
    expect(body.processed_count).toBe(4); // 1 checkin + 2 sets + 1 pain report
    expect(body.conflicts_count).toBe(0);
    expect(body.synced_at).toBeDefined();

    expect(checkinRepository.create).toHaveBeenCalledTimes(1);
    expect(setLogRepository.create).toHaveBeenCalledTimes(2);
    expect(painReportRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should handle empty sync batch and return 200', async () => {
    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.processed_count).toBe(0);
    expect(res.body.conflicts_count).toBe(0);
  });

  it('should return 207 multi-status when partial errors or conflicts occur', async () => {
    // Simular que checkin falla por duplicado
    vi.spyOn(checkinRepository, 'create').mockRejectedValueOnce(
      new Error('El check-in ya fue completado previamente')
    );

    const payload: SyncRequest = {
      checkins: [
        {
          fatigue_level: 3,
          joint_pains: []
        }
      ],
      sets: [
        {
          exercise_id: 'press_banca',
          set_number: 1,
          reps_completed: 8,
          weight_kg: 70,
          rir: 2,
          client_timestamp: '2026-09-12T10:05:00.000Z'
        }
      ]
    };

    const res = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${validToken}`)
      .send(payload);

    expect(res.status).toBe(207);

    const parseResult = SyncResponseSchema.safeParse(res.body);
    expect(parseResult.success).toBe(true);

    expect(res.body.processed_count).toBe(1); // Set was processed
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors?.length).toBeGreaterThan(0);
  });

  it('should return 401 when token is missing', async () => {
    const res = await request(app).post('/api/sync').send({});
    expect(res.status).toBe(401);
  });
});
