import { pool } from '../config/db.js';
import {
  MesocycleRepository,
  mesocycleRepository
} from '../repositories/mesocycle.repository.js';
import {
  BaselineSnapshotRepository,
  baselineSnapshotRepository,
  type BaselineSnapshotRecord
} from '../repositories/baseline-snapshot.repository.js';
import {
  SessionRepository,
  sessionRepository
} from '../repositories/session.repository.js';
import {
  SetLogRepository,
  setLogRepository
} from '../repositories/set-log.repository.js';
import {
  BodyWeightRepository,
  bodyWeightRepository
} from '../repositories/body-weight.repository.js';
import type { PoolLike } from '../repositories/baseline-snapshot.repository.js';
import type {
  LoadType,
  MesocycleHistoryItem,
  MesocycleHistoryResponse,
  ExerciseProgressionItem,
  ExerciseBaselineSnapshot,
  ExerciseFinalPerformance,
  ExerciseProgressionDelta
} from '../schemas/generated/schemas.js';

/**
 * Calcula la fuerza máxima estimada (e1RM) usando el modelo híbrido Brzycki/Wathan y taxonomía de cargas (RF-05, RF-06).
 */
export function computeE1RM(
  loadType: LoadType,
  rawLoadKg: number,
  reps: number,
  athleteWeightKg: number
): number {
  let totalMassKg = 0;

  switch (loadType) {
    case 'bodyweight':
      totalMassKg = athleteWeightKg;
      break;
    case 'bodyweight_loadable':
      totalMassKg = athleteWeightKg + rawLoadKg;
      break;
    case 'assisted_bodyweight':
      totalMassKg = Math.max(1.0, athleteWeightKg - rawLoadKg); // Piso de 1.0 kg (CA-06.2)
      break;
    case 'external_load':
    default:
      totalMassKg = rawLoadKg;
      break;
  }

  const cappedReps = Math.min(30, Math.max(1, reps)); // Saturación a 30 reps (CA-06.4)

  if (cappedReps <= 10) {
    // Fórmula de Brzycki
    return Number((totalMassKg / (1.0278 - 0.0278 * cappedReps)).toFixed(2));
  } else {
    // Fórmula de Wathan (asintótica, evita divergencia)
    const denominator = 48.8 + 53.8 * Math.exp(-0.075 * cappedReps);
    return Number(((100 * totalMassKg) / denominator).toFixed(2));
  }
}

/**
 * Genera el texto legible del registro de carga según la taxonomía de cargas (CA-06.4).
 */
export function formatLoadText(
  loadType: LoadType,
  rawLoadKg: number,
  reps: number,
  athleteWeightKg: number
): string {
  const formattedWeight = athleteWeightKg.toFixed(1);
  const formattedLoad = rawLoadKg.toFixed(1);

  switch (loadType) {
    case 'bodyweight':
      return `${formattedWeight} kg (PC) × ${reps} reps`;
    case 'bodyweight_loadable':
      return `${formattedWeight} kg (PC) + ${formattedLoad} kg × ${reps} reps`;
    case 'assisted_bodyweight':
      return `${formattedWeight} kg (PC) - ${formattedLoad} kg (asist.) × ${reps} reps`;
    case 'external_load':
    default:
      return `${formattedLoad} kg × ${reps} reps`;
  }
}

export interface SessionExecutionSummary {
  plannedSets: number;
  completedSets: number;
}

/**
 * Cómputo de sesiones efectivas completadas (RF-06 CA-06.1):
 * - Una sesión con >= 50% de series planificadas computa como 1.0 sesión completada.
 * - Una sesión con < 50% de series planificadas computa como fracción proporcional (series_completadas / series_planificadas).
 */
