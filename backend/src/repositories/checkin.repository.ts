import { pool } from '../config/db.js';
import { ConflictError } from '../errors/app-error.js';
import type {
  Joint,
  BodySide,
  PainIntensity,
  JointPainItem
} from '../schemas/generated/schemas.js';

export interface CheckinPainRecord {
  id: string;
  checkin_id: string;
  joint: Joint;
  side: BodySide;
  intensity: PainIntensity;
  client_timestamp?: string;
  created_at: string;
}

export interface CheckinRecord {
  id: string;
  session_id: string;
  fatigue_level: number;
  joint_pains: JointPainItem[];
  client_timestamp?: string;
  created_at: string;
}

export interface CreateCheckinData {
  session_id: string;
  fatigue_level: number;
  joint_pains: JointPainItem[];
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

export class CheckinRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  /**
   * Registra un check-in pre-sesión con sus molestias articulares asociadas de forma atómica.
   * Si ya existe un check-in para la sesión, lanza ConflictError (409) cumpliendo RF-04.
   */
  async create(data: CreateCheckinData): Promise<CheckinRecord> {
    const client = await this.dbPool.connect();

    try {
      await client.query('BEGIN');

      const insertCheckinSql = `
        INSERT INTO checkin (session_id, fatigue_level, client_timestamp)
        VALUES ($1, $2, COALESCE($3, NOW()))
        RETURNING id, session_id, fatigue_level, client_timestamp, created_at;
      `;

      let checkinRes: { rows: unknown[] };
      try {
        checkinRes = await client.query(insertCheckinSql, [
          data.session_id,
          data.fatigue_level,
          data.client_timestamp || null
        ]);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === '23505'
        ) {
          throw new ConflictError('La sesión ya cuenta con un check-in registrado.');
        }
        throw err;
      }

      const checkinRow = checkinRes.rows[0] as Record<string, unknown>;
      const checkinId = String(checkinRow.id);

      const createdPains: JointPainItem[] = [];

      for (const pain of data.joint_pains) {
        const insertPainSql = `
          INSERT INTO checkin_pain (checkin_id, joint, side, intensity, client_timestamp)
          VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
          RETURNING id, checkin_id, joint, side, intensity, client_timestamp, created_at;
        `;

        await client.query(insertPainSql, [
          checkinId,
          pain.joint,
          pain.side,
          pain.intensity,
          data.client_timestamp || null
        ]);

        createdPains.push({
          joint: pain.joint,
          side: pain.side,
          intensity: pain.intensity
        });
      }

      await client.query('COMMIT');

      return {
        id: checkinId,
        session_id: String(checkinRow.session_id),
        fatigue_level: Number(checkinRow.fatigue_level),
        joint_pains: createdPains,
        client_timestamp:
          checkinRow.client_timestamp instanceof Date
            ? checkinRow.client_timestamp.toISOString()
            : String(checkinRow.client_timestamp),
        created_at:
          checkinRow.created_at instanceof Date
            ? checkinRow.created_at.toISOString()
            : String(checkinRow.created_at)
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Recupera el check-in registrado para una sesión específica con sus molestias articulares.
   */
  async findBySessionId(sessionId: string): Promise<CheckinRecord | null> {
    const checkinSql = `
      SELECT id, session_id, fatigue_level, client_timestamp, created_at
      FROM checkin
      WHERE session_id = $1;
    `;

    const checkinRes = await this.dbPool.query(checkinSql, [sessionId]);
    if (!checkinRes.rows || checkinRes.rows.length === 0) {
      return null;
    }

    const row = checkinRes.rows[0] as Record<string, unknown>;
    const checkinId = String(row.id);

    const painSql = `
      SELECT id, checkin_id, joint, side, intensity, client_timestamp, created_at
      FROM checkin_pain
      WHERE checkin_id = $1;
    `;

    const painRes = await this.dbPool.query(painSql, [checkinId]);
    const jointPains: JointPainItem[] = ((painRes.rows || []) as Record<string, unknown>[]).map(
      (p) => ({
        joint: p.joint as Joint,
        side: p.side as BodySide,
        intensity: p.intensity as PainIntensity
      })
    );

    return {
      id: checkinId,
      session_id: String(row.session_id),
      fatigue_level: Number(row.fatigue_level),
      joint_pains: jointPains,
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
   * Recupera un check-in por su ID propio.
   */
  async findById(id: string): Promise<CheckinRecord | null> {
    const checkinSql = `
      SELECT id, session_id, fatigue_level, client_timestamp, created_at
      FROM checkin
      WHERE id = $1;
    `;

    const checkinRes = await this.dbPool.query(checkinSql, [id]);
    if (!checkinRes.rows || checkinRes.rows.length === 0) {
      return null;
    }

    const row = checkinRes.rows[0] as Record<string, unknown>;

    const painSql = `
      SELECT id, checkin_id, joint, side, intensity, client_timestamp, created_at
      FROM checkin_pain
      WHERE checkin_id = $1;
    `;

    const painRes = await this.dbPool.query(painSql, [id]);
    const jointPains: JointPainItem[] = ((painRes.rows || []) as Record<string, unknown>[]).map(
      (p) => ({
        joint: p.joint as Joint,
        side: p.side as BodySide,
        intensity: p.intensity as PainIntensity
      })
    );

    return {
      id: String(row.id),
      session_id: String(row.session_id),
      fatigue_level: Number(row.fatigue_level),
      joint_pains: jointPains,
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
}

export const checkinRepository = new CheckinRepository();
