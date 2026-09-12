import { pool } from '../config/db.js';
import type {
  Exercise,
  ExerciseAlternative,
  MovementPattern,
  MuscleGroup
} from '../schemas/generated/schemas.js';

export interface ExerciseFilters {
  movement_pattern?: MovementPattern;
  primary_muscle?: MuscleGroup;
  equipment_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DbClient {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
}

export class ExerciseRepository {
  constructor(private readonly db: DbClient = pool) {}

  private mapRowToExercise(row: Record<string, unknown>): Exercise {
    return {
      id: String(row.id),
      name: String(row.name),
      movement_pattern: row.movement_pattern as MovementPattern,
      primary_muscle: row.primary_muscle as MuscleGroup,
      secondary_muscles: Array.isArray(row.secondary_muscles)
        ? (row.secondary_muscles as MuscleGroup[])
        : [],
      equipment_id: String(row.equipment_id),
      is_compound: Boolean(row.is_compound),
      initial_load_ratio: Number(parseFloat(String(row.initial_load_ratio))),
      video_url: String(row.video_url),
      video_fallback_url: String(row.video_fallback_url),
      instructions: String(row.instructions),
      is_active: Boolean(row.is_active)
    };
  }

  async findById(id: string): Promise<Exercise | null> {
    const query = `
      SELECT id, name, movement_pattern, primary_muscle, secondary_muscles,
             equipment_id, is_compound, initial_load_ratio, video_url,
             video_fallback_url, instructions, is_active
      FROM exercise
      WHERE id = $1 AND is_active = true;
    `;

    const result = await this.db.query(query, [id]);
    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    return this.mapRowToExercise(result.rows[0] as Record<string, unknown>);
  }

  async findAll(filters: ExerciseFilters = {}): Promise<Exercise[]> {
    const conditions: string[] = ['is_active = true'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.movement_pattern) {
      conditions.push(`movement_pattern = $${paramIndex++}`);
      params.push(filters.movement_pattern);
    }

    if (filters.primary_muscle) {
      conditions.push(`primary_muscle = $${paramIndex++}`);
      params.push(filters.primary_muscle);
    }

    if (filters.equipment_id) {
      conditions.push(`equipment_id = $${paramIndex++}`);
      params.push(filters.equipment_id);
    }

    if (filters.search && filters.search.trim() !== '') {
      conditions.push(`name ILIKE $${paramIndex++}`);
      params.push(`%${filters.search.trim()}%`);
    }

    let sql = `
      SELECT id, name, movement_pattern, primary_muscle, secondary_muscles,
             equipment_id, is_compound, initial_load_ratio, video_url,
             video_fallback_url, instructions, is_active
      FROM exercise
      WHERE ${conditions.join(' AND ')}
      ORDER BY name ASC
    `;

    if (filters.limit !== undefined && filters.limit > 0) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters.offset !== undefined && filters.offset >= 0) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(sql, params);
    return (result.rows || []).map((row) =>
      this.mapRowToExercise(row as Record<string, unknown>)
    );
  }

  async findAlternatives(
    exerciseId: string,
    equipmentIds?: string[]
  ): Promise<ExerciseAlternative[]> {
    const params: unknown[] = [exerciseId];
    let equipmentClause = '';

    if (equipmentIds && equipmentIds.length > 0) {
      // Bodyweight is always available in addition to athlete's equipment
      const availableEquipments = Array.from(new Set([...equipmentIds, 'bodyweight']));
      params.push(availableEquipments);
      equipmentClause = 'AND (e.equipment_id = ANY($2))';
    }

    const sql = `
      SELECT ea.original_exercise_id,
             ea.similarity_score,
             e.id AS alt_id,
             e.name AS alt_name,
             e.movement_pattern AS alt_movement_pattern,
             e.primary_muscle AS alt_primary_muscle,
             e.secondary_muscles AS alt_secondary_muscles,
             e.equipment_id AS alt_equipment_id,
             e.is_compound AS alt_is_compound,
             e.initial_load_ratio AS alt_initial_load_ratio,
             e.video_url AS alt_video_url,
             e.video_fallback_url AS alt_video_fallback_url,
             e.instructions AS alt_instructions,
             e.is_active AS alt_is_active
      FROM exercise_alternative ea
      JOIN exercise e ON ea.alternative_exercise_id = e.id
      WHERE ea.original_exercise_id = $1
        AND e.is_active = true
        ${equipmentClause}
      ORDER BY ea.similarity_score DESC, e.name ASC;
    `;

    const result = await this.db.query(sql, params);

    return (result.rows || []).map((rawRow: unknown) => {
      const row = rawRow as Record<string, unknown>;
      return {
        original_exercise_id: String(row.original_exercise_id),
        similarity_score: Number(parseFloat(String(row.similarity_score))),
        alternative_exercise: {
          id: String(row.alt_id),
          name: String(row.alt_name),
          movement_pattern: row.alt_movement_pattern as MovementPattern,
          primary_muscle: row.alt_primary_muscle as MuscleGroup,
          secondary_muscles: Array.isArray(row.alt_secondary_muscles)
            ? (row.alt_secondary_muscles as MuscleGroup[])
            : [],
          equipment_id: String(row.alt_equipment_id),
          is_compound: Boolean(row.alt_is_compound),
          initial_load_ratio: Number(parseFloat(String(row.alt_initial_load_ratio))),
          video_url: String(row.alt_video_url),
          video_fallback_url: String(row.alt_video_fallback_url),
          instructions: String(row.alt_instructions),
          is_active: Boolean(row.alt_is_active)
        }
      };
    });
  }

  async findByEquipment(equipmentIds: string[]): Promise<Exercise[]> {
    const availableEquipments = Array.from(new Set([...equipmentIds, 'bodyweight']));
    const sql = `
      SELECT id, name, movement_pattern, primary_muscle, secondary_muscles,
             equipment_id, is_compound, initial_load_ratio, video_url,
             video_fallback_url, instructions, is_active
      FROM exercise
      WHERE is_active = true
        AND equipment_id = ANY($1)
      ORDER BY name ASC;
    `;

    const result = await this.db.query(sql, [availableEquipments]);
    return (result.rows || []).map((row) =>
      this.mapRowToExercise(row as Record<string, unknown>)
    );
  }

  async count(filters: Omit<ExerciseFilters, 'limit' | 'offset'> = {}): Promise<number> {
    const conditions: string[] = ['is_active = true'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (filters.movement_pattern) {
      conditions.push(`movement_pattern = $${paramIndex++}`);
      params.push(filters.movement_pattern);
    }

    if (filters.primary_muscle) {
      conditions.push(`primary_muscle = $${paramIndex++}`);
      params.push(filters.primary_muscle);
    }

    if (filters.equipment_id) {
      conditions.push(`equipment_id = $${paramIndex++}`);
      params.push(filters.equipment_id);
    }

    if (filters.search && filters.search.trim() !== '') {
      conditions.push(`name ILIKE $${paramIndex++}`);
      params.push(`%${filters.search.trim()}%`);
    }

    const sql = `
      SELECT COUNT(*)::text AS total
      FROM exercise
      WHERE ${conditions.join(' AND ')};
    `;

    const result = await this.db.query(sql, params);
    const totalStr = (result.rows[0] as { total?: string })?.total;
    return totalStr ? parseInt(totalStr, 10) : 0;
  }
}

export const exerciseRepository = new ExerciseRepository();
