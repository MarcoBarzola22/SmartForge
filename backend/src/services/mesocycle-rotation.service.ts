import {
  ExerciseRepository,
  exerciseRepository
} from '../repositories/exercise.repository.js';
import {
  MesocycleRepository,
  mesocycleRepository,
  type CreateMesocycleData,
  type CreateWeekPlanData,
  type CreateSessionPlanData,
  type CreateExerciseAssignmentData
} from '../repositories/mesocycle.repository.js';
import {
  AthleteRepository,
  athleteRepository
} from '../repositories/athlete.repository.js';
import {
  ExerciseSwapRepository,
  exerciseSwapRepository,
  type ExerciseSwap
} from '../repositories/exercise-swap.repository.js';
import {
  PainReportRepository,
  painReportRepository
} from '../repositories/pain-report.repository.js';
import {
  MesocycleGeneratorService,
  mesocycleGeneratorService,
  LIMITED_EQUIPMENT_WARNING
} from './mesocycle-generator.service.js';
import type {
  AthleteProfile,
  Exercise,
  ExerciseAssignment,
  ExperienceLevel,
  MesocycleDetail,
  PeriodizationType,
  SessionPlan,
  WeekPlan
} from '../schemas/generated/schemas.js';

export const DELOAD_VOLUME_FACTOR = 0.6; // -40% sets (60% volume)
export const DELOAD_LOAD_FACTOR = 0.9; // -10% load (90% load)
export const DELOAD_RIR_INCREMENT = 1; // Target RIR +1

export class MesocycleRotationService {
  constructor(
    public readonly exerciseRepo: ExerciseRepository = exerciseRepository,
    public readonly mesocycleRepo: MesocycleRepository = mesocycleRepository,
    public readonly athleteRepo: AthleteRepository = athleteRepository,
    public readonly exerciseSwapRepo: ExerciseSwapRepository = exerciseSwapRepository,
    public readonly painReportRepo: PainReportRepository = painReportRepository,
    public readonly mesocycleGenService: MesocycleGeneratorService = mesocycleGeneratorService
  ) {}

  /**
   * Determina si un ejercicio es un compuesto principal (CA-10.1, CA-10.4).
   * Los ejercicios compuestos multi-articulares se conservan a lo largo de las rotaciones.
   */
  isMainCompound(exercise: Exercise): boolean {
    return Boolean(exercise.is_compound);
  }

  /**
   * Determina si un ejercicio es un accesorio o monoarticular (CA-10.1, CA-10.4).
   * Los ejercicios accesorios se rotan entre mesociclos para evitar adaptación excesiva.
   */
  isAccessory(exercise: Exercise): boolean {
    return !this.isMainCompound(exercise);
  }

  /**
   * Obtiene los IDs de ejercicios originales que el atleta sustituyó históricamente
   * por motivo de "preferencia personal" (RF-03, CA-03.4, CA-10.4).
   * Estos ejercicios quedan vetados para la rotación automática.
   */
  getExcludedExerciseIdsFromSwaps(swaps: ExerciseSwap[]): Set<string> {
    const excluded = new Set<string>();
    for (const swap of swaps) {
      if (swap.reason === 'preferencia_personal') {
        excluded.add(swap.original_exercise_id);
      }
    }
    return excluded;
  }

