import type {
  RoutineTimeBlockItem,
  MovementPattern,
  MuscleGroup
} from '../schemas/generated/schemas.js';

export const WARMUP_TIME_MINUTES = 8;
export const BILATERAL_SET_SECONDS = 45;
export const UNILATERAL_SET_SECONDS = 80; // Factor 1.8x biomecánico
export const COMPOUND_REST_SECONDS = 150; // >= 120s
export const ISOLATION_REST_SECONDS = 75; // >= 60s
export const TRANSITION_TIME_SECONDS = 90; // 1.5 min por ejercicio

export const ROUTINE_TIME_BLOCKS: RoutineTimeBlockItem[] = [
  { duration_minutes: 30, min_exercises: 2, max_exercises: 3, recommended_exercises: 2 },
  { duration_minutes: 45, min_exercises: 2, max_exercises: 4, recommended_exercises: 3 },
  { duration_minutes: 60, min_exercises: 2, max_exercises: 5, recommended_exercises: 4 },
  { duration_minutes: 75, min_exercises: 2, max_exercises: 6, recommended_exercises: 5 },
  { duration_minutes: 90, min_exercises: 3, max_exercises: 7, recommended_exercises: 6 },
  { duration_minutes: 120, min_exercises: 4, max_exercises: 7, recommended_exercises: 7 }
];

export interface ExercisePlannedInput {
  id: string;
  name?: string;
  is_compound?: boolean;
  isCompound?: boolean;
  is_unilateral?: boolean;
  isUnilateral?: boolean;
  baseSets?: number;
  peakSets?: number;
  targetSets?: number;
  muscle?: MuscleGroup;
  movement_pattern?: MovementPattern;
}

export interface FeasibilityResult {
  isFeasible: boolean;
  estimatedMinutes: number;
  availableMinutes: number;
  deficitMinutes: number;
  maxFeasibleExercises: number;
  reason?: string;
  suggestion?: string;
}

export interface SwapFeasibilityResult {
  canSwap: boolean;
  setsReduced: boolean;
  adjustedCandidateSets?: number;
  message?: string;
}

/**
 * Detecta si un ejercicio es de ejecución unilateral a partir de su flag o nombre/id.
 */
export function isUnilateralExercise(exercise: {
  id?: string;
  name?: string;
  is_unilateral?: boolean;
  isUnilateral?: boolean;
}): boolean {
  if (typeof exercise.is_unilateral === 'boolean') {
    return exercise.is_unilateral;
  }
  if (typeof exercise.isUnilateral === 'boolean') {
    return exercise.isUnilateral;
  }

  const textToScan = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
  return (
    textToScan.includes('unilateral') ||
    textToScan.includes('a una mano') ||
    textToScan.includes('a una pierna') ||
    textToScan.includes('a 1 mano') ||
    textToScan.includes('a 1 pierna') ||
    textToScan.includes('pistol')
  );
}

export class RoutineEngineV2Service {
  /**
   * Retorna la matriz de configuración de bloques de tiempo predefinidos (RF-03 CA-03.2, CA-03.4).
   */
  getTimeBlockConfig(): RoutineTimeBlockItem[] {
    return [...ROUTINE_TIME_BLOCKS];
  }

  /**
   * Busca un bloque de tiempo predefinido por su duración en minutos.
   */
  getTimeBlockByDuration(durationMinutes: number): RoutineTimeBlockItem | undefined {
    return ROUTINE_TIME_BLOCKS.find((b) => b.duration_minutes === durationMinutes);
  }

  /**
   * Estima la duración total en minutos de una sesión de entrenamiento (RF-04 CA-04.1).
   * Suma:
   * - Calentamiento fijo (8 min).
   * - Tiempo de ejecución por serie (45s bilateral, 80s unilateral con factor 1.8x).
   * - Descansos fisiológicos (150s compuestos, 75s monoarticulares).
   * - Tiempo de transición y ajuste de equipamiento (90s por ejercicio).
   */
  estimateSessionDurationMinutes(
    exercises: ExercisePlannedInput[],
    isPeakWeek: boolean = true,
    warmupMinutes: number = WARMUP_TIME_MINUTES
  ): number {
    let totalEstimatedSeconds = 0;

    for (const ex of exercises) {
      const sets = isPeakWeek
        ? (ex.peakSets ?? ex.targetSets ?? 4)
        : (ex.baseSets ?? ex.targetSets ?? 3);

      const isUni = isUnilateralExercise(ex);
      const isComp = ex.is_compound ?? ex.isCompound ?? true;

      const setDurationSeconds = isUni ? UNILATERAL_SET_SECONDS : BILATERAL_SET_SECONDS;
      const restDurationSeconds = isComp ? COMPOUND_REST_SECONDS : ISOLATION_REST_SECONDS;

      const exerciseTotalSeconds =
        setDurationSeconds * sets +
        restDurationSeconds * Math.max(0, sets - 1) +
        TRANSITION_TIME_SECONDS;

      totalEstimatedSeconds += exerciseTotalSeconds;
    }

    const trainingMinutes = Math.ceil(totalEstimatedSeconds / 60);
    return trainingMinutes + warmupMinutes;
  }

