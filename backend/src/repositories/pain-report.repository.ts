import { pool } from '../config/db.js';
import type { Joint, BodySide, PainIntensity } from '../schemas/generated/schemas.js';

export interface PainReportRecord {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_assignment_id?: string;
  joint: Joint;
  side: BodySide;
  intensity: PainIntensity;
  notes?: string;
  client_timestamp: string;
  created_at: string;
}

export interface CreatePainReportData {
  session_id: string;
  exercise_id: string;
  exercise_assignment_id?: string;
  joint: Joint;
  side: BodySide;
  intensity: PainIntensity;
  notes?: string;
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

export class PainReportRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  private mapRowToPainReport(row: Record<string, unknown>): PainReportRecord {
    return {
      id: String(row.id),
      session_id: String(row.session_id),
      exercise_id: String(row.exercise_id),
      exercise_assignment_id: row.exercise_assignment_id ? String(row.exercise_assignment_id) : undefined,
      joint: row.joint as Joint,
      side: row.side as BodySide,
      intensity: row.intensity as PainIntensity,
      notes: row.notes ? String(row.notes) : undefined,
      client_timestamp:
        row.client_timestamp instanceof Date
          ? row.client_timestamp.toISOString()
          : String(row.client_timestamp),
      created_at:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at)
    };
  }

  /**
   * Registra un nuevo reporte de molestia articular durante el ejercicio (RF-06, Constitución §3).
   */
  async create(data: CreatePainReportData): Promise<PainReportRecord> {
    const sql = `
      INSERT INTO exercise_pain_report (
        session_id, exercise_id, exercise_assignment_id, joint,
        side, intensity, notes, client_timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
      RETURNING id, session_id, exercise_id, exercise_assignment_id, joint,
                side, intensity, notes, client_timestamp, created_at;
    `;

    const res = await this.dbPool.query(sql, [
      data.session_id,
      data.exercise_id,
      data.exercise_assignment_id || null,
      data.joint,
      data.side,
      data.intensity,
      data.notes || null,
      data.client_timestamp || null
    ]);

    return this.mapRowToPainReport(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene un reporte de molestia por ID.
   */
  async findById(id: string): Promise<PainReportRecord | null> {
    const sql = `
      SELECT id, session_id, exercise_id, exercise_assignment_id, joint,
             side, intensity, notes, client_timestamp, created_at
      FROM exercise_pain_report
      WHERE id = $1;
    `;

    const res = await this.dbPool.query(sql, [id]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToPainReport(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene todos los reportes de molestia de una sesión ordenados cronológicamente.
   */
  async findBySessionId(sessionId: string): Promise<PainReportRecord[]> {
    const sql = `
      SELECT id, session_id, exercise_id, exercise_assignment_id, joint,
             side, intensity, notes, client_timestamp, created_at
      FROM exercise_pain_report
      WHERE session_id = $1
      ORDER BY created_at ASC;
    `;

    const res = await this.dbPool.query(sql, [sessionId]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToPainReport(row)
    );
  }

  /**
   * Obtiene los reportes de molestia para un ejercicio dentro de una sesión.
   */
  async findBySessionAndExercise(sessionId: string, exerciseId: string): Promise<PainReportRecord[]> {
    const sql = `
      SELECT id, session_id, exercise_id, exercise_assignment_id, joint,
             side, intensity, notes, client_timestamp, created_at
      FROM exercise_pain_report
      WHERE session_id = $1 AND exercise_id = $2
      ORDER BY created_at ASC;
    `;

    const res = await this.dbPool.query(sql, [sessionId, exerciseId]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToPainReport(row)
    );
  }

  /**
   * Obtiene el historial de molestias de una articulación para un atleta (para rotación/ajustes).
   */
  async findByAthleteAndJoint(
    athleteId: string,
    joint: Joint,
    limit = 10
  ): Promise<PainReportRecord[]> {
    const sql = `
      SELECT epr.id, epr.session_id, epr.exercise_id, epr.exercise_assignment_id, epr.joint,
             epr.side, epr.intensity, epr.notes, epr.client_timestamp, epr.created_at
      FROM exercise_pain_report epr
      JOIN session s ON epr.session_id = s.id
      WHERE s.athlete_id = $1 AND epr.joint = $2 AND s.deleted_at IS NULL
      ORDER BY epr.client_timestamp DESC
      LIMIT $3;
    `;

    const res = await this.dbPool.query(sql, [athleteId, joint, limit]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToPainReport(row)
    );
  }

  /**
   * Elimina un reporte de molestia por ID.
   */
  async delete(id: string): Promise<boolean> {
    const sql = `
      DELETE FROM exercise_pain_report
      WHERE id = $1;
    `;

    const res = await this.dbPool.query(sql, [id]);
    return Number(res.rowCount ?? 0) > 0;
  }
}

export const painReportRepository = new PainReportRepository();
