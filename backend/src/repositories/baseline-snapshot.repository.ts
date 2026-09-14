import { pool } from '../config/db.js';
import { ConflictError } from '../errors/app-error.js';

export type BaselineSourceType = 'history_rir_le_3' | 'history_rir_normalized' | 'experience_ratio_default';

export interface BaselineSnapshotRecord {
  id: string;
  mesocycle_id: string;
  exercise_id: string;
  baseline_load_kg: number;
  baseline_reps: number;
  baseline_e1rm_kg: number;
  athlete_bodyweight_kg: number;
  source_type: BaselineSourceType;
  created_at: string;
}

export interface CreateBaselineSnapshotData {
  mesocycle_id: string;
  exercise_id: string;
  baseline_load_kg: number;
  baseline_reps: number;
  baseline_e1rm_kg: number;
  athlete_bodyweight_kg: number;
  source_type: BaselineSourceType;
}

export interface PoolClientLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
  release: () => void;
}

export interface PoolLike {
  connect: () => Promise<PoolClientLike>;
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
}

export class BaselineSnapshotRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  private mapRowToRecord(row: Record<string, unknown>): BaselineSnapshotRecord {
    const formatTimestamp = (val: unknown): string => {
      if (val instanceof Date) {
        return val.toISOString();
      }
      return String(val);
    };

    return {
      id: String(row.id),
      mesocycle_id: String(row.mesocycle_id),
      exercise_id: String(row.exercise_id),
      baseline_load_kg: Number(parseFloat(String(row.baseline_load_kg))),
      baseline_reps: Number(row.baseline_reps),
      baseline_e1rm_kg: Number(parseFloat(String(row.baseline_e1rm_kg))),
      athlete_bodyweight_kg: Number(parseFloat(String(row.athlete_bodyweight_kg))),
      source_type: row.source_type as BaselineSourceType,
      created_at: formatTimestamp(row.created_at),
    };
  }

  /**
   * Inserta un snapshot de línea base individual.
   * Lanza ConflictError (409) si ya existe un snapshot para (mesocycle_id, exercise_id).
   */
  async create(
    data: CreateBaselineSnapshotData,
    client?: PoolClientLike
  ): Promise<BaselineSnapshotRecord> {
    const sql = `
      INSERT INTO mesocycle_baseline_snapshot (
        mesocycle_id, exercise_id, baseline_load_kg, baseline_reps,
        baseline_e1rm_kg, athlete_bodyweight_kg, source_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, mesocycle_id, exercise_id, baseline_load_kg, baseline_reps,
                baseline_e1rm_kg, athlete_bodyweight_kg, source_type, created_at;
    `;

    const runner = client ?? this.dbPool;

    try {
      const res = await runner.query(sql, [
        data.mesocycle_id,
        data.exercise_id,
        data.baseline_load_kg,
        data.baseline_reps,
        data.baseline_e1rm_kg,
        data.athlete_bodyweight_kg,
        data.source_type,
      ]);
      return this.mapRowToRecord(res.rows[0] as Record<string, unknown>);
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictError('Ya existe un snapshot de línea base para este ejercicio en el mesociclo.');
      }
      throw err;
    }
  }

  /**
   * Inserta en lote una colección de snapshots de línea base para un mesociclo.
   * Permite reutilizar un cliente transaccional existente (ej. durante la creación del mesociclo).
   */
  async createBatch(
    snapshots: CreateBaselineSnapshotData[],
    client?: PoolClientLike
  ): Promise<BaselineSnapshotRecord[]> {
    if (!snapshots || snapshots.length === 0) {
      return [];
    }

    const valueClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const s of snapshots) {
      valueClauses.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`
      );
      params.push(
        s.mesocycle_id,
        s.exercise_id,
        s.baseline_load_kg,
        s.baseline_reps,
        s.baseline_e1rm_kg,
        s.athlete_bodyweight_kg,
        s.source_type
      );
      paramIndex += 7;
    }

    const sql = `
      INSERT INTO mesocycle_baseline_snapshot (
        mesocycle_id, exercise_id, baseline_load_kg, baseline_reps,
        baseline_e1rm_kg, athlete_bodyweight_kg, source_type
      )
      VALUES ${valueClauses.join(', ')}
      RETURNING id, mesocycle_id, exercise_id, baseline_load_kg, baseline_reps,
                baseline_e1rm_kg, athlete_bodyweight_kg, source_type, created_at;
    `;

    if (client) {
      const res = await client.query(sql, params);
      return (res.rows as Record<string, unknown>[]).map((row) => this.mapRowToRecord(row));
    }

    const connection = await this.dbPool.connect();
    try {
      await connection.query('BEGIN');
      const res = await connection.query(sql, params);
      await connection.query('COMMIT');
      return (res.rows as Record<string, unknown>[]).map((row) => this.mapRowToRecord(row));
    } catch (err: unknown) {
      await connection.query('ROLLBACK');
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictError('Uno o más ejercicios ya cuentan con snapshot en este mesociclo.');
      }
      throw err;
    } finally {
      connection.release();
    }
  }

  /**
   * Recupera todos los snapshots basales inmutables vinculados a un mesociclo (RF-05, RF-06).
   */
  async findByMesocycleId(mesocycleId: string): Promise<BaselineSnapshotRecord[]> {
    const sql = `
      SELECT id, mesocycle_id, exercise_id, baseline_load_kg, baseline_reps,
             baseline_e1rm_kg, athlete_bodyweight_kg, source_type, created_at
      FROM mesocycle_baseline_snapshot
      WHERE mesocycle_id = $1
      ORDER BY created_at ASC;
    `;

    const res = await this.dbPool.query(sql, [mesocycleId]);
    return (res.rows as Record<string, unknown>[]).map((row) => this.mapRowToRecord(row));
  }

  /**
   * Recupera el snapshot basal de un ejercicio específico en un mesociclo.
   */
  async findByMesocycleAndExercise(
    mesocycleId: string,
    exerciseId: string
  ): Promise<BaselineSnapshotRecord | null> {
    const sql = `
      SELECT id, mesocycle_id, exercise_id, baseline_load_kg, baseline_reps,
             baseline_e1rm_kg, athlete_bodyweight_kg, source_type, created_at
      FROM mesocycle_baseline_snapshot
      WHERE mesocycle_id = $1 AND exercise_id = $2;
    `;

    const res = await this.dbPool.query(sql, [mesocycleId, exerciseId]);

    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToRecord(res.rows[0] as Record<string, unknown>);
  }
}

export const baselineSnapshotRepository = new BaselineSnapshotRepository();
