import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/app.js';
import { athleteRepository } from '../../src/repositories/athlete.repository.js';
import { exerciseRepository } from '../../src/repositories/exercise.repository.js';
import { mesocycleRepository } from '../../src/repositories/mesocycle.repository.js';
import { exerciseSwapRepository } from '../../src/repositories/exercise-swap.repository.js';
import { painReportRepository } from '../../src/repositories/pain-report.repository.js';
import { MesocycleDetailSchema } from '../../src/schemas/generated/schemas.js';
import type {
  AthleteProfile,
  Exercise,
  MesocycleDetail
} from '../../src/schemas/generated/schemas.js';

describe('TASK-54: Mesocycle Regeneration & Rotation Endpoint (POST /api/mesocycles)', () => {
  let app: Express;
  const jwtSecret = 'test-secret-key-12345678901234567890';
  const athleteId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const prevMesocycleId = '8ba7b810-9dad-11d1-80b4-00c04fd430ca';
  const newMesocycleId = '9ba7b810-9dad-11d1-80b4-00c04fd430cb';

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
    name: 'Atleta Pro',
    age: 28,
    weight_kg: 80,
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    available_days_per_week: 3,
    equipment: [
      { id: 'barbell', name: 'Barra Olímpica', category: 'barras' },
      { id: 'dumbbells', name: 'Mancuernas', category: 'peso_libre' },
      { id: 'cable', name: 'Polea', category: 'maquinas' }
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const compoundBench: Exercise = {
    id: 'press_banca',
    name: 'Press de banca',
    movement_pattern: 'empuje',
    primary_muscle: 'pecho',
    secondary_muscles: ['triceps'],
    equipment_id: 'barbell',
    is_compound: true,
    initial_load_ratio: 0.75,
    video_url: 'https://youtube.com/watch?v=1',
    video_fallback_url: 'https://assets.smartforge.app/1.webp',
    instructions: 'Empuja.',
    is_active: true
  };

  const accessoryTricepsCable: Exercise = {
    id: 'triceps_polea',
    name: 'Extensión de tríceps en polea',
    movement_pattern: 'empuje',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment_id: 'cable',
    is_compound: false,
    initial_load_ratio: 0.25,
    video_url: 'https://youtube.com/watch?v=2',
    video_fallback_url: 'https://assets.smartforge.app/2.webp',
    instructions: 'Extensión.',
    is_active: true
  };

  const accessoryTricepsDb: Exercise = {
    id: 'triceps_mancuerna',
    name: 'Extensión de tríceps con mancuerna',
    movement_pattern: 'empuje',
    primary_muscle: 'triceps',
    secondary_muscles: [],
    equipment_id: 'dumbbells',
    is_compound: false,
    initial_load_ratio: 0.2,
    video_url: 'https://youtube.com/watch?v=3',
    video_fallback_url: 'https://assets.smartforge.app/3.webp',
    instructions: 'Extensión mancuerna.',
    is_active: true
  };

  const sampleCatalog: Exercise[] = [
    compoundBench,
    accessoryTricepsCable,
    accessoryTricepsDb
  ];

  const samplePreviousMesocycle: MesocycleDetail = {
    id: prevMesocycleId,
    athlete_id: athleteId,
    name: 'Mesociclo HIPERTROFIA - intermedio (Anterior)',
    experience_level: 'intermedio',
    training_goal: 'hipertrofia',
    periodization_type: 'ondulante',
    duration_weeks: 6,
    status: 'active',
    start_date: '2026-08-01',
    weeks: [
      {
        id: 'w-prev-1',
        mesocycle_id: prevMesocycleId,
        week_number: 1,
        is_deload: false,
        sessions: [
          {
            id: 's-prev-1',
            week_plan_id: 'w-prev-1',
            day_number: 1,
            name: 'Día 1 - Torso',
            exercise_assignments: [
              {
                id: 'a-prev-1',
                session_plan_id: 's-prev-1',
                exercise_id: 'press_banca',
                exercise: compoundBench,
                order_in_session: 1,
                target_sets: 4,
                target_reps: 10,
                target_rir: 2,
                target_load_kg: 85.0, // Progresó a 85 kg
                is_swapped: false
              },
              {
                id: 'a-prev-2',
                session_plan_id: 's-prev-1',
                exercise_id: 'triceps_polea',
                exercise: accessoryTricepsCable,
                order_in_session: 2,
                target_sets: 3,
                target_reps: 12,
                target_rir: 2,
                target_load_kg: 25.0,
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

    vi.spyOn(athleteRepository, 'findById').mockResolvedValue(sampleAthlete);
    vi.spyOn(exerciseRepository, 'findAll').mockResolvedValue(sampleCatalog);
    vi.spyOn(exerciseSwapRepository, 'findByAthleteId').mockResolvedValue([]);
    vi.spyOn(painReportRepository, 'findBySessionId').mockResolvedValue([]);

    vi.spyOn(mesocycleRepository, 'findActiveByAthleteId').mockResolvedValue(
      samplePreviousMesocycle
    );
    vi.spyOn(mesocycleRepository, 'archiveActiveByAthleteId').mockResolvedValue(1);

    vi.spyOn(mesocycleRepository, 'create').mockImplementation(async (data) => ({
      id: newMesocycleId,
      athlete_id: data.athlete_id,
      name: data.name,
      experience_level: data.experience_level,
      training_goal: data.training_goal,
      periodization_type: data.periodization_type,
      duration_weeks: data.duration_weeks,
      status: 'active',
      start_date: '2026-09-12',
      weeks: data.weeks.map((w, wIdx) => {
        const weekId = `9ba7b810-9dad-11d1-80b4-00c04fd430${wIdx.toString().padStart(2, '0')}`;
        return {
          id: weekId,
          mesocycle_id: newMesocycleId,
          week_number: w.week_number,
          is_deload: w.is_deload,
          sessions: w.sessions.map((s, sIdx) => {
            const sessionId = `aba7b810-9dad-11d1-80b4-00c04fd430${sIdx.toString().padStart(2, '0')}`;
            return {
              id: sessionId,
              week_plan_id: weekId,
              day_number: s.day_number,
              name: s.name,
              exercise_assignments: s.exercise_assignments.map((a, aIdx) => ({
                id: `bba7b810-9dad-11d1-80b4-00c04fd430${aIdx.toString().padStart(2, '0')}`,
                session_plan_id: sessionId,
                exercise_id: a.exercise_id,
                exercise: sampleCatalog.find((e) => e.id === a.exercise_id) || compoundBench,
                order_in_session: a.order_in_session,
                target_sets: a.target_sets,
                target_reps: a.target_reps,
                target_rir: a.target_rir,
                target_load_kg: a.target_load_kg,
                notes: a.notes,
                is_swapped: false
              }))
            };
          })
        };
      })
    }));

    app = createApp();
  });

  it('should rotate mesocycle preserving compound historical load and archiving previous active mesocycle', async () => {
    const res = await request(app)
      .post('/api/mesocycles')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(201);

    // Validate OpenAPI contract response schema
    const parseResult = MesocycleDetailSchema.safeParse(res.body);
    expect(parseResult.success).toBe(true);

    // Verify previous active mesocycle was archived
    expect(mesocycleRepository.archiveActiveByAthleteId).toHaveBeenCalledWith(athleteId);

    // Verify new mesocycle was created with preserved compound progression and rotated accessory
    const createdMesocycle: MesocycleDetail = res.body;
    expect(createdMesocycle.id).toBe(newMesocycleId);
    expect(createdMesocycle.duration_weeks).toBe(6);

    const week1Session = createdMesocycle.weeks[0].sessions[0];
    expect(week1Session.exercise_assignments).toHaveLength(2);

    // 1. Compound (Press de banca) preserved with historical load (>= 85 kg)
    const compoundAsg = week1Session.exercise_assignments[0];
    expect(compoundAsg.exercise_id).toBe('press_banca');
    expect(compoundAsg.target_load_kg).toBeGreaterThanOrEqual(85.0);

    // 2. Accessory (triceps_polea) rotated to triceps_mancuerna
    const accessoryAsg = week1Session.exercise_assignments[1];
    expect(accessoryAsg.exercise_id).not.toBe('triceps_polea');
    expect(accessoryAsg.exercise_id).toBe('triceps_mancuerna');
  });

  it('should allow overriding training goal and duration when regenerating/rotating', async () => {
    const res = await request(app)
      .post('/api/mesocycles')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        target_goal: 'fuerza',
        custom_duration_weeks: 4
      });

    expect(res.status).toBe(201);
    expect(res.body.training_goal).toBe('fuerza');
    expect(res.body.duration_weeks).toBe(4);
    expect(res.body.weeks).toHaveLength(4);
  });

  it('should return 401 when token is missing', async () => {
    const res = await request(app).post('/api/mesocycles').send({});
    expect(res.status).toBe(401);
  });
});