  /**
   * Selecciona una variante compatible para rotar un ejercicio accesorio (CA-10.1, CA-10.4).
   * Criterios:
   * 1. Mismo patrón de movimiento y compatibilidad con el equipamiento del atleta.
   * 2. Excluye ejercicios vetados por preferencia personal.
   * 3. Prioriza variantes con el mismo músculo primario y distintas del ejercicio actual.
   * 4. Si no hay variantes distintas viables, mantiene de forma segura el ejercicio actual.
   */
  selectRotatedAccessory(
    currentExercise: Exercise,
    catalog: Exercise[],
    allowedEquipmentIds: string[],
    excludedExerciseIds: Set<string> = new Set<string>()
  ): Exercise {
    const equipSet = new Set(allowedEquipmentIds);
    equipSet.add('bodyweight');
    equipSet.add('none');
    equipSet.add('sin_equipamiento');

    const isBwOnly =
      allowedEquipmentIds.length === 0 ||
      allowedEquipmentIds.every(
        (id) => id === 'bodyweight' || id === 'none' || id === 'sin_equipamiento'
      );

    // Filtrar candidatos activos del mismo patrón compatibles con el equipamiento y no vetados
    const candidates = catalog.filter((e) => {
      if (!e.is_active) return false;
      if (e.movement_pattern !== currentExercise.movement_pattern) return false;
      if (excludedExerciseIds.has(e.id)) return false;

      if (isBwOnly) {
        return (
          e.equipment_id === 'bodyweight' ||
          e.equipment_id === 'none' ||
          e.equipment_id === 'sin_equipamiento'
        );
      }

      return equipSet.has(e.equipment_id);
    });

    if (candidates.length === 0) {
      return currentExercise;
    }

    // Candidatos alternativos distintos al actual
    const distinctCandidates = candidates.filter((e) => e.id !== currentExercise.id);

    if (distinctCandidates.length === 0) {
      return currentExercise;
    }

    // 1ª preferencia: mismo músculo primario y accesorio (monoarticular)
    const sameMuscleAccessories = distinctCandidates.filter(
      (e) => e.primary_muscle === currentExercise.primary_muscle && !e.is_compound
    );
    if (sameMuscleAccessories.length > 0 && sameMuscleAccessories[0]) {
      return sameMuscleAccessories[0];
    }

    // 2ª preferencia: mismo músculo primario
    const sameMuscle = distinctCandidates.filter(
      (e) => e.primary_muscle === currentExercise.primary_muscle
    );
    if (sameMuscle.length > 0 && sameMuscle[0]) {
      return sameMuscle[0];
    }

    // 3ª preferencia: cualquier accesorio compatible del mismo patrón
    const otherAccessories = distinctCandidates.filter((e) => !e.is_compound);
    if (otherAccessories.length > 0 && otherAccessories[0]) {
      return otherAccessories[0];
    }

    // Fallback: primer candidato distinto disponible
    return distinctCandidates[0] || currentExercise;
  }

  /**
   * Obtiene la carga base retenida de un ejercicio a partir del historial del mesociclo anterior.
   * Busca la carga de trabajo más alta alcanzada en las semanas no de descarga.
   */
  private getPreservedBaseLoad(
    previousMesocycle: MesocycleDetail,
    dayNumber: number,
    orderInSession: number,
    fallbackLoad: number
  ): number {
    let maxWorkingLoad = fallbackLoad;

    for (const week of previousMesocycle.weeks) {
      if (week.is_deload) continue; // no tomar de semanas de descarga

      const session = week.sessions.find((s) => s.day_number === dayNumber);
      if (session) {
        const assignment = session.exercise_assignments.find(
          (a) => a.order_in_session === orderInSession
        );
        if (assignment && assignment.target_load_kg > maxWorkingLoad) {
          maxWorkingLoad = assignment.target_load_kg;
        }
      }
    }

    return maxWorkingLoad;
  }