export function computeEffectiveSessionsCompleted(
  sessions: SessionExecutionSummary[]
): number {
  let totalEffective = 0;
  for (const session of sessions) {
    if (session.plannedSets <= 0) {
      if (session.completedSets > 0) totalEffective += 1.0;
      continue;
    }
    const ratio = session.completedSets / session.plannedSets;
    if (ratio >= 0.5) {
      totalEffective += 1.0;
    } else {
      totalEffective += ratio;
    }
  }
  return totalEffective;
}

export interface AdherenceResult {
  adherencePercent: number;
  adherenceDetails?: string;
}

/**
 * Calcula la adherencia y detalles de cumplimiento de un mesociclo (RF-06 CA-06.1):
 * - Completado: (sesiones_efectivas / sesiones_planificadas) * 100
 * - Cancelado: min(100, round((sesiones_efectivas / max(1, (dias_semanales / 7) * dias_transcurridos)) * 100))
 */
export function computeAdherence(params: {
  status: 'completed' | 'deload_skipped' | 'cancelled';
  plannedSessions: number;
  effectiveSessionsCompleted: number;
  weeklyDays?: number;
  daysElapsed?: number;
}): AdherenceResult {
  const {
    status,
    plannedSessions,
    effectiveSessionsCompleted,
    weeklyDays = 4,
    daysElapsed = 0
  } = params;

  if (status === 'completed' || status === 'deload_skipped') {
    const denominator = Math.max(1, plannedSessions);
    const adherencePercent = Math.min(
      100,
      Math.max(0, Math.round((effectiveSessionsCompleted / denominator) * 100))
    );
    return { adherencePercent };
  }

  // Cancelled mesocycle
  const expectedSessions = (weeklyDays / 7) * daysElapsed;
  const denominator = Math.max(1, expectedSessions);
  const rawPercent = Math.round((effectiveSessionsCompleted / denominator) * 100);
  const adherencePercent = Math.min(100, Math.max(0, rawPercent));

  if (effectiveSessionsCompleted > expectedSessions) {
    return {
      adherencePercent,
      adherenceDetails: 'Cumplimiento: 100% (con sesiones adelantadas)'
    };
  }

  return { adherencePercent };
}

export class MesocycleHistoryService {
  constructor(
    _mesocycleRepo: MesocycleRepository = mesocycleRepository,
    private readonly baselineSnapshotRepo: BaselineSnapshotRepository = baselineSnapshotRepository,
    _sessionRepo: SessionRepository = sessionRepository,
    _setLogRepo: SetLogRepository = setLogRepository,
    private readonly bodyWeightRepo: BodyWeightRepository = bodyWeightRepository,
    private readonly dbPool: PoolLike = pool
  ) {
    void _mesocycleRepo;
    void _sessionRepo;
    void _setLogRepo;
  }

  /**
   * Resuelve el peso corporal de un atleta en la fecha de la sesión usando Carry-Forward (RF-06 CA-06.3).
   */
  private async resolveAthleteBodyWeight(
    athleteId: string,
    sessionDate: string,
    fallbackWeightKg: number
  ): Promise<number> {
    try {
      const log = await this.bodyWeightRepo.findLatestBeforeDate(
        athleteId,
        sessionDate.slice(0, 10)
      );
      if (log && log.weight_kg > 0) {
        return log.weight_kg;
      }
    } catch {
      // Ignorar error y usar fallback
    }
    return fallbackWeightKg;
  }

