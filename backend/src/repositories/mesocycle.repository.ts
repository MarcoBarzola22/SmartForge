import { pool } from '../config/db.js';
import type {
  MesocycleDetail,
  WeekPlan,
  SessionPlan,
  ExerciseAssignment,
  Exercise,
  ExperienceLevel,
  TrainingGoal,
  PeriodizationType,
  MesocycleStatus,
  MovementPattern,
  MuscleGroup
} from '../schemas/generated/schemas.js';

export interface CreateExerciseAssignmentData {
  exercise_id: string;
  order_in_session: number;
  target_sets: number;
  target_reps: number;
  target_rir: number;
  target_load_kg: number;
  notes?: string;
}

export interface CreateSessionPlanData {
  day_number: number;
  name: string;
  exercise_assignments: CreateExerciseAssignmentData[];
}

export interface CreateWeekPlanData {
  week_number: number;
  is_deload: boolean;
  sessions: CreateSessionPlanData[];
}

export interface CreateMesocycleData {
  athlete_id: string;
  name: string;
  experience_level: ExperienceLevel;
  training_goal: TrainingGoal;
  periodization_type: PeriodizationType;
  duration_weeks: number;
  start_date?: string;
  weeks: CreateWeekPlanData[];
}

export interface PoolClientLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
  release: () => void;
}

export interface PoolLike {
  connect: () => Promise<PoolClientLike>;
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
}

