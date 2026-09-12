import { pool } from '../config/db.js';
import type { SwapReason } from '../schemas/generated/schemas.js';

export interface ExerciseSwap {
  id: string;
  assignment_id: string;
  original_exercise_id: string;
  new_exercise_id: string;
  reason: SwapReason;
  notes?: string;
  created_at: string;
}

export interface CreateExerciseSwapData {
  assignment_id: string;
  original_exercise_id: string;
  new_exercise_id: string;
  reason: SwapReason;
  notes?: string;
}

export interface PoolClientLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
  release: () => void;
}

export interface PoolLike {
  connect: () => Promise<PoolClientLike>;
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
}

export class ExerciseSwapRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  private mapRowToSwap(row: Record<string, unknown>): ExerciseSwap {
    return {
      id: String(row.id),
      assignment_id: String(row.assignment_id),
      original_exercise_id: String(row.original_exercise_id),
      new_exercise_id: String(row.new_exercise_id),
      reason: row.reason as SwapReason,
      notes: row.notes ? String(row.notes) : undefined,
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at)
    };
  }

  /**
   * Registra una sustitución de ejercicio en la tabla exercise_swap (RF-03, CA-03.4).
   */
  async create(data: CreateExerciseSwapData): Promise<ExerciseSwap> {
    const sql = `
      INSERT INTO exercise_swap (
        assignment_id, original_exercise_id, new_exercise_id, reason, notes
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, assignment_id, original_exercise_id, new_exercise_id, reason, notes, created_at;
    `;

    const res = await this.dbPool.query(sql, [
      data.assignment_id,
      data.original_exercise_id,
      data.new_exercise_id,
      data.reason,
      data.notes || null
    ]);

    const row = (res.rows[0] || {}) as Record<string, unknown>;
    return this.mapRowToSwap(row);
  }

  /**
   * Recupera un registro de swap por ID.
   */
  async findById(id: string): Promise<ExerciseSwap | null> {
    const sql = `
      SELECT id, assignment_id, original_exercise_id, new_exercise_id, reason, notes, created_at
      FROM exercise_swap
      WHERE id = $1;
    `;

    const res = await this.dbPool.query(sql, [id]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToSwap(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene todas las sustituciones asociadas a una asignación de ejercicio dada.
   */
  async findByAssignmentId(assignmentId: string): Promise<ExerciseSwap[]> {
    const sql = `
      SELECT id, assignment_id, original_exercise_id, new_exercise_id, reason, notes, created_at
      FROM exercise_swap
      WHERE assignment_id = $1
      ORDER BY created_at DESC;
    `;

    const res = await this.dbPool.query(sql, [assignmentId]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToSwap(row)
    );
  }

  /**
   * Obtiene el historial de sustituciones de un atleta a través de sus mesociclos.
   */
  async findByAthleteId(athleteId: string): Promise<ExerciseSwap[]> {
    const sql = `
      SELECT es.id, es.assignment_id, es.original_exercise_id, es.new_exercise_id, es.reason, es.notes, es.created_at
      FROM exercise_swap es
      JOIN exercise_assignment ea ON es.assignment_id = ea.id
      JOIN session_plan sp ON ea.session_plan_id = sp.id
      JOIN week_plan wp ON sp.week_plan_id = wp.id
      JOIN mesocycle m ON wp.mesocycle_id = m.id
      WHERE m.athlete_id = $1
      ORDER BY es.created_at DESC;
    `;

    const res = await this.dbPool.query(sql, [athleteId]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToSwap(row)
    );
  }

  /**
   * Obtiene los motivos por los cuales un atleta ha sustituido históricamente un ejercicio específico.
   */
  async findReasonsByOriginalExercise(
    athleteId: string,
    originalExerciseId: string
  ): Promise<SwapReason[]> {
    const sql = `
      SELECT DISTINCT es.reason
      FROM exercise_swap es
      JOIN exercise_assignment ea ON es.assignment_id = ea.id
      JOIN session_plan sp ON ea.session_plan_id = sp.id
      JOIN week_plan wp ON sp.week_plan_id = wp.id
      JOIN mesocycle m ON wp.mesocycle_id = m.id
      WHERE m.athlete_id = $1 AND es.original_exercise_id = $2;
    `;

    const res = await this.dbPool.query(sql, [athleteId, originalExerciseId]);
    return ((res.rows || []) as Record<string, unknown>[]).map(
      (row) => row.reason as SwapReason
    );
  }
}

export const exerciseSwapRepository = new ExerciseSwapRepository();