  /**
   * Genera la estructura completa de un nuevo mesociclo rotado (RF-10, CA-10.1, CA-10.4):
   * - Mantiene los ejercicios compuestos principales preservando la progresión de carga histórica.
   * - Rota los ejercicios accesorios por variantes compatibles del catálogo.
   * - Respeta el equipamiento del atleta y excluye ejercicios cambiados por preferencia personal.
   * - Programa la última semana como semana de descarga (-40% volumen, -10% carga, RIR +1).
   */
  async generateRotatedMesocyclePlan(
    athlete: AthleteProfile,
    previousMesocycle: MesocycleDetail,
    catalog: Exercise[],
    swaps: ExerciseSwap[] = [],
    customDurationWeeks?: number
  ): Promise<CreateMesocycleData> {
    const defaultDuration = this.getDeloadWeekNumber(athlete.experience_level);
    const weeksCount = customDurationWeeks
      ? Math.max(4, Math.min(8, customDurationWeeks))
      : defaultDuration;

    const athleteEquipmentIds = athlete.equipment.map((eq) => eq.id);
    const excludedExerciseIds = this.getExcludedExerciseIdsFromSwaps(swaps);
    const isConstrained = this.mesocycleGenService.isEquipmentConstrained(athlete, catalog);

    const periodizationType: PeriodizationType =
      athlete.training_goal === 'fuerza' ? 'lineal' : 'ondulante';

    // Tomar la plantilla de sesiones de la semana 1 del mesociclo anterior
    const baseWeek =
      previousMesocycle.weeks.find((w) => !w.is_deload) || previousMesocycle.weeks[0];
    const baseSessions = baseWeek ? baseWeek.sessions : [];

    // Mapeo del catálogo por ID
    const catalogMap = new Map<string, Exercise>(catalog.map((e) => [e.id, e]));

    // Definir los ejercicios seleccionados y cargas base para cada slot (day_number + order_in_session)
    interface SlotPlan {
      dayNumber: number;
      orderInSession: number;
      exercise: Exercise;
      baseLoad: number;
      targetReps: number;
      targetSets: number;
    }

    const slotPlans: SlotPlan[] = [];
    const usedInSessionMap = new Map<number, Set<string>>();

    for (const session of baseSessions) {
      const usedInThisSession = new Set<string>();
      usedInSessionMap.set(session.day_number, usedInThisSession);

      for (const assignment of session.exercise_assignments) {
        const currentExercise =
          catalogMap.get(assignment.exercise_id) || assignment.exercise;

        let chosenExercise: Exercise;
        let baseLoad: number;

        if (this.isMainCompound(currentExercise)) {
          // Mantener compuesto principal y preservar carga
          chosenExercise = currentExercise;
          const preservedLoad = this.getPreservedBaseLoad(
            previousMesocycle,
            session.day_number,
            assignment.order_in_session,
            assignment.target_load_kg
          );
          baseLoad =
            preservedLoad > 0
              ? preservedLoad
              : this.mesocycleGenService.calculateInitialLoad(athlete, chosenExercise);
        } else {
          // Rotar accesorio respetando exclusiones y equipamiento
          const combinedExclusions = new Set<string>([
            ...excludedExerciseIds,
            ...usedInThisSession
          ]);

          chosenExercise = this.selectRotatedAccessory(
            currentExercise,
            catalog,
            athleteEquipmentIds,
            combinedExclusions
          );

          baseLoad = this.mesocycleGenService.calculateInitialLoad(athlete, chosenExercise);
        }

        usedInThisSession.add(chosenExercise.id);

        slotPlans.push({
          dayNumber: session.day_number,
          orderInSession: assignment.order_in_session,
          exercise: chosenExercise,
          baseLoad,
          targetReps: assignment.target_reps || 10,
          targetSets: assignment.target_sets || 3
        });
      }
    }

    // Construir todas las semanas del mesociclo
    const weeks: CreateWeekPlanData[] = [];

    for (let w = 1; w <= weeksCount; w++) {
      const isDeload = w === weeksCount;
      const sessions: CreateSessionPlanData[] = [];

      for (const baseSession of baseSessions) {
        const assignments: CreateExerciseAssignmentData[] = [];
        const sessionSlots = slotPlans.filter((s) => s.dayNumber === baseSession.day_number);

        for (const slot of sessionSlots) {
          const progression = this.mesocycleGenService.calculateWeeklyProgression(
            slot.baseLoad,
            w,
            weeksCount,
            periodizationType,
            athlete.training_goal,
            isDeload
          );

          const targetSets = isDeload
            ? this.calculateDeloadSets(slot.targetSets)
            : slot.targetSets;

          assignments.push({
            exercise_id: slot.exercise.id,
            order_in_session: slot.orderInSession,
            target_sets: targetSets,
            target_reps: progression.target_reps,
            target_rir: progression.target_rir,
            target_load_kg: progression.target_load_kg,
            notes: isConstrained ? LIMITED_EQUIPMENT_WARNING : undefined
          });
        }

        sessions.push({
          day_number: baseSession.day_number,
          name: baseSession.name,
          exercise_assignments: assignments
        });
      }

      weeks.push({
        week_number: w,
        is_deload: isDeload,
        sessions
      });
    }

    const baseName = `Mesociclo ${athlete.training_goal.toUpperCase()} - ${athlete.experience_level} (Rotación)`;
    const mesocycleName = isConstrained
      ? `${baseName} (${LIMITED_EQUIPMENT_WARNING})`
      : baseName;

    return {
      athlete_id: athlete.id,
      name: mesocycleName,
      experience_level: athlete.experience_level,
      training_goal: athlete.training_goal,
      periodization_type: periodizationType,
      duration_weeks: weeksCount,
      weeks
    };
  }

