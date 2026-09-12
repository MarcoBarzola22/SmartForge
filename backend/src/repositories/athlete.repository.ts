import { pool } from '../config/db.js';
import type {
  AthleteProfile,
  EquipmentItem,
  ExperienceLevel,
  TrainingGoal
} from '../schemas/generated/schemas.js';

export interface CreateAthleteData {
  google_id: string;
  email: string;
  name: string;
  age: number;
  weight_kg: number;
  experience_level: ExperienceLevel;
  training_goal: TrainingGoal;
  available_days_per_week: number;
}

export interface UpdateAthleteData {
  name?: string;
  weight_kg?: number;
  experience_level?: ExperienceLevel;
  training_goal?: TrainingGoal;
  available_days_per_week?: number;
}

export interface PoolClientLike {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
  release: () => void;
}

export interface PoolLike {
  connect: () => Promise<PoolClientLike>;
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[]; rowCount?: number | null }>;
}

export class AthleteRepository {
  constructor(private readonly dbPool: PoolLike = pool) {}

  private mapRowToAthlete(row: Record<string, unknown>, equipment: EquipmentItem[]): AthleteProfile {
    return {
      id: String(row.id),
      google_id: String(row.google_id),
      email: String(row.email),
      name: String(row.name),
      age: Number(row.age),
      weight_kg: Number(parseFloat(String(row.weight_kg))),
      experience_level: row.experience_level as ExperienceLevel,
      training_goal: row.training_goal as TrainingGoal,
      available_days_per_week: Number(row.available_days_per_week),
      equipment,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }

  private async fetchEquipmentForAthlete(
    athleteId: string,
    client: { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> } = this.dbPool
  ): Promise<EquipmentItem[]> {
    const sql = `
      SELECT e.id, e.name, e.category
      FROM equipment e
      JOIN athlete_equipment ae ON e.id = ae.equipment_id
      WHERE ae.athlete_id = $1
      ORDER BY e.name ASC;
    `;

    const result = await client.query(sql, [athleteId]);
    return (result.rows || []).map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id),
        name: String(r.name),
        category: String(r.category)
      };
    });
  }

  async create(data: CreateAthleteData, equipmentIds: string[]): Promise<AthleteProfile> {
    const client = await this.dbPool.connect();

    try {
      await client.query('BEGIN');

      const insertAthleteSql = `
        INSERT INTO athlete (
          google_id, email, name, age, weight_kg, experience_level,
          training_goal, available_days_per_week
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, google_id, email, name, age, weight_kg, experience_level,
                  training_goal, available_days_per_week, created_at, updated_at;
      `;

      const athleteResult = await client.query(insertAthleteSql, [
        data.google_id,
        data.email,
        data.name,
        data.age,
        data.weight_kg,
        data.experience_level,
        data.training_goal,
        data.available_days_per_week
      ]);

      const athleteRow = athleteResult.rows[0] as Record<string, unknown>;
      const athleteId = String(athleteRow.id);

      if (equipmentIds.length > 0) {
        const insertEquipmentSql = `
          INSERT INTO athlete_equipment (athlete_id, equipment_id)
          VALUES ($1, $2)
          ON CONFLICT (athlete_id, equipment_id) DO NOTHING;
        `;

        for (const eqId of equipmentIds) {
          await client.query(insertEquipmentSql, [athleteId, eqId]);
        }
      }

      const equipment = await this.fetchEquipmentForAthlete(athleteId, client);

      await client.query('COMMIT');
      return this.mapRowToAthlete(athleteRow, equipment);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<AthleteProfile | null> {
    const sql = `
      SELECT id, google_id, email, name, age, weight_kg, experience_level,
             training_goal, available_days_per_week, created_at, updated_at
      FROM athlete
      WHERE id = $1 AND deleted_at IS NULL;
    `;

    const result = await this.dbPool.query(sql, [id]);
    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const athleteRow = result.rows[0] as Record<string, unknown>;
    const equipment = await this.fetchEquipmentForAthlete(id);
    return this.mapRowToAthlete(athleteRow, equipment);
  }

  async findByGoogleId(googleId: string): Promise<AthleteProfile | null> {
    const sql = `
      SELECT id, google_id, email, name, age, weight_kg, experience_level,
             training_goal, available_days_per_week, created_at, updated_at
      FROM athlete
      WHERE google_id = $1 AND deleted_at IS NULL;
    `;

    const result = await this.dbPool.query(sql, [googleId]);
    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const athleteRow = result.rows[0] as Record<string, unknown>;
    const equipment = await this.fetchEquipmentForAthlete(String(athleteRow.id));
    return this.mapRowToAthlete(athleteRow, equipment);
  }

  async findByEmail(email: string): Promise<AthleteProfile | null> {
    const sql = `
      SELECT id, google_id, email, name, age, weight_kg, experience_level,
             training_goal, available_days_per_week, created_at, updated_at
      FROM athlete
      WHERE email = $1 AND deleted_at IS NULL;
    `;

    const result = await this.dbPool.query(sql, [email]);
    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const athleteRow = result.rows[0] as Record<string, unknown>;
    const equipment = await this.fetchEquipmentForAthlete(String(athleteRow.id));
    return this.mapRowToAthlete(athleteRow, equipment);
  }

  async update(
    id: string,
    data: UpdateAthleteData,
    equipmentIds?: string[]
  ): Promise<AthleteProfile | null> {
    const client = await this.dbPool.connect();

    try {
      await client.query('BEGIN');

      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [id];
      let paramIndex = 2;

      if (data.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }
      if (data.weight_kg !== undefined) {
        setClauses.push(`weight_kg = $${paramIndex++}`);
        params.push(data.weight_kg);
      }
      if (data.experience_level !== undefined) {
        setClauses.push(`experience_level = $${paramIndex++}`);
        params.push(data.experience_level);
      }
      if (data.training_goal !== undefined) {
        setClauses.push(`training_goal = $${paramIndex++}`);
        params.push(data.training_goal);
      }
      if (data.available_days_per_week !== undefined) {
        setClauses.push(`available_days_per_week = $${paramIndex++}`);
        params.push(data.available_days_per_week);
      }

      const updateSql = `
        UPDATE athlete
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, google_id, email, name, age, weight_kg, experience_level,
                  training_goal, available_days_per_week, created_at, updated_at;
      `;

      const result = await client.query(updateSql, params);
      if (!result.rows || result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const athleteRow = result.rows[0] as Record<string, unknown>;

      if (equipmentIds !== undefined) {
        await client.query('DELETE FROM athlete_equipment WHERE athlete_id = $1;', [id]);

        const insertEquipmentSql = `
          INSERT INTO athlete_equipment (athlete_id, equipment_id)
          VALUES ($1, $2)
          ON CONFLICT (athlete_id, equipment_id) DO NOTHING;
        `;

        for (const eqId of equipmentIds) {
          await client.query(insertEquipmentSql, [id, eqId]);
        }
      }

      const equipment = await this.fetchEquipmentForAthlete(id, client);

      await client.query('COMMIT');
      return this.mapRowToAthlete(athleteRow, equipment);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async softDelete(id: string): Promise<boolean> {
    const sql = `
      UPDATE athlete
      SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL;
    `;

    const result = await this.dbPool.query(sql, [id]);
    return Number(result.rowCount ?? 0) > 0;
  }
}

export const athleteRepository = new AthleteRepository();