  /**
   * Valida la viabilidad temporal de una sesión en la semana pico (RF-04 CA-04.1, CA-04.2, CA-04.3).
   */
  validateSessionFeasibility(
    durationMinutes: number,
    exercises: ExercisePlannedInput[],
    isPeakWeek: boolean = true
  ): FeasibilityResult {
    const estimatedMinutes = this.estimateSessionDurationMinutes(exercises, isPeakWeek);
    const block = this.getTimeBlockByDuration(durationMinutes);
    const maxFeasibleExercises = block ? block.max_exercises : 3;

    if (estimatedMinutes <= durationMinutes) {
      return {
        isFeasible: true,
        estimatedMinutes,
        availableMinutes: durationMinutes,
        deficitMinutes: 0,
        maxFeasibleExercises
      };
    }

    const deficitMinutes = estimatedMinutes - durationMinutes;
    const minEx = block ? block.min_exercises : 2;
    const maxEx = block ? block.max_exercises : 3;

    return {
      isFeasible: false,
      estimatedMinutes,
      availableMinutes: durationMinutes,
      deficitMinutes,
      maxFeasibleExercises,
      reason: `La sesión requiere ${estimatedMinutes} min para series y pausas fisiológicas, superando tus ${durationMinutes} min asignados.`,
      suggestion: `Para ${durationMinutes} minutos recomendamos un máximo de ${minEx} a ${maxEx} ejercicios.`
    };
  }

  /**
   * Valida pedagógicamente si una selección manual de cantidad de ejercicios es viable para el bloque de tiempo (CA-04.2, CA-04.3).
   */
  validateSelectionFeasibility(
    durationMinutes: number,
    exerciseCount: number
  ): { isFeasible: boolean; reason?: string; suggestion?: string } {
    const block = this.getTimeBlockByDuration(durationMinutes);
    if (!block) {
      return { isFeasible: true };
    }

    if (exerciseCount > block.max_exercises) {
      return {
        isFeasible: false,
        reason: `La selección de ${exerciseCount} ejercicios excede el presupuesto del bloque de ${durationMinutes} minutos en la semana pico.`,
        suggestion: `Para ${durationMinutes} minutos recomendamos un máximo de ${block.min_exercises} a ${block.max_exercises} ejercicios.`
      };
    }

    return { isFeasible: true };
  }

  /**
   * Valida el reemplazo de un ejercicio en la rutina evaluando el impacto temporal y aplicando
   * reducción de volumen hasta el piso seguro de 2 series por ejercicio (RF-04 CA-04.5).
   */
  validateExerciseSwapFeasibility(params: {
    durationMinutes: number;
    currentExercises: ExercisePlannedInput[];
    replacingExerciseId: string;
    candidateExercise: ExercisePlannedInput;
    isPeakWeek?: boolean;
  }): SwapFeasibilityResult {
    const isPeak = params.isPeakWeek ?? true;

    // Sustituir el ejercicio en la lista planificada
    const updatedExercises = params.currentExercises.map((ex) =>
      ex.id === params.replacingExerciseId ? { ...params.candidateExercise } : { ...ex }
    );

    // Si el ejercicio a reemplazar no estaba en la lista, agregarlo
    if (!updatedExercises.some((ex) => ex.id === params.candidateExercise.id)) {
      updatedExercises.push({ ...params.candidateExercise });
    }

    // 1. Verificar si cabe tal como está
    const initialDuration = this.estimateSessionDurationMinutes(updatedExercises, isPeak);
    if (initialDuration <= params.durationMinutes) {
      return {
        canSwap: true,
        setsReduced: false
      };
    }

    // 2. Intentar reducir series del candidato hasta piso de 2 series (CA-04.5)
    const initialCandidateSets = isPeak
      ? (params.candidateExercise.peakSets ?? 4)
      : (params.candidateExercise.baseSets ?? 3);

    for (let testSets = initialCandidateSets - 1; testSets >= 2; testSets--) {
      const reducedCandidateList = updatedExercises.map((ex) => {
        if (ex.id === params.candidateExercise.id) {
          return {
            ...ex,
            peakSets: testSets,
            baseSets: Math.min(testSets, ex.baseSets ?? testSets),
            targetSets: testSets
          };
        }
        return ex;
      });

      const reducedDuration = this.estimateSessionDurationMinutes(reducedCandidateList, isPeak);
      if (reducedDuration <= params.durationMinutes) {
        return {
          canSwap: true,
          setsReduced: true,
          adjustedCandidateSets: testSets,
          message: `Series ajustadas a ${testSets} para respetar el bloque de tiempo.`
        };
      }
    }

    // 3. Ni con 2 series cabe: sugerir mantener bilateral o ampliar bloque
    const nextBlock = ROUTINE_TIME_BLOCKS.find((b) => b.duration_minutes > params.durationMinutes);
    const suggestedMinutes = nextBlock ? nextBlock.duration_minutes : params.durationMinutes + 15;

    return {
      canSwap: false,
      setsReduced: false,
      message: `La variante seleccionada excede el tiempo disponible. Te sugerimos mantener una alternativa bilateral o ampliar el bloque de tiempo a ${suggestedMinutes} min.`
    };
  }
}

export const routineEngineV2Service = new RoutineEngineV2Service();
