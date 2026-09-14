import { pool } from '../config/db.js';
import { ConflictError } from '../errors/app-error.js';

export interface BodyWeightLogRecord {
  id: string;
  athlete_id: string;
  weight_kg: number;
  calendar_week_start: string;
  logged_date: string;
  logged_at_utc: string;
  updated_at_utc: string;
}

export interface CreateBodyWeightLogData {
  athlete_id: string;
  weight_kg: number;
  calendar_week_start: string;
  logged_date: string;
}

export interface UpdateBodyWeightLogData {
  weight_kg?: number;
  logged_date?: string;
  calendar_week_start?: string;
}

export interface PoolClientLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
  release: () => void;
}

export interface PoolLike {
  connect: () => Promise<PoolClientLike>;
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
}

export class BodyWeightRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  private mapRowToRecord(row: Record<string, unknown>): BodyWeightLogRecord {
    const formatDate = (val: unknown): string => {
      if (val instanceof Date) {
        return val.toISOString().slice(0, 10);
      }
      return String(val).slice(0, 10);
    };

    const formatTimestamp = (val: unknown): string => {
      if (val instanceof Date) {
        return val.toISOString();
      }
      return String(val);
    };

    return {
      id: String(row.id),
      athlete_id: String(row.athlete_id),
      weight_kg: Number(parseFloat(String(row.weight_kg))),
      calendar_week_start: formatDate(row.calendar_week_start),
      logged_date: formatDate(row.logged_date),
      logged_at_utc: formatTimestamp(row.logged_at_utc),
      updated_at_utc: formatTimestamp(row.updated_at_utc),
    };
  }

  /**
   * Inserta un nuevo registro semanal de peso corporal.
   * Si ya existe un registro para la misma semana calendario, lanza ConflictError (409) cumpliendo RF-01 y Constitución Art. 5.
   */
  async create(data: CreateBodyWeightLogData): Promise<BodyWeightLogRecord> {
    const sql = `
      INSERT INTO body_weight_log (athlete_id, weight_kg, calendar_week_start, logged_date)
      VALUES ($1, $2, $3, $4)
      RETURNING id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc;
    `;

    try {
      const res = await this.dbPool.query(sql, [
        data.athlete_id,
        data.weight_kg,
        data.calendar_week_start,
        data.logged_date,
      ]);
      return this.mapRowToRecord(res.rows[0] as Record<string, unknown>);
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictError('Ya existe un registro de peso para esta semana calendario.');
      }
      throw err;
    }
  }

  /**
   * Actualiza el peso o la fecha de un registro existente de un atleta dentro de la misma semana calendario.
   * Lanza ConflictError (409) si la nueva fecha/semana genera colisión de unicidad.
   */
  async update(
    id: string,
    athleteId: string,
    data: UpdateBodyWeightLogData
  ): Promise<BodyWeightLogRecord | null> {
    const sql = `
      UPDATE body_weight_log
      SET
        weight_kg = COALESCE($3, weight_kg),
        logged_date = COALESCE($4, logged_date),
        calendar_week_start = COALESCE($5, calendar_week_start),
        updated_at_utc = NOW()
      WHERE id = $1 AND athlete_id = $2
      RETURNING id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc;
    `;

    try {
      const res = await this.dbPool.query(sql, [
        id,
        athleteId,
        data.weight_kg ?? null,
        data.logged_date ?? null,
        data.calendar_week_start ?? null,
      ]);

      if (!res.rows || res.rows.length === 0) {
        return null;
      }

      return this.mapRowToRecord(res.rows[0] as Record<string, unknown>);
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === '23505') {
        throw new ConflictError('Ya existe un registro de peso para esa semana calendario.');
      }
      throw err;
    }
  }

  /**
   * Obtiene un registro por su ID y opcionalmente filtrado por athleteId.
   */
  async findById(id: string, athleteId?: string): Promise<BodyWeightLogRecord | null> {
    const sql = athleteId
      ? `
        SELECT id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc
        FROM body_weight_log
        WHERE id = $1 AND athlete_id = $2;
      `
      : `
        SELECT id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc
        FROM body_weight_log
        WHERE id = $1;
      `;

    const params = athleteId ? [id, athleteId] : [id];
    const res = await this.dbPool.query(sql, params);

    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToRecord(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene el registro de un atleta para una semana calendario específica (Lunes).
   */
  async findByWeek(athleteId: string, calendarWeekStart: string): Promise<BodyWeightLogRecord | null> {
    const sql = `
      SELECT id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc
      FROM body_weight_log
      WHERE athlete_id = $1 AND calendar_week_start = $2;
    `;

    const res = await this.dbPool.query(sql, [athleteId, calendarWeekStart]);

    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToRecord(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene el historial completo de pesajes de un atleta ordenado cronológicamente descendente (RF-02 CA-02.1).
   */
  async findHistoryByAthleteId(athleteId: string): Promise<BodyWeightLogRecord[]> {
    const sql = `
      SELECT id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc
      FROM body_weight_log
      WHERE athlete_id = $1
      ORDER BY logged_date DESC, logged_at_utc DESC;
    `;

    const res = await this.dbPool.query(sql, [athleteId]);
    return (res.rows as Record<string, unknown>[]).map((row) => this.mapRowToRecord(row));
  }

  /**
   * Resuelve el peso corporal vigente aplicando la regla de arrastre del último pesaje conocido (carry-forward)
   * a la fecha indicada (RF-06 CA-06.3).
   */
  async findLatestBeforeDate(athleteId: string, beforeOrEqualDate: string): Promise<BodyWeightLogRecord | null> {
    const sql = `
      SELECT id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc
      FROM body_weight_log
      WHERE athlete_id = $1 AND logged_date <= $2
      ORDER BY logged_date DESC, logged_at_utc DESC
      LIMIT 1;
    `;

    const res = await this.dbPool.query(sql, [athleteId, beforeOrEqualDate]);

    if (!res.rows || res.rows.length === 0) {
      return null;
    }

    return this.mapRowToRecord(res.rows[0] as Record<string, unknown>);
  }

  /**
   * Obtiene los pesajes inmediatamente anterior y posterior a una fecha dada,
   * permitiendo verificar la guarda de 120 horas (5 días) (RF-01 CA-01.3, RF-02 CA-02.2).
   */
  async findAdjacentLogs(
    athleteId: string,
    targetDate: string,
    excludeId?: string
  ): Promise<{ previous: BodyWeightLogRecord | null; next: BodyWeightLogRecord | null }> {
    const prevSql = `
      SELECT id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc
      FROM body_weight_log
      WHERE athlete_id = $1 AND logged_date < $2 AND ($3::uuid IS NULL OR id != $3::uuid)
      ORDER BY logged_date DESC, logged_at_utc DESC
      LIMIT 1;
    `;

    const nextSql = `
      SELECT id, athlete_id, weight_kg, calendar_week_start, logged_date, logged_at_utc, updated_at_utc
      FROM body_weight_log
      WHERE athlete_id = $1 AND logged_date > $2 AND ($3::uuid IS NULL OR id != $3::uuid)
      ORDER BY logged_date ASC, logged_at_utc ASC
      LIMIT 1;
    `;

    const [prevRes, nextRes] = await Promise.all([
      this.dbPool.query(prevSql, [athleteId, targetDate, excludeId ?? null]),
      this.dbPool.query(nextSql, [athleteId, targetDate, excludeId ?? null]),
    ]);

    const previous = prevRes.rows && prevRes.rows.length > 0
      ? this.mapRowToRecord(prevRes.rows[0] as Record<string, unknown>)
      : null;

    const next = nextRes.rows && nextRes.rows.length > 0
      ? this.mapRowToRecord(nextRes.rows[0] as Record<string, unknown>)
      : null;

    return { previous, next };
  }

  /**
   * Elimina un registro de pesaje por id y atleta.
   */
  async delete(id: string, athleteId: string): Promise<boolean> {
    const sql = `
      DELETE FROM body_weight_log
      WHERE id = $1 AND athlete_id = $2;
    `;

    const res = await this.dbPool.query(sql, [id, athleteId]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const bodyWeightRepository = new BodyWeightRepository();
