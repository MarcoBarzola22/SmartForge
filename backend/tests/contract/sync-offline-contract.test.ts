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
import {
  SyncRequestSchema,
  SyncResponseSchema
} from '../../src/schemas/generated/schemas.js';
import type {
  AthleteProfile,
  SetLog,
  CheckInResponse,
  PainReport,
  SyncRequest,
  SyncResponse
} from '../../src/schemas/generated/schemas.js';

describe('TASK-57: Multi-Device Offline Sync Contract & Integration Tests (RNF-03, DT-10, Constitución §4)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const sessionId = '7ba7b810-9dad-11d1-80b4-00c04fd430c9';

  const validToken = jwt.sign(
    {
      id: athleteId,
      email: 'multidevice@smartforge.test',
      google_id: 'google-sub-multi'
    },
    jwtSecret
  );

  const sampleAthlete: AthleteProfile = {
    id: athleteId,
    google_id: 'google-sub-multi',
    email: 'multidevice@smartforge.test',
    name: 'Atleta Multi-Device',
    age: 28,
    weight_kg: 80,
    experience_level: 'avanzado',
    training_goal: 'fuerza',
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

  // Simulación de base de datos en memoria para soportar múltiples syncs concurrentes
  let inMemoryCheckin: CheckInResponse | null = null;
  let inMemorySets: SetLog[] = [];
  let inMemoryPainReports: PainReport[] = [];

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', jwtSecret);

    inMemoryCheckin = null;
    inMemorySets = [];
    inMemoryPainReports = [];

    vi.spyOn(athleteRepository, 'findById').mockResolvedValue(sampleAthlete);
    vi.spyOn(sessionRepository, 'findActiveByAthleteId').mockResolvedValue(sampleActiveSession);
    vi.spyOn(sessionRepository, 'findById').mockResolvedValue(sampleActiveSession);

    // Mock checkin repository
    vi.spyOn(checkinRepository, 'findBySessionId').mockImplementation(async (sId) => {
      return inMemoryCheckin && inMemoryCheckin.session_id === sId ? inMemoryCheckin : null;
    });
    vi.spyOn(checkinRepository, 'create').mockImplementation(async (data) => {
      const newCheckin: CheckInResponse = {
        id: 'chk-1',
        session_id: data.session_id,
        fatigue_level: data.fatigue_level,
        joint_pains: data.joint_pains,
        created_at: new Date().toISOString()
      };
      inMemoryCheckin = newCheckin;
      return newCheckin;
    });

    // Mock set log repository
    vi.spyOn(setLogRepository, 'findBySessionAndExercise').mockImplementation(async (sId, exId) => {
      return inMemorySets.filter((s) => s.session_id === sId && s.exercise_id === exId);
    });
    vi.spyOn(setLogRepository, 'create').mockImplementation(async (data) => {
      const newSet: SetLog = {
        id: `set-${inMemorySets.length + 1}`,
        session_id: data.session_id,
        exercise_id: data.exercise_id,
        set_number: data.set_number,
        reps_completed: data.reps_completed,
        weight_kg: data.weight_kg,
        rir: data.rir,
        client_timestamp: data.client_timestamp || new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      inMemorySets.push(newSet);
      return newSet;
    });
    vi.spyOn(setLogRepository, 'update').mockImplementation(async (id, data) => {
      const found = inMemorySets.find((s) => s.id === id);
      if (found) {
        if (data.reps_completed !== undefined) found.reps_completed = data.reps_completed;
        if (data.weight_kg !== undefined) found.weight_kg = data.weight_kg;
        if (data.rir !== undefined) found.rir = data.rir;
        if (data.client_timestamp !== undefined) found.client_timestamp = data.client_timestamp;
        found.updated_at = new Date().toISOString();
        return found;
      }
      return null;
    });

    // Mock pain report repository
    vi.spyOn(painReportRepository, 'create').mockImplementation(async (data) => {
      const newReport: PainReport = {
        id: `pain-${inMemoryPainReports.length + 1}`,
        session_id: data.session_id,
        exercise_id: data.exercise_id,
        joint: data.joint,
        side: data.side,
        intensity: data.intensity,
        notes: data.notes,
        created_at: new Date().toISOString()
      };
      inMemoryPainReports.push(newReport);
      return newReport;
    });

    app = createApp();
  });

  describe('Contract Compliance: OpenAPI Schema Validation', () => {
    it('should validate that request and response conform strictly to OpenAPI Sync schemas', async () => {
      const validPayload: SyncRequest = {
        checkins: [
          {
            fatigue_level: 2,
            joint_pains: []
          }
        ],
        sets: [
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 10,
            weight_kg: 80,
            rir: 2,
            client_timestamp: '2026-09-12T10:05:00.000Z'
          }
        ],
        pain_reports: [
          {
            exercise_id: 'press_banca',
            joint: 'hombro',
            side: 'derecha',
            intensity: 'leve',
            notes: 'Sin dolor limitante'
          }
        ]
      };

      // Validate request against schema
      const reqValidation = SyncRequestSchema.safeParse(validPayload);
      expect(reqValidation.success).toBe(true);

      const res = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      expect(res.status).toBe(200);

      // Validate response against schema
      const resValidation = SyncResponseSchema.safeParse(res.body);
      expect(resValidation.success).toBe(true);

      const body: SyncResponse = res.body;
      expect(typeof body.processed_count).toBe('number');
      expect(typeof body.conflicts_count).toBe('number');
      expect(typeof body.synced_at).toBe('string');
      expect(body.processed_count).toBe(3);
      expect(body.conflicts_count).toBe(0);
    });

    it('should also work on /sync route alias for OpenAPI route compliance', async () => {
      const res = await request(app)
        .post('/sync')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(200);
      const resValidation = SyncResponseSchema.safeParse(res.body);
      expect(resValidation.success).toBe(true);
    });
  });

  describe('Multi-Device Simulated Offline Synchronization Flow', () => {
    it('should correctly handle alternating syncs between Device A (Phone) and Device B (Watch) with LWW', async () => {
      // 1. Device A (Phone) registra Set 1 a las 10:05:00 mientras entrena offline
      const deviceAPayload1: SyncRequest = {
        sets: [
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 8,
            weight_kg: 70,
            rir: 3,
            client_timestamp: '2026-09-12T10:05:00.000Z'
          }
        ]
      };

      // Device A sincroniza primero
      const resA1 = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${validToken}`)
        .send(deviceAPayload1);

      expect(resA1.status).toBe(200);
      expect(resA1.body.processed_count).toBe(1);
      expect(resA1.body.conflicts_count).toBe(0);
      expect(inMemorySets).toHaveLength(1);
      expect(inMemorySets[0].reps_completed).toBe(8);
      expect(inMemorySets[0].weight_kg).toBe(70);

      // 2. Device B (Watch/Tablet) edita Set 1 a las 10:08:00 (offline) corrigiendo el peso a 75kg y reps a 10
      const deviceBPayload: SyncRequest = {
        sets: [
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 10,
            weight_kg: 75,
            rir: 2,
            client_timestamp: '2026-09-12T10:08:00.000Z' // Timestamp posterior
          },
          {
            exercise_id: 'press_banca',
            set_number: 2,
            reps_completed: 10,
            weight_kg: 75,
            rir: 2,
            client_timestamp: '2026-09-12T10:11:00.000Z'
          }
        ]
      };

      // Device B sincroniza
      const resB = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${validToken}`)
        .send(deviceBPayload);

      expect(resB.status).toBe(207); // 1 conflicto resuelto (Set 1) + 1 nuevo (Set 2)
      expect(resB.body.conflicts_count).toBe(1);
      expect(resB.body.processed_count).toBe(2);

      // Comprobar que en BD Set 1 fue sobrescrito con los datos de Device B
      const set1InDb = inMemorySets.find((s) => s.set_number === 1);
      expect(set1InDb?.reps_completed).toBe(10);
      expect(set1InDb?.weight_kg).toBe(75);
      expect(set1InDb?.client_timestamp).toBe('2026-09-12T10:08:00.000Z');

      // 3. Device A intenta sincronizar de nuevo un snapshot antiguo con timestamp 10:05:00
      const deviceAPayloadStale: SyncRequest = {
        sets: [
          {
            exercise_id: 'press_banca',
            set_number: 1,
            reps_completed: 8,
            weight_kg: 70,
            rir: 3,
            client_timestamp: '2026-09-12T10:05:00.000Z' // Timestamp anterior al de BD (10:08:00)
          }
        ]
      };

      const resAStale = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${validToken}`)
        .send(deviceAPayloadStale);

      expect(resAStale.status).toBe(207);
      expect(resAStale.body.conflicts_count).toBe(1);
      expect(resAStale.body.processed_count).toBe(0); // Escritura obsoleta descartada

      // Comprobar que los datos en BD NO fueron sobreescritos por la versión obsoleta de Device A
      const set1AfterStale = inMemorySets.find((s) => s.set_number === 1);
      expect(set1AfterStale?.reps_completed).toBe(10);
      expect(set1AfterStale?.weight_kg).toBe(75);
      expect(set1AfterStale?.client_timestamp).toBe('2026-09-12T10:08:00.000Z');
    });

    it('should merge independent entities from two devices (Checkin from A, Pain report from B)', async () => {
      // Device A sincroniza check-in
      const resA = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          checkins: [{ fatigue_level: 2, joint_pains: [] }]
        });
      expect(resA.status).toBe(200);
      expect(resA.body.processed_count).toBe(1);

      // Device B sincroniza reporte de molestia
      const resB = await request(app)
        .post('/api/sync')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          pain_reports: [
            {
              exercise_id: 'press_banca',
              joint: 'hombro',
              side: 'izquierda',
              intensity: 'moderada'
            }
          ]
        });
      expect(resB.status).toBe(200);
      expect(resB.body.processed_count).toBe(1);

      expect(inMemoryCheckin).not.toBeNull();
      expect(inMemoryCheckin?.fatigue_level).toBe(2);
      expect(inMemoryPainReports).toHaveLength(1);
      expect(inMemoryPainReports[0].joint).toBe('hombro');
    });
  });
});
