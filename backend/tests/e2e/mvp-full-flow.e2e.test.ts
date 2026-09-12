import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { exerciseRepository } from '../../src/repositories/exercise.repository.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { exerciseSwapRepository } from '../../src/repositories/exercise-swap.repository.js';
import { sessionRepository } from '../../src/repositories/session.repository.js';
import { checkinRepository } from '../../src/repositories/checkin.repository.js';
import { setLogRepository } from '../../src/repositories/set-log.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';

describe('TASK-80: Full MVP End-to-End Flow Verification (RF-01 to RF-10, RNF-01, RNF-02, RNF-03)', () => {
  let app: Express;
  const jwtSecret = 'e2e-super-secret-key-12345678901234567890';
  const athleteId = '11111111-1111-1111-1111-111111111111';
  const mesocycleId = '22222222-2222-2222-2222-222222222222';
  const weekPlanId = '33333333-3333-3333-3333-333333333333';
  const sessionPlanId = '44444444-4444-4444-4444-444444444444';
  const assignmentId = '55555555-5555-5555-5555-555555555555';
  const sessionId = '66666666-6666-6666-6666-666666666666';
  const setId = '77777777-7777-7777-7777-777777777777';

  let authToken: string;

  // In-memory mock database state for E2E flow
  let mockAthlete: any = null;
  let mockMesocycle: any = null;
  let mockSession: any = null;
  let mockCheckin: any = null;
  let mockSets: any[] = [];
  let mockPainReports: any[] = [];
  let mockSwaps: any[] = [];

  const catalogExercises = [
    {
      id: 'press_banca',
      name: 'Press de banca plano con barra',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.75,
      video_url: 'https://smartforge.app/videos/bench.mp4',
      instructions: 'Press con barra',
      is_active: true
    },
    {
      id: 'press_mancuernas',
      name: 'Press de banca con mancuernas',
      movement_pattern: 'empuje',
      primary_muscle: 'pecho',
      secondary_muscles: ['triceps', 'hombros'],
      equipment_id: 'dumbbells',
      is_compound: true,
      initial_load_ratio: 0.65,
      video_url: 'https://smartforge.app/videos/bench-db.mp4',
      instructions: 'Press con mancuernas',
      is_active: true
    },
    {
      id: 'remo_barra',
      name: 'Remo con barra',
      movement_pattern: 'tiron',
      primary_muscle: 'espalda',
      secondary_muscles: ['biceps'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.7,
      video_url: 'https://smartforge.app/videos/row.mp4',
      instructions: 'Remo horizontal',
      is_active: true
    },
    {
      id: 'sentadilla_barra',
      name: 'Sentadilla con barra',
      movement_pattern: 'rodilla_dominante',
      primary_muscle: 'cuadriceps',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.8,
      video_url: 'https://smartforge.app/videos/squat.mp4',
      instructions: 'Sentadilla profunda',
      is_active: true
    },
    {
      id: 'peso_muerto',
      name: 'Peso muerto con barra',
      movement_pattern: 'cadera_dominante',
      primary_muscle: 'isquiosurales',
      secondary_muscles: ['gluteos'],
      equipment_id: 'barbell',
      is_compound: true,
      initial_load_ratio: 0.9,
      video_url: 'https://smartforge.app/videos/deadlift.mp4',
      instructions: 'Bisagra de cadera',
      is_active: true
    },
    {
      id: 'plancha_abdominal',
      name: 'Plancha abdominal',
      movement_pattern: 'core',
      primary_muscle: 'core',
      secondary_muscles: [],
      equipment_id: 'bodyweight',
      is_compound: false,
      initial_load_ratio: 0.0,
      video_url: 'https://smartforge.app/videos/plank.mp4',
      instructions: 'Core estable',
      is_active: true
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.JWT_SECRET = jwtSecret;

    authToken = jwt.sign(
      {
        id: athleteId,
        email: 'e2e.athlete@smartforge.test',
        google_id: 'google-sub-e2e-123'
      },
      jwtSecret
    );

    mockAthlete = {
      id: athleteId,
      google_id: 'google-sub-e2e-123',
      email: 'e2e.athlete@smartforge.test',
      name: 'Atleta E2E',
      age: 26,
      weight_kg: 78,
      experience_level: 'intermedio',
      training_goal: 'hipertrofia',
      available_days_per_week: 4,
      equipment: [
        { id: 'barbell', name: 'Barra', category: 'barras' },
        { id: 'dumbbells', name: 'Mancuernas', category: 'mancuernas' },
        { id: 'bench_flat', name: 'Banco plano', category: 'bancos' }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockMesocycle = {
      id: mesocycleId,
      athlete_id: athleteId,
      name: 'Mesociclo 1 - Hipertrofia',
      experience_level: 'intermedio',
      training_goal: 'hipertrofia',
      periodization_type: 'ondulante',
      duration_weeks: 6,
      status: 'active',
      start_date: new Date().toISOString(),
      weeks: [
        {
          id: weekPlanId,
          mesocycle_id: mesocycleId,
          week_number: 1,
          is_deload: false,
          sessions: [
            {
              id: sessionPlanId,
              week_plan_id: weekPlanId,
              day_number: 1,
              name: 'Día 1 - Torso',
              exercise_assignments: [
                {
                  id: assignmentId,
                  session_plan_id: sessionPlanId,
                  exercise_id: 'press_banca',
                  exercise: catalogExercises[0],
                  order_in_session: 1,
                  target_sets: 3,
                  target_reps: 10,
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

    mockSession = {
      id: sessionId,
      athlete_id: athleteId,
      session_plan_id: sessionPlanId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockSets = [];
    mockPainReports = [];
    mockSwaps = [];

    // Repositories Spies
    vi.spyOn(athleteRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === athleteId) return mockAthlete;
      return null;
    });

    vi.spyOn(athleteRepository, 'findByGoogleId').mockImplementation(async (gid: string) => {
      if (gid === 'google-sub-e2e-123') return mockAthlete;
      return null;
    });

    vi.spyOn(athleteRepository, 'create').mockImplementation(async (data: any) => {
      mockAthlete = { ...mockAthlete, ...data, id: athleteId };
      return mockAthlete;
    });

    vi.spyOn(athleteRepository, 'update').mockImplementation(async (id: string, data: any) => {
      if (id === athleteId) {
        mockAthlete = { ...mockAthlete, ...data, updated_at: new Date().toISOString() };
        return mockAthlete;
      }
      return null;
    });

    vi.spyOn(exerciseRepository, 'findAll').mockResolvedValue(catalogExercises as any);
    vi.spyOn(exerciseRepository, 'findById').mockImplementation(async (id: string) => {
      return catalogExercises.find((e) => e.id === id) || null as any;
    });
    vi.spyOn(exerciseRepository, 'findAlternatives').mockImplementation(async (id: string) => {
      if (id === 'press_banca') {
        return [
          {
            original_exercise_id: 'press_banca',
            alternative_exercise: catalogExercises[1],
            similarity_score: 0.95
          }
        ] as any;
      }
      return [];
    });

    vi.spyOn(mesocycleRepository, 'create').mockImplementation(async (data: any) => {
      mockMesocycle = {
        ...data,
        status: data.status || 'active',
        id: mesocycleId,
        athlete_id: athleteId,
        weeks: (data.weeks || []).map((w: any, wIdx: number) => ({
          ...w,
          id: w.id || `week-${wIdx + 1}`,
          mesocycle_id: mesocycleId,
          sessions: (w.sessions || []).map((s: any, sIdx: number) => ({
            ...s,
            id: s.id || (wIdx === 0 && sIdx === 0 ? sessionPlanId : `session-${wIdx}-${sIdx}`),
            week_plan_id: w.id || `week-${wIdx + 1}`,
            exercise_assignments: (s.exercise_assignments || []).map((a: any, aIdx: number) => ({
              ...a,
              id: a.id || (wIdx === 0 && sIdx === 0 && aIdx === 0 ? assignmentId : `assignment-${wIdx}-${sIdx}-${aIdx}`),
              athlete_id: athleteId,
              mesocycle_id: mesocycleId,
              week_number: w.week_number || wIdx + 1,
              day_number: s.day_number || sIdx + 1,
              session_plan_id: s.id || (wIdx === 0 && sIdx === 0 ? sessionPlanId : `session-${wIdx}-${sIdx}`),
              exercise: catalogExercises.find((e) => e.id === a.exercise_id)
            }))
          }))
        }))
      };
      return mockMesocycle;
    });

    vi.spyOn(mesocycleRepository, 'findActiveByAthleteId').mockImplementation(async (id: string) => {
      if (id === athleteId && mockMesocycle?.status === 'active') return mockMesocycle;
      return null;
    });

    vi.spyOn(mesocycleRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === mesocycleId) return mockMesocycle;
      return null;
    });

    vi.spyOn(mesocycleRepository, 'archiveActiveByAthleteId').mockResolvedValue(1);

    vi.spyOn(mesocycleRepository, 'findAssignmentById').mockImplementation(async (id: string) => {
      for (const week of mockMesocycle?.weeks || []) {
        for (const session of week.sessions || []) {
          for (const assignment of session.exercise_assignments || []) {
            if (assignment.id === id) return assignment;
          }
        }
      }
      return null;
    });

    vi.spyOn(mesocycleRepository, 'updateAssignment').mockImplementation(async (id: string, data: any) => {
      for (const week of mockMesocycle?.weeks || []) {
        for (const session of week.sessions || []) {
          for (const assignment of session.exercise_assignments || []) {
            if (assignment.id === id) {
              Object.assign(assignment, data);
              return assignment;
            }
          }
        }
      }
      return null;
    });

    vi.spyOn(mesocycleRepository, 'cascadeAssignmentSwap').mockResolvedValue(1);

    vi.spyOn(exerciseSwapRepository, 'create').mockImplementation(async (data: any) => {
      mockSwaps.push(data);
      return data;
    });
    vi.spyOn(exerciseSwapRepository, 'findByAthleteId').mockImplementation(async () => mockSwaps);

    vi.spyOn(sessionRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === sessionId) {
        return {
          ...mockSession,
          checkin: mockCheckin,
          set_logs: mockSets,
          pain_reports: mockPainReports
        };
      }
      return null;
    });

    vi.spyOn(sessionRepository, 'create').mockImplementation(async (data: any) => {
      mockSession = { ...mockSession, ...data, id: sessionId, status: 'in_progress' };
      return mockSession;
    });

    vi.spyOn(sessionRepository, 'findActiveByAthleteId').mockImplementation(async (id: string) => {
      if (id === athleteId) return mockSession;
      return null;
    });

    vi.spyOn(sessionRepository, 'updateStatus').mockImplementation(async (id: string, status: any) => {
      if (id === sessionId) {
        mockSession.status = status;
        mockSession.completed_at = status === 'completed' ? new Date().toISOString() : null;
        return mockSession;
      }
      return null;
    });

    vi.spyOn(checkinRepository, 'create').mockImplementation(async (data: any) => {
      mockCheckin = { ...data, id: 'checkin-1', created_at: new Date().toISOString() };
      return mockCheckin;
    });
    vi.spyOn(checkinRepository, 'findBySessionId').mockImplementation(async (id: string) => {
      if (id === sessionId) return mockCheckin;
      return null;
    });

    vi.spyOn(setLogRepository, 'findById').mockImplementation(async (id: string) => {
      return mockSets.find((s) => s.id === id) || null;
    });
    vi.spyOn(setLogRepository, 'create').mockImplementation(async (data: any) => {
      const newSet = { ...data, id: setId, created_at: new Date().toISOString() };
      mockSets.push(newSet);
      return newSet;
    });
    vi.spyOn(setLogRepository, 'update').mockImplementation(async (id: string, data: any) => {
      const idx = mockSets.findIndex((s) => s.id === id);
      if (idx !== -1) {
        mockSets[idx] = { ...mockSets[idx], ...data, updated_at: new Date().toISOString() };
        return mockSets[idx];
      }
      return null;
    });
    vi.spyOn(setLogRepository, 'findBySessionId').mockImplementation(async (id: string) => {
      if (id === sessionId) return mockSets;
      return [];
    });
    vi.spyOn(setLogRepository, 'findBySessionAndExercise').mockImplementation(async (sId: string, eId: string) => {
      return mockSets.filter((s) => (s.session_id === sId || !s.session_id) && s.exercise_id === eId);
    });
    vi.spyOn(setLogRepository, 'findByAthleteAndExercise').mockImplementation(async () => mockSets);

    vi.spyOn(painReportRepository, 'create').mockImplementation(async (data: any) => {
      const report = { ...data, id: 'pain-1', created_at: new Date().toISOString() };
      mockPainReports.push(report);
      return report;
    });
    vi.spyOn(painReportRepository, 'findBySessionId').mockImplementation(async (id: string) => {
      if (id === sessionId) return mockPainReports;
      return [];
    });
    vi.spyOn(painReportRepository, 'findByAthleteAndJoint').mockImplementation(async () => mockPainReports);

    app = createApp();
  });

  it('Flow Step 1 to Step 10: Complete MVP Lifecycle', async () => {
    // -------------------------------------------------------------------------
    // 1. Atleta Profile Management (RF-01)
    // -------------------------------------------------------------------------
    const profileRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.email).toBe('e2e.athlete@smartforge.test');
    expect(profileRes.body.experience_level).toBe('intermedio');

    // -------------------------------------------------------------------------
    // 2. Mesocycle Auto-Periodization Generation (RF-02)
    // -------------------------------------------------------------------------
    const mesoRes = await request(app)
      .post('/api/mesocycles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        target_goal: 'hipertrofia',
        custom_duration_weeks: 6
      });

    expect(mesoRes.status).toBe(201);
    expect(mesoRes.body.duration_weeks).toBe(6);
    expect(mesoRes.body.status).toBe('active');
    expect(mesoRes.body.weeks).toHaveLength(6);

    const currentMesoRes = await request(app)
      .get('/api/mesocycles/current')
      .set('Authorization', `Bearer ${authToken}`);

    expect(currentMesoRes.status).toBe(200);
    expect(currentMesoRes.body.id).toBe(mesocycleId);

    // -------------------------------------------------------------------------
    // 3. Routine Exercise Alternatives & Substitution (RF-03)
    // -------------------------------------------------------------------------
    const altRes = await request(app)
      .get('/api/exercises/press_banca/alternatives')
      .set('Authorization', `Bearer ${authToken}`);

    expect(altRes.status).toBe(200);
    expect(altRes.body).toHaveLength(1);
    expect(altRes.body[0].alternative_exercise.id).toBe('press_mancuernas');

    const swapRes = await request(app)
      .post(`/api/assignments/${assignmentId}/swap`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        new_exercise_id: 'press_mancuernas',
        reason: 'preferencia_personal',
        notes: 'Sustitución por comodidad articular'
      });

    expect(swapRes.status).toBe(200);
    expect(swapRes.body.is_swapped).toBe(true);
    expect(swapRes.body.exercise_id).toBe('press_mancuernas');

    // -------------------------------------------------------------------------
    // 4. Session Start & Pre-Session Check-in (RF-04, RF-08)
    // -------------------------------------------------------------------------
    const sessionRes = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ session_plan_id: sessionPlanId });

    expect(sessionRes.status).toBe(201);
    expect(sessionRes.body.status).toBe('in_progress');

    const checkinRes = await request(app)
      .post(`/api/sessions/${sessionId}/checkin`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fatigue_level: 4,
        joint_pains: [
          {
            joint: 'hombro',
            side: 'bilateral',
            intensity: 'leve'
          }
        ]
      });

    expect(checkinRes.status).toBe(201);
    expect(checkinRes.body.fatigue_level).toBe(4);

    // -------------------------------------------------------------------------
    // 5. Rapid Set Logging and Modification (RF-05)
    // -------------------------------------------------------------------------
    const logSetRes = await request(app)
      .post(`/api/sessions/${sessionId}/sets`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        exercise_id: 'press_mancuernas',
        set_number: 1,
        weight_kg: 28,
        reps_completed: 10,
        rir: 2,
        client_timestamp: new Date().toISOString()
      });

    expect(logSetRes.status).toBe(201);
    expect(logSetRes.body.weight_kg).toBe(28);
    expect(logSetRes.body.reps_completed).toBe(10);

    const updateSetRes = await request(app)
      .put(`/api/sets/${setId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        weight_kg: 30,
        reps_completed: 10,
        rir: 1
      });

    expect(updateSetRes.status).toBe(200);
    expect(updateSetRes.body.weight_kg).toBe(30);

    // -------------------------------------------------------------------------
    // 6. Progressive Overload Calibration (RF-07)
    // -------------------------------------------------------------------------
    const progRes = await request(app)
      .get(`/api/assignments/${assignmentId}/progression`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(progRes.status).toBe(200);
    expect(progRes.body.assignment_id).toBe(assignmentId);
    expect(progRes.body.suggestion).toBeDefined();
    expect(progRes.body.suggestion.action).toBeDefined();

    // -------------------------------------------------------------------------
    // 7. In-Session Pain Report & Joint Audit (RF-06, RF-08)
    // -------------------------------------------------------------------------
    const painRes = await request(app)
      .post(`/api/sessions/${sessionId}/pain-reports`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        exercise_id: 'press_mancuernas',
        joint: 'hombro',
        side: 'bilateral',
        intensity: 'moderada',
        notes: 'Leve molestia en el fondo del movimiento'
      });

    expect(painRes.status).toBe(201);
    expect(painRes.body.intensity).toBe('moderada');

    // -------------------------------------------------------------------------
    // 8. Session Completion (RF-05)
    // -------------------------------------------------------------------------
    const completeRes = await request(app)
      .patch(`/api/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.status).toBe('completed');
    expect(completeRes.body.completed_at).toBeDefined();

    // -------------------------------------------------------------------------
    // 9. Offline Sync Batch Execution (RNF-03)
    // -------------------------------------------------------------------------
    const syncRes = await request(app)
      .post('/api/sync')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        sets: [
          {
            session_id: sessionId,
            exercise_id: 'remo_barra',
            set_number: 1,
            weight_kg: 60,
            reps_completed: 12,
            rir: 2,
            client_timestamp: new Date().toISOString()
          }
        ]
      });

    expect(syncRes.status).toBe(200);
    expect(syncRes.body.processed_count).toBeGreaterThanOrEqual(1);
    expect(syncRes.body.conflicts_count).toBe(0);
    expect(syncRes.body.synced_at).toBeDefined();

    // -------------------------------------------------------------------------
    // 10. Mesocycle Regeneration & Fatigue Rotation (RF-10)
    // -------------------------------------------------------------------------
    const rotatedMesoRes = await request(app)
      .post('/api/mesocycles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        target_goal: 'hipertrofia',
        custom_duration_weeks: 6
      });

    expect(rotatedMesoRes.status).toBe(201);
    expect(rotatedMesoRes.body.status).toBe('active');
  });
});
