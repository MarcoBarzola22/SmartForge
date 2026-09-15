import { pool } from '../config/db.js';
import {
  MesocycleRepository,
  mesocycleRepository,
  type CompletionReason,
  type CreateMesocycleData
} from '../repositories/mesocycle.repository.js';
import {
  SessionRepository,
  sessionRepository
} from '../repositories/session.repository.js';
import type { PoolLike } from '../repositories/baseline-snapshot.repository.js';
import type { MesocycleStatus } from '../schemas/generated/schemas.js';
import { NotFoundError, ConflictError } from '../errors/app-error.js';

export interface CancelMesocycleOptions {
  reason?: CompletionReason;
  cancelledAt?: string;
}

export interface CancelMesocycleExecutionResult {
  mesocycleId: string;
  previousStatus: MesocycleStatus;
  status: MesocycleStatus;
  completionReason: CompletionReason;
  activeSessionFinalized: boolean;
  cancelledSessionsCount: number;
  completedSessionsCount: number;
  discardedFromHistory: boolean;
  wasAlreadyCompleted: boolean;
}

export interface PostCancellationContext {
  cancelledMesocycleId: string;
  durationWeeks: number;
  completedWeeksCount: number;
  completionPercentage: number;
  shouldRotateAccessories: boolean;
  requiresEarlyDeload: boolean;
  earlyDeloadWeek?: number;
  preservedCompoundLoads: Record<string, number>;
}

/**
 * Regla del 50% de avance para la rotación de accesorios (RF-08 CA-08.2, CA-08.3):
 * - Si se completó < 50% de las semanas: no rotar accesorios (preservar adaptaciones neuromusculares).
 * - Si se completó >= 50% de las semanas: aplicar rotación estándar de accesorios.
 */
export function evaluateAccessoryRotationRule(
  completedWeeks: number,
  durationWeeks: number
): { shouldRotateAccessories: boolean; completionRatio: number } {
  const safeDuration = Math.max(1, durationWeeks);
  const completionRatio = completedWeeks / safeDuration;
  return {
    shouldRotateAccessories: completionRatio >= 0.5,
    completionRatio
  };
}

/**
 * Regla de descarga temprana ante fatiga residual acumulada (RF-08 CA-08.5):
 * Si el atleta acumuló >= 4 semanas de sobrecarga regular consecutivas antes de cancelar,
 * se programa una semana de descarga temprana a la 3ª semana de trabajo del nuevo ciclo.
 */
export function evaluateEarlyDeloadRule(
  consecutiveOverloadWeeks: number
): { requiresEarlyDeload: boolean; earlyDeloadWeek?: number } {
  if (consecutiveOverloadWeeks >= 4) {
    return {
      requiresEarlyDeload: true,
      earlyDeloadWeek: 3
    };
  }
  return {
    requiresEarlyDeload: false,
    earlyDeloadWeek: undefined
  };
}

/**
 * Aplica las reglas de preservación de cargas básicas, rotación y descarga temprana
 * a la estructura de datos de un nuevo mesociclo generado (RF-08 CA-08.4, CA-08.5).
 */
export function applyPostCancellationRules(
  newMesocycleData: CreateMesocycleData,
  context: PostCancellationContext
): CreateMesocycleData {
  const updatedWeeks = newMesocycleData.weeks.map((week) => {
    const isEarlyDeload =
      context.requiresEarlyDeload &&
      context.earlyDeloadWeek !== undefined &&
      week.week_number === context.earlyDeloadWeek;

    return {
      ...week,
      is_deload: isEarlyDeload ? true : week.is_deload,
      sessions: week.sessions.map((session) => ({
        ...session,
        exercise_assignments: session.exercise_assignments.map((assignment) => {
          const preservedLoad = context.preservedCompoundLoads[assignment.exercise_id];
          if (preservedLoad !== undefined && assignment.target_load_kg < preservedLoad) {
            return {
              ...assignment,
              target_load_kg: preservedLoad
            };
          }
          return assignment;
        })
      }))
    };
  });

  return {
    ...newMesocycleData,
    weeks: updatedWeeks
  };
}

export class MesocycleLifecycleService {
  constructor(
    _mesocycleRepo: MesocycleRepository = mesocycleRepository,
    _sessionRepo: SessionRepository = sessionRepository,
    private readonly dbPool: PoolLike = pool
  ) {
    void _mesocycleRepo;
    void _sessionRepo;
  }

  /**
   * Cancela el mesociclo activo actual de un atleta (RF-07 CA-07.1 - CA-07.11).
   */
  async cancelActiveMesocycle(
    athleteId: string,
    options?: CancelMesocycleOptions
  ): Promise<CancelMesocycleExecutionResult> {
    return this.executeCancellation(athleteId, undefined, options);
  }

