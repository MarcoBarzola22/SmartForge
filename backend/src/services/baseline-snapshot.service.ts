import {
  BaselineSnapshotRepository,
  baselineSnapshotRepository,
  type BaselineSnapshotRecord,
  type CreateBaselineSnapshotData,
  type PoolClientLike
} from '../repositories/baseline-snapshot.repository.js';
import {
  SetLogRepository,
  setLogRepository
} from '../repositories/set-log.repository.js';
import {
  ExerciseRepository,
  exerciseRepository
} from '../repositories/exercise.repository.js';
import {
  AthleteRepository,
  athleteRepository
} from '../repositories/athlete.repository.js';
import {
  BodyWeightRepository,
  bodyWeightRepository
} from '../repositories/body-weight.repository.js';
import { NotFoundError } from '../errors/app-error.js';
import type {
  ExperienceLevel,
  LoadType,
  MovementPattern
} from '../schemas/generated/schemas.js';

export const DEFAULT_INITIAL_LOAD_RATIOS = {
  empuje_compuesto: { principiante: 0.5, intermedio: 0.75, avanzado: 1.0 },
  tiron_compuesto: { principiante: 0.4, intermedio: 0.6, avanzado: 0.8 },
  rodilla_dominante_compuesto: { principiante: 0.5, intermedio: 0.8, avanzado: 1.2 },
  cadera_dominante_compuesto: { principiante: 0.6, intermedio: 0.9, avanzado: 1.3 },
  core_monoarticular: { principiante: 0.1, intermedio: 0.15, avanzado: 0.2 }
};

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
      totalMassKg = athleteWeightKg + rawLoadKg; // lastre positivo
      break;
    case 'assisted_bodyweight':
      totalMassKg = Math.max(1.0, athleteWeightKg - rawLoadKg); // asistencia con piso de 1.0 kg (CA-06.2)
      break;
    case 'external_load':
    default:
      totalMassKg = rawLoadKg;
      break;
  }

  const cappedReps = Math.min(30, Math.max(1, reps)); // Saturación a 30 reps para estabilidad (CA-06.4)

  if (cappedReps <= 10) {
    // Fórmula de Brzycki
    return Number((totalMassKg / (1.0278 - 0.0278 * cappedReps)).toFixed(2));
  } else {
    // Fórmula de Wathan (evita divergencia)
    const denominator = 48.8 + 53.8 * Math.exp(-0.075 * cappedReps);
    return Number(((100 * totalMassKg) / denominator).toFixed(2));
  }
}

export class BaselineSnapshotService {
  constructor(
    private readonly baselineSnapshotRepo: BaselineSnapshotRepository = baselineSnapshotRepository,
    private readonly setLogRepo: SetLogRepository = setLogRepository,
    private readonly exerciseRepo: ExerciseRepository = exerciseRepository,
    private readonly athleteRepo: AthleteRepository = athleteRepository,
    private readonly bodyWeightRepo: BodyWeightRepository = bodyWeightRepository
  ) {}

  private getDefaultRatio(
    pattern: MovementPattern,
    isCompound: boolean,
    level: ExperienceLevel
  ): number {
    if (pattern === 'core' || !isCompound) {
      return DEFAULT_INITIAL_LOAD_RATIOS.core_monoarticular[level];
    }

    switch (pattern) {
      case 'empuje':
        return DEFAULT_INITIAL_LOAD_RATIOS.empuje_compuesto[level];
      case 'tiron':
        return DEFAULT_INITIAL_LOAD_RATIOS.tiron_compuesto[level];
      case 'rodilla_dominante':
        return DEFAULT_INITIAL_LOAD_RATIOS.rodilla_dominante_compuesto[level];
      case 'cadera_dominante':
        return DEFAULT_INITIAL_LOAD_RATIOS.cadera_dominante_compuesto[level];
      default:
        return DEFAULT_INITIAL_LOAD_RATIOS.core_monoarticular[level];
    }
  }