  /**
   * Calcula el número de series para una semana de descarga (CA-10.2).
   * Aplica una reducción del 40% (60% del volumen habitual) con redondeo seguro
   * hacia abajo por defecto y un mínimo garantizado de 1 serie.
   */
  calculateDeloadSets(
    habitualSets: number,
    rounding: 'floor' | 'round' = 'floor'
  ): number {
    if (habitualSets <= 0) return 1;
    const reduced = habitualSets * DELOAD_VOLUME_FACTOR;
    const computed =
      rounding === 'round' ? Math.round(reduced) : Math.floor(reduced);
    return Math.max(1, computed);
  }

  /**
   * Calcula la carga objetivo en kg para una semana de descarga (CA-10.2).
   * Aplica una reducción del 10% (90% de la carga habitual) con precisión de 1 decimal.
   * Si la carga es 0 (ejercicio de peso corporal), se mantiene en 0 kg.
   */
  calculateDeloadLoad(habitualLoadKg: number): number {
    if (habitualLoadKg <= 0) return 0.0;
    const reduced = habitualLoadKg * DELOAD_LOAD_FACTOR;
    return Math.round(reduced * 10) / 10;
  }

  /**
   * Calcula el RIR objetivo para una semana de descarga (CA-10.2).
   * Incrementa el RIR habitual en +1 para reducir la proximidad al fallo, con tope de 5.
   */
  calculateDeloadRir(habitualRir: number = 2): number {
    return Math.min(5, Math.max(0, habitualRir + DELOAD_RIR_INCREMENT));
  }

  /**
   * Determina el número de semana de descarga según el nivel de experiencia o duración (CA-10.1, CA-10.2).
   * - Principiante: semana 4 (de 4 semanas)
   * - Intermedio: semana 6 (de 6 semanas)
   * - Avanzado: semana 8 (de 8 semanas)
   */
  getDeloadWeekNumber(experienceLevelOrDuration: ExperienceLevel | number): number {
    if (typeof experienceLevelOrDuration === 'number') {
      return experienceLevelOrDuration;
    }

    switch (experienceLevelOrDuration) {
      case 'principiante':
        return 4;
      case 'intermedio':
        return 6;
      case 'avanzado':
        return 8;
      default:
        return 4;
    }
  }

  /**
   * Comprueba si una semana corresponde a la semana de descarga del mesociclo (CA-10.2).
   */
  isDeloadWeek(weekNumber: number, durationWeeks: number): boolean {
    return weekNumber === durationWeeks;
  }

  /**
   * Transforma una asignación de ejercicio aplicando las reglas de descarga (CA-10.2):
   * - Series: 60% (-40% volumen, mínimo 1)
   * - Carga: 90% (-10% intensidad, 1 decimal)
   * - RIR: +1
   */
  applyDeloadToAssignment<
    T extends ExerciseAssignment | CreateExerciseAssignmentData
  >(assignment: T): T {
    const deloadSets = this.calculateDeloadSets(assignment.target_sets);
    const deloadLoad = this.calculateDeloadLoad(assignment.target_load_kg);
    const deloadRir = this.calculateDeloadRir(assignment.target_rir);

    return {
      ...assignment,
      target_sets: deloadSets,
      target_load_kg: deloadLoad,
      target_rir: deloadRir
    };
  }

  /**
   * Transforma una sesión completa aplicando las reglas de descarga a todas sus asignaciones.
   */
  applyDeloadToSession<T extends SessionPlan | CreateSessionPlanData>(session: T): T {
    return {
      ...session,
      exercise_assignments: session.exercise_assignments.map((assignment) =>
        this.applyDeloadToAssignment(assignment as ExerciseAssignment)
      )
    };
  }

  /**
   * Transforma un plan semanal existente marcándolo como semana de descarga (`is_deload: true`)
   * y ajustando todas sus sesiones y ejercicios.
   */
  applyDeloadToWeek<T extends WeekPlan | CreateWeekPlanData>(week: T): T {
    return {
      ...week,
      is_deload: true,
      sessions: week.sessions.map((session) =>
        this.applyDeloadToSession(session as SessionPlan)
      )
    };
  }

  /**
   * Genera un nuevo plan de semana de descarga basado en una semana previa,
   * asignando el número de semana indicado y transformando sus parámetros.
   */
  generateDeloadWeek<T extends WeekPlan | CreateWeekPlanData>(
    baseWeek: T,
    weekNumber: number
  ): T {
    const deloaded = this.applyDeloadToWeek(baseWeek);
    return {
      ...deloaded,
      week_number: weekNumber
    };
  }
}

export const mesocycleRotationService = new MesocycleRotationService();
