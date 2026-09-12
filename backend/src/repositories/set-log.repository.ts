import { pool } from '../config/db.js';

export interface SetLogRecord {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_assignment_id?: string;
  set_number: number;
  reps_completed: number;
  weight_kg: number;
  rir: number;
  client_timestamp: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSetLogData {
  session_id: string;
  exercise_id: string;
  exercise_assignment_id?: string;
  set_number: number;
  reps_completed: number;
  weight_kg: number;
  rir: number;
  client_timestamp?: string;
}

export interface UpdateSetLogData {
  reps_completed?: number;
  weight_kg?: number;
  rir?: number;
  client_timestamp?: string;
}

export interface PoolClientLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
  release: () => void;
}

export interface PoolLike {
  connect: () => Promise<PoolClientLike>;
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
}

export class SetLogRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  private mapRowToSetLog(row: Record<string, unknown>): SetLogRecord {
    return {
      id: String(row.id),
      session_id: String(row.session_id),
      exercise_id: String(row.exercise_id),
      exercise_assignment_id: row.exercise_assignment_id ? String(row.exercise_assignment_id) : undefined,
      set_number: Number(row.set_number),
      reps_completed: Number(row.reps_completed),
      weight_kg: Number(parseFloat(String(row.weight_kg))),
      rir: Number(row.rir),
      client_timestamp:
        row.client_timestamp instanceof Date
          ? row.client_timestamp.toISOString()
          : String(row.client_timestamp),
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
      updated_at:
        row.updated_at instanceof Date
          ? row.updated_at.toISOString()
          : String(row.updated_at)
    };
  }

  /**
   * Registra una nueva serie completada en la sesión (RF-05, Constitución §3).
   */
  async create(data: CreateSetLogData): Promise<SetLogRecord> {
    const sql = `
      INSERT INTO set_log (
        session_id, exercise_id, exercise_assignment_id, set_number,
        reps_completed, weight_kg, rir, client_timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
      RETURNING id, session_id, exercise_id, exercise_assignment_id, set_number,
                reps_completed, weight_kg, rir, client_timestamp, created_at, updated_at;
    `;

    const res = await this.dbPool.query(sql, [
      data.session_id,
      data.exercise_id,
      data.exercise_assignment_id || null,
      data.set_number,
      data.reps_completed,
      data.weight_kg,
      data.rir,
      data.client_timestamp || null
    ]);

    return this.mapRowToSetLog(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene una serie por ID.
   */
  async findById(id: string): Promise<SetLogRecord | null> {
    const sql = `
      SELECT id, session_id, exercise_id, exercise_assignment_id, set_number,
             reps_completed, weight_kg, rir, client_timestamp, created_at, updated_at
      FROM set_log
      WHERE id = $1;
    `;

    const res = await this.dbPool.query(sql, [id]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToSetLog(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene todas las series registradas en una sesión.
   */
  async findBySessionId(sessionId: string): Promise<SetLogRecord[]> {
    const sql = `
      SELECT id, session_id, exercise_id, exercise_assignment_id, set_number,
             reps_completed, weight_kg, rir, client_timestamp, created_at, updated_at
      FROM set_log
      WHERE session_id = $1
      ORDER BY exercise_id ASC, set_number ASC;
    `;

    const res = await this.dbPool.query(sql, [sessionId]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToSetLog(row)
    );
  }

  /**
   * Obtiene todas las series de un ejercicio específico en una sesión.
   */
  async findBySessionAndExercise(sessionId: string, exerciseId: string): Promise<SetLogRecord[]> {
    const sql = `
      SELECT id, session_id, exercise_id, exercise_assignment_id, set_number,
             reps_completed, weight_kg, rir, client_timestamp, created_at, updated_at
      FROM set_log
      WHERE session_id = $1 AND exercise_id = $2
      ORDER BY set_number ASC;
    `;

    const res = await this.dbPool.query(sql, [sessionId, exerciseId]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToSetLog(row)
    );
  }

  /**
   * Obtiene el historial reciente de series de un atleta para un ejercicio.
   */
  async findByAthleteAndExercise(
    athleteId: string,
    exerciseId: string,
    limit = 20
  ): Promise<SetLogRecord[]> {
    const sql = `
      SELECT sl.id, sl.session_id, sl.exercise_id, sl.exercise_assignment_id, sl.set_number,
             sl.reps_completed, sl.weight_kg, sl.rir, sl.client_timestamp, sl.created_at, sl.updated_at
      FROM set_log sl
      JOIN session s ON sl.session_id = s.id
      WHERE s.athlete_id = $1 AND sl.exercise_id = $2 AND s.deleted_at IS NULL
      ORDER BY sl.client_timestamp DESC, sl.set_number ASC
      LIMIT $3;
    `;

    const res = await this.dbPool.query(sql, [athleteId, exerciseId, limit]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToSetLog(row)
    );
  }

  /**
   * Actualiza los datos de una serie registrada (reps, peso, RIR).
   */
  async update(id: string, data: UpdateSetLogData): Promise<SetLogRecord | null> {
    const sql = `
      UPDATE set_log
      SET reps_completed = COALESCE($2, reps_completed),
          weight_kg = COALESCE($3, weight_kg),
          rir = COALESCE($4, rir),
          client_timestamp = COALESCE($5, client_timestamp),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, session_id, exercise_id, exercise_assignment_id, set_number,
                reps_completed, weight_kg, rir, client_timestamp, created_at, updated_at;
    `;

    const res = await this.dbPool.query(sql, [
      id,
      data.reps_completed ?? null,
      data.weight_kg ?? null,
      data.rir ?? null,
      data.client_timestamp || null
    ]);

    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToSetLog(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Elimina una serie por ID.
   */
  async delete(id: string): Promise<boolean> {
    const sql = `
      DELETE FROM set_log
      WHERE id = $1;
    `;

    const res = await this.dbPool.query(sql, [id]);
    return Number(res.rowCount ?? 0) > 0;
  }
}

export const setLogRepository = new SetLogRepository();