  /**
   * Resuelve el punto de partida inmutable para un ejercicio según el algoritmo de 3 pasos (RF-05 CA-05.2):
   * 1. Mejor serie completada con RIR <= 3 en los últimos 90 días (desempate por mayor kg).
   * 2. Si no hay RIR <= 3, normalización de la serie de mayor peso con RIR 4 o 5 a su equivalente en RIR 2.
   * 3. Fallback a ratio de catálogo y peso corporal según experiencia.
   */
  async resolveBaselineForExercise(
    athleteId: string,
    exerciseId: string,
    athleteWeightKg: number,
    experienceLevel: ExperienceLevel,
    mesocycleId: string = ''
  ): Promise<CreateBaselineSnapshotData> {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentSets = await this.setLogRepo.findRecentSetsForExercise(
      athleteId,
      exerciseId,
      ninetyDaysAgo
    );

    // 1. Buscar series efectivas con RIR <= 3
    const validSets = recentSets.filter((s) => s.rir <= 3);
    if (validSets.length > 0) {
      let bestSet = validSets[0]!;
      let bestE1rm = computeE1RM(
        (bestSet.load_type as LoadType) || 'external_load',
        bestSet.weight_kg,
        bestSet.reps_completed,
        athleteWeightKg
      );

      for (let i = 1; i < validSets.length; i++) {
        const curr = validSets[i]!;
        const currE1rm = computeE1RM(
          (curr.load_type as LoadType) || 'external_load',
          curr.weight_kg,
          curr.reps_completed,
          athleteWeightKg
        );

        if (currE1rm > bestE1rm) {
          bestSet = curr;
          bestE1rm = currE1rm;
        } else if (currE1rm === bestE1rm && curr.weight_kg > bestSet.weight_kg) {
          // Desempate por mayor peso absoluto en kg (CA-05.2)
          bestSet = curr;
          bestE1rm = currE1rm;
        }
      }

      return {
        mesocycle_id: mesocycleId,
        exercise_id: exerciseId,
        baseline_load_kg: bestSet.weight_kg,
        baseline_reps: bestSet.reps_completed,
        baseline_e1rm_kg: bestE1rm,
        athlete_bodyweight_kg: athleteWeightKg,
        source_type: 'history_rir_le_3'
      };
    }

    // 2. Si no hay RIR <= 3, buscar series submáximas con RIR 4 o 5 y normalizar a RIR 2
    const submaxSets = recentSets.filter((s) => s.rir === 4 || s.rir === 5);
    if (submaxSets.length > 0) {
      const highestSubmax = submaxSets.reduce((prev, curr) =>
        curr.weight_kg > prev.weight_kg ? curr : prev
      );

      // Fórmula: carga_base = carga_registrada * (1 + (RIR_registrado - 2) * 0.025)
      const factor = 1 + (highestSubmax.rir - 2) * 0.025;
      const normalizedLoad = Math.round(highestSubmax.weight_kg * factor * 10) / 10;
      const loadType = (highestSubmax.load_type as LoadType) || 'external_load';
      const normalizedE1rm = computeE1RM(
        loadType,
        normalizedLoad,
        highestSubmax.reps_completed,
        athleteWeightKg
      );

      return {
        mesocycle_id: mesocycleId,
        exercise_id: exerciseId,
        baseline_load_kg: normalizedLoad,
        baseline_reps: highestSubmax.reps_completed,
        baseline_e1rm_kg: normalizedE1rm,
        athlete_bodyweight_kg: athleteWeightKg,
        source_type: 'history_rir_normalized'
      };
    }

    // 3. Fallback a catálogo: ratio predeterminado según nivel y peso corporal (SPEC-001 CA-02.5)
    const exercise = await this.exerciseRepo.findById(exerciseId);
    const loadType = (exercise?.load_type as LoadType) || 'external_load';

    if (
      loadType === 'bodyweight' ||
      exercise?.equipment_id === 'bodyweight' ||
      exercise?.equipment_id === 'sin_equipamiento' ||
      exercise?.equipment_id === 'none'
    ) {
      const e1rm = computeE1RM('bodyweight', 0, 10, athleteWeightKg);
      return {
        mesocycle_id: mesocycleId,
        exercise_id: exerciseId,
        baseline_load_kg: 0.0,
        baseline_reps: 10,
        baseline_e1rm_kg: e1rm,
        athlete_bodyweight_kg: athleteWeightKg,
        source_type: 'experience_ratio_default'
      };
    }

    const ratio =
      exercise && exercise.initial_load_ratio > 0
        ? exercise.initial_load_ratio
        : this.getDefaultRatio(
            exercise?.movement_pattern || 'empuje',
            exercise?.is_compound ?? true,
            experienceLevel
          );

    const rawLoad = athleteWeightKg * ratio;
    const estimatedLoad = Math.round(rawLoad * 2) / 2;
    const e1rm = computeE1RM(loadType, estimatedLoad, 10, athleteWeightKg);

    return {
      mesocycle_id: mesocycleId,
      exercise_id: exerciseId,
      baseline_load_kg: estimatedLoad,
      baseline_reps: 10,
      baseline_e1rm_kg: e1rm,
      athlete_bodyweight_kg: athleteWeightKg,
      source_type: 'experience_ratio_default'
    };
  }

  /**
   * Captura y persiste en bloque los snapshots basales inmutables al activar un mesociclo (RF-05 CA-05.1, CA-05.3).
   */
  async captureBaselinesForMesocycle(params: {
    mesocycleId: string;
    athleteId: string;
    exerciseIds: string[];
    client?: PoolClientLike;
  }): Promise<BaselineSnapshotRecord[]> {
    const athlete = await this.athleteRepo.findById(params.athleteId);
    if (!athlete) {
      throw new NotFoundError('Perfil de atleta no encontrado.');
    }

    const latestWeightLog = await this.bodyWeightRepo.findLatestBeforeDate(
      params.athleteId,
      '9999-12-31'
    );
    const athleteWeightKg = latestWeightLog ? latestWeightLog.weight_kg : athlete.weight_kg;

    const uniqueExerciseIds = Array.from(new Set(params.exerciseIds));
    const snapshotsToCreate: CreateBaselineSnapshotData[] = [];

    for (const exerciseId of uniqueExerciseIds) {
      const snapshotData = await this.resolveBaselineForExercise(
        params.athleteId,
        exerciseId,
        athleteWeightKg,
        athlete.experience_level,
        params.mesocycleId
      );
      snapshotsToCreate.push(snapshotData);
    }

    return this.baselineSnapshotRepo.createBatch(snapshotsToCreate, params.client);
  }

  /**
   * Obtiene todos los snapshots basales inmutables de un mesociclo (RF-05, RF-06).
   */
  async getBaselinesForMesocycle(mesocycleId: string): Promise<BaselineSnapshotRecord[]> {
    return this.baselineSnapshotRepo.findByMesocycleId(mesocycleId);
  }
}

export const baselineSnapshotService = new BaselineSnapshotService();
