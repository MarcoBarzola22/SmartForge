import { pool } from '../config/db.js';
import type { SessionStatus } from '../schemas/generated/schemas.js';

export interface Session {
  id: string;
  athlete_id: string;
  session_plan_id?: string;
  status: SessionStatus;
  started_at: string;
  completed_at?: string;
  client_timestamp: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CreateSessionData {
  athlete_id: string;
  session_plan_id?: string;
  status?: SessionStatus;
  started_at?: string;
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

export class SessionRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  private mapRowToSession(row: Record<string, unknown>): Session {
    return {
      id: String(row.id),
      athlete_id: String(row.athlete_id),
      session_plan_id: row.session_plan_id ? String(row.session_plan_id) : undefined,
      status: row.status as SessionStatus,
      started_at:
        row.started_at instanceof Date
          ? row.started_at.toISOString()
          : String(row.started_at),
      completed_at: row.completed_at
        ? row.completed_at instanceof Date
          ? row.completed_at.toISOString()
          : String(row.completed_at)
        : undefined,
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
          : String(row.updated_at),
      deleted_at: row.deleted_at
        ? row.deleted_at instanceof Date
          ? row.deleted_at.toISOString()
          : String(row.deleted_at)
        : undefined
    };
  }

  /**
   * Crea una nueva instancia de sesión de entrenamiento (RF-04, Constitución §3).
   */
  async create(data: CreateSessionData): Promise<Session> {
    const sql = `
      INSERT INTO session (
        athlete_id, session_plan_id, status, started_at, client_timestamp
      )
      VALUES ($1, $2, COALESCE($3, 'in_progress'), COALESCE($4, NOW()), COALESCE($5, NOW()))
      RETURNING id, athlete_id, session_plan_id, status, started_at, completed_at, client_timestamp, created_at, updated_at, deleted_at;
    `;

    const res = await this.dbPool.query(sql, [
      data.athlete_id,
      data.session_plan_id || null,
      data.status || 'in_progress',
      data.started_at || null,
      data.client_timestamp || null
    ]);

    return this.mapRowToSession(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene una sesión por ID.
   */
  async findById(id: string): Promise<Session | null> {
    const sql = `
      SELECT id, athlete_id, session_plan_id, status, started_at, completed_at, client_timestamp, created_at, updated_at, deleted_at
      FROM session
      WHERE id = $1 AND deleted_at IS NULL;
    `;

    const res = await this.dbPool.query(sql, [id]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene la sesión activa actual ('in_progress') para un atleta.
   */
  async findActiveByAthleteId(athleteId: string): Promise<Session | null> {
    const sql = `
      SELECT id, athlete_id, session_plan_id, status, started_at, completed_at, client_timestamp, created_at, updated_at, deleted_at
      FROM session
      WHERE athlete_id = $1 AND status = 'in_progress' AND deleted_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1;
    `;

    const res = await this.dbPool.query(sql, [athleteId]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene el historial de sesiones de un atleta.
   */
  async findByAthleteId(athleteId: string, limit = 50, offset = 0): Promise<Session[]> {
    const sql = `
      SELECT id, athlete_id, session_plan_id, status, started_at, completed_at, client_timestamp, created_at, updated_at, deleted_at
      FROM session
      WHERE athlete_id = $1 AND deleted_at IS NULL
      ORDER BY started_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const res = await this.dbPool.query(sql, [athleteId, limit, offset]);
    return ((res.rows || []) as Record<string, unknown>[]).map((row) =>
      this.mapRowToSession(row)
    );
  }

  /**
   * Actualiza el estado de una sesión (ej. 'completed' o 'cancelled').
   */
  async updateStatus(
    id: string,
    status: SessionStatus,
    completedAt?: string
  ): Promise<Session | null> {
    const sql = `
      UPDATE session
      SET status = $2,
          completed_at = CASE WHEN $2 = 'completed' THEN COALESCE($3::timestamptz, NOW()) ELSE completed_at END,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, athlete_id, session_plan_id, status, started_at, completed_at, client_timestamp, created_at, updated_at, deleted_at;
    `;

    const res = await this.dbPool.query(sql, [id, status, completedAt || null]);
    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToSession(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Realiza soft-delete de una sesión.
   */
  async softDelete(id: string): Promise<boolean> {
    const sql = `
      UPDATE session
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL;
    `;

    const res = await this.dbPool.query(sql, [id]);
    return Number(res.rowCount ?? 0) > 0;
  }
}

export const sessionRepository = new SessionRepository();