  /**
   * Cancela un mesociclo específico por ID perteneciente a un atleta (RF-07).
   */
  async cancelMesocycleById(
    mesocycleId: string,
    athleteId: string,
    options?: CancelMesocycleOptions
  ): Promise<CancelMesocycleExecutionResult> {
    return this.executeCancellation(athleteId, mesocycleId, options);
  }

  private async executeCancellation(
    athleteId: string,
    mesocycleId?: string,
    options?: CancelMesocycleOptions
  ): Promise<CancelMesocycleExecutionResult> {
    const client = await this.dbPool.connect();

    try {
      await client.query('BEGIN');

      let targetMesoRow: Record<string, unknown> | null = null;

      if (mesocycleId) {
        const findByIdSql = `
          SELECT id, athlete_id, status, duration_weeks, completion_reason
          FROM mesocycle
          WHERE id = $1 AND athlete_id = $2
          FOR UPDATE;
        `;
        const res = await client.query(findByIdSql, [mesocycleId, athleteId]);
        if (res.rows && res.rows.length > 0) {
          targetMesoRow = res.rows[0] as Record<string, unknown>;
        }
      } else {
        const findActiveSql = `
          SELECT id, athlete_id, status, duration_weeks, completion_reason
          FROM mesocycle
          WHERE athlete_id = $1 AND status = 'active'
          FOR UPDATE;
        `;
        const res = await client.query(findActiveSql, [athleteId]);
        if (res.rows && res.rows.length > 0) {
          targetMesoRow = res.rows[0] as Record<string, unknown>;
        }
      }

      // Reconciliación determinista (CA-07.5) si no hay mesociclo activo
      if (!targetMesoRow) {
        if (!mesocycleId) {
          const checkCompletedSql = `
            SELECT id, athlete_id, status, duration_weeks, completion_reason
            FROM mesocycle
            WHERE athlete_id = $1 AND status = 'completed'
            ORDER BY updated_at DESC
            LIMIT 1;
          `;
          const completedRes = await client.query(checkCompletedSql, [athleteId]);
          if (completedRes.rows && completedRes.rows.length > 0) {
            const completedRow = completedRes.rows[0] as Record<string, unknown>;
            await client.query('COMMIT');
            return {
              mesocycleId: String(completedRow.id),
              previousStatus: 'completed',
              status: 'completed',
              completionReason: (completedRow.completion_reason as CompletionReason) || 'normal',
              activeSessionFinalized: false,
              cancelledSessionsCount: 0,
              completedSessionsCount: 0,
              discardedFromHistory: false,
              wasAlreadyCompleted: true
            };
          }
        }

        await client.query('ROLLBACK');
        throw new NotFoundError('No se encontró ningún mesociclo activo para cancelar.');
      }

      const mesoId = String(targetMesoRow.id);
      const currentStatus = targetMesoRow.status as MesocycleStatus;

      // CA-07.10: Unwanted behavior: si ya está completado o cancelado
      if (currentStatus === 'completed') {
        await client.query('COMMIT');
        return {
          mesocycleId: mesoId,
          previousStatus: 'completed',
          status: 'completed',
          completionReason: (targetMesoRow.completion_reason as CompletionReason) || 'normal',
          activeSessionFinalized: false,
          cancelledSessionsCount: 0,
          completedSessionsCount: 0,
          discardedFromHistory: false,
          wasAlreadyCompleted: true
        };
      }

      if (currentStatus === 'cancelled') {
        await client.query('ROLLBACK');
        throw new ConflictError('El mesociclo ya fue cancelado previamente.');
      }

      // CA-07.6: Si existe una sesión con status = 'in_progress', finalizarla automáticamente
      let activeSessionFinalized = false;
      const findActiveSessionSql = `
        SELECT s.id
        FROM session s
        JOIN session_plan sp ON s.session_plan_id = sp.id
        JOIN week_plan wp ON sp.week_plan_id = wp.id
        WHERE wp.mesocycle_id = $1 AND s.status = 'in_progress' AND s.deleted_at IS NULL
        LIMIT 1;
      `;
      const activeSessionRes = await client.query(findActiveSessionSql, [mesoId]);
      if (activeSessionRes.rows && activeSessionRes.rows.length > 0) {
        const activeSessionRow = activeSessionRes.rows[0] as Record<string, unknown>;
        const inProgressSessionId = String(activeSessionRow.id);
        const finalizeSql = `
          UPDATE session
          SET status = 'completed',
              completed_at = COALESCE(completed_at, NOW()),
              updated_at = NOW()
          WHERE id = $1;
        `;
        await client.query(finalizeSql, [inProgressSessionId]);
        activeSessionFinalized = true;
      }

      // CA-07.11: Verificar si se completó el 100% de la sobrecarga regular durante la semana de deload
      const checkOverloadSql = `
        /* regular_and_deload_counts */
        SELECT 
          COALESCE(COUNT(DISTINCT sp.id) FILTER (WHERE wp.is_deload = false), 0)::int AS regular_planned_sessions,
          COALESCE(COUNT(DISTINCT s.id) FILTER (WHERE wp.is_deload = false AND s.status = 'completed'), 0)::int AS regular_completed_sessions,
          COALESCE(COUNT(DISTINCT sp.id) FILTER (WHERE wp.is_deload = true), 0)::int AS deload_planned_sessions
        FROM week_plan wp
        JOIN session_plan sp ON sp.week_plan_id = wp.id
        LEFT JOIN session s ON s.session_plan_id = sp.id AND s.deleted_at IS NULL
        WHERE wp.mesocycle_id = $1;
      `;
      const countsRes = await client.query(checkOverloadSql, [mesoId]);
      const countsRow = (countsRes.rows?.[0] || {}) as Record<string, unknown>;

      const regularPlanned = Number(countsRow.regular_planned_sessions ?? 0);
      const regularCompleted = Number(countsRow.regular_completed_sessions ?? 0);
      const deloadPlanned = Number(countsRow.deload_planned_sessions ?? 0);

      const isDeloadSkipped =
        regularPlanned > 0 &&
        regularCompleted >= regularPlanned &&
        deloadPlanned > 0;

      let resolvedReason: CompletionReason = 'cancelled_user';
      if (options?.reason === 'cancelled_injury' || (options?.reason as string) === 'lesion') {
        resolvedReason = 'cancelled_injury';
      } else if (options?.reason === 'deload_skipped') {
        resolvedReason = 'deload_skipped';
      } else if (options?.reason === 'normal') {
        resolvedReason = 'normal';
      } else {
        resolvedReason = 'cancelled_user';
      }

      const targetStatus: MesocycleStatus = isDeloadSkipped ? 'completed' : 'cancelled';
      const finalReason: CompletionReason = isDeloadSkipped
        ? 'deload_skipped'
        : resolvedReason;

      // CA-07.7: Actualizar las sesiones futuras no realizadas a 'cancelled' (sin DELETE físico)
      const cancelSessionsSql = `
        UPDATE session
        SET status = 'cancelled',
            completed_at = COALESCE(completed_at, NOW()),
            updated_at = NOW()
        FROM session_plan sp
        JOIN week_plan wp ON sp.week_plan_id = wp.id
        WHERE session.session_plan_id = sp.id
          AND wp.mesocycle_id = $1
          AND session.status != 'completed';
      `;
      const cancelSessionsRes = await client.query(cancelSessionsSql, [mesoId]);
      const cancelledSessionsCount = Number(cancelSessionsRes.rowCount ?? 0);

      // Actualizar mesociclo
      const updateMesoSql = `
        UPDATE mesocycle
        SET status = $2,
            completion_reason = $3,
            cancelled_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, status, completion_reason, cancelled_at;
      `;
      await client.query(updateMesoSql, [mesoId, targetStatus, finalReason]);

      // CA-07.8: Verificar total de sesiones completadas para el descarte del historial si es 0
      const totalCompletedSql = `
        /* total_completed_sessions */
        SELECT COUNT(DISTINCT s.id)::int AS total_completed
        FROM session s
        JOIN session_plan sp ON s.session_plan_id = sp.id
        JOIN week_plan wp ON sp.week_plan_id = wp.id
        WHERE wp.mesocycle_id = $1 AND s.status = 'completed';
      `;
      const totalRes = await client.query(totalCompletedSql, [mesoId]);
      const totalRows = (totalRes.rows || []) as Record<string, unknown>[];
      const completedSessionsCount = Number(totalRows[0]?.total_completed ?? 0);

      const discardedFromHistory = targetStatus === 'cancelled' && completedSessionsCount === 0;

      await client.query('COMMIT');

      return {
        mesocycleId: mesoId,
        previousStatus: currentStatus,
        status: targetStatus,
        completionReason: finalReason,
        activeSessionFinalized,
        cancelledSessionsCount,
        completedSessionsCount,
        discardedFromHistory,
        wasAlreadyCompleted: false
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene el contexto de transición post-cancelación para un atleta (RF-08).
   * Evalúa el último ciclo cancelado, calcula semanas completadas, regla de rotación del 50%,
   * fatiga acumulada para descarga temprana y cargas efectivas de compuestos básicos (RIR <= 3).
   */
  async getPostCancellationContext(
    athleteId: string,
    specificCancelledMesoId?: string
  ): Promise<PostCancellationContext | null> {
    let cancelledMesoRow: Record<string, unknown> | null = null;

    if (specificCancelledMesoId) {
      const sql = `
        SELECT id, duration_weeks, start_date, cancelled_at, created_at, updated_at
        FROM mesocycle
        WHERE id = $1 AND athlete_id = $2 AND status = 'cancelled';
      `;
      const res = await this.dbPool.query(sql, [specificCancelledMesoId, athleteId]);
      if (res.rows && res.rows.length > 0) {
        cancelledMesoRow = res.rows[0] as Record<string, unknown>;
      }
    } else {
      const sql = `
        SELECT id, duration_weeks, start_date, cancelled_at, created_at, updated_at
        FROM mesocycle
        WHERE athlete_id = $1 AND status = 'cancelled'
        ORDER BY cancelled_at DESC NULLS LAST, updated_at DESC
        LIMIT 1;
      `;
      const res = await this.dbPool.query(sql, [athleteId]);
      if (res.rows && res.rows.length > 0) {
        cancelledMesoRow = res.rows[0] as Record<string, unknown>;
      }
    }

    if (!cancelledMesoRow) {
      return null;
    }

    const mesoId = String(cancelledMesoRow.id);
    const durationWeeks = Number(cancelledMesoRow.duration_weeks ?? 4);

    // 1. Resumen de semanas completadas y sobrecarga consecutiva
    const weekCompletionSql = `
      /* week_completion_summary */
      SELECT 
        wp.week_number,
        wp.is_deload,
        COUNT(DISTINCT sp.id)::int AS planned_sessions,
        COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s.id END)::int AS completed_sessions
      FROM week_plan wp
      JOIN session_plan sp ON sp.week_plan_id = wp.id
      LEFT JOIN session s ON s.session_plan_id = sp.id AND s.deleted_at IS NULL
      WHERE wp.mesocycle_id = $1
      GROUP BY wp.week_number, wp.is_deload
      ORDER BY wp.week_number ASC;
    `;
    const weekRes = await this.dbPool.query(weekCompletionSql, [mesoId]);
    const weekRows = (weekRes.rows || []) as Array<{
      week_number: number;
      is_deload: boolean;
      planned_sessions: number;
      completed_sessions: number;
    }>;

    let completedWeeksCount = 0;
    let consecutiveOverloadWeeks = 0;
    let brokenOverloadStreak = false;

    for (const w of weekRows) {
      const isWeekFullyCompleted =
        w.planned_sessions > 0 && w.completed_sessions >= w.planned_sessions;

      if (isWeekFullyCompleted) {
        completedWeeksCount++;
        if (!w.is_deload && !brokenOverloadStreak) {
          consecutiveOverloadWeeks++;
        } else if (w.is_deload) {
          brokenOverloadStreak = true;
        }
      } else {
        brokenOverloadStreak = true;
      }
    }

    const completionPercentage = Math.round((completedWeeksCount / durationWeeks) * 100);
    const { shouldRotateAccessories } = evaluateAccessoryRotationRule(completedWeeksCount, durationWeeks);
    const { requiresEarlyDeload, earlyDeloadWeek } = evaluateEarlyDeloadRule(consecutiveOverloadWeeks);

    // 2. Preservación de cargas en ejercicios compuestos (CA-08.4)
    const preservedLoadsSql = `
      /* preserved_compound_loads */
      SELECT 
        sl.exercise_id,
        MAX(sl.weight_kg) as max_load_kg
      FROM set_log sl
      JOIN session s ON sl.session_id = s.id
      JOIN session_plan sp ON s.session_plan_id = sp.id
      JOIN week_plan wp ON sp.week_plan_id = wp.id
      JOIN exercise e ON sl.exercise_id = e.id
      WHERE wp.mesocycle_id = $1
        AND s.deleted_at IS NULL
        AND sl.rir <= 3
        AND e.is_compound = true
      GROUP BY sl.exercise_id;
    `;
    const preservedRes = await this.dbPool.query(preservedLoadsSql, [mesoId]);
    const preservedRows = (preservedRes.rows || []) as Array<{
      exercise_id: string;
      max_load_kg: number;
    }>;

    const preservedCompoundLoads: Record<string, number> = {};
    for (const row of preservedRows) {
      preservedCompoundLoads[row.exercise_id] = Number(row.max_load_kg);
    }

    return {
      cancelledMesocycleId: mesoId,
      durationWeeks,
      completedWeeksCount,
      completionPercentage,
      shouldRotateAccessories,
      requiresEarlyDeload,
      earlyDeloadWeek,
      preservedCompoundLoads
    };
  }
}

export const mesocycleLifecycleService = new MesocycleLifecycleService();