  /**
   * Obtiene el historial completo de mesociclos pasados de un atleta en orden cronológico inverso (RF-06).
   */
  async getAthleteHistory(athleteId: string): Promise<MesocycleHistoryResponse> {
    // 1. Obtener mesociclos ordenados cronológicamente inverso
    const mesoSql = `
      SELECT 
        m.id,
        m.athlete_id,
        m.name,
        m.training_goal,
        m.periodization_type,
        m.duration_weeks,
        m.start_date,
        m.end_date,
        m.status,
        m.completion_reason,
        m.cancelled_at,
        m.created_at,
        m.updated_at
      FROM mesocycle m
      WHERE m.athlete_id = $1
      ORDER BY m.start_date DESC NULLS LAST, m.created_at DESC;
    `;

    const mesoRes = await this.dbPool.query(mesoSql, [athleteId]);
    const mesocyclesRaw = (mesoRes.rows || []) as Record<string, unknown>[];

    const historyItems: MesocycleHistoryItem[] = [];

    for (const row of mesocyclesRaw) {
      const mesoId = String(row.id);
      const statusRaw = String(row.status || 'completed');
      const completionReason = row.completion_reason ? String(row.completion_reason) : null;
      const isCancelled = statusRaw === 'cancelled';

      let historyStatus: 'completed' | 'deload_skipped' | 'cancelled' = 'completed';
      if (completionReason === 'deload_skipped') {
        historyStatus = 'deload_skipped';
      } else if (isCancelled) {
        historyStatus = 'cancelled';
      } else {
        historyStatus = 'completed';
      }

      // 2. Obtener sesiones planificadas y ejecución efectiva
      const countPlannedSql = `
        SELECT COUNT(*)::int AS count
        FROM session_plan sp
        JOIN week_plan wp ON sp.week_plan_id = wp.id
        WHERE wp.mesocycle_id = $1;
      `;
      const plannedRes = await this.dbPool.query(countPlannedSql, [mesoId]);
      const plannedRows = (plannedRes.rows || []) as Record<string, unknown>[];
      const plannedSessionsCount = Number(plannedRows[0]?.count ?? 0);

      const sessionExecSql = `
        /* session_execution */
        SELECT 
          s.id AS session_id,
          (SELECT COALESCE(SUM(ea.target_sets), 0) FROM exercise_assignment ea WHERE ea.session_plan_id = s.session_plan_id)::int AS planned_sets,
          (SELECT COUNT(*) FROM set_log sl WHERE sl.session_id = s.id)::int AS completed_sets
        FROM session s
        JOIN session_plan sp ON s.session_plan_id = sp.id
        JOIN week_plan wp ON sp.week_plan_id = wp.id
        WHERE wp.mesocycle_id = $1 AND s.deleted_at IS NULL;
      `;
      const execRes = await this.dbPool.query(sessionExecSql, [mesoId]);
      const sessionSummaries: SessionExecutionSummary[] = (
        (execRes.rows || []) as Record<string, unknown>[]
      ).map((r) => ({
        plannedSets: Number(r.planned_sets ?? 0),
        completedSets: Number(r.completed_sets ?? 0)
      }));

      const totalCompletedSets = sessionSummaries.reduce(
        (sum, s) => sum + s.completedSets,
        0
      );

      // CA-07.8: Si un mesociclo se cancela habiendo completado 0 sesiones, descartarlo del historial
      if (isCancelled && totalCompletedSets === 0) {
        continue;
      }

      const effectiveSessions = computeEffectiveSessionsCompleted(sessionSummaries);

      // Calcular días transcurridos si fue cancelado
      const startDateStr = row.start_date
        ? (row.start_date instanceof Date
            ? row.start_date.toISOString().slice(0, 10)
            : String(row.start_date).slice(0, 10))
        : (row.created_at instanceof Date
            ? row.created_at.toISOString().slice(0, 10)
            : String(row.created_at).slice(0, 10));

      const endDateStr = row.end_date
        ? (row.end_date instanceof Date
            ? row.end_date.toISOString().slice(0, 10)
            : String(row.end_date).slice(0, 10))
        : null;

      const cancelledAtDate = row.cancelled_at
        ? (row.cancelled_at instanceof Date
            ? row.cancelled_at
            : new Date(String(row.cancelled_at)))
        : (row.updated_at instanceof Date
            ? row.updated_at
            : new Date(String(row.updated_at)));

      const startDateObj = new Date(startDateStr);
      const diffMs = Math.max(0, cancelledAtDate.getTime() - startDateObj.getTime());
      const daysElapsed = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

      const durationWeeks = Number(row.duration_weeks ?? 4);
      const weeklyDays = plannedSessionsCount > 0 && durationWeeks > 0
        ? Math.round(plannedSessionsCount / durationWeeks)
        : 4;

      const adherence = computeAdherence({
        status: historyStatus,
        plannedSessions: plannedSessionsCount,
        effectiveSessionsCompleted: effectiveSessions,
        weeklyDays,
        daysElapsed
      });

      // 3. Baselines inmutables
      const baselineRecords = await this.baselineSnapshotRepo.findByMesocycleId(mesoId);
      const baselineMap = new Map<string, BaselineSnapshotRecord>();
      for (const b of baselineRecords) {
        baselineMap.set(b.exercise_id, b);
      }

      const firstSnapshot = baselineRecords[0];
      const defaultAthleteWeight =
        firstSnapshot && firstSnapshot.athlete_bodyweight_kg > 0
          ? firstSnapshot.athlete_bodyweight_kg
          : 75.0;

      // 4. Ejercicios asignados al mesociclo
      const assignedExercisesSql = `
        /* assigned_exercises */
        SELECT DISTINCT
          e.id AS exercise_id,
          e.name AS exercise_name,
          COALESCE(e.load_type, 'external_load') AS load_type
        FROM exercise_assignment ea
        JOIN session_plan sp ON ea.session_plan_id = sp.id
        JOIN week_plan wp ON sp.week_plan_id = wp.id
        JOIN exercise e ON ea.exercise_id = e.id
        WHERE wp.mesocycle_id = $1
        ORDER BY e.name ASC;
      `;
      const assignedRes = await this.dbPool.query(assignedExercisesSql, [mesoId]);
      const assignedExercises = (assignedRes.rows || []) as Record<string, unknown>[];

      // 5. Mejores series por ejercicio (RIR <= 3)
      const bestSetsSql = `
        /* best_sets_for_mesocycle */
        SELECT 
          sl.exercise_id,
          sl.weight_kg,
          sl.reps_completed,
          sl.rir,
          COALESCE(s.completed_at, s.started_at, sl.client_timestamp)::date AS session_date,
          wp.week_number,
          wp.is_deload
        FROM set_log sl
        JOIN session s ON sl.session_id = s.id
        JOIN session_plan sp ON s.session_plan_id = sp.id
        JOIN week_plan wp ON sp.week_plan_id = wp.id
        WHERE wp.mesocycle_id = $1
          AND s.deleted_at IS NULL
          AND sl.rir <= 3
        ORDER BY wp.week_number DESC, sl.created_at DESC;
      `;
      const bestSetsRes = await this.dbPool.query(bestSetsSql, [mesoId]);
      const rawBestSets = (bestSetsRes.rows || []) as Array<{
        exercise_id: string;
        weight_kg: number;
        reps_completed: number;
        rir: number;
        session_date: unknown;
        week_number?: number;
        is_deload?: boolean;
      }>;

      // Agrupar series por exercise_id
      const setsByExercise = new Map<string, typeof rawBestSets>();
      for (const setRow of rawBestSets) {
        const exId = String(setRow.exercise_id);
        if (!setsByExercise.has(exId)) {
          setsByExercise.set(exId, []);
        }
        setsByExercise.get(exId)!.push(setRow);
      }

      const exerciseProgressions: ExerciseProgressionItem[] = [];

      for (const ex of assignedExercises) {
        const exId = String(ex.exercise_id);
        const exName = String(ex.exercise_name);
        const loadType = String(ex.load_type || 'external_load') as LoadType;

        const baselineSnapshot = baselineMap.get(exId);
        const baselineLoadKg = baselineSnapshot ? baselineSnapshot.baseline_load_kg : 0;
        const baselineReps = baselineSnapshot ? baselineSnapshot.baseline_reps : 10;
        const baselineAthleteWeight = baselineSnapshot
          ? baselineSnapshot.athlete_bodyweight_kg
          : defaultAthleteWeight;
        const baselineE1rmKg = baselineSnapshot
          ? baselineSnapshot.baseline_e1rm_kg
          : computeE1RM(loadType, baselineLoadKg, baselineReps, baselineAthleteWeight);

        const baseline: ExerciseBaselineSnapshot = {
          loadText: formatLoadText(loadType, baselineLoadKg, baselineReps, baselineAthleteWeight),
          e1rmKg: baselineE1rmKg
        };

        const exerciseSets = setsByExercise.get(exId) || [];

        if (exerciseSets.length === 0) {
          // CA-06.5: No ejecutado
          const finalPerf: ExerciseFinalPerformance = {
            loadText: isCancelled
              ? 'No ejecutado (Ciclo cancelado)'
              : 'No ejecutado',
            e1rmKg: 0,
            executed: false
          };

          exerciseProgressions.push({
            exerciseId: exId,
            exerciseName: exName,
            loadType,
            baseline,
            final: finalPerf
          });
        } else {
          // Encontrar la serie con mayor e1RM evaluando el peso vigente con carry-forward
          // y desempatando por mayor kg (CA-06.4)
          let bestSetResult: {
            weightKg: number;
            reps: number;
            e1rmKg: number;
            bodyWeightKg: number;
          } | null = null;

          for (const s of exerciseSets) {
            const rawDate = s.session_date;
            const dateStr = rawDate instanceof Date
              ? rawDate.toISOString().slice(0, 10)
              : String(rawDate).slice(0, 10);

            const sessionWeight = await this.resolveAthleteBodyWeight(
              athleteId,
              dateStr,
              baselineAthleteWeight
            );

            const e1rm = computeE1RM(
              loadType,
              Number(s.weight_kg),
              Number(s.reps_completed),
              sessionWeight
            );

            if (!bestSetResult) {
              bestSetResult = {
                weightKg: Number(s.weight_kg),
                reps: Number(s.reps_completed),
                e1rmKg: e1rm,
                bodyWeightKg: sessionWeight
              };
            } else {
              if (e1rm > bestSetResult.e1rmKg) {
                bestSetResult = {
                  weightKg: Number(s.weight_kg),
                  reps: Number(s.reps_completed),
                  e1rmKg: e1rm,
                  bodyWeightKg: sessionWeight
                };
              } else if (e1rm === bestSetResult.e1rmKg && Number(s.weight_kg) > bestSetResult.weightKg) {
                bestSetResult = {
                  weightKg: Number(s.weight_kg),
                  reps: Number(s.reps_completed),
                  e1rmKg: e1rm,
                  bodyWeightKg: sessionWeight
                };
              }
            }
          }

          const finalPerf: ExerciseFinalPerformance = {
            loadText: formatLoadText(
              loadType,
              bestSetResult!.weightKg,
              bestSetResult!.reps,
              bestSetResult!.bodyWeightKg
            ),
            e1rmKg: bestSetResult!.e1rmKg,
            executed: true
          };

          const deltaKg = Number((finalPerf.e1rmKg - baseline.e1rmKg).toFixed(2));
          const deltaPercent = baseline.e1rmKg > 0
            ? Number(((deltaKg / baseline.e1rmKg) * 100).toFixed(1))
            : 0;

          const progress: ExerciseProgressionDelta = {
            deltaKg,
            deltaPercent
          };

          exerciseProgressions.push({
            exerciseId: exId,
            exerciseName: exName,
            loadType,
            baseline,
            final: finalPerf,
            progress
          });
        }
      }

      historyItems.push({
        id: mesoId,
        name: String(row.name || 'Mesociclo'),
        goal: String(row.training_goal || 'hipertrofia'),
        startDate: startDateStr,
        endDate: endDateStr,
        status: historyStatus,
        adherencePercent: adherence.adherencePercent,
        adherenceDetails: adherence.adherenceDetails,
        exerciseProgressions
      });
    }

    return { mesocycles: historyItems };
  }
}

export const mesocycleHistoryService = new MesocycleHistoryService();