function formatDateString(val: unknown): string {
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === 'string' && val.length > 0) {
    return val.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function formatOptionalDateString(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return String(val).slice(0, 10);
}

export class MesocycleRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  private mapExerciseRow(row: Record<string, unknown>): Exercise {
    return {
      id: String(row.e_id || row.exercise_id || row.id || ''),
      name: String(row.e_name || row.exercise_name || row.name || ''),
      movement_pattern: ((row.e_movement_pattern || row.movement_pattern || 'empuje') as MovementPattern),
      primary_muscle: ((row.e_primary_muscle || row.primary_muscle || 'pecho') as MuscleGroup),
      secondary_muscles: ((row.e_secondary_muscles || row.secondary_muscles || []) as MuscleGroup[]),
      equipment_id: String(row.e_equipment_id || row.equipment_id || 'barbell'),
      is_compound: Boolean(row.e_is_compound ?? row.is_compound ?? true),
      initial_load_ratio: Number(
        parseFloat(String(row.e_initial_load_ratio || row.initial_load_ratio || 0.6))
      ),
      video_url: String(
        row.e_video_url || row.video_url || 'https://www.youtube.com/watch?v=placeholder'
      ),
      video_fallback_url: String(
        row.e_video_fallback_url ||
          row.video_fallback_url ||
          'https://assets.smartforge.app/fallbacks/default.webp'
      ),
      instructions: String(row.e_instructions || row.instructions || ''),
      is_active: Boolean(row.e_is_active ?? row.is_active ?? true)
    };
  }

  /**
   * Persiste un mesociclo completo (con semanas, sesiones y ejercicios asignados)
   * de forma atómica dentro de una única transacción SQL.
   */
  async create(data: CreateMesocycleData): Promise<MesocycleDetail> {
    const client = await this.dbPool.connect();

    try {
      await client.query('BEGIN');

      const insertMesocycleSql = `
        INSERT INTO mesocycle (
          athlete_id, name, experience_level, training_goal, periodization_type,
          duration_weeks, status, start_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'active', COALESCE($7, CURRENT_DATE))
        RETURNING id, athlete_id, name, experience_level, training_goal, periodization_type,
                  duration_weeks, status, start_date, end_date, created_at, updated_at;
      `;

      const mesoResult = await client.query(insertMesocycleSql, [
        data.athlete_id,
        data.name,
        data.experience_level,
        data.training_goal,
        data.periodization_type,
        data.duration_weeks,
        data.start_date || null
      ]);

      const mesoRow = mesoResult.rows[0] as Record<string, unknown>;
      const mesocycleId = String(mesoRow.id);

      // Collect all exercise IDs to fetch their full metadata in a single query
      const exerciseIdSet = new Set<string>();
      for (const week of data.weeks) {
        for (const session of week.sessions) {
          for (const assignment of session.exercise_assignments) {
            exerciseIdSet.add(assignment.exercise_id);
          }
        }
      }

      const exerciseMap = new Map<string, Exercise>();
      if (exerciseIdSet.size > 0) {
        const exerciseSql = `
          SELECT id, name, movement_pattern, primary_muscle, secondary_muscles,
                 equipment_id, is_compound, initial_load_ratio, video_url,
                 video_fallback_url, instructions, is_active
          FROM exercise
          WHERE id = ANY($1::varchar[]);
        `;
        const exerciseRes = await client.query(exerciseSql, [Array.from(exerciseIdSet)]);
        for (const row of exerciseRes.rows || []) {
          const ex = this.mapExerciseRow(row as Record<string, unknown>);
          exerciseMap.set(ex.id, ex);
        }
      }

      const createdWeeks: WeekPlan[] = [];

      for (const week of data.weeks) {
        const insertWeekSql = `
          INSERT INTO week_plan (mesocycle_id, week_number, is_deload)
          VALUES ($1, $2, $3)
          RETURNING id, mesocycle_id, week_number, is_deload;
        `;

        const weekResult = await client.query(insertWeekSql, [
          mesocycleId,
          week.week_number,
          week.is_deload
        ]);

        const weekRow = weekResult.rows[0] as Record<string, unknown>;
        const weekPlanId = String(weekRow.id);
        const createdSessions: SessionPlan[] = [];

        for (const session of week.sessions) {
          const insertSessionSql = `
            INSERT INTO session_plan (week_plan_id, day_number, name)
            VALUES ($1, $2, $3)
            RETURNING id, week_plan_id, day_number, name;
          `;

          const sessionResult = await client.query(insertSessionSql, [
            weekPlanId,
            session.day_number,
            session.name
          ]);

          const sessionRow = sessionResult.rows[0] as Record<string, unknown>;
          const sessionPlanId = String(sessionRow.id);
          const createdAssignments: ExerciseAssignment[] = [];

          for (const assignment of session.exercise_assignments) {
            const insertAssignmentSql = `
              INSERT INTO exercise_assignment (
                session_plan_id, exercise_id, order_in_session, target_sets,
                target_reps, target_rir, target_load_kg, notes, is_swapped
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
              RETURNING id, session_plan_id, exercise_id, order_in_session, target_sets,
                        target_reps, target_rir, target_load_kg, notes, is_swapped;
            `;

            const assignmentResult = await client.query(insertAssignmentSql, [
              sessionPlanId,
              assignment.exercise_id,
              assignment.order_in_session,
              assignment.target_sets,
              assignment.target_reps,
              assignment.target_rir,
              assignment.target_load_kg,
              assignment.notes || null
            ]);

            const assignmentRow = assignmentResult.rows[0] as Record<string, unknown>;
            const fullExercise: Exercise = exerciseMap.get(assignment.exercise_id) || {
              id: assignment.exercise_id,
              name: assignment.exercise_id,
              movement_pattern: 'empuje',
              primary_muscle: 'pecho',
              secondary_muscles: [],
              equipment_id: 'barbell',
              is_compound: true,
              initial_load_ratio: 0.6,
              video_url: 'https://www.youtube.com/watch?v=placeholder',
              video_fallback_url: 'https://assets.smartforge.app/fallbacks/default.webp',
              instructions: '',
              is_active: true
            };

            createdAssignments.push({
              id: String(assignmentRow.id),
              session_plan_id: sessionPlanId,
              exercise_id: String(assignmentRow.exercise_id),
              exercise: fullExercise,
              order_in_session: Number(assignmentRow.order_in_session),
              target_sets: Number(assignmentRow.target_sets),
              target_reps: Number(assignmentRow.target_reps),
              target_rir: Number(assignmentRow.target_rir),
              target_load_kg: Number(parseFloat(String(assignmentRow.target_load_kg))),
              notes: assignmentRow.notes ? String(assignmentRow.notes) : undefined,
              is_swapped: Boolean(assignmentRow.is_swapped)
            });
          }

          createdSessions.push({
            id: sessionPlanId,
            week_plan_id: weekPlanId,
            day_number: Number(sessionRow.day_number),
            name: String(sessionRow.name),
            exercise_assignments: createdAssignments
          });
        }

        createdWeeks.push({
          id: weekPlanId,
          mesocycle_id: mesocycleId,
          week_number: Number(weekRow.week_number),
          is_deload: Boolean(weekRow.is_deload),
          sessions: createdSessions
        });
      }

      await client.query('COMMIT');

      return {
        id: mesocycleId,
        athlete_id: String(mesoRow.athlete_id),
        name: String(mesoRow.name),
        experience_level: mesoRow.experience_level as ExperienceLevel,
        training_goal: mesoRow.training_goal as TrainingGoal,
        periodization_type: mesoRow.periodization_type as PeriodizationType,
        duration_weeks: Number(mesoRow.duration_weeks),
        status: mesoRow.status as MesocycleStatus,
        start_date: formatDateString(mesoRow.start_date),
        end_date: formatOptionalDateString(mesoRow.end_date),
        weeks: createdWeeks
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Recupera la estructura jerárquica completa de un mesociclo por ID.
   */
  async findById(id: string): Promise<MesocycleDetail | null> {
    const mesoSql = `
      SELECT id, athlete_id, name, experience_level, training_goal,
             periodization_type, duration_weeks, status, start_date, end_date
      FROM mesocycle
      WHERE id = $1;
    `;

    const mesoRes = await this.dbPool.query(mesoSql, [id]);
    if (!mesoRes.rows || mesoRes.rows.length === 0) {
      return null;
    }

    const mesoRow = mesoRes.rows[0] as Record<string, unknown>;

    // Fetch week plans
    const weeksSql = `
      SELECT id, mesocycle_id, week_number, is_deload
      FROM week_plan
      WHERE mesocycle_id = $1
      ORDER BY week_number ASC;
    `;
    const weeksRes = await this.dbPool.query(weeksSql, [id]);
    const weekRows = (weeksRes.rows || []) as Record<string, unknown>[];

    if (weekRows.length === 0) {
      return {
        id: String(mesoRow.id),
        athlete_id: String(mesoRow.athlete_id),
        name: String(mesoRow.name),
        experience_level: mesoRow.experience_level as ExperienceLevel,
        training_goal: mesoRow.training_goal as TrainingGoal,
        periodization_type: mesoRow.periodization_type as PeriodizationType,
        duration_weeks: Number(mesoRow.duration_weeks),
        status: mesoRow.status as MesocycleStatus,
        start_date: formatDateString(mesoRow.start_date),
        end_date: formatOptionalDateString(mesoRow.end_date),
        weeks: []
      };
    }

    const weekIds = weekRows.map((w) => String(w.id));

    // Fetch session plans
    const sessionsSql = `
      SELECT id, week_plan_id, day_number, name
      FROM session_plan
      WHERE week_plan_id = ANY($1::uuid[])
      ORDER BY day_number ASC;
    `;
    const sessionsRes = await this.dbPool.query(sessionsSql, [weekIds]);
    const sessionRows = (sessionsRes.rows || []) as Record<string, unknown>[];
    const sessionIds = sessionRows.map((s) => String(s.id));

    // Fetch exercise assignments with exercise metadata
    let assignmentRows: Record<string, unknown>[] = [];
    if (sessionIds.length > 0) {
      const assignmentsSql = `
        SELECT ea.id, ea.session_plan_id, ea.exercise_id, ea.order_in_session,
               ea.target_sets, ea.target_reps, ea.target_rir, ea.target_load_kg,
               ea.notes, ea.is_swapped,
               e.id AS e_id, e.name AS e_name, e.movement_pattern AS e_movement_pattern,
               e.primary_muscle AS e_primary_muscle, e.secondary_muscles AS e_secondary_muscles,
               e.equipment_id AS e_equipment_id, e.is_compound AS e_is_compound,
               e.initial_load_ratio AS e_initial_load_ratio, e.video_url AS e_video_url,
               e.video_fallback_url AS e_video_fallback_url, e.instructions AS e_instructions,
               e.is_active AS e_is_active
        FROM exercise_assignment ea
        LEFT JOIN exercise e ON ea.exercise_id = e.id
        WHERE ea.session_plan_id = ANY($1::uuid[])
        ORDER BY ea.order_in_session ASC;
      `;
      const assignmentsRes = await this.dbPool.query(assignmentsSql, [sessionIds]);
      assignmentRows = (assignmentsRes.rows || []) as Record<string, unknown>[];
    }

    // Map hierarchy
    const assignmentsBySession = new Map<string, ExerciseAssignment[]>();
    for (const a of assignmentRows) {
      const sId = String(a.session_plan_id);
      if (!assignmentsBySession.has(sId)) {
        assignmentsBySession.set(sId, []);
      }
      assignmentsBySession.get(sId)!.push({
        id: String(a.id),
        session_plan_id: sId,
        exercise_id: String(a.exercise_id),
        exercise: this.mapExerciseRow(a),
        order_in_session: Number(a.order_in_session),
        target_sets: Number(a.target_sets),
        target_reps: Number(a.target_reps),
        target_rir: Number(a.target_rir),
        target_load_kg: Number(parseFloat(String(a.target_load_kg))),
        notes: a.notes ? String(a.notes) : undefined,
        is_swapped: Boolean(a.is_swapped)
      });
    }

    const sessionsByWeek = new Map<string, SessionPlan[]>();
    for (const s of sessionRows) {
      const wId = String(s.week_plan_id);
      if (!sessionsByWeek.has(wId)) {
        sessionsByWeek.set(wId, []);
      }
      const sId = String(s.id);
      sessionsByWeek.get(wId)!.push({
        id: sId,
        week_plan_id: wId,
        day_number: Number(s.day_number),
        name: String(s.name),
        exercise_assignments: assignmentsBySession.get(sId) || []
      });
    }

    const weeks: WeekPlan[] = weekRows.map((w) => {
      const wId = String(w.id);
      return {
        id: wId,
        mesocycle_id: String(mesoRow.id),
        week_number: Number(w.week_number),
        is_deload: Boolean(w.is_deload),
        sessions: sessionsByWeek.get(wId) || []
      };
    });

    return {
      id: String(mesoRow.id),
      athlete_id: String(mesoRow.athlete_id),
      name: String(mesoRow.name),
      experience_level: mesoRow.experience_level as ExperienceLevel,
      training_goal: mesoRow.training_goal as TrainingGoal,
      periodization_type: mesoRow.periodization_type as PeriodizationType,
      duration_weeks: Number(mesoRow.duration_weeks),
      status: mesoRow.status as MesocycleStatus,
      start_date: formatDateString(mesoRow.start_date),
      end_date: formatOptionalDateString(mesoRow.end_date),
      weeks
    };
  }

  /**
   * Obtiene el mesociclo activo actual de un atleta.
   */
  async findActiveByAthleteId(athleteId: string): Promise<MesocycleDetail | null> {
    const sql = `
      SELECT id
      FROM mesocycle
      WHERE athlete_id = $1 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1;
    `;

    const res = await this.dbPool.query(sql, [athleteId]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0] as Record<string, unknown>;
    return this.findById(String(row.id));
  }

  /**
   * Marca cualquier mesociclo activo como 'archived' para un atleta dado.
   */
  async archiveActiveByAthleteId(athleteId: string): Promise<number> {
    const sql = `
      UPDATE mesocycle
      SET status = 'archived', updated_at = NOW()
      WHERE athlete_id = $1 AND status = 'active';
    `;

    const res = await this.dbPool.query(sql, [athleteId]);
    return Number(res.rowCount ?? 0);
  }

  /**
   * Actualiza el estado de un mesociclo por ID.
   */
  async updateStatus(id: string, status: MesocycleStatus): Promise<boolean> {
    const sql = `
      UPDATE mesocycle
      SET status = $2, updated_at = NOW()
      WHERE id = $1;
    `;

    const res = await this.dbPool.query(sql, [id, status]);
    return Number(res.rowCount ?? 0) > 0;
  }

  /**
   * Obtiene una asignación de ejercicio por ID con su contexto de sesión, semana y mesociclo.
   */
  async findAssignmentById(assignmentId: string): Promise<(ExerciseAssignment & {
    athlete_id: string;
    mesocycle_id: string;
    week_number: number;
    day_number: number;
  }) | null> {
    const sql = `
      SELECT ea.id, ea.session_plan_id, ea.exercise_id, ea.order_in_session,
             ea.target_sets, ea.target_reps, ea.target_rir, ea.target_load_kg,
             ea.notes, ea.is_swapped,
             sp.day_number, sp.name AS session_name,
             wp.week_number, wp.mesocycle_id,
             m.athlete_id,
             e.id AS e_id, e.name AS e_name, e.movement_pattern AS e_movement_pattern,
             e.primary_muscle AS e_primary_muscle, e.secondary_muscles AS e_secondary_muscles,
             e.equipment_id AS e_equipment_id, e.is_compound AS e_is_compound,
             e.initial_load_ratio AS e_initial_load_ratio, e.video_url AS e_video_url,
             e.video_fallback_url AS e_video_fallback_url, e.instructions AS e_instructions,
             e.is_active AS e_is_active
      FROM exercise_assignment ea
      JOIN session_plan sp ON ea.session_plan_id = sp.id
      JOIN week_plan wp ON sp.week_plan_id = wp.id
      JOIN mesocycle m ON wp.mesocycle_id = m.id
      LEFT JOIN exercise e ON ea.exercise_id = e.id
      WHERE ea.id = $1;
    `;

    const res = await this.dbPool.query(sql, [assignmentId]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    const a = res.rows[0] as Record<string, unknown>;
    return {
      id: String(a.id),
      session_plan_id: String(a.session_plan_id),
      exercise_id: String(a.exercise_id),
      exercise: this.mapExerciseRow(a),
      order_in_session: Number(a.order_in_session),
      target_sets: Number(a.target_sets),
      target_reps: Number(a.target_reps),
      target_rir: Number(a.target_rir),
      target_load_kg: Number(parseFloat(String(a.target_load_kg))),
      notes: a.notes ? String(a.notes) : undefined,
      is_swapped: Boolean(a.is_swapped),
      athlete_id: String(a.athlete_id),
      mesocycle_id: String(a.mesocycle_id),
      week_number: Number(a.week_number),
      day_number: Number(a.day_number)
    };
  }

  /**
   * Actualiza el ejercicio asignado en una sesión específica.
   */
  async updateAssignment(
    assignmentId: string,
    data: { exercise_id: string; target_load_kg?: number; is_swapped?: boolean; notes?: string }
  ): Promise<ExerciseAssignment | null> {
    const sql = `
      UPDATE exercise_assignment
      SET exercise_id = $2,
          target_load_kg = COALESCE($3, target_load_kg),
          is_swapped = COALESCE($4, true),
          notes = COALESCE($5, notes),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, session_plan_id, exercise_id, order_in_session, target_sets,
                target_reps, target_rir, target_load_kg, notes, is_swapped;
    `;

    const res = await this.dbPool.query(sql, [
      assignmentId,
      data.exercise_id,
      data.target_load_kg ?? null,
      data.is_swapped ?? true,
      data.notes ?? null
    ]);

    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    const fullAssignment = await this.findAssignmentById(assignmentId);
    if (!fullAssignment) {
      return null;
    }

    return {
      id: fullAssignment.id,
      session_plan_id: fullAssignment.session_plan_id,
      exercise_id: fullAssignment.exercise_id,
      exercise: fullAssignment.exercise,
      order_in_session: fullAssignment.order_in_session,
      target_sets: fullAssignment.target_sets,
      target_reps: fullAssignment.target_reps,
      target_rir: fullAssignment.target_rir,
      target_load_kg: fullAssignment.target_load_kg,
      notes: fullAssignment.notes,
      is_swapped: fullAssignment.is_swapped
    };
  }

  /**
   * Propaga en cascada la sustitución de un ejercicio a todas las semanas restantes del mesociclo.
   */
  async cascadeAssignmentSwap(
    mesocycleId: string,
    fromWeekNumber: number,
    dayNumber: number,
    orderInSession: number,
    originalExerciseId: string,
    newExerciseId: string,
    newLoadKg?: number
  ): Promise<number> {
    const sql = `
      UPDATE exercise_assignment ea
      SET exercise_id = $5,
          target_load_kg = COALESCE($6, ea.target_load_kg),
          is_swapped = true,
          updated_at = NOW()
      FROM session_plan sp, week_plan wp
      WHERE ea.session_plan_id = sp.id
        AND sp.week_plan_id = wp.id
        AND wp.mesocycle_id = $1
        AND wp.week_number >= $2
        AND sp.day_number = $3
        AND ea.order_in_session = $4
        AND ea.exercise_id = $7;
    `;

    const res = await this.dbPool.query(sql, [
      mesocycleId,
      fromWeekNumber,
      dayNumber,
      orderInSession,
      newExerciseId,
      newLoadKg ?? null,
      originalExerciseId
    ]);

    return Number(res.rowCount ?? 0);
  }
}

export const mesocycleRepository = new MesocycleRepository();

