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

export const MAX_SAFE_SETS = 24;
export const DME_MIN_SETS = 6;
export const DME_MAX_SETS = 8;
export const DME_NOTE = 'Rutina optimizada para tiempo reducido (Dosis mínima efectiva)';
export const PRUNING_NOTE = 'Volumen ajustado jerárquicamente al techo seguro (24 series/músculo/semana)';
export const PRIMARY_COMPOUND_MIN_SETS = 3;
export const SECONDARY_COMPOUND_MIN_SETS = 2;
export const ISOLATION_MIN_SETS = 2;
export const MAX_SETS_PER_EXERCISE = 4;

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

export interface PlannedExerciseWithSets extends ExercisePlannedInput {
  targetSets: number;
  targetRir?: number;
  is_primary_compound?: boolean;
  isPrimaryCompound?: boolean;
  is_secondary_compound?: boolean;
  isSecondaryCompound?: boolean;
}

export interface PlannedSession {
  dayNumber?: number;
  name?: string;
  exercises: PlannedExerciseWithSets[];
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

export interface PruningResult {
  weeklyPlan: PlannedSession[];
  wasPruned: boolean;
  originalSets: number;
  finalSets: number;
  note?: string;
}

export interface AllMusclesPruningResult {
  weeklyPlan: PlannedSession[];
  wasPruned: boolean;
  prunedMuscles: MuscleGroup[];
  note?: string;
}

export interface DmeOptions {
  durationMinutes: number;
  availableDays: number;
}

export interface DmeResult {
  weeklyPlan: PlannedSession[];
  isDmeActive: boolean;
  targetRirRange?: [number, number];
  note?: string;
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

/**
 * Detecta si un ejercicio compuesto califica como ejercicio compuesto principal (básico).
 */
export function isPrimaryCompoundExercise(exercise: PlannedExerciseWithSets | ExercisePlannedInput): boolean {
  if (typeof (exercise as PlannedExerciseWithSets).is_primary_compound === 'boolean') {
    return (exercise as PlannedExerciseWithSets).is_primary_compound!;
  }
  if (typeof (exercise as PlannedExerciseWithSets).isPrimaryCompound === 'boolean') {
    return (exercise as PlannedExerciseWithSets).isPrimaryCompound!;
  }
  if (
    (exercise as PlannedExerciseWithSets).is_secondary_compound === true ||
    (exercise as PlannedExerciseWithSets).isSecondaryCompound === true
  ) {
    return false;
  }

  const isComp = exercise.is_compound ?? exercise.isCompound ?? false;
  if (!isComp) {
    return false;
  }

  const textToScan = `${exercise.id || ''} ${exercise.name || ''}`.toLowerCase();
  return (
    textToScan.includes('press_banca') ||
    textToScan.includes('bench_press') ||
    textToScan.includes('sentadilla') ||
    textToScan.includes('squat') ||
    textToScan.includes('peso_muerto') ||
    textToScan.includes('deadlift') ||
    textToScan.includes('press_militar') ||
    textToScan.includes('overhead_press') ||
    textToScan.includes('pull_up') ||
    textToScan.includes('dominadas')
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

  /**
   * Calcula el volumen total semanal (series) planificado para un grupo muscular determinado.
   */
  calculateWeeklySetsForMuscle(weeklyPlan: PlannedSession[], muscle: MuscleGroup): number {
    let total = 0;
    for (const session of weeklyPlan) {
      for (const ex of session.exercises) {
        if (ex.muscle === muscle) {
          total += ex.targetSets;
        }
      }
    }
    return total;
  }

  /**
   * Aplica la regla jerárquica de poda para evitar superar el techo de 24 series/músculo/semana (RF-04 CA-04.6):
   * 1. Preserva intactas las series de los ejercicios compuestos principales (piso mínimo de 3 series).
   * 2. Poda primero series de ejercicios monoarticulares / aislamiento hasta el techo o piso de 2 series.
   * 3. Poda después series de accesorios compuestos secundarios hasta estabilizar en 24 series o piso de 2.
   */
  applyHierarchicalPruning(weeklyPlan: PlannedSession[], targetMuscleGroup: MuscleGroup): PruningResult {
    const clonedPlan: PlannedSession[] = weeklyPlan.map((session) => ({
      ...session,
      exercises: session.exercises.map((ex) => ({ ...ex }))
    }));

    const originalSets = this.calculateWeeklySetsForMuscle(clonedPlan, targetMuscleGroup);
    if (originalSets <= MAX_SAFE_SETS) {
      return {
        weeklyPlan: clonedPlan,
        wasPruned: false,
        originalSets,
        finalSets: originalSets
      };
    }

    let currentSets = originalSets;

    // PASO 1: Podar ejercicios monoarticulares / aislamiento (hasta piso de 2 series)
    while (currentSets > MAX_SAFE_SETS) {
      let reducedInPass = false;
      for (const session of clonedPlan) {
        for (const ex of session.exercises) {
          const isComp = ex.is_compound ?? ex.isCompound ?? false;
          if (ex.muscle === targetMuscleGroup && !isComp && ex.targetSets > ISOLATION_MIN_SETS) {
            ex.targetSets -= 1;
            currentSets -= 1;
            reducedInPass = true;
            if (currentSets === MAX_SAFE_SETS) break;
          }
        }
        if (currentSets === MAX_SAFE_SETS) break;
      }
      if (!reducedInPass) break;
    }

    // PASO 2: Podar accesorios compuestos secundarios si persiste el exceso (hasta piso de 2 series)
    if (currentSets > MAX_SAFE_SETS) {
      while (currentSets > MAX_SAFE_SETS) {
        let reducedInPass = false;
        for (const session of clonedPlan) {
          for (const ex of session.exercises) {
            const isComp = ex.is_compound ?? ex.isCompound ?? false;
            const isPri = isPrimaryCompoundExercise(ex);
            if (
              ex.muscle === targetMuscleGroup &&
              isComp &&
              !isPri &&
              ex.targetSets > SECONDARY_COMPOUND_MIN_SETS
            ) {
              ex.targetSets -= 1;
              currentSets -= 1;
              reducedInPass = true;
              if (currentSets === MAX_SAFE_SETS) break;
            }
          }
          if (currentSets === MAX_SAFE_SETS) break;
        }
        if (!reducedInPass) break;
      }
    }

    // PASO 3: Asegurar que los compuestos principales nunca bajen de 3 series
    for (const session of clonedPlan) {
      for (const ex of session.exercises) {
        if (ex.muscle === targetMuscleGroup && isPrimaryCompoundExercise(ex)) {
          if (ex.targetSets < PRIMARY_COMPOUND_MIN_SETS) {
            ex.targetSets = PRIMARY_COMPOUND_MIN_SETS;
          }
        }
      }
    }

    currentSets = this.calculateWeeklySetsForMuscle(clonedPlan, targetMuscleGroup);

    return {
      weeklyPlan: clonedPlan,
      wasPruned: true,
      originalSets,
      finalSets: currentSets,
      note: PRUNING_NOTE
    };
  }

  /**
   * Aplica poda jerárquica sobre todos los grupos musculares presentes en el plan semanal.
   */
  applyHierarchicalPruningAllMuscles(weeklyPlan: PlannedSession[]): AllMusclesPruningResult {
    let currentPlan: PlannedSession[] = weeklyPlan.map((s) => ({
      ...s,
      exercises: s.exercises.map((e) => ({ ...e }))
    }));

    const musclesSet = new Set<MuscleGroup>();
    for (const session of currentPlan) {
      for (const ex of session.exercises) {
        if (ex.muscle) {
          musclesSet.add(ex.muscle);
        }
      }
    }

    const prunedMuscles: MuscleGroup[] = [];

    for (const muscle of musclesSet) {
      const res = this.applyHierarchicalPruning(currentPlan, muscle);
      if (res.wasPruned) {
        prunedMuscles.push(muscle);
        currentPlan = res.weeklyPlan;
      }
    }

    return {
      weeklyPlan: currentPlan,
      wasPruned: prunedMuscles.length > 0,
      prunedMuscles,
      note: prunedMuscles.length > 0 ? PRUNING_NOTE : undefined
    };
  }

  /**
   * Determina si la combinación de tiempo y días disponibles constituye un régimen de tiempo reducido (RF-04 CA-04.4).
   */
  isReducedTimeRegime(durationMinutes: number, availableDays: number): boolean {
    return durationMinutes === 30 || (durationMinutes === 45 && availableDays <= 3);
  }

  /**
   * Aplica el principio de Dosis Mínima Efectiva (DME) (6–8 series de alta calidad, RIR 1–2) ante tiempo reducido (RF-04 CA-04.4).
   */
  applyDME(weeklyPlan: PlannedSession[], options: DmeOptions): DmeResult {
    if (!this.isReducedTimeRegime(options.durationMinutes, options.availableDays)) {
      return {
        weeklyPlan,
        isDmeActive: false
      };
    }

    const clonedPlan: PlannedSession[] = weeklyPlan.map((session) => ({
      ...session,
      exercises: session.exercises.map((ex) => ({ ...ex }))
    }));

    const musclesSet = new Set<MuscleGroup>();
    for (const session of clonedPlan) {
      for (const ex of session.exercises) {
        if (ex.muscle) {
          musclesSet.add(ex.muscle);
        }
      }
    }

    for (const muscle of musclesSet) {
      let currentSets = this.calculateWeeklySetsForMuscle(clonedPlan, muscle);

      // Si está por debajo del piso de DME (6 series), distribuir series adicionales
      if (currentSets < DME_MIN_SETS) {
        const muscleExercises: PlannedExerciseWithSets[] = [];
        for (const session of clonedPlan) {
          for (const ex of session.exercises) {
            if (ex.muscle === muscle) {
              muscleExercises.push(ex);
            }
          }
        }

        let idx = 0;
        while (currentSets < DME_MIN_SETS && muscleExercises.length > 0) {
          muscleExercises[idx % muscleExercises.length]!.targetSets += 1;
          currentSets += 1;
          idx++;
        }
      }

      // Si está por encima del techo de DME (8 series), podar hasta máximo 8 series
      if (currentSets > DME_MAX_SETS) {
        while (currentSets > DME_MAX_SETS) {
          let reduced = false;
          for (const session of clonedPlan) {
            for (const ex of session.exercises) {
              if (ex.muscle === muscle && ex.targetSets > 2) {
                ex.targetSets -= 1;
                currentSets -= 1;
                reduced = true;
                if (currentSets === DME_MAX_SETS) break;
              }
            }
            if (currentSets === DME_MAX_SETS) break;
          }
          if (!reduced) break;
        }
      }
    }

    // Ajustar RIR objetivo a 1–2 (mayor proximidad al fallo debido a menor volumen)
    for (const session of clonedPlan) {
      for (const ex of session.exercises) {
        if (ex.targetRir === undefined || ex.targetRir > 2 || ex.targetRir < 1) {
          ex.targetRir = 2;
        }
      }
    }

    return {
      weeklyPlan: clonedPlan,
      isDmeActive: true,
      targetRirRange: [1, 2],
      note: DME_NOTE
    };
  }

  /**
   * Distribuye el volumen y series para una cantidad dinámica de ejercicios en una sesión (RF-05, RF-06).
   * Aplica un límite de máximo 4 series por ejercicio; si se requiere más volumen, lo distribuye a los siguientes ejercicios.
   */
  distributeSessionVolume(params: {
    targetExercisesCount: number;
    totalSessionSets: number;
    isDeload?: boolean;
  }): number[] {
    const count = Math.max(1, params.targetExercisesCount);
    const targetSets = params.totalSessionSets;
    const isDeload = params.isDeload ?? false;

    if (isDeload) {
      const deloadTotal = Math.max(count, Math.round(targetSets * 0.6));
      const baseSets = Math.floor(deloadTotal / count);
      const rem = deloadTotal % count;
      return Array.from({ length: count }, (_, i) => Math.max(1, i < rem ? baseSets + 1 : baseSets));
    }

    const baseSetsPerEx = Math.floor(targetSets / count);
    const remainder = targetSets % count;
    const distribution: number[] = [];
    let excessVolume = 0;

    for (let i = 0; i < count; i++) {
      let sets = i < remainder ? baseSetsPerEx + 1 : baseSetsPerEx;
      if (sets > MAX_SETS_PER_EXERCISE) {
        excessVolume += sets - MAX_SETS_PER_EXERCISE;
        sets = MAX_SETS_PER_EXERCISE;
      } else if (excessVolume > 0 && sets < MAX_SETS_PER_EXERCISE) {
        const canAdd = Math.min(excessVolume, MAX_SETS_PER_EXERCISE - sets);
        sets += canAdd;
        excessVolume -= canAdd;
      }
      distribution.push(sets);
    }

    if (excessVolume > 0) {
      for (let i = 0; i < distribution.length && excessVolume > 0; i++) {
        const current = distribution[i];
        if (typeof current === 'number' && current < MAX_SETS_PER_EXERCISE) {
          const canAdd = Math.min(excessVolume, MAX_SETS_PER_EXERCISE - current);
          distribution[i] = current + canAdd;
          excessVolume -= canAdd;
        }
      }
    }

    return distribution;
  }
}

export const routineEngineV2Service = new RoutineEngineV2Service();
